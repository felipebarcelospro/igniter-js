'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { IgniterError } from '@igniter-js/common'
import type { IgniterCallerApiResponse } from '../../types/response'
import type {
  IgniterCallerClientConfig,
  IgniterCallerClientQuery,
} from '../interfaces/config'
import type { IgniterCallerClientRefetchFn } from '../interfaces/context'
import type {
  IgniterCallerUseMutateOptions,
  IgniterCallerUseMutateResult,
  IgniterCallerUseQueryOptions,
  IgniterCallerUseQueryResult,
} from '../interfaces/hooks'
import { IgniterCallerClientCache } from '../utils/cache'
import { buildQueryKey, buildQueryPrefix } from '../utils/query-key'
import { buildCookieHeader } from '../utils/cookies'

export interface IgniterCallerClientRequestInput {
  params?: Record<string, string | number | boolean>
  query?: Record<string, string | number | boolean>
  headers?: Record<string, string>
  cookies?: Record<string, string>
  body?: unknown
}

export type IgniterCallerClientRequestFactory<TResponse> = (
  method: string,
  path: string,
  input: IgniterCallerClientRequestInput,
) => {
  execute: () => Promise<IgniterCallerApiResponse<TResponse>>
}

interface UseQueryParams<TResponse, TVariables> {
  callerKey: string
  method: 'GET' | 'HEAD'
  path: string
  buildRequest: IgniterCallerClientRequestFactory<TResponse>
  register: (key: string, refetch: IgniterCallerClientRefetchFn) => void
  unregister: (key: string, refetch: IgniterCallerClientRefetchFn) => void
  invalidate: (keys: string | string[], data?: unknown) => void
  getMergedConfig: () => IgniterCallerClientConfig
  onError?: (error: IgniterError) => void
}

interface UseMutateParams<TResponse, TVariables> {
  callerKey: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  buildRequest: IgniterCallerClientRequestFactory<TResponse>
  getMergedConfig: () => IgniterCallerClientConfig
  onError?: (error: IgniterError) => void
}

function mergeQueryInput(
  config: IgniterCallerClientConfig,
  options?: IgniterCallerClientRequestInput,
  variables?: IgniterCallerClientRequestInput,
): IgniterCallerClientRequestInput {
  const headers = {
    ...(config.headers || {}),
    ...(options?.headers || {}),
    ...(variables?.headers || {}),
  }
  const cookies = {
    ...(config.cookies || {}),
    ...(options?.cookies || {}),
    ...(variables?.cookies || {}),
  }
  const query = {
    ...(config.query || {}),
    ...(options?.query || {}),
    ...(variables?.query || {}),
    ...(options?.params || {}),
    ...(variables?.params || {}),
  }

  const cookieHeader = buildCookieHeader(cookies)
  if (cookieHeader && !headers.Cookie) {
    headers.Cookie = cookieHeader
  }

  return {
    headers,
    cookies,
    query,
    params: variables?.params || options?.params,
  }
}

function mergeMutateInput(
  config: IgniterCallerClientConfig,
  options?: IgniterCallerClientRequestInput,
  variables?: IgniterCallerClientRequestInput,
): IgniterCallerClientRequestInput {
  const merged = mergeQueryInput(config, options, variables)
  return {
    ...merged,
    body: variables?.body ?? options?.body,
  }
}

export function createUseQuery<
  TResponse,
  TVariables extends {
    params?: Record<string, string | number | boolean>
    query?: IgniterCallerClientQuery
  },
