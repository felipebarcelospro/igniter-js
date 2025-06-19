/**
 * Simple cache implementation for client-side data
 */
export class ClientCache {
  private static cache = new Map<string, {
    data: any;
    timestamp: number;
  }>();

  /**
   * Get an item from cache
   * @param key Cache key
   * @param staleTime Time in ms after which the cache is considered stale
   * @returns Cached data or undefined if not found or stale
   */
  static get(key: string, staleTime = 0): any | undefined {
    const item = this.cache.get(key);
    
    if (!item) return undefined;
    
    // If staleTime is provided and the cache is older than the stale time, consider it stale
    if (staleTime > 0 && Date.now() - item.timestamp > staleTime) {
      return undefined;
    }
    
    return item.data;
  }

  /**
   * Set an item in cache
   * @param key Cache key
   * @param data Data to cache
   */
  static set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear an item from cache
   * @param key Cache key
   */
  static clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all items from cache
   */
  static clearAll(): void {
    this.cache.clear();
  }
} 