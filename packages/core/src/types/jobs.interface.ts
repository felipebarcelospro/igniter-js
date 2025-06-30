import type { StandardSchemaV1 } from "./schema.interface";
import type { Prettify } from "./utils.interface";

/**
 * Queue configuration for multi-tenancy and organization.
 */
export interface JobQueueConfig {
  /** Base queue name */
  name: string;
  /** Optional prefix for multi-tenancy (e.g., "tenant-123") */
  prefix?: string;
}

/**
 * Advanced options for job execution (based on BullMQ).
 */
export interface JobInvokeOptions {
  /** Unique job ID (to prevent duplicates) */
  jobId?: string;
  /** Job priority (higher value = higher priority) */
  priority?: number;
  /** Delay before execution (in milliseconds) */
  delay?: number;
  /** Number of retry attempts on failure */
  attempts?: number;
  /** Repeat/scheduling configuration */
  repeat?: {
    /** Cron expression for repetition */
    cron?: string;
    /** Timezone for cron */
    tz?: string;
    /** Maximum number of executions */
    limit?: number;
    /** Start date for scheduling */
    startDate?: Date;
    /** End date for scheduling */
    endDate?: Date;
  };
  /** Remove job after successful completion */
  removeOnComplete?: boolean | number;
  /** Remove job after failure */
  removeOnFail?: boolean | number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Possible job statuses.
 */
export type JobStatus =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed"
  | "paused"
  | "stalled";

/**
 * Filters for job search.
 */
export interface JobSearchFilter {
  /** Job statuses to filter by */
  status?: JobStatus[];
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort order */
  orderBy?:
    | "timestamp:asc"
    | "timestamp:desc"
    | "priority:asc"
    | "priority:desc";
  /** Filter by specific job ID */
  jobId?: string;
  /** Filter by date range */
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

/**
 * Result of a job search.
 */
export interface JobSearchResult<TPayload = any> {
  /** Unique job ID */
  id: string;
  /** Job name/type */
  name: string;
  /** Job payload (typed) */
  payload: TPayload;
  /** Current job status */
  status: JobStatus;
  /** Creation timestamp */
  createdAt: Date;
  /** Processing timestamp (if applicable) */
  processedAt?: Date;
  /** Completion timestamp (if applicable) */
  completedAt?: Date;
  /** Execution result (if successful) */
  result?: any;
  /** Execution error (if failed) */
  error?: string;
  /** Number of attempts made */
  attemptsMade: number;
  /** Job priority */
  priority: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Worker configuration.
 */
export interface JobWorkerConfig {
  /** Queues that the worker should process */
  queues: string[];
  /** Number of jobs processed in parallel */
  concurrency?: number;
  /** Filter to process only specific jobs */
  jobFilter?: string[];
  /** Callback when a job becomes active */
  onActive?: (data: { job: JobSearchResult }) => void | Promise<void>;
  /** Callback when a job completes successfully */
  onSuccess?: (data: {
    job: JobSearchResult;
    result: any;
  }) => void | Promise<void>;
  /** Callback when a job fails */
  onFailure?: (data: {
    job: JobSearchResult;
    error: Error;
  }) => void | Promise<void>;
  /** Callback when a job is removed */
  onRemoved?: (data: { job: JobSearchResult }) => void | Promise<void>;
  /** Callback when the worker is idle (no jobs to process) */
  onIdle?: () => void | Promise<void>;
}

/**
 * Context passed to the execution of a job.
 */
export interface JobExecutionContext<TContext extends object, TInput = any> {
  /** Job input (typed and validated) */
  input: TInput extends StandardSchemaV1 ? StandardSchemaV1.InferInput<TInput> : TInput;
  /** Full application context */
  context: TContext;
  /** Information about the current job */
  job: {
    id: string;
    name: string;
    attemptsMade: number;
    createdAt: Date;
    metadata?: Record<string, any>;
  };
}

// ==========================================
// JOB HOOKS SYSTEM
// ==========================================

/**
 * Enhanced job information available in hook contexts.
 */
export interface JobHookInfo {
  /** Unique job ID */
  id: string;
  /** Job name/type */
  name: string;
  /** Number of attempts made so far */
  attemptsMade: number;
  /** Job creation timestamp */
  createdAt: Date;
  /** Job metadata */
  metadata?: Record<string, any>;
  /** Namespace (if from router) */
  namespace?: string;
  /** Queue name */
  queueName: string;
  /** Execution start time */
  startedAt?: Date;
  /** Current execution duration in ms */
  executionTime?: number;
}

/**
 * Base context for all job hooks.
 * 
 * @template TContext - The application context type
 * @template TInput - The job input type
 */
export interface JobHookContext<TContext extends object, TInput = any> {
  /** Job input (typed and validated) */
  input: TInput extends StandardSchemaV1 ? StandardSchemaV1.InferInput<TInput> : TInput;
  /** Full application context */
  context: TContext;
  /** Enhanced job information */
  job: JobHookInfo;
}

/**
 * Context for job start hook.
 * Called when a job begins execution.
 */
export interface JobStartHookContext<TContext extends object, TInput = any> 
  extends JobHookContext<TContext, TInput> {
  /** Job start timestamp */
  startedAt: Date;
}

/**
 * Context for job progress hook.
 * Called during job execution to report progress.
 */
export interface JobProgressHookContext<TContext extends object, TInput = any> 
  extends JobHookContext<TContext, TInput> {
  /** Progress percentage (0-100) */
  progress: number;
  /** Optional progress message */
  message?: string;
}

/**
 * Context for job success hook.
 * Called when a job completes successfully.
 */
export interface JobSuccessHookContext<TContext extends object, TInput = any, TResult = any> 
  extends JobHookContext<TContext, TInput> {
  /** Job execution result */
  result: TResult;
  /** Job completion timestamp */
  completedAt: Date;
  /** Total execution time in milliseconds */
  executionTime: number;
}

/**
 * Context for job failure hook.
 * Called when a job fails.
 */
export interface JobFailureHookContext<TContext extends object, TInput = any> 
  extends JobHookContext<TContext, TInput> {
  /** The error that caused the failure */
  error: Error;
  /** Job failure timestamp */
  failedAt: Date;
  /** Total execution time before failure in milliseconds */
  executionTime: number;
  /** Whether this was the final attempt */
  isFinalAttempt: boolean;
}

/**
 * Context for job retry hook.
 * Called when a job is being retried after a failure.
 */
export interface JobRetryHookContext<TContext extends object, TInput = any> 
  extends JobHookContext<TContext, TInput> {
  /** The error from the previous attempt */
  previousError: Error;
  /** Retry attempt number (1-based) */
  retryAttempt: number;
  /** Maximum retry attempts allowed */
  maxAttempts: number;
  /** Delay before this retry in milliseconds */
  retryDelay?: number;
}

/**
 * Context for job complete hook.
 * Called when a job finishes (either success or final failure).
 */
export interface JobCompleteHookContext<TContext extends object, TInput = any, TResult = any> 
  extends JobHookContext<TContext, TInput> {
  /** Whether the job succeeded */
  success: boolean;
  /** Job result (if successful) */
  result?: TResult;
  /** Job error (if failed) */
  error?: Error;
  /** Job completion timestamp */
  completedAt: Date;
  /** Total execution time in milliseconds */
  executionTime: number;
}

/**
 * Job hook function types.
 */
export type JobStartHook<TContext extends object, TInput = any> = 
  (context: JobStartHookContext<TContext, TInput>) => void | Promise<void>;

export type JobProgressHook<TContext extends object, TInput = any> = 
  (context: JobProgressHookContext<TContext, TInput>) => void | Promise<void>;

export type JobSuccessHook<TContext extends object, TInput = any, TResult = any> = 
  (context: JobSuccessHookContext<TContext, TInput, TResult>) => void | Promise<void>;

export type JobFailureHook<TContext extends object, TInput = any> = 
  (context: JobFailureHookContext<TContext, TInput>) => void | Promise<void>;

export type JobRetryHook<TContext extends object, TInput = any> = 
  (context: JobRetryHookContext<TContext, TInput>) => void | Promise<void>;

export type JobCompleteHook<TContext extends object, TInput = any, TResult = any> = 
  (context: JobCompleteHookContext<TContext, TInput, TResult>) => void | Promise<void>;

/**
 * Configuration options for job registration.
 */
export interface JobRegistrationOptions extends JobInvokeOptions {
  /** Queue configuration for this specific job */
  queue?: JobQueueConfig;
}

/**
 * Definition of a registered job with optional lifecycle hooks.
 */
export interface JobDefinition<
  TContext extends object,
  TInput extends StandardSchemaV1,
  TResult = any,
> extends JobRegistrationOptions {
  /** Human-readable job name */
  name: string;
  /** Input validation schema */
  input?: TInput;
  /** Function that executes the job */
  handler: (
    context: JobExecutionContext<TContext, TInput>,
  ) => Promise<TResult> | TResult;
  
  // ==========================================
  // JOB LIFECYCLE HOOKS (ROOT LEVEL)
  // ==========================================
  
  /** Called when the job starts execution */
  onStart?: JobStartHook<TContext, TInput>;
  /** Called during job execution to report progress */
  onProgress?: JobProgressHook<TContext, TInput>;
  /** Called when the job completes successfully */
  onSuccess?: JobSuccessHook<TContext, TInput, TResult>;
  /** Called when the job fails */
  onFailure?: JobFailureHook<TContext, TInput>;
  /** Called when the job is retried after a failure */
  onRetry?: JobRetryHook<TContext, TInput>;
  /** Called when the job finishes (success or final failure) */
  onComplete?: JobCompleteHook<TContext, TInput, TResult>;
}

/**
 * Parameters to invoke a job.
 */
export interface JobInvokeParams<TInput = StandardSchemaV1> extends JobRegistrationOptions {
  /** Registered job ID */
  id: string;
  /** Payload for the job */
  input: TInput;
}

/**
 * Parameters to search for jobs.
 */
export interface JobSearchParams {
  /** Queue configuration to search in */
  queue?: JobQueueConfig;
  /** Search filters */
  filter?: JobSearchFilter;
}

/**
 * Configuration for creating a new jobs router.
 * Defines the jobs, namespace, default options, and global hooks for the router.
 *
 * @template TJobs - Record of job definitions
 *
 * @example
 * ```typescript
 * const config: JobsRouterConfig<UserJobs> = {
 *   jobs: {
 *     "send-email": emailJob,
 *     "process-signup": signupJob
 *   },
 *   namespace: "user",
 *   defaultOptions: {
 *     attempts: 3,
 *     queue: { name: "user-queue" }
 *   },
 *   onStart: ({ job }) => console.log(`Starting ${job.namespace}.${job.name}`),
 *   onComplete: ({ job, success }) => console.log(`${job.namespace}.${job.name} ${success ? 'succeeded' : 'failed'}`)
 * };
 * ```
 */
export interface JobsRouterConfig<
  TJobs extends Record<string, JobDefinition<any, any, any>>,
> {
  /** Map of job definitions with their IDs as keys */
  jobs: TJobs;
  /** Optional namespace to prefix job IDs (e.g., "user" -> "user.send-email") */
  namespace?: string;
  /** Default options to apply to all jobs in this router */
  defaultOptions?: Partial<JobRegistrationOptions>;
  
  // ==========================================
  // ROUTER-LEVEL GLOBAL HOOKS (ROOT LEVEL)
  // ==========================================
  
  /** Global hook called when any job in this router starts execution */
  onStart?: JobStartHook<any, any>;
  /** Global hook called during any job execution to report progress */
  onProgress?: JobProgressHook<any, any>;
  /** Global hook called when any job in this router completes successfully */
  onSuccess?: JobSuccessHook<any, any, any>;
  /** Global hook called when any job in this router fails */
  onFailure?: JobFailureHook<any, any>;
  /** Global hook called when any job in this router is retried after a failure */
  onRetry?: JobRetryHook<any, any>;
  /** Global hook called when any job in this router finishes (success or final failure) */
  onComplete?: JobCompleteHook<any, any, any>;
}

// ==========================================
// MERGE SYSTEM (ROUTER CONSOLIDATION)
// ==========================================

/**
 * Type utility to merge multiple JobsRouters into a consolidated structure.
 * Extracts jobs from each router and organizes them by namespace.
 *
 * @template T - Record of routers to merge (namespace -> JobsRouter)
 *
 * @example
 * ```typescript
 * const routers = {
 *   user: userJobsRouter,
 *   email: emailJobsRouter,
 *   analytics: analyticsJobsRouter
 * };
 *
 * type MergedJobs = MergedJobsRouter<typeof routers>;
 * // Result: {
 * //   user: { "send-email": JobDefinition<...>, "process-signup": JobDefinition<...> },
 * //   email: { "send-notification": JobDefinition<...> },
 * //   analytics: { "track-event": JobDefinition<...> }
 * // }
 * ```
 */
export type MergedJobsRouter<T extends Record<string, JobsRouter<any>>> = {
  [K in keyof T]: T[K] extends JobsRouter<infer TJobs> ? TJobs : never;
};

/**
 * Interface for executing jobs within a specific namespace.
 * Provides type-safe methods for job invocation and management within a namespace.
 *
 * @template TJobs - The jobs available in this namespace
 *
 * @example
 * ```typescript
 * // After merging routers, each namespace gets its own executor
 * const userExecutor: JobsNamespaceExecutor<UserJobs> = mergedJobs.user;
 *
 * // Type-safe job invocation within namespace
 * await userExecutor.enqueue("send-email", { to: "user@example.com" });
 * ```
 */
export interface JobsNamespaceExecutor<
  TJobs extends Record<string, JobDefinition<any, any, any>>,
> {
  /** The jobs available in this namespace */
  readonly jobs: TJobs;

  /**
   * Enqueues a job for execution with type-safe parameters.
   *
   * @template TJobId - The specific job ID to enqueue
   * @param jobId - The job ID to execute
   * @param input - Type-safe input for the job
   * @param options - Optional execution options
   * @returns Promise resolving to the job execution ID
   */
  enqueue<TJobId extends keyof TJobs>(
    params: Prettify<
      {
        task: TJobId;
        input: TJobs[TJobId] extends JobDefinition<any, infer TInput, any>
          ? TInput extends StandardSchemaV1 ? StandardSchemaV1.InferInput<TInput> : TInput
          : never;
      } & JobInvokeOptions
    >,
  ): Promise<string>;

  /**
   * Schedules a job for advanced future execution with enhanced timing control.
   * Supports sophisticated scheduling including business hours, weekends, conditions, and retry strategies.
   *
   * @template TJobId - The specific job ID to schedule
   * @param params - Advanced scheduling parameters with type-safe input
   * @returns Promise resolving to the job execution ID
   * 
   * @example
   * ```typescript
   * // Schedule with advanced options
   * await namespace.schedule({
   *   task: "sendEmail",
   *   input: { to: "user@example.com" },
   *   at: tomorrowAt9AM,
   *   repeat: { skipWeekends: true, onlyBusinessHours: true },
   *   retryStrategy: 'exponential'
   * });
   * ```
   */
  schedule<TJobId extends keyof TJobs>(
    params: Prettify<
      {
        task: TJobId;
        input: TJobs[TJobId] extends JobDefinition<any, any,  infer TInput>
          ? TInput extends StandardSchemaV1 ? StandardSchemaV1.InferInput<TInput> : TInput
          : never;
      } & AdvancedScheduleOptions
    >,
  ): Promise<string>;

  /**
   * Enqueues multiple jobs in batch.
   *
   * @param jobs - Array of job invocation parameters
   * @returns Promise resolving to array of job execution IDs
   */
  bulk(
    jobs: Array<
      Prettify<
        {
          jobId: keyof TJobs;
          input: any;
        } & JobInvokeOptions
      >
    >,
  ): Promise<string[]>;
}

/**
 * Interface for the consolidated executor that handles job execution across multiple merged namespaces.
 * This is the main interface returned by the `.merge()` method.
 *
 * @template T - The merged jobs structure type
 *
 * @example
 * ```typescript
 * const executor = adapter.merge({ user: userRouter, email: emailRouter });
 * // executor.user.enqueue("sendEmail", { to: "user@example.com" });
 * // executor.email.schedule("newsletter", { content: "..." }, { delay: 3600 });
 * ```
 */
export type MergedJobsExecutorBase<T extends Record<string, any>> = {
  [K in keyof T]: JobsNamespaceExecutor<T[K]>;
};

export type MergedJobsExecutor<T extends Record<string, any>> =
  MergedJobsExecutorBase<T> & {
    /**
     * Creates a namespace proxy for enhanced job access patterns.
     * This enables `context.jobs.namespace.job.enqueue()` syntax.
     *
     * @returns A proxy object providing type-safe namespace access
     *
     * @example
     * ```typescript
     * const proxy = executor.createProxy();
     * await proxy.user.sendEmail.enqueue({ to: "user@example.com" });
     * ```
     */
    createProxy(): JobsNamespaceProxy<T>;
  };

/**
 * Main interface for the Job Queue Adapter.
 * Defines all required operations for a complete queue system.
 */
export interface IgniterJobQueueAdapter<TContext extends object> {
  /** Underlying client (e.g., BullMQ instance) */
  readonly client: unknown;

