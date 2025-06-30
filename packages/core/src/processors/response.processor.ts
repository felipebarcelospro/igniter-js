import { IgniterLogLevel, type IgniterLogger } from "../types"
import { SSEProcessor } from "./sse.processor"
import { IgniterConsoleLogger } from "../services/logger.service"
import type { CookieOptions } from "../types/cookie.interface"
import type { IgniterProcessorResponse, IgniterErrorResponse, IgniterCommonErrorCode } from "../types/response.interface"
import type { IgniterStoreAdapter } from "../types/store.interface"

/**
 * Generic data type for better type safety
 */
export type ResponseData = Record<string, unknown> | unknown[] | string | number | boolean | null

/**
 * Message type for stream filtering and transformation
 */
export interface StreamMessage<TData = ResponseData> {
  channel: string
  data: TData
  type?: string
  timestamp?: string
}

/**
 * Options for creating a Server-Sent Events stream
 */
export interface StreamOptions<TData = ResponseData> {
  /**
   * Channel ID for the SSE stream
   */
  channelId?: string;
  
  /**
   * Controller key for action streams
   */
  controllerKey?: string;
  
  /**
   * Action key for action streams
   */
  actionKey?: string;
  
  /**
   * Custom filter function to process incoming messages
   */
  filter?: (message: StreamMessage<TData>) => boolean;
  
  /**
   * Transform function to modify messages before sending to client
   */
  transform?: <TResult = TData>(message: StreamMessage<TData>) => StreamMessage<TResult>;
  
  /**
   * Initial data to send when connection is established
   */
  initialData?: TData;
}

/**
 * Scope resolver function type
 */
export type ScopeResolver<TContext = unknown> = (context: TContext) => Promise<string[]> | string[]

/**
 * Options for revalidating client cache
 */
export interface RevalidateOptions<TContext = unknown, TData = ResponseData> {
  /**
   * Query keys to invalidate on the client
   */
  queryKeys: string | string[];
  
  /**
   * Optional data to send along with revalidation
   */
  data?: TData;
  
  /**
   * Whether to broadcast to all connected clients (default: true)
   */
  broadcast?: boolean;

  /**
   * List of scopes to invalidate on the client
   */
  scopes?: ScopeResolver<TContext>;
}

/**
 * A builder class for creating and manipulating HTTP responses in the Igniter Framework.
 * Provides a fluent interface for constructing responses with various status codes,
 * headers, cookies, body content, streaming, and cache revalidation.
 *
 * @template TContext - The type of the request context
 * @template TData - The type of response data that will be returned
 *
 * @remarks
 * This class uses the builder pattern to construct responses. Each method returns
 * a new instance with updated types, enabling full type safety throughout the chain.
 * 
 * @example
 * ```typescript
 * // Create a success response with typed data
 * const response = IgniterResponseProcessor.init<MyContext>()
 *   .status(200)
 *   .setCookie('session', 'abc123', { httpOnly: true })
 *   .success({ user: { id: 1, name: 'John' } }) // Now typed as IgniterResponseProcessor<MyContext, { user: { id: number, name: string } }>
 *   .toResponse();
 * ```
 */
export class IgniterResponseProcessor<TContext = unknown, TData = unknown> {
  private _status: number = 200
  private _statusExplicitlySet: boolean = false
  private _response: TData = {} as TData
  private _headers = new Headers()
  private _cookies: string[] = []
  private _isStream: boolean = false
  private _streamOptions?: StreamOptions
  private _revalidateOptions?: RevalidateOptions<TContext>
  private _store?: IgniterStoreAdapter
  private _context?: TContext
  private logger: IgniterLogger = IgniterConsoleLogger.create({
    level: process.env.NODE_ENV === 'production' ? IgniterLogLevel.INFO : IgniterLogLevel.DEBUG,
    context: {
      processor: 'ResponseProcessor',
      package: 'core'
    }
  })
  /**
   * Creates a new instance of IgniterResponseProcessor.
   * Use this method to start building a new response.
   * 
   * @template TContext - The type of the request context
   * @param store - Optional store adapter for streaming and revalidation
   * @param context - Optional context for scoped operations
   * @returns A new IgniterResponseProcessor instance
   * 
   * @example
   * ```typescript
   * const response = IgniterResponseProcessor.init<MyContext>(store, context);
   * ```
   */
  static init<TContext = unknown>(
    store?: IgniterStoreAdapter, 
    context?: TContext
  ): IgniterResponseProcessor<TContext, unknown> {
    const instance = new IgniterResponseProcessor<TContext, unknown>();
    instance._store = store;
    instance._context = context;
    
    return instance;
  }