>(
  params: UseQueryParams<TResponse, TVariables>,
): (
  options?: IgniterCallerUseQueryOptions<TResponse, TVariables>,
) => IgniterCallerUseQueryResult<TResponse, TVariables> {
  const {
    callerKey,
    method,
    path,
    buildRequest,
    register,
    unregister,
    invalidate,
    getMergedConfig,
    onError,
  } = params

  return (options) => {
    const [status, setStatus] = useState<'loading' | 'error' | 'success'>(
      options?.initialData ? 'success' : 'loading',
    )
    const [isFetching, setIsFetching] = useState(false)
    const [response, setResponse] = useState<{
      data: TResponse | null
      error: IgniterError | null
    }>({
      data: options?.initialData ?? null,
      error: null,
    })
    const [variables, setVariables] = useState<TVariables | undefined>(
      undefined,
    )

    const optionsRef = useRef(options)
    optionsRef.current = options

    const lastVariablesRef = useRef<TVariables | undefined>(undefined)

    const stableKey = useMemo(() => {
      const mergedConfig = getMergedConfig()
      const mergedInput = mergeQueryInput(
        mergedConfig,
        options as IgniterCallerClientRequestInput | undefined,
        lastVariablesRef.current as IgniterCallerClientRequestInput | undefined,
      )

      return buildQueryKey({
        callerKey,
        method,
        path,
        query: mergedInput.query,
        params: mergedInput.params,
      })
    }, [
      callerKey,
      method,
      path,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(options?.params || {}),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(options?.query || {}),
    ])

    const execute = useCallback(
      async (nextVariables?: TVariables) => {
        if (optionsRef.current?.enabled === false) return

        const mergedConfig = getMergedConfig()
        const mergedInput = mergeQueryInput(
          mergedConfig,
          optionsRef.current as IgniterCallerClientRequestInput | undefined,
          nextVariables as IgniterCallerClientRequestInput | undefined,
        )

        const queryKey = buildQueryKey({
          callerKey,
          method,
          path,
          query: mergedInput.query,
          params: mergedInput.params,
        })

        lastVariablesRef.current = nextVariables
        setVariables(nextVariables)

        setIsFetching(true)
        setStatus('loading')
        optionsRef.current?.onLoading?.(true)
        mergedConfig.onQueryLoading?.(true)

        if (optionsRef.current?.staleTime) {
          const cached = IgniterCallerClientCache.get<TResponse>(
            queryKey,
            optionsRef.current.staleTime,
          )
          if (cached !== undefined) {
            setResponse({ data: cached, error: null })
            setStatus('success')
            optionsRef.current?.onSuccess?.(cached)
            mergedConfig.onQuerySuccess?.(cached)
            optionsRef.current?.onLoading?.(false)
            mergedConfig.onQueryLoading?.(false)
            setIsFetching(false)
            return {
              data: cached,
              error: undefined,
            }
          }
        }

        try {
          const result = await buildRequest(method, path, mergedInput).execute()
          optionsRef.current?.onRequest?.(result)
          if (result.error) {
            setResponse({ data: null, error: result.error })
            setStatus('error')
            optionsRef.current?.onError?.(result.error)
            mergedConfig.onQueryError?.(result.error)
            onError?.(result.error)
          } else {
            const data = (result.data ?? null) as TResponse | null
            setResponse({ data, error: null })
            setStatus('success')
            optionsRef.current?.onSuccess?.(data as TResponse)
            mergedConfig.onQuerySuccess?.(data)

            if (optionsRef.current?.staleTime && data !== null) {
              IgniterCallerClientCache.set(queryKey, data)
            }
          }

          optionsRef.current?.onSettled?.(
            result.data ?? null,
            result.error ?? null,
          )
          mergedConfig.onQuerySettled?.(
            result.data ?? null,
            result.error ?? null,
          )

          return result
        } catch (error) {
          const typedError = error as IgniterError
          setResponse({ data: null, error: typedError })
          setStatus('error')
          optionsRef.current?.onError?.(typedError)
          mergedConfig.onQueryError?.(typedError)
          onError?.(typedError)
          optionsRef.current?.onSettled?.(null, typedError)
          mergedConfig.onQuerySettled?.(null, typedError)
        } finally {
          setIsFetching(false)
          optionsRef.current?.onLoading?.(false)
          mergedConfig.onQueryLoading?.(false)
        }
      },
      [callerKey, method, path],
    )

    const refetch = useCallback(() => {
      void execute(lastVariablesRef.current)
    }, [execute])

    const invalidateQuery = useCallback(
      (data?: TResponse) => {
        const prefix = buildQueryPrefix({ callerKey, method, path })
        invalidate(prefix, data)
      },
      [callerKey, method, path, invalidate],
    )

    useEffect(() => {
      register(stableKey, refetch)
      return () => unregister(stableKey, refetch)
    }, [register, unregister, refetch, stableKey])

    const initialFetchDoneRef = useRef(false)

    useEffect(() => {
      if (optionsRef.current?.enabled === false) return
      if (optionsRef.current?.refetchOnMount === false && initialFetchDoneRef.current) return

      initialFetchDoneRef.current = true
      void execute(lastVariablesRef.current)
    }, [stableKey, execute])

    useEffect(() => {
      const interval = optionsRef.current?.refetchInterval
      if (!interval) return

      const handler = setInterval(() => {
        if (
          optionsRef.current?.refetchIntervalInBackground === false &&
          typeof document !== 'undefined' &&
          document.hidden
        ) {
          return
        }
        void execute(lastVariablesRef.current)
      }, interval)

      return () => clearInterval(handler)
    }, [execute])

    useEffect(() => {
      if (optionsRef.current?.refetchOnWindowFocus === false) return
      if (typeof window === 'undefined') return

      const handler = () => {
        void execute(lastVariablesRef.current)
      }
      window.addEventListener('focus', handler)
      return () => window.removeEventListener('focus', handler)
    }, [execute])

    return {
      data: response.data,
      error: response.error,
      variables,
      isLoading: status === 'loading',
      isFetching,
      isSuccess: status === 'success',
      isError: status === 'error',
      status,
      refetch,
      invalidate: invalidateQuery,
      execute,
    }
  }
}

