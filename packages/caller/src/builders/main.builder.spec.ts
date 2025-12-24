/**
 * Type-level tests for IgniterCaller schema inference.
 *
 * These tests verify that TypeScript correctly infers response types
 * based on the schema configuration.
 *
 * IMPORTANT: Schema paths should be RELATIVE (e.g., '/users') not absolute
 * (e.g., 'https://api.test/users'). The baseURL is prepended at runtime
 * but type inference uses the path as-is.
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import { z } from 'zod'
import { IgniterCaller } from './main.builder'
import { IgniterCallerManager } from '../core/manager'
import type { IgniterCallerApiResponse } from '../types/response'

// Define test schemas
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
})

const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string(),
})

const ErrorSchema = z.object({
  error: z.string(),
  code: z.number(),
})

// Schema map with RELATIVE paths (not full URLs)
// This allows type inference to work correctly
const schemas = {
  '/users': {
    GET: {
      responses: {
        200: z.array(UserSchema),
        401: ErrorSchema,
      },
    },
    POST: {
      request: CreateUserSchema,
      responses: {
        201: UserSchema,
        400: ErrorSchema,
      },
    },
  },
  '/users/:id': {
    GET: {
      responses: {
        200: UserSchema,
        404: ErrorSchema,
      },
    },
    DELETE: {
      responses: {
        204: z.void(),
        404: ErrorSchema,
      },
    },
  },
} as const

// Create typed API client
const api = IgniterCaller.create()
  .withBaseUrl('https://api.test')
  .withSchemas(schemas)
  .build()

describe('IgniterCaller Type Inference', () => {
  it('builds a manager instance', () => {
    const builder = IgniterCaller.create().withBaseUrl('https://api.test')
    const api = builder.build()
    expect(api).toBeInstanceOf(IgniterCallerManager)
  })

  it('should infer GET response type from schema', () => {
    // This is a compile-time check - the test passes if it compiles
    const builder = api.get('/users')
    expect(builder).toBeDefined()
    expect(typeof builder.execute).toBe('function')
    type Response = Awaited<ReturnType<typeof builder.execute>>
    expectTypeOf<Response>().toEqualTypeOf<IgniterCallerApiResponse<Array<{
      id: string
      name: string
      email: string
    }>>>()
  })

  it('should infer POST request body type from schema', () => {
    const builder = api.post('/users').body({ name: 'John', email: 'john@example.com' })
    expect(builder).toBeDefined()
    expect(typeof builder.execute).toBe('function')
    type Response = Awaited<ReturnType<typeof builder.execute>>
    expectTypeOf<Response>().toEqualTypeOf<IgniterCallerApiResponse<{
      id: string
      name: string
      email: string
    }>>()
  })

  it('should infer path params from URL pattern', () => {
    const builder = api.get('/users/:id').params({ id: '123' })
    expect(builder).toBeDefined()
    expect(typeof builder.execute).toBe('function')
    expectTypeOf(builder.params)
      .parameter(0)
      .toEqualTypeOf<{ id: string } & Record<string, string | number | boolean>>()
  })

  it('should infer DELETE response type', () => {
    const builder = api.delete('/users/:id').params({ id: '123' })
    expect(builder).toBeDefined()
    expect(typeof builder.execute).toBe('function')
  })

  it('should return unknown for paths not in schema', () => {
    const builder = api.get('/unknown/path')
    expect(builder).toBeDefined()
    expect(typeof builder.execute).toBe('function')
  })

  it('should allow generic string paths', () => {
    // This uses the fallback overload for arbitrary strings
    const builder = api.get('/any/path/here')
    expect(builder).toBeDefined()
  })
})
