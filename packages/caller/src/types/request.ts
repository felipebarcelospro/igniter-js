import type { z } from 'zod'
import type { IgniterCallerHttpMethod } from './http'

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
  responseSchema?: z.ZodSchema<any>
  cache?: RequestCache
}
