import type { IgniterLogger, StandardSchemaV1 } from '@igniter-js/core'
import type { z } from 'zod'
import { IgniterCallerError } from '../errors/igniter-caller.error'
import type { IgniterCallerHttpMethod } from '../types/http'
import type {
  IgniterCallerRequestInterceptor,
  IgniterCallerResponseInterceptor,
} from '../types/interceptors'
import type { IgniterCallerRequestOptions } from '../types/request'
import type {
  IgniterCallerApiResponse,
  IgniterCallerFileResponse,
  IgniterCallerResponseContentType,
  IgniterCallerValidatableContentType,
} from '../types/response'
import type { IgniterCallerRetryOptions } from '../types/retry'
import type {
  IgniterCallerSchemaMap,
  IgniterCallerSchemaValidationOptions,
} from '../types/schemas'
import { IgniterCallerBodyUtils } from '../utils/body'
import { IgniterCallerCacheUtils } from '../utils/cache'
import { IgniterCallerSchemaUtils } from '../utils/schema'
import { IgniterCallerUrlUtils } from '../utils/url'

/**
 * Content types that support schema validation.
 */
const VALIDATABLE_CONTENT_TYPES: IgniterCallerValidatableContentType[] = [
  'json',
  'xml',
  'csv',
]

/**
 * Detects the response content type from headers.
 */
function detectContentType(
  contentType: string | null,
): IgniterCallerResponseContentType {
  if (!contentType) return 'text'

  const ct = contentType.toLowerCase()

  if (ct.includes('application/json')) return 'json'
  if (ct.includes('application/xml') || ct.includes('text/xml')) return 'xml'
  if (ct.includes('text/csv')) return 'csv'
  if (ct.includes('text/html')) return 'html'
  if (ct.includes('text/plain')) return 'text'
  if (ct.includes('multipart/form-data')) return 'formdata'
  if (ct.includes('application/octet-stream')) return 'blob'

  // Check for file-like content types
  if (
    ct.includes('image/') ||
    ct.includes('audio/') ||
    ct.includes('video/') ||
    ct.includes('application/pdf') ||
    ct.includes('application/zip')
  ) {
    return 'blob'
  }

  return 'text'
}

/**
 * Checks if a content type supports schema validation.
 */
function isValidatableContentType(
  contentType: IgniterCallerResponseContentType,
): contentType is IgniterCallerValidatableContentType {
  return VALIDATABLE_CONTENT_TYPES.includes(
    contentType as IgniterCallerValidatableContentType,
  )
}

/**
 * Parse response data based on content type.
 */
async function parseResponseByContentType(
  response: Response,
  contentType: IgniterCallerResponseContentType,
): Promise<unknown> {
  switch (contentType) {
    case 'json':
      return response.json()
    case 'xml':
    case 'csv':
    case 'html':
    case 'text':
      return response.text()
    case 'blob':
      return response.blob()
    case 'stream':
      return response.body
    case 'arraybuffer':
      return response.arrayBuffer()
    case 'formdata':
      return response.formData()
    default:
      return response.text()
  }
}

/**
 * Constructor params for the request builder.
 */
export interface IgniterCallerRequestBuilderParams {
  baseURL?: string
  defaultHeaders?: Record<string, string>
  defaultCookies?: Record<string, string>
  logger?: IgniterLogger
  requestInterceptors?: IgniterCallerRequestInterceptor[]
  responseInterceptors?: IgniterCallerResponseInterceptor[]
  eventEmitter?: (url: string, method: string, result: any) => Promise<void>
  schemas?: IgniterCallerSchemaMap
  schemaValidation?: IgniterCallerSchemaValidationOptions
}

/**
 * Fluent request builder for `IgniterCaller`.
 *
 * When created via specific HTTP methods (get, post, put, patch, delete),
 * the method is already set and cannot be changed.
 */
export class IgniterCallerRequestBuilder<TResponse = unknown> {
  private options: IgniterCallerRequestOptions = {
    method: 'GET',
    url: '',
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000,
    cache: 'default',
  }

