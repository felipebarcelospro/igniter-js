import type { CookieOptions } from "../types/cookie.interface";
import {
  IgniterCommonErrorCode,
  IgniterResponse,
  IgniterResponseError,
} from "../types/response.interface";
import type {
  IgniterStoreManager,
  IgniterStoreScopeEntry,
  IgniterStoreScopeIdentifier,
} from "../types/store.interface";
import type { IgniterLogger } from "../types";
import type { IgniterStoreCacheProcessor, IgniterCacheOptions } from "../services/cache.processor";
import type { IgniterCoreTelemetryManager } from "../types/telemetry.interface";

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

export type ResponseCacheOptions = IgniterCacheOptions;

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

export type RevalidateInput<TData = ResponseData> =
  | string
  | string[]
  | {
      paths: string[];
      data?: TData;
    };

type ResponseState = "init" | "success" | "error" | "stream";

type ResponseRequestMeta = {
  path?: string;
  params?: Record<string, any>;
  query?: Record<string, any>;
};

type ResponseActionMeta = {
  pathKey?: string;
};

type ResponseInitOptions<TContext> = {
  store?: IgniterStoreManager;
  cache?: IgniterStoreCacheProcessor;
  context?: TContext;
  logger?: IgniterLogger;
  telemetry?: IgniterCoreTelemetryManager | null;
  request?: ResponseRequestMeta;
  action?: ResponseActionMeta;
};

export type IgniterResponseSuccessState<TContext, TData> =
  IgniterResponseProcessor<TContext, "success", TData, null> &
    IgniterResponse<TData, null>;

export type IgniterResponseErrorState<TContext, TError> =
  IgniterResponseProcessor<TContext, "error", null, TError> &
    IgniterResponse<null, TError>;

export type IgniterResponseStreamState<TContext> =
  IgniterResponseProcessor<TContext, "stream", null, null> &
    IgniterResponse<null, null>;

/**
 * A builder class for creating and manipulating HTTP responses in the Igniter Framework.
 * Provides a fluent interface for constructing responses with various status codes,
 * headers, cookies, body content, streaming, caching, and revalidation.
 */
export class IgniterResponseProcessor<
  TContext = unknown,
  TState extends ResponseState = "init",
  TData = unknown,
  TError = unknown,
