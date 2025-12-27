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
 * import { IgniterStore, IgniterStoreRedisAdapter, IgniterStoreEvents } from '@igniter-js/store'
 * import { z } from 'zod'
 * import Redis from 'ioredis'
 *
 * // 1. Define events per feature (recommended pattern)
 * const UserEvents = IgniterStoreEvents
 *   .create('user')
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
 * const adapter = IgniterStoreRedisAdapter.create({ redis })
 *
 * // 3. Create the store instance with events
 * const store = IgniterStore.create()
 *   .withAdapter(adapter)
 *   .withService('my-api')
 *   .addEvents(UserEvents)
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
 * // Key: igniter:store:my-api:organization:org_123:kv:settings
 * ```
 */

// =============================================================================
// CORE EXPORTS
// =============================================================================

export * from './core'
export type * from './core'

// =============================================================================
// BUILDER EXPORTS
// =============================================================================

export * from './builders'
export type * from './builders'

// =============================================================================
// ADAPTER EXPORTS
// =============================================================================

export * from './adapters'
export type * from './adapters'

// =============================================================================
// ERROR EXPORTS
// =============================================================================

export * from './errors'
export type * from './errors'

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export * from './types'
export type * from './types'
