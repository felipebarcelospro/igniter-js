import type { StandardSchemaV1 } from "../types";
import type {
  IgniterJobQueueAdapter,
  JobDefinition,
  JobInvokeParams,
  JobSearchParams,
  JobWorkerConfig,
  JobExecutionContext,
  JobsRouter,
  JobsRouterConfig,
  JobsRegistryOptions,
  JobExecutor,
  JobsNamespaceProxy,
  JobInvokeOptions,
  JobsCacheEntry,
  JobPathResolutionResult,
  JobsManagementApi,
  JobsManagementProxy,
  WorkerHandle,
  QueueManager,
  JobManager,
} from "../types/jobs.interface";
import { IgniterConsoleLogger } from "./logger.service";
import { resolveLogLevel, createLoggerContext } from "../utils/logger";

/**
 * Configuration for creating a jobs service instance.
 *
 * @template TContext - The application context type
 */
export interface IgniterJobsServiceConfig<TContext extends object> {
  /** The job queue adapter to use (e.g., BullMQ) */
  adapter: IgniterJobQueueAdapter<TContext>;
  /** Function to create the application context for job execution */
  context: () => TContext | Promise<TContext>;
}

/**
 * Type-safe job registration map that preserves job IDs and input types.
 *
 * @template TJobs - Record of job definitions
 */
export type JobRegistrationMap<
  TJobs extends Record<string, JobDefinition<any, any, any>>,
> = {
  [K in keyof TJobs]: TJobs[K] extends JobDefinition<any, infer TInput, any>
    ? TInput
    : never;
};

/**
 * Infers the input type for a specific job from a registration map.
 *
 * @template TJobs - The job registration map
 * @template TJobId - The specific job ID
 */
export type InferJobPayload<
  TJobs extends Record<string, JobDefinition<any, any, any>>,
  TJobId extends keyof TJobs,
> =
  TJobs[TJobId] extends JobDefinition<any, infer TInput, any>
    ? StandardSchemaV1.InferInput<TInput>
    : never;

/**
 * Type-safe job invocation parameters that enforce correct input types.
 *
 * @template TJobs - The job registration map
 * @template TJobId - The specific job ID being invoked
 */
export interface TypeSafeJobInvokeParams<
  TJobs extends Record<string, JobDefinition<any, any, any>>,
  TJobId extends keyof TJobs,
