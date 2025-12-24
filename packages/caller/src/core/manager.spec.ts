import { afterEach, describe, expect, it, vi } from 'vitest'
import { IgniterCallerManager } from './manager'
import { IgniterCallerError } from '../errors/caller.error'
import { IgniterCallerTelemetryEvents } from '../telemetry/index'

describe('IgniterCaller', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    IgniterCallerManager.off('/users')
    IgniterCallerManager.off('/health')
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
    const unsubscribe = IgniterCallerManager.on('/users', (result, ctx) => {
      events.push({ url: ctx.url, method: ctx.method, ok: !result.error })
    })

    const api = new IgniterCallerManager('https://api.test')

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

    const api = new IgniterCallerManager(baseURL, {
      schemas: schemas as any,
      schemaValidation: { mode: 'strict' },
    })

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

    const api = new IgniterCallerManager(baseURL, {
      schemas: schemas as any,
      schemaValidation: { mode: 'strict' },
    })

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

    const api = new IgniterCallerManager('https://api.test')

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

    const api = new IgniterCallerManager('https://api.test')

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

    const api = new IgniterCallerManager('https://api.test')

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

    const api = new IgniterCallerManager('https://api.test')

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

    const api = new IgniterCallerManager('https://api.test')

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

    const api = new IgniterCallerManager('https://api.test')

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

    const api = new IgniterCallerManager('https://api.test')

    const result = await api.get('/users').execute()
    
    expect(result.status).toBe(200)
    expect(result.headers).toBeDefined()
    expect(result.headers?.get('x-request-id')).toBe('123')
  })

  describe('telemetry', () => {
    const createTelemetryCaller = () => {
      const telemetry = { emit: vi.fn() }
      const api = new IgniterCallerManager('https://api.test', {
        telemetry: telemetry as any,
      })

      return { telemetry, api }
    }

    const findEmitPayload = (
      telemetry: { emit: ReturnType<typeof vi.fn> },
      event: string,
      position: 'first' | 'last' = 'last',
    ) => {
      const calls = telemetry.emit.mock.calls.filter(([key]) => key === event)
      expect(calls.length).toBeGreaterThan(0)
      const call = position === 'first' ? calls[0] : calls[calls.length - 1]
      return call?.[1] as { level: string; attributes: Record<string, unknown> }
    }

    describe('telemetry.request', () => {
      it('emits request.execute.started', async () => {
        const { telemetry, api } = createTelemetryCaller()
        const fetchMock = vi.fn(async () => {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        })
        globalThis.fetch = fetchMock as any

        await api.get('/health').execute()

        const payload = findEmitPayload(
          telemetry,
          IgniterCallerTelemetryEvents.get.key('request.execute.started'),
          'first',
        )
        expect(payload).toMatchObject({
          level: 'debug',
          attributes: {
            'ctx.request.method': 'GET',
            'ctx.request.url': 'https://api.test/health',
            'ctx.request.baseUrl': 'https://api.test',
          },
        })
      })

      it('emits request.execute.success', async () => {
        const { telemetry, api } = createTelemetryCaller()
        const fetchMock = vi.fn(async () => {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        })
        globalThis.fetch = fetchMock as any

        await api.get('/health').execute()

        const payload = findEmitPayload(
          telemetry,
          IgniterCallerTelemetryEvents.get.key('request.execute.success'),
        )
        expect(payload.level).toBe('info')
        expect(payload.attributes).toMatchObject({
          'ctx.request.method': 'GET',
          'ctx.request.url': 'https://api.test/health',
          'ctx.response.status': 200,
          'ctx.cache.hit': false,
        })
        expect(payload.attributes['ctx.request.durationMs']).toEqual(expect.any(Number))
      })

      it('emits request.execute.error', async () => {
        const { telemetry, api } = createTelemetryCaller()
        const fetchMock = vi.fn(async () => {
          return new Response('fail', {
            status: 500,
            headers: { 'content-type': 'text/plain' },
          })
        })
        globalThis.fetch = fetchMock as any

        const result = await api.get('/boom').execute()
        expect(result.error).toBeInstanceOf(IgniterCallerError)

        const payload = findEmitPayload(
          telemetry,
          IgniterCallerTelemetryEvents.get.key('request.execute.error'),
        )
        expect(payload.level).toBe('error')
        expect(payload.attributes).toMatchObject({
          'ctx.request.method': 'GET',
          'ctx.request.url': 'https://api.test/boom',
          'ctx.error.code': 'IGNITER_CALLER_HTTP_ERROR',
          'ctx.response.status': 500,
        })
      })

      it('emits request.timeout.error', async () => {
        const { telemetry, api } = createTelemetryCaller()
        vi.useFakeTimers()

        const fetchMock = vi.fn((_: string, init?: RequestInit) => {
          return new Promise((_, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const err = new Error('Aborted')
              ;(err as any).name = 'AbortError'
              reject(err)
            })
          })
        })

        globalThis.fetch = fetchMock as any

        const promise = api.get('/slow').timeout(1).execute()
        await vi.advanceTimersByTimeAsync(1)
        const result = await promise
        vi.useRealTimers()

        expect(result.error).toBeInstanceOf(IgniterCallerError)

        const payload = findEmitPayload(
          telemetry,
          IgniterCallerTelemetryEvents.get.key('request.timeout.error'),
        )
        expect(payload.level).toBe('error')
        expect(payload.attributes).toMatchObject({
          'ctx.request.method': 'GET',
          'ctx.request.url': 'https://api.test/slow',
          'ctx.request.timeoutMs': 1,
        })
      })
    })

    describe('telemetry.cache', () => {
      it('emits cache.read.hit', async () => {
        const { telemetry, api } = createTelemetryCaller()
        const fetchMock = vi.fn(async () => {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        })
        globalThis.fetch = fetchMock as any

        await api.get('/cached').stale(10_000).execute()
        await api.get('/cached').stale(10_000).execute()

        const payload = findEmitPayload(
          telemetry,
          IgniterCallerTelemetryEvents.get.key('cache.read.hit'),
        )
        expect(payload.level).toBe('debug')
        expect(payload.attributes).toMatchObject({
          'ctx.request.method': 'GET',
          'ctx.request.url': 'https://api.test/cached',
          'ctx.cache.key': '/cached',
          'ctx.cache.staleTime': 10_000,
        })
      })
    })

    describe('telemetry.retry', () => {
      it('emits retry.attempt.started', async () => {
        const { telemetry, api } = createTelemetryCaller()
        vi.useFakeTimers()

        const fetchMock = vi
          .fn()
          .mockResolvedValueOnce(
            new Response('fail', {
              status: 500,
              headers: { 'content-type': 'text/plain' },
            }),
          )
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
          )

        globalThis.fetch = fetchMock as any

        const promise = api
          .get('/retry')
          .retry(2, { baseDelay: 0, retryOnStatus: [500] })
          .execute()

        await vi.runAllTimersAsync()
        const result = await promise
        vi.useRealTimers()

        expect(result.error).toBeUndefined()
        expect(fetchMock).toHaveBeenCalledTimes(2)

        const payload = findEmitPayload(
          telemetry,
          IgniterCallerTelemetryEvents.get.key('retry.attempt.started'),
        )
        expect(payload.level).toBe('debug')
        expect(payload.attributes).toMatchObject({
          'ctx.request.method': 'GET',
          'ctx.request.url': 'https://api.test/retry',
          'ctx.retry.attempt': 2,
          'ctx.retry.maxAttempts': 2,
          'ctx.retry.delayMs': 0,
        })
      })
    })

    describe('telemetry.validation', () => {
      it('emits validation.request.error', async () => {
        const telemetry = { emit: vi.fn() }
        const fetchMock = vi.fn()
        globalThis.fetch = fetchMock as any

        const failingSchema = {
          '~standard': {
            validate: async () => ({ issues: [{ message: 'invalid' }] }),
          },
        } as any

        const schemas = {
          'https://api.test/users': {
            POST: {
              request: failingSchema,
              responses: {
                200: failingSchema,
              },
            },
          },
        } as const

        const api = new IgniterCallerManager('https://api.test', {
          telemetry: telemetry as any,
          schemas: schemas as any,
          schemaValidation: { mode: 'strict' },
        })

        const result = await api.post().url('/users').body({}).execute()
        expect(result.error).toBeInstanceOf(IgniterCallerError)

        const payload = findEmitPayload(
          telemetry,
          IgniterCallerTelemetryEvents.get.key('validation.request.error'),
        )
        expect(payload.level).toBe('error')
        expect(payload.attributes).toMatchObject({
          'ctx.request.method': 'POST',
          'ctx.request.url': 'https://api.test/users',
          'ctx.validation.type': 'request',
        })
      })

      it('emits validation.response.error', async () => {
        const telemetry = { emit: vi.fn() }
        const fetchMock = vi.fn(async () => {
          return new Response(JSON.stringify({ id: '1' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        })
        globalThis.fetch = fetchMock as any

        const failingSchema = {
          '~standard': {
            validate: async () => ({ issues: [{ message: 'invalid' }] }),
          },
        } as any

        const schemas = {
          'https://api.test/profile': {
            GET: {
              responses: {
                200: failingSchema,
              },
            },
          },
        } as const

        const api = new IgniterCallerManager('https://api.test', {
          telemetry: telemetry as any,
          schemas: schemas as any,
          schemaValidation: { mode: 'strict' },
        })

        const result = await api.get().url('/profile').execute()
        expect(result.error).toBeInstanceOf(IgniterCallerError)

        const payload = findEmitPayload(
          telemetry,
          IgniterCallerTelemetryEvents.get.key('validation.response.error'),
        )
        expect(payload.level).toBe('error')
        expect(payload.attributes).toMatchObject({
          'ctx.request.method': 'GET',
          'ctx.request.url': 'https://api.test/profile',
          'ctx.validation.type': 'response',
          'ctx.response.status': 200,
        })
      })
    })
  })
})
