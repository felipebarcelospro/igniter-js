/**
 * @fileoverview Redis store adapter with full support for KV, Pub/Sub, and Streams
 * @module @igniter-js/store/adapters/redis
 *
 * @description
 * This adapter provides a complete Redis implementation for the IgniterStoreAdapter interface.
 * It supports all store operations including key-value, pub/sub, batch operations, and streams.
 *
 * @example
 * ```typescript
 * import Redis from 'ioredis'
 * import { IgniterStoreRedisAdapter } from '@igniter-js/store/adapters'
 *
 * const redis = new Redis()
 * const adapter = IgniterStoreRedisAdapter.create({ redis })
 *
 * // Use with IgniterStore
 * const store = IgniterStore.create()
 *   .withAdapter(adapter)
 *   .withService('my-api')
 *   .build()
 * ```
 */

import type { Redis } from 'ioredis'
import type {
  IgniterStoreAdapter,
  IgniterStoreKeyValueOptions,
  IgniterStoreEventCallback,
  IgniterStoreBatchEntry,
  IgniterStoreScanResult,
  IgniterStoreScanOptions,
  IgniterStoreStreamAppendOptions,
  IgniterStoreStreamReadOptions,
  IgniterStoreStreamMessage,
} from '../types/adapter'

/**
 * Options for creating a Redis store adapter.
 *
 * @example
 * ```typescript
 * const options: IgniterStoreRedisAdapterOptions = {
 *   redis: new Redis(),
 * }
 * ```
 */
export interface IgniterStoreRedisAdapterOptions {
  /** The Redis client instance */
  redis: Redis
}

/**
 * Check if code is running on server side.
 * Uses globalThis for broader compatibility.
 */
const isServer =
  typeof globalThis !== 'undefined' &&
  typeof (globalThis as Record<string, unknown>).window === 'undefined'

/**
 * Redis implementation of the IgniterStoreAdapter interface.
 *
 * Provides full support for:
 * - Key-value operations (get, set, delete, has, increment, expire)
 * - Atomic operations (setNX for claims)
 * - Batch operations (mget, mset)
 * - Pub/Sub (publish, subscribe, unsubscribe)
 * - Streams (xadd, xgroupCreate, xreadgroup, xack)
 * - Scanning (scan with pattern matching)
 *
 * @example
 * ```typescript
 * import Redis from 'ioredis'
 * import { IgniterStoreRedisAdapter } from '@igniter-js/store/adapters'
 *
 * const redis = new Redis({ host: 'localhost', port: 6379 })
 * const adapter = IgniterStoreRedisAdapter.create({ redis })
 *
 * // Basic operations
 * await adapter.set('key', { name: 'value' }, { ttl: 3600 })
 * const value = await adapter.get('key')
 *
 * // Pub/Sub
 * await adapter.subscribe('channel', (msg) => console.log(msg))
 * await adapter.publish('channel', { event: 'test' })
 *
 * // Streams
 * const id = await adapter.xadd('stream', { data: 'value' })
 * await adapter.xgroupCreate('stream', 'group')
 * const messages = await adapter.xreadgroup('stream', 'group', 'consumer')
 * ```
 */
export class IgniterStoreRedisAdapter implements IgniterStoreAdapter<Redis> {
  public readonly client: Redis
  private readonly subscriberClient: Redis
  private readonly subscribers: Map<string, Set<IgniterStoreEventCallback>>

  /**
   * Creates a new Redis store adapter instance.
   *
   * @param options - The adapter options
   * @returns A new IgniterStoreRedisAdapter instance
   *
   * @example
   * ```typescript
   * const adapter = IgniterStoreRedisAdapter.create({ redis: new Redis() })
   * ```
   */
  static create(options: IgniterStoreRedisAdapterOptions): IgniterStoreAdapter<Redis> {
    if (!isServer) {
      // Return a no-op adapter for client-side rendering
      return {} as IgniterStoreAdapter<Redis>
    }
    return new IgniterStoreRedisAdapter(options)
  }

