/*
  Internal utilities to map BetterAuth's runtime API surface into Igniter plugin controller actions.
  This file intentionally avoids importing internal core types to keep the public API stable.
*/

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

const HTTP_METHOD_KEYS = ['get', 'post', 'put', 'patch', 'delete'] as const
type HttpMethodKey = typeof HTTP_METHOD_KEYS[number]

export type MappedAction = {
  path: `/${string}`
  method: HttpMethod
  // Optional: future zod schemas: body?: StandardSchemaV1; query?: StandardSchemaV1
  handler: (args: {
    request: {
      method: HttpMethod
      path: string
      params: Record<string, unknown>
      headers: Headers
      cookies: Record<string, unknown>
      body: unknown
      query: unknown
    }
    context: unknown
    // self and response are available on runtime, but not required here
    self: any
    response: any
  }) => Promise<unknown> | unknown
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function hasHttpMethodShape(obj: unknown): obj is Record<HttpMethodKey, unknown> {
  if (!isPlainObject(obj)) return false
  return HTTP_METHOD_KEYS.some((k) => typeof obj[k] === 'function')
}

function toActionPath(segments: string[]): `/${string}` {
  const normalized = segments
    .filter(Boolean)
    .map((s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '-'))
    .join('/')
  return (`/${normalized}`) as `/${string}`
}

function mergeInput(params: any, query: any, body: any): any {
  const base = {}
  if (params && typeof params === 'object') Object.assign(base, params)
  if (query && typeof query === 'object') Object.assign(base, query)
  if (body && typeof body === 'object') Object.assign(base, body)
  return base
}

export function mapApiToActions(api: unknown, baseSegments: string[] = []): Record<string, MappedAction> {
  const actions: Record<string, MappedAction> = {}

  if (!isPlainObject(api)) return actions

  const visit = (node: unknown, path: string[]) => {
    if (typeof node === 'function') {
      const actionKey = path.join('.')
      const actionPath = toActionPath(path)
      const fn = node as (input?: unknown) => Promise<unknown> | unknown
      actions[actionKey] = {
        path: actionPath,
        method: 'POST',
        handler: async ({ request }) => {
          const input = mergeInput(request.params, request.query, request.body)
          return await fn(input)
        }
      }
      return
    }

    if (hasHttpMethodShape(node)) {
      const group = node as Record<HttpMethodKey, unknown>
      for (const key of HTTP_METHOD_KEYS) {
        const maybeFn = group[key]
        if (typeof maybeFn !== 'function') continue
        const httpMethod = key.toUpperCase() as HttpMethod
        const actionKey = [...path, key].join('.')
        const actionPath = toActionPath(path)
        const fn = maybeFn as (input?: unknown) => Promise<unknown> | unknown
        actions[actionKey] = {
          path: actionPath,
          method: httpMethod,
          handler: async ({ request }) => {
            const input = mergeInput(request.params, request.query, request.body)
            return await fn(input)
          }
        }
      }
      return
    }

    if (isPlainObject(node)) {
      for (const [k, v] of Object.entries(node)) {
        visit(v, [...path, k])
      }
    }
  }

  for (const [k, v] of Object.entries(api)) {
    visit(v, [...baseSegments, k])
  }

  return actions
}

