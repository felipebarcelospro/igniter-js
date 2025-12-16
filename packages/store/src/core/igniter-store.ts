/**
 * @fileoverview Core IgniterStore class with all store operations
 * @module @igniter-js/store/core
 *
 * @description
 * The main IgniterStore class provides a type-safe, scoped API for distributed storage.
 * It supports key-value operations, counters, claims, batch operations, events (pub/sub), streams,
 * and scoped instances for multi-tenant applications.
 *
 * @example
 * ```typescript
 * import { IgniterStore, RedisStoreAdapter, IgniterStoreEvents } from '@igniter-js/store'
 * import { z } from 'zod'
 * import Redis from 'ioredis'
 *
 * // Define events per feature
 * const UserEvents = IgniterStoreEvents
 *   .event('created', z.object({ userId: z.string(), email: z.string().email() }))
 *   .event('deleted', z.object({ userId: z.string() }))
 *   .build()
 *
 * const redis = new Redis()
 * const store = IgniterStore.create()
 *   .withAdapter(RedisStoreAdapter.create({ redis }))
 *   .withService('my-api')
 *   .withEnvironment('production')
 *   .addScope('organization', { required: true })
 *   .addActor('user')
 *   .addEvents('user', UserEvents)
 *   .build()
 *
 * // Key-value operations
 * await store.kv.set('user:123', { name: 'Alice' }, { ttl: 3600 })
 * const user = await store.kv.get('user:123')
 *
 * // Counters
 * await store.counter.increment('page-views')
 * await store.counter.decrement('available-slots')
 *
 * // Events (string-based) - ctx has type, data, timestamp, scope?, actor?
 * await store.events.publish('user:created', { userId: '123', email: 'a@b.com' })
 * const off = await store.events.subscribe('user:created', (ctx) => console.log(ctx.data))
 * await off()
 *
 * // Events (proxy-based)
 * await store.events.user.created.publish({ userId: '123', email: 'a@b.com' })
 * const off2 = await store.events.user.created.subscribe((ctx) => console.log(ctx.data))
 * await off2()
 *
 * // Scoped operations
 * const orgStore = store.scope('organization', 'org_123')
 * await orgStore.kv.set('settings', { theme: 'dark' })
 *
 * // Actor for events
 * const userStore = store.actor('user', 'user_456')
 * await userStore.events.user.created.publish({ userId: '789', email: 'b@c.com' })
 * // Event context will include actor: { key: 'user', identifier: 'user_456' }
 * ```
 */

import type { IgniterStoreConfig } from '../types/config'
import type {
  IgniterStoreAdapter,
  IgniterStoreStreamConsumerGroup,
  IgniterStoreStreamAppendOptions,
  IgniterStoreStreamReadOptions,
  IgniterStoreStreamMessage,
  IgniterStoreScanOptions,
  IgniterStoreScanResult,
} from '../types/adapter'
import type {
  IgniterStoreEventsRegistry,
  IgniterStoreFlattenRegistryKeys,
  IgniterStoreGetEventSchema,
  IgniterStoreInferEventSchema,
  IgniterStoreUnsubscribeFn,
  IgniterStoreEventAccessor,
  IgniterStoreEventsRegistryProxy,
  IgniterStoreEventsMap,
  IgniterStoreEventSchema,
  IgniterStoreEventContext,
  IgniterStoreEventContextHandler,
  IgniterStoreWildcardEventContext,
} from '../types/events'
import type { IgniterStoreScopeIdentifier, IgniterStoreActorEntry } from '../types/scope'
import { IgniterStoreBuilder } from '../builders/igniter-store.builder'
import { StoreKeyBuilder } from '../utils/key-builder'
import { IgniterStoreError } from '../errors/igniter-store.error'

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
   * - `actor?`: The actor that triggered the event (if set)
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
export type IgniterStoreEvents<TRegistry extends IgniterStoreEventsRegistry> =
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
 * Main IgniterStore class providing distributed storage operations.
 *
 * Features:
 * - **Key-Value (kv)**: Get, set, remove, exists, expire, touch
 * - **Counters (counter)**: Atomic increment/decrement
 * - **Claims (claim)**: Distributed locks with SETNX
 * - **Batch (batch)**: Multi-key get/set operations
 * - **Events (events)**: Typed publish/subscribe with string and proxy APIs
 * - **Streams (streams)**: Append and consumer group reading
 * - **Dev (dev)**: Debugging tools like scan
 * - **Scopes (scope)**: Multi-tenant isolation
 * - **Actors (actor)**: Event source identification
 *
 * @typeParam TRegistry - The events registry type for typed pub/sub
 * @typeParam TScopes - The typed scope keys (from addScope)
 * @typeParam TActors - The typed actor keys (from addActor)
 */
