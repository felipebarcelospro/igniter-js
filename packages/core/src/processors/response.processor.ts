import { SSEProcessor } from "./sse.processor";
import type { CookieOptions } from "../types/cookie.interface";
import {
  IgniterCommonErrorCode,
  IgniterResponseError,
  IgniterResponse,
} from "../types/response.interface";
import type { IgniterStoreAdapter } from "../types/store.interface";
import type { IgniterLogger } from "../types";
import type { IgniterTelemetryProvider } from "../types/telemetry.interface";
import { TelemetryManagerProcessor } from "./telemetry-manager.processor";

/**
 * Generic data type for better type safety
 */
export type ResponseData =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

/**
 * Message type for stream filtering and transformation
 */
export interface StreamMessage<TData = ResponseData> {
  channel: string;
  data: TData;
  type?: string;
  timestamp?: string;
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
  transform?: <TResult = TData>(
    message: StreamMessage<TData>,
  ) => StreamMessage<TResult>;

  /**
   * Initial data to send when connection is established
   */
  initialData?: TData;
}

/**
 * Scope resolver function type
 */
export type ScopeResolver<TContext = unknown> = (
  context: TContext,
) => Promise<string[]> | string[];

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
export class IgniterResponseProcessor<TContext = unknown> {
  private _status: number = 200;
  private _statusExplicitlySet: boolean = false;
  private _response = {} as IgniterResponse;
  private _headers = new Headers();
  private _cookies: string[] = [];
  private _isStream: boolean = false;
  private _streamOptions?: StreamOptions;
  private _revalidateOptions?: RevalidateOptions<TContext>;
  private _store?: IgniterStoreAdapter;
  private _context?: TContext;
  private _logger?: IgniterLogger;
  private _telemetry?: IgniterTelemetryProvider | null;

