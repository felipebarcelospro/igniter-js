export class IgniterCallerClientCache {
  private static cache = new Map<
    string,
    { data: unknown; timestamp: number }
  >()

  static get<T>(key: string, staleTime?: number): T | undefined {
    const entry = IgniterCallerClientCache.cache.get(key)
    if (!entry) return undefined

    if (staleTime && Date.now() - entry.timestamp > staleTime) {
      IgniterCallerClientCache.cache.delete(key)
      return undefined
    }

    return entry.data as T
  }

  static set(key: string, data: unknown): void {
    IgniterCallerClientCache.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  static replacePrefix(prefix: string, data: unknown): void {
    for (const [key, entry] of IgniterCallerClientCache.cache.entries()) {
      if (key.startsWith(prefix)) {
        IgniterCallerClientCache.cache.set(key, {
          data,
          timestamp: entry.timestamp,
        })
      }
    }
  }

  static clearPrefix(prefix: string): void {
    for (const key of IgniterCallerClientCache.cache.keys()) {
      if (key.startsWith(prefix)) {
        IgniterCallerClientCache.cache.delete(key)
      }
    }
  }
}
