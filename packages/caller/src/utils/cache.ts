import type {
  IgniterCallerStoreAdapter,
  IgniterCallerStoreOptions,
} from '../types/store'

/**
 * Cache interface for HTTP responses.
 *
 * Supports both in-memory caching and persistent store-based caching (Redis, etc).
 */
export class IgniterCallerCacheUtils {
  private static cache = new Map<
    string,
    { data: unknown; timestamp: number }
  >()
  private static store: IgniterCallerStoreAdapter | null = null
  private static storeOptions: IgniterCallerStoreOptions = {
    ttl: 3600,
    keyPrefix: 'igniter:caller:',
    fallbackToFetch: true,
  }

  /**
   * Configures a persistent store adapter for caching.
   *
   * When configured, cache operations will use the store (e.g., Redis)
   * instead of in-memory cache, enabling persistent cache across deployments.
   */
  static setStore(
    store: IgniterCallerStoreAdapter,
    options?: IgniterCallerStoreOptions,
  ): void {
    IgniterCallerCacheUtils.store = store
    if (options) {
      IgniterCallerCacheUtils.storeOptions = {
        ...IgniterCallerCacheUtils.storeOptions,
        ...options,
      }
    }
  }

  /**
   * Gets the configured store adapter.
   */
  static getStore(): IgniterCallerStoreAdapter | null {
    return IgniterCallerCacheUtils.store
  }

  /**
   * Gets cached data if it exists and is not stale.
   */
  static async get<T>(key: string, staleTime?: number): Promise<T | undefined> {
    const prefixedKey = IgniterCallerCacheUtils.getPrefixedKey(key)

    // Try store first if available
    if (IgniterCallerCacheUtils.store) {
      try {
        const data = await IgniterCallerCacheUtils.store.get<T>(prefixedKey)
        if (data !== null) {
          return data
        }
      } catch (error) {
        console.error('IgniterCaller: Store get failed', error)
        // Fall through to in-memory cache
      }
    }

    // Fallback to in-memory cache
    const entry = IgniterCallerCacheUtils.cache.get(prefixedKey)
    if (!entry) return undefined

    if (staleTime && Date.now() - entry.timestamp > staleTime) {
      IgniterCallerCacheUtils.cache.delete(prefixedKey)
      return undefined
    }

    return entry.data as T
  }

  /**
   * Stores data in cache with current timestamp.
   */
  static async set(key: string, data: unknown, ttl?: number): Promise<void> {
    const prefixedKey = IgniterCallerCacheUtils.getPrefixedKey(key)
    const effectiveTtl = ttl || IgniterCallerCacheUtils.storeOptions.ttl || 3600

    // Try store first if available
    if (IgniterCallerCacheUtils.store) {
      try {
        await IgniterCallerCacheUtils.store.set(prefixedKey, data, {
          ttl: effectiveTtl,
        })
        return
      } catch (error) {
        console.error('IgniterCaller: Store set failed', error)
        // Fall through to in-memory cache
      }
    }

    // Fallback to in-memory cache
    IgniterCallerCacheUtils.cache.set(prefixedKey, {
      data,
      timestamp: Date.now(),
    })
  }

  /**
   * Clears a specific cache entry.
   */
  static async clear(key: string): Promise<void> {
    const prefixedKey = IgniterCallerCacheUtils.getPrefixedKey(key)

    // Try store first
    if (IgniterCallerCacheUtils.store) {
      try {
        await IgniterCallerCacheUtils.store.delete(prefixedKey)
      } catch (error) {
        console.error('IgniterCaller: Store delete failed', error)
      }
    }

    // Also clear from in-memory cache
    IgniterCallerCacheUtils.cache.delete(prefixedKey)
  }

  /**
   * Clears all cache entries matching a pattern.
   *
   * @param pattern Glob pattern (e.g., '/users/*') or exact key
   */
  static async clearPattern(pattern: string): Promise<void> {
    const prefixedPattern = IgniterCallerCacheUtils.getPrefixedKey(pattern)
    const regex = IgniterCallerCacheUtils.globToRegex(prefixedPattern)

    // Clear from in-memory cache
    for (const key of IgniterCallerCacheUtils.cache.keys()) {
      if (regex.test(key)) {
        IgniterCallerCacheUtils.cache.delete(key)
      }
    }

    // Note: Store pattern deletion depends on store implementation
    // Redis supports SCAN + DEL, but we keep it simple here
    if (IgniterCallerCacheUtils.store) {
      console.warn(
        'IgniterCaller: Pattern-based cache invalidation in store requires manual implementation',
      )
    }
  }

  /**
   * Clears all cache entries.
   */
  static async clearAll(): Promise<void> {
    IgniterCallerCacheUtils.cache.clear()

    if (IgniterCallerCacheUtils.store) {
      console.warn(
        'IgniterCaller: clearAll() only clears in-memory cache. Store cache requires manual cleanup.',
      )
    }
  }

  /**
   * Adds the configured prefix to a key.
   */
  private static getPrefixedKey(key: string): string {
    const prefix = IgniterCallerCacheUtils.storeOptions.keyPrefix || ''
    return `${prefix}${key}`
  }

  /**
   * Converts a glob pattern to a RegExp.
   */
  private static globToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
    return new RegExp(`^${escaped}$`)
  }
}
