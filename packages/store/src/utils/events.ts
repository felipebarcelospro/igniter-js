/**
 * @fileoverview Events builder for typed pub/sub in @igniter-js/store
 * @module @igniter-js/store/utils/events
 *
 * @description
 * Provides utilities for building typed event schemas.
 * The `IgniterStoreEvents` class allows declarative event definitions
 * with full TypeScript inference, designed for modular feature organization.
 *
 * @example
 * ```typescript
 * // src/features/user/user.events.ts
 * import { z } from 'zod'
 * import { IgniterStoreEvents } from '@igniter-js/store'
 *
 * export const UserEvents = IgniterStoreEvents
 *   .event('created', z.object({ userId: z.string(), email: z.string().email() }))
 *   .event('deleted', z.object({ userId: z.string() }))
 *   .group('notifications', (group) =>
 *     group
 *       .event('email', z.object({ to: z.string(), subject: z.string() }))
 *       .event('push', z.object({ token: z.string(), title: z.string() }))
 *   )
 *   .build()
 *
 * // src/igniter.ts
 * import { IgniterStore } from '@igniter-js/store'
 * import { UserEvents } from './features/user/user.events'
 *
 * const store = IgniterStore.create()
 *   .withAdapter(adapter)
 *   .withService('my-api')
 *   .addEvents('user', UserEvents)
 *   .build()
 *
 * // Usage
 * await store.events.publish('user:created', { userId: '123', email: 'a@b.com' })
 * await store.events.user.created.publish({ userId: '123', email: 'a@b.com' })
 * ```
 */

import type { IgniterStoreEventSchema, IgniterStoreEventsMap, RESERVED_NAMESPACES } from '../types/events'
import { IgniterStoreError } from '../errors/igniter-store.error'

/**
 * Validates that a name does not contain dots or reserved characters.
 *
 * @param name - The name to validate
 * @param context - Context for error messages (e.g., 'event', 'group', 'namespace')
 */
function validateEventName(name: string, context: string): void {
  if (!name || typeof name !== 'string') {
    throw new IgniterStoreError({
      code: 'STORE_INVALID_EVENT_NAME',
      message: `${context} name must be a non-empty string`,
      statusCode: 400,
    })
  }

  if (name.includes('.')) {
    throw new IgniterStoreError({
      code: 'STORE_INVALID_EVENT_NAME',
      message: `${context} name "${name}" cannot contain dots (.). Use colons (:) for namespacing or kebab-case for multi-word names.`,
      statusCode: 400,
      details: { name, context },
    })
  }

  if (name.includes(' ')) {
    throw new IgniterStoreError({
      code: 'STORE_INVALID_EVENT_NAME',
      message: `${context} name "${name}" cannot contain spaces. Use kebab-case or snake_case.`,
      statusCode: 400,
      details: { name, context },
    })
  }

  // Check for reserved prefixes
  const reservedPrefixes = ['igniter', 'ign', '__'] as const
  for (const prefix of reservedPrefixes) {
    if (name.toLowerCase().startsWith(prefix)) {
      throw new IgniterStoreError({
        code: 'STORE_RESERVED_NAMESPACE',
        message: `${context} name "${name}" uses reserved prefix "${prefix}". Reserved namespaces are for internal Igniter.js use.`,
        statusCode: 400,
        details: { name, prefix, context },
      })
    }
  }
}

/**
 * Builder for a nested group of events.
 *
 * @typeParam TEvents - The accumulated events map type
 *
 * @example
 * ```typescript
 * const group = IgniterStoreEventsGroup.create()
 *   .event('email', emailSchema)
 *   .event('push', pushSchema)
 * ```
 */
export class IgniterStoreEventsGroup<TEvents extends IgniterStoreEventsMap = {}> {
  private readonly events: TEvents

  private constructor(events: TEvents = {} as TEvents) {
    this.events = events
  }

  /**
   * Creates a new empty group builder.
   */
  static create(): IgniterStoreEventsGroup<{}> {
    return new IgniterStoreEventsGroup({})
  }

