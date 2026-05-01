/**
 * @fileoverview Bun SQLite adapter for @igniter-js/jobs
 * @module @igniter-js/jobs/adapters/bun-sqlite
 */

import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  Job as BunqueueJob,
  JobOptions as BunqueueJobOptions,
  Queue as BunqueueQueue,
  Worker as BunqueueWorker,
} from "bunqueue/client";

import type {
  IgniterJobsAdapterJobStreamReadParams,
  IgniterJobsAdapterJobStreamSubscribeParams,
  IgniterJobsAdapterJobStreamWriteParams,
  IgniterCronDefinition,
  IgniterJobCounts,
  IgniterJobDefinition,
  IgniterJobSearchResult,
  IgniterJobStatus,
  IgniterJobsAdapter,
  IgniterJobsAdapterDispatchParams,
  IgniterJobsAdapterScheduleParams,
  IgniterJobsBunSQLiteAdapterOptions,
  IgniterJobsEventHandler,
  IgniterJobsJobLog,
  IgniterJobsQueueCleanOptions,
  IgniterJobsQueueInfo,
  IgniterJobsQueueManager,
  IgniterJobsWorkerBuilderConfig,
  IgniterJobsWorkerHandle,
  IgniterJobsWorkerMetrics,
  IgniterJobsScopeEntry,
} from "../types";
import { IgniterJobsIdGenerator } from "../utils/id-generator";
import { IgniterJobsError } from "../errors";
import type {
  IgniterJobsJobStreamEvent,
  IgniterJobsJobStreamReadResult,
} from "../types/stream";

type BunqueueClientModule = typeof import("bunqueue/client");

type JobsEnvelope = {
  __igniterJobs: true;
  input?: unknown;
  metadata?: Record<string, unknown>;
  scope?: IgniterJobsScopeEntry;
  schedule?: {
    skipWeekends?: boolean;
    onlyBusinessHours?: boolean;
    businessHours?: {
      start: number;
      end: number;
      timezone?: string;
    };
    onlyWeekdays?: number[];
    skipDates?: string[];
  };
};

type QueueRuntime = {
  queue: BunqueueQueue<JobsEnvelope>;
  cronsSynced: boolean;
};

type WorkerState = {
  id: string;
  queues: string[];
  concurrency: number;
  paused: boolean;
  closed: boolean;
  startedAt: Date;
  activeJobs: Set<string>;
  metrics: {
    processed: number;
    failed: number;
    totalDuration: number;
  };
  workers: Map<string, BunqueueWorker<JobsEnvelope, unknown>>;
  handlers?: IgniterJobsWorkerBuilderConfig["handlers"];
};

type StructuredLog = {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
};

type SQLiteDatabase = {
  exec(sql: string): void;
  prepare<T = unknown>(
    sql: string,
  ): {
    run(...params: unknown[]): {
      changes: number;
      lastInsertRowid: number | bigint;
    };
    get(...params: unknown[]): T | undefined;
    all(...params: unknown[]): T[];
  };
  close(): void;
};

const SUPPORTED_JOB_STATES = new Set([
  "waiting",
  "prioritized",
  "delayed",
  "active",
  "completed",
  "failed",
  "paused",
]);

/**
 * Bun-native SQLite adapter for local, embedded, and desktop workloads.
 */
export class IgniterJobsBunSQLiteAdapter implements IgniterJobsAdapter {
  public readonly client: { type: "bun-sqlite"; path: string };

  public readonly queues: IgniterJobsQueueManager = {
    list: async () => this.listQueues(),
    get: async (name) => this.getQueueInfo(name),
    getJobCounts: async (name) => this.getQueueJobCounts(name),
    getJobs: async (name, filter) =>
      this.searchJobs({
        queue: name,
        status: filter?.status,
        limit: filter?.limit,
        offset: filter?.offset,
      }),
    pause: async (name) => this.pauseQueue(name),
    resume: async (name) => this.resumeQueue(name),
    isPaused: async (name) =>
      (await this.getQueueInfo(name))?.isPaused ?? false,
    drain: async (name) => this.drainQueue(name),
    clean: async (name, options) => this.cleanQueue(name, options),
    obliterate: async (name, options) => this.obliterateQueue(name, options),
  };

  private readonly options: Required<IgniterJobsBunSQLiteAdapterOptions>;
  private bunqueueModulePromise: Promise<BunqueueClientModule> | null = null;
  private readonly queueRuntimes = new Map<string, QueueRuntime>();
  private readonly workers = new Map<string, WorkerState>();
  private readonly subscribers = new Map<
    string,
    Set<IgniterJobsEventHandler>
  >();
  private readonly streamSubscribers = new Map<
    string,
    Set<
      (
        event: IgniterJobsJobStreamEvent<string, unknown>,
      ) => void | Promise<void>
    >
  >();
  private readonly registeredJobs = new Map<
    string,
    Map<string, IgniterJobDefinition<any, any, any>>
  >();
  private streamDatabasePromise: Promise<SQLiteDatabase> | null = null;
  private readonly registeredCrons = new Map<
    string,
    Map<string, IgniterCronDefinition<any, any>>
  >();

