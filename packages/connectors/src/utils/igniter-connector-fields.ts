/**
 * @fileoverview Field extraction utilities for IgniterConnector
 * @module @igniter-js/connectors/utils/fields
 */

import type { StandardSchemaV1 } from '@igniter-js/core'
import type { IgniterConnectorField } from '../types/config'

/**
 * Static utility class for extracting field definitions from Zod schemas.
 * Used to generate form fields for connector configuration UIs.
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 *
 * const schema = z.object({
 *   apiKey: z.string().describe('Your API key'),
 *   enabled: z.boolean().default(true),
 * })
 *
 * const fields = IgniterConnectorFields.fromSchema(schema)
 * // [
 * //   { key: 'apiKey', type: 'string', required: true, description: 'Your API key' },
 * //   { key: 'enabled', type: 'boolean', required: false, defaultValue: true },
 * // ]
 * ```
 */
export class IgniterConnectorFields {
  /**
   * Common field names that should be marked as sensitive.
   */
  private static readonly SENSITIVE_FIELD_PATTERNS = [
    /token/i,
    /secret/i,
    /password/i,
    /key/i,
    /credential/i,
    /auth/i,
    /private/i,
  ]

  /**
   * Extract field definitions from a Zod schema.
   *
   * @param schema - The Zod schema to extract fields from
   * @returns Array of field definitions
   *
   * @example
   * ```typescript
   * const schema = z.object({
   *   botToken: z.string(),
   *   chatId: z.string(),
   *   enabled: z.boolean().optional(),
   * })
   *
   * const fields = IgniterConnectorFields.fromSchema(schema)
   * ```
   */
  static fromSchema(schema: StandardSchemaV1): IgniterConnectorField[] {
    // Validation: Check if schema is Zod-like
    const zodSchema = schema as any

    // Conditional: Check for Zod object schema
    if (!zodSchema._def || zodSchema._def.typeName !== 'ZodObject') {
      return []
    }

    const shape = zodSchema._def.shape?.() ?? zodSchema._def.shape ?? {}
    const fields: IgniterConnectorField[] = []

    // Loop: Process each field in the schema
    for (const [key, fieldSchema] of Object.entries(shape)) {
      const field = IgniterConnectorFields.extractField(key, fieldSchema)
      if (field) {
        fields.push(field)
      }
    }

    return fields
  }

  /**
   * Extract a single field definition from a Zod field schema.
   *
   * @param key - The field key/name
   * @param fieldSchema - The Zod field schema
   * @returns The field definition or null if not extractable
   */
  private static extractField(
    key: string,
    fieldSchema: unknown
  ): IgniterConnectorField | null {
    const schema = fieldSchema as any

    // Validation: Check for valid schema
    if (!schema || !schema._def) {
      return null
    }

    // Data Transform: Unwrap optional/nullable/default wrappers
    let currentSchema = schema
    let isRequired = true
    let defaultValue: unknown = undefined

    // Loop: Unwrap wrapper types
    while (currentSchema._def) {
      const typeName = currentSchema._def.typeName

      if (typeName === 'ZodOptional') {
        isRequired = false
        currentSchema = currentSchema._def.innerType
      } else if (typeName === 'ZodNullable') {
        isRequired = false
        currentSchema = currentSchema._def.innerType
      } else if (typeName === 'ZodDefault') {
        isRequired = false
        defaultValue = currentSchema._def.defaultValue?.()
        currentSchema = currentSchema._def.innerType
      } else {
        break
      }
    }

    // Data Transform: Extract type and description
    const type = IgniterConnectorFields.mapZodTypeToFieldType(currentSchema._def.typeName)
    const description = currentSchema._def.description ?? schema.description

    // Data Transform: Check for sensitive field
    const sensitive = IgniterConnectorFields.isSensitiveField(key)

    // Data Transform: Extract enum options
    const options = IgniterConnectorFields.extractOptions(currentSchema)

    // Response: Build field definition
    const field: IgniterConnectorField = {
      key,
      type,
      required: isRequired,
      sensitive,
    }

    // Conditional: Add optional properties
    if (description) {
      field.description = description
    }

    if (defaultValue !== undefined) {
      field.defaultValue = defaultValue
    }

    if (options) {
      field.options = options
    }

    // Data Transform: Generate label from key
    field.label = IgniterConnectorFields.generateLabel(key)

    return field
  }

