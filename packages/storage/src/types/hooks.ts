/**
 * @packageDocumentation
 *
 * Hook types for `@igniter-js/storage`.
 *
 * This module provides comprehensive lifecycle hooks that allow you to intercept and respond to
 * storage operations. Hooks enable logging, validation, notifications, and custom business logic
 * during file operations.
 */

import type { IgniterStorageFile } from "./file";

/**
 * Base context provided to all storage operation hooks.
 *
 * This type provides common information about a storage operation that is shared
 * across all hook types.
 *
 * @example Basic hook usage
 * ```typescript
 * const storage = IgniterStorageBuilder.create()
 *   .onUploadStarted((payload) => {
 *     console.log(`Starting ${payload.operation} on ${payload.path}`)
 *   })
 *   .build()
 * ```
 *
 * @public
 */
export type IgniterStorageHookContext = {
  /**
   * The type of operation that triggered this hook.
   *
   * @example
   * ```typescript
   * 'upload' // File upload operation
   * 'delete' // File deletion operation
   * 'copy'   // File copy operation
   * 'move'   // File move operation
   * ```
   */
  operation: "upload" | "delete" | "copy" | "move";

  /**
   * The fully resolved object key/path within the storage backend.
   *
   * This path includes any base path, scope, and the specific file path.
   * It represents the actual storage location of the file.
   *
   * @example
   * ```typescript
   * 'development/users/123/avatar.png'
   * 'production/documents/2024/report.pdf'
   * ```
   */
  path: string;
};

/**
 * Payload provided to upload lifecycle hooks (onUploadStarted, onUploadError).
 *
 * This type extends the base hook context with upload-specific information including
 * source details, file metadata, and inferred properties.
 *
 * @remarks
 * The `source` field indicates how the file was provided to the upload method.
 * The `name`, `extension`, and `contentType` fields may be inferred if not explicitly provided.
 *
 * @example Logging upload details
 * ```typescript
 * const storage = IgniterStorageBuilder.create()
 *   .onUploadStarted((payload) => {
 *     console.log(`Uploading ${payload.name} (${payload.contentType})`)
 *     if (payload.size) {
 *       console.log(`Size: ${payload.size} bytes`)
 *     }
 *     if (payload.source?.kind === 'url') {
 *       console.log(`From URL: ${payload.source.url}`)
 *     }
 *   })
 *   .build()
 * ```
 *
 * @example Validating uploads
 * ```typescript
 * const storage = IgniterStorageBuilder.create()
 *   .onUploadStarted(async (payload) => {
 *     // Custom validation
 *     if (payload.size && payload.size > 100 * 1024 * 1024) {
 *       throw new Error('File too large for processing')
 *     }
 *
 *     // Log to external service
 *     await analytics.track('file_upload_started', {
 *       path: payload.path,
 *       size: payload.size,
 *       contentType: payload.contentType
 *     })
 *   })
 *   .build()
 * ```
 *
 * @public
 */
export type IgniterStorageUploadHookPayload = IgniterStorageHookContext & {
  /**
   * Information about the source of the upload.
   *
   * This optional field indicates the method used to provide the file data.
   *
   * @optional This field may be undefined for direct file/blob uploads
   *
   * @example
   * ```typescript
   * { kind: 'file' }                                    // Direct File/Blob upload
   * { kind: 'url', url: 'https://example.com/img.jpg' } // Upload from URL
   * { kind: 'buffer' }                                  // Upload from buffer
   * { kind: 'base64' }                                  // Upload from base64 string
   * ```
   */
  source?: {
    /**
     * The type of source used for the upload.
     */
    kind: "file" | "url" | "buffer" | "base64";

    /**
     * The source URL, only present when kind is 'url'.
     */
    url?: string;
  };

  /**
   * The destination filename without directory path.
   *
   * This value may be inferred from the source file or explicitly provided.
   *
   * @example
   * ```typescript
   * 'avatar.png'
   * 'document.pdf'
   * 'report'
   * ```
   */
  name: string;

  /**
   * The file extension without the leading dot.
   *
   * This value may be inferred from the filename, content type, or source file.
   * It's normalized to lowercase.
   *
   * @example
   * ```typescript
   * 'png'
   * 'pdf'
   * 'jpeg'
   * ''  // No extension
   * ```
   */
  extension: string;

  /**
   * The MIME type (Content-Type) of the file.
   *
   * This value may be inferred from the file extension, source file, or explicitly provided.
   *
   * @example
   * ```typescript
   * 'image/png'
   * 'application/pdf'
   * 'video/mp4'
   * 'application/octet-stream'
   * ```
   */
  contentType: string;

  /**
   * The file size in bytes.
   *
   * This field is only available when the size can be determined from the source
   * (e.g., File/Blob objects). It will be undefined for streams.
   *
   * @optional This field may be undefined if size cannot be determined
   *
   * @example
   * ```typescript
   * 1024      // 1 KB
   * 1048576   // 1 MB
   * 524288000 // 500 MB
   * ```
   */
  size?: number;
};

