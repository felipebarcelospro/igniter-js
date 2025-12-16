/**
 * @fileoverview Core runtime factory for @igniter-js/jobs
 * @module @igniter-js/jobs/core/igniter-jobs
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
} from "../types/events";
import type { IgniterJobsScopeEntry } from "../types/scope";
import type { IgniterJobsScopeOptions } from "../types/scope";
import type { IgniterJobsQueue } from "../types/queue";
import type { IgniterJobsInternalState } from "../types/internal";

import { IgniterJobsBuilder } from "../builders/igniter-jobs.builder";
import { IgniterWorkerBuilder } from "../builders/igniter-worker.builder";
import { IgniterJobsError } from "../errors";
import { IgniterJobsPrefix } from "../utils/prefix";
import { IgniterJobsEventsUtils } from "../utils/events.utils";
import { IgniterJobsScopeUtils } from "../utils/scope";
import { IgniterJobsTelemetryUtils } from "../utils/telemetry";
import { IgniterJobsValidationUtils } from "../utils/validation";

/**
 * Runtime wrapper produced by `IgniterJobsBuilder`.
 *
 * The concrete implementation will expose queue/job proxies, management APIs,
 * worker builder access, and shutdown handling.
 */
export class IgniterJobs {
  /**
   * Starts the fluent builder API for jobs.
   *
   * @example
   * ```typescript
   * const jobs = IgniterJobs.create<AppContext>()
   *   .withAdapter(IgniterJobsMemoryAdapter.create())
   *   .withService('my-api')
   *   .withEnvironment('test')
   *   .withContext(async () => ({ db }))
   *   .addQueue(emailQueue)
   *   .build()
   * ```
   */
  public static create<TContext>() {
    return IgniterJobsBuilder.create<TContext>();
  }

  /**
   * Creates a runtime instance from a validated configuration.
   */
  public static fromConfig<TConfig extends IgniterJobsConfig<any, any, any>>(
    config: TConfig,
  ): IgniterJobsRuntime<TConfig> {
    const internal = createInternalState(config);
    return createRuntime(internal, undefined) as IgniterJobsRuntime<TConfig>;
  }
}

function createInternalState<TConfig extends IgniterJobsConfig<any, any, any>>(
  config: TConfig,
): IgniterJobsInternalState<TConfig> {
  return {
    config,
    adapter: config.adapter,
    registered: false,
  };
}

function createRuntime<TConfig extends IgniterJobsConfig<any, any, any>>(
  internal: IgniterJobsInternalState<TConfig>,
  boundScope: IgniterJobsScopeEntry | undefined,
): IgniterJobsRuntime<TConfig> {
  if (!internal.registered) {
    registerAll(internal.config, internal.adapter);
    internal.registered = true;
  }

  const baseChannel = IgniterJobsPrefix.buildEventsChannel({
    service: internal.config.service,
    environment: internal.config.environment,
  });
  const scopeChannel = boundScope
    ? IgniterJobsPrefix.buildEventsChannel({
        service: internal.config.service,
        environment: internal.config.environment,
        scope: { type: boundScope.type, id: boundScope.id },
      })
    : undefined;

  const runtime: any = {
    config: internal.config,

    async subscribe(handler: IgniterJobsEventHandler) {
      const channel = boundScope ? scopeChannel! : baseChannel;
      return internal.adapter.subscribeEvent(channel, async (payload: any) => {
        await handler(payload as IgniterJobsEvent);
      });
    },

    async search(
      target: "jobs" | "queues" | "workers",
      filter: Record<string, unknown>,
    ) {
      switch (target) {
        case "jobs":
          return internal.adapter.searchJobs(filter);
        case "queues":
          return internal.adapter.searchQueues(filter);
        case "workers":
          return internal.adapter.searchWorkers(filter);
        default:
          return [];
      }
    },

    async shutdown() {
      await internal.adapter.shutdown();
    },

    worker: {
      create: () =>
        new IgniterWorkerBuilder({
          adapter: internal.adapter,
          allowedQueues: Object.keys(internal.config.queues) as any,
        }),
    },
  };

  if (internal.config.scopeDefinition) {
    runtime.scope = (type: any, id: any, tags?: any) => {
      const scope: IgniterJobsScopeEntry = { type, id, tags };
      return createRuntime(internal, scope);
    };
  }

  for (const [queueName, queueConfig] of Object.entries(
    internal.config.queues as Record<string, IgniterJobsQueue<any, any, any>>,
  )) {
    runtime[queueName] = createQueueAccessor({
      internal,
      boundScope,
      queueName,
      queueConfig,
    });
  }

  return runtime as IgniterJobsRuntime<TConfig>;
}

