/**
 * @packageDocumentation
 *
 * Public types for `@igniter-js/storage`.
 *
 * This module defines the core data structures that represent stored files in the Igniter.js storage system.
 * It provides type-safe interfaces for file metadata and references.
 */

/**
 * Represents a stored file reference with complete metadata.
 *
 * This type encapsulates all relevant information about a file stored in the cloud storage system.
 * It provides both the internal storage path and the public-facing URL for accessing the file.
 *
 * @remarks
 * The `path` property represents the internal object key/path used by the storage backend,
 * while the `url` property represents the fully qualified public URL (typically a CDN URL)
 * that can be used to access the file from the internet.
 *
 * @example Basic usage
 * ```typescript
 * const file: IgniterStorageFile = {
 *   path: 'users/123/avatar.png',
 *   url: 'https://cdn.example.com/users/123/avatar.png',
 *   name: 'avatar.png',
 *   extension: 'png',
 *   contentType: 'image/png',
 *   size: 102400
 * }
 * ```
 *
 * @example Without optional fields
 * ```typescript
 * const file: IgniterStorageFile = {
 *   path: 'documents/report',
 *   url: 'https://cdn.example.com/documents/report',
 *   name: 'report',
 *   extension: ''
 * }
 * ```
 *
 * @example Using with upload result
 * ```typescript
 * const storage = IgniterStorageBuilder.create()
 *   .withAdapter('s3', credentials)
 *   .withUrl('https://cdn.example.com')
 *   .build()
 *
 * const file = await storage.upload(myFile, 'uploads/document.pdf')
 * console.log(file.url) // 'https://cdn.example.com/uploads/document.pdf'
 * console.log(file.size) // 524288
 * ```
 *
 * @public
 */
export type IgniterStorageFile = {
  /**
   * The internal object path/key within the storage backend.
   *
   * This path does not include the public base URL or CDN domain.
   * It represents the location of the file within the storage bucket/container.
   *
   * @example
   * ```typescript
   * 'users/123/avatar.png'
   * 'documents/2024/report.pdf'
   * 'images/products/thumbnail-500x500.jpg'
   * ```
   */
  path: string;

  /**
   * The fully qualified public URL for accessing the file.
   *
   * This URL typically points to a CDN endpoint and can be used directly
   * in HTML elements, API responses, or shared with end users.
   *
   * @example
   * ```typescript
   * 'https://cdn.example.com/users/123/avatar.png'
   * 'https://d1234.cloudfront.net/documents/2024/report.pdf'
   * ```
   */
  url: string;

  /**
   * The base filename without any directory path.
   *
   * This includes the file extension if present.
   *
   * @example
   * ```typescript
   * 'avatar.png'
   * 'report.pdf'
   * 'document' // Without extension
   * ```
   */
  name: string;

  /**
   * The file extension without the leading dot.
   *
   * This is always lowercase and may be an empty string if the file has no extension.
   *
   * @example
   * ```typescript
   * 'png'  // from 'image.png'
   * 'pdf'  // from 'document.pdf'
   * 'jpeg' // from 'photo.JPEG' (normalized to lowercase)
   * ''     // from 'README' (no extension)
   * ```
   */
  extension: string;

  /**
   * The MIME type (Content-Type) of the file.
   *
   * This field is populated when the content type is known during upload.
   * It represents the RFC 9110 media type and may include parameters.
   *
   * @optional This field may be undefined if the content type was not determined during upload
   *
   * @example
   * ```typescript
   * 'image/png'
   * 'application/pdf'
   * 'text/plain; charset=utf-8'
   * 'video/mp4'
   * ```
   */
  contentType?: string;

  /**
   * The file size in bytes.
   *
   * This field is populated when the size is known during upload (e.g., for File/Blob objects).
   * It may be undefined for streams or when the size cannot be determined.
   *
   * @optional This field may be undefined if the size was not available during upload
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
