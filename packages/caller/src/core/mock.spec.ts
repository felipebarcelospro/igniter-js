import { describe, it, expect, expectTypeOf } from 'vitest'
import { z } from 'zod'
import { IgniterCaller } from '../builders/main.builder'
import { IgniterCallerMock } from '../builders/mock.builder'

const schemas = {
  '/me': {
    GET: {
      responses: {
        200: z.object({ id: z.string() }),
      },
    },
  },
}

describe('IgniterCallerMock', () => {
  it('routes requests to mock when enabled', async () => {
    let capturedMethod: string | undefined

    const mock = IgniterCallerMock.create()
      .withSchemas(schemas)
      .mock('/me', {
        GET: (request) => {
          capturedMethod = request.method
          return { response: { id: 'user_1' } }
        },
      })
      .build()

    const api = IgniterCaller.create()
      .withSchemas(schemas)
      .withMock({ enabled: true, mock })
      .build()

    const result = await api.get('/me').execute()

    expect(result.error).toBeUndefined()
    expect(result.data).toEqual({ id: 'user_1' })
    expect(capturedMethod).toBe('GET')
  })

  it('types mock handler request and response', () => {
    type Handler = import('../types/mock').IgniterCallerMockHandler<
      typeof schemas,
      '/me',
      'GET'
    >
    type Request = Parameters<Handler>[0]

    expectTypeOf<Request['params']>().toMatchTypeOf<Record<never, never>>()
    expectTypeOf<Request['method']>().toEqualTypeOf<'GET'>()
  })
})