/**
 * Payload provided to the onUploadSuccess hook.
 *
 * This type extends the upload hook payload with the complete file reference
 * that was created by the successful upload operation.
 *
 * @example Sending notifications on success
 * ```typescript
 * const storage = IgniterStorageBuilder.create()
 *   .onUploadSuccess(async (payload) => {
 *     await notificationService.send({
 *       message: `File uploaded: ${payload.file.name}`,
 *       url: payload.file.url,
 *       size: payload.file.size
 *     })
 *   })
 *   .build()
 * ```
 *
 * @example Creating thumbnails after upload
 * ```typescript
 * const storage = IgniterStorageBuilder.create()
 *   .onUploadSuccess(async (payload) => {
 *     if (payload.contentType.startsWith('image/')) {
 *       await thumbnailService.generate(payload.file.url)
 *     }
 *   })
 *   .build()
 * ```
 *
 * @public
 */
export type IgniterStorageUploadSuccessPayload =
  IgniterStorageUploadHookPayload & {
    /**
     * The complete file reference created by the upload operation.
     *
     * This includes the final path, public URL, and all metadata about the stored file.
     *
     * @see {@link IgniterStorageFile} for details about the file structure
     */
    file: IgniterStorageFile;
  };

/**
 * Configuration object for registering lifecycle hooks.
 *
 * This type defines all available hooks that can be registered to intercept
 * storage operations. Hooks support both synchronous and asynchronous handlers.
 *
 * @remarks
 * All hooks are optional. You only need to implement the hooks relevant to your use case.
 * Hooks can be async - the storage operation will wait for them to complete.
 * If a hook throws an error, the error will be caught and passed to the corresponding error hook.
 *
 * @example Comprehensive logging setup
 * ```typescript
 * const storage = IgniterStorageBuilder.create()
 *   .withAdapter('s3', credentials)
 *   .withUrl('https://cdn.example.com')
 *   .onUploadStarted((payload) => {
 *     logger.info('Upload started', { path: payload.path })
 *   })
 *   .onUploadSuccess((payload) => {
 *     logger.info('Upload completed', { url: payload.file.url })
 *   })
 *   .onUploadError((payload, error) => {
 *     logger.error('Upload failed', { path: payload.path, error })
 *   })
 *   .onDeleteStarted((payload) => {
 *     logger.info('Delete started', { path: payload.path })
 *   })
 *   .onDeleteSuccess((payload) => {
 *     logger.info('Delete completed', { path: payload.path })
 *   })
 *   .onDeleteError((payload, error) => {
 *     logger.error('Delete failed', { path: payload.path, error })
 *   })
 *   .build()
 * ```
 *
 * @example File tracking and analytics
 * ```typescript
 * const storage = IgniterStorageBuilder.create()
 *   .withAdapter('s3', credentials)
 *   .withUrl('https://cdn.example.com')
 *   .onUploadSuccess(async (payload) => {
 *     await database.files.create({
 *       path: payload.file.path,
 *       url: payload.file.url,
 *       size: payload.file.size,
 *       contentType: payload.file.contentType,
 *       uploadedAt: new Date()
 *     })
 *   })
 *   .onDeleteSuccess(async (payload) => {
 *     await database.files.deleteMany({
 *       where: { path: payload.path }
 *     })
 *   })
 *   .build()
 * ```
 *
 * @example Error handling and retry logic
 * ```typescript
 * const storage = IgniterStorageBuilder.create()
 *   .withAdapter('s3', credentials)
 *   .withUrl('https://cdn.example.com')
 *   .onUploadError(async (payload, error) => {
 *     // Log to error tracking service
 *     await errorTracker.capture(error, {
 *       context: 'storage_upload',
 *       path: payload.path,
 *       size: payload.size
 *     })
 *
 *     // Send alert for large file failures
 *     if (payload.size && payload.size > 50 * 1024 * 1024) {
 *       await alertService.send({
 *         level: 'warning',
 *         message: `Large file upload failed: ${payload.name}`
 *       })
 *     }
 *   })
 *   .build()
 * ```
 *
 * @public
 */
