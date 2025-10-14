/**
 * Lightweight try/catch helper to eliminate repetitive boilerplate while keeping
 * explicit control over error handling flows.
 *
 * Usage patterns:
 *
 * 1. Passing a promise:
 *    const { data, error } = await tryCatch(fetchSomething())
 *
 * 2. Passing a lazy async function (only executed inside the helper):
 *    const { data, error } = await tryCatch(async () => await fetchSomething())
 *
 * 3. Unwrapping (will throw if error is present):
 *    const value = unwrapOrThrow(await tryCatch(fetchSomething()))
 *
 * Design goals:
 *  - Do NOT swallow errors silently.
 *  - Provide a clear, discriminated-style result object.
 *  - Avoid exceptions in calling code branches where a recoverable path exists.
 *  - Keep it framework‑agnostic & side‑effect free (no logging here).
 *
 * This utility intentionally avoids clever magic:
 *  - It never mutates the error.
 *  - It does not log (caller decides logging concerns).
 *  - It does not attempt retry logic (compose that externally if needed).
 */

export interface TryCatchResult<T> {
  /**
   * Successful resolved value.
   * Present only when the operation succeeded.
   */
  data?: T
  /**
   * Captured error (unknown safe). Present only when the operation failed.
   */
  error?: unknown
}

/**
 * Type guard to check if the result represents an error state.
 */
export function isTryCatchError<T>(
  result: TryCatchResult<T>,
): result is { error: unknown; data?: undefined } {
  return typeof result !== 'undefined' && 'error' in result && result.error !== undefined
}

/**
 * Type guard to check if the result represents a success state.
 */
export function isTryCatchSuccess<T>(
  result: TryCatchResult<T>,
): result is { data: T; error?: undefined } {
  return typeof result !== 'undefined' && 'data' in result && result.data !== undefined
}

/**
 * Core helper: executes an async operation (promise or function returning a promise)
 * and returns a result object containing either `data` or `error`.
 *
 * It guarantees mutual exclusivity: never both `data` and `error`.
 *
 * @example
 *   const { data, error } = await tryCatch(fetchUser(id))
 *   if (error) return handle(error)
 *   return doSomething(data)
 */
export async function tryCatch<T>(
  input: Promise<T> | (() => Promise<T>),
): Promise<TryCatchResult<T>> {
  try {
    const value = await (typeof input === 'function' ? input() : input)
    return { data: value }
  } catch (err) {
    return { error: err }
  }
}

/**
 * Unwraps a TryCatchResult, throwing if it contains an error.
 *
 * Use this when you want linear code flow but still leverage the helper
 * upstream (e.g., to capture metrics, logs, etc.).
 */
export function unwrapOrThrow<T>(result: TryCatchResult<T>): T {
  if (isTryCatchError(result)) {
    // Re-throw original error (preserve stack)
    throw result.error
  }
  return result.data as T
}

/**
 * Convenience helper to provide a fallback value when operation fails.
 *
 * @example
 *   const user = withFallback(await tryCatch(fetchUser(id)), { id: 'anonymous' })
 */
export function withFallback<T>(result: TryCatchResult<T>, fallback: T): T {
  return isTryCatchSuccess(result) ? result.data : fallback
}

/**
 * Maps the successful value without touching the error branch.
 *
 * @example
 *   const upperName = mapSuccess(await tryCatch(getName()), n => n.toUpperCase())
 */
export function mapSuccess<T, R>(
  result: TryCatchResult<T>,
  mapper: (value: T) => R,
): TryCatchResult<R> {
  if (isTryCatchSuccess(result)) {
    try {
      return { data: mapper(result.data) }
    } catch (err) {
      return { error: err }
    }
  }
  return { error: result.error }
}

/**
 * Chains another async operation if the previous one succeeded.
 *
 * @example
 *   const step1 = await tryCatch(fetchUser(id))
 *   const step2 = await andThen(step1, user => fetchProfile(user.profileId))
 */
export async function andThen<T, R>(
  result: TryCatchResult<T>,
  next: (value: T) => Promise<R>,
): Promise<TryCatchResult<R>> {
  if (isTryCatchError(result)) return { error: result.error }
  try {
    return { data: await next(result.data as T) }
  } catch (err) {
    return { error: err }
  }
}

/**
 * Converts unknown errors into a normalized Error instance.
 * Consumers can opt into this if they want consistent error shapes.
 */
export function normalizeError(err: unknown): Error {
  if (err instanceof Error) return err
  return new Error(
    typeof err === 'string'
      ? err
      : `Unknown error: ${JSON.stringify(err, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))}`,
  )
}
