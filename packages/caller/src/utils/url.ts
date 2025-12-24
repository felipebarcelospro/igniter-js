/**
 * URL utilities for `IgniterCaller`.
 */
export class IgniterCallerUrlUtils {
  /**
   * Builds a full URL with optional base URL and query parameters.
   *
   * @param params - URL construction parameters.
   * @returns Full URL string.
   */
  static buildUrl(params: {
    url: string
    baseURL?: string
    query?: Record<string, string | number | boolean>
  }): string {
    const { url, baseURL, query } = params

    // If url is absolute, disregard baseURL
    let fullUrl = url
    if (baseURL && !/^https?:\/\//i.test(url)) {
      fullUrl = baseURL + url
    }

    if (query && Object.keys(query).length > 0) {
      const queryParams = new URLSearchParams(
        Object.entries(query).map(([key, value]) => [key, String(value)]),
      ).toString()

      fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryParams
    }

    return fullUrl
  }
}
