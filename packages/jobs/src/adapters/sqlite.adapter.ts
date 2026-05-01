/**
 * @fileoverview SQLite adapter for @igniter-js/jobs (local/desktop/CLI environments)
 * @module @igniter-js/jobs/adapters/sqlite
 *
 * This adapter provides persistent job queue storage using SQLite, ideal for:
 * - Desktop applications (Tauri, Electron)
 * - CLI tools
 * - MCP Servers
 * - Local development
 * - Edge/embedded environments
 */

import type {
  IgniterCronDefinition,
  IgniterJobCounts,
  IgniterJobDefinition,
  IgniterJobSearchResult,
  IgniterJobStatus,
  IgniterJobsAdapter,
  IgniterJobsAdapterDispatchParams,
  IgniterJobsAdapterScheduleParams,
  IgniterJobsEventHandler,
  IgniterJobsJobLog,
  IgniterJobsQueueCleanOptions,
  IgniterJobsQueueInfo,
  IgniterJobsQueueManager,
  IgniterJobsWorkerBuilderConfig,
  IgniterJobsWorkerHandle,
  IgniterJobsWorkerMetrics,
} from "../types";
import { IgniterJobsIdGenerator } from "../utils/id-generator";
import { IgniterJobsError } from "../errors";

/**
 * Configuration options for the SQLite adapter.
 */
export interface IgniterJobsSQLiteAdapterOptions {
  /**
   * Path to the SQLite database file.
   * Use `:memory:` for an in-memory database (useful for testing).
   * @example './data/jobs.sqlite'
   * @example ':memory:'
   */
  path: string;

  /**
   * Interval in milliseconds for the worker polling loop.
   * Lower values mean faster job pickup but higher CPU usage.
   * @default 500
   */
  pollingInterval?: number;

  /**
   * Whether to enable WAL mode for better concurrent read/write performance.
   * @default true
   */
  enableWAL?: boolean;
}

type SQLiteDatabase = {
  exec(sql: string): void;
  prepare<T = unknown>(sql: string): SQLiteStatement<T>;
  close(): void;
};

type SQLiteStatement<T = unknown> = {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  get(...params: unknown[]): T | undefined;
  all(...params: unknown[]): T[];
};

type JobRow = {
  id: string;
  name: string;
  queue: string;
  input: string;
  status: IgniterJobStatus;
  progress: number;
  attempts_made: number;
  max_attempts: number;
  priority: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  scheduled_at: string | null;
  result: string | null;
  error: string | null;
  metadata: string | null;
  scope: string | null;
};

type LogRow = {
  id: number;
  job_id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
};

type WorkerState = {
  id: string;
  queues: string[];
  concurrency: number;
  paused: boolean;
  closed: boolean;
  startedAt: Date;
  metrics: {
    processed: number;
    failed: number;
    totalDuration: number;
  };
  handlers?: IgniterJobsWorkerBuilderConfig["handlers"];
  pollingTimer?: ReturnType<typeof setInterval>;
  activeJobs: number;
};

/**
 * SQLite-based adapter for local/desktop/CLI job queue persistence.
 *
 * Features:
 * - Full persistence across process restarts
 * - Zero external dependencies (SQLite is embedded)
 * - WAL mode for concurrent access
 * - Automatic schema migrations
 * - Compatible with Tauri, Electron, Node.js CLIs
 *
 * @example
 * ```ts
 * const adapter = IgniterJobsSQLiteAdapter.create({
 *   path: './data/jobs.sqlite'
 * });
 *
 * const jobs = IgniterJobs.create()
 *   .withAdapter(adapter)
 *   .build();
 * ```
 */
export class IgniterJobsSQLiteAdapter implements IgniterJobsAdapter {
  public readonly client: { type: "sqlite"; path: string };

  private db: SQLiteDatabase;
  private readonly options: Required<IgniterJobsSQLiteAdapterOptions>;

  private readonly registeredJobs = new Map<
    string,
    Map<string, IgniterJobDefinition<any, any, any>>
  >();
  private readonly registeredCrons = new Map<
    string,
    Map<string, IgniterCronDefinition<any, any>>
  >();