  /**
   * Registers available jobs in the system.
   * @param jobs Map of jobs with their definitions
   */
  bulkRegister<TJobs extends Record<string, JobDefinition<any, any, any>>>(
    jobs: TJobs,
  ): void;

  /**
   * Creates a job definition for use in routers.
   * Factory method for type-safe job definition creation.
   *
   * @template TInput - Job input type
   * @template TResult - Job result type
   * @param config - Job configuration
   * @returns Complete job definition
   */
  register<TInput extends StandardSchemaV1, TResult = any>(
    config: Omit<JobDefinition<TContext, TInput, TResult>, "id"> & {
      name: string;
      input: TInput;
      handler: (
        context: JobExecutionContext<TContext, TInput>,
      ) => Promise<TResult> | TResult;
    },
  ): JobDefinition<TContext, TInput, TResult>;

  /**
   * Creates a jobs router for organizing related jobs.
   * Provides a clean interface for feature-based job organization.
   *
   * @template TJobs - The jobs to include in the router
   * @param config - Router configuration
   * @returns A JobsRouter instance for the specified jobs
   *
   * @example
   * ```typescript
   * const userRouter = jobsAdapter.router({
   *   jobs: {
   *     "send-email": emailJobDefinition,
   *     "process-signup": signupJobDefinition
   *   },
   *   namespace: "user",
   *   defaultOptions: { queue: { name: "user-queue" } }
   * });
   * ```
   */
  router<TJobs extends Record<string, JobDefinition<TContext, any, any>>>(
    config: JobsRouterConfig<TJobs>,
  ): JobsRouter<TJobs>;

