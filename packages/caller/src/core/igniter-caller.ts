import type { IgniterLogger } from '@igniter-js/core'
import { IgniterCallerBuilder } from '../builder/igniter-caller.builder'
import { IgniterCallerRequestBuilder } from '../builder/igniter-caller-request.builder'
import type {
  IgniterCallerEventCallback,
  IgniterCallerUrlPattern,
} from '../types/events'
import type {
  IgniterCallerRequestInterceptor,
  IgniterCallerResponseInterceptor,
} from '../types/interceptors'
import type { IgniterCallerApiResponse } from '../types/response'
import type {
  IgniterCallerSchemaMap,
  IgniterCallerSchemaValidationOptions,
} from '../types/schemas'
import { IgniterCallerCacheUtils } from '../utils/cache'
import { IgniterCallerEvents } from './igniter-caller-events'

/**
 * HTTP client runtime for Igniter.js.
 *
 * This module is intentionally structured to be extracted into a standalone package
 * in the Igniter.js ecosystem as `@igniter-js/caller`.
 */
export class IgniterCaller {
  /** Global event emitter for observing HTTP responses */
  private static readonly events = new IgniterCallerEvents()

  private baseURL?: string
  private headers?: Record<string, string>
  private cookies?: Record<string, string>
  private logger?: IgniterLogger
  private requestInterceptors?: IgniterCallerRequestInterceptor[]
  private responseInterceptors?: IgniterCallerResponseInterceptor[]
  private schemas?: IgniterCallerSchemaMap
  private schemaValidation?: IgniterCallerSchemaValidationOptions

  constructor(
    baseURL?: string,
    opts?: {
      headers?: Record<string, string>
      cookies?: Record<string, string>
      logger?: IgniterLogger
      requestInterceptors?: IgniterCallerRequestInterceptor[]
      responseInterceptors?: IgniterCallerResponseInterceptor[]
      schemas?: IgniterCallerSchemaMap
      schemaValidation?: IgniterCallerSchemaValidationOptions
    },
  ) {
    this.baseURL = baseURL
    this.headers = opts?.headers
    this.cookies = opts?.cookies
    this.logger = opts?.logger
    this.requestInterceptors = opts?.requestInterceptors
    this.responseInterceptors = opts?.responseInterceptors
    this.schemas = opts?.schemas
    this.schemaValidation = opts?.schemaValidation
  }

  /**
   * Canonical initialization entrypoint.
   *
   * This is designed to remain stable when extracted to `@igniter-js/caller`.
   */
  static create(): IgniterCallerBuilder<IgniterCaller> {
    return IgniterCallerBuilder.create((state) => {
      // Configure store if provided
      if (state.store) {
        IgniterCallerCacheUtils.setStore(state.store, state.storeOptions)
      }

      return new IgniterCaller(state.baseURL, {
        headers: state.headers,
        cookies: state.cookies,
        logger: state.logger,
        requestInterceptors: state.requestInterceptors,
        responseInterceptors: state.responseInterceptors,
        schemas: state.schemas,
        schemaValidation: state.schemaValidation,
      })
    })
  }

  /**
   * Returns a new client with the same config and a new logger.
   */
  withLogger(logger: IgniterLogger): IgniterCaller {
    return new IgniterCaller(this.baseURL, {
      headers: this.headers,
      cookies: this.cookies,
      logger,
      requestInterceptors: this.requestInterceptors,
      responseInterceptors: this.responseInterceptors,
      schemas: this.schemas,
      schemaValidation: this.schemaValidation,
    })
  }

  setBaseURL(baseURL: string): this {
    this.baseURL = baseURL
    return this
  }

  setHeaders(headers: Record<string, string>): this {
    this.headers = headers
    return this
  }

  setCookies(cookies: Record<string, string>): this {
    this.cookies = cookies
    return this
  }

  get(): IgniterCallerRequestBuilder {
    return new IgniterCallerRequestBuilder({
      baseURL: this.baseURL,
      defaultHeaders: this.headers,
      defaultCookies: this.cookies,
      logger: this.logger,
      requestInterceptors: this.requestInterceptors,
      responseInterceptors: this.responseInterceptors,
      eventEmitter: async (url, method, result) => {
        await IgniterCaller.emitEvent(url, method, result)
      },
      schemas: this.schemas,
      schemaValidation: this.schemaValidation,
    }).method('GET')
  }

  post(): IgniterCallerRequestBuilder {
    return new IgniterCallerRequestBuilder({
      baseURL: this.baseURL,
      defaultHeaders: this.headers,
      defaultCookies: this.cookies,
      logger: this.logger,
      requestInterceptors: this.requestInterceptors,
      responseInterceptors: this.responseInterceptors,
      eventEmitter: async (url, method, result) => {
        await IgniterCaller.emitEvent(url, method, result)
      },
      schemas: this.schemas,
      schemaValidation: this.schemaValidation,
    }).method('POST')
  }

