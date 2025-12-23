/**
 * @packageDocumentation
 *
 * Policy types for `@igniter-js/storage`.
 *
 * This module provides type-safe policy definitions that allow you to enforce
 * validation rules on file uploads, such as size limits, allowed MIME types,
 * and file extensions.
 */

/**
 * Upload policies enforced by the storage system.
 *
 * Policies are validated before any file upload operation begins. When a policy
 * is violated, the upload is rejected with an `IgniterStorageError` containing
 * detailed violation information.
 *
 * @remarks
 * - All policies are optional - only the ones you define will be enforced
 * - Multiple policies can be combined for comprehensive validation
 * - Policies are checked in order: maxFileSize, allowedMimeTypes, allowedExtensions
 * - The `maxFileSize` policy is only enforced when the file size can be determined
 *
 * @example Basic size limit
 * ```typescript
 * const storage = IgniterStorageBuilder.create()
 *   .withAdapter('s3', credentials)
 *   .withUrl('https://cdn.example.com')
 *   .withMaxFileSize(10 * 1024 * 1024) // 10 MB limit
 *   .build()
 *
 * // This will throw if file is larger than 10 MB
 * await storage.upload(largeFile, 'documents/report.pdf')
 * ```
 *
 * @example Restricting file types
 * ```typescript
 * const storage = IgniterStorageBuilder.create()
 *   .withAdapter('s3', credentials)
 *   .withUrl('https://cdn.example.com')
 *   .withAllowedMimeTypes(['image/png', 'image/jpeg', 'image/webp'])
 *   .withAllowedExtensions(['png', 'jpg', 'jpeg', 'webp'])
 *   .build()
 *
 * // Only image uploads will succeed
 * await storage.upload(imageFile, 'photos/avatar.png') // ✓ Allowed
 * await storage.upload(pdfFile, 'documents/doc.pdf')   // ✗ Rejected
 * ```
 *
 * @example Comprehensive validation
 * ```typescript
 * const storage = IgniterStorageBuilder.create()
 *   .withAdapter('s3', credentials)
 *   .withUrl('https://cdn.example.com')
 *   .withMaxFileSize(5 * 1024 * 1024) // 5 MB
 *   .withAllowedMimeTypes([
 *     'image/png',
 *     'image/jpeg',
 *     'application/pdf'
 *   ])
 *   .withAllowedExtensions(['png', 'jpg', 'jpeg', 'pdf'])
 *   .build()
 * ```
 *
 * @example Environment-based policies
 * ```typescript
 * // Set via environment variables:
 * // IGNITER_STORAGE_MAX_FILE_SIZE=10485760
 * // IGNITER_STORAGE_ALLOWED_MIME_TYPES=image/png,image/jpeg
 * // IGNITER_STORAGE_ALLOWED_EXTENSIONS=png,jpg,jpeg
 *
 * const storage = IgniterStorageBuilder.create()
 *   .withAdapter('s3', credentials)
 *   .withUrl('https://cdn.example.com')
 *   .build() // Policies loaded from environment
 * ```
 *
 * @public
 */
export type IgniterStoragePolicies = {
  /**
   * Maximum allowed file size in bytes.
   *
   * When set, files exceeding this size will be rejected during upload.
   * This policy is only enforced when the file size can be determined
   * (e.g., for File/Blob objects, but not for streams without known length).
   *
   * @optional
   *
   * @example Different size limits
   * ```typescript
   * maxFileSize: 1024 * 1024           // 1 MB
   * maxFileSize: 10 * 1024 * 1024      // 10 MB
   * maxFileSize: 100 * 1024 * 1024     // 100 MB
   * maxFileSize: 1024 * 1024 * 1024    // 1 GB
   * ```
   *
   * @example Via environment
   * ```bash
   * IGNITER_STORAGE_MAX_FILE_SIZE=5242880  # 5 MB
   * ```
   */
  maxFileSize?: number;

  /**
   * List of allowed MIME types (Content-Type values).
   *
   * When set, only files with matching content types will be accepted.
   * The content type is determined from the file metadata or inferred
   * from the file extension.
   *
   * @optional
   *
   * @example Image-only uploads
   * ```typescript
   * allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
   * ```
   *
   * @example Documents and images
   * ```typescript
   * allowedMimeTypes: [
   *   'application/pdf',
   *   'application/msword',
   *   'image/png',
   *   'image/jpeg'
   * ]
   * ```
   *
   * @example Via environment
   * ```bash
   * IGNITER_STORAGE_ALLOWED_MIME_TYPES=image/png,image/jpeg,application/pdf
   * ```
   */
  allowedMimeTypes?: readonly string[];

  /**
   * List of allowed file extensions without the leading dot.
   *
   * When set, only files with matching extensions will be accepted.
   * Extensions are normalized to lowercase before comparison.
   *
   * @optional
   *
   * @example Common image formats
   * ```typescript
   * allowedExtensions: ['png', 'jpg', 'jpeg', 'gif', 'webp']
   * ```
   *
   * @example Office documents
   * ```typescript
   * allowedExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx']
   * ```
   *
   * @example Via environment
   * ```bash
   * IGNITER_STORAGE_ALLOWED_EXTENSIONS=png,jpg,jpeg,pdf
   * ```
   *
   * @remarks
   * - Extensions are case-insensitive ('PNG', 'png', 'Png' are all treated as 'png')
   * - Do not include the dot ('.png' is invalid, use 'png')
   */
  allowedExtensions?: readonly string[];
};

