/**
 * @fileoverview Configuration types for IgniterConnector
 * @module @igniter-js/connectors/types/config
 */

import type { StandardSchemaV1 } from '@igniter-js/core'
import type { IgniterConnectorOAuthData } from './oauth'

/**
 * Base configuration type that all connector configs extend.
 * When OAuth is enabled, the `oauth` field is automatically added.
 *
 * @typeParam TConfig - The user-defined configuration schema type
 *
 * @example
 * ```typescript
 * // Without OAuth
 * type TelegramConfig = IgniterConnectorConfigBase<{
 *   botToken: string
 *   chatId: string
 * }>
 * // Result: { botToken: string, chatId: string }
 *
 * // With OAuth (oauth field added automatically by the system)
 * type MailchimpConfig = IgniterConnectorConfigWithOAuth<{
 *   listId: string
 * }>
 * // Result: { listId: string, oauth?: IgniterConnectorOAuthData }
 * ```
 */
export type IgniterConnectorConfigBase<TConfig> = TConfig

/**
 * Configuration type with OAuth data included.
 *
 * @typeParam TConfig - The user-defined configuration schema type
 */
export type IgniterConnectorConfigWithOAuth<TConfig> = TConfig & {
  /** OAuth data (tokens and account info) */
  oauth?: IgniterConnectorOAuthData
}

/**
 * Field definition for connector configuration UI.
 * Extracted from the Zod schema for rendering forms.
 *
 * @example
 * ```typescript
 * const field: IgniterConnectorField = {
 *   key: 'botToken',
 *   type: 'string',
 *   label: 'Bot Token',
 *   description: 'Your Telegram bot token',
 *   required: true,
 *   sensitive: true,
 * }
 * ```
 */
export interface IgniterConnectorField {
  /** Field key/name */
  key: string
  /** Field type for UI rendering */
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'textarea'
  /** Human-readable label */
  label?: string
  /** Field description/help text */
  description?: string
  /** Whether the field is required */
  required: boolean
  /** Whether the field contains sensitive data (e.g., passwords, tokens) */
  sensitive?: boolean
  /** Default value */
  defaultValue?: unknown
  /** Options for select/multiselect fields */
  options?: Array<{ label: string; value: string }>
  /** Placeholder text */
  placeholder?: string
}

/**
 * Metadata schema definition for a connector.
 * Used to store static information about the connector.
 *
 * @typeParam TSchema - The Zod schema type for metadata
 * @typeParam TValue - The inferred value type from the schema
 */
export interface IgniterConnectorMetadata<TSchema, TValue> {
  /** The metadata schema */
  schema: TSchema
  /** The metadata value (validated against schema) */
  value: TValue
}

/**
 * Encryption configuration for connector fields.
 *
 * @example
 * ```typescript
 * const encryption: IgniterConnectorEncryptionConfig = {
 *   fields: ['accessToken', 'refreshToken', 'apiKey'],
 *   encrypt: async (value) => customEncrypt(value),
 *   decrypt: async (value) => customDecrypt(value),
 * }
 * ```
 */
export interface IgniterConnectorEncryptionConfig {
  /** List of field names to encrypt */
  fields: string[]
  /**
   * Custom encrypt function.
   * If not provided, AES-256-GCM with IGNITER_SECRET is used.
   */
  encrypt?: (value: string) => Promise<string> | string
  /**
   * Custom decrypt function.
   * If not provided, AES-256-GCM with IGNITER_SECRET is used.
   */
  decrypt?: (value: string) => Promise<string> | string
}

/**
 * Infer the output type from a StandardSchema.
 *
 * @typeParam TSchema - The schema type
 */
export type InferSchemaOutput<TSchema> = TSchema extends StandardSchemaV1<
  infer _TInput,
  infer TOutput
>
  ? TOutput
  : never

/**
 * Infer the input type from a StandardSchema.
 *
 * @typeParam TSchema - The schema type
 */
export type InferSchemaInput<TSchema> = TSchema extends StandardSchemaV1<
  infer TInput,
  infer _TOutput
>
  ? TInput
  : never