  private constructor(options: IgniterStoreRedisAdapterOptions) {
    this.client = options.redis
    // A dedicated client for subscriptions is required by Redis design
    this.subscriberClient = this.client.duplicate()
    this.subscribers = new Map()

    // Centralized message handler for the subscriber client
    this.subscriberClient.on('message', (channel, message) => {
      const callbacks = this.subscribers.get(channel)
      if (callbacks) {
        try {
          const parsedMessage = JSON.parse(message)
          callbacks.forEach((cb) => cb(parsedMessage))
        } catch (error) {
          console.error(
            `[IgniterStoreRedisAdapter] Failed to parse message from channel "${channel}":`,
            error,
          )
        }
      }
    })
  }

  // --- Key-Value Operations ---

  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.client.get(key)
    if (value === null) {
      return null
    }
    try {
      return JSON.parse(value) as T
    } catch {
      // If parsing fails, return the raw value
      return value as unknown as T
    }
  }

  async set(
    key: string,
    value: any,
    options?: IgniterStoreKeyValueOptions,
  ): Promise<void> {
    const serializedValue = JSON.stringify(value)
    if (options?.ttl) {
      await this.client.set(key, serializedValue, 'EX', options.ttl)
    } else {
      await this.client.set(key, serializedValue)
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key)
  }

  async has(key: string): Promise<boolean> {
    const result = await this.client.exists(key)
    return result === 1
  }

  async increment(key: string, delta: number = 1): Promise<number> {
    if (delta === 1) {
      return this.client.incr(key)
    }
    return this.client.incrby(key, delta)
  }

  async expire(key: string, ttl: number): Promise<void> {
    await this.client.expire(key, ttl)
  }

  async setNX(
    key: string,
    value: any,
    options?: IgniterStoreKeyValueOptions,
  ): Promise<boolean> {
    const serializedValue = JSON.stringify(value)
    if (options?.ttl) {
      // Use SET with NX and EX flags
      const result = await this.client.set(
        key,
        serializedValue,
        'EX',
        options.ttl,
        'NX',
      )
      return result === 'OK'
    } else {
      const result = await this.client.setnx(key, serializedValue)
      return result === 1
    }
  }

  // --- Batch Operations ---

  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) {
      return []
    }
    const values = await this.client.mget(...keys)
    return values.map((value) => {
      if (value === null) {
        return null
      }
      try {
        return JSON.parse(value) as T
      } catch {
        return value as unknown as T
      }
    })
  }

  async mset(entries: IgniterStoreBatchEntry[]): Promise<void> {
    if (entries.length === 0) {
      return
    }

    // Group entries by TTL
    const withoutTtl: string[] = []
    const withTtl: Array<{ key: string; value: string; ttl: number }> = []

    for (const entry of entries) {
      const serializedValue = JSON.stringify(entry.value)
      if (entry.ttl) {
        withTtl.push({ key: entry.key, value: serializedValue, ttl: entry.ttl })
      } else {
        withoutTtl.push(entry.key, serializedValue)
      }
    }

    // Set entries without TTL using MSET
    if (withoutTtl.length > 0) {
      await this.client.mset(...withoutTtl)
    }

    // Set entries with TTL using pipeline
    if (withTtl.length > 0) {
      const pipeline = this.client.pipeline()
      for (const entry of withTtl) {
        pipeline.set(entry.key, entry.value, 'EX', entry.ttl)
      }
      await pipeline.exec()
    }
  }

  // --- Pub/Sub Operations ---

  async publish(channel: string, message: any): Promise<void> {
    await this.client.publish(channel, JSON.stringify(message))
  }

  async subscribe(
    channel: string,
    callback: IgniterStoreEventCallback,
  ): Promise<void> {
    let callbackSet = this.subscribers.get(channel)
    if (!callbackSet) {
      callbackSet = new Set()
      this.subscribers.set(channel, callbackSet)
      await this.subscriberClient.subscribe(channel)
    }
    callbackSet.add(callback)
  }

  async unsubscribe(
    channel: string,
    callback?: IgniterStoreEventCallback,
  ): Promise<void> {
    const callbackSet = this.subscribers.get(channel)
    if (!callbackSet) {
      return
    }

    if (callback) {
      callbackSet.delete(callback)
    } else {
      this.subscribers.delete(channel)
    }

    if (callbackSet.size === 0) {
      this.subscribers.delete(channel)
      await this.subscriberClient.unsubscribe(channel)
    }
  }

  // --- Scan Operations ---

  async scan(
    pattern: string,
    options?: IgniterStoreScanOptions,
  ): Promise<IgniterStoreScanResult> {
    const cursor = options?.cursor ?? '0'
    const count = options?.count ?? 10

    const result = await this.client.scan(
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      count,
    )

    return {
      cursor: result[0],
      keys: result[1],
    }
  }

  // --- Stream Operations ---

  async xadd(
    stream: string,
    message: any,
    options?: IgniterStoreStreamAppendOptions,
  ): Promise<string> {
    const args: (string | number)[] = [stream]

    // Add MAXLEN if specified
    if (options?.maxLen !== undefined) {
      args.push('MAXLEN')
      if (options.approximate) {
        args.push('~')
      }
      args.push(options.maxLen)
    }

    args.push('*') // Auto-generate ID

    // Flatten message object to key-value pairs
    const serialized = JSON.stringify(message)
    args.push('data', serialized)

    const result = await (this.client as any).xadd(...args)
    return result as string
  }

  async xgroupCreate(
    stream: string,
    group: string,
    startId: string = '0',
  ): Promise<void> {
    try {
      // MKSTREAM creates the stream if it doesn't exist
      await (this.client as any).xgroup(
        'CREATE',
        stream,
        group,
        startId,
        'MKSTREAM',
      )
    } catch (error: any) {
      // BUSYGROUP means group already exists - this is fine (idempotent)
      if (!error.message?.includes('BUSYGROUP')) {
        throw error
      }
    }
  }

  async xreadgroup<T = any>(
    stream: string,
    group: string,
    consumer: string,
    options?: IgniterStoreStreamReadOptions,
  ): Promise<IgniterStoreStreamMessage<T>[]> {
    const args: (string | number)[] = ['GROUP', group, consumer]

    if (options?.count !== undefined) {
      args.push('COUNT', options.count)
    }

    if (options?.blockMs !== undefined && options.blockMs > 0) {
      args.push('BLOCK', options.blockMs)
    }

    args.push('STREAMS', stream, '>') // '>' means only new messages

    const result = await (this.client as any).xreadgroup(...args)

    if (!result) {
      return []
    }

    const messages: IgniterStoreStreamMessage<T>[] = []

    // Parse result: [[stream, [[id, [key, value, ...]], ...]]]
    for (const [, streamMessages] of result) {
      for (const [id, fields] of streamMessages) {
        // Convert fields array to object
        const data: Record<string, string> = {}
        for (let i = 0; i < fields.length; i += 2) {
          data[fields[i]] = fields[i + 1]
        }

        try {
          const message = data.data ? JSON.parse(data.data) : data
          messages.push({ id, message })
        } catch {
          messages.push({ id, message: data as unknown as T })
        }
      }
    }

    return messages
  }

  async xack(stream: string, group: string, ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return
    }
    await (this.client as any).xack(stream, group, ...ids)
  }
}

/**
 * @deprecated Use `IgniterStoreRedisAdapter.create()` instead. This function will be removed in a future version.
 *
 * Creates a Redis store adapter for backward compatibility.
 *
 * @param redisClient - The Redis client instance
 * @returns An IgniterStoreAdapter instance
 *
 * @example
 * ```typescript
 * // Deprecated usage
 * const adapter = createIgniterStoreRedisAdapter(redis)
 *
 * // New usage
 * const adapter = IgniterStoreRedisAdapter.create({ redis })
 * ```
 */
export function createIgniterStoreRedisAdapter(redisClient: Redis): IgniterStoreAdapter<Redis> {
  return IgniterStoreRedisAdapter.create({ redis: redisClient })
}
