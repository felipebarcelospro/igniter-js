/**
 * @packageDocumentation
 *
 * Typed error handling for `@igniter-js/storage`.
 *
 * This module provides a comprehensive error system with specific error codes for different
 * failure scenarios. All errors thrown by the storage system are instances of `IgniterStorageError`,
 * making error handling predictable and type-safe.
 */

/**
 * Enumeration of all possible error codes that can be thrown by the storage system.
 *
 * These codes provide programmatic identification of error types, enabling precise
 * error handling and recovery strategies.
 *
 * @remarks
 * Error codes follow a consistent naming pattern: `IGNITER_STORAGE_<CONTEXT>_<REASON>`
 *
 * @example Handling specific error codes
 * ```typescript
 * import { IgniterStorageError } from '@igniter-js/storage'
 *
 * try {
 *   await storage.upload(file, 'path/to/file.pdf')
 * } catch (error) {
 *   if (IgniterStorageError.is(error)) {
 *     switch (error.code) {
 *       case 'IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION':
 *         console.error('File violates upload policies')
 *         break
 *       case 'IGNITER_STORAGE_UPLOAD_FAILED':
 *         console.error('Upload operation failed')
 *         break
 *       default:
 *         console.error('Unknown storage error:', error.code)
 *     }
 *   }
 * }
 * ```
 *
 * @public
 */
export type IgniterStorageErrorCode =
  /** Adapter not configured or credentials missing */
  | "IGNITER_STORAGE_ADAPTER_NOT_CONFIGURED"
  /** Attempted to use a scope that doesn't exist */
  | "IGNITER_STORAGE_INVALID_SCOPE"
  /** Scope requires an identifier but none was provided */
  | "IGNITER_STORAGE_SCOPE_IDENTIFIER_REQUIRED"
  /** Provided path URL has a different hostname than baseUrl */
  | "IGNITER_STORAGE_INVALID_PATH_HOST"
  /** Failed to fetch a file from a remote URL */
  | "IGNITER_STORAGE_FETCH_FAILED"
  /** Upload violated one or more policies (size, mime type, extension) */
  | "IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION"
  /** Upload operation failed due to adapter or network issues */
  | "IGNITER_STORAGE_UPLOAD_FAILED"
  /** Delete operation failed */
  | "IGNITER_STORAGE_DELETE_FAILED"
  /** List operation failed */
  | "IGNITER_STORAGE_LIST_FAILED"
  /** Stream operation failed */
  | "IGNITER_STORAGE_STREAM_FAILED"
  /** Get operation failed */
  | "IGNITER_STORAGE_GET_FAILED"
  /** Copy operation not supported by the adapter */
  | "IGNITER_STORAGE_COPY_NOT_SUPPORTED"
  /** Move operation not supported by the adapter */
  | "IGNITER_STORAGE_MOVE_NOT_SUPPORTED"
  /** Copy operation failed */
  | "IGNITER_STORAGE_COPY_FAILED"
  /** Move operation failed */
  | "IGNITER_STORAGE_MOVE_FAILED"
  /** Replace strategy execution failed */
  | "IGNITER_STORAGE_REPLACE_FAILED";

/**
 * Storage operations that can trigger errors.
 *
 * Each operation type corresponds to a method on the storage API.
 * This type is used to provide context about which operation failed.
 *
 * @example Filtering errors by operation
 * ```typescript
 * try {
 *   await storage.upload(file, 'path/file.pdf')
 * } catch (error) {
 *   if (IgniterStorageError.is(error)) {
 *     console.log(`Failed during ${error.operation} operation`)
 *     // Output: "Failed during upload operation"
 *   }
 * }
 * ```
 *
 * @public
 */
export type IgniterStorageOperation =
  /** Scope selection operation */
  | "scope"
  /** Path resolution operation */
  | "path"
  /** File retrieval operation */
  | "get"
  /** File upload operation */
  | "upload"
  /** File deletion operation */
  | "delete"
  /** List files operation */
  | "list"
  /** Stream file operation */
  | "stream"
  /** Copy file operation */
  | "copy"
  /** Move file operation */
  | "move";

