/**
 * @fileoverview Error class and error codes for @igniter-js/store
 * @module @igniter-js/store/errors
 */

import { IgniterError, type IgniterLogger } from '@igniter-js/core'

/**
 * All possible error codes for IgniterStore.
 * Use these codes for programmatic error handling.
 *
 * @example
 * ```typescript
 * try {
 *   await store.kv.get('my-key')
 * } catch (error) {
 *   if (error instanceof IgniterStoreError) {
 *     switch (error.code) {
 *       case 'STORE_ADAPTER_REQUIRED':
 *         // Handle missing adapter
 *         break
 *       case 'STORE_OPERATION_FAILED':
 *         // Handle failed operation
 *         break
 *     }
 *   }
 * }
 * ```
 */
export const IGNITER_STORE_ERROR_CODES = {
  // Configuration errors
  STORE_ADAPTER_REQUIRED: 'STORE_ADAPTER_REQUIRED',
  STORE_SERVICE_REQUIRED: 'STORE_SERVICE_REQUIRED',
  STORE_ENVIRONMENT_REQUIRED: 'STORE_ENVIRONMENT_REQUIRED',
  STORE_CONFIGURATION_INVALID: 'STORE_CONFIGURATION_INVALID',

  // Scope errors
  STORE_SCOPE_KEY_REQUIRED: 'STORE_SCOPE_KEY_REQUIRED',
  STORE_SCOPE_IDENTIFIER_REQUIRED: 'STORE_SCOPE_IDENTIFIER_REQUIRED',
  STORE_SCOPE_INVALID: 'STORE_SCOPE_INVALID',

  // Key-value errors
  STORE_KEY_REQUIRED: 'STORE_KEY_REQUIRED',
  STORE_VALUE_REQUIRED: 'STORE_VALUE_REQUIRED',
  STORE_TTL_INVALID: 'STORE_TTL_INVALID',

  // Schema errors
  STORE_SCHEMA_VALIDATION_FAILED: 'STORE_SCHEMA_VALIDATION_FAILED',
  STORE_SCHEMA_CHANNEL_NOT_FOUND: 'STORE_SCHEMA_CHANNEL_NOT_FOUND',

  // Serialization errors
  STORE_SERIALIZATION_FAILED: 'STORE_SERIALIZATION_FAILED',
  STORE_DESERIALIZATION_FAILED: 'STORE_DESERIALIZATION_FAILED',

  // Operation errors
  STORE_OPERATION_FAILED: 'STORE_OPERATION_FAILED',
  STORE_GET_FAILED: 'STORE_GET_FAILED',
  STORE_SET_FAILED: 'STORE_SET_FAILED',
  STORE_DELETE_FAILED: 'STORE_DELETE_FAILED',
  STORE_INCREMENT_FAILED: 'STORE_INCREMENT_FAILED',
  STORE_PUBLISH_FAILED: 'STORE_PUBLISH_FAILED',
  STORE_SUBSCRIBE_FAILED: 'STORE_SUBSCRIBE_FAILED',
  STORE_UNSUBSCRIBE_FAILED: 'STORE_UNSUBSCRIBE_FAILED',

  // Batch errors
  STORE_BATCH_FAILED: 'STORE_BATCH_FAILED',
  STORE_BATCH_KEYS_REQUIRED: 'STORE_BATCH_KEYS_REQUIRED',
  STORE_BATCH_ENTRIES_REQUIRED: 'STORE_BATCH_ENTRIES_REQUIRED',

  // Claim errors
  STORE_CLAIM_FAILED: 'STORE_CLAIM_FAILED',

  // Stream errors
  STORE_STREAM_APPEND_FAILED: 'STORE_STREAM_APPEND_FAILED',
  STORE_STREAM_READ_FAILED: 'STORE_STREAM_READ_FAILED',
  STORE_STREAM_GROUP_CREATE_FAILED: 'STORE_STREAM_GROUP_CREATE_FAILED',
  STORE_STREAM_ACK_FAILED: 'STORE_STREAM_ACK_FAILED',
  STORE_STREAM_NAME_REQUIRED: 'STORE_STREAM_NAME_REQUIRED',
  STORE_STREAM_GROUP_REQUIRED: 'STORE_STREAM_GROUP_REQUIRED',
  STORE_STREAM_CONSUMER_REQUIRED: 'STORE_STREAM_CONSUMER_REQUIRED',

  // Scan errors
  STORE_SCAN_FAILED: 'STORE_SCAN_FAILED',
  STORE_SCAN_PATTERN_REQUIRED: 'STORE_SCAN_PATTERN_REQUIRED',

  // Connection errors
  STORE_CONNECTION_FAILED: 'STORE_CONNECTION_FAILED',
  STORE_NOT_CONNECTED: 'STORE_NOT_CONNECTED',

  // Namespace and event errors
  STORE_INVALID_NAMESPACE: 'STORE_INVALID_NAMESPACE',
  STORE_RESERVED_NAMESPACE: 'STORE_RESERVED_NAMESPACE',
  STORE_DUPLICATE_NAMESPACE: 'STORE_DUPLICATE_NAMESPACE',
  STORE_INVALID_EVENT_NAME: 'STORE_INVALID_EVENT_NAME',
  STORE_DUPLICATE_EVENT: 'STORE_DUPLICATE_EVENT',

  // Scope and actor errors
  STORE_DUPLICATE_SCOPE: 'STORE_DUPLICATE_SCOPE',
  STORE_INVALID_SCOPE_KEY: 'STORE_INVALID_SCOPE_KEY',
  STORE_DUPLICATE_ACTOR: 'STORE_DUPLICATE_ACTOR',
  STORE_INVALID_ACTOR_KEY: 'STORE_INVALID_ACTOR_KEY',
  STORE_ACTOR_KEY_REQUIRED: 'STORE_ACTOR_KEY_REQUIRED',
  STORE_ACTOR_IDENTIFIER_REQUIRED: 'STORE_ACTOR_IDENTIFIER_REQUIRED',
} as const