  /**
   * Merges multiple job routers into a unified execution interface.
   * Consolidates routers from different features into namespace-based access.
   *
   * @template TMergedJobs - The structure of merged routers
   * @param routers - Map of routers to merge (namespace -> router)
   * @returns Merged executor with namespace-based job access
   *
   * @example
   * ```typescript
   * const mergedJobs = jobsAdapter.merge({
   *   user: userJobsRouter,
   *   email: emailJobsRouter,
   *   analytics: analyticsJobsRouter
   * });
   *
   * // Now accessible via: mergedJobs.user.enqueue("send-email", ...)
   * ```
   */
  merge<TMergedJobs extends Record<string, JobsRouter<any>>>(
    routers: TMergedJobs,
  ): MergedJobsExecutor<MergedJobsRouter<TMergedJobs>>;

  /**
   * Invokes a job, adding it to the queue for execution.
   * @param params Parameters for the job to be executed
   */
  invoke<TPayload = any>(params: JobInvokeParams<TPayload>): Promise<string>;

  /**
   * Searches for jobs in the queue with specific filters.
   * @param params Search parameters
   */
  search(params?: JobSearchParams): Promise<JobSearchResult[]>;

  /**
   * Starts a worker to process jobs.
   * @param config Worker configuration
   */
  worker(config: JobWorkerConfig): Promise<void>;

