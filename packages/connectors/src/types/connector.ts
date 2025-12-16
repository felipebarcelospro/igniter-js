/**
 * @fileoverview Connector definition and action types for IgniterConnector
 * @module @igniter-js/connectors/types/connector
 */

import type { StandardSchemaV1 } from '@igniter-js/core'
import type {
  IgniterConnectorField,
  InferSchemaOutput,
  IgniterConnectorConfigWithOAuth,
} from './config'
import type { IgniterConnectorHooks } from './hooks'
import type { IgniterConnectorOAuthData, IgniterConnectorOAuthOptions } from './oauth'
import type { IgniterConnectorWebhookDefinition } from './webhook'

// =============================================================================
// ACTION TYPES
// =============================================================================

/**
 * Context passed to action handlers.
 *
 * @typeParam TInput - The action input type
 * @typeParam TConfig - The connector configuration type
 * @typeParam TContext - The connector context type
 */
export interface IgniterConnectorActionContext<
  TInput,
  TConfig,
  TContext = unknown,
> {
  /** The validated action input */
  input: TInput
  /** The connector configuration (decrypted) */
  config: TConfig
  /** The connector context (from onContext hook) */
  context: TContext
  /** OAuth data if the connector uses OAuth */
  oauth?: IgniterConnectorOAuthData
  /** The scope type */
  scope: string
  /** The scope identifier */
  identity: string
}

/**
 * Action handler function type.
 *
 * @typeParam TInput - The action input type
 * @typeParam TOutput - The action output type
 * @typeParam TConfig - The connector configuration type
 * @typeParam TContext - The connector context type
 */
export type IgniterConnectorActionHandler<
  TInput,
  TOutput,
  TConfig,
  TContext = unknown,
> = (
  context: IgniterConnectorActionContext<TInput, TConfig, TContext>
) => Promise<TOutput> | TOutput

/**
 * Action definition options.
 *
 * @typeParam TInputSchema - The Zod schema type for input validation
 * @typeParam TOutputSchema - The Zod schema type for output validation (optional)
 * @typeParam TConfig - The connector configuration type
 * @typeParam TContext - The connector context type
 *
 * @example
 * ```typescript
 * const sendMessageAction: IgniterConnectorActionOptions<
 *   typeof inputSchema,
 *   typeof outputSchema,
 *   TelegramConfig
 * > = {
 *   description: 'Send a message to a Telegram chat',
 *   input: z.object({ message: z.string() }),
 *   output: z.object({ messageId: z.string() }),
 *   handler: async ({ input, config }) => {
 *     const messageId = await sendTelegramMessage(config.botToken, config.chatId, input.message)
 *     return { messageId }
 *   },
 * }
 * ```
 */
export interface IgniterConnectorActionOptions<
  TInputSchema extends StandardSchemaV1,
  TOutputSchema extends StandardSchemaV1 | undefined,
  TConfig,
  TContext = unknown,
> {
  /** Human-readable description of the action */
  description?: string

  /** Zod schema for validating action input */
  input: TInputSchema

  /**
   * Zod schema for validating action output (optional).
   * If not provided, the output type is inferred from the handler return type.
   */
  output?: TOutputSchema

  /** Handler function that executes the action */
  handler: IgniterConnectorActionHandler<
    InferSchemaOutput<TInputSchema>,
    TOutputSchema extends StandardSchemaV1
      ? InferSchemaOutput<TOutputSchema>
      : unknown,
    TConfig,
    TContext
  >
}

/**
 * Internal action definition after configuration.
 * Preserves the input/output schema types for inference.
 * 
 * @typeParam TInputSchema - The input schema type
 * @typeParam TOutputSchema - The output schema type (optional)
 * @typeParam TConfig - The connector configuration type
 * @typeParam TContext - The connector context type
 * @typeParam THandlerOutput - The inferred handler return type (used when TOutputSchema is undefined)
 */
export interface IgniterConnectorActionDefinition<
  TInputSchema extends StandardSchemaV1 = StandardSchemaV1,
  TOutputSchema extends StandardSchemaV1 | undefined = undefined,
  TConfig = unknown,
  TContext = unknown,
  THandlerOutput = unknown,
