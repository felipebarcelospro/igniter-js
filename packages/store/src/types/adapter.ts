/**
 * @fileoverview Adapter interface and types for @igniter-js/store
 * @module @igniter-js/store/types/adapter
 */

/**
 * Options for setting a key-value pair in the store.
 *
 * @example
 * ```typescript
 * await store.kv.set('user:123', user, { ttl: 3600 }) // 1 hour TTL
 * ```
 */
export interface IgniterStoreKeyValueOptions {
  /**
   * Time-to-live for the key, in seconds.
   */
  ttl?: number
}

/**
 * Callback function for handling messages from a subscribed channel.
 *
 * @param message - The message received from the channel, automatically parsed.
 *
 * @example
 * ```typescript
 * const callback: IgniterStoreEventCallback<{ userId: string }> = (message) => {
 *   console.log(message.userId)
 * }
 * ```
 */
export type IgniterStoreEventCallback<T = any> = (
  message: T,
) => void | Promise<void>

/**
 * Entry for batch operations.
 *
 * @example
 * ```typescript
 * const entries: IgniterStoreBatchEntry[] = [
 *   { key: 'user:1', value: { name: 'Alice' }, ttl: 3600 },
 *   { key: 'user:2', value: { name: 'Bob' } },
 * ]
 * await store.batch.set(entries)
 * ```
 */
export interface IgniterStoreBatchEntry {
  /** The key to store */
  key: string
  /** The value to store */
  value: any
  /** Optional TTL in seconds */
  ttl?: number
}

/**
 * Result from a scan operation.
 *
 * @example
 * ```typescript
 * const result = await store.dev.scan('user:*')
 * console.log(result.keys) // ['user:1', 'user:2', ...]
 * console.log(result.cursor) // '42' or '0' if finished
 * ```
 */
export interface IgniterStoreScanResult {
  /** Array of matching keys */
  keys: string[]
  /** Cursor for pagination, '0' means scan complete */
  cursor: string
}

/**
 * Options for scan operations.
 *
 * @example
 * ```typescript
 * const result = await store.dev.scan('user:*', {
 *   cursor: '0',
 *   count: 100,
 * })
 * ```
 */
export interface IgniterStoreScanOptions {
  /** Cursor for pagination (default: '0') */
  cursor?: string
  /** Number of elements to return per iteration (default: 10) */
  count?: number
}

/**
 * Options for stream append operations.
 *
 * @example
 * ```typescript
 * await store.stream.append('events', payload, {
 *   maxLen: 10000,
 *   approximate: true,
 * })
 * ```
 */
export interface IgniterStoreStreamAppendOptions {
  /** Maximum length of the stream (uses MAXLEN) */
  maxLen?: number
  /** Use approximate trimming (~) for better performance */
  approximate?: boolean
}

/**
 * Options for stream read operations.
 *
 * @example
 * ```typescript
 * const messages = await consumer.read('events', {
 *   count: 10,
 *   blockMs: 5000,
 * })
 * ```
 */
export interface IgniterStoreStreamReadOptions {
  /** Maximum number of messages to read */
  count?: number
  /** Block for this many milliseconds waiting for messages (0 = non-blocking) */
  blockMs?: number
}

/**
 * Options for ensuring a consumer group exists.
 *
 * @example
 * ```typescript
 * await consumer.ensure('events', { startId: '$' }) // Start from latest
 * await consumer.ensure('events', { startId: '0' }) // Start from beginning
 * ```
 */
export interface IgniterStoreStreamGroupEnsureOptions {
  /** Start reading from this ID (default: '0' for beginning, '$' for latest) */
  startId?: string
}

/**
 * A message from a stream.
 *
 * @example
 * ```typescript
 * const messages = await consumer.read('events')
 * for (const msg of messages) {
 *   console.log(msg.id, msg.message)
 *   await consumer.ack('events', [msg.id])
 * }
 * ```
 */
export interface IgniterStoreStreamMessage<T = any> {
  /** The message ID */
  id: string
  /** The message payload */
  message: T
}

/**
 * Stream consumer group interface for reading messages as a consumer.
 *
 * @example
 * ```typescript
 * const consumer = store.stream.group('my-group', 'consumer-1')
 * await consumer.ensure('events')
 * const messages = await consumer.read('events', { count: 10 })
 * await consumer.ack('events', messages.map(m => m.id))
 * ```
 */
export interface IgniterStoreStreamConsumerGroup {
  /**
   * Ensures the consumer group exists for a stream.
   * This is idempotent - calling multiple times is safe.
   *
   * @param stream - The stream name
   * @param options - Options for group creation
   */
  ensure(
    stream: string,
    options?: IgniterStoreStreamGroupEnsureOptions,
  ): Promise<void>

  /**
   * Reads messages from the stream as this consumer.
   *
   * @param stream - The stream name
   * @param options - Read options
   * @returns Array of messages
   */
  read<T = any>(
    stream: string,
    options?: IgniterStoreStreamReadOptions,
  ): Promise<IgniterStoreStreamMessage<T>[]>

  /**
   * Acknowledges processing of messages.
   *
   * @param stream - The stream name
   * @param ids - Array of message IDs to acknowledge
   */
  ack(stream: string, ids: string[]): Promise<void>
}