export class IgniterStore<
  TRegistry extends IgniterStoreEventsRegistry = IgniterStoreEventsRegistry,
  TScopes extends string = string,
  TActors extends string = string,
> {
  private readonly config: IgniterStoreConfig<TRegistry, TScopes, TActors>
  private readonly adapter: IgniterStoreAdapter
  private readonly keyBuilder: StoreKeyBuilder

  /** Key-value operations */
  public readonly kv: IgniterStoreKV

  /** Counter operations */
  public readonly counter: IgniterStoreCounter

  /** Claim (distributed lock) operations */
  public readonly claim: IgniterStoreClaim

  /** Batch operations */
  public readonly batch: IgniterStoreBatch

  /** Events (pub/sub) operations with string-based and proxy-based APIs */
  public readonly events: IgniterStoreEvents<TRegistry>

  /** Development/debugging operations */
  public readonly dev: IgniterStoreDev

  /** Stream operations */
  public readonly streams: IgniterStoreStreams

  /**
   * Creates a new store builder.
   *
   * @returns A new IgniterStoreBuilder instance
   */
  static create(): IgniterStoreBuilder<{}, never, never> {
    return IgniterStoreBuilder.create()
  }

  /**
   * @internal
   * Constructor is internal. Use `IgniterStore.create()` instead.
   */
  constructor(config: IgniterStoreConfig<TRegistry, TScopes, TActors>) {
    this.config = config
    this.adapter = config.adapter
    this.keyBuilder = new StoreKeyBuilder({
      keyPrefix: config.keyPrefix,
      environment: config.environment,
      service: config.service,
      scopeChain: config.scopeChain,
    })

    // Initialize operation namespaces
    this.kv = this.createKV()
    this.counter = this.createCounter()
    this.claim = this.createClaim()
    this.batch = this.createBatch()
    this.events = this.createEvents()
    this.dev = this.createDev()
    this.streams = this.createStreams()
  }

  /**
   * Logger instance from config.
   * 
   * @returns The IgniterLogger instance
   * 
   * @example
   * ```typescript
   * store.logger.info('Store initialized')
   * ```
   */
  get logger() {
    return this.config.logger
  }

  /**
   * Creates a scoped store instance.
   *
   * Scopes provide multi-tenant isolation by adding scope prefixes to all keys.
   * You can chain multiple scopes for hierarchical organization.
   *
   * If scopes were defined with `addScope()`, only those scope keys are allowed.
   * Otherwise, any scope key is accepted.
   *
   * @param scopeKey - The scope type (e.g., 'organization', 'workspace')
   * @param identifier - The scope identifier (e.g., 'org_123')
   * @returns A new scoped IgniterStore instance
   */
  scope<TScopeKey extends TScopes>(
    scopeKey: [TScopes] extends [never] ? string : TScopeKey,
    identifier: IgniterStoreScopeIdentifier,
  ): IgniterStore<TRegistry, TScopes, TActors> {
    if (!scopeKey) {
      throw new IgniterStoreError({
        code: 'STORE_SCOPE_KEY_REQUIRED',
        message: 'Scope key is required',
        statusCode: 400,
      })
    }

    if (identifier === undefined || identifier === null || identifier === '') {
      throw new IgniterStoreError({
        code: 'STORE_SCOPE_IDENTIFIER_REQUIRED',
        message: 'Scope identifier is required',
        statusCode: 400,
      })
    }

    // Validate scope key if definitions exist
    if (this.config.scopeDefinitions && Object.keys(this.config.scopeDefinitions).length > 0) {
      if (!(scopeKey in this.config.scopeDefinitions)) {
        throw new IgniterStoreError({
          code: 'STORE_INVALID_SCOPE_KEY',
          message: `Scope key "${scopeKey}" is not defined. Available scopes: ${Object.keys(this.config.scopeDefinitions).join(', ')}`,
          statusCode: 400,
          details: { scopeKey, availableScopes: Object.keys(this.config.scopeDefinitions) },
        })
      }
    }

    return new IgniterStore({
      ...this.config,
      scopeChain: [
        ...this.config.scopeChain,
        { key: scopeKey as string, identifier: String(identifier) },
      ],
    })
  }

  /**
   * Creates a store instance with an actor set for event context.
   *
   * The actor information is included in event contexts when publishing events,
   * allowing you to track who/what triggered an event.
   *
   * If actors were defined with `addActor()`, only those actor keys are allowed.
   * Otherwise, any actor key is accepted.
   *
   * @param actorKey - The actor type (e.g., 'user', 'system', 'service')
   * @param identifier - The actor identifier (e.g., 'user_123')
   * @returns A new IgniterStore instance with the actor set
   *
   * @example
   * ```typescript
   * // Set actor when publishing events
   * const userStore = store.actor('user', 'user_123')
   * await userStore.events.user.created.publish({ userId: '456' })
   * // Event context will include: actor: { key: 'user', identifier: 'user_123' }
   * ```
   */
  actor<TActorKey extends TActors>(
    actorKey: [TActors] extends [never] ? string : TActorKey,
    identifier: string,
  ): IgniterStore<TRegistry, TScopes, TActors> {
    if (!actorKey) {
      throw new IgniterStoreError({
        code: 'STORE_ACTOR_KEY_REQUIRED',
        message: 'Actor key is required',
        statusCode: 400,
      })
    }

    if (!identifier) {
      throw new IgniterStoreError({
        code: 'STORE_ACTOR_IDENTIFIER_REQUIRED',
        message: 'Actor identifier is required',
        statusCode: 400,
      })
    }

    // Validate actor key if definitions exist
    if (this.config.actorDefinitions && Object.keys(this.config.actorDefinitions).length > 0) {
      if (!(actorKey in this.config.actorDefinitions)) {
        throw new IgniterStoreError({
          code: 'STORE_INVALID_ACTOR_KEY',
          message: `Actor key "${actorKey}" is not defined. Available actors: ${Object.keys(this.config.actorDefinitions).join(', ')}`,
          statusCode: 400,
          details: { actorKey, availableActors: Object.keys(this.config.actorDefinitions) },
        })
      }
    }

    return new IgniterStore({
      ...this.config,
      actor: { key: actorKey as string, identifier },
    })
  }

  // --- Private factory methods ---

  private createKV(): IgniterStoreKV {
    return {
      get: async <T = unknown>(key: string): Promise<T | null> => {
        const fullKey = this.keyBuilder.build('kv', key)
        return this.adapter.get<T>(fullKey)
      },

      set: async (key: string, value: unknown, options?: { ttl?: number }): Promise<void> => {
        const fullKey = this.keyBuilder.build('kv', key)
        await this.adapter.set(fullKey, value, options)
      },

      remove: async (key: string): Promise<void> => {
        const fullKey = this.keyBuilder.build('kv', key)
        await this.adapter.delete(fullKey)
      },

      exists: async (key: string): Promise<boolean> => {
        const fullKey = this.keyBuilder.build('kv', key)
        return this.adapter.has(fullKey)
      },

      expire: async (key: string, ttlSeconds: number): Promise<void> => {
        const fullKey = this.keyBuilder.build('kv', key)
        await this.adapter.expire(fullKey, ttlSeconds)
      },

      touch: async (key: string, ttlSeconds: number): Promise<void> => {
        const fullKey = this.keyBuilder.build('kv', key)
        await this.adapter.expire(fullKey, ttlSeconds)
      },
    }
  }

  private createCounter(): IgniterStoreCounter {
    return {
      increment: async (key: string): Promise<number> => {
        const fullKey = this.keyBuilder.build('counter', key)
        return this.adapter.increment(fullKey, 1)
      },

      decrement: async (key: string): Promise<number> => {
        const fullKey = this.keyBuilder.build('counter', key)
        return this.adapter.increment(fullKey, -1)
      },

      expire: async (key: string, ttlSeconds: number): Promise<void> => {
        const fullKey = this.keyBuilder.build('counter', key)
        await this.adapter.expire(fullKey, ttlSeconds)
      },
    }
  }

  private createClaim(): IgniterStoreClaim {
    return {
      once: async (key: string, value: unknown, options?: { ttl?: number }): Promise<boolean> => {
        const fullKey = this.keyBuilder.build('claim', key)
        return this.adapter.setNX(fullKey, value, options)
      },
    }
  }

  private createBatch(): IgniterStoreBatch {
    return {
      get: async <T = unknown>(keys: string[]): Promise<(T | null)[]> => {
        if (keys.length === 0) {
          return []
        }
        const fullKeys = keys.map((key) => this.keyBuilder.build('kv', key))
        return this.adapter.mget<T>(fullKeys)
      },

      set: async (entries: Array<{ key: string; value: unknown; ttl?: number }>): Promise<void> => {
        if (entries.length === 0) {
          return
        }
        const fullEntries = entries.map((entry) => ({
          key: this.keyBuilder.build('kv', entry.key),
          value: entry.value,
          ttl: entry.ttl,
        }))
        await this.adapter.mset(fullEntries)
      },
    }
  }

  private createEvents(): IgniterStoreEvents<TRegistry> {
    // Create the base API with publish/subscribe
    // We use `as any` here because the implementation is generic but we need to
    // satisfy the strongly-typed interface. Type safety is enforced at the API level.
    const baseAPI = {
      publish: async (event: string, message: unknown): Promise<void> => {
        const fullChannel = this.keyBuilder.build('events', event)

        // Build the event envelope with context
        const envelope: IgniterStoreEventContext = {
          type: event,
          data: message,
          timestamp: new Date().toISOString(),
        }

        // Add scope if present
        if (this.config.scopeChain.length > 0) {
          const lastScope = this.config.scopeChain[this.config.scopeChain.length - 1]
          envelope.scope = {
            key: lastScope.key,
            identifier: lastScope.identifier,
          }
        }

        // Add actor if present
        if (this.config.actor) {
          envelope.actor = {
            key: this.config.actor.key,
            identifier: this.config.actor.identifier,
          }
        }

        await this.adapter.publish(fullChannel, envelope)
      },

      subscribe: async (
        event: string,
        handler: IgniterStoreEventContextHandler,
      ): Promise<IgniterStoreUnsubscribeFn> => {
        const fullChannel = this.keyBuilder.build('events', event)

        // Wrap handler to extract context from envelope
        const wrappedHandler = (envelope: unknown) => {
          // If it's already a context envelope, pass it through
          if (this.isEventContext(envelope)) {
            return handler(envelope)
          }

          // Legacy support: wrap raw messages in context
          const ctx: IgniterStoreEventContext = {
            type: event,
            data: envelope,
            timestamp: new Date().toISOString(),
          }

          return handler(ctx)
        }

        await this.adapter.subscribe(fullChannel, wrappedHandler)

        // Return unsubscribe function
        return async () => {
          await this.adapter.unsubscribe(fullChannel, wrappedHandler)
        }
      },
    } as IgniterStoreEventsAPI<TRegistry>

    // Create proxy for namespace-based access (store.events.user.created.publish())
    const registry = this.config.eventsRegistry ?? ({} as TRegistry)

    return new Proxy(baseAPI, {
      get: (target, prop) => {
        // Return base API methods
        if (prop === 'publish' || prop === 'subscribe') {
          return target[prop as keyof typeof target]
        }

        // Check if this is a registered namespace
        const namespace = String(prop)
        if (namespace in registry) {
          return this.createEventNamespaceProxy(namespace, registry[namespace as keyof TRegistry] as IgniterStoreEventsMap)
        }

        // Return undefined for unknown properties
        return undefined
      },
    }) as IgniterStoreEvents<TRegistry>
  }

  /**
   * Creates a proxy for a namespace (e.g., store.events.user)
   */
  private createEventNamespaceProxy(
    namespace: string,
    eventsMap: IgniterStoreEventsMap,
  ): IgniterStoreEventsRegistryProxy<IgniterStoreEventsRegistry>[string] {
    return new Proxy({} as Record<string, unknown>, {
      get: (_, prop) => {
        const eventName = String(prop)

        if (!(eventName in eventsMap)) {
          return undefined
        }

        const eventOrGroup = eventsMap[eventName]

        // Check if it's a nested group or a schema
        if (this.isEventSchema(eventOrGroup)) {
          // It's a schema - return an accessor
          return this.createEventAccessor(`${namespace}:${eventName}`)
        } else {
          // It's a nested group - recurse
          return this.createEventNamespaceProxy(`${namespace}:${eventName}`, eventOrGroup as IgniterStoreEventsMap)
        }
      },
    }) as IgniterStoreEventsRegistryProxy<IgniterStoreEventsRegistry>[string]
  }

  /**
   * Creates an event accessor with publish/subscribe methods.
   */
  private createEventAccessor(eventPath: string): IgniterStoreEventAccessor<unknown> {
    return {
      publish: async (message: unknown): Promise<void> => {
        const fullChannel = this.keyBuilder.build('events', eventPath)

        // Build the event envelope with context
        const envelope: IgniterStoreEventContext = {
          type: eventPath,
          data: message,
          timestamp: new Date().toISOString(),
        }

        // Add scope if present
        if (this.config.scopeChain.length > 0) {
          const lastScope = this.config.scopeChain[this.config.scopeChain.length - 1]
          envelope.scope = {
            key: lastScope.key,
            identifier: lastScope.identifier,
          }
        }

        // Add actor if present
        if (this.config.actor) {
          envelope.actor = {
            key: this.config.actor.key,
            identifier: this.config.actor.identifier,
          }
        }

        await this.adapter.publish(fullChannel, envelope)
      },

      subscribe: async (handler: IgniterStoreEventContextHandler): Promise<IgniterStoreUnsubscribeFn> => {
        const fullChannel = this.keyBuilder.build('events', eventPath)

        // Wrap handler to extract context from envelope
        const wrappedHandler = (envelope: unknown) => {
          // If it's already a context envelope, pass it through
          if (this.isEventContext(envelope)) {
            return handler(envelope)
          }

          // Legacy support: wrap raw messages in context
          const ctx: IgniterStoreEventContext = {
            type: eventPath,
            data: envelope,
            timestamp: new Date().toISOString(),
          }

          return handler(ctx)
        }

        await this.adapter.subscribe(fullChannel, wrappedHandler)

        return async () => {
          await this.adapter.unsubscribe(fullChannel, wrappedHandler)
        }
      },
    }
  }

  /**
   * Check if a value is an event context envelope.
   */
  private isEventContext(value: unknown): value is IgniterStoreEventContext {
    return (
      value !== null &&
      typeof value === 'object' &&
      'type' in value &&
      'data' in value &&
      'timestamp' in value
    )
  }

  /**
   * Check if a value is an event schema (has '~standard' property).
   */
  private isEventSchema(value: unknown): value is IgniterStoreEventSchema {
    return (
      value !== null &&
      typeof value === 'object' &&
      '~standard' in value
    )
  }

  private createDev(): IgniterStoreDev {
    return {
      scan: async (
        pattern: string,
        options?: IgniterStoreScanOptions,
      ): Promise<IgniterStoreScanResult> => {
        const fullPattern = this.keyBuilder.pattern('kv', pattern)
        return this.adapter.scan(fullPattern, options)
      },
    }
  }

  private createStreams(): IgniterStoreStreams {
    return {
      append: async (
        stream: string,
        message: unknown,
        options?: IgniterStoreStreamAppendOptions,
      ): Promise<string> => {
        const fullStream = this.keyBuilder.build('streams', stream)
        return this.adapter.xadd(fullStream, message, options)
      },

      group: (group: string, consumer: string): IgniterStoreStreamConsumerGroup => {
        return {
          ensure: async (
            stream: string,
            options?: { startId?: string },
          ): Promise<void> => {
            const fullStream = this.keyBuilder.build('streams', stream)
            await this.adapter.xgroupCreate(fullStream, group, options?.startId ?? '0')
          },

          read: async <T = unknown>(
            stream: string,
            options?: IgniterStoreStreamReadOptions,
          ): Promise<IgniterStoreStreamMessage<T>[]> => {
            const fullStream = this.keyBuilder.build('streams', stream)
            return this.adapter.xreadgroup<T>(fullStream, group, consumer, options)
          },

          ack: async (stream: string, ids: string[]): Promise<void> => {
            const fullStream = this.keyBuilder.build('streams', stream)
            await this.adapter.xack(fullStream, group, ids)
          },
        }
      },
    }
  }
}