  put(): IgniterCallerRequestBuilder {
    return new IgniterCallerRequestBuilder({
      baseURL: this.baseURL,
      defaultHeaders: this.headers,
      defaultCookies: this.cookies,
      logger: this.logger,
      requestInterceptors: this.requestInterceptors,
      responseInterceptors: this.responseInterceptors,
      eventEmitter: async (url, method, result) => {
        await IgniterCaller.emitEvent(url, method, result)
      },
      schemas: this.schemas,
      schemaValidation: this.schemaValidation,
    }).method('PUT')
  }

  patch(): IgniterCallerRequestBuilder {
    return new IgniterCallerRequestBuilder({
      baseURL: this.baseURL,
      defaultHeaders: this.headers,
      defaultCookies: this.cookies,
      logger: this.logger,
      requestInterceptors: this.requestInterceptors,
      responseInterceptors: this.responseInterceptors,
      eventEmitter: async (url, method, result) => {
        await IgniterCaller.emitEvent(url, method, result)
      },
      schemas: this.schemas,
      schemaValidation: this.schemaValidation,
    }).method('PATCH')
  }

  delete(): IgniterCallerRequestBuilder {
    return new IgniterCallerRequestBuilder({
      baseURL: this.baseURL,
      defaultHeaders: this.headers,
      defaultCookies: this.cookies,
      logger: this.logger,
      requestInterceptors: this.requestInterceptors,
      responseInterceptors: this.responseInterceptors,
      eventEmitter: async (url, method, result) => {
        await IgniterCaller.emitEvent(url, method, result)
      },
      schemas: this.schemas,
      schemaValidation: this.schemaValidation,
    }).method('DELETE')
  }

  request(): IgniterCallerRequestBuilder {
    return new IgniterCallerRequestBuilder({
      baseURL: this.baseURL,
      defaultHeaders: this.headers,
      defaultCookies: this.cookies,
      logger: this.logger,
      requestInterceptors: this.requestInterceptors,
      responseInterceptors: this.responseInterceptors,
      eventEmitter: async (url, method, result) => {
        await IgniterCaller.emitEvent(url, method, result)
      },
    })
  }

  /**
   * Executes multiple requests in parallel and returns results as an array.
   *
   * This is useful for batching independent API calls.
   */
  static async batch<
    T extends readonly Promise<IgniterCallerApiResponse<any>>[],
  >(
    requests: [...T],
  ): Promise<{
    [K in keyof T]: T[K] extends Promise<infer R> ? R : never
  }> {
    return Promise.all(requests) as any
  }

  /**
   * Registers a global event listener for HTTP responses.
   *
   * This allows observing API responses across the application for:
   * - Debugging and logging
   * - Real-time monitoring
   * - Cache invalidation triggers
   * - Analytics and telemetry
   *
   * @param pattern URL string (exact match) or RegExp pattern
   * @param callback Function to execute when a response matches
   * @returns Cleanup function to remove the listener
   *
   * @example
   * ```ts
   * // Listen to all user endpoints
   * const cleanup = IgniterCaller.on(/^\/users/, (result, context) => {
   *   console.log(`${context.method} ${context.url}`, result)
   * })
   *
   * // Cleanup when done
   * cleanup()
   * ```
   */
  static on(
    pattern: IgniterCallerUrlPattern,
    callback: IgniterCallerEventCallback,
  ): () => void {
    return IgniterCaller.events.on(pattern, callback)
  }

  /**
   * Removes event listeners for a pattern.
   */
  static off(
    pattern: IgniterCallerUrlPattern,
    callback?: IgniterCallerEventCallback,
  ): void {
    IgniterCaller.events.off(pattern, callback)
  }

  /**
   * Invalidates a specific cache entry.
   *
   * This is useful after mutations to ensure fresh data on next fetch.
   *
   * @example
   * ```ts
   * // After creating a user
   * await api.post().url('/users').body(newUser).execute()
   * await IgniterCaller.invalidate('/users') // Clear users list cache
   * ```
   */
  static async invalidate(key: string): Promise<void> {
    await IgniterCallerCacheUtils.clear(key)
  }

  /**
   * Invalidates all cache entries matching a pattern.
   *
   * @param pattern Glob pattern (e.g., '/users/*') or exact key
   *
   * @example
   * ```ts
   * // Invalidate all user-related caches
   * await IgniterCaller.invalidatePattern('/users/*')
   * ```
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    await IgniterCallerCacheUtils.clearPattern(pattern)
  }

  /**
   * Emits an event to all registered listeners.
   *
   * @internal
   */
  static async emitEvent(
    url: string,
    method: string,
    result: IgniterCallerApiResponse<any>,
  ): Promise<void> {
    await IgniterCaller.events.emit(url, method, result)
  }
}
