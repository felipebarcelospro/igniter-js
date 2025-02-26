import type { CookieOptions } from "../types/cookie.interface"
import type { IgniterResponse } from "../types/response.interface"

export type InferResponse<T> = T

/**
 * A builder class for creating and manipulating HTTP responses in the Igniter Framework.
 * Provides a fluent interface for constructing responses with various status codes,
 * headers, cookies, and body content.
 *
 * @remarks
 * This class uses the builder pattern to construct responses. Each method returns
 * the instance for method chaining, and the final response is generated using toResponse().
 * 
 * @example
 * ```typescript
 * // Create a success response with data
 * const response = IgniterResponseProcessor.init()
 *   .status(200)
 *   .setCookie('session', 'abc123', { httpOnly: true })
 *   .success({ user: { id: 1, name: 'John' } })
 *   .toResponse();
 * 
 * // Create an error response
 * const errorResponse = IgniterResponseProcessor.init()
 *   .status(400)
 *   .badRequest('Invalid input')
 *   .toResponse();
 * ```
 */
export class IgniterResponseProcessor {
  private _status: number = 200
  private _response = {} as IgniterResponse
  private _headers = new Headers()
  private _cookies: string[] = []

  /**
   * Creates a new instance of IgniterResponseProcessor.
   * Use this method to start building a new response.
   * 
   * @returns A new IgniterResponseProcessor instance
   * 
   * @example
   * ```typescript
   * const response = IgniterResponseProcessor.init();
   * ```
   */
  static init() {
    return new IgniterResponseProcessor()
  }

  /**
   * Sets the HTTP status code for the response.
   * 
   * @param code - HTTP status code (e.g., 200, 201, 400, etc.)
   * @returns Current instance for chaining
   * 
   * @example
   * ```typescript
   * response.status(201).success(createdUser);
   * ```
   */
  status(code: number) {
    this._status = code
    return this
  }

  /**
   * Creates a success response with optional data.
   * Sets error to null and includes the provided data.
   * 
   * @template T - Type of the response data
   * @param data - Optional data to include in the response
   * @returns Response object with the success data
   * 
   * @example
   * ```typescript
   * response.success({ id: 1, name: 'John' });
   * ```
   */
  success<T>(data?: T) {
    this._response.error = null
    // @ts-expect-error - data can be undefined
    this._response.data = data
    this._status = this._status || 200
    return this as unknown as IgniterResponse<T>
  }

  /**
   * Creates a 201 Created response with optional data.
   * Useful for responses after resource creation.
   * 
   * @template T - Type of the response data
   * @param data - Optional data representing the created resource
   * @returns Response object with created status and data
   * 
   * @example
   * ```typescript
   * response.created({ id: 1, status: 'active' });
   * ```
   */
  created<T>(data?: T) {
    this._response.error = null
    // @ts-expect-error - data can be undefined
    this._response.data = data
    this._status = 201
    return this as unknown as IgniterResponse<T>
  }

  /**
   * Creates a 204 No Content response.
   * Useful for successful operations that don't return data.
   * 
   * @returns Response object with 204 status
   * 
   * @example
   * ```typescript
   * response.noContent();
   * ```
   */
  noContent() {
    this._response.error = null
    this._status = 204
    return this as unknown as IgniterResponse<null>
  }

  /**
   * Sets a header in the response.
   * 
   * @param name - Header name
   * @param value - Header value
   * @returns Current instance for chaining
   * 
   * @example
   * ```typescript
   * response.setHeader('Cache-Control', 'no-cache');
   * ```
   */
  async setHeader(name: string, value: string) {
    this._headers.set(name, value)
    return this
  }

  /**
   * Sets a cookie in the response.
   * 
   * @param name - Cookie name
   * @param value - Cookie value
   * @param options - Optional cookie configuration
   * @returns Current instance for chaining
   * 
   * @example
   * ```typescript
   * response.setCookie('session', token, {
   *   httpOnly: true,
   *   secure: true,
   *   maxAge: 3600
   * });
   * ```
   */
  async setCookie(name: string, value: string, options?: CookieOptions) {
    const cookie = this.buildCookieString(name, value, options)
    this._cookies.push(cookie)
    return this
  }