  private constructor(options: IgniterJobsBunSQLiteAdapterOptions) {
    this.options = {
      path: options.path,
      durable: options.durable ?? false,
      heartbeatInterval: options.heartbeatInterval ?? 10_000,
      pollTimeout: options.pollTimeout ?? 0,
      batchSize: options.batchSize ?? 10,
      lockDuration: options.lockDuration ?? 30_000,
      maxStalledCount: options.maxStalledCount ?? 1,
    };

    this.client = {
      type: "bun-sqlite",
      path: this.options.path,
    };
  }

  public static create(
    options: IgniterJobsBunSQLiteAdapterOptions,
  ): IgniterJobsAdapter {
    return new IgniterJobsBunSQLiteAdapter(options);
  }

  public registerJob(
    queueName: string,
    jobName: string,
    definition: IgniterJobDefinition<any, any, any>,
  ): void {
    const jobs =
      this.registeredJobs.get(queueName) ??
      new Map<string, IgniterJobDefinition<any, any, any>>();

    if (jobs.has(jobName)) {
      throw new IgniterJobsError({
        code: "JOBS_DUPLICATE_JOB",
        message: `Job "${jobName}" already registered for queue "${queueName}".`,
      });
    }

    jobs.set(jobName, definition);
    this.registeredJobs.set(queueName, jobs);
    this.markQueueCronsDirty(queueName);
  }

  public registerCron(
    queueName: string,
    cronName: string,
    definition: IgniterCronDefinition<any, any>,
  ): void {
    const crons =
      this.registeredCrons.get(queueName) ??
      new Map<string, IgniterCronDefinition<any, any>>();

    if (crons.has(cronName)) {
      throw new IgniterJobsError({
        code: "JOBS_INVALID_CRON",
        message: `Cron "${cronName}" already registered for queue "${queueName}".`,
      });
    }

    crons.set(cronName, definition);
    this.registeredCrons.set(queueName, crons);
    this.markQueueCronsDirty(queueName);
  }

  public async dispatch(
    params: IgniterJobsAdapterDispatchParams,
  ): Promise<string> {
    const queue = await this.getQueue(params.queue);
    const job = await queue.add(
      params.jobName,
      this.createEnvelope(params.input, params.metadata, params.scope),
      this.toJobOptions(params),
    );

    return job.id;
  }

  public async schedule(
    params: IgniterJobsAdapterScheduleParams,
  ): Promise<string> {
    const queue = await this.getQueue(params.queue);

    if (params.at) {
      const delay = params.at.getTime() - Date.now();
      if (delay <= 0) {
        throw new IgniterJobsError({
          code: "JOBS_INVALID_SCHEDULE",
          message: "Scheduled time must be in the future.",
        });
      }

      const job = await queue.add(
        params.jobName,
        this.createEnvelope(params.input, params.metadata, params.scope),
        this.toJobOptions({ ...params, delay }),
      );
      return job.id;
    }

    const scheduleEnvelope = this.createEnvelope(
      params.input,
      params.metadata,
      params.scope,
      params,
    );

    if (params.cron || params.every) {
      const job = await queue.add(
        params.jobName,
        scheduleEnvelope,
        this.toJobOptions(params, {
          repeat: {
            pattern: params.cron,
            every: params.every,
            limit: params.maxExecutions,
            tz: params.tz,
          },
        }),
      );
      return job.id;
    }

    const job = await queue.add(
      params.jobName,
      scheduleEnvelope,
      this.toJobOptions(params),
    );
    return job.id;
  }

  public async getJob(
    jobId: string,
    queue?: string,
  ): Promise<IgniterJobSearchResult | null> {
    if (queue) {
      const job = await this.getQueue(queue).then((q) => q.getJob(jobId));
      return job ? this.mapJob(job, queue) : null;
    }

    for (const queueName of await this.getAllQueueNames()) {
      const job = await this.getQueue(queueName).then((q) => q.getJob(jobId));
      if (job) return this.mapJob(job, queueName);
    }

    return null;
  }

  public async getJobState(
    jobId: string,
    queue?: string,
  ): Promise<IgniterJobStatus | null> {
    const job = await this.getJob(jobId, queue);
    return job?.status ?? null;
  }

  public async getJobLogs(
    jobId: string,
    queue?: string,
  ): Promise<IgniterJobsJobLog[]> {
    const queueName = queue ?? (await this.findQueueByJobId(jobId));
    if (!queueName) return [];

    const logs = await this.getQueue(queueName).then((q) =>
      q.getJobLogs(jobId),
    );

    return logs.logs.map((entry) => this.parseLogEntry(entry));
  }

  public async getJobProgress(jobId: string, queue?: string): Promise<number> {
    const job = await this.getJob(jobId, queue);
    return job?.progress ?? 0;
  }

  public async retryJob(jobId: string, queue?: string): Promise<void> {
    const job = await this.requireJob(jobId, queue);
    await job.retry();
  }

  public async removeJob(jobId: string, queue?: string): Promise<void> {
    const job = await this.requireJob(jobId, queue);
    await job.remove();
  }

  public async promoteJob(jobId: string, queue?: string): Promise<void> {
    const job = await this.requireJob(jobId, queue);
    await job.promote();
  }

  public async moveJobToFailed(
    jobId: string,
    reason: string,
    queue?: string,
  ): Promise<void> {
    const queueName = queue ?? (await this.findQueueByJobId(jobId));
    if (!queueName) {
      throw new IgniterJobsError({
        code: "JOBS_NOT_FOUND",
        message: `Job "${jobId}" not found.`,
      });
    }

    await this.getQueue(queueName).then((q) =>
      q.moveJobToFailed(jobId, new Error(reason)),
    );
  }

