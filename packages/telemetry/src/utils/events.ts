/**
 * @fileoverview Events builder for typed telemetry events in @igniter-js/telemetry
 * @module @igniter-js/telemetry/utils/events
 *
 * @description
 * Provides utilities for building typed event schemas.
 * The `IgniterTelemetryEvents` class allows declarative event definitions
 * with full TypeScript inference.
 *
 * @example
 * ```typescript
 * // src/features/jobs/jobs.telemetry.ts
 * import { z } from 'zod'
 * import { IgniterTelemetryEvents } from '@igniter-js/telemetry'
 *
 * export const JobsTelemetryEvents = IgniterTelemetryEvents
 *   .namespace('igniter.jobs')
 *   .event('worker.started', z.object({ 'ctx.worker.id': z.string() }))
 *   .group('job', (g) =>
 *     g.event('start', z.object({ 'ctx.job.id': z.string() }))
 *      .event('completed', z.object({ 'ctx.job.id': z.string(), 'ctx.job.duration': z.number() }))
 *      .event('failed', z.object({ 'ctx.job.id': z.string() }))
 *   )
 *   .build()
 *
 * // Usage in telemetry setup
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .addEvents(JobsTelemetryEvents)
 *   .build()
 *
 * // Emit events (type-safe)
 * telemetry.emit('igniter.jobs.job.completed', {
 *   attributes: { 'ctx.job.id': 'job-123', 'ctx.job.duration': 1500 },
 * })
 * ```
 */

import type { TelemetryEventSchema, TelemetryEventsDescriptor, TelemetryEventsMap } from '../types/events'
import { IgniterTelemetryError } from '../errors/igniter-telemetry.error'

/**
 * Reserved namespace prefixes that cannot be used by user code.
 */
const RESERVED_NAMESPACE_PREFIXES = [
  '__',
  '__internal',
] as const

/**
 * Validates that a name does not contain invalid characters.
 *
 * @param name - The name to validate
 * @param context - Context for error messages (e.g., 'event', 'group', 'namespace')
 */
function validateEventName(name: string, context: string): void {
  if (!name || typeof name !== 'string') {
    throw new IgniterTelemetryError({
      code: 'TELEMETRY_INVALID_EVENT_NAME',
      message: `${context} name must be a non-empty string`,
      statusCode: 400,
    })
  }

  if (name.includes(':')) {
    throw new IgniterTelemetryError({
      code: 'TELEMETRY_INVALID_EVENT_NAME',
      message: `${context} name "${name}" cannot contain colons (:). Use dots (.) for namespacing.`,
      statusCode: 400,
      details: { name, context },
    })
  }

  if (name.includes(' ')) {
    throw new IgniterTelemetryError({
      code: 'TELEMETRY_INVALID_EVENT_NAME',
      message: `${context} name "${name}" cannot contain spaces. Use kebab-case or snake_case.`,
      statusCode: 400,
      details: { name, context },
    })
  }

  // Check for reserved prefixes
  for (const prefix of RESERVED_NAMESPACE_PREFIXES) {
    if (name.toLowerCase().startsWith(prefix)) {
      throw new IgniterTelemetryError({
        code: 'TELEMETRY_RESERVED_NAMESPACE',
        message: `${context} name "${name}" uses reserved prefix "${prefix}".`,
        statusCode: 400,
        details: { name, prefix, context },
      })
    }
  }
}

/**
 * Validates a namespace string.
 *
 * @param namespace - The namespace to validate
 */
function validateNamespace(namespace: string): void {
  if (!namespace || typeof namespace !== 'string') {
    throw new IgniterTelemetryError({
      code: 'TELEMETRY_INVALID_NAMESPACE',
      message: 'Namespace must be a non-empty string',
      statusCode: 400,
    })
  }

  if (namespace.includes(':')) {
    throw new IgniterTelemetryError({
      code: 'TELEMETRY_INVALID_NAMESPACE',
      message: `Namespace "${namespace}" cannot contain colons (:). Use dots (.) for namespacing.`,
      statusCode: 400,
      details: { namespace },
    })
  }

  if (namespace.includes(' ')) {
    throw new IgniterTelemetryError({
      code: 'TELEMETRY_INVALID_NAMESPACE',
      message: `Namespace "${namespace}" cannot contain spaces.`,
      statusCode: 400,
      details: { namespace },
    })
  }
}

/**
 * Builder for a nested group of telemetry events.
 *
 * @typeParam TEvents - The accumulated events map type
 *
 * @example
 * ```typescript
 * const group = IgniterTelemetryEventsGroup.create()
 *   .event('start', startSchema)
 *   .event('completed', completedSchema)
 *   .event('failed', failedSchema)
 * ```
 */
export class IgniterTelemetryEventsGroup<TEvents extends TelemetryEventsMap = {}> {
  private readonly events: TEvents

  private constructor(events: TEvents = {} as TEvents) {
    this.events = events
  }

  /**
   * Creates a new empty group builder.
   *
   * @returns A new IgniterTelemetryEventsGroup instance
   */
  static create(): IgniterTelemetryEventsGroup<{}> {
    return new IgniterTelemetryEventsGroup({})
  }

  /**
   * Adds an event to the group with its schema.
   *
   * @param name - The event name (no colons allowed)
   * @param schema - The schema for the event's attributes
   * @returns A new group builder with the added event
   *
   * @example
   * ```typescript
   * group.event('completed', z.object({ 'ctx.job.id': z.string() }))
   * ```
   */
  event<TName extends string, TSchema extends TelemetryEventSchema>(
    name: TName,
    schema: TSchema,
  ): IgniterTelemetryEventsGroup<TEvents & { [K in TName]: TSchema }> {
    validateEventName(name, 'Event')

    return new IgniterTelemetryEventsGroup({
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
  TEvents extends TelemetryEventsMap = {},
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
    validateNamespace(namespace)
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
  event<TName extends string, TSchema extends TelemetryEventSchema>(
    name: TName,
    schema: TSchema,
  ): IgniterTelemetryEvents<TNamespace, TEvents & { [K in TName]: TSchema }> {
    validateEventName(name, 'Event')

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
  group<TName extends string, TGroupEvents extends TelemetryEventsMap>(
    name: TName,
    builder: (group: IgniterTelemetryEventsGroup<{}>) => IgniterTelemetryEventsGroup<TGroupEvents>,
  ): IgniterTelemetryEvents<TNamespace, TEvents & { [K in TName]: TGroupEvents }> {
    validateEventName(name, 'Group')

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
   *
   * @example
   * ```typescript
   * const descriptor = IgniterTelemetryEvents
   *   .namespace('igniter.jobs')
   *   .event('worker.started', schema)
   *   .build()
   *
   * // descriptor.namespace === 'igniter.jobs'
   * // descriptor.events === { 'worker.started': schema }
   * ```
   */
  build(): TelemetryEventsDescriptor<TEvents> {
    return {
      namespace: this.ns,
      events: this.events,
    }
  }
}
