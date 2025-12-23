/**
 * @fileoverview Tests for IgniterStoreEventsSchema
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { IgniterStoreEventsSchema, IgniterStoreEventsSchemaGroup } from './schema'

describe('IgniterStoreEventsSchema', () => {
  describe('create()', () => {
    it('should create an empty schema builder', () => {
      const builder = IgniterStoreEventsSchema.create()
      const schemas = builder.build()

      expect(schemas).toEqual({})
    })
  })

  describe('channel()', () => {
    it('should add a channel with schema', () => {
      const userSchema = z.object({ userId: z.string() })
      const schemas = IgniterStoreEventsSchema.create()
        .channel('user:created', userSchema)
        .build()

      expect(schemas).toHaveProperty('user:created')
      expect(schemas['user:created']).toBe(userSchema)
    })

    it('should add multiple channels', () => {
      const userCreatedSchema = z.object({ userId: z.string() })
      const userDeletedSchema = z.object({ userId: z.string() })

      const schemas = IgniterStoreEventsSchema.create()
        .channel('user:created', userCreatedSchema)
        .channel('user:deleted', userDeletedSchema)
        .build()

      expect(Object.keys(schemas)).toHaveLength(2)
      expect(schemas).toHaveProperty('user:created')
      expect(schemas).toHaveProperty('user:deleted')
    })
  })

  describe('group()', () => {
    it('should create nested group', () => {
      const emailSchema = z.object({ to: z.string() })
      const pushSchema = z.object({ token: z.string() })

      const schemas = IgniterStoreEventsSchema.create()
        .group('notifications', (group) =>
          group
            .channel('email', emailSchema)
            .channel('push', pushSchema),
        )
        .build()

      expect(schemas).toHaveProperty('notifications')
      expect(schemas.notifications).toHaveProperty('email')
      expect(schemas.notifications).toHaveProperty('push')
    })

    it('should combine channels and groups', () => {
      const userSchema = z.object({ userId: z.string() })
      const emailSchema = z.object({ to: z.string() })

      const schemas = IgniterStoreEventsSchema.create()
        .channel('user:created', userSchema)
        .group('notifications', (group) =>
          group.channel('email', emailSchema),
        )
        .build()

      expect(schemas).toHaveProperty('user:created')
      expect(schemas).toHaveProperty('notifications')
      expect((schemas.notifications as any).email).toBe(emailSchema)
    })
  })

  describe('merge()', () => {
    it('should merge existing schemas', () => {
      const baseSchemas = {
        'event:a': z.object({ a: z.string() }),
        'event:b': z.object({ b: z.string() }),
      }

      const schemas = IgniterStoreEventsSchema.create()
        .merge(baseSchemas)
        .channel('event:c', z.object({ c: z.string() }))
        .build()

      expect(schemas).toHaveProperty('event:a')
      expect(schemas).toHaveProperty('event:b')
      expect(schemas).toHaveProperty('event:c')
    })

    it('should override existing keys', () => {
      const originalSchema = z.object({ original: z.literal(true) })
      const newSchema = z.object({ new: z.literal(true) })

      const schemas = IgniterStoreEventsSchema.create()
        .channel('event', originalSchema)
        .merge({ event: newSchema })
        .build()

      expect(schemas.event).toBe(newSchema)
    })
  })

  describe('build()', () => {
    it('should return immutable schema map', () => {
      const schema = z.object({ test: z.literal(true) })
      const builder = IgniterStoreEventsSchema.create()
        .channel('test', schema)

      const schemas1 = builder.build()
      const schemas2 = builder.build()

      expect(schemas1).toEqual(schemas2)
    })
  })
})

describe('IgniterStoreEventsSchemaGroup', () => {
  describe('channel()', () => {
    it('should add channels to group', () => {
      const schema = z.object({ test: z.literal(true) })
      const group = new IgniterStoreEventsSchemaGroup({})
        .channel('test', schema)
        .build()

      expect(group).toHaveProperty('test')
      expect(group.test).toBe(schema)
    })

    it('should chain multiple channels', () => {
      const schemaA = z.object({ a: z.literal(true) })
      const schemaB = z.object({ b: z.literal(true) })

      const group = new IgniterStoreEventsSchemaGroup({})
        .channel('a', schemaA)
        .channel('b', schemaB)
        .build()

      expect(Object.keys(group)).toHaveLength(2)
    })
  })
})
