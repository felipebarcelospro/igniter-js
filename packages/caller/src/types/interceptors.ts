import type { IgniterCallerRequestOptions } from './request'
import type { IgniterCallerApiResponse } from './response'

/**
 * Function that can modify request configuration before execution.
 */
export type IgniterCallerRequestInterceptor = (
  config: IgniterCallerRequestOptions,
) => Promise<IgniterCallerRequestOptions> | IgniterCallerRequestOptions

/**
 * Function that can transform responses after execution.
 */
export type IgniterCallerResponseInterceptor = <T>(
  response: IgniterCallerApiResponse<T>,
) => Promise<IgniterCallerApiResponse<T>> | IgniterCallerApiResponse<T>
