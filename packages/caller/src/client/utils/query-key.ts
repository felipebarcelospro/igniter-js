import type { IgniterCallerClientQuery } from '../interfaces/config'

const EMPTY_KEY = '{}'

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return EMPTY_KEY
  if (typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([a], [b]) => a.localeCompare(b),
  )

  return `{${entries
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
    .join(',')}}`
}

export function buildQueryKey(params: {
  callerKey: string
  method: string
  path: string
  query?: IgniterCallerClientQuery
  params?: Record<string, string | number | boolean>
}): string {
  const { callerKey, method, path, query, params: pathParams } = params
  const payload = {
    params: pathParams || {},
    query: query || {},
  }

  return `${callerKey}::${method.toUpperCase()}::${path}::${stableStringify(payload)}`
}

export function buildQueryPrefix(params: {
  callerKey: string
  method: string
  path: string
}): string {
  const { callerKey, method, path } = params
  return `${callerKey}::${method.toUpperCase()}::${path}`
}
