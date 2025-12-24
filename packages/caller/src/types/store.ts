/**
 * Store adapter interface compatible with Igniter.js Store.
 *
 * This allows IgniterCaller to use any store implementation (Redis, in-memory, etc.)
 * for persistent caching across requests and deployments.
 */
export interface IgniterCallerStoreAdapter<TClient = any> {
  /** The underlying client instance (e.g., Redis client). */
  readonly client: TClient

  /**
   * Retrieves a value from the store by its key.
   *
   * @param key - The key to retrieve.
   * @returns The value if found (auto-deserialized), otherwise null.
   */
  get<T = any>(key: string): Promise<T | null>

  /**
   * Stores a value in the store.
   *
   * @param key - The key to store the value under.
   * @param value - The value to store (will be auto-serialized).
   * @param options - Configuration options, such as TTL.
   */
  set(
    key: string,
    value: any,
    options?: { ttl?: number; [key: string]: any },
  ): Promise<void>

  /**
   * Deletes a key from the store.
   *
   * @param key - The key to delete.
   */
  delete(key: string): Promise<void>

  /**
   * Checks if a key exists in the store.
   *
   * @param key - The key to check.
   * @returns `true` if the key exists, otherwise `false`.
   */
  has(key: string): Promise<boolean>
}

/**
 * Configuration options for store-based caching.
 */
export interface IgniterCallerStoreOptions {
  /** Default TTL in seconds for cached entries (default: 3600 = 1 hour). */
  ttl?: number
  /** Prefix for all cache keys (default: 'igniter:caller:'). */
  keyPrefix?: string
  /** Whether to fallback to fetch cache when store is unavailable (default: true). */
  fallbackToFetch?: boolean
}
