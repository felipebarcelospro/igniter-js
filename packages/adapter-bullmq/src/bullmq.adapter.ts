import type {
  IgniterJobQueueAdapter,
  JobSearchResult,
  JobQueueConfig,
  JobStatus,
  JobsRouter,
  JobsRouterConfig,
  MergedJobsExecutor,
  MergedJobsRouter,
  JobsNamespaceExecutor,
  JobDefinition,
  AdvancedScheduleOptions,
  SchedulePattern,
  CronJobOptions,
  CronJobHandler,
  CronSchedule,
  CronJobExecutionContext,
  JobHookInfo,
  JobStartHookContext,
  JobSuccessHookContext,
  JobFailureHookContext,
  JobCompleteHookContext,
  WorkerHandle,
  WorkerMetrics,
  QueueManager,
  JobManager,
  JobCounts,
  QueueInfo,
  QueueCleanOptions,
  JobLog,
  JobSearchFilter,
  JobsManagementApi,
} from "@igniter-js/core";
import { isServer, SchedulePatterns } from "@igniter-js/core";
import type {
  BullMQAdapterOptions,
  BullMQInstances,
  BullMQQueue,
  BullMQJob,
  BullMQWorkerHandle,
  BullMQWorkerMetricsState,
} from "./types";
import {
  createJobsRouter,
  createJobsRegistry,
  createJobsProxy,
} from "@igniter-js/core";
import type { StandardSchemaV1 } from "@igniter-js/core";
import type { JobExecutionContext } from "@igniter-js/core";
import { IgniterError } from "@igniter-js/core";

/**
 * Creates a Job Queue Adapter for BullMQ.
 *
 * This adapter provides a unified interface for Igniter to interact with BullMQ,
 * handling job registration, invocation, search, and worker management with
 * full support for multi-tenancy and advanced scheduling.
 *
 * @param options - Configuration options for the BullMQ adapter
 * @returns A complete `IgniterJobQueueAdapter` implementation
 *
 * @example
 * ```typescript
 * import { createBullMQAdapter } from "@igniter-js/core/adapters";
 * import { createRedisStoreAdapter } from "@igniter-js/core/adapters";
 * import type { IgniterAppContext } from "@/igniter.context";
 *
 * const redisStore = createRedisStoreAdapter(redisClient);
 * const jobQueue = createBullMQAdapter<IgniterAppContext>({ store: redisStore });
 *
 * const igniter = Igniter
 *   .context<IgniterAppContext>()
 *   .store(redisStore)
 *   .jobs(jobQueue)
 *   .create();
 * ```
 */
