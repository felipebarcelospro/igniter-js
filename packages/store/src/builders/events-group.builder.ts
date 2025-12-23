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
export class IgniterStoreEventsGroup<TEvents extends IgniterStoreEventsDirectory = {}> {
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
    IgniterStoreEventValidator.ensureValidName(name, 'Event')

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
