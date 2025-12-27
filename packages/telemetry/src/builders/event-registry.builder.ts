/**
 * @fileoverview Events builder for typed telemetry events in @igniter-js/telemetry
 * @module @igniter-js/telemetry/utils/events
 *
 * @description
 * Provides utilities for building typed event schemas.
 * The `IgniterTelemetryEvents` class allows declarative event definitions
 * with full TypeScript inference.
 */

import type { IgniterTelemetryEventSchema, IgniterTelemetryEventsDescriptor, IgniterTelemetryEventsMap, IgniterTelemetryFlattenEventKeys } from '../types/events'
import { IgniterTelemetryValidator } from '../utils/validator'
import { IgniterTelemetryEventsGroup } from './event-registry-group.builder'

/**
 * Builder for creating typed telemetry event definitions.
 *
 * Events use dot notation for namespacing (e.g., 'igniter.jobs.job.completed').
 * The namespace is required and must be set before adding events.
 *
 * @typeParam TNamespace - The namespace string type
 * @typeParam TEvents - The accumulated events map type
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 * import { IgniterTelemetryEvents } from '@igniter-js/telemetry'
 *
 * export const JobsTelemetryEvents = IgniterTelemetryEvents
 *   .namespace('igniter.jobs')
 *   .event('worker.started', z.object({ 'ctx.worker.id': z.string() }))
 *   .group('job', (g) =>
 *     g.event('start', z.object({ 'ctx.job.id': z.string() }))
 *      .event('completed', z.object({ 'ctx.job.id': z.string() }))
 *   )
 *   .build()
 *
 * // Event names will be:
 * // - 'igniter.jobs.worker.started'
 * // - 'igniter.jobs.job.start'
 * // - 'igniter.jobs.job.completed'
 * ```
 */
export class IgniterTelemetryEvents<
  TNamespace extends string = string,
  TEvents extends IgniterTelemetryEventsMap = {},
> {
  private readonly ns: TNamespace
  private readonly events: TEvents

  private constructor(namespace: TNamespace, events: TEvents = {} as TEvents) {
    this.ns = namespace
    this.events = events
  }

  /**
   * Creates a new events builder with a namespace.
   *
   * The namespace is required and will be prefixed to all event names.
   *
   * @param namespace - The namespace for these events (e.g., 'igniter.jobs')
   * @returns A new IgniterTelemetryEvents builder
   *
   * @example
   * ```typescript
   * const builder = IgniterTelemetryEvents.namespace('igniter.jobs')
   * ```
   */
  static namespace<TNamespace extends string>(namespace: TNamespace): IgniterTelemetryEvents<TNamespace, {}> {
    IgniterTelemetryValidator.validate(namespace, 'Namespace')
    return new IgniterTelemetryEvents(namespace, {})
  }

  /**
   * Adds a flat event with its schema.
   *
   * @param name - The event name (will be prefixed with namespace)
   * @param schema - The schema for the event's attributes
   * @returns A new builder with the added event
   *
   * @example
   * ```typescript
   * builder.event('worker.started', z.object({ 'ctx.worker.id': z.string() }))
   * // Full event name: 'igniter.jobs.worker.started'
   * ```
   */
  event<TName extends string, TSchema extends IgniterTelemetryEventSchema>(
    name: TName,
    schema: TSchema,
  ): IgniterTelemetryEvents<TNamespace, TEvents & { [K in TName]: TSchema }> {
    IgniterTelemetryValidator.validate(name, 'Event')

    return new IgniterTelemetryEvents(this.ns, {
      ...this.events,
      [name]: schema,
    } as TEvents & { [K in TName]: TSchema })
  }

  /**
   * Adds a group of related events.
   *
   * Groups are useful for organizing related events under a common prefix.
   *
   * @param name - The group name (will be part of the event path)
   * @param builder - A function that builds the group's events
   * @returns A new builder with the added group
   *
   * @example
   * ```typescript
   * builder.group('job', (g) =>
   *   g.event('start', startSchema)
   *    .event('completed', completedSchema)
   *    .event('failed', failedSchema)
   * )
   * // Full event names:
   * // - 'igniter.jobs.job.start'
   * // - 'igniter.jobs.job.completed'
   * // - 'igniter.jobs.job.failed'
   * ```
   */
  group<TName extends string, TGroupEvents extends IgniterTelemetryEventsMap>(
    name: TName,
    builder: (group: IgniterTelemetryEventsGroup<{}>) => IgniterTelemetryEventsGroup<TGroupEvents>,
  ): IgniterTelemetryEvents<TNamespace, TEvents & { [K in TName]: TGroupEvents }> {
    IgniterTelemetryValidator.validate(name, 'Group')

    const group = builder(IgniterTelemetryEventsGroup.create())
    const groupEvents = group.build()

    return new IgniterTelemetryEvents(this.ns, {
      ...this.events,
      [name]: groupEvents,
    } as TEvents & { [K in TName]: TGroupEvents })
  }

  /**
   * Builds the events descriptor.
   *
   * @returns The events descriptor with namespace and events map
   */
  build(): IgniterTelemetryEventsDescriptor<TNamespace, TEvents> {
    return {
      namespace: this.ns,
      events: this.events,
      get: {
        /**
         * Get full event key by short key
         * @param key - The short event key
         * @returns The full event key with namespace
         */
        key: <TKey extends IgniterTelemetryFlattenEventKeys<TEvents>>(key: TKey) => {
          const keyStr = String(key)
          
          // Check if it exists as a flat key first
          if (keyStr in this.events) {
            return `${this.ns}.${key}` as `${TNamespace}.${TKey}`
          }
          
          // Otherwise navigate through nested structure
          const parts = keyStr.split('.')
          let current = this.events as any

          for (let i = 0; i < parts.length; i++) {
            const part = parts[i]

            if (current[part]) {
              current = current[part]
              continue
            }

            const remaining = parts.slice(i).join('.')
            if (current[remaining]) {
              return `${this.ns}.${key}` as `${TNamespace}.${TKey}`
            }

            throw new Error(`Event "${key}" is not defined in namespace "${this.ns}"`)
          }

          return `${this.ns}.${key}` as `${TNamespace}.${TKey}`
        },
        /**
         * Get event schema by short key
         * @param key - The short event key
         * @returns The event schema
         */
        schema: <TKey extends IgniterTelemetryFlattenEventKeys<TEvents>>(key: TKey) => {
          const keyStr = String(key)
          
          // Check if it exists as a flat key first
          if (keyStr in this.events) {
            return (this.events as any)[keyStr] as IgniterTelemetryEventSchema
          }
          
          // Otherwise navigate through nested structure
          const parts = keyStr.split('.')
          let current = this.events as any

          for (let i = 0; i < parts.length; i++) {
            const part = parts[i]

            if (current[part]) {
              current = current[part]
              continue
            }

            const remaining = parts.slice(i).join('.')
            if (current[remaining]) {
              return current[remaining]
            }

            throw new Error(`Event "${key}" is not defined in namespace "${this.ns}"`)
          }

          return current as IgniterTelemetryEventSchema
        },
      },
      $Infer: {
        namespace: {} as TNamespace,
        events: {} as TEvents,
        keys: {} as IgniterTelemetryFlattenEventKeys<TEvents>,      
        registry: {} as { [K in TNamespace]: TEvents }
      }
    }
  }
}
