import type { StandardSchemaV1 } from '@igniter-js/core'
import type { z } from 'zod'
import type { IgniterCallerHttpMethod } from './http'
import type { IgniterCallerRetryOptions } from './retry'

/**
 * Base configuration options for HTTP requests.
 */
export interface IgniterCallerBaseRequestOptions {
  /** Base URL for all requests (e.g. `https://api.example.com`). */
  baseURL?: string
  /** Default headers merged into each request. */
  headers?: Record<string, string>
  /** Request timeout in milliseconds (default: 30000). */
  timeout?: number
}

/**
 * Complete request configuration extending base options.
 */
export interface IgniterCallerRequestOptions<TBody = unknown>
  extends IgniterCallerBaseRequestOptions {
  method: IgniterCallerHttpMethod
  /** Endpoint URL path. If absolute, `baseURL` is ignored. */
  url: string
  body?: TBody
  params?: Record<string, string | number | boolean>
  responseSchema?: z.ZodSchema<any> | StandardSchemaV1
  cache?: RequestCache
}

/**
 * Options for the direct request() method (axios-style).
 * All options in one object, executes immediately.
 */
export interface IgniterCallerDirectRequestOptions<TBody = unknown>
  extends IgniterCallerBaseRequestOptions {
  /** HTTP method (GET, POST, PUT, PATCH, DELETE, HEAD) */
  method: IgniterCallerHttpMethod
  /** Endpoint URL path. If absolute, `baseURL` is ignored. */
  url: string
  /** Request body (for POST, PUT, PATCH) */
  body?: TBody
  /** URL query parameters */
  params?: Record<string, string | number | boolean>
  /** Cookies to send with the request */
  cookies?: Record<string, string>
  /** Response validation schema (Zod or any StandardSchemaV1 implementation) */
  responseSchema?: z.ZodSchema<any> | StandardSchemaV1
  /** Cache strategy */
  cache?: RequestCache
  /** Cache key for stale-while-revalidate */
  cacheKey?: string
  /** Stale time in milliseconds for caching */
  staleTime?: number
  /** Retry configuration */
  retry?: IgniterCallerRetryOptions
  /** Fallback value if request fails */
  fallback?: () => any
}