  /**
   * Map Zod type names to connector field types.
   *
   * @param zodTypeName - The Zod type name
   * @returns The connector field type
   */
  private static mapZodTypeToFieldType(
    zodTypeName: string
  ): IgniterConnectorField['type'] {
    switch (zodTypeName) {
      case 'ZodString':
        return 'string'
      case 'ZodNumber':
        return 'number'
      case 'ZodBoolean':
        return 'boolean'
      case 'ZodEnum':
        return 'select'
      case 'ZodArray':
        return 'multiselect'
      default:
        return 'string'
    }
  }

  /**
   * Check if a field name matches sensitive patterns.
   *
   * @param fieldName - The field name to check
   * @returns True if the field should be marked as sensitive
   */
  private static isSensitiveField(fieldName: string): boolean {
    return IgniterConnectorFields.SENSITIVE_FIELD_PATTERNS.some((pattern) =>
      pattern.test(fieldName)
    )
  }

  /**
   * Extract options from enum/union schemas.
   *
   * @param schema - The Zod schema
   * @returns Array of options or undefined
   */
  private static extractOptions(
    schema: any
  ): Array<{ label: string; value: string }> | undefined {
    // Conditional: Check for enum values
    if (schema._def.typeName === 'ZodEnum' && schema._def.values) {
      return schema._def.values.map((value: string) => ({
        label: IgniterConnectorFields.generateLabel(value),
        value,
      }))
    }

    // Conditional: Check for native enum
    if (schema._def.typeName === 'ZodNativeEnum' && schema._def.values) {
      return Object.entries(schema._def.values)
        .filter(([key]) => Number.isNaN(Number(key)))
        .map(([key, value]) => ({
          label: IgniterConnectorFields.generateLabel(key),
          value: String(value),
        }))
    }

    return undefined
  }

  /**
   * Generate a human-readable label from a field key.
   *
   * @param key - The field key (camelCase or snake_case)
   * @returns Human-readable label
   *
   * @example
   * ```typescript
   * IgniterConnectorFields.generateLabel('apiKey') // 'Api Key'
   * IgniterConnectorFields.generateLabel('webhook_url') // 'Webhook Url'
   * ```
   */
  static generateLabel(key: string): string {
    return (
      key
        // Data Transform: Handle camelCase
        .replace(/([A-Z])/g, ' $1')
        // Data Transform: Handle snake_case
        .replace(/_/g, ' ')
        // Data Transform: Capitalize first letter of each word
        .replace(/\b\w/g, (char) => char.toUpperCase())
        // Data Transform: Clean up extra spaces
        .trim()
    )
  }

  /**
   * Merge schema fields with stored configuration values.
   *
   * @param fields - The extracted fields from schema
   * @param config - The stored configuration values
   * @returns Fields with values populated
   *
   * @example
   * ```typescript
   * const fields = IgniterConnectorFields.fromSchema(schema)
   * const fieldsWithValues = IgniterConnectorFields.mergeWithConfig(fields, storedConfig)
   * ```
   */
  static mergeWithConfig(
    fields: IgniterConnectorField[],
    config: Record<string, unknown> | null
  ): IgniterConnectorField[] {
    // Conditional: Return fields as-is if no config
    if (!config) {
      return fields
    }

    // Data Transform: Add values from config to fields
    return fields.map((field) => {
      const value = config[field.key]
      if (value !== undefined) {
        return { ...field, defaultValue: value }
      }
      return field
    })
  }
}