> {
  /** Human-readable description */
  description?: string
  /** Input validation schema */
  input: TInputSchema
  /** Output validation schema (optional) */
  output?: TOutputSchema
  /** Handler function */
  handler: IgniterConnectorActionHandler<
    InferSchemaOutput<TInputSchema>,
    TOutputSchema extends StandardSchemaV1 ? InferSchemaOutput<TOutputSchema> : THandlerOutput,
    TConfig,
    TContext
  >
}

/**
 * Map of action keys to their definitions.
 */
export type IgniterConnectorActionMap<TConfig = unknown, TContext = unknown> = Record<
  string,
  IgniterConnectorActionDefinition<StandardSchemaV1, StandardSchemaV1 | undefined, TConfig, TContext, any>
>

// =============================================================================
// CONNECTOR DEFINITION TYPES
// =============================================================================

/**
 * Complete connector definition.
 * This is the result of calling `Connector.create().build()`.
 *
 * @typeParam TConfigSchema - The Zod schema type for configuration
 * @typeParam TMetadataSchema - The Zod schema type for metadata
 * @typeParam TMetadataValue - The metadata value type
 * @typeParam TContext - The connector context type
 * @typeParam TActions - The actions map type
 */
export interface IgniterConnectorDefinition<
  TConfigSchema extends StandardSchemaV1 = StandardSchemaV1,
  TMetadataSchema extends StandardSchemaV1 = StandardSchemaV1,
  TMetadataValue = unknown,
  TContext = unknown,
  TActions extends IgniterConnectorActionMap<
    InferSchemaOutput<TConfigSchema>,
    TContext
  > = IgniterConnectorActionMap<InferSchemaOutput<TConfigSchema>, TContext>,
  TOAuth = unknown,
> {
  /** Configuration schema */
  configSchema: TConfigSchema
  /** Metadata schema */
  metadataSchema?: TMetadataSchema
  /** Metadata value */
  metadata?: TMetadataValue
  /** Default configuration (for system connectors) */
  defaultConfig?: InferSchemaOutput<TConfigSchema>
  /** OAuth configuration */
  oauth?: TOAuth
  /** Webhook configuration */
  webhook?: IgniterConnectorWebhookDefinition<
    InferSchemaOutput<TConfigSchema>,
    TContext
  >
  /** Actions map */
  actions: TActions
  /** Connector hooks */
  hooks: IgniterConnectorHooks<InferSchemaOutput<TConfigSchema>, TContext>
}

// =============================================================================
// CONNECTOR INSTANCE TYPES (runtime)
// =============================================================================

/**
 * Connector instance data returned from `get()`.
 * Contains runtime state and configuration.
 *
 * @typeParam TConfig - The connector configuration type
 * @typeParam TMetadata - The metadata type
 *
 * @example
 * ```typescript
 * const telegram = await scoped.telegram.get()
 * // {
 * //   type: 'custom',
 * //   enabled: true,
 * //   provider: 'telegram',
 * //   config: { botToken: '***', chatId: '123' },
 * //   metadata: { name: 'Telegram', icon: 'telegram.svg' },
 * //   fields: [{ key: 'botToken', type: 'string', required: true, sensitive: true }, ...],
 * //   updatedAt: Date,
 * // }
 * ```
 */
export interface IgniterConnectorInstance<
  TConfig = Record<string, unknown>,
  TMetadata = Record<string, unknown>,
> {
  /** Connector key */
  key: string
  /** Connector type: 'oauth' if OAuth is configured, 'custom' otherwise */
  type: 'oauth' | 'custom'
  /** Whether the connector is enabled */
  enabled: boolean
  /** The connector key (alias for key) */
  provider: string
  /** The configuration (with sensitive fields encrypted/masked) */
  config: TConfig | null
  /** The connector metadata */
  metadata: TMetadata
  /** OAuth data if the connector uses OAuth */
  oauth?: {
    accessToken: string
    refreshToken?: string
    expiresAt?: Date
    expiresIn?: number
    userInfo?: Record<string, unknown>
    connectedAt?: Date
  }
  /** Webhook data if the connector uses webhooks */
  webhook?: {
    secret: string
    url: string
    enabled: boolean

  }
  /** Configuration fields for UI rendering */
  fields: IgniterConnectorField[]
  /** Creation timestamp */
  createdAt?: Date
  /** Last update timestamp */
  updatedAt?: Date
}

/**
 * Result from executing a connector action.
 *
 * @typeParam TOutput - The action output type
 */
