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
  InferProcedureContext
} from "../types";
import type { SecurityConfig } from "../procedures/security";

/**
 * Configuration for the enhanced builder setup.
 */
export interface IgniterBuilderConfig<TContext extends object> {
  /** Base context function */
  context?: (request: Request) => TContext | Promise<TContext>;
  /** Global security configuration */
  security?: SecurityConfig;
  /** Global middleware procedures */
  middleware?: readonly IgniterProcedure<any, any, any>[];
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
  TMiddlewares extends readonly IgniterProcedure<any, any, any>[] = []
> {
  private _config: IgniterBuilderConfig<TContext> = {};
  private _middlewares: TMiddlewares = [] as any;

  constructor(
    config: IgniterBuilderConfig<TContext> = {},
    middlewares: TMiddlewares = [] as any
  ) {
    this._config = config;
    this._middlewares = middlewares;
  }

  /**
   * Configure the context function.
   */
  context(contextFn: (request: Request) => TContext | Promise<TContext>): IgniterEnhancedBuilder<TContext, TMiddlewares> {
    return new IgniterEnhancedBuilder(
      { ...this._config, context: contextFn },
      this._middlewares
    );
  }

  /**
   * Configure global security settings.
   */
  security(securityConfig: SecurityConfig): IgniterEnhancedBuilder<TContext, TMiddlewares> {
    return new IgniterEnhancedBuilder(
      { ...this._config, security: securityConfig },
      this._middlewares
    );
  }

  /**
   * Add global middleware procedures.
   */
  middleware<TNewMiddlewares extends readonly IgniterProcedure<any, any, any>[]>(
    middlewares: TNewMiddlewares
  ): IgniterEnhancedBuilder<TContext, TNewMiddlewares> {
    return new IgniterEnhancedBuilder(
      { ...this._config, middleware: middlewares },
      middlewares
    );
  }

  /**
   * Configure router settings.
   */
  config(routerConfig: { baseURL?: string; basePATH?: string }): IgniterEnhancedBuilder<TContext, TMiddlewares> {
    return new IgniterEnhancedBuilder(
      { ...this._config, config: routerConfig },
      this._middlewares
    );
  }

  /**
   * Creates the enriched API with global middleware types inferred.
   */
  create(): IgniterEnrichedAPI<TContext, TMiddlewares> {
    type EnrichedContext = TContext & InferProcedureContext<TMiddlewares>;
    
    return {
      /**
       * Creates a query action for retrieving data.
       */
      // @ts-expect-error - TResponse is not used
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
      >(options),

      /**
       * Creates a mutation action for modifying data.
       */
      // @ts-expect-error - TResponse is not used
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
      >(options),

      /**
       * Creates a controller to group related actions.
       */
      controller: <
        // @ts-expect-error - TActions is not used
        TActions extends Record<string, IgniterAction<EnrichedContext, any, any, any, any, any, any, any>>
      >(
        config: IgniterControllerConfig<EnrichedContext, TActions>
      ) => createIgniterController<EnrichedContext, TActions>(config),

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
        baseURL: config.baseURL || this._config.config?.baseURL,
        basePATH: config.basePATH || this._config.config?.basePATH
      }),

      /**
       * Creates a reusable middleware procedure.
       */
      procedure: <
        TOptions extends Record<string, any>,
        TOutput
      >(
        middleware: IgniterProcedure<EnrichedContext, TOptions, TOutput>
      ) => createIgniterProcedure(middleware),

      /**
       * Internal context type for debugging/inspection.
       */
      $context: {} as EnrichedContext,

      /**
       * Internal config for debugging/inspection.
       */
      $config: this._config
    };
  }
}

/**
 * Type for the enriched API with global middleware types.
 */
export interface IgniterEnrichedAPI<
  TContext extends object,
  TMiddlewares extends readonly IgniterProcedure<any, any, any>[]
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
  ) => any; // Router type will be simplified

  procedure: <
    TOptions extends Record<string, any>,
    TOutput
  >(
    middleware: IgniterProcedure<TContext & InferProcedureContext<TMiddlewares>, TOptions, TOutput>
  ) => (options?: TOptions) => IgniterProcedure<TContext & InferProcedureContext<TMiddlewares>, TOptions, TOutput>;

  $context: TContext & InferProcedureContext<TMiddlewares>;
  $config: IgniterBuilderConfig<TContext>;
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
