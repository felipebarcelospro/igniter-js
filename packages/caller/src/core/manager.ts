import type { IgniterLogger } from '@igniter-js/core'
import type { IgniterTelemetryManager } from '@igniter-js/telemetry'
import { IgniterCallerRequestBuilder } from '../builders/request.builder'
import type {
  IgniterCallerRequestBuilderParams,
  IgniterCallerTypedRequestBuilder,
} from '../types/builder'
import type {
  IgniterCallerEventCallback,
  IgniterCallerUrlPattern,
} from '../types/events'
import type { IIgniterCallerManager } from '../types/manager'
import type {
  IgniterCallerRequestInterceptor,
  IgniterCallerResponseInterceptor,
} from '../types/interceptors'
import type { IgniterCallerDirectRequestOptions } from '../types/request'
import type { IgniterCallerApiResponse } from '../types/response'
import type {
  DeletePaths,
  GetPaths,
  HeadPaths,
  IgniterCallerSchemaMap,
  IgniterCallerSchemaValidationOptions,
  PatchPaths,
  PostPaths,
  PutPaths,
} from '../types/schemas'
import type { InferResponse, TypedRequestBuilder } from '../types/infer'
import { IgniterCallerCacheUtils } from '../utils/cache'
import { IgniterCallerEvents } from './events'

/**
 * HTTP client runtime for Igniter.js.
 *
 * This module is intentionally structured to be extracted into a standalone package
 * in the Igniter.js ecosystem as `@igniter-js/caller`.
 *
 * @template TSchemas - The schema map type for type-safe requests/responses.
 */
export class IgniterCallerManager<
  TSchemas extends IgniterCallerSchemaMap,
