import type { IgniterResponseProcessor } from "../processors/response.processor"
import type { IgniterCookie } from "../services/cookie.service"
import type { IgniterProcedure, InferProcedureContext } from "./procedure.interface"
import type { StandardSchemaV1 } from "./schema.interface"
import type { InferParamPath, NonUnknownObject, Prettify } from "./utils.interface"

export type QueryMethod = 'GET'
export type MutationMethod = 'POST' | 'PUT' | 'DELETE' | 'PATCH'
export type HTTPMethod = QueryMethod | MutationMethod
export type IgniterCookies = IgniterCookie
export type IgniterHeaders = Headers

export type IgniterActionContext<
  TActionContext,
  TActionPath extends string,
  TActionMethod extends HTTPMethod,
  TActionBody extends StandardSchemaV1 | undefined,
  TActionQuery extends StandardSchemaV1 | undefined,
  TActionMiddlewares extends readonly IgniterProcedure<any, any, any>[],
> = {
  request: {
    method: TActionMethod;
    path: TActionPath;
    params: InferParamPath<TActionPath>;
    headers: IgniterHeaders;
    cookies: IgniterCookies;
    body: TActionBody extends StandardSchemaV1 ? StandardSchemaV1.InferInput<TActionBody> : undefined;
    query: TActionQuery extends StandardSchemaV1 ? StandardSchemaV1.InferInput<TActionQuery> : undefined;
  }
  context: Prettify<TActionContext & InferProcedureContext<TActionMiddlewares>>;
  response: IgniterResponseProcessor
  [key: string]: any;
}

export type IgniterActionHandler<
  TActionContext extends IgniterActionContext<any, any, any, any, any, any>,
  TActionResponse,
> = 
  (ctx: TActionContext) => TActionResponse;

export type IgniterQueryOptions<
  TActionContext,
  TActionPath extends string,
  TActionQuery extends StandardSchemaV1 | undefined,
  TActionResponse,
  TActionMiddlewares extends readonly IgniterProcedure<any, any, any>[],
  TActionHandler extends IgniterActionHandler<IgniterActionContext<TActionContext, TActionPath, QueryMethod, undefined, TActionQuery, TActionMiddlewares>, TActionResponse>
> = {
  path: TActionPath;
  method?: QueryMethod;
  description?: string;
  query?: TActionQuery;
  use?: TActionMiddlewares;
  handler: TActionHandler;
  [key: string]: any;
};

export type IgniterMutationOptions<
  TActionContext,
  TActionPath extends string,
  TActionMethod extends MutationMethod,
  TActionBody extends StandardSchemaV1 | undefined,
  TActionResponse,
  TActionMiddlewares extends readonly IgniterProcedure<any, any, any>[],
  TActionHandler extends IgniterActionHandler<IgniterActionContext<TActionContext, TActionPath, TActionMethod, TActionBody, undefined, TActionMiddlewares>, TActionResponse>
> = {
  path: TActionPath;
  method: TActionMethod;
  description?: string;
  body?: TActionBody;
  use?: TActionMiddlewares;
  handler: TActionHandler;
  [key: string]: any;
};

export type IgniterAction<
  TActionContext,
  TActionPath extends string,
  TActionMethod extends HTTPMethod,
  TActionBody extends StandardSchemaV1 | undefined,
  TActionQuery extends StandardSchemaV1 | undefined,
  TActionResponse,
  TActionMiddlewares extends readonly IgniterProcedure<any, any, any>[],
  TActionHandler extends IgniterActionHandler<IgniterActionContext<TActionContext, TActionPath, TActionMethod, TActionBody, TActionQuery, TActionMiddlewares>, TActionResponse>,
  TActionInfer extends InferEndpoint<TActionContext, TActionPath, TActionMethod, TActionBody, TActionQuery, TActionResponse, TActionMiddlewares, TActionHandler>
> = {
  path: TActionPath;
  method: TActionMethod;
  description?: string;
  body?: TActionBody;
  query?: TActionQuery;
  use?: TActionMiddlewares;
  handler: TActionHandler;
  $Infer: TActionInfer;
  $Caller: (input: NonUnknownObject<TActionInfer['$Input']>) => ReturnType<TActionHandler>;
  [key: string]: any;
}

export type InferEndpoint<
  TActionContext,
  TActionPath extends string,
  TActionMethod extends HTTPMethod,
  TActionBody extends StandardSchemaV1 | undefined,
  TActionQuery extends StandardSchemaV1 | undefined,
  TActionResponse,
  TActionMiddlewares extends readonly IgniterProcedure<any, any, any>[],
  TActionHandler extends IgniterActionHandler<IgniterActionContext<TActionContext, TActionPath, TActionMethod, TActionBody, TActionQuery, TActionMiddlewares>, TActionResponse>,
  TActionInferBody = TActionBody extends StandardSchemaV1 ? StandardSchemaV1.InferInput<TActionBody> : undefined,
  TActionInferQuery = TActionQuery extends StandardSchemaV1 ? StandardSchemaV1.InferInput<TActionQuery> : {},
  TActionInferParams = InferParamPath<TActionPath>,
  TActionInferInput = Prettify<(TActionBody extends StandardSchemaV1 ? { body: TActionInferBody } : {}) & (TActionQuery extends StandardSchemaV1 ? { query: TActionInferQuery } : {}) & { params: TActionInferParams }>
> = Prettify<{
  type: TActionMethod extends QueryMethod ? 'query' : 'mutation';
  path: TActionPath;
  method: TActionMethod;
  body: TActionInferBody;
  query: TActionInferQuery;
  params: TActionInferParams;
  handler: TActionHandler;
  $Input: TActionInferInput;
  $Output: ReturnType<TActionHandler>;
  [key: string]: any;
}>;