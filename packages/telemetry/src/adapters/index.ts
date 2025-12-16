/**
 * @fileoverview Adapter exports for @igniter-js/telemetry
 * @module @igniter-js/telemetry/adapters
 */

export {
  LoggerTransportAdapter,
  type LoggerTransportConfig,
  type TelemetryLogger,
} from './logger.adapter'

export {
  StoreStreamTransportAdapter,
  type StoreStreamTransportConfig,
  type TelemetryStoreInterface,
} from './store.adapter'
