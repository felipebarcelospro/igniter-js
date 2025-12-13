/**
 * Response object containing either successful data or an error.
 */
export interface IgniterCallerApiResponse<T> {
  data?: T
  error?: Error
}

/**
 * Response object for file downloads.
 */
export interface IgniterCallerFileResponse {
  file: File | null
  error: Error | null
}
