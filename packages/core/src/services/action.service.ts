import type { IgniterPlugin } from "../types/plugin.interface";
import type { StandardSchemaV1, IgniterProcedure, IgniterActionHandler, IgniterActionContext, QueryMethod, InferEndpoint, IgniterQueryOptions, IgniterAction, MutationMethod } from "../types";

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
 * @param input - Configuration options for the query action
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
  TQueryContext extends object,
  TQueryPath extends string,
  TQueryQuery extends StandardSchemaV1 | undefined,
  TQueryMiddlewares extends readonly IgniterProcedure<TQueryContext, any, unknown>[] | undefined,
  TQueryPlugins extends Record<string, IgniterPlugin<any, any, any, any, any, any, any, any>>,
  TQueryHandler extends IgniterActionHandler<
    IgniterActionContext<TQueryContext, TQueryPath, QueryMethod, undefined, TQueryQuery, TQueryMiddlewares, TQueryPlugins>,
    unknown
  >,
  TQueryResponse extends ReturnType<TQueryHandler>,
  TQueryInfer extends InferEndpoint<
    TQueryContext,
    TQueryPath,
    QueryMethod,
    undefined,
    TQueryQuery,
    TQueryMiddlewares,
    TQueryPlugins,
    TQueryHandler,
    TQueryResponse
  >
>(options: IgniterQueryOptions<
  TQueryContext,
  TQueryPath,
  TQueryQuery,
  TQueryMiddlewares,
  TQueryPlugins,
  TQueryHandler
>) => {
  type TQuery = IgniterAction<
    TQueryContext,
    TQueryPath,
    QueryMethod,
    undefined,
    TQueryQuery,
    TQueryMiddlewares,
    TQueryPlugins,
    TQueryHandler,
    TQueryResponse,
    TQueryInfer
  >

  return {
    ...options,
    method: 'GET' as const,
    $Infer: {} as TQueryInfer
  } as TQuery;
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
  TMutationContext extends object,
  TMutationPath extends string,
  TMutationMethod extends MutationMethod,
  TMutationBody extends StandardSchemaV1 | undefined,
  TMutationQuery extends StandardSchemaV1 | undefined,
  TMutationMiddlewares extends readonly IgniterProcedure<TMutationContext, any, any>[] | undefined,
  TMutationPlugins extends Record<string, IgniterPlugin<any, any, any, any, any, any, any, any>>,
  TMutationHandler extends IgniterActionHandler<
    IgniterActionContext<TMutationContext, TMutationPath, TMutationMethod, TMutationBody, TMutationQuery, TMutationMiddlewares, TMutationPlugins>,
    any
  >,
  TMutationResponse extends ReturnType<TMutationHandler>,
  TMutationInfer extends InferEndpoint<
    TMutationContext,
    TMutationPath,
    TMutationMethod,
    TMutationBody,
    TMutationQuery,
    TMutationMiddlewares,
    TMutationPlugins,
    TMutationHandler,
    TMutationResponse
  >,
>(action: {
  name?: string,
  path: TMutationPath,
  method: TMutationMethod,
  description?: string,
  body?: TMutationBody,
  query?: TMutationQuery,
  use?: TMutationMiddlewares,
  handler: TMutationHandler,
}) => {
  type TMutation = IgniterAction<
    TMutationContext,
    TMutationPath,
    TMutationMethod,
    TMutationBody,
    TMutationQuery,
    TMutationMiddlewares,
    TMutationPlugins,
    TMutationHandler,
    TMutationResponse,
    TMutationInfer
  >

  return {
    name: action.name,
    type: 'mutation' as const,
    path: action.path,
    method: action.method,
    description: action.description,
    body: action.body,
    query: action.query,
    use: action.use,
    handler: action.handler,
    $Infer: {} as TMutationInfer
  } as TMutation;
}