  /**
   * Stops all active workers.
   */
  shutdown(): Promise<void>;

  /**
   * Creates a cron job with enhanced scheduling capabilities.
   * Provides a clean interface for creating scheduled jobs with advanced options.
   * 
   * @template TResult - The result type of the cron job handler
   * @param schedule - Cron expression or predefined schedule
   * @param handler - Function to execute on schedule
   * @param options - Enhanced cron job configuration
   * @returns A complete JobDefinition for the cron job
   * 
   * @example
   * ```typescript
   * // Using predefined schedule
   * const dailyReportJob = jobsAdapter.cron(
   *   CronSchedules.DAILY_6AM,
   *   async ({ context, cron }) => {
   *     await context.reports.generateDaily();
   *     return { generated: true, executionCount: cron.executionCount };
   *   },
   *   {
   *     timezone: 'America/New_York',
   *     maxExecutions: 365, // Run for 1 year
   *     jobName: 'daily-report-generator'
   *   }
   * );
   * ```
   */
  cron<TResult = any>(
    schedule: string | CronSchedule,
    handler: CronJobHandler<TContext, TResult>,
    options?: CronJobOptions
    // @ts-expect-error - TODO: fix this
  ): JobDefinition<TContext, {}, TResult>;
}

// ==========================================
// JOBS ROUTER SYSTEM (NEW ARCHITECTURE)
// ==========================================

/**
 * Interface for organizing jobs by feature with type safety.
 * Provides a clean way to group related jobs and manage them as units.
 *
 * @template TJobs - Record of job definitions with their configurations
 *
 * @example
 * ```typescript
 * const userJobsRouter = createJobsRouter({
 *   jobs: {
 *     "send-email": emailJobDefinition,
 *     "process-signup": signupJobDefinition
 *   },
 *   namespace: "user",
 *   defaultOptions: { queue: { name: "user-queue" } }
 * });
 * ```
 */
export interface JobsRouter<
  TJobs extends Record<string, JobDefinition<any, any, any>>,
> {
  /** Read-only access to the registered jobs */
  readonly jobs: TJobs;
  /** Optional namespace for the router */
  readonly namespace?: string;
  /** Default options applied to all jobs in this router */
  readonly defaultOptions?: Partial<JobRegistrationOptions>;

  /**
   * Registers additional jobs to this router, creating a new router instance.
   * This method provides type-safe composition of job routers.
   *
   * @template TNewJobs - New jobs to register
   * @param newJobs - Map of new job definitions
   * @returns New router with combined jobs
   */
  register<TNewJobs extends Record<string, JobDefinition<any, any, any>>>(
    newJobs: TNewJobs,
  ): JobsRouter<TJobs & TNewJobs>;
}

/**
 * Type utility to infer job definitions from a JobsRouter.
 * Extracts the TJobs type parameter from a router for type inference.
 *
 * @template T - The JobsRouter type to extract jobs from
 *
 * @example
 * ```typescript
 * type UserJobs = InferJobsFromRouter<typeof userJobsRouter>;
 * // Result: { "send-email": JobDefinition<...>, "process-signup": JobDefinition<...> }
 * ```
 */
export type InferJobsFromRouter<T> =
  T extends JobsRouter<infer TJobs> ? TJobs : never;

// ==========================================
// JOBS REGISTRY SYSTEM
// ==========================================

/**
 * Configuration options for job path lookup cache.
 */
export interface JobsRegistryOptions {
  /** Enable caching of job lookups (default: true) */
  enableCache?: boolean;
  /** Maximum cache size (default: 1000) */
  maxCacheSize?: number;
  /** Cache TTL in milliseconds (default: 300000 = 5 minutes) */
  cacheTTL?: number;
}

/**
 * Cache entry for job lookup optimization.
 *
 * @internal
 */
export interface JobsCacheEntry {
  /** The resolved job definition */
  definition: JobDefinition<any, any, any>;
  /** When this entry was cached */
  timestamp: number;
  /** Namespace where the job was found */
  namespace: string;
}

/**
 * Result of a job path resolution.
 */
export interface JobPathResolutionResult {
  /** The found job definition */
  definition: JobDefinition<any, any, any>;
  /** The namespace where the job was found */
  namespace: string;
  /** The original job ID within its namespace */
  jobId: string;
  /** The full namespaced job ID */
  namespacedJobId: string;
}

/**
 * Registry for managing merged jobs with efficient lookups and caching.
 * Provides centralized job management across multiple namespaces with
 * optimized path-based lookups for runtime job resolution.
 *
 * @template TMergedJobs - The structure of merged job namespaces
 *
 * @example
 * ```typescript
 * const registry = new JobsRegistry({
 *   user: { "send-email": emailJob, "process-signup": signupJob },
 *   analytics: { "track-event": trackingJob }
 * });
 *
 * // Resolve jobs by namespace path
 * const emailJob = registry.getJobByPath("user.send-email");
 * const trackingJob = registry.getJobByPath("analytics.track-event");
 * ```
 */
export interface JobsRegistryType<TMergedJobs extends Record<string, any>> {
  /** The merged jobs organized by namespace */
  readonly jobs: TMergedJobs;
  /** Registry configuration options */
  readonly options: JobsRegistryOptions;

