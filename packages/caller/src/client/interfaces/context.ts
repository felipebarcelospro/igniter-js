import type { IgniterError } from '@igniter-js/common'
import type { IgniterCallerManager } from '../../core/manager'
import type {
  IgniterCallerClientConfig,
  IgniterCallerClientConfigKey,
  IgniterCallerClientConfigValue,
} from './config'

export type IgniterCallerClientMap = Record<string, IgniterCallerManager<any>>

export type IgniterCallerClientConfigs<TCallers extends IgniterCallerClientMap> =
  Partial<Record<keyof TCallers, IgniterCallerClientConfig>>

export type IgniterCallerClientRefetchFn = (invalidate?: boolean) => void

export type IgniterCallerClientListeners = Map<
  string,
  Set<IgniterCallerClientRefetchFn>
>

export interface IgniterCallerClientContextValue<
  TCallers extends IgniterCallerClientMap,
> {
  callers: TCallers
  configs: IgniterCallerClientConfigs<TCallers>
  globalConfig: IgniterCallerClientConfig
  onError?: (error: IgniterError) => void
  setConfig: <TKey extends IgniterCallerClientConfigKey>(
    callerKey: keyof TCallers,
    key: TKey,
    value: IgniterCallerClientConfigValue<TKey>,
  ) => void
  setConfigBatch: (
    callerKey: keyof TCallers,
    config: Partial<IgniterCallerClientConfig>,
  ) => void
  getConfig: <TKey extends IgniterCallerClientConfigKey>(
    callerKey: keyof TCallers,
    key: TKey,
  ) => IgniterCallerClientConfigValue<TKey> | undefined
  getMergedConfig: (callerKey: keyof TCallers) => IgniterCallerClientConfig
  register: (key: string, refetch: IgniterCallerClientRefetchFn) => void
  unregister: (key: string, refetch: IgniterCallerClientRefetchFn) => void
  invalidate: (
    keys: string | string[],
    data?: unknown,
  ) => void
  listeners: IgniterCallerClientListeners
}
