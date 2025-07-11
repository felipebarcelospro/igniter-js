import type { IgniterRealtimeService } from "../services/realtime.service";
import type { JobsNamespaceProxy } from "./jobs.interface";
import type { IgniterLogger } from "./logger.interface";
import type { IgniterProcedure } from "./procedure.interface";
import type { IgniterStoreAdapter } from "./store.interface";
import type { IgniterTelemetryProvider } from "./telemetry.interface";
import type { IgniterBuilder } from "../services";
import type { ContextCallback } from "./context.interface";
import type { IgniterPlugin, PluginActionsCollection, PluginSelfContext } from "./plugin.interface";

/**
 * Base configuration interface for the Igniter Framework.
 * Defines the base configuration options that can be applied to an Igniter application instance.
 */
export type IgniterBaseConfig = {
  baseURL?: string;
  basePATH?: string;
}


/**
 * Configuration interface for the Igniter Framework builder setup.
 * Defines all the core adapters and configuration options that can be applied
 * to an Igniter application instance.
 * 
 * @template TContext - The application context type (object or callback function)
 * @template TStore - The store adapter type for data persistence and caching
 * @template TLogger - The logger adapter type for structured logging
 * @template TJobs - The job queue adapter type for background processing
 * @template TTelemetry - The telemetry provider type for observability
 * 
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * // Basic configuration
 * type BasicConfig = IgniterBuilderConfig<
 *   { db: Database },
 *   RedisStoreAdapter,
 *   ConsoleLogger,
 *   BullMQAdapter,
 *   OpenTelemetryProvider
 * >;
 * 
 * // Configuration with context callback
 * type CallbackConfig = IgniterBuilderConfig<
 *   (req: Request) => Promise<{ user: User; db: Database }>,
 *   IgniterStoreAdapter,
 *   IgniterLogger,
 *   JobsNamespaceProxy<any>,
 *   IgniterTelemetryProvider
 * >;
 * ```
 */
export interface IgniterBuilderConfig<
  TContext extends object | ContextCallback,
  TConfig extends IgniterBaseConfig,
  TStore extends IgniterStoreAdapter = any,
  TLogger extends IgniterLogger = any,
  TJobs extends JobsNamespaceProxy<TContext> = any,
  TTelemetry extends IgniterTelemetryProvider = any,
  TPlugins extends Record<string, IgniterPlugin<any, any, any, any, any, any, any, any>> = Record<string, any>,
> {
  /** 
   * Base context function or object that provides application-wide dependencies.
   * Can be a static object or a function that receives a Request and returns context.
   * 
   * @example
   * ```typescript
   * // Static context
   * context: { db: database, config: appConfig }
   * 
   * // Dynamic context with request
   * context: async (req: Request) => ({
   *   db: database,
   *   user: await getUserFromRequest(req),
   *   requestId: crypto.randomUUID()
   * })
   * ```
   */
  context?: TContext;
  
  /** 
   * Global middleware procedures that run before all actions.
   * These procedures can modify the context, validate requests, or perform
   * cross-cutting concerns like authentication and logging.
   * 
   * @example
   * ```typescript
   * middleware: [
   *   authProcedure({ required: false }),
   *   rateLimitProcedure({ max: 100, windowMs: 60000 }),
   *   requestLoggerProcedure()
   * ]
   * ```
   */
  middleware?: readonly IgniterProcedure<any, any, any>[];
  
  /** 
   * Store adapter for data persistence, caching, pub/sub messaging, and sessions.
   * Provides a unified interface for different storage backends like Redis, 
   * in-memory, or database-backed stores.
   * 
   * @example
   * ```typescript
   * store: createRedisStoreAdapter({
   *   host: 'localhost',
   *   port: 6379,
   *   password: process.env.REDIS_PASSWORD
   * })
   * ```
   */
  store: TStore extends IgniterStoreAdapter ? TStore : never;
  
  /** 
   * Logger adapter for structured logging with configurable levels and outputs.
   * Supports different logging backends like console, file, or external services.
   * 
   * @example
   * ```typescript
   * logger: createConsoleLogger({
   *   level: 'info',
   *   colorize: true,
   *   context: { service: 'api', version: '1.0.0' }
   * })
   * ```
   */
  logger: TLogger extends IgniterLogger ? TLogger : never;
  
  /** 
   * Job queue adapter for background processing and scheduled tasks.
   * Enables asynchronous task execution, retries, and job monitoring.
   * 
   * @example
   * ```typescript
   * jobs: createBullMQAdapter({
   *   store: redisStore,
   *   defaultJobOptions: {
   *     removeOnComplete: 10,
   *     removeOnFail: 50,
   *     attempts: 3
   *   }
   * })
   * ```
   */
  jobs: TJobs extends JobsNamespaceProxy<any> ? TJobs : never;
  
  /** 
   * Telemetry provider for distributed tracing, metrics, and observability.
   * Integrates with monitoring platforms like OpenTelemetry, Datadog, or custom solutions.
   * 
   * @example
   * ```typescript
   * telemetry: createOpenTelemetryProvider({
   *   serviceName: 'igniter-api',
   *   serviceVersion: '1.0.0',
   *   traceExporter: 'jaeger',
   *   metricExporter: 'prometheus'
   * })
   * ```
   */
  telemetry: TTelemetry extends IgniterTelemetryProvider ? TTelemetry : never;
  
  /** 
   * Router-level configuration for URL handling and routing behavior.
   * 
   * @example
   * ```typescript
   * config: {
   *   baseURL: 'https://api.example.com',
   *   basePATH: '/api/v1'
   * }
   * ```
   */
  config?: TConfig;

  /**
   * Realtime service for event-driven communication.
   * Enables real-time updates and notifications to clients.
   */
  realtime: IgniterRealtimeService

  /**
   * Plugin registry for type-safe access to plugin actions and events.
   * Provides IntelliSense and type checking for all registered plugins.
   */
  plugins: TPlugins;
}

