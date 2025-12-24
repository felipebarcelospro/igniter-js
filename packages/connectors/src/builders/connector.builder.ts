/**
 * @fileoverview IgniterConnector builder for creating connector definitions
 * @module @igniter-js/connectors/builders/connector
 */

import type { StandardSchemaV1 } from '@igniter-js/core'
import type {
  IgniterConnectorActionDefinition,
  IgniterConnectorActionHandler,
  IgniterConnectorActionMap,
  IgniterConnectorDefinition,
} from '../types/connector'
import type { InferSchemaOutput } from '../types/config'
import type {
  IgniterConnectorHooks,
  IgniterConnectorOnContextHook,
  IgniterConnectorOnValidateHook,
} from '../types/hooks'
import type { IgniterConnectorOAuthOptions } from '../types/oauth'
import type { IgniterConnectorWebhookOptions } from '../types/webhook'

/**
 * Builder class for creating connector definitions.
 * Uses a fluent API pattern for configuration.
 *
 * @typeParam TConfigSchema - The Zod schema type for configuration
 * @typeParam TMetadataSchema - The Zod schema type for metadata
 * @typeParam TMetadataValue - The metadata value type
 * @typeParam TContext - The connector context type
 * @typeParam TActions - The actions map type
 *
 * @example
 * ```typescript
 * import { IgniterConnector } from '@igniter-js/connectors'
 * import { z } from 'zod'
 *
 * const telegram = IgniterConnector.create()
 *   .withConfig(z.object({
 *     botToken: z.string(),
 *     chatId: z.string(),
 *   }))
 *   .withMetadata(
 *     z.object({ name: z.string(), icon: z.string() }),
 *     { name: 'Telegram', icon: 'telegram.svg' }
 *   )
 *   .addAction('sendMessage', {
 *     description: 'Send a message',
 *     input: z.object({ message: z.string() }),
 *     output: z.object({ messageId: z.string() }),
 *     handler: async ({ input, config }) => {
 *       return { messageId: '123' }
 *     },
 *   })
 *   .build()
 * ```
 */
export class IgniterConnectorBuilder<
  TConfigSchema extends StandardSchemaV1 = StandardSchemaV1<
    Record<string, unknown>,
    Record<string, unknown>
  >,
  TMetadataSchema extends StandardSchemaV1 = StandardSchemaV1<
    Record<string, unknown>,
    Record<string, unknown>
  >,
  TMetadataValue = unknown,
  TContext = unknown,
  TActions extends IgniterConnectorActionMap<
    InferSchemaOutput<TConfigSchema>,
    TContext
    // biome-ignore lint/complexity/noBannedTypes: Empty object is required for proper type inference - using {} instead of Record<string, never> preserves specific action keys when doing intersection types
  > = {},
  TOAuth = unknown,
