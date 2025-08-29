import type { IgniterResponseProcessor } from "../processors/response.processor";
import type { IgniterCommonErrorCode, IgniterProcessorResponse } from "./response.interface";
import type { IgniterCookie } from "../services/cookie.service";
import type { IgniterProcedure, InferActionProcedureContext } from "./procedure.interface";
import type { StandardSchemaV1 } from "./schema.interface";
import type { InferParamPath, NonUnknownObject, Prettify } from "./utils.interface";
import type { IgniterRealtimeService } from "./realtime.interface";
import type { IgniterPlugin, InferIgniterPlugins } from "./plugin.interface";

export type QueryMethod = "GET";
export type MutationMethod = "POST" | "PUT" | "DELETE" | "PATCH";
export type HTTPMethod = QueryMethod | MutationMethod;
export type IgniterCookies = IgniterCookie;
export type IgniterHeaders = Headers;

/**
 * Infers the caller signature for a given IgniterAction.
 * If the action expects input, returns a function that takes input and returns a Promise of output.
 * Otherwise, returns a function with no input and a Promise of output.
 */
export type InferActionCaller<TActionInput, TActionOutput> =
  NonUnknownObject<TActionInput> extends never
    ? () => Promise<TActionOutput>
    : (input: NonUnknownObject<TActionInput>) => Promise<TActionOutput>;

/**
 * Utility type to infer the final response type from an action handler.
 */
export type InferActionResponse<THandlerReturn> =
  THandlerReturn extends any // 🔄 MUDANÇA: Força distribuição sobre união
    ? THandlerReturn extends Promise<infer TUnwrapped>
      ? InferActionResponse<TUnwrapped>
      : THandlerReturn extends IgniterResponseProcessor<any, infer TData>
      ? TData extends IgniterProcessorResponse<infer TSuccess, infer TError>
        ? IgniterProcessorResponse<TSuccess, TError>
        : never
      : THandlerReturn extends Response
      ? InferWebResponse<THandlerReturn>
      : InferDirectResponse<THandlerReturn>
    : never;

/**
 * Infer types when using ResponseProcessor
 */
type InferProcessorResponse<TData> = TData extends IgniterProcessorResponse<infer TSuccess, infer TError>
  ? {
      data: TSuccess;
      error: TError extends IgniterErrorResponse<infer TCode, infer TErrorData>
        ? IgniterErrorResponse<TCode, TErrorData>
        : null;
    }
  : never;

/**
 * Infer types when returning Web API Response directly
 */
type InferWebResponse<T> = {
  success: unknown;
  errors: {
    code: "ERR_UNKNOWN_ERROR";
    message?: string;
    data?: unknown;
  };
};

/**
 * Infer types when returning value directly
 */
type InferDirectResponse<T> = {
  success: T;
  errors: {
    code: "ERR_UNKNOWN_ERROR";
    message?: string;
    data?: unknown;
  };
};

/**
 * Base error response type
 */
type IgniterErrorResponse<TCode extends IgniterCommonErrorCode, TData = unknown> = {
  code: TCode;
  message?: string;
  data?: TData;
};


/**
 * Complete action context provided to action handlers.
 * Includes request data, application context, response utilities, realtime service, and type-safe plugin access.
 *
 * @template TActionContext - Application context type with plugin registry
 * @template TActionPath - Action path for parameter inference
 * @template TActionMethod - HTTP method type
 * @template TActionBody - Request body schema type
 * @template TActionQuery - Query parameters schema type
 * @template TActionMiddlewares - Applied middleware procedures
 *
 * @example
 * ```typescript
 * // In action handler
 * handler: async (ctx: IgniterActionContext<AppContext, "/users/:id", "POST", UserSchema, never, []>) => {
 *   // ✅ Request data (fully typed)
 *   const userId = ctx.request.params.id;  // string (inferred from path)
 *   const userData = ctx.request.body;     // UserSchema input type
 *
 *   // ✅ Application context (enhanced with plugins)
 *   const db = ctx.context.db;            // Database instance
 *   const currentUser = ctx.context.auth?.currentUser; // From auth plugin
 *
 *   // ✅ Plugin actions (type-safe)
 *   await ctx.plugins.audit.actions.create({ action: 'user:update', userId });
 *   await ctx.plugins.email.actions.sendNotification({ to: userData.email });
 *
 *   // ✅ Response utilities
 *   return ctx.response.json({ success: true, user: updatedUser });
 * }
 * ```
 */