/**
 * Function signature for builder extension utilities.
 * Used to create reusable configuration functions that can be composed together.
 * 
 * @template TContext - The application context type
 * 
 * @example
 * ```typescript
 * const withAuth: IgniterBuilderExtension<AppContext> = (builder) =>
 *   builder.middleware([authProcedure({ required: true })]);
 * 
 * const withRateLimit: IgniterBuilderExtension<AppContext> = (builder) =>
 *   builder.middleware([rateLimitProcedure({ max: 100 })]);
 * 
 * // Compose multiple extensions
 * const igniter = Igniter
 *   .context<AppContext>()
 *   .extend(withAuth)
 *   .extend(withRateLimit)
 *   .create();
 * ```
 */
export type IgniterBuilderExtension<TContext extends object, TConfig extends IgniterBaseConfig, TMiddlewares extends readonly IgniterProcedure<any, any, any>[], TStore extends IgniterStoreAdapter, TLogger extends IgniterLogger, TJobs extends JobsNamespaceProxy<any>, TTelemetry extends IgniterTelemetryProvider, TRealtime extends IgniterRealtimeService, TPlugins extends Record<string, IgniterPlugin<any, any, any, any, any, any, any, any>>> = (
  builder: IgniterBuilder<TContext, TConfig, TMiddlewares, TStore, TLogger, TJobs, TTelemetry, TRealtime, TPlugins>,
) => IgniterBuilder<TContext, TConfig, TMiddlewares, TStore, TLogger, TJobs, TTelemetry, TRealtime, TPlugins>;

/**
 * Collection of helper functions for common builder configuration patterns.
 * These utilities provide convenient ways to configure authentication, middlewares,
 * and other common patterns in a reusable and composable manner.
 * 
 * @example
 * ```typescript
 * import { Igniter } from '@igniter-js/core';
 * 
 * const igniter = Igniter
 *   .context<AppContext>()
 *   .helpers.compose(
 *     Igniter.helpers.withAuth(authMiddleware),
 *     Igniter.helpers.withConfig({ baseURL: 'https://api.example.com' }),
 *     Igniter.helpers.withMiddlewares([rateLimitMiddleware, corsMiddleware])
 *   )
 *   .create();
 * ```
 */