  /**
   * Creates a new instance of IgniterResponseProcessor.
   * Use this method to start building a new response.
   *
   * @template TContext - The type of the request context
   * @param store - Optional store adapter for streaming and revalidation
   * @param context - Optional context for scoped operations
   * @param logger - Optional logger instance
   * @param telemetry - Optional telemetry provider for metrics
   * @returns A new IgniterResponseProcessor instance
   *
   * @example
   * ```typescript
   * const response = IgniterResponseProcessor.init<MyContext>(store, context, logger);
   * ```
   */
  static init<TContext = unknown>(
    store?: IgniterStoreAdapter,
    context?: TContext,
    logger?: IgniterLogger,
    telemetry?: IgniterTelemetryProvider | null,
  ): IgniterResponseProcessor<TContext> {
    const instance = new IgniterResponseProcessor<TContext>();

    instance._store = store;
    instance._context = context;
    instance._logger = logger?.child("IgniterResponseProcessor");
    instance._telemetry = telemetry;

    instance._logger?.debug("Response processor initialized", {
      has_store: !!store,
      has_context: !!context,
      has_telemetry: !!telemetry,
    });

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
  private withData<TNewData>(): IgniterResponseProcessor<TContext> {
    const newInstance = new IgniterResponseProcessor<TContext>();
    newInstance._status = this._status;
    newInstance._statusExplicitlySet = this._statusExplicitlySet;
    newInstance._response = {} as IgniterResponse<TNewData>;
    newInstance._headers = new Headers(this._headers);
    newInstance._cookies = [...this._cookies];
    newInstance._isStream = this._isStream;
    newInstance._streamOptions = this._streamOptions;
    newInstance._revalidateOptions = this._revalidateOptions;
    newInstance._store = this._store;
    newInstance._context = this._context;
    newInstance._logger = this._logger;
    newInstance._telemetry = this._telemetry;
    return newInstance;
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
    this._status = code;
    this._statusExplicitlySet = true;
    this._logger?.debug("Status set", { status: code });
    return this;
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
  stream<TStreamData>(options: StreamOptions<TStreamData>) {
    // Derive channelId from controller and action if provided
    if (options.controllerKey && options.actionKey && !options.channelId) {
      options.channelId = `${options.controllerKey}.${options.actionKey}`;
    }

    this._logger?.debug("SSE stream configured", {
      channelId: options.channelId,
    });
    const newInstance = this.withData<IgniterResponse<TStreamData>>();
    newInstance._isStream = true;
    // @ts-expect-error - Ignore type mismatch for now
    newInstance._streamOptions = options as StreamOptions<TStreamData>;
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
    scopes?: ScopeResolver<TContext>,
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

    this._logger?.debug("Cache revalidation configured", {
      keys: this._revalidateOptions.queryKeys,
      has_scopes: !!this._revalidateOptions.scopes,
    });
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
    const instance = this.withData<IgniterResponse<TSuccessData>>();
    instance._response = {} as IgniterResponse<TSuccessData>;
    instance._response.data = data as TSuccessData;
    instance._response.error = null;
    if (!this._statusExplicitlySet) instance._status = 200;
    return instance as unknown as IgniterResponse<TSuccessData>;
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
    const instance = this.withData<IgniterResponse<TCreatedData>>();
    instance._response = {} as IgniterResponse<TCreatedData>;
    instance._response.data = data as TCreatedData;
    instance._response.error = null;
    if (!this._statusExplicitlySet) instance._status = 201;
    return instance as unknown as IgniterResponse<TCreatedData>;
  }

  /**
   * Creates a 204 No Content response.
   * Useful for successful operations that don't return data (e.g., DELETE operations).
   * Returns HTTP 204 status with no response body, compliant with RFC 7231.
   *
   * @returns Current instance for chaining
   *
   * @example
   * ```typescript
   * // DELETE operation that removes a resource
   * response.noContent();
   * ```
   */
  noContent() {
    const instance = this.withData<IgniterResponse<null>>();
    instance._response = {} as IgniterResponse<null>;
    instance._response.data = null;
    instance._response.error = null;
    // Set 204 status unless explicitly overridden
    if (!this._statusExplicitlySet) {
      instance._status = 204;
      instance._logger?.debug("Status set", { status: 204 });
    }
    return instance as unknown as IgniterResponse<null>;
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
    this._logger?.debug("Response header set", { name, value });
    this._headers.set(name, value);
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
    const cookie = this.buildCookieString(name, value, options);
    this._logger?.debug("Response cookie set", { name });
    this._cookies.push(cookie);
    return this;
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
  private buildCookieString(
    name: string,
    value: string,
    options?: CookieOptions,
  ): string {
    // Normalize options and cookie name respecting prefix invariants
    const opts: CookieOptions = { ...(options || {}) } as CookieOptions;
    let cookieName = name;

    // Handle __Host- prefix
    if (opts.prefix === "host" && !cookieName.startsWith("__Host-")) {
      cookieName = `__Host-${cookieName}`;
      opts.secure = true;
      opts.path = "/";
      delete opts.domain;
    }

    // Handle __Secure- prefix
    if (opts.prefix === "secure" && !cookieName.startsWith("__Secure-")) {
      cookieName = `__Secure-${cookieName}`;
      opts.secure = true;
    }

    // Partitioned cookies MUST be Secure
    if (opts.partitioned) {
      opts.secure = true;
    }

    // Begin serialization
    let cookie = `${cookieName}=${encodeURIComponent(value)}`;

    if (opts.maxAge !== undefined)
      cookie += `; Max-Age=${Math.floor(opts.maxAge)}`;

    const isHostPref =
      cookieName.startsWith("__Host-") || opts.prefix === "host";
    if (opts.domain && !isHostPref) cookie += `; Domain=${opts.domain}`;

    if (opts.path || isHostPref) cookie += `; Path=${opts.path || "/"}`;
    if (opts.expires) cookie += `; Expires=${opts.expires.toUTCString()}`;
    if (opts.httpOnly) cookie += `; HttpOnly`;
    if (opts.secure) cookie += `; Secure`;
    if (opts.sameSite)
      cookie += `; SameSite=${opts.sameSite.charAt(0).toUpperCase() + opts.sameSite.slice(1)}`;
    if (opts.partitioned) cookie += `; Partitioned`;

    return cookie;
  }

  error<TErrorCode extends IgniterCommonErrorCode>(
    error: IgniterResponseError<TErrorCode>,
  ) {
    this._status = 400;
    this._response = {} as IgniterResponse<
      null,
      IgniterResponseError<TErrorCode>
    >;
    this._response.error = error;
    this._response.data = null;

    if (!this._statusExplicitlySet) {
      const defaultStatus = this.getDefaultStatusForErrorCode(error.getCode());
      this._status = defaultStatus;
      this._logger?.debug(
        `Setting response status to ${defaultStatus} for error code '${error.getCode()}'.`,
      );
    }
    return this as unknown as IgniterResponse<
      null,
      IgniterResponseError<TErrorCode>
    >;
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
  badRequest<TBadRequestData>(message = "Bad Request", data?: TBadRequestData) {
    this._response = {} as IgniterResponse<
      null,
      IgniterResponseError<"ERR_BAD_REQUEST">
    >;
    this._response.data = null;
    this._response.error = new IgniterResponseError({
      message,
      data,
      code: "ERR_BAD_REQUEST",
    });
    if (!this._statusExplicitlySet) this._status = 400;
    return this as unknown as IgniterResponse<
      null,
      IgniterResponseError<"ERR_BAD_REQUEST">
    >;
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
  unauthorized<TUnauthorizedData>(
    message = "Unauthorized",
    data?: TUnauthorizedData,
  ) {
    this._response = {} as IgniterResponse<
      null,
      IgniterResponseError<"ERR_UNAUTHORIZED">
    >;
    this._response.data = null;
    this._response.error = new IgniterResponseError({
      message,
      data,
      code: "ERR_UNAUTHORIZED",
    });
    if (!this._statusExplicitlySet) this._status = 401;
    return this as unknown as IgniterResponse<
      null,
      IgniterResponseError<"ERR_UNAUTHORIZED">
    >;
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
  forbidden<TForbiddenData>(message = "Forbidden", data?: TForbiddenData) {
    this._response = {} as IgniterResponse<
      null,
      IgniterResponseError<"ERR_FORBIDDEN">
    >;
    this._response.data = null;
    this._response.error = new IgniterResponseError({
      message,
      data,
      code: "ERR_FORBIDDEN",
    });
    if (!this._statusExplicitlySet) this._status = 403;
    return this as unknown as IgniterResponse<
      null,
      IgniterResponseError<"ERR_FORBIDDEN">
    >;
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
  notFound<TNotFoundData>(message = "Not Found", data?: TNotFoundData) {
    this._response = {} as IgniterResponse<
      null,
      IgniterResponseError<"ERR_NOT_FOUND">
    >;
    this._response.data = null;
    this._response.error = new IgniterResponseError({
      message,
      data,
      code: "ERR_NOT_FOUND",
    });
    if (!this._statusExplicitlySet) this._status = 404;
    return this as unknown as IgniterResponse<
      null,
      IgniterResponseError<"ERR_NOT_FOUND">
    >;
  }

  /**
   * Creates a 302/307 Redirect response.
   *
   * @param destination - URL to redirect to
   * @param type - Redirect type ('replace' or 'push')
   * @returns New instance typed with Redirect error
   *
   * @example
   * ```typescript
   * response.redirect('/dashboard', 'push');
   * ```
   */
  redirect(destination: string, type: "replace" | "push" = "replace") {
    this._response = {} as IgniterResponse<
      null,
      IgniterResponseError<"ERR_REDIRECT">
    >;
    this._response.data = null;
    this._response.error = new IgniterResponseError({
      message: "Redirect",
      data: { destination, type },
      code: "ERR_REDIRECT",
    });

    if (!this._statusExplicitlySet) this._status = 302;
    return this as unknown as IgniterResponse<
      null,
      IgniterResponseError<"ERR_REDIRECT">
    >;
  }

  /**
   * Creates a JSON response with the provided data.
   * Shortcut for simple API responses.
   *
   * @template TJsonData - Type of the JSON data
   * @param data - Data to include in the response
   * @returns New instance typed with the JSON data
   *
   * @example
   * ```typescript
   * response.json({ status: 'ok' });
   * ```
   */
  json<TJsonData>(data: TJsonData) {
    const instance = this.withData<IgniterResponse<TJsonData>>();
    instance._response = {} as IgniterResponse<TJsonData>;
    instance._response.data = data as TJsonData;
    instance._response.error = null;
    if (!this._statusExplicitlySet) instance._status = 200;
    return instance as unknown as IgniterResponse<TJsonData>;
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
        this._logger?.debug("Revalidation scopes resolving");
        scopeIds = await scopes(this._context);
        this._logger?.debug("Scopes resolved", { scopes: scopeIds });
      } catch (error) {
        this._logger?.error("Scope resolution failed", {
          component: "Response",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        // Continue without scopes if resolution fails
      }
    }

    SSEProcessor.publishEvent(
      {
        channel: "revalidation",
        type: "revalidate",
        scopes: scopeIds,
        data: {
          queryKeys: keysArray,
          data,
          timestamp: new Date().toISOString(),
        },
      },
      this._logger,
    );

    this._logger?.debug("Revalidation published", {
      keys: keysArray,
      resolved_scopes: scopeIds || "global",
    });
  }

  /**
   * Creates a Server-Sent Events stream.
   * Internal method for handling streaming responses.
   *
   * @private
   */
  private createStream(): Response {
    if (!this._streamOptions) {
      const err = new Error(
        "Stream options are required for streaming responses but were not provided.",
      );
      this._logger?.error("Stream creation failed", {
        component: "Response",
        reason: "options_required",
      });
      throw err;
    }

    const { channelId, initialData } = this._streamOptions;
    const headers = this._headers;

    this._logger?.debug("Stream created", { channelId });

    if (!channelId) {
      const err = new Error(
        "Channel ID is required for streaming responses but was not provided.",
      );
      this._logger?.error("Stream creation failed", {
        component: "Response",
        reason: "channel_id_required",
      });
      throw err;
    }

    // Check if the channel exists, register it if not
    if (!SSEProcessor.channelExists(channelId)) {
      this._logger?.warn("Dynamic SSE channel registered", { channelId });
      SSEProcessor.registerChannel(
        {
          id: channelId,
          description: `Dynamic channel created by IgniterResponseProcessor`,
        },
        this._logger,
      );
    }

    // If initial data is provided, publish it to the channel
    if (initialData) {
      this._logger?.debug("Initial data published", {
        channelId,
        has_data: !!initialData,
      });
      SSEProcessor.publishEvent(
        {
          channel: channelId,
          type: "data",
          data: initialData,
        },
        this._logger,
      );
    }

    // In the new architecture, we'll return a JSON response with connection information
    // The client will connect to the central SSE endpoint with the provided channel
    const responseData = {
      type: "stream",
      channelId,
      connectionInfo: {
        endpoint: "/api/v1/sse/events", // Base path should be configurable
        params: {
          channels: channelId,
        },
      },
      timestamp: new Date().toISOString(),
    };

    this._logger?.debug("Stream connection info returned", { channelId });
    // Return a regular JSON response with connection information
    return new Response(
      JSON.stringify({
        error: null,
        data: responseData,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...Object.fromEntries(headers.entries()),
        },
      },
    );
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
        // BigInt serialization
        if (typeof value === "bigint") {
          return value.toString();
        }
        return value;
      });
    } catch (error) {
      this._logger?.error("Response data serialization failed", {
        component: "Response",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return JSON.stringify({
        data: null,
        error: {
          code: "SERIALIZATION_ERROR",
          message: "Failed to serialize response data",
        },
      });
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
    const startTime = Date.now();
    this._logger?.debug("Building final response");

    // Handle revalidation first
    if (this._revalidateOptions) {
      this._logger?.debug("Handling revalidation");
      await this.handleRevalidation();
    }

    // If this is a streaming response, handle it with the new SSE system
    if (this._isStream) {
      this._logger?.debug("Response is a stream, creating SSE stream response");
      const streamResponse = this.createStream();

      // Record stream response metrics
      TelemetryManagerProcessor.recordResponseProcessing(
        this._telemetry,
        "stream",
        200,
        0, // Stream size is unknown
        this._logger,
      );

      return streamResponse;
    }

    // Standard JSON response
    const headers = new Headers(this._headers);

    for (const cookie of this._cookies) {
      headers.append("Set-Cookie", cookie);
    }

    // Special handling for 204 No Content per RFC 7231
    if (this._status === 204) {
      // 204 responses MUST NOT include a message body or Content-Type
      headers.delete("Content-Type");

      this._logger?.debug(
        "204 No Content response - removing body and Content-Type header",
      );

      // Record no-content response metrics
      TelemetryManagerProcessor.recordResponseProcessing(
        this._telemetry,
        "no_content",
        204,
        0,
        this._logger,
      );

      return new Response(null, {
        status: 204,
        headers,
      });
    }

    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
      this._logger?.debug(
        "Defaulted Content-Type header to 'application/json'",
      );
    }

    const response = this._response;

    const body = this.safeStringify(response);
    const responseSize = new TextEncoder().encode(body).length;

    // Determine response type for metrics
    const responseType = this._response.error ? "error" : "json";

    // Record response processing metrics
    TelemetryManagerProcessor.recordResponseProcessing(
      this._telemetry,
      responseType,
      this._status,
      responseSize,
      this._logger,
    );

    const duration = Date.now() - startTime;
    this._logger?.debug("Final response built", {
      status: this._status,
      header_keys: Array.from(headers.keys()),
      response_size: responseSize,
      response_type: responseType,
      duration_ms: duration,
    });

    return new Response(body, {
      status: this._status,
      headers,
    });
  }

  private getDefaultStatusForErrorCode(code: string): number {
    if (code.startsWith("ERR_")) {
      switch (code) {
        case "ERR_BAD_REQUEST":
          return 400;
        case "ERR_UNAUTHORIZED":
          return 401;
        case "ERR_FORBIDDEN":
          return 403;
        case "ERR_NOT_FOUND":
          return 404;
        case "ERR_CONFLICT":
          return 409;
        case "ERR_UNPROCESSABLE_ENTITY":
          return 422;
        case "ERR_REDIRECT":
          return 302;
        default:
          return 500;
      }
    }
    return 500;
  }
}
