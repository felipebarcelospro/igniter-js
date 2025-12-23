/**
 * @packageDocumentation
 *
 * Replace strategy types for `@igniter-js/storage`.
 *
 * This module defines types that control how existing files are handled when uploading
 * a new file with a potentially conflicting name.
 */

/**
 * Strategy for replacing existing files before upload.
 *
 * Replace strategies allow you to automatically delete existing files that match
 * certain criteria before uploading a new file, preventing duplicates and managing
 * file versioning.
 *
 * @remarks
 * - Replace operations happen **before** the new file is uploaded
 * - If the replace operation fails, the upload is aborted
 * - Deletion is performed using the adapter's delete method
 * - Replace strategies only affect files in the same directory
 *
 * @example Replace any version of a file
 * ```typescript
 * // Scenario: User has avatar.png and wants to upload avatar.jpg
 * // With BY_FILENAME: avatar.png will be deleted, avatar.jpg will be uploaded
 *
 * await storage
 *   .scope('users', userId)
 *   .upload(newAvatar, 'avatar.jpg', { replace: 'BY_FILENAME' })
 *
 * // Before: users/123/avatar.png
 * // After:  users/123/avatar.jpg
 * ```
 *
 * @example Replace exact file match
 * ```typescript
 * // Scenario: User wants to update avatar.png specifically
 * // With BY_FILENAME_AND_EXTENSION: only avatar.png is deleted
 *
 * await storage
 *   .scope('users', userId)
 *   .upload(newAvatar, 'avatar.png', { replace: 'BY_FILENAME_AND_EXTENSION' })
 *
 * // Before: users/123/avatar.png, users/123/avatar.jpg
 * // After:  users/123/avatar.png (new), users/123/avatar.jpg (unchanged)
 * ```
 *
 * @public
 */
export type IgniterStorageReplaceStrategy =
  /**
   * Replace files by matching the base filename only, ignoring extension.
   *
   * This strategy deletes all files in the same directory that have the same
   * base filename, regardless of their extension. This is useful when you want
   * to ensure only one version of a file exists, even if the format changes.
   *
   * @example Profile picture updates
   * ```typescript
   * // User uploads new profile picture in different format
   * await storage.upload(file, 'profile.webp', { replace: 'BY_FILENAME' })
   *
   * // Deletes: profile.png, profile.jpg, profile.jpeg, profile.gif
   * // Uploads: profile.webp
   * ```
   *
   * @example Document versioning
   * ```typescript
   * // Replace old document regardless of format
   * await storage.upload(file, 'report.pdf', { replace: 'BY_FILENAME' })
   *
   * // Deletes: report.docx, report.txt
   * // Uploads: report.pdf
   * ```
   *
   * @example Logo updates
   * ```typescript
   * // Company logo format change
   * await storage
   *   .scope('company', companyId)
   *   .upload(newLogo, 'logo.svg', { replace: 'BY_FILENAME' })
   *
   * // Deletes: logo.png, logo.jpg
   * // Uploads: logo.svg
   * ```
   */
  | "BY_FILENAME"

  /**
   * Replace files by matching both filename and extension.
   *
   * This strategy only deletes files that have exactly the same filename
   * AND extension. Other files with the same base name but different extensions
   * are preserved. This is useful for precise file replacement without affecting
   * related files.
   *
   * @example Updating specific file format
   * ```typescript
   * // Update only the PNG version
   * await storage.upload(file, 'banner.png', {
   *   replace: 'BY_FILENAME_AND_EXTENSION'
   * })
   *
   * // Deletes: banner.png
   * // Keeps:   banner.jpg, banner.webp
   * // Uploads: banner.png (new)
   * ```
   *
   * @example Maintaining multiple formats
   * ```typescript
   * // Update each format independently
   * await storage.upload(thumbnailPNG, 'thumb.png', {
   *   replace: 'BY_FILENAME_AND_EXTENSION'
   * })
   * await storage.upload(thumbnailWEBP, 'thumb.webp', {
   *   replace: 'BY_FILENAME_AND_EXTENSION'
   * })
   *
   * // Result: thumb.png (new), thumb.webp (new), thumb.jpg (unchanged)
   * ```
   *
   * @example Configuration file updates
   * ```typescript
   * // Update config.json without affecting config.yaml
   * await storage.upload(configJSON, 'config.json', {
   *   replace: 'BY_FILENAME_AND_EXTENSION'
   * })
   *
   * // Deletes: config.json (old)
   * // Keeps:   config.yaml, config.toml
   * // Uploads: config.json (new)
   * ```
   */
  | "BY_FILENAME_AND_EXTENSION";