export interface IgniterConnectorActionResult<TOutput> {
  /** The action output data (if successful) */
  data?: TOutput
  /** The error (if failed) */
  error?: Error
}

// =============================================================================
// TYPE HELPERS
// =============================================================================

/**
 * Extract the configuration type from a connector definition.
 */
export type ExtractConnectorConfig<TDef> = TDef extends IgniterConnectorDefinition<
  infer TConfigSchema,
  any,
  any,
  any,
  any
>
  ? TDef['oauth'] extends IgniterConnectorOAuthOptions
    ? IgniterConnectorConfigWithOAuth<InferSchemaOutput<TConfigSchema>>
    : InferSchemaOutput<TConfigSchema>
  : never

/**
 * Extract the metadata type from a connector definition.
 */
export type ExtractConnectorMetadata<TDef> = TDef extends IgniterConnectorDefinition<
  any,
  any,
  infer TMetadataValue,
  any,
  any
>
  ? TMetadataValue
  : never

/**
 * Extract the actions type from a connector definition.
 */
export type ExtractConnectorActions<TDef> = TDef extends IgniterConnectorDefinition<
  any,
  any,
  any,
  any,
  infer TActions
>
  ? TActions
  : TDef extends { actions: infer TActions }
    ? TActions
    : never

/**
 * Extract action keys from a connector definition.
 * Uses direct property access for better inference.
 * Handles the case where TActions might be an intersection with empty objects.
 */
export type ExtractConnectorActionKeys<TDef> = 
  TDef extends { actions: infer TActions }
    ? {
        [K in keyof TActions]: TActions[K] extends IgniterConnectorActionDefinition<any, any, any, any, any> ? K : never
      }[keyof TActions] & string
    : never

/**
 * Extract action input type from an action definition.
 */
export type ExtractActionInput<TAction> =
  TAction extends IgniterConnectorActionDefinition<
    infer TInputSchema,
    any,
    any,
    any,
    any
  >
    ? TInputSchema extends StandardSchemaV1
      ? InferSchemaOutput<TInputSchema>
      : never
    : never

export type ExtractConnectorConnectInput<TDef> = TDef extends IgniterConnectorDefinition<
  infer TConfigSchema,
  any,
  any,
  any,
  any,
  infer TOAuth
>
  ? TOAuth extends { authorizationUrl: string }
    ? { redirectUri?: string}
    : InferSchemaOutput<TConfigSchema>
  : never

export type ExtractConnectorConnectOutput<TDef> = TDef extends IgniterConnectorDefinition<
  any,
  any,
  any,
  any,
  any,
  infer TOAuth
>
  ? TOAuth extends { authorizationUrl: string }
    ? Promise<Response>
    : Promise<void>
  : never

/**
 * Extract action output type from an action definition.
 */
/**
 * Extract action output type from an action definition.
 * Returns the output schema type if defined, otherwise infers from handler return type.
 */
export type ExtractActionOutput<TAction> =
  TAction extends IgniterConnectorActionDefinition<
    any,
    infer TOutputSchema,
    any,
    any,
    infer THandlerOutput
  >
    ? TOutputSchema extends StandardSchemaV1
      ? InferSchemaOutput<TOutputSchema>
      : THandlerOutput
    : never

/**
 * Extract action input type directly from connectors map.
 * This is more reliable for type inference in method signatures.
 */
export type InferActionInput<
  TConnectors extends Record<string, IgniterConnectorDefinition>,
  K extends keyof TConnectors,
  A extends string
> = ExtractConnectorActions<TConnectors[K]> extends infer TActions
  ? TActions extends Record<string, IgniterConnectorActionDefinition<any, any, any, any, any>>
    ? A extends keyof TActions
      ? ExtractActionInput<TActions[A]>
      : unknown
    : unknown
  : unknown

/**
 * Extract action output type directly from connectors map.
 * This is more reliable for type inference in method signatures.
 */
export type InferActionOutput<
  TConnectors extends Record<string, IgniterConnectorDefinition>,
  K extends keyof TConnectors,
  A extends string
> = ExtractConnectorActions<TConnectors[K]> extends infer TActions
  ? TActions extends Record<string, IgniterConnectorActionDefinition<any, any, any, any, any>>
    ? A extends keyof TActions
      ? ExtractActionOutput<TActions[A]>
      : unknown
    : unknown
  : unknown