  /**
   * Adds an event to the group with its schema.
   *
   * @param name - The event name (no dots allowed)
   * @param schema - The schema for the event's messages
   * @returns A new group builder with the added event
   *
   * @example
   * ```typescript
   * group.event('email', z.object({ to: z.string() }))
   * ```
   */
  event<TName extends string, TSchema extends IgniterStoreEventSchema>(
    name: TName,
    schema: TSchema,
  ): IgniterStoreEventsGroup<TEvents & { [K in TName]: TSchema }> {
    validateEventName(name, 'Event')

    return new IgniterStoreEventsGroup({
      ...this.events,
      [name]: schema,
    } as TEvents & { [K in TName]: TSchema })
  }

  /**
   * Returns the built events map for the group.
   *
   * @returns The events map
   */
  build(): TEvents {
    return this.events
  }
}

/**
 * Builder for creating typed event definitions.
 *
 * Supports flat events and nested groups for organizing related events.
 * All schemas must implement StandardSchemaV1 (like Zod schemas).
 *
 * This class is designed for feature-level organization:
 * - Each feature exports its own events definition
 * - The store builder combines them with `addEvents('namespace', events)`
 *
 * @typeParam TEvents - The accumulated events map type
 *
 * @example
 * ```typescript
 * // Feature-level events definition
 * import { z } from 'zod'
 * import { IgniterStoreEvents } from '@igniter-js/store'
 *
 * export const UserEvents = IgniterStoreEvents
 *   .event('created', z.object({
 *     userId: z.string(),
 *     email: z.string().email(),
 *   }))
 *   .event('deleted', z.object({
 *     userId: z.string(),
 *   }))
 *   .group('notifications', (group) =>
 *     group
 *       .event('email-sent', z.object({ messageId: z.string() }))
 *       .event('push-sent', z.object({ deviceId: z.string() }))
 *   )
 *   .build()
 *
 * // Store setup
 * import { UserEvents } from './features/user/user.events'
 * import { OrderEvents } from './features/orders/order.events'
 *
 * const store = IgniterStore.create()
 *   .withAdapter(adapter)
 *   .withService('my-api')
 *   .addEvents('user', UserEvents)
 *   .addEvents('orders', OrderEvents)
 *   .build()
 *
 * // Usage with string-based API
 * await store.events.publish('user:created', { userId: '123', email: 'test@example.com' })
 *
 * // Usage with proxy-based API
 * await store.events.user.created.publish({ userId: '123', email: 'test@example.com' })
 * const off = await store.events.user.created.subscribe((msg) => {
 *   console.log(msg.userId, msg.email)
 * })
 * await off()
 * ```
 */
export class IgniterStoreEvents<TEvents extends IgniterStoreEventsMap = {}> {
  private readonly events: TEvents

  private constructor(events: TEvents = {} as TEvents) {
    this.events = events
  }

  /**
   * Creates a new events builder with an initial event.
   * This is the recommended entry point for creating event definitions.
   *
   * @param name - The event name (no dots allowed)
   * @param schema - The schema for the event's messages
   * @returns A new events builder with the event added
   *
   * @example
   * ```typescript
   * const events = IgniterStoreEvents
   *   .event('created', z.object({ id: z.string() }))
   *   .event('deleted', z.object({ id: z.string() }))
   *   .build()
   * ```
   */
  static event<TName extends string, TSchema extends IgniterStoreEventSchema>(
    name: TName,
    schema: TSchema,
  ): IgniterStoreEvents<{ [K in TName]: TSchema }> {
    validateEventName(name, 'Event')

    return new IgniterStoreEvents({
      [name]: schema,
    } as { [K in TName]: TSchema })
  }

