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

    // Process path parameters
    const queryParams: Record<string, string | number | boolean> = {}

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        // Check for :key in the URL
        const placeholder = `:${key}`
        if (fullUrl.includes(placeholder)) {
          // Replace all occurrences
          fullUrl = fullUrl.split(placeholder).join(encodeURIComponent(String(value)))
        } else {
          // Keep as query param
          queryParams[key] = value
        }
      })
    }

    if (Object.keys(queryParams).length > 0) {
      const queryString = new URLSearchParams(
        Object.entries(queryParams).map(([key, value]) => [key, String(value)]),
      ).toString()

      fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString
    }

    return fullUrl
  }
}