/**
 * Extended store adapter interface with full support for streams, batch operations,
 * and advanced Redis features.
 *
 * This interface extends the basic IgniterStoreAdapter from @igniter-js/core
 * with additional methods needed for the full Store API.
 *
 * @typeParam TClient - The underlying client type (e.g., Redis)
 *
 * @example
 * ```typescript
 * const adapter = createRedisStoreAdapter(redisClient)
 * // Basic operations
 * await adapter.get('key')
 * await adapter.set('key', 'value', { ttl: 3600 })
 * // Stream operations
 * await adapter.xadd('stream', { event: 'data' })
 * ```
 */
export interface IgniterStoreAdapter<TClient = unknown> {
  /**
   * The underlying client instance (e.g., Redis client).
   * Can be used for advanced operations not covered by the adapter.
   */
  readonly client: TClient

  // --- Key-Value Operations ---

  /**
   * Retrieves a value from the store by its key.
   *
   * @param key - The key to retrieve
   * @returns The value if found (auto-deserialized), otherwise null
   */
  get<T = any>(key: string): Promise<T | null>

  /**
   * Stores a value in the store.
   *
   * @param key - The key to store the value under
   * @param value - The value to store (will be auto-serialized)
   * @param options - Configuration options, such as TTL
   */
  set(key: string, value: any, options?: IgniterStoreKeyValueOptions): Promise<void>

  /**
   * Deletes a key from the store.
   *
   * @param key - The key to delete
   */
  delete(key: string): Promise<void>

  /**
   * Checks if a key exists in the store.
   *
   * @param key - The key to check
   * @returns True if the key exists
   */
  has(key: string): Promise<boolean>

  /**
   * Atomically increments a numeric value stored at a key.
   * If the key does not exist, it is set to 0 before incrementing.
   *
   * @param key - The key to increment
   * @param delta - The amount to increment by (default: 1)
   * @returns The new value after incrementing
   */
  increment(key: string, delta?: number): Promise<number>

  /**
   * Sets a time-to-live (TTL) on a key, in seconds.
   *
   * @param key - The key to set the expiration on
   * @param ttl - The TTL in seconds
   */
  expire(key: string, ttl: number): Promise<void>

  /**
   * Atomically sets a key only if it does not exist (SETNX).
   * Used for distributed locks and claim operations.
   *
   * @param key - The key to set
   * @param value - The value to set
   * @param options - Configuration options, such as TTL
   * @returns True if the key was set, false if it already existed
   */
  setNX(key: string, value: any, options?: IgniterStoreKeyValueOptions): Promise<boolean>

  // --- Batch Operations ---

  /**
   * Retrieves multiple values from the store.
   *
   * @param keys - Array of keys to retrieve
   * @returns Array of values (null for missing keys)
   */
  mget<T = any>(keys: string[]): Promise<(T | null)[]>

  /**
   * Stores multiple values in the store.
   *
   * @param entries - Array of key-value pairs with optional TTL
   */
  mset(entries: IgniterStoreBatchEntry[]): Promise<void>

  // --- Pub/Sub Operations ---

  /**
   * Publishes a message to a specific channel.
   *
   * @param channel - The channel to publish the message to
   * @param message - The message to publish (will be auto-serialized)
   */
  publish(channel: string, message: any): Promise<void>

  /**
   * Subscribes to a channel to receive messages.
   *
   * @param channel - The channel to subscribe to
   * @param callback - The function to execute when a message is received
   */
  subscribe(channel: string, callback: IgniterStoreEventCallback): Promise<void>

  /**
   * Unsubscribes from a channel.
   *
   * @param channel - The channel to unsubscribe from
   * @param callback - Optional specific callback to remove
   */
  unsubscribe(channel: string, callback?: IgniterStoreEventCallback): Promise<void>

  // --- Scan Operations ---

  /**
   * Scans keys matching a pattern.
   *
   * @param pattern - The pattern to match (e.g., 'user:*')
   * @param options - Scan options
   * @returns Scan result with keys and cursor
   */
  scan(pattern: string, options?: IgniterStoreScanOptions): Promise<IgniterStoreScanResult>

  // --- Stream Operations ---

  /**
   * Appends a message to a stream.
   *
   * @param stream - The stream name
   * @param message - The message to append
   * @param options - Append options
   * @returns The message ID
   */
  xadd(
    stream: string,
    message: any,
    options?: IgniterStoreStreamAppendOptions,
  ): Promise<string>

  /**
   * Creates a consumer group for a stream.
   * This is idempotent - calling multiple times is safe.
   *
   * @param stream - The stream name
   * @param group - The group name
   * @param startId - The ID to start reading from (default: '0')
   */
  xgroupCreate(stream: string, group: string, startId?: string): Promise<void>

  /**
   * Reads messages from a stream as a consumer in a group.
   *
   * @param stream - The stream name
   * @param group - The group name
   * @param consumer - The consumer name
   * @param options - Read options
   * @returns Array of messages
   */
  xreadgroup<T = any>(
    stream: string,
    group: string,
    consumer: string,
    options?: IgniterStoreStreamReadOptions,
  ): Promise<IgniterStoreStreamMessage<T>[]>

  /**
   * Acknowledges processing of messages in a consumer group.
   *
   * @param stream - The stream name
   * @param group - The group name
   * @param ids - Array of message IDs to acknowledge
   */
  xack(stream: string, group: string, ids: string[]): Promise<void>
}

/**
 * Factory function type for creating store adapters.
 *
 * @example
 * ```typescript
 * const redisAdapterFactory: IgniterStoreAdapterFactory<Redis> = (client) => ({
 *   client,
 *   get: (key) => client.get(key),
 *   // ... other methods
 * })
 * ```
 */
export type IgniterStoreAdapterFactory<TClient = unknown> = (
  client: TClient,
) => IgniterStoreAdapter<TClient>
