/**
 * Body utilities for `IgniterCaller`.
 */
export class IgniterCallerBodyUtils {
  /**
   * Returns true when the request body should be passed to `fetch` as-is.
   *
   * @param body - Request body to inspect.
   * @returns True if the body should be sent as raw data.
   */
  static isRawBody(body: unknown): boolean {
    if (!body) return false

    if (typeof FormData !== 'undefined' && body instanceof FormData) return true
    if (typeof Blob !== 'undefined' && body instanceof Blob) return true
    if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer)
      return true
    if (
      typeof URLSearchParams !== 'undefined' &&
      body instanceof URLSearchParams
    )
      return true
    if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream)
      return true

    // Node Buffer
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(body)) return true

    // DataView, Int8Array, etc.
    if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(body as any))
      return true

    return false
  }

  /**
   * Removes Content-Type for FormData so fetch can set boundaries automatically.
   *
   * @param headers - Request headers map.
   * @param body - Request body.
   * @returns Updated headers without Content-Type when needed.
   */
  static normalizeHeadersForBody(
    headers: Record<string, string> | undefined,
    body: unknown,
  ): Record<string, string> | undefined {
    if (!headers) return headers

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
    if (!isFormData) return headers

    if (!('Content-Type' in headers)) return headers

    const { 'Content-Type': _contentType, ...rest } = headers
    return rest
  }
}
