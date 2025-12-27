/**
 * @fileoverview Event registry types for @igniter-js/telemetry
 * @module @igniter-js/telemetry/types/events
 */

import type { StandardSchemaV1 } from '@igniter-js/core'

/**
 * Base schema interface that supports both Zod and StandardSchemaV1 schemas.
 * This allows flexibility in schema libraries while maintaining type safety.
 */
export interface IgniterTelemetryBaseSchema {
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
 * const schema: IgniterTelemetryEventSchema = z.object({
 *   'ctx.user.id': z.string(),
 *   'ctx.user.email': z.string().email(),
 * })
 * ```
 */
export type IgniterTelemetryEventSchema = StandardSchemaV1 | IgniterTelemetryBaseSchema

/**
 * Descriptor for a telemetry event containing schema and metadata.
 */
export interface IgniterTelemetryEventDescriptor<TSchema extends IgniterTelemetryEventSchema = IgniterTelemetryEventSchema> {
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
 * const eventsMap: IgniterTelemetryEventsMap = {
 *   'worker.started': z.object({ workerId: z.string() }),
 *   job: {
 *     start: z.object({ jobId: z.string() }),
 *     completed: z.object({ jobId: z.string(), duration: z.number() }),
 *   },
 * }
 * ```
 */
export type IgniterTelemetryEventsMap = {
  [key: string]: IgniterTelemetryEventSchema | IgniterTelemetryEventsMap
}

/**
 * Registry of all events added via addEvents().
 * Maps namespace to their event maps.
 */
export type IgniterTelemetryEventsRegistry = {
  [namespace: (string & {})]: IgniterTelemetryEventsMap
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
 * type Keys = IgniterTelemetryFlattenEventKeys<Events, 'igniter.jobs'>
 * // 'igniter.jobs.worker.started' | 'igniter.jobs.job.start'
 * ```
 */
export type IgniterTelemetryFlattenEventKeys<T, Prefix extends string = ''> = T extends IgniterTelemetryEventsMap
  ? {
      [K in keyof T]: T[K] extends IgniterTelemetryEventSchema
        ? Prefix extends ''
          ? K & string
          : `${Prefix}.${K & string}`
        : T[K] extends IgniterTelemetryEventsMap
          ? IgniterTelemetryFlattenEventKeys<
              T[K],
              Prefix extends '' ? K & string : `${Prefix}.${K & string}`
            >
          : never
    }[keyof T]
  : never

/**
 * Flatten a full registry to get all event keys.
 */
export type IgniterTelemetryFlattenRegistryKeys<TRegistry extends IgniterTelemetryEventsRegistry> = {
  [K in keyof TRegistry]: IgniterTelemetryFlattenEventKeys<TRegistry[K], K & string>
}[keyof TRegistry]

/**
 * Get the schema type for a specific event key from a registry.
 */
export type IgniterTelemetryGetEventSchema<
  TRegistry extends IgniterTelemetryEventsRegistry,
  TKey extends string,
> = TKey extends `${infer Namespace}.${infer Rest}`
  ? Namespace extends keyof TRegistry
    ? GetNestedSchema<TRegistry[Namespace], Rest>
    : never
  : never

type GetNestedSchema<T extends IgniterTelemetryEventsMap, TKey extends string> =
  TKey extends keyof T
    ? T[TKey] extends IgniterTelemetryEventSchema
      ? T[TKey]
      : never
    : TKey extends `${infer First}.${infer Rest}`
      ? First extends keyof T
        ? T[First] extends IgniterTelemetryEventsMap
          ? GetNestedSchema<T[First], Rest>
          : never
        : never
      : never

/**
 * Infer the output type from a schema.
 */
export type IgniterTelemetryInferEventSchema<T extends IgniterTelemetryEventSchema> =
  T extends StandardSchemaV1<infer _TInput, infer TOutput>
    ? TOutput
    : never

/**
 * Validation options for event schema validation.
 *
 * @example
 * ```typescript
 * const options: IgniterTelemetryEventsValidationOptions = {
 *   // Only validate in development
 *   mode: process.env.NODE_ENV === 'development' ? 'development' : 'none',
 *
 *   // Throw on unknown event names
 *   strict: true,
 * }
 * ```
 */
export interface IgniterTelemetryEventsValidationOptions {
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
export interface IgniterTelemetryEventsDescriptor<
  TNamespace extends string, 
  TEvents extends IgniterTelemetryEventsMap = IgniterTelemetryEventsMap
> {
  /** The namespace for these events */
  readonly namespace: TNamespace
  /** The events map */
  readonly events: TEvents
  /** The options */
  readonly options?: IgniterTelemetryEventsValidationOptions
  /** Helpers to get event keys and schemas */
  readonly get: {
    /** Get full event key by short key */
    key: <TKey extends IgniterTelemetryFlattenEventKeys<TEvents>>(key: TKey) => `${TNamespace}.${TKey}`
    /** Get event schema by short key */
    schema: <TKey extends IgniterTelemetryFlattenEventKeys<TEvents>>(key: TKey) => GetNestedSchema<TEvents, TKey>
  }
  /** Type inference helper */
  readonly $Infer: {
    namespace: TNamespace
    events: TEvents
    keys: IgniterTelemetryFlattenEventKeys<TEvents>
    registry: {
      [K in TNamespace]: TEvents
    }
  }
}
