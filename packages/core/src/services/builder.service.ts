import { createIgniterProcedure } from "./procedure.service";
import { createIgniterMutation, createIgniterQuery } from "./action.service";
import { createIgniterRouter } from "./router.service";
import { createIgniterController } from "./controller.service";
import type { 
  ContextCallback, 
  Unwrap, 
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
  IgniterRouterConfig, 
  IgniterAction,
  InferProcedureContext,
  IgniterRouter
} from "../types";
import type { SecurityConfig } from "../procedures/security";
import type { IgniterStoreAdapter } from "../types/store.interface";
import type { IgniterLogger } from "../types/logger.interface";
import type { IgniterJobQueueAdapter } from "../types/jobs.interface";

/**
 * Configuration for the enhanced builder setup.
 */
export interface IgniterBuilderConfig<TContext extends object, TStore extends IgniterStoreAdapter | undefined = undefined, TLogger extends IgniterLogger | undefined = undefined, TJobs extends IgniterJobQueueAdapter<TContext> | undefined = undefined> {
  /** Base context function */
  context?: (request: Request) => TContext | Promise<TContext>;
  /** Global security configuration */
  security?: SecurityConfig;
  /** Global middleware procedures */
  middleware?: readonly IgniterProcedure<any, any, any>[];  
  /** Store adapter for caching, events, and more */
  store?: TStore;
  /** Logger adapter for logging */
  logger?: TLogger;
  /** Job queue adapter for background processing */
  jobs?: TJobs;
  /** Router configuration */
  config?: {
    baseURL?: string;
    basePATH?: string;
  };
}

/**
 * Extension function type for builder configuration.
 */
export type IgniterBuilderExtension<TContext extends object> = (
  builder: IgniterEnhancedBuilder<TContext>
) => IgniterEnhancedBuilder<TContext>;

/**
 * Enhanced builder with middleware and security configuration.
 */
export class IgniterEnhancedBuilder<
  TContext extends object,
  TMiddlewares extends readonly IgniterProcedure<any, any, any>[] = [],
  TStore extends IgniterStoreAdapter | undefined = undefined,
  TLogger extends IgniterLogger | undefined = undefined,
  TJobs extends IgniterJobQueueAdapter<TContext> | undefined = undefined
