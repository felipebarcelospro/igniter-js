import type { IgniterLogger, StandardSchemaV1 } from '@igniter-js/core'
import { IgniterCallerBuilder } from '../builder/igniter-caller.builder'
import {
  IgniterCallerRequestBuilder,
  type IgniterCallerMethodRequestBuilder,
  type IgniterCallerRequestBuilderParams,
  type IgniterCallerTypedRequestBuilder,
} from '../builder/igniter-caller-request.builder'
import type {
  IgniterCallerEventCallback,
  IgniterCallerUrlPattern,
} from '../types/events'
import type {
  IgniterCallerRequestInterceptor,
  IgniterCallerResponseInterceptor,
} from '../types/interceptors'
import type { IgniterCallerDirectRequestOptions } from '../types/request'
import type { IgniterCallerApiResponse } from '../types/response'
import type {
  DeletePaths,
  EndpointInfo,
  ExtractPathParams,
  GetPaths,
  HeadPaths,
  IgniterCallerEndpointSchema,
  IgniterCallerSchemaMap,
  IgniterCallerSchemaMethod,
  IgniterCallerSchemaValidationOptions,
  PatchPaths,
  PostPaths,
  PutPaths,
} from '../types/schemas'
import { IgniterCallerCacheUtils } from '../utils/cache'
import { IgniterCallerEvents } from './igniter-caller-events'

/**
 * Infer success response type from endpoint schema (200 or 201).
 */
type InferSuccessResponse<T> = T extends IgniterCallerEndpointSchema<any, infer R>
  ? 200 extends keyof R
    ? R[200] extends StandardSchemaV1
      ? StandardSchemaV1.InferOutput<R[200]>
      : unknown
    : 201 extends keyof R
      ? R[201] extends StandardSchemaV1
        ? StandardSchemaV1.InferOutput<R[201]>
        : unknown
      : unknown
  : unknown

/**
 * Get the endpoint schema for a path and method from a schema map.
 */
type GetEndpoint<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends string,
  TMethod extends IgniterCallerSchemaMethod,
> = TPath extends keyof TSchemas
  ? TMethod extends keyof TSchemas[TPath]
    ? TSchemas[TPath][TMethod]
    : undefined
  : undefined

/**
 * Infer the response type for a given path and method.
 * Returns `unknown` if the path/method is not in the schema.
 */
type InferResponse<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends string,
  TMethod extends IgniterCallerSchemaMethod,
> = InferSuccessResponse<GetEndpoint<TSchemas, TPath, TMethod>>

/**
 * Typed request builder with inferred body and params types.
 */
export type TypedRequestBuilder<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends string,
  TMethod extends IgniterCallerSchemaMethod,
> = Omit<
  IgniterCallerMethodRequestBuilder<EndpointInfo<TSchemas, TPath, TMethod>['response']>,
  'body' | 'params'
> & {
  /**
   * Sets the request body with type inference from schema.
   */
  body: EndpointInfo<TSchemas, TPath, TMethod>['request'] extends never
    ? <TBody>(body: TBody) => TypedRequestBuilder<TSchemas, TPath, TMethod>
    : (body: EndpointInfo<TSchemas, TPath, TMethod>['request']) => TypedRequestBuilder<TSchemas, TPath, TMethod>
  
  /**
   * Sets URL path parameters with type inference from URL pattern.
   */
  params: keyof EndpointInfo<TSchemas, TPath, TMethod>['params'] extends never
    ? (params: Record<string, string | number | boolean>) => TypedRequestBuilder<TSchemas, TPath, TMethod>
    : (params: EndpointInfo<TSchemas, TPath, TMethod>['params'] & Record<string, string | number | boolean>) => TypedRequestBuilder<TSchemas, TPath, TMethod>
}

/**
 * HTTP client runtime for Igniter.js.
 *
 * This module is intentionally structured to be extracted into a standalone package
 * in the Igniter.js ecosystem as `@igniter-js/caller`.
 *
 * @template TSchemas - The schema map type for type-safe requests/responses.
 */
export class IgniterCaller<TSchemas extends IgniterCallerSchemaMap> {
  /** Global event emitter for observing HTTP responses */
  private static readonly events = new IgniterCallerEvents()

  private baseURL?: string
  private headers?: Record<string, string>
  private cookies?: Record<string, string>
  private logger?: IgniterLogger
  private requestInterceptors?: IgniterCallerRequestInterceptor[]
  private responseInterceptors?: IgniterCallerResponseInterceptor[]
  private schemas?: TSchemas
  private schemaValidation?: IgniterCallerSchemaValidationOptions

  constructor(
    baseURL?: string,
    opts?: {
      headers?: Record<string, string>
      cookies?: Record<string, string>
      logger?: IgniterLogger
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
  static create<TInitSchemas extends IgniterCallerSchemaMap>(): IgniterCallerBuilder<IgniterCaller<TInitSchemas>, TInitSchemas> {
    return IgniterCallerBuilder.create<IgniterCaller<any>, any>((state) => {
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
    }) as IgniterCallerBuilder<IgniterCaller<TInitSchemas>, TInitSchemas>
  }

  /**
   * Returns a new client with the same config and a new logger.
   */
  withLogger(logger: IgniterLogger): IgniterCaller<TSchemas> {
    return new IgniterCaller<TSchemas>(this.baseURL, {
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

  /**
   * Creates common request builder params.
   */
  private createBuilderParams(): IgniterCallerRequestBuilderParams {
    return {
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
   * When a URL is provided and matches a schema, the response type is automatically inferred.
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
  post<TPath extends PostPaths<TSchemas>>(url: TPath): TypedRequestBuilder<TSchemas, TPath, 'POST'>
  post<TPath extends string>(url?: TPath): IgniterCallerTypedRequestBuilder<InferResponse<TSchemas, TPath, 'POST'>>
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
   * await api.post('/users').body(newUser).execute()
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