  private readonly workers = new Map<string, WorkerState>();

  private readonly subscribers = new Map<
    string,
    Set<IgniterJobsEventHandler>
  >();

  private readonly pausedQueues = new Set<string>();

  public readonly queues: IgniterJobsQueueManager = {
    list: async () => this.listQueues(),
    get: async (name) => this.getQueueInfo(name),
    getJobCounts: async (name) => this.getQueueJobCounts(name),
    getJobs: async (name, filter) => {
      const statuses = filter?.status;
      const limit = filter?.limit ?? 100;
      const offset = filter?.offset ?? 0;
      const results = await this.searchJobs({
        queue: name,
        status: statuses,
        limit,
        offset,
      } as any);
      return results;
    },
    pause: async (name) => this.pauseQueue(name),
    resume: async (name) => this.resumeQueue(name),
    isPaused: async (name) => {
      const info = await this.getQueueInfo(name);
      return info?.isPaused ?? false;
    },
    drain: async (name) => this.drainQueue(name),
    clean: async (name, options) => this.cleanQueue(name, options),
    obliterate: async (name, options) => this.obliterateQueue(name, options),
  };

  private constructor(options: IgniterJobsSQLiteAdapterOptions) {
    this.options = {
      path: options.path,
      pollingInterval: options.pollingInterval ?? 500,
      enableWAL: options.enableWAL ?? true,
    };

    this.client = {
      type: "sqlite",
      path: this.options.path,
    };

    // Dynamic import of better-sqlite3
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    this.db = new Database(this.options.path) as SQLiteDatabase;

    this.initializeSchema();
  }

  /**
   * Creates a new SQLite adapter instance.
   *
   * @param options - Configuration options
   * @returns A new adapter instance
   *
   * @example
   * ```ts
   * // File-based database (persistent)
   * const adapter = IgniterJobsSQLiteAdapter.create({
   *   path: './data/jobs.sqlite'
   * });
   *
   * // In-memory database (for testing)
   * const testAdapter = IgniterJobsSQLiteAdapter.create({
   *   path: ':memory:'
   * });
   * ```
   */
  public static create(
    options: IgniterJobsSQLiteAdapterOptions
  ): IgniterJobsAdapter {
    return new IgniterJobsSQLiteAdapter(options);
  }

  private initializeSchema(): void {
    // Enable WAL mode for better concurrent performance
    if (this.options.enableWAL) {
      this.db.exec("PRAGMA journal_mode = WAL;");
    }

    // Jobs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        queue TEXT NOT NULL,
        input TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'waiting',
        progress REAL NOT NULL DEFAULT 0,
        attempts_made INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 1,
        priority INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        scheduled_at TEXT,
        result TEXT,
        error TEXT,
        metadata TEXT,
        scope TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_queue_status ON jobs(queue, status);
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_at ON jobs(scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority DESC, created_at ASC);
    `);

    // Logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS job_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON job_logs(job_id);
    `);

