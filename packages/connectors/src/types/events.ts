/**
 * @fileoverview Event types for IgniterConnector
 * @module @igniter-js/connectors/types/events
 *
 * Events are designed to be compatible with the telemetry system.
 * When telemetry is enabled, events are automatically converted
 * and emitted to the telemetry provider.
 */

import type { IgniterConnectorError } from '../errors/connector.error'

// ============================================================================
// BASE EVENT
// ============================================================================

/**
 * Base event properties shared by all events.
 * These map directly to telemetry base attributes.
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

  
// ============================================================================
// CONNECTOR LIFECYCLE EVENTS
// ============================================================================

/**
 * Event emitted when a connector is connected.
 * Telemetry: connector.connected
 */
export interface IgniterConnectorConnectedEvent
  extends IgniterConnectorEventBase {
  type: 'connector.connected'
}

/**
 * Event emitted when a connector is disconnected.
 * Telemetry: connector.disconnected
 */
export interface IgniterConnectorDisconnectedEvent
  extends IgniterConnectorEventBase {
  type: 'connector.disconnected'
}

/**
 * Event emitted when a connector is enabled.
 * Telemetry: connector.enabled
 */
export interface IgniterConnectorEnabledEvent extends IgniterConnectorEventBase {
  type: 'connector.enabled'
}

/**
 * Event emitted when a connector is disabled.
 * Telemetry: connector.disabled
 */
export interface IgniterConnectorDisabledEvent
  extends IgniterConnectorEventBase {
  type: 'connector.disabled'
}

/**
 * Event emitted when a connector configuration is updated.
 * Telemetry: connector.updated
 */
export interface IgniterConnectorUpdatedEvent
  extends IgniterConnectorEventBase {
  type: 'connector.updated'
}

// ============================================================================
// OAUTH EVENTS
// ============================================================================

/**
 * Event emitted when OAuth connect flow is started.
 * Telemetry: oauth.started
 */
export interface IgniterConnectorOAuthStartedEvent
  extends IgniterConnectorEventBase {
  type: 'oauth.started'
}

/**
 * Event emitted when OAuth flow is completed successfully.
 * Telemetry: oauth.completed
 */
export interface IgniterConnectorOAuthCompletedEvent
  extends IgniterConnectorEventBase {
  type: 'oauth.completed'
  /** User info from OAuth provider (optional) */
  userInfo?: Record<string, unknown>
}

/**
 * Event emitted when OAuth tokens are refreshed.
 * Telemetry: oauth.refreshed
 */
export interface IgniterConnectorOAuthRefreshedEvent
  extends IgniterConnectorEventBase {
  type: 'oauth.refreshed'
}

/**
 * Event emitted when OAuth flow fails.
 * Telemetry: oauth.failed
 */
export interface IgniterConnectorOAuthFailedEvent
  extends IgniterConnectorEventBase {
  type: 'oauth.failed'
  /** Error code */
  errorCode: string
  /** Error message */
  errorMessage?: string
}

// ============================================================================
// ACTION EVENTS
// ============================================================================

/**
 * Event emitted when an action starts execution.
 * Telemetry: action.started
 */
export interface IgniterConnectorActionStartedEvent
  extends IgniterConnectorEventBase {
  type: 'action.started'
  /** The action key being executed */
  action: string
}

/**
 * Event emitted when an action completes successfully.
 * Telemetry: action.completed
 */
export interface IgniterConnectorActionCompletedEvent
  extends IgniterConnectorEventBase {
  type: 'action.completed'
  /** The action key that was executed */
  action: string
  /** Execution duration in milliseconds */
  durationMs?: number
}

/**
 * Event emitted when an action fails.
 * Telemetry: action.failed
 */
export interface IgniterConnectorActionFailedEvent
  extends IgniterConnectorEventBase {
  type: 'action.failed'
  /** The action key that failed */
  action: string
  /** Execution duration in milliseconds */
  durationMs?: number
  /** Error code */
  errorCode: string
  /** Error message */
  errorMessage?: string
}

// ============================================================================
// WEBHOOK EVENTS
// ============================================================================

/**
 * Event emitted when a webhook is received.
 * Telemetry: webhook.received
 */
