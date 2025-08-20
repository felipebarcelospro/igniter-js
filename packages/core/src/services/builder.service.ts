import { createIgniterProcedure } from "./procedure.service";
import { createIgniterMutation, createIgniterQuery } from "./action.service";
import { createIgniterRouter } from "./router.service";
import { createIgniterController } from "./controller.service";
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
  InferActionProcedureContext,
  InferIgniterContext,
  IgniterControllerBaseAction,
  IgniterRealtimeService as IgniterRealtimeServiceType,
  DocsConfig,
} from "../types";
import type { IgniterStoreAdapter } from "../types/store.interface";
import type { IgniterLogger } from "../types/logger.interface";
import type {
  JobsNamespaceProxy,
  MergedJobsExecutor,
} from "../types/jobs.interface";
import type { IgniterTelemetryProvider } from "../types/telemetry.interface";
import { IgniterRealtimeService } from "./realtime.service";

/**
 * Main builder class for the Igniter Framework.
 * Provides a fluent interface for creating and configuring all framework components.
 *
 * @template TContext - The type of the application context
 * @template TMiddlewares - The global middleware procedures
 * @template TStore - The store adapter type
 * @template TLogger - The logger adapter type
 * @template TJobs - The job queue adapter type
 *
 * @example
 * // Initialize with custom context
 * const igniter = Igniter
 *   .context<{ db: Database }>()
 *   .middleware([authMiddleware])
 *   .store(redisStore)
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
  TMiddlewares extends readonly IgniterProcedure<any, any, any>[],
  TStore extends IgniterStoreAdapter,
  TLogger extends IgniterLogger,
  TJobs extends JobsNamespaceProxy<any>,
  TTelemetry extends IgniterTelemetryProvider,
  TRealtime extends IgniterRealtimeServiceType<any>,
  TPlugins extends Record<string, any>,
  TDocs extends DocsConfig,
> {
  private _config: IgniterBuilderConfig<
    TContext,
    TConfig,
    TStore,
    TLogger,
    TJobs,
    TTelemetry,
    TPlugins,
    TDocs
  > = {} as any;
  private _middlewares: TMiddlewares = [] as any;
  private _store: TStore;
  private _logger: TLogger;
  private _jobs: TJobs;
  private _telemetry: TTelemetry;
  private _realtime: TRealtime;
  private _plugins: TPlugins = {} as TPlugins;
  private _docs: TDocs = {} as TDocs;

  constructor(
    
    config: IgniterBuilderConfig<
      TContext,
      TConfig,
      TStore,
      TLogger,
      TJobs,
      TTelemetry,
      TPlugins,
      TDocs
    > = {} as any,
    middlewares: TMiddlewares = [] as any,
    store?: TStore,
    logger?: TLogger,
    jobs?: TJobs,
    telemetry?: TTelemetry,
    realtime?: TRealtime,
    plugins?: TPlugins,
    docs?: TDocs,
  ) {
    this._config = config;
    this._middlewares = middlewares;
    this._store = store || ({} as TStore);
    this._logger = logger || ({} as TLogger);
    this._jobs = jobs || ({} as TJobs);
    this._telemetry = telemetry || ({} as TTelemetry);
    this._realtime = realtime || ({} as TRealtime);
    this._plugins = plugins || ({} as TPlugins);
    this._docs = docs || ({} as TDocs);
  }

  /**
   * Configure the context function.
   */
  context<TNewContext extends object | ContextCallback>(
    contextFn: TNewContext,
  ): IgniterBuilder<
    TNewContext,
    TConfig,
    TMiddlewares,
    TStore,
    TLogger,
    TJobs,
    TTelemetry,
    TRealtime,
    TPlugins,
    TDocs
  > {
    return new IgniterBuilder(
      { ...this._config, context: contextFn },
      this._middlewares,
      this._store,
      this._logger,
      this._jobs,
      this._telemetry,
      this._realtime,
      this._plugins,
      this._docs,
    );
  }

  /**
   * Add global middleware procedures.
   */
  middleware<
    TNewMiddlewares extends readonly IgniterProcedure<any, any, any>[],
  >(
    middlewares: TNewMiddlewares,
  ): IgniterBuilder<
    TContext,
    TConfig,
    TNewMiddlewares,
    TStore,
    TLogger,
    TJobs,
    TTelemetry,
    TRealtime,
    TPlugins,
    TDocs
  > {
    return new IgniterBuilder(
      { ...this._config, middleware: middlewares },
      middlewares,
      this._store,
      this._logger,
      this._jobs,
      this._telemetry,
      this._realtime,
      this._plugins,
      this._docs,
    );
  }

  /**
   * Configure router settings.
   */
  config<TNewConfig extends TConfig>(
    routerConfig: TNewConfig,
  ): IgniterBuilder<
    TContext,
    TNewConfig,
    TMiddlewares,
    TStore,
    TLogger,
    TJobs,
    TTelemetry,
    TRealtime,
    TPlugins,
    TDocs
  > {
    return new IgniterBuilder(
      { ...this._config, config: routerConfig },
      this._middlewares,
      this._store,
      this._logger,
      this._jobs,
      this._telemetry,
      this._realtime,
      this._plugins,
      this._docs,
    );
  }

  /**
   * Configure a store adapter for caching, events, and more.
   */
  store(
    storeAdapter: IgniterStoreAdapter,
  ): IgniterBuilder<
    TContext,
    TConfig,
    TMiddlewares,
    IgniterStoreAdapter,
    TLogger,
    TJobs,
    TTelemetry,
    IgniterRealtimeServiceType,
    TPlugins,
    TDocs
  > {
    const realtime = new IgniterRealtimeService(storeAdapter);

    return new IgniterBuilder<
      TContext,
      TConfig,
      TMiddlewares,
      IgniterStoreAdapter,
      TLogger,
      TJobs,
      TTelemetry,
      IgniterRealtimeServiceType,
      TPlugins,
      TDocs
    >(
      { ...this._config, store: storeAdapter, realtime },
      this._middlewares,
      storeAdapter,
      this._logger,
      this._jobs,
      this._telemetry,
      realtime,
      this._plugins,
      this._docs,
    );
  }

  /**
   * Configure a logger adapter for logging.
   */
  logger(
    loggerAdapter: IgniterLogger,
  ): IgniterBuilder<
    TContext,
    TConfig,
    TMiddlewares,
    TStore,
    IgniterLogger,
    TJobs,
    TTelemetry,
    TRealtime,
    TPlugins,
    TDocs
  > {
    return new IgniterBuilder<
      TContext,
      TConfig,
      TMiddlewares,
      TStore,
      IgniterLogger,
      TJobs,
      TTelemetry,
      TRealtime,
      TPlugins,
      TDocs
    >(
      { ...this._config, logger: loggerAdapter },
      this._middlewares,
      this._store,
      loggerAdapter,
      this._jobs,
      this._telemetry,
      this._realtime,
      this._plugins,
      this._docs,
    );
  }

  /**
   * Configure a job queue adapter for background processing.
   */
  jobs<
    TJobs extends MergedJobsExecutor<any>,
    TJobsProxy extends JobsNamespaceProxy<any> = ReturnType<Awaited<TJobs>["createProxy"]>
  >(jobsAdapter: TJobs) {
    const jobsProxy = jobsAdapter.createProxy() as TJobsProxy;

    return new IgniterBuilder<
      TContext,
      TConfig,
      TMiddlewares,
      TStore,
      TLogger,
      TJobsProxy,
      TTelemetry,
      TRealtime,
      TPlugins,
      TDocs
    >(
      // @ts-expect-error - Expected
      { ...this._config, jobs: jobsProxy },
      this._middlewares,
      this._store,
      this._logger,
      jobsProxy,
      this._telemetry,
      this._realtime,
      this._plugins,
      this._docs,
    );
  }

  /**
   * Configure a telemetry provider for observability.
   * Enables distributed tracing, metrics collection, and structured logging.
   */
  telemetry<TTelemetryProvider extends IgniterTelemetryProvider>(
    telemetryProvider: TTelemetryProvider,
  ): IgniterBuilder<
    TContext,
    TConfig,
    TMiddlewares,
    TStore,
    TLogger,
    TJobs,
    TTelemetryProvider,
    TRealtime,
    TPlugins,
    TDocs
  > {
    return new IgniterBuilder<
      TContext,
      TConfig,
      TMiddlewares,
      TStore,
      TLogger,
      TJobs,
      TTelemetryProvider,
      TRealtime,
      TPlugins,
      TDocs
    >(
      // @ts-expect-error - Expected
      { ...this._config, telemetry: telemetryProvider },
      this._middlewares,
      this._store,
      this._logger,
      this._jobs,
      telemetryProvider,
      this._realtime,
      this._plugins,
      this._docs,
    );
  }

  /**
   * Register plugins with the Igniter Router
   *
   * Plugins provide self-contained functionality with actions, controllers, events, and lifecycle hooks.
   * They can access their own actions type-safely through the `self` parameter.
   *
   * @param pluginsRecord - Record of plugin name to plugin instance
   *
   * @example
   * ```typescript
   * const igniter = Igniter
   *   .context<MyContext>()
   *   .plugins({
   *     auth: authPlugin,
   *     email: emailPlugin,
   *     audit: auditPlugin
   *   })
   *   .create();
   *
   * // Usage in actions
   * const userController = igniter.controller({
   *   actions: {
   *     create: igniter.mutation({
   *       handler: async (ctx) => {
   *         await ctx.plugins.auth.actions.validateToken({ token });
   *         await ctx.plugins.email.actions.sendWelcome({ email });
   *         await ctx.plugins.audit.emit('user:created', { userId });
   *       }
   *     })
   *   }
   * });
   * ```
   */
  plugins<TNewPlugins extends Record<string, any>>(
    pluginsRecord: TNewPlugins,
  ): IgniterBuilder<
    TContext,
    TConfig,
    TMiddlewares,
    TStore,
    TLogger,
    TJobs,
    TTelemetry,
    TRealtime,
    TNewPlugins,
    TDocs
  > {
    return new IgniterBuilder<
      TContext,
      TConfig,
      TMiddlewares,
      TStore,
      TLogger,
      TJobs,
      TTelemetry,
      TRealtime,
      TNewPlugins,
      TDocs
    >(
      // Store plugins in config for RequestProcessor access
      { ...this._config, plugins: pluginsRecord },
      this._middlewares,
      this._store,
      this._logger,
      this._jobs,
      this._telemetry,
      this._realtime,
      pluginsRecord,
      this._docs,
    );
  }

  docs<TNewDocs extends DocsConfig>(
    docsConfig: TNewDocs,
  ): IgniterBuilder<
    TContext,
    TConfig,
    TMiddlewares,
    TStore,
    TLogger,
    TJobs,
    TTelemetry,
    TRealtime,
    TPlugins,
    TNewDocs
  > {
    return new IgniterBuilder(
      { ...this._config, docs: docsConfig },
      this._middlewares,
      this._store,
      this._logger,
      this._jobs,
      this._telemetry,
      this._realtime,
      this._plugins,
      docsConfig,
    );
  }

  /**
   * Creates the API with global middleware types inferred.
   */
  create() {
    type TContextCallback = Unwrap<TContext>;
    type TEnrichedContext = TContextCallback extends object
      ? TContextCallback
      : TContext & InferActionProcedureContext<TMiddlewares>;

    return {
      /**
       * Creates a query action for retrieving data.
       */
      /**
       * Creates a query action for retrieving data.
       */
      query: <
        TQueryPath extends string,
        TQueryQuery extends StandardSchemaV1 | undefined,
        TQueryMiddlewares extends readonly IgniterProcedure<any, any, any>[],
        TQueryHandler extends IgniterActionHandler<
          IgniterActionContext<
            TEnrichedContext,
            TQueryPath,
            QueryMethod,
            undefined,
            TQueryQuery,
            TQueryMiddlewares,
            TPlugins
          >,
          unknown // 🔄 MUDANÇA: 'any' → 'unknown' para melhor inferência
        >,
        TQueryResponse extends ReturnType<TQueryHandler>,
        TQueryInfer extends InferEndpoint<
          TEnrichedContext,
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
        // 🔄 MUDANÇA: Remoção do constraint genérico no handler para permitir inferência livre
        options: IgniterQueryOptions<
          TEnrichedContext,
          TQueryPath,
          TQueryQuery,
          TQueryMiddlewares,
          TPlugins,
          TQueryHandler
        >,
      ) =>
        createIgniterQuery<
          TEnrichedContext,
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
        TMutationMiddlewares extends readonly IgniterProcedure<any, any, any>[],
        TMutationHandler extends IgniterActionHandler<
          IgniterActionContext<
            TEnrichedContext,
            TMutationPath,
            TMutationMethod,
            TMutationBody,
            TMutationQuery,
            TMutationMiddlewares,
            TPlugins
          >,
          unknown // 🔄 MUDANÇA: 'any' → 'unknown' para melhor inferência
        >,
        TMutationResponse extends ReturnType<TMutationHandler>,
        TMutationInfer extends InferEndpoint<
          TEnrichedContext,
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
        // 🔄 MUDANÇA: Remoção do constraint genérico no handler para permitir inferência livre
        options: IgniterMutationOptions<
          TEnrichedContext,
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
          TEnrichedContext,
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
      controller: <TActions extends Record<string, IgniterControllerBaseAction>>(
        config: IgniterControllerConfig<TActions>,
      ) =>
        createIgniterController<TActions>(config),

      /**
       * Creates a router with enhanced configuration.
       */
      router: <
        TContext extends object | ContextCallback,
        TControllers extends Record<
          string,
          IgniterControllerConfig<any>
        >,
      >(config: {
        context?: TContext;
        controllers: TControllers;
      }) => {
        type TRouterContext = TContext extends object | ContextCallback
          ? InferIgniterContext<TContext>
          : TEnrichedContext;

        return createIgniterRouter<
          // @ts-expect-error - TRouterContext is not used [DO NOT REMOVE THIS - ITS WORKING]
          TRouterContext,
          TControllers,
          TConfig,
          TPlugins
        >({
          controllers: config.controllers,
          context: (config.context || this._config.context) as TRouterContext,
          config: { ...(this._config.config || ({} as TConfig)), docs: this._docs },
          plugins: this._plugins,
          docs: this._docs,
        });
      },

      /**
       * Creates a reusable middleware procedure.
       */
      procedure: <TOptions extends Record<string, any>, TOutput>(
        middleware: IgniterProcedure<TEnrichedContext, TOptions, TOutput>,
      ) => createIgniterProcedure(middleware),

      helpers: {
        /**
         * Configure context function.
         */
        withContext:
          <TContext extends object>(
            contextFn: (request: Request) => TContext | Promise<TContext>,
          ) =>
          (
            builder: IgniterBuilder<
              TContext,
              TConfig,
              TMiddlewares,
              TStore,
              TLogger,
              TJobs,
              TTelemetry,
              TRealtime,
              TPlugins,
              TDocs
            >,
          ) =>
            builder.context(contextFn),

        /**
         * Configure authentication middleware.
         */
        withAuth:
          <TContext extends object>(
            authMiddleware: IgniterProcedure<TContext, any, any>,
          ) =>
          (
            builder: IgniterBuilder<
              TContext,
              TConfig,
              TMiddlewares,
              TStore,
              TLogger,
              TJobs,
              TTelemetry,
              TRealtime,
              TPlugins,
              TDocs
            >,
          ) =>
            builder.middleware([authMiddleware] as const),

        /**
         * Configure multiple middlewares.
         */
        withMiddlewares:
          <
            TContext extends object,
            TMiddlewares extends readonly IgniterProcedure<any, any, any>[],
          >(
            middlewares: TMiddlewares,
          ) =>
          (
            builder: IgniterBuilder<
              TContext,
              TConfig,
              TMiddlewares,
              TStore,
              TLogger,
              TJobs,
              TTelemetry,
              TRealtime,
              TPlugins,
              TDocs
            >,
          ) =>
            builder.middleware(middlewares),

        /**
         * Configure router settings.
         */
        withConfig:
          <TContext extends object, TNewConfig extends TConfig>(
            config: TNewConfig,
          ) =>
          (
            builder: IgniterBuilder<
              TContext,
              TConfig,
              TMiddlewares,
              TStore,
              TLogger,
              TJobs,
              TTelemetry,
              TRealtime,
              TPlugins,
              TDocs
            >,
          ) =>
            builder.config(config as TConfig),

        /**
         * Compose multiple configuration functions.
         */
        compose:
          <TContext extends object>(
            ...configs: Array<
              (
                builder: IgniterBuilder<
                  TContext,
                  TConfig,
                  TMiddlewares,
                  TStore,
                  TLogger,
                  TJobs,
                  TTelemetry,
                  TRealtime,
                  TPlugins,
                  TDocs
                >,
              ) => IgniterBuilder<
                TContext,
                TConfig,
                TMiddlewares,
                TStore,
                TLogger,
                TJobs,
                TTelemetry,
                TRealtime,
                TPlugins,
                TDocs
              >
            >
          ) =>
          (
            builder: IgniterBuilder<
              TContext,
              TConfig,
              TMiddlewares,
              TStore,
              TLogger,
              TJobs,
              TTelemetry,
              TRealtime,
              TPlugins,
              TDocs
            >,
          ) =>
            configs.reduce((acc, config) => config(acc), builder),
      },

      store: this._store,
      logger: this._logger,
      jobs: this._jobs,
      telemetry: this._telemetry,
      realtime: this._realtime,
      plugins: this._plugins,

      /**
       * Internal context type for debugging/inspection.
       */
      $context: {} as TEnrichedContext,

      /**
       * Internal config for debugging/inspection.
       */
      $config: { ...this._config },
    };
  }
}

/**
 * Factory function to create a new Igniter builder instance.
 *
 * @template TContext - The type of the application context
 * @returns A new IgniterBuilder instance
 *
 * @example
 * // Initialize with custom context
 * const igniter = Igniter
 *   .context<{ db: Database }>()
 *   .middleware([authMiddleware])
 *   .store(redisStore)
 *   .create();
 */
export const Igniter = new IgniterBuilder();

