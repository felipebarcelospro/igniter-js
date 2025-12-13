import type { IgniterLogger } from '@igniter-js/core'
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
 * Fluent request builder for `IgniterCaller`.
 */
export class IgniterCallerRequestBuilder {
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

  constructor(params: {
    baseURL?: string
    defaultHeaders?: Record<string, string>
    defaultCookies?: Record<string, string>
    logger?: IgniterLogger
    requestInterceptors?: IgniterCallerRequestInterceptor[]
    responseInterceptors?: IgniterCallerResponseInterceptor[]
    eventEmitter?: (url: string, method: string, result: any) => Promise<void>
    schemas?: IgniterCallerSchemaMap
    schemaValidation?: IgniterCallerSchemaValidationOptions
  }) {
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
   * Overrides the logger for this request chain.
   */
  withLogger(logger: IgniterLogger): this {
    this.logger = logger
    return this
  }

  method(method: IgniterCallerHttpMethod): this {
    this.options.method = method
    return this
  }

  url(url: string): this {
    this.options.url = url
    return this
  }

  body<TBody>(body: TBody): this {
    this.options.body = body
    return this
  }

  params(params: Record<string, string | number | boolean>): this {
    this.options.params = params
    return this
  }

  headers(headers: Record<string, string>): this {
    this.options.headers = { ...this.options.headers, ...headers }
    return this
  }

  timeout(timeout: number): this {
    this.options.timeout = timeout
    return this
  }

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

  responseType<T>(schema?: z.ZodSchema<T>): this {
    this.options.responseSchema = schema
    return this
  }

  /**
   * Downloads a file via GET request.
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

  async execute<T = unknown>(): Promise<IgniterCallerApiResponse<T>> {
    // Check cache first if cache key is provided
    const effectiveCacheKey = this.cacheKey || this.options.url
    if (effectiveCacheKey && this.staleTime) {
      const cached = await IgniterCallerCacheUtils.get<T>(
        effectiveCacheKey,
        this.staleTime,
      )
      if (cached !== undefined) {
        this.logger?.debug('IgniterCaller.execute cache hit', {
          key: effectiveCacheKey,
        })
        const cachedResult = { data: cached, error: undefined }
        // Emit event for cached response
        await this.emitEvent(cachedResult)
        return cachedResult
      }
    }

    // Execute with retry logic
    const result = await this.executeWithRetry<T>()

    // Apply fallback if request failed
    if (result.error && this.fallbackFn) {
      this.logger?.debug('IgniterCaller.execute applying fallback', {
        error: result.error,
      })
      const fallbackResult = { data: this.fallbackFn() as T, error: undefined }
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

  private async executeWithRetry<T>(): Promise<IgniterCallerApiResponse<T>> {
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

      const result = await this.executeSingleRequest<T>()

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

  private async executeSingleRequest<T>(): Promise<
    IgniterCallerApiResponse<T>
  > {
    const { responseSchema } = this.options
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
        }
      }

      const contentType = httpResponse.headers.get('content-type')
      const data: unknown = contentType?.includes('application/json')
        ? await httpResponse.json()
        : await httpResponse.text()

      // Validate response using StandardSchemaV1 if schemas exist
      let validatedData: unknown = data
      if (this.schemas) {
        const { schema: endpointSchema } = IgniterCallerSchemaUtils.findSchema(
          this.schemas,
          url,
          this.options.method,
        )

        const responseSchema =
          endpointSchema?.responses?.[httpResponse.status]

        if (responseSchema) {
          try {
            validatedData = await IgniterCallerSchemaUtils.validateResponse(
              data,
              responseSchema,
              httpResponse.status,
              this.schemaValidation,
              { url, method: this.options.method },
              this.logger,
            )
          } catch (error) {
            // Validation failed in strict mode
            return {
              data: undefined,
              error: error as IgniterCallerError,
            }
          }
        }
      }

      // Legacy Zod support (if responseSchema option is used)
      if (responseSchema) {
        const result = responseSchema.safeParse(data)
        if (!result.success) {
          return {
            data: undefined,
            error: new IgniterCallerError({
              code: 'IGNITER_CALLER_RESPONSE_VALIDATION_FAILED',
              operation: 'parseResponse',
              message: `Response validation failed: ${result.error.message}`,
              logger: this.logger,
              statusCode: 500,
              metadata: {
                method: this.options.method,
                url,
              },
              cause: result.error,
            }),
          }
        }

        let response: IgniterCallerApiResponse<T> = {
          data: result.data as T,
          error: undefined,
        }

        // Apply response interceptors
        if (this.responseInterceptors && this.responseInterceptors.length > 0) {
          for (const interceptor of this.responseInterceptors) {
            response = await interceptor(response)
          }
        }

        return response
      }

      let response: IgniterCallerApiResponse<T> = {
        data: validatedData as T,
        error: undefined,
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

    const fullUrl = IgniterCallerUrlUtils.buildUrl({
      url,
      baseURL,
      query: params,
    })

    const rawBody = IgniterCallerBodyUtils.isRawBody(body)
    const finalHeaders = IgniterCallerBodyUtils.normalizeHeadersForBody(
      headers,
      body,
    )

    const requestInit: RequestInit = {
      method,
      headers: finalHeaders,
      cache,
      ...(body && method !== 'GET' && method !== 'HEAD'
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
  private async emitEvent<T>(
    result: IgniterCallerApiResponse<T>,
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