> {
  /** Configuration schema */
  private configSchema?: TConfigSchema

  /** Metadata schema */
  private metadataSchema?: TMetadataSchema

  /** Metadata value */
  private metadataValue?: TMetadataValue

  /** Default configuration for system connectors */
  private defaultConfig?: InferSchemaOutput<TConfigSchema>

  /** OAuth configuration */
  private oauthOptions?: TOAuth

  /** Webhook configuration */
  private webhookOptions?: IgniterConnectorWebhookOptions<
    StandardSchemaV1,
    InferSchemaOutput<TConfigSchema>,
    TContext
  >

  /** Actions map */
  private actions: TActions = {} as TActions

  /** IgniterConnector hooks */
  private hooks: IgniterConnectorHooks<
    InferSchemaOutput<TConfigSchema>,
    TContext
  > = {}

  /**
   * Private constructor. Use `IgniterConnector.create()` instead.
   */
  private constructor() {}

  /**
   * Create a new connector builder.
   *
   * @returns A new IgniterConnectorBuilder instance
   *
   * @example
   * ```typescript
   * const builder = IgniterConnector.create()
   * ```
   */
  static create(): IgniterConnectorBuilder {
    return new IgniterConnectorBuilder()
  }

  /**
   * Set the configuration schema for the connector.
   * This defines what fields users need to fill when connecting.
   *
   * @param schema - Zod schema for configuration validation
   * @returns The builder with updated config type
   *
   * @example
   * ```typescript
   * .withConfig(z.object({
   *   apiKey: z.string().describe('Your API key'),
   *   webhookUrl: z.string().url().optional(),
   * }))
   * ```
   */
  withConfig<TNewConfigSchema extends StandardSchemaV1>(
    schema: TNewConfigSchema
  ): IgniterConnectorBuilder<
    TNewConfigSchema,
    TMetadataSchema,
    TMetadataValue,
    TContext,
    // biome-ignore lint/complexity/noBannedTypes: Empty object preserves specific action keys
    {},
    TOAuth
  > {
    // Data Transform: Store config schema
    const self = this as unknown as IgniterConnectorBuilder<
      TNewConfigSchema,
      TMetadataSchema,
      TMetadataValue,
      TContext,
      // biome-ignore lint/complexity/noBannedTypes: Empty object preserves specific action keys
      {},
      TOAuth
    >
    self.configSchema = schema as TNewConfigSchema
    // biome-ignore lint/complexity/noBannedTypes: Empty object preserves specific action keys
    self.actions = {} as {}
    return self
  }

  /**
   * Set the metadata schema and value for the connector.
   * Metadata contains static information about the connector (name, icon, etc.).
   *
   * @param schema - Zod schema for metadata validation
   * @param value - The metadata value (validated against schema)
   * @returns The builder with updated metadata type
   *
   * @example
   * ```typescript
   * .withMetadata(
   *   z.object({
   *     name: z.string(),
   *     icon: z.string(),
   *     description: z.string().optional(),
   *   }),
   *   {
   *     name: 'Telegram',
   *     icon: 'telegram.svg',
   *     description: 'Send messages to Telegram channels',
   *   }
   * )
   * ```
   */
  withMetadata<
    TNewMetadataSchema extends StandardSchemaV1,
    TNewMetadataValue extends InferSchemaOutput<TNewMetadataSchema>,
  >(
    schema: TNewMetadataSchema,
    value: TNewMetadataValue
  ): IgniterConnectorBuilder<
    TConfigSchema,
    TNewMetadataSchema,
    TNewMetadataValue,
    TContext,
    TActions,
    TOAuth
  > {
    // Data Transform: Store metadata schema and value
    const self = this as unknown as IgniterConnectorBuilder<
      TConfigSchema,
      TNewMetadataSchema,
      TNewMetadataValue,
      TContext,
      TActions,
      TOAuth
    >
    self.metadataSchema = schema as TNewMetadataSchema
    self.metadataValue = value as TNewMetadataValue
    return self
  }

  /**
   * Set default configuration for system/internal connectors.
   * When set, the connector can be used without user configuration.
   *
   * @param config - The default configuration values
   * @returns The builder
   *
   * @example
   * ```typescript
   * // For internal connectors that don't need user config
   * .withDefaultConfig({
   *   apiKey: process.env.OPENAI_API_KEY!,
   * })
   * ```
   */
  withDefaultConfig(
    config: InferSchemaOutput<TConfigSchema>
  ): IgniterConnectorBuilder<
    TConfigSchema,
    TMetadataSchema,
    TMetadataValue,
    TContext,
    TActions,
    TOAuth
  > {
    // Data Transform: Store default config
    this.defaultConfig = config
    return this
  }

  /**
   * Configure OAuth for the connector.
   * Enables OAuth-based authentication flow.
   *
   * @param options - OAuth configuration options
   * @returns The builder
   *
   * @example
   * ```typescript
   * .withOAuth({
   *   authorizationUrl: 'https://provider.com/oauth/authorize',
   *   tokenUrl: 'https://provider.com/oauth/token',
   *   clientId: process.env.CLIENT_ID!,
   *   clientSecret: process.env.CLIENT_SECRET!,
   *   scopes: ['read', 'write'],
   *   userInfoUrl: 'https://provider.com/api/me',
   * })
   * ```
   */
  withOAuth<TOAuth extends IgniterConnectorOAuthOptions>(
    options: TOAuth
  ): IgniterConnectorBuilder<
    TConfigSchema,
    TMetadataSchema,
    TMetadataValue,
    TContext,
    TActions,
    TOAuth
  > {
    // @ts-expect-error - Expected Data Transform: Store OAuth options
    this.oauthOptions = options 
    return this as unknown as IgniterConnectorBuilder<
      TConfigSchema,
      TMetadataSchema,
      TMetadataValue,
      TContext,
      TActions,
      TOAuth
    >
  }

  /**
   * Configure webhook handling for the connector.
   * Enables receiving webhooks from external services.
   *
   * @param options - Webhook configuration options
   * @returns The builder
   *
   * @example
   * ```typescript
   * .withWebhook({
   *   description: 'Receive events from Stripe',
   *   schema: z.object({
   *     type: z.string(),
   *     data: z.object({ id: z.string() }),
   *   }),
   *   handler: async ({ payload, config }) => {
   *     console.log('Received webhook:', payload.type)
   *   },
   *   verify: async (request, config) => {
   *     return verifyStripeSignature(request, config.webhookSecret)
   *   },
   * })
   * ```
   */
  withWebhook<TWebhookSchema extends StandardSchemaV1>(
    options: IgniterConnectorWebhookOptions<
      TWebhookSchema,
      InferSchemaOutput<TConfigSchema>,
      TContext
    >
  ): IgniterConnectorBuilder<
    TConfigSchema,
    TMetadataSchema,
    TMetadataValue,
    TContext,
    TActions,
    TOAuth
  > {
    // Data Transform: Store webhook options
    this.webhookOptions = options
    return this
  }

  /**
   * Add an action to the connector.
   * Actions are operations that can be executed on the connector.
   *
   * @param key - Unique action identifier
   * @param options - Action configuration including input/output schemas and handler
   * @returns The builder with updated actions type
   *
   * @example
   * ```typescript
   * .addAction('sendMessage', {
   *   description: 'Send a message to a chat',
   *   input: z.object({
   *     message: z.string().min(1).max(4096),
   *     parseMode: z.enum(['HTML', 'Markdown']).optional(),
   *   }),
   *   output: z.object({
   *     messageId: z.string(),
   *     timestamp: z.date(),
   *   }),
   *   handler: async ({ input, config, context }) => {
   *     const result = await sendTelegramMessage(config.botToken, config.chatId, input.message)
   *     return {
   *       messageId: result.message_id.toString(),
   *       timestamp: new Date(),
   *     }
   *   },
   * })
   * ```
   */
  addAction<
    TKey extends string,
    TInputSchema extends StandardSchemaV1,
    TOutputSchema extends StandardSchemaV1 | undefined = undefined,
    THandlerOutput = unknown,
  >(
    key: TKey,
    options: {
      description?: string
      input: TInputSchema
      output?: TOutputSchema
      handler: (
        context: {
          input: InferSchemaOutput<TInputSchema>
          config: InferSchemaOutput<TConfigSchema>
          context: TContext
        }
      ) => Promise<THandlerOutput> | THandlerOutput
    }
  ): IgniterConnectorBuilder<
    TConfigSchema,
    TMetadataSchema,
    TMetadataValue,
    TContext,
    TActions & {
      [K in TKey]: IgniterConnectorActionDefinition<
        TInputSchema,
        TOutputSchema,
        InferSchemaOutput<TConfigSchema>,
        TContext,
        THandlerOutput
      >
    },
    TOAuth
  > {
    // Data Transform: Add action to actions map
    const actionDef: IgniterConnectorActionDefinition<
      TInputSchema,
      TOutputSchema,
      InferSchemaOutput<TConfigSchema>,
      TContext,
      THandlerOutput
    > = {
      description: options.description,
      input: options.input,
      output: options.output,
      handler: options.handler as IgniterConnectorActionHandler<
        InferSchemaOutput<TInputSchema>,
        TOutputSchema extends StandardSchemaV1 ? InferSchemaOutput<TOutputSchema> : THandlerOutput,
        InferSchemaOutput<TConfigSchema>,
        TContext
      >,
    }

    // @ts-expect-error - Dynamic action key assignment
    this.actions[key] = actionDef

    return this as unknown as IgniterConnectorBuilder<
      TConfigSchema,
      TMetadataSchema,
      TMetadataValue,
      TContext,
      TActions & {
        [K in TKey]: IgniterConnectorActionDefinition<
          TInputSchema,
          TOutputSchema,
          InferSchemaOutput<TConfigSchema>,
          TContext,
          THandlerOutput
        >
      },
      TOAuth
    >
  }

  /**
   * Set the onContext hook.
   * Creates custom context that will be passed to action handlers.
   *
   * @param handler - Context creation function
   * @returns The builder with updated context type
   *
   * @example
   * ```typescript
   * .onContext(async ({ config }) => ({
   *   client: new TelegramClient(config.botToken),
   *   rateLimiter: new RateLimiter(),
   * }))
   * ```
   */
  onContext<TNewContext>(
    handler: IgniterConnectorOnContextHook<
      InferSchemaOutput<TConfigSchema>,
      TNewContext
    >
  ): IgniterConnectorBuilder<
    TConfigSchema,
    TMetadataSchema,
    TMetadataValue,
    TNewContext,
    // Type Erasure: Reset actions as context type changes affect handlers
    // biome-ignore lint/complexity/noBannedTypes: Empty object preserves specific action keys
    {},
    TOAuth
  > {
    // Data Transform: Store context hook
    const self = this as unknown as IgniterConnectorBuilder<
      TConfigSchema,
      TMetadataSchema,
      TMetadataValue,
      TNewContext,
      // biome-ignore lint/complexity/noBannedTypes: Empty object preserves specific action keys
      {},
      TOAuth
    >
    self.hooks = { onContext: handler } as IgniterConnectorHooks<
      InferSchemaOutput<TConfigSchema>,
      TNewContext
    >
    // biome-ignore lint/complexity/noBannedTypes: Empty object preserves specific action keys
    self.actions = {} as {}
    return self
  }

  /**
   * Set the onValidate hook.
   * Validates configuration before connecting. Throw an error to reject.
   *
   * @param handler - Validation function
   * @returns The builder
   *
   * @example
   * ```typescript
   * .onValidate(async ({ config }) => {
   *   // Test connection
   *   const response = await fetch(`https://api.telegram.org/bot${config.botToken}/getMe`)
   *   if (!response.ok) {
   *     throw new Error('Invalid bot token')
   *   }
   * })
   * ```
   */
  onValidate(
    handler: IgniterConnectorOnValidateHook<InferSchemaOutput<TConfigSchema>>
  ): IgniterConnectorBuilder<
    TConfigSchema,
    TMetadataSchema,
    TMetadataValue,
    TContext,
    TActions,
    TOAuth
  > {
    // Data Transform: Store validate hook
    this.hooks.onValidate = handler
    return this
  }

  /**
   * Build the connector definition.
   * Validates configuration and returns the final connector definition.
   *
   * @returns The complete connector definition
   * @throws Error if configuration is invalid
   *
   * @example
   * ```typescript
   * const telegram = IgniterConnector.create()
   *   .withConfig(configSchema)
   *   .addAction('sendMessage', actionOptions)
   *   .build()
   * ```
   */
  build(): IgniterConnectorDefinition<
    TConfigSchema,
    TMetadataSchema,
    TMetadataValue,
    TContext,
    TActions,
    TOAuth
  > {
    // Validation: Config schema is required
    if (!this.configSchema) {
      throw new Error(
        'IgniterConnector configuration schema is required. Use .withConfig() to set it.'
      )
    }

    // Response: Build definition object
    const definition: IgniterConnectorDefinition<
      TConfigSchema,
      TMetadataSchema,
      TMetadataValue,
      TContext,
      TActions,
      TOAuth
    > = {
      configSchema: this.configSchema,
      metadataSchema: this.metadataSchema,
      metadata: this.metadataValue,
      defaultConfig: this.defaultConfig,
      oauth: this.oauthOptions,
      webhook: this.webhookOptions
        ? {
            description: this.webhookOptions.description,
            schema: this.webhookOptions.schema,
            handler: this.webhookOptions.handler,
            verify: this.webhookOptions.verify,
          }
        : undefined,
      actions: this.actions,
      hooks: this.hooks,
    }

    return definition
  }
}

/**
 * Factory for creating connector definitions.
 *
 * @example
 * ```typescript
 * import { IgniterConnector } from '@igniter-js/connectors'
 *
 * const myConnector = IgniterConnector.create()
 *   .withConfig(schema)
 *   .addAction('doSomething', { ... })
 *   .build()
 * ```
 */
export const IgniterConnector = {
  /**
   * Create a new connector builder.
   *
   * @returns A new IgniterConnectorBuilder instance
   */
  create: () => IgniterConnectorBuilder.create(),
}
