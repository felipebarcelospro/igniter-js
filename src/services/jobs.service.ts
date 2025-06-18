import type { 
  IgniterJobQueueAdapter,
  JobDefinition,
  JobInvokeParams,
  JobSearchParams,
  JobWorkerConfig,
  JobExecutionContext
} from "../types/jobs.interface";
import type { StandardSchemaV1 } from "../types/schema.interface";

/**
 * Configuration for creating a jobs service instance.
 * 
 * @template TContext - The application context type
 */
export interface IgniterJobsServiceConfig<TContext extends object> {
  /** The job queue adapter to use (e.g., BullMQ) */
  adapter: IgniterJobQueueAdapter<TContext>;
  /** Function to create the application context for job execution */
  contextFactory: () => TContext | Promise<TContext>;
}

/**
 * Type-safe job registration map that preserves job IDs and payload types.
 * 
 * @template TJobs - Record of job definitions
 */
export type JobRegistrationMap<TJobs extends Record<string, JobDefinition<any, any, any>>> = {
  [K in keyof TJobs]: TJobs[K] extends JobDefinition<any, infer TPayload, any> ? TPayload : never;
};

/**
 * Infers the payload type for a specific job from a registration map.
 * 
 * @template TJobs - The job registration map
 * @template TJobId - The specific job ID
 */
export type InferJobPayload<
  TJobs extends Record<string, JobDefinition<any, any, any>>,
  TJobId extends keyof TJobs
> = TJobs[TJobId] extends JobDefinition<any, infer TPayload, any> ? TPayload : never;

/**
 * Type-safe job invocation parameters that enforce correct payload types.
 * 
 * @template TJobs - The job registration map
 * @template TJobId - The specific job ID being invoked
 */
export interface TypeSafeJobInvokeParams<
  TJobs extends Record<string, JobDefinition<any, any, any>>,
  TJobId extends keyof TJobs
> extends Omit<JobInvokeParams, 'id' | 'payload'> {
  /** The registered job ID (type-safe) */
  id: TJobId;
  /** The payload for the job (type-safe based on job definition) */
  payload: InferJobPayload<TJobs, TJobId>;
}

/**
 * Main jobs service that provides type-safe job operations.
 * 
 * This service acts as the primary interface for job management in Igniter applications,
 * providing type-safe registration, invocation, search, and worker management.
 * 
 * @template TContext - The application context type
 * @template TJobs - The registered jobs map (populated via register method)
 */
export class IgniterJobsService<
  TContext extends object,
  TJobs extends Record<string, JobDefinition<TContext, any, any>> = {}