/**
 * Type representing all possible error codes.
 */
export type IgniterStoreErrorCode =
  (typeof IGNITER_STORE_ERROR_CODES)[keyof typeof IGNITER_STORE_ERROR_CODES]

/**
 * Error metadata for additional context.
 */
export interface IgniterStoreErrorMetadata {
  /** The key involved in the operation */
  key?: string
  /** The channel involved in the operation */
  channel?: string
  /** The stream involved in the operation */
  stream?: string
  /** The namespace involved in the operation */
  namespace?: string
  /** The event name involved in the operation */
  event?: string
  /** The scope information */
  scope?: {
    key: string
    identifier: string
  }
  /** The operation that failed */
  operation?:
    | 'get'
    | 'set'
    | 'delete'
    | 'exists'
    | 'expire'
    | 'increment'
    | 'publish'
    | 'subscribe'
    | 'unsubscribe'
    | 'batch.get'
    | 'batch.set'
    | 'claim.once'
    | 'stream.append'
    | 'stream.read'
    | 'stream.ack'
    | 'stream.ensure'
    | 'scan'
  /** Additional context data */
  [key: string]: unknown
}

/**
 * Payload used to create an {@link IgniterStoreError}.
 */
export interface IgniterStoreErrorPayload {
  /** Machine-readable error code. */
  code: IgniterStoreErrorCode
  /** Human-readable message. */
  message: string
  /** Optional HTTP status code when surfacing errors through HTTP boundaries. */
  statusCode?: number
  /** Optional original cause. */
  cause?: Error
  /** Extra diagnostic details (e.g. schema issues). */
  details?: unknown
  /** Arbitrary metadata for debugging. */
  metadata?: IgniterStoreErrorMetadata
  /** Optional logger used by IgniterError. */
  logger?: IgniterLogger
}

/**
 * Typed error for predictable failures in `@igniter-js/store`.
 *
 * @example
 * ```typescript
 * import { IgniterStoreError, IGNITER_STORE_ERROR_CODES } from '@igniter-js/store'
 *
 * // Create a new error
 * throw new IgniterStoreError({
 *   code: 'STORE_OPERATION_FAILED',
 *   message: 'Failed to execute store operation',
 *   metadata: { key: 'my-key', operation: 'get' },
 * })
 *
 * // Check if an error is a store error
 * if (IgniterStoreError.is(error)) {
 *   console.log(error.code)
 * }
 * ```
 */
export class IgniterStoreError extends IgniterError {
  declare readonly code: IgniterStoreErrorCode

  constructor(payload: IgniterStoreErrorPayload) {
    const metadata = {
      ...payload.metadata,
    }

    const details =
      payload.details ??
      (payload.cause !== undefined ? { cause: payload.cause } : undefined)

    super({
      code: payload.code,
      message: payload.message,
      statusCode: payload.statusCode ?? 500,
      causer: 'IgniterStore',
      details,
      metadata,
      cause: payload.cause,
      logger: payload.logger,
    })

    this.name = 'IgniterStoreError'
  }

  /**
   * Type guard utility.
   *
   * @param error - The error to check
   * @returns True if the error is an IgniterStoreError
   */
  static is(error: unknown): error is IgniterStoreError {
    return error instanceof IgniterStoreError
  }
}