> extends Omit<JobInvokeParams, "id" | "input"> {
  /** The registered job ID (type-safe) */
  id: TJobId;
  /** The input for the job (type-safe based on job definition) */
  input: InferJobPayload<TJobs, TJobId>;
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
  TJobs extends Record<string, JobDefinition<TContext, any, any>> = {},
> {
  private adapter: IgniterJobQueueAdapter<TContext>;
  private context: () => TContext | Promise<TContext>;
  private registeredJobs: TJobs = {} as TJobs;

  constructor(config: IgniterJobsServiceConfig<TContext>) {
    this.adapter = config.adapter;
    this.context = config.context;
  }

  /**
   * Registers a single job in the system, making it available for invocation.
   *
   * @param config - Job definition and configuration (see JobDefinition)
   * @returns The registered job definition (type-safe)
   *
   * @example
   * ```typescript
   * const job = jobsService.register({
   *   name: "Send Email",
   *   input: z.object({ to: z.string().email() }),
   *   handler: async ({ context, input }) => {
   *     await context.mailer.send(input);
   *   }
   * });
   * ```
   */
  register<TInput extends StandardSchemaV1<any, any>, TResult = any>(
    config: Omit<JobDefinition<TContext, TInput, TResult>, "id"> & {
      name: string;
      input: TInput;
      handler: (
        context: JobExecutionContext<TContext, TInput>,
      ) => Promise<TResult> | TResult;
    },
  ): JobDefinition<TContext, TInput, TResult> {
    // Validate job configuration
    if (!config.name || config.name.trim() === "") {
      throw new Error("Job name is required and cannot be empty");
    }

    if (!config.input) {
      throw new Error("Job input schema is required");
    }

    if (!config.handler || typeof config.handler !== "function") {
      throw new Error("Job handler is required and must be a function");
    }

    // Return the complete job definition
    return {
      ...config, // Include any additional options like queue, attempts, etc.
      name: config.name,
      input: config.input,
      handler: config.handler,
    } as JobDefinition<TContext, TInput, TResult>;
  }

  /**
   * Registers multiple jobs in bulk.
   *
   * @param jobs - Map of job definitions with their IDs
   * @returns Promise that resolves to a new jobs service instance with all jobs registered
   *
   * @example
   * ```typescript
   * await jobsService.bulkRegister({
   *   "send-email": {
   *     name: "Send Email",
   *     input: z.object({ to: z.string() }),
   *     handler: async ({ context, input }) => {
   *       await context.mailer.send(input);
   *     }
   *   },
   *   "process-payment": {
   *     name: "Process Payment",
   *     input: z.object({ amount: z.number() }),
   *     handler: async ({ context, input }) => {
   *       return context.payments.process(input);
   *     }
   *   }
   * });
   * ```
   */
  bulkRegister<
    TNewJobs extends Record<string, JobDefinition<TContext, any, any>>,
  >(jobs: TNewJobs): IgniterJobsService<TContext, TJobs & TNewJobs> {
    const enhancedJobs: Record<string, JobDefinition<TContext, any, any>> = {};

    for (const [jobId, definition] of Object.entries(jobs)) {
      enhancedJobs[jobId] = {
        ...definition,
        handler: async (executionContext: JobExecutionContext<any, any>) => {
          const context = await this.context();
          const enhancedContext: JobExecutionContext<TContext, any> = {
            ...executionContext,
            context: context,
          };
          return await definition.handler(enhancedContext);
        },
      };
    }

    // Register all jobs with the adapter
    this.adapter.bulkRegister(enhancedJobs);

    // Store for type inference
    const newJobs = {
      ...this.registeredJobs,
      ...jobs,
    } as TJobs & TNewJobs;

    const newService = new IgniterJobsService<TContext, TJobs & TNewJobs>({
      adapter: this.adapter,
      context: this.context,
    });
    newService.registeredJobs = newJobs;

    return newService;
  }

  /**
   * Invokes a registered job, adding it to the queue for execution.
   *
   * This method provides type-safe job invocation with automatic input validation
   * based on the job's schema definition.
   *
   * @param params - Type-safe invocation parameters
   * @returns Promise that resolves to the job ID
   *
   * @example
   * ```typescript
   * // Type-safe invocation - input is validated against job schema
   * const jobId = await jobsService.invoke({
   *   id: "send-email",
   *   input: { to: "user@example.com", subject: "Welcome!" },
   *   options: { priority: 10, delay: 5000 }
   * });
   * ```
   */
  async invoke<TJobId extends keyof TJobs>(
    params: TypeSafeJobInvokeParams<TJobs, TJobId>,
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
   *   { id: "send-email", input: { to: "user1@example.com", subject: "Hello" } },
   *   { id: "update-analytics", input: { userId: "123", event: "signup" } }
   * ]);
   * ```
   */
  async invokeMany<TJobId extends keyof TJobs>(
    jobs: Array<TypeSafeJobInvokeParams<TJobs, TJobId>>,
  ): Promise<string[]> {
    const results = await Promise.all(
      jobs.map((params) => this.adapter.invoke(params as any)),
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
   * @returns Promise that resolves to a WorkerHandle for controlling the worker
   *
   * @example
   * ```typescript
   * // Start a worker for email processing with high concurrency
   * const handle = await jobsService.worker({
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
   *
   * // Later, pause the worker
   * await handle.pause();
   * ```
   */
  async worker(config: JobWorkerConfig): Promise<WorkerHandle> {
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
  getJobInfo<TJobId extends keyof TJobs>(
    jobId: TJobId,
  ): TJobs[TJobId] | undefined {
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
 *   context: () => ({ db, logger, email })
 * });
 * ```
 */
export function createIgniterJobsService<TContext extends object>(
  config: IgniterJobsServiceConfig<TContext>,
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
 *   input: z.object({ to: z.string().email() }),
 *   handler: async ({ input, context }) => {
 *     await context.email.send(input);
 *     return { sent: true };
 *   }
 * });
 * ```
 */
export function createJobDefinition<
  TContext extends object,
  TInput extends StandardSchemaV1,
  TResult = any,
>(
  definition: JobDefinition<TContext, TInput, TResult>,
): JobDefinition<TContext, TInput, TResult> {
  return definition;
}

// ==========================================
// JOBS ROUTER SYSTEM (NEW ARCHITECTURE)
// ==========================================

/**
 * Creates a new jobs router with type-safe job registration and management.
 *
 * This factory function provides a clean way to organize jobs by feature or domain,
 * enabling better code organization and type safety throughout the application.
 *
 * @template TJobs - Record of job definitions with their configurations
 * @param config - Router configuration including jobs, namespace, and default options
 * @returns A JobsRouter instance with type-safe methods
 *
 * @example
 * ```typescript
 * // Create a router for user-related jobs
 * const userJobsRouter = createJobsRouter({
 *   jobs: {
 *     "send-welcome-email": {
 *       name: "Send Welcome Email",
 *       input: z.object({ userId: z.string(), email: z.string().email() }),
 *       handler: async ({ input, context }) => {
 *         await context.email.sendWelcome(input.email);
 *         return { sent: true, timestamp: new Date() };
 *       }
 *     },
 *     "process-signup": {
 *       name: "Process User Signup",
 *       input: z.object({ userId: z.string(), plan: z.enum(["free", "pro"]) }),
 *       handler: async ({ input, context }) => {
 *         await context.userService.setupAccount(input.userId, input.plan);
 *         return { accountReady: true };
 *       }
 *     }
 *   },
 *   namespace: "user",
 *   defaultOptions: {
 *     attempts: 3,
 *     queue: { name: "user-queue" }
 *   }
 * });
 * ```
 */
export function createJobsRouter<
  TJobs extends Record<string, JobDefinition<any, any, any>>,
>(config: JobsRouterConfig<TJobs>): JobsRouter<TJobs> {
  // Validate job IDs for uniqueness and naming conventions
  const jobIds = Object.keys(config.jobs);
  const duplicates = jobIds.filter((id, index) => jobIds.indexOf(id) !== index);

  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate job IDs found in router: ${duplicates.join(", ")}. ` +
        `Each job must have a unique ID within the router.`,
    );
  }

  // Validate namespace naming (if provided)
  if (config.namespace) {
    const namespaceRegex = /^[a-zA-Z][a-zA-Z0-9-_]*$/;
    if (!namespaceRegex.test(config.namespace)) {
      throw new Error(
        `Invalid namespace "${config.namespace}". ` +
          `Namespace must start with a letter and contain only letters, numbers, hyphens, and underscores.`,
      );
    }
  }

  // Create the enhanced jobs with inherited default options and global hooks
  const enhancedJobs: TJobs = {} as TJobs;

  for (const [jobId, definition] of Object.entries(config.jobs)) {
    // Merge job-specific options with router default options
    // Priority: job definition > router defaultOptions > defaults
    const mergedOptions = {
      ...config.defaultOptions,
      ...definition,
      // Explicitly merge nested objects that need special handling
      queue: definition.queue ?? config.defaultOptions?.queue,
      repeat: definition.repeat ?? config.defaultOptions?.repeat,
      metadata: {
        ...config.defaultOptions?.metadata,
        ...definition.metadata,
      },
    };

    // Create hook merging function that combines router global hooks with job-specific hooks
    const createMergedHook = <THookContext>(
      routerHook: ((context: THookContext) => void | Promise<void>) | undefined,
      jobHook: ((context: THookContext) => void | Promise<void>) | undefined,
    ) => {
      if (!routerHook && !jobHook) return undefined;

      return async (context: THookContext) => {
        const logger = IgniterConsoleLogger.create({
          level: resolveLogLevel(),
          context: createLoggerContext("Jobs"),
        });

        // Execute router global hook first
        if (routerHook) {
          try {
            await routerHook(context);
          } catch (error) {
            logger.error("Router hook failed:", { error });
          }
        }

        // Execute job-specific hook second (can override or complement)
        if (jobHook) {
          try {
            await jobHook(context);
          } catch (error) {
            logger.error("Job hook failed:", { error });
          }
        }
      };
    };

    // Merge limiter: job-level takes precedence over router-level
    const mergedLimiter = definition.limiter ?? config.defaultOptions?.limiter;

    enhancedJobs[jobId as keyof TJobs] = {
      // Apply all merged options (includes defaultOptions + definition)
      ...mergedOptions,
      // Ensure limiter is explicitly set (already computed with correct priority)
      limiter: mergedLimiter,

      // ==========================================
      // MERGE ROUTER GLOBAL HOOKS WITH JOB HOOKS
      // ==========================================

      onStart: createMergedHook(config.onStart, definition.onStart),
      onProgress: createMergedHook(config.onProgress, definition.onProgress),
      onSuccess: createMergedHook(config.onSuccess, definition.onSuccess),
      onFailure: createMergedHook(config.onFailure, definition.onFailure),
      onRetry: createMergedHook(config.onRetry, definition.onRetry),
      onComplete: createMergedHook(config.onComplete, definition.onComplete),
    } as TJobs[keyof TJobs];
  }

  return {
    jobs: enhancedJobs,
    namespace: config.namespace,
    defaultOptions: config.defaultOptions,

    register<TNewJobs extends Record<string, JobDefinition<any, any, any>>>(
      newJobs: TNewJobs,
    ): JobsRouter<TJobs & TNewJobs> {
      // Validate no conflicts with existing job IDs
      const existingIds = Object.keys(config.jobs);
      const newIds = Object.keys(newJobs);
      const conflicts = newIds.filter((id) => existingIds.includes(id));

      if (conflicts.length > 0) {
        throw new Error(
          `Job ID conflicts detected: ${conflicts.join(", ")}. ` +
            `Cannot register jobs with IDs that already exist in the router.`,
        );
      }

      // Create new router configuration with combined jobs and preserved hooks
      const combinedConfig: JobsRouterConfig<TJobs & TNewJobs> = {
        jobs: { ...config.jobs, ...newJobs } as TJobs & TNewJobs,
        namespace: config.namespace,
        defaultOptions: config.defaultOptions,
        // Preserve router-level global hooks
        onStart: config.onStart,
        onProgress: config.onProgress,
        onSuccess: config.onSuccess,
        onFailure: config.onFailure,
        onRetry: config.onRetry,
        onComplete: config.onComplete,
      };

      return createJobsRouter(combinedConfig);
    },
  };
}

