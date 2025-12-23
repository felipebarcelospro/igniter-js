import type Stream from 'node:stream'

/**
 * @packageDocumentation
 *
 * Base adapter contract for `@igniter-js/storage`.
 *
 * Important:
 * - Adapters must be infrastructure-only.
 * - Adapters must NOT implement business rules (scopes, policies, hooks, filename inference).
 * - Adapters operate on fully resolved object keys.
 */

export type IgniterStoragePutOptions = {
  /** RFC 9110 media type (e.g. `image/png`). */
  contentType: string

  /** Cache-Control header value, if supported by the backend. */
  cacheControl?: string

  /**
   * When true, adapter should make the object publicly readable if supported.
   * The public URL is still computed by the core via `baseUrl`.
   */
  public?: boolean
}

/**
 * Base class for storage adapters.
 */
export abstract class IgniterStorageAdapter {
  /**
   * Uploads/puts an object at the given key.
   */
  abstract put(
    key: string,
    body: File | Blob | Uint8Array | ArrayBuffer | Stream.Readable,
    options: IgniterStoragePutOptions,
  ): Promise<void>

  /**
   * Deletes an object by key.
   */
  abstract delete(key: string): Promise<void>

  /**
   * Lists object keys under a prefix.
   */
  abstract list(prefix?: string): Promise<string[]>

  /**
   * Checks existence of an object by key.
   */
  abstract exists(key: string): Promise<boolean>

  /**
   * Streams an object by key.
   */
  abstract stream(key: string): Promise<Stream.Readable>

  /**
   * Copies an object, if supported.
   */
  copy?(fromKey: string, toKey: string): Promise<void>

  /**
   * Moves an object, if supported.
   */
  move?(fromKey: string, toKey: string): Promise<void>

  /**
   * Normalizes a key by removing a leading slash.
   */
  protected normalizeKey(key: string): string {
    return key.replace(/^\/+/, '')
  }
}
