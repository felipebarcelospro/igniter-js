/**
 * @fileoverview Tests for IgniterStore core functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IgniterStoreManager } from './manager'
import { IgniterStoreError } from '../errors/store.error'
import type { IgniterStoreAdapter } from '../types/adapter'
import { DEFAULT_SERIALIZER, type IIgniterStoreManager } from '../types'
import { z } from 'zod'
import { IgniterStoreEvents } from '../builders/events.builder'
import { IGNITER_STORE_TELEMETRY_EVENTS } from '../types/telemetry'

// Mock adapter factory
const createMockAdapter = (): IgniterStoreAdapter<any> => ({
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

describe('IgniterStore', () => {
  let adapter: IgniterStoreAdapter
  let store: IIgniterStoreManager<any, any>

  beforeEach(() => {
    adapter = createMockAdapter()
    store = new IgniterStoreManager({
      adapter,
      service: 'test-api',
      scopeChain: [],
      serializer: DEFAULT_SERIALIZER,
    })
  })

  describe('kv operations', () => {
    it('should get value with correct key', async () => {
      (adapter.get as any).mockResolvedValue({ name: 'Alice' })

      const result = await store.kv.get('user:123')

      expect(adapter.get).toHaveBeenCalledWith('igniter:store:test-api:kv:user:123')
      expect(result).toEqual({ name: 'Alice' })
    })

    it('should set value with correct key', async () => {
      await store.kv.set('user:123', { name: 'Alice' })

      expect(adapter.set).toHaveBeenCalledWith(
        'igniter:store:test-api:kv:user:123',
        { name: 'Alice' },
        undefined,
      )
    })

    it('should set value with TTL', async () => {
      await store.kv.set('session:abc', { token: 'xyz' }, { ttl: 3600 })

      expect(adapter.set).toHaveBeenCalledWith(
        'igniter:store:test-api:kv:session:abc',
        { token: 'xyz' },
        { ttl: 3600 },
      )
    })

    it('should remove value with correct key', async () => {
      await store.kv.remove('user:123')

      expect(adapter.delete).toHaveBeenCalledWith('igniter:store:test-api:kv:user:123')
    })

    it('should check existence with correct key', async () => {
      (adapter.has as any).mockResolvedValue(true)

      const result = await store.kv.exists('user:123')

      expect(adapter.has).toHaveBeenCalledWith('igniter:store:test-api:kv:user:123')
      expect(result).toBe(true)
    })

    it('should set expiration with correct key', async () => {
      await store.kv.expire('user:123', 1800)

      expect(adapter.expire).toHaveBeenCalledWith(
        'igniter:store:test-api:kv:user:123',
        1800,
      )
    })

    it('should touch with correct key', async () => {
      await store.kv.touch('user:123', 3600)

      expect(adapter.expire).toHaveBeenCalledWith(
        'igniter:store:test-api:kv:user:123',
        3600,
      )
    })
  })

  describe('counter operations', () => {
    it('should increment counter', async () => {
      (adapter.increment as any).mockResolvedValue(5)

      const result = await store.counter.increment('page-views')

      expect(adapter.increment).toHaveBeenCalledWith(
        'igniter:store:test-api:counter:page-views',
        1,
      )
      expect(result).toBe(5)
    })

    it('should decrement counter', async () => {
      (adapter.increment as any).mockResolvedValue(-1)

      const result = await store.counter.decrement('page-views')

      expect(adapter.increment).toHaveBeenCalledWith(
        'igniter:store:test-api:counter:page-views',
        -1,
      )
      expect(result).toBe(-1)
    })

    it('should expire counter', async () => {
      await store.counter.expire('daily-count', 86400)

      expect(adapter.expire).toHaveBeenCalledWith(
        'igniter:store:test-api:counter:daily-count',
        86400,
      )
    })
  })

  describe('claim operations', () => {
    it('should claim once successfully', async () => {
      (adapter.setNX as any).mockResolvedValue(true)

      const result = await store.claim.once('lock:process', 'worker-1')

      expect(adapter.setNX).toHaveBeenCalledWith(
        'igniter:store:test-api:claim:lock:process',
        'worker-1',
        undefined,
      )
      expect(result).toBe(true)
    })

    it('should claim once with TTL', async () => {
      await store.claim.once('lock:process', 'worker-1', { ttl: 30 })

      expect(adapter.setNX).toHaveBeenCalledWith(
        'igniter:store:test-api:claim:lock:process',
        'worker-1',
        { ttl: 30 },
      )
    })

    it('should return false when claim fails', async () => {
      (adapter.setNX as any).mockResolvedValue(false)

      const result = await store.claim.once('lock:process', 'worker-2')

      expect(result).toBe(false)
    })
  })

  describe('batch operations', () => {
    it('should get multiple values', async () => {
      (adapter.mget as any).mockResolvedValue([{ id: 1 }, { id: 2 }, null])

      const result = await store.batch.get(['user:1', 'user:2', 'user:3'])

      expect(adapter.mget).toHaveBeenCalledWith([
        'igniter:store:test-api:kv:user:1',
        'igniter:store:test-api:kv:user:2',
        'igniter:store:test-api:kv:user:3',
      ])
      expect(result).toEqual([{ id: 1 }, { id: 2 }, null])
    })

    it('should return empty array for empty keys', async () => {
      const result = await store.batch.get([])

      expect(adapter.mget).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('should set multiple values', async () => {
      await store.batch.set([
        { key: 'user:1', value: { name: 'Alice' }, ttl: 3600 },
        { key: 'user:2', value: { name: 'Bob' } },
      ])

      expect(adapter.mset).toHaveBeenCalledWith([
        { key: 'igniter:store:test-api:kv:user:1', value: { name: 'Alice' }, ttl: 3600 },
        { key: 'igniter:store:test-api:kv:user:2', value: { name: 'Bob' }, ttl: undefined },
      ])
    })

    it('should skip mset for empty entries', async () => {
      await store.batch.set([])

      expect(adapter.mset).not.toHaveBeenCalled()
    })
  })

  describe('events operations', () => {
    it('should publish to event with context envelope', async () => {
      const mockTimestamp = '2025-01-01T00:00:00.000Z'
      const originalToISOString = Date.prototype.toISOString
      Date.prototype.toISOString = vi.fn().mockReturnValue(mockTimestamp)

      try {
        await store.events.publish('user:created', { userId: '123' })

        expect(adapter.publish).toHaveBeenCalledWith(
          'igniter:store:test-api:events:user:created',
          {
            type: 'user:created',
            data: { userId: '123' },
            timestamp: mockTimestamp,
          },
        )
      } finally {
        Date.prototype.toISOString = originalToISOString
      }
    })

    it('should subscribe to event with wrapped handler', async () => {
      const callback = vi.fn()
      await store.events.subscribe('user:created', callback)

      // Adapter receives a wrapped handler, not the original callback
      expect(adapter.subscribe).toHaveBeenCalledWith(
        'igniter:store:test-api:events:user:created',
        expect.any(Function),
      )
    })

    it('should return unsubscribe function from subscribe', async () => {
      const callback = vi.fn()
      const unsubscribe = await store.events.subscribe('user:created', callback)

      expect(unsubscribe).toBeInstanceOf(Function)

      await unsubscribe()

      // Adapter receives a wrapped handler, not the original callback
      expect(adapter.unsubscribe).toHaveBeenCalledWith(
        'igniter:store:test-api:events:user:created',
        expect.any(Function),
      )
    })

    it('should unwrap context envelope when receiving messages', async () => {
      let receivedContext: unknown

      // Setup a subscriber
      await store.events.subscribe('user:created', (ctx) => {
        receivedContext = ctx
      })

      // Get the wrapped handler that was passed to adapter.subscribe
      const wrappedHandler = (adapter.subscribe as any).mock.calls[0][1]

      // Simulate receiving a context envelope
      const envelope = {
        type: 'user:created',
        data: { userId: '123' },
        timestamp: '2025-01-01T00:00:00.000Z',
        scope: { key: 'org', identifier: 'org-1' },
      }

      await wrappedHandler(envelope)

      expect(receivedContext).toEqual(envelope)
    })

    it('should wrap legacy raw messages in context', async () => {
      const mockTimestamp = '2025-01-01T00:00:00.000Z'
      const originalToISOString = Date.prototype.toISOString
      Date.prototype.toISOString = vi.fn().mockReturnValue(mockTimestamp)

      try {
        let receivedContext: unknown

        await store.events.subscribe('user:created', (ctx) => {
          receivedContext = ctx
        })

        const wrappedHandler = (adapter.subscribe as any).mock.calls[0][1]

        // Simulate receiving a legacy raw message (not wrapped)
        await wrappedHandler({ userId: '123' })

        expect(receivedContext).toEqual({
          type: 'user:created',
          data: { userId: '123' },
          timestamp: mockTimestamp,
        })
      } finally {
        Date.prototype.toISOString = originalToISOString
      }
    })

    it('should include scope in publish context', async () => {
      const mockTimestamp = '2025-01-01T00:00:00.000Z'
      const originalToISOString = Date.prototype.toISOString
      Date.prototype.toISOString = vi.fn().mockReturnValue(mockTimestamp)

      try {
        const scopedStore = store.scope('organization', 'org-123')
        await scopedStore.events.publish('user:created', { userId: '456' })

        expect(adapter.publish).toHaveBeenCalledWith(
          'igniter:store:test-api:organization:org-123:events:user:created',
          {
            type: 'user:created',
            data: { userId: '456' },
            timestamp: mockTimestamp,
            scope: { key: 'organization', identifier: 'org-123' },
          },
        )
      } finally {
        Date.prototype.toISOString = originalToISOString
      }
    })

    it('should validate typed events on publish', async () => {
      const events = IgniterStoreEvents.create('user')
        .event('created', z.object({ id: z.string() }))
        .build()
      const typedStore = new IgniterStoreManager({
        adapter,
        service: 'test-api',
        scopeChain: [],
        serializer: DEFAULT_SERIALIZER,
        eventsRegistry: { [events.namespace]: events.events },
      })

      await expect(
        typedStore.events.publish('user:created', { id: 123 }),
      ).rejects.toMatchObject({ code: 'STORE_SCHEMA_VALIDATION_FAILED' })
    })

    it('should skip validation for untyped events', async () => {
      const events = IgniterStoreEvents.create('user')
        .event('created', z.object({ id: z.string() }))
        .build()
      const typedStore = new IgniterStoreManager({
        adapter,
        service: 'test-api',
        scopeChain: [],
        serializer: DEFAULT_SERIALIZER,
        eventsRegistry: { [events.namespace]: events.events },
      })

      await expect(
        typedStore.events.publish('other:created', { any: true }),
      ).resolves.toBeUndefined()
    })

    it('should validate typed events on subscribe when enabled', async () => {
      const events = IgniterStoreEvents.create('user')
        .event('created', z.object({ id: z.string() }))
        .build()
      const typedStore = new IgniterStoreManager({
        adapter,
        service: 'test-api',
        scopeChain: [],
        serializer: DEFAULT_SERIALIZER,
        eventsRegistry: { [events.namespace]: events.events },
        eventsValidation: { validateSubscribe: true },
      })

      await typedStore.events.subscribe('user:created', async () => undefined)
      const wrappedHandler = (adapter.subscribe as any).mock.calls[0][1]

      await expect(
        wrappedHandler({
          type: 'user:created',
          data: { id: 123 },
          timestamp: new Date().toISOString(),
        }),
      ).rejects.toMatchObject({ code: 'STORE_SCHEMA_VALIDATION_FAILED' })
    })
  })

  describe('telemetry', () => {
    it('should emit telemetry events for kv.get', async () => {
      const telemetry = { emit: vi.fn() }
      const telemetryStore = new IgniterStoreManager({
        adapter,
        service: 'test-api',
        scopeChain: [],
        serializer: DEFAULT_SERIALIZER,
        telemetry: telemetry as any,
      })

      await telemetryStore.kv.get('user:123')

      expect(telemetry.emit).toHaveBeenCalledWith(
        IGNITER_STORE_TELEMETRY_EVENTS.KV_GET_STARTED,
        expect.any(Object),
      )
      expect(telemetry.emit).toHaveBeenCalledWith(
        IGNITER_STORE_TELEMETRY_EVENTS.KV_GET_SUCCESS,
        expect.any(Object),
      )
    })
  })

  describe('dev operations', () => {
    it('should scan with pattern', async () => {
      (adapter.scan as any).mockResolvedValue({
        keys: ['user:1', 'user:2'],
        cursor: '0',
      })

      const result = await store.dev.scan('user:*')

      expect(adapter.scan).toHaveBeenCalledWith(
        'igniter:store:test-api:kv:user:*',
        undefined,
      )
      expect(result.keys).toHaveLength(2)
    })

    it('should scan with options', async () => {
      await store.dev.scan('user:*', { cursor: '10', count: 100 })

      expect(adapter.scan).toHaveBeenCalledWith(
        'igniter:store:test-api:kv:user:*',
        { cursor: '10', count: 100 },
      )
    })
  })

  describe('streams operations', () => {
    it('should append to stream', async () => {
      (adapter.xadd as any).mockResolvedValue('1234567890-0')

      const id = await store.streams.append('events', { type: 'click' })

      expect(adapter.xadd).toHaveBeenCalledWith(
        'igniter:store:test-api:streams:events',
        { type: 'click' },
        undefined,
      )
      expect(id).toBe('1234567890-0')
    })

    it('should append to stream with options', async () => {
      await store.streams.append('events', { type: 'click' }, {
        maxLen: 10000,
        approximate: true,
      })

      expect(adapter.xadd).toHaveBeenCalledWith(
        'igniter:store:test-api:streams:events',
        { type: 'click' },
        { maxLen: 10000, approximate: true },
      )
    })

    describe('consumer group', () => {
      it('should ensure group exists', async () => {
        const consumer = store.streams.group('processors', 'worker-1')
        await consumer.ensure('events')

        expect(adapter.xgroupCreate).toHaveBeenCalledWith(
          'igniter:store:test-api:streams:events',
          'processors',
          '0',
        )
      })

      it('should ensure group with startId', async () => {
        const consumer = store.streams.group('processors', 'worker-1')
        await consumer.ensure('events', { startId: '$' })

        expect(adapter.xgroupCreate).toHaveBeenCalledWith(
          'igniter:store:test-api:streams:events',
          'processors',
          '$',
        )
      })

      it('should read from stream', async () => {
        (adapter.xreadgroup as any).mockResolvedValue([
          { id: '1-0', message: { type: 'click' } },
        ])

        const consumer = store.streams.group('processors', 'worker-1')
        const messages = await consumer.read('events', { count: 10 })

        expect(adapter.xreadgroup).toHaveBeenCalledWith(
          'igniter:store:test-api:streams:events',
          'processors',
          'worker-1',
          { count: 10 },
        )
        expect(messages).toHaveLength(1)
      })

      it('should ack messages', async () => {
        const consumer = store.streams.group('processors', 'worker-1')
        await consumer.ack('events', ['1-0', '2-0'])

        expect(adapter.xack).toHaveBeenCalledWith(
          'igniter:store:test-api:streams:events',
          'processors',
          ['1-0', '2-0'],
        )
      })
    })
  })

  describe('scope()', () => {
    it('should create scoped store', async () => {
      const orgStore = store.scope('organization', 'org_123')

      await orgStore.kv.set('settings', { theme: 'dark' })

      expect(adapter.set).toHaveBeenCalledWith(
        'igniter:store:test-api:organization:org_123:kv:settings',
        { theme: 'dark' },
        undefined,
      )
    })

    it('should chain multiple scopes', async () => {
      const wsStore = store
        .scope('organization', 'org_123')
        .scope('workspace', 'ws_456')

      await wsStore.kv.get('config')

      expect(adapter.get).toHaveBeenCalledWith(
        'igniter:store:test-api:organization:org_123:workspace:ws_456:kv:config',
      )
    })

    it('should throw if scope key is empty', () => {
      expect(() => store.scope('', 'id')).toThrow(IgniterStoreError)
      expect(() => store.scope('', 'id')).toThrow(/scope key/i)
    })

    it('should throw if scope identifier is empty', () => {
      expect(() => store.scope('org', '')).toThrow(IgniterStoreError)
      expect(() => store.scope('org', '')).toThrow(/identifier/i)
    })

    it('should handle numeric identifiers', async () => {
      const userStore = store.scope('user', 42)

      await userStore.kv.get('profile')

      expect(adapter.get).toHaveBeenCalledWith(
        'igniter:store:test-api:user:42:kv:profile',
      )
    })

    it('should not affect parent store', async () => {
      const orgStore = store.scope('organization', 'org_123')

      await store.kv.get('global')
      await orgStore.kv.get('local')

      expect(adapter.get).toHaveBeenNthCalledWith(1, 'igniter:store:test-api:kv:global')
      expect(adapter.get).toHaveBeenNthCalledWith(
        2,
        'igniter:store:test-api:organization:org_123:kv:local',
      )
    })
  })
})
