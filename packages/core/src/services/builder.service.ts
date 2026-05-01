import { createIgniterProcedure } from "./procedure.service";
import { createIgniterMutation, createIgniterQuery } from "./action.service";
import { createIgniterController } from "./controller.service";
import { IgniterRouterBuilder } from "../builders/router.builder";
import type {
  StandardSchemaV1,
  IgniterProcedure,
  IgniterActionHandler,
  IgniterActionContext,
  QueryMethod,
  InferEndpoint,
  IgniterQueryOptions,
  MutationMethod,
  IgniterMutationOptions,
  IgniterControllerConfig,
  ContextCallback,
  Unwrap,
  IgniterBaseConfig,
  IgniterBuilderConfig,
  IgniterControllerBaseAction,
  IgniterStoreRealtimeProcessor,
  IgniterStoreCacheProcessor,
  DocsConfig,
} from "../types";
import type { IgniterStoreManager } from "../types/store.interface";
import type { IgniterLogger } from "../types/logger.interface";
import type {
  JobsNamespaceProxy,
  MergedJobsExecutor,
  JobsManagementProxy,
} from "../types/jobs.interface";
import type { IgniterCoreTelemetryManager } from "../types/telemetry.interface";
import { IgniterStoreRealtimeProcessor as IgniterStoreRealtimeProcessorImpl } from "./realtime.service";
import { IgniterStoreCacheProcessor as IgniterStoreCacheProcessorImpl } from "./cache.processor";
import { IgniterSSETransport } from "../realtime/transports/sse.transport";
import type { IIgniterTelemetryManager } from "@igniter-js/telemetry";

/**
 * Main builder class for the Igniter Framework.
 * Provides a fluent interface for creating and configuring all framework components.
 *
 * @template TContext - The type of the application context
 * @template TMiddlewares - The global middleware procedures
 * @template TStore - The store manager type
 * @template TLogger - The logger adapter type
 * @template TJobs - The job queue adapter type
 *
 * @example
 * // Initialize with new API (recommended)
 * const igniter = Igniter
 *   .withContext<{ db: Database }>()
 *   .withConfig({ basePATH: '/api/v1' })
 *   .withStore(storeManager)
 *   .withTelemetry(telemetryManager)
 *   .withLogger(logger)
 *   .addPlugin('auth', authPlugin)
 *   .create();
 *
 * // Create controllers and actions
 * const userController = igniter.controller({
 *   path: 'users',
 *   actions: {
 *     list: igniter.query({ ... }),
 *     create: igniter.mutation({ ...  })
 *   }
 * });
 */
export class IgniterBuilder<
  TContext extends object | ContextCallback,
  TConfig extends IgniterBaseConfig,
  TStore extends IgniterStoreManager,
  TLogger extends IgniterLogger,
  TJobs extends JobsNamespaceProxy<any> & JobsManagementProxy,
  TTelemetry extends IIgniterTelemetryManager<any, any, any>,
  TRealtime extends IgniterStoreRealtimeProcessor,
  TCache extends IgniterStoreCacheProcessor,
  TPlugins extends Record<string, any>,
  TDocs extends DocsConfig,
