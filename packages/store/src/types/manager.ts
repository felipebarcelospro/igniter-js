/**
 * @fileoverview Manager interface for @igniter-js/store
 * @module @igniter-js/store/types/manager
 */

import type { IgniterLogger } from "@igniter-js/core";
import type { IgniterStoreEventContextHandler, IgniterStoreEventsRegistry, IgniterStoreEventsRegistryProxy, IgniterStoreFlattenRegistryKeys, IgniterStoreGetEventSchema, IgniterStoreInferEventSchema, IgniterStoreUnsubscribeFn, IgniterStoreWildcardEventContext } from "./events";
import type { IgniterStoreScopeIdentifier } from "./scope";
import type { IgniterStoreScanOptions, IgniterStoreScanResult, IgniterStoreStreamAppendOptions, IgniterStoreStreamConsumerGroup } from "./adapter";



/**
 * Key-value operations interface.
 */
export interface IgniterStoreKV {
  get<T = unknown>(key: string): Promise<T | null>
  set(key: string, value: unknown, options?: { ttl?: number }): Promise<void>
  remove(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  expire(key: string, ttlSeconds: number): Promise<void>
  touch(key: string, ttlSeconds: number): Promise<void>
}

/**
 * Counter operations interface.
 */
export interface IgniterStoreCounter {
  increment(key: string): Promise<number>
  decrement(key: string): Promise<number>
  expire(key: string, ttlSeconds: number): Promise<void>
}

/**
 * Claim operations interface for distributed locks/claims.
 */
export interface IgniterStoreClaim {
  once(key: string, value: unknown, options?: { ttl?: number }): Promise<boolean>
}

/**
 * Batch operations interface.
 */
export interface IgniterStoreBatch {
  get<T = unknown>(keys: string[]): Promise<(T | null)[]>
  set(entries: Array<{ key: string; value: unknown; ttl?: number }>): Promise<void>
}


/**
 * Events operations interface with string-based and proxy-based APIs.
 *
 * @typeParam TRegistry - The events registry type
 *
 * @example
 * ```typescript
 * // String-based API
 * await store.events.publish('user:created', { userId: '123', email: 'a@b.com' })
 * const off = await store.events.subscribe('user:created', (ctx) => {
 *   console.log(ctx.type, ctx.data, ctx.timestamp)
 * })
 * await off()
 *
 * // Proxy-based API
 * await store.events.user.created.publish({ userId: '123', email: 'a@b.com' })
 * const off2 = await store.events.user.created.subscribe((ctx) => {
 *   console.log(ctx.type, ctx.data, ctx.timestamp)
 * })
 * await off2()
 *
 * // Wildcard subscriptions (reactive typing)
 * const off3 = await store.events.subscribe('user:*', (ctx) => {
 *   // ctx.type is 'user:created' | 'user:deleted' | ...
 *   // ctx.data is the union of all user event payloads
 * })
 * ```
 */
export interface IgniterStoreEventsAPI<TRegistry extends IgniterStoreEventsRegistry> {
  /**
   * Publishes a message to an event channel.
   *
   * @param event - The event name (e.g., 'user:created')
   * @param message - The message payload
   */
  publish<TEvent extends IgniterStoreFlattenRegistryKeys<TRegistry> | string>(
    event: TEvent,
    message: TEvent extends IgniterStoreFlattenRegistryKeys<TRegistry>
      ? IgniterStoreInferEventSchema<IgniterStoreGetEventSchema<TRegistry, TEvent>>
      : unknown,
  ): Promise<void>

  /**
   * Subscribes to an event channel.
   *
   * The handler receives a context object with:
   * - `type`: The event type (e.g., 'user:created')
   * - `data`: The event payload
   * - `timestamp`: ISO timestamp when published
   * - `scope?`: The current scope (if scoped)
   *
   * @param event - The event name or pattern (supports wildcards like 'user:*' or '*')
   * @param handler - The callback to invoke when messages are received
   * @returns An unsubscribe function
   */
  subscribe<TEvent extends IgniterStoreFlattenRegistryKeys<TRegistry> | string>(
    event: TEvent,
    handler: IgniterStoreEventContextHandler<IgniterStoreWildcardEventContext<TRegistry, TEvent>>,
  ): Promise<IgniterStoreUnsubscribeFn>
}

/**
 * Combined events interface that has both the API methods and the proxy accessors.
 */
export type IgniterStoreEventsManager<TRegistry extends IgniterStoreEventsRegistry> =
  IgniterStoreEventsAPI<TRegistry> & IgniterStoreEventsRegistryProxy<TRegistry>

/**
 * Development/debugging operations interface.
 */
export interface IgniterStoreDev {
  scan(pattern: string, options?: IgniterStoreScanOptions): Promise<IgniterStoreScanResult>
}

/**
 * Stream operations interface.
 */
export interface IgniterStoreStreams {
  append(stream: string, message: unknown, options?: IgniterStoreStreamAppendOptions): Promise<string>
  group(group: string, consumer: string): IgniterStoreStreamConsumerGroup
}

/**
 * Main interface for IgniterStoreManager.
 * Defines the public API for the store manager.
 *
 * @typeParam TRegistry - The events registry type for typed pub/sub
 * @typeParam TScopes - The typed scope keys
 */
export interface IIgniterStoreManager<
  TRegistry extends IgniterStoreEventsRegistry = IgniterStoreEventsRegistry,
  TScopes extends string = string,
> {
  /** Key-value operations */
  readonly kv: IgniterStoreKV;

  /** Counter operations */
  readonly counter: IgniterStoreCounter;

  /** Claim (distributed lock) operations */
  readonly claim: IgniterStoreClaim;

  /** Batch operations */
  readonly batch: IgniterStoreBatch;

  /** Development/debugging operations */
  readonly dev: IgniterStoreDev;

  /** Logger instance */
  readonly logger: IgniterLogger | undefined;

  /** Events pub/sub accessor */
  readonly events: IgniterStoreEventsAPI<TRegistry>;

  /** Stream operations */
  readonly streams: IgniterStoreStreams;

  /**
   * Creates a scoped store instance.
   * @param scopeKey - The scope type
   * @param identifier - The scope identifier
   * @returns A new scoped store instance
   */
  scope<TScopeKey extends TScopes>(
    scopeKey: [TScopes] extends [never] ? string : TScopeKey,
    identifier: IgniterStoreScopeIdentifier,
  ): IIgniterStoreManager<TRegistry, TScopes>;
}
