/**
 * @fileoverview Store stream transport adapter for @igniter-js/telemetry
 * @module @igniter-js/telemetry/adapters/store
 *
 * @description
 * A transport adapter that appends telemetry events to Redis Streams
 * via `@igniter-js/store`. Useful for persistent event storage and
 * downstream processing.
 *
 * @example
 * ```typescript
 * import { IgniterTelemetry, StoreStreamTransportAdapter } from '@igniter-js/telemetry'
 * import { IgniterStore } from '@igniter-js/store'
 *
 * const store = IgniterStore.create()
 *   .withAdapter(redisAdapter)
 *   .withService('my-api')
 *   .build()
 *
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .addTransport('store', StoreStreamTransportAdapter.create({
 *     store,
 *     stream: 'telemetry:events',
 *     maxLen: 10000,
 *   }))
 *   .build()
 * ```
 */

import type { IgniterTelemetryTransportAdapter, TelemetryTransportMeta } from '../types/transport'
import type { TelemetryEnvelope } from '../types/envelope'
import { IgniterTelemetryError } from '../errors/igniter-telemetry.error'
import { IgniterStore } from '@igniter-js/store'
import type Redis from 'ioredis'
import { RedisStoreAdapter } from '@igniter-js/store/adapters'

/**
 * Minimal store interface required by the adapter.
 * Compatible with @igniter-js/store.
 */
export interface TelemetryStoreInterface {
  streams: {
    append(
      stream: string,
      data: Record<string, unknown>,
      options?: { maxLen?: number; approximate?: boolean },
    ): Promise<string>
  }
}

/**
 * Configuration options for StoreStreamTransportAdapter.
 *
 * @example
 * ```typescript
 * const config: StoreStreamTransportConfig = {
 *   store: myStore,
 *   stream: 'telemetry:events',
 *   maxLen: 10000,
 *   approximate: true,
 * }
 * ```
 */
export interface StoreStreamTransportConfig {
  /**
   * The store instance to use.
   * Must have a streams.append method.
   */
  redis: Redis

  /**
   * The stream name to append events to.
   * @default 'telemetry:events'
   */
  stream?: string

  /**
   * Maximum stream length.
   * Older entries will be evicted when this limit is reached.
   *
   * @default 10000
   */
  maxLen?: number

  /**
   * Whether to use approximate trimming.
   * More efficient but may exceed maxLen slightly.
   *
   * @default true
   */
  approximate?: boolean

  /**
   * Custom stream name builder function.
   * If provided, overrides the static stream name.
   *
   * @param envelope - The telemetry envelope
   * @returns The stream name to use
   *
   * @example
   * ```typescript
   * streamBuilder: (envelope) => `telemetry:${envelope.service}:${envelope.level}`
   * ```
   */
  streamBuilder?: (envelope: TelemetryEnvelope) => string
}

/**
 * Store stream transport adapter for telemetry events.
 *
 * Appends events to Redis Streams for persistent storage and processing.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const adapter = StoreStreamTransportAdapter.create({
 *   store: myStore,
 *   stream: 'telemetry:events',
 * })
 *
 * // With custom stream per level
 * const adapter = StoreStreamTransportAdapter.create({
 *   store: myStore,
 *   streamBuilder: (envelope) => `telemetry:${envelope.level}`,
 * })
 *
 * // Use in telemetry
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .addTransport('store', adapter)
 *   .build()
 * ```
 */
export class StoreStreamTransportAdapter implements IgniterTelemetryTransportAdapter {
  readonly type = 'store' as const
  private readonly config: Required<Omit<StoreStreamTransportConfig, 'streamBuilder'>> & Pick<StoreStreamTransportConfig, 'streamBuilder'>
  private meta?: TelemetryTransportMeta
  private store: IgniterStore

  private constructor(config: StoreStreamTransportConfig) {
    this.store = IgniterStore.create()
      .withAdapter(RedisStoreAdapter.create({ redis: config.redis }))
      .build()

    this.config = {
      redis: config.redis,
      stream: config.stream ?? 'telemetry:events',
      maxLen: config.maxLen ?? 10000,
      approximate: config.approximate ?? true,
      streamBuilder: config.streamBuilder,
    }
  }

  /**
   * Creates a new StoreStreamTransportAdapter instance.
   *
   * @param config - The adapter configuration
   * @returns A new StoreStreamTransportAdapter instance
   *
   * @example
   * ```typescript
   * const adapter = StoreStreamTransportAdapter.create({
   *   store: myStore,
   *   stream: 'telemetry:events',
   *   maxLen: 10000,
   * })
   * ```
   */
  static create(config: StoreStreamTransportConfig): StoreStreamTransportAdapter {
    return new StoreStreamTransportAdapter(config)
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
   * Handles a telemetry event by appending it to the stream.
   *
   * @param envelope - The telemetry envelope to store
   */
  async handle(envelope: TelemetryEnvelope): Promise<void> {
    try {
      // Determine stream name
      const stream = this.config.streamBuilder
        ? this.config.streamBuilder(envelope)
        : this.config.stream

      // Build the data object for the stream
      const data = this.buildStreamData(envelope)

      // Append to stream
      await this.store.streams.append(stream, data, {
        maxLen: this.config.maxLen,
        approximate: this.config.approximate,
      })
    } catch (error) {
      throw new IgniterTelemetryError({
        code: 'TELEMETRY_TRANSPORT_FAILED',
        message: 'Failed to append telemetry event to store stream',
        statusCode: 500,
        details: { error, eventName: envelope.name },
      })
    }
  }

  /**
   * Builds the stream data object from the envelope.
   */
  private buildStreamData(envelope: TelemetryEnvelope): Record<string, unknown> {
    const data: Record<string, unknown> = {
      name: envelope.name,
      time: envelope.time,
      level: envelope.level,
      service: envelope.service,
      environment: envelope.environment,
      sessionId: envelope.sessionId,
    }

    if (envelope.version) {
      data.version = envelope.version
    }

    if (envelope.actor) {
      data.actor = JSON.stringify(envelope.actor)
    }

    if (envelope.scope) {
      data.scope = JSON.stringify(envelope.scope)
    }

    if (envelope.attributes) {
      data.attributes = JSON.stringify(envelope.attributes)
    }

    if (envelope.error) {
      data.error = JSON.stringify(envelope.error)
    }

    if (envelope.source) {
      data.source = JSON.stringify(envelope.source)
    }

    if (envelope.spanId) {
      data.spanId = envelope.spanId
    }

    if (envelope.parentSpanId) {
      data.parentSpanId = envelope.parentSpanId
    }

    return data
  }

  /**
   * Flushes any buffered events.
   * Store adapter sends immediately, so this is a no-op.
   */
  async flush(): Promise<void> {
    // Store adapter doesn't buffer, nothing to flush
  }

  /**
   * Shuts down the adapter.
   * Store adapter doesn't need cleanup, so this is a no-op.
   */
  async shutdown(): Promise<void> {
    // Store adapter doesn't need cleanup
  }
}
