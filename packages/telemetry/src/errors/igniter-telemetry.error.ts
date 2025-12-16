/**
 * @fileoverview Error class and error codes for @igniter-js/telemetry
 * @module @igniter-js/telemetry/errors
 *
 * @description
 * Provides a typed error class for predictable error handling in telemetry operations.
 * All errors extend the base `IgniterError` from `@igniter-js/core`.
 */

import { IgniterError, type IgniterLogger } from '@igniter-js/core'

/**
 * All possible error codes for IgniterTelemetry.
 * Use these codes for programmatic error handling.
 *
 * @example
 * ```typescript
 * try {
 *   telemetry.emit('unknown.event', { attributes: {} })
 * } catch (error) {
 *   if (error instanceof IgniterTelemetryError) {
 *     switch (error.code) {
 *       case 'TELEMETRY_UNKNOWN_EVENT':
 *         console.log('Event not registered:', error.details)
 *         break
 *       case 'TELEMETRY_TRANSPORT_FAILED':
 *         console.log('Transport error:', error.details)
 *         break
 *     }
 *   }
 * }
 * ```
 */
export const IGNITER_TELEMETRY_ERROR_CODES = {
  // Configuration errors
  TELEMETRY_SERVICE_REQUIRED: 'TELEMETRY_SERVICE_REQUIRED',
  TELEMETRY_ENVIRONMENT_REQUIRED: 'TELEMETRY_ENVIRONMENT_REQUIRED',
  TELEMETRY_CONFIGURATION_INVALID: 'TELEMETRY_CONFIGURATION_INVALID',

  // Transport errors
  TELEMETRY_DUPLICATE_TRANSPORT: 'TELEMETRY_DUPLICATE_TRANSPORT',
  TELEMETRY_INVALID_TRANSPORT: 'TELEMETRY_INVALID_TRANSPORT',
  TELEMETRY_TRANSPORT_FAILED: 'TELEMETRY_TRANSPORT_FAILED',
  TELEMETRY_TRANSPORT_INIT_FAILED: 'TELEMETRY_TRANSPORT_INIT_FAILED',

  // Event errors
  TELEMETRY_INVALID_EVENT_NAME: 'TELEMETRY_INVALID_EVENT_NAME',
  TELEMETRY_UNKNOWN_EVENT: 'TELEMETRY_UNKNOWN_EVENT',
  TELEMETRY_DUPLICATE_EVENT: 'TELEMETRY_DUPLICATE_EVENT',

  // Schema/validation errors
  TELEMETRY_SCHEMA_VALIDATION_FAILED: 'TELEMETRY_SCHEMA_VALIDATION_FAILED',
  TELEMETRY_INVALID_NAMESPACE: 'TELEMETRY_INVALID_NAMESPACE',
  TELEMETRY_RESERVED_NAMESPACE: 'TELEMETRY_RESERVED_NAMESPACE',
  TELEMETRY_DUPLICATE_NAMESPACE: 'TELEMETRY_DUPLICATE_NAMESPACE',

  // Session errors
  TELEMETRY_SESSION_ENDED: 'TELEMETRY_SESSION_ENDED',
  TELEMETRY_SESSION_INVALID: 'TELEMETRY_SESSION_INVALID',

  // Scope and actor errors
  TELEMETRY_DUPLICATE_SCOPE: 'TELEMETRY_DUPLICATE_SCOPE',
  TELEMETRY_INVALID_SCOPE: 'TELEMETRY_INVALID_SCOPE',
  TELEMETRY_DUPLICATE_ACTOR: 'TELEMETRY_DUPLICATE_ACTOR',
  TELEMETRY_INVALID_ACTOR: 'TELEMETRY_INVALID_ACTOR',

  // Emit errors
  TELEMETRY_EMIT_FAILED: 'TELEMETRY_EMIT_FAILED',

  // Runtime errors
  TELEMETRY_RUNTIME_NOT_INITIALIZED: 'TELEMETRY_RUNTIME_NOT_INITIALIZED',
} as const

/**
 * Type representing all valid telemetry error codes.
 */
export type IgniterTelemetryErrorCode =
  (typeof IGNITER_TELEMETRY_ERROR_CODES)[keyof typeof IGNITER_TELEMETRY_ERROR_CODES]

/**
 * Payload used to create an {@link IgniterTelemetryError}.
 *
 * @example
 * ```typescript
 * const payload: IgniterTelemetryErrorPayload = {
 *   code: 'TELEMETRY_DUPLICATE_TRANSPORT',
 *   message: 'Transport type "logger" is already registered',
 *   statusCode: 400,
 *   details: { type: 'logger' },
 * }
 * ```
 */
export interface IgniterTelemetryErrorPayload {
  /** Machine-readable error code */
  code: IgniterTelemetryErrorCode
  /** Human-readable error message */
  message: string
  /** Optional HTTP status code (for API boundaries) */
  statusCode?: number
  /** Optional original cause */
  cause?: unknown
  /** Extra diagnostic details */
  details?: unknown
  /** Arbitrary metadata for debugging */
  metadata?: Record<string, unknown>
  /** Optional logger for error logging */
  logger?: IgniterLogger
}

/**
 * Typed error class for `@igniter-js/telemetry`.
 *
 * Extends `IgniterError` from `@igniter-js/core` to provide consistent
 * error handling across the Igniter.js ecosystem.
 *
 * @example
 * ```typescript
 * // Throwing an error
 * throw new IgniterTelemetryError({
 *   code: 'TELEMETRY_DUPLICATE_TRANSPORT',
 *   message: 'Transport type "logger" is already registered',
 *   statusCode: 400,
 *   details: { type: 'logger' },
 * })
 *
 * // Catching and handling
 * try {
 *   telemetry.addTransport('logger', adapter)
 * } catch (error) {
 *   if (IgniterTelemetryError.is(error)) {
 *     console.error(`Telemetry error [${error.code}]:`, error.message)
 *   }
 * }
 * ```
 */
export class IgniterTelemetryError extends IgniterError {
  declare readonly code: IgniterTelemetryErrorCode

  constructor(payload: IgniterTelemetryErrorPayload) {
    super({
      code: payload.code,
      message: payload.message,
      statusCode: payload.statusCode,
      causer: '@igniter-js/telemetry',
      details: payload.details,
      metadata: payload.metadata,
      logger: payload.logger,
    })

    this.name = 'IgniterTelemetryError'
  }

  /**
   * Type guard to check if an error is an IgniterTelemetryError.
   *
   * @param error - The error to check
   * @returns True if the error is an IgniterTelemetryError
   *
   * @example
   * ```typescript
   * try {
   *   await telemetry.emit('event', {})
   * } catch (error) {
   *   if (IgniterTelemetryError.is(error)) {
   *     // Handle telemetry-specific error
   *     console.log('Code:', error.code)
   *   }
   * }
   * ```
   */
  static is(error: unknown): error is IgniterTelemetryError {
    return error instanceof IgniterTelemetryError
  }

  /**
   * Check if this error has a specific error code.
   *
   * @param code - The error code to check
   * @returns True if this error has the specified code
   *
   * @example
   * ```typescript
   * if (error.hasCode('TELEMETRY_TRANSPORT_FAILED')) {
   *   // Retry transport operation
   * }
   * ```
   */
  hasCode(code: IgniterTelemetryErrorCode): boolean {
    return this.code === code
  }
}
