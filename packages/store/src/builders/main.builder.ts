/**
 * @fileoverview Builder for creating IgniterStore instances
 * @module @igniter-js/store/builders/main
 *
 * @description
 * Provides a fluent builder API for configuring and creating IgniterStore instances.
 * Supports adapter configuration, service naming, environment settings, events,
 * telemetry, and more.
 *
 * @example
 * ```typescript
 * import { IgniterStore, IgniterStoreRedisAdapter, IgniterStoreEvents } from '@igniter-js/store'
 * import { IgniterTelemetry } from '@igniter-js/telemetry'
 * import { IgniterStoreTelemetryEvents } from '@igniter-js/store/telemetry'
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
 *
 * // Create telemetry manager with store events
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .addEvents(UserEvents)
 *   .build()
 *
 * const store = IgniterStore.create()
 *   .withAdapter(IgniterStoreRedisAdapter.create({ redis }))
 *   .withService('my-api')
 *   .withTelemetry(telemetry)
 *   .addScope('organization', { required: true })
 *   .addEvents(UserEvents)
 *   .build()
 *
 * // Use with string-based API
 * await store.events.publish('user:created', { userId: '123', email: 'a@b.com' })
 *
 * // Or use proxy-based API
 * await store.events.user.created.publish({ userId: '123', email: 'a@b.com' })
 * ```
 */

import type { IgniterLogger } from "@igniter-js/core";
import type { IgniterStoreAdapter } from "../types/adapter";
import type { IgniterStoreBuilderState } from "../types/builder";
import type { IgniterStoreConfig } from "../types/config";
import type {
  IgniterStoreEventsDirectory,
  IgniterStoreEventsRegistry,
  IgniterStoreEventsValidationOptions,
} from "../types/events";
import type {
  IgniterStoreScopeOptions,
} from "../types/scope";
import type { IgniterStoreSerializer } from "../types/serializer";
import { DEFAULT_SERIALIZER } from "../types/serializer";
import { IgniterStoreError } from "../errors/store.error";
import { IgniterStoreManager } from "../core/manager";
import { IgniterStoreEventValidator } from "../utils/events";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";


/**
 * Builder class for creating IgniterStore instances.
 * Uses a fluent API pattern for configuration.
 *
 * @typeParam TRegistry - The events registry type for typed pub/sub
 * @typeParam TScopes - The typed scope keys (from addScope)
 *
 * @example
 * ```typescript
 * // Define events per feature
 * const UserEvents = IgniterStoreEvents
 *   .create('user')
 *   .event('created', z.object({ userId: z.string() }))
 *   .event('deleted', z.object({ userId: z.string() }))
 *   .build()
 *
 * const store = IgniterStore.create()
 *   .withAdapter(IgniterStoreRedisAdapter.create({ redis }))
 *   .withService('my-api')
 *   .addScope('organization', { required: true })
 *   .addEvents(UserEvents)
 *   .build()
 * ```
 */
export class IgniterStoreBuilder<
  TRegistry extends IgniterStoreEventsRegistry = {},
  TScopes extends string = never,