> implements IIgniterCallerManager<TSchemas> {
  /** Global event emitter for observing HTTP responses */
  private static readonly events = new IgniterCallerEvents()

  private baseURL?: string
  private headers?: Record<string, string>
  private cookies?: Record<string, string>
  private logger?: IgniterLogger
  private telemetry?: IgniterTelemetryManager
  private requestInterceptors?: IgniterCallerRequestInterceptor[]
  private responseInterceptors?: IgniterCallerResponseInterceptor[]
  private schemas?: TSchemas
  private schemaValidation?: IgniterCallerSchemaValidationOptions

  /**
   * Creates a new manager instance.
   *
   * @param baseURL - Base URL prefix for requests.
   * @param opts - Optional configuration (headers, cookies, telemetry, schemas).
   */
  constructor(
    baseURL?: string,
    opts?: {
      headers?: Record<string, string>
      cookies?: Record<string, string>
      logger?: IgniterLogger
      telemetry?: IgniterTelemetryManager
      requestInterceptors?: IgniterCallerRequestInterceptor[]
      responseInterceptors?: IgniterCallerResponseInterceptor[]
      schemas?: TSchemas
      schemaValidation?: IgniterCallerSchemaValidationOptions
    },
  ) {
    this.baseURL = baseURL
    this.headers = opts?.headers
    this.cookies = opts?.cookies
    this.logger = opts?.logger
    this.telemetry = opts?.telemetry
    this.requestInterceptors = opts?.requestInterceptors
    this.responseInterceptors = opts?.responseInterceptors
    this.schemas = opts?.schemas
    this.schemaValidation = opts?.schemaValidation
  }

  /**
   * Creates common request builder params.
   */
  private createBuilderParams(): IgniterCallerRequestBuilderParams {
    return {
      baseURL: this.baseURL,
      defaultHeaders: this.headers,
      defaultCookies: this.cookies,
      logger: this.logger,
      telemetry: this.telemetry,
      requestInterceptors: this.requestInterceptors,
      responseInterceptors: this.responseInterceptors,
      eventEmitter: async (url, method, result) => {
        await IgniterCallerManager.emitEvent(url, method, result)
      },
      schemas: this.schemas,
      schemaValidation: this.schemaValidation,
    }
  }

  /**
   * Creates a GET request.
   *
   * When a URL is provided and matches a schema, the response, body, and params types
   * are automatically inferred from the schema definition.
   *
   * @param url Optional URL for the request. When provided and matching a schema path,
   *            enables full type inference for response, body, and path params.
   *
   * @example
   * ```ts
   * // With typed schema - full type inference
   * const result = await api.get('/users/:id')
   *   .params({ id: '123' })  // params are typed based on URL pattern
   *   .execute()
   * // result.data is typed based on schema
   *
   * // Without URL (set later with .url())
   * const result = await api.get().url('/users').execute()
   * ```
   */
  get<TPath extends GetPaths<TSchemas>>(url: TPath): TypedRequestBuilder<TSchemas, TPath, 'GET'>
  get<TPath extends string>(url?: TPath): IgniterCallerTypedRequestBuilder<InferResponse<TSchemas, TPath, 'GET'>>
  get<TPath extends string>(url?: TPath): any {
    const builder = new IgniterCallerRequestBuilder(this.createBuilderParams())
    builder._setMethod('GET')
    if (url) builder._setUrl(url)
    return builder
  }

  /**
   * Creates a POST request.
   *
   * When a URL is provided and matches a schema, the response, body, and params types
   * are automatically inferred from the schema definition.
   *
   * @param url Optional URL for the request.
   *
   * @example
   * ```ts
   * // With typed schema - body type is inferred from schema
   * const result = await api.post('/users')
   *   .body({ name: 'John', email: 'john@example.com' })  // body is typed
   *   .execute()
   * ```
   */
  post<TPath extends PostPaths<TSchemas>>(
    url: TPath,
  ): TypedRequestBuilder<TSchemas, TPath, 'POST'>
  post<TPath extends string>(
    url?: TPath,
  ): IgniterCallerTypedRequestBuilder<InferResponse<TSchemas, TPath, 'POST'>>
  post<TPath extends string>(url?: TPath): any {
    const builder = new IgniterCallerRequestBuilder(this.createBuilderParams())
    builder._setMethod('POST')
    if (url) builder._setUrl(url)
    return builder
  }

  /**
   * Creates a PUT request.
   *
   * When a URL is provided and matches a schema, the response, body, and params types
   * are automatically inferred from the schema definition.
   *
   * @param url Optional URL for the request.
   *
   * @example
   * ```ts
   * const result = await api.put('/users/:id')
   *   .params({ id: '1' })
   *   .body({ name: 'Jane' })
   *   .execute()
   * ```
   */
  put<TPath extends PutPaths<TSchemas>>(url: TPath): TypedRequestBuilder<TSchemas, TPath, 'PUT'>
  put<TPath extends string>(url?: TPath): IgniterCallerTypedRequestBuilder<InferResponse<TSchemas, TPath, 'PUT'>>
  put<TPath extends string>(url?: TPath): any {
    const builder = new IgniterCallerRequestBuilder(this.createBuilderParams())
    builder._setMethod('PUT')
    if (url) builder._setUrl(url)
    return builder
  }

  /**
   * Creates a PATCH request.
   *
   * When a URL is provided and matches a schema, the response, body, and params types
   * are automatically inferred from the schema definition.
   *
   * @param url Optional URL for the request.
   *
   * @example
   * ```ts
   * const result = await api.patch('/users/:id')
   *   .params({ id: '1' })
   *   .body({ name: 'Jane' })
   *   .execute()
   * ```
   */
  patch<TPath extends PatchPaths<TSchemas>>(url: TPath): TypedRequestBuilder<TSchemas, TPath, 'PATCH'>
  patch<TPath extends string>(url?: TPath): IgniterCallerTypedRequestBuilder<InferResponse<TSchemas, TPath, 'PATCH'>>
  patch<TPath extends string>(url?: TPath): any {
    const builder = new IgniterCallerRequestBuilder(this.createBuilderParams())
    builder._setMethod('PATCH')
    if (url) builder._setUrl(url)
    return builder
  }

  /**
   * Creates a DELETE request.
   *
   * When a URL is provided and matches a schema, the response, body, and params types
   * are automatically inferred from the schema definition.
   *
   * @param url Optional URL for the request.
   *
   * @example
   * ```ts
   * const result = await api.delete('/users/:id')
   *   .params({ id: '1' })
   *   .execute()
   * ```
   */
  delete<TPath extends DeletePaths<TSchemas>>(url: TPath): TypedRequestBuilder<TSchemas, TPath, 'DELETE'>
  delete<TPath extends string>(url?: TPath): IgniterCallerTypedRequestBuilder<InferResponse<TSchemas, TPath, 'DELETE'>>
  delete<TPath extends string>(url?: TPath): any {
    const builder = new IgniterCallerRequestBuilder(this.createBuilderParams())
    builder._setMethod('DELETE')
    if (url) builder._setUrl(url)
    return builder
  }

  /**
   * Creates a HEAD request.
   *
   * When a URL is provided and matches a schema, the response, body, and params types
   * are automatically inferred from the schema definition.
   *
   * @param url Optional URL for the request.
   */
  head<TPath extends HeadPaths<TSchemas>>(url: TPath): TypedRequestBuilder<TSchemas, TPath, 'HEAD'>
  head<TPath extends string>(url?: TPath): IgniterCallerTypedRequestBuilder<InferResponse<TSchemas, TPath, 'HEAD'>>
  head<TPath extends string>(url?: TPath): any {
    const builder = new IgniterCallerRequestBuilder(this.createBuilderParams())
    builder._setMethod('HEAD')
    if (url) builder._setUrl(url)
    return builder
  }

  /**
   * Executes a request directly with all options in one object (axios-style).
   *
   * This is a convenience method for making requests without using the builder pattern.
   * Useful for dynamic requests where options are constructed programmatically.
   *
   * @param options - Request configuration for method, url, and behavior.
   * @returns Response envelope with data or error.
   *
   * @example
   * ```ts
   * const result = await api.request({
   *   method: 'POST',
   *   url: '/users',
   *   body: { name: 'John' },
   *   headers: { 'X-Custom': 'value' },
   *   timeout: 5000,
   * })
   *
   * // With caching
   * const result = await api.request({
   *   method: 'GET',
   *   url: '/users',
   *   staleTime: 30000,
   * })
   *
   * // With retry
   * const result = await api.request({
   *   method: 'GET',
   *   url: '/health',
   *   retry: { maxAttempts: 3, backoff: 'exponential' },
   * })
   * ```
   */
  async request<T = unknown>(
    options: IgniterCallerDirectRequestOptions,
  ): Promise<IgniterCallerApiResponse<T>> {
    const builder = new IgniterCallerRequestBuilder<T>({
      ...this.createBuilderParams(),
      // Override with request-specific options
      defaultHeaders: {
        ...this.headers,
        ...options.headers,
      },
    })

    // Set method and URL
    builder._setMethod(options.method)
    builder._setUrl(options.url)

    // Set body if provided
    if (options.body !== undefined) {
      builder.body(options.body)
    }

    // Set params if provided
    if (options.params) {
      builder.params(options.params)
    }

    // Set timeout if provided
    if (options.timeout) {
      builder.timeout(options.timeout)
    }

    // Set cache options
    if (options.cache) {
      builder.cache(options.cache, options.cacheKey)
    }

    // Set stale time
    if (options.staleTime) {
      builder.stale(options.staleTime)
    }

    // Set retry options
    if (options.retry) {
      builder.retry(options.retry.maxAttempts, options.retry)
    }

    // Set fallback
    if (options.fallback) {
      builder.fallback(options.fallback)
    }

    // Set response schema
    if (options.responseSchema) {
      builder.responseType(options.responseSchema)
    }

    return builder.execute()
  }

  /**
   * Executes multiple requests in parallel and returns results as an array.
   *
   * This is useful for batching independent API calls.
   *
   * @param requests - Array of request promises.
   * @returns Array of resolved results in the same order.
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
   * const cleanup = IgniterCallerManager.on(/^\/users/, (result, context) => {
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
    return IgniterCallerManager.events.on(pattern, callback)
  }

  /**
   * Removes event listeners for a pattern.
   *
   * @param pattern - URL string or RegExp pattern.
   * @param callback - Callback to remove (optional).
   */
  static off(
    pattern: IgniterCallerUrlPattern,
    callback?: IgniterCallerEventCallback,
  ): void {
    IgniterCallerManager.events.off(pattern, callback)
  }

  /**
   * Invalidates a specific cache entry.
   *
   * This is useful after mutations to ensure fresh data on next fetch.
   *
   * @param key - Cache key to invalidate.
   *
   * @example
   * ```ts
   * // After creating a user
   * await api.post('/users').body(newUser).execute()
   * await IgniterCallerManager.invalidate('/users') // Clear users list cache
   * ```
   */
  static async invalidate(key: string): Promise<void> {
    await IgniterCallerCacheUtils.clear(key)
  }

  /**
   * Invalidates all cache entries matching a pattern.
   *
   * @param pattern Glob pattern (e.g., '/users/*') or exact key
   * @returns Promise that resolves when invalidation completes.
   *
   * @example
   * ```ts
   * // Invalidate all user-related caches
   * await IgniterCallerManager.invalidatePattern('/users/*')
   * ```
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    await IgniterCallerCacheUtils.clearPattern(pattern)
  }

  /**
   * Emits an event to all registered listeners.
   *
   * @internal
   *
   * @param url - Request URL (resolved).
   * @param method - HTTP method.
   * @param result - Response envelope.
   */
  static async emitEvent(
    url: string,
    method: string,
    result: IgniterCallerApiResponse<any>,
  ): Promise<void> {
    await IgniterCallerManager.events.emit(url, method, result)
  }
}
