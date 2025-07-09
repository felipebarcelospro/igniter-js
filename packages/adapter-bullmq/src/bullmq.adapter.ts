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
  JobCompleteHookContext
} from "@igniter-js/core";
import { isServer, SchedulePatterns } from "@igniter-js/core";
import type { BullMQAdapterOptions, BullMQInstances, BullMQQueue, BullMQJob } from "./types";
import { createJobsRouter, createJobsRegistry, createJobsProxy } from "@igniter-js/core";
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
export function createBullMQAdapter<TContext extends object>(options: BullMQAdapterOptions = {}): IgniterJobQueueAdapter<TContext> {
  if (!isServer) {
    return {} as IgniterJobQueueAdapter<TContext>;
  }  

  const { Queue, Worker, Job } = require('bullmq');
  
  // Store context factory for job execution
  const contextFactory = options.contextFactory;
  const logger = options.logger;

  // Internal state management
  const instances: BullMQInstances = {
    queues: new Map(),
    workers: new Map(),
    registeredJobs: new Map(),
  };

  // Extract Redis connection from store adapter if provided
  const redisConnection = options.store?.client ? 
    // If store has a Redis client, use it directly
    options.store.client
    : 
    // Fallback to default Redis connection
    {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
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
    const baseName = queueConfig?.name || 'default';
    const parts: string[] = [];
    
    if (options.globalPrefix) {
      parts.push(options.globalPrefix);
    }
    
    if (queueConfig?.prefix) {
      parts.push(queueConfig.prefix);
    }
    
    parts.push(baseName);
    return parts.join('__'); // Using double underscore as separator instead of colon
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
        prefix: 'bull', // Ensure we use BullMQ's default prefix
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
      ? job.failedReason ? 'failed' : 'completed'
      : job.processedOn ? 'active'
      : job.opts.delay && job.opts.delay > Date.now() ? 'delayed'
      : 'waiting';

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
      throw new IgniterError(
        {
          code: 'BULLMQ_ADAPTER_ERROR',
          message: `Job "${jobId}" is not registered. Please register it first using jobs.register().`,
          log: true,
        }
      );
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
      throw new IgniterError(
        {
          code: 'BULLMQ_ADAPTER_ERROR',
          message: `Invalid cron expression "${cronExpression}". ` +
          `Expected 5 or 6 fields (minute hour day month weekday [year]), got ${parts.length}.`,
          log: true,
        }
      );
    }

    // Validate each field has valid characters
    const validCronChars = /^[0-9*\/,-]+$/;
    for (let i = 0; i < parts.length; i++) {
      if (!validCronChars.test(parts[i])) {
        throw new IgniterError(
          {
            code: 'BULLMQ_ADAPTER_ERROR',
            message: `Invalid cron expression "${cronExpression}". ` +
            `Field ${i + 1} "${parts[i]}" contains invalid characters. ` +
            `Only numbers, *, /, ,, and - are allowed.`,
            log: true,
          }
        );
      }
    }

    // Additional validation for common mistakes
    const [minute, hour, day, month, weekday, year] = parts;
    
    // Check ranges (basic validation)
    if (minute !== '*' && !minute.includes('/') && !minute.includes(',') && !minute.includes('-')) {
      const min = parseInt(minute);
      if (isNaN(min) || min < 0 || min > 59) {
        throw new IgniterError(
          {
            code: 'BULLMQ_ADAPTER_ERROR',
            message: `Invalid minute value "${minute}" in cron expression. Must be 0-59, *, or use special characters.`,
            log: true,
          }
        );
      }
    }
    
    if (hour !== '*' && !hour.includes('/') && !hour.includes(',') && !hour.includes('-')) {
      const hr = parseInt(hour);
      if (isNaN(hr) || hr < 0 || hr > 23) {
        throw new IgniterError(
          {
            code: 'BULLMQ_ADAPTER_ERROR',
            message: `Invalid hour value "${hour}" in cron expression. Must be 0-23, *, or use special characters.`,
            log: true,
          }
        );
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
  function generateCronJobName(schedule: string, options?: CronJobOptions): string {
    if (options?.jobName) {
      return options.jobName;
    }

    // Create a descriptive name based on the schedule
    const scheduleHash = schedule.replace(/[^a-zA-Z0-9]/g, '_');
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
    executionTime?: number
  ): JobHookInfo {
    return {
      id: job.id!,
      name: job.name,
      attemptsMade: job.attemptsMade,
      createdAt: new Date(job.timestamp),
      // @ts-expect-error - Dont remove this [DO NOT REMOVE THIS - ITS WORKING]
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
    context: any
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
  function processAdvancedScheduleOptions(options: AdvancedScheduleOptions | SchedulePattern): any {
    // Handle predefined schedule patterns
    if (typeof options === 'string' && options in SchedulePatterns) {
      options = SchedulePatterns[options as SchedulePattern];
    }

    const opts = options as AdvancedScheduleOptions;
    const bullMQOptions: any = { ...opts };

    // ==========================================
    // BASIC SCHEDULING
    // ==========================================
    
    // Handle 'at' vs 'delay' timing
    if (opts.at && opts.delay) {
      throw new IgniterError(
        {
          code: 'BULLMQ_ADAPTER_ERROR',
          message: 'Cannot specify both "at" and "delay" options. Use one or the other.',
          log: true,
        }
      );
    }

    if (opts.at) {
      const now = Date.now();
      const targetTime = opts.at.getTime();
      
      if (targetTime <= now) {
        throw new IgniterError(
          {
            code: 'BULLMQ_ADAPTER_ERROR',
            message: `Scheduled time must be in the future. Received: ${opts.at.toISOString()}`,
            log: true,
          }
        );
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
          }
        };
      }

      bullMQOptions.repeat = repeatConfig;
    }

    // ==========================================
    // RETRY STRATEGY
    // ==========================================
    
    if (opts.retryStrategy) {
      switch (opts.retryStrategy) {
        case 'exponential':
          // Implement exponential backoff
          const backoffMultiplier = opts.backoffMultiplier || 2;
          const maxRetryDelay = opts.maxRetryDelay || 60000; // Default 1 minute max
          
          bullMQOptions.backoff = {
            type: 'exponential',
            settings: {
              multiplier: backoffMultiplier,
              max: maxRetryDelay,
            }
          };
          break;

        case 'linear':
          bullMQOptions.backoff = {
            type: 'fixed',
            settings: {
              delay: 5000, // 5 seconds default
            }
          };
          break;

        case 'fixed':
          bullMQOptions.backoff = {
            type: 'fixed',
            settings: {
              delay: opts.delay || 1000,
            }
          };
          break;

        default:
          if (typeof opts.retryStrategy === 'object' && opts.retryStrategy.type === 'custom') {
            // Custom retry delays
            bullMQOptions.backoff = {
              type: 'custom',
              settings: {
                delays: opts.retryStrategy.delays,
              }
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
      bullMQOptions.jobId = typeof opts.skipIfRunning === 'string' 
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
      bullMQOptions.priority = (bullMQOptions.priority || 0) + opts.priorityBoost;
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
  function isWithinBusinessHours(businessHours?: { start: number; end: number; timezone?: string }): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    
    const startHour = businessHours?.start || 9;  // Default 9 AM
    const endHour = businessHours?.end || 17;     // Default 5 PM
    
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
    if (scheduling.onlyBusinessHours && !isWithinBusinessHours(scheduling.businessHours)) {
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
    if (scheduling.between && Array.isArray(scheduling.between) && scheduling.between.length === 2) {
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
  async function sendWebhookNotification(webhookUrl: string, payload: any): Promise<void> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Igniter-Jobs-Webhook/1.0',
        },
        body: JSON.stringify({
          ...payload,
          timestamp: new Date().toISOString(),
          source: 'igniter-jobs',
          version: '1.0.0',
        }),
      });

      if (!response.ok) {
        throw new IgniterError(
          {
            code: 'BULLMQ_ADAPTER_ERROR',
            message: `Webhook returned ${response.status}: ${response.statusText}`,
            log: true,
          }
        );
      }

      logger?.info(`Webhook notification sent successfully to ${webhookUrl}`);
    } catch (error) {
      logger?.error(`Failed to send webhook notification to ${webhookUrl}:`, error);
      throw error;
    }
  }

  return {
    client: { instances, options },

    async bulkRegister(jobs) {
      // Store job definitions with enhanced handlers that include context factory
      for (const [jobId, definition] of Object.entries(jobs)) {
        // Create enhanced job definition with context factory integration
        const enhancedDefinition = {
          ...definition,
          handler: async (executionContext: JobExecutionContext<any, any>) => {
            // Create real application context if context factory is available
            if (contextFactory) {
              try {
                const realContext = await contextFactory();
                const enhancedContext: JobExecutionContext<TContext, any> = {
                  ...executionContext,
                  context: realContext as TContext,
                };
                return await definition.handler(enhancedContext);
              } catch (contextError) {
                logger?.error(`Failed to create context for job "${jobId}":`, contextError);
                throw new IgniterError(
                  {
                    code: 'BULLMQ_ADAPTER_ERROR',
                    message: `Context creation failed: ${contextError}`,
                    log: true,
                  }
                );
              }
            } else {
              // Fallback to original handler if no context factory
              logger?.warn(`No context factory provided for job "${jobId}". Jobs may not have access to application context.`);
              return await definition.handler(executionContext);
            }
          }
        };
        
        instances.registeredJobs.set(jobId, enhancedDefinition);
        
        // Check if job has cron configuration and auto-schedule it
        const { repeat, queue: queueConfig, ...options } = definition;
        if (!options) continue;

        const cronConfig = repeat?.cron;
        if (cronConfig) {
          const queue = getOrCreateQueue(queueConfig);
          
          logger?.info(`Auto-scheduling cron job "${jobId}" with pattern: ${cronConfig}`);
          
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
            }
          );
        }
      }
    },

    router<TJobs extends Record<string, JobDefinition<TContext, any, any>>>(
      config: JobsRouterConfig<TJobs>
    ): JobsRouter<TJobs> {
      // Use the createJobsRouter from the core service
      return createJobsRouter(config);
    },

    merge<TMergedJobs extends Record<string, JobsRouter<any>>>(
      routers: TMergedJobs
    ): MergedJobsExecutor<MergedJobsRouter<TMergedJobs>> {
      // Validate namespace conflicts
      const namespaces = Object.keys(routers);
      const duplicates = namespaces.filter((ns, index) => namespaces.indexOf(ns) !== index);
      
      if (duplicates.length > 0) {
        throw new IgniterError(
          {
            code: 'BULLMQ_ADAPTER_ERROR',
            message: `Namespace conflicts detected: ${duplicates.join(', ')}. ` +
            `Each router must have a unique namespace when merging.`,
            log: true,
          }
        );
      }

      // Create flattened job registry for adapter registration
      const flattenedJobs: Record<string, JobDefinition<any, any, any>> = {};
      const mergedJobsByNamespace: Record<string, Record<string, JobDefinition<any, any, any>>> = {};
      
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
        logger?.info(`Registered ${Object.keys(flattenedJobs).length} jobs from ${namespaces.length} routers:`, 
        Object.keys(flattenedJobs));

      // Auto-start workers if configured
      if (options.autoStartWorker) {
        const discoveredQueues = new Set<string>();
        
        // Discover all queues from registered jobs
        for (const definition of Object.values(flattenedJobs)) {
          const queueName = definition.queue?.name || 'default';
          discoveredQueues.add(queueName);
        }
        
        const queuesToProcess = options.autoStartWorker.queues || Array.from(discoveredQueues);
        
        logger?.info(`Auto-starting workers for queues: ${queuesToProcess.join(', ')}`);
        
        await this.worker({
          queues: queuesToProcess,
          concurrency: options.autoStartWorker.concurrency || 1,
          onActive: options.autoStartWorker.debug ? ({ job }) => {
            logger?.info(`Job started: ${job.name} (${job.id})`);
          } : undefined,
          onSuccess: options.autoStartWorker.debug ? ({ job, result }) => {
            logger?.info(`Job completed: ${job.name} (${job.id})`, result);
          } : undefined,
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
        cacheTTL: 300000 // 5 minutes
      });

      // Create reference to the adapter for use in closures
      const adapter = this;

      // Create the merged executor with namespace-based access
      const mergedExecutor = {} as MergedJobsExecutor<MergedJobsRouter<TMergedJobs>>;
      
      for (const [namespace, router] of Object.entries(routers)) {
        const namespaceExecutor: JobsNamespaceExecutor<any> = {
          jobs: router.jobs,
          
          async enqueue(params) {
            const { task: jobId, input, ...options } = params;
            
            const jobPath = `${namespace}.${String(jobId)}`;
            const jobResult = registry.getJobByPath(jobPath);
            
            if (!jobResult) {
              throw new IgniterError(
                {
                  code: 'BULLMQ_ADAPTER_ERROR',
                  message: `Job "${String(jobId)}" not found in namespace "${namespace}". ` +
                  `Available jobs: ${Object.keys(router.jobs).join(', ')}`,
                  log: true,
                }
              );
            }
            
            return await adapter.invoke({
              id: jobResult.namespacedJobId,
              input,
              ...options
            });
          },
          
          async schedule(params) {
            const { task: jobId, input, ...scheduleOptions } = params;
            
            const jobPath = `${namespace}.${String(jobId)}`;
            const jobResult = registry.getJobByPath(jobPath);
            
            if (!jobResult) {
              throw new IgniterError(
                {
                  code: 'BULLMQ_ADAPTER_ERROR',
                  message: `Job "${String(jobId)}" not found in namespace "${namespace}". ` +
                  `Available jobs: ${Object.keys(router.jobs).join(', ')}`,
                  log: true,
                }
              );
            }
            
            // Process advanced scheduling options
            const processedOptions = processAdvancedScheduleOptions(scheduleOptions);
            
            return await adapter.invoke({
              id: jobResult.namespacedJobId,
              input,
              ...processedOptions
            });
          },
          
          async bulk(jobs) {
            const results = await Promise.all(
              jobs.map(({ jobId, input, ...options }) => {
                const jobPath = `${namespace}.${String(jobId)}`;
                const jobResult = registry.getJobByPath(jobPath);
                
                if (!jobResult) {
                  throw new IgniterError(
                    {
                      code: 'BULLMQ_ADAPTER_ERROR',
                      message: `Job "${String(jobId)}" not found in namespace "${namespace}". ` +
                      `Available jobs: ${Object.keys(router.jobs).join(', ')}`,
                      log: true,
                    }
                  );
                }
                
                return adapter.invoke({
                  id: jobResult.namespacedJobId,
                  input,
                  ...options
                });
              })
            );
            return results;
          }
        };
        
        // @ts-expect-error - TJobs is not used [DO NOT REMOVE THIS - ITS WORKING]
        mergedExecutor[namespace as keyof typeof mergedExecutor] = namespaceExecutor;
      }
      
      // Add createProxy method to enable namespace access
      const proxy = createJobsProxy(mergedJobsByNamespace, registry, ({ namespacedJobId, input, options }) => {
        return adapter.invoke({
          id: namespacedJobId,
          input,
          ...options
        });
      });

      // Explicitly define createProxy instead of dynamic assignment
      const finalExecutor = {
        ...mergedExecutor,
        createProxy: () => proxy
      } as MergedJobsExecutor<MergedJobsRouter<TMergedJobs>>;
      
      // Store registry reference for potential debugging/monitoring
      (finalExecutor as any).__registry = registry;
      
      return finalExecutor;
    },

    async invoke(params) {
      validateJobExists(params.id);
      
      const jobDefinition = instances.registeredJobs.get(params.id);
      
      // Merge queue config from job definition with provided config
      const finalQueueConfig = {
        ...jobDefinition?.options?.queue,
        ...params.queue
      };
      
      const queue = getOrCreateQueue(finalQueueConfig);
      
      // Validate payload against schema if provided
      if (jobDefinition?.input && typeof jobDefinition.input.parse === 'function') {
        try {
          jobDefinition.input.parse(params.input);
        } catch (error) {
          throw new IgniterError(
            {
              code: 'BULLMQ_ADAPTER_ERROR',
              message: `Invalid payload for job "${params.id}": ${error}`,
              log: true,
            }
          );
        }
      }

      // Process advanced scheduling options if they exist
      let processedOptions: any = {};
      if ('at' in params || 'retryStrategy' in params || 'condition' in params || 
          (params.repeat && ('skipWeekends' in params.repeat || 'onlyBusinessHours' in params.repeat))) {
        // This is an advanced schedule - process the options
        processedOptions = processAdvancedScheduleOptions(params as any);
      } else {
        // Regular job invocation - preserve existing logic
        const defaultOptions = jobDefinition?.options || {};
        processedOptions = {
          // Start with defaults
          attempts: 3,
          removeOnComplete: 10,
          removeOnFail: 50,
          // Apply call-specific options (highest priority)
          ...params,
          // Handle repeat options specifically
          repeat: params.repeat || defaultOptions.repeat ? {
            pattern: (params.repeat?.cron || defaultOptions.repeat?.cron),
            tz: (params.repeat?.tz || defaultOptions.repeat?.tz),
            limit: (params.repeat?.limit || defaultOptions.repeat?.limit),
            startDate: (params.repeat?.startDate || defaultOptions.repeat?.startDate),
            endDate: (params.repeat?.endDate || defaultOptions.repeat?.endDate),
          } : undefined,
        };
      }

      // Add job to queue with processed options
      const job = await queue.add(params.id, params.input, processedOptions);

      return job.id as string;
    },

    async search(params) {
      const queue = getOrCreateQueue(params?.queue);
      const filter = params?.filter || {};
      
      // Determine which job states to fetch based on status filter
      const statusMap: Record<JobStatus, string[]> = {
        waiting: ['waiting'],
        active: ['active'],
        completed: ['completed'],
        failed: ['failed'],
        delayed: ['delayed'],
        paused: ['paused'],
        stalled: ['stalled'],
      };

      const statesToFetch = filter.status 
        ? filter.status.flatMap(status => statusMap[status])
        : ['waiting', 'active', 'completed', 'failed', 'delayed'];

      const results: JobSearchResult[] = [];
      
      // Fetch jobs for each requested state
      for (const state of statesToFetch) {
        const jobs = await queue.getJobs([state as any], 
          filter.offset || 0, 
          (filter.offset || 0) + (filter.limit || 100) - 1
        );
        
        for (const job of jobs) {
          const result = mapBullMQJobToResult(job);
          
          // Apply additional filters
          if (filter.jobId && !job.id!.includes(filter.jobId)) continue;
          if (filter.dateRange?.from && result.createdAt < filter.dateRange.from) continue;
          if (filter.dateRange?.to && result.createdAt > filter.dateRange.to) continue;
          
          results.push(result);
        }
      }

      // Apply sorting
      if (filter.orderBy) {
        const [field, direction] = filter.orderBy.split(':') as [string, 'asc' | 'desc'];
        results.sort((a, b) => {
          let aVal: any, bVal: any;
          
          switch (field) {
            case 'timestamp':
              aVal = a.createdAt.getTime();
              bVal = b.createdAt.getTime();
              break;
            case 'priority':
              aVal = a.priority;
              bVal = b.priority;
              break;
            default:
              return 0;
          }
          
          return direction === 'asc' ? aVal - bVal : bVal - aVal;
        });
      }

      return results.slice(0, filter.limit || 100);
    },

    async worker(config) {
      for (const queueName of config.queues) {
        // Support wildcard queue names for multi-tenant scenarios
        if (queueName.includes('*')) {
          // For wildcards, we'll need to implement dynamic queue discovery
          // This is a simplified version - in production, you'd want more sophisticated pattern matching
          logger?.warn(`Wildcard queue patterns like "${queueName}" require additional setup. ` +
                      `Consider using specific queue names or implementing dynamic queue discovery.`);
          continue;
        }

        const workerKey = `${queueName}-worker`;
        
        if (instances.workers.has(workerKey)) {
          logger?.warn(`Worker for queue "${queueName}" already exists. Skipping.`);
          continue;
        }

        logger?.info(`Starting worker for queue: ${queueName}`);
        
        const worker = new Worker(queueName, async (job: BullMQJob) => {
          logger?.info(`Processing job: ${job.name} (ID: ${job.id}) in queue: ${queueName}`);
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
          const namespaceParts = job.name.split('.');
          const namespace = namespaceParts.length > 1 ? namespaceParts[0] : undefined;
          
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
              // @ts-expect-error - Metadata typing is complex, keeping as-is for now
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
            
            // @ts-expect-error - [KEEP_IT] Check if job should be skipped based on advanced scheduling rules
            if (shouldSkipExecution(job.opts.metadata)) {
              logger?.info(`Skipping job "${job.name}" due to advanced scheduling rules`);
              
              // Mark job as completed but with a special result indicating it was skipped
              return { 
                skipped: true, 
                reason: 'Advanced scheduling rules', 
                timestamp: new Date().toISOString() 
              };
            }

            // Check conditional execution
            // @ts-expect-error - [KEEP_IT] Check if job should be skipped based on advanced scheduling rules
            if (job.opts.metadata?.hasCondition && job.opts.metadata?.condition) {
              try {
                // Note: In a real implementation, conditions would need to be stored differently
                // since functions can't be serialized. This is a placeholder for the concept.
                logger?.info(`Job "${job.name}" has conditional execution - this would evaluate the condition here`);
              } catch (conditionError) {
                logger?.error(`Condition evaluation failed for job "${job.name}":`, conditionError);
                return { 
                  skipped: true, 
                  reason: 'Condition evaluation failed', 
                  // @ts-expect-error - [KEEP_IT] Check if job should be skipped based on advanced scheduling rules
                  error: conditionError.message,
                  timestamp: new Date().toISOString() 
                };
              }
            }

            // Check max concurrency (basic implementation)
            // @ts-expect-error - [KEEP_IT] Check if job should be skipped based on advanced scheduling rules
            if (job.opts.metadata?.maxConcurrency) {
              // In a full implementation, this would check Redis for active jobs with same ID
              // @ts-expect-error - [KEEP_IT] Check if job should be skipped based on advanced scheduling rules
              logger?.info(`Job "${job.name}" has max concurrency limit: ${job.opts.metadata.maxConcurrency}`);
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

            await safelyExecuteHook('onStart', jobDefinition.onStart, startContext);

            // Execute the main job handler
            // Note: The actual context is created by the job definition's enhanced handler
            // which was set up in bulkRegister with the context factory
            result = await jobDefinition.handler(executionContext);
            success = true;

            // 🚀 EXECUTE ONSUCCESS HOOKS
            const endTime = Date.now();
            const executionTime = endTime - startTime;
            
            const successContext: JobSuccessHookContext<TContext, any, any> = {
              input: job.data,
              context: executionContext.context as TContext,
              job: { ...jobHookInfo, executionTime },
              result,
              completedAt: new Date(),
              executionTime,
            };

            await safelyExecuteHook('onSuccess', jobDefinition.onSuccess, successContext);

            // ==========================================
            // WEBHOOK NOTIFICATIONS
            // ==========================================
            
            // Send webhook notification if configured
            // @ts-expect-error - [KEEP_IT] Check if job should be skipped based on advanced scheduling rules
            if (job.opts.metadata?.webhookUrl) {
              try {
                // @ts-expect-error - [KEEP_IT] Check if job should be skipped based on advanced scheduling rules
                await sendWebhookNotification(job.opts.metadata.webhookUrl, {
                  jobId: job.id,
                  jobName: job.name,
                  status: 'completed',
                  result,
                  executionTime,
                  completedAt: new Date().toISOString(),
                  // @ts-expect-error - [KEEP_IT] Check if job should be skipped based on advanced scheduling rules
                  tags: job.opts.metadata?.tags,
                });
              } catch (webhookError) {
                logger?.error(`Webhook notification failed for job "${job.name}":`, webhookError);
                // Don't fail the job if webhook fails
              }
            }

          } catch (jobError) {
            error = jobError instanceof Error ? jobError : new Error(String(jobError));
            success = false;

            // 🚀 EXECUTE ONFAILURE HOOKS
            const endTime = Date.now();
            const executionTime = endTime - startTime;
            const isFinalAttempt = job.attemptsMade >= (job.opts.attempts || 3) - 1;

            const failureContext: JobFailureHookContext<TContext, any> = {
              input: job.data,
              context: executionContext.context as TContext,
              job: { ...jobHookInfo, executionTime },
              error,
              failedAt: new Date(),
              executionTime,
              isFinalAttempt,
            };

            await safelyExecuteHook('onFailure', jobDefinition.onFailure, failureContext);

            // Re-throw to maintain BullMQ error handling
            throw error;
          } finally {
            // 🚀 EXECUTE ONCOMPLETE HOOKS (always runs)
            const endTime = Date.now();
            const executionTime = endTime - startTime;

            const completeContext: JobCompleteHookContext<TContext, any, any> = {
              input: job.data,
              context: executionContext.context as TContext,
              job: { ...jobHookInfo, executionTime },
              success,
              result: success ? result : undefined,
              error: !success ? error : undefined,
              completedAt: new Date(),
              executionTime,
            };

            await safelyExecuteHook('onComplete', jobDefinition.onComplete, completeContext);
          }

          return result;
        }, {
          connection: redisConnection,
          concurrency: config.concurrency || 1,
          ...options.workerOptions,
        });
        
        logger?.info(`Worker started for queue: ${queueName} with concurrency: ${config.concurrency || 1}`);

        // Set up event handlers
        if (config.onActive) {
          worker.on('active', (job: BullMQJob) => {
            config.onActive?.({ job: mapBullMQJobToResult(job) });
          });
        }

        if (config.onSuccess) {
          worker.on('completed', (job: BullMQJob, result: any) => {
            config.onSuccess?.({ job: mapBullMQJobToResult(job), result });
          });
        }

        if (config.onFailure) {
          worker.on('failed', (job: BullMQJob | undefined, error: Error) => {
            if (job) {
              config.onFailure?.({ job: mapBullMQJobToResult(job), error });
            }
          });
        }

        if (config.onIdle) {
          worker.on('drained', () => {
            config.onIdle?.();
          });
        }

        instances.workers.set(workerKey, worker);
      }
    },

    async shutdown() {
      // Close all workers
      for (const [key, worker] of instances.workers) {
        await worker.close();
        instances.workers.delete(key);
      }

      // Close all queues
      for (const [key, queue] of instances.queues) {
        await queue.close();
        instances.queues.delete(key);
      }

      // Clear registered jobs
      instances.registeredJobs.clear();
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
      config: Omit<JobDefinition<TContext, TInput, TResult>, 'id'> & {
        name: string;
        input: StandardSchemaV1;
        handler: (context: JobExecutionContext<TContext, TInput>) => Promise<TResult> | TResult;
      }
    ): JobDefinition<TContext, TInput, TResult> {
      // Validate job configuration
      if (!config.name || config.name.trim() === '') {
        throw new IgniterError(
          {
            code: 'BULLMQ_ADAPTER_ERROR',
            message: 'Job name is required and cannot be empty',
            log: true,
          }
        );
      }

      if (!config.input) {
        throw new IgniterError(
          {
            code: 'BULLMQ_ADAPTER_ERROR',
            message: 'Job input schema is required',
            log: true,
          }
        );
      }

      if (!config.handler || typeof config.handler !== 'function') {
        throw new IgniterError(
          {
            code: 'BULLMQ_ADAPTER_ERROR',
            message: 'Job handler is required and must be a function',
            log: true,
          }
        );
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
      options: CronJobOptions = {}
    ): JobDefinition<TContext, any, TResult> {
      // Validate the cron expression
      const cronExpression = typeof schedule === 'string' ? schedule : schedule;
      validateCronExpression(cronExpression);

      // Generate job name
      const jobName = generateCronJobName(cronExpression, options);

      // Create enhanced handler that provides cron context
      const enhancedHandler = async (executionContext: any): Promise<TResult> => {
        // Get execution count from job metadata
        const executionCount = (executionContext.job.metadata?.executionCount || 0) + 1;
        const maxExecutions = options.maxExecutions;
        const isFinalExecution = maxExecutions ? executionCount >= maxExecutions : false;

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
          logger?.info(`Cron job "${jobName}" completed its final execution (${executionCount}/${maxExecutions}).`);
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