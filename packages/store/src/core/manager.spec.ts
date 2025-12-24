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
import { IgniterStoreTelemetryEvents } from 'src/telemetry'

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
        // @ts-expect-error - Testing runtime validation for incorrect payload --- IGNORE ---
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
    const createTelemetryStore = () => {
      const telemetry = { emit: vi.fn() }
      const localAdapter = createMockAdapter()
      const telemetryStore = new IgniterStoreManager({
        adapter: localAdapter,
        service: 'test-api',
        scopeChain: [],
        serializer: DEFAULT_SERIALIZER,
        telemetry: telemetry as any,
      })

      return { telemetry, telemetryStore, adapter: localAdapter }
    }

    const expectEmitted = (
      telemetry: { emit: ReturnType<typeof vi.fn> },
      event: string,
      level: 'debug' | 'error',
      attributes?: Record<string, unknown>,
      position: 'first' | 'last' = 'last',
    ) => {
      const calls = telemetry.emit.mock.calls.filter(([key]) => key === event)
      expect(calls.length).toBeGreaterThan(0)
      const call = position === 'first' ? calls[0] : calls[calls.length - 1]
      expect(call?.[1]?.level).toBe(level)
      if (attributes) {
        expect(call?.[1]).toMatchObject({ attributes })
      }
    }

    describe('telemetry.kv', () => {
      it('emits kv.get.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.kv.get('user:123')
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('kv.get.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'kv',
          },
          'first',
        )
      })

      it('emits kv.get.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.kv.get('user:123')
        expectEmitted(telemetry, IgniterStoreTelemetryEvents.get.key('kv.get.success'), 'debug', {
          'ctx.store.service': 'test-api',
          'ctx.store.namespace': 'kv',
          'ctx.kv.found': false,
        })
      })

      it('emits kv.get.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        ;(localAdapter.get as any).mockRejectedValueOnce(new Error('fail'))
        await expect(telemetryStore.kv.get('user:123')).rejects.toBeInstanceOf(Error)
        expectEmitted(telemetry, IgniterStoreTelemetryEvents.get.key('kv.get.error'), 'error', {
          'ctx.store.service': 'test-api',
          'ctx.store.namespace': 'kv',
        })
      })

      it('emits kv.set.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.kv.set('user:123', { name: 'Alice' }, { ttl: 300 })
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('kv.set.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'kv',
            'ctx.kv.ttl': 300,
          },
          'first',
        )
      })

      it('emits kv.set.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.kv.set('user:123', { name: 'Alice' }, { ttl: 300 })
        expectEmitted(telemetry, IgniterStoreTelemetryEvents.get.key('kv.set.success'), 'debug', {
          'ctx.store.service': 'test-api',
          'ctx.store.namespace': 'kv',
          'ctx.kv.ttl': 300,
        })
      })

      it('emits kv.set.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        ;(localAdapter.set as any).mockRejectedValueOnce(new Error('fail'))
        await expect(
          telemetryStore.kv.set('user:123', { name: 'Alice' }),
        ).rejects.toBeInstanceOf(Error)
        expectEmitted(telemetry, IgniterStoreTelemetryEvents.get.key('kv.set.error'), 'error', {
          'ctx.store.service': 'test-api',
          'ctx.store.namespace': 'kv',
        })
      })

      it('emits kv.remove.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.kv.remove('user:123')
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('kv.remove.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'kv',
          },
          'first',
        )
      })

      it('emits kv.remove.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.kv.remove('user:123')
        expectEmitted(telemetry, IgniterStoreTelemetryEvents.get.key('kv.remove.success'), 'debug', {
          'ctx.store.service': 'test-api',
          'ctx.store.namespace': 'kv',
        })
      })

      it('emits kv.remove.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        ;(localAdapter.delete as any).mockRejectedValueOnce(new Error('fail'))
        await expect(telemetryStore.kv.remove('user:123')).rejects.toBeInstanceOf(Error)
        expectEmitted(telemetry, IgniterStoreTelemetryEvents.get.key('kv.remove.error'), 'error', {
          'ctx.store.service': 'test-api',
          'ctx.store.namespace': 'kv',
        })
      })

      it('emits kv.exists.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.kv.exists('user:123')
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('kv.exists.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'kv',
          },
          'first',
        )
      })

      it('emits kv.exists.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.kv.exists('user:123')
        expectEmitted(telemetry, IgniterStoreTelemetryEvents.get.key('kv.exists.success'), 'debug', {
          'ctx.store.service': 'test-api',
          'ctx.store.namespace': 'kv',
          'ctx.kv.existed': false,
        })
      })

      it('emits kv.exists.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        ;(localAdapter.has as any).mockRejectedValueOnce(new Error('fail'))
        await expect(telemetryStore.kv.exists('user:123')).rejects.toBeInstanceOf(Error)
        expectEmitted(telemetry, IgniterStoreTelemetryEvents.get.key('kv.exists.error'), 'error', {
          'ctx.store.service': 'test-api',
          'ctx.store.namespace': 'kv',
        })
      })

      it('emits kv.expire.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.kv.expire('user:123', 300)
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('kv.expire.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'kv',
            'ctx.kv.ttl': 300,
          },
          'first',
        )
      })

      it('emits kv.expire.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.kv.expire('user:123', 300)
        expectEmitted(telemetry, IgniterStoreTelemetryEvents.get.key('kv.expire.success'), 'debug', {
          'ctx.store.service': 'test-api',
          'ctx.store.namespace': 'kv',
          'ctx.kv.ttl': 300,
        })
      })

      it('emits kv.expire.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        ;(localAdapter.expire as any).mockRejectedValueOnce(new Error('fail'))
        await expect(telemetryStore.kv.expire('user:123', 300)).rejects.toBeInstanceOf(
          Error,
        )
        expectEmitted(telemetry, IgniterStoreTelemetryEvents.get.key('kv.expire.error'), 'error', {
          'ctx.store.service': 'test-api',
          'ctx.store.namespace': 'kv',
          'ctx.kv.ttl': 300,
        })
      })

      it('emits kv.touch.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.kv.touch('user:123', 300)
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('kv.touch.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'kv',
            'ctx.kv.ttl': 300,
          },
          'first',
        )
      })

      it('emits kv.touch.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.kv.touch('user:123', 300)
        expectEmitted(telemetry, IgniterStoreTelemetryEvents.get.key('kv.touch.success'), 'debug', {
          'ctx.store.service': 'test-api',
          'ctx.store.namespace': 'kv',
          'ctx.kv.ttl': 300,
        })
      })

      it('emits kv.touch.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        ;(localAdapter.expire as any).mockRejectedValueOnce(new Error('fail'))
        await expect(telemetryStore.kv.touch('user:123', 300)).rejects.toBeInstanceOf(
          Error,
        )
        expectEmitted(telemetry, IgniterStoreTelemetryEvents.get.key('kv.touch.error'), 'error', {
          'ctx.store.service': 'test-api',
          'ctx.store.namespace': 'kv',
          'ctx.kv.ttl': 300,
        })
      })
    })

    describe('telemetry.counter', () => {
      it('emits counter.increment.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.counter.increment('page-views')
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('counter.increment.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'counter',
            'ctx.counter.delta': 1,
          },
          'first',
        )
      })

      it('emits counter.increment.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.counter.increment('page-views')
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('counter.increment.success'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'counter',
            'ctx.counter.delta': 1,
          },
        )
      })

      it('emits counter.increment.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        ;(localAdapter.increment as any).mockRejectedValueOnce(new Error('fail'))
        await expect(telemetryStore.counter.increment('page-views')).rejects.toBeInstanceOf(
          Error,
        )
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('counter.increment.error'),
          'error',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'counter',
            'ctx.counter.delta': 1,
          },
        )
      })

      it('emits counter.decrement.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.counter.decrement('page-views')
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('counter.decrement.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'counter',
            'ctx.counter.delta': -1,
          },
          'first',
        )
      })

      it('emits counter.decrement.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.counter.decrement('page-views')
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('counter.decrement.success'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'counter',
            'ctx.counter.delta': -1,
          },
        )
      })

      it('emits counter.decrement.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        ;(localAdapter.increment as any).mockRejectedValueOnce(new Error('fail'))
        await expect(telemetryStore.counter.decrement('page-views')).rejects.toBeInstanceOf(
          Error,
        )
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('counter.decrement.error'),
          'error',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'counter',
            'ctx.counter.delta': -1,
          },
        )
      })

      it('emits counter.expire.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.counter.expire('page-views', 300)
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('counter.expire.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'counter',
            'ctx.counter.ttl': 300,
          },
          'first',
        )
      })

      it('emits counter.expire.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.counter.expire('page-views', 300)
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('counter.expire.success'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'counter',
            'ctx.counter.ttl': 300,
          },
        )
      })

      it('emits counter.expire.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        ;(localAdapter.expire as any).mockRejectedValueOnce(new Error('fail'))
        await expect(telemetryStore.counter.expire('page-views', 300)).rejects.toBeInstanceOf(
          Error,
        )
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('counter.expire.error'),
          'error',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'counter',
            'ctx.counter.ttl': 300,
          },
        )
      })
    })

    describe('telemetry.claim', () => {
      it('emits claim.acquire.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.claim.once('process:1', 'worker-1', { ttl: 30 })
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('claim.acquire.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'claim',
            'ctx.claim.ttl': 30,
          },
          'first',
        )
      })

      it('emits claim.acquire.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.claim.once('process:1', 'worker-1', { ttl: 30 })
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('claim.acquire.success'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'claim',
            'ctx.claim.ttl': 30,
            'ctx.claim.acquired': true,
          },
        )
      })

      it('emits claim.acquire.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        ;(localAdapter.setNX as any).mockRejectedValueOnce(new Error('fail'))
        await expect(
          telemetryStore.claim.once('process:1', 'worker-1', { ttl: 30 }),
        ).rejects.toBeInstanceOf(Error)
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('claim.acquire.error'),
          'error',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'claim',
            'ctx.claim.ttl': 30,
          },
        )
      })
    })

    describe('telemetry.batch', () => {
      it('emits batch.get.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.batch.get(['user:1', 'user:2'])
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('batch.get.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'batch',
            'ctx.batch.count': 2,
          },
          'first',
        )
      })

      it('emits batch.get.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.batch.get(['user:1', 'user:2'])
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('batch.get.success'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'batch',
            'ctx.batch.count': 2,
            'ctx.batch.found': 0,
          },
        )
      })

      it('emits batch.get.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        ;(localAdapter.mget as any).mockRejectedValueOnce(new Error('fail'))
        await expect(telemetryStore.batch.get(['user:1', 'user:2'])).rejects.toBeInstanceOf(
          Error,
        )
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('batch.get.error'),
          'error',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'batch',
            'ctx.batch.count': 2,
          },
        )
      })

      it('emits batch.set.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.batch.set([
          { key: 'user:1', value: { name: 'Alice' } },
          { key: 'user:2', value: { name: 'Bob' }, ttl: 120 },
        ])
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('batch.set.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'batch',
            'ctx.batch.count': 2,
          },
          'first',
        )
      })

      it('emits batch.set.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.batch.set([
          { key: 'user:1', value: { name: 'Alice' } },
          { key: 'user:2', value: { name: 'Bob' }, ttl: 120 },
        ])
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('batch.set.success'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'batch',
            'ctx.batch.count': 2,
          },
        )
      })

      it('emits batch.set.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        ;(localAdapter.mset as any).mockRejectedValueOnce(new Error('fail'))
        await expect(
          telemetryStore.batch.set([{ key: 'user:1', value: { name: 'Alice' } }]),
        ).rejects.toBeInstanceOf(Error)
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('batch.set.error'),
          'error',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'batch',
            'ctx.batch.count': 1,
          },
        )
      })
    })

    describe('telemetry.events', () => {
      it('emits events.publish.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.events.publish('user:created', { id: 'user-1' })
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('events.publish.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'events',
            'ctx.events.channel': 'user:created',
          },
          'first',
        )
      })

      it('emits events.publish.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.events.publish('user:created', { id: 'user-1' })
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('events.publish.success'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'events',
            'ctx.events.channel': 'user:created',
          },
        )
      })

      it('emits events.publish.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        ;(localAdapter.publish as any).mockRejectedValueOnce(new Error('fail'))
        await expect(
          telemetryStore.events.publish('user:created', { id: 'user-1' }),
        ).rejects.toBeInstanceOf(Error)
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('events.publish.error'),
          'error',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'events',
            'ctx.events.channel': 'user:created',
          },
        )
      })

      it('emits events.subscribe.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        const off = await telemetryStore.events.subscribe('user:*', async () => undefined)
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('events.subscribe.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'events',
            'ctx.events.channel': 'user:*',
            'ctx.events.wildcard': true,
          },
          'first',
        )
        await off()
      })

      it('emits events.subscribe.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        const off = await telemetryStore.events.subscribe('user:*', async () => undefined)
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('events.subscribe.success'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'events',
            'ctx.events.channel': 'user:*',
            'ctx.events.wildcard': true,
          },
        )
        await off()
      })

      it('emits events.subscribe.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        ;(localAdapter.subscribe as any).mockRejectedValueOnce(new Error('fail'))
        await expect(
          telemetryStore.events.subscribe('user:*', async () => undefined),
        ).rejects.toBeInstanceOf(Error)
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('events.subscribe.error'),
          'error',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'events',
            'ctx.events.channel': 'user:*',
            'ctx.events.wildcard': true,
          },
        )
      })

      it('emits events.unsubscribe.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        const off = await telemetryStore.events.subscribe('user:*', async () => undefined)
        await off()
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('events.unsubscribe.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'events',
            'ctx.events.channel': 'user:*',
            'ctx.events.wildcard': true,
          },
          'first',
        )
      })

      it('emits events.unsubscribe.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        const off = await telemetryStore.events.subscribe('user:*', async () => undefined)
        await off()
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('events.unsubscribe.success'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'events',
            'ctx.events.channel': 'user:*',
            'ctx.events.wildcard': true,
          },
        )
      })

      it('emits events.unsubscribe.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        const off = await telemetryStore.events.subscribe('user:*', async () => undefined)
        ;(localAdapter.unsubscribe as any).mockRejectedValueOnce(new Error('fail'))
        await expect(off()).rejects.toBeInstanceOf(Error)
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('events.unsubscribe.error'),
          'error',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'events',
            'ctx.events.channel': 'user:*',
            'ctx.events.wildcard': true,
          },
        )
      })
    })

    describe('telemetry.stream', () => {
      it('emits stream.append.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.streams.append('events', { type: 'click' })
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('stream.append.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'stream',
            'ctx.stream.name': 'events',
          },
          'first',
        )
      })

      it('emits stream.append.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.streams.append('events', { type: 'click' })
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('stream.append.success'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'stream',
            'ctx.stream.name': 'events',
          },
        )
      })

      it('emits stream.append.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        ;(localAdapter.xadd as any).mockRejectedValueOnce(new Error('fail'))
        await expect(
          telemetryStore.streams.append('events', { type: 'click' }),
        ).rejects.toBeInstanceOf(Error)
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('stream.append.error'),
          'error',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'stream',
            'ctx.stream.name': 'events',
          },
        )
      })

      it('emits stream.group.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        const group = telemetryStore.streams.group('processors', 'worker-1')
        await group.ensure('events')
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('stream.group.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'stream',
            'ctx.stream.name': 'events',
            'ctx.stream.group': 'processors',
            'ctx.stream.consumer': 'worker-1',
          },
          'first',
        )
      })

      it('emits stream.group.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        const group = telemetryStore.streams.group('processors', 'worker-1')
        await group.ensure('events')
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('stream.group.success'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'stream',
            'ctx.stream.name': 'events',
            'ctx.stream.group': 'processors',
            'ctx.stream.consumer': 'worker-1',
          },
        )
      })

      it('emits stream.group.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        const group = telemetryStore.streams.group('processors', 'worker-1')
        ;(localAdapter.xgroupCreate as any).mockRejectedValueOnce(new Error('fail'))
        await expect(group.ensure('events')).rejects.toBeInstanceOf(Error)
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('stream.group.error'),
          'error',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'stream',
            'ctx.stream.name': 'events',
            'ctx.stream.group': 'processors',
            'ctx.stream.consumer': 'worker-1',
          },
        )
      })

      it('emits stream.read.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        const group = telemetryStore.streams.group('processors', 'worker-1')
        await group.read('events')
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('stream.read.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'stream',
            'ctx.stream.name': 'events',
            'ctx.stream.group': 'processors',
            'ctx.stream.consumer': 'worker-1',
          },
          'first',
        )
      })

      it('emits stream.read.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        const group = telemetryStore.streams.group('processors', 'worker-1')
        await group.read('events')
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('stream.read.success'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'stream',
            'ctx.stream.name': 'events',
            'ctx.stream.group': 'processors',
            'ctx.stream.consumer': 'worker-1',
            'ctx.stream.count': 0,
          },
        )
      })

      it('emits stream.read.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        const group = telemetryStore.streams.group('processors', 'worker-1')
        ;(localAdapter.xreadgroup as any).mockRejectedValueOnce(new Error('fail'))
        await expect(group.read('events')).rejects.toBeInstanceOf(Error)
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('stream.read.error'),
          'error',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'stream',
            'ctx.stream.name': 'events',
            'ctx.stream.group': 'processors',
            'ctx.stream.consumer': 'worker-1',
          },
        )
      })

      it('emits stream.ack.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        const group = telemetryStore.streams.group('processors', 'worker-1')
        await group.ack('events', ['1-0'])
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('stream.ack.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'stream',
            'ctx.stream.name': 'events',
            'ctx.stream.group': 'processors',
            'ctx.stream.consumer': 'worker-1',
            'ctx.stream.count': 1,
          },
          'first',
        )
      })

      it('emits stream.ack.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        const group = telemetryStore.streams.group('processors', 'worker-1')
        await group.ack('events', ['1-0'])
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('stream.ack.success'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'stream',
            'ctx.stream.name': 'events',
            'ctx.stream.group': 'processors',
            'ctx.stream.consumer': 'worker-1',
            'ctx.stream.count': 1,
          },
        )
      })

      it('emits stream.ack.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        const group = telemetryStore.streams.group('processors', 'worker-1')
        ;(localAdapter.xack as any).mockRejectedValueOnce(new Error('fail'))
        await expect(group.ack('events', ['1-0'])).rejects.toBeInstanceOf(Error)
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('stream.ack.error'),
          'error',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'stream',
            'ctx.stream.name': 'events',
            'ctx.stream.group': 'processors',
            'ctx.stream.consumer': 'worker-1',
            'ctx.stream.count': 1,
          },
        )
      })
    })

    describe('telemetry.dev', () => {
      it('emits dev.scan.started', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.dev.scan('user:*')
        expectEmitted(
          telemetry,
          IgniterStoreTelemetryEvents.get.key('dev.scan.started'),
          'debug',
          {
            'ctx.store.service': 'test-api',
            'ctx.store.namespace': 'dev',
          },
          'first',
        )
      })

      it('emits dev.scan.success', async () => {
        const { telemetry, telemetryStore } = createTelemetryStore()
        await telemetryStore.dev.scan('user:*')
        expectEmitted(telemetry, IgniterStoreTelemetryEvents.get.key('dev.scan.success'), 'debug', {
          'ctx.store.service': 'test-api',
          'ctx.store.namespace': 'dev',
        })
      })

      it('emits dev.scan.error', async () => {
        const { telemetry, telemetryStore, adapter: localAdapter } = createTelemetryStore()
        ;(localAdapter.scan as any).mockRejectedValueOnce(new Error('fail'))
        await expect(telemetryStore.dev.scan('user:*')).rejects.toBeInstanceOf(Error)
        expectEmitted(telemetry, IgniterStoreTelemetryEvents.get.key('dev.scan.error'), 'error', {
          'ctx.store.service': 'test-api',
          'ctx.store.namespace': 'dev',
        })
      })
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
