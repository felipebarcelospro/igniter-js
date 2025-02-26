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
  IgniterAction
} from "../types";

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
   * @returns A new builder instance with the updated context type
   * 
   * @example
   * const api = Igniter
   *   .context<{
   *     db: Database;
   *     user?: User;
   *   }>()
   *   .create();
   */
  context<TNewContext extends object | ContextCallback>() {
    return new IgniterBuilder<TNewContext extends ContextCallback ? Unwrap<TNewContext> : TNewContext>();
  }

  /**
   * Creates the main API builder with all framework components.
   * 
   * @returns An object containing factory functions for all framework components
   * 
   * @example
   * const api = Igniter.context<AppContext>().create();
   * 
   * // Create components
   * const auth = api.procedure({);
   * const users = api.controller({ });
   * const router = api.router({ });
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
