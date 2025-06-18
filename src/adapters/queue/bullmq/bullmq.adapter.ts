import { Queue, Worker, Job, QueueOptions, WorkerOptions } from "bullmq";
import type { 
  IgniterJobQueueAdapter,
  JobSearchResult,
  JobQueueConfig,
  JobStatus
} from "../../../types/jobs.interface";
import type { BullMQAdapterOptions, BullMQInstances } from "./types";

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
 * 
 * const redisStore = createRedisStoreAdapter(redisClient);
 * const jobQueue = createBullMQAdapter({ store: redisStore });
 * 
 * const igniter = Igniter
 *   .context<AppContext>()
 *   .store(redisStore)
 *   .jobs(jobQueue)
 *   .create();
 * ```
 */
export function createBullMQAdapter<TContext extends object>(options: BullMQAdapterOptions = {}): IgniterJobQueueAdapter<TContext> {
  // Internal state management
  const instances: BullMQInstances = {
    queues: new Map(),
    workers: new Map(),
    registeredJobs: new Map(),
  };

  // Extract Redis connection from store adapter if provided
  const redisConnection = options.store?.client ? {
    host: 'localhost', // Will be overridden by actual Redis client config
    port: 6379,
    // Pass the actual Redis client instance to BullMQ
    ...(typeof options.store.client === 'object' && 'options' in (options.store.client as any) 
      ? (options.store.client as any).options 
      : {})
  } : undefined;

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
  function getOrCreateQueue(queueConfig?: JobQueueConfig): Queue {
    const queueName = buildQueueName(queueConfig);
    
    if (!instances.queues.has(queueName)) {
      const queue = new Queue(queueName, {
        connection: {
          ...redisConnection,
          maxRetriesPerRequest: null,
        },
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
  function mapBullMQJobToResult(job: Job): JobSearchResult {
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
      throw new Error(
        `Job "${jobId}" is not registered. Please register it first using jobs.register().`
      );
    }
  }

  return {
    client: { instances, options },

    async register(jobs) {
      // Store job definitions for validation and type inference
      for (const [jobId, definition] of Object.entries(jobs)) {
        instances.registeredJobs.set(jobId, definition);
        
        // Check if job has cron configuration and auto-schedule it
        const options = definition.options;
        if (!options) continue;

        const cronConfig = options.defaultOptions?.repeat?.cron;
        if (cronConfig) {
          const queueConfig = options.queue;
          const queue = getOrCreateQueue(queueConfig);
          
          // Schedule the job with the default options
          await queue.add(
            jobId,
            {}, // Empty payload for the scheduler job
            {
              ...options.defaultOptions,
              jobId: `${jobId}__scheduler`, // Unique ID for the scheduler
            }
          );
        }
      }
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
          throw new Error(`Invalid payload for job "${params.id}": ${error}`);
        }
      }

      // Merge default options from job definition with provided options
      const defaultOptions = jobDefinition?.options?.defaultOptions || {};
      const finalOptions = {
        // Start with defaults
        attempts: 3,
        removeOnComplete: 10,
        removeOnFail: 50,
        // Apply job-level defaults
        ...defaultOptions,
        // Apply call-specific options (highest priority)
        ...params.options,
        // Handle repeat options specifically
        repeat: params.options?.repeat || defaultOptions.repeat ? {
          pattern: (params.options?.repeat?.cron || defaultOptions.repeat?.cron),
          tz: (params.options?.repeat?.tz || defaultOptions.repeat?.tz),
          limit: (params.options?.repeat?.limit || defaultOptions.repeat?.limit),
          startDate: (params.options?.repeat?.startDate || defaultOptions.repeat?.startDate),
          endDate: (params.options?.repeat?.endDate || defaultOptions.repeat?.endDate),
        } : undefined,
      };

      // Add job to queue with merged options
      const job = await queue.add(params.id, params.input, finalOptions);

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
          if (filter.jobId && !job.id.includes(filter.jobId)) continue;
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
          console.warn(`Wildcard queue patterns like "${queueName}" require additional setup. ` +
                      `Consider using specific queue names or implementing dynamic queue discovery.`);
          continue;
        }

        const workerKey = `${queueName}-worker`;
        
        if (instances.workers.has(workerKey)) {
          console.warn(`Worker for queue "${queueName}" already exists. Skipping.`);
          continue;
        }

        const worker = new Worker(queueName, async (job: Job) => {
          const jobDefinition = instances.registeredJobs.get(job.name);
          
          if (!jobDefinition) {
            throw new Error(`No job definition found for "${job.name}"`);
          }

          // Filter by job type if specified
          if (config.jobFilter && !config.jobFilter.includes(job.name)) {
            return; // Skip this job
          }

          // Create execution context
          const executionContext = {
            input: job.data,
            ctx: {}, // This will be injected by the jobs service
            job: {
              id: job.id,
              name: job.name,
              attemptsMade: job.attemptsMade,
              createdAt: new Date(job.timestamp),
              // @ts-expect-error - TJobs is not used [DO NOT REMOVE THIS - ITS WORKING]
              metadata: job.opts.metadata,
            },
          };

          // Execute the job
          return await jobDefinition.handler(executionContext);
        }, {
          connection: redisConnection,
          concurrency: config.concurrency || 1,
          ...options.workerOptions,
        });

        // Set up event handlers
        if (config.onActive) {
          worker.on('active', (job: Job) => {
            config.onActive?.({ job: mapBullMQJobToResult(job) });
          });
        }

        if (config.onSuccess) {
          worker.on('completed', (job: Job, result: any) => {
            config.onSuccess?.({ job: mapBullMQJobToResult(job), result });
          });
        }

        if (config.onFailure) {
          worker.on('failed', (job: Job | undefined, error: Error) => {
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
  };
} 