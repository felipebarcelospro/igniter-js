import type { IgniterStoreEventSchema, IgniterStoreEventsDirectory } from "../types/events"
import { IgniterStoreEventValidator } from "../utils/events"

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
export class IgniterStoreEventsGroupBuilder<TEvents extends IgniterStoreEventsDirectory = {}> {
  private readonly events: TEvents

  private constructor(events: TEvents = {} as TEvents) {
    this.events = events
  }

  /**
   * Creates a new empty group builder.
   * @returns A new IgniterStoreEventsGroupBuilder instance
   *
   * @example
   * ```typescript
   * const group = IgniterStoreEventsGroup.create()
   * ```
   */
  static create(): IgniterStoreEventsGroupBuilder<{}> {
    return new IgniterStoreEventsGroupBuilder({})
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
  ): IgniterStoreEventsGroupBuilder<TEvents & { [K in TName]: TSchema }> {
    IgniterStoreEventValidator.ensureValidName(name, 'Event')

    return new IgniterStoreEventsGroupBuilder({
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
 * Alias for the IgniterStoreEventsGroupBuilder class.
 * 
 * Used to create and build groups of events with their associated schemas.
 * Provides a fluent API for building event groups with type-safe schema validation.
 * 
 * @see IgniterStoreEventsGroupBuilder
 * 
 * @example
 * ```typescript
 * const eventGroup = IgniterStoreEventsGroup
 *   .create()
 *   .event('user_created', z.object({ userId: z.string(), email: z.string() }))
 *   .event('user_updated', z.object({ userId: z.string(), changes: z.record(z.unknown()) }))
 *   .build()
 * ```
 */
export const IgniterStoreEventsGroup = {
  create: IgniterStoreEventsGroupBuilder.create
}