  public async retryManyJobs(jobIds: string[], queue?: string): Promise<void> {
    await Promise.all(jobIds.map((jobId) => this.retryJob(jobId, queue)));
  }

  public async removeManyJobs(jobIds: string[], queue?: string): Promise<void> {
    await Promise.all(jobIds.map((jobId) => this.removeJob(jobId, queue)));
  }

  public async getQueueInfo(
    queue: string,
  ): Promise<IgniterJobsQueueInfo | null> {
    const counts = await this.getQueueJobCounts(queue);
    return {
      name: queue,
      isPaused: await this.getQueue(queue).then((q) => q.isPausedAsync()),
      jobCounts: counts,
    };
  }

  public async getQueueJobCounts(queue: string): Promise<IgniterJobCounts> {
    const counts = await this.getQueue(queue).then((q) =>
      q.getJobCountsAsync(),
    );
    return {
      waiting: counts.waiting + counts.prioritized,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
      paused: counts.paused,
    };
  }

  public async listQueues(): Promise<IgniterJobsQueueInfo[]> {
    const queueNames = await this.getAllQueueNames();
    return Promise.all(
      queueNames.map((queueName) => this.getQueueInfo(queueName)),
    ).then((queues) => queues.filter(Boolean) as IgniterJobsQueueInfo[]);
  }

  public async pauseQueue(queue: string): Promise<void> {
    const queueClient = await this.getQueue(queue);
    queueClient.pause();
    for (const worker of this.workers.values()) {
      if (worker.workers.has(queue)) {
        worker.paused = true;
        worker.workers.get(queue)?.pause();
      }
    }
  }

  public async resumeQueue(queue: string): Promise<void> {
    const queueClient = await this.getQueue(queue);
    queueClient.resume();
    for (const worker of this.workers.values()) {
      if (worker.workers.has(queue)) {
        worker.paused = false;
        worker.workers.get(queue)?.resume();
      }
    }
  }

  public async drainQueue(queue: string): Promise<number> {
    const queueClient = await this.getQueue(queue);
    const before = await this.getQueueJobCounts(queue);
    queueClient.drain();
    const after = await this.getQueueJobCounts(queue);
    return Math.max(
      0,
      before.waiting +
        before.delayed +
        before.paused -
        after.waiting -
        after.delayed -
        after.paused,
    );
  }

  public async cleanQueue(
    queue: string,
    options: IgniterJobsQueueCleanOptions,
  ): Promise<number> {
    const statuses = Array.isArray(options.status)
      ? options.status
      : [options.status];

    let cleaned = 0;
    const queueClient = await this.getQueue(queue);
    for (const status of statuses) {
      const removed = await queueClient.cleanAsync(
        options.olderThan ?? 0,
        options.limit ?? 1_000,
        this.toBunqueueStatus(status),
      );
      cleaned += removed.length;
    }

    return cleaned;
  }

  public async obliterateQueue(
    queue: string,
    _options?: { force?: boolean },
  ): Promise<void> {
    const queueClient = await this.getQueue(queue);
    queueClient.obliterate();
    this.registeredJobs.delete(queue);
    this.registeredCrons.delete(queue);
    this.queueRuntimes.delete(queue);
  }

  public async retryAllInQueue(queue: string): Promise<number> {
    const queueClient = await this.getQueue(queue);
    const failedJobs = await queueClient.getFailedAsync(0, 10_000);
    await queueClient.retryJobs({
      state: "failed",
      count: failedJobs.length || 10_000,
    });
    return failedJobs.length;
  }

  public async searchJobs(
    filter: Record<string, unknown>,
  ): Promise<IgniterJobSearchResult[]> {
    const queueName = filter.queue as string | undefined;
    const statuses = filter.status as IgniterJobStatus[] | undefined;
    const limit = (filter.limit as number | undefined) ?? 100;
    const offset = (filter.offset as number | undefined) ?? 0;

    const queueNames = queueName ? [queueName] : await this.getAllQueueNames();
    const mappedStates = statuses?.flatMap((status) =>
      this.toBunqueueStates(status),
    );
    const results: IgniterJobSearchResult[] = [];

    for (const currentQueue of queueNames) {
      const queueClient = await this.getQueue(currentQueue);
      const jobs = await queueClient.getJobsAsync({
        state: mappedStates,
        start: 0,
        end: offset + limit - 1,
      });

      for (const job of jobs) {
        results.push(
          await this.mapJob(job as BunqueueJob<JobsEnvelope>, currentQueue),
        );
      }
    }

    return results.slice(offset, offset + limit);
  }

  public async searchQueues(
    filter: Record<string, unknown>,
  ): Promise<IgniterJobsQueueInfo[]> {
    const queues = await this.listQueues();
    const name = filter.name as string | undefined;
    const isPaused = filter.isPaused as boolean | undefined;

    return queues
      .filter((queue) => (name ? queue.name.includes(name) : true))
      .filter((queue) =>
        typeof isPaused === "boolean" ? queue.isPaused === isPaused : true,
      );
  }

