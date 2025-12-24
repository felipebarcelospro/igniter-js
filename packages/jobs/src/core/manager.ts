/**
 * @fileoverview Core IgniterJobsManager class with all job operations
 * @module @igniter-js/jobs/core
 *
 * @description
 * The main IgniterJobsManager class provides a type-safe, scoped API for background job processing.
 * It supports job dispatching, scheduling, worker management, queue operations, and scoped instances
 * for multi-tenant applications.
 *
 * @example
 * ```typescript
 * import { IgniterJobs, IgniterJobsMemoryAdapter } from '@igniter-js/jobs'
 * import { z } from 'zod'
 *
 * const emailQueue = IgniterQueue.create('email')
 *   .addJob('sendWelcome', {
 *     input: z.object({ to: z.string(), name: z.string() }),
 *     handler: async (ctx) => {
 *       await sendEmail(ctx.input.to, `Welcome ${ctx.input.name}!`)
 *     },
 *   })
 *   .build()
 *
 * const jobs = IgniterJobs.create()
 *   .withAdapter(IgniterJobsMemoryAdapter.create())
 *   .withService('my-api')
 *   .withEnvironment('production')
 *   .withContext(async () => ({ db }))
 *   .addQueue(emailQueue)
 *   .build()
 *
 * // Dispatch a job
 * await jobs.email.sendWelcome.dispatch({ input: { to: 'user@example.com', name: 'Alice' } })
 *
 * // Scoped operations
 * const orgJobs = jobs.scope('organization', 'org_123')
 * await orgJobs.email.sendWelcome.dispatch({ input: { to: 'user@example.com', name: 'Bob' } })
 * ```
 */

import type { IgniterJobsConfig } from "../types/config";
import type { IgniterJobsRuntime } from "../types/runtime";
import type { IgniterJobsAdapter } from "../types/adapter";
import type {
  IgniterCronDefinition,
  IgniterJobDefinition,
  IgniterJobStatus,
  IgniterJobsDispatchParams,
  IgniterJobsExecutionContext,
  IgniterJobsHookContext,
  IgniterJobsScheduleParams,
} from "../types/job";
import type {
  IgniterJobsEvent,
  IgniterJobsEventHandler,
  IgniterJobsTelemetry,
} from "../types/events";
import type {
  IgniterJobsScopeEntry,
  IgniterJobsScopeOptions,
} from "../types/scope";
import type { IgniterJobsQueue } from "../types/queue";

import { IgniterWorkerBuilder } from "../builders/worker.builder";
import { IgniterJobsError } from "../errors";
import { IgniterJobsPrefix } from "../utils/prefix";
import { IgniterJobsEventsUtils } from "../utils/events.utils";
import { IgniterJobsScopeUtils } from "../utils/scope";
import { IgniterJobsValidationUtils } from "../utils/validation";

/**
 * WeakSet to track which adapters have already been registered.
 * This ensures that scoped instances don't re-register jobs.
 * @internal
 */
const registeredAdapters = new WeakSet<IgniterJobsAdapter>();

/**
 * Main IgniterJobsManager class providing background job processing operations.
 *
 * Features:
 * - **Job Dispatching**: Enqueue jobs for immediate or delayed processing
 * - **Job Scheduling**: Schedule jobs with cron expressions or specific times
 * - **Worker Management**: Create and manage workers with configurable concurrency
 * - **Queue Operations**: Pause, resume, drain, clean queues
 * - **Scopes**: Multi-tenant isolation with scoped job instances
 * - **Telemetry**: Built-in observability with typed telemetry events
 *
 * @typeParam TConfig - The jobs configuration type
 */
export class IgniterJobsManager<
  TConfig extends IgniterJobsConfig<any, any, any> = IgniterJobsConfig<
    any,
    any,
    any
  >,