  /**
   * Resolves a job by its namespace path (e.g., "user.send-email").
   *
   * @param path - The namespaced path to the job
   * @returns Job resolution result or null if not found
   *
   * @example
   * ```typescript
   * const result = registry.getJobByPath("user.send-email");
   * if (result) {
   *   console.log(`Found job: ${result.jobId} in namespace: ${result.namespace}`);
   * }
   * ```
   */
  getJobByPath(path: string): JobPathResolutionResult | null;

  /**
   * Gets all jobs within a specific namespace.
   *
   * @param namespace - The namespace to retrieve jobs from
   * @returns Map of jobs in the namespace or null if namespace doesn't exist
   *
   * @example
   * ```typescript
   * const userJobs = registry.getJobsByNamespace("user");
   * if (userJobs) {
   *   for (const [jobId, definition] of Object.entries(userJobs)) {
   *     console.log(`Job: ${jobId}`);
   *   }
   * }
   * ```
   */
  getJobsByNamespace(
    namespace: string,
  ): Record<string, JobDefinition<any, any, any>> | null;

  /**
   * Lists all available namespaces in the registry.
   *
   * @returns Array of namespace names
   *
   * @example
   * ```typescript
   * const namespaces = registry.listNamespaces();
   * console.log("Available namespaces:", namespaces); // ["user", "analytics"]
   * ```
   */
  listNamespaces(): string[];

