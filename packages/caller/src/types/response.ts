/**
 * Response object containing either successful data or an error.
 */
export interface IgniterCallerApiResponse<T> {
  data?: T
  error?: Error
  /** HTTP status code from the response */
  status?: number
  /** Response headers */
  headers?: Headers
}

/**
 * Response object for file downloads.
 * @deprecated Use execute() with responseType<File>() instead
 */
export interface IgniterCallerFileResponse {
  file: File | null
  error: Error | null
}

/**
 * Supported response content types that can be auto-detected.
 */
export type IgniterCallerResponseContentType =
  | 'json'
  | 'xml'
  | 'csv'
  | 'text'
  | 'html'
  | 'blob'
  | 'stream'
  | 'arraybuffer'
  | 'formdata'

/**
 * Content types that support schema validation.
 */
export type IgniterCallerValidatableContentType = 'json' | 'xml' | 'csv'

/**
 * Marker types for responseType() to indicate expected response format.
 * These are used for typing only and don't affect runtime behavior.
 */
export type IgniterCallerResponseMarker =
  | File
  | Blob
  | ReadableStream
  | ArrayBuffer
  | FormData