  public async searchWorkers(
    filter: Record<string, unknown>,
  ): Promise<IgniterJobsWorkerHandle[]> {
    const queue = filter.queue as string | undefined;
    const isRunning = filter.isRunning as boolean | undefined;

    return Array.from(this.workers.values())
      .filter((worker) => (queue ? worker.queues.includes(queue) : true))
      .filter((worker) =>
        typeof isRunning === "boolean"
          ? isRunning
            ? !worker.closed && !worker.paused
            : worker.closed || worker.paused
          : true,
      )
      .map((worker) => this.toWorkerHandle(worker));
  }

  public async createWorker(
    config: IgniterJobsWorkerBuilderConfig,
  ): Promise<IgniterJobsWorkerHandle> {
    const bunqueue = await this.loadBunqueue();
    const queueNames = config.queues.length
      ? config.queues
      : await this.getAllQueueNames();

    const workerId = IgniterJobsIdGenerator.generate("worker");
    const workerState: WorkerState = {
      id: workerId,
      queues: [...queueNames],
      concurrency: config.concurrency ?? 1,
      paused: false,
      closed: false,
      startedAt: new Date(),
      activeJobs: new Set<string>(),
      metrics: { processed: 0, failed: 0, totalDuration: 0 },
      workers: new Map(),
      handlers: config.handlers,
    };

    const perQueueConcurrency = this.distributeConcurrency(
      workerState.concurrency,
      queueNames,
    );

    for (const queueName of queueNames) {
      await this.getQueue(queueName);
      await this.syncCronSchedulers(queueName);

      const worker = new bunqueue.Worker<JobsEnvelope, unknown>(
        queueName,
        async (job) => this.processJob(workerState, queueName, job),
        {
          embedded: true,
          dataPath: this.options.path,
          autorun: false,
          concurrency: perQueueConcurrency.get(queueName) ?? 1,
          heartbeatInterval: this.options.heartbeatInterval,
          batchSize: this.options.batchSize,
          pollTimeout: this.options.pollTimeout,
          lockDuration: this.options.lockDuration,
          maxStalledCount: this.options.maxStalledCount,
          limiter: config.limiter
            ? { max: config.limiter.max, duration: config.limiter.duration }
            : undefined,
        },
      );

      this.attachWorkerEvents(workerState, queueName, worker);
      worker.run();
      workerState.workers.set(queueName, worker);
    }

    this.workers.set(workerId, workerState);
    return this.toWorkerHandle(workerState);
  }

  public getWorkers(): Map<string, IgniterJobsWorkerHandle> {
    return new Map(
      Array.from(this.workers.entries()).map(([id, worker]) => [
        id,
        this.toWorkerHandle(worker),
      ]),
    );
  }

  public async publishEvent(channel: string, payload: unknown): Promise<void> {
    const handlers = this.subscribers.get(channel);
    if (!handlers) return;

    await Promise.all(
      Array.from(handlers).map(async (handler) => handler(payload as never)),
    );
  }

  public async subscribeEvent(
    channel: string,
    handler: IgniterJobsEventHandler,
  ): Promise<() => Promise<void>> {
    const handlers =
      this.subscribers.get(channel) ?? new Set<IgniterJobsEventHandler>();
    handlers.add(handler);
    this.subscribers.set(channel, handlers);

    return async () => {
      const current = this.subscribers.get(channel);
      if (!current) return;
      current.delete(handler);
      if (current.size === 0) this.subscribers.delete(channel);
    };
  }