/**
 * Payload structure for constructing storage errors.
 *
 * This type defines all required and optional information that can be included
 * when creating a storage error.
 *
 * @example Creating a custom error
 * ```typescript
 * throw new IgniterStorageError({
 *   code: 'IGNITER_STORAGE_UPLOAD_FAILED',
 *   operation: 'upload',
 *   message: 'Network timeout during upload',
 *   data: { timeout: 30000, bytesTransferred: 1024000 }
 * })
 * ```
 *
 * @public
 */
export type IgniterStorageErrorPayload = {
  /**
   * The specific error code identifying the error type.
   *
   * @see {@link IgniterStorageErrorCode} for all possible codes
   */
  code: IgniterStorageErrorCode;

  /**
   * The operation that was being performed when the error occurred.
   *
   * @see {@link IgniterStorageOperation} for all possible operations
   */
  operation: IgniterStorageOperation;

  /**
   * Human-readable error message providing context.
   *
   * This message should describe what went wrong in detail.
   *
   * @example
   * ```typescript
   * "File size 15728640 exceeds maximum allowed size 10485760"
   * "Adapter 's3' not configured. Please provide credentials."
   * "Failed to upload file: Network connection lost"
   * ```
   */
  message: string;

  /**
   * The underlying cause of the error, if available.
   *
   * This is typically the original error from an adapter, network operation,
   * or other low-level operation that triggered this storage error.
   *
   * @optional
   *
   * @example
   * ```typescript
   * cause: new Error('ECONNREFUSED: Connection refused')
   * cause: awsError  // Original AWS SDK error
   * cause: gcpError  // Original GCP SDK error
   * ```
   */
  cause?: unknown;

  /**
   * Additional contextual data about the error.
   *
   * The structure varies based on the error code. This can include information
   * like file paths, sizes, policy violations, or any other relevant details.
   *
   * @optional
   *
   * @example Policy violation data
   * ```typescript
   * data: {
   *   violations: [
   *     {
   *       reason: 'MAX_FILE_SIZE_EXCEEDED',
   *       message: 'File exceeds limit',
   *       data: { size: 15728640, maxFileSize: 10485760 }
   *     }
   *   ]
   * }
   * ```
   *
   * @example Upload failure data
   * ```typescript
   * data: {
   *   destination: 'uploads/file.pdf',
   *   resolved: { key: 'production/uploads/file.pdf', ... }
   * }
   * ```
   */
  data?: unknown;
};

/**
 * Represents a predictable, structured error thrown by `@igniter-js/storage`.
 *
 * All errors from the storage system are instances of this class, providing
 * consistent error handling and rich contextual information.
 *
 * @remarks
 * - All storage errors extend the native `Error` class
 * - Errors include structured data for programmatic handling
 * - Use the static `is()` method for type-safe error checking
 * - Errors capture the full context: what operation failed, why, and relevant data
 *
 * @example Basic error handling
 * ```typescript
 * import { IgniterStorageError } from '@igniter-js/storage'
 *
 * try {
 *   await storage.upload(file, 'uploads/document.pdf')
 * } catch (error) {
 *   if (IgniterStorageError.is(error)) {
 *     console.error('Storage error:', error.code)
 *     console.error('Operation:', error.operation)
 *     console.error('Message:', error.message)
 *     console.error('Data:', error.data)
 *   } else {
 *     console.error('Unexpected error:', error)
 *   }
 * }
 * ```
 *
 * @example Handling policy violations
 * ```typescript
 * try {
 *   await storage.upload(file, 'images/photo.jpg')
 * } catch (error) {
 *   if (IgniterStorageError.is(error) &&
 *       error.code === 'IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION') {
 *     const violations = error.data?.violations
 *     console.error('Policy violations detected:', violations)
 *   }
 * }
 * ```
 *
 * @example Retry logic based on error type
 * ```typescript
 * async function uploadWithRetry(file: File, path: string, maxRetries = 3) {
 *   for (let attempt = 1; attempt <= maxRetries; attempt++) {
 *     try {
 *       return await storage.upload(file, path)
 *     } catch (error) {
 *       if (IgniterStorageError.is(error)) {
 *         // Don't retry policy violations
 *         if (error.code === 'IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION') {
 *           throw error
 *         }
 *
 *         // Retry network-related failures
 *         if (error.code === 'IGNITER_STORAGE_UPLOAD_FAILED' &&
 *             attempt < maxRetries) {
 *           console.log(`Retry attempt ${attempt} after upload failure`)
 *           await delay(1000 * attempt)
 *           continue
 *         }
 *       }
 *
 *       throw error
 *     }
 *   }
 * }
 * ```
 *
 * @example User-friendly error messages
 * ```typescript
 * try {
 *   await storage.upload(file, 'documents/report.pdf')
 * } catch (error) {
 *   if (IgniterStorageError.is(error)) {
 *     const userMessage = getUserFriendlyMessage(error.code)
 *     showNotification(userMessage, 'error')
 *   }
 * }
 *
 * function getUserFriendlyMessage(code: IgniterStorageErrorCode): string {
 *   const messages: Record<IgniterStorageErrorCode, string> = {
 *     IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION: 'File does not meet requirements',
 *     IGNITER_STORAGE_UPLOAD_FAILED: 'Upload failed. Please try again.',
 *     IGNITER_STORAGE_DELETE_FAILED: 'Could not delete file',
 *     // ... other mappings
 *   }
 *   return messages[code] || 'An error occurred'
 * }
 * ```
 *
 * @example Logging with error context
 * ```typescript
 * try {
 *   await storage.upload(file, 'uploads/file.pdf')
 * } catch (error) {
 *   if (IgniterStorageError.is(error)) {
 *     logger.error('Storage operation failed', {
 *       errorCode: error.code,
 *       operation: error.operation,
 *       message: error.message,
 *       data: error.data,
 *       cause: error.cause
 *     })
 *   }
 * }
 * ```
 *
 * @public
 */
