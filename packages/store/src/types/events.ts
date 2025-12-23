/**
 * @fileoverview Event types for @igniter-js/store typed events
 * @module @igniter-js/store/types/events
 */

import type { StandardSchemaV1 } from '@igniter-js/core'

/**
 * Schema definition for a single event.
 * Can be a StandardSchemaV1 (like Zod) for the message payload.
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 *
 * const schema: IgniterStoreEventSchema = z.object({
 *   userId: z.string(),
 *   action: z.enum(['created', 'updated', 'deleted']),
 * })
 * ```
 */
export type IgniterStoreEventSchema = StandardSchemaV1

/**
 * Event descriptor built from IgniterStoreEvents.build()
 * Contains the schema and metadata for an event.
 */
export interface IgniterStoreEventDescriptor<
  TSchema extends IgniterStoreEventSchema = IgniterStoreEventSchema,
  TEvents extends IgniterStoreEventsDirectory = {},
> {
  /** The full event name (namespace:eventName) */
  readonly schema: TSchema
  /** The namespace this event belongs to */
  readonly namespace: string
  /** Type inference helper */
  readonly $Infer: {
    namespace: string
    events: TEvents
    keys: IgniterStoreFlattenEventKeys<TEvents>
  }
}

/**
 * Map of event names to their schemas.
 * Supports nested schemas for organization via groups.
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 *
 * const schemas: IgniterStoreEventsDirectory = {
 *   created: z.object({ userId: z.string() }),
 *   updated: z.object({ userId: z.string(), changes: z.record(z.any()) }),
 *   notifications: {
 *     email: z.object({ to: z.string(), subject: z.string() }),
 *     push: z.object({ token: z.string(), title: z.string() }),
 *   },
 * }
 * ```
 */
export type IgniterStoreEventsDirectory = {
  [key: string]: IgniterStoreEventSchema | IgniterStoreEventsDirectory
}

/**
 * Registry of all events added via addEvents().
 * Maps namespace to their event maps.
 */
export type IgniterStoreEventsRegistry = {
  [namespace: string]: IgniterStoreEventsDirectory
}

/**
 * Flatten nested events map to get all event keys with namespace prefix.
 * Used for type inference of event names.
 *
 * @example
 * ```typescript
 * type Events = {
 *   created: z.ZodObject<...>,
 *   notifications: {
 *     email: z.ZodObject<...>,
 *   },
 * }
 * type Keys = IgniterStoreFlattenEventKeys<Events, 'user'>
 * // 'user:created' | 'user:notifications:email'
 * ```
 */
export type IgniterStoreFlattenEventKeys<T, Prefix extends string = ''> = T extends IgniterStoreEventsDirectory
  ? {
      [K in keyof T]: T[K] extends IgniterStoreEventSchema
        ? Prefix extends ''
          ? K & string
          : `${Prefix}:${K & string}`
        : T[K] extends IgniterStoreEventsDirectory
          ? IgniterStoreFlattenEventKeys<
              T[K],
              Prefix extends '' ? K & string : `${Prefix}:${K & string}`
            >
          : never
    }[keyof T]
  : never

/**
 * Flatten a full registry to get all event keys.
 */
export type IgniterStoreFlattenRegistryKeys<TRegistry extends IgniterStoreEventsRegistry> = {
  [K in keyof TRegistry]: IgniterStoreFlattenEventKeys<TRegistry[K], K & string>
}[keyof TRegistry]

/**
 * Get the schema type for a specific event key from a registry.
 *
 * @example
 * ```typescript
 * type Registry = { user: { created: z.ZodObject<{ userId: z.ZodString }> } }
 * type Schema = IgniterStoreGetEventSchema<Registry, 'user:created'>
 * // z.ZodObject<{ userId: z.ZodString }>
 * ```
 */
export type IgniterStoreGetEventSchema<
  TRegistry extends IgniterStoreEventsRegistry,
  TKey extends string,
> = TKey extends `${infer Namespace}:${infer Rest}`
  ? Namespace extends keyof TRegistry
    ? GetNestedSchema<TRegistry[Namespace], Rest>
    : never
  : never

type GetNestedSchema<T extends IgniterStoreEventsDirectory, TKey extends string> =
  TKey extends keyof T
    ? T[TKey] extends IgniterStoreEventSchema
      ? T[TKey]
      : never
    : TKey extends `${infer First}:${infer Rest}`
      ? First extends keyof T
        ? T[First] extends IgniterStoreEventsDirectory
          ? GetNestedSchema<T[First], Rest>
          : never
        : never
      : never

/**
 * Infer the output type from a schema.
 *
 * @example
 * ```typescript
 * const schema = z.object({ userId: z.string() })
 * type Output = IgniterStoreInferEventSchema<typeof schema>
 * // { userId: string }
 * ```
 */
export type IgniterStoreInferEventSchema<T extends IgniterStoreEventSchema> =
  T extends StandardSchemaV1<infer _TInput, infer TOutput>
    ? TOutput
    : never

/**
 * Configuration for schema validation behavior.
 *
 * @example
 * ```typescript
 * const config: IgniterStoreEventsValidationOptions = {
 *   validatePublish: true,
 *   validateSubscribe: false,
 *   throwOnValidationError: true,
 * }
 * ```
 */
