import type { IgniterControllerConfig, IgniterProcedure, IgniterLogger, IgniterRouter, DocsConfig } from "../types";
import type { IgniterStoreManager } from "../types/store.interface";
import type { IgniterCoreTelemetryManager } from "../types/telemetry.interface";
import type { IgniterStoreRealtimeProcessor, IgniterStoreCacheProcessor } from "../types";
import type { ProcessedContext } from "../processors/context-builder.processor";
import { createIgniterRouter } from "../services/router.service";

/**
 * CORS configuration options.
 */
export interface CorsOptions {
  origins?: string | string[] | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

/**
 * Rate limit configuration options.
 */
export interface RateLimitOptions {
  max?: number;
  windowSeconds?: number;
  keyGenerator?: (request: Request) => string;
  skip?: (request: Request) => boolean;
  onLimit?: (request: Request, info: any) => Response | Promise<Response>;
  store?: any;
}

/**
 * Lifecycle hook called before each request is processed.
 */
export type OnRequestHook = (request: Request) => void | Promise<void>;

/**
 * Lifecycle hook called after each response is generated.
 */
export type OnResponseHook = (response: Response, request: Request) => void | Promise<void>;

/**
 * Centralized error handler for all errors in the router.
 * The context may be null if the error occurred before context was built.
 */
export type ErrorHandler = (
  error: Error,
  context: ProcessedContext | null,
  request: Request,
) => Response | Promise<Response>;

/**
 * Internal state for the router builder.
 */
interface RouterBuilderState<TContext, TPlugins> {
  controllers: Map<string, IgniterControllerConfig<any>>;
  middlewares: IgniterProcedure<TContext, any, any>[];
  errorHandler?: ErrorHandler;
  healthCheck?: { path: string };
  cors?: CorsOptions;
  rateLimit?: RateLimitOptions;
  onRequest?: OnRequestHook;
  onResponse?: OnResponseHook;
}

/**
 * Fluent builder for creating Igniter routers with enhanced features.
 *
 * Provides a chainable API for:
 * - Adding controllers incrementally
 * - Configuring global middlewares
 * - Setting up centralized error handling
 * - Adding lifecycle hooks (onRequest, onResponse)
 * - Configuring CORS and rate limiting
 * - Adding health check endpoints
 *
 * @template TContext - Application context type
 * @template TControllers - Map of controller names to configs
 * @template TConfig - Router configuration type
 * @template TPlugins - Registered plugins
 * @template TDocs - Documentation configuration
 *
 * @example
 * ```typescript
 * const router = igniter.router()
 *   .addController('users', usersController)
 *   .addController('posts', postsController)
 *   .addMiddleware(authMiddleware)
 *   .addMiddleware(loggingMiddleware)
 *   .onError((error, ctx, req) => {
 *     console.error('Request failed:', error);
 *     return new Response(JSON.stringify({ error: error.message }), { status: 500 });
 *   })
 *   .onRequest((req) => {
 *     console.log('Incoming:', req.method, req.url);
 *   })
 *   .onResponse((res, req) => {
 *     console.log('Outgoing:', req.method, req.url, res.status);
 *   })
 *   .withHealthCheck('/health')
 *   .withCors({ origins: ['https://myapp.com'], credentials: true })
 *   .build();
 * ```
 */
export class IgniterRouterBuilder<
  TContext extends object,
  TControllers extends Record<string, IgniterControllerConfig<any>>,
  TConfig extends object,
  TPlugins extends Record<string, any>,
  TDocs extends object,
> {
  private _state: RouterBuilderState<TContext, TPlugins>;
  private _context: TContext | (() => TContext) | (() => Promise<TContext>);
  private _config: TConfig;
  private _plugins: TPlugins;
  private _docs: TDocs;
  private _logger?: IgniterLogger;
  private _telemetry?: IgniterCoreTelemetryManager;
  private _store?: IgniterStoreManager;
  private _realtime?: IgniterStoreRealtimeProcessor;
  private _cache?: IgniterStoreCacheProcessor;

  constructor(options: {
    context?: TContext | (() => TContext) | (() => Promise<TContext>);
    config?: TConfig;
    plugins?: TPlugins;
    docs?: TDocs;
    logger?: IgniterLogger;
    telemetry?: IgniterCoreTelemetryManager;
    store?: IgniterStoreManager;
    realtime?: IgniterStoreRealtimeProcessor;
    cache?: IgniterStoreCacheProcessor;
  } = {}) {
    this._state = {
      controllers: new Map(),
      middlewares: [],
    };
    this._context = options.context ?? ({} as TContext);
    this._config = options.config ?? ({} as TConfig);
    this._plugins = options.plugins ?? ({} as TPlugins);
    this._docs = options.docs ?? ({} as TDocs);
    this._logger = options.logger;
    this._telemetry = options.telemetry;
    this._store = options.store;
    this._realtime = options.realtime;
    this._cache = options.cache;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CONTROLLERS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Add a controller to the router.
   *
   * @param key - Unique identifier for the controller (used in path resolution)
   * @param controller - The controller configuration with actions
   *
   * @example
   * ```typescript
   * const usersController = igniter.controller({
   *   path: 'users',
   *   actions: {
   *     list: igniter.query({ ... }),
   *     create: igniter.mutation({ ... }),
   *   }
   * });
   *
   * router.addController('users', usersController)
   * ```
   */
  addController<TKey extends string, TController extends IgniterControllerConfig<any>>(
    key: TKey,
    controller: TController,
  ): IgniterRouterBuilder<
    TContext,
    TControllers & { [K in TKey]: TController },
    TConfig,
    TPlugins,
    TDocs
  > {
    this._state.controllers.set(key, controller);
    return this as any;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MIDDLEWARES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Add a global middleware that runs for every request.
   * Middlewares are executed in the order they are added.
   *
   * @param middleware - The procedure to execute for every request
   *
   * @example
   * ```typescript
   * const authMiddleware = igniter.procedure(async (ctx, next) => {
   *   const user = await validateToken(ctx.request.headers.get('Authorization'));
   *   return next({ ...ctx, context: { ...ctx.context, user } });
   * });
   *
   * router.addMiddleware(authMiddleware)
   * ```
   */
  addMiddleware(
    middleware: IgniterProcedure<TContext, any, any>,
  ): this {
    this._state.middlewares.push(middleware);
    return this;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Set a centralized error handler for all errors in the router.
   * This handler is called for any uncaught error during request processing.
   *
   * @param handler - Function that receives the error, context (if available), and request
   *
   * @example
   * ```typescript
   * router.onError((error, ctx, req) => {
   *   // Log error
   *   console.error('Request failed:', error, {
   *     path: req.url,
   *     method: req.method,
   *     userId: ctx?.context?.user?.id,
   *   });
   *
   *   // Custom error response
   *   if (error instanceof AuthError) {
   *     return new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), {
   *       status: 401,
   *       headers: { 'Content-Type': 'application/json' }
   *     });
   *   }
   *
   *   // Default error response
   *   return new Response(JSON.stringify({ code: 'INTERNAL_ERROR' }), {
   *     status: 500,
   *     headers: { 'Content-Type': 'application/json' }
   *   });
   * });
   * ```
   */
  onError(handler: ErrorHandler): this {
    this._state.errorHandler = handler;
    return this;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LIFECYCLE HOOKS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Add a hook that runs at the start of every request.
   * Useful for logging, metrics, or early request modification.
   *
   * @param hook - Function called with the incoming request
   *
   * @example
   * ```typescript
   * router.onRequest((req) => {
   *   console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
   * });
   * ```
   */
  onRequest(hook: OnRequestHook): this {
    this._state.onRequest = hook;
    return this;
  }

  /**
   * Add a hook that runs after every response is generated.
   * Useful for logging, metrics, or response modification.
   *
   * @param hook - Function called with the response and original request
   *
   * @example
   * ```typescript
   * router.onResponse((res, req) => {
   *   console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} -> ${res.status}`);
   * });
   * ```
   */
  onResponse(hook: OnResponseHook): this {
    this._state.onResponse = hook;
    return this;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Add a health check endpoint to the router.
   * Responds with a 200 OK and JSON body indicating service health.
   *
   * @param path - The path for the health check endpoint (default: '/health')
   *
   * @example
   * ```typescript
   * router.withHealthCheck('/health')
   * // or with custom path
   * router.withHealthCheck('/_healthz')
   * ```
   */
  withHealthCheck(path: string = '/health'): this {
    this._state.healthCheck = { path };
    return this;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CORS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Configure CORS (Cross-Origin Resource Sharing) for the router.
   * Works in all environments: Next.js, Bun, Deno, Cloudflare Workers, Lambda, etc.
   *
   * @param options - CORS configuration options
   *
   * @example
   * ```typescript
   * router.withCors({
   *   origins: ['https://myapp.com', 'https://admin.myapp.com'],
   *   methods: ['GET', 'POST', 'PUT', 'DELETE'],
   *   allowedHeaders: ['Content-Type', 'Authorization'],
   *   credentials: true,
   *   maxAge: 86400,
   * })
   * ```
   */
  withCors(options: CorsOptions): this {
    this._state.cors = options;
    return this;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RATE LIMITING
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Configure rate limiting for the router.
   * Works in all environments with in-memory storage by default.
   * For distributed rate limiting, use IgniterStore-based storage.
   *
   * @param options - Rate limit configuration options
   *
   * @example
   * ```typescript
   * // Basic rate limiting (100 requests per minute)
   * router.withRateLimit({
   *   max: 100,
   *   windowSeconds: 60,
   * })
   *
   * // Custom key generator (rate limit per user)
   * router.withRateLimit({
   *   max: 1000,
   *   windowSeconds: 3600,
   *   keyGenerator: (req) => req.headers.get('X-User-Id') || 'anonymous',
   * })
   *
   * // Skip rate limiting for certain paths
   * router.withRateLimit({
   *   max: 100,
   *   windowSeconds: 60,
   *   skip: (req) => new URL(req.url).pathname === '/health',
   * })
   * ```
   */
  withRateLimit(options: RateLimitOptions): this {
    this._state.rateLimit = options;
    return this;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BUILD
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Build the router with all configured options.
   *
   * @returns The configured IgniterRouter instance
   */
  build(): IgniterRouter<TContext, TControllers, TConfig, TPlugins, TDocs extends DocsConfig ? TDocs : DocsConfig> & {
    /** Router builder state for use by RequestProcessor */
    $builder: {
      middlewares: IgniterProcedure<TContext, any, any>[];
      errorHandler?: ErrorHandler;
      healthCheck?: { path: string };
      cors?: CorsOptions;
      rateLimit?: RateLimitOptions;
      onRequest?: OnRequestHook;
      onResponse?: OnResponseHook;
    };
  } {
    // Convert controllers Map to Record
    const controllers = Object.fromEntries(
      this._state.controllers,
    ) as TControllers;

    const builderState = {
      middlewares: this._state.middlewares,
      errorHandler: this._state.errorHandler as any,
      healthCheck: this._state.healthCheck,
      cors: this._state.cors as any,
      rateLimit: this._state.rateLimit as any,
      onRequest: this._state.onRequest as any,
      onResponse: this._state.onResponse as any,
    };

    // Create the base router - cast docs to satisfy DocsConfig constraint
    const router = createIgniterRouter<
      TContext,
      TControllers,
      TConfig,
      TPlugins,
      TDocs extends DocsConfig ? TDocs : DocsConfig
    >({
      context: this._context as TContext,
      controllers,
      config: this._config,
      plugins: this._plugins,
      docs: this._docs as (TDocs extends DocsConfig ? TDocs : DocsConfig),
      logger: this._logger,
      telemetry: this._telemetry,
      store: this._store,
      realtime: this._realtime,
      cache: this._cache,
      $builder: builderState,
    });

    return router as any;
  }
}

/**
 * Creates a new IgniterRouterBuilder instance.
 *
 * @example
 * ```typescript
 * import { createRouterBuilder } from '@igniter-js/core';
 *
 * const router = createRouterBuilder()
 *   .addController('users', usersController)
 *   .withCors({ origins: '*' })
 *   .build();
 * ```
 */
export function createRouterBuilder<
  TContext extends object = {},
  TConfig extends object = {},
  TPlugins extends Record<string, any> = {},
  TDocs extends object = {},
>(options?: {
  context?: TContext | (() => TContext) | (() => Promise<TContext>);
  config?: TConfig;
  plugins?: TPlugins;
  docs?: TDocs;
  logger?: IgniterLogger;
  telemetry?: IgniterCoreTelemetryManager;
  store?: IgniterStoreManager;
  realtime?: IgniterStoreRealtimeProcessor;
  cache?: IgniterStoreCacheProcessor;
}): IgniterRouterBuilder<TContext, {}, TConfig, TPlugins, TDocs> {
  return new IgniterRouterBuilder(options);
}
