/**
 * @fileoverview Schema types for @igniter-js/store typed pub/sub
 * @module @igniter-js/store/types/schema
 */

import type { StandardSchemaV1 } from '@igniter-js/core'
import type { IgniterStoreEventSchema } from './events'


/**
 * Map of channel names to their schemas.
 * Supports nested schemas for organization.
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 *
 * const schemas: IgniterStoreSchemaMap = {
 *   'user:created': z.object({ userId: z.string() }),
 *   'user:updated': z.object({ userId: z.string(), changes: z.record(z.any()) }),
 *   notifications: {
 *     email: z.object({ to: z.string(), subject: z.string() }),
 *     push: z.object({ token: z.string(), title: z.string() }),
 *   },
 * }
 * ```
 */
export type IgniterStoreSchemaMap = {
  [key: string]: IgniterStoreEventSchema | IgniterStoreSchemaMap
}

/**
 * Flatten nested schema map to get all channel keys.
 * Used for type inference of channel names.
 *
 * @example
 * ```typescript
 * type Schemas = {
 *   'user:created': z.ZodObject<...>,
 *   notifications: {
 *     email: z.ZodObject<...>,
 *   },
 * }
 * type Keys = IgniterStoreFlattenKeys<Schemas>
 * // 'user:created' | 'notifications:email'
 * ```
 */
export type IgniterStoreFlattenKeys<T, Prefix extends string = ''> = T extends IgniterStoreSchemaMap
  ? {
      [K in keyof T]: T[K] extends IgniterStoreEventSchema
        ? Prefix extends ''
          ? K & string
          : `${Prefix}:${K & string}`
        : T[K] extends IgniterStoreSchemaMap
          ? IgniterStoreFlattenKeys<
              T[K],
              Prefix extends '' ? K & string : `${Prefix}:${K & string}`
            >
          : never
    }[keyof T]
  : never

/**
 * Get the schema type for a specific channel key from a schema map.
 *
 * @example
 * ```typescript
 * type Schemas = { 'user:created': z.ZodObject<{ userId: z.ZodString }> }
 * type Schema = IgniterStoreGetSchema<Schemas, 'user:created'>
 * // z.ZodObject<{ userId: z.ZodString }>
 * ```
 */
export type IgniterStoreGetSchema<
  TSchemas extends IgniterStoreSchemaMap,
  TKey extends string,
> = TKey extends keyof TSchemas
  ? TSchemas[TKey] extends IgniterStoreEventSchema
    ? TSchemas[TKey]
    : never
  : TKey extends `${infer First}:${infer Rest}`
    ? First extends keyof TSchemas
      ? TSchemas[First] extends IgniterStoreSchemaMap
        ? IgniterStoreGetSchema<TSchemas[First], Rest>
        : never
      : never
    : never

/**
 * Infer the output type from a schema.
 *
 * @example
 * ```typescript
 * const schema = z.object({ userId: z.string() })
 * type Output = IgniterStoreInferSchema<typeof schema>
 * // { userId: string }
 * ```
 */
export type IgniterStoreInferSchema<T extends IgniterStoreEventSchema> =
  T extends StandardSchemaV1<infer TInput, infer TOutput>
    ? TOutput
    : never

/**
 * Configuration for schema validation behavior.
 *
 * @example
 * ```typescript
 * const config: IgniterStoreSchemaValidationOptions = {
 *   validatePublish: true,
 *   validateSubscribe: false,
 *   throwOnValidationError: true,
 * }
 * ```
 */
export interface IgniterStoreSchemaValidationOptions {
  /** Whether to validate messages when publishing (default: true) */
  validatePublish?: boolean
  /** Whether to validate messages when receiving (default: false) */
  validateSubscribe?: boolean
  /** Whether to throw on validation errors (default: true) */
  throwOnValidationError?: boolean
}
