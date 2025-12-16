/**
 * @fileoverview Event types for IgniterConnector
 * @module @igniter-js/connectors/types/events
 */

import type { IgniterConnectorError } from '../errors/igniter-connector.error'

/**
 * Base event properties shared by all events.
 */
export interface IgniterConnectorEventBase {
  /** The connector key that triggered the event */
  connector: string
  /** The scope type */
  scope: string
  /** The scope identifier */
  identity: string
  /** Event timestamp */
  timestamp: Date
}

/**
 * Event emitted when a connector is connected.
 */
export interface IgniterConnectorConnectedEvent
  extends IgniterConnectorEventBase {
  type: 'connected'
}

/**
 * Event emitted when a connector is disconnected.
 */
export interface IgniterConnectorDisconnectedEvent
  extends IgniterConnectorEventBase {
  type: 'disconnected'
}

/**
 * Event emitted when a connector is enabled.
 */
export interface IgniterConnectorEnabledEvent extends IgniterConnectorEventBase {
  type: 'enabled'
}

/**
 * Event emitted when a connector is disabled.
 */
export interface IgniterConnectorDisabledEvent
  extends IgniterConnectorEventBase {
  type: 'disabled'
}

/**
 * Event emitted when an action is executed.
 */
export interface IgniterConnectorActionEvent extends IgniterConnectorEventBase {
  type: 'action'
  /** The action key that was executed */
  action: string
  /** Whether the action succeeded */
  success: boolean
  /** Execution duration in milliseconds (optional) */
  duration?: number
}

/**
 * Event emitted when OAuth connect flow is started.
 */
export interface IgniterConnectorOAuthStartedEvent
  extends IgniterConnectorEventBase {
  type: 'oauth.started'
}

/**
 * Event emitted when OAuth flow is completed.
 */
export interface IgniterConnectorOAuthCompletedEvent
  extends IgniterConnectorEventBase {
  type: 'oauth.completed'
  /** Whether the OAuth flow succeeded (optional, defaults to true) */
  success?: boolean
  /** User info from OAuth provider (optional) */
  userInfo?: Record<string, unknown>
  /** Error message if OAuth failed (optional) */
  error?: string
}

/**
 * Event emitted when OAuth tokens are refreshed.
 */
export interface IgniterConnectorOAuthRefreshedEvent
  extends IgniterConnectorEventBase {
  type: 'oauth.refreshed'
  /** Whether the refresh succeeded (optional, defaults to true) */
  success?: boolean
}

/**
 * Event emitted when a webhook is received.
 */
export interface IgniterConnectorWebhookReceivedEvent
  extends IgniterConnectorEventBase {
  type: 'webhook.received'
  /** Whether the webhook was processed successfully (optional, defaults to true) */
  success?: boolean
}

/**
 * Event emitted when an error occurs.
 */
export interface IgniterConnectorErrorEvent extends IgniterConnectorEventBase {
  type: 'error'
  /** The error that occurred */
  error: IgniterConnectorError | Error
  /** The operation that failed (optional) */
  operation?: string
  /** The action that failed (optional) */
  action?: string
}

/**
 * Union type of all possible connector events.
 *
 * @example
 * ```typescript
 * connectors.on((event: IgniterConnectorEvent) => {
 *   switch (event.type) {
 *     case 'connected':
 *       console.log(`${event.connector} connected`)
 *       break
 *     case 'action':
 *       console.log(`${event.action} executed in ${event.duration}ms`)
 *       break
 *     case 'error':
 *       console.error(event.error)
 *       break
 *   }
 * })
 * ```
 */
export type IgniterConnectorEvent =
  | IgniterConnectorConnectedEvent
  | IgniterConnectorDisconnectedEvent
  | IgniterConnectorEnabledEvent
  | IgniterConnectorDisabledEvent
  | IgniterConnectorActionEvent
  | IgniterConnectorOAuthStartedEvent
  | IgniterConnectorOAuthCompletedEvent
  | IgniterConnectorOAuthRefreshedEvent
  | IgniterConnectorWebhookReceivedEvent
  | IgniterConnectorErrorEvent

/**
 * Event handler function type.
 *
 * @example
 * ```typescript
 * const handler: IgniterConnectorEventHandler = (event) => {
 *   console.log(`[${event.type}] ${event.connector}`)
 * }
 * ```
 */
export type IgniterConnectorEventHandler = (
  event: IgniterConnectorEvent
) => void | Promise<void>

/**
 * Subscription returned from registering an event handler.
 * Call `unsubscribe()` to remove the handler.
 *
 * @example
 * ```typescript
 * const subscription = connectors.on((event) => {
 *   console.log(event)
 * })
 *
 * // Later, to stop receiving events:
 * subscription.unsubscribe()
 * ```
 */
export interface IgniterConnectorEventSubscription {
  /** Remove the event handler */
  unsubscribe: () => void
}
