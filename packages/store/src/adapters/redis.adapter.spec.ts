/**
 * @fileoverview Tests for IgniterStoreRedisAdapter
 */

import { describe, expect, it, vi } from 'vitest'
import { IgniterStoreRedisAdapter } from './redis.adapter'

const createMockRedis = () => {
  const subscriber = {
    on: vi.fn(),
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
  }

  const pipeline = {
    set: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  }

  const client = {
    duplicate: vi.fn(() => subscriber),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    incrby: vi.fn().mockResolvedValue(2),
    expire: vi.fn().mockResolvedValue(1),
    setnx: vi.fn().mockResolvedValue(1),
    mget: vi.fn().mockResolvedValue([]),
    mset: vi.fn().mockResolvedValue(undefined),
    pipeline: vi.fn(() => pipeline),
    publish: vi.fn().mockResolvedValue(1),
    scan: vi.fn().mockResolvedValue(['0', []]),
    xadd: vi.fn().mockResolvedValue('1-0'),
    xgroup: vi.fn().mockResolvedValue(undefined),
    xreadgroup: vi.fn().mockResolvedValue([]),
    xack: vi.fn().mockResolvedValue(1),
  }

  return { client, subscriber, pipeline }
}

describe('IgniterStoreRedisAdapter', () => {
  it('sets values with TTL using EX', async () => {
    const { client } = createMockRedis()
    const adapter = IgniterStoreRedisAdapter.create({ redis: client as any })

    await adapter.set('key', { a: 1 }, { ttl: 10 })

    expect(client.set).toHaveBeenCalledWith('key', JSON.stringify({ a: 1 }), 'EX', 10)
  })

  it('sets values without TTL', async () => {
    const { client } = createMockRedis()
    const adapter = IgniterStoreRedisAdapter.create({ redis: client as any })

    await adapter.set('key', { a: 1 })

    expect(client.set).toHaveBeenCalledWith('key', JSON.stringify({ a: 1 }))
  })

  it('uses SET with NX when ttl is provided for setNX', async () => {
    const { client } = createMockRedis()
    const adapter = IgniterStoreRedisAdapter.create({ redis: client as any })

    await adapter.setNX('lock', 'value', { ttl: 5 })

    expect(client.set).toHaveBeenCalledWith('lock', JSON.stringify('value'), 'EX', 5, 'NX')
  })

  it('uses SETNX when ttl is not provided', async () => {
    const { client } = createMockRedis()
    const adapter = IgniterStoreRedisAdapter.create({ redis: client as any })

    await adapter.setNX('lock', 'value')

    expect(client.setnx).toHaveBeenCalledWith('lock', JSON.stringify('value'))
  })

  it('publishes JSON payloads', async () => {
    const { client } = createMockRedis()
    const adapter = IgniterStoreRedisAdapter.create({ redis: client as any })

    await adapter.publish('channel', { hello: 'world' })

    expect(client.publish).toHaveBeenCalledWith('channel', JSON.stringify({ hello: 'world' }))
  })

  it('subscribes using the subscriber client', async () => {
    const { client, subscriber } = createMockRedis()
    const adapter = IgniterStoreRedisAdapter.create({ redis: client as any })

    const handler = vi.fn()
    await adapter.subscribe('channel', handler)

    expect(subscriber.subscribe).toHaveBeenCalledWith('channel')
  })

  it('unsubscribes using the subscriber client', async () => {
    const { client, subscriber } = createMockRedis()
    const adapter = IgniterStoreRedisAdapter.create({ redis: client as any })

    const handler = vi.fn()
    await adapter.subscribe('channel', handler)
    await adapter.unsubscribe('channel', handler)

    expect(subscriber.unsubscribe).toHaveBeenCalledWith('channel')
  })

  it('serializes stream messages', async () => {
    const { client } = createMockRedis()
    const adapter = IgniterStoreRedisAdapter.create({ redis: client as any })

    await adapter.xadd('stream', { a: 1 })

    expect(client.xadd).toHaveBeenCalledWith(
      'stream',
      '*',
      'data',
      JSON.stringify({ a: 1 }),
    )
  })
})