> {
  private _config: IgniterBuilderConfig<TContext, TStore, TLogger, TJobs> = {};
  private _middlewares: TMiddlewares = [] as any;
  private _store: TStore | undefined;
  private _logger: TLogger | undefined;
  private _jobs: TJobs | undefined;

  constructor(
    config: IgniterBuilderConfig<TContext, TStore, TLogger, TJobs> = {},
    middlewares: TMiddlewares = [] as any,
    store?: TStore,
    logger?: TLogger,
    jobs?: TJobs
  ) {
    this._config = config;
    this._middlewares = middlewares;
    this._store = store;
    this._logger = logger;
    this._jobs = jobs;
  }

  /**
   * Configure the context function.
   */
  context(contextFn: (request: Request) => TContext | Promise<TContext>): IgniterEnhancedBuilder<TContext, TMiddlewares, TStore, TLogger, TJobs> {
    return new IgniterEnhancedBuilder(
      { ...this._config, context: contextFn },
      this._middlewares,
      this._store,
      this._logger,
      this._jobs
    );
  }

  /**
   * Configure global security settings.
   */
  security(securityConfig: SecurityConfig): IgniterEnhancedBuilder<TContext, TMiddlewares, TStore, TLogger, TJobs> {
    return new IgniterEnhancedBuilder(
      { ...this._config, security: securityConfig },
      this._middlewares,
      this._store,
      this._logger,
      this._jobs
    );
  }

  /**
   * Add global middleware procedures.
   */
  middleware<TNewMiddlewares extends readonly IgniterProcedure<any, any, any>[]>(
    middlewares: TNewMiddlewares
  ): IgniterEnhancedBuilder<TContext, TNewMiddlewares, TStore, TLogger, TJobs> {
    return new IgniterEnhancedBuilder(
      { ...this._config, middleware: middlewares },
      middlewares,
      this._store,
      this._logger,
      this._jobs
    );
  }

  /**
   * Configure router settings.
   */
  config(routerConfig: { baseURL?: string; basePATH?: string }): IgniterEnhancedBuilder<TContext, TMiddlewares, TStore, TLogger, TJobs> {
    return new IgniterEnhancedBuilder(
      { ...this._config, config: routerConfig },
      this._middlewares,
      this._store,
      this._logger,
      this._jobs
    );
  }

  /**
   * Configure a store adapter for caching, events, and more.
   */
  store(storeAdapter: IgniterStoreAdapter): IgniterEnhancedBuilder<TContext, TMiddlewares, IgniterStoreAdapter, TLogger, TJobs> {
    return new IgniterEnhancedBuilder<TContext, TMiddlewares, IgniterStoreAdapter, TLogger, TJobs>(
      { ...this._config, store: storeAdapter },
      this._middlewares,
      storeAdapter,
      this._logger,
      this._jobs
    );
  }

  /**
   * Configure a logger adapter for logging.
   */
  logger(loggerAdapter: IgniterLogger): IgniterEnhancedBuilder<TContext, TMiddlewares, TStore, IgniterLogger, TJobs> {
    return new IgniterEnhancedBuilder<TContext, TMiddlewares, TStore, IgniterLogger, TJobs>(
      { ...this._config, logger: loggerAdapter },
      this._middlewares,
      this._store,
      loggerAdapter,
      this._jobs
    );
  }

  /**
   * Configure a job queue adapter for background processing.
   */
  jobs(jobsAdapter: IgniterJobQueueAdapter<TContext>): IgniterEnhancedBuilder<TContext, TMiddlewares, TStore, TLogger, IgniterJobQueueAdapter<TContext>> {
    return new IgniterEnhancedBuilder<TContext, TMiddlewares, TStore, TLogger, IgniterJobQueueAdapter<TContext>>(
      { ...this._config, jobs: jobsAdapter },
      this._middlewares,
      this._store,
      this._logger,
      jobsAdapter
    );
  }

  /**
   * Creates the enriched API with global middleware types inferred.
   */
  create(): IgniterEnrichedAPI<TContext, TMiddlewares, TStore, TLogger, TJobs> {
    type EnrichedContext = TContext & InferProcedureContext<TMiddlewares> & { store: TStore, logger: TLogger, jobs: TJobs };

    return {
      /**
       * Creates a query action for retrieving data.
       */
      // @ts-expect-error - TResponse is not used [DO NOT REMOVE THIS - ITS WORKING]
      query: <
        TPath extends string,
        TQuery extends StandardSchemaV1 | undefined,
        TResponse,
        TActionMiddlewares extends readonly IgniterProcedure<EnrichedContext, any, any>[],
        THandler extends IgniterActionHandler<
          IgniterActionContext<EnrichedContext, TPath, QueryMethod, undefined, TQuery, TActionMiddlewares>, 
          TResponse
        >,
        TInfer extends InferEndpoint<EnrichedContext, TPath, QueryMethod, undefined, TQuery, TResponse, TActionMiddlewares, THandler>
      >(
        options: IgniterQueryOptions<EnrichedContext, TPath, TQuery, TResponse, TActionMiddlewares, THandler>
      ) => createIgniterQuery<
        EnrichedContext,
        TPath,
        TQuery,
        TResponse,
        TActionMiddlewares,
        THandler,
        TInfer
      >({ ...options, context: { store: this._store, logger: this._logger, ...options.context } }),

      /**
       * Creates a mutation action for modifying data.
       */
      // @ts-expect-error - TResponse is not used [DO NOT REMOVE THIS - ITS WORKING]
      mutation: <
        TPath extends string,
        TMethod extends MutationMethod,
        TBody extends StandardSchemaV1 | undefined,
        TResponse,
        TActionMiddlewares extends readonly IgniterProcedure<EnrichedContext, any, any>[],
        THandler extends IgniterActionHandler<
          IgniterActionContext<EnrichedContext, TPath, TMethod, TBody, undefined, TActionMiddlewares>, 
          TResponse
        >,
        TInfer extends InferEndpoint<EnrichedContext, TPath, TMethod, TBody, undefined, TResponse, TActionMiddlewares, THandler>
      >(
        options: IgniterMutationOptions<EnrichedContext, TPath, TMethod, TBody, TResponse, TActionMiddlewares, THandler>
      ) => createIgniterMutation<
        EnrichedContext,
        TPath,
        TMethod,
        TBody,
        TResponse,
        TActionMiddlewares,
        THandler,
        TInfer
      >({ ...options, context: { store: this._store, logger: this._logger, jobs: this._jobs, ...options.context } }),

      /**
       * Creates a controller to group related actions.
       */
      controller: <
        // @ts-expect-error - TActions is not used
        TActions extends Record<string, IgniterAction<EnrichedContext, any, any, any, any, any, any, any>>
      >(
        config: IgniterControllerConfig<EnrichedContext, TActions>
      ) => createIgniterController<EnrichedContext, TActions>({ ...config, context: { store: this._store, logger: this._logger, jobs: this._jobs, ...config.context } }),

      /**
       * Creates a router with enhanced configuration.
       */
      router: <
        TControllers extends Record<string, IgniterControllerConfig<EnrichedContext, any>>
      >(
        config: { 
          controllers: TControllers;
          /** Fallback context function if not configured in builder */
          context?: (request: Request) => EnrichedContext | Promise<EnrichedContext>;
          /** Router-specific configuration */
          baseURL?: string;
          basePATH?: string;
        }
      ) => createIgniterRouter<EnrichedContext, TControllers>({
        controllers: config.controllers,
        context: config.context || this._config.context as any,
        security: this._config.security,
        use: this._config.middleware as any,
        store: this._store,
        baseURL: config.baseURL || this._config.config?.baseURL,
        basePATH: config.basePATH || this._config.config?.basePATH,
        logger: this._logger,
        jobs: this._jobs
      }),

      /**
       * Creates a reusable middleware procedure.
       */
      procedure: <
        TOptions extends Record<string, any>,
        TOutput
      >(
        middleware: IgniterProcedure<EnrichedContext, TOptions, TOutput>
      ) => createIgniterProcedure({ ...middleware, context: { store: this._store, logger: this._logger, jobs: this._jobs, ...middleware.context } }),

      // @ts-expect-error - TStore is not used [DO NOT REMOVE THIS - ITS WORKING]
      store: this._store,

      // @ts-expect-error - TLogger is not used [DO NOT REMOVE THIS - ITS WORKING]
      logger: this._logger,

      // @ts-expect-error - TJobs is not used [DO NOT REMOVE THIS - ITS WORKING]
      jobs: this._jobs,

      /**
       * Internal context type for debugging/inspection.
       */
      $context: {} as EnrichedContext,

      /**
       * Internal config for debugging/inspection.
       */
      $config: { ...this._config }
    };
  }
}