> {
  private adapter: IgniterJobQueueAdapter<TContext>;
  private contextFactory: () => TContext | Promise<TContext>;
  private registeredJobs: TJobs = {} as TJobs;

  constructor(config: IgniterJobsServiceConfig<TContext>) {
    this.adapter = config.adapter;
    this.contextFactory = config.contextFactory;
  }

  /**
   * Registers jobs in the system, making them available for invocation.
   * 
   * This method stores job definitions and validates their schemas,
   * enabling type-safe invocation throughout the application.
   * 
   * @param jobs - Map of job definitions with their configurations
   * @returns Promise that resolves when all jobs are registered
   * 
   * @example
   * ```typescript
   * await jobsService.register({
   *   "send-email": {
   *     name: "Send Email Notification",
   *     payload: z.object({ to: z.string().email(), subject: z.string() }),
   *     run: async ({ payload, ctx }) => {
   *       await ctx.emailService.send(payload);
   *       return { sent: true };
   *     }
   *   }
   * });
   * ```
   */
  async register<TNewJobs extends Record<string, JobDefinition<TContext, any, any>>>(
    jobs: TNewJobs
  ): Promise<IgniterJobsService<TContext, TJobs & TNewJobs>> {
    // Enhance job definitions with context injection
    const enhancedJobs: Record<string, JobDefinition<TContext, any, any>> = {};
    
    for (const [jobId, definition] of Object.entries(jobs)) {
      enhancedJobs[jobId] = {
        ...definition,
        handler: async (executionContext: JobExecutionContext<any, any>) => {
          // Inject the full application context
          const ctx = await this.contextFactory();
          
          const enhancedContext: JobExecutionContext<TContext, any> = {
            ...executionContext,
            ctx,
          };
          
          return await definition.handler(enhancedContext);
        },
      };
    }

    // Register with the adapter
    await this.adapter.register(enhancedJobs);
    
    // Store for type inference
    this.registeredJobs = { ...this.registeredJobs, ...jobs } as TJobs & TNewJobs;
    
    // Return new instance with updated types
    const newService = new IgniterJobsService<TContext, TJobs & TNewJobs>({
      adapter: this.adapter,
      contextFactory: this.contextFactory,
    });
    newService.registeredJobs = this.registeredJobs as TJobs & TNewJobs;
    
    return newService;
  }

  /**
   * Invokes a registered job, adding it to the queue for execution.
   * 
   * This method provides type-safe job invocation with automatic payload validation
   * based on the job's schema definition.
   * 
   * @param params - Type-safe invocation parameters
   * @returns Promise that resolves to the job ID
   * 
   * @example
   * ```typescript
   * // Type-safe invocation - payload is validated against job schema
   * const jobId = await jobsService.invoke({
   *   id: "send-email",
   *   payload: { to: "user@example.com", subject: "Welcome!" },
   *   options: { priority: 10, delay: 5000 }
   * });
   * ```
   */
  async invoke<TJobId extends keyof TJobs>(
    params: TypeSafeJobInvokeParams<TJobs, TJobId>
  ): Promise<string> {
    return await this.adapter.invoke(params as any);
  }

  /**
   * Invokes multiple jobs in batch for efficient processing.
   * 
   * @param jobs - Array of type-safe job invocation parameters
   * @returns Promise that resolves to an array of job IDs
   * 
   * @example
   * ```typescript
   * const jobIds = await jobsService.invokeMany([
   *   { id: "send-email", payload: { to: "user1@example.com", subject: "Hello" } },
   *   { id: "update-analytics", payload: { userId: "123", event: "signup" } }
   * ]);
   * ```
   */
  async invokeMany<TJobId extends keyof TJobs>(
    jobs: Array<TypeSafeJobInvokeParams<TJobs, TJobId>>
  ): Promise<string[]> {
    const results = await Promise.all(
      jobs.map(params => this.adapter.invoke(params as any))
    );
    return results;
  }

  /**
   * Searches for jobs in the queue with advanced filtering options.
   * 
   * This method allows querying job status, filtering by various criteria,
   * and retrieving detailed job information for monitoring and debugging.
   * 
   * @param params - Search parameters with filters and queue configuration
   * @returns Promise that resolves to an array of job results
   * 
   * @example
   * ```typescript
   * // Search for failed jobs in the last hour
   * const failedJobs = await jobsService.search({
   *   filter: {
   *     status: ["failed"],
   *     dateRange: { from: new Date(Date.now() - 3600000) },
   *     limit: 50
   *   }
   * });
   * ```
   */
  async search(params?: JobSearchParams) {
    return await this.adapter.search(params);
  }

  /**
   * Starts a worker to process jobs from specified queues.
   * 
   * Workers are responsible for executing the job logic defined in the `run` functions.
   * This method supports advanced configuration including concurrency control,
   * event handling, and job filtering.
   * 
   * @param config - Worker configuration including queues and event handlers
   * @returns Promise that resolves when the worker is started
   * 
   * @example
   * ```typescript
   * // Start a worker for email processing with high concurrency
   * await jobsService.worker({
   *   queues: ["email-queue"],
   *   concurrency: 50,
   *   jobFilter: ["send-email", "send-notification"],
   *   onSuccess: ({ job, result }) => {
   *     console.log(`Email sent successfully: ${job.id}`);
   *   },
   *   onFailure: ({ job, error }) => {
   *     console.error(`Email failed: ${job.id}`, error);
   *   }
   * });
   * ```
   */
  async worker(config: JobWorkerConfig): Promise<void> {
    return await this.adapter.worker(config);
  }

  /**
   * Gracefully shuts down all workers and closes queue connections.
   * 
   * This method should be called when the application is shutting down
   * to ensure proper cleanup of resources and graceful job completion.
   * 
   * @returns Promise that resolves when shutdown is complete
   * 
   * @example
   * ```typescript
   * // Graceful shutdown on process termination
   * process.on('SIGTERM', async () => {
   *   await jobsService.shutdown();
   *   process.exit(0);
   * });
   * ```
   */
  async shutdown(): Promise<void> {
    return await this.adapter.shutdown();
  }

  /**
   * Gets the list of registered job IDs for debugging and introspection.
   * 
   * @returns Array of registered job IDs
   * 
   * @example
   * ```typescript
   * const registeredJobs = jobsService.getRegisteredJobs();
   * console.log("Available jobs:", registeredJobs);
   * ```
   */
  getRegisteredJobs(): Array<keyof TJobs> {
    return Object.keys(this.registeredJobs);
  }

  /**
   * Gets detailed information about a specific registered job.
   * 
   * @param jobId - The job ID to get information for
   * @returns Job definition or undefined if not found
   * 
   * @example
   * ```typescript
   * const jobInfo = jobsService.getJobInfo("send-email");
   * if (jobInfo) {
   *   console.log(`Job: ${jobInfo.name}`);
   * }
   * ```
   */
  getJobInfo<TJobId extends keyof TJobs>(jobId: TJobId): TJobs[TJobId] | undefined {
    return this.registeredJobs[jobId];
  }
}

/**
 * Creates a new jobs service instance with the specified configuration.
 * 
 * This factory function provides a clean way to instantiate the jobs service
 * with proper type inference and configuration validation.
 * 
 * @param config - Service configuration including adapter and context factory
 * @returns New jobs service instance
 * 
 * @example
 * ```typescript
 * import { createBullMQAdapter } from "@igniter-js/core/adapters";
 * 
 * const jobsService = createIgniterJobsService({
 *   adapter: createBullMQAdapter({ store: redisStore }),
 *   contextFactory: () => ({ db, logger, emailService })
 * });
 * ```
 */
export function createIgniterJobsService<TContext extends object>(
  config: IgniterJobsServiceConfig<TContext>
): IgniterJobsService<TContext> {
  return new IgniterJobsService(config);
}

/**
 * Helper function to create a job definition with proper typing.
 * 
 * This utility provides better IDE support and type inference when defining jobs.
 * 
 * @param definition - The job definition
 * @returns The same job definition with enhanced typing
 * 
 * @example
 * ```typescript
 * const emailJob = createJobDefinition({
 *   name: "Send Email",
 *   payload: z.object({ to: z.string().email() }),
 *   run: async ({ payload, ctx }) => {
 *     await ctx.emailService.send(payload);
 *     return { sent: true };
 *   }
 * });
 * ```
 */
export function createJobDefinition<
  TContext extends object,
  TPayload = any,
  TResult = any
>(
  definition: JobDefinition<TContext, TPayload, TResult>
): JobDefinition<TContext, TPayload, TResult> {
  return definition;
} 