> {
  private _status: number = 200;
  private _statusExplicitlySet: boolean = false;
  private _response: IgniterResponse<unknown, unknown> = {
    data: null,
    error: null,
  };
  private _headers = new Headers();
  private _cookies: string[] = [];
  private _state: ResponseState = "init";
  private readonly _stateMarker?: TState;
  private _isStream: boolean = false;
  private _streamOptions?: StreamOptions;
  private _revalidateInput?: RevalidateInput;
  private _cacheOptions?: ResponseCacheOptions;
  private _scopeChain: IgniterStoreScopeEntry[] = [];
  private _store?: IgniterStoreManager;
  private _cache?: IgniterStoreCacheProcessor;
  private _context?: TContext;
  private _logger?: IgniterLogger;
  private _telemetry?: IgniterCoreTelemetryManager | null;
  private _request?: ResponseRequestMeta;
  private _action?: ResponseActionMeta;

  get data(): TData | null {
    return (this._response as { data?: TData }).data ?? null;
  }

  get responseError(): TError | null {
    return (this._response as { error?: TError }).error ?? null;
  }

  /**
   * Creates a new instance of IgniterResponseProcessor.
   * Use this method to start building a new response.
   */
  static init<TContext = unknown>(
    store?: IgniterStoreManager,
    context?: TContext,
    logger?: IgniterLogger,
    telemetry?: IgniterCoreTelemetryManager | null,
    options?: ResponseInitOptions<TContext>,
  ): IgniterResponseProcessor<TContext> {
    const instance = new IgniterResponseProcessor<TContext>();
    const initOptions = options ?? {};

    instance._store = initOptions.store ?? store;
    instance._cache = initOptions.cache;
    instance._context = initOptions.context ?? context;
    instance._logger = (initOptions.logger ?? logger)?.child(
      "IgniterResponseProcessor",
    );
    instance._telemetry = initOptions.telemetry ?? telemetry;
    instance._request = initOptions.request;
    instance._action = initOptions.action;

    instance._logger?.debug("Response processor initialized", {
      has_store: !!instance._store,
      has_cache: !!instance._cache,
      has_context: !!instance._context,
      has_telemetry: !!instance._telemetry,
    });

    return instance;
  }

  /**
   * Sets the HTTP status code for the response.
   */
  status(
    this: IgniterResponseProcessor<TContext, "init", TData, TError>,
    code: number,
  ): IgniterResponseProcessor<TContext, "init", TData, TError> {
    this._status = code;
    this._statusExplicitlySet = true;
    this._logger?.debug("Status set", { status: code });
    return this;
  }

  /**
   * Sets a header in the response.
   */
  setHeader(
    this: IgniterResponseProcessor<TContext, "init", TData, TError>,
    name: string,
    value: string,
  ): IgniterResponseProcessor<TContext, "init", TData, TError> {
    this._logger?.debug("Response header set", { name, value });
    this._headers.set(name, value);
    return this;
  }

  /**
   * Sets a cookie in the response.
   */
  setCookie(
    this: IgniterResponseProcessor<TContext, "init", TData, TError>,
    name: string,
    value: string,
    options?: CookieOptions,
  ): IgniterResponseProcessor<TContext, "init", TData, TError> {
    const cookie = this.buildCookieString(name, value, options);
    this._logger?.debug("Response cookie set", { name });
    this._cookies.push(cookie);
    return this;
  }

  /**
   * Adds a scope to the response for cache and revalidation.
   */
  scope(
    this: IgniterResponseProcessor<TContext, "init", TData, TError>,
    key: string,
    id: IgniterStoreScopeIdentifier,
  ): IgniterResponseProcessor<TContext, "init", TData, TError> {
    this._scopeChain = [...this._scopeChain, { key, identifier: String(id) }];
    return this;
  }

  /**
   * Creates a JSON response with the provided data.
   */
  json<TJsonData>(
    this: IgniterResponseProcessor<TContext, "init", TData, TError>,
    data: TJsonData,
  ): IgniterResponseSuccessState<TContext, TJsonData> {
    return this.success(data);
  }

  /**
   * Creates a success response with typed data.
   */
  success<TSuccessData>(
    this: IgniterResponseProcessor<TContext, "init", TData, TError>,
    data?: TSuccessData,
  ): IgniterResponseSuccessState<TContext, TSuccessData> {
    this._state = "success";
    this._response = {
      data: data as TSuccessData,
      error: null,
    } as IgniterResponse<TSuccessData, null>;
    if (!this._statusExplicitlySet) this._status = 200;
    return this as unknown as IgniterResponseSuccessState<TContext, TSuccessData>;
  }

  /**
   * Creates a 201 Created response with typed data.
   */
  created<TCreatedData>(
    this: IgniterResponseProcessor<TContext, "init", TData, TError>,
    data: TCreatedData,
  ): IgniterResponseSuccessState<TContext, TCreatedData> {
    this._state = "success";
    this._response = {
      data,
      error: null,
    } as IgniterResponse<TCreatedData, null>;
    if (!this._statusExplicitlySet) this._status = 201;
    return this as unknown as IgniterResponseSuccessState<TContext, TCreatedData>;
  }

  /**
   * Creates a 204 No Content response.
   */
  noContent(
    this: IgniterResponseProcessor<TContext, "init", TData, TError>,
  ): IgniterResponseSuccessState<TContext, null> {
    this._state = "success";
    this._response = {
      data: null,
      error: null,
    } as IgniterResponse<null, null>;
    if (!this._statusExplicitlySet) this._status = 204;
    return this as unknown as IgniterResponseSuccessState<TContext, null>;
  }

  /**
   * Creates a typed error response.
   */
  error<TErrorCode extends IgniterCommonErrorCode>(
    this: IgniterResponseProcessor<TContext, "init", TData, TError>,
    code: TErrorCode,
    message?: string,
    data?: unknown,
  ): IgniterResponseErrorState<TContext, IgniterResponseError<TErrorCode>> {
    this._state = "error";
    const error = new IgniterResponseError({
      code,
      message,
      data,
    });

    this._response = {
      data: null,
      error: error as IgniterResponseError<TErrorCode>,
    } as IgniterResponse<null, IgniterResponseError<TErrorCode>>;

    if (!this._statusExplicitlySet) {
      this._status = this.getDefaultStatusForErrorCode(code);
    }

    return this as unknown as IgniterResponseErrorState<
      TContext,
      IgniterResponseError<TErrorCode>
    >;
  }

  /**
   * Creates a 400 Bad Request response.
   */
  badRequest<TBadRequestData>(
    this: IgniterResponseProcessor<TContext, "init", TData, TError>,
    message = "Bad Request",
    data?: TBadRequestData,
  ): IgniterResponseErrorState<
    TContext,
    IgniterResponseError<"ERR_BAD_REQUEST">
  > {
    return this.error("ERR_BAD_REQUEST", message, data);
  }

  /**
   * Creates a 401 Unauthorized response.
   */
  unauthorized<TUnauthorizedData>(
    this: IgniterResponseProcessor<TContext, "init", TData, TError>,
    message = "Unauthorized",
    data?: TUnauthorizedData,
  ): IgniterResponseErrorState<
    TContext,
    IgniterResponseError<"ERR_UNAUTHORIZED">
  > {
    return this.error("ERR_UNAUTHORIZED", message, data);
  }

  /**
   * Creates a 403 Forbidden response.
   */
  forbidden<TForbiddenData>(
    this: IgniterResponseProcessor<TContext, "init", TData, TError>,
    message = "Forbidden",
    data?: TForbiddenData,
  ): IgniterResponseErrorState<TContext, IgniterResponseError<"ERR_FORBIDDEN">> {
    return this.error("ERR_FORBIDDEN", message, data);
  }

  /**
   * Creates a 404 Not Found response.
   */
  notFound<TNotFoundData>(
    this: IgniterResponseProcessor<TContext, "init", TData, TError>,
    message = "Not Found",
    data?: TNotFoundData,
  ): IgniterResponseErrorState<TContext, IgniterResponseError<"ERR_NOT_FOUND">> {
    return this.error("ERR_NOT_FOUND", message, data);
  }

  /**
   * Creates a 302/307 Redirect response.
   */
  redirect(
    this: IgniterResponseProcessor<TContext, "init", TData, TError>,
    destination: string,
    type: "replace" | "push" = "replace",
  ): IgniterResponseErrorState<TContext, IgniterResponseError<"ERR_REDIRECT">> {
    return this.error("ERR_REDIRECT", "Redirect", { destination, type });
  }

  /**
   * Creates a Server-Sent Events stream response.
   */
  stream<TStreamData>(
    this: IgniterResponseProcessor<TContext, "init", TData, TError>,
    options: StreamOptions<TStreamData>,
  ): IgniterResponseStreamState<TContext> {
    if (options.controllerKey && options.actionKey && !options.channelId) {
      options.channelId = `${options.controllerKey}.${options.actionKey}`;
    }

    this._state = "stream";
    this._isStream = true;
    this._streamOptions = options as StreamOptions;
    if (!this._statusExplicitlySet) this._status = 200;
    return this as unknown as IgniterResponseStreamState<TContext>;
  }

  /**
   * Triggers cache revalidation on connected clients.
   */
  revalidate(
    this: IgniterResponseProcessor<TContext, "success", TData, TError>,
    input: RevalidateInput,
  ): IgniterResponseProcessor<TContext, "success", TData, TError> {
    this._revalidateInput = input;
    this._logger?.debug("Cache revalidation configured", { input });
    return this;
  }

  /**
   * Configure cache options for the response.
   */
  cache(
    this: IgniterResponseProcessor<TContext, "success", TData, TError>,
    options: ResponseCacheOptions = {},
  ): IgniterResponseProcessor<TContext, "success", TData, TError> {
    const policy =
      options.policy ?? (this._scopeChain.length > 0 ? "private" : "public");

    this._cacheOptions = {
      ...options,
      policy,
    };

    this.applyCacheHeaders(this._cacheOptions);
    return this;
  }

  /**
   * Builds and returns the final response object.
   */
  async toResponse(this: IgniterResponseProcessor<any, any, any, any>): Promise<Response> {
    const startTime = Date.now();
    const responseType = this.resolveResponseType();
    this._logger?.debug("Building final response");

    this._telemetry?.emit("igniter.core.response.build.started", {
      level: "debug",
      attributes: {
        "ctx.response.type": responseType,
      },
    });

    try {
      if (this._revalidateInput) {
        this._logger?.debug("Handling revalidation");
        await this.handleRevalidation();
      }

      if (this._cacheOptions) {
        await this.handleCache();
      }

      if (this._isStream) {
        this._logger?.debug("Response is a stream, creating SSE stream response");
        const streamResponse = this.createStream();

        this._telemetry?.emit("igniter.core.response.stream.created", {
          level: "debug",
          attributes: {
            "ctx.response.channel_id": this._streamOptions?.channelId,
            "ctx.response.controller": this._streamOptions?.controllerKey,
            "ctx.response.action": this._streamOptions?.actionKey,
          },
        });

        this._telemetry?.emit("igniter.core.response.build.success", {
          level: "debug",
          attributes: {
            "ctx.response.type": "stream",
            "ctx.response.status_code": 200,
            "ctx.response.size_bytes": 0,
            "ctx.response.duration_ms": Date.now() - startTime,
          },
        });

        return streamResponse;
      }

      const headers = new Headers(this._headers);

      for (const cookie of this._cookies) {
        headers.append("Set-Cookie", cookie);
      }

      if (this._status === 204) {
        headers.delete("Content-Type");

        this._telemetry?.emit("igniter.core.response.build.success", {
          level: "debug",
          attributes: {
            "ctx.response.type": "no_content",
            "ctx.response.status_code": 204,
            "ctx.response.size_bytes": 0,
            "ctx.response.duration_ms": Date.now() - startTime,
          },
        });

        return new Response(null, {
          status: 204,
          headers,
        });
      }

      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      const body = this.safeStringify(this._response);
      const responseSize = new TextEncoder().encode(body).length;
      const finalResponseType = this._response.error ? "error" : "json";

      this._telemetry?.emit("igniter.core.response.build.success", {
        level: "debug",
        attributes: {
          "ctx.response.type": finalResponseType,
          "ctx.response.status_code": this._status,
          "ctx.response.size_bytes": responseSize,
          "ctx.response.duration_ms": Date.now() - startTime,
        },
      });

      const duration = Date.now() - startTime;
      this._logger?.debug("Final response built", {
        status: this._status,
        header_keys: Array.from(headers.keys()),
        response_size: responseSize,
        response_type: finalResponseType,
        duration_ms: duration,
      });

      return new Response(body, {
        status: this._status,
        headers,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorCode =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code
          ? String((error as { code?: string }).code)
          : "RESPONSE_BUILD_ERROR";

      this._telemetry?.emit("igniter.core.response.build.error", {
        level: "error",
        attributes: {
          "ctx.response.type": responseType,
          "ctx.response.duration_ms": duration,
          "ctx.error.type": "runtime",
          "ctx.error.code": errorCode,
          "ctx.error.message":
            error instanceof Error ? error.message : "Response build failed",
          "ctx.error.component": "IgniterResponseProcessor",
        },
      });

      throw error;
    }
  }

  private applyCacheHeaders(options: ResponseCacheOptions): void {
    const policy = options.policy ?? "private";
    if (policy === "no-store") {
      this._headers.set("Cache-Control", "no-store");
      return;
    }

    const directives: string[] = [policy];
    if (options.ttl !== undefined) {
      directives.push(`max-age=${options.ttl}`);
    }
    if (options.sMaxAge !== undefined) {
      directives.push(`s-maxage=${options.sMaxAge}`);
    }
    if (options.staleWhileRevalidate !== undefined) {
      directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
    }

    this._headers.set("Cache-Control", directives.join(", "));
  }

  private resolveResponseType(): "json" | "error" | "stream" | "no_content" {
    if (this._isStream) return "stream";
    if (this._status === 204) return "no_content";
    return this._response.error ? "error" : "json";
  }

  private async handleCache(): Promise<void> {
    if (!this._cache || !this._cacheOptions) return;

    if (this._cacheOptions.policy === "no-store") {
      return;
    }

    const policy = this._cacheOptions.policy ?? "private";
    const tagsCount = this._cacheOptions.tags?.length;
    const cacheKey = this.resolveCacheKey();
    const keyResolved = Boolean(cacheKey);

    this._telemetry?.emit("igniter.core.cache.set.started", {
      level: "debug",
      attributes: {
        "ctx.cache.policy": policy,
        "ctx.cache.ttl": this._cacheOptions.ttl,
        "ctx.cache.tags_count": tagsCount,
        "ctx.cache.key_resolved": keyResolved,
      },
    });

    if (!cacheKey) {
      this._logger?.warn("Cache key resolution failed", {
        path: this._action?.pathKey ?? this._request?.path,
      });

      this._telemetry?.emit("igniter.core.cache.key.resolve_failed", {
        level: "warn",
        attributes: {
          "ctx.cache.policy": policy,
          "ctx.cache.key_resolved": false,
        },
      });

      return;
    }

    try {
      await this._cache.set(cacheKey, this._response, this._cacheOptions);

      this._telemetry?.emit("igniter.core.cache.set.success", {
        level: "debug",
        attributes: {
          "ctx.cache.policy": policy,
          "ctx.cache.ttl": this._cacheOptions.ttl,
          "ctx.cache.tags_count": tagsCount,
          "ctx.cache.key_resolved": true,
        },
      });
    } catch (error) {
      this._logger?.warn("Cache set failed", { cacheKey, error });

      this._telemetry?.emit("igniter.core.cache.set.error", {
        level: "error",
        attributes: {
          "ctx.cache.policy": policy,
          "ctx.cache.ttl": this._cacheOptions.ttl,
          "ctx.cache.tags_count": tagsCount,
          "ctx.cache.key_resolved": true,
          "ctx.error.type": "runtime",
          "ctx.error.code":
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: string }).code
              ? String((error as { code?: string }).code)
              : "CACHE_SET_FAILED",
          "ctx.error.message":
            error instanceof Error ? error.message : "Cache set failed",
          "ctx.error.component": "IgniterResponseProcessor",
        },
      });
    }
  }

  private resolveCacheKey(): string | null {
    if (!this._cache) return null;

    const path = this._action?.pathKey ?? this._request?.path;
    if (!path) return null;

    const scopes = this._scopeChain.map(
      (entry) => `${entry.key}:${entry.identifier}`,
    );

    return this._cache.resolveKey({
      path,
      params: this._request?.params,
      query: this._request?.query,
      scopes: scopes.length > 0 ? scopes : undefined,
    });
  }

  private async handleRevalidation(): Promise<void> {
    if (!this._store || !this._revalidateInput) return;

    const input = this._revalidateInput;
    const paths = Array.isArray(input)
      ? input
      : typeof input === "string"
      ? [input]
      : input.paths;
    const data =
      typeof input === "object" && !Array.isArray(input) ? input.data : undefined;

    const scopedStore = this.applyScopes(this._store, this._scopeChain);
    const scopesCount = this._scopeChain.length;

    this._telemetry?.emit("igniter.core.revalidate.requested", {
      level: "debug",
      attributes: {
        "ctx.revalidate.paths_count": paths.length,
        "ctx.revalidate.scopes_count": scopesCount,
        "ctx.revalidate.has_data": data !== undefined,
        "ctx.revalidate.cache_invalidate": !!this._cache,
      },
    });

    try {
      await scopedStore.events.publish("http:revalidate:requested", {
        queryKeys: paths,
        data,
        timestamp: new Date().toISOString(),
      });

      this._telemetry?.emit("igniter.core.revalidate.published", {
        level: "debug",
        attributes: {
          "ctx.revalidate.paths_count": paths.length,
          "ctx.revalidate.scopes_count": scopesCount,
        },
      });

      if (this._cache) {
        this._telemetry?.emit("igniter.core.cache.invalidate.started", {
          level: "debug",
          attributes: {
            "ctx.cache.keys_count": paths.length,
            "ctx.cache.tags_count": undefined,
          },
        });

        try {
          await this._cache.invalidate(paths);
          this._telemetry?.emit("igniter.core.cache.invalidate.success", {
            level: "debug",
            attributes: {
              "ctx.cache.keys_count": paths.length,
              "ctx.cache.tags_count": undefined,
            },
          });
        } catch (error) {
          this._telemetry?.emit("igniter.core.cache.invalidate.error", {
            level: "error",
            attributes: {
              "ctx.cache.keys_count": paths.length,
              "ctx.cache.tags_count": undefined,
              "ctx.error.type": "runtime",
              "ctx.error.code":
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                (error as { code?: string }).code
                  ? String((error as { code?: string }).code)
                  : "CACHE_INVALIDATE_FAILED",
              "ctx.error.message":
                error instanceof Error
                  ? error.message
                  : "Cache invalidate failed",
              "ctx.error.component": "IgniterResponseProcessor",
            },
          });
        }
      }

      this._logger?.debug("Revalidation published", {
        paths,
        scopes: this._scopeChain.map(
          (entry) => `${entry.key}:${entry.identifier}`,
        ),
      });
    } catch (error) {
      this._telemetry?.emit("igniter.core.revalidate.error", {
        level: "error",
        attributes: {
          "ctx.revalidate.paths_count": paths.length,
          "ctx.revalidate.scopes_count": scopesCount,
          "ctx.error.type": "runtime",
          "ctx.error.code":
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: string }).code
              ? String((error as { code?: string }).code)
              : "REVALIDATE_PUBLISH_FAILED",
          "ctx.error.message":
            error instanceof Error ? error.message : "Revalidate failed",
          "ctx.error.component": "IgniterResponseProcessor",
        },
      });

      throw error;
    }
  }

  private applyScopes(
    store: IgniterStoreManager,
    scopeChain: IgniterStoreScopeEntry[],
  ): IgniterStoreManager {
    let scoped = store;
    for (const scope of scopeChain) {
      scoped = scoped.scope(scope.key as any, scope.identifier);
    }
    return scoped;
  }

  private createStream(): Response {
    if (!this._streamOptions) {
      throw new Error("Stream options are required for streaming responses.");
    }

    const { channelId, initialData } = this._streamOptions;
    if (!channelId) {
      throw new Error("Channel ID is required for streaming responses.");
    }

    const basePath =
      process.env.IGNITER_APP_BASE_PATH?.replace(/\/$/, "") || "/api/v1";

    const scopes = this._scopeChain.map(
      (entry) => `${entry.key}:${entry.identifier}`,
    );

    const responseData = {
      type: "stream",
      channelId,
      connectionInfo: {
        endpoint: `${basePath}/sse/events`,
        params: {
          channels: channelId,
          ...(scopes.length > 0 ? { scopes: scopes.join(",") } : {}),
        },
      },
      ...(initialData !== undefined ? { initialData } : {}),
      timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify({
        error: null,
        data: responseData,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...Object.fromEntries(this._headers.entries()),
        },
      },
    );
  }

  private buildCookieString(
    name: string,
    value: string,
    options?: CookieOptions,
  ): string {
    const opts: CookieOptions = { ...(options || {}) } as CookieOptions;
    let cookieName = name;

    if (opts.prefix === "host" && !cookieName.startsWith("__Host-")) {
      cookieName = `__Host-${cookieName}`;
      opts.secure = true;
      opts.path = "/";
      delete opts.domain;
    }

    if (opts.prefix === "secure" && !cookieName.startsWith("__Secure-")) {
      cookieName = `__Secure-${cookieName}`;
      opts.secure = true;
    }

    if (opts.partitioned) {
      opts.secure = true;
    }

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

  private safeStringify(obj: any): string {
    const seen = new Set();
    try {
      return JSON.stringify(obj, (key, value) => {
        if (value !== null && typeof value === "object") {
          if (seen.has(value)) {
            return "[Circular]";
          }
          seen.add(value);
        }
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