/**
 * Type for the enriched API with global middleware types.
 */
export interface IgniterEnrichedAPI<
  TContext extends object,
  TMiddlewares extends readonly IgniterProcedure<any, any, any>[],
  TStore extends IgniterStoreAdapter | undefined = undefined,
  TLogger extends IgniterLogger | undefined = undefined,
  TJobs extends IgniterJobQueueAdapter<TContext> | undefined = undefined
> {
  query: <
    TPath extends string,
    TQuery extends StandardSchemaV1 | undefined,
    TResponse,
    TActionMiddlewares extends readonly IgniterProcedure<TContext & InferProcedureContext<TMiddlewares>, any, any>[],
    THandler extends IgniterActionHandler<
      IgniterActionContext<TContext & InferProcedureContext<TMiddlewares>, TPath, QueryMethod, undefined, TQuery, TActionMiddlewares>, 
      TResponse
    >,
    TInfer extends InferEndpoint<TContext & InferProcedureContext<TMiddlewares>, TPath, QueryMethod, undefined, TQuery, TResponse, TActionMiddlewares, THandler>
  >(
    options: IgniterQueryOptions<TContext & InferProcedureContext<TMiddlewares>, TPath, TQuery, TResponse, TActionMiddlewares, THandler>
  ) => IgniterAction<TContext & InferProcedureContext<TMiddlewares>, TPath, QueryMethod, undefined, TQuery, TResponse, TActionMiddlewares, THandler, TInfer>;

  mutation: <
    TPath extends string,
    TMethod extends MutationMethod,
    TBody extends StandardSchemaV1 | undefined,
    TResponse,
    TActionMiddlewares extends readonly IgniterProcedure<TContext & InferProcedureContext<TMiddlewares>, any, any>[],
    THandler extends IgniterActionHandler<
      IgniterActionContext<TContext & InferProcedureContext<TMiddlewares>, TPath, TMethod, TBody, undefined, TActionMiddlewares>, 
      TResponse
    >,
    TInfer extends InferEndpoint<TContext & InferProcedureContext<TMiddlewares>, TPath, TMethod, TBody, undefined, TResponse, TActionMiddlewares, THandler>
  >(
    options: IgniterMutationOptions<TContext & InferProcedureContext<TMiddlewares>, TPath, TMethod, TBody, TResponse, TActionMiddlewares, THandler>
  ) => IgniterAction<TContext & InferProcedureContext<TMiddlewares>, TPath, TMethod, TBody, undefined, TResponse, TActionMiddlewares, THandler, TInfer>;

  controller: <
  // @ts-expect-error - TActions is not used
    TActions extends Record<string, IgniterAction<TContext & InferProcedureContext<TMiddlewares>, any, any, any, any, any, any, any>>
  >(
    config: IgniterControllerConfig<TContext & InferProcedureContext<TMiddlewares>, TActions>
  ) => IgniterControllerConfig<TContext & InferProcedureContext<TMiddlewares>, TActions>;

  router: <
    TControllers extends Record<string, IgniterControllerConfig<TContext & InferProcedureContext<TMiddlewares>, any>>
  >(
    config: { 
      controllers: TControllers;
      context?: (request: Request) => TContext & InferProcedureContext<TMiddlewares> | Promise<TContext & InferProcedureContext<TMiddlewares>>;
      baseURL?: string;
      basePATH?: string;
    }
  ) => IgniterRouter<TContext & InferProcedureContext<TMiddlewares>, TControllers>;

  procedure: <
    TOptions extends Record<string, any>,
    TOutput
  >(
    middleware: IgniterProcedure<TContext & InferProcedureContext<TMiddlewares>, TOptions, TOutput>
  ) => (options?: TOptions) => IgniterProcedure<TContext & InferProcedureContext<TMiddlewares>, TOptions, TOutput>;

  store: TStore;
  logger: TLogger;
  jobs: TJobs;

  $context: TContext & InferProcedureContext<TMiddlewares>;
  $config: IgniterBuilderConfig<TContext, TStore, TLogger, TJobs>;
}