function registerAll<TConfig extends IgniterJobsConfig>(
  config: TConfig,
  adapter: IgniterJobsAdapter,
): void {
  for (const [queueName, queue] of Object.entries(
    config.queues as Record<string, IgniterJobsQueue<any, any, any>>,
  )) {
    for (const [jobName, def] of Object.entries(
      queue.jobs as Record<string, IgniterJobDefinition<any, any, any>>,
    )) {
      adapter.registerJob(
        queueName,
        jobName,
        wrapJobDefinition({
          config,
          adapter,
          queueName,
          jobName,
          definition: def,
        }),
      );
    }

    for (const [cronName, cron] of Object.entries(
      queue.crons as Record<string, IgniterCronDefinition<any, any>>,
    )) {
      adapter.registerCron(
        queueName,
        cronName,
        wrapCronDefinition({
          config,
          adapter,
          queueName,
          cronName,
          definition: cron,
        }),
      );
    }
  }
}

function wrapCronDefinition(params: {
  config: IgniterJobsConfig<any, any, any>;
  adapter: IgniterJobsAdapter;
  queueName: string;
  cronName: string;
  definition: IgniterCronDefinition<any, any>;
}): IgniterCronDefinition<any, any> {
  const { config, adapter, queueName, cronName, definition } = params;

  const buildExecutionContext = async (
    ctx: Omit<IgniterJobsExecutionContext<any, unknown>, "input">,
  ): Promise<Omit<IgniterJobsExecutionContext<any, unknown>, "input">> => {
    const realContext = await config.contextFactory();
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
  };

  const publishLifecycle = async (
    event: string,
    ctx: Omit<IgniterJobsExecutionContext<any, unknown>, "input">,
    data: Record<string, unknown>,
  ) => {
    const scope =
      (ctx as any).scope ??
      IgniterJobsScopeUtils.extractScopeFromMetadata(
        (ctx as any).job?.metadata,
      );
    await IgniterJobsEventsUtils.publishJobsEvent({
      adapter,
      service: config.service,
      environment: config.environment,
      scope,
      event: {
        type: IgniterJobsEventsUtils.buildJobEventType(
          queueName,
          cronName,
          event,
        ),
        data,
        timestamp: new Date(),
        scope,
      },
    });
  };

  return {
    ...definition,
    handler: async (ctx) => {
      const enhanced = await buildExecutionContext(ctx as any);
      await publishLifecycle("started", enhanced as any, {
        jobId: (enhanced as any).job?.id,
        jobName: cronName,
        queue: queueName,
        startedAt: new Date().toISOString(),
      });

      try {
        const result = await definition.handler(enhanced as any);
        await publishLifecycle("completed", enhanced as any, {
          jobId: (enhanced as any).job?.id,
          jobName: cronName,
          queue: queueName,
          result,
          completedAt: new Date().toISOString(),
        });
        return result;
      } catch (error) {
        await publishLifecycle("failed", enhanced as any, {
          jobId: (enhanced as any).job?.id,
          jobName: cronName,
          queue: queueName,
          error: { message: (error as any)?.message ?? String(error) },
          failedAt: new Date().toISOString(),
        });
        throw error;
      }
    },
  };
}

