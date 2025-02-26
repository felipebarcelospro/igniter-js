import type { StandardSchemaV1, IgniterProcedure, IgniterActionHandler, IgniterActionContext, QueryMethod, InferEndpoint, IgniterQueryOptions, IgniterAction, MutationMethod, IgniterMutationOptions } from "../types";

/**
 * Creates a type-safe query action for the Igniter Framework.
 * Query actions are used for retrieving data and should be idempotent.
 * 
 * @template TActionContext - The type of the action context
 * @template TActionPath - The URL path for the action
 * @template TActionQuery - The query parameters schema
 * @template TActionResponse - The expected response type
 * @template TActionMiddlewares - Array of middleware procedures
 * @template TActionHandler - The action handler function type
 * @template TActionInfer - The inferred types for the action
 * 
 * @param options - Configuration options for the query action
 * @returns A configured query action
 * 
 * @example
 * ```typescript
 * const getUsers = createIgniterQuery({
 *   path: 'users',
 *   query: z.object({ page: z.number() }),
 *   use: [authMiddleware],
 *   handler: async (ctx) => {
 *     // Handler implementation
 *     return ctx.response.success({ users: [] });
 *   }
 * });
 * ```
 */
export const createIgniterQuery = <
  TActionContext,
  TActionPath extends string,
  TActionQuery extends StandardSchemaV1 | undefined,
  TActionResponse,
  TActionMiddlewares extends readonly IgniterProcedure<any, any, any>[],
  TActionHandler extends IgniterActionHandler<
    IgniterActionContext<TActionContext, TActionPath, QueryMethod, undefined, TActionQuery, TActionMiddlewares>,
    TActionResponse
  >,
  TActionInfer extends InferEndpoint<
    TActionContext,
    TActionPath,
    QueryMethod,
    undefined,
    TActionQuery,
    TActionResponse,
    TActionMiddlewares,
    TActionHandler
  >
>(options: IgniterQueryOptions<
  TActionContext,
  TActionPath,
  TActionQuery,
  TActionResponse,
  TActionMiddlewares,
  TActionHandler
>) => {
  return {
    ...options,
    method: 'GET' as const
  } as IgniterAction<
    TActionContext,
    TActionPath,
    QueryMethod,
    undefined,
    TActionQuery,
    TActionResponse,
    TActionMiddlewares,
    TActionHandler,
    TActionInfer
  >;
}

/**
 * Creates a type-safe mutation action for the Igniter Framework.
 * Mutation actions are used for modifying data and typically use HTTP methods like POST, PUT, PATCH, or DELETE.
 * 
 * @template TActionContext - The type of the action context
 * @template TActionPath - The URL path for the action
 * @template TActionMethod - The HTTP method for the mutation
 * @template TActionBody - The request body schema
 * @template TActionResponse - The expected response type
 * @template TActionMiddlewares - Array of middleware procedures
 * @template TActionHandler - The action handler function type
 * @template TActionInfer - The inferred types for the action
 * 
 * @param options - Configuration options for the mutation action
 * @returns A configured mutation action
 * 
 * @example
 * ```typescript
 * const createUser = createIgniterMutation({
 *   path: 'users',
 *   method: 'POST',
 *   body: z.object({
 *     name: z.string(),
 *     email: z.string().email()
 *   }),
 *   use: [authMiddleware, validateMiddleware],
 *   handler: async (ctx) => {
 *     const user = await createUserInDb(ctx.request.body);
 *     return ctx.response.created(user);
 *   }
 * });
 * ```
 */
export const createIgniterMutation = <
  TActionContext,
  TActionPath extends string,
  TActionMethod extends MutationMethod,
  TActionBody extends StandardSchemaV1 | undefined,
  TActionResponse,
  TActionMiddlewares extends readonly IgniterProcedure<any, any, any>[],
  TActionHandler extends IgniterActionHandler<
    IgniterActionContext<TActionContext, TActionPath, TActionMethod, TActionBody, undefined, TActionMiddlewares>,
    TActionResponse
  >,
  TActionInfer extends InferEndpoint<
    TActionContext,
    TActionPath,
    TActionMethod,
    TActionBody,
    undefined,
    TActionResponse,
    TActionMiddlewares,
    TActionHandler
  >
>(options: IgniterMutationOptions<
  TActionContext,
  TActionPath,
  TActionMethod,
  TActionBody,
  TActionResponse,
  TActionMiddlewares,
  TActionHandler
>) => {
  return options as IgniterAction<
    TActionContext,
    TActionPath,
    TActionMethod,
    TActionBody,
    undefined,
    TActionResponse,
    TActionMiddlewares,
    TActionHandler,
    TActionInfer
  >;
}