  /**
   * Lists all jobs across all namespaces with their full paths.
   *
   * @returns Array of job paths in "namespace.jobId" format
   *
   * @example
   * ```typescript
   * const allJobs = registry.listAllJobs();
   * console.log("All jobs:", allJobs); // ["user.send-email", "user.process-signup", "analytics.track-event"]
   * ```
   */
  listAllJobs(): string[];

  /**
   * Checks if a job exists at the specified path.
   *
   * @param path - The namespaced path to check
   * @returns True if the job exists, false otherwise
   *
   * @example
   * ```typescript
   * if (registry.hasJob("user.send-email")) {
   *   console.log("Email job is available");
   * }
   * ```
   */
  hasJob(path: string): boolean;

  /**
   * Clears the job lookup cache.
   * Useful for testing or when jobs are dynamically updated.
   *
   * @example
   * ```typescript
   * registry.clearCache();
   * console.log("Job lookup cache cleared");
   * ```
   */
  clearCache(): void;

  /**
   * Gets cache statistics for monitoring and debugging.
   *
   * @returns Object with cache hit rate, size, and other metrics
   *
   * @example
   * ```typescript
   * const stats = registry.getCacheStats();
   * console.log(`Cache hit rate: ${stats.hitRate}%, Size: ${stats.size}`);
   * ```
   */
  getCacheStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
}

// ==========================================
// NAMESPACE ACCESS SYSTEM (PROXY-BASED)
// ==========================================

/**
 * Utility types for extracting job input/output types from job definitions.
 * These are essential for type-safe namespace access.
 */
export type InferJobInput<T> =
  T extends JobDefinition<any, infer TInput, any> ? TInput extends StandardSchemaV1 ? StandardSchemaV1.InferInput<TInput> : TInput : never;
export type InferJobOutput<T> =
  T extends JobDefinition<any, any, infer TOutput> ? TOutput : never;

/**
 * Job executor interface that provides enqueue and schedule methods for individual jobs.
 * This is the interface that gets exposed when accessing jobs through the namespace proxy.
 *
 * @template TJobDef - The job definition type
 *
 * @example
 * ```typescript
 * // After context.jobs.user.sendEmail, you get a JobExecutor
 * const executor: JobExecutor<SendEmailJobDef> = context.jobs.user.sendEmail;
 * await executor.enqueue({ to: "user@example.com", subject: "Welcome!" });
 * ```
 */
export interface JobExecutor<TJobDef extends JobDefinition<any, any, any>> {
  /**
   * Enqueue the job for immediate execution
   * @param input - The job input data (typed from job definition)
   * @param options - Optional job execution options
   * @returns Promise resolving to the job ID
   */
  enqueue(
    input: InferJobInput<TJobDef>,
    options?: Prettify<JobInvokeOptions>,
  ): Promise<string>;

  /**
   * Schedule the job for advanced delayed execution with enhanced options.
   * Supports sophisticated scheduling including business hours, weekends, conditions, and retry strategies.
   * 
   * @param input - The job input data (typed from job definition)
   * @param options - Advanced scheduling options with enhanced timing control
   * @returns Promise resolving to the job ID
   * 
   * @example
   * ```typescript
   * // Schedule for next business day with retry strategy
   * await jobExecutor.schedule({ userId: "123" }, {
   *   at: nextBusinessDay,
   *   retryStrategy: 'exponential',
   *   repeat: { skipWeekends: true, onlyBusinessHours: true }
   * });
   * 
   * // Use predefined patterns
   * await jobExecutor.schedule(input, SchedulePatterns.NEXT_BUSINESS_DAY);
   * ```
   */
  schedule(
    input: InferJobInput<TJobDef>,
    options?: Prettify<AdvancedScheduleOptions | SchedulePattern>,
  ): Promise<string>;