function wrapJobDefinition(params: {
  config: IgniterJobsConfig<any, any, any>;
  adapter: IgniterJobsAdapter;
  queueName: string;
  jobName: string;
  definition: IgniterJobDefinition<any, any, any>;
}): IgniterJobDefinition<any, any, any> {
  const { config, queueName, jobName, definition } = params;

  const buildExecutionContext = async (
    ctx: IgniterJobsExecutionContext<any, any>,
  ): Promise<IgniterJobsExecutionContext<any, any>> => {
    const realContext = await config.contextFactory();
    const scope =
      ctx.scope ??
      IgniterJobsScopeUtils.extractScopeFromMetadata(ctx.job.metadata as any);
    return {
      ...ctx,
      context: realContext,
      job: { ...ctx.job, name: jobName, queue: queueName },
      scope,
    };
  };

  const publishLifecycle = async (
    event: string,
    ctx: IgniterJobsHookContext<any, any>,
    data: Record<string, unknown>,
  ) => {
    const scope =
      (ctx as any).scope ??
      IgniterJobsScopeUtils.extractScopeFromMetadata(
        (ctx as any).job?.metadata,
      );
    await IgniterJobsEventsUtils.publishJobsEvent({
      adapter: params.adapter,
      service: config.service,
      environment: config.environment,
      scope,
      event: {
        type: IgniterJobsEventsUtils.buildJobEventType(
          queueName,
          jobName,
          event,
        ),
        data,
        timestamp: new Date(),
        scope,
      },
    });
  };

  return {
    ...definition,
    handler: async (ctx: IgniterJobsExecutionContext<any, any>) => {
      const enhanced = await buildExecutionContext(ctx);
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
      const enhanced = await buildExecutionContext(ctx as any);
      await publishLifecycle("started", enhanced as any, {
        jobId: enhanced.job.id,
        jobName,
        queue: queueName,
        attemptsMade: enhanced.job.attemptsMade,
        startedAt: new Date().toISOString(),
      });

      // Emit telemetry event
      IgniterJobsTelemetryUtils.emitTelemetry(
        config.telemetry,
        "igniter.jobs.job.started",
        {
          "ctx.job.id": enhanced.job.id,
          "ctx.job.name": jobName,
          "ctx.job.queue": queueName,
          "ctx.job.attempt": enhanced.job.attemptsMade,
          "ctx.job.maxAttempts": definition.attempts ?? 3,
        },
      );

      await definition.onStart?.(enhanced as any);
    },
    onSuccess: async (ctx: any) => {
      const enhanced = await buildExecutionContext(ctx as any);
      const duration = (ctx as any).duration ?? (ctx as any).executionTime ?? 0;
      await publishLifecycle(
        "completed",
        { ...(enhanced as any), duration } as any,
        {
          jobId: enhanced.job.id,
          jobName,
          queue: queueName,
          result: (ctx as any).result,
          duration,
          completedAt: new Date().toISOString(),
        },
      );

      // Emit telemetry event
      IgniterJobsTelemetryUtils.emitTelemetry(
        config.telemetry,
        "igniter.jobs.job.completed",
        {
          "ctx.job.id": enhanced.job.id,
          "ctx.job.name": jobName,
          "ctx.job.queue": queueName,
          "ctx.job.duration": typeof duration === "number" ? duration : 0,
        },
      );

      await definition.onSuccess?.(enhanced as any);
    },
    onFailure: async (ctx: any) => {
      const enhanced = await buildExecutionContext(ctx as any);
      const duration = (ctx as any).duration ?? (ctx as any).executionTime ?? 0;
      const isFinalAttempt = Boolean((ctx as any).isFinalAttempt);
      const errorMessage =
        (ctx as any).error?.message ?? String((ctx as any).error);
      const errorCode = (ctx as any).error?.code;
      const maxAttempts = definition.attempts ?? 3;

      await publishLifecycle(
        "failed",
        { ...(enhanced as any), duration, isFinalAttempt } as any,
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
      );

      // Emit telemetry event
      IgniterJobsTelemetryUtils.emitTelemetry(
        config.telemetry,
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
          const enhanced = await buildExecutionContext(ctx as any);
          const progress = (ctx as any).progress ?? 0;
          const message = (ctx as any).message;

          await publishLifecycle("progress", enhanced as any, {
            jobId: enhanced.job.id,
            jobName,
            queue: queueName,
            progress,
            message,
            timestamp: new Date().toISOString(),
          });

          // Emit telemetry event
          IgniterJobsTelemetryUtils.emitTelemetry(
            config.telemetry,
            "igniter.jobs.job.progress",
            {
              "ctx.job.id": enhanced.job.id,
              "ctx.job.name": jobName,
              "ctx.job.queue": queueName,
              "ctx.job.progress": typeof progress === "number" ? progress : 0,
              "ctx.job.progress.message": message ?? null,
            },
          );

          await definition.onProgress?.(enhanced as any);
        }
      : undefined,
  };
}

function createQueueAccessor(params: {
  internal: IgniterJobsInternalState<any>;
  boundScope?: IgniterJobsScopeEntry;
  queueName: string;
  queueConfig: IgniterJobsQueue<any, any, any>;
}) {
  const { internal, boundScope, queueName, queueConfig } = params;

  const queueAccessor: any = {
    async list(filter?: {
      status?: IgniterJobStatus[];
      limit?: number;
      offset?: number;
    }) {
      return internal.adapter.queues.getJobs(queueName, filter);
    },

    get() {
      return {
        retrieve: () => internal.adapter.getQueueInfo(queueName),
        pause: () => internal.adapter.pauseQueue(queueName),
        resume: () => internal.adapter.resumeQueue(queueName),
        drain: () => internal.adapter.drainQueue(queueName),
        clean: (options: any) =>
          internal.adapter.cleanQueue(queueName, options),
        obliterate: (options?: any) =>
          internal.adapter.obliterateQueue(queueName, options),
        retryAll: () => internal.adapter.retryAllInQueue(queueName),
      };
    },

    async subscribe(handler: IgniterJobsEventHandler) {
      const channel = boundScope
        ? IgniterJobsPrefix.buildEventsChannel({
            service: internal.config.service,
            environment: internal.config.environment,
            scope: { type: boundScope.type, id: boundScope.id },
          })
        : IgniterJobsPrefix.buildEventsChannel({
            service: internal.config.service,
            environment: internal.config.environment,
          });

      return internal.adapter.subscribeEvent(channel, async (event: any) => {
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

  for (const jobName of Object.keys(queueConfig.jobs)) {
    queueAccessor.jobs[jobName] = createJobAccessor({
      internal,
      boundScope,
      queueName,
      jobName,
    });
    queueAccessor[jobName] = queueAccessor.jobs[jobName];
  }

  return queueAccessor;
}

function createJobAccessor(params: {
  internal: IgniterJobsInternalState<any>;
  boundScope?: IgniterJobsScopeEntry;
  queueName: string;
  jobName: string;
}) {
  const { internal, boundScope, queueName, jobName } = params;

  const resolveScope = (
    paramsScope?: IgniterJobsScopeEntry,
  ): IgniterJobsScopeEntry | undefined => {
    if (!internal.config.scopeDefinition) return undefined;
    const required =
      Object.values(
        internal.config.scopeDefinition as Record<
          string,
          IgniterJobsScopeOptions
        >,
      )[0]?.required ?? false;

    const effective = boundScope ?? paramsScope;
    if (required && !effective) {
      throw new IgniterJobsError({
        code: "JOBS_CONFIGURATION_INVALID",
        message: "Scope is required for this jobs instance.",
      });
    }

    if (boundScope && paramsScope) {
      if (
        boundScope.type !== paramsScope.type ||
        boundScope.id !== paramsScope.id
      ) {
        throw new IgniterJobsError({
          code: "JOBS_CONFIGURATION_INVALID",
          message: "Cannot override scope on a scoped jobs instance.",
        });
      }
    }

    return effective;
  };

  const publish = async (event: IgniterJobsEvent) => {
    await IgniterJobsEventsUtils.publishJobsEvent({
      adapter: internal.adapter,
      service: internal.config.service,
      environment: internal.config.environment,
      scope: event.scope,
      event,
    });
  };

  const getDefinition = (): IgniterJobDefinition<any, any, any> | undefined => {
    const q = internal.config.queues[queueName] as any;
    return q?.jobs?.[jobName];
  };

  return {
    async dispatch(params: IgniterJobsDispatchParams<any>) {
      const definition = getDefinition();
      if (definition?.input) {
        await IgniterJobsValidationUtils.validateInput(
          definition.input as any,
          params.input,
        );
      }

      const scope = resolveScope(params.scope);
      const metadata = IgniterJobsScopeUtils.mergeMetadataWithScope(
        params.metadata as any,
        scope,
      );
      const jobId = await internal.adapter.dispatch({
        queue: queueName,
        jobName,
        ...params,
        scope,
        metadata,
      });
      await publish({
        type: IgniterJobsEventsUtils.buildJobEventType(
          queueName,
          jobName,
          "enqueued",
        ),
        data: { jobId, queue: queueName, jobName },
        timestamp: new Date(),
        scope,
      });

      // Emit telemetry event for job enqueued
      IgniterJobsTelemetryUtils.emitTelemetry(
        internal.config.telemetry,
        "igniter.jobs.job.enqueued",
        {
          "ctx.job.id": jobId,
          "ctx.job.name": jobName,
          "ctx.job.queue": queueName,
          "ctx.job.priority": (params as any).priority ?? null,
          "ctx.job.delay": (params as any).delay ?? null,
        },
      );

      return jobId;
    },

    async schedule(params: IgniterJobsScheduleParams<any>) {
      const definition = getDefinition();
      if (definition?.input) {
        await IgniterJobsValidationUtils.validateInput(
          definition.input as any,
          params.input,
        );
      }

      const scope = resolveScope(params.scope);
      const metadata = IgniterJobsScopeUtils.mergeMetadataWithScope(
        params.metadata as any,
        scope,
      );
      const jobId = await internal.adapter.schedule({
        queue: queueName,
        jobName,
        ...params,
        scope,
        metadata,
      } as any);
      await publish({
        type: IgniterJobsEventsUtils.buildJobEventType(
          queueName,
          jobName,
          "scheduled",
        ),
        data: { jobId, queue: queueName, jobName },
        timestamp: new Date(),
        scope,
      });

      // Emit telemetry event for job scheduled
      IgniterJobsTelemetryUtils.emitTelemetry(
        internal.config.telemetry,
        "igniter.jobs.job.scheduled",
        {
          "ctx.job.id": jobId,
          "ctx.job.name": jobName,
          "ctx.job.queue": queueName,
          "ctx.job.scheduledAt": (params as any).runAt?.toISOString?.() ?? null,
          "ctx.job.cron": (params as any).cron ?? null,
        },
      );

      return jobId;
    },

    get(id: string) {
      return {
        retrieve: () => internal.adapter.getJob(id, queueName),
        retry: () => internal.adapter.retryJob(id, queueName),
        remove: () => internal.adapter.removeJob(id, queueName),
        promote: () => internal.adapter.promoteJob(id, queueName),
        move: (state: "failed", reason: string) => {
          if (state !== "failed") return Promise.resolve();
          return internal.adapter.moveJobToFailed(id, reason, queueName);
        },
        state: () => internal.adapter.getJobState(id, queueName),
        progress: () => internal.adapter.getJobProgress(id, queueName),
        logs: () => internal.adapter.getJobLogs(id, queueName),
      };
    },

    many(ids: string[]) {
      return {
        retry: () => internal.adapter.retryManyJobs(ids, queueName),
        remove: () => internal.adapter.removeManyJobs(ids, queueName),
      };
    },

    pause: () => internal.adapter.pauseJobType(queueName, jobName),
    resume: () => internal.adapter.resumeJobType(queueName, jobName),

    async subscribe(handler: IgniterJobsEventHandler) {
      const channel = boundScope
        ? IgniterJobsPrefix.buildEventsChannel({
            service: internal.config.service,
            environment: internal.config.environment,
            scope: { type: boundScope.type, id: boundScope.id },
          })
        : IgniterJobsPrefix.buildEventsChannel({
            service: internal.config.service,
            environment: internal.config.environment,
          });

      return internal.adapter.subscribeEvent(channel, async (event: any) => {
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