  /**
   * Creates a new events builder with a group.
   * Alternative entry point for starting with a group.
   *
   * @param name - The group name (no dots allowed)
   * @param builder - A function that configures the group's events
   * @returns A new events builder with the group added
   */
  static group<TName extends string, TGroupEvents extends IgniterStoreEventsMap>(
    name: TName,
    builder: (group: IgniterStoreEventsGroup<{}>) => IgniterStoreEventsGroup<TGroupEvents>,
  ): IgniterStoreEvents<{ [K in TName]: TGroupEvents }> {
    validateEventName(name, 'Group')

    const group = IgniterStoreEventsGroup.create()
    const builtGroup = builder(group).build()

    return new IgniterStoreEvents({
      [name]: builtGroup,
    } as { [K in TName]: TGroupEvents })
  }

  /**
   * Adds an event with its message schema.
   *
   * @param name - The event name (no dots allowed)
   * @param schema - The schema for messages on this event
   * @returns A new builder with the added event
   *
   * @example
   * ```typescript
   * import { z } from 'zod'
   *
   * const events = IgniterStoreEvents
   *   .event('created', z.object({ userId: z.string() }))
   *   .event('updated', z.object({ userId: z.string(), changes: z.record(z.any()) }))
   * ```
   */
  event<TName extends string, TSchema extends IgniterStoreEventSchema>(
    name: TName,
    schema: TSchema,
  ): IgniterStoreEvents<TEvents & { [K in TName]: TSchema }> {
    validateEventName(name, 'Event')

    // Check for duplicate
    if (name in this.events) {
      throw new IgniterStoreError({
        code: 'STORE_DUPLICATE_EVENT',
        message: `Event "${name}" is already defined. Each event name must be unique within the same builder.`,
        statusCode: 400,
        details: { name },
      })
    }

    return new IgniterStoreEvents({
      ...this.events,
      [name]: schema,
    } as TEvents & { [K in TName]: TSchema })
  }

  /**
   * Creates a nested group of events.
   *
   * Groups help organize related events under a common prefix.
   * When using the store, events are accessed with the group prefix (e.g., 'notifications:email').
   *
   * @param name - The group name (becomes the prefix, no dots allowed)
   * @param builder - A function that configures the group's events
   * @returns A new builder with the added group
   *
   * @example
   * ```typescript
   * const events = IgniterStoreEvents
   *   .event('created', createdSchema)
   *   .group('notifications', (group) =>
   *     group
   *       .event('email', z.object({ to: z.string(), subject: z.string() }))
   *       .event('push', z.object({ token: z.string(), title: z.string() }))
   *   )
   *
   * // Access as 'notifications:email' or 'notifications:push'
   * ```
   */
  group<TName extends string, TGroupEvents extends IgniterStoreEventsMap>(
    name: TName,
    builder: (group: IgniterStoreEventsGroup<{}>) => IgniterStoreEventsGroup<TGroupEvents>,
  ): IgniterStoreEvents<TEvents & { [K in TName]: TGroupEvents }> {
    validateEventName(name, 'Group')

    // Check for duplicate
    if (name in this.events) {
      throw new IgniterStoreError({
        code: 'STORE_DUPLICATE_EVENT',
        message: `Group "${name}" conflicts with an existing event or group. Each name must be unique.`,
        statusCode: 400,
        details: { name },
      })
    }

    const group = IgniterStoreEventsGroup.create()
    const builtGroup = builder(group).build()

    return new IgniterStoreEvents({
      ...this.events,
      [name]: builtGroup,
    } as TEvents & { [K in TName]: TGroupEvents })
  }

  /**
   * Builds and returns the final events map.
   *
   * The returned object is a pure descriptor without state,
   * suitable for exporting from feature modules and using with `addEvents()`.
   *
   * @returns The complete events map
   *
   * @example
   * ```typescript
   * // Export from feature module
   * export const UserEvents = IgniterStoreEvents
   *   .event('created', userCreatedSchema)
   *   .event('deleted', userDeletedSchema)
   *   .build()
   *
   * // Use in store builder
   * store = IgniterStore.create()
   *   .addEvents('user', UserEvents)
   *   .build()
   * ```
   */
  build(): TEvents {
    return this.events
  }
}

// Re-export for backwards compatibility
export { IgniterStoreEvents as IgniterStoreEventsSchema }
export { IgniterStoreEventsGroup as IgniterStoreEventsSchemaGroup }