export function createBullMQAdapter<TContext extends object>(
  options: BullMQAdapterOptions = {},
): IgniterJobQueueAdapter<TContext> {
  if (!isServer) {
    return {} as IgniterJobQueueAdapter<TContext>;
  }

  const { Queue, Worker } = require("bullmq");

  // Store context factory for job execution
  const context = options.context;
  const logger = options.logger;

  // Internal state management
  const instances: BullMQInstances = {
    queues: new Map(),
    workers: new Map(),
    workerHandles: new Map(),
    registeredJobs: new Map(),
  };

  // Worker metrics tracking
  const workerMetrics: Map<string, BullMQWorkerMetricsState> = new Map();

  // Extract Redis connection from store adapter if provided
  const redisConnection = options.store?.client
    ? // If store has a Redis client, use it directly
      options.store.client
    : // Fallback to default Redis connection
      {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || "0"),
      };

  /**
   * Constructs the full queue name with prefix support for multi-tenancy.
   *
   * @param queueConfig - Queue configuration object
   * @returns Formatted queue name with prefixes applied
   *
   * @internal
   */
  function buildQueueName(queueConfig?: JobQueueConfig): string {
    const baseName = queueConfig?.name || "default";
    const parts: string[] = [];

    if (options.globalPrefix) {
      parts.push(options.globalPrefix);
    }

    if (queueConfig?.prefix) {
      parts.push(queueConfig.prefix);
    }

    parts.push(baseName);
    return parts.join("__"); // Using double underscore as separator instead of colon
  }

  /**
   * Gets or creates a BullMQ Queue instance for the specified configuration.
   *
   * @param queueConfig - Queue configuration
   * @returns BullMQ Queue instance
   *
   * @internal
   */
  function getOrCreateQueue(queueConfig?: JobQueueConfig): BullMQQueue {
    const queueName = buildQueueName(queueConfig);

    if (!instances.queues.has(queueName)) {
      logger?.info(`Creating queue: ${queueName}`);

      const queue = new Queue(queueName, {
        connection: redisConnection,
        ...options.queueOptions,
      });

      instances.queues.set(queueName, queue);
    }

    return instances.queues.get(queueName)!;
  }

  /**
   * Converts a BullMQ Job to our standardized JobSearchResult format.
   *
   * @param job - BullMQ job instance
   * @returns Standardized job search result
   *
   * @internal
   */
  function mapBullMQJobToResult(job: BullMQJob): JobSearchResult {
    const status: JobStatus = job.finishedOn
      ? job.failedReason
        ? "failed"
        : "completed"
      : job.processedOn
        ? "active"
        : job.opts.delay && job.opts.delay > Date.now()
          ? "delayed"
          : "waiting";

    return {
      id: job.name,
      name: job.name,
      payload: job.data,
      status,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      result: job.returnvalue,
      error: job.failedReason,
      attemptsMade: job.attemptsMade,
      priority: job.opts.priority || 0,
      metadata: job.opts.jobId ? { jobId: job.opts.jobId } : undefined,
    };
  }

  /**
   * Validates that a job is registered before allowing operations on it.
   *
   * @param jobId - The job ID to validate
   * @throws Error if the job is not registered
   *
   * @internal
   */
  function validateJobExists(jobId: string): void {
    if (!instances.registeredJobs.has(jobId)) {
      throw new IgniterError({
        code: "JOB_NOT_REGISTERED",
        message: `Job "${jobId}" is not registered. Please register it first using jobs.register().`,
        logger,
      });
    }
  }

  /**
   * Validates a cron expression for basic syntax correctness.
   *
   * @param cronExpression - The cron expression to validate
   * @throws Error if the cron expression is invalid
   *
   * @internal
   */
  function validateCronExpression(cronExpression: string): void {
    // Basic cron validation - 5 or 6 fields separated by spaces
    const parts = cronExpression.trim().split(/\s+/);

    if (parts.length < 5 || parts.length > 6) {
      throw new IgniterError({
        code: "INVALID_CRON_EXPRESSION",
        message:
          `Invalid cron expression "${cronExpression}". ` +
          `Expected 5 or 6 fields (minute hour day month weekday [year]), got ${parts.length}.`,
        logger,
      });
    }

    // Validate each field has valid characters
    const validCronChars = /^[0-9*\/,-]+$/;
    for (let i = 0; i < parts.length; i++) {
      if (!validCronChars.test(parts[i])) {
        throw new IgniterError({
          code: "INVALID_CRON_FIELD",
          message:
            `Invalid cron expression "${cronExpression}". ` +
            `Field ${i + 1} "${parts[i]}" contains invalid characters. ` +
            `Only numbers, *, /, ,, and - are allowed.`,
          logger,
        });
      }
    }

    // Additional validation for common mistakes
    const [minute, hour, day, month, weekday, year] = parts;

    // Check ranges (basic validation)
    if (
      minute !== "*" &&
      !minute.includes("/") &&
      !minute.includes(",") &&
      !minute.includes("-")
    ) {
      const min = parseInt(minute);
      if (isNaN(min) || min < 0 || min > 59) {
        throw new IgniterError({
          code: "INVALID_MINUTE_VALUE",
          message: `Invalid minute value "${minute}" in cron expression. Must be 0-59, *, or use special characters.`,
          logger,
        });
      }
    }

    if (
      hour !== "*" &&
      !hour.includes("/") &&
      !hour.includes(",") &&
      !hour.includes("-")
    ) {
      const hr = parseInt(hour);
      if (isNaN(hr) || hr < 0 || hr > 23) {
        throw new IgniterError({
          code: "INVALID_HOUR_VALUE",
          message: `Invalid hour value "${hour}" in cron expression. Must be 0-23, *, or use special characters.`,
          logger,
        });
      }
    }
  }

  /**
   * Generates a unique cron job name based on schedule and options.
   *
   * @param schedule - The cron schedule
   * @param options - Cron job options
   * @returns A unique job name
   *
   * @internal
   */
  function generateCronJobName(
    schedule: string,
    options?: CronJobOptions,
  ): string {
    if (options?.jobName) {
      return options.jobName;
    }

    // Create a descriptive name based on the schedule
    const scheduleHash = schedule.replace(/[^a-zA-Z0-9]/g, "_");
    const timestamp = Date.now().toString(36);
    const randomSuffix = Math.random().toString(36).substring(2, 8); // Add random suffix for uniqueness

    return `cron_${scheduleHash}_${timestamp}_${randomSuffix}`;
  }

  /**
   * Creates enhanced job information for hooks.
   *
   * @param job - BullMQ job instance
   * @param queueName - Name of the queue
   * @param namespace - Optional namespace from router
   * @param executionTime - Current execution time in ms
   * @returns Enhanced job info
   *
   * @internal
   */
  function createJobHookInfo(
    job: BullMQJob,
    queueName: string,
    namespace?: string,
    executionTime?: number,
  ): JobHookInfo {
    return {
      id: job.id!,
      name: job.name,
      attemptsMade: job.attemptsMade,
      createdAt: new Date(job.timestamp),
      metadata: job.opts.metadata,
      namespace,
      queueName,
      startedAt: job.processedOn ? new Date(job.processedOn) : new Date(),
      executionTime,
    };
  }

  /**
   * Safely executes a hook function, catching and logging any errors.
   *
   * @param hookName - Name of the hook for logging
   * @param hookFn - Hook function to execute
   * @param context - Hook context
   *
   * @internal
   */
  async function safelyExecuteHook(
    hookName: string,
    hookFn: ((...args: any[]) => void | Promise<void>) | undefined,
    context: any,
  ): Promise<void> {
    if (!hookFn) return;

    try {
      await hookFn(context);
    } catch (error) {
      logger?.error(`Hook "${hookName}" failed:`, error);
      // Hook errors should not fail the job - they are fire-and-forget
    }
  }

  /**
   * Processes advanced schedule options and converts them to BullMQ-compatible options.
   *
   * @param options - Advanced scheduling options
   * @returns BullMQ-compatible job options
   *
   * @internal
   */
  function processAdvancedScheduleOptions(
    options: AdvancedScheduleOptions | SchedulePattern,
  ): any {
    // Handle predefined schedule patterns
    if (typeof options === "string" && options in SchedulePatterns) {
      options = SchedulePatterns[options as SchedulePattern];
    }

    const opts = options as AdvancedScheduleOptions;
    const bullMQOptions: any = { ...opts };

    // ==========================================
    // BASIC SCHEDULING
    // ==========================================

    // Handle 'at' vs 'delay' timing
    if (opts.at && opts.delay) {
      throw new IgniterError({
        code: "INVALID_SCHEDULE_OPTIONS",
        message:
          'Cannot specify both "at" and "delay" options. Use one or the other.',
        logger,
      });
    }

    if (opts.at) {
      const now = Date.now();
      const targetTime = opts.at.getTime();

      if (targetTime <= now) {
        throw new IgniterError({
          code: "INVALID_SCHEDULE_TIME",
          message: `Scheduled time must be in the future. Received: ${opts.at.toISOString()}`,
          logger,
        });
      }

      bullMQOptions.delay = targetTime - now;
      delete bullMQOptions.at; // Remove since BullMQ uses delay
    }

    // ==========================================
    // ADVANCED REPETITION
    // ==========================================

    if (opts.repeat) {
      const repeatConfig: any = {};

      // Handle basic repeat configurations
      if (opts.repeat.cron) {
        repeatConfig.pattern = opts.repeat.cron;
      } else if (opts.repeat.every) {
        repeatConfig.every = opts.repeat.every;
      }

      if (opts.repeat.times) {
        repeatConfig.limit = opts.repeat.times;
      }

      if (opts.repeat.until) {
        repeatConfig.endDate = opts.repeat.until;
      }

      // Handle business hours and weekend logic
      if (opts.repeat.onlyBusinessHours || opts.repeat.skipWeekends) {
        // We'll need to implement custom logic in the worker for these features
        // For now, store them in metadata to be processed by the worker
        bullMQOptions.metadata = {
          ...bullMQOptions.metadata,
          advancedScheduling: {
            onlyBusinessHours: opts.repeat.onlyBusinessHours,
            skipWeekends: opts.repeat.skipWeekends,
            businessHours: opts.repeat.businessHours,
            skipDates: opts.repeat.skipDates,
            onlyWeekdays: opts.repeat.onlyWeekdays,
            between: opts.repeat.between,
          },
        };
      }

      bullMQOptions.repeat = repeatConfig;
    }

    // ==========================================
    // RETRY STRATEGY
    // ==========================================

    if (opts.retryStrategy) {
      switch (opts.retryStrategy) {
        case "exponential":
          // Implement exponential backoff
          const backoffMultiplier = opts.backoffMultiplier || 2;
          const maxRetryDelay = opts.maxRetryDelay || 60000; // Default 1 minute max

          bullMQOptions.backoff = {
            type: "exponential",
            settings: {
              multiplier: backoffMultiplier,
              max: maxRetryDelay,
            },
          };
          break;

        case "linear":
          bullMQOptions.backoff = {
            type: "fixed",
            settings: {
              delay: 5000, // 5 seconds default
            },
          };
          break;

        case "fixed":
          bullMQOptions.backoff = {
            type: "fixed",
            settings: {
              delay: opts.delay || 1000,
            },
          };
          break;

        default:
          if (
            typeof opts.retryStrategy === "object" &&
            opts.retryStrategy.type === "custom"
          ) {
            // Custom retry delays
            bullMQOptions.backoff = {
              type: "custom",
              settings: {
                delays: opts.retryStrategy.delays,
              },
            };
          }
          break;
      }

      // Add jitter if specified
      if (opts.jitterFactor && opts.jitterFactor > 0) {
        bullMQOptions.metadata = {
          ...bullMQOptions.metadata,
          jitterFactor: opts.jitterFactor,
        };
      }
    }

    // ==========================================
    // CONDITIONAL EXECUTION
    // ==========================================

    if (opts.condition) {
      // Store condition function in metadata for worker evaluation
      bullMQOptions.metadata = {
        ...bullMQOptions.metadata,
        hasCondition: true,
        // Note: We can't serialize the function, so we'll need a different approach
        // for conditions in a distributed system
      };
    }

    if (opts.skipIfRunning) {
      bullMQOptions.jobId =
        typeof opts.skipIfRunning === "string"
          ? opts.skipIfRunning
          : `${Date.now()}-${Math.random()}`;
    }

    if (opts.maxConcurrency) {
      bullMQOptions.metadata = {
        ...bullMQOptions.metadata,
        maxConcurrency: opts.maxConcurrency,
      };
    }

    // ==========================================
    // NOTIFICATION & MONITORING
    // ==========================================

    if (opts.webhookUrl) {
      bullMQOptions.metadata = {
        ...bullMQOptions.metadata,
        webhookUrl: opts.webhookUrl,
      };
    }

    if (opts.tags) {
      bullMQOptions.metadata = {
        ...bullMQOptions.metadata,
        tags: opts.tags,
      };
    }

    if (opts.priorityBoost) {
      bullMQOptions.priority =
        (bullMQOptions.priority || 0) + opts.priorityBoost;
    }

    if (opts.timeout) {
      bullMQOptions.metadata = {
        ...bullMQOptions.metadata,
        timeout: opts.timeout,
      };
    }

    return bullMQOptions;
  }

  /**
   * Checks if the current time falls within business hours.
   *
   * @param businessHours - Business hours configuration
   * @returns True if current time is within business hours
   *
   * @internal
   */
  function isWithinBusinessHours(businessHours?: {
    start: number;
    end: number;
    timezone?: string;
  }): boolean {
    const now = new Date();
    const currentHour = now.getHours();

    const startHour = businessHours?.start || 9; // Default 9 AM
    const endHour = businessHours?.end || 17; // Default 5 PM

    return currentHour >= startHour && currentHour < endHour;
  }

  /**
   * Checks if the current date is a weekend (Saturday or Sunday).
   *
   * @param date - Date to check (defaults to current date)
   * @returns True if the date is a weekend
   *
   * @internal
   */
  function isWeekend(date: Date = new Date()): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  }

  /**
   * Checks if a date should be skipped based on advanced scheduling rules.
   *
   * @param metadata - Job metadata containing scheduling rules
   * @returns True if the job should be skipped
   *
   * @internal
   */
  function shouldSkipExecution(metadata?: any): boolean {
    if (!metadata?.advancedScheduling) return false;

    const scheduling = metadata.advancedScheduling;
    const now = new Date();

    // Check business hours
    if (
      scheduling.onlyBusinessHours &&
      !isWithinBusinessHours(scheduling.businessHours)
    ) {
      return true;
    }

    // Check weekends
    if (scheduling.skipWeekends && isWeekend(now)) {
      return true;
    }

    // Check specific weekdays
    if (scheduling.onlyWeekdays && Array.isArray(scheduling.onlyWeekdays)) {
      const currentDay = now.getDay();
      if (!scheduling.onlyWeekdays.includes(currentDay)) {
        return true;
      }
    }

    // Check skip dates
    if (scheduling.skipDates && Array.isArray(scheduling.skipDates)) {
      const currentDate = now.toDateString();
      for (const skipDate of scheduling.skipDates) {
        if (new Date(skipDate).toDateString() === currentDate) {
          return true;
        }
      }
    }

    // Check time window
    if (
      scheduling.between &&
      Array.isArray(scheduling.between) &&
      scheduling.between.length === 2
    ) {
      const [start, end] = scheduling.between.map((d: any) => new Date(d));
      if (now < start || now > end) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sends a webhook notification for job completion.
   *
   * @param webhookUrl - The webhook URL to send the notification to
   * @param payload - The notification payload
   *
   * @internal
   */
  async function sendWebhookNotification(
    webhookUrl: string,
    payload: any,
  ): Promise<void> {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Igniter-Jobs-Webhook/1.0",
        },
        body: JSON.stringify({
          ...payload,
          timestamp: new Date().toISOString(),
          source: "igniter-jobs",
          version: "1.0.0",
        }),
      });

      if (!response.ok) {
        logger?.error(
          `Webhook returned ${response.status}: ${response.statusText}`,
        );
        return;
      }

      logger?.info(`Webhook notification sent successfully to ${webhookUrl}`);
    } catch (error) {
      logger?.error(
        `Failed to send webhook notification to ${webhookUrl}:`,
        error,
      );
    }
  }

  /**
   * Finds a queue that contains a specific job.
   * Searches all registered queues for the job ID.
   *
   * @param jobId - The job ID to find
   * @returns The queue containing the job or undefined
   */
  async function findQueueForJob(
    jobId: string,
  ): Promise<BullMQQueue | undefined> {
    for (const queue of instances.queues.values()) {
      const job = await queue.getJob(jobId);
      if (job) {
        return queue;
      }
    }
    return undefined;
  }

  /**
   * Creates a WorkerHandle for controlling a BullMQ worker.
   *
   * @param worker - The BullMQ Worker instance
   * @param queueName - Name of the queue
   * @param workerKey - Unique key for the worker
   * @param config - Worker configuration
   * @returns A BullMQWorkerHandle instance
   */
  function createWorkerHandle(
    worker: any, // BullMQ Worker
    queueName: string,
    workerKey: string,
    config: { concurrency: number; queues: string[] },
  ): BullMQWorkerHandle {
    const startedAt = new Date();

    // Initialize metrics for this worker
    workerMetrics.set(workerKey, {
      processed: 0,
      failed: 0,
      totalDuration: 0,
      startedAt,
    });

    // Track job completion for metrics
    worker.on("completed", () => {
      const metrics = workerMetrics.get(workerKey);
      if (metrics) {
        metrics.processed++;
      }
    });

    worker.on("failed", () => {
      const metrics = workerMetrics.get(workerKey);
      if (metrics) {
        metrics.failed++;
      }
    });

    const handle: BullMQWorkerHandle = {
      id: workerKey,
      queueName,
      worker,
      config,
      startedAt,

      async pause() {
        await worker.pause();
        logger?.info(`Worker ${workerKey} paused`);
      },

      async resume() {
        await worker.resume();
        logger?.info(`Worker ${workerKey} resumed`);
      },

      async close() {
        await worker.close();
        instances.workers.delete(workerKey);
        instances.workerHandles.delete(workerKey);
        workerMetrics.delete(workerKey);
        logger?.info(`Worker ${workerKey} closed`);
      },

      isRunning() {
        return worker.isRunning?.() ?? !worker.isPaused();
      },

      isPaused() {
        return worker.isPaused?.() ?? false;
      },

      isClosed() {
        return !instances.workers.has(workerKey);
      },

      async getMetrics(): Promise<WorkerMetrics> {
        const metrics = workerMetrics.get(workerKey);
        const uptime = Date.now() - startedAt.getTime();

        if (!metrics) {
          return {
            processed: 0,
            failed: 0,
            avgDuration: 0,
            concurrency: config.concurrency,
            uptime,
          };
        }

        const avgDuration =
          metrics.processed > 0 ? metrics.totalDuration / metrics.processed : 0;

        return {
          processed: metrics.processed,
          failed: metrics.failed,
          avgDuration,
          concurrency: config.concurrency,
          uptime,
        };
      },
    };

    return handle;
  }

  // ==========================================
  // QUEUE MANAGER IMPLEMENTATION
  // ==========================================

  const queuesManager: QueueManager = {
    async list(): Promise<QueueInfo[]> {
      const results: QueueInfo[] = [];

      for (const [name, queue] of instances.queues) {
        try {
          const isPaused = await queue.isPaused();
          const counts = await queue.getJobCounts(
            "waiting",
            "active",
            "completed",
            "failed",
            "delayed",
            "paused",
          );

          results.push({
            name,
            isPaused,
            jobCounts: {
              waiting: counts.waiting || 0,
              active: counts.active || 0,
              completed: counts.completed || 0,
              failed: counts.failed || 0,
              delayed: counts.delayed || 0,
              paused: counts.paused || 0,
            },
          });
        } catch (error) {
          logger?.error(`Failed to get info for queue ${name}:`, error);
        }
      }

      return results;
    },

    async get(queueName: string): Promise<QueueInfo | null> {
      const queue = instances.queues.get(queueName);
      if (!queue) {
        return null;
      }

      try {
        const isPaused = await queue.isPaused();
        const counts = await queue.getJobCounts(
          "waiting",
          "active",
          "completed",
          "failed",
          "delayed",
          "paused",
        );

        return {
          name: queueName,
          isPaused,
          jobCounts: {
            waiting: counts.waiting || 0,
            active: counts.active || 0,
            completed: counts.completed || 0,
            failed: counts.failed || 0,
            delayed: counts.delayed || 0,
            paused: counts.paused || 0,
          },
        };
      } catch (error) {
        logger?.error(`Failed to get info for queue ${queueName}:`, error);
        return null;
      }
    },

    async getJobCounts(queueName: string): Promise<JobCounts> {
      const queue = getOrCreateQueue({ name: queueName });
      const counts = await queue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
        "paused",
      );

      return {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
        paused: counts.paused || 0,
      };
    },

    async getJobs(
      queueName: string,
      filter?: JobSearchFilter,
    ): Promise<JobSearchResult[]> {
      const queue = getOrCreateQueue({ name: queueName });
      const results: JobSearchResult[] = [];

      const statuses = filter?.status || [
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
      ];
      const limit = filter?.limit || 100;
      const offset = filter?.offset || 0;

      for (const status of statuses) {
        try {
          const jobs = await queue.getJobs(
            [status as any],
            offset,
            offset + limit - 1,
          );
          for (const job of jobs) {
            if (results.length >= limit) break;
            results.push(mapBullMQJobToResult(job));
          }
        } catch (error) {
          logger?.error(
            `Failed to get ${status} jobs from ${queueName}:`,
            error,
          );
        }
      }

      return results.slice(0, limit);
    },

    async pause(queueName: string): Promise<void> {
      const queue = getOrCreateQueue({ name: queueName });
      await queue.pause();
      logger?.info(`Queue ${queueName} paused`);
    },

    async resume(queueName: string): Promise<void> {
      const queue = getOrCreateQueue({ name: queueName });
      await queue.resume();
      logger?.info(`Queue ${queueName} resumed`);
    },

    async isPaused(queueName: string): Promise<boolean> {
      const queue = instances.queues.get(queueName);
      if (!queue) {
        return false;
      }
      return queue.isPaused();
    },

    async drain(queueName: string): Promise<number> {
      const queue = getOrCreateQueue({ name: queueName });
      const countsBefore = await queue.getJobCounts("waiting");
      await queue.drain();
      logger?.info(
        `Queue ${queueName} drained (${countsBefore.waiting} jobs removed)`,
      );
      return countsBefore.waiting || 0;
    },

    async clean(
      queueName: string,
      options: QueueCleanOptions,
    ): Promise<number> {
      const queue = getOrCreateQueue({ name: queueName });
      const statuses = Array.isArray(options.status)
        ? options.status
        : [options.status];
      const grace = options.olderThan ?? 0;
      const limit = options.limit ?? 1000;

      let totalCleaned = 0;

      for (const status of statuses) {
        try {
          const cleaned = await queue.clean(grace, limit, status as any);
          totalCleaned += cleaned.length;
          logger?.info(
            `Cleaned ${cleaned.length} ${status} jobs from ${queueName}`,
          );
        } catch (error) {
          logger?.error(
            `Failed to clean ${status} jobs from ${queueName}:`,
            error,
          );
        }
      }

      return totalCleaned;
    },

    async obliterate(
      queueName: string,
      options?: { force?: boolean },
    ): Promise<void> {
      const queue = instances.queues.get(queueName);
      if (!queue) {
        logger?.warn(`Queue ${queueName} not found, nothing to obliterate`);
        return;
      }

      await queue.obliterate({ force: options?.force });
      instances.queues.delete(queueName);
      logger?.info(`Queue ${queueName} obliterated`);
    },
  };

  // ==========================================
  // JOB MANAGER IMPLEMENTATION
  // ==========================================

  const jobManager: JobManager = {
    async get(
      jobId: string,
      queueName?: string,
    ): Promise<JobSearchResult | null> {
      const queue = queueName
        ? instances.queues.get(queueName)
        : await findQueueForJob(jobId);

      if (!queue) {
        return null;
      }

      const job = await queue.getJob(jobId);
      return job ? mapBullMQJobToResult(job) : null;
    },

    async getState(
      jobId: string,
      queueName?: string,
    ): Promise<JobStatus | null> {
      const queue = queueName
        ? instances.queues.get(queueName)
        : await findQueueForJob(jobId);

      if (!queue) {
        return null;
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        return null;
      }

      const state = await job.getState();
      return state as JobStatus;
    },

    async getLogs(jobId: string, queueName?: string): Promise<JobLog[]> {
      const queue = queueName
        ? instances.queues.get(queueName)
        : await findQueueForJob(jobId);

      if (!queue) {
        return [];
      }

      try {
        const logs = await queue.getJobLogs(jobId);
        return logs.logs.map((log: string, index: number) => ({
          timestamp: new Date(), // BullMQ doesn't store timestamps per log
          message: log,
          level: "info" as const,
        }));
      } catch (error) {
        logger?.error(`Failed to get logs for job ${jobId}:`, error);
        return [];
      }
    },

    async getProgress(jobId: string, queueName?: string): Promise<number> {
      const queue = queueName
        ? instances.queues.get(queueName)
        : await findQueueForJob(jobId);

      if (!queue) {
        return 0;
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        return 0;
      }

      return (job.progress as number) || 0;
    },

    async retry(jobId: string, queueName?: string): Promise<void> {
      const queue = queueName
        ? instances.queues.get(queueName)
        : await findQueueForJob(jobId);

      if (!queue) {
        throw new IgniterError({
          code: "JOB_NOT_FOUND",
          message: `Job ${jobId} not found`,
          logger,
        });
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        throw new IgniterError({
          code: "JOB_NOT_FOUND",
          message: `Job ${jobId} not found`,
          logger,
        });
      }

      await job.retry();
      logger?.info(`Job ${jobId} retried`);
    },

    async remove(jobId: string, queueName?: string): Promise<void> {
      const queue = queueName
        ? instances.queues.get(queueName)
        : await findQueueForJob(jobId);

      if (!queue) {
        throw new IgniterError({
          code: "JOB_NOT_FOUND",
          message: `Job ${jobId} not found`,
          logger,
        });
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        throw new IgniterError({
          code: "JOB_NOT_FOUND",
          message: `Job ${jobId} not found`,
          logger,
        });
      }

      await job.remove();
      logger?.info(`Job ${jobId} removed`);
    },

    async promote(jobId: string, queueName?: string): Promise<void> {
      const queue = queueName
        ? instances.queues.get(queueName)
        : await findQueueForJob(jobId);

      if (!queue) {
        throw new IgniterError({
          code: "JOB_NOT_FOUND",
          message: `Job ${jobId} not found`,
          logger,
        });
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        throw new IgniterError({
          code: "JOB_NOT_FOUND",
          message: `Job ${jobId} not found`,
          logger,
        });
      }

      await job.promote();
      logger?.info(`Job ${jobId} promoted`);
    },

    async moveToFailed(
      jobId: string,
      reason: string,
      queueName?: string,
    ): Promise<void> {
      const queue = queueName
        ? instances.queues.get(queueName)
        : await findQueueForJob(jobId);

      if (!queue) {
        throw new IgniterError({
          code: "JOB_NOT_FOUND",
          message: `Job ${jobId} not found`,
          logger,
        });
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        throw new IgniterError({
          code: "JOB_NOT_FOUND",
          message: `Job ${jobId} not found`,
          logger,
        });
      }

      await job.moveToFailed(new Error(reason), "manual");
      logger?.info(`Job ${jobId} moved to failed: ${reason}`);
    },

    async retryMany(jobIds: string[], queueName?: string): Promise<void> {
      await Promise.all(jobIds.map((id) => this.retry(id, queueName)));
    },

    async removeMany(jobIds: string[], queueName?: string): Promise<void> {
      await Promise.all(jobIds.map((id) => this.remove(id, queueName)));
    },
  };

  return {
    client: { instances, options },

    // ==========================================
    // MANAGEMENT APIs
    // ==========================================

    queues: queuesManager,
    job: jobManager,

    getWorkers(): Map<string, WorkerHandle> {
      return instances.workerHandles as Map<string, WorkerHandle>;
    },

    async bulkRegister(jobs) {
      // Store job definitions with enhanced handlers that include context factory
      for (const [jobId, definition] of Object.entries(jobs)) {
        // Create enhanced job definition with context factory integration
        const enhancedDefinition = {
          ...definition,
          handler: async (executionContext: JobExecutionContext<any, any>) => {
            // Create real application context if context factory is available
            if (context) {
              try {
                const realContext = await context();
                const enhancedContext: JobExecutionContext<TContext, any> = {
                  ...executionContext,
                  context: realContext as TContext,
                };
                return await definition.handler(enhancedContext);
              } catch (contextError) {
                logger?.error(
                  `Failed to create context for job "${jobId}":`,
                  contextError,
                );
                throw new IgniterError({
                  code: "INVALID_CONTEXT",
                  message: `Context creation failed: ${contextError}`,
                  logger,
                });
              }
            } else {
              // Fallback to original handler if no context factory
              logger?.warn(
                `No context factory provided for job "${jobId}". Jobs may not have access to application context.`,
              );
              return await definition.handler(executionContext);
            }
          },
        };

        instances.registeredJobs.set(jobId, enhancedDefinition);

        // Debug log to trace job registration with options
        logger?.debug?.(`Registered job "${jobId}" with options:`, {
          queue: definition.queue,
          attempts: definition.attempts,
          priority: definition.priority,
          delay: definition.delay,
          limiter: definition.limiter,
          repeat: definition.repeat,
          removeOnComplete: definition.removeOnComplete,
          removeOnFail: definition.removeOnFail,
        });

        // Check if job has cron configuration and auto-schedule it
        const { repeat, queue: queueConfig, ...options } = definition;
        if (!options) continue;

        const cronConfig = repeat?.cron;
        if (cronConfig) {
          const queue = getOrCreateQueue(queueConfig);

          logger?.info(
            `Auto-scheduling cron job "${jobId}" with pattern: ${cronConfig}`,
          );

          // Schedule the job with the cron configuration
          await queue.add(
            jobId,
            {}, // Empty payload for cron jobs
            {
              ...options,
              repeat: {
                pattern: cronConfig,
                tz: repeat.tz,
                limit: repeat.limit,
                startDate: repeat.startDate,
                endDate: repeat.endDate,
              },
              jobId: `${jobId}__cron`, // Unique ID for the cron scheduler
            },
          );
        }
      }
    },

    router<TJobs extends Record<string, JobDefinition<TContext, any, any>>>(
      config: JobsRouterConfig<TJobs>,
    ): JobsRouter<TJobs> {
      // Use the createJobsRouter from the core service
      return createJobsRouter(config);
    },

    merge<TMergedJobs extends Record<string, JobsRouter<any>>>(
      routers: TMergedJobs,
    ): MergedJobsExecutor<MergedJobsRouter<TMergedJobs>> {
      // Validate namespace conflicts
      const namespaces = Object.keys(routers);
      const duplicates = namespaces.filter(
        (ns, index) => namespaces.indexOf(ns) !== index,
      );

      if (duplicates.length > 0) {
        throw new IgniterError({
          code: "INVALID_NAMESPACE",
          message:
            `Namespace conflicts detected: ${duplicates.join(", ")}. ` +
            `Each router must have a unique namespace when merging.`,
          logger,
        });
      }

      // Create flattened job registry for adapter registration
      const flattenedJobs: Record<string, JobDefinition<any, any, any>> = {};
      const mergedJobsByNamespace: Record<
        string,
        Record<string, JobDefinition<any, any, any>>
      > = {};

      for (const [namespace, router] of Object.entries(routers)) {
        // Store jobs by namespace for the registry
        mergedJobsByNamespace[namespace] = router.jobs;

        for (const [jobId, definition] of Object.entries(router.jobs)) {
          // Create namespaced job ID for internal storage
          const namespacedJobId = router.namespace
            ? `${router.namespace}.${jobId}`
            : `${namespace}.${jobId}`;

          // @ts-expect-error - TJobs is not used [DO NOT REMOVE THIS - ITS WORKING]
          flattenedJobs[namespacedJobId] = definition;
        }
      }

      // @ts-expect-error - Register all flattened jobs with the adapter
      this.bulkRegister(flattenedJobs).then(async () => {
        logger?.info(
          `Registered ${Object.keys(flattenedJobs).length} jobs from ${namespaces.length} routers:`,
          Object.keys(flattenedJobs),
        );

        // Auto-start workers if configured
        if (options.autoStartWorker) {
          const discoveredQueues = new Set<string>();

          // Discover all queues from registered jobs
          for (const definition of Object.values(flattenedJobs)) {
            const queueName = definition.queue?.name || "default";
            discoveredQueues.add(queueName);
          }

          const queuesToProcess =
            options.autoStartWorker.queues || Array.from(discoveredQueues);

          logger?.info(
            `Auto-starting workers for queues: ${queuesToProcess.join(", ")}`,
          );

          // Discover limiter from jobs if not explicitly configured
          // Use the first limiter found in jobs (all jobs in same queue should have same limiter)
          let discoveredLimiter = options.autoStartWorker.limiter;
          if (!discoveredLimiter) {
            for (const definition of Object.values(flattenedJobs)) {
              if (definition.limiter) {
                discoveredLimiter = definition.limiter;
                logger?.info(
                  `Using limiter from job definition: max=${discoveredLimiter.max}, duration=${discoveredLimiter.duration}ms`,
                );
                break;
              }
            }
          }

          await this.worker({
            queues: queuesToProcess,
            concurrency: options.autoStartWorker.concurrency || 1,
            limiter: discoveredLimiter,
            onActive: options.autoStartWorker.debug
              ? ({ job }) => {
                  logger?.info(`Job started: ${job.name} (${job.id})`);
                }
              : undefined,
            onSuccess: options.autoStartWorker.debug
              ? ({ job, result }) => {
                  logger?.info(
                    `Job completed: ${job.name} (${job.id})`,
                    result,
                  );
                }
              : undefined,
            onFailure: ({ job, error }) => {
              logger?.error(`Job failed: ${job.name} (${job.id})`, error);
            },
          });
        }
      });

      // Create jobs registry for efficient lookups
      const registry = createJobsRegistry(mergedJobsByNamespace, {
        enableCache: true,
        maxCacheSize: 1000,
        cacheTTL: 300000, // 5 minutes
      });

      // Create reference to the adapter for use in closures
      const adapter = this;

      // Create the merged executor with namespace-based access
      const mergedExecutor = {} as MergedJobsExecutor<
        MergedJobsRouter<TMergedJobs>
      >;

      for (const [namespace, router] of Object.entries(routers)) {
        const namespaceExecutor: JobsNamespaceExecutor<any> = {
          jobs: router.jobs,

          async enqueue(params) {
            const { task: jobId, input, ...options } = params;

            const jobPath = `${namespace}.${String(jobId)}`;
            const jobResult = registry.getJobByPath(jobPath);

            if (!jobResult) {
              throw new IgniterError({
                code: "INVALID_JOB",
                message:
                  `Job "${String(jobId)}" not found in namespace "${namespace}". ` +
                  `Available jobs: ${Object.keys(router.jobs).join(", ")}`,
                logger,
              });
            }

            return await adapter.invoke({
              id: jobResult.namespacedJobId,
              input,
              ...options,
            });
          },

          async schedule(params) {
            const { task: jobId, input, ...scheduleOptions } = params;

            const jobPath = `${namespace}.${String(jobId)}`;
            const jobResult = registry.getJobByPath(jobPath);

            if (!jobResult) {
              throw new IgniterError({
                code: "INVALID_JOB",
                message:
                  `Job "${String(jobId)}" not found in namespace "${namespace}". ` +
                  `Available jobs: ${Object.keys(router.jobs).join(", ")}`,
                logger,
              });
            }

            // Process advanced scheduling options
            const processedOptions =
              processAdvancedScheduleOptions(scheduleOptions);

            return await adapter.invoke({
              id: jobResult.namespacedJobId,
              input,
              ...processedOptions,
            });
          },

          async bulk(jobs) {
            const results = await Promise.all(
              jobs.map(({ jobId, input, ...options }) => {
                const jobPath = `${namespace}.${String(jobId)}`;
                const jobResult = registry.getJobByPath(jobPath);

                if (!jobResult) {
                  throw new IgniterError({
                    code: "INVALID_JOB",
                    message:
                      `Job "${String(jobId)}" not found in namespace "${namespace}". ` +
                      `Available jobs: ${Object.keys(router.jobs).join(", ")}`,
                    logger,
                  });
                }

                return adapter.invoke({
                  id: jobResult.namespacedJobId,
                  input,
                  ...options,
                });
              }),
            );
            return results;
          },
        };

        // @ts-expect-error - TJobs is not used [DO NOT REMOVE THIS - ITS WORKING]
        mergedExecutor[namespace as keyof typeof mergedExecutor] =
          namespaceExecutor;
      }

      // Add createProxy method to enable namespace access
      // Now includes management API for queue/job/worker control
      const proxy = createJobsProxy(
        mergedJobsByNamespace,
        registry,
        ({ namespacedJobId, input, options }) => {
          return adapter.invoke({
            id: namespacedJobId,
            input,
            ...options,
          });
        },
        // Pass management API to the proxy
        {
          queues: queuesManager,
          job: jobManager,
          workers: instances.workerHandles as Map<string, WorkerHandle>,
        },
      );

      // Explicitly define createProxy instead of dynamic assignment
      const finalExecutor = {
        ...mergedExecutor,
        createProxy: () => proxy,
        // Also expose management APIs directly on the executor
        queues: queuesManager,
        job: jobManager,
        getWorkers: () => instances.workerHandles as Map<string, WorkerHandle>,
      } as MergedJobsExecutor<MergedJobsRouter<TMergedJobs>>;

      // Store registry reference for potential debugging/monitoring
      (finalExecutor as any).__registry = registry;

      return finalExecutor;
    },

    async invoke(params) {
      validateJobExists(params.id);

      const jobDefinition = instances.registeredJobs.get(params.id);

      const queue = getOrCreateQueue({
        name: params.queue?.name || jobDefinition?.queue?.name || "default",
        prefix: params.queue?.prefix || jobDefinition?.queue?.prefix || "",
      });

      // Validate payload against schema if provided
      if (
        jobDefinition?.input &&
        typeof jobDefinition.input.parse === "function"
      ) {
        try {
          jobDefinition.input.parse(params.input);
        } catch (error) {
          throw new IgniterError({
            code: "INVALID_PAYLOAD",
            message: `Invalid payload for job "${params.id}": ${error}`,
            logger,
          });
        }
      }

      // Process advanced scheduling options if they exist
      let processedOptions: any = {};
      if (
        "at" in params ||
        "retryStrategy" in params ||
        "condition" in params ||
        (params.repeat &&
          ("skipWeekends" in params.repeat ||
            "onlyBusinessHours" in params.repeat))
      ) {
        // This is an advanced schedule - process the options
        // Merge with jobDefinition options first
        const baseOptions = {
          attempts: jobDefinition?.attempts ?? 3,
          removeOnComplete: jobDefinition?.removeOnComplete ?? 10,
          removeOnFail: jobDefinition?.removeOnFail ?? 50,
          priority: jobDefinition?.priority,
          delay: jobDefinition?.delay,
          jobId: jobDefinition?.jobId,
          metadata: jobDefinition?.metadata,
        };
        processedOptions = {
          ...baseOptions,
          ...processAdvancedScheduleOptions(params as any),
        };
      } else {
        // Build options with proper priority:
        // 1. Defaults (lowest)
        // 2. JobDefinition options (from router/job config)
        // 3. Call-specific params (highest priority)
        processedOptions = {
          // Start with defaults
          attempts: 3,
          removeOnComplete: 10,
          removeOnFail: 50,
          // Apply jobDefinition options (from job or router defaultOptions)
          ...(jobDefinition?.attempts !== undefined && {
            attempts: jobDefinition.attempts,
          }),
          ...(jobDefinition?.removeOnComplete !== undefined && {
            removeOnComplete: jobDefinition.removeOnComplete,
          }),
          ...(jobDefinition?.removeOnFail !== undefined && {
            removeOnFail: jobDefinition.removeOnFail,
          }),
          ...(jobDefinition?.priority !== undefined && {
            priority: jobDefinition.priority,
          }),
          ...(jobDefinition?.delay !== undefined && {
            delay: jobDefinition.delay,
          }),
          ...(jobDefinition?.jobId !== undefined && {
            jobId: jobDefinition.jobId,
          }),
          ...(jobDefinition?.metadata !== undefined && {
            metadata: jobDefinition.metadata,
          }),
          // Apply call-specific options (highest priority) - but exclude id, input, queue which are handled separately
          ...(params.attempts !== undefined && { attempts: params.attempts }),
          ...(params.removeOnComplete !== undefined && {
            removeOnComplete: params.removeOnComplete,
          }),
          ...(params.removeOnFail !== undefined && {
            removeOnFail: params.removeOnFail,
          }),
          ...(params.priority !== undefined && { priority: params.priority }),
          ...(params.delay !== undefined && { delay: params.delay }),
          ...(params.jobId !== undefined && { jobId: params.jobId }),
          ...(params.metadata !== undefined && {
            metadata: { ...jobDefinition?.metadata, ...params.metadata },
          }),
          // Handle repeat options specifically with proper merge
          repeat:
            params.repeat || jobDefinition?.repeat
              ? {
                  pattern: params.repeat?.cron || jobDefinition?.repeat?.cron,
                  tz: params.repeat?.tz || jobDefinition?.repeat?.tz,
                  limit: params.repeat?.limit ?? jobDefinition?.repeat?.limit,
                  startDate:
                    params.repeat?.startDate ||
                    jobDefinition?.repeat?.startDate,
                  endDate:
                    params.repeat?.endDate || jobDefinition?.repeat?.endDate,
                }
              : undefined,
        };
      }

      // Log the merged options for debugging
      logger?.debug?.(`Job "${params.id}" options merged:`, {
        fromDefinition: {
          queue: jobDefinition?.queue,
          attempts: jobDefinition?.attempts,
          priority: jobDefinition?.priority,
          delay: jobDefinition?.delay,
          limiter: jobDefinition?.limiter,
        },
        fromParams: {
          queue: params.queue,
          attempts: params.attempts,
          priority: params.priority,
          delay: params.delay,
        },
        final: {
          queue: queue.name,
          ...processedOptions,
        },
      });

      // Add job to queue with processed options
      const job = await queue.add(params.id, params.input, processedOptions);

      return job.id as string;
    },

    async search(params) {
      const queue = getOrCreateQueue(params?.queue);
      const filter = params?.filter || {};

      // Determine which job states to fetch based on status filter
      const statusMap: Record<JobStatus, string[]> = {
        waiting: ["waiting"],
        active: ["active"],
        completed: ["completed"],
        failed: ["failed"],
        delayed: ["delayed"],
        paused: ["paused"],
        stalled: ["stalled"],
      };

      const statesToFetch = filter.status
        ? filter.status.flatMap((status) => statusMap[status])
        : ["waiting", "active", "completed", "failed", "delayed"];

      const results: JobSearchResult[] = [];

      // Fetch jobs for each requested state
      for (const state of statesToFetch) {
        const jobs = await queue.getJobs(
          [state as any],
          filter.offset || 0,
          (filter.offset || 0) + (filter.limit || 100) - 1,
        );

        for (const job of jobs) {
          const result = mapBullMQJobToResult(job);

          // Apply additional filters
          if (filter.jobId && !job.id!.includes(filter.jobId)) continue;
          if (
            filter.dateRange?.from &&
            result.createdAt < filter.dateRange.from
          )
            continue;
          if (filter.dateRange?.to && result.createdAt > filter.dateRange.to)
            continue;

          results.push(result);
        }
      }

      // Apply sorting
      if (filter.orderBy) {
        const [field, direction] = filter.orderBy.split(":") as [
          string,
          "asc" | "desc",
        ];
        results.sort((a, b) => {
          let aVal: any, bVal: any;

          switch (field) {
            case "timestamp":
              aVal = a.createdAt.getTime();
              bVal = b.createdAt.getTime();
              break;
            case "priority":
              aVal = a.priority;
              bVal = b.priority;
              break;
            default:
              return 0;
          }

          return direction === "asc" ? aVal - bVal : bVal - aVal;
        });
      }

      return results.slice(0, filter.limit || 100);
    },

    async worker(config) {
      for (const queueName of config.queues) {
        // Support wildcard queue names for multi-tenant scenarios
        if (queueName.includes("*")) {
          // For wildcards, we'll need to implement dynamic queue discovery
          // This is a simplified version - in production, you'd want more sophisticated pattern matching
          logger?.warn(
            `Wildcard queue patterns like "${queueName}" require additional setup. ` +
              `Consider using specific queue names or implementing dynamic queue discovery.`,
          );
          continue;
        }

        const workerKey = `${queueName}-worker`;

        if (instances.workerHandles.has(workerKey)) {
          logger?.warn(
            `Worker for queue "${queueName}" already exists. Returning existing handle.`,
          );
          // If this is the only queue, return the existing handle
          if (config.queues.length === 1) {
            return instances.workerHandles.get(workerKey)!;
          }
          continue;
        }

        logger?.info(`Starting worker for queue: ${queueName}`);

        const worker = new Worker(
          queueName,
          async (job: BullMQJob) => {
            logger?.info(
              `Processing job: ${job.name} (ID: ${job.id}) in queue: ${queueName}`,
            );
            const jobDefinition = instances.registeredJobs.get(job.name);

            if (!jobDefinition) {
              logger?.warn(`No job definition found for "${job.name}"`);
              return;
            }

            // Filter by job type if specified
            if (config.jobFilter && !config.jobFilter.includes(job.name)) {
              return; // Skip this job
            }

            // Extract namespace from job name if it's namespaced
            const namespaceParts = job.name.split(".");
            const namespace =
              namespaceParts.length > 1 ? namespaceParts[0] : undefined;

            const startTime = Date.now();

            // Create enhanced job info for hooks
            const jobHookInfo = createJobHookInfo(job, queueName, namespace);

            // Create execution context with real context factory
            const executionContext: JobExecutionContext<TContext, any> = {
              input: job.data,
              context: {} as TContext, // Will be populated by job handler wrapper
              job: {
                id: job.id!,
                name: job.name,
                attemptsMade: job.attemptsMade,
                createdAt: new Date(job.timestamp),
                metadata: job.opts.metadata,
              },
            };

            let result: any;
            let error: Error | undefined;
            let success = false;

            try {
              // ==========================================
              // ADVANCED SCHEDULING CHECKS
              // ==========================================

              if (shouldSkipExecution(job.opts.metadata)) {
                logger?.info(
                  `Skipping job "${job.name}" due to advanced scheduling rules`,
                );

                // Mark job as completed but with a special result indicating it was skipped
                return {
                  skipped: true,
                  reason: "Advanced scheduling rules",
                  timestamp: new Date().toISOString(),
                };
              }

              // Check conditional execution
              if (
                job.opts.metadata?.hasCondition &&
                job.opts.metadata?.condition
              ) {
                try {
                  // Note: In a real implementation, conditions would need to be stored differently
                  // since functions can't be serialized. This is a placeholder for the concept.
                  logger?.info(
                    `Job "${job.name}" has conditional execution - this would evaluate the condition here`,
                  );
                } catch (conditionError) {
                  logger?.error(
                    `Condition evaluation failed for job "${job.name}":`,
                    conditionError,
                  );
                  return {
                    skipped: true,
                    reason: "Condition evaluation failed",
                    // @ts-expect-error - [KEEP_IT] Check if job should be skipped based on advanced scheduling rules
                    error: conditionError.message,
                    timestamp: new Date().toISOString(),
                  };
                }
              }

              // Check max concurrency (basic implementation)
              if (job.opts.metadata?.maxConcurrency) {
                // In a full implementation, this would check Redis for active jobs with same ID
                logger?.info(
                  //
                  `Job "${job.name}" has max concurrency limit: ${job.opts.metadata.maxConcurrency}`,
                );
              }

              // ==========================================
              // STANDARD JOB EXECUTION
              // ==========================================

              // 🚀 EXECUTE ONSTART HOOKS
              const startContext: JobStartHookContext<TContext, any> = {
                input: job.data,
                context: executionContext.context as TContext,
                job: { ...jobHookInfo, startedAt: new Date() },
                startedAt: new Date(),
              };

              await safelyExecuteHook(
                "onStart",
                jobDefinition.onStart,
                startContext,
              );

              // Execute the main job handler
              // Note: The actual context is created by the job definition's enhanced handler
              // which was set up in bulkRegister with the context factory
              result = await jobDefinition.handler(executionContext);
              success = true;

              // 🚀 EXECUTE ONSUCCESS HOOKS
              const endTime = Date.now();
              const executionTime = endTime - startTime;

              const successContext: JobSuccessHookContext<TContext, any, any> =
                {
                  input: job.data,
                  context: executionContext.context as TContext,
                  job: { ...jobHookInfo, executionTime },
                  result,
                  completedAt: new Date(),
                  executionTime,
                };

              await safelyExecuteHook(
                "onSuccess",
                jobDefinition.onSuccess,
                successContext,
              );

              // ==========================================
              // WEBHOOK NOTIFICATIONS
              // ==========================================

              // Send webhook notification if configured
              if (job.opts.metadata?.webhookUrl) {
                try {
                  await sendWebhookNotification(job.opts.metadata.webhookUrl, {
                    jobId: job.id,
                    jobName: job.name,
                    status: "completed",
                    result,
                    executionTime,
                    completedAt: new Date().toISOString(),
                    tags: job.opts.metadata?.tags,
                  });
                } catch (webhookError) {
                  logger?.error(
                    `Webhook notification failed for job "${job.name}":`,
                    webhookError,
                  );
                  // Don't fail the job if webhook fails
                }
              }
            } catch (jobError) {
              error =
                jobError instanceof Error
                  ? jobError
                  : new Error(String(jobError));
              success = false;

              // 🚀 EXECUTE ONFAILURE HOOKS
              const endTime = Date.now();
              const executionTime = endTime - startTime;
              const isFinalAttempt =
                job.attemptsMade >= (job.opts.attempts || 3) - 1;

              const failureContext: JobFailureHookContext<TContext, any> = {
                input: job.data,
                context: executionContext.context as TContext,
                job: { ...jobHookInfo, executionTime },
                error,
                failedAt: new Date(),
                executionTime,
                isFinalAttempt,
              };

              await safelyExecuteHook(
                "onFailure",
                jobDefinition.onFailure,
                failureContext,
              );

              // Re-throw to maintain BullMQ error handling
              throw error;
            } finally {
              // 🚀 EXECUTE ONCOMPLETE HOOKS (always runs)
              const endTime = Date.now();
              const executionTime = endTime - startTime;

              const completeContext: JobCompleteHookContext<
                TContext,
                any,
                any
              > = {
                input: job.data,
                context: executionContext.context as TContext,
                job: { ...jobHookInfo, executionTime },
                success,
                result: success ? result : undefined,
                error: !success ? error : undefined,
                completedAt: new Date(),
                executionTime,
              };

              await safelyExecuteHook(
                "onComplete",
                jobDefinition.onComplete,
                completeContext,
              );
            }

            return result;
          },
          {
            connection: redisConnection,
            concurrency: config.concurrency || 1,
            // Add rate limiter if configured (from worker config or job definitions)
            ...(config.limiter && {
              limiter: {
                max: config.limiter.max,
                duration: config.limiter.duration,
              },
            }),
            ...options.workerOptions,
          },
        );

        logger?.info(
          `Worker started for queue: ${queueName} with concurrency: ${config.concurrency || 1}${config.limiter ? `, rate limit: ${config.limiter.max} jobs per ${config.limiter.duration}ms` : ""}`,
        );

        // Set up event handlers
        if (config.onActive) {
          worker.on("active", (job: BullMQJob) => {
            config.onActive?.({ job: mapBullMQJobToResult(job) });
          });
        }

        if (config.onSuccess) {
          worker.on("completed", (job: BullMQJob, result: any) => {
            config.onSuccess?.({ job: mapBullMQJobToResult(job), result });
          });
        }

        if (config.onFailure) {
          worker.on("failed", (job: BullMQJob | undefined, error: Error) => {
            if (job) {
              config.onFailure?.({ job: mapBullMQJobToResult(job), error });
            }
          });
        }

        if (config.onIdle) {
          worker.on("drained", () => {
            config.onIdle?.();
          });
        }

        // Store the raw worker
        instances.workers.set(workerKey, worker);

        // Create and store the worker handle
        const handle = createWorkerHandle(worker, queueName, workerKey, {
          concurrency: config.concurrency || 1,
          queues: config.queues,
        });
        instances.workerHandles.set(workerKey, handle);
      }

      // Return the first worker handle (for backward compatibility)
      // If multiple queues were specified, return the handle for the first one
      const firstQueueName = config.queues.find((q) => !q.includes("*"));
      if (firstQueueName) {
        const handle = instances.workerHandles.get(`${firstQueueName}-worker`);
        if (handle) {
          return handle;
        }
      }

      // Fallback: return a composite handle that controls all workers created
      const workerKeys = config.queues
        .filter((q) => !q.includes("*"))
        .map((q) => `${q}-worker`);

      const compositeHandle: WorkerHandle = {
        id: workerKeys.join(","),
        queueName: config.queues.join(","),

        async pause() {
          for (const key of workerKeys) {
            const handle = instances.workerHandles.get(key);
            if (handle) await handle.pause();
          }
        },

        async resume() {
          for (const key of workerKeys) {
            const handle = instances.workerHandles.get(key);
            if (handle) await handle.resume();
          }
        },

        async close() {
          for (const key of workerKeys) {
            const handle = instances.workerHandles.get(key);
            if (handle) await handle.close();
          }
        },

        isRunning() {
          return workerKeys.some((key) => {
            const handle = instances.workerHandles.get(key);
            return handle?.isRunning() ?? false;
          });
        },

        isPaused() {
          return workerKeys.every((key) => {
            const handle = instances.workerHandles.get(key);
            return handle?.isPaused() ?? true;
          });
        },

        isClosed() {
          return workerKeys.every((key) => !instances.workerHandles.has(key));
        },

        async getMetrics(): Promise<WorkerMetrics> {
          let totalProcessed = 0;
          let totalFailed = 0;
          let totalDuration = 0;
          let totalConcurrency = 0;
          let minUptime = Infinity;

          for (const key of workerKeys) {
            const handle = instances.workerHandles.get(key);
            if (handle) {
              const metrics = await handle.getMetrics();
              totalProcessed += metrics.processed;
              totalFailed += metrics.failed;
              totalDuration += metrics.avgDuration * metrics.processed;
              totalConcurrency += metrics.concurrency;
              minUptime = Math.min(minUptime, metrics.uptime);
            }
          }

          return {
            processed: totalProcessed,
            failed: totalFailed,
            avgDuration:
              totalProcessed > 0 ? totalDuration / totalProcessed : 0,
            concurrency: totalConcurrency,
            uptime: minUptime === Infinity ? 0 : minUptime,
          };
        },
      };

      return compositeHandle;
    },

    async shutdown() {
      // Close all workers via handles (which also cleans up the maps)
      for (const [key, handle] of instances.workerHandles) {
        await handle.close();
      }

      // Fallback: close any remaining raw workers
      for (const [key, worker] of instances.workers) {
        await worker.close();
        instances.workers.delete(key);
      }

      // Close all queues
      for (const [key, queue] of instances.queues) {
        await queue.close();
        instances.queues.delete(key);
      }

      // Clear registered jobs and metrics
      instances.registeredJobs.clear();
      workerMetrics.clear();
    },

    /**
     * Creates a job definition that can be used in routers.
     * This is a factory method for creating type-safe job definitions.
     *
     * @template TInput - The input type for the job
     * @template TResult - The result type for the job
     * @param config - Job configuration without ID (ID will be provided by router)
     * @returns A complete JobDefinition ready for use in routers
     *
     * @example
     * ```typescript
     * const emailJob = jobsAdapter.register({
     *   name: 'Send Email',
     *   input: z.object({ email: z.string().email() }),
     *   handler: async ({ input, context }) => {
     *     await context.emailService.send(input.email);
     *     return { sent: true, timestamp: new Date() };
     *   }
     * });
     * ```
     */
    register<TInput extends StandardSchemaV1, TResult = any>(
      config: Omit<JobDefinition<TContext, TInput, TResult>, "id"> & {
        name: string;
        input: StandardSchemaV1;
        handler: (
          context: JobExecutionContext<TContext, TInput>,
        ) => Promise<TResult> | TResult;
      },
    ): JobDefinition<TContext, TInput, TResult> {
      // Validate job configuration
      if (!config.name || config.name.trim() === "") {
        throw new IgniterError({
          code: "BULLMQ_ADAPTER_ERROR",
          message: "Job name is required and cannot be empty",
          logger,
        });
      }

      if (!config.input) {
        throw new IgniterError({
          code: "BULLMQ_ADAPTER_ERROR",
          message: "Job input schema is required",
          logger,
        });
      }

      if (!config.handler || typeof config.handler !== "function") {
        throw new IgniterError({
          code: "BULLMQ_ADAPTER_ERROR",
          message: "Job handler is required and must be a function",
          logger,
        });
      }

      // Return the complete job definition
      return {
        ...config, // Include any additional options like queue, attempts, etc.
        name: config.name,
        input: config.input,
        handler: config.handler,
      } as JobDefinition<TContext, TInput, TResult>;
    },

    cron<TResult = any>(
      schedule: string | CronSchedule,
      handler: CronJobHandler<TContext, TResult>,
      options: CronJobOptions = {},
    ): JobDefinition<TContext, any, TResult> {
      // Validate the cron expression
      const cronExpression = typeof schedule === "string" ? schedule : schedule;
      validateCronExpression(cronExpression);

      // Generate job name
      const jobName = generateCronJobName(cronExpression, options);

      // Create enhanced handler that provides cron context
      const enhancedHandler = async (
        executionContext: any,
      ): Promise<TResult> => {
        // Get execution count from job metadata
        const executionCount =
          (executionContext.job.metadata?.executionCount || 0) + 1;
        const maxExecutions = options.maxExecutions;
        const isFinalExecution = maxExecutions
          ? executionCount >= maxExecutions
          : false;

        // Create cron-specific execution context
        const cronContext: CronJobExecutionContext<TContext> = {
          context: executionContext.context,
          cron: {
            schedule: cronExpression,
            executionCount,
            maxExecutions,
            timezone: options.timezone,
            nextExecution: undefined, // Could be calculated if needed
            previousExecution: undefined, // Could be tracked if needed
            isFinalExecution,
          },
          job: {
            ...executionContext.job,
            metadata: {
              ...executionContext.job.metadata,
              executionCount,
              cronSchedule: cronExpression,
              timezone: options.timezone,
            },
          },
        };

        // Execute the user's handler
        const result = await handler(cronContext);

        // If this is the final execution, we could clean up or log
        if (isFinalExecution) {
          logger?.info(
            `Cron job "${jobName}" completed its final execution (${executionCount}/${maxExecutions}).`,
          );
        }

        return result;
      };

      // Create the job definition with cron configuration
      const jobDefinition: JobDefinition<TContext, any, TResult> = {
        name: jobName,
        input: undefined as any, // Cron jobs don't have input
        handler: enhancedHandler,
        // Convert CronJobOptions to JobInvokeOptions
        ...options,
        repeat: {
          cron: cronExpression,
          tz: options.timezone,
          limit: options.maxExecutions,
          startDate: options.startDate,
          endDate: options.endDate,
        },
        metadata: {
          ...options.metadata,
          cronSchedule: cronExpression,
          timezone: options.timezone,
          maxExecutions: options.maxExecutions,
          skipIfRunning: options.skipIfRunning,
          isCronJob: true,
        },
      };

      return jobDefinition;
    },
  };
}