// ==========================================
// JOBS REGISTRY CLASS IMPLEMENTATION
// ==========================================

/**
 * Implementation of the JobsRegistry for managing merged jobs with efficient lookups.
 *
 * This class provides centralized job management across multiple namespaces with
 * optimized path-based lookups, intelligent caching, and comprehensive job resolution.
 *
 * @template TMergedJobs - The structure of merged job namespaces
 *
 * @example
 * ```typescript
 * // Create registry from merged routers
 * const registry = new JobsRegistry({
 *   user: { "send-email": emailJob, "process-signup": signupJob },
 *   analytics: { "track-event": trackingJob }
 * }, { enableCache: true, maxCacheSize: 500 });
 *
 * // Efficient job lookups with caching
 * const emailJob = registry.getJobByPath("user.send-email");
 * ```
 */
export class JobsRegistry<
  TMergedJobs extends Record<string, any>,
> implements JobsRegistry<TMergedJobs> {
  public readonly jobs: TMergedJobs;
  public readonly options: JobsRegistryOptions;

  private readonly cache = new Map<string, JobsCacheEntry>();
  private cacheStats = {
    hits: 0,
    misses: 0,
  };

  constructor(jobs: TMergedJobs, options: JobsRegistryOptions = {}) {
    this.jobs = jobs;
    this.options = {
      enableCache: true,
      maxCacheSize: 1000,
      cacheTTL: 300000, // 5 minutes
      ...options,
    };
  }

  /**
   * Resolves a job by its namespace path with intelligent caching.
   *
   * @param path - The namespaced path to the job (e.g., "user.send-email")
   * @returns Job resolution result or null if not found
   */
  getJobByPath(path: string): JobPathResolutionResult | null {
    // Check cache first if enabled
    if (this.options.enableCache) {
      const cached = this.getCachedJob(path);
      if (cached) {
        this.cacheStats.hits++;
        return {
          definition: cached.definition,
          namespace: cached.namespace,
          jobId: path.split(".").slice(1).join("."),
          namespacedJobId: path,
        };
      }
      this.cacheStats.misses++;
    }

    // Parse the path
    const pathParts = path.split(".");
    if (pathParts.length < 2) {
      throw new Error(
        `Invalid job path "${path}". Expected format: "namespace.jobId" ` +
          `(e.g., "user.send-email")`,
      );
    }

    const [namespace, ...jobIdParts] = pathParts;
    const jobId = jobIdParts.join(".");

    // Check if namespace exists
    const namespaceJobs = this.jobs[namespace];
    if (!namespaceJobs) {
      return null;
    }

    // Check if job exists in namespace
    const jobDefinition = namespaceJobs[jobId];
    if (!jobDefinition) {
      return null;
    }

    const result: JobPathResolutionResult = {
      definition: jobDefinition,
      namespace,
      jobId,
      namespacedJobId: path,
    };

    // Cache the result if caching is enabled
    if (this.options.enableCache) {
      this.setCachedJob(path, {
        definition: jobDefinition,
        timestamp: Date.now(),
        namespace,
      });
    }

    return result;
  }

  /**
   * Gets all jobs within a specific namespace.
   *
   * @param namespace - The namespace to retrieve jobs from
   * @returns Map of jobs in the namespace or null if namespace doesn't exist
   */
  getJobsByNamespace(
    namespace: string,
  ): Record<string, JobDefinition<any, any, any>> | null {
    const namespaceJobs = this.jobs[namespace];
    return namespaceJobs || null;
  }

  /**
   * Lists all available namespaces in the registry.
   *
   * @returns Array of namespace names
   */
  listNamespaces(): string[] {
    return Object.keys(this.jobs);
  }

  /**
   * Lists all jobs across all namespaces with their full paths.
   *
   * @returns Array of job paths in "namespace.jobId" format
   */
  listAllJobs(): string[] {
    const allJobs: string[] = [];

    for (const [namespace, jobs] of Object.entries(this.jobs)) {
      for (const jobId of Object.keys(jobs)) {
        allJobs.push(`${namespace}.${jobId}`);
      }
    }

    return allJobs.sort(); // Sort for consistent ordering
  }

  /**
   * Checks if a job exists at the specified path.
   *
   * @param path - The namespaced path to check
   * @returns True if the job exists, false otherwise
   */
  hasJob(path: string): boolean {
    return this.getJobByPath(path) !== null;
  }

  /**
   * Clears the job lookup cache.
   * Useful for testing or when jobs are dynamically updated.
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheStats = { hits: 0, misses: 0 };
  }

  /**
   * Gets cache statistics for monitoring and debugging.
   *
   * @returns Object with cache hit rate, size, and other metrics
   */
  getCacheStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? (this.cacheStats.hits / total) * 100 : 0;

    return {
      size: this.cache.size,
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      hitRate: Number(hitRate.toFixed(2)),
    };
  }

  /**
   * Retrieves a job from cache if it exists and hasn't expired.
   *
   * @private
   * @param path - The job path to look up
   * @returns Cached job entry or null if not found/expired
   */
  private getCachedJob(path: string): JobsCacheEntry | null {
    const entry = this.cache.get(path);
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > this.options.cacheTTL!) {
      this.cache.delete(path);
      return null;
    }

    return entry;
  }

  /**
   * Stores a job in the cache with size limit management.
   *
   * @private
   * @param path - The job path to cache
   * @param entry - The cache entry to store
   */
  private setCachedJob(path: string, entry: JobsCacheEntry): void {
    // Implement LRU eviction if cache is at max size
    if (
      this.cache.size >= this.options.maxCacheSize! &&
      !this.cache.has(path)
    ) {
      // Remove oldest entry (simple FIFO, could be improved to true LRU)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(path, entry);
  }
}

