/**
 * @fileoverview Builder types for @igniter-js/connectors
 * @module @igniter-js/connectors/types/builder
 */

import type { StandardSchemaV1, IgniterLogger } from '@igniter-js/core'
import type { IgniterTelemetryManager } from '@igniter-js/telemetry'
import type { IgniterConnectorAdapter } from './adapter'
import type {
  IgniterConnectorDefinition,
  IgniterConnectorActionMap,
} from './connector'
import type { IgniterConnectorEncryptionConfig } from './config'
import type { IgniterConnectorEventHandler } from './events'
import type { IgniterConnectorManagerHooks } from './hooks'
import type { IgniterConnectorScopeDefinition } from './scope'

/**
 * Type helper for extracting connector map type.
 */
export type IgniterConnectorMap<
  TConnectors extends Record<
    string,
    IgniterConnectorDefinition<
      StandardSchemaV1,
      StandardSchemaV1,
      unknown,
      unknown,
      IgniterConnectorActionMap
    >
  >,
> = TConnectors;

/**
 * Builder state for IgniterConnector configuration.
 */
export interface IgniterConnectorBuilderState {
  /** Database adapter */
  adapter?: IgniterConnectorAdapter;
  /** Logger instance */
  logger?: IgniterLogger;
  /** Telemetry runtime */
  telemetry?: IgniterTelemetryManager;
  /** Encryption configuration */
  encryption: IgniterConnectorEncryptionConfig;
  /** Scope definitions */
  scopes: Map<string, IgniterConnectorScopeDefinition>;
  /** Connector definitions */
  connectors: Map<string, IgniterConnectorDefinition>;
  /** Global event handlers */
  eventHandlers: IgniterConnectorEventHandler[];
  /** Lifecycle hooks */
  hooks: IgniterConnectorManagerHooks;
}
