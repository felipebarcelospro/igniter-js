import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { IgniterCallerSchemaUtils } from './schema'
import type { IgniterCallerSchemaMap } from '../types/schemas'

const UserSchema = z.object({ id: z.string() })

const schemas: IgniterCallerSchemaMap = {
  '/users': {
    GET: {
      responses: {
        200: z.array(UserSchema),
      },
    },
  },
  '/users/:id': {
    GET: {
      responses: {
        200: UserSchema,
      },
    },
  },
}

describe('IgniterCallerSchemaUtils', () => {
  it('matches path parameters', () => {
    const match = IgniterCallerSchemaUtils.matchPath('/users/123', '/users/:id')
    expect(match).toEqual({ matched: true, params: { id: '123' } })
  })

  it('finds schemas by exact or param paths', () => {
    const exact = IgniterCallerSchemaUtils.findSchema(schemas, '/users', 'GET')
    expect(exact.schema).toBeDefined()
    expect(exact.params).toEqual({})

    const param = IgniterCallerSchemaUtils.findSchema(schemas, '/users/42', 'GET')
    expect(param.schema).toBeDefined()
    expect(param.params).toEqual({ id: '42' })
  })

  it('validates request schemas in strict mode', async () => {
    const requestSchema = z.object({ name: z.string().min(2) })

    await expect(
      IgniterCallerSchemaUtils.validateRequest(
        { name: 'a' },
        requestSchema,
        { mode: 'strict' },
        { url: '/users', method: 'POST' },
      ),
    ).rejects.toMatchObject({
      code: 'IGNITER_CALLER_REQUEST_VALIDATION_FAILED',
    })
  })

  it('validates response schemas in strict mode', async () => {
    const responseSchema = z.object({ id: z.string().uuid() })

    await expect(
      IgniterCallerSchemaUtils.validateResponse(
        { id: 'not-a-uuid' },
        responseSchema,
        200,
        { mode: 'strict' },
        { url: '/users', method: 'GET' },
      ),
    ).rejects.toMatchObject({
      code: 'IGNITER_CALLER_RESPONSE_VALIDATION_FAILED',
    })
  })
})
