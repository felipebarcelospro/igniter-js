/**
 * @fileoverview Builder for creating IgniterStore instances
 * @module @igniter-js/store/builders/igniter-store
 *
 * @description
 * Provides a fluent builder API for configuring and creating IgniterStore instances.
 * Supports adapter configuration, service naming, environment settings, events, and more.
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
 *
 * const store = IgniterStore.create()
 *   .withAdapter(RedisStoreAdapter.create({ redis }))
 *   .withService('my-api')
 *   .withEnvironment('production')
 *   .addScope('organization', { required: true })
 *   .addActor('user', { required: false })
 *   .addEvents('user', UserEvents)
 *   .build()
 *
 * // Use with string-based API
 * await store.events.publish('user:created', { userId: '123', email: 'a@b.com' })
 *
 * // Or use proxy-based API
 * await store.events.user.created.publish({ userId: '123', email: 'a@b.com' })
 * ```
 */

import type { IgniterLogger } from '@igniter-js/core'
import type { IgniterStoreAdapter } from '../types/adapter'
import type { IgniterStoreConfig } from '../types/config'
import type {
  IgniterStoreEventsMap,
  IgniterStoreEventsRegistry,
  IgniterStoreEventsValidationOptions,
} from '../types/events'
import type {
  IgniterStoreActorOptions,
  IgniterStoreScopeOptions,
} from '../types/scope'
import type { IgniterStoreSerializer } from '../types/serializer'
import { DEFAULT_SERIALIZER } from '../types/serializer'
import { IgniterStoreError } from '../errors/igniter-store.error'

// Lazy import to avoid circular dependency
import type { IgniterStore } from '../core/igniter-store'

/**
 * Reserved namespace prefixes that cannot be used by user code.
 */
const RESERVED_NAMESPACE_PREFIXES = [
  'igniter',
  'ign',
  'telemetry',
  'jobs',
  'wf',
  'workflow',
  'mail',
  'notify',
  'bot',
  'mcp',
  'auth',
  '__internal',
  '__',
] as const

/**
 * Validates that a namespace is not reserved.
 *
 * @param namespace - The namespace to validate
 */
function validateNamespace(namespace: string): void {
  if (!namespace || typeof namespace !== 'string') {
    throw new IgniterStoreError({
      code: 'STORE_INVALID_NAMESPACE',
      message: 'Namespace must be a non-empty string',
      statusCode: 400,
    })
  }

  if (namespace.includes('.')) {
    throw new IgniterStoreError({
      code: 'STORE_INVALID_NAMESPACE',
      message: `Namespace "${namespace}" cannot contain dots (.). Use kebab-case for multi-word names.`,
      statusCode: 400,
      details: { namespace },
    })
  }

  if (namespace.includes(':')) {
    throw new IgniterStoreError({
      code: 'STORE_INVALID_NAMESPACE',
      message: `Namespace "${namespace}" cannot contain colons (:). The colon is added automatically between namespace and event name.`,
      statusCode: 400,
      details: { namespace },
    })
  }

  const lowerNamespace = namespace.toLowerCase()
  for (const reserved of RESERVED_NAMESPACE_PREFIXES) {
    if (lowerNamespace === reserved || lowerNamespace.startsWith(`${reserved}-`) || lowerNamespace.startsWith(`${reserved}_`)) {
      throw new IgniterStoreError({
        code: 'STORE_RESERVED_NAMESPACE',
        message: `Namespace "${namespace}" is reserved for internal Igniter.js use. Please choose a different namespace.`,
        statusCode: 400,
        details: { namespace, reserved },
      })
    }
  }
}

/**
 * Builder state for IgniterStore configuration.
 *
 * @typeParam TRegistry - The events registry type for typed pub/sub
 * @typeParam TScopes - The typed scope keys (from addScope)
 * @typeParam TActors - The typed actor keys (from addActor)
 */
export interface IgniterStoreBuilderState<
  TRegistry extends IgniterStoreEventsRegistry = IgniterStoreEventsRegistry,
  TScopes extends string = never,
  TActors extends string = never,
> {
  /** The store adapter */
  adapter?: IgniterStoreAdapter
  /** The service name */
  service?: string
  /** The environment */
  environment?: string
  /** The key prefix */
  keyPrefix?: string
  /** Custom serializer */
  serializer?: IgniterStoreSerializer
  /** Events registry for typed pub/sub */
  eventsRegistry?: TRegistry
  /** Events validation options */
  eventsValidation?: IgniterStoreEventsValidationOptions
  /** Scope definitions (from addScope) */
  scopeDefinitions?: Record<string, IgniterStoreScopeOptions>
  /** Actor definitions (from addActor) */
  actorDefinitions?: Record<string, IgniterStoreActorOptions>
  /** Logger instance */
  logger?: IgniterLogger
}