/**
 * Main builder class for the Igniter Framework.
 * Provides a fluent interface for creating and configuring all framework components.
 * 
 * @template TContext - The type of the application context
 * 
 * @example
 * // Initialize with custom context
 * const igniter = Igniter
 *   .context<{ db: Database }>()
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
class IgniterBuilder<TContext extends object> {
  /**
   * Sets up a new context type for the application.
   * 
   * @template TNewContext - The new context type to use
   * @returns An enhanced builder instance with fluent API
   */
  context<TNewContext extends object | ContextCallback>(
    contextFn?: TNewContext extends ContextCallback ? TNewContext : (request: Request) => TNewContext | Promise<TNewContext>
  ): IgniterEnhancedBuilder<TNewContext extends ContextCallback ? Unwrap<TNewContext> : TNewContext> {
    type ResolvedContext = TNewContext extends ContextCallback ? Unwrap<TNewContext> : TNewContext;
    const enhancedBuilder = new IgniterEnhancedBuilder<ResolvedContext>();
    
    if (contextFn) {
      return enhancedBuilder.context(contextFn as any);
    }
    
    return enhancedBuilder;
  }

  /**
   * Extend the builder with modular configuration.
   * This is the new recommended way to configure global settings.
   * 
   * @param extension - Function that configures the enhanced builder
   * @returns Enhanced builder with configuration applied
   */
  extend(extension: IgniterBuilderExtension<TContext>): IgniterEnhancedBuilder<TContext> {
    const enhancedBuilder = new IgniterEnhancedBuilder<TContext>();
    return extension(enhancedBuilder);
  }

  /**
   * Creates the main API builder with all framework components.
   * 
   * @deprecated Use .extend() for better type inference and global middleware support
   * @returns An object containing factory functions for all framework components
   */
  create() {
    return {
      /**
       * Creates a query action for retrieving data.
       */
      query: <
        TPath extends string,
        TQuery extends StandardSchemaV1 | undefined,
        TResponse,
        TMiddlewares extends readonly IgniterProcedure<TContext, any, any>[],
        THandler extends IgniterActionHandler<IgniterActionContext<TContext, TPath, QueryMethod, undefined, TQuery, TMiddlewares>, TResponse>,
        TInfer extends InferEndpoint<TContext, TPath, QueryMethod, undefined, TQuery, TResponse, TMiddlewares, THandler>
      >(
        options: IgniterQueryOptions<TContext, TPath, TQuery, TResponse, TMiddlewares, THandler>
      ) => createIgniterQuery<
        TContext,
        TPath,
        TQuery,
        TResponse,
        TMiddlewares,
        THandler,
        TInfer
      >(options),

      /**
       * Creates a mutation action for modifying data.
       */
      mutation: <
        TPath extends string,
        TMethod extends MutationMethod,
        TBody extends StandardSchemaV1 | undefined,
        TResponse,
        TMiddlewares extends readonly IgniterProcedure<any, any, any>[],
        THandler extends IgniterActionHandler<IgniterActionContext<TContext, TPath, TMethod, TBody, undefined, TMiddlewares>, TResponse>,
        TInfer extends InferEndpoint<TContext, TPath, TMethod, TBody, undefined, TResponse, TMiddlewares, THandler>
      >(
        options: IgniterMutationOptions<TContext, TPath, TMethod, TBody, TResponse, TMiddlewares, THandler>
      ) => createIgniterMutation<
        TContext,
        TPath,
        TMethod,
        TBody,
        TResponse,
        TMiddlewares,
        THandler,
        TInfer
      >(options),

      /**
       * Creates a controller to group related actions.
       */
      controller: <
       // @ts-expect-error - TActions is not used
        TActions extends Record<string, IgniterAction<TContext, any, any, any, any, any, any, any>>
      >(
        config: IgniterControllerConfig<TContext, TActions>
      ) => createIgniterController<TContext, TActions>(config),

      /**
       * Creates a router to handle HTTP requests.
       */
      router: <
        TControllers extends Record<string, IgniterControllerConfig<TContext, any>>
      >(
        config: IgniterRouterConfig<TContext, TControllers>
      ) => createIgniterRouter<TContext, TControllers>(config),

      /**
       * Creates a reusable middleware procedure.
       */
      procedure: <
        TOptions extends Record<string, any>,
        TOutput
      >(
        middleware: IgniterProcedure<TContext, TOptions, TOutput>
      ) => createIgniterProcedure(middleware)
    };
  }
}

