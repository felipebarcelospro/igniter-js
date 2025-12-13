/**
 * @packageDocumentation
 *
 * Typed errors for `@igniter-js/storage`.
 */

export type IgniterStorageErrorCode =
  | 'IGNITER_STORAGE_ADAPTER_NOT_CONFIGURED'
  | 'IGNITER_STORAGE_INVALID_SCOPE'
  | 'IGNITER_STORAGE_SCOPE_IDENTIFIER_REQUIRED'
  | 'IGNITER_STORAGE_INVALID_PATH_HOST'
  | 'IGNITER_STORAGE_FETCH_FAILED'
  | 'IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION'
  | 'IGNITER_STORAGE_UPLOAD_FAILED'
  | 'IGNITER_STORAGE_DELETE_FAILED'
  | 'IGNITER_STORAGE_LIST_FAILED'
  | 'IGNITER_STORAGE_STREAM_FAILED'
  | 'IGNITER_STORAGE_GET_FAILED'
  | 'IGNITER_STORAGE_COPY_NOT_SUPPORTED'
  | 'IGNITER_STORAGE_MOVE_NOT_SUPPORTED'
  | 'IGNITER_STORAGE_COPY_FAILED'
  | 'IGNITER_STORAGE_MOVE_FAILED'
  | 'IGNITER_STORAGE_REPLACE_FAILED'

export type IgniterStorageOperation =
  | 'scope'
  | 'path'
  | 'get'
  | 'upload'
  | 'delete'
  | 'list'
  | 'stream'
  | 'copy'
  | 'move'

export type IgniterStorageErrorPayload = {
  code: IgniterStorageErrorCode
  operation: IgniterStorageOperation
  message: string
  cause?: unknown
  data?: unknown
}

/**
 * Represents a predictable error thrown by `@igniter-js/storage`.
 */
export class IgniterStorageError extends Error {
  public readonly code: IgniterStorageErrorCode
  public readonly operation: IgniterStorageOperation
  public readonly cause?: unknown
  public readonly data?: unknown

  constructor(payload: IgniterStorageErrorPayload) {
    super(payload.message)
    this.name = 'IgniterStorageError'
    this.code = payload.code
    this.operation = payload.operation
    this.cause = payload.cause
    this.data = payload.data
  }

  /**
   * Type guard to detect `IgniterStorageError`.
   */
  static is(error: unknown): error is IgniterStorageError {
    return error instanceof IgniterStorageError
  }
}