/**
 * Options for controlling file upload behavior.
 *
 * These options allow you to customize how uploads are handled, including
 * automatic replacement of existing files.
 *
 * @example Basic upload without replacement
 * ```typescript
 * await storage.upload(file, 'documents/report.pdf')
 * // No options - keeps both old and new files if names differ
 * ```
 *
 * @example Upload with replacement by filename
 * ```typescript
 * await storage.upload(file, 'images/photo.jpg', {
 *   replace: 'BY_FILENAME'
 * })
 * // Deletes any file named 'photo.*' before uploading
 * ```
 *
 * @example Upload with precise replacement
 * ```typescript
 * await storage.upload(file, 'assets/icon.png', {
 *   replace: 'BY_FILENAME_AND_EXTENSION'
 * })
 * // Only deletes 'icon.png', keeps 'icon.svg', 'icon.ico', etc.
 * ```
 *
 * @example User avatar update workflow
 * ```typescript
 * const userStorage = storage.scope('users', userId)
 *
 * // Replace any existing avatar regardless of format
 * const avatar = await userStorage.upload(
 *   avatarFile,
 *   'avatar.png',
 *   { replace: 'BY_FILENAME' }
 * )
 *
 * console.log(`New avatar: ${avatar.url}`)
 * ```
 *
 * @example Handling replace failures
 * ```typescript
 * import { IgniterStorageError } from '@igniter-js/storage'
 *
 * try {
 *   await storage.upload(file, 'docs/readme.md', {
 *     replace: 'BY_FILENAME_AND_EXTENSION'
 *   })
 * } catch (error) {
 *   if (IgniterStorageError.is(error) &&
 *       error.code === 'IGNITER_STORAGE_REPLACE_FAILED') {
 *     console.error('Failed to delete old file:', error.message)
 *   }
 * }
 * ```
 *
 * @example Conditional replacement based on file type
 * ```typescript
 * const options: IgniterStorageUploadOptions = {}
 *
 * // Only replace if uploading an image
 * if (file.type.startsWith('image/')) {
 *   options.replace = 'BY_FILENAME'
 * }
 *
 * await storage.upload(file, 'uploads/media.png', options)
 * ```
 *
 * @public
 */
export type IgniterStorageUploadOptions = {
  /**
   * Strategy for replacing existing files before upload.
   *
   * When set, the storage system will search for and delete matching files
   * in the same directory before uploading the new file.
   *
   * @optional If not provided, no files are deleted before upload
   *
   * @see {@link IgniterStorageReplaceStrategy} for available strategies
   *
   * @example
   * ```typescript
   * // No replacement (default)
   * { replace: undefined }
   *
   * // Replace any file with same base name
   * { replace: 'BY_FILENAME' }
   *
   * // Replace only exact name match
   * { replace: 'BY_FILENAME_AND_EXTENSION' }
   * ```
   *
   * @remarks
   * The replace operation:
   * - Executes before the new file is uploaded
   * - Only affects files in the same directory
   * - Will cause the upload to fail if deletion fails
   * - Supports both scoped and non-scoped storage paths
   *
   * Edge cases:
   * - If no matching files exist, the upload proceeds normally
   * - If multiple files match (with BY_FILENAME), all are deleted
   * - If the adapter doesn't support listing, replacement may fail
   */
  replace?: IgniterStorageReplaceStrategy;
};