/**
 * Creates a new JobsRegistry instance for managing merged jobs.
 *
 * This factory function provides a clean way to instantiate a jobs registry
 * with proper type inference and configuration validation.
 *
 * @template TMergedJobs - The structure of merged job namespaces
 * @param jobs - The merged jobs organized by namespace
 * @param options - Optional configuration for the registry
 * @returns New JobsRegistry instance
 *
 * @example
 * ```typescript
 * const registry = createJobsRegistry({
 *   user: { "send-email": emailJob, "process-signup": signupJob },
 *   analytics: { "track-event": trackingJob }
 * }, {
 *   enableCache: true,
 *   maxCacheSize: 500,
 *   cacheTTL: 600000 // 10 minutes
 * });
 *
 * // Use the registry for efficient job lookups
 * const emailJob = registry.getJobByPath("user.send-email");
 * ```
 */
export function createJobsRegistry<TMergedJobs extends Record<string, any>>(
  jobs: TMergedJobs,
  options?: JobsRegistryOptions,
): JobsRegistry<TMergedJobs> {
  return new JobsRegistry(jobs, options);
}

// ==========================================
// NAMESPACE ACCESS PROXY SYSTEM
// ==========================================

/**
 * Creates a dynamic proxy that provides type-safe namespace access to jobs.
 * This enables syntax like `context.jobs.user.sendEmail.enqueue()` with full TypeScript support.
 *
 * Also provides access to management APIs via $queues, $job, and $workers properties.
 *
 * @template T - The merged jobs structure type
 * @param mergedJobs - The merged jobs structure from routers
 * @param registry - The jobs registry for job resolution
 * @param invokeFunction - Function to actually execute jobs
 * @param managementApi - Optional management API for queue/job/worker control
 * @returns A proxy object providing namespace access and management APIs
 *
 * @example
 * ```typescript
 * const mergedJobs = { user: { sendEmail: emailJobDef } };
 * const proxy = createJobsProxy(mergedJobs, registry, invokeFunc, managementApi);
 *
 * // Usage in context:
 * await context.jobs.user.sendEmail.enqueue({
 *   to: "user@example.com",
 *   subject: "Welcome!"
 * });
 *
 * // Management API access:
 * await context.jobs.$queues.pause('email');
 * await context.jobs.$job.retry('job-123');
 * const workers = context.jobs.$workers;
 * ```
 */
