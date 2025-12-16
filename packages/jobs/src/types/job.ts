import type { StandardSchemaV1 } from '@igniter-js/core'
import type { IgniterJobsScopeEntry } from './scope'
import type { IgniterJobsScheduleOptions } from './schedule'
import type { IgniterJobsInferSchemaInput, IgniterJobsSchema } from './schema'

/**
 * Rate limiter configuration applied to job dispatch or worker level.
 */
export interface IgniterJobsLimiter {
  /** Maximum number of jobs allowed within the duration window. */
  max: number
  /** Duration of the window in milliseconds. */
  duration: number
}

/**
 * Options controlling job dispatch behavior.
 */
export interface IgniterJobsInvokeOptions {
  jobId?: string
  priority?: number
  delay?: number
  attempts?: number
  removeOnComplete?: boolean | number
  removeOnFail?: boolean | number
  metadata?: Record<string, unknown>
  limiter?: IgniterJobsLimiter
}

/**
 * Runtime execution context passed to handlers.
 */
export interface IgniterJobsExecutionContext<
  TContext,
  TInput extends IgniterJobsSchema | unknown = unknown,
> {
  input: IgniterJobsInferSchemaInput<TInput>
  context: TContext
  job: {
    id: string
    name: string
    queue: string
    attemptsMade: number
    /**
     * Timestamp when the job was created (when available).
     *
     * Some adapters may not provide this information for synthetic executions.
     */
    createdAt?: Date
    metadata?: Record<string, unknown>
  }
  scope?: IgniterJobsScopeEntry
}

/**
 * Hook context shared by lifecycle handlers.
 */
export interface IgniterJobsHookContext<
  TContext,
  TInput extends IgniterJobsSchema | unknown = unknown,
> extends IgniterJobsExecutionContext<TContext, TInput> {
  startedAt?: Date
  duration?: number
}

export type IgniterJobsStartHook<TContext, TInput extends IgniterJobsSchema | unknown = unknown> = (
  context: IgniterJobsHookContext<TContext, TInput>,
) => void | Promise<void>

export type IgniterJobsSuccessHook<
  TContext,
  TInput extends IgniterJobsSchema | unknown = unknown,
  TResult = unknown,
> = (
  context: IgniterJobsHookContext<TContext, TInput> & { result: TResult },
) => void | Promise<void>

export type IgniterJobsFailureHook<
  TContext,
  TInput extends IgniterJobsSchema | unknown = unknown,
> = (
  context: IgniterJobsHookContext<TContext, TInput> & { error: Error; isFinalAttempt: boolean },
) => void | Promise<void>

export type IgniterJobsProgressHook<
  TContext,
  TInput extends IgniterJobsSchema | unknown = unknown,
> = (
  context: IgniterJobsHookContext<TContext, TInput> & { progress: number; message?: string },
) => void | Promise<void>

/**
 * Definition of a job registered on a queue.
 */
export interface IgniterJobDefinition<
  TContext,
  TInput extends IgniterJobsSchema | unknown = unknown,
  TResult = unknown,
> extends IgniterJobsInvokeOptions {
  /** Optional input schema for validation. */
  input?: TInput
  /** Optional output schema (validation handled externally). */
  output?: IgniterJobsSchema
  /** Optional queue override (creates child queue in adapters). */
  queue?: string
  /** Job handler implementation. */
  handler: (
    context: IgniterJobsExecutionContext<TContext, TInput>,
  ) => Promise<TResult> | TResult
  /** Lifecycle hooks */
  onStart?: IgniterJobsStartHook<TContext, TInput>
  onProgress?: IgniterJobsProgressHook<TContext, TInput>
  onSuccess?: IgniterJobsSuccessHook<TContext, TInput, TResult>
  onFailure?: IgniterJobsFailureHook<TContext, TInput>
}

/**
 * Definition for cron-style recurring tasks.
 */
export interface IgniterCronDefinition<TContext, TResult = unknown> {
  /** Cron expression (5 or 6 fields depending on engine). */
  cron: string
  /** Timezone used when evaluating cron expressions. */
  tz?: string
  /** Maximum number of executions for this schedule (adapter-dependent). */
  maxExecutions?: number
  /** Skip executions on weekends when true (adapter-dependent). */
  skipWeekends?: boolean
  /** Restrict executions to business hours when true (adapter-dependent). */
  onlyBusinessHours?: boolean
  /** Business hours config used when `onlyBusinessHours` is enabled. */
  businessHours?: {
    start: number
    end: number
    timezone?: string
  }
  /** Only execute on these weekdays (0=Sunday..6=Saturday). */
  onlyWeekdays?: number[]
  /** Dates to skip execution (ISO strings or Date objects). */
  skipDates?: Array<string | Date>
  /** Optional start date for the schedule (adapter-dependent). */
  startDate?: Date
  /** Optional end date for the schedule (adapter-dependent). */
  endDate?: Date
  handler: (
    context: Omit<IgniterJobsExecutionContext<TContext, unknown>, 'input'>,
  ) => Promise<TResult> | TResult
}

/**
 * Supported job states for management queries.
 */
export type IgniterJobStatus =
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused'

/**
 * Result shape for job inspection calls.
 */
export interface IgniterJobSearchResult<TResult = unknown> {
  id: string
  name: string
  queue: string
  status: IgniterJobStatus
  input: unknown
  result?: TResult
  error?: string
  progress: number
  attemptsMade: number
  priority: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  metadata?: Record<string, unknown>
  scope?: IgniterJobsScopeEntry
}

/**
 * Management counts for a queue.
 */
export interface IgniterJobCounts {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: number
}

/**
 * Parameters accepted by `.dispatch()`.
 *
 * @example
 * ```typescript
 * await jobs.email.sendWelcome.dispatch({
 *   input: { email: 'user@example.com' },
 *   delay: 5000,
 *   priority: 10,
 *   scope: { type: 'organization', id: 'org_1' },
 * })
 * ```
 */
export type IgniterJobsDispatchParams<TInput = unknown> = {
  input: TInput
  scope?: IgniterJobsScopeEntry
} & IgniterJobsInvokeOptions

/**
 * Parameters accepted by `.schedule()`.
 *
 * Scheduling options are applied in addition to base dispatch options.
 */
export type IgniterJobsScheduleParams<TInput = unknown> =
  IgniterJobsDispatchParams<TInput> & IgniterJobsScheduleOptions