    // Paused queues table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS paused_queues (
        name TEXT PRIMARY KEY
      );
    `);

    // Load paused queues from database
    const pausedRows = this.db.prepare<{ name: string }>(
      "SELECT name FROM paused_queues"
    ).all();
    for (const row of pausedRows) {
      this.pausedQueues.add(row.name);
    }
  }

  public registerJob(
    queueName: string,
    jobName: string,
    definition: IgniterJobDefinition<any, any, any>
  ): void {
    const queueJobs =
      this.registeredJobs.get(queueName) ??
      new Map<string, IgniterJobDefinition<any, any, any>>();
    if (queueJobs.has(jobName)) {
      throw new IgniterJobsError({
        code: "JOBS_DUPLICATE_JOB",
        message: `Job "${jobName}" already registered for queue "${queueName}".`,
      });
    }
    queueJobs.set(jobName, definition);
    this.registeredJobs.set(queueName, queueJobs);
  }

  public registerCron(
    queueName: string,
    cronName: string,
    definition: IgniterCronDefinition<any, any>
  ): void {
    const queueCrons =
      this.registeredCrons.get(queueName) ??
      new Map<string, IgniterCronDefinition<any, any>>();
    if (queueCrons.has(cronName)) {
      throw new IgniterJobsError({
        code: "JOBS_INVALID_CRON",
        message: `Cron "${cronName}" already registered for queue "${queueName}".`,
      });
    }
    queueCrons.set(cronName, definition);
    this.registeredCrons.set(queueName, queueCrons);
  }

  public async dispatch(
    params: IgniterJobsAdapterDispatchParams
  ): Promise<string> {
    const jobId = params.jobId ?? IgniterJobsIdGenerator.generate("job");
    const maxAttempts = params.attempts ?? 1;
    const now = new Date();

    let status: IgniterJobStatus = "waiting";
    let scheduledAt: Date | null = null;

    if (this.pausedQueues.has(params.queue)) {
      status = "paused";
    } else if (params.delay && params.delay > 0) {
      status = "delayed";
      scheduledAt = new Date(now.getTime() + params.delay);
    }

    const stmt = this.db.prepare(`
      INSERT INTO jobs (
        id, name, queue, input, status, progress, attempts_made, max_attempts,
        priority, created_at, scheduled_at, metadata, scope
      ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      jobId,
      params.jobName,
      params.queue,
      JSON.stringify(params.input ?? {}),
      status,
      maxAttempts,
      params.priority ?? 0,
      now.toISOString(),
      scheduledAt?.toISOString() ?? null,
      params.metadata ? JSON.stringify(params.metadata) : null,
      params.scope ? JSON.stringify(params.scope) : null
    );

    // If delayed, schedule promotion
    if (params.delay && params.delay > 0) {
      setTimeout(() => {
        this.promoteDelayedJob(jobId, params.queue);
      }, params.delay);
    }

    return jobId;
  }

  private promoteDelayedJob(jobId: string, queue: string): void {
    if (this.pausedQueues.has(queue)) return;

    const stmt = this.db.prepare(`
      UPDATE jobs SET status = 'waiting', scheduled_at = NULL
      WHERE id = ? AND status = 'delayed'
    `);
    stmt.run(jobId);
  }

  public async schedule(
    params: IgniterJobsAdapterScheduleParams
  ): Promise<string> {
    if (params.at) {
      const delay = params.at.getTime() - Date.now();
      if (delay <= 0) {
        throw new IgniterJobsError({
          code: "JOBS_INVALID_SCHEDULE",
          message: "Scheduled time must be in the future.",
        });
      }
      return this.dispatch({ ...params, delay });
    }
    if (params.cron || params.every) {
      // SQLite adapter doesn't implement a cron engine.
      // Store as delayed and rely on external cron setup if needed.
      return this.dispatch({ ...params, delay: params.delay ?? 0 });
    }
    return this.dispatch(params);
  }

  public async getJob(
    jobId: string,
    queue?: string
  ): Promise<IgniterJobSearchResult | null> {
    let sql = "SELECT * FROM jobs WHERE id = ?";
    const params: unknown[] = [jobId];

    if (queue) {
      sql += " AND queue = ?";
      params.push(queue);
    }

    const row = this.db.prepare<JobRow>(sql).get(...params);
    if (!row) return null;
    return this.rowToSearchResult(row);
  }

  public async getJobState(
    jobId: string,
    queue?: string
  ): Promise<IgniterJobStatus | null> {
    let sql = "SELECT status FROM jobs WHERE id = ?";
    const params: unknown[] = [jobId];

    if (queue) {
      sql += " AND queue = ?";
      params.push(queue);
    }

    const row = this.db.prepare<{ status: IgniterJobStatus }>(sql).get(...params);
    return row?.status ?? null;
  }

  public async getJobLogs(
    jobId: string,
    queue?: string
  ): Promise<IgniterJobsJobLog[]> {
    // Verify job exists and belongs to queue if specified
    if (queue) {
      const job = await this.getJob(jobId, queue);
      if (!job) return [];
    }

    const rows = this.db
      .prepare<LogRow>("SELECT * FROM job_logs WHERE job_id = ? ORDER BY timestamp ASC")
      .all(jobId);

    return rows.map((row) => ({
      timestamp: new Date(row.timestamp),
      level: row.level,
      message: row.message,
    }));
  }

  public async getJobProgress(jobId: string, queue?: string): Promise<number> {
    let sql = "SELECT progress FROM jobs WHERE id = ?";
    const params: unknown[] = [jobId];

    if (queue) {
      sql += " AND queue = ?";
      params.push(queue);
    }

    const row = this.db.prepare<{ progress: number }>(sql).get(...params);
    return row?.progress ?? 0;
  }

  public async retryJob(jobId: string, queue?: string): Promise<void> {
    let sql = "SELECT id FROM jobs WHERE id = ?";
    const checkParams: unknown[] = [jobId];

    if (queue) {
      sql += " AND queue = ?";
      checkParams.push(queue);
    }

    const exists = this.db.prepare<{ id: string }>(sql).get(...checkParams);
    if (!exists) {
      throw new IgniterJobsError({
        code: "JOBS_NOT_FOUND",
        message: `Job "${jobId}" not found${queue ? ` in queue "${queue}"` : ""}.`,
      });
    }

    let updateSql = "UPDATE jobs SET status = 'waiting', error = NULL, completed_at = NULL, progress = 0 WHERE id = ?";
    const updateParams: unknown[] = [jobId];

    if (queue) {
      updateSql = updateSql.replace("WHERE id = ?", "WHERE id = ? AND queue = ?");
      updateParams.push(queue);
    }

    this.db.prepare(updateSql).run(...updateParams);
  }

  public async removeJob(jobId: string, queue?: string): Promise<void> {
    let sql = "DELETE FROM jobs WHERE id = ?";
    const params: unknown[] = [jobId];

    if (queue) {
      sql += " AND queue = ?";
      params.push(queue);
    }

    this.db.prepare(sql).run(...params);
  }

  public async promoteJob(jobId: string, queue?: string): Promise<void> {
    let sql = "SELECT id, status, queue FROM jobs WHERE id = ?";
    const checkParams: unknown[] = [jobId];

    if (queue) {
      sql += " AND queue = ?";
      checkParams.push(queue);
    }

    const row = this.db.prepare<{ id: string; status: string; queue: string }>(sql).get(...checkParams);
    if (!row) {
      throw new IgniterJobsError({
        code: "JOBS_NOT_FOUND",
        message: `Job "${jobId}" not found${queue ? ` in queue "${queue}"` : ""}.`,
      });
    }

    if (row.status === "delayed" || row.status === "paused") {
      const newStatus = this.pausedQueues.has(row.queue) ? "paused" : "waiting";
      this.db.prepare("UPDATE jobs SET status = ?, scheduled_at = NULL WHERE id = ?").run(newStatus, jobId);
    }
  }

  public async moveJobToFailed(
    jobId: string,
    reason: string,
    queue?: string
  ): Promise<void> {
    let sql = "SELECT id FROM jobs WHERE id = ?";
    const checkParams: unknown[] = [jobId];

    if (queue) {
      sql += " AND queue = ?";
      checkParams.push(queue);
    }

    const exists = this.db.prepare<{ id: string }>(sql).get(...checkParams);
    if (!exists) {
      throw new IgniterJobsError({
        code: "JOBS_NOT_FOUND",
        message: `Job "${jobId}" not found${queue ? ` in queue "${queue}"` : ""}.`,
      });
    }

    this.db.prepare(`
      UPDATE jobs SET status = 'failed', error = ?, completed_at = ?
      WHERE id = ?
    `).run(reason, new Date().toISOString(), jobId);
  }

  public async retryManyJobs(jobIds: string[], queue?: string): Promise<void> {
    await Promise.all(jobIds.map((id) => this.retryJob(id, queue)));
  }

  public async removeManyJobs(jobIds: string[], queue?: string): Promise<void> {
    await Promise.all(jobIds.map((id) => this.removeJob(id, queue)));
  }

  public async getQueueInfo(
    queue: string
  ): Promise<IgniterJobsQueueInfo | null> {
    const counts = await this.getQueueJobCounts(queue);
    return {
      name: queue,
      isPaused: this.pausedQueues.has(queue),
      jobCounts: counts,
    };
  }

  public async getQueueJobCounts(queue: string): Promise<IgniterJobCounts> {
    const counts: IgniterJobCounts = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    };

    const rows = this.db
      .prepare<{ status: IgniterJobStatus; count: number }>(
        "SELECT status, COUNT(*) as count FROM jobs WHERE queue = ? GROUP BY status"
      )
      .all(queue);

    for (const row of rows) {
      if (row.status in counts) {
        (counts as any)[row.status] = row.count;
      }
    }

    return counts;
  }

  public async listQueues(): Promise<IgniterJobsQueueInfo[]> {
    // Get queues from jobs table
    const jobQueues = this.db
      .prepare<{ queue: string }>("SELECT DISTINCT queue FROM jobs")
      .all()
      .map((r) => r.queue);

    // Combine with registered job queues
    const allQueues = new Set([
      ...jobQueues,
      ...this.registeredJobs.keys(),
      ...this.registeredCrons.keys(),
    ]);

    const result: IgniterJobsQueueInfo[] = [];
    for (const q of allQueues) {
      const info = await this.getQueueInfo(q);
      if (info) result.push(info);
    }
    return result;
  }

  public async pauseQueue(queue: string): Promise<void> {
    this.pausedQueues.add(queue);
    this.db.prepare("INSERT OR IGNORE INTO paused_queues (name) VALUES (?)").run(queue);

    // Mark waiting jobs as paused
    this.db.prepare(
      "UPDATE jobs SET status = 'paused' WHERE queue = ? AND status = 'waiting'"
    ).run(queue);
  }

  public async resumeQueue(queue: string): Promise<void> {
    this.pausedQueues.delete(queue);
    this.db.prepare("DELETE FROM paused_queues WHERE name = ?").run(queue);

    // Mark paused jobs as waiting
    this.db.prepare(
      "UPDATE jobs SET status = 'waiting' WHERE queue = ? AND status = 'paused'"
    ).run(queue);
  }

  public async drainQueue(queue: string): Promise<number> {
    const result = this.db.prepare(
      "DELETE FROM jobs WHERE queue = ? AND status IN ('waiting', 'paused')"
    ).run(queue);
    return result.changes;
  }

  public async cleanQueue(
    queue: string,
    options: IgniterJobsQueueCleanOptions
  ): Promise<number> {
    const statuses = Array.isArray(options.status)
      ? options.status
      : [options.status];
    const olderThan = options.olderThan ?? 0;
    const limit = options.limit ?? Number.POSITIVE_INFINITY;

    const cutoffTime = new Date(Date.now() - olderThan).toISOString();
    const statusPlaceholders = statuses.map(() => "?").join(", ");

    let sql = `
      DELETE FROM jobs WHERE id IN (
        SELECT id FROM jobs
        WHERE queue = ? AND status IN (${statusPlaceholders}) AND created_at < ?
        ORDER BY created_at ASC
        LIMIT ?
      )
    `;

    const result = this.db.prepare(sql).run(
      queue,
      ...statuses,
      cutoffTime,
      limit === Number.POSITIVE_INFINITY ? -1 : limit
    );

    return result.changes;
  }

  public async obliterateQueue(
    queue: string,
    _options?: { force?: boolean }
  ): Promise<void> {
    this.db.prepare("DELETE FROM jobs WHERE queue = ?").run(queue);
    this.registeredJobs.delete(queue);
    this.registeredCrons.delete(queue);
    this.pausedQueues.delete(queue);
    this.db.prepare("DELETE FROM paused_queues WHERE name = ?").run(queue);
  }

  public async retryAllInQueue(queue: string): Promise<number> {
    const result = this.db.prepare(`
      UPDATE jobs SET status = 'waiting', error = NULL, completed_at = NULL, progress = 0
      WHERE queue = ? AND status = 'failed'
    `).run(queue);
    return result.changes;
  }

  public async pauseJobType(queue: string, jobName: string): Promise<void> {
    this.db.prepare(
      "UPDATE jobs SET status = 'paused' WHERE queue = ? AND name = ? AND status = 'waiting'"
    ).run(queue, jobName);
  }

  public async resumeJobType(queue: string, jobName: string): Promise<void> {
    this.db.prepare(
      "UPDATE jobs SET status = 'waiting' WHERE queue = ? AND name = ? AND status = 'paused'"
    ).run(queue, jobName);
  }

  public async searchJobs(filter: any): Promise<IgniterJobSearchResult[]> {
    const queue = filter?.queue as string | undefined;
    const statuses: IgniterJobStatus[] | undefined = filter?.status;
    const limit = filter?.limit ?? 100;
    const offset = filter?.offset ?? 0;

    let sql = "SELECT * FROM jobs WHERE 1=1";
    const params: unknown[] = [];

    if (queue) {
      sql += " AND queue = ?";
      params.push(queue);
    }

    if (statuses && statuses.length > 0) {
      const placeholders = statuses.map(() => "?").join(", ");
      sql += ` AND status IN (${placeholders})`;
      params.push(...statuses);
    }

    sql += " ORDER BY priority DESC, created_at ASC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const rows = this.db.prepare<JobRow>(sql).all(...params);
    return rows.map((row) => this.rowToSearchResult(row));
  }

  public async searchQueues(filter: any): Promise<IgniterJobsQueueInfo[]> {
    const name = filter?.name as string | undefined;
    const isPaused = filter?.isPaused as boolean | undefined;
    const all = await this.listQueues();
    return all
      .filter((q) => (name ? q.name.includes(name) : true))
      .filter((q) =>
        typeof isPaused === "boolean" ? q.isPaused === isPaused : true
      );
  }

  public async searchWorkers(filter: any): Promise<IgniterJobsWorkerHandle[]> {
    const queue = filter?.queue as string | undefined;
    const isRunning = filter?.isRunning as boolean | undefined;
    return Array.from(this.workers.values())
      .filter((w) => (queue ? w.queues.includes(queue) : true))
      .filter((w) =>
        typeof isRunning === "boolean"
          ? isRunning
            ? !w.closed
            : w.closed
          : true
      )
      .map((w) => this.toWorkerHandle(w));
  }

  public async createWorker(
    config: IgniterJobsWorkerBuilderConfig
  ): Promise<IgniterJobsWorkerHandle> {
    const workerId = IgniterJobsIdGenerator.generate("worker");
    const state: WorkerState = {
      id: workerId,
      queues: config.queues ?? [],
      concurrency: config.concurrency ?? 1,
      paused: false,
      closed: false,
      startedAt: new Date(),
      metrics: { processed: 0, failed: 0, totalDuration: 0 },
      handlers: config.handlers,
      activeJobs: 0,
    };
    this.workers.set(workerId, state);

    // Start polling loop
    this.startPollingLoop(state);

    return this.toWorkerHandle(state);
  }

  public getWorkers(): Map<string, IgniterJobsWorkerHandle> {
    const out = new Map<string, IgniterJobsWorkerHandle>();
    for (const [id, state] of this.workers) {
      out.set(id, this.toWorkerHandle(state));
    }
    return out;
  }

  public async publishEvent(channel: string, payload: unknown): Promise<void> {
    const handlers = this.subscribers.get(channel);
    if (!handlers) return;
    await Promise.all(Array.from(handlers).map(async (h) => h(payload as any)));
  }

  public async subscribeEvent(
    channel: string,
    handler: IgniterJobsEventHandler
  ): Promise<() => Promise<void>> {
    const set =
      this.subscribers.get(channel) ?? new Set<IgniterJobsEventHandler>();
    set.add(handler);
    this.subscribers.set(channel, set);

    return async () => {
      const current = this.subscribers.get(channel);
      if (!current) return;
      current.delete(handler);
      if (current.size === 0) this.subscribers.delete(channel);
    };
  }

  public async shutdown(): Promise<void> {
    // Stop all workers
    for (const worker of this.workers.values()) {
      worker.closed = true;
      if (worker.pollingTimer) {
        clearInterval(worker.pollingTimer);
      }
    }
    this.workers.clear();
    this.subscribers.clear();

    // Close database connection
    this.db.close();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private rowToSearchResult(row: JobRow): IgniterJobSearchResult {
    return {
      id: row.id,
      name: row.name,
      queue: row.queue,
      status: row.status,
      input: JSON.parse(row.input),
      result: row.result ? JSON.parse(row.result) : undefined,
      error: row.error ?? undefined,
      progress: row.progress,
      attemptsMade: row.attempts_made,
      priority: row.priority,
      createdAt: new Date(row.created_at),
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      scope: row.scope ? JSON.parse(row.scope) : undefined,
    };
  }

  private toWorkerHandle(worker: WorkerState): IgniterJobsWorkerHandle {
    return {
      id: worker.id,
      queues: worker.queues,
      pause: async () => {
        worker.paused = true;
      },
      resume: async () => {
        worker.paused = false;
      },
      close: async () => {
        worker.closed = true;
        if (worker.pollingTimer) {
          clearInterval(worker.pollingTimer);
        }
      },
      isRunning: () => !worker.closed && !worker.paused,
      isPaused: () => worker.paused,
      isClosed: () => worker.closed,
      getMetrics: async () => this.toWorkerMetrics(worker),
    };
  }

  private toWorkerMetrics(worker: WorkerState): IgniterJobsWorkerMetrics {
    const uptime = Date.now() - worker.startedAt.getTime();
    const processed = worker.metrics.processed;
    return {
      processed,
      failed: worker.metrics.failed,
      avgDuration: processed > 0 ? worker.metrics.totalDuration / processed : 0,
      concurrency: worker.concurrency,
      uptime,
    };
  }

  private startPollingLoop(worker: WorkerState): void {
    const poll = () => {
      if (worker.closed || worker.paused) return;
      void this.processNextJobs(worker);
    };

    // Initial poll
    poll();

    // Set up polling interval
    worker.pollingTimer = setInterval(poll, this.options.pollingInterval);
  }

  private async processNextJobs(worker: WorkerState): Promise<void> {
    if (worker.closed || worker.paused) return;

    const availableSlots = worker.concurrency - worker.activeJobs;
    if (availableSlots <= 0) return;

    // Build queue filter
    const queueFilter = worker.queues.length > 0
      ? `queue IN (${worker.queues.map(() => "?").join(", ")})`
      : "1=1";

    const params: unknown[] = worker.queues.length > 0 ? [...worker.queues, availableSlots] : [availableSlots];

    // Get next jobs to process
    const rows = this.db.prepare<JobRow>(`
      SELECT * FROM jobs
      WHERE status = 'waiting' AND ${queueFilter}
      ORDER BY priority DESC, created_at ASC
      LIMIT ?
    `).all(...params);

    for (const row of rows) {
      if (worker.closed || worker.paused) break;
      if (worker.activeJobs >= worker.concurrency) break;

      // Mark as active
      const claimed = this.db.prepare(`
        UPDATE jobs SET status = 'active', started_at = ?
        WHERE id = ? AND status = 'waiting'
      `).run(new Date().toISOString(), row.id);

      if (claimed.changes === 0) continue; // Job was claimed by another worker

      worker.activeJobs++;
      void this.processJob(worker, row.id).finally(() => {
        worker.activeJobs--;
        if (worker.handlers?.onIdle && worker.activeJobs === 0) {
          void worker.handlers.onIdle();
        }
      });
    }
  }

  private async processJob(worker: WorkerState, jobId: string): Promise<void> {
    const row = this.db.prepare<JobRow>("SELECT * FROM jobs WHERE id = ?").get(jobId);
    if (!row) return;

    const job = this.rowToSearchResult(row);

    // Add log entry
    this.addJobLog(jobId, "info", "Job started");

    if (worker.handlers?.onActive) {
      await worker.handlers.onActive({ job });
    }

    const start = Date.now();

    try {
      const definition = this.registeredJobs.get(row.queue)?.get(row.name);
      if (!definition) {
        throw new IgniterJobsError({
          code: "JOBS_NOT_REGISTERED",
          message: `Job "${row.name}" is not registered for queue "${row.queue}".`,
        });
      }

      // Update attempts
      this.db.prepare("UPDATE jobs SET attempts_made = attempts_made + 1 WHERE id = ?").run(jobId);

      if (definition.onStart) {
        await definition.onStart({
          input: job.input,
          context: {},
          job: {
            id: job.id,
            name: job.name,
            queue: job.queue,
            attemptsMade: job.attemptsMade + 1,
            metadata: job.metadata,
          },
          scope: job.scope,
          startedAt: new Date(),
        } as any);
      }

      const result = await definition.handler({
        input: job.input,
        context: {},
        job: {
          id: job.id,
          name: job.name,
          queue: job.queue,
          attemptsMade: job.attemptsMade + 1,
          metadata: job.metadata,
        },
        scope: job.scope,
      } as any);

      const duration = Date.now() - start;

      // Mark as completed
      this.db.prepare(`
        UPDATE jobs SET status = 'completed', completed_at = ?, result = ?, progress = 100
        WHERE id = ?
      `).run(new Date().toISOString(), JSON.stringify(result), jobId);

      this.addJobLog(jobId, "info", `Job completed in ${duration}ms`);

      worker.metrics.processed++;
      worker.metrics.totalDuration += duration;

      if (definition.onSuccess) {
        await definition.onSuccess({
          input: job.input,
          context: {},
          job: {
            id: job.id,
            name: job.name,
            queue: job.queue,
            attemptsMade: job.attemptsMade + 1,
            metadata: job.metadata,
          },
          scope: job.scope,
          result,
          duration,
        } as any);
      }

      if (worker.handlers?.onSuccess) {
        const updatedJob = await this.getJob(jobId);
        if (updatedJob) {
          await worker.handlers.onSuccess({ job: updatedJob, result });
        }
      }
    } catch (error: any) {
      const duration = Date.now() - start;
      const errorMessage = error?.message ?? String(error);

      this.addJobLog(jobId, "error", errorMessage);

      // Get current attempts
      const current = this.db.prepare<{ attempts_made: number; max_attempts: number }>(
        "SELECT attempts_made, max_attempts FROM jobs WHERE id = ?"
      ).get(jobId);

      const isFinalAttempt = (current?.attempts_made ?? 0) >= (current?.max_attempts ?? 1);

      if (isFinalAttempt) {
        this.db.prepare(`
          UPDATE jobs SET status = 'failed', error = ?, completed_at = ?
          WHERE id = ?
        `).run(errorMessage, new Date().toISOString(), jobId);

        worker.metrics.failed++;

        const definition = this.registeredJobs.get(row.queue)?.get(row.name);
        if (definition?.onFailure) {
          await definition.onFailure({
            input: job.input,
            context: {},
            job: {
              id: job.id,
              name: job.name,
              queue: job.queue,
              attemptsMade: current?.attempts_made ?? 1,
              metadata: job.metadata,
            },
            scope: job.scope,
            error,
            isFinalAttempt: true,
          } as any);
        }

        if (worker.handlers?.onFailure) {
          const updatedJob = await this.getJob(jobId);
          if (updatedJob) {
            await worker.handlers.onFailure({ job: updatedJob, error });
          }
        }
      } else {
        // Retry - put back to waiting
        this.db.prepare("UPDATE jobs SET status = 'waiting' WHERE id = ?").run(jobId);
      }
    }
  }

  private addJobLog(jobId: string, level: "info" | "warn" | "error", message: string): void {
    this.db.prepare(`
      INSERT INTO job_logs (job_id, timestamp, level, message)
      VALUES (?, ?, ?, ?)
    `).run(jobId, new Date().toISOString(), level, message);
  }
}