export function createUseMutate<
  TResponse,
  TVariables extends {
    params?: Record<string, string | number | boolean>
    query?: IgniterCallerClientQuery
    body?: unknown
  },
>(
  params: UseMutateParams<TResponse, TVariables>,
): (
  options?: IgniterCallerUseMutateOptions<TResponse, TVariables>,
) => IgniterCallerUseMutateResult<TResponse, TVariables> {
  const {
    callerKey,
    method,
    path,
    buildRequest,
    getMergedConfig,
    onError,
  } = params

  return (options) => {
    const [status, setStatus] = useState<'loading' | 'error' | 'success'>(
      'success',
    )
    const [response, setResponse] = useState<{
      data: TResponse | null
      error: IgniterError | null
    }>({ data: null, error: null })
    const [variables, setVariables] = useState<TVariables | undefined>(
      undefined,
    )

    const optionsRef = useRef(options)
    optionsRef.current = options
    const lastVariablesRef = useRef<TVariables | undefined>(undefined)

    const mutate = useCallback(
      async (nextVariables?: TVariables) => {
        const mergedConfig = getMergedConfig()
        const mergedInput = mergeMutateInput(
          mergedConfig,
          optionsRef.current as IgniterCallerClientRequestInput | undefined,
          nextVariables as IgniterCallerClientRequestInput | undefined,
        )

        lastVariablesRef.current = nextVariables
        setVariables(nextVariables)

        setStatus('loading')
        optionsRef.current?.onLoading?.(true)
        mergedConfig.onMutationLoading?.(true)

        try {
          const result = await buildRequest(method, path, mergedInput).execute()
          optionsRef.current?.onRequest?.(result)
          if (result.error) {
            setResponse({ data: null, error: result.error })
            setStatus('error')
            optionsRef.current?.onError?.(result.error)
            mergedConfig.onMutationError?.(result.error)
            onError?.(result.error)
          } else {
            const data = (result.data ?? null) as TResponse | null
            setResponse({ data, error: null })
            setStatus('success')
            optionsRef.current?.onSuccess?.(data as TResponse)
            mergedConfig.onMutationSuccess?.(data)
          }

          optionsRef.current?.onSettled?.(
            result.data ?? null,
            result.error ?? null,
          )
          mergedConfig.onMutationSettled?.(
            result.data ?? null,
            result.error ?? null,
          )

          return result
        } catch (error) {
          const typedError = error as IgniterError
          setResponse({ data: null, error: typedError })
          setStatus('error')
          optionsRef.current?.onError?.(typedError)
          mergedConfig.onMutationError?.(typedError)
          onError?.(typedError)
          optionsRef.current?.onSettled?.(null, typedError)
          mergedConfig.onMutationSettled?.(null, typedError)
        } finally {
          optionsRef.current?.onLoading?.(false)
          mergedConfig.onMutationLoading?.(false)
        }
      },
      [method, path, buildRequest, getMergedConfig, onError],
    )

    const retry = useCallback(() => {
      void mutate(lastVariablesRef.current)
    }, [mutate])

    return {
      data: response.data,
      error: response.error,
      variables,
      isLoading: status === 'loading',
      isSuccess: status === 'success',
      isError: status === 'error',
      status,
      mutate,
      retry,
    }
  }
}
