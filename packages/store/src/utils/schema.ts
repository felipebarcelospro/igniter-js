/**
 * @fileoverview Schema utilities for typed pub/sub in @igniter-js/store
 * @module @igniter-js/store/utils/schema
 *
 * @description
 * Provides legacy utilities for building flat typed schemas for pub/sub channels.
 * Prefer {@link IgniterStoreEvents} for new projects.
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 * import { IgniterStoreEventsSchema } from '@igniter-js/store'
 *
 * const schemas = IgniterStoreEventsSchema.create()
 *   .channel('user:created', z.object({ userId: z.string() }))
 *   .channel('user:updated', z.object({ userId: z.string(), changes: z.record(z.any()) }))
 *   .group('notifications', (group) =>
 *     group
 *       .channel('email', z.object({ to: z.string(), subject: z.string() }))
 *       .channel('push', z.object({ token: z.string(), title: z.string() }))
 *   )
 *   .build()
 * ```
 */

import type { IgniterStoreSchemaMap } from '../types/schema'
import type { IgniterStoreEventSchema } from '../types/events'

/**
 * Builder for a nested group of channels.
 *
 * @typeParam TSchemas - The accumulated schema map type
 *
 * @example
 * ```typescript
 * const group = new IgniterStoreEventsSchemaGroup()
 *   .channel('email', emailSchema)
 *   .channel('push', pushSchema)
 * ```
 */
export class IgniterStoreEventsSchemaGroup<
  TSchemas extends IgniterStoreSchemaMap = {},
> {
  private schemas: TSchemas

  constructor(schemas: TSchemas = {} as TSchemas) {
    this.schemas = schemas
  }

  /**
   * Adds a channel to the group with its schema.
   *
   * @param name - The channel name
   * @param schema - The schema for the channel's messages
   * @returns A new group builder with the added channel
   *
   * @example
   * ```typescript
   * group.channel('email', z.object({ to: z.string() }))
   * ```
   */
  channel<TName extends string, TSchema extends IgniterStoreEventSchema>(
    name: TName,
    schema: TSchema,
  ): IgniterStoreEventsSchemaGroup<TSchemas & { [K in TName]: TSchema }> {
    return new IgniterStoreEventsSchemaGroup({
      ...this.schemas,
      [name]: schema,
    } as TSchemas & { [K in TName]: TSchema })
  }

  /**
   * Returns the built schema map for the group.
   *
   * @returns The schema map
   */
  build(): TSchemas {
    return this.schemas
  }
}

/**
 * Builder for creating typed event schemas.
 *
 * Supports flat channels and nested groups for organizing related events.
 * All schemas must implement StandardSchemaV1 (like Zod schemas).
 *
 * @typeParam TSchemas - The accumulated schema map type
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 * import { IgniterStoreEventsSchema } from '@igniter-js/store'
 *
 * // Define schemas with full type inference
 * const schemas = IgniterStoreEventsSchema.create()
 *   .channel('user:created', z.object({
 *     userId: z.string(),
 *     email: z.string().email(),
 *   }))
 *   .channel('user:deleted', z.object({
 *     userId: z.string(),
 *   }))
 *   .group('orders', (group) =>
 *     group
 *       .channel('created', z.object({ orderId: z.string(), total: z.number() }))
 *       .channel('shipped', z.object({ orderId: z.string(), trackingId: z.string() }))
 *   )
 *   .build()
 *
 * // For new projects, prefer IgniterStoreEvents.create('namespace')
 * ```
 */
export class IgniterStoreEventsSchema<
  TSchemas extends IgniterStoreSchemaMap = {},
> {
  private schemas: TSchemas

  private constructor(schemas: TSchemas = {} as TSchemas) {
    this.schemas = schemas
  }

  /**
   * Creates a new schema builder.
   *
   * @returns A new IgniterStoreEventsSchema builder
   *
   * @example
   * ```typescript
   * const builder = IgniterStoreEventsSchema.create()
   * ```
   */
  static create(): IgniterStoreEventsSchema<{}> {
    return new IgniterStoreEventsSchema({})
  }

  /**
   * Merges another schema map into this builder.
   *
   * @param schemas - The schema map to merge
   * @returns A new builder with merged schemas
   *
   * @example
   * ```typescript
   * const baseSchemas = { 'user:created': userCreatedSchema }
   * const builder = IgniterStoreEventsSchema.create()
   *   .merge(baseSchemas)
   *   .channel('user:deleted', userDeletedSchema)
   * ```
   */
  merge<TNewSchemas extends IgniterStoreSchemaMap>(
    schemas: TNewSchemas,
  ): IgniterStoreEventsSchema<TSchemas & TNewSchemas> {
    return new IgniterStoreEventsSchema({
      ...this.schemas,
      ...schemas,
    } as TSchemas & TNewSchemas)
  }

  /**
   * Adds a channel with its message schema.
   *
   * @param name - The channel name
   * @param schema - The schema for messages on this channel
   * @returns A new builder with the added channel
   *
   * @example
   * ```typescript
   * import { z } from 'zod'
   *
   * const builder = IgniterStoreEventsSchema.create()
   *   .channel('user:created', z.object({ userId: z.string() }))
   * ```
   */
  channel<TName extends string, TSchema extends IgniterStoreEventSchema>(
    name: TName,
    schema: TSchema,
  ): IgniterStoreEventsSchema<TSchemas & { [K in TName]: TSchema }> {
    return new IgniterStoreEventsSchema({
      ...this.schemas,
      [name]: schema,
    } as TSchemas & { [K in TName]: TSchema })
  }

  /**
   * Creates a nested group of channels.
   *
   * Groups help organize related channels under a common prefix.
   * When using the store, channels are accessed with the group prefix (e.g., 'notifications:email').
   *
   * @param name - The group name (becomes the prefix)
   * @param builder - A function that configures the group's channels
   * @returns A new builder with the added group
   *
   * @example
   * ```typescript
   * const builder = IgniterStoreEventsSchema.create()
   *   .group('notifications', (group) =>
   *     group
   *       .channel('email', z.object({ to: z.string(), subject: z.string() }))
   *       .channel('push', z.object({ token: z.string(), title: z.string() }))
   *   )
   *
   * // Access as 'notifications:email' or 'notifications:push'
   * ```
   */
  group<TName extends string, TGroupSchemas extends IgniterStoreSchemaMap>(
    name: TName,
    builder: (
      group: IgniterStoreEventsSchemaGroup<{}>,
    ) => IgniterStoreEventsSchemaGroup<TGroupSchemas>,
  ): IgniterStoreEventsSchema<TSchemas & { [K in TName]: TGroupSchemas }> {
    const group = new IgniterStoreEventsSchemaGroup({})
    const builtGroup = builder(group).build()

    return new IgniterStoreEventsSchema({
      ...this.schemas,
      [name]: builtGroup,
    } as TSchemas & { [K in TName]: TGroupSchemas })
  }

  /**
   * Builds and returns the final schema map.
   *
   * @returns The complete schema map
   *
   * @example
   * ```typescript
   * const schemas = IgniterStoreEventsSchema.create()
   *   .channel('user:created', userCreatedSchema)
   *   .build()
   * ```
   */
  build(): TSchemas {
    return this.schemas
  }
}