export type IgniterHelpers<TContext extends object, TConfig extends IgniterBaseConfig> = {
  /**
   * Configures the context function for the builder.
   * Sets up the application context that will be available to all actions and procedures.
   * 
   * @param contextFn - Function that creates the context from a request
   * @returns Builder extension function
   * 
   * @example
   * ```typescript
   * const withDatabaseContext = Igniter.helpers.withContext(async (req) => ({
   *   db: await createDatabaseConnection(),
   *   user: await getUserFromRequest(req),
   *   requestId: req.headers.get('x-request-id') || crypto.randomUUID()
   * }));
   * ```
   */
  withContext: <TContext extends object, TConfig extends IgniterBaseConfig, TMiddlewares extends readonly IgniterProcedure<any, any, any>[], TStore extends IgniterStoreAdapter, TLogger extends IgniterLogger, TJobs extends JobsNamespaceProxy<any>, TTelemetry extends IgniterTelemetryProvider, TRealtime extends IgniterRealtimeService, TPlugins extends Record<string, IgniterPlugin<any, any, any, any, any, any, any, any>>>(
    contextFn: (request: Request) => TContext | Promise<TContext>,
  ) => (builder: IgniterBuilder<TContext, TConfig, TMiddlewares, TStore, TLogger, TJobs, TTelemetry, TRealtime, TPlugins>) => IgniterBuilder<TContext, TConfig, TMiddlewares, TStore, TLogger, TJobs, TTelemetry, TRealtime, TPlugins>;

  /**
   * Adds an authentication middleware to the builder.
   * Provides a convenient way to add authentication as a global middleware.
   * 
   * @param authMiddleware - The authentication procedure to apply globally
   * @returns Builder extension function
   * 
   * @example
   * ```typescript
   * const authProcedure = igniter.procedure()
   *   .options(z.object({ required: z.boolean() }))
   *   .handler(async ({ options, request }) => {
   *     const token = request.headers.get('authorization');
   *     if (options.required && !token) {
   *       throw new Error('Authentication required');
   *     }
   *     return { auth: { user: await verifyToken(token) } };
   *   });
   * 
   * const withAuth = Igniter.helpers.withAuth(authProcedure({ required: false }));
   * ```
   */
  withAuth: <TContext extends object, TConfig extends IgniterBaseConfig, TMiddlewares extends readonly IgniterProcedure<any, any, any>[], TStore extends IgniterStoreAdapter, TLogger extends IgniterLogger, TJobs extends JobsNamespaceProxy<any>, TTelemetry extends IgniterTelemetryProvider, TRealtime extends IgniterRealtimeService, TPlugins extends Record<string, IgniterPlugin<any, any, any, any, any, any, any, any>>>(
    authMiddleware: IgniterProcedure<TContext, any, any>,
  ) => (builder: IgniterBuilder<TContext, TConfig, TMiddlewares, TStore, TLogger, TJobs, TTelemetry, TRealtime, TPlugins>) => IgniterBuilder<TContext, TConfig, TMiddlewares, TStore, TLogger, TJobs, TTelemetry, TRealtime, TPlugins>;

  /**
   * Adds multiple middlewares to the builder in a single operation.
   * Useful for applying a set of related middlewares together.
   * 
   * @param middlewares - Array of middleware procedures to apply
   * @returns Builder extension function
   * 
   * @example
   * ```typescript
   * const securityMiddlewares = [
   *   corsMiddleware({ origin: ['https://example.com'] }),
   *   rateLimitMiddleware({ max: 100, windowMs: 60000 }),
   *   authMiddleware({ required: false })
   * ];
   * 
   * const withSecurity = Igniter.helpers.withMiddlewares(securityMiddlewares);
   * ```
   */
  withMiddlewares: <TContext extends object, TConfig extends IgniterBaseConfig, TMiddlewares extends readonly IgniterProcedure<any, any, any>[], TStore extends IgniterStoreAdapter, TLogger extends IgniterLogger, TJobs extends JobsNamespaceProxy<any>, TTelemetry extends IgniterTelemetryProvider, TRealtime extends IgniterRealtimeService, TPlugins extends Record<string, IgniterPlugin<any, any, any, any, any, any, any, any>>>(
    middlewares: readonly IgniterProcedure<TContext, any, any>[],
  ) => (builder: IgniterBuilder<TContext, TConfig, TMiddlewares, TStore, TLogger, TJobs, TTelemetry, TRealtime, TPlugins>) => IgniterBuilder<TContext, TConfig, TMiddlewares, TStore, TLogger, TJobs, TTelemetry, TRealtime, TPlugins>;

  /**
   * Configures router settings for the builder.
   * Sets up base URL and path configuration for the application.
   * 
   * @param config - Router configuration options
   * @returns Builder extension function
   * 
   * @example
   * ```typescript
   * const withApiConfig = Igniter.helpers.withConfig({
   *   baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
   *   basePATH: '/api/v1'
   * });
   * ```
   */
  withConfig: <TContext extends object, TConfig extends IgniterBaseConfig, TMiddlewares extends readonly IgniterProcedure<any, any, any>[], TStore extends IgniterStoreAdapter, TLogger extends IgniterLogger, TJobs extends JobsNamespaceProxy<any>, TTelemetry extends IgniterTelemetryProvider, TRealtime extends IgniterRealtimeService, TPlugins extends Record<string, IgniterPlugin<any, any, any, any, any, any, any, any>>>(
    config: TConfig,
  ) => (builder: IgniterBuilder<TContext, TConfig, TMiddlewares, TStore, TLogger, TJobs, TTelemetry, TRealtime, TPlugins>) => IgniterBuilder<TContext, TConfig, TMiddlewares, TStore, TLogger, TJobs, TTelemetry, TRealtime, TPlugins>;

  /**
   * Composes multiple builder configuration functions together.
   * Enables functional composition of builder extensions for cleaner setup.
   * 
   * @param configs - Array of builder extension functions to compose
   * @returns Composed builder extension function
   * 
   * @example
   * ```typescript
   * const productionConfig = Igniter.helpers.compose(
   *   Igniter.helpers.withContext(createProductionContext),
   *   Igniter.helpers.withAuth(authMiddleware),
   *   Igniter.helpers.withConfig({
   *     baseURL: 'https://api.production.com',
   *     basePATH: '/api/v1'
   *   }),
   *   Igniter.helpers.withMiddlewares([
   *     rateLimitMiddleware({ max: 1000 }),
   *     corsMiddleware({ origin: ['https://app.production.com'] })
   *   ])
   * );
   * 
   * const igniter = Igniter.context<AppContext>().extend(productionConfig).create();
   * ```
   */
  compose: <TContext extends object, TConfig extends IgniterBaseConfig, TMiddlewares extends readonly IgniterProcedure<any, any, any>[], TStore extends IgniterStoreAdapter, TLogger extends IgniterLogger, TJobs extends JobsNamespaceProxy<any>, TTelemetry extends IgniterTelemetryProvider, TRealtime extends IgniterRealtimeService, TPlugins extends Record<string, IgniterPlugin<any, any, any, any, any, any, any, any>>>(
    ...configs: Array<
      (builder: IgniterBuilder<TContext, TConfig, TMiddlewares, TStore, TLogger, TJobs, TTelemetry, TRealtime, TPlugins>) => IgniterBuilder<TContext, TConfig, TMiddlewares, TStore, TLogger, TJobs, TTelemetry, TRealtime, TPlugins>
    >
  ) => (builder: IgniterBuilder<TContext, TConfig, TMiddlewares, TStore, TLogger, TJobs, TTelemetry, TRealtime, TPlugins>) => IgniterBuilder<TContext, TConfig, TMiddlewares, TStore, TLogger, TJobs, TTelemetry, TRealtime, TPlugins>;
};

