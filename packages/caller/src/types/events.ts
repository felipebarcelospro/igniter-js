import type { IgniterCallerApiResponse } from './response'

/**
 * Callback function for event listeners.
 */
export type IgniterCallerEventCallback<T = any> = (
  result: IgniterCallerApiResponse<T>,
  context: {
    url: string
    method: string
    timestamp: number
  },
) => void | Promise<void>

/**
 * Pattern for matching URLs (string or RegExp).
 */
export type IgniterCallerUrlPattern = string | RegExp
