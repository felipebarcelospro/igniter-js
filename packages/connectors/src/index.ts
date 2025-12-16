/**
 * @fileoverview Main entry point for @igniter-js/connectors
 * @module @igniter-js/connectors
 *
 * @description
 * A type-safe, multi-tenant connector management library for Igniter.js.
 * Provides OAuth Universal (auto-detect), field-level encryption, and
 * a fluent builder API for defining connectors.
 *
 * @example
 * ```typescript
 * import { Connector, IgniterConnector, PrismaAdapter } from '@igniter-js/connectors'
 * import { z } from 'zod'
 *
 * // 1. Define a connector
 * const telegramConnector = Connector.create('telegram')
 *   .config(z.object({ botToken: z.string(), chatId: z.string() }))
 *   .action('sendMessage', {
 *     input: z.object({ message: z.string() }),
 *     handler: async ({ input, config }) => {
 *       // Send message via Telegram API
 *       return { success: true }
 *     },
 *   })
 *   .build()
 *
 * // 2. Create the connector manager
 * const connectors = IgniterConnector.create()
 *   .scope('organization', { key: 'organizationId', required: true })
 *   .adapter(PrismaAdapter.create({ prisma, model: 'Integration' }))
 *   .connector(telegramConnector)
 *   .build()
 *
 * // 3. Use the scoped connector
 * const scoped = connectors.scope('organization', 'org_123')
 * await scoped.telegram.connect({ botToken: 'xxx', chatId: 'yyy' })
 * await scoped.telegram.actions.sendMessage({ message: 'Hello!' })
 * ```
 */

// =============================================================================
// CORE EXPORTS
// =============================================================================

export { IgniterConnector } from './core/igniter-connector'
export { IgniterConnectorScoped } from './core/igniter-connector-scoped'
export { IgniterConnectorOAuth } from './core/igniter-connector-oauth'

// =============================================================================
// BUILDER EXPORTS
// =============================================================================

export { Connector } from './builders/connector.builder'
export { IgniterConnectorBuilder } from './builders/igniter-connector.builder'

// =============================================================================
// ADAPTER EXPORTS
// =============================================================================

export { IgniterConnectorBaseAdapter } from './adapters/igniter-connector.adapter'
export { PrismaAdapter } from './adapters/prisma.adapter'

// =============================================================================
// ERROR EXPORTS
// =============================================================================

export { IgniterConnectorError } from './errors/igniter-connector.error'

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export { IgniterConnectorCrypto } from './utils/igniter-connector-crypto'
export { IgniterConnectorSchema } from './utils/igniter-connector-schema'
export { IgniterConnectorFields } from './utils/igniter-connector-fields'
export { IgniterConnectorOAuthUtils } from './utils/igniter-connector-oauth'
export { IgniterConnectorUrl } from './utils/igniter-connector-url'

// =============================================================================
// HANDLE OPERATION TYPES
// =============================================================================

export type {
  IgniterConnectorOAuthConnectParams,
  IgniterConnectorOAuthCallbackParamsExt,
  IgniterConnectorWebhookParams,
  IgniterConnectorHandleParams,
} from './core/igniter-connector'

// =============================================================================
// TYPE EXPORTS (from types/index.ts)
// =============================================================================

export type {
  // Adapter types
  IgniterConnectorRecord,
  IgniterConnectorAdapterOptions,
  IgniterConnectorUpdateData,
  IgniterConnectorAdapter,
} from './types/adapter'

export type {
  // OAuth types
  IgniterConnectorOAuthTokens,
  IgniterConnectorOAuthUserInfo,
  IgniterConnectorOAuthData,
  IgniterConnectorOAuthConnectContext,
  IgniterConnectorOAuthCallbackContext,
  IgniterConnectorOAuthRefreshContext,
  IgniterConnectorOAuthOptions,
  IgniterConnectorOAuthConnectResult,
  IgniterConnectorOAuthCallbackParams,
  IgniterConnectorOAuthCallbackResult,
} from './types/oauth'

export type {
  // Config types
  IgniterConnectorConfigBase,
  IgniterConnectorConfigWithOAuth,
  IgniterConnectorField,
  IgniterConnectorMetadata,
  IgniterConnectorEncryptionConfig,
  InferSchemaOutput,
  InferSchemaInput,
} from './types/config'

export type {
  // Scope types
  IgniterConnectorScopeDefinition,
} from './types/scope'

export type {
  // Webhook types
  IgniterConnectorWebhookRequest,
  IgniterConnectorWebhookContext,
  IgniterConnectorWebhookHandler,
  IgniterConnectorWebhookDefinition,
} from './types/webhook'

export type {
  // Event types
  IgniterConnectorEventBase,
  IgniterConnectorConnectedEvent,
  IgniterConnectorDisconnectedEvent,
  IgniterConnectorEnabledEvent,
  IgniterConnectorDisabledEvent,
  IgniterConnectorActionEvent,
  IgniterConnectorOAuthStartedEvent,
  IgniterConnectorOAuthCompletedEvent,
  IgniterConnectorOAuthRefreshedEvent,
  IgniterConnectorWebhookReceivedEvent,
  IgniterConnectorErrorEvent,
  IgniterConnectorEvent,
  IgniterConnectorEventHandler,
  IgniterConnectorEventSubscription,
} from './types/events'

export type {
  // Hook types
  IgniterConnectorOnContextParams,
  IgniterConnectorOnContextHook,
  IgniterConnectorOnValidateParams,
  IgniterConnectorOnValidateHook,
  IgniterConnectorManagerOnConnectParams,
  IgniterConnectorManagerOnConnectHook,
  IgniterConnectorManagerOnDisconnectParams,
  IgniterConnectorManagerOnDisconnectHook,
  IgniterConnectorManagerOnErrorParams,
  IgniterConnectorManagerOnErrorHook,
  IgniterConnectorHooks,
  IgniterConnectorManagerHooks,
} from './types/hooks'

export type {
  // Connector types
  IgniterConnectorActionContext,
  IgniterConnectorActionHandler,
  IgniterConnectorActionOptions,
  IgniterConnectorActionDefinition,
  IgniterConnectorActionMap,
  IgniterConnectorDefinition,
  IgniterConnectorInstance,
  IgniterConnectorActionResult,
  ExtractConnectorConfig,
  ExtractConnectorMetadata,
  ExtractConnectorActions,
  ExtractActionInput,
  ExtractActionOutput,
} from './types/connector'

export type {
  // Scoped types
  IgniterConnectorActionBuilder,
  IgniterConnectorActionResult as IgniterConnectorScopedActionResult,
} from './core/igniter-connector-scoped'

export type {
  // Type inference helpers
  $Infer,
  $InferScoped,
  $InferConnectorKey,
  $InferScopeKey,
  $InferConfig,
  $InferActionKeys,
} from './types/infer'