// ============ PLUGIN TYPE HELPERS ============

/**
 * Extract plugin registry from plugins record for type-safe access.
 * Transforms a plugins record into a registry with plugin proxies.
 * 
 * @template TPlugins - Record of plugin name to plugin instance
 * 
 * @example
 * ```typescript
 * type MyPlugins = { 
 *   audit: AuditPlugin, 
 *   auth: AuthPlugin,
 *   email: EmailPlugin 
 * };
 * type Registry = InferPluginRegistry<MyPlugins>;
 * // Result: { 
 * //   audit: PluginSelfContext<any, AuditActions>, 
 * //   auth: PluginSelfContext<any, AuthActions>,
 * //   email: PluginSelfContext<any, EmailActions>
 * // }
 * ```
 */
export type InferPluginRegistry<TPlugins extends Record<string, any>> = {
  [K in keyof TPlugins]: TPlugins[K] extends { $actions: infer TActions extends PluginActionsCollection<any> }
    ? PluginSelfContext<any, TActions>
    : never;
};

/**
 * Extract plugin actions from a single plugin for type inference.
 * 
 * @template TPlugin - Plugin instance type
 * 
 * @example
 * ```typescript
 * type AuditActions = InferPluginActions<typeof auditPlugin>;
 * // Result: { create: PluginAction, getUserLogs: PluginAction, ... }
 * ```
 */