export interface IgniterStoreEventsValidationOptions {
  /** Whether to validate messages when publishing (default: true) */
  validatePublish?: boolean
  /** Whether to validate messages when receiving (default: false) */
  validateSubscribe?: boolean
  /** Whether to throw on validation errors (default: true) */
  throwOnValidationError?: boolean
}

// ============================================================================
// Event Handler Types
// ============================================================================

/**
 * Context passed to event handlers with full metadata.
 */
export interface IgniterStoreEventContext<TEvent extends string = string, TPayload = unknown> {
  /** The event type (full key like 'user:created') */
  type: TEvent
  /** The event payload/message */
  data: TPayload
  /** The timestamp when the event was published */
  timestamp: string
  /** The current scope information (if scoped) */
  scope?: {
    key: string
    identifier: string
  }
}

/**
 * Handler function that receives the full event context.
 */
export type IgniterStoreEventContextHandler<TContext = IgniterStoreEventContext> = (
  ctx: TContext,
) => void | Promise<void>

/**
 * Unsubscribe function returned by subscribe.
 */
export type IgniterStoreUnsubscribeFn = () => Promise<void>

// ============================================================================
// Wildcard Pattern Matching Types
// ============================================================================

/**
 * Check if a pattern matches an event key.
 * Supports:
 * - Exact match: 'user:created' matches 'user:created'
 * - Wildcard suffix: 'user:*' matches 'user:created', 'user:deleted'
 * - Full wildcard: '*' matches everything
 */
type PatternMatches<TPattern extends string, TKey extends string> =
  TPattern extends '*'
    ? true
    : TPattern extends `${infer Prefix}:*`
      ? TKey extends `${Prefix}:${string}`
        ? true
        : false
      : TPattern extends TKey
        ? true
        : false

/**
 * Get all event keys from a registry that match a pattern.
 */
export type IgniterStoreMatchingEventKeys<
  TRegistry extends IgniterStoreEventsRegistry,
  TPattern extends string
> = {
  [K in IgniterStoreFlattenRegistryKeys<TRegistry>]: PatternMatches<TPattern, K> extends true ? K : never
}[IgniterStoreFlattenRegistryKeys<TRegistry>]

/**
 * Build a union of event contexts for all matching event keys.
 * This provides reactive typing when using wildcards.
 *
 * @example
 * // If pattern is 'user:*' and user has 'created' and 'deleted' events:
 * // Result is: 
 * // | { type: 'user:created', data: { userId: string }, ... }
 * // | { type: 'user:deleted', data: { userId: string }, ... }
 */
export type IgniterStoreWildcardEventContext<
  TRegistry extends IgniterStoreEventsRegistry,
  TPattern extends string,
> = TPattern extends IgniterStoreFlattenRegistryKeys<TRegistry>
  // Exact match - single typed context
  ? IgniterStoreEventContext<
      TPattern,
      IgniterStoreInferEventSchema<IgniterStoreGetEventSchema<TRegistry, TPattern>>
    >
  : TPattern extends '*'
    // Full wildcard - union of all events plus fallback
    ? {
        [K in IgniterStoreFlattenRegistryKeys<TRegistry>]: IgniterStoreEventContext<
          K,
          IgniterStoreInferEventSchema<IgniterStoreGetEventSchema<TRegistry, K>>
        >
      }[IgniterStoreFlattenRegistryKeys<TRegistry>] | IgniterStoreEventContext<string, unknown>
    : TPattern extends `${infer Prefix}:*`
      // Namespace wildcard - union of matching events plus fallback
      ? {
          [K in IgniterStoreFlattenRegistryKeys<TRegistry>]: K extends `${Prefix}:${string}`
            ? IgniterStoreEventContext<
                K,
                IgniterStoreInferEventSchema<IgniterStoreGetEventSchema<TRegistry, K>>
              >
            : never
        }[IgniterStoreFlattenRegistryKeys<TRegistry>] | IgniterStoreEventContext<`${Prefix}:${string}`, unknown>
      // Unknown pattern - generic context
      : IgniterStoreEventContext<string, unknown>

/**
 * Proxy-based event accessor for a single event.
 * Provides publish() and subscribe() methods.
 */
export interface IgniterStoreEventAccessor<TPayload> {
  /**
   * Publishes a message to this event channel.
   *
   * @param message - The message payload (typed)
   */
  publish(message: TPayload): Promise<void>

  /**
   * Subscribes to this event channel.
   *
   * @param handler - The callback to invoke when messages are received
   * @returns An unsubscribe function
   */
  subscribe(handler: IgniterStoreEventContextHandler<IgniterStoreEventContext<string, TPayload>>): Promise<IgniterStoreUnsubscribeFn>
}

/**
 * Build proxy type for a single namespace's events.
 */
export type IgniterStoreEventsProxy<TEvents extends IgniterStoreEventsDirectory> = {
  [K in keyof TEvents]: TEvents[K] extends IgniterStoreEventSchema
    ? IgniterStoreEventAccessor<IgniterStoreInferEventSchema<TEvents[K]>>
    : TEvents[K] extends IgniterStoreEventsDirectory
      ? IgniterStoreEventsProxy<TEvents[K]>
      : never
}

/**
 * Build proxy type for the full registry.
 */
export type IgniterStoreEventsRegistryProxy<TRegistry extends IgniterStoreEventsRegistry> = {
  [K in keyof TRegistry]: IgniterStoreEventsProxy<TRegistry[K]>
}