  private logger?: IgniterLogger
  private retryOptions?: IgniterCallerRetryOptions
  private fallbackFn?: () => any
  private cacheKey?: string
  private staleTime?: number
  private requestInterceptors?: IgniterCallerRequestInterceptor[]
  private responseInterceptors?: IgniterCallerResponseInterceptor[]
  private eventEmitter?: (
    url: string,
    method: string,
    result: any,
  ) => Promise<void>
  private schemas?: IgniterCallerSchemaMap
  private schemaValidation?: IgniterCallerSchemaValidationOptions
  private responseTypeSchema?: z.ZodSchema<any> | StandardSchemaV1

  constructor(params: IgniterCallerRequestBuilderParams) {
    if (params.baseURL) this.options.baseURL = params.baseURL

    if (params.defaultHeaders) {
      this.options.headers = {
        ...this.options.headers,
        ...params.defaultHeaders,
      }
    }

    if (params.defaultCookies) {
      const cookieStr = Object.entries(params.defaultCookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ')
      this.options.headers = { ...this.options.headers, Cookie: cookieStr }
    }

    this.logger = params.logger
    this.requestInterceptors = params.requestInterceptors
    this.responseInterceptors = params.responseInterceptors
    this.eventEmitter = params.eventEmitter
    this.schemas = params.schemas
    this.schemaValidation = params.schemaValidation
  }

  /**
   * Sets the HTTP method for this request.
   * @internal Used by IgniterCaller.request() for generic requests.
   */
  _setMethod(method: IgniterCallerHttpMethod): this {
    this.options.method = method
    return this
  }

  /**
   * Sets the URL for this request.
   * @internal Used when URL is passed to HTTP method directly.
   */
  _setUrl(url: string): this {
    this.options.url = url
    return this
  }

  /**
   * Overrides the logger for this request chain.
   */
  withLogger(logger: IgniterLogger): this {
    this.logger = logger
    return this
  }

  /**
   * Sets the request URL.
   */
  url(url: string): this {
    this.options.url = url
    return this
  }

  /**
   * Sets the request body.
   * For GET/HEAD requests, body will be automatically converted to query params.
   */
  body<TBody>(body: TBody): this {
    this.options.body = body
    return this
  }

  /**
   * Sets URL query parameters.
   */
  params(params: Record<string, string | number | boolean>): this {
    this.options.params = params
    return this
  }

  /**
   * Merges additional headers into the request.
   */
  headers(headers: Record<string, string>): this {
    this.options.headers = { ...this.options.headers, ...headers }
    return this
  }

  /**
   * Sets request timeout in milliseconds.
   */
  timeout(timeout: number): this {
    this.options.timeout = timeout
    return this
  }

  /**
   * Sets cache strategy and optional cache key.
   */
  cache(cache: RequestCache, key?: string): this {
    this.options.cache = cache
    this.cacheKey = key
    return this
  }

  /**
   * Configures retry behavior for failed requests.
   */
  retry(
    maxAttempts: number,
    options?: Omit<IgniterCallerRetryOptions, 'maxAttempts'>,
  ): this {
    this.retryOptions = { maxAttempts, ...options }
    return this
  }

  /**
   * Provides a fallback value if the request fails.
   */
  fallback<T>(fn: () => T): this {
    this.fallbackFn = fn
    return this
  }

  /**
   * Sets cache stale time in milliseconds.
   */
  stale(milliseconds: number): this {
    this.staleTime = milliseconds
    return this
  }

  /**
   * Sets the expected response type for TypeScript inference.
   *
   * - If a Zod/StandardSchema is passed, it will validate the response (only for JSON/XML/CSV)
   * - If a type parameter is passed (e.g., `responseType<File>()`), it's for typing only
   *
   * The actual parsing is based on Content-Type headers, not this setting.
   *
   * @example
   * ```ts
   * // With Zod schema (validates JSON response)
   * const result = await api.get('/users').responseType(UserSchema).execute()
   *
   * // With type marker (typing only, no validation)
   * const result = await api.get('/file').responseType<Blob>().execute()
   * ```
   */
  responseType<T>(schema?: z.ZodSchema<T> | StandardSchemaV1): IgniterCallerRequestBuilder<T> {
    if (schema) {
      this.responseTypeSchema = schema
    }
    return this as unknown as IgniterCallerRequestBuilder<T>
  }

  /**
   * Downloads a file via GET request.
   * @deprecated Use `.responseType<File>().execute()` instead. The response type is auto-detected.
   */
  getFile(url: string) {
    this.options.method = 'GET'
    this.options.url = url

    return {
      execute: async (): Promise<IgniterCallerFileResponse> => {
        const {
          url: finalUrl,
          requestInit,
          controller,
          timeoutId,
        } = this.buildRequest()

        this.logger?.debug('IgniterCaller.getFile started', { url: finalUrl })

        try {
          const response = await fetch(finalUrl, {
            ...requestInit,
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (!response.ok) {
            const errorText = await response.text().catch(() => '')

            return {
              file: null,
              error: new IgniterCallerError({
                code: 'IGNITER_CALLER_HTTP_ERROR',
                operation: 'download',
                message: errorText || `HTTP error! status: ${response.status}`,
                statusText: response.statusText,
                statusCode: response.status,
                logger: this.logger,
                metadata: { url: finalUrl },
              }),
            }
          }

          const data = await response.blob()

          const contentType = response.headers.get('content-type')
          const extension = contentType?.split('/')[1]

          const filenameHeader = response.headers.get('content-disposition')
          const filename = filenameHeader?.split('filename=')[1]
          const filenameExtension = filename?.split('.').pop()

          // NOTE: Node 20+ includes `File` via undici. In older runtimes, this may not exist.
          if (typeof File === 'undefined') {
            return {
              file: null,
              error: new IgniterCallerError({
                code: 'IGNITER_CALLER_UNKNOWN_ERROR',
                operation: 'download',
                message:
                  '`File` is not available in this runtime. Consider using `response.blob()` directly.',
                logger: this.logger,
                metadata: { url: finalUrl },
              }),
            }
          }

          const file = new File(
            [data],
            filename || `file.${extension || filenameExtension || 'unknown'}`,
          )

          this.logger?.info('IgniterCaller.getFile success', {
            url: finalUrl,
            size: file.size,
            type: file.type,
          })

          return { file, error: null }
        } catch (error) {
          clearTimeout(timeoutId)

          if (error instanceof Error && error.name === 'AbortError') {
            return {
              file: null,
              error: new IgniterCallerError({
                code: 'IGNITER_CALLER_TIMEOUT',
                operation: 'download',
                message: `Request timeout after ${this.options.timeout || 30000}ms`,
                statusCode: 408,
                logger: this.logger,
                metadata: { url: finalUrl },
                cause: error,
              }),
            }
          }

          return {
            file: null,
            error: new IgniterCallerError({
              code: 'IGNITER_CALLER_UNKNOWN_ERROR',
              operation: 'download',
              message: (error as Error)?.message || 'Failed to download file',
              logger: this.logger,
              metadata: { url: finalUrl },
              cause: error,
            }),
          }
        }
      },
    }
  }

  /**
   * Executes the HTTP request.
   *
   * Response parsing is automatic based on Content-Type headers:
   * - `application/json` → parsed as JSON
   * - `text/xml`, `application/xml` → returned as text (parse with your XML library)
   * - `text/csv` → returned as text
   * - `text/html`, `text/plain` → returned as text
   * - `image/*`, `audio/*`, `video/*`, `application/pdf`, etc. → returned as Blob
   * - `application/octet-stream` → returned as Blob
   *
   * Schema validation (if configured) only runs for validatable content types (JSON, XML, CSV).
   */
  async execute(): Promise<IgniterCallerApiResponse<TResponse>> {
    // Check cache first if cache key is provided
    const effectiveCacheKey = this.cacheKey || this.options.url
    if (effectiveCacheKey && this.staleTime) {
      const cached = await IgniterCallerCacheUtils.get<TResponse>(
        effectiveCacheKey,
        this.staleTime,
      )
      if (cached !== undefined) {
        this.logger?.debug('IgniterCaller.execute cache hit', {
          key: effectiveCacheKey,
        })
        const cachedResult: IgniterCallerApiResponse<TResponse> = {
          data: cached,
          error: undefined,
        }
        // Emit event for cached response
        await this.emitEvent(cachedResult)
        return cachedResult
      }
    }

    // Execute with retry logic
    const result = await this.executeWithRetry()

    // Apply fallback if request failed
    if (result.error && this.fallbackFn) {
      this.logger?.debug('IgniterCaller.execute applying fallback', {
        error: result.error,
      })
      const fallbackResult: IgniterCallerApiResponse<TResponse> = {
        data: this.fallbackFn() as TResponse,
        error: undefined,
      }
      await this.emitEvent(fallbackResult)
      return fallbackResult
    }

    // Store in cache if successful and cache key is provided
    if (!result.error && result.data !== undefined && effectiveCacheKey) {
      await IgniterCallerCacheUtils.set(
        effectiveCacheKey,
        result.data,
        this.staleTime,
      )
    }

    // Emit event for response
    await this.emitEvent(result)

    return result
  }

  private async executeWithRetry(): Promise<IgniterCallerApiResponse<TResponse>> {
    const maxAttempts = this.retryOptions?.maxAttempts || 1
    const baseDelay = this.retryOptions?.baseDelay || 1000
    const backoff = this.retryOptions?.backoff || 'linear'
    const retryOnStatus = this.retryOptions?.retryOnStatus || [
      408, 429, 500, 502, 503, 504,
    ]

    let lastError: Error | undefined

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        const delay =
          backoff === 'exponential'
            ? baseDelay * 2 ** (attempt - 1)
            : baseDelay * attempt

        this.logger?.debug('IgniterCaller.execute retrying', {
          attempt,
          delay,
        })

        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      const result = await this.executeSingleRequest()

      // Success case
      if (!result.error) {
        return result
      }

      // Check if we should retry based on status code
      const shouldRetry =
        result.error instanceof IgniterCallerError &&
        result.error.statusCode &&
        retryOnStatus.includes(result.error.statusCode)

      if (!shouldRetry || attempt === maxAttempts - 1) {
        return result
      }

      lastError = result.error
    }

    return {
      data: undefined,
      error: lastError,
    }
  }

  private async executeSingleRequest(): Promise<IgniterCallerApiResponse<TResponse>> {
    let { url, requestInit, controller, timeoutId } = this.buildRequest()

    this.logger?.debug('IgniterCaller.execute started', {
      method: this.options.method,
      url,
    })

    // Apply request interceptors
    if (this.requestInterceptors && this.requestInterceptors.length > 0) {
      let modifiedOptions = { ...this.options, url }
      for (const interceptor of this.requestInterceptors) {
        modifiedOptions = await interceptor(modifiedOptions)
      }
      // Rebuild request with intercepted options
      this.options = modifiedOptions
      const rebuilt = this.buildRequest()
      url = rebuilt.url
      requestInit = rebuilt.requestInit
      controller = rebuilt.controller
      timeoutId = rebuilt.timeoutId
    }

    // Validate request body if schema exists
    if (this.schemas && this.options.body) {
      const { schema: endpointSchema } = IgniterCallerSchemaUtils.findSchema(
        this.schemas,
        url,
        this.options.method,
      )

      if (endpointSchema?.request) {
        try {
          await IgniterCallerSchemaUtils.validateRequest(
            this.options.body,
            endpointSchema.request,
            this.schemaValidation,
            { url, method: this.options.method },
            this.logger,
          )
        } catch (error) {
          clearTimeout(timeoutId)
          // Validation failed in strict mode
          return {
            data: undefined,
            error: error as IgniterCallerError,
          }
        }
      }
    }

    try {
      const httpResponse = await fetch(url, {
        ...requestInit,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!httpResponse.ok) {
        const errorText = await httpResponse.text().catch(() => '')

        return {
          data: undefined,
          error: new IgniterCallerError({
            code: 'IGNITER_CALLER_HTTP_ERROR',
            operation: 'execute',
            message: errorText || `HTTP error! status: ${httpResponse.status}`,
            statusText: httpResponse.statusText,
            statusCode: httpResponse.status,
            logger: this.logger,
            metadata: {
              method: this.options.method,
              url,
            },
          }),
          status: httpResponse.status,
          headers: httpResponse.headers,
        }
      }

      // Detect content type from headers
      const contentTypeHeader = httpResponse.headers.get('content-type')
      const detectedContentType = detectContentType(contentTypeHeader)

      // Parse response based on detected content type
      let data = await parseResponseByContentType(httpResponse, detectedContentType)

      // Validate response if:
      // 1. Content type is validatable (json, xml, csv)
      // 2. Either schemas are configured OR responseTypeSchema is set
      const shouldValidate = isValidatableContentType(detectedContentType)

      if (shouldValidate) {
        // First, try schema map validation
        if (this.schemas) {
          const { schema: endpointSchema } = IgniterCallerSchemaUtils.findSchema(
            this.schemas,
            url,
            this.options.method,
          )

          const responseSchema = endpointSchema?.responses?.[httpResponse.status]

          if (responseSchema) {
            try {
              data = await IgniterCallerSchemaUtils.validateResponse(
                data,
                responseSchema,
                httpResponse.status,
                this.schemaValidation,
                { url, method: this.options.method },
                this.logger,
              )
            } catch (error) {
              return {
                data: undefined,
                error: error as IgniterCallerError,
                status: httpResponse.status,
                headers: httpResponse.headers,
              }
            }
          }
        }

        // Then, try responseType schema validation (Zod or StandardSchema)
        if (this.responseTypeSchema) {
          // Check if it's a Zod schema
          if ('safeParse' in this.responseTypeSchema) {
            const zodSchema = this.responseTypeSchema as z.ZodSchema<any>
            const result = zodSchema.safeParse(data)
            if (!result.success) {
              return {
                data: undefined,
                error: new IgniterCallerError({
                  code: 'IGNITER_CALLER_RESPONSE_VALIDATION_FAILED',
                  operation: 'parseResponse',
                  message: `Response validation failed: ${result.error.message}`,
                  logger: this.logger,
                  statusCode: httpResponse.status,
                  metadata: {
                    method: this.options.method,
                    url,
                  },
                  cause: result.error,
                }),
                status: httpResponse.status,
                headers: httpResponse.headers,
              }
            }
            data = result.data
          }
          // Check if it's a StandardSchema
          else if ('~standard' in this.responseTypeSchema) {
            try {
              const standardSchema = this.responseTypeSchema as StandardSchemaV1
              const result = await standardSchema['~standard'].validate(data)
              if (result.issues) {
                return {
                  data: undefined,
                  error: new IgniterCallerError({
                    code: 'IGNITER_CALLER_RESPONSE_VALIDATION_FAILED',
                    operation: 'parseResponse',
                    message: `Response validation failed`,
                    logger: this.logger,
                    statusCode: httpResponse.status,
                    metadata: {
                      method: this.options.method,
                      url,
                      issues: result.issues,
                    },
                  }),
                  status: httpResponse.status,
                  headers: httpResponse.headers,
                }
              }
              data = result.value
            } catch (error) {
              return {
                data: undefined,
                error: new IgniterCallerError({
                  code: 'IGNITER_CALLER_RESPONSE_VALIDATION_FAILED',
                  operation: 'parseResponse',
                  message: (error as Error)?.message || 'Response validation failed',
                  logger: this.logger,
                  statusCode: httpResponse.status,
                  metadata: {
                    method: this.options.method,
                    url,
                  },
                  cause: error,
                }),
                status: httpResponse.status,
                headers: httpResponse.headers,
              }
            }
          }
        }
      }

      let response: IgniterCallerApiResponse<TResponse> = {
        data: data as TResponse,
        error: undefined,
        status: httpResponse.status,
        headers: httpResponse.headers,
      }

      // Apply response interceptors
      if (this.responseInterceptors && this.responseInterceptors.length > 0) {
        for (const interceptor of this.responseInterceptors) {
          response = await interceptor(response)
        }
      }

      return response
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          data: undefined,
          error: new IgniterCallerError({
            code: 'IGNITER_CALLER_TIMEOUT',
            operation: 'execute',
            message: `Request timeout after ${this.options.timeout || 30000}ms`,
            statusCode: 408,
            logger: this.logger,
            metadata: {
              method: this.options.method,
              url,
            },
            cause: error,
          }),
        }
      }

      return {
        data: undefined,
        error: new IgniterCallerError({
          code: 'IGNITER_CALLER_UNKNOWN_ERROR',
          operation: 'execute',
          message:
            (error as Error)?.message ||
            'Unknown error occurred during request',
          statusCode: 500,
          logger: this.logger,
          metadata: {
            method: this.options.method,
            url,
          },
          cause: error,
        }),
      }
    }
  }

  private buildRequest() {
    const { method, url, body, params, headers, timeout, baseURL, cache } =
      this.options

    // For GET/HEAD requests, convert body to query params
    let finalParams = params
    if ((method === 'GET' || method === 'HEAD') && body && typeof body === 'object') {
      const bodyParams: Record<string, string | number | boolean> = {}
      for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
        if (value !== undefined && value !== null) {
          bodyParams[key] = String(value)
        }
      }
      finalParams = { ...bodyParams, ...params }
    }

    const fullUrl = IgniterCallerUrlUtils.buildUrl({
      url,
      baseURL,
      query: finalParams,
    })

    // Only include body for non-GET/HEAD methods
    const shouldIncludeBody = body && method !== 'GET' && method !== 'HEAD'
    const rawBody = shouldIncludeBody && IgniterCallerBodyUtils.isRawBody(body)
    const finalHeaders = IgniterCallerBodyUtils.normalizeHeadersForBody(
      headers,
      shouldIncludeBody ? body : undefined,
    )

    const requestInit: RequestInit = {
      method,
      headers: finalHeaders,
      cache,
      ...(shouldIncludeBody
        ? { body: rawBody ? (body as any) : JSON.stringify(body) }
        : {}),
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout || 30000)

    return {
      url: fullUrl,
      requestInit,
      controller,
      timeoutId,
    }
  }

  /**
   * Emits event for this response using injected emitter.
   */
  private async emitEvent(
    result: IgniterCallerApiResponse<TResponse>,
  ): Promise<void> {
    if (this.eventEmitter) {
      try {
        await this.eventEmitter(this.options.url, this.options.method, result)
      } catch (error) {
        // Silently fail if event emission fails
        this.logger?.debug('Failed to emit event', { error })
      }
    }
  }
}

/**
 * Request builder type without internal methods.
 * Used when creating requests via specific HTTP methods (get, post, etc.)
 */
export type IgniterCallerMethodRequestBuilder<TResponse = unknown> = Omit<
  IgniterCallerRequestBuilder<TResponse>,
  '_setMethod' | '_setUrl'
>

/**
 * Request builder with typed response based on schema inference.
 * Used when creating requests via HTTP methods with URL that matches a schema.
 *
 * This type ensures that the execute() method returns the correct response type
 * based on the schema map configuration.
 */
export type IgniterCallerTypedRequestBuilder<TResponse = unknown> = Omit<
  IgniterCallerRequestBuilder<TResponse>,
  '_setMethod' | '_setUrl'
>