export interface IgniterConnectorWebhookReceivedEvent
  extends IgniterConnectorEventBase {
  type: 'webhook.received'
  /** HTTP method */
  method?: string
  /** URL path */
  path?: string
  /** Whether signature was verified */
  verified?: boolean
}

/**
 * Event emitted when webhook processing completes.
 * Telemetry: webhook.processed
 */
export interface IgniterConnectorWebhookProcessedEvent
  extends IgniterConnectorEventBase {
  type: 'webhook.processed'
  /** HTTP method */
  method?: string
  /** URL path */
  path?: string
  /** Processing duration in milliseconds */
  durationMs?: number
}

/**
 * Event emitted when webhook processing fails.
 * Telemetry: webhook.failed
 */
export interface IgniterConnectorWebhookFailedEvent
  extends IgniterConnectorEventBase {
  type: 'webhook.failed'
  /** HTTP method */
  method?: string
  /** URL path */
  path?: string
  /** Processing duration in milliseconds */
  durationMs?: number
  /** Error code */
  errorCode: string
  /** Error message */
  errorMessage?: string
}

// ============================================================================
// ERROR EVENTS
// ============================================================================

/**
 * Event emitted when an error occurs.
 * Telemetry: error.occurred
 */
export interface IgniterConnectorErrorEvent extends IgniterConnectorEventBase {
  type: 'error.occurred'
  /** The error that occurred */
  error: IgniterConnectorError | Error
  /** The operation that failed */
  operation?: string
  /** Error code */
  errorCode: string
  /** Error message */
  errorMessage?: string
}

// ============================================================================
// LEGACY EVENT TYPES (Deprecated - use specific event types)
// ============================================================================

/**
 * @deprecated Use specific event types (action.started, action.completed, action.failed)
 */
export interface IgniterConnectorActionEvent extends IgniterConnectorEventBase {
  type: 'action'
  action: string
  success: boolean
  duration?: number
}

// ============================================================================
// UNION TYPE
// ============================================================================

/**
 * All possible connector event types.
 * These map 1:1 to telemetry event names.
 */
export type IgniterConnectorEventType =
  // Connector lifecycle
  | 'connector.connected'
  | 'connector.disconnected'
  | 'connector.enabled'
  | 'connector.disabled'
  | 'connector.updated'
  // OAuth
  | 'oauth.started'
  | 'oauth.completed'
  | 'oauth.refreshed'
  | 'oauth.failed'
  // Actions
  | 'action.started'
  | 'action.completed'
  | 'action.failed'
  // Webhooks
  | 'webhook.received'
  | 'webhook.processed'
  | 'webhook.failed'
  // Errors
  | 'error.occurred'
  // Legacy (deprecated)
  | 'action'

/**
 * Union type of all possible connector events.
 *
 * @example
 * ```typescript
 * connectors.on((event: IgniterConnectorEvent) => {
 *   switch (event.type) {
 *     case 'connector.connected':
 *       console.log(`${event.connector} connected`)
 *       break
 *     case 'action.completed':
 *       console.log(`${event.action} executed in ${event.durationMs}ms`)
 *       break
 *     case 'error.occurred':
 *       console.error(event.error)
 *       break
 *   }
 * })
 * ```
 */
export type IgniterConnectorEvent =
  // Connector lifecycle
  | IgniterConnectorConnectedEvent
  | IgniterConnectorDisconnectedEvent
  | IgniterConnectorEnabledEvent
  | IgniterConnectorDisabledEvent
  | IgniterConnectorUpdatedEvent
  // OAuth
  | IgniterConnectorOAuthStartedEvent
  | IgniterConnectorOAuthCompletedEvent
  | IgniterConnectorOAuthRefreshedEvent
  | IgniterConnectorOAuthFailedEvent
  // Actions
  | IgniterConnectorActionStartedEvent
  | IgniterConnectorActionCompletedEvent
  | IgniterConnectorActionFailedEvent
  // Webhooks
  | IgniterConnectorWebhookReceivedEvent
  | IgniterConnectorWebhookProcessedEvent
  | IgniterConnectorWebhookFailedEvent
  // Errors
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
