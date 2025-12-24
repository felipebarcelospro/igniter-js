/**
 * @fileoverview Hook types for IgniterConnector
 * @module @igniter-js/connectors/types/hooks
 */

import type { IgniterConnectorError } from '../errors/connector.error'

// =============================================================================
// CONNECTOR HOOKS (used in IgniterConnector.create())
// =============================================================================

/**
 * Context passed to the onContext hook.
 *
 * @typeParam TConfig - The connector configuration type
 */
export interface IgniterConnectorOnContextParams<TConfig> {
  /** The connector configuration (decrypted) */
  config: TConfig
  /** The scope type */
  scope: string
  /** The scope identifier */
  identity: string
}

/**
 * Hook to create custom context for actions.
 *
 * @typeParam TConfig - The connector configuration type
 * @typeParam TContext - The context type to return
 *
 * @example
 * ```typescript
 * const onContext: IgniterConnectorOnContextHook<TelegramConfig, { client: TelegramClient }> =
 *   async ({ config }) => ({
 *     client: new TelegramClient(config.botToken),
 *   })
 * ```
 */
export type IgniterConnectorOnContextHook<TConfig, TContext> = (
  params: IgniterConnectorOnContextParams<TConfig>
) => Promise<TContext> | TContext

/**
 * Context passed to the onValidate hook.
 *
 * @typeParam TConfig - The connector configuration type
 */
export interface IgniterConnectorOnValidateParams<TConfig> {
  /** The connector configuration (decrypted) */
  config: TConfig
  /** The scope type */
  scope: string
  /** The scope identifier */
  identity: string
}

/**
 * Hook to validate configuration before connecting.
 * Throw an error to reject the configuration.
 *
 * @typeParam TConfig - The connector configuration type
 *
 * @example
 * ```typescript
 * const onValidate: IgniterConnectorOnValidateHook<TelegramConfig> =
 *   async ({ config }) => {
 *     const isValid = await testTelegramConnection(config.botToken)
 *     if (!isValid) {
 *       throw new Error('Invalid bot token')
 *     }
 *   }
 * ```
 */
export type IgniterConnectorOnValidateHook<TConfig> = (
  params: IgniterConnectorOnValidateParams<TConfig>
) => Promise<void> | void

// =============================================================================
// MANAGER HOOKS (used in IgniterConnectorManager.create())
// =============================================================================

/**
 * Context passed to the onConnect hook.
 *
 * @typeParam TConfig - The connector configuration type
 */
export interface IgniterConnectorManagerOnConnectParams<
  TConfig = Record<string, unknown>,
> {
  /** The connector key */
  connector: string
  /** The connector configuration (decrypted) */
  config: TConfig
  /** The scope type */
  scope: string
  /** The scope identifier */
  identity: string
}

/**
 * Hook called when a connector is connected.
 *
 * @example
 * ```typescript
 * .onConnect(async ({ connector, config, scope, identity }) => {
 *   console.log(`Connected ${connector} for ${scope}:${identity}`)
 *   await auditLog.log('connector.connected', { connector, scope, identity })
 * })
 * ```
 */
export type IgniterConnectorManagerOnConnectHook = (
  params: IgniterConnectorManagerOnConnectParams
) => Promise<void> | void

/**
 * Context passed to the onDisconnect hook.
 */
export interface IgniterConnectorManagerOnDisconnectParams {
  /** The connector key */
  connector: string
  /** The scope type */
  scope: string
  /** The scope identifier */
  identity: string
}

/**
 * Hook called when a connector is disconnected.
 *
 * @example
 * ```typescript
 * .onDisconnect(async ({ connector, scope, identity }) => {
 *   console.log(`Disconnected ${connector} for ${scope}:${identity}`)
 *   await auditLog.log('connector.disconnected', { connector, scope, identity })
 * })
 * ```
 */
export type IgniterConnectorManagerOnDisconnectHook = (
  params: IgniterConnectorManagerOnDisconnectParams
) => Promise<void> | void

/**
 * Context passed to the onError hook.
 */
export interface IgniterConnectorManagerOnErrorParams {
  /** The error that occurred */
  error: IgniterConnectorError
  /** The connector key (if known) */
  connector?: string
  /** The operation that failed */
  operation: string
  /** The scope type (if known) */
  scope?: string
  /** The scope identifier (if known) */
  identity?: string
  /** The action key (if applicable) */
  action?: string
}

/**
 * Hook called when an error occurs.
 *
 * @example
 * ```typescript
 * .onError(async ({ error, connector, operation }) => {
 *   console.error(`Error in ${operation} for ${connector}:`, error)
 *   await errorReporter.report(error)
 * })
 * ```
 */
export type IgniterConnectorManagerOnErrorHook = (
  params: IgniterConnectorManagerOnErrorParams
) => Promise<void> | void

// =============================================================================
// HOOK COLLECTIONS
// =============================================================================

/**
 * All hooks for a connector definition.
 *
 * @typeParam TConfig - The connector configuration type
 * @typeParam TContext - The connector context type
 */
export interface IgniterConnectorHooks<TConfig, TContext> {
  /** Hook to create custom context */
  onContext?: IgniterConnectorOnContextHook<TConfig, TContext>
  /** Hook to validate configuration */
  onValidate?: IgniterConnectorOnValidateHook<TConfig>
}

/**
 * All hooks for the connector manager.
 */
export interface IgniterConnectorManagerHooks {
  /** Hook called when a connector is connected */
  onConnect?: IgniterConnectorManagerOnConnectHook
  /** Hook called when a connector is disconnected */
  onDisconnect?: IgniterConnectorManagerOnDisconnectHook
  /** Hook called when an error occurs */
  onError?: IgniterConnectorManagerOnErrorHook
}
