/**
 * @packageDocumentation
 *
 * Public types for `@igniter-js/storage`.
 */

/**
 * A stored file reference.
 *
 * Notes:
 * - `path` is the object path/key without the public base URL.
 * - `url` is the fully qualified public URL (usually a CDN).
 */
export type IgniterStorageFile = {
  /** Object path/key within the storage backend. */
  path: string

  /** Fully qualified public URL for consumers (e.g. CDN URL). */
  url: string

  /** Base filename (without folders). */
  name: string

  /** File extension without dot, if known. */
  extension: string

  /** Content-Type used for upload, when known. */
  contentType?: string

  /** Size in bytes, when known. */
  size?: number
}