> {
  private readonly state: IgniterStoreBuilderState<TRegistry, TScopes>;

  private constructor(
    state: IgniterStoreBuilderState<TRegistry, TScopes> = {},
  ) {
    this.state = state;
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
  static create(): IgniterStoreBuilder<{}, never> {
    return new IgniterStoreBuilder({});
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
  withAdapter(
    adapter: IgniterStoreAdapter,
  ): IgniterStoreBuilder<TRegistry, TScopes> {
    return new IgniterStoreBuilder({ ...this.state, adapter });
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
  withService(
    service: string,
  ): IgniterStoreBuilder<TRegistry, TScopes> {
    return new IgniterStoreBuilder({ ...this.state, service });
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
  withSerializer(
    serializer: IgniterStoreSerializer,
  ): IgniterStoreBuilder<TRegistry, TScopes> {
    return new IgniterStoreBuilder({ ...this.state, serializer });
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
  ): IgniterStoreBuilder<TRegistry, TScopes | TKey> {
    IgniterStoreEventValidator.ensureValidNamespace(key);

    const currentDefinitions = this.state.scopeDefinitions ?? {};
    if (key in currentDefinitions) {
      throw new IgniterStoreError({
        code: "STORE_DUPLICATE_SCOPE",
        message: `Scope "${key}" is already defined. Each scope key can only be added once.`,
        statusCode: 400,
        details: { key },
      });
    }

    return new IgniterStoreBuilder({
      ...this.state,
      scopeDefinitions: {
        ...currentDefinitions,
        [key]: options ?? {},
      },
    });
  }

  /**
   * Adds typed events for a namespace.
   *
   * This is the recommended way to add typed events to the store.
   * Each namespace must be unique - calling addEvents with the same
   * namespace twice will throw an error.
   *
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
   *   .create('user')
   *   .event('created', z.object({ userId: z.string(), email: z.string().email() }))
   *   .event('deleted', z.object({ userId: z.string() }))
   *   .build()
   *
   * const OrderEvents = IgniterStoreEvents
   *   .create('orders')
   *   .event('placed', z.object({ orderId: z.string(), total: z.number() }))
   *   .event('shipped', z.object({ orderId: z.string(), trackingId: z.string() }))
   *   .build()
   *
   * // Add to store
   * const store = IgniterStore.create()
   *   .withAdapter(adapter)
   *   .withService('my-api')
   *   .addEvents(UserEvents)
   *   .addEvents(OrderEvents)
   *   .build()
   *
   * // Use with string-based API
   * await store.events.publish('user:created', { userId: '123', email: 'a@b.com' })
   *
   * // Or proxy-based API
   * await store.events.user.created.publish({ userId: '123', email: 'a@b.com' })
   * ```
   */
  addEvents<
    TEvents extends { namespace: string, events: IgniterStoreEventsDirectory }
  >(
    events: TEvents,
    validation?: IgniterStoreEventsValidationOptions,
  ): IgniterStoreBuilder<
    TRegistry & { [K in TEvents["namespace"]]: TEvents["events"] },
    TScopes
  > {
    const namespace = events.namespace;
    if (!namespace) {
      throw new IgniterStoreError({
        code: "STORE_MISSING_NAMESPACE",
        message: "Events namespace is required.",
        statusCode: 400,
      });
    }

    IgniterStoreEventValidator.ensureValidNamespace(namespace);

    // Check for duplicate namespace
    const currentRegistry = this.state.eventsRegistry ?? {};
    if (namespace in currentRegistry) {
      throw new IgniterStoreError({
        code: "STORE_DUPLICATE_NAMESPACE",
        message: `Namespace "${namespace}" is already registered. Each namespace can only be added once.`,
        statusCode: 400,
        details: { namespace },
      });
    }

    const newRegistry = {
      ...currentRegistry,
      [namespace]: events.events,
    } as TRegistry & { [K in TEvents["namespace"]]: TEvents["events"] };

    return new IgniterStoreBuilder({
      ...this.state,
      eventsRegistry: newRegistry,
      eventsValidation: validation ?? this.state.eventsValidation,
    });
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
  withLogger(
    logger: IgniterLogger,
  ): IgniterStoreBuilder<TRegistry, TScopes> {
    return new IgniterStoreBuilder({ ...this.state, logger });
  }

  /**
   * Sets the telemetry manager for observability.
   *
   * When telemetry is configured, the store emits events for all operations
   * (key-value, counters, batch, claims, pub/sub, streams) enabling:
   * - Distributed tracing with OpenTelemetry
   * - Performance monitoring and metrics
   * - Error tracking and debugging
   *
   * @param telemetry - The IgniterStoreTelemetry instance
   * @returns A new builder with telemetry configured
   *
   * @example
   * ```typescript
   * import { IgniterTelemetry } from '@igniter-js/telemetry'
   * import { IgniterStoreTelemetryEvents } from '@igniter-js/store/telemetry'
   *
   * // Create telemetry manager with store events
   * const telemetry = IgniterTelemetry.create()
   *   .withService('my-api')
   *   .addEvents(IgniterStoreTelemetryEvents)
   *   .withRedaction({
   *     denylistKeys: ['value', 'message', 'payload'],
   *     hashKeys: ['ctx.store.key'],
   *   })
   *   .build()
   *
   * // Use in store
   * const store = IgniterStore.create()
   *   .withAdapter(adapter)
   *   .withService('my-api')
   *   .withTelemetry(telemetry)
   *   .build()
   * ```
   */
  withTelemetry(
    telemetry: IgniterTelemetryManager<any>,
  ): IgniterStoreBuilder<TRegistry, TScopes> {
    return new IgniterStoreBuilder({ ...this.state, telemetry });
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
   *   .addEvents(UserEvents)
   *   .build()
   * ```
   */
  build(): IgniterStoreManager<TRegistry, TScopes> {
    // Validate required configuration
    if (!this.state.adapter) {
      throw new IgniterStoreError({
        code: "STORE_ADAPTER_REQUIRED",
        message:
          "Store adapter is required. Call withAdapter() before build().",
        statusCode: 500,
      });
    }

    if (!this.state.service) {
      throw new IgniterStoreError({
        code: "STORE_SERVICE_REQUIRED",
        message: "Service name is required. Call withService() before build().",
        statusCode: 500,
      });
    }

    // Build the configuration with defaults
    const config: IgniterStoreConfig<TRegistry, TScopes> = {
      adapter: this.state.adapter,
      service: this.state.service,
      serializer: this.state.serializer ?? DEFAULT_SERIALIZER,
      eventsRegistry: this.state.eventsRegistry,
      eventsValidation: this.state.eventsValidation,
      scopeDefinitions: this.state.scopeDefinitions as Record<
        TScopes,
        IgniterStoreScopeOptions
      >,
      logger: this.state.logger,
      telemetry: this.state.telemetry,
      scopeChain: [],
    };

    return new IgniterStoreManager(config);
  }
}

/**
 * Factory for creating and configuring IgniterStore instances.
 *
 * This is the main entry point for creating a store with a fluent builder API.
 * It provides type-safe configuration for adapters, events, scopes, and telemetry.
 *
 * @typeParam TRegistry - The events registry type for typed pub/sub
 * @typeParam TScopes - The typed scope keys (from addScope)
 *
 * @example
 * ```typescript
 * import { IgniterStore, IgniterStoreRedisAdapter, IgniterStoreEvents } from '@igniter-js/store'
 * import { z } from 'zod'
 * import Redis from 'ioredis'
 *
 * // Define typed events
 * const UserEvents = IgniterStoreEvents
 *   .create('user')
 *   .event('created', z.object({ userId: z.string(), email: z.string().email() }))
 *   .event('deleted', z.object({ userId: z.string() }))
 *   .build()
 *
 * // Configure and build store
 * const store = IgniterStore.create()
 *   .withAdapter(IgniterStoreRedisAdapter.create({ redis: new Redis() }))
 *   .withService('my-api')
 *   .addScope('organization', { required: true })
 *   .addScope('workspace')
 *   .addEvents(UserEvents)
 *   .build()
 *
 * // Publish events
 * await store.events.publish('user:created', { userId: '123', email: 'a@b.com' })
 *
 * // Or use proxy-based typed API
 * await store.events.user.created.publish({ userId: '123', email: 'a@b.com' })
 *
 * // Use with scopes
 * const orgStore = store.scope('organization', 'org-123')
 * await orgStore.events.user.created.publish({ userId: '456', email: 'b@c.com' })
 * ```
 *
 * @see {@link IgniterStoreBuilder} for detailed method documentation
 */
export const IgniterStore = {
  create: IgniterStoreBuilder.create
};
