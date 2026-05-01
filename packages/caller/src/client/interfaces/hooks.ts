import type { IgniterError } from '@igniter-js/common'
import type { IgniterCallerApiResponse } from '../../types/response'
import type {
  EndpointInfo,
  IgniterCallerSchemaMap,
  IgniterCallerSchemaMethod,
} from '../../types/schemas'
import type {
  IgniterCallerClientCookies,
  IgniterCallerClientHeaders,
  IgniterCallerClientQuery,
} from './config'

export type IgniterCallerClientRequestParams<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends string,
  TMethod extends IgniterCallerSchemaMethod,
> = EndpointInfo<TSchemas, TPath, TMethod>['params'] &
  Record<string, string | number | boolean>

export type IgniterCallerClientRequestBody<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends string,
  TMethod extends IgniterCallerSchemaMethod,
> = EndpointInfo<TSchemas, TPath, TMethod>['request']

export interface IgniterCallerUseQueryOptions<
  TResponse,
  TVariables extends {
    params?: Record<string, string | number | boolean>
    query?: IgniterCallerClientQuery
  } = {
    params?: Record<string, string | number | boolean>
    query?: IgniterCallerClientQuery
  },
> {
  enabled?: boolean
  initialData?: TResponse
  params?: TVariables['params']
  query?: TVariables['query']
  headers?: IgniterCallerClientHeaders
  cookies?: IgniterCallerClientCookies
  staleTime?: number
  refetchInterval?: number
  refetchIntervalInBackground?: boolean
  refetchOnWindowFocus?: boolean
  refetchOnMount?: boolean
  onLoading?: (isLoading: boolean) => void
  onRequest?: (response: IgniterCallerApiResponse<TResponse>) => void
  onSuccess?: (data: TResponse) => void
  onError?: (error: IgniterError) => void
  onSettled?: (data: TResponse | null, error?: IgniterError | null) => void
}

export interface IgniterCallerUseQueryResult<
  TResponse,
  TVariables = unknown,
> {
  data: TResponse | null
  error: IgniterError | null
  variables?: TVariables
  isLoading: boolean
  isFetching: boolean
  isSuccess: boolean
  isError: boolean
  status: 'loading' | 'error' | 'success'
  refetch: () => void
  invalidate: (data?: TResponse) => void
  execute: (variables?: TVariables) => Promise<IgniterCallerApiResponse<TResponse> | undefined>
}

export interface IgniterCallerUseMutateOptions<
  TResponse,
  TVariables extends {
    params?: Record<string, string | number | boolean>
    query?: IgniterCallerClientQuery
    body?: unknown
  } = {
    params?: Record<string, string | number | boolean>
    query?: IgniterCallerClientQuery
    body?: unknown
  },
> {
  params?: TVariables['params']
  query?: TVariables['query']
  body?: TVariables['body']
  headers?: IgniterCallerClientHeaders
  cookies?: IgniterCallerClientCookies
  onLoading?: (isLoading: boolean) => void
  onRequest?: (response: IgniterCallerApiResponse<TResponse>) => void
  onSuccess?: (data: TResponse) => void
  onError?: (error: IgniterError) => void
  onSettled?: (data: TResponse | null, error?: IgniterError | null) => void
}

export interface IgniterCallerUseMutateResult<
  TResponse,
  TVariables = unknown,
> {
  data: TResponse | null
  error: IgniterError | null
  variables?: TVariables
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  status: 'loading' | 'error' | 'success'
  mutate: (variables?: TVariables) => Promise<IgniterCallerApiResponse<TResponse> | undefined>
  retry: () => void
}
