import type { IgniterCallerManager } from '../../core/manager'
import type { IgniterCallerTypedRequestBuilder } from '../../types/builder'
import type { InferResponse, TypedRequestBuilder } from '../../types/infer'
import type {
  DeletePaths,
  GetPaths,
  HeadPaths,
  IgniterCallerSchemaMap,
  PatchPaths,
  PostPaths,
  PutPaths,
} from '../../types/schemas'
import type {
  IgniterCallerClientConfigKey,
  IgniterCallerClientConfigValue,
  IgniterCallerClientQuery,
} from './config'
import type {
  IgniterCallerClientRequestBody,
  IgniterCallerClientRequestParams,
  IgniterCallerUseMutateOptions,
  IgniterCallerUseMutateResult,
  IgniterCallerUseQueryOptions,
  IgniterCallerUseQueryResult,
} from './hooks'

export type InferCallerSchemas<TCaller> =
  TCaller extends IgniterCallerManager<infer TSchemas>
    ? TSchemas
    : IgniterCallerSchemaMap

export type IgniterCallerClientInvalidate<TSchemas extends IgniterCallerSchemaMap> = {
  <TPath extends GetPaths<TSchemas>>(
    path: TPath,
    data?: InferResponse<TSchemas, TPath, 'GET'>,
  ): void
  (paths: string | string[]): void
}

export interface IgniterCallerClientConfigApi {
  set<TKey extends IgniterCallerClientConfigKey>(
    key: TKey,
    value: IgniterCallerClientConfigValue<TKey>,
  ): void
  get<TKey extends IgniterCallerClientConfigKey>(
    key: TKey,
  ): IgniterCallerClientConfigValue<TKey> | undefined
  reset: () => void
}

export type IgniterCallerClientQueryBuilder<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends string,
> = TypedRequestBuilder<TSchemas, TPath, 'GET'> & {
  useQuery: (
    options?: IgniterCallerUseQueryOptions<
      InferResponse<TSchemas, TPath, 'GET'>,
      {
        params?: IgniterCallerClientRequestParams<TSchemas, TPath, 'GET'>
        query?: IgniterCallerClientQuery
      }
    >,
  ) => IgniterCallerUseQueryResult<InferResponse<TSchemas, TPath, 'GET'>>
}

export type IgniterCallerClientMutateBuilder<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends string,
  TMethod extends 'POST' | 'PUT' | 'PATCH' | 'DELETE',
> = TypedRequestBuilder<TSchemas, TPath, TMethod> & {
  useMutate: (
    options?: IgniterCallerUseMutateOptions<
      InferResponse<TSchemas, TPath, TMethod>,
      {
        params?: IgniterCallerClientRequestParams<TSchemas, TPath, TMethod>
        query?: IgniterCallerClientQuery
        body?: IgniterCallerClientRequestBody<TSchemas, TPath, TMethod>
      }
    >,
  ) => IgniterCallerUseMutateResult<InferResponse<TSchemas, TPath, TMethod>>
}

export type IgniterCallerClientUntypedQueryBuilder =
  IgniterCallerTypedRequestBuilder<unknown> & {
    useQuery: (
      options?: IgniterCallerUseQueryOptions<unknown>,
    ) => IgniterCallerUseQueryResult<unknown>
  }

export type IgniterCallerClientUntypedMutateBuilder =
  IgniterCallerTypedRequestBuilder<unknown> & {
    useMutate: (
      options?: IgniterCallerUseMutateOptions<unknown>,
    ) => IgniterCallerUseMutateResult<unknown>
  }

export interface IgniterCallerClient<TCaller extends IgniterCallerManager<any>> {
  raw: TCaller
  config: IgniterCallerClientConfigApi
  invalidate: IgniterCallerClientInvalidate<InferCallerSchemas<TCaller>>
  get: {
    <TPath extends GetPaths<InferCallerSchemas<TCaller>>>(
      path: TPath,
    ): IgniterCallerClientQueryBuilder<InferCallerSchemas<TCaller>, TPath>
    <TPath extends string>(
      path?: TPath,
    ): IgniterCallerClientUntypedQueryBuilder
  }
  post: {
    <TPath extends PostPaths<InferCallerSchemas<TCaller>>>(
      path: TPath,
    ): IgniterCallerClientMutateBuilder<
      InferCallerSchemas<TCaller>,
      TPath,
      'POST'
    >
    <TPath extends string>(
      path?: TPath,
    ): IgniterCallerClientUntypedMutateBuilder
  }
  put: {
    <TPath extends PutPaths<InferCallerSchemas<TCaller>>>(
      path: TPath,
    ): IgniterCallerClientMutateBuilder<
      InferCallerSchemas<TCaller>,
      TPath,
      'PUT'
    >
    <TPath extends string>(
      path?: TPath,
    ): IgniterCallerClientUntypedMutateBuilder
  }
  patch: {
    <TPath extends PatchPaths<InferCallerSchemas<TCaller>>>(
      path: TPath,
    ): IgniterCallerClientMutateBuilder<
      InferCallerSchemas<TCaller>,
      TPath,
      'PATCH'
    >
    <TPath extends string>(
      path?: TPath,
    ): IgniterCallerClientUntypedMutateBuilder
  }
  delete: {
    <TPath extends DeletePaths<InferCallerSchemas<TCaller>>>(
      path: TPath,
    ): IgniterCallerClientMutateBuilder<
      InferCallerSchemas<TCaller>,
      TPath,
      'DELETE'
    >
    <TPath extends string>(
      path?: TPath,
    ): IgniterCallerClientUntypedMutateBuilder
  }
  head: {
    <TPath extends HeadPaths<InferCallerSchemas<TCaller>>>(
      path: TPath,
    ): IgniterCallerClientQueryBuilder<InferCallerSchemas<TCaller>, TPath>
    <TPath extends string>(
      path?: TPath,
    ): IgniterCallerClientUntypedQueryBuilder
  }
}
