/**
 * @fileoverview Transport types for @igniter-js/telemetry
 * @module @igniter-js/telemetry/types/transport
 */

import type { TelemetryEnvelope } from './envelope'

/**
 * Built-in transport types for telemetry events.
 *
 * - `logger`: Console or structured logging output
 * - `store`: Redis Streams or similar persistent storage
 * - `tracing`: Distributed tracing systems (OpenTelemetry, Jaeger)
 * - `errors`: Error tracking systems (Sentry, Bugsnag)
 *
 * Custom transport types can be added using string literals.
 *
 * @example
 * ```typescript
 * // Built-in types
 * const loggerType: TelemetryTransportType = 'logger'
 * const storeType: TelemetryTransportType = 'store'
 *
 * // Custom type
 * const customType: TelemetryTransportType = 'datadog'
 * ```
 */
export type TelemetryTransportType = 'logger' | 'store' | 'tracing' | 'errors' | (string & {})

/**
 * Metadata passed to transport adapters during initialization.
 *
 * @example
 * ```typescript
 * const meta: TelemetryTransportMeta = {
 *   service: 'my-api',
 *   environment: 'production',
 *   version: '1.0.0',
 * }
 * ```
 */
export interface TelemetryTransportMeta {
  /** The service name */
  service: string
  /** The environment name */
  environment: string
  /** Optional service version */
  version?: string
}

/**
 * Interface for telemetry transport adapters.
 *
 * Transport adapters receive processed telemetry events and send them
 * to external systems (loggers, storage, tracing, error tracking).
 *
 * Each adapter has a `type` that must be unique within a telemetry instance.
 * Only one adapter per type is allowed.
 *
 * @example
 * ```typescript
 * class MyCustomAdapter implements IgniterTelemetryTransportAdapter {
 *   readonly type = 'custom'
 *
 *   async init(meta: TelemetryTransportMeta): Promise<void> {
 *     // Initialize connection, validate config, etc.
 *     console.log(`Initializing custom adapter for ${meta.service}`)
 *   }
 *
 *   async handle(envelope: TelemetryEnvelope): Promise<void> {
 *     // Send event to external system
 *     await sendToExternalSystem(envelope)
 *   }
 *
 *   async flush(): Promise<void> {
 *     // Flush any buffered events
 *     await flushBuffer()
 *   }
 *
 *   async shutdown(): Promise<void> {
 *     // Clean up resources
 *     await closeConnection()
 *   }
 * }
 * ```
 */
export interface IgniterTelemetryTransportAdapter {
  /**
   * The transport type identifier.
   * Must be unique within a telemetry instance.
   */
  readonly type: TelemetryTransportType

  /**
   * Optional initialization method called when the telemetry instance is built.
   * Use this to validate configuration, establish connections, etc.
   *
   * @param meta - Service metadata for the telemetry instance
   */
  init?(meta: TelemetryTransportMeta): Promise<void> | void

  /**
   * Handle a telemetry event.
   * This is called for each event that passes sampling.
   *
   * @param envelope - The processed telemetry envelope
   */
  handle(envelope: TelemetryEnvelope): Promise<void> | void

  /**
   * Optional method to flush any buffered events.
   * Called when the telemetry instance is flushed.
   */
  flush?(): Promise<void>

  /**
   * Optional cleanup method called during shutdown.
   * Use this to close connections, flush remaining events, etc.
   */
  shutdown?(): Promise<void>
}

/**
 * Configuration for transport registration.
 */
export interface TelemetryTransportConfig<T extends IgniterTelemetryTransportAdapter = IgniterTelemetryTransportAdapter> {
  /** The transport type */
  type: TelemetryTransportType
  /** The transport adapter instance */
  adapter: T
}
