import type { IgniterCallerManager } from '../../core/manager'
import type { IgniterCallerClientContextValue } from '../interfaces/context'
import type { IgniterCallerClientRequestInput } from './hooks.builder'
import {
  createUseMutate,
  createUseQuery,
} from './hooks.builder'
import type {
  IgniterCallerClient,
  IgniterCallerClientConfigApi,
} from '../interfaces/client'
import { buildQueryPrefix } from '../utils/query-key'

function applyRequestInput(
  builder: { params: (params: Record<string, string | number | boolean>) => any; headers: (headers: Record<string, string>) => any; body: (body: unknown) => any },
  input: IgniterCallerClientRequestInput,
) {
  if (input.query && Object.keys(input.query).length > 0) {
    builder.params(input.query)
  }

  if (input.headers && Object.keys(input.headers).length > 0) {
    builder.headers(input.headers)
  }

  if (input.body !== undefined) {
    builder.body(input.body)
  }
}

export function createIgniterCallerClient<
  TCaller extends IgniterCallerManager<any>,
  TCallers extends Record<string, IgniterCallerManager<any>>,
>(
  context: IgniterCallerClientContextValue<TCallers>,
  callerKey: keyof TCallers,
): IgniterCallerClient<TCaller> {
  const caller = context.callers[callerKey] as unknown as TCaller

  const getMergedConfig = () => context.getMergedConfig(callerKey)

  const buildRequest = (
    method: string,
    path: string,
    input: IgniterCallerClientRequestInput,
  ) => {
    if (!path) {
      throw new Error(
        'IgniterCallerClient: path is required when using hooks with Caller client.',
      )
    }

    const methodKey = method.toLowerCase() as
      | 'get'
      | 'post'
      | 'put'
      | 'patch'
      | 'delete'
      | 'head'

    const builder = (caller as any)[methodKey](path)
    applyRequestInput(builder, input)
    return builder as { execute: () => Promise<any> }
  }

  const invalidate = (pathOrPaths: string | string[], data?: unknown) => {
    const paths = Array.isArray(pathOrPaths) ? pathOrPaths : [pathOrPaths]
    const prefixes = paths.map((path) =>
      buildQueryPrefix({
        callerKey: String(callerKey),
        method: 'GET',
        path,
      }),
    )
    context.invalidate(prefixes, data)
  }

  const config: IgniterCallerClientConfigApi = {
    set: (key, value) => context.setConfig(callerKey, key, value),
    get: (key) => context.getConfig(callerKey, key),
    reset: () => context.setConfigBatch(callerKey, {}),
  }

  const get = (path?: string) => {
    const builder = caller.get(path as any)
    const useQuery = createUseQuery({
      callerKey: String(callerKey),
      method: 'GET',
      path: path || '',
      buildRequest,
      register: context.register,
      unregister: context.unregister,
      invalidate: context.invalidate,
      getMergedConfig,
      onError: context.onError,
    })
    ;(builder as any).useQuery = useQuery
    return builder as any
  }

  const head = (path?: string) => {
    const builder = caller.head(path as any)
    const useQuery = createUseQuery({
      callerKey: String(callerKey),
      method: 'HEAD',
      path: path || '',
      buildRequest,
      register: context.register,
      unregister: context.unregister,
      invalidate: context.invalidate,
      getMergedConfig,
      onError: context.onError,
    })
    ;(builder as any).useQuery = useQuery
    return builder as any
  }

  const post = (path?: string) => {
    const builder = caller.post(path as any)
    const useMutate = createUseMutate({
      callerKey: String(callerKey),
      method: 'POST',
      path: path || '',
      buildRequest,
      getMergedConfig,
      onError: context.onError,
    })
    ;(builder as any).useMutate = useMutate
    return builder as any
  }

  const put = (path?: string) => {
    const builder = caller.put(path as any)
    const useMutate = createUseMutate({
      callerKey: String(callerKey),
      method: 'PUT',
      path: path || '',
      buildRequest,
      getMergedConfig,
      onError: context.onError,
    })
    ;(builder as any).useMutate = useMutate
    return builder as any
  }

  const patch = (path?: string) => {
    const builder = caller.patch(path as any)
    const useMutate = createUseMutate({
      callerKey: String(callerKey),
      method: 'PATCH',
      path: path || '',
      buildRequest,
      getMergedConfig,
      onError: context.onError,
    })
    ;(builder as any).useMutate = useMutate
    return builder as any
  }

  const del = (path?: string) => {
    const builder = caller.delete(path as any)
    const useMutate = createUseMutate({
      callerKey: String(callerKey),
      method: 'DELETE',
      path: path || '',
      buildRequest,
      getMergedConfig,
      onError: context.onError,
    })
    ;(builder as any).useMutate = useMutate
    return builder as any
  }

  return {
    raw: caller,
    config,
    invalidate: invalidate as any,
    get: get as any,
    post: post as any,
    put: put as any,
    patch: patch as any,
    delete: del as any,
    head: head as any,
  }
}
