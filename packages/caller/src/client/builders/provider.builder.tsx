'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import type { IgniterError } from '@igniter-js/common'
import type {
  IgniterCallerClientContextValue,
  IgniterCallerClientConfigs,
  IgniterCallerClientMap,
  IgniterCallerClientRefetchFn,
} from '../interfaces/context'
import type {
  IgniterCallerClientConfig,
  IgniterCallerClientConfigKey,
  IgniterCallerClientConfigValue,
} from '../interfaces/config'
import { IgniterCallerClientCache } from '../utils/cache'
import { createIgniterCallerClient } from './client.builder'
import type { IgniterCallerClient } from '../interfaces/client'

const IgniterCallerClientContext = createContext<
  IgniterCallerClientContextValue<any> | undefined
>(undefined)

export interface IgniterCallerProviderProps<
  TCallers extends IgniterCallerClientMap,
> extends PropsWithChildren {
  callers: TCallers
  configs?: IgniterCallerClientConfigs<TCallers>
  hooks?: IgniterCallerClientConfig
  onError?: (error: IgniterError) => void
}

function mergeConfig(
  globalConfig: IgniterCallerClientConfig,
  localConfig?: IgniterCallerClientConfig,
): IgniterCallerClientConfig {
  return {
    ...globalConfig,
    ...localConfig,
    headers: {
      ...(globalConfig.headers || {}),
      ...(localConfig?.headers || {}),
    },
    cookies: {
      ...(globalConfig.cookies || {}),
      ...(localConfig?.cookies || {}),
    },
    query: {
      ...(globalConfig.query || {}),
      ...(localConfig?.query || {}),
    },
  }
}

export function IgniterCallerProvider<
  TCallers extends IgniterCallerClientMap,
>(props: IgniterCallerProviderProps<TCallers>) {
  const { callers, configs, hooks, onError, children } = props
  const [configState, setConfigState] = useState<
    IgniterCallerClientConfigs<TCallers>
  >(configs || {})
  const [listeners] = useState(
    () => new Map<string, Set<IgniterCallerClientRefetchFn>>(),
  )

  const globalConfig = useMemo<IgniterCallerClientConfig>(
    () => hooks || {},
    [hooks],
  )

  const register = useCallback(
    (key: string, refetch: IgniterCallerClientRefetchFn) => {
      const current = listeners.get(key) || new Set()
      current.add(refetch)
      listeners.set(key, current)
    },
    [listeners],
  )

  const unregister = useCallback(
    (key: string, refetch: IgniterCallerClientRefetchFn) => {
      const current = listeners.get(key)
      if (!current) return
      current.delete(refetch)
      if (current.size === 0) {
        listeners.delete(key)
      }
    },
    [listeners],
  )

  const invalidate = useCallback(
    (keys: string | string[], data?: unknown) => {
      const keysArray = Array.isArray(keys) ? keys : [keys]

      keysArray.forEach((prefix) => {
        if (data !== undefined) {
          IgniterCallerClientCache.replacePrefix(prefix, data)
        } else {
          IgniterCallerClientCache.clearPrefix(prefix)
        }

        listeners.forEach((refetchFns, registeredKey) => {
          if (registeredKey.startsWith(prefix)) {
            refetchFns.forEach((refetch) => refetch(true))
          }
        })
      })
    },
    [listeners],
  )

  const setConfig = useCallback(
    <TKey extends IgniterCallerClientConfigKey>(
      callerKey: keyof TCallers,
      key: TKey,
      value: IgniterCallerClientConfigValue<TKey>,
    ) => {
      setConfigState((prev) => ({
        ...prev,
        [callerKey]: {
          ...(prev[callerKey] || {}),
          [key]: value,
        },
      }))
    },
    [],
  )

  const setConfigBatch = useCallback(
    (callerKey: keyof TCallers, config: Partial<IgniterCallerClientConfig>) => {
      setConfigState((prev) => ({
        ...prev,
        [callerKey]: {
          ...(prev[callerKey] || {}),
          ...config,
        },
      }))
    },
    [],
  )

  const configStateRef = useMemo(() => ({ current: configState }), [])
  configStateRef.current = configState

  const globalConfigRef = useMemo(() => ({ current: globalConfig }), [])
  globalConfigRef.current = globalConfig

  const getMergedConfig = useCallback(
    (callerKey: keyof TCallers) =>
      mergeConfig(globalConfigRef.current, configStateRef.current[callerKey]),
    [globalConfigRef, configStateRef],
  )

  const getConfig = useCallback(
    <TKey extends IgniterCallerClientConfigKey>(
      callerKey: keyof TCallers,
      key: TKey,
    ) => getMergedConfig(callerKey)[key],
    [getMergedConfig],
  )

  const value = useMemo<IgniterCallerClientContextValue<TCallers>>(
    () => ({
      callers,
      configs: configState,
      globalConfig,
      setConfig,
      setConfigBatch,
      getConfig,
      getMergedConfig,
      register,
      unregister,
      invalidate,
      listeners,
      onError,
    }),
    [
      callers,
      getConfig,
      getMergedConfig,
      invalidate,
      listeners,
      onError,
      register,
      setConfig,
      setConfigBatch,
      unregister,
    ],
  )

  return (
    <IgniterCallerClientContext.Provider value={value}>
      {children}
    </IgniterCallerClientContext.Provider>
  )
}

export function useIgniterCallerContext<
  TCallers extends IgniterCallerClientMap,
>() {
  const context = useContext(
    IgniterCallerClientContext,
  ) as IgniterCallerClientContextValue<TCallers> | undefined

  if (!context) {
    throw new Error(
      'IgniterCallerProvider is missing. Wrap your app with <IgniterCallerProvider>.',
    )
  }

  return context
}

export function useIgniterCaller<TCallers extends IgniterCallerClientMap>() {
  const context = useIgniterCallerContext<TCallers>()

  return <TKey extends keyof TCallers>(
    callerKey: TKey,
  ): IgniterCallerClient<TCallers[TKey]> =>
    createIgniterCallerClient<TCallers[TKey], TCallers>(context, callerKey)
}