export type IgniterActionContext<
  TActionContext extends object,
  TActionPath extends string,
  TActionMethod extends HTTPMethod,
  TActionBody extends StandardSchemaV1 | undefined,
  TActionQuery extends StandardSchemaV1 | undefined,
  TActionMiddlewares extends readonly IgniterProcedure<any, any, any>[],
  TActionPlugins extends Record<string, any>,
> = {
  /**
   * Request data with full type inference for params, body, and query.
   * Path parameters are inferred from the route path template.
   */
  request: {
    method: TActionMethod;
    path: TActionPath;
    params: InferParamPath<TActionPath>;
    headers: IgniterHeaders;
    cookies: IgniterCookies;
    body: TActionBody extends StandardSchemaV1
      ? StandardSchemaV1.InferInput<TActionBody>
      : undefined;
    query: TActionQuery extends StandardSchemaV1
      ? StandardSchemaV1.InferInput<TActionQuery>
      : undefined;
  };

  /**
   * Enhanced application context merging base context, middleware context, and plugin extensions.
   * Provides access to all application services and plugin-provided context data.
   */
  context: TActionContext & InferActionProcedureContext<TActionMiddlewares>;

  /**
   * Response processor for creating typed HTTP responses.
   * Supports JSON, HTML, SSE, and custom response types.
   */
  response: IgniterResponseProcessor<TActionContext & InferActionProcedureContext<TActionMiddlewares>, IgniterProcessorResponse<unknown>>;

  /**
   * Realtime service for server-sent events and websocket communication.
   * Enables real-time updates to connected clients.
   */
  realtime: IgniterRealtimeService<TActionContext & InferActionProcedureContext<TActionMiddlewares>>;

  /**
   * Type-safe plugin access registry.
   * Provides IntelliSense and type checking for all registered plugin actions and events.
   * Only available plugins registered in the builder will be accessible.
   *
   * @example
   * ```typescript
   * // Plugin actions (fully typed based on registration)
   * await ctx.plugins.audit.actions.create({ action: 'login', userId: '123' });
   * await ctx.plugins.auth.actions.validateToken({ token: 'abc' });
   *
   * // Plugin events (type-safe)
   * await ctx.plugins.audit.emit('user:activity', { type: 'login', userId: '123' });
   *
   * // Plugin context (auto-completed)
   * console.log(ctx.context.audit.userId);      // From audit plugin context extension
   * console.log(ctx.context.auth.currentUser);  // From auth plugin context extension
   * ```
   */
  plugins: InferIgniterPlugins<TActionPlugins>
};

export type IgniterActionHandler<
  TActionContext extends IgniterActionContext<any, any, any, any, any, any, any>,
  TActionResponse,
> = (ctx: TActionContext) => TActionResponse;

export type IgniterQueryOptions<
  TQueryContext extends object,
  TQueryPath extends string,
  TQueryQuery extends StandardSchemaV1 | undefined,
  TQueryMiddlewares extends readonly IgniterProcedure<any, any, any>[],
  TQueryPlugins extends Record<string, IgniterPlugin<any, any, any, any, any, any, any, any>>,
  TQueryHandler extends IgniterActionHandler<
    IgniterActionContext<
      TQueryContext,
      TQueryPath,
      QueryMethod,
      undefined,
      TQueryQuery,
      TQueryMiddlewares,
      TQueryPlugins
    >,
    unknown
  >
> = {
  name?: string;
  description?: string;
  path: TQueryPath;
  stream?: boolean;
  method?: QueryMethod;
  query?: TQueryQuery;
  use?: TQueryMiddlewares;
  handler: TQueryHandler;
};