  /**
   * Get the job definition for this executor
   */
  readonly definition: TJobDef;
}

/**
 * Maps job definitions to their corresponding executors.
 * This transforms a record of job definitions into a record of job executors.
 *
 * @template TJobs - Record of job definitions
 */
export type JobExecutorsMap<
  TJobs extends Record<string, JobDefinition<any, any, any>>,
> = {
  [K in keyof TJobs]: JobExecutor<TJobs[K]>;
};

/**
 * Deep namespace proxy type that provides type-safe access to namespaced jobs.
 * Supports nested access like `context.jobs.namespace.jobId.enqueue()`.
 *
 * @template T - The merged jobs structure from routers
 *
 * @example
 * ```typescript
 * // If T is { user: { sendEmail: EmailJobDef, processSignup: SignupJobDef } }
 * // Then JobsNamespaceProxy<T> provides:
 * // - context.jobs.user.sendEmail.enqueue()
 * // - context.jobs.user.processSignup.schedule()
 * ```
 */
export type JobsNamespaceProxy<T> = {
  [K in keyof T]: T[K] extends Record<string, JobDefinition<any, any, any>>
    ? JobExecutorsMap<T[K]> & NamespaceFallbackMethods<T[K]> // ← Híbrido
    : never;
};

export interface NamespaceFallbackMethods<
  TJobs extends Record<string, JobDefinition<any, any, any>>,
> {
  enqueue<TJobId extends keyof TJobs>(
    params: {
      task: TJobId;
      input: InferJobInput<TJobs[TJobId]>;
    } & JobInvokeOptions,
  ): Promise<string>;

  schedule<TJobId extends keyof TJobs>(
    params: {
      task: TJobId;
      input: InferJobInput<TJobs[TJobId]>;
    } & AdvancedScheduleOptions,
  ): Promise<string>;

  bulk<
    TArray extends Array<{
      jobId: keyof TJobs;
      input: InferJobInput<TJobs[TArray[number]['jobId']]>;
    } & JobInvokeOptions>
  >(
    jobs: TArray
  ): Promise<string[]>;
}

/**
 * Invoke function type used by the proxy system to actually execute jobs.
 * This abstracts the job execution mechanism from the proxy implementation.
 */
export type JobsProxyInvokeFunction = (params: {
  namespacedJobId: string;
  input: any;
  options?: JobInvokeOptions;
}) => Promise<string>;

// ==========================================
// ENHANCED CRON SYSTEM
// ==========================================

/**
 * Advanced scheduling options for jobs with enhanced timing control.
 * Provides sophisticated scheduling capabilities beyond basic delay and repeat.
 * 
 * @example
 * ```typescript
 * // Schedule a job for next Monday at 9 AM, skip weekends
 * await context.jobs.user.sendEmail.schedule({
 *   to: "user@example.com",
 *   subject: "Weekly Report"
 * }, {
 *   at: nextMonday9AM,
 *   repeat: {
 *     every: 7 * 24 * 60 * 60 * 1000, // Weekly
 *     times: 10,
 *     skipWeekends: true,
 *     onlyBusinessHours: true
 *   },
 *   retryStrategy: 'exponential'
 * });
 * ```
 */
export interface AdvancedScheduleOptions extends JobInvokeOptions {
  // ==========================================
  // BASIC SCHEDULING
  // ==========================================
  
  /** Execute the job at a specific date/time */
  at?: Date;
  /** Delay before execution (in milliseconds) - alternative to 'at' */
  delay?: number;
  
  // ==========================================
  // ADVANCED REPETITION
  // ==========================================
  
  /** Advanced repeat configuration */
  repeat?: {
    /** Interval between executions (in milliseconds) */
    every?: number;
    /** Maximum number of repetitions */
    times?: number;
    /** Stop repeating after this date */
    until?: Date;
    /** Execute only within this time window */
    between?: [Date, Date];
    /** Cron expression for complex scheduling */
    cron?: string;
    /** Skip executions on weekends (Saturday/Sunday) */
    skipWeekends?: boolean;
    /** Only execute during business hours (9 AM - 5 PM) */
    onlyBusinessHours?: boolean;
    /** Custom business hours override */
    businessHours?: {
      start: number; // Hour (0-23)
      end: number;   // Hour (0-23)
      timezone?: string;
    };
    /** Skip execution on these specific dates */
    skipDates?: Date[];
    /** Only execute on these specific weekdays (0=Sunday, 6=Saturday) */
    onlyWeekdays?: number[];
  };
  
  // ==========================================
  // CONDITIONAL EXECUTION
  // ==========================================
  
  /** Condition that must be met for the job to execute */
  condition?: () => boolean | Promise<boolean>;
  /** Skip execution if a job with this ID is already running */
  skipIfRunning?: string | boolean;
  /** Maximum concurrent executions of this job */
  maxConcurrency?: number;
  
  // ==========================================
  // RETRY STRATEGY
  // ==========================================
  
  /** Advanced retry strategy */
  retryStrategy?: 'exponential' | 'linear' | 'fixed' | {
    type: 'custom';
    delays: number[]; // Array of delay values in ms
  };
  /** Backoff multiplier for exponential retry (default: 2) */
  backoffMultiplier?: number;
  /** Maximum delay between retries (in milliseconds) */
  maxRetryDelay?: number;
  /** Jitter factor to add randomness to retries (0-1) */
  jitterFactor?: number;
  
  // ==========================================
  // NOTIFICATION & MONITORING
  // ==========================================
  
  /** Webhook URL to notify on job completion */
  webhookUrl?: string;
  /** Custom tags for monitoring and filtering */
  tags?: string[];
  /** Priority boost for urgent jobs */
  priorityBoost?: number;
  /** Custom timeout for job execution (in milliseconds) */
  timeout?: number;
}

/**
 * Enhanced schedule options specifically for the JobExecutor.schedule() method.
 * Extends AdvancedScheduleOptions with additional type-safe constraints.
 * 
 * @template TJobDef - The job definition type for input validation
 */
export interface JobScheduleOptions<TJobDef extends JobDefinition<any, any, any>> extends AdvancedScheduleOptions {
  /** Input data for the job (type-safe from job definition) */
  input?: InferJobInput<TJobDef>;
}

/**
 * Predefined scheduling patterns for common use cases.
 * Provides convenient access to frequently used scheduling configurations.
 * 
 * @example
 * ```typescript
 * // Use predefined patterns
 * await job.schedule(input, SchedulePatterns.NEXT_BUSINESS_DAY);
 * await job.schedule(input, SchedulePatterns.END_OF_MONTH);
 * ```
 */
export const SchedulePatterns = {
  /** Schedule for next business day at 9 AM */
  NEXT_BUSINESS_DAY: {
    at: (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      // Skip weekends
      if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1); // Sunday -> Monday
      if (tomorrow.getDay() === 6) tomorrow.setDate(tomorrow.getDate() + 2); // Saturday -> Monday
      return tomorrow;
    })(),
    repeat: { onlyBusinessHours: true, skipWeekends: true }
  } as AdvancedScheduleOptions,
  
