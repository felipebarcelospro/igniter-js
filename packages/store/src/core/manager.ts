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
 * import { IgniterStore, IgniterStoreRedisAdapter, IgniterStoreEvents } from '@igniter-js/store'
 * import { z } from 'zod'
 * import Redis from 'ioredis'
 *
 * // Define events per feature
 * const UserEvents = IgniterStoreEvents
 *   .create('user')
 *   .event('created', z.object({ userId: z.string(), email: z.string().email() }))
 *   .event('deleted', z.object({ userId: z.string() }))
 *   .build()
 *
 * const redis = new Redis()
 * const store = IgniterStore.create()
 *   .withAdapter(IgniterStoreRedisAdapter.create({ redis }))
 *   .withService('my-api')
 *   .addScope('organization', { required: true })
 *   .addEvents(UserEvents)
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
 * // Events (string-based) - ctx has type, data, timestamp, scope?
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
 * ```
 */

import type { IgniterStoreConfig } from '../types/config'
import type {
  IgniterStoreAdapter,
  IgniterStoreScanOptions,
  IgniterStoreScanResult,
  IgniterStoreStreamAppendOptions,
  IgniterStoreStreamConsumerGroup,
  IgniterStoreStreamMessage,
  IgniterStoreStreamReadOptions,
} from '../types/adapter'
import type {
  IgniterStoreEventAccessor,
  IgniterStoreEventContext,
  IgniterStoreEventContextHandler,
  IgniterStoreEventSchema,
  IgniterStoreEventsDirectory,
  IgniterStoreEventsRegistry,
  IgniterStoreEventsRegistryProxy,
  IgniterStoreUnsubscribeFn,
} from '../types/events'
import type { IgniterStoreScopeIdentifier } from '../types/scope'
import type {
  IIgniterStoreManager,
  IgniterStoreBatch,
  IgniterStoreClaim,
  IgniterStoreCounter,
  IgniterStoreDev,
  IgniterStoreEvents,
  IgniterStoreEventsAPI,
  IgniterStoreKV,
  IgniterStoreStreams,
} from '../types'
import type { IgniterStoreTelemetry } from '../types/telemetry'
import { IGNITER_STORE_TELEMETRY_EVENTS } from '../types/telemetry'
import { IgniterStoreKeyBuilder } from '../builders/store-key.builder'
import { IgniterStoreError } from '../errors/store.error'
import type { IgniterTelemetryAttributes } from '@igniter-js/telemetry'


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
 *
 * @typeParam TRegistry - The events registry type for typed pub/sub
 * @typeParam TScopes - The typed scope keys (from addScope)
 */
export class IgniterStoreManager<
  TRegistry extends IgniterStoreEventsRegistry = IgniterStoreEventsRegistry,
  TScopes extends string = string,
> implements IIgniterStoreManager<TRegistry, TScopes> {
  private readonly config: IgniterStoreConfig<TRegistry, TScopes>
  private readonly adapter: IgniterStoreAdapter
  private readonly keyBuilder: IgniterStoreKeyBuilder
  private readonly telemetry?: IgniterStoreTelemetry

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
   * @internal
   * Constructor is internal. Use `IgniterStore.create()` instead.
   */
  constructor(config: IgniterStoreConfig<TRegistry, TScopes>) {
    this.config = config
    this.adapter = config.adapter
    this.keyBuilder = new IgniterStoreKeyBuilder({
      service: config.service,
      scopeChain: config.scopeChain,
    })
    this.telemetry = config.telemetry

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

  private emitTelemetry(
    event: string,
    payload: { level?: 'debug' | 'info' | 'warn' | 'error'; attributes?: IgniterTelemetryAttributes },
  ): void {
    this.telemetry?.emit(event, {
      level: payload.level ?? 'info',
      attributes: payload.attributes,
    })
  }

  private getEventSchema(event: string): IgniterStoreEventSchema | undefined {
    if (!this.config.eventsRegistry) {
      return undefined
    }

    const [namespace, ...path] = event.split(':')
    if (!namespace || path.length === 0) {
      return undefined
    }

    let current = this.config.eventsRegistry[namespace]
    for (const segment of path) {
      if (!current || typeof current !== 'object') {
        return undefined
      }

      const next = (current as IgniterStoreEventsRegistry)[segment]
      if (!next) {
        return undefined
      }

      if (this.isEventSchema(next)) {
        return next
      }

      current = next as IgniterStoreEventsRegistry
    }

    return undefined
  }

  private async validateEventPayload(
    phase: 'publish' | 'subscribe',
    event: string,
    payload: unknown,
  ): Promise<void> {
    const schema = this.getEventSchema(event)
    if (!schema) {
      return
    }

    const {
      validatePublish = true,
      validateSubscribe = false,
      throwOnValidationError = true,
    } = this.config.eventsValidation ?? {}

    if (phase === 'publish' && !validatePublish) {
      return
    }
    if (phase === 'subscribe' && !validateSubscribe) {
      return
    }

    const validator = schema?.['~standard']?.validate
    if (!validator) {
      return
    }

    const result = await validator(payload)
    if (result.issues && result.issues.length > 0) {
      if (!throwOnValidationError) {
        return
      }

      throw new IgniterStoreError({
        code: 'STORE_SCHEMA_VALIDATION_FAILED',
        message: `Event payload validation failed for "${event}"`,
        statusCode: 400,
        details: result.issues,
      })
    }
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
   * @returns A new scoped IgniterStoreManager instance
   */
  scope<TScopeKey extends TScopes>(
    scopeKey: [TScopes] extends [never] ? string : TScopeKey,
    identifier: IgniterStoreScopeIdentifier,
  ): IgniterStoreManager<TRegistry, TScopes> {
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

    return new IgniterStoreManager({
      ...this.config,
      scopeChain: [
        ...this.config.scopeChain,
        { key: scopeKey as string, identifier: String(identifier) },
      ],
    })
  }

  // --- Private factory methods ---
  private getBaseAttributes(namespace?: string): Record<string, unknown> {
    const attributes: Record<string, unknown> = {
      'ctx.store.service': this.config.service,
    }

    if (namespace) {
      attributes['ctx.store.namespace'] = namespace
    }

    if (this.config.scopeChain.length > 0) {
      const lastScope = this.config.scopeChain[this.config.scopeChain.length - 1]
      attributes['ctx.store.scope_key'] = lastScope.key
      attributes['ctx.store.scope_depth'] = this.config.scopeChain.length
    }

    return attributes
  }

  private getErrorAttributes(
    error: unknown,
    operation?: string,
  ): Record<string, unknown> {
    const attributes: Record<string, unknown> = {}

    if (operation) {
      attributes['ctx.error.operation'] = operation
    }

    if (error instanceof IgniterStoreError) {
      attributes['ctx.error.code'] = error.code
      attributes['ctx.error.message'] = error.message
      return attributes
    }

    if (error instanceof Error) {
      attributes['ctx.error.code'] = error.name
      attributes['ctx.error.message'] = error.message
    }

    return attributes
  }

  private createKV(): IgniterStoreKV {
    return {
      get: async <T = unknown>(key: string): Promise<T | null> => {
        const fullKey = this.keyBuilder.build('kv', key)
        const attributes = {
          ...this.getBaseAttributes('kv'),
        }

        this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.KV_GET_STARTED, {
          level: 'debug',
          attributes: attributes as IgniterTelemetryAttributes,
        })

        try {
          const value = await this.adapter.get<T>(fullKey)
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.KV_GET_SUCCESS, {
            level: 'debug',
            attributes: {
              ...attributes,
              'ctx.kv.found': value !== null,
            },
          })
          return value
        } catch (error) {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.KV_GET_ERROR, {
            level: 'error',
            attributes: {
              ...attributes,
              ...this.getErrorAttributes(error, 'kv.get'),
            } as IgniterTelemetryAttributes,
          })
          throw error
        }
      },

      set: async (key: string, value: unknown, options?: { ttl?: number }): Promise<void> => {
        const fullKey = this.keyBuilder.build('kv', key)
        const attributes = {
          ...this.getBaseAttributes('kv'),
          'ctx.kv.ttl': options?.ttl,
        }

        this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.KV_SET_STARTED, {
          level: 'debug',
          attributes,
        })

        try {
          await this.adapter.set(fullKey, value, options)
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.KV_SET_SUCCESS, {
            level: 'debug',
            attributes,
          })
        } catch (error) {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.KV_SET_ERROR, {
            level: 'error',
            attributes: {
              ...attributes,
              ...this.getErrorAttributes(error, 'kv.set'),
            },
          })
          throw error
        }
      },

      remove: async (key: string): Promise<void> => {
        const fullKey = this.keyBuilder.build('kv', key)
        const attributes = this.getBaseAttributes('kv')

        this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.KV_REMOVE_STARTED, {
          level: 'debug',
          attributes: attributes as IgniterTelemetryAttributes,
        })

        try {
          await this.adapter.delete(fullKey)
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.KV_REMOVE_SUCCESS, {
            level: 'debug',
            attributes: attributes as IgniterTelemetryAttributes,
          })
        } catch (error) {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.KV_REMOVE_ERROR, {
            level: 'error',
            attributes: {
              ...attributes,
              ...this.getErrorAttributes(error, 'kv.remove'),
            } as IgniterTelemetryAttributes,
          })
          throw error
        }
      },

      exists: async (key: string): Promise<boolean> => {
        const fullKey = this.keyBuilder.build('kv', key)
        const attributes = this.getBaseAttributes('kv')

        this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.KV_EXISTS_STARTED, {
          level: 'debug',
          attributes: attributes as IgniterTelemetryAttributes,
        })

        try {
          const exists = await this.adapter.has(fullKey)
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.KV_EXISTS_SUCCESS, {
            level: 'debug',
            attributes: {
              ...attributes,
              'ctx.kv.existed': exists,
            },
          })
          return exists
        } catch (error) {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.KV_EXISTS_ERROR, {
            level: 'error',
            attributes: {
              ...attributes,
              ...this.getErrorAttributes(error, 'kv.exists'),
            } as IgniterTelemetryAttributes,
          })
          throw error
        }
      },

      expire: async (key: string, ttlSeconds: number): Promise<void> => {
        const fullKey = this.keyBuilder.build('kv', key)
        const attributes = {
          ...this.getBaseAttributes('kv'),
          'ctx.kv.ttl': ttlSeconds,
        }

        this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.KV_EXPIRE_STARTED, {
          level: 'debug',
          attributes,
        })

        try {
          await this.adapter.expire(fullKey, ttlSeconds)
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.KV_EXPIRE_SUCCESS, {
            level: 'debug',
            attributes,
          })
        } catch (error) {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.KV_EXPIRE_ERROR, {
            level: 'error',
            attributes: {
              ...attributes,
              ...this.getErrorAttributes(error, 'kv.expire'),
            },
          })
          throw error
        }
      },

      touch: async (key: string, ttlSeconds: number): Promise<void> => {
        const fullKey = this.keyBuilder.build('kv', key)
        const attributes = {
          ...this.getBaseAttributes('kv'),
          'ctx.kv.ttl': ttlSeconds,
        }

        this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.KV_TOUCH_STARTED, {
          level: 'debug',
          attributes,
        })

        try {
          await this.adapter.expire(fullKey, ttlSeconds)
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.KV_TOUCH_SUCCESS, {
            level: 'debug',
            attributes,
          })
        } catch (error) {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.KV_TOUCH_ERROR, {
            level: 'error',
            attributes: {
              ...attributes,
              ...this.getErrorAttributes(error, 'kv.touch'),
            },
          })
          throw error
        }
      },
    }
  }

  private createCounter(): IgniterStoreCounter {
    return {
      increment: async (key: string): Promise<number> => {
        const fullKey = this.keyBuilder.build('counter', key)
        const attributes = {
          ...this.getBaseAttributes('counter'),
          'ctx.counter.delta': 1,
        }

        this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.COUNTER_INCREMENT_STARTED, {
          level: 'debug',
          attributes,
        })

        try {
          const value = await this.adapter.increment(fullKey, 1)
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.COUNTER_INCREMENT_SUCCESS, {
            level: 'debug',
            attributes: {
              ...attributes,
              'ctx.counter.value': value,
            },
          })
          return value
        } catch (error) {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.COUNTER_INCREMENT_ERROR, {
            level: 'error',
            attributes: {
              ...attributes,
              ...this.getErrorAttributes(error, 'counter.increment'),
            },
          })
          throw error
        }
      },

      decrement: async (key: string): Promise<number> => {
        const fullKey = this.keyBuilder.build('counter', key)
        const attributes = {
          ...this.getBaseAttributes('counter'),
          'ctx.counter.delta': -1,
        }

        this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.COUNTER_DECREMENT_STARTED, {
          level: 'debug',
          attributes,
        })

        try {
          const value = await this.adapter.increment(fullKey, -1)
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.COUNTER_DECREMENT_SUCCESS, {
            level: 'debug',
            attributes: {
              ...attributes,
              'ctx.counter.value': value,
            },
          })
          return value
        } catch (error) {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.COUNTER_DECREMENT_ERROR, {
            level: 'error',
            attributes: {
              ...attributes,
              ...this.getErrorAttributes(error, 'counter.decrement'),
            },
          })
          throw error
        }
      },

      expire: async (key: string, ttlSeconds: number): Promise<void> => {
        const fullKey = this.keyBuilder.build('counter', key)
        const attributes = {
          ...this.getBaseAttributes('counter'),
          'ctx.counter.ttl': ttlSeconds,
        }

        this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.COUNTER_EXPIRE_STARTED, {
          level: 'debug',
          attributes,
        })

        try {
          await this.adapter.expire(fullKey, ttlSeconds)
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.COUNTER_EXPIRE_SUCCESS, {
            level: 'debug',
            attributes,
          })
        } catch (error) {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.COUNTER_EXPIRE_ERROR, {
            level: 'error',
            attributes: {
              ...attributes,
              ...this.getErrorAttributes(error, 'counter.expire'),
            },
          })
          throw error
        }
      },
    }
  }

  private createClaim(): IgniterStoreClaim {
    return {
      once: async (key: string, value: unknown, options?: { ttl?: number }): Promise<boolean> => {
        const fullKey = this.keyBuilder.build('claim', key)
        const attributes = {
          ...this.getBaseAttributes('claim'),
          'ctx.claim.ttl': options?.ttl,
        }

        this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.CLAIM_ACQUIRE_STARTED, {
          level: 'debug',
          attributes,
        })

        try {
          const acquired = await this.adapter.setNX(fullKey, value, options)
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.CLAIM_ACQUIRE_SUCCESS, {
            level: 'debug',
            attributes: {
              ...attributes,
              'ctx.claim.acquired': acquired,
            },
          })
          return acquired
        } catch (error) {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.CLAIM_ACQUIRE_ERROR, {
            level: 'error',
            attributes: {
              ...attributes,
              ...this.getErrorAttributes(error, 'claim.once'),
            },
          })
          throw error
        }
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
        const attributes = {
          ...this.getBaseAttributes('batch'),
          'ctx.batch.count': keys.length,
        }

        this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.BATCH_GET_STARTED, {
          level: 'debug',
          attributes,
        })

        try {
          const result = await this.adapter.mget<T>(fullKeys)
          const found = result.filter((value) => value !== null).length
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.BATCH_GET_SUCCESS, {
            level: 'debug',
            attributes: {
              ...attributes,
              'ctx.batch.found': found,
            },
          })
          return result
        } catch (error) {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.BATCH_GET_ERROR, {
            level: 'error',
            attributes: {
              ...attributes,
              ...this.getErrorAttributes(error, 'batch.get'),
            },
          })
          throw error
        }
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
        const attributes = {
          ...this.getBaseAttributes('batch'),
          'ctx.batch.count': entries.length,
        }

        this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.BATCH_SET_STARTED, {
          level: 'debug',
          attributes,
        })

        try {
          await this.adapter.mset(fullEntries)
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.BATCH_SET_SUCCESS, {
            level: 'debug',
            attributes,
          })
        } catch (error) {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.BATCH_SET_ERROR, {
            level: 'error',
            attributes: {
              ...attributes,
              ...this.getErrorAttributes(error, 'batch.set'),
            },
          })
          throw error
        }
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
        const attributes = {
          ...this.getBaseAttributes('events'),
          'ctx.events.channel': event,
        }

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
        this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.EVENTS_PUBLISH_STARTED, {
          level: 'debug',
          attributes,
        })

        try {
          await this.validateEventPayload('publish', event, message)
          await this.adapter.publish(fullChannel, envelope)
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.EVENTS_PUBLISH_SUCCESS, {
            level: 'debug',
            attributes,
          })
        } catch (error) {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.EVENTS_PUBLISH_ERROR, {
            level: 'error',
            attributes: {
              ...attributes,
              ...this.getErrorAttributes(error, 'events.publish'),
            },
          })
          throw error
        }
      },

      subscribe: async (
        event: string,
        handler: IgniterStoreEventContextHandler,
      ): Promise<IgniterStoreUnsubscribeFn> => {
        const fullChannel = this.keyBuilder.build('events', event)
        const attributes = {
          ...this.getBaseAttributes('events'),
          'ctx.events.channel': event,
          'ctx.events.wildcard': event.includes('*'),
        }

        // Wrap handler to extract context from envelope
        const wrappedHandler = (envelope: unknown) => {
          // If it's already a context envelope, pass it through
          if (this.isEventContext(envelope)) {
            const eventKey = envelope.type
            return Promise.resolve(this.validateEventPayload('subscribe', eventKey, envelope.data))
              .then(() => handler(envelope))
          }

          // Legacy support: wrap raw messages in context
          const ctx: IgniterStoreEventContext = {
            type: event,
            data: envelope,
            timestamp: new Date().toISOString(),
          }

          return Promise.resolve(this.validateEventPayload('subscribe', ctx.type, ctx.data))
            .then(() => handler(ctx))
        }

        this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.EVENTS_SUBSCRIBE_STARTED, {
          level: 'debug',
          attributes,
        })

        try {
          await this.adapter.subscribe(fullChannel, wrappedHandler)
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.EVENTS_SUBSCRIBE_SUCCESS, {
            level: 'debug',
            attributes,
          })
        } catch (error) {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.EVENTS_SUBSCRIBE_ERROR, {
            level: 'error',
            attributes: {
              ...attributes,
              ...this.getErrorAttributes(error, 'events.subscribe'),
            },
          })
          throw error
        }

        // Return unsubscribe function
        return async () => {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.EVENTS_UNSUBSCRIBE_STARTED, {
            level: 'debug',
            attributes,
          })

          try {
            await this.adapter.unsubscribe(fullChannel, wrappedHandler)
            this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.EVENTS_UNSUBSCRIBE_SUCCESS, {
              level: 'debug',
              attributes,
            })
          } catch (error) {
            this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.EVENTS_UNSUBSCRIBE_ERROR, {
              level: 'error',
              attributes: {
                ...attributes,
                ...this.getErrorAttributes(error, 'events.unsubscribe'),
              },
            })
            throw error
          }
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
          return this.createEventNamespaceProxy(namespace, registry[namespace as keyof TRegistry] as IgniterStoreEventsDirectory)
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
    eventsMap: IgniterStoreEventsDirectory,
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
          return this.createEventNamespaceProxy(`${namespace}:${eventName}`, eventOrGroup as IgniterStoreEventsDirectory)
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
        const attributes = {
          ...this.getBaseAttributes('events'),
          'ctx.events.channel': eventPath,
        }

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

        this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.EVENTS_PUBLISH_STARTED, {
          level: 'debug',
          attributes,
        })

        try {
          await this.validateEventPayload('publish', eventPath, message)
          await this.adapter.publish(fullChannel, envelope)
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.EVENTS_PUBLISH_SUCCESS, {
            level: 'debug',
            attributes,
          })
        } catch (error) {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.EVENTS_PUBLISH_ERROR, {
            level: 'error',
            attributes: {
              ...attributes,
              ...this.getErrorAttributes(error, 'events.publish'),
            },
          })
          throw error
        }
      },

      subscribe: async (handler: IgniterStoreEventContextHandler): Promise<IgniterStoreUnsubscribeFn> => {
        const fullChannel = this.keyBuilder.build('events', eventPath)
        const attributes = {
          ...this.getBaseAttributes('events'),
          'ctx.events.channel': eventPath,
        }

        // Wrap handler to extract context from envelope
        const wrappedHandler = (envelope: unknown) => {
          // If it's already a context envelope, pass it through
          if (this.isEventContext(envelope)) {
            const eventKey = envelope.type
            return Promise.resolve(this.validateEventPayload('subscribe', eventKey, envelope.data))
              .then(() => handler(envelope))
          }

          // Legacy support: wrap raw messages in context
          const ctx: IgniterStoreEventContext = {
            type: eventPath,
            data: envelope,
            timestamp: new Date().toISOString(),
          }

          return Promise.resolve(this.validateEventPayload('subscribe', ctx.type, ctx.data))
            .then(() => handler(ctx))
        }

        this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.EVENTS_SUBSCRIBE_STARTED, {
          level: 'debug',
          attributes,
        })

        try {
          await this.adapter.subscribe(fullChannel, wrappedHandler)
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.EVENTS_SUBSCRIBE_SUCCESS, {
            level: 'debug',
            attributes,
          })
        } catch (error) {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.EVENTS_SUBSCRIBE_ERROR, {
            level: 'error',
            attributes: {
              ...attributes,
              ...this.getErrorAttributes(error, 'events.subscribe'),
            },
          })
          throw error
        }

        return async () => {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.EVENTS_UNSUBSCRIBE_STARTED, {
            level: 'debug',
            attributes,
          })

          try {
            await this.adapter.unsubscribe(fullChannel, wrappedHandler)
            this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.EVENTS_UNSUBSCRIBE_SUCCESS, {
              level: 'debug',
              attributes,
            })
          } catch (error) {
            this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.EVENTS_UNSUBSCRIBE_ERROR, {
              level: 'error',
              attributes: {
                ...attributes,
                ...this.getErrorAttributes(error, 'events.unsubscribe'),
              },
            })
            throw error
          }
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
        const attributes = {
          ...this.getBaseAttributes('dev'),
        }

        this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.DEV_SCAN_STARTED, {
          level: 'debug',
          attributes: attributes as IgniterTelemetryAttributes,
        })

        try {
          const result = await this.adapter.scan(fullPattern, options)
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.DEV_SCAN_SUCCESS, {
            level: 'debug',
            attributes: attributes as IgniterTelemetryAttributes,
          })
          return result
        } catch (error) {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.DEV_SCAN_ERROR, {
            level: 'error',
            attributes: {
              ...attributes,
              ...this.getErrorAttributes(error, 'dev.scan'),
            } as IgniterTelemetryAttributes,
          })
          throw error
        }
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
        const attributes = {
          ...this.getBaseAttributes('stream'),
          'ctx.stream.name': stream,
          'ctx.stream.count': 1,
        }

        this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.STREAM_APPEND_STARTED, {
          level: 'debug',
          attributes,
        })

        try {
          const result = await this.adapter.xadd(fullStream, message, options)
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.STREAM_APPEND_SUCCESS, {
            level: 'debug',
            attributes,
          })
          return result
        } catch (error) {
          this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.STREAM_APPEND_ERROR, {
            level: 'error',
            attributes: {
              ...attributes,
              ...this.getErrorAttributes(error, 'stream.append'),
            },
          })
          throw error
        }
      },

      group: (group: string, consumer: string): IgniterStoreStreamConsumerGroup => {
        return {
          ensure: async (
            stream: string,
            options?: { startId?: string },
          ): Promise<void> => {
            const fullStream = this.keyBuilder.build('streams', stream)
            const attributes = {
              ...this.getBaseAttributes('stream'),
              'ctx.stream.name': stream,
              'ctx.stream.group': group,
              'ctx.stream.consumer': consumer,
            }

            this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.STREAM_GROUP_STARTED, {
              level: 'debug',
              attributes,
            })

            try {
              await this.adapter.xgroupCreate(fullStream, group, options?.startId ?? '0')
              this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.STREAM_GROUP_SUCCESS, {
                level: 'debug',
                attributes,
              })
            } catch (error) {
              this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.STREAM_GROUP_ERROR, {
                level: 'error',
                attributes: {
                  ...attributes,
                  ...this.getErrorAttributes(error, 'stream.ensure'),
                },
              })
              throw error
            }
          },

          read: async <T = unknown>(
            stream: string,
            options?: IgniterStoreStreamReadOptions,
          ): Promise<IgniterStoreStreamMessage<T>[]> => {
            const fullStream = this.keyBuilder.build('streams', stream)
            const attributes = {
              ...this.getBaseAttributes('stream'),
              'ctx.stream.name': stream,
              'ctx.stream.group': group,
              'ctx.stream.consumer': consumer,
            }

            this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.STREAM_READ_STARTED, {
              level: 'debug',
              attributes,
            })

            try {
              const messages = await this.adapter.xreadgroup<T>(fullStream, group, consumer, options)
              this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.STREAM_READ_SUCCESS, {
                level: 'debug',
                attributes: {
                  ...attributes,
                  'ctx.stream.count': messages.length,
                },
              })
              return messages
            } catch (error) {
              this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.STREAM_READ_ERROR, {
                level: 'error',
                attributes: {
                  ...attributes,
                  ...this.getErrorAttributes(error, 'stream.read'),
                },
              })
              throw error
            }
          },

          ack: async (stream: string, ids: string[]): Promise<void> => {
            const fullStream = this.keyBuilder.build('streams', stream)
            const attributes = {
              ...this.getBaseAttributes('stream'),
              'ctx.stream.name': stream,
              'ctx.stream.group': group,
              'ctx.stream.consumer': consumer,
              'ctx.stream.count': ids.length,
            }

            this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.STREAM_ACK_STARTED, {
              level: 'debug',
              attributes,
            })

            try {
              await this.adapter.xack(fullStream, group, ids)
              this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.STREAM_ACK_SUCCESS, {
                level: 'debug',
                attributes,
              })
            } catch (error) {
              this.emitTelemetry(IGNITER_STORE_TELEMETRY_EVENTS.STREAM_ACK_ERROR, {
                level: 'error',
                attributes: {
                  ...attributes,
                  ...this.getErrorAttributes(error, 'stream.ack'),
                },
              })
              throw error
            }
          },
        }
      },
    }
  }
}