export type InferPluginActions<TPlugin> = TPlugin extends { $actions: infer TActions }
  ? TActions
  : never;

/**
 * Extract plugin controllers from a single plugin for route registration.
 * 
 * @template TPlugin - Plugin instance type
 * 
 * @example
 * ```typescript
 * type AuditControllers = InferPluginControllers<typeof auditPlugin>;
 * // Result: { logs: PluginControllerAction, getUserLogs: PluginControllerAction, ... }
 * ```
 */
export type InferPluginControllers<TPlugin> = TPlugin extends { $controllers: infer TControllers }
  ? TControllers
  : never;

/**
 * Extract context extensions from plugins for global context enhancement.
 * Infers the return type of each plugin's extendContext hook.
 * 
 * @template TPlugins - Record of plugin name to plugin instance
 * 
 * @example
 * ```typescript
 * type MyPlugins = { audit: AuditPlugin, auth: AuthPlugin };
 * type Extensions = InferPluginContextExtensions<MyPlugins>;
 * // Result: { audit: AuditContext, auth: AuthContext }
 * 
 * // Usage in action:
 * handler: async (ctx) => {
 *   console.log(ctx.context.audit.userId);     // ✅ Type-safe!
 *   console.log(ctx.context.auth.currentUser); // ✅ Type-safe!
 * }
 * ```
 */
export type InferPluginContextExtensions<TPlugins extends Record<string, any>> = {
  [K in keyof TPlugins]: TPlugins[K] extends { hooks: { extendContext: (...args: any[]) => infer TExtension } }
    ? TPlugins[K]['hooks']['extendContext'] extends (...args: any[]) => infer TExtension
      ? TExtension extends Promise<infer U>
        ? U
        : TExtension
      : {}
    : {};
};

/**
 * Type-safe plugin configuration for builder registration.
 * Ensures all plugins implement the IgniterPlugin interface correctly.
 * 
 * @template TPlugins - Record of plugin name to plugin instance
 * 
 * @example
 * ```typescript
 * const plugins: PluginConfiguration = {
 *   audit: auditPlugin,    // ✅ Type-checked
 *   auth: authPlugin,      // ✅ Type-checked  
 *   email: emailPlugin     // ✅ Type-checked
 * };
 * 
 * const igniter = Igniter
 *   .context<AppContext>()
 *   .plugins(plugins)      // ✅ Full IntelliSense
 *   .create();
 * ```
 */
export type PluginConfiguration<TPlugins extends Record<string, any> = Record<string, any>> = {
  [K in keyof TPlugins]: TPlugins[K] extends { $actions: infer TActions }
    ? TPlugins[K]
    : never;
};

/**
 * Merge plugin context extensions with base context for enhanced typing.
 * Creates a union type of base context and all plugin extensions.
 * 
 * @template TBaseContext - Base application context
 * @template TPlugins - Record of registered plugins  
 * 
 * @example
 * ```typescript
 * type AppContext = { db: Database, user: User };
 * type MyPlugins = { audit: AuditPlugin, auth: AuthPlugin };
 * type EnhancedContext = MergePluginContexts<AppContext, MyPlugins>;
 * // Result: AppContext & { audit: AuditContext, auth: AuthContext }
 * ```
 */
export type MergePluginContexts<
  TBaseContext extends object,
  TPlugins extends Record<string, any>
> = TBaseContext & InferPluginContextExtensions<TPlugins>;

/**
 * Type-safe plugin proxy access for action contexts.
 * Provides IntelliSense and type checking for plugin usage in actions.
 * 
 * @template TPlugins - Record of registered plugins
 * 
 * @example
 * ```typescript
 * type MyPlugins = { audit: AuditPlugin, auth: AuthPlugin };
 * type PluginProxies = PluginProxyAccess<MyPlugins>;
 * 
 * // Usage in action handler:
 * handler: async (ctx) => {
 *   // ✅ Full IntelliSense and type safety
 *   await ctx.plugins.audit.actions.create({ action: 'user:login' });
 *   await ctx.plugins.auth.actions.validateToken({ token: 'abc123' });
 *   
 *   // ✅ Plugin events with type safety
 *   await ctx.plugins.audit.emit('user:activity', { userId: '123' });
 * }
 * ```
 */
export type PluginProxyAccess<TPlugins extends Record<string, any>> = InferPluginRegistry<TPlugins>;