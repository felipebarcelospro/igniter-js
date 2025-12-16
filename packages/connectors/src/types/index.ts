/**
 * @fileoverview Public type exports for @igniter-js/connectors
 * @module @igniter-js/connectors/types
 */

// =============================================================================
// ADAPTER TYPES
// =============================================================================
export type {
  IgniterConnectorRecord,
  IgniterConnectorAdapterOptions,
  IgniterConnectorUpdateData,
  IgniterConnectorAdapter,
} from './adapter'

// =============================================================================
// CONFIG TYPES
// =============================================================================
export type {
  IgniterConnectorConfigBase,
  IgniterConnectorConfigWithOAuth,
  IgniterConnectorField,
  IgniterConnectorMetadata,
  IgniterConnectorEncryptionConfig,
  InferSchemaOutput,
  InferSchemaInput,
} from './config'

// =============================================================================
// CONNECTOR TYPES
// =============================================================================
export type {
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
} from './connector'

// =============================================================================
// EVENT TYPES
// =============================================================================
export type {
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
} from './events'

// =============================================================================
// HOOK TYPES
// =============================================================================
export type {
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
} from './hooks'

// =============================================================================
// OAUTH TYPES
// =============================================================================
export type {
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
} from './oauth'

// =============================================================================
// SCOPE TYPES
// =============================================================================
export type {
  IgniterConnectorScopeOptions,
  IgniterConnectorScopeDefinition,
  IgniterConnectorScopeMap,
  IgniterConnectorScopeKeys,
  IgniterConnectorScopeRequiresIdentifier,
} from './scope'

// =============================================================================
// WEBHOOK TYPES
// =============================================================================
export type {
  IgniterConnectorWebhookContext,
  IgniterConnectorWebhookHandler,
  IgniterConnectorWebhookOptions,
  IgniterConnectorWebhookRequest,
  IgniterConnectorWebhookDefinition,
} from './webhook'
