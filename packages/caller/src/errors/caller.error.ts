import { IgniterError, type IgniterLogger } from '@igniter-js/core'

/**
 * Stable error codes emitted by `IgniterCaller`.
 */
export type IgniterCallerErrorCode =
  | 'IGNITER_CALLER_HTTP_ERROR'
  | 'IGNITER_CALLER_TIMEOUT'
  | 'IGNITER_CALLER_REQUEST_VALIDATION_FAILED'
  | 'IGNITER_CALLER_RESPONSE_VALIDATION_FAILED'
  | 'IGNITER_CALLER_SCHEMA_DUPLICATE'
  | 'IGNITER_CALLER_SCHEMA_INVALID'
  | 'IGNITER_CALLER_UNKNOWN_ERROR'

/**
 * Operation identifiers used to describe where an error happened.
 */
export type IgniterCallerOperation =
  | 'execute'
  | 'download'
  | 'buildRequest'
  | 'parseResponse'
  | 'validateRequest'
  | 'validateResponse'
  | 'buildSchema'

/**
 * Payload used to create an {@link IgniterCallerError}.
 */
export type IgniterCallerErrorPayload = {
  /** Machine-readable error code. */
  code: IgniterCallerErrorCode
  /** Where the error happened. */
  operation: IgniterCallerOperation
  /** Human-readable message. */
  message: string
  /** Optional HTTP status code when surfacing errors through HTTP boundaries. */
  statusCode?: number
  /** Optional HTTP status text (when available). */
  statusText?: string
  /** Extra diagnostic details (e.g. response body or schema issues). */
  details?: unknown
  /** Arbitrary metadata for debugging. */
  metadata?: Record<string, unknown>
  /** Optional original cause. */
  cause?: Error
  /** Optional logger used by IgniterError. */
  logger?: IgniterLogger
}

/**
 * Typed error for predictable failures in `IgniterCaller`.
 *
 * Designed to be extracted into `@igniter-js/caller`.
 */
export class IgniterCallerError extends IgniterError {
  /** Machine-readable error code. */
  declare readonly code: IgniterCallerErrorCode
  /** Operation that produced the error. */
  readonly operation: IgniterCallerOperation
  /** Optional HTTP status text. */
  readonly statusText?: string
  /** Optional original error cause. */
  readonly cause?: Error

  /**
   * Creates a new typed caller error.
   *
   * @param payload - Error payload with code, message, and metadata.
   */
  constructor(payload: IgniterCallerErrorPayload) {
    const metadata = {
      ...payload.metadata,
      operation: payload.operation,
      statusText: payload.statusText,
    }

    const details =
      payload.details ??
      (payload.cause !== undefined ? { cause: payload.cause } : undefined)

    super({
      code: payload.code,
      message: payload.message,
      statusCode: payload.statusCode,
      causer: '@igniter-js/caller',
      details,
      metadata,
      logger: payload.logger,
      cause: payload.cause,
    })

    this.name = 'IgniterCallerError'
    this.operation = payload.operation
    this.statusText = payload.statusText
    this.cause = payload.cause
  }

  /**
   * Type guard for `IgniterCallerError`.
   *
   * @param error - Value to check.
   */
  static is(error: unknown): error is IgniterCallerError {
    return error instanceof IgniterCallerError
  }
}
