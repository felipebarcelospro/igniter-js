/**
 * @fileoverview Manager types for @igniter-js/connectors
 * @module @igniter-js/connectors/types/manager
 */

import type { IgniterLogger } from '@igniter-js/core'
import type { IgniterTelemetryManager } from '@igniter-js/telemetry'
import type { IgniterConnectorAdapter } from './adapter'
import type {
  IgniterConnectorDefinition,
  IgniterConnectorInstance,
  ExtractConnectorActionKeys,
  InferActionInput,
  InferActionOutput,
} from './connector'
import type { IgniterConnectorEncryptionConfig } from './config'
import type {
  IgniterConnectorEvent,
  IgniterConnectorEventHandler,
  IgniterConnectorEventSubscription,
} from './events'
import type { IgniterConnectorManagerHooks } from './hooks'
import type { IgniterConnectorScopeDefinition } from './scope'
import type { IgniterConnectorScoped } from '../core/scoped'

// =============================================================================
// HANDLE OPERATION TYPES
// =============================================================================

/**
 * Parameters for OAuth connect operation.
 */
export interface IgniterConnectorOAuthConnectParams {
  /** The scope type for the connection */
  scope: string;
  /** The scope identifier */
  identity: string;
  /** URL to redirect to after OAuth completion */
  redirectUrl?: string;
  /** Custom redirect URI for OAuth callback (defaults to auto-detected) */
  redirectUri?: string;
}

/**
 * Extended parameters for OAuth callback operation.
 */
export interface IgniterConnectorOAuthCallbackParamsExt {
  /** The authorization code from OAuth provider */
  code?: string;
  /** The state parameter for CSRF verification */
  state?: string;
  /** Error code if OAuth failed */
  error?: string;
  /** Error description if OAuth failed */
  errorDescription?: string;
  /** The original request object (for cookie parsing) */
  request?: Request;
  /** Override scope from cookie */
  scope?: string;
  /** Override identity from cookie */
  identity?: string;
  /** Override redirect URL from cookie */
  redirectUrl?: string;
  /** Custom redirect URI (defaults to auto-detected) */
  redirectUri?: string;
}

/**
 * Parameters for webhook handling operation.
 */
export interface IgniterConnectorWebhookParams {
  /** The webhook secret from URL path */
  secret?: string;
  /** The original request object */
  request?: Request;
  /** Request body (if already parsed) */
  body?: unknown;
  /** Request headers (if already parsed) */
  headers?: Record<string, string>;
  /** Request method */
  method?: string;
  /** Request URL */
  url?: string;
}

/**
 * Union type for all handle operation parameters.
 */
export type IgniterConnectorHandleParams =
  | IgniterConnectorOAuthConnectParams
  | IgniterConnectorOAuthCallbackParamsExt
  | IgniterConnectorWebhookParams;

// =============================================================================
// MANAGER CONFIG + INTERFACE
// =============================================================================

/**
 * Internal configuration for IgniterConnector manager.
 */
export interface IgniterConnectorManagerConfig {
  /** Database adapter */
  adapter: IgniterConnectorAdapter;
  /** Logger instance */
  logger?: IgniterLogger;
  /** Telemetry runtime */
  telemetry?: IgniterTelemetryManager<any>;
  /** Encryption configuration */
  encryption: IgniterConnectorEncryptionConfig;
  /** Scope definitions */
  scopes: Map<string, IgniterConnectorScopeDefinition>;
  /** Connector definitions */
  connectors: Map<string, IgniterConnectorDefinition<any, any, any, any, any, any>>;
  /** Global event handlers */
  eventHandlers: IgniterConnectorEventHandler[];
  /** Lifecycle hooks */
  hooks: IgniterConnectorManagerHooks;
}

/**
 * Public API for IgniterConnector manager.
 */
export interface IIgniterConnectorsManager<
  TScopes extends Record<string, IgniterConnectorScopeDefinition>,
  TConnectors extends Record<
    string,
    IgniterConnectorDefinition<any, any, any, any, any, any>
  >,
> {
  /** Get the database adapter. */
  getAdapter(): IgniterConnectorAdapter;

  /** Get the logger instance. */
  getLogger(): IgniterLogger | undefined;

  /** Get the telemetry runtime. */
  getTelemetry(): IgniterTelemetryManager<any> | undefined;

  /** Get scope definitions. */
  getScopes(): Map<string, IgniterConnectorScopeDefinition>;

  /** Get connector definitions. */
  getConnectors(): Map<string, IgniterConnectorDefinition>;

  /** Get a connector definition. */
  getConnector<K extends keyof TConnectors & string>(
    connectorKey: K,
  ): TConnectors[K] | undefined;

  /** Get encryption settings. */
  getEncryption(): IgniterConnectorEncryptionConfig;

  /** Get lifecycle hooks. */
  getHooks(): IgniterConnectorManagerHooks;

  /** Create a scoped connector instance. */
  scope<K extends keyof TScopes & string>(
    scopeKey: K,
    identity: string,
  ): IgniterConnectorScoped<TConnectors>;

  /** Subscribe to events. */
  on(handler: IgniterConnectorEventHandler): IgniterConnectorEventSubscription;

  /** Emit a connector event. */
  emit(event: IgniterConnectorEvent): Promise<void>;

  /** Encrypt a single value. */
  encrypt(value: string): Promise<string>;

  /** Decrypt a single value. */
  decrypt(value: string): Promise<string>;

  /** Encrypt a configuration object. */
  encryptConfig(config: Record<string, unknown>): Promise<Record<string, unknown>>;

  /** Decrypt a configuration object. */
  decryptConfig(config: Record<string, unknown>): Promise<Record<string, unknown>>;

  /** List available connectors (metadata). */
  list(options?: {
    where?: { name?: string };
    limit?: number;
    offset?: number;
    count?: { connections?: boolean };
  }): Promise<
    Array<{
      key: string;
      type: "oauth" | "custom";
      metadata: Record<string, unknown>;
      connections?: number;
    }>
  >;

  /** Get a connector metadata. */
  get<K extends keyof TConnectors & string>(
    connectorKey: K,
    options?: { count?: { connections?: boolean } },
  ): Promise<{
    key: string;
    type: "oauth" | "custom";
    metadata: Record<string, unknown>;
    connections?: number;
  } | null>;

  /** Execute an action on a connector. */
  action<
    K extends keyof TConnectors & string,
    A extends ExtractConnectorActionKeys<TConnectors[K]>
  >(
    connectorKey: K,
    actionKey: A,
  ): {
    call: (
      input: InferActionInput<TConnectors, K, A>,
    ) => Promise<{
      data: InferActionOutput<TConnectors, K, A> | null;
      error: Error | null;
    }>;
  };

  /** Handle OAuth callbacks and webhooks. */
  handle(
    operation: "oauth.callback" | "webhook",
    request: Request,
  ): Promise<Response>;

  /** Handle OAuth connect flow. */
  handleOAuthConnect(
    connectorKey: string,
    params: IgniterConnectorOAuthConnectParams,
  ): Promise<Response>;
}
