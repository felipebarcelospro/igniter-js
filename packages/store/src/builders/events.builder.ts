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
 *   .create('user')
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
 *   .addEvents(UserEvents)
 *   .build()
 *
 * // Usage
 * await store.events.publish('user:created', { userId: '123', email: 'a@b.com' })
 * await store.events.user.created.publish({ userId: '123', email: 'a@b.com' })
 * ```
 */

import type { IgniterStoreEventSchema, IgniterStoreEventsDirectory } from '../types/events'
import { IgniterStoreError } from '../errors/store.error'
import { IgniterStoreEventValidator } from '../utils/events'
import { IgniterStoreEventsGroup } from './events-group.builder'


/**
 * Builder for creating typed event definitions.
 *
 * Supports flat events and nested groups for organizing related events.
 * All schemas must implement StandardSchemaV1 (like Zod schemas).
 *
 * This class is designed for feature-level organization:
 * - Each feature exports its own events definition
 * - The store builder combines them with `addEvents(events)`
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
 *   .addEvents(UserEvents)
 *   .addEvents(OrderEvents)
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
export class IgniterStoreEvents<
  TNamespace,
  TEvents extends IgniterStoreEventsDirectory = {}
> {
  readonly events: TEvents
  readonly namespace: TNamespace

  private constructor(
    namespace: TNamespace,
    events: TEvents = {} as TEvents
  ) {
    this.namespace = namespace
    this.events = events
  }
  
  static create<TNewNamespace extends string>(namespace: TNewNamespace): IgniterStoreEvents<TNewNamespace, {}> {
    IgniterStoreEventValidator.ensureValidName(namespace, 'Namespace')
    return new IgniterStoreEvents<TNewNamespace, {}>(namespace, {})
  }

  /**
   * Adds an event with its message schema.
   *
   * @param namespace - The event name (no dots allowed)
   * @param schema - The schema for messages on this event
   * @returns A new builder with the added event
   *
   * @example
   * ```typescript
   * import { z } from 'zod'
   *
   * const events = IgniterStoreEvents
   *   .create('user')
   *   .event('created', z.object({ userId: z.string() }))
   *   .event('updated', z.object({ userId: z.string(), changes: z.record(z.any()) }))
   * ```
   */
  event<TName extends string, TSchema extends IgniterStoreEventSchema>(
    name: TName,
    schema: TSchema,
  ): IgniterStoreEvents<
    TNamespace, 
    TEvents & { [K in TName]: TSchema }
  > {
    IgniterStoreEventValidator.ensureValidName(name, 'Event')

    // Check for duplicate
    if (name in this.events) {
      throw new IgniterStoreError({
        code: 'STORE_DUPLICATE_EVENT',
        message: `Event "${name}" is already defined. Each event name must be unique within the same builder.`,
        statusCode: 400,
        details: { name },
      })
    }

    return new IgniterStoreEvents(this.namespace, {
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
   *   .create('user')
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
  group<TName extends string, TGroupEvents extends IgniterStoreEventsDirectory>(
    name: TName,
    builder: (group: IgniterStoreEventsGroup<{}>) => IgniterStoreEventsGroup<TGroupEvents>,
  ): IgniterStoreEvents<TNamespace, TEvents & { [K in TName]: TGroupEvents }> {
    IgniterStoreEventValidator.ensureValidName(name, 'Group')

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

    return new IgniterStoreEvents(this.namespace, {
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
   *   .create('user')
   *   .event('created', userCreatedSchema)
   *   .event('deleted', userDeletedSchema)
   *   .build()
   *
   * // Use in store builder
   * store = IgniterStore.create()
   *   .addEvents(UserEvents)
   *   .build()
   * ```
   */
  build() {
    return {
      namespace: this.namespace,
      events: this.events,
      $Infer: {} as {
        namespace: TNamespace
        events: TEvents
      }
    }
  }
}
