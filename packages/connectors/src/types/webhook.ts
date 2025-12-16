/**
 * @fileoverview Webhook types for IgniterConnector
 * @module @igniter-js/connectors/types/webhook
 */

import type { StandardSchemaV1 } from '@igniter-js/core'
import type { InferSchemaOutput } from './config'

/**
 * Context passed to webhook handlers.
 *
 * @typeParam TPayload - The webhook payload type
 * @typeParam TConfig - The connector configuration type
 * @typeParam TContext - The connector context type
 */
export interface IgniterConnectorWebhookContext<
  TPayload,
  TConfig,
  TContext = unknown,
> {
  /** The validated webhook payload */
  payload: TPayload
  /** The connector configuration (decrypted) */
  config: TConfig
  /** The connector context */
  context: TContext
  /** The scope type */
  scope: string
  /** The scope identifier */
  identity: string
  /** Raw request headers */
  headers: Record<string, string>
}

/**
 * Webhook handler function type.
 *
 * @typeParam TPayload - The webhook payload type
 * @typeParam TConfig - The connector configuration type
 * @typeParam TContext - The connector context type
 * @typeParam TResult - The handler return type
 */
export type IgniterConnectorWebhookHandler<
  TPayload,
  TConfig,
  TContext = unknown,
  TResult = void,
> = (
  context: IgniterConnectorWebhookContext<TPayload, TConfig, TContext>
) => Promise<TResult> | TResult

/**
 * Webhook configuration options.
 *
 * @typeParam TSchema - The Zod schema type for payload validation
 * @typeParam TConfig - The connector configuration type
 * @typeParam TContext - The connector context type
 *
 * @example
 * ```typescript
 * const webhookOptions: IgniterConnectorWebhookOptions<
 *   typeof payloadSchema,
 *   TelegramConfig
 * > = {
 *   description: 'Receive events from Telegram',
 *   schema: z.object({
 *     update_id: z.number(),
 *     message: z.object({
 *       text: z.string(),
 *     }),
 *   }),
 *   handler: async ({ payload, config }) => {
 *     console.log('Received:', payload.message.text)
 *   },
 * }
 * ```
 */
export interface IgniterConnectorWebhookOptions<
  TSchema extends StandardSchemaV1,
  TConfig,
  TContext = unknown,
> {
  /**
   * Human-readable description of the webhook.
   */
  description?: string

  /**
   * Zod schema for validating the webhook payload.
   */
  schema: TSchema

  /**
   * Handler function called when a valid webhook is received.
   */
  handler: IgniterConnectorWebhookHandler<
    InferSchemaOutput<TSchema>,
    TConfig,
    TContext
  >

  /**
   * Optional function to verify webhook signature/authenticity.
   *
   * @param request - The raw request object
   * @param config - The connector configuration
   * @returns True if the webhook is valid, false otherwise
   */
  verify?: (
    request: IgniterConnectorWebhookRequest,
    config: TConfig
  ) => Promise<boolean> | boolean
}

/**
 * Raw webhook request data.
 */
export interface IgniterConnectorWebhookRequest {
  /** Request headers - can be Headers object or plain record */
  headers: unknown
  /** Request body (parsed JSON) */
  body: unknown
  /** Raw request body string (for signature verification) */
  rawBody?: string
  /** Request method */
  method?: string
  /** Request URL */
  url?: string
}

/**
 * Internal webhook definition after configuration.
 */
export interface IgniterConnectorWebhookDefinition<
  TConfig = unknown,
  TContext = unknown,
> {
  /** Human-readable description */
  description?: string
  /** Payload validation schema */
  schema: StandardSchemaV1
  /** Handler function */
  handler: IgniterConnectorWebhookHandler<unknown, TConfig, TContext>
  /** Verification function */
  verify?: (
    request: IgniterConnectorWebhookRequest,
    config: TConfig
  ) => Promise<boolean> | boolean
}