> {
  /** @internal */
  private readonly config: TConfig;

  /** @internal */
  private readonly adapter: IgniterJobsAdapter;

  /** @internal */
  private readonly telemetry?: IgniterJobsTelemetry;

  /** @internal */
  private readonly scopeEntry?: IgniterJobsScopeEntry;

  /**
   * @internal
   * Constructor is internal. Use `IgniterJobs.create()` instead.
   */
  constructor(config: TConfig, scopeEntry?: IgniterJobsScopeEntry) {
    this.config = config;
    this.adapter = config.adapter;
    this.telemetry = config.telemetry;
    this.scopeEntry = scopeEntry;
  }

  // ---------------------------------------------------------------------------
  // Public Methods
  // ---------------------------------------------------------------------------

  /**
   * Creates a scoped jobs instance.
   *
   * Scopes provide multi-tenant isolation by adding scope metadata to all jobs.
   * Jobs dispatched from a scoped instance will include scope information in their metadata.
   *
   * @param type - The scope type (e.g., 'organization', 'workspace')
   * @param id - The scope identifier (e.g., 'org_123')
   * @param tags - Optional additional tags for the scope
   * @returns A new scoped IgniterJobsManager instance
   *
   * @example
   * ```typescript
   * const orgJobs = jobs.scope('organization', 'org_123')
   * await orgJobs.email.sendWelcome.dispatch({ input: { to: 'user@example.com' } })
   * ```
   */
  public scope(
    type: string,
    id: string | number,
    tags?: Record<string, unknown>,
  ): IgniterJobsManager<TConfig> {
    const entry: IgniterJobsScopeEntry = { type, id: String(id), tags };
    return new IgniterJobsManager(this.config, entry);
  }

  /**
   * Subscribes to all job events from this jobs instance.
   *
   * @param handler - The event handler function
   * @returns A function to unsubscribe
   *
   * @example
   * ```typescript
   * const unsubscribe = await jobs.subscribe((event) => {
   *   console.log('Job event:', event.type, event.data)
   * })
   * // Later: await unsubscribe()
   * ```
   */
  public async subscribe(
    handler: IgniterJobsEventHandler,
  ): Promise<() => Promise<void>> {
    const channel = this.buildEventsChannel();
    return this.adapter.subscribeEvent(channel, async (payload: unknown) => {
      await handler(payload as IgniterJobsEvent);
    });
  }

  /**
   * Searches for jobs, queues, or workers based on filters.
   *
   * @param target - The target to search ('jobs', 'queues', or 'workers')
   * @param filter - The filter criteria
   * @returns The search results
   *
   * @example
   * ```typescript
   * const failedJobs = await jobs.search('jobs', { status: 'failed', queue: 'email' })
   * const queues = await jobs.search('queues', {})
   * ```
   */
  public async search(
    target: "jobs" | "queues" | "workers",
    filter: Record<string, unknown>,
  ): Promise<unknown[]> {
    switch (target) {
      case "jobs":
        return this.adapter.searchJobs(filter);
      case "queues":
        return this.adapter.searchQueues(filter);
      case "workers":
        return this.adapter.searchWorkers(filter);
      default:
        return [];
    }
  }

  /**
   * Gracefully shuts down the jobs instance.
   *
   * This will close all connections and stop all workers.
   *
   * @example
   * ```typescript
   * await jobs.shutdown()
   * ```
   */
  public async shutdown(): Promise<void> {
    await this.adapter.shutdown();
  }

  /**
   * Creates a new worker builder for processing jobs.
   *
   * @returns A new IgniterWorkerBuilder instance
   *
   * @example
   * ```typescript
   * const worker = await jobs.worker
   *   .create()
   *   .addQueue('email')
   *   .withConcurrency(5)
   *   .start()
   * ```
   */
  public get worker() {
    return {
      create: () =>
        new IgniterWorkerBuilder({
          adapter: this.adapter,
          allowedQueues: Object.keys(this.config.queues) as any,
        }),
    };
  }

  /**
   * Converts the manager to a runtime proxy with typed queue accessors.
   *
   * @internal
   * @returns The runtime proxy
   */
  public toRuntime(): IgniterJobsRuntime<TConfig> {
    this.ensureRegistered();

    const self = this;
    const queueNames = Object.keys(this.config.queues);

    // Create proxy to handle dynamic queue access
    const handler: ProxyHandler<IgniterJobsManager<TConfig>> = {
      get(target, prop: string) {
        // Handle known properties
        if (prop === "config") return target.config;
        if (prop === "subscribe") return target.subscribe.bind(target);
        if (prop === "search") return target.search.bind(target);
        if (prop === "shutdown") return target.shutdown.bind(target);
        if (prop === "worker") return target.worker;
        if (prop === "scope" && target.config.scopeDefinition) {
          return (
            type: string,
            id: string | number,
            tags?: Record<string, unknown>,
          ) => target.scope(type, id, tags).toRuntime();
        }

        // Handle queue access
        if (queueNames.includes(prop)) {
          return self.createQueueAccessor(prop);
        }

        return undefined;
      },
    };

    return new Proxy(this, handler) as unknown as IgniterJobsRuntime<TConfig>;
  }

  // ---------------------------------------------------------------------------
  // Private Methods - Registration
  // ---------------------------------------------------------------------------

  /**
   * Ensures all jobs and crons are registered with the adapter.
   * Uses a shared WeakSet to prevent duplicate registration across scoped instances.
   * @internal
   */
  private ensureRegistered(): void {
    if (registeredAdapters.has(this.adapter)) return;

    for (const [queueName, queue] of Object.entries(
      this.config.queues as Record<string, IgniterJobsQueue<any, any, any>>,
    )) {
      // Register jobs
      for (const [jobName, def] of Object.entries(
        queue.jobs as Record<string, IgniterJobDefinition<any, any, any>>,
      )) {
        this.adapter.registerJob(
          queueName,
          jobName,
          this.wrapJobDefinition(queueName, jobName, def),
        );
      }

      // Register crons
      for (const [cronName, cron] of Object.entries(
        queue.crons as Record<string, IgniterCronDefinition<any, any>>,
      )) {
        this.adapter.registerCron(
          queueName,
          cronName,
          this.wrapCronDefinition(queueName, cronName, cron),
        );
      }
    }

    registeredAdapters.add(this.adapter);
  }

  // ---------------------------------------------------------------------------
  // Private Methods - Accessors
  // ---------------------------------------------------------------------------

  /**
   * Creates a queue accessor with job accessors and management methods.
   * @internal
   */
  private createQueueAccessor(queueName: string): unknown {
    const queueConfig = this.config.queues[queueName] as IgniterJobsQueue<
      any,
      any,
      any
    >;
    const self = this;

    const queueAccessor: Record<string, unknown> = {
      async list(filter?: {
        status?: IgniterJobStatus[];
        limit?: number;
        offset?: number;
      }) {
        return self.adapter.queues.getJobs(queueName, filter);
      },

      get() {
        return {
          retrieve: () => self.adapter.getQueueInfo(queueName),
          pause: () => self.adapter.pauseQueue(queueName),
          resume: () => self.adapter.resumeQueue(queueName),
          drain: () => self.adapter.drainQueue(queueName),
          clean: (options: any) => self.adapter.cleanQueue(queueName, options),
          obliterate: (options?: { force?: boolean }) =>
            self.adapter.obliterateQueue(queueName, options),
          retryAll: () => self.adapter.retryAllInQueue(queueName),
        };
      },

      async subscribe(handler: IgniterJobsEventHandler) {
        const channel = self.buildEventsChannel();
        return self.adapter.subscribeEvent(channel, async (event: unknown) => {
          const typed = event as IgniterJobsEvent;
          if (
            typeof typed?.type === "string" &&
            typed.type.startsWith(`${queueName}:`)
          ) {
            await handler(typed);
          }
        });
      },

      jobs: {},
    };

    // Create job accessors
    for (const jobName of Object.keys(queueConfig.jobs)) {
      const jobAccessor = this.createJobAccessor(queueName, jobName);
      (queueAccessor.jobs as Record<string, unknown>)[jobName] = jobAccessor;
      queueAccessor[jobName] = jobAccessor;
    }

    return queueAccessor;
  }

  /**
   * Creates a job accessor with dispatch, schedule, and management methods.
   * @internal
   */
  private createJobAccessor(queueName: string, jobName: string): unknown {
    const self = this;

    return {
      async dispatch(params: IgniterJobsDispatchParams<any>) {
        return self.dispatchJob(queueName, jobName, params);
      },

      async schedule(params: IgniterJobsScheduleParams<any>) {
        return self.scheduleJob(queueName, jobName, params);
      },

      get(id: string) {
        return {
          retrieve: () => self.adapter.getJob(id, queueName),
          retry: () => self.adapter.retryJob(id, queueName),
          remove: () => self.adapter.removeJob(id, queueName),
          promote: () => self.adapter.promoteJob(id, queueName),
          move: (state: "failed", reason: string) => {
            if (state !== "failed") return Promise.resolve();
            return self.adapter.moveJobToFailed(id, reason, queueName);
          },
          state: () => self.adapter.getJobState(id, queueName),
          progress: () => self.adapter.getJobProgress(id, queueName),
          logs: () => self.adapter.getJobLogs(id, queueName),
        };
      },

      many(ids: string[]) {
        return {
          retry: () => self.adapter.retryManyJobs(ids, queueName),
          remove: () => self.adapter.removeManyJobs(ids, queueName),
        };
      },

      pause: () => self.adapter.pauseJobType(queueName, jobName),
      resume: () => self.adapter.resumeJobType(queueName, jobName),

      async subscribe(handler: IgniterJobsEventHandler) {
        const channel = self.buildEventsChannel();
        return self.adapter.subscribeEvent(channel, async (event: unknown) => {
          const typed = event as IgniterJobsEvent;
          if (
            typeof typed?.type === "string" &&
            typed.type.startsWith(`${queueName}:${jobName}:`)
          ) {
            await handler(typed);
          }
        });
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Private Methods - Job Operations
  // ---------------------------------------------------------------------------

  /**
   * Dispatches a job for immediate or delayed processing.
   * @internal
   */
  private async dispatchJob(
    queueName: string,
    jobName: string,
    params: IgniterJobsDispatchParams<any>,
  ): Promise<string> {
    const definition = this.getJobDefinition(queueName, jobName);

    // Validate input if schema exists
    if (definition?.input) {
      await IgniterJobsValidationUtils.validateInput(
        definition.input as any,
        params.input,
      );
    }

    // Resolve scope
    const scope = this.resolveScope(params.scope);
    const metadata = IgniterJobsScopeUtils.mergeMetadataWithScope(
      params.metadata as any,
      scope,
    );

    // Dispatch to adapter
    const jobId = await this.adapter.dispatch({
      queue: queueName,
      jobName,
      ...params,
      scope,
      metadata,
    });

    // Publish event
    await this.publishJobEvent(
      queueName,
      jobName,
      "enqueued",
      { jobId, queue: queueName, jobName },
      scope,
    );

    // Emit telemetry
    this.emitTelemetry("igniter.jobs.job.enqueued", {
      "ctx.job.id": jobId,
      "ctx.job.name": jobName,
      "ctx.job.queue": queueName,
      "ctx.job.priority": (params as any).priority ?? null,
      "ctx.job.delay": (params as any).delay ?? null,
    });

    return jobId;
  }

  /**
   * Schedules a job for future processing.
   * @internal
   */
  private async scheduleJob(
    queueName: string,
    jobName: string,
    params: IgniterJobsScheduleParams<any>,
  ): Promise<string> {
    const definition = this.getJobDefinition(queueName, jobName);

    // Validate input if schema exists
    if (definition?.input) {
      await IgniterJobsValidationUtils.validateInput(
        definition.input as any,
        params.input,
      );
    }

    // Resolve scope
    const scope = this.resolveScope(params.scope);
    const metadata = IgniterJobsScopeUtils.mergeMetadataWithScope(
      params.metadata as any,
      scope,
    );

    // Schedule via adapter
    const jobId = await this.adapter.schedule({
      queue: queueName,
      jobName,
      ...params,
      scope,
      metadata,
    } as any);

    // Publish event
    await this.publishJobEvent(
      queueName,
      jobName,
      "scheduled",
      { jobId, queue: queueName, jobName },
      scope,
    );

    // Emit telemetry
    this.emitTelemetry("igniter.jobs.job.scheduled", {
      "ctx.job.id": jobId,
      "ctx.job.name": jobName,
      "ctx.job.queue": queueName,
      "ctx.job.scheduledAt": (params as any).runAt?.toISOString?.() ?? null,
      "ctx.job.cron": (params as any).cron ?? null,
    });

    return jobId;
  }

  // ---------------------------------------------------------------------------
  // Private Methods - Handler Wrapping
  // ---------------------------------------------------------------------------

  /**
   * Wraps a job definition with context building, validation, and telemetry.
   * @internal
   */
  private wrapJobDefinition(
    queueName: string,
    jobName: string,
    definition: IgniterJobDefinition<any, any, any>,
  ): IgniterJobDefinition<any, any, any> {
    const self = this;

    return {
      ...definition,

      handler: async (ctx: IgniterJobsExecutionContext<any, any>) => {
        const enhanced = await self.buildExecutionContext(
          ctx,
          queueName,
          jobName,
        );

        // Validate input if schema exists
        if (definition.input) {
          const validated = await IgniterJobsValidationUtils.validateInput(
            definition.input as any,
            enhanced.input,
          );
          (enhanced as any).input = validated;
        }

        return definition.handler(enhanced);
      },

      onStart: async (ctx: IgniterJobsHookContext<any, any>) => {
        const enhanced = await self.buildExecutionContext(
          ctx as any,
          queueName,
          jobName,
        );

        // Publish lifecycle event
        await self.publishJobEvent(
          queueName,
          jobName,
          "started",
          {
            jobId: enhanced.job.id,
            jobName,
            queue: queueName,
            attemptsMade: enhanced.job.attemptsMade,
            startedAt: new Date().toISOString(),
          },
          (enhanced as any).scope,
        );

        // Emit telemetry
        self.emitTelemetry("igniter.jobs.job.started", {
          "ctx.job.id": enhanced.job.id,
          "ctx.job.name": jobName,
          "ctx.job.queue": queueName,
          "ctx.job.attempt": enhanced.job.attemptsMade,
          "ctx.job.maxAttempts": definition.attempts ?? 3,
        });

        await definition.onStart?.(enhanced as any);
      },

      onSuccess: async (ctx: any) => {
        const enhanced = await self.buildExecutionContext(
          ctx as any,
          queueName,
          jobName,
        );
        const duration = ctx.duration ?? ctx.executionTime ?? 0;

        // Publish lifecycle event
        await self.publishJobEvent(
          queueName,
          jobName,
          "completed",
          {
            jobId: enhanced.job.id,
            jobName,
            queue: queueName,
            result: ctx.result,
            duration,
            completedAt: new Date().toISOString(),
          },
          (enhanced as any).scope,
        );

        // Emit telemetry
        self.emitTelemetry("igniter.jobs.job.completed", {
          "ctx.job.id": enhanced.job.id,
          "ctx.job.name": jobName,
          "ctx.job.queue": queueName,
          "ctx.job.duration": typeof duration === "number" ? duration : 0,
        });

        await definition.onSuccess?.(enhanced as any);
      },

      onFailure: async (ctx: any) => {
        const enhanced = await self.buildExecutionContext(
          ctx as any,
          queueName,
          jobName,
        );
        const duration = ctx.duration ?? ctx.executionTime ?? 0;
        const isFinalAttempt = Boolean(ctx.isFinalAttempt);
        const errorMessage = ctx.error?.message ?? String(ctx.error);
        const errorCode = ctx.error?.code;
        const maxAttempts = definition.attempts ?? 3;

        // Publish lifecycle event
        await self.publishJobEvent(
          queueName,
          jobName,
          "failed",
          {
            jobId: enhanced.job.id,
            jobName,
            queue: queueName,
            error: { message: errorMessage },
            attemptsMade: enhanced.job.attemptsMade,
            isFinalAttempt,
            duration,
            failedAt: new Date().toISOString(),
          },
          (enhanced as any).scope,
        );

        // Emit telemetry
        self.emitTelemetry(
          "igniter.jobs.job.failed",
          {
            "ctx.job.id": enhanced.job.id,
            "ctx.job.name": jobName,
            "ctx.job.queue": queueName,
            "ctx.job.error.message": errorMessage,
            "ctx.job.error.code": errorCode ?? null,
            "ctx.job.attempt": enhanced.job.attemptsMade,
            "ctx.job.maxAttempts": maxAttempts,
            "ctx.job.isFinalAttempt": isFinalAttempt,
          },
          "error",
        );

        await definition.onFailure?.(enhanced as any);
      },

      onProgress: definition.onProgress
        ? async (ctx: any) => {
            const enhanced = await self.buildExecutionContext(
              ctx as any,
              queueName,
              jobName,
            );
            const progress = ctx.progress ?? 0;
            const message = ctx.message;

            // Publish lifecycle event
            await self.publishJobEvent(
              queueName,
              jobName,
              "progress",
              {
                jobId: enhanced.job.id,
                jobName,
                queue: queueName,
                progress,
                message,
                timestamp: new Date().toISOString(),
              },
              (enhanced as any).scope,
            );

            // Emit telemetry
            self.emitTelemetry("igniter.jobs.job.progress", {
              "ctx.job.id": enhanced.job.id,
              "ctx.job.name": jobName,
              "ctx.job.queue": queueName,
              "ctx.job.progress": typeof progress === "number" ? progress : 0,
              "ctx.job.progress.message": message ?? null,
            });

            await definition.onProgress?.(enhanced as any);
          }
        : undefined,
    };
  }

  /**
   * Wraps a cron definition with context building and lifecycle events.
   * @internal
   */
  private wrapCronDefinition(
    queueName: string,
    cronName: string,
    definition: IgniterCronDefinition<any, any>,
  ): IgniterCronDefinition<any, any> {
    const self = this;

    return {
      ...definition,

      handler: async (ctx: any) => {
        const enhanced = await self.buildCronExecutionContext(
          ctx,
          queueName,
          cronName,
        );

        // Publish started event
        await self.publishJobEvent(
          queueName,
          cronName,
          "started",
          {
            jobId: enhanced.job?.id,
            jobName: cronName,
            queue: queueName,
            startedAt: new Date().toISOString(),
          },
          (enhanced as any).scope,
        );

        try {
          const result = await definition.handler(enhanced as any);

          // Publish completed event
          await self.publishJobEvent(
            queueName,
            cronName,
            "completed",
            {
              jobId: enhanced.job?.id,
              jobName: cronName,
              queue: queueName,
              result,
              completedAt: new Date().toISOString(),
            },
            (enhanced as any).scope,
          );

          return result;
        } catch (error) {
          // Publish failed event
          await self.publishJobEvent(
            queueName,
            cronName,
            "failed",
            {
              jobId: enhanced.job?.id,
              jobName: cronName,
              queue: queueName,
              error: { message: (error as any)?.message ?? String(error) },
              failedAt: new Date().toISOString(),
            },
            (enhanced as any).scope,
          );

          throw error;
        }
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Private Methods - Helpers
  // ---------------------------------------------------------------------------

  /**
   * Builds the execution context for a job.
   * @internal
   */
  private async buildExecutionContext(
    ctx: IgniterJobsExecutionContext<any, any>,
    queueName: string,
    jobName: string,
  ): Promise<IgniterJobsExecutionContext<any, any>> {
    const realContext = await this.config.contextFactory();
    const scope =
      ctx.scope ??
      IgniterJobsScopeUtils.extractScopeFromMetadata(ctx.job.metadata as any);

    return {
      ...ctx,
      context: realContext,
      job: { ...ctx.job, name: jobName, queue: queueName },
      scope,
    };
  }

  /**
   * Builds the execution context for a cron job.
   * @internal
   */
  private async buildCronExecutionContext(
    ctx: Omit<IgniterJobsExecutionContext<any, unknown>, "input">,
    queueName: string,
    cronName: string,
  ): Promise<Omit<IgniterJobsExecutionContext<any, unknown>, "input">> {
    const realContext = await this.config.contextFactory();
    const scope =
      (ctx as any).scope ??
      IgniterJobsScopeUtils.extractScopeFromMetadata(
        (ctx as any).job?.metadata,
      );

    return {
      ...ctx,
      context: realContext,
      job: { ...(ctx as any).job, name: cronName, queue: queueName },
      scope,
    } as any;
  }

  /**
   * Gets a job definition by queue and job name.
   * @internal
   */
  private getJobDefinition(
    queueName: string,
    jobName: string,
  ): IgniterJobDefinition<any, any, any> | undefined {
    const queue = this.config.queues[queueName] as
      | IgniterJobsQueue<any, any, any>
      | undefined;
    return queue?.jobs?.[jobName];
  }

  /**
   * Resolves the effective scope for a job operation.
   * @internal
   */
  private resolveScope(
    paramsScope?: IgniterJobsScopeEntry,
  ): IgniterJobsScopeEntry | undefined {
    if (!this.config.scopeDefinition) return undefined;

    const required =
      Object.values(
        this.config.scopeDefinition as Record<string, IgniterJobsScopeOptions>,
      )[0]?.required ?? false;

    const effective = this.scopeEntry ?? paramsScope;

    if (required && !effective) {
      throw new IgniterJobsError({
        code: "JOBS_CONFIGURATION_INVALID",
        message: "Scope is required for this jobs instance.",
      });
    }

    if (this.scopeEntry && paramsScope) {
      if (
        this.scopeEntry.type !== paramsScope.type ||
        this.scopeEntry.id !== paramsScope.id
      ) {
        throw new IgniterJobsError({
          code: "JOBS_CONFIGURATION_INVALID",
          message: "Cannot override scope on a scoped jobs instance.",
        });
      }
    }

    return effective;
  }

  /**
   * Builds the events channel string for subscriptions.
   * @internal
   */
  private buildEventsChannel(): string {
    return this.scopeEntry
      ? IgniterJobsPrefix.buildEventsChannel({
          service: this.config.service,
          environment: this.config.environment,
          scope: { type: this.scopeEntry.type, id: this.scopeEntry.id },
        })
      : IgniterJobsPrefix.buildEventsChannel({
          service: this.config.service,
          environment: this.config.environment,
        });
  }

  /**
   * Publishes a job lifecycle event.
   * @internal
   */
  private async publishJobEvent(
    queueName: string,
    jobName: string,
    eventType: string,
    data: Record<string, unknown>,
    scope?: IgniterJobsScopeEntry,
  ): Promise<void> {
    await IgniterJobsEventsUtils.publishJobsEvent({
      adapter: this.adapter,
      service: this.config.service,
      environment: this.config.environment,
      scope,
      event: {
        type: IgniterJobsEventsUtils.buildJobEventType(
          queueName,
          jobName,
          eventType,
        ),
        data,
        timestamp: new Date(),
        scope,
      },
    });
  }

  /**
   * Emits a telemetry event if telemetry is configured.
   * @internal
   */
  private emitTelemetry(
    eventName: string,
    attributes: Record<string, string | number | boolean | null>,
    level: "debug" | "info" | "error" = "info",
  ): void {
    if (!this.telemetry) return;

    this.telemetry.emit(eventName, {
      attributes: attributes as any,
      level,
    });
  }
}
