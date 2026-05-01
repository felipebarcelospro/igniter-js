import type { IgniterError } from '@igniter-js/common'

export type IgniterCallerClientHeaders = Record<string, string>
export type IgniterCallerClientCookies = Record<string, string>
export type IgniterCallerClientQuery = Record<string, string | number | boolean>

export interface IgniterCallerClientConfig {
  headers?: IgniterCallerClientHeaders
  cookies?: IgniterCallerClientCookies
  query?: IgniterCallerClientQuery
  onQueryLoading?: (isLoading: boolean) => void
  onQuerySuccess?: (data: unknown) => void
  onQueryError?: (error: IgniterError) => void
  onQuerySettled?: (data: unknown | null, error?: IgniterError | null) => void
  onMutationLoading?: (isLoading: boolean) => void
  onMutationSuccess?: (data: unknown) => void
  onMutationError?: (error: IgniterError) => void
  onMutationSettled?: (data: unknown | null, error?: IgniterError | null) => void
}

export type IgniterCallerClientConfigKey = keyof IgniterCallerClientConfig
export type IgniterCallerClientConfigValue<
  TKey extends IgniterCallerClientConfigKey,
> = IgniterCallerClientConfig[TKey]
