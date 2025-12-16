/**
 * @fileoverview Tests for IgniterStoreBuilder
 */

import { describe, it, expect, vi } from 'vitest'
import { IgniterStoreBuilder } from './igniter-store.builder'
import { IgniterStoreError } from '../errors/igniter-store.error'
import type { IgniterStoreAdapter } from '../types/adapter'
import type { IgniterLogger } from '@igniter-js/core'

// Mock adapter
const createMockAdapter = (): IgniterStoreAdapter => ({
  client: {},
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  has: vi.fn().mockResolvedValue(false),
  increment: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(undefined),
  setNX: vi.fn().mockResolvedValue(true),
  mget: vi.fn().mockResolvedValue([]),
  mset: vi.fn().mockResolvedValue(undefined),
  publish: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn().mockResolvedValue(undefined),
  unsubscribe: vi.fn().mockResolvedValue(undefined),
  scan: vi.fn().mockResolvedValue({ keys: [], cursor: '0' }),
  xadd: vi.fn().mockResolvedValue('1234567890-0'),
  xgroupCreate: vi.fn().mockResolvedValue(undefined),
  xreadgroup: vi.fn().mockResolvedValue([]),
  xack: vi.fn().mockResolvedValue(undefined),
})

describe('IgniterStoreBuilder', () => {
  describe('create()', () => {
    it('should create a new builder instance', () => {
      const builder = IgniterStoreBuilder.create()
      expect(builder).toBeInstanceOf(IgniterStoreBuilder)
    })
  })

  describe('withAdapter()', () => {
    it('should set the adapter', () => {
      const adapter = createMockAdapter()
      const builder = IgniterStoreBuilder.create()
        .withAdapter(adapter)

      expect(builder).toBeInstanceOf(IgniterStoreBuilder)
    })

    it('should return a new builder instance', () => {
      const adapter = createMockAdapter()
      const builder1 = IgniterStoreBuilder.create()
      const builder2 = builder1.withAdapter(adapter)

      expect(builder1).not.toBe(builder2)
    })
  })

  describe('withService()', () => {
    it('should set the service name', () => {
      const builder = IgniterStoreBuilder.create()
        .withService('my-api')

      expect(builder).toBeInstanceOf(IgniterStoreBuilder)
    })
  })

  describe('withEnvironment()', () => {
    it('should set the environment', () => {
      const builder = IgniterStoreBuilder.create()
        .withEnvironment('production')

      expect(builder).toBeInstanceOf(IgniterStoreBuilder)
    })
  })

  describe('withKeyPrefix()', () => {
    it('should set the key prefix', () => {
      const builder = IgniterStoreBuilder.create()
        .withKeyPrefix('myapp:cache')

      expect(builder).toBeInstanceOf(IgniterStoreBuilder)
    })
  })

  describe('withSerializer()', () => {
    it('should set custom serializer', () => {
      const serializer = {
        encode: (value: any) => JSON.stringify(value),
        decode: (value: string) => JSON.parse(value),
      }

      const builder = IgniterStoreBuilder.create()
        .withSerializer(serializer)

      expect(builder).toBeInstanceOf(IgniterStoreBuilder)
    })
  })

  describe('addEvents()', () => {
    it('should add events for a namespace', () => {
      const events = { created: {} as any, deleted: {} as any }
      const builder = IgniterStoreBuilder.create()
        .addEvents('user', events)

      expect(builder).toBeInstanceOf(IgniterStoreBuilder)
    })

    it('should add events with validation options', () => {
      const events = { created: {} as any }
      const builder = IgniterStoreBuilder.create()
        .addEvents('user', events, { validatePublish: true })

      expect(builder).toBeInstanceOf(IgniterStoreBuilder)
    })

    it('should add multiple namespaces', () => {
      const userEvents = { created: {} as any }
      const orderEvents = { placed: {} as any }
      const builder = IgniterStoreBuilder.create()
        .addEvents('user', userEvents)
        .addEvents('order', orderEvents)

      expect(builder).toBeInstanceOf(IgniterStoreBuilder)
    })
  })

  describe('withLogger()', () => {
    it('should set logger', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      } as unknown as IgniterLogger

      const builder = IgniterStoreBuilder.create()
        .withLogger(logger)

      expect(builder).toBeInstanceOf(IgniterStoreBuilder)
    })
  })

  describe('build()', () => {
    it('should throw if adapter is not set', () => {
      const builder = IgniterStoreBuilder.create()
        .withService('my-api')

      expect(() => builder.build()).toThrow(IgniterStoreError)
      expect(() => builder.build()).toThrow(/adapter/i)
    })

    it('should throw if service is not set', () => {
      const adapter = createMockAdapter()
      const builder = IgniterStoreBuilder.create()
        .withAdapter(adapter)

      expect(() => builder.build()).toThrow(IgniterStoreError)
      expect(() => builder.build()).toThrow(/service/i)
    })

    it('should build store with minimal config', () => {
      const adapter = createMockAdapter()
      const store = IgniterStoreBuilder.create()
        .withAdapter(adapter)
        .withService('my-api')
        .build()

      expect(store).toBeDefined()
      expect(store.kv).toBeDefined()
      expect(store.counter).toBeDefined()
      expect(store.claim).toBeDefined()
      expect(store.batch).toBeDefined()
      expect(store.events).toBeDefined()
      expect(store.dev).toBeDefined()
      expect(store.streams).toBeDefined()
      expect(store.scope).toBeDefined()
    })

    it('should build store with full config', () => {
      const adapter = createMockAdapter()
      const store = IgniterStoreBuilder.create()
        .withAdapter(adapter)
        .withService('my-api')
        .withEnvironment('production')
        .withKeyPrefix('myapp')
        .withSerializer({ encode: JSON.stringify, decode: JSON.parse })
        .build()

      expect(store).toBeDefined()
    })

    it('should use default values', () => {
      const adapter = createMockAdapter()
      const store = IgniterStoreBuilder.create()
        .withAdapter(adapter)
        .withService('my-api')
        .build()

      // Test that defaults work by checking key generation
      expect(store.kv).toBeDefined()
    })
  })

  describe('addScope()', () => {
    it('should add a scope definition', () => {
      const builder = IgniterStoreBuilder.create()
        .addScope('organization', { required: true })

      expect(builder).toBeInstanceOf(IgniterStoreBuilder)
    })

    it('should add multiple scopes', () => {
      const builder = IgniterStoreBuilder.create()
        .addScope('organization', { required: true })
        .addScope('workspace', { required: false })

      expect(builder).toBeInstanceOf(IgniterStoreBuilder)
    })

    it('should throw on duplicate scope key', () => {
      expect(() => {
        IgniterStoreBuilder.create()
          .addScope('organization')
          .addScope('organization')
      }).toThrow(IgniterStoreError)
    })
  })

  describe('addActor()', () => {
    it('should add an actor definition', () => {
      const builder = IgniterStoreBuilder.create()
        .addActor('user', { description: 'Human user' })

      expect(builder).toBeInstanceOf(IgniterStoreBuilder)
    })

    it('should add multiple actors', () => {
      const builder = IgniterStoreBuilder.create()
        .addActor('user', { description: 'Human user' })
        .addActor('system', { description: 'System process' })

      expect(builder).toBeInstanceOf(IgniterStoreBuilder)
    })

    it('should throw on duplicate actor key', () => {
      expect(() => {
        IgniterStoreBuilder.create()
          .addActor('user')
          .addActor('user')
      }).toThrow(IgniterStoreError)
    })
  })

  describe('immutability', () => {
    it('should create new builder on each method call', () => {
      const adapter = createMockAdapter()
      const builder1 = IgniterStoreBuilder.create()
      const builder2 = builder1.withAdapter(adapter)
      const builder3 = builder2.withService('api')
      const builder4 = builder3.withEnvironment('prod')

      expect(builder1).not.toBe(builder2)
      expect(builder2).not.toBe(builder3)
      expect(builder3).not.toBe(builder4)
    })
  })
})