  public async writeJobStreamEvent(
    params: IgniterJobsAdapterJobStreamWriteParams,
  ): Promise<string> {
    const key = this.getStreamKey(params.queue, params.jobId);
    let eventId = String(Date.now());

    if (params.persistence?.enabled) {
      const db = await this.getStreamDatabase();
      const result = db
        .prepare(
          `
          INSERT INTO igniter_jobs_stream_events (
            queue, job_id, job_name, type, data, timestamp, scope
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        )
        .run(
          params.queue,
          params.jobId,
          params.jobName,
          params.event.type,
          JSON.stringify(params.event.data),
          params.event.timestamp.toISOString(),
          params.scope ? JSON.stringify(params.scope) : null,
        );

      eventId = String(result.lastInsertRowid);

      const maxEvents = params.persistence.maxEvents;
      if (typeof maxEvents === "number" && maxEvents > 0) {
        db.prepare(
          `
          DELETE FROM igniter_jobs_stream_events
          WHERE id IN (
            SELECT id FROM igniter_jobs_stream_events
            WHERE queue = ? AND job_id = ?
            ORDER BY id DESC
            LIMIT -1 OFFSET ?
          )
        `,
        ).run(params.queue, params.jobId, maxEvents);
      }
    }

    const event: IgniterJobsJobStreamEvent<string, unknown> = {
      ...params.event,
      id: eventId,
    };

    const handlers = this.streamSubscribers.get(key);
    if (handlers?.size) {
      await Promise.all(
        Array.from(handlers).map(async (handler) => handler(event)),
      );
    }

    return eventId;
  }

  public async readJobStream(
    params: IgniterJobsAdapterJobStreamReadParams,
  ): Promise<
    IgniterJobsJobStreamReadResult<IgniterJobsJobStreamEvent<string, unknown>>
  > {
    const db = await this.getStreamDatabase();
    const after = params.after ? Number(params.after) : 0;
    const limit = params.limit ?? 100;
    const rows = db
      .prepare<{
        id: number;
        type: string;
        data: string;
        timestamp: string;
        job_id: string;
        job_name: string;
        queue: string;
        scope: string | null;
      }>(
        `
      SELECT id, type, data, timestamp, job_id, job_name, queue, scope
      FROM igniter_jobs_stream_events
      WHERE queue = ? AND job_id = ? AND id > ?
      ORDER BY id ASC
      LIMIT ?
    `,
      )
      .all(params.queue, params.jobId, after, limit + 1);

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((row) => this.mapStreamRow(row));
    return {
      items,
      nextCursor: items.at(-1)?.id,
      hasMore,
    };
  }

  public async subscribeJobStream(
    params: IgniterJobsAdapterJobStreamSubscribeParams,
  ): Promise<() => Promise<void>> {
    const key = this.getStreamKey(params.queue, params.jobId);
    const set = this.streamSubscribers.get(key) ?? new Set();
    let lastSeenId = 0;

    const wrappedHandler = async (
      event: IgniterJobsJobStreamEvent<string, unknown>,
    ) => {
      const numericId = Number(event.id);
      if (Number.isFinite(numericId) && numericId <= lastSeenId) return;
      if (Number.isFinite(numericId)) lastSeenId = numericId;
      await params.handler(event);
    };

    set.add(wrappedHandler);
    this.streamSubscribers.set(key, set);

    const poll = setInterval(async () => {
      try {
        const result = await this.readJobStream({
          queue: params.queue,
          jobId: params.jobId,
          after: lastSeenId > 0 ? String(lastSeenId) : undefined,
          limit: 100,
        });

        for (const event of result.items) {
          const numericId = Number(event.id);
          if (Number.isFinite(numericId))
            lastSeenId = Math.max(lastSeenId, numericId);
          await params.handler(event);
        }
      } catch {
        // Ignore transient polling errors; live subscribers in the same process still receive events.
      }
    }, 200);

    return async () => {
      clearInterval(poll);
      const current = this.streamSubscribers.get(key);
      if (!current) return;
      current.delete(wrappedHandler);
      if (current.size === 0) this.streamSubscribers.delete(key);
    };
  }

  public async shutdown(): Promise<void> {
    for (const worker of this.workers.values()) {
      await this.closeWorkerState(worker);
    }
    this.workers.clear();

    for (const runtime of this.queueRuntimes.values()) {
      runtime.queue.close();
    }
    this.queueRuntimes.clear();
    this.subscribers.clear();
    this.streamSubscribers.clear();

    if (this.streamDatabasePromise) {
      const db = await this.streamDatabasePromise;
      db.close();
      this.streamDatabasePromise = null;
    }

    if (this.bunqueueModulePromise) {
      const bunqueue = await this.bunqueueModulePromise;
      bunqueue.shutdownManager();
    }
  }

  private async loadBunqueue(): Promise<BunqueueClientModule> {
    if (typeof (globalThis as { Bun?: unknown }).Bun === "undefined") {
      throw new IgniterJobsError({
        code: "JOBS_ADAPTER_ERROR",
        message:
          "The Bun SQLite adapter can only run inside Bun. Use the BullMQ adapter in Node.js runtimes.",
      });
    }

    this.bunqueueModulePromise ??= import("bunqueue/client");
    return this.bunqueueModulePromise;
  }

  private async getStreamDatabase(): Promise<SQLiteDatabase> {
    this.streamDatabasePromise ??= (async () => {
      await mkdir(dirname(this.options.path), { recursive: true });
      const sqlite = await import("bun:sqlite");
      const db = new sqlite.Database(this.options.path, {
        create: true,
      }) as SQLiteDatabase;

      db.exec(`
        CREATE TABLE IF NOT EXISTS igniter_jobs_stream_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          queue TEXT NOT NULL,
          job_id TEXT NOT NULL,
          job_name TEXT NOT NULL,
          type TEXT NOT NULL,
          data TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          scope TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_igniter_jobs_stream_events_job
        ON igniter_jobs_stream_events(queue, job_id, id);
      `);

      return db;
    })();

    return this.streamDatabasePromise;
  }

  private async getQueue(
    queueName: string,
  ): Promise<BunqueueQueue<JobsEnvelope>> {
    const existing = this.queueRuntimes.get(queueName);
    if (existing) return existing.queue;

    const bunqueue = await this.loadBunqueue();
    await mkdir(dirname(this.options.path), { recursive: true });
    const queue = new bunqueue.Queue<JobsEnvelope>(queueName, {
      embedded: true,
      dataPath: this.options.path,
      defaultJobOptions: {
        durable: this.options.durable,
      },
    });

    await queue.waitUntilReady();
    this.queueRuntimes.set(queueName, { queue, cronsSynced: false });
    return queue;
  }

  private async getAllQueueNames(): Promise<string[]> {
    return Array.from(
      new Set([
        ...this.registeredJobs.keys(),
        ...this.registeredCrons.keys(),
        ...this.queueRuntimes.keys(),
      ]),
    );
  }

  private markQueueCronsDirty(queueName: string): void {
    const runtime = this.queueRuntimes.get(queueName);
    if (runtime) runtime.cronsSynced = false;
  }

  private async syncCronSchedulers(queueName: string): Promise<void> {
    const runtime = this.queueRuntimes.get(queueName);
    if (!runtime || runtime.cronsSynced) return;

    const cronDefinitions = this.registeredCrons.get(queueName) ?? new Map();
    const existing = await runtime.queue.getJobSchedulers(0, 10_000);
    const existingIds = new Set(existing.map((scheduler) => scheduler.id));

    for (const [cronName, definition] of cronDefinitions.entries()) {
      await runtime.queue.upsertJobScheduler(
        cronName,
        {
          pattern: definition.cron,
          limit: definition.maxExecutions,
          timezone: definition.tz,
        },
        {
          name: cronName,
          data: this.createEnvelope(
            undefined,
            undefined,
            undefined,
            definition,
          ),
          opts: { durable: this.options.durable },
        },
      );
      existingIds.delete(cronName);
    }

    for (const schedulerId of existingIds) {
      await runtime.queue.removeJobScheduler(schedulerId);
    }

    runtime.cronsSynced = true;
  }

  private createEnvelope(
    input?: unknown,
    metadata?: Record<string, unknown>,
    scope?: IgniterJobsScopeEntry,
    scheduleSource?:
      | IgniterJobsAdapterScheduleParams
      | IgniterCronDefinition<any, any>,
  ): JobsEnvelope {
    return {
      __igniterJobs: true,
      input,
      metadata,
      scope,
      schedule: scheduleSource
        ? {
            skipWeekends: scheduleSource.skipWeekends,
            onlyBusinessHours: scheduleSource.onlyBusinessHours,
            businessHours: scheduleSource.businessHours,
            onlyWeekdays: scheduleSource.onlyWeekdays,
            skipDates: scheduleSource.skipDates?.map((value) =>
              value instanceof Date ? value.toISOString() : value,
            ),
          }
        : undefined,
    };
  }

  private toJobOptions(
    params: IgniterJobsAdapterDispatchParams | IgniterJobsAdapterScheduleParams,
    overrides?: Partial<BunqueueJobOptions>,
  ): BunqueueJobOptions {
    return {
      jobId: params.jobId,
      priority: params.priority,
      delay: params.delay,
      attempts: params.attempts,
      removeOnComplete: params.removeOnComplete,
      removeOnFail: params.removeOnFail,
      durable: this.options.durable,
      ...overrides,
    };
  }

  private async processJob(
    workerState: WorkerState,
    queueName: string,
    job: BunqueueJob<JobsEnvelope>,
  ): Promise<unknown> {
    const envelope = this.normalizeEnvelope(job.data);

    if (!this.shouldExecuteScheduledJob(envelope.schedule, new Date())) {
      await this.writeLog(
        queueName,
        job.id,
        "info",
        "Scheduled run skipped by adapter rules.",
      );
      return { skipped: true };
    }

    const registeredJob = this.registeredJobs.get(queueName)?.get(job.name);
    if (registeredJob) {
      return this.processRegisteredDefinition(
        workerState,
        queueName,
        job,
        envelope,
        registeredJob,
      );
    }

    const registeredCron = this.registeredCrons.get(queueName)?.get(job.name);
    if (registeredCron) {
      return this.processRegisteredCron(
        queueName,
        job,
        envelope,
        registeredCron,
      );
    }

    throw new IgniterJobsError({
      code: "JOBS_NOT_REGISTERED",
      message: `Job "${job.name}" is not registered for queue "${queueName}".`,
    });
  }

  private async processRegisteredDefinition(
    workerState: WorkerState,
    queueName: string,
    job: BunqueueJob<JobsEnvelope>,
    envelope: JobsEnvelope,
    definition: IgniterJobDefinition<any, any, any>,
  ): Promise<unknown> {
    const baseContext = this.createExecutionContext(
      queueName,
      job,
      envelope,
      definition,
    );
    const startedAt = new Date();

    await this.writeLog(queueName, job.id, "info", "Job started.");
    await this.invokeHook(() =>
      definition.onStart?.({ ...baseContext, startedAt } as never),
    );

    try {
      const result = await definition.handler(baseContext as never);
      const duration = Date.now() - startedAt.getTime();
      workerState.metrics.processed += 1;
      workerState.metrics.totalDuration += duration;

      await this.writeLog(
        queueName,
        job.id,
        "info",
        `Job completed in ${duration}ms.`,
      );
      await this.invokeHook(() =>
        definition.onSuccess?.({
          ...baseContext,
          startedAt,
          duration,
          result,
        } as never),
      );

      return result;
    } catch (error) {
      const runtimeError =
        error instanceof Error ? error : new Error(String(error));
      const duration = Date.now() - startedAt.getTime();
      const maxAttempts = definition.attempts ?? job.opts.attempts ?? 1;
      const isFinalAttempt = job.attemptsMade >= maxAttempts;
      workerState.metrics.failed += 1;

      await this.writeLog(queueName, job.id, "error", runtimeError.message);
      await this.invokeHook(() =>
        definition.onFailure?.({
          ...baseContext,
          startedAt,
          duration,
          error: runtimeError,
          isFinalAttempt,
        } as never),
      );

      throw runtimeError;
    }
  }

  private async processRegisteredCron(
    queueName: string,
    job: BunqueueJob<JobsEnvelope>,
    envelope: JobsEnvelope,
    definition: IgniterCronDefinition<any, any>,
  ): Promise<unknown> {
    await this.writeLog(queueName, job.id, "info", "Cron execution started.");

    try {
      const result = await definition.handler({
        context: {},
        job: {
          id: job.id,
          name: job.name,
          queue: queueName,
          attemptsMade: job.attemptsMade,
          createdAt: new Date(job.timestamp),
          metadata: envelope.metadata,
        },
        scope: envelope.scope,
      } as never);

      await this.writeLog(
        queueName,
        job.id,
        "info",
        "Cron execution completed.",
      );
      return result;
    } catch (error) {
      const runtimeError =
        error instanceof Error ? error : new Error(String(error));
      await this.writeLog(queueName, job.id, "error", runtimeError.message);
      throw runtimeError;
    }
  }

  private createExecutionContext(
    queueName: string,
    job: BunqueueJob<JobsEnvelope>,
    envelope: JobsEnvelope,
    definition: IgniterJobDefinition<any, any, any>,
  ) {
    const baseContext = {
      input: envelope.input,
      context: {},
      job: {
        id: job.id,
        name: job.name,
        queue: queueName,
        attemptsMade: job.attemptsMade,
        createdAt: new Date(job.timestamp),
        metadata: envelope.metadata,
        updateProgress: async (progress: number, message?: string) => {
          await job.updateProgress(progress, message);
          await this.writeLog(
            queueName,
            job.id,
            "info",
            `Progress updated to ${progress}%.`,
          );
          await this.invokeHook(() =>
            definition.onProgress?.({
              ...baseContext,
              progress,
              message,
            } as never),
          );
        },
      },
      scope: envelope.scope,
    };

    return baseContext;
  }

  private attachWorkerEvents(
    workerState: WorkerState,
    queueName: string,
    worker: BunqueueWorker<JobsEnvelope, unknown>,
  ): void {
    worker.on("active", async (job) => {
      workerState.activeJobs.add(job.id);
      await this.invokeHandler(() =>
        workerState.handlers?.onActive?.({
          job: this.mapJobSync(job, queueName),
        }),
      );
    });

    worker.on("completed", async (job, result) => {
      workerState.activeJobs.delete(job.id);
      await this.invokeHandler(() =>
        workerState.handlers?.onSuccess?.({
          job: this.mapJobSync(job, queueName, "completed"),
          result,
        }),
      );
    });

    worker.on("failed", async (job, error) => {
      workerState.activeJobs.delete(job.id);
      await this.invokeHandler(() =>
        workerState.handlers?.onFailure?.({
          job: this.mapJobSync(job, queueName, "failed"),
          error,
        }),
      );
    });

    worker.on("drained", async () => {
      if (workerState.activeJobs.size === 0) {
        await this.invokeHandler(() => workerState.handlers?.onIdle?.());
      }
    });

    worker.on("error", async (error) => {
      await this.writeQueueLog(
        queueName,
        "error",
        `Worker error: ${error.message}`,
      );
    });
  }

  private toWorkerHandle(worker: WorkerState): IgniterJobsWorkerHandle {
    return {
      id: worker.id,
      queues: [...worker.queues],
      pause: async () => {
        worker.paused = true;
        for (const runtime of worker.workers.values()) runtime.pause();
      },
      resume: async () => {
        worker.paused = false;
        for (const runtime of worker.workers.values()) runtime.resume();
      },
      close: async () => {
        await this.closeWorkerState(worker);
      },
      isRunning: () => !worker.closed && !worker.paused,
      isPaused: () => worker.paused,
      isClosed: () => worker.closed,
      getMetrics: async () => this.buildWorkerMetrics(worker),
    };
  }

  private buildWorkerMetrics(worker: WorkerState): IgniterJobsWorkerMetrics {
    return {
      processed: worker.metrics.processed,
      failed: worker.metrics.failed,
      avgDuration:
        worker.metrics.processed > 0
          ? worker.metrics.totalDuration / worker.metrics.processed
          : 0,
      concurrency: worker.concurrency,
      uptime: Date.now() - worker.startedAt.getTime(),
    };
  }

  private async closeWorkerState(worker: WorkerState): Promise<void> {
    worker.closed = true;
    await Promise.all(
      Array.from(worker.workers.values()).map((runtime) => runtime.close()),
    );
    worker.workers.clear();
  }

  private async requireJob(
    jobId: string,
    queue?: string,
  ): Promise<BunqueueJob<JobsEnvelope>> {
    const queueName = queue ?? (await this.findQueueByJobId(jobId));
    if (!queueName) {
      throw new IgniterJobsError({
        code: "JOBS_NOT_FOUND",
        message: `Job "${jobId}" not found.`,
      });
    }

    const job = await this.getQueue(queueName).then((queueClient) =>
      queueClient.getJob(jobId),
    );
    if (!job) {
      throw new IgniterJobsError({
        code: "JOBS_NOT_FOUND",
        message: `Job "${jobId}" not found${queue ? ` in queue "${queue}"` : ""}.`,
      });
    }

    return job;
  }

  private async findQueueByJobId(jobId: string): Promise<string | null> {
    for (const queueName of await this.getAllQueueNames()) {
      const job = await this.getQueue(queueName).then((queueClient) =>
        queueClient.getJob(jobId),
      );
      if (job) return queueName;
    }
    return null;
  }

  private getStreamKey(queue: string, jobId: string): string {
    return `${queue}:${jobId}`;
  }

  private mapStreamRow(row: {
    id: number;
    type: string;
    data: string;
    timestamp: string;
    job_id: string;
    job_name: string;
    queue: string;
    scope: string | null;
  }): IgniterJobsJobStreamEvent<string, unknown> {
    return {
      id: String(row.id),
      type: row.type,
      data: JSON.parse(row.data),
      timestamp: new Date(row.timestamp),
      jobId: row.job_id,
      jobName: row.job_name,
      queue: row.queue,
      scope: row.scope ? JSON.parse(row.scope) : undefined,
    };
  }

  private async mapJob(
    job: BunqueueJob<JobsEnvelope>,
    queueName: string,
    forcedState?: IgniterJobStatus,
  ): Promise<IgniterJobSearchResult> {
    const queue = await this.getQueue(queueName);
    const rawState = await job.getState();
    return this.mapJobSync(
      job,
      queueName,
      forcedState ?? this.toPublicStatus(rawState, queue.isPaused()),
    );
  }

  private mapJobSync(
    job: BunqueueJob<JobsEnvelope>,
    queueName: string,
    status?: IgniterJobStatus,
  ): IgniterJobSearchResult {
    const envelope = this.normalizeEnvelope(job.data);

    return {
      id: job.id,
      name: job.name,
      queue: queueName,
      status: status ?? this.toPublicStatus("waiting", false),
      input: envelope.input,
      result: job.returnvalue,
      error: job.failedReason ?? undefined,
      progress: typeof job.progress === "number" ? job.progress : 0,
      attemptsMade: job.attemptsMade,
      priority: job.priority ?? 0,
      createdAt: new Date(job.timestamp),
      startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      metadata: envelope.metadata,
      scope: envelope.scope,
    };
  }

  private normalizeEnvelope(data: JobsEnvelope | unknown): JobsEnvelope {
    if (
      data &&
      typeof data === "object" &&
      (data as JobsEnvelope).__igniterJobs === true
    ) {
      return data as JobsEnvelope;
    }

    return {
      __igniterJobs: true,
      input: data,
    };
  }

  private toPublicStatus(
    rawState: string,
    isQueuePaused: boolean,
  ): IgniterJobStatus {
    if (
      (rawState === "waiting" || rawState === "prioritized") &&
      isQueuePaused
    ) {
      return "paused";
    }

    switch (rawState) {
      case "prioritized":
      case "waiting-children":
        return "waiting";
      case "waiting":
      case "active":
      case "completed":
      case "failed":
      case "delayed":
      case "paused":
        return rawState;
      default:
        return "waiting";
    }
  }

  private toBunqueueStatus(status: IgniterJobStatus): string {
    switch (status) {
      case "waiting":
        return "waiting";
      default:
        return status;
    }
  }

  private toBunqueueStates(status: IgniterJobStatus): string[] {
    switch (status) {
      case "waiting":
        return ["waiting", "prioritized"];
      case "paused":
        return ["paused"];
      default:
        return [status];
    }
  }

  private distributeConcurrency(
    total: number,
    queues: string[],
  ): Map<string, number> {
    const result = new Map<string, number>();
    if (queues.length === 0) return result;

    const base = Math.max(1, Math.floor(total / queues.length));
    let remainder = Math.max(0, total - base * queues.length);

    for (const queue of queues) {
      const value = base + (remainder > 0 ? 1 : 0);
      result.set(queue, value);
      remainder = Math.max(0, remainder - 1);
    }

    return result;
  }

  private shouldExecuteScheduledJob(
    schedule: JobsEnvelope["schedule"],
    now: Date,
  ): boolean {
    if (!schedule) return true;
    const day = now.getDay();
    const isoDate = now.toISOString().slice(0, 10);

    if (schedule.skipWeekends && (day === 0 || day === 6)) return false;
    if (schedule.onlyWeekdays?.length && !schedule.onlyWeekdays.includes(day))
      return false;
    if (schedule.skipDates?.some((value) => value.slice(0, 10) === isoDate))
      return false;

    if (schedule.onlyBusinessHours && schedule.businessHours) {
      const hour = now.getHours();
      return (
        hour >= schedule.businessHours.start &&
        hour < schedule.businessHours.end
      );
    }

    return true;
  }

  private parseLogEntry(entry: string): IgniterJobsJobLog {
    try {
      const parsed = JSON.parse(entry) as StructuredLog;
      if (
        parsed &&
        typeof parsed.message === "string" &&
        typeof parsed.timestamp === "string" &&
        (parsed.level === "info" ||
          parsed.level === "warn" ||
          parsed.level === "error")
      ) {
        return {
          timestamp: new Date(parsed.timestamp),
          level: parsed.level,
          message: parsed.message,
        };
      }
    } catch {
      // fall back to plain string
    }

    return {
      timestamp: new Date(),
      level: "info",
      message: entry,
    };
  }

  private async writeLog(
    queueName: string,
    jobId: string,
    level: "info" | "warn" | "error",
    message: string,
  ): Promise<void> {
    const queue = await this.getQueue(queueName);
    await queue.addJobLog(
      jobId,
      JSON.stringify({ timestamp: new Date().toISOString(), level, message }),
    );
  }

  private async writeQueueLog(
    queueName: string,
    level: "info" | "warn" | "error",
    message: string,
  ): Promise<void> {
    void queueName;
    void level;
    void message;
  }

  private async invokeHook(fn: () => Promise<void> | void): Promise<void> {
    try {
      await fn();
    } catch {
      // Hooks must not break worker state transitions.
    }
  }

  private async invokeHandler(fn: () => Promise<void> | void): Promise<void> {
    try {
      await fn();
    } catch {
      // Worker observers are isolated from backend processing.
    }
  }
}

export type { IgniterJobsBunSQLiteAdapterOptions };