> {
  private _config: Partial<IgniterBuilderConfig<
    TContext,
    TConfig,
    TStore,
    TLogger,
    TJobs,
    TTelemetry,
    TRealtime,
    TCache,
    TPlugins,
    TDocs
  >> = {} as any;
  private _store: TStore;
  private _logger: TLogger;
  private _jobs: TJobs;
  private _telemetry: TTelemetry;
  private _realtime: TRealtime;
  private _cache: TCache;
  private _plugins: TPlugins = {} as TPlugins;
  private _docs: TDocs = {} as TDocs;

  constructor(
    config: Partial<IgniterBuilderConfig<
      TContext,
      TConfig,
      TStore,
      TLogger,
      TJobs,
      TTelemetry,
      TRealtime,
      TCache,
      TPlugins,
      TDocs
    >> = {} as any,
    store?: TStore,
    logger?: TLogger,
    jobs?: TJobs,
    telemetry?: TTelemetry,
    realtime?: TRealtime,
    cache?: TCache,
    plugins?: TPlugins,
    docs?: TDocs,
  ) {
    this._config = config;
    this._store = store || ({} as TStore);
    this._logger = logger as TLogger;
    this._jobs = jobs || ({} as TJobs);
    this._telemetry = telemetry || ({} as TTelemetry);
    this._realtime = realtime || ({} as TRealtime);
    this._cache = cache || ({} as TCache);
    this._plugins = plugins || ({} as TPlugins);
    this._docs = docs || ({} as TDocs);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STATIC FACTORY METHOD
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Creates a new Igniter builder instance.
   * This is the recommended entry point for configuring Igniter.
   *
   * @returns A new IgniterBuilder instance
   *
   * @example
   * ```typescript
   * const igniter = Igniter.create()
   *   .withContext<{ db: Database }>()
   *   .withConfig({ basePATH: '/api/v1' })
   *   .withStore(storeManager)
   *   .withTelemetry(telemetryManager)
   *   .addPlugin('auth', authPlugin)
   *   .build();
   * ```
   */
  static create(): IgniterBuilder<
    {},
    {},
    IgniterStoreManager,
    IgniterLogger,
    JobsNamespaceProxy<any> & JobsManagementProxy,
    IgniterCoreTelemetryManager,
    IgniterStoreRealtimeProcessor,
    IgniterStoreCacheProcessor,
    {},
    DocsConfig
  > {
    return new IgniterBuilder();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // NEW API (with* pattern) - RECOMMENDED
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Configure the application context.
   * Supports 4 modes:
   * 1. Type-only: withContext<MyType>() — just define the type, no runtime value
   * 2. Object: withContext({ db, auth })
   * 3. Sync function: withContext(() => ({ db, auth }))
   * 4. Async function: withContext(async () => ({ db, await getAuth() }))
   *
   * @example
   * // Type-only mode
   * Igniter.withContext<{ db: Database }>()
   *
   * // Direct object
   * Igniter.withContext({ db: new Database() })
   *
   * // Sync function
   * Igniter.withContext(() => ({ db: new Database() }))
   *
   * // Async function
   * Igniter.withContext(async () => ({ db: await Database.connect() }))
   */
  withContext<TNewContext extends object | ContextCallback>(
    contextOrFactory?: TNewContext,
  ): IgniterBuilder<
    TNewContext,
    TConfig,
    TStore,
    TLogger,
    TJobs,
    TTelemetry,
    TRealtime,
    TCache,
    TPlugins,
    TDocs
  > {
    return new IgniterBuilder<
      TNewContext,
      TConfig,
      TStore,
      TLogger,
      TJobs,
      TTelemetry,
      TRealtime,
      TCache,
      TPlugins,
      TDocs
    >(
      { ...this._config, context: contextOrFactory } as any,
      this._store,
      this._logger,
      this._jobs,
      this._telemetry,
      this._realtime,
      this._cache,
      this._plugins,
      this._docs,
    );
  }

  /**
   * Configure router settings like basePATH, baseURL, etc.
   *
   * @example
   * Igniter.withConfig({ basePATH: '/api/v2', baseURL: 'https://api.example.com' })
   */
  withConfig<TNewConfig extends TConfig>(
    routerConfig: TNewConfig,
  ): IgniterBuilder<
    TContext,
    TNewConfig,
    TStore,
    TLogger,
    TJobs,
    TTelemetry,
    TRealtime,
    TCache,
    TPlugins,
    TDocs
  > {
    return new IgniterBuilder(
      { ...this._config, config: routerConfig },
      this._store,
      this._logger,
      this._jobs,
      this._telemetry,
      this._realtime,
      this._cache,
      this._plugins,
      this._docs,
    );
  }

  /**
   * Configure a store adapter for caching, events, realtime, and distributed state.
   *
   * @example
   * const store = IgniterStore.create()
   *   .withAdapter(new IgniterStoreRedisAdapter({ url: 'redis://...' }))
   *   .build();
   *
   * Igniter.withStore(store)
   */
  withStore(
    storeManager: IgniterStoreManager<any, any>,
  ): IgniterBuilder<
    TContext,
    TConfig,
    IgniterStoreManager<any, any>,
    TLogger,
    TJobs,
    TTelemetry,
    IgniterStoreRealtimeProcessor,
    IgniterStoreCacheProcessor,
    TPlugins,
    TDocs
  > {
    const cache = new IgniterStoreCacheProcessorImpl(
      storeManager,
      this._logger,
    );
    const transport = new IgniterSSETransport(this._logger);
    const realtime = new IgniterStoreRealtimeProcessorImpl({
      store: storeManager,
      transport,
      cache,
      logger: this._logger,
      telemetry: this._telemetry,
    });

    return new IgniterBuilder<
      TContext,
      TConfig,
      IgniterStoreManager,
      TLogger,
      TJobs,
      TTelemetry,
      IgniterStoreRealtimeProcessor,
      IgniterStoreCacheProcessor,
      TPlugins,
      TDocs
    >(
      { ...this._config, store: storeManager, realtime, cache },
      storeManager,
      this._logger,
      this._jobs,
      this._telemetry,
      realtime,
      cache,
      this._plugins,
      this._docs,
    );
  }

  /**
   * Configure a logger adapter for structured logging.
   *
   * @example
   * const logger = IgniterConsoleLogger.create({ level: 'debug' });
   * Igniter.withLogger(logger)
   */
  withLogger(
    loggerAdapter: IgniterLogger,
  ): IgniterBuilder<
    TContext,
    TConfig,
    TStore,
    IgniterLogger,
    TJobs,
    TTelemetry,
    TRealtime,
    TCache,
    TPlugins,
    TDocs
  > {
    return new IgniterBuilder<
      TContext,
      TConfig,
      TStore,
      IgniterLogger,
      TJobs,
      TTelemetry,
      TRealtime,
      TCache,
      TPlugins,
      TDocs
    >(
      { ...this._config, logger: loggerAdapter },
      this._store,
      loggerAdapter,
      this._jobs,
      this._telemetry,
      this._realtime,
      this._cache,
      this._plugins,
      this._docs,
    );
  }

  /**
   * Configure a telemetry manager for observability.
   * Enables distributed tracing, metrics collection, and structured logging.
   *
   * @example
   * const telemetry = IgniterTelemetry.create()
   *   .withAdapter(new IgniterOTLPAdapter({ endpoint: '...' }))
   *   .build();
   *
   * Igniter.withTelemetry(telemetry)
   */
  withTelemetry<TTelemetryProvider extends IIgniterTelemetryManager<any, any, any>>(
    telemetryProvider: TTelemetryProvider,
  ): IgniterBuilder<
    TContext,
    TConfig,
    TStore,
    TLogger,
    TJobs,
    TTelemetryProvider,
    TRealtime,
    TCache,
    TPlugins,
    TDocs
  > {
    const realtime = (this._config.store
      ? new IgniterStoreRealtimeProcessorImpl({
        store: this._store as IgniterStoreManager,
        transport: new IgniterSSETransport(this._logger),
        cache: this._cache as IgniterStoreCacheProcessor,
        logger: this._logger,
        telemetry: telemetryProvider,
      })
      : this._realtime) as TRealtime;

    return new IgniterBuilder<
      TContext,
      TConfig,
      TStore,
      TLogger,
      TJobs,
      TTelemetryProvider,
      TRealtime,
      TCache,
      TPlugins,
      TDocs
    >(
      { ...this._config, telemetry: telemetryProvider },
      this._store,
      this._logger,
      this._jobs,
      telemetryProvider,
      realtime,
      this._cache,
      this._plugins,
      this._docs,
    );
  }

  /**
   * Add a single plugin to the Igniter instance.
   * Plugins provide self-contained functionality with actions, controllers, events, and lifecycle hooks.
   *
   * @param key - Unique identifier for the plugin
   * @param plugin - The plugin instance
   *
   * @example
   * Igniter
   *   .addPlugin('auth', authPlugin)
   *   .addPlugin('email', emailPlugin)
   *   .addPlugin('audit', auditPlugin)
   *   .create();
   */
  addPlugin<TKey extends string, TPlugin>(
    key: TKey,
    plugin: TPlugin,
  ): IgniterBuilder<
    TContext,
    TConfig,
    TStore,
    TLogger,
    TJobs,
    TTelemetry,
    TRealtime,
    TCache,
    TPlugins & { [K in TKey]: TPlugin },
    TDocs
  > {
    const newPlugins = { ...this._plugins, [key]: plugin } as TPlugins & { [K in TKey]: TPlugin };
    return new IgniterBuilder<
      TContext,
      TConfig,
      TStore,
      TLogger,
      TJobs,
      TTelemetry,
      TRealtime,
      TCache,
      TPlugins & { [K in TKey]: TPlugin },
      TDocs
    >(
      { ...this._config, plugins: newPlugins },
      this._store,
      this._logger,
      this._jobs,
      this._telemetry,
      this._realtime,
      this._cache,
      newPlugins,
      this._docs,
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DEPRECATED API - Keep for backwards compatibility
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * @deprecated Use `withContext()` instead. This method will be removed in v1.0.
   *
   * Configure the context function.
   */
  context<TNewContext extends object | ContextCallback>(
    contextFn: TNewContext,
  ): IgniterBuilder<
    TNewContext,
    TConfig,
    TStore,
    TLogger,
    TJobs,
    TTelemetry,
    TRealtime,
    TCache,
    TPlugins,
    TDocs
  > {
    console.warn(
      '[Igniter] DEPRECATED: .context() will be removed in v1.0\n' +
      '  Migration: Replace .context(fn) with .withContext(fn)\n' +
      '  Example: Igniter.create().withContext<MyContext>().build()'
    );
    return this.withContext<TNewContext>(contextFn);
  }

  /**
   * @deprecated Use `withConfig()` instead. This method will be removed in v1.0.
   *
   * Configure router settings.
   */
  config<TNewConfig extends TConfig>(
    routerConfig: TNewConfig,
  ): IgniterBuilder<
    TContext,
    TNewConfig,
    TStore,
    TLogger,
    TJobs,
    TTelemetry,
    TRealtime,
    TCache,
    TPlugins,
    TDocs
  > {
    console.warn(
      '[Igniter] DEPRECATED: .config() will be removed in v1.0\n' +
      '  Migration: Replace .config(options) with .withConfig(options)\n' +
      '  Example: Igniter.create().withConfig({ basePATH: "/api" }).build()'
    );
    return this.withConfig(routerConfig);
  }

  /**
   * @deprecated Use `withStore()` instead. This method will be removed in v1.0.
   *
   * Configure a store adapter for caching, events, and more.
   */
  store(
    storeManager: IgniterStoreManager,
  ): IgniterBuilder<
    TContext,
    TConfig,
    IgniterStoreManager,
    TLogger,
    TJobs,
    TTelemetry,
    IgniterStoreRealtimeProcessor,
    IgniterStoreCacheProcessor,
    TPlugins,
    TDocs
  > {
    console.warn(
      '[Igniter] DEPRECATED: .store() will be removed in v1.0\n' +
      '  Migration: Replace .store(manager) with .withStore(manager)\n' +
      '  Example: Igniter.create().withStore(storeManager).build()'
    );
    return this.withStore(storeManager);
  }

  /**
   * @deprecated Use `withLogger()` instead. This method will be removed in v1.0.
   *
   * Configure a logger adapter for logging.
   */
  logger(
    loggerAdapter: IgniterLogger,
  ): IgniterBuilder<
    TContext,
    TConfig,
    TStore,
    IgniterLogger,
    TJobs,
    TTelemetry,
    TRealtime,
    TCache,
    TPlugins,
    TDocs
  > {
    console.warn(
      '[Igniter] DEPRECATED: .logger() will be removed in v1.0\n' +
      '  Migration: Replace .logger(adapter) with .withLogger(adapter)\n' +
      '  Example: Igniter.create().withLogger(consoleLogger).build()'
    );
    return this.withLogger(loggerAdapter);
  }

  /**
   * @deprecated Jobs are no longer supported in the core builder. 
   * Use a jobs plugin or manage jobs externally. This method will be removed in v1.0.
   *
   * Configure a job queue adapter for background processing.
   */
  jobs<
    TJobsAdapter extends MergedJobsExecutor<any>,
    TJobsProxy extends JobsNamespaceProxy<any> & JobsManagementProxy = ReturnType<
      Awaited<TJobsAdapter>["createProxy"]
    >,
  >(jobsAdapter: TJobsAdapter) {
    console.warn(
      '[Igniter] DEPRECATED: .jobs() will be removed in v1.0\n' +
      '  Migration: Jobs are now managed externally or via plugins.\n' +
      '  See: https://igniter.js.com/docs/migration/jobs'
    );
    const jobsProxy = jobsAdapter.createProxy() as TJobsProxy;

    return new IgniterBuilder<
      TContext,
      TConfig,
      TStore,
      TLogger,
      TJobsProxy,
      TTelemetry,
      TRealtime,
      TCache,
      TPlugins,
      TDocs
    >(
      { ...this._config, jobs: jobsProxy },
      this._store,
      this._logger,
      jobsProxy,
      this._telemetry,
      this._realtime,
      this._cache,
      this._plugins,
      this._docs,
    );
  }

  /**
   * @deprecated Use `withTelemetry()` instead. This method will be removed in v1.0.
   *
   * Configure a telemetry manager for observability.
   */
  telemetry<TTelemetryProvider extends IgniterCoreTelemetryManager>(
    telemetryProvider: TTelemetryProvider,
  ): IgniterBuilder<
    TContext,
    TConfig,
    TStore,
    TLogger,
    TJobs,
    TTelemetryProvider,
    TRealtime,
    TCache,
    TPlugins,
    TDocs
  > {
    console.warn(
      '[Igniter] DEPRECATED: .telemetry() will be removed in v1.0\n' +
      '  Migration: Replace .telemetry(manager) with .withTelemetry(manager)\n' +
      '  Example: Igniter.create().withTelemetry(telemetryManager).build()'
    );
    return this.withTelemetry(telemetryProvider);
  }

  /**
   * @deprecated Use `addPlugin()` instead. This method will be removed in v1.0.
   *
   * Register plugins with the Igniter Router
   */
  plugins<TNewPlugins extends Record<string, any>>(
    pluginsRecord: TNewPlugins,
  ): IgniterBuilder<
    TContext,
    TConfig,
    TStore,
    TLogger,
    TJobs,
    TTelemetry,
    TRealtime,
    TCache,
    TNewPlugins,
    TDocs
  > {
    console.warn(
      '[Igniter] DEPRECATED: .plugins() will be removed in v1.0\n' +
      '  Migration: Replace .plugins({ key: plugin }) with .addPlugin("key", plugin)\n' +
      '  Example: Igniter.create().addPlugin("auth", authPlugin).build()'
    );
    return new IgniterBuilder<
      TContext,
      TConfig,
      TStore,
      TLogger,
      TJobs,
      TTelemetry,
      TRealtime,
      TCache,
      TNewPlugins,
      TDocs
    >(
      { ...this._config, plugins: pluginsRecord },
      this._store,
      this._logger,
      this._jobs,
      this._telemetry,
      this._realtime,
      this._cache,
      pluginsRecord,
      this._docs,
    );
  }

  /**
   * @deprecated Docs configuration is no longer supported in the core builder. 
   * Configure docs via plugins or external tools. This method will be removed in v1.0.
   */
  docs<TNewDocs extends DocsConfig>(
    docsConfig: TNewDocs,
  ): IgniterBuilder<
    TContext,
    TConfig,
    TStore,
    TLogger,
    TJobs,
    TTelemetry,
    TRealtime,
    TCache,
    TPlugins,
    TNewDocs
  > {
    console.warn(
      '[Igniter] DEPRECATED: .docs() will be removed in v1.0\n' +
      '  Migration: Configure docs via OpenAPI plugin or external tools.\n' +
      '  See: https://igniter.js.com/docs/migration/docs'
    );
    return new IgniterBuilder(
      { ...this._config, docs: docsConfig },
      this._store,
      this._logger,
      this._jobs,
      this._telemetry,
      this._realtime,
      this._cache,
      this._plugins,
      docsConfig,
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BUILD - Finalizes the builder and returns the API
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Builds and returns the Igniter API with all configured options.
   * This is the final step in the builder chain.
   *
   * @returns The configured Igniter API with query, mutation, controller, and router factories
   *
   * @example
   * ```typescript
   * const igniter = Igniter.create()
   *   .withContext<{ db: Database }>()
   *   .withStore(storeManager)
   *   .build();
   *
   * // Use the API
   * const userController = igniter.controller({ ... });
   * const router = igniter.router({ controllers: { users: userController } });
   * ```
   */
  build() {
    type TContextCallback = Unwrap<TContext>;
    type TInferedContext = TContextCallback extends object
      ? TContextCallback
      : TContext;

    return {
      /**
       * Creates a query action for retrieving data.
       */
      query: <
        TQueryPath extends string,
        TQueryQuery extends StandardSchemaV1 | undefined,
        TQueryMiddlewares extends
        | IgniterProcedure<any, any, unknown>[]
        | undefined,
        TQueryHandler extends IgniterActionHandler<
          IgniterActionContext<
            TInferedContext,
            TQueryPath,
            QueryMethod,
            undefined,
            TQueryQuery,
            TQueryMiddlewares,
            TPlugins
          >,
          unknown
        >,
        TQueryResponse extends ReturnType<TQueryHandler>,
        TQueryInfer extends InferEndpoint<
          TInferedContext,
          TQueryPath,
          QueryMethod,
          undefined,
          TQueryQuery,
          TQueryMiddlewares,
          TPlugins,
          TQueryHandler,
          TQueryResponse
        >,
      >(
        options: IgniterQueryOptions<
          TInferedContext,
          TQueryPath,
          TQueryQuery,
          TQueryMiddlewares,
          TPlugins,
          TQueryHandler
        >,
      ) =>
        createIgniterQuery<
          TInferedContext,
          TQueryPath,
          TQueryQuery,
          TQueryMiddlewares,
          TPlugins,
          TQueryHandler,
          TQueryResponse,
          TQueryInfer
        >(options),

      /**
       * Creates a mutation action for modifying data.
       */
      mutation: <
        TMutationPath extends string,
        TMutationMethod extends MutationMethod,
        TMutationBody extends StandardSchemaV1 | undefined,
        TMutationQuery extends StandardSchemaV1 | undefined,
        TMutationMiddlewares extends
        | IgniterProcedure<any, any, unknown>[]
        | undefined,
        TMutationHandler extends IgniterActionHandler<
          IgniterActionContext<
            TInferedContext,
            TMutationPath,
            TMutationMethod,
            TMutationBody,
            TMutationQuery,
            TMutationMiddlewares,
            TPlugins
          >,
          unknown
        >,
        TMutationResponse extends ReturnType<TMutationHandler>,
        TMutationInfer extends InferEndpoint<
          TInferedContext,
          TMutationPath,
          TMutationMethod,
          TMutationBody,
          TMutationQuery,
          TMutationMiddlewares,
          TPlugins,
          TMutationHandler,
          TMutationResponse
        >,
      >(
        options: IgniterMutationOptions<
          TInferedContext,
          TMutationPath,
          TMutationMethod,
          TMutationBody,
          TMutationQuery,
          TMutationMiddlewares,
          TPlugins,
          TMutationHandler
        >,
      ) =>
        createIgniterMutation<
          TInferedContext,
          TMutationPath,
          TMutationMethod,
          TMutationBody,
          TMutationQuery,
          TMutationMiddlewares,
          TPlugins,
          TMutationHandler,
          TMutationResponse,
          TMutationInfer
        >(options),

      /**
       * Creates a controller to group related actions.
       */
      controller: <
        TActions extends Record<string, IgniterControllerBaseAction>,
      >(
        config: IgniterControllerConfig<TActions>,
      ) => createIgniterController<TActions>(config),

      /**
       * Creates a router builder with enhanced configuration options.
       * Returns an IgniterRouterBuilder for fluent API.
       *
       * @example
       * ```typescript
       * // Simple usage (backwards compatible)
       * const router = igniter.router({ controllers: { users, posts } });
       *
       * // Advanced usage with fluent API
       * const router = igniter.router.create()
       *   .addController('users', usersController)
       *   .addController('posts', postsController)
       *   .addMiddleware(authMiddleware)
       *   .onError((err, ctx, req) => handleError(err))
       *   .withHealthCheck('/health')
       *   .withCors({ origins: ['https://myapp.com'] })
       *   .build();
       * ```
       */
      router: {
        create: () => {
          const builder = new IgniterRouterBuilder<
            TInferedContext,
            {},
            TConfig,
            TPlugins,
            TDocs
          >({
            context: this._config.context as TInferedContext,
            config: {
              ...(this._config.config || ({} as TConfig)),
              docs: this._docs,
            } as TConfig,
            plugins: this._plugins,
            docs: this._docs,
            logger: this._logger,
            telemetry: this._telemetry,
            store: this._store,
            realtime: this._realtime,
            cache: this._cache,
          });

          // Otherwise return the builder for fluent API usage
          return builder;
        }
      },

      /**
       * Creates a reusable middleware procedure.
       */
      procedure: <TOptions extends Record<string, any>, TOutput>(
        middleware: IgniterProcedure<TInferedContext, TOptions, TOutput>,
      ) => createIgniterProcedure(middleware),

      $Infer: {
        context: {} as TInferedContext,
        config: {} as TConfig,
        store: {} as TStore,
        logger: {} as TLogger,
        jobs: {} as TJobs,
        telemetry: {} as TTelemetry,
        realtime: {} as TRealtime,
        cache: {} as TCache,
        plugins: {} as TPlugins,
        docs: {} as TDocs,
      },
    };
  }

  /**
   * @deprecated Use `build()` instead. This method will be removed in v1.0.
   *
   * Creates the API with global middleware types inferred.
   */
  create() {
    console.warn(
      '[Igniter] DEPRECATED: .create() (instance method) will be removed in v1.0\n' +
      '  Migration: Replace .create() with .build()\n' +
      '  Example: Igniter.create().withContext<MyContext>().build()'
    );
    return this.build();
  }
}

/**
 * Igniter builder class for creating Igniter instances.
 *
 * Use `Igniter.create()` to start building your Igniter configuration.
 *
 * @example
 * ```typescript
 * // Recommended pattern
 * const igniter = Igniter.create()
 *   .withContext<{ db: Database }>()
 *   .withConfig({ basePATH: '/api/v1' })
 *   .withStore(storeManager)
 *   .withTelemetry(telemetryManager)
 *   .withLogger(logger)
 *   .addPlugin('auth', authPlugin)
 *   .build();
 *
 * // Create controllers
 * const userController = igniter.controller({
 *   path: 'users',
 *   actions: {
 *     list: igniter.query({ ... }),
 *     create: igniter.mutation({ ... }),
 *   }
 * });
 *
 * // Create router
 * const router = igniter.router({
 *   controllers: { users: userController }
 * });
 * ```
 */
export const Igniter = IgniterBuilder;