  /** Schedule for end of current month */
  END_OF_MONTH: {
    at: (() => {
      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0); // Last day of current month
      endOfMonth.setHours(23, 59, 0, 0);
      return endOfMonth;
    })()
  } as AdvancedScheduleOptions,
  
  /** Schedule for every weekday at 8 AM */
  WEEKDAYS_8AM: {
    repeat: {
      cron: '0 8 * * 1-5', // Monday to Friday at 8 AM
      skipWeekends: true
    }
  } as AdvancedScheduleOptions,
  
  /** Schedule for every hour during business hours */
  HOURLY_BUSINESS_HOURS: {
    repeat: {
      every: 60 * 60 * 1000, // Every hour
      onlyBusinessHours: true,
      skipWeekends: true
    }
  } as AdvancedScheduleOptions,
  
  /** Schedule for immediate execution with exponential retry */
  IMMEDIATE_WITH_RETRY: {
    delay: 0,
    attempts: 5,
    retryStrategy: 'exponential',
    backoffMultiplier: 2,
    maxRetryDelay: 30000 // Max 30 seconds
  } as AdvancedScheduleOptions,
} as const;

/**
 * Type for predefined schedule pattern keys.
 */
export type SchedulePattern = keyof typeof SchedulePatterns;

/**
 * Enhanced configuration options for cron jobs.
 * Provides additional features beyond basic repeat options.
 */
export interface CronJobOptions extends Omit<JobInvokeOptions, 'repeat'> {
  /** Timezone for cron execution (e.g., 'America/New_York', 'UTC') */
  timezone?: string;
  /** Maximum number of executions (prevents infinite runs) */
  maxExecutions?: number;
  /** Start date for cron scheduling */
  startDate?: Date;
  /** End date for cron scheduling */
  endDate?: Date;
  /** Whether to skip execution if previous job is still running */
  skipIfRunning?: boolean;
  /** Custom job name override (defaults to generated name) */
  jobName?: string;
  /** Additional metadata for the cron job */
  metadata?: Record<string, any>;
}

/**
 * Predefined cron schedules for common use cases.
 * Provides type-safe access to standard cron patterns.
 */
export const CronSchedules = {
  /** Every minute: '* * * * *' */
  EVERY_MINUTE: '* * * * *',
  /** Every 5 minutes: */
  EVERY_5_MINUTES: '*/5 * * * *',
  /** Every 15 minutes: */
  EVERY_15_MINUTES: '*/15 * * * *',
  /** Every 30 minutes: */
  EVERY_30_MINUTES: '*/30 * * * *',
  /** Every hour: */
  HOURLY: '0 * * * *',
  /** Every 2 hours: */
  EVERY_2_HOURS: '0 */2 * * *',
  /** Every 6 hours: */
  EVERY_6_HOURS: '0 */6 * * *',
  /** Every 12 hours: */
  EVERY_12_HOURS: '0 */12 * * *',
  /** Daily at midnight: */
  DAILY: '0 0 * * *',
  /** Daily at 6 AM: */
  DAILY_6AM: '0 6 * * *',
  /** Daily at noon: */
  DAILY_NOON: '0 12 * * *',
  /** Daily at 6 PM: */
  DAILY_6PM: '0 18 * * *',
  /** Weekly on Sunday at midnight */
  WEEKLY: '0 0 * * 0',
  /** Weekly on Monday at 9 AM: */
  WEEKLY_MONDAY_9AM: '0 9 * * 1',
  /** Monthly on the 1st at midnight: */
  MONTHLY: '0 0 1 * *',
  /** Quarterly on the 1st at midnight: */
  QUARTERLY: '0 0 1 */3 *',
  /** Yearly on January 1st at midnight: */
  YEARLY: '0 0 1 1 *',
} as const;

/**
 * Type for predefined cron schedule values.
 */
export type CronSchedule = typeof CronSchedules[keyof typeof CronSchedules];

/**
 * Enhanced cron job handler function type.
 * Provides additional context specific to cron executions.
 * 
 * @template TContext - The application context type
 * @template TResult - The return type of the handler
 */
export type CronJobHandler<TContext extends object, TResult = any> = (
  context: CronJobExecutionContext<TContext>
) => Promise<TResult> | TResult;

/**
 * Enhanced execution context for cron jobs.
 * Includes cron-specific information and utilities.
 * 
 * @template TContext - The application context type
 */
export interface CronJobExecutionContext<TContext extends object> {
  /** Full application context */
  context: TContext;
  /** Information about the current cron execution */
  cron: {
    /** The cron expression used */
    schedule: string;
    /** Current execution number (1-based) */
    executionCount: number;
    /** Maximum allowed executions (if set) */
    maxExecutions?: number;
    /** Timezone for the cron */
    timezone?: string;
    /** Next scheduled execution time */
    nextExecution?: Date;
    /** Previous execution time (if any) */
    previousExecution?: Date;
    /** Whether this is the final execution */
    isFinalExecution: boolean;
  };
  /** Information about the current job */
  job: {
    id: string;
    name: string;
    attemptsMade: number;
    createdAt: Date;
    metadata?: Record<string, any>;
  };
}