  /**
   * Creates a new instance with the same configuration but different data type.
   * Internal method used by other methods to preserve type safety.
   * 
   * @template TNewData - The new data type
   * @returns A new typed instance
   * @private
   */
  private withData<TNewData>(): IgniterResponseProcessor<TContext, TNewData> {
    const newInstance = new IgniterResponseProcessor<TContext, TNewData>();
    newInstance._status = this._status;
    newInstance._statusExplicitlySet = this._statusExplicitlySet;
    newInstance._response = {} as TNewData;
    newInstance._headers = new Headers(this._headers);
    newInstance._cookies = [...this._cookies];
    newInstance._isStream = this._isStream;
    newInstance._streamOptions = this._streamOptions;
    newInstance._revalidateOptions = this._revalidateOptions;
    newInstance._store = this._store;
    newInstance._context = this._context;
    newInstance.logger = this.logger;
    return newInstance
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
  status(code: number): this {
    this._status = code
    this._statusExplicitlySet = true
    return this
  }

  /**
   * Creates a Server-Sent Events stream response.
   * Enables real-time communication with the client.
   * 
   * @template TStreamData - Type of the stream data
   * @param options - Stream configuration options
   * @returns New instance configured for streaming with typed data
   * 
   * @example
   * ```typescript
   * response.stream<NotificationData>({
   *   channelId: 'notifications:user:123',
   *   filter: (msg) => msg.data.type === 'important',
   *   transform: (msg) => ({ ...msg, data: { ...msg.data, timestamp: Date.now() } }),
   *   initialData: { status: 'connected' }
   * });
   * ```
   */
  stream<TStreamData = ResponseData>(options: StreamOptions<TStreamData>) {
    // Derive channelId from controller and action if provided
    if (options.controllerKey && options.actionKey && !options.channelId) {
      options.channelId = `action::${options.controllerKey}.${options.actionKey}`;
    }
    
    const newInstance = this.withData<IgniterProcessorResponse<TStreamData, null>>();
    newInstance._isStream = true;
    newInstance._streamOptions = options as StreamOptions<ResponseData>;
    newInstance._status = 200;
    return newInstance;
  }

  /**
   * Triggers cache revalidation on connected clients.
   * Sends invalidation signals to update client-side cache.
   *
   * @param optionsOrKeys - Revalidation configuration options or array of query keys
   * @param scopes - Optional scope resolver function
   * @returns Current instance for chaining
   *
   * @example
   * ```typescript
   * response.revalidate(['users', 'posts'], async (ctx) => [`tenant:${ctx.tenantId}`]);
   * ```
   */
  revalidate(
    optionsOrKeys: RevalidateOptions<TContext> | string[],
    scopes?: ScopeResolver<TContext>
  ): this {
    if (Array.isArray(optionsOrKeys)) {
      this._revalidateOptions = {
        queryKeys: optionsOrKeys,
        data: undefined,
        scopes,
      };
    } else {
      this._revalidateOptions = {
        ...optionsOrKeys,
        scopes: scopes || optionsOrKeys.scopes,
      };
    }

    return this;
  }

  /**
   * Creates a success response with typed data.
   * Sets error to null and includes the provided data.
   * 
   * @template TSuccessData - Type of the success response data
   * @param data - Data to include in the response
   * @returns New instance typed with the success data
   * 
   * @example
   * ```typescript
   * const user = { id: 1, name: 'John' };
   * response.success(user); // Returns IgniterResponseProcessor<TContext, typeof user>
   * ```
   */
  success<TSuccessData>(data?: TSuccessData) {
    const instance = this.withData<IgniterProcessorResponse<TSuccessData, null>>()
    instance._response = {} as IgniterProcessorResponse<TSuccessData, null>;
    instance._response.data = data as TSuccessData;
    instance._response.error = null;
    if (!this._statusExplicitlySet) instance._status = 200;
    return instance;
  }

  /**
   * Creates a 201 Created response with typed data.
   * Useful for responses after resource creation.
   * 
   * @template TCreatedData - Type of the created resource data
   * @param data - Data representing the created resource
   * @returns New instance typed with the created data
   * 
   * @example
   * ```typescript
   * const newUser = { id: 1, status: 'active' };
   * response.created(newUser); // Returns IgniterResponseProcessor<TContext, typeof newUser>
   * ```
   */
  created<TCreatedData>(data: TCreatedData) {
    const instance = this.withData<IgniterProcessorResponse<TCreatedData, null>>()
    instance._response = {} as IgniterProcessorResponse<TCreatedData, null>;
    instance._response.data = data as TCreatedData;
    instance._response.error = null;
    if (!this._statusExplicitlySet) instance._status = 201;
    return instance;
  }

  /**
   * Creates a No Content response.
   * Useful for successful operations that don't return data.
   * Uses status 200 to maintain consistent JSON response structure.
   * 
   * @returns Current instance for chaining
   * 
   * @example
   * ```typescript
   * response.noContent();
   * ```
   */
  noContent() {
    const instance = this.withData<IgniterProcessorResponse<null, null>>()
    instance._response = {} as IgniterProcessorResponse<null, null>;
    instance._response.data = null;
    instance._response.error = null;
    if (!this._statusExplicitlySet) instance._status = 204;
    return instance;
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
  setHeader(name: string, value: string): this {
    this._headers.set(name, value)
    return this;
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
  setCookie(name: string, value: string, options?: CookieOptions): this {
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
    let cookieName = name;
    let cookie = `${cookieName}=${encodeURIComponent(value)}`;
    
    if (options) {
      if (options.maxAge !== undefined) cookie += `; Max-Age=${Math.floor(options.maxAge)}`;
      if (options.domain) cookie += `; Domain=${options.domain}`;
      if (options.path) cookie += `; Path=${options.path}`;
      if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
      if (options.httpOnly) cookie += `; HttpOnly`;
      if (options.secure) cookie += `; Secure`;
      if (options.sameSite) cookie += `; SameSite=${options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1)}`;
      if (options.partitioned) {
        cookie += `; Partitioned`;
        // Partitioned cookies must be Secure
        if (!options.secure) {
          cookie += `; Secure`;
        }
      }
      if (options.prefix) {
        if (options.prefix === "secure") {
          cookieName = `__Secure-${name}`;
        } else if (options.prefix === "host") {
          cookieName = `__Host-${name}`;
          // __Host- cookies must be Secure and have Path=/
          if (!options.secure) {
            cookie += `; Secure`;
          }
          if (!options.path) {
            cookie += `; Path=/`;
          }
        }
        // Rebuild cookie string with correct prefix
        cookie = `${cookieName}=${encodeURIComponent(value)}`;
        if (options.maxAge !== undefined) cookie += `; Max-Age=${Math.floor(options.maxAge)}`;
        if (options.domain && options.prefix !== "host") cookie += `; Domain=${options.domain}`; // __Host- cannot have Domain
        if (options.path || options.prefix === "host") cookie += `; Path=${options.path || '/'}`;
        if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
        if (options.httpOnly) cookie += `; HttpOnly`;
        if (options.secure || options.prefix === "host") cookie += `; Secure`;
        if (options.sameSite) cookie += `; SameSite=${options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1)}`;
        if (options.partitioned) cookie += `; Partitioned`;
      }
    }
    return cookie;
  }

  error<TErrorCode extends string, TData extends ResponseData>(error: {
    code: TErrorCode;
    message: string;
    data?: TData;
  }) {
    const instance = this.withData<IgniterProcessorResponse<null, IgniterErrorResponse<TErrorCode, TData>>>()
    instance._response = {} as IgniterProcessorResponse<null, IgniterErrorResponse<TErrorCode, TData>>;
    instance._response.data = null;
    instance._response.error = error;
    return instance;
  }

  /**
   * Creates a 400 Bad Request response.
   * 
   * @param message - Optional error message
   * @returns New instance typed with BadRequest error
   * 
   * @example
   * ```typescript
   * response.badRequest('Invalid request parameters');
   * ```
   */
  badRequest<TBadRequestData>(message = 'Bad Request', data?: TBadRequestData) {
    const instance = this.withData<IgniterProcessorResponse<null, IgniterErrorResponse<'ERR_BAD_REQUEST', TBadRequestData>>>()
    instance._response = {} as IgniterProcessorResponse<null, IgniterErrorResponse<'ERR_BAD_REQUEST', TBadRequestData>>;
    instance._response.data = null;
    instance._response.error = {} as IgniterErrorResponse<'ERR_BAD_REQUEST', TBadRequestData>;
    instance._response.error.message = message;
    instance._response.error.data = data;
    instance._response.error.code = 'ERR_BAD_REQUEST';
    if (!this._statusExplicitlySet) instance._status = 400;
    return instance;
  }

  /**
   * Creates a 401 Unauthorized response.
   * 
   * @param message - Optional error message
   * @returns New instance typed with Unauthorized error
   * 
   * @example
   * ```typescript
   * response.unauthorized('Invalid credentials');
   * ```
   */
  unauthorized<TUnauthorizedData>(message = 'Unauthorized', data?: TUnauthorizedData) {
    const instance = this.withData<IgniterProcessorResponse<null, IgniterErrorResponse<'ERR_UNAUTHORIZED', TUnauthorizedData>>>()
    instance._response = {} as IgniterProcessorResponse<null, IgniterErrorResponse<'ERR_UNAUTHORIZED', TUnauthorizedData>>;
    instance._response.data = null;
    instance._response.error = {} as IgniterErrorResponse<'ERR_UNAUTHORIZED', TUnauthorizedData>;
    instance._response.error.message = message;
    instance._response.error.data = data;
    instance._response.error.code = 'ERR_UNAUTHORIZED';
    if (!this._statusExplicitlySet) instance._status = 401;
    return instance;
  }

  /**
   * Creates a 403 Forbidden response.
   * 
   * @param message - Optional error message
   * @returns New instance typed with Forbidden error
   * 
   * @example
   * ```typescript
   * response.forbidden('Access denied');
   * ```
   */
  forbidden<TForbiddenData>(message = 'Forbidden', data?: TForbiddenData) {
    const instance = this.withData<IgniterProcessorResponse<null, IgniterErrorResponse<'ERR_FORBIDDEN', TForbiddenData>>>()
    instance._response = {} as IgniterProcessorResponse<null, IgniterErrorResponse<'ERR_FORBIDDEN', TForbiddenData>>;
    instance._response.data = null;
    instance._response.error = {} as IgniterErrorResponse<'ERR_FORBIDDEN', TForbiddenData>;
    instance._response.error.message = message;
    instance._response.error.data = data;
    instance._response.error.code = 'ERR_FORBIDDEN';
    if (!this._statusExplicitlySet) instance._status = 403;
    return instance;
  }

  /**
   * Creates a 404 Not Found response.
   * 
   * @param message - Optional error message
   * @returns New instance typed with NotFound error
   * 
   * @example
   * ```typescript
   * response.notFound('User not found');
   * ```
   */
  notFound<TNotFoundData>(message = 'Not Found', data?: TNotFoundData) {
    const instance = this.withData<IgniterProcessorResponse<null, IgniterErrorResponse<'ERR_NOT_FOUND', TNotFoundData>>>()
    instance._response = {} as IgniterProcessorResponse<null, IgniterErrorResponse<'ERR_NOT_FOUND', TNotFoundData>>;
    instance._response.data = null;
    instance._response.error = {} as IgniterErrorResponse<'ERR_NOT_FOUND', TNotFoundData>;
    instance._response.error.message = message;
    instance._response.error.data = data;
    instance._response.error.code = 'ERR_NOT_FOUND';
    if (!this._statusExplicitlySet) instance._status = 404;
    return instance;
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
    type RedirectData = {
      destination: string;
      type: 'replace' | 'push';
    }

    const instance = this.withData<IgniterProcessorResponse<null, IgniterErrorResponse<'ERR_REDIRECT', RedirectData>>>()
    instance._response = {} as IgniterProcessorResponse<null, IgniterErrorResponse<'ERR_REDIRECT', RedirectData>>;
    instance._response.data = null;
    instance._response.error = {} as IgniterErrorResponse<'ERR_REDIRECT', RedirectData>;
    instance._response.error.message = 'Redirect';
    instance._response.error.data = { destination, type };
    instance._response.error.code = 'ERR_REDIRECT';
    if (!this._statusExplicitlySet) instance._status = 302;
    return instance;
  }

  /**
   * Creates a JSON response with typed data.
   * 
   * @template TJsonData - Type of the JSON response data
   * @param data - Data to be serialized as JSON
   * @returns New instance typed with the JSON data
   * 
   * @example
   * ```typescript
   * const result = { status: 'success', data: results };
   * response.json(result); // Returns IgniterResponseProcessor<TContext, typeof result>
   * ```
   */
  json<TJsonData>(data: TJsonData) {
    const instance = this.withData<IgniterProcessorResponse<TJsonData, null>>()
    instance._response = {} as IgniterProcessorResponse<TJsonData, null>;
    instance._response.data = data as TJsonData;
    instance._response.error = null;
    if (!this._statusExplicitlySet) instance._status = 200;
    return instance;
  }

  /**
   * Handles cache revalidation by publishing to Redis channels.
   * Internal method called during response processing.
   * 
   * @private
   */
  private async handleRevalidation(): Promise<void> {
    if (!this._revalidateOptions) return;

    const { queryKeys, data, scopes } = this._revalidateOptions;
    const keysArray = Array.isArray(queryKeys) ? queryKeys : [queryKeys];
    
    // Resolve scope IDs if scopes function is provided
    let scopeIds: string[] | undefined;
    if (scopes && this._context) {
      try {
        scopeIds = await scopes(this._context);
      } catch (error) {
        this.logger.error('Error resolving scopes:', error);
        // Continue without scopes if resolution fails
      }
    }

    const clientCount = SSEProcessor.publishEvent({
      channel: 'revalidation',
      type: 'revalidate',
      scopes: scopeIds, // Use subscribers for scoped revalidation
      data: { 
        queryKeys: keysArray, 
        data, 
        timestamp: new Date().toISOString() 
      },
    });

    if (process.env.NODE_ENV === 'development') {
      this.logger.info(`Scoped revalidation: ${clientCount} clients`, {
        queryKeys: keysArray,
        scopes: scopeIds
      });
    }
  }

  

  /**
   * Creates a Server-Sent Events stream.
   * Internal method for handling streaming responses.
   * 
   * @private
   */
  private createStream(): Response {
    if (!this._streamOptions) {
      throw new Error('Stream options are required for streaming responses');
    }

    const { channelId, initialData } = this._streamOptions;
    const headers = this._headers;

    // For backward compatibility, we'll redirect the client to the central SSE endpoint
    // This allows us to keep the API surface the same while migrating to the new architecture
    if (process.env.NODE_ENV === 'development') {
      this.logger.info(`Creating stream response with channelId: ${channelId}`);
    }

    if (!channelId) {
      throw new Error('Channel ID is required for streaming responses');
    }

    // Check if the channel exists, register it if not
    if (!SSEProcessor.channelExists(channelId)) {
      SSEProcessor.registerChannel({
        id: channelId,
        description: `Dynamic channel created by IgniterResponseProcessor`
      });
      if (process.env.NODE_ENV === 'development') {
        this.logger.info(`Registered new SSE channel: ${channelId}`);
      }
    }

    // If initial data is provided, publish it to the channel
    if (initialData) {
      if (process.env.NODE_ENV === 'development') {
        this.logger.info(`Publishing initial data to channel ${channelId}:`, initialData);
      }
      SSEProcessor.publishEvent({
        channel: channelId,
        type: 'data',
        data: initialData
      });
    }

    // In the new architecture, we'll return a JSON response with connection information
    // The client will connect to the central SSE endpoint with the provided channel
    const responseData = {
      type: 'stream',
      channelId,
      connectionInfo: {
        endpoint: '/api/v1/sse/events', // Base path should be configurable
        params: {
          channels: channelId
        }
      },
      timestamp: new Date().toISOString()
    };

    // Return a regular JSON response with connection information
    return new Response(JSON.stringify({
      error: null,
      data: responseData
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(headers.entries())
      },
    });
  }

  /**
   * Safe JSON stringify that handles circular references and special values
   * @private
   */
  private safeStringify(obj: any): string {
    const seen = new Set();
    try {
      return JSON.stringify(obj, (key, value) => {
        // Handle circular references
        if (value !== null && typeof value === "object") {
          if (seen.has(value)) {
            return "[Circular]";
          }
          seen.add(value);
        }
        return value;
      });
    } catch (error) {
      this.logger.warn('Failed to stringify response data, using fallback', { error });
      return JSON.stringify({ error: 'Failed to serialize response data' });
    }
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
  async toResponse(): Promise<Response> {
    // Handle revalidation first
    await this.handleRevalidation();

    // If this is a streaming response, handle it with the new SSE system
    if (this._isStream) {
      return this.createStream();
    }

    // Standard JSON response
    const headers = new Headers(this._headers);

    for (const cookie of this._cookies) {
      headers.append("Set-Cookie", cookie);
    }

    headers.set("Content-Type", "application/json");

    const response = this._response

    return new Response(this.safeStringify(response), {
      status: this._status,
      headers,
    });
  }
}