export function createJobsProxy<
  T extends Record<string, Record<string, JobDefinition<any, any, any>>>,
>(
  mergedJobs: T,
  registry: JobsRegistry<T>,
  invokeFunction: (params: {
    namespacedJobId: string;
    input: any;
    options?: JobInvokeOptions;
  }) => Promise<string>,
  managementApi?: JobsManagementApi,
): JobsNamespaceProxy<T> & JobsManagementProxy {
  return new Proxy({} as JobsNamespaceProxy<T> & JobsManagementProxy, {
    get(target, namespaceProp: string) {
      // First level: namespace access (e.g., "user")
      if (typeof namespaceProp !== "string") {
        throw new Error(`Invalid namespace property: ${String(namespaceProp)}`);
      }

      // ✅ PRIORIDADE 0: Management API access ($queues, $job, $workers)
      if (namespaceProp === "$queues" && managementApi) {
        return managementApi.queues;
      }
      if (namespaceProp === "$job" && managementApi) {
        return managementApi.job;
      }
      if (namespaceProp === "$workers" && managementApi) {
        return managementApi.workers;
      }

      // ✅ PRIORIDADE 1: Check for built-in methods and symbols before namespace lookup
      if (
        namespaceProp === "valueOf" ||
        namespaceProp === "toString" ||
        namespaceProp === "toJSON"
      ) {
        return undefined;
      }

      // ✅ PRIORIDADE 2: Handle inspection properties (Node.js debugging)
      if (
        namespaceProp === "inspect" ||
        // @ts-expect-error - Symbol.for is not a string
        namespaceProp === Symbol.for("nodejs.util.inspect.custom")
      ) {
        return () =>
          `JobsNamespaceProxy<${Object.keys(mergedJobs).join(", ")}>`;
      }

      // ✅ PRIORIDADE 3: Handle Symbol properties
      if (typeof namespaceProp === "symbol") {
        return undefined;
      }

      // ✅ PRIORIDADE 4: Check if it's a management property but API not provided
      if (
        namespaceProp === "$queues" ||
        namespaceProp === "$job" ||
        namespaceProp === "$workers"
      ) {
        return undefined; // Management API not available
      }

      // Check if namespace exists
      if (!(namespaceProp in mergedJobs)) {
        throw new Error(
          `Namespace "${namespaceProp}" not found. Available namespaces: ${Object.keys(mergedJobs).join(", ")}`,
        );
      }

      const namespaceJobs = mergedJobs[namespaceProp];

      // 🚀 AQUI ESTÁ A MÁGICA - Proxy híbrido
      return new Proxy(
        {},
        {
          get(jobsTarget, jobProp: string) {
            if (typeof jobProp !== "string") {
              throw new Error(`Invalid job property: ${String(jobProp)}`);
            }

            // ✅ PRIORIDADE 1: Tenta encontrar o job específico
            if (jobProp in namespaceJobs) {
              const jobDefinition = namespaceJobs[jobProp];
              const jobPath = `${namespaceProp}.${jobProp}`;

              // Retorna o JobExecutor individual
              const jobExecutor: JobExecutor<typeof jobDefinition> = {
                async enqueue(params) {
                  const { input, ...options } = params;
                  const jobResult = registry.getJobByPath(jobPath);

                  if (!jobResult) {
                    throw new Error(
                      `Job "${jobProp}" not found in registry for namespace "${namespaceProp}"`,
                    );
                  }

                  return invokeFunction({
                    namespacedJobId: jobResult.namespacedJobId,
                    input,
                    options,
                  });
                },

                async schedule(params) {
                  const { input, ...options } = params;
                  const jobResult = registry.getJobByPath(jobPath);

                  if (!jobResult) {
                    throw new Error(
                      `Job "${jobProp}" not found in registry for namespace "${namespaceProp}"`,
                    );
                  }

                  return invokeFunction({
                    namespacedJobId: jobResult.namespacedJobId,
                    input,
                    options,
                  });
                },

                get definition() {
                  return jobDefinition;
                },
              };

              return jobExecutor;
            }

            // ✅ PRIORIDADE 2: Métodos de fallback no namespace
            if (jobProp === "enqueue") {
              return async (params: {
                task: string;
                input: any;
                [key: string]: any;
              }) => {
                const { task, input, ...options } = params;
                const jobPath = `${namespaceProp}.${task}`;
                const jobResult = registry.getJobByPath(jobPath);

                if (!jobResult) {
                  throw new Error(
                    `Job "${task}" not found in namespace "${namespaceProp}". ` +
                      `Available jobs: ${Object.keys(namespaceJobs).join(", ")}`,
                  );
                }

                return invokeFunction({
                  namespacedJobId: jobResult.namespacedJobId,
                  input,
                  options,
                });
              };
            }

            if (jobProp === "schedule") {
              return async (params: {
                task: string;
                input: any;
                [key: string]: any;
              }) => {
                const { task, input, ...options } = params;
                const jobPath = `${namespaceProp}.${task}`;
                const jobResult = registry.getJobByPath(jobPath);

                if (!jobResult) {
                  throw new Error(
                    `Job "${task}" not found in namespace "${namespaceProp}". ` +
                      `Available jobs: ${Object.keys(namespaceJobs).join(", ")}`,
                  );
                }

                return invokeFunction({
                  namespacedJobId: jobResult.namespacedJobId,
                  input,
                  options,
                });
              };
            }

            if (jobProp === "bulk") {
              return async (
                jobs: Array<{ jobId: string; input: any; [key: string]: any }>,
              ) => {
                const results = await Promise.all(
                  jobs.map(({ jobId, input, ...options }) => {
                    const jobPath = `${namespaceProp}.${jobId}`;
                    const jobResult = registry.getJobByPath(jobPath);

                    if (!jobResult) {
                      throw new Error(
                        `Job "${jobId}" not found in namespace "${namespaceProp}". ` +
                          `Available jobs: ${Object.keys(namespaceJobs).join(", ")}`,
                      );
                    }

                    return invokeFunction({
                      namespacedJobId: jobResult.namespacedJobId,
                      input,
                      options,
                    });
                  }),
                );
                return results;
              };
            }

            // ❌ Se não encontrou nem job nem método de fallback
            throw new Error(
              `Property "${jobProp}" not found in namespace "${namespaceProp}". ` +
                `Available jobs: ${Object.keys(namespaceJobs).join(", ")}. ` +
                `Available methods: enqueue, schedule, bulk`,
            );
          },

          has(jobsTarget, jobProp: string) {
            // Suporta tanto jobs quanto métodos de fallback
            return (
              typeof jobProp === "string" &&
              (jobProp in namespaceJobs ||
                ["enqueue", "schedule", "bulk"].includes(jobProp))
            );
          },

          ownKeys(jobsTarget) {
            // Retorna tanto jobs quanto métodos de fallback
            return [
              ...Object.keys(namespaceJobs),
              "enqueue",
              "schedule",
              "bulk",
            ];
          },

          getOwnPropertyDescriptor(jobsTarget, jobProp) {
            if (
              typeof jobProp === "string" &&
              (jobProp in namespaceJobs ||
                ["enqueue", "schedule", "bulk"].includes(jobProp))
            ) {
              return {
                enumerable: true,
                configurable: true,
                value: undefined, // Will be generated dynamically
              };
            }
            return undefined;
          },
        },
      );
    },

    has(target, namespaceProp: string) {
      if (typeof namespaceProp !== "string") return false;

      // Check management API properties
      if (
        managementApi &&
        ["$queues", "$job", "$workers"].includes(namespaceProp)
      ) {
        return true;
      }

      return namespaceProp in mergedJobs;
    },

    ownKeys(target) {
      const keys = Object.keys(mergedJobs);

      // Add management API keys if available
      if (managementApi) {
        keys.push("$queues", "$job", "$workers");
      }

      return keys;
    },

    getOwnPropertyDescriptor(target, namespaceProp) {
      if (typeof namespaceProp !== "string") return undefined;

      // Handle management API properties
      if (
        managementApi &&
        ["$queues", "$job", "$workers"].includes(namespaceProp)
      ) {
        return {
          enumerable: true,
          configurable: true,
          value: undefined, // Will be generated dynamically
        };
      }

      if (namespaceProp in mergedJobs) {
        return {
          enumerable: true,
          configurable: true,
          value: undefined, // Will be generated dynamically
        };
      }
      return undefined;
    },
  });
}
