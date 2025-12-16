/**
 * @fileoverview Tests for IgniterStoreEventsSchema
 */

import { describe, it, expect } from 'vitest'
import { IgniterStoreEventsSchema, IgniterStoreEventsSchemaGroup } from './schema'

// Mock schema implementation for testing
const createMockSchema = <T>() => ({
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: (value: unknown) => ({ value: value as T }),
  },
}) as any

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
      const userSchema = createMockSchema<{ userId: string }>()
      const schemas = IgniterStoreEventsSchema.create()
        .channel('user:created', userSchema)
        .build()

      expect(schemas).toHaveProperty('user:created')
      expect(schemas['user:created']).toBe(userSchema)
    })

    it('should add multiple channels', () => {
      const userCreatedSchema = createMockSchema<{ userId: string }>()
      const userDeletedSchema = createMockSchema<{ userId: string }>()

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
      const emailSchema = createMockSchema<{ to: string }>()
      const pushSchema = createMockSchema<{ token: string }>()

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
      const userSchema = createMockSchema<{ userId: string }>()
      const emailSchema = createMockSchema<{ to: string }>()

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
        'event:a': createMockSchema<{ a: string }>(),
        'event:b': createMockSchema<{ b: string }>(),
      }

      const schemas = IgniterStoreEventsSchema.create()
        .merge(baseSchemas)
        .channel('event:c', createMockSchema<{ c: string }>())
        .build()

      expect(schemas).toHaveProperty('event:a')
      expect(schemas).toHaveProperty('event:b')
      expect(schemas).toHaveProperty('event:c')
    })

    it('should override existing keys', () => {
      const originalSchema = createMockSchema<{ original: true }>()
      const newSchema = createMockSchema<{ new: true }>()

      const schemas = IgniterStoreEventsSchema.create()
        .channel('event', originalSchema)
        .merge({ event: newSchema })
        .build()

      expect(schemas.event).toBe(newSchema)
    })
  })

  describe('build()', () => {
    it('should return immutable schema map', () => {
      const schema = createMockSchema<{ test: true }>()
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
      const schema = createMockSchema<{ test: true }>()
      const group = new IgniterStoreEventsSchemaGroup({})
        .channel('test', schema)
        .build()

      expect(group).toHaveProperty('test')
      expect(group.test).toBe(schema)
    })

    it('should chain multiple channels', () => {
      const schemaA = createMockSchema<{ a: true }>()
      const schemaB = createMockSchema<{ b: true }>()

      const group = new IgniterStoreEventsSchemaGroup({})
        .channel('a', schemaA)
        .channel('b', schemaB)
        .build()

      expect(Object.keys(group)).toHaveLength(2)
    })
  })
})
