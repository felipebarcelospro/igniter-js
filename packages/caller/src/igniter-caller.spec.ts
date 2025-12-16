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

  // New tests for the updated API

  it('accepts URL directly in HTTP method: get(url)', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ id: '1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    globalThis.fetch = fetchMock as any

    const api = IgniterCaller.create().withBaseUrl('https://api.test').build()

    const result = await api.get('/users').execute()
    expect(result.error).toBeUndefined()
    expect(result.data).toEqual({ id: '1' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    
    // @ts-expect-error - Verify URL was correctly built
    const calledUrl = fetchMock.mock.calls[0][0]
    expect(calledUrl).toBe('https://api.test/users')
  })

  it('works with post(url).body(data)', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ id: '1', name: 'Created' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    })

    globalThis.fetch = fetchMock as any

    const api = IgniterCaller.create().withBaseUrl('https://api.test').build()

    const result = await api.post('/users').body({ name: 'John' }).execute()
    expect(result.error).toBeUndefined()
    expect(result.data).toEqual({ id: '1', name: 'Created' })
  })

  it('converts body to query params for GET requests', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    globalThis.fetch = fetchMock as any

    const api = IgniterCaller.create().withBaseUrl('https://api.test').build()

    await api.get('/search').body({ q: 'test', page: 1 }).execute()

    // @ts-expect-error - Verify URL was correctly built with query params
    const calledUrl = fetchMock.mock.calls[0][0]
    expect(calledUrl).toContain('q=test')
    expect(calledUrl).toContain('page=1')
  })

  it('request() method executes directly with all options (axios-style)', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    globalThis.fetch = fetchMock as any

    const api = IgniterCaller.create().withBaseUrl('https://api.test').build()

    const result = await api.request({
      method: 'POST',
      url: '/action',
      body: { data: 'test' },
      headers: { 'X-Custom': 'value' },
      timeout: 5000,
    })

    expect(result.error).toBeUndefined()
    expect(result.data).toEqual({ success: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('auto-detects blob content type', async () => {
    const blobData = new Blob(['test'], { type: 'application/octet-stream' })
    
    const fetchMock = vi.fn(async () => {
      return new Response(blobData, {
        status: 200,
        headers: { 'content-type': 'application/octet-stream' },
      })
    })

    globalThis.fetch = fetchMock as any

    const api = IgniterCaller.create().withBaseUrl('https://api.test').build()

    const result = await api.get('/file').responseType<Blob>().execute()
    
    expect(result.error).toBeUndefined()
    expect(result.data).toBeInstanceOf(Blob)
  })

  it('auto-detects text/html content type', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response('<html><body>Hello</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })
    })

    globalThis.fetch = fetchMock as any

    const api = IgniterCaller.create().withBaseUrl('https://api.test').build()

    const result = await api.get('/page').execute()
    
    expect(result.error).toBeUndefined()
    expect(result.data).toBe('<html><body>Hello</body></html>')
  })

  it('includes status and headers in response', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ id: '1' }), {
        status: 200,
        headers: { 
          'content-type': 'application/json',
          'x-request-id': '123',
        },
      })
    })

    globalThis.fetch = fetchMock as any

    const api = IgniterCaller.create().withBaseUrl('https://api.test').build()

    const result = await api.get('/users').execute()
    
    expect(result.status).toBe(200)
    expect(result.headers).toBeDefined()
    expect(result.headers?.get('x-request-id')).toBe('123')
  })
})
