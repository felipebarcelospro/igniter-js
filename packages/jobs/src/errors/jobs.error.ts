import { IgniterError } from '@igniter-js/core'

/**
 * Canonical error codes for `@igniter-js/jobs`.
 */
export const IGNITER_JOBS_ERROR_CODES = {
  JOBS_ADAPTER_REQUIRED: 'JOBS_ADAPTER_REQUIRED',
  JOBS_SERVICE_REQUIRED: 'JOBS_SERVICE_REQUIRED',
  JOBS_CONTEXT_REQUIRED: 'JOBS_CONTEXT_REQUIRED',
  JOBS_CONFIGURATION_INVALID: 'JOBS_CONFIGURATION_INVALID',
  JOBS_QUEUE_NOT_FOUND: 'JOBS_QUEUE_NOT_FOUND',
  JOBS_QUEUE_DUPLICATE: 'JOBS_QUEUE_DUPLICATE',
  JOBS_QUEUE_OPERATION_FAILED: 'JOBS_QUEUE_OPERATION_FAILED',
  JOBS_INVALID_DEFINITION: 'JOBS_INVALID_DEFINITION',
  JOBS_HANDLER_REQUIRED: 'JOBS_HANDLER_REQUIRED',
  JOBS_DUPLICATE_JOB: 'JOBS_DUPLICATE_JOB',
  JOBS_NOT_FOUND: 'JOBS_NOT_FOUND',
  JOBS_NOT_REGISTERED: 'JOBS_NOT_REGISTERED',
  JOBS_EXECUTION_FAILED: 'JOBS_EXECUTION_FAILED',
  JOBS_TIMEOUT: 'JOBS_TIMEOUT',
  JOBS_CONTEXT_FACTORY_FAILED: 'JOBS_CONTEXT_FACTORY_FAILED',
  JOBS_VALIDATION_FAILED: 'JOBS_VALIDATION_FAILED',
  JOBS_INVALID_INPUT: 'JOBS_INVALID_INPUT',
  JOBS_INVALID_CRON: 'JOBS_INVALID_CRON',
  JOBS_INVALID_SCHEDULE: 'JOBS_INVALID_SCHEDULE',
  JOBS_SCOPE_ALREADY_DEFINED: 'JOBS_SCOPE_ALREADY_DEFINED',
  JOBS_WORKER_FAILED: 'JOBS_WORKER_FAILED',
  JOBS_ADAPTER_ERROR: 'JOBS_ADAPTER_ERROR',
  JOBS_ADAPTER_CONNECTION_FAILED: 'JOBS_ADAPTER_CONNECTION_FAILED',
  JOBS_SUBSCRIBE_FAILED: 'JOBS_SUBSCRIBE_FAILED',
} as const

export type IgniterJobsErrorCode = keyof typeof IGNITER_JOBS_ERROR_CODES

export interface IgniterJobsErrorOptions {
  /** Error code scoped to Igniter Jobs. */
  code: IgniterJobsErrorCode
  /** Human-readable message. */
  message: string
  /** HTTP-like status code hint (default: 500). */
  statusCode?: number
  /** Optional structured details for debugging and clients. */
  details?: unknown
  /** Optional metadata for logs and tracing. */
  metadata?: Record<string, unknown>
  /** Optional causer tag used by some Igniter tooling. */
  causer?: string
  /** Underlying cause for debugging (optional). */
  cause?: Error
  /** Optional logger passthrough to align with other Igniter errors. */
  logger?: any
}

/**
 * Typed error class for the Jobs package.
 *
 * @example
 * ```typescript
 * throw new IgniterJobsError({
 *   code: 'JOBS_INVALID_INPUT',
 *   message: 'Input payload failed validation',
 * })
 * ```
 */
export class IgniterJobsError extends IgniterError {
  constructor(options: IgniterJobsErrorOptions) {
    super(options)
  }
}
