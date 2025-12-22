import type { StandardSchemaV1 } from '@igniter-js/core'
import { describe, expect, it } from 'vitest'
import { IgniterMailError } from '../errors/mail.error'
import { IgniterMailSchema } from './schema'

describe('IgniterMailSchema', () => {
  it('returns input when schema has no ~standard.validate', async () => {
    const schema = {} as StandardSchemaV1
    const input = { hello: 'world' }

    await expect(IgniterMailSchema.validateInput(schema, input)).resolves.toBe(
      input,
    )
  })

  it('returns validated value when validator passes', async () => {
    const schema = {
      '~standard': {
        vendor: '@igniter-js/mail',
        version: 1,
        validate: async (value: unknown) => ({ value }),
      },
    } satisfies StandardSchemaV1

    await expect(IgniterMailSchema.validateInput(schema, 123)).resolves.toBe(
      123,
    )
  })

  it('throws IgniterMailError when validator reports issues', async () => {
    const schema = {
      '~standard': {
        vendor: '@igniter-js/mail',
        version: 1,
        validate: async () => ({ issues: [{ message: 'invalid' }] }),
      },
    } satisfies StandardSchemaV1

    await expect(IgniterMailSchema.validateInput(schema, {})).rejects.toBeInstanceOf(
      IgniterMailError,
    )
  })

  it('creates a passthrough schema', async () => {
    const schema = IgniterMailSchema.createPassthroughSchema()

    await expect(IgniterMailSchema.validateInput(schema, { ok: true })).resolves.toEqual({
      ok: true,
    })
  })
})
