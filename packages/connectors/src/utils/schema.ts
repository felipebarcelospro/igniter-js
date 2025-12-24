/**
 * @fileoverview Schema validation utilities for IgniterConnector
 * @module @igniter-js/connectors/utils/schema
 */

import type { StandardSchemaV1 } from '@igniter-js/core'

/**
 * Validation result from schema validation.
 */
export interface IgniterConnectorValidationResult<T> {
  /** Whether validation passed */
  success: boolean
  /** The validated data (if successful) */
  data?: T
  /** Validation errors (if failed) */
  errors?: Array<{ path: string; message: string }>
}

/**
 * Static utility class for schema validation operations.
 * Works with any StandardSchemaV1 compatible schema (Zod, Valibot, etc.).
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 *
 * const schema = z.object({
 *   name: z.string(),
 *   age: z.number(),
 * })
 *
 * const result = await IgniterConnectorSchema.validate(schema, { name: 'John', age: 30 })
 * if (result.success) {
 *   console.log(result.data) // { name: 'John', age: 30 }
 * } else {
 *   console.log(result.errors) // [{ path: 'age', message: 'Expected number' }]
 * }
 * ```
 */
export class IgniterConnectorSchema {
  /**
   * Validate data against a StandardSchemaV1 schema.
   *
   * @param schema - The schema to validate against
   * @param data - The data to validate
   * @returns Validation result with success status and data or errors
   *
   * @example
   * ```typescript
   * const schema = z.object({ email: z.string().email() })
   * const result = await IgniterConnectorSchema.validate(schema, { email: 'test@example.com' })
   * ```
   */
  static async validate<TSchema extends StandardSchemaV1>(
    schema: TSchema,
    data: unknown
  ): Promise<
    IgniterConnectorValidationResult<
      TSchema extends StandardSchemaV1<unknown, infer TOutput> ? TOutput : never
    >
  > {
    try {
      // Data Transform: Use StandardSchema validation
      const result = await schema['~standard'].validate(data)

      // Conditional: Check validation result
      if (result.issues) {
        // Response: Return validation errors
        return {
          success: false,
          errors: result.issues.map((issue) => ({
            path: issue.path?.map((p) => typeof p === 'object' && p !== null && 'key' in p ? String(p.key) : String(p)).join('.') ?? '',
            message: issue.message,
          })),
        }
      }

      // Response: Return validated data
      return {
        success: true,
        data: result.value as any,
      }
    } catch (error) {
      // Error Handling: Handle unexpected validation errors
      return {
        success: false,
        errors: [
          {
            path: '',
            message:
              error instanceof Error ? error.message : 'Validation failed',
          },
        ],
      }
    }
  }

  /**
   * Validate data and throw if invalid.
   *
   * @param schema - The schema to validate against
   * @param data - The data to validate
   * @returns The validated data
   * @throws Error if validation fails
   *
   * @example
   * ```typescript
   * const schema = z.object({ email: z.string().email() })
   * const validData = await IgniterConnectorSchema.validateOrThrow(schema, { email: 'test@example.com' })
   * ```
   */
  static async validateOrThrow<TSchema extends StandardSchemaV1>(
    schema: TSchema,
    data: unknown
  ): Promise<
    TSchema extends StandardSchemaV1<unknown, infer TOutput> ? TOutput : never
  > {
    const result = await IgniterConnectorSchema.validate(schema, data)

    // Conditional: Throw if validation failed
    if (!result.success) {
      const errorMessages = result.errors
        ?.map((e) => `${e.path}: ${e.message}`)
        .join(', ')
      throw new Error(`Validation failed: ${errorMessages}`)
    }

    return result.data as any
  }

  /**
   * Check if a value is a valid StandardSchemaV1 schema.
   *
   * @param value - The value to check
   * @returns True if the value is a StandardSchemaV1 schema
   *
   * @example
   * ```typescript
   * import { z } from 'zod'
   *
   * IgniterConnectorSchema.isSchema(z.string()) // true
   * IgniterConnectorSchema.isSchema('string') // false
   * ```
   */
  static isSchema(value: unknown): value is StandardSchemaV1 {
    return (
      typeof value === 'object' &&
      value !== null &&
      '~standard' in value &&
      typeof (value as StandardSchemaV1)['~standard']?.validate === 'function'
    )
  }

  /**
   * Get the type name from a schema for display purposes.
   *
   * @param schema - The schema to get the type from
   * @returns A human-readable type name
   *
   * @example
   * ```typescript
   * const schema = z.object({ name: z.string() })
   * IgniterConnectorSchema.getTypeName(schema) // 'object'
   * ```
   */
  static getTypeName(schema: StandardSchemaV1): string {
    // Data Transform: Extract type from schema metadata
    const standard = schema['~standard']

    // Conditional: Check for vendor-specific type info
    if ('vendor' in standard && standard.vendor === 'zod') {
      // Zod schemas have _def with typeName
      const zodSchema = schema as any
      if (zodSchema._def?.typeName) {
        return zodSchema._def.typeName.replace('Zod', '').toLowerCase()
      }
    }

    // Fallback: Return generic type
    return 'unknown'
  }
}
