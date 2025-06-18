import type { StandardSchemaV1 } from "./schema.interface";

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
  orderBy?: "timestamp:asc" | "timestamp:desc" | "priority:asc" | "priority:desc";
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
  onSuccess?: (data: { job: JobSearchResult; result: any }) => void | Promise<void>;
  /** Callback when a job fails */
  onFailure?: (data: { job: JobSearchResult; error: Error }) => void | Promise<void>;
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
  input: TInput;
  /** Full application context */
  ctx: TContext;
  /** Information about the current job */
  job: {
    id: string;
    name: string;
    attemptsMade: number;
    createdAt: Date;
    metadata?: Record<string, any>;
  };
}

/**
 * Configuration options for job registration.
 */
export interface JobRegistrationOptions {
  /** Default options for job execution */
  defaultOptions?: JobInvokeOptions;
  /** Queue configuration for this specific job */
  queue?: JobQueueConfig;
}

/**
 * Definition of a registered job.
 */
export interface JobDefinition<TContext extends object, TInput = any, TResult = any> {
  /** Human-readable job name */
  name: string;
  /** Input validation schema */
  input: StandardSchemaV1;
  /** Function that executes the job */
  handler: (context: JobExecutionContext<TContext, TInput>) => Promise<TResult> | TResult;
  /** Optional configuration for this job */
  options?: JobRegistrationOptions;
}

/**
 * Parameters to invoke a job.
 */
export interface JobInvokeParams<TInput = any> {
  /** Registered job ID */
  id: string;
  /** Payload for the job */
  input: TInput;
  /** Queue configuration (optional) */
  queue?: JobQueueConfig;
  /** Advanced execution options */
  options?: JobInvokeOptions;
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
  register<TJobs extends Record<string, JobDefinition<any, any, any>>>(
    jobs: TJobs
  ): Promise<void>;

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
}