export class IgniterStorageError extends Error {
  /**
   * The specific error code identifying the error type.
   *
   * Use this for programmatic error handling and switching logic.
   */
  public readonly code: IgniterStorageErrorCode;

  /**
   * The operation that was being performed when the error occurred.
   */
  public readonly operation: IgniterStorageOperation;

  /**
   * The underlying cause of the error, if available.
   *
   * This typically contains the original error from adapters or network operations.
   */
  public readonly cause?: unknown;

  /**
   * Additional contextual data about the error.
   *
   * The structure varies based on the error code.
   */
  public readonly data?: unknown;

  /**
   * Creates a new storage error instance.
   *
   * @param payload - The error information including code, operation, message, and optional data
   *
   * @example
   * ```typescript
   * throw new IgniterStorageError({
   *   code: 'IGNITER_STORAGE_INVALID_SCOPE',
   *   operation: 'scope',
   *   message: 'Unknown scope: invalidScope',
   *   data: { scopeKey: 'invalidScope' }
   * })
   * ```
   */
  constructor(payload: IgniterStorageErrorPayload) {
    super(payload.message);
    this.name = "IgniterStorageError";
    this.code = payload.code;
    this.operation = payload.operation;
    this.cause = payload.cause;
    this.data = payload.data;
  }

  /**
   * Type guard to check if an unknown error is an `IgniterStorageError`.
   *
   * This method provides type-safe error checking, allowing TypeScript to narrow
   * the error type and provide autocomplete for storage error properties.
   *
   * @param error - The error to check
   * @returns `true` if the error is an `IgniterStorageError`, `false` otherwise
   *
   * @example Basic type guard usage
   * ```typescript
   * try {
   *   await storage.upload(file, 'path/file.pdf')
   * } catch (error) {
   *   if (IgniterStorageError.is(error)) {
   *     // TypeScript knows error is IgniterStorageError
   *     console.log(error.code)      // ✓ Type-safe
   *     console.log(error.operation) // ✓ Type-safe
   *   }
   * }
   * ```
   *
   * @example Combining with other checks
   * ```typescript
   * catch (error) {
   *   if (IgniterStorageError.is(error) &&
   *       error.code === 'IGNITER_STORAGE_UPLOAD_FAILED') {
   *     console.log('Upload operation failed')
   *   }
   * }
   * ```
   *
   * @example In a utility function
   * ```typescript
   * function isUploadError(error: unknown): boolean {
   *   return IgniterStorageError.is(error) &&
   *          error.operation === 'upload'
   * }
   * ```
   */
  static is(error: unknown): error is IgniterStorageError {
    return error instanceof IgniterStorageError;
  }
}