  /**
   * Builds a cookie string with the provided options.
   * Internal helper method for cookie serialization.
   * 
   * @param name - Cookie name
   * @param value - Cookie value
   * @param options - Cookie options
   * @returns Serialized cookie string
   * 
   * @private
   */
  private buildCookieString(name: string, value: string, options?: CookieOptions): string {
    let cookie = `${name}=${encodeURIComponent(value)}`
    if (options) {
      if (options.maxAge !== undefined) cookie += `; Max-Age=${Math.floor(options.maxAge)}`
      if (options.domain) cookie += `; Domain=${options.domain}`
      if (options.path) cookie += `; Path=${options.path}`
      if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`
      if (options.httpOnly) cookie += `; HttpOnly`
      if (options.secure) cookie += `; Secure`
      if (options.sameSite) cookie += `; SameSite=${options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1)}`
      // Se for utilizado um prefixo, pode ser tratado aqui (ex: __Secure- ou __Host-)
      if (options.prefix) {
        if (options.prefix === "secure") {
          cookie = `__Secure-${cookie}`
        } else if (options.prefix === "host") {
          cookie = `__Host-${cookie}`
        }
      }
    }
    return cookie
  }

  /**
   * Creates an error response with custom error details.
   * 
   * @param error - Error configuration object
   * @param error.status - HTTP status code
   * @param error.code - Error code
   * @param error.message - Optional error message
   * @param error.data - Optional additional error data
   * @returns Current instance for chaining
   * 
   * @example
   * ```typescript
   * response.error({
   *   status: 400,
   *   code: 'VALIDATION_ERROR',
   *   message: 'Invalid input',
   *   data: { field: 'email' }
   * });
   * ```
   */
  error(error: { status: number, code: string, message?: string, data?: any }) {
    this._status = error.status
    this._response.error = {
      code: 'ERR_UNKNOWN_ERROR',
      data: {
        message: error.message ?? 'Unknown Error',
        details: error.data
      }
    }
    return this
  }

  /**
   * Creates a 400 Bad Request response.
   * 
   * @param message - Optional error message
   * @returns Current instance for chaining
   * 
   * @example
   * ```typescript
   * response.badRequest('Invalid request parameters');
   * ```
   */
  badRequest(message = 'Bad Request') {
    this._status = 400
    this._response.error = {
      code: 'ERR_BAD_REQUEST',
      data: { message }
    }
    return this as unknown as IgniterResponse<null>
  }

  /**
   * Creates a 401 Unauthorized response.
   * 
   * @param message - Optional error message
   * @returns Current instance for chaining
   * 
   * @example
   * ```typescript
   * response.unauthorized('Invalid credentials');
   * ```
   */
  unauthorized(message = 'Unauthorized') {
    this._status = 401
    this._response.error = {
      code: 'ERR_UNAUTHORIZED',
      data: { message }
    }
    return this as unknown as IgniterResponse<null>
  }

  /**
   * Creates a 403 Forbidden response.
   * 
   * @param message - Optional error message
   * @returns Current instance for chaining
   * 
   * @example
   * ```typescript
   * response.forbidden('Access denied');
   * ```
   */
  forbidden(message = 'Forbidden') {
    this._status = 403
    this._response.error = {
      code: 'ERR_FORBIDDEN',
      data: { message }
    }
    return this as unknown as IgniterResponse<null>
  }

  /**
   * Creates a 404 Not Found response.
   * 
   * @param message - Optional error message
   * @returns Current instance for chaining
   * 
   * @example
   * ```typescript
   * response.notFound('User not found');
   * ```
   */
  notFound(message = 'Not Found') {
    this._status = 404
    this._response.error = {
      code: 'ERR_NOT_FOUND',
      data: { message }
    }
    return this as unknown as IgniterResponse<null>
  }

  /**
   * Creates a redirect response.
   * 
   * @param destination - URL to redirect to
   * @param type - Type of redirect ('replace' or 'push')
   * @returns Current instance for chaining
   * 
   * @example
   * ```typescript
   * response.redirect('/dashboard', 'push');
   * ```
   */
  redirect(destination: string, type: 'replace' | 'push' = 'replace') {
    this._status = 302
    this._response.error = {
      code: 'ERR_REDIRECT',
      data: { destination, type }
    }

    return this as unknown as IgniterResponse<null>
  }

  /**
   * Creates a JSON response with the provided data.
   * 
   * @template T - Type of the response data
   * @param data - Data to be serialized as JSON
   * @returns Response object with JSON data
   * 
   * @example
   * ```typescript
   * response.json({ status: 'success', data: results });
   * ```
   */
  json<T>(data: T): IgniterResponse<T> {
    // @ts-expect-error - data can be undefined
    this._response.data = data
    this._response.error = null
    return this as unknown as IgniterResponse<T>
  }

  /**
   * Builds and returns the final response object.
   * Combines all the configured options into a Web API Response.
   * 
   * @returns Web API Response object
   * 
   * @example
   * ```typescript
   * const finalResponse = response
   *   .success(data)
   *   .setCookie('session', token)
   *   .toResponse();
   * ```
   */
  toResponse(): Response {
    const headers = new Headers(this._headers)

    for (const cookie of this._cookies) {
      headers.append("Set-Cookie", cookie)
    }

    if(this._response.error) {
      headers.set("Content-Type", "application/json")

      return new Response(JSON.stringify({ data: null, error: this._response.error }), {
        status: this._status,
        headers,
      })
    }

    if(this._response.data) {
      headers.set("Content-Type", "application/json")
      
      return new Response(JSON.stringify({ data: this._response.data, error: null }), {
        status: this._status,
        headers,
      })
    }

    return new Response(null, {
      status: this._status,
      headers,
    })
  }
}