export type IgniterStorageHooks = {
  /**
   * Called when an upload operation starts, before any data is transferred.
   *
   * @param payload - Information about the upload including source, destination, and metadata
   *
   * @example
   * ```typescript
   * onUploadStarted: (payload) => {
   *   console.log(`Starting upload to ${payload.path}`)
   * }
   * ```
   */
  onUploadStarted?: (
    payload: IgniterStorageUploadHookPayload,
  ) => void | Promise<void>;

  /**
   * Called when an upload operation completes successfully.
   *
   * @param payload - Complete information about the upload including the stored file reference
   *
   * @example
   * ```typescript
   * onUploadSuccess: async (payload) => {
   *   await logService.info('Upload completed', {
   *     url: payload.file.url,
   *     size: payload.file.size
   *   })
   * }
   * ```
   */
  onUploadSuccess?: (
    payload: IgniterStorageUploadSuccessPayload,
  ) => void | Promise<void>;

  /**
   * Called when an upload operation fails with an error.
   *
   * @param payload - Information about the failed upload
   * @param error - The error that caused the upload to fail
   *
   * @example
   * ```typescript
   * onUploadError: (payload, error) => {
   *   console.error(`Upload failed for ${payload.path}:`, error.message)
   * }
   * ```
   */
  onUploadError?: (
    payload: IgniterStorageUploadHookPayload,
    error: Error,
  ) => void | Promise<void>;

  /**
   * Called when a delete operation starts, before the file is removed.
   *
   * @param payload - Information about the delete operation including the file path
   *
   * @example
   * ```typescript
   * onDeleteStarted: (payload) => {
   *   console.log(`Deleting ${payload.path}`)
   * }
   * ```
   */
  onDeleteStarted?: (
    payload: IgniterStorageHookContext,
  ) => void | Promise<void>;

  /**
   * Called when a delete operation completes successfully.
   *
   * @param payload - Information about the completed delete operation
   *
   * @example
   * ```typescript
   * onDeleteSuccess: async (payload) => {
   *   await cache.invalidate(payload.path)
   * }
   * ```
   */
  onDeleteSuccess?: (
    payload: IgniterStorageHookContext,
  ) => void | Promise<void>;

  /**
   * Called when a delete operation fails with an error.
   *
   * @param payload - Information about the failed delete operation
   * @param error - The error that caused the delete to fail
   *
   * @example
   * ```typescript
   * onDeleteError: (payload, error) => {
   *   console.error(`Failed to delete ${payload.path}:`, error.message)
   * }
   * ```
   */
  onDeleteError?: (
    payload: IgniterStorageHookContext,
    error: Error,
  ) => void | Promise<void>;

  /**
   * Called when a copy operation starts, before the file is copied.
   *
   * @param payload - Information about the copy operation including source and destination paths
   *
   * @example
   * ```typescript
   * onCopyStarted: (payload) => {
   *   console.log(`Copying from ${payload.from} to ${payload.to}`)
   * }
   * ```
   */
  onCopyStarted?: (
    payload: IgniterStorageHookContext & { from: string; to: string },
  ) => void | Promise<void>;

  /**
   * Called when a copy operation completes successfully.
   *
   * @param payload - Information about the completed copy operation
   *
   * @example
   * ```typescript
   * onCopySuccess: async (payload) => {
   *   await database.logCopy(payload.from, payload.to)
   * }
   * ```
   */
  onCopySuccess?: (
    payload: IgniterStorageHookContext & { from: string; to: string },
  ) => void | Promise<void>;

  /**
   * Called when a copy operation fails with an error.
   *
   * @param payload - Information about the failed copy operation
   * @param error - The error that caused the copy to fail
   *
   * @example
   * ```typescript
   * onCopyError: (payload, error) => {
   *   console.error(`Copy failed from ${payload.from} to ${payload.to}:`, error.message)
   * }
   * ```
   */
  onCopyError?: (
    payload: IgniterStorageHookContext & { from: string; to: string },
    error: Error,
  ) => void | Promise<void>;

  /**
   * Called when a move operation starts, before the file is moved.
   *
   * @param payload - Information about the move operation including source and destination paths
   *
   * @example
   * ```typescript
   * onMoveStarted: (payload) => {
   *   console.log(`Moving from ${payload.from} to ${payload.to}`)
   * }
   * ```
   */
  onMoveStarted?: (
    payload: IgniterStorageHookContext & { from: string; to: string },
  ) => void | Promise<void>;

  /**
   * Called when a move operation completes successfully.
   *
   * @param payload - Information about the completed move operation
   *
   * @example
   * ```typescript
   * onMoveSuccess: async (payload) => {
   *   await cache.invalidate(payload.from)
   *   await cache.prime(payload.to)
   * }
   * ```
   */
  onMoveSuccess?: (
    payload: IgniterStorageHookContext & { from: string; to: string },
  ) => void | Promise<void>;

  /**
   * Called when a move operation fails with an error.
   *
   * @param payload - Information about the failed move operation
   * @param error - The error that caused the move to fail
   *
   * @example
   * ```typescript
   * onMoveError: (payload, error) => {
   *   console.error(`Move failed from ${payload.from} to ${payload.to}:`, error.message)
   * }
   * ```
   */
  onMoveError?: (
    payload: IgniterStorageHookContext & { from: string; to: string },
    error: Error,
  ) => void | Promise<void>;
};