/**
 * Builder class for creating IgniterStore instances.
 * Uses a fluent API pattern for configuration.
 *
 * @typeParam TRegistry - The events registry type for typed pub/sub
 * @typeParam TScopes - The typed scope keys (from addScope)
 * @typeParam TActors - The typed actor keys (from addActor)
 *
 * @example
 * ```typescript
 * // Define events per feature
 * const UserEvents = IgniterStoreEvents
 *   .event('created', z.object({ userId: z.string() }))
 *   .event('deleted', z.object({ userId: z.string() }))
 *   .build()
 *
 * const store = IgniterStore.create()
 *   .withAdapter(RedisStoreAdapter.create({ redis }))
 *   .withService('my-api')
 *   .withEnvironment(process.env.NODE_ENV ?? 'development')
 *   .addScope('organization', { required: true })
 *   .addActor('user')
 *   .addEvents('user', UserEvents)
 *   .build()
 * ```
 */
export class IgniterStoreBuilder<
  TRegistry extends IgniterStoreEventsRegistry = {},
  TScopes extends string = never,
  TActors extends string = never,
> {
  private readonly state: IgniterStoreBuilderState<TRegistry, TScopes, TActors>

  private constructor(state: IgniterStoreBuilderState<TRegistry, TScopes, TActors> = {}) {
    this.state = state
  }

  /**
   * Creates a new store builder instance.
   *
   * @returns A new IgniterStoreBuilder instance
   *
   * @example
   * ```typescript
   * const builder = IgniterStoreBuilder.create()
   * ```
   */
  static create(): IgniterStoreBuilder<{}, never, never> {
    return new IgniterStoreBuilder({})
  }

  /**
   * Sets the store adapter.
   *
   * The adapter provides the underlying storage implementation (e.g., Redis).
   * This is required before building the store.
   *
   * @param adapter - The store adapter instance
   * @returns A new builder with the adapter configured
   *
   * @example
   * ```typescript
   * import { RedisStoreAdapter } from '@igniter-js/store'
   * import Redis from 'ioredis'
   *
   * const redis = new Redis()
   * builder.withAdapter(RedisStoreAdapter.create({ redis }))
   * ```
   */
  withAdapter(adapter: IgniterStoreAdapter): IgniterStoreBuilder<TRegistry, TScopes, TActors> {
    return new IgniterStoreBuilder({ ...this.state, adapter })
  }

  /**
   * Sets the service name.
   *
   * The service name is used in key prefixes to isolate data per service.
   * This is required before building the store.
   *
   * @param service - The service name (e.g., 'my-api', 'worker', 'gateway')
   * @returns A new builder with the service configured
   *
   * @example
   * ```typescript
   * builder.withService('my-api')
   * ```
   */
  withService(service: string): IgniterStoreBuilder<TRegistry, TScopes, TActors> {
    return new IgniterStoreBuilder({ ...this.state, service })
  }

  /**
   * Sets the environment.
   *
   * The environment is used in key prefixes to isolate data per environment.
   * If not set, defaults to 'development'.
   *
   * @param environment - The environment name (e.g., 'development', 'staging', 'production')
   * @returns A new builder with the environment configured
   *
   * @example
   * ```typescript
   * builder.withEnvironment(process.env.NODE_ENV ?? 'development')
   * ```
   */
  withEnvironment(environment: string): IgniterStoreBuilder<TRegistry, TScopes, TActors> {
    return new IgniterStoreBuilder({ ...this.state, environment })
  }

  /**
   * Sets the key prefix.
   *
   * The key prefix is prepended to all keys in the store.
   * Defaults to 'ign:store' if not set.
   *
   * @param keyPrefix - The key prefix (e.g., 'ign:store', 'myapp')
   * @returns A new builder with the key prefix configured
   *
   * @example
   * ```typescript
   * builder.withKeyPrefix('myapp:cache')
   * ```
   */
  withKeyPrefix(keyPrefix: string): IgniterStoreBuilder<TRegistry, TScopes, TActors> {
    return new IgniterStoreBuilder({ ...this.state, keyPrefix })
  }

  /**
   * Sets a custom serializer for encoding/decoding values.
   *
   * By default, JSON.stringify/JSON.parse is used. You can provide
   * a custom serializer for different formats (e.g., MessagePack).
   *
   * @param serializer - The serializer with encode/decode functions
   * @returns A new builder with the serializer configured
   *
   * @example
   * ```typescript
   * import { encode, decode } from '@msgpack/msgpack'
   *
   * builder.withSerializer({
   *   encode: (value) => Buffer.from(encode(value)).toString('base64'),
   *   decode: (value) => decode(Buffer.from(value, 'base64')),
   * })
   * ```
   */
  withSerializer(serializer: IgniterStoreSerializer): IgniterStoreBuilder<TRegistry, TScopes, TActors> {
    return new IgniterStoreBuilder({ ...this.state, serializer })
  }

  /**
   * Adds a typed scope definition for multi-tenant isolation.
   *
   * Scopes are used to isolate data per tenant/organization.
   * Only defined scope keys can be used with the `scope()` method.
   *
   * @param key - The scope key (e.g., 'organization', 'tenant', 'workspace')
   * @param options - Optional configuration for the scope
   * @returns A new builder with the scope added
   *
   * @example
   * ```typescript
   * // Define organization scope
   * const store = IgniterStore.create()
   *   .withAdapter(adapter)
   *   .withService('my-api')
   *   .addScope('organization', { required: true, description: 'Organization tenant' })
   *   .addScope('workspace')
   *   .build()
   *
   * // Use the scope (type-safe: only 'organization' or 'workspace' allowed)
   * const orgStore = store.scope('organization', 'org-123')
   * ```
   */
  addScope<TKey extends string>(
    key: TKey,
    options?: IgniterStoreScopeOptions,
  ): IgniterStoreBuilder<TRegistry, TScopes | TKey, TActors> {
    validateNamespace(key)

    const currentDefinitions = this.state.scopeDefinitions ?? {}
    if (key in currentDefinitions) {
      throw new IgniterStoreError({
        code: 'STORE_DUPLICATE_SCOPE',
        message: `Scope "${key}" is already defined. Each scope key can only be added once.`,
        statusCode: 400,
        details: { key },
      })
    }

    return new IgniterStoreBuilder({
      ...this.state,
      scopeDefinitions: {
        ...currentDefinitions,
        [key]: options ?? {},
      },
    })
  }

  /**
   * Adds a typed actor definition for user/entity identification in events.
   *
   * Actors are used to identify who triggered an event. The actor information
   * is included in event contexts when publishing events.
   *
   * @param key - The actor key (e.g., 'user', 'system', 'service')
   * @param options - Optional configuration for the actor
   * @returns A new builder with the actor added
   *
   * @example
   * ```typescript
   * // Define actor types
   * const store = IgniterStore.create()
   *   .withAdapter(adapter)
   *   .withService('my-api')
   *   .addActor('user', { description: 'Human user' })
   *   .addActor('system', { description: 'System/automated process' })
   *   .build()
   *
   * // Set actor when publishing events (type-safe: only 'user' or 'system' allowed)
   * const userStore = store.actor('user', 'user-123')
   * await userStore.events.user.created.publish({ userId: '456' })
   * ```
   */
  addActor<TKey extends string>(
    key: TKey,
    options?: IgniterStoreActorOptions,
  ): IgniterStoreBuilder<TRegistry, TScopes, TActors | TKey> {
    validateNamespace(key)

    const currentDefinitions = this.state.actorDefinitions ?? {}
    if (key in currentDefinitions) {
      throw new IgniterStoreError({
        code: 'STORE_DUPLICATE_ACTOR',
        message: `Actor "${key}" is already defined. Each actor key can only be added once.`,
        statusCode: 400,
        details: { key },
      })
    }

    return new IgniterStoreBuilder({
      ...this.state,
      actorDefinitions: {
        ...currentDefinitions,
        [key]: options ?? {},
      },
    })
  }

  /**
   * Adds events for a namespace.
   *
   * This is the recommended way to add typed events to the store.
   * Each namespace must be unique - calling addEvents with the same
   * namespace twice will throw an error.
   *
   * @param namespace - The namespace for these events (e.g., 'user', 'orders')
   * @param events - The events map (built with IgniterStoreEvents.build())
   * @param validation - Optional validation settings
   * @returns A new builder with the events added
   *
   * @example
   * ```typescript
   * import { z } from 'zod'
   * import { IgniterStoreEvents } from '@igniter-js/store'
   *
   * // Define events per feature
   * const UserEvents = IgniterStoreEvents
   *   .event('created', z.object({ userId: z.string(), email: z.string().email() }))
   *   .event('deleted', z.object({ userId: z.string() }))
   *   .build()
   *
   * const OrderEvents = IgniterStoreEvents
   *   .event('placed', z.object({ orderId: z.string(), total: z.number() }))
   *   .event('shipped', z.object({ orderId: z.string(), trackingId: z.string() }))
   *   .build()
   *
   * // Add to store
   * const store = IgniterStore.create()
   *   .withAdapter(adapter)
   *   .withService('my-api')
   *   .addEvents('user', UserEvents)
   *   .addEvents('orders', OrderEvents)
   *   .build()
   *
   * // Use with string-based API
   * await store.events.publish('user:created', { userId: '123', email: 'a@b.com' })
   *
   * // Or proxy-based API
   * await store.events.user.created.publish({ userId: '123', email: 'a@b.com' })
   * ```
   */
  addEvents<TNamespace extends string, TEvents extends IgniterStoreEventsMap>(
    namespace: TNamespace,
    events: TEvents,
    validation?: IgniterStoreEventsValidationOptions,
  ): IgniterStoreBuilder<TRegistry & { [K in TNamespace]: TEvents }, TScopes, TActors> {
    validateNamespace(namespace)

    // Check for duplicate namespace
    const currentRegistry = this.state.eventsRegistry ?? {}
    if (namespace in currentRegistry) {
      throw new IgniterStoreError({
        code: 'STORE_DUPLICATE_NAMESPACE',
        message: `Namespace "${namespace}" is already registered. Each namespace can only be added once.`,
        statusCode: 400,
        details: { namespace },
      })
    }

    const newRegistry = {
      ...currentRegistry,
      [namespace]: events,
    } as TRegistry & { [K in TNamespace]: TEvents }

    return new IgniterStoreBuilder({
      ...this.state,
      eventsRegistry: newRegistry,
      eventsValidation: validation ?? this.state.eventsValidation,
    })
  }

  /**
   * Sets a logger instance.
   *
   * The logger is used for debugging and error reporting.
   *
   * @param logger - The logger instance
   * @returns A new builder with the logger configured
   *
   * @example
   * ```typescript
   * import { createLogger } from 'winston'
   *
   * builder.withLogger(createLogger({ level: 'debug' }))
   * ```
   */
  withLogger(logger: IgniterLogger): IgniterStoreBuilder<TRegistry, TScopes, TActors> {
    return new IgniterStoreBuilder({ ...this.state, logger })
  }

  /**
   * Builds and returns the IgniterStore instance.
   *
   * @returns The configured IgniterStore instance
   * @throws {IgniterStoreError} If required configuration is missing
   *
   * @example
   * ```typescript
   * const store = IgniterStore.create()
   *   .withAdapter(adapter)
   *   .withService('my-api')
   *   .addEvents('user', UserEvents)
   *   .build()
   * ```
   */
  build(): IgniterStore<TRegistry, TScopes, TActors> {
    // Validate required configuration
    if (!this.state.adapter) {
      throw new IgniterStoreError({
        code: 'STORE_ADAPTER_REQUIRED',
        message: 'Store adapter is required. Call withAdapter() before build().',
        statusCode: 500,
      })
    }

    if (!this.state.service) {
      throw new IgniterStoreError({
        code: 'STORE_SERVICE_REQUIRED',
        message: 'Service name is required. Call withService() before build().',
        statusCode: 500,
      })
    }

    // Build the configuration with defaults
    const config: IgniterStoreConfig<TRegistry, TScopes, TActors> = {
      adapter: this.state.adapter,
      service: this.state.service,
      environment: this.state.environment ?? 'development',
      keyPrefix: this.state.keyPrefix ?? 'ign:store',
      serializer: this.state.serializer ?? DEFAULT_SERIALIZER,
      eventsRegistry: this.state.eventsRegistry,
      eventsValidation: this.state.eventsValidation,
      scopeDefinitions: this.state.scopeDefinitions as Record<TScopes, IgniterStoreScopeOptions>,
      actorDefinitions: this.state.actorDefinitions as Record<TActors, IgniterStoreActorOptions>,
      logger: this.state.logger,
      scopeChain: [],
    }

    // Import the IgniterStore class dynamically to avoid circular dependency
    // This is safe because by the time build() is called, the module is fully loaded
    const { IgniterStore: IgniterStoreClass } = require('../core/igniter-store')
    return new IgniterStoreClass(config)
  }
}
