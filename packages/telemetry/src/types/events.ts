/**
 * @fileoverview Event registry types for @igniter-js/telemetry
 * @module @igniter-js/telemetry/types/events
 */

import type { StandardSchemaV1 } from '@igniter-js/core'

/**
 * Base schema interface that supports both Zod and StandardSchemaV1 schemas.
 * This allows flexibility in schema libraries while maintaining type safety.
 */
export interface TelemetryBaseSchema {
  /** Parse method (Zod-style) */
  parse?: (value: unknown) => unknown
  /** Safe parse method (Zod-style) */
  safeParse?: (value: unknown) => { success: boolean; data?: unknown; error?: unknown }
  /** StandardSchemaV1 validation (optional) */
  '~standard'?: {
    version: 1
    vendor: string
    validate: (value: unknown) => { value: unknown; issues?: undefined } | { issues: ReadonlyArray<{ message: string }> } | Promise<{ value: unknown; issues?: undefined } | { issues: ReadonlyArray<{ message: string }> }>
  }
}

/**
 * Schema definition for a telemetry event.
 * Supports StandardSchemaV1 (like Zod 3.23+), Zod schemas with parse/safeParse,
 * and any schema implementing the base interface.
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 *
 * const schema: TelemetryEventSchema = z.object({
 *   'ctx.user.id': z.string(),
 *   'ctx.user.email': z.string().email(),
 * })
 * ```
 */
export type TelemetryEventSchema = StandardSchemaV1 | TelemetryBaseSchema

/**
 * Descriptor for a telemetry event containing schema and metadata.
 */
export interface TelemetryEventDescriptor<TSchema extends TelemetryEventSchema = TelemetryEventSchema> {
  /** The full event name (namespace.path) */
  readonly name: string
  /** The schema for validating event attributes */
  readonly schema: TSchema
}

/**
 * Map of event names to their schemas.
 * Supports nested schemas via groups.
 *
 * @example
 * ```typescript
 * const eventsMap: TelemetryEventsMap = {
 *   'worker.started': z.object({ workerId: z.string() }),
 *   job: {
 *     start: z.object({ jobId: z.string() }),
 *     completed: z.object({ jobId: z.string(), duration: z.number() }),
 *   },
 * }
 * ```
 */
export type TelemetryEventsMap = {
  [key: string]: TelemetryEventSchema | TelemetryEventsMap
}

/**
 * Registry of all events added via addEvents().
 * Maps namespace to their event maps.
 */
export type TelemetryEventsRegistry = {
  [namespace: string]: TelemetryEventsMap
}

/**
 * Flatten nested events map to get all event keys with namespace prefix.
 *
 * @example
 * ```typescript
 * type Events = {
 *   'worker.started': z.ZodObject<...>,
 *   job: {
 *     start: z.ZodObject<...>,
 *   },
 * }
 * type Keys = TelemetryFlattenEventKeys<Events, 'igniter.jobs'>
 * // 'igniter.jobs.worker.started' | 'igniter.jobs.job.start'
 * ```
 */
export type TelemetryFlattenEventKeys<T, Prefix extends string = ''> = T extends TelemetryEventsMap
  ? {
      [K in keyof T]: T[K] extends TelemetryEventSchema
        ? Prefix extends ''
          ? K & string
          : `${Prefix}.${K & string}`
        : T[K] extends TelemetryEventsMap
          ? TelemetryFlattenEventKeys<
              T[K],
              Prefix extends '' ? K & string : `${Prefix}.${K & string}`
            >
          : never
    }[keyof T]
  : never

/**
 * Flatten a full registry to get all event keys.
 */
export type TelemetryFlattenRegistryKeys<TRegistry extends TelemetryEventsRegistry> = {
  [K in keyof TRegistry]: TelemetryFlattenEventKeys<TRegistry[K], K & string>
}[keyof TRegistry]

/**
 * Get the schema type for a specific event key from a registry.
 */
export type TelemetryGetEventSchema<
  TRegistry extends TelemetryEventsRegistry,
  TKey extends string,
> = TKey extends `${infer Namespace}.${infer Rest}`
  ? Namespace extends keyof TRegistry
    ? GetNestedSchema<TRegistry[Namespace], Rest>
    : never
  : never

type GetNestedSchema<T extends TelemetryEventsMap, TKey extends string> =
  TKey extends keyof T
    ? T[TKey] extends TelemetryEventSchema
      ? T[TKey]
      : never
    : TKey extends `${infer First}.${infer Rest}`
      ? First extends keyof T
        ? T[First] extends TelemetryEventsMap
          ? GetNestedSchema<T[First], Rest>
          : never
        : never
      : never

/**
 * Infer the output type from a schema.
 */
export type TelemetryInferEventSchema<T extends TelemetryEventSchema> =
  T extends StandardSchemaV1<infer _TInput, infer TOutput>
    ? TOutput
    : never

/**
 * Validation options for event schema validation.
 *
 * @example
 * ```typescript
 * const options: TelemetryEventsValidationOptions = {
 *   // Only validate in development
 *   mode: process.env.NODE_ENV === 'development' ? 'development' : 'none',
 *
 *   // Throw on unknown event names
 *   strict: true,
 * }
 * ```
 */
export interface TelemetryEventsValidationOptions {
  /**
   * Validation mode:
   * - `development`: Validate only when NODE_ENV !== 'production'
   * - `always`: Always validate
   * - `none`: Never validate
   *
   * @default 'development'
   */
  mode?: 'development' | 'always' | 'none'

  /**
   * Whether to throw on unknown event names.
   * If false, unknown events will be logged as warnings.
   *
   * @default false
   */
  strict?: boolean
}

/**
 * Built descriptor from IgniterTelemetryEvents.build()
 */
export interface TelemetryEventsDescriptor<TEvents extends TelemetryEventsMap = TelemetryEventsMap> {
  /** The namespace for these events */
  readonly namespace: string
  /** The events map */
  readonly events: TEvents
}