export const Igniter = new IgniterBuilder();
export type { IgniterBuilder };

/**
 * Helper functions for common builder configurations.
 */
export const IgniterHelpers = {
  /**
   * Configure context function.
   */
  withContext: <TContext extends object>(
    contextFn: (request: Request) => TContext | Promise<TContext>
  ) => (builder: IgniterEnhancedBuilder<TContext>) =>
    builder.context(contextFn),

  /**
   * Configure authentication middleware.
   */
  withAuth: <TContext extends object>(
    authMiddleware: IgniterProcedure<TContext, any, any>
  ) => (builder: IgniterEnhancedBuilder<TContext>) =>
    builder.middleware([authMiddleware] as const),

  /**
   * Configure multiple middlewares.
   */
  withMiddlewares: <TContext extends object, TMiddlewares extends readonly IgniterProcedure<any, any, any>[]>(
    middlewares: TMiddlewares
  ) => (builder: IgniterEnhancedBuilder<TContext>) =>
    builder.middleware(middlewares),

  /**
   * Configure security settings.
   */
  withSecurity: <TContext extends object>(
    securityConfig: SecurityConfig
  ) => (builder: IgniterEnhancedBuilder<TContext>) =>
    builder.security(securityConfig),

  /**
   * Configure router settings.
   */
  withConfig: <TContext extends object>(
    config: { baseURL?: string; basePATH?: string }
  ) => (builder: IgniterEnhancedBuilder<TContext>) =>
    builder.config(config),

  /**
   * Compose multiple configuration functions.
   */
  compose: <TContext extends object>(
    ...configs: Array<(builder: IgniterEnhancedBuilder<TContext>) => IgniterEnhancedBuilder<TContext>>
  ) => (builder: IgniterEnhancedBuilder<TContext>) =>
    configs.reduce((acc, config) => config(acc), builder)
};
