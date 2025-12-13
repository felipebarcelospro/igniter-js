import { afterEach, describe, expect, it, vi } from 'vitest'
import { IgniterCaller, IgniterCallerError } from '.'

describe('IgniterCaller', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    IgniterCaller.off('/users')
    IgniterCaller.off('/health')
  })

  it('caches responses and emits events (including cache hits)', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify([{ id: '1', name: 'Ada' }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    globalThis.fetch = fetchMock as any

    const events: Array<{ url: string; method: string; ok: boolean }> = []
    const unsubscribe = IgniterCaller.on('/users', (result, ctx) => {
      events.push({ url: ctx.url, method: ctx.method, ok: !result.error })
    })

    const api = IgniterCaller.create().withBaseUrl('https://api.test').build()

    const first = await api.get().url('/users').stale(10_000).execute()
    expect(first.error).toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const second = await api.get().url('/users').stale(10_000).execute()
    expect(second.error).toBeUndefined()

    // Second call should be served from cache
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Events are emitted for both network and cache-hit responses
    expect(events).toHaveLength(2)

    unsubscribe()
  })

  it('blocks the request when request schema validation fails (strict mode)', async () => {
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock as any

    const baseURL = 'https://api.test'

    const failingSchema = {
      '~standard': {
        validate: async () => ({ issues: [{ message: 'invalid' }] }),
      },
    } as any

    const schemas = {
      [`${baseURL}/users`]: {
        POST: {
          request: failingSchema,
          responses: {
            200: failingSchema,
          },
        },
      },
    } as const

    const api = IgniterCaller.create()
      .withBaseUrl(baseURL)
      .withSchemas(schemas as any, { mode: 'strict' })
      .build()

    const result = await api.post().url('/users').body({}).execute()

    expect(fetchMock).toHaveBeenCalledTimes(0)
    expect(result.data).toBeUndefined()
    expect(result.error).toBeInstanceOf(IgniterCallerError)
    expect((result.error as IgniterCallerError).code).toBe(
      'IGNITER_CALLER_REQUEST_VALIDATION_FAILED',
    )
  })

  it('returns an error when response schema validation fails (strict mode)', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ id: '1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    globalThis.fetch = fetchMock as any

    const baseURL = 'https://api.test'

    const failingSchema = {
      '~standard': {
        validate: async () => ({ issues: [{ message: 'invalid' }] }),
      },
    } as any

    const schemas = {
      [`${baseURL}/health`]: {
        GET: {
          responses: {
            200: failingSchema,
          },
        },
      },
    } as const

    const api = IgniterCaller.create()
      .withBaseUrl(baseURL)
      .withSchemas(schemas as any, { mode: 'strict' })
      .build()

    const result = await api.get().url('/health').execute()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.data).toBeUndefined()
    expect(result.error).toBeInstanceOf(IgniterCallerError)
    expect((result.error as IgniterCallerError).code).toBe(
      'IGNITER_CALLER_RESPONSE_VALIDATION_FAILED',
    )
  })
})
