import { IgniterError, type IgniterLogger } from '@igniter-js/core'

/**
 * Known error codes thrown by `@igniter-js/mail` runtime.
 */
export type IgniterMailErrorCode =
  | 'MAIL_PROVIDER_FROM_REQUIRED'
  | 'MAIL_PROVIDER_ADAPTER_REQUIRED'
  | 'MAIL_PROVIDER_ADAPTER_SECRET_REQUIRED'
  | 'MAIL_PROVIDER_ADAPTER_NOT_FOUND'
  | 'MAIL_PROVIDER_TEMPLATES_REQUIRED'
  | 'MAIL_PROVIDER_TEMPLATE_NOT_FOUND'
  | 'MAIL_PROVIDER_TEMPLATE_DATA_INVALID'
  | 'MAIL_PROVIDER_SCHEDULE_DATE_INVALID'
  | 'MAIL_PROVIDER_SEND_FAILED'
  | 'MAIL_PROVIDER_SCHEDULE_FAILED'
  | 'MAIL_ADAPTER_CONFIGURATION_INVALID'
  | 'MAIL_TEMPLATE_CONFIGURATION_INVALID'
  | 'MAIL_PROVIDER_SCHEDULE_QUEUE_NOT_CONFIGURED'

/**
 * Payload used to create an {@link IgniterMailError}.
 */
export type IgniterMailErrorPayload = {
  /** Machine-readable error code. */
  code: IgniterMailErrorCode
  /** Human-readable message. */
  message: string
  /** Optional HTTP status code when surfacing errors through HTTP boundaries. */
  statusCode?: number
  /** Optional original cause. */
  cause?: unknown
  /** Extra diagnostic details (e.g. schema issues). */
  details?: unknown
  /** Arbitrary metadata for debugging. */
  metadata?: Record<string, unknown>
  /** Optional logger used by IgniterError. */
  logger?: IgniterLogger
}

/**
 * Typed error used by the `IgniterMail` runtime.
 *
 * This is designed to be stable for extraction into `@igniter-js/mail`.
 */
export class IgniterMailError extends IgniterError {
  declare readonly code: IgniterMailErrorCode

  constructor(payload: IgniterMailErrorPayload) {
    super({
      code: payload.code,
      message: payload.message,
      statusCode: payload.statusCode,
      causer: '@igniter-js/mail',
      details: payload.details,
      metadata: payload.metadata,
      logger: payload.logger,
    })

    this.name = 'IgniterMailError'
  }

  /**
   * Type guard utility.
   */
  static is(error: unknown): error is IgniterMailError {
    return error instanceof IgniterMailError
  }
}