export type IgniterMutationOptions<
  TMutationContext extends object,
  TMutationPath extends string,
  TMutationMethod extends MutationMethod,
  TMutationBody extends StandardSchemaV1 | undefined,
  TMutationQuery extends StandardSchemaV1 | undefined,
  TMutationMiddlewares extends readonly IgniterProcedure<any, any, any>[],
  TMutationPlugins extends Record<string, IgniterPlugin<any, any, any, any, any, any, any, any>>,
  TMutationHandler extends IgniterActionHandler<
    IgniterActionContext<
      TMutationContext,
      TMutationPath,
      TMutationMethod,
      TMutationBody,
      TMutationQuery,
      TMutationMiddlewares,
      TMutationPlugins
    >,
    unknown
  >
> = {
  name?: string;
  description?: string;
  path: TMutationPath;
  method: TMutationMethod;

  use?: TMutationMiddlewares;

  body?: TMutationBody;
  query?: TMutationQuery;

  handler: TMutationHandler;
};

export type IgniterAction<
  TActionContext extends object,
  TActionPath extends string,
  TActionMethod extends HTTPMethod,
  TActionBody extends StandardSchemaV1 | undefined,
  TActionQuery extends StandardSchemaV1 | undefined,
  TActionMiddlewares extends readonly IgniterProcedure<any, any, any>[],
  TActionPlugins extends Record<string, IgniterPlugin<any, any, any, any, any, any, any, any>>,
  TActionHandler extends IgniterActionHandler<
    IgniterActionContext<
      TActionContext,
      TActionPath,
      TActionMethod,
      TActionBody,
      TActionQuery,
      TActionMiddlewares,
      TActionPlugins
    >,
    unknown
  >,
  TActionResponse extends ReturnType<TActionHandler>,
  TActionInfer extends InferEndpoint<
    TActionContext,
    TActionPath,
    TActionMethod,
    TActionBody,
    TActionQuery,
    TActionMiddlewares,
    TActionPlugins,
    TActionHandler,
    TActionResponse
  >,
> = {
  name?: string;
  type: TActionMethod extends QueryMethod ? "query" : "mutation";
  path: TActionPath;
  method: TActionMethod;
  description?: string;
  body?: TActionBody;
  query?: TActionQuery;
  use?: TActionMiddlewares;
  handler: TActionHandler;
  $Infer: TActionInfer;
};

export type InferEndpoint<
  TActionContext extends object,
  TActionPath extends string,
  TActionMethod extends HTTPMethod,
  TActionBody extends StandardSchemaV1 | undefined,
  TActionQuery extends StandardSchemaV1 | undefined,
  TActionMiddlewares extends readonly IgniterProcedure<TActionContext, unknown, unknown>[],
  TActionPlugins extends Record<string, IgniterPlugin<any, any, any, any, any, any, any, any>>,
  TActionHandler extends IgniterActionHandler<
    IgniterActionContext<
      TActionContext,
      TActionPath,
      TActionMethod,
      TActionBody,
      TActionQuery,
      TActionMiddlewares,
      TActionPlugins
    >,
    unknown
  >,
  TResponse extends ReturnType<TActionHandler>,
  TActionInferBody = TActionBody extends StandardSchemaV1
    ? StandardSchemaV1.InferInput<TActionBody>
    : undefined,
  TActionInferQuery = TActionQuery extends StandardSchemaV1
    ? StandardSchemaV1.InferInput<TActionQuery>
    : {},
  TActionInferParams = InferParamPath<TActionPath>,
  TActionInferInput = Prettify<
    (TActionBody extends StandardSchemaV1 ? { body: TActionInferBody } : {}) &
      (TActionQuery extends StandardSchemaV1
        ? { query: TActionInferQuery }
        : {}) & { params: TActionInferParams }
  >,
  TActionInferResponse = InferActionResponse<TResponse>,
  TActionInferCaller = InferActionCaller<TActionInferInput, TActionInferResponse>,
> = Prettify<{
  type: TActionMethod extends QueryMethod ? "query" : "mutation";
  path: TActionPath;
  name?: string;
  method: TActionMethod;
  body: TActionInferBody;
  query: TActionInferQuery;
  params: TActionInferParams;
  handler: TActionHandler;
  $Input: TActionInferInput;
  $Output: TActionInferResponse extends { status: 'success', data: infer TData } ? TData : never;
  $Errors: TActionInferResponse extends { status: Exclude<IgniterProcessorResponse['status'], 'success'>, error: infer TError } ? TError : never;
  $Caller: TActionInferCaller;
  $Response: TActionInferResponse;
}>;
