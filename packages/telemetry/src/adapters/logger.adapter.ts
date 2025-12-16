/**
 * @fileoverview Logger transport adapter for @igniter-js/telemetry
 * @module @igniter-js/telemetry/adapters/logger
 *
 * @description
 * A transport adapter that outputs telemetry events to a logger (console or custom).
 * Useful for development and debugging.
 *
 * @example
 * ```typescript
 * import { IgniterTelemetry, LoggerTransportAdapter } from '@igniter-js/telemetry'
 *
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .addTransport('logger', LoggerTransportAdapter.create({ logger: console }))
 *   .build()
 * ```
 */

import type { IgniterTelemetryTransportAdapter, TelemetryTransportMeta } from '../types/transport'
import type { TelemetryEnvelope } from '../types/envelope'
import type { TelemetryLevel } from '../types/levels'

/**
 * Logger interface compatible with console and most logging libraries.
 */
export interface TelemetryLogger {
  debug(...args: unknown[]): void
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
}

/**
 * Configuration options for LoggerTransportAdapter.
 *
 * @example
 * ```typescript
 * const config: LoggerTransportConfig = {
 *   logger: console,
 *   format: 'json',
 *   includeTimestamp: true,
 *   minLevel: 'info',
 * }
 * ```
 */
export interface LoggerTransportConfig {
  /**
   * The logger instance to use.
   * Must have debug, info, warn, and error methods.
   */
  logger: TelemetryLogger

  /**
   * Output format.
   * - `json`: Output as JSON (good for structured logging)
   * - `pretty`: Output as formatted text (good for development)
   *
   * @default 'json'
   */
  format?: 'json' | 'pretty'

  /**
   * Whether to include timestamps in the output.
   * @default true
   */
  includeTimestamp?: boolean

  /**
   * Minimum level to log.
   * Events below this level will be ignored.
   *
   * @default 'debug'
   */
  minLevel?: TelemetryLevel
}

/**
 * Level priority for filtering.
 */
const LEVEL_PRIORITY: Record<TelemetryLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * Logger transport adapter for telemetry events.
 *
 * Outputs events to a logger with configurable formatting.
 *
 * @example
 * ```typescript
 * // Basic usage with console
 * const adapter = LoggerTransportAdapter.create({ logger: console })
 *
 * // Custom logger with JSON format
 * const adapter = LoggerTransportAdapter.create({
 *   logger: myLogger,
 *   format: 'json',
 *   minLevel: 'info',
 * })
 *
 * // Use in telemetry
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .addTransport('logger', adapter)
 *   .build()
 * ```
 */
export class LoggerTransportAdapter implements IgniterTelemetryTransportAdapter {
  readonly type = 'logger' as const
  private readonly config: Required<LoggerTransportConfig>
  private meta?: TelemetryTransportMeta

  private constructor(config: LoggerTransportConfig) {
    this.config = {
      logger: config.logger,
      format: config.format ?? 'json',
      includeTimestamp: config.includeTimestamp ?? true,
      minLevel: config.minLevel ?? 'debug',
    }
  }

  /**
   * Creates a new LoggerTransportAdapter instance.
   *
   * @param config - The adapter configuration
   * @returns A new LoggerTransportAdapter instance
   *
   * @example
   * ```typescript
   * const adapter = LoggerTransportAdapter.create({ logger: console })
   * ```
   */
  static create(config: LoggerTransportConfig): LoggerTransportAdapter {
    return new LoggerTransportAdapter(config)
  }

  /**
   * Initializes the adapter with service metadata.
   *
   * @param meta - The service metadata
   */
  init(meta: TelemetryTransportMeta): void {
    this.meta = meta
  }

  /**
   * Handles a telemetry event by logging it.
   *
   * @param envelope - The telemetry envelope to log
   */
  handle(envelope: TelemetryEnvelope): void {
    // Check level filter
    const eventPriority = LEVEL_PRIORITY[envelope.level]
    const minPriority = LEVEL_PRIORITY[this.config.minLevel]

    if (eventPriority < minPriority) {
      return
    }

    // Format the output
    const output = this.formatOutput(envelope)

    // Log at the appropriate level
    switch (envelope.level) {
      case 'debug':
        this.config.logger.debug(output)
        break
      case 'info':
        this.config.logger.info(output)
        break
      case 'warn':
        this.config.logger.warn(output)
        break
      case 'error':
        this.config.logger.error(output)
        break
    }
  }

  /**
   * Formats the envelope for output.
   */
  private formatOutput(envelope: TelemetryEnvelope): string | object {
    if (this.config.format === 'json') {
      return JSON.stringify(this.buildLogObject(envelope))
    }

    return this.formatPretty(envelope)
  }

  /**
   * Builds the log object for JSON output.
   */
  private buildLogObject(envelope: TelemetryEnvelope): object {
    const obj: Record<string, unknown> = {
      name: envelope.name,
      level: envelope.level,
      service: envelope.service,
      environment: envelope.environment,
      sessionId: envelope.sessionId,
    }

    if (this.config.includeTimestamp) {
      obj.time = envelope.time
    }

    if (envelope.version) {
      obj.version = envelope.version
    }

    if (envelope.actor) {
      obj.actor = envelope.actor
    }

    if (envelope.scope) {
      obj.scope = envelope.scope
    }

    if (envelope.attributes) {
      obj.attributes = envelope.attributes
    }

    if (envelope.error) {
      obj.error = envelope.error
    }

    if (envelope.source) {
      obj.source = envelope.source
    }

    if (envelope.spanId) {
      obj.spanId = envelope.spanId
    }

    if (envelope.parentSpanId) {
      obj.parentSpanId = envelope.parentSpanId
    }

    return obj
  }

  /**
   * Flushes any buffered events.
   * Logger adapter is synchronous, so this is a no-op.
   */
  async flush(): Promise<void> {
    // Logger adapter doesn't buffer, nothing to flush
  }

  /**
   * Shuts down the adapter.
   * Logger adapter doesn't need cleanup, so this is a no-op.
   */
  async shutdown(): Promise<void> {
    // Logger adapter doesn't need cleanup
  }

  /**
   * Formats the envelope for pretty output.
   */
  private formatPretty(envelope: TelemetryEnvelope): string {
    const parts: string[] = []

    // Level and name
    const levelBadge = `[${envelope.level.toUpperCase()}]`
    parts.push(`${levelBadge} ${envelope.name}`)

    // Session
    parts.push(`session=${envelope.sessionId}`)

    // Actor
    if (envelope.actor) {
      const actorStr = envelope.actor.id
        ? `${envelope.actor.type}:${envelope.actor.id}`
        : envelope.actor.type
      parts.push(`actor=${actorStr}`)
    }

    // Scope
    if (envelope.scope) {
      parts.push(`scope=${envelope.scope.type}:${envelope.scope.id}`)
    }

    // Attributes
    if (envelope.attributes) {
      const attrStr = Object.entries(envelope.attributes)
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(' ')
      if (attrStr) {
        parts.push(attrStr)
      }
    }

    // Error
    if (envelope.error) {
      parts.push(`error=${envelope.error.name}: ${envelope.error.message}`)
    }

    // Timestamp
    if (this.config.includeTimestamp) {
      parts.push(`time=${envelope.time}`)
    }

    return parts.join(' | ')
  }
}
