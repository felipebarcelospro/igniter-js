import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { IgniterCallerMock } from './mock.builder'
import { IgniterCallerMockManager } from '../core/mock'

const schemas = {
  '/me': {
    GET: {
      responses: {
        200: z.object({ id: z.string() }),
      },
    },
  },
}

describe('IgniterCallerMockBuilder', () => {
  it('builds a mock manager with registered handlers', () => {
    const mock = IgniterCallerMock.create()
      .withSchemas(schemas)
      .mock('/me', {
        GET: { response: { id: 'user_1' } },
      })
      .build()

    expect(mock).toBeInstanceOf(IgniterCallerMockManager)
    const resolved = mock.resolve('/me', 'GET')
    expect(resolved).not.toBeNull()
  })
})
