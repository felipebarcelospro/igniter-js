/**
 * @fileoverview Main entry point for @igniter-js/store
 * @module @igniter-js/store
 *
 * @description
 * A type-safe, multi-tenant distributed store library for Igniter.js.
 * Provides key-value storage, counters, claims (distributed locks), batch operations,
 * events (pub/sub messaging), and Redis Streams with full TypeScript support.
 *
 * @example
 * ```typescript
 * import { IgniterStore, RedisStoreAdapter, IgniterStoreEvents } from '@igniter-js/store'
 * import { z } from 'zod'
 * import Redis from 'ioredis'
 *
 * // 1. Define events per feature (recommended pattern)
 * const UserEvents = IgniterStoreEvents
 *   .event('created', z.object({
 *     userId: z.string(),
 *     email: z.string().email(),
 *   }))
 *   .event('deleted', z.object({
 *     userId: z.string(),
 *   }))
 *   .group('notifications', (group) =>
 *     group
 *       .event('email', z.object({ to: z.string(), subject: z.string() }))
 *       .event('push', z.object({ token: z.string(), title: z.string() }))
 *   )
 *   .build()
 *
 * // 2. Create Redis client and adapter
 * const redis = new Redis()
 * const adapter = RedisStoreAdapter.create({ redis })
 *
 * // 3. Create the store instance with events
 * const store = IgniterStore.create()
 *   .withAdapter(adapter)
 *   .withService('my-api')
 *   .withEnvironment(process.env.NODE_ENV ?? 'development')
 *   .addEvents('user', UserEvents)
 *   .build()
 *
 * // 4. Use key-value operations
 * await store.kv.set('user:123', { name: 'Alice' }, { ttl: 3600 })
 * const user = await store.kv.get('user:123')
 *
 * // 5. Use counters
 * const viewCount = await store.counter.increment('page-views')
 * await store.counter.decrement('available-slots')
 *
 * // 6. Use claims (distributed locks)
 * const claimed = await store.claim.once('process:abc', 'worker-1', { ttl: 30 })
 *
 * // 7. Use batch operations
 * const users = await store.batch.get(['user:1', 'user:2', 'user:3'])
 *
 * // 8. Use typed events (string-based API)
 * const off = await store.events.subscribe('user:created', (msg) => {
 *   console.log('User created:', msg.userId, msg.email) // Fully typed!
 * })
 * await store.events.publish('user:created', { userId: '123', email: 'test@example.com' })
 * await off() // Unsubscribe
 *
 * // 9. Use typed events (proxy-based API)
 * const off2 = await store.events.user.created.subscribe((msg) => console.log(msg))
 * await store.events.user.created.publish({ userId: '123', email: 'test@example.com' })
 * await off2()
 *
 * // 10. Use streams
 * const messageId = await store.streams.append('events', { type: 'click', x: 100 })
 * const consumer = store.streams.group('processors', 'worker-1')
 * await consumer.ensure('events')
 * const messages = await consumer.read('events', { count: 10 })
 *
 * // 11. Use scoped stores for multi-tenancy
 * const orgStore = store.scope('organization', 'org_123')
 * await orgStore.kv.set('settings', { theme: 'dark' })
 * // Key: ign:store:development:my-api:organization:org_123:kv:settings
 * ```
 */

// =============================================================================
// CORE EXPORTS
// =============================================================================

export { IgniterStore } from './core/igniter-store'
export type {
  IgniterStoreKV,
  IgniterStoreCounter,
  IgniterStoreClaim,
  IgniterStoreBatch,
  IgniterStoreEventsAPI,
  IgniterStoreEvents,
  IgniterStoreDev,
  IgniterStoreStreams,
} from './core/igniter-store'

// =============================================================================
// BUILDER EXPORTS
// =============================================================================

export { IgniterStoreBuilder } from './builders/igniter-store.builder'
export type { IgniterStoreBuilderState } from './builders/igniter-store.builder'

// =============================================================================
// ADAPTER EXPORTS
// =============================================================================

export { IgniterStoreRedisAdapter, createIgniterStoreRedisAdapter } from './adapters/redis.adapter'
export type { IgniterStoreRedisAdapterOptions } from './adapters/redis.adapter'

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

// New events API
export { IgniterStoreEvents as IgniterStoreEventsBuilder, IgniterStoreEventsGroup } from './utils/events'

// Legacy exports (backwards compatibility)
export { IgniterStoreEventsSchema, IgniterStoreEventsSchemaGroup } from './utils/events'

export { StoreKeyBuilder } from './utils/key-builder'
export type { StoreKeyBuilderOptions } from './utils/key-builder'

// =============================================================================
// ERROR EXPORTS
// =============================================================================

export {
  IgniterStoreError,
  IGNITER_STORE_ERROR_CODES,
} from './errors/igniter-store.error'
export type {
  IgniterStoreErrorCode,
  IgniterStoreErrorMetadata,
  IgniterStoreErrorPayload,
} from './errors/igniter-store.error'

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  // Adapter types
  IgniterStoreAdapter,
  IgniterStoreKeyValueOptions,
  IgniterStoreEventCallback,
  IgniterStoreBatchEntry,
  IgniterStoreScanResult,
  IgniterStoreScanOptions,
  IgniterStoreStreamAppendOptions,
  IgniterStoreStreamReadOptions,
  IgniterStoreStreamMessage,
  IgniterStoreStreamConsumerGroup,
  IgniterStoreAdapterFactory,
} from './types/adapter'

export type {
  // Config types
  IgniterStoreConfig,
  IgniterStoreKeyNamespace,
} from './types/config'

export type {
  // Events types
  IgniterStoreEventSchema,
  IgniterStoreEventsMap,
  IgniterStoreEventsRegistry,
  IgniterStoreFlattenEventKeys,
  IgniterStoreFlattenRegistryKeys,
  IgniterStoreGetEventSchema,
  IgniterStoreInferEventSchema,
  IgniterStoreEventsValidationOptions,
  IgniterStoreEventContext,
  IgniterStoreEventContextHandler,
  IgniterStoreUnsubscribeFn,
  IgniterStoreMatchingEventKeys,
  IgniterStoreWildcardEventContext,
  IgniterStoreEventAccessor,
  IgniterStoreEventsProxy,
  IgniterStoreEventsRegistryProxy,
  ReservedNamespace,
  ReservedKeyPrefix,
  RESERVED_NAMESPACES,
  RESERVED_KEY_PREFIXES,
} from './types/events'

// Legacy schema exports (backwards compatibility)
export type {
  IgniterStoreSchemaMap,
  IgniterStoreFlattenKeys,
  IgniterStoreGetSchema,
  IgniterStoreInferSchema,
  IgniterStoreSchemaValidationOptions,
} from './types/schema'

export type {
  // Scope types
  IgniterStoreScopeEntry,
  IgniterStoreScopeChain,
  IgniterStoreScopeIdentifier,
  IgniterStoreScopeOptions,
  IgniterStoreActorOptions,
  IgniterStoreScopeDefinition,
  IgniterStoreActorDefinition,
  IgniterStoreActorEntry,
} from './types/scope'

export type {
  // Serializer types
  IgniterStoreSerializer,
} from './types/serializer'

export { DEFAULT_SERIALIZER } from './types/serializer'
