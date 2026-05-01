import { describe, it, expectTypeOf } from 'vitest'
import { z } from 'zod'
import { IgniterCaller } from '../builders/main.builder'
import type { IgniterCallerClient } from './interfaces/client'

const api = IgniterCaller.create()
  .withSchemas({
    '/me': {
      GET: {
        responses: {
          200: z.object({ id: z.string() }),
        },
      },
    },
  })
  .build()

type Client = IgniterCallerClient<typeof api>

describe('IgniterCallerClient types', () => {
  it('types invalidate data based on schema response', () => {
    type Expected = (path: '/me', data?: { id: string }) => void
    expectTypeOf<Client['invalidate']>().toMatchTypeOf<Expected>()
  })
})
