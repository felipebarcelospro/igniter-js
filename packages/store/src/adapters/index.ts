/**
 * @fileoverview Adapter exports for @igniter-js/store
 * @module @igniter-js/store/adapters
 */

export { IgniterStoreRedisAdapter, createIgniterStoreRedisAdapter } from './redis.adapter'
export type { IgniterStoreRedisAdapterOptions } from './redis.adapter'

// Aliases for convenience
export { IgniterStoreRedisAdapter as RedisStoreAdapter } from './redis.adapter'
export { createIgniterStoreRedisAdapter as createRedisStoreAdapter } from './redis.adapter'
export type { IgniterStoreRedisAdapterOptions as RedisStoreAdapterOptions } from './redis.adapter'
