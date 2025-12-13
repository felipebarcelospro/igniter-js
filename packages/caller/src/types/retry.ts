/**
 * Retry configuration for failed requests.
 */
export interface IgniterCallerRetryOptions {
  /** Maximum number of retry attempts. */
  maxAttempts: number
  /** Backoff strategy between retries. */
  backoff?: 'linear' | 'exponential'
  /** Base delay in milliseconds (default: 1000). */
  baseDelay?: number
  /** HTTP status codes that should trigger a retry (default: [408, 429, 500, 502, 503, 504]). */
  retryOnStatus?: number[]
}