/**
 * Represents a single policy validation failure.
 *
 * When a file upload violates one or more policies, the storage system throws
 * an `IgniterStorageError` with a list of violations in its `data` field.
 *
 * @remarks
 * Policy violations are checked before the upload begins, so no data is transferred
 * if validation fails. This saves bandwidth and processing time.
 *
 * @example Handling policy violations
 * ```typescript
 * import { IgniterStorageError } from '@igniter-js/storage'
 *
 * try {
 *   await storage.upload(file, 'uploads/document.pdf')
 * } catch (error) {
 *   if (IgniterStorageError.is(error) &&
 *       error.code === 'IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION') {
 *     const violations = error.data?.violations as IgniterStoragePolicyViolation[]
 *
 *     violations.forEach((violation) => {
 *       console.error(`Policy violation: ${violation.reason}`)
 *       console.error(`Message: ${violation.message}`)
 *       console.error(`Details:`, violation.data)
 *     })
 *   }
 * }
 * ```
 *
 * @example Displaying user-friendly errors
 * ```typescript
 * try {
 *   await storage.upload(file, 'uploads/image.png')
 * } catch (error) {
 *   if (IgniterStorageError.is(error) &&
 *       error.code === 'IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION') {
 *     const violations = error.data?.violations as IgniterStoragePolicyViolation[]
 *
 *     const messages = violations.map((v) => {
 *       switch (v.reason) {
 *         case 'MAX_FILE_SIZE_EXCEEDED':
 *           return 'File is too large'
 *         case 'MIME_TYPE_NOT_ALLOWED':
 *           return 'File type not supported'
 *         case 'EXTENSION_NOT_ALLOWED':
 *           return 'File extension not allowed'
 *       }
 *     })
 *
 *     alert(`Upload failed:\n${messages.join('\n')}`)
 *   }
 * }
 * ```
 *
 * @example Checking specific violations
 * ```typescript
 * const hasMaxSizeViolation = violations.some(
 *   (v) => v.reason === 'MAX_FILE_SIZE_EXCEEDED'
 * )
 *
 * if (hasMaxSizeViolation) {
 *   const sizeViolation = violations.find(
 *     (v) => v.reason === 'MAX_FILE_SIZE_EXCEEDED'
 *   )
 *   console.log('File size:', sizeViolation?.data?.size)
 *   console.log('Max allowed:', sizeViolation?.data?.maxFileSize)
 * }
 * ```
 *
 * @public
 */
export type IgniterStoragePolicyViolation = {
  /**
   * The specific policy rule that was violated.
   *
   * @example
   * ```typescript
   * 'MAX_FILE_SIZE_EXCEEDED'   // File exceeds maxFileSize policy
   * 'MIME_TYPE_NOT_ALLOWED'    // Content type not in allowedMimeTypes
   * 'EXTENSION_NOT_ALLOWED'    // Extension not in allowedExtensions
   * ```
   */
  reason:
    | "MAX_FILE_SIZE_EXCEEDED"
    | "MIME_TYPE_NOT_ALLOWED"
    | "EXTENSION_NOT_ALLOWED";

  /**
   * Human-readable description of the violation.
   *
   * This message provides context about what failed validation.
   *
   * @example
   * ```typescript
   * "File size 15728640 exceeds max 10485760"
   * "Mime type application/exe is not allowed"
   * "Extension exe is not allowed"
   * ```
   */
  message: string;

  /**
   * Additional context data about the violation.
   *
   * The structure varies based on the violation reason:
   * - For `MAX_FILE_SIZE_EXCEEDED`: `{ size: number, maxFileSize: number }`
   * - For `MIME_TYPE_NOT_ALLOWED`: `{ contentType: string, allowed: string[] }`
   * - For `EXTENSION_NOT_ALLOWED`: `{ extension: string, allowed: string[] }`
   *
   * @optional
   *
   * @example Size violation data
   * ```typescript
   * {
   *   size: 15728640,        // Actual file size
   *   maxFileSize: 10485760  // Maximum allowed size
   * }
   * ```
   *
   * @example MIME type violation data
   * ```typescript
   * {
   *   contentType: 'application/exe',
   *   allowed: ['image/png', 'image/jpeg']
   * }
   * ```
   *
   * @example Extension violation data
   * ```typescript
   * {
   *   extension: 'exe',
   *   allowed: ['png', 'jpg', 'pdf']
   * }
   * ```
   */
  data?: unknown;
};
