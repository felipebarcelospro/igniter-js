import type {
  IgniterCallerEventCallback,
  IgniterCallerUrlPattern,
} from '../types/events'

/**
 * Event emitter for observing HTTP responses across the application.
 *
 * This allows developers to listen to API responses globally for:
 * - Debugging and logging
 * - Real-time monitoring
 * - Cache invalidation triggers
 * - Analytics and telemetry
 */
export class IgniterCallerEvents {
  private listeners = new Map<string, Set<IgniterCallerEventCallback>>()
  private patternListeners = new Map<RegExp, Set<IgniterCallerEventCallback>>()

  /**
   * Registers a listener for a specific URL or pattern.
   *
   * @param pattern URL string (exact match) or RegExp pattern
   * @param callback Function to execute when a response matches
   * @returns Cleanup function to remove the listener
   *
   * @example
   * ```ts
   * // Listen to specific endpoint
   * const cleanup = api.on('/users', (result) => {
   *   console.log('Users fetched:', result.data)
   * })
   *
   * // Listen to pattern
   * api.on(/^\/users\/\d+$/, (result) => {
   *   console.log('User detail fetched')
   * })
   *
   * // Cleanup when done
   * cleanup()
   * ```
   */
  on(pattern: IgniterCallerUrlPattern, callback: IgniterCallerEventCallback): () => void {
    if (typeof pattern === 'string') {
      if (!this.listeners.has(pattern)) {
        this.listeners.set(pattern, new Set())
      }
      const callbacks = this.listeners.get(pattern)
      if (callbacks) {
        callbacks.add(callback)
      }

      // Return cleanup function
      return () => {
        const callbacks = this.listeners.get(pattern)
        if (callbacks) {
          callbacks.delete(callback)
          if (callbacks.size === 0) {
            this.listeners.delete(pattern)
          }
        }
      }
    }

    // RegExp pattern
    if (!this.patternListeners.has(pattern)) {
      this.patternListeners.set(pattern, new Set())
    }
    const callbacks = this.patternListeners.get(pattern)
    if (callbacks) {
      callbacks.add(callback)
    }

    return () => {
      const callbacks = this.patternListeners.get(pattern)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.patternListeners.delete(pattern)
        }
      }
    }
  }

  /**
   * Removes a specific listener or all listeners for a pattern.
   *
   * @param pattern - URL string or RegExp pattern.
   * @param callback - Optional specific callback to remove.
   */
  off(pattern: IgniterCallerUrlPattern, callback?: IgniterCallerEventCallback): void {
    if (typeof pattern === 'string') {
      if (callback !== undefined) {
        this.listeners.get(pattern)?.delete(callback)
      } else {
        this.listeners.delete(pattern)
      }
    } else {
      if (callback !== undefined) {
        this.patternListeners.get(pattern)?.delete(callback)
      } else {
        this.patternListeners.delete(pattern)
      }
    }
  }

  /**
   * Emits an event to all matching listeners.
   *
   * @internal
   *
   * @param url - Request URL to match listeners against.
   * @param method - HTTP method.
   * @param result - Response envelope.
   */
  async emit(url: string, method: string, result: any): Promise<void> {
    const context = {
      url,
      method,
      timestamp: Date.now(),
    }

    // Exact match listeners
    const exactListeners = this.listeners.get(url)
    if (exactListeners) {
      for (const callback of exactListeners) {
        try {
          await callback(result, context)
        } catch (error) {
          console.error('Error in IgniterCaller event listener:', error)
        }
      }
    }

    // Pattern match listeners
    for (const [pattern, callbacks] of this.patternListeners.entries()) {
      if (pattern.test(url)) {
        for (const callback of callbacks) {
          try {
            await callback(result, context)
          } catch (error) {
            console.error('Error in IgniterCaller event listener:', error)
          }
        }
      }
    }
  }

  /**
   * Removes all listeners.
   *
   * @returns Nothing.
   */
  clear(): void {
    this.listeners.clear()
    this.patternListeners.clear()
  }
}
