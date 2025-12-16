/**
 * @fileoverview Core telemetry runtime for @igniter-js/telemetry
 * @module @igniter-js/telemetry/core/igniter-telemetry
 *
 * @description
 * The main IgniterTelemetry class provides the runtime API for emitting
 * telemetry events with session management, sampling, and redaction.
 *
 * @example
 * ```typescript
 * import { IgniterTelemetry } from '@igniter-js/telemetry'
 *
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .withEnvironment('production')
 *   .addEvents(MyEvents)
 *   .addTransport('logger', loggerAdapter)
 *   .build()
 *
 * // Mode A: Direct emit
 * telemetry.emit('user.login', { attributes: { 'ctx.user.id': '123' } })
 *
 * // Mode B: Session handle
 * const session = telemetry.session()
 *   .actor('user', 'usr_123')
 *   .scope('organization', 'org_456')
 *
 * session.emit('user.action', { attributes: {} })
 * await session.end()
 *
 * // Mode C: Scoped execution
 * await telemetry.session()
 *   .actor('user', 'usr_123')
 *   .run(async () => {
 *     telemetry.emit('step.one', {})
 *     telemetry.emit('step.two', {})
 *   })
 * ```
 */

import type { TelemetryConfig, TelemetryActorOptions, TelemetryScopeOptions } from '../types/config'
import type { TelemetryEmitInput } from '../types/emit'
import type { TelemetryAttributes, TelemetryEnvelope } from '../types/envelope'
import type { TelemetryEventsRegistry, TelemetryFlattenRegistryKeys } from '../types/events'
import type { TelemetryLevel } from '../types/levels'
import { IgniterTelemetryBuilder } from '../builders/igniter-telemetry.builder'
import { IgniterTelemetryError } from '../errors/igniter-telemetry.error'
import { createSession, getActiveSession, type IgniterTelemetrySession, type TelemetrySessionState } from './session'
import { generateSessionId } from '../utils/id'
import { createSampler } from '../utils/sampling'
import { createRedactor } from '../utils/redaction'

/**
 * Interface for the IgniterTelemetry runtime.
 *
 * @typeParam TRegistry - The events registry type
 * @typeParam TScopes - Valid scope types
 * @typeParam TActors - Valid actor types
 */
export interface IgniterTelemetry<
  TRegistry extends TelemetryEventsRegistry = TelemetryEventsRegistry,
  TScopes extends string = string,
  TActors extends string = string,
> {
  /**
   * Emits a telemetry event.
   *
   * If called within a session.run() context, uses that session.
   * Otherwise, creates an implicit session for the event.
   *
   * @param name - The event name
   * @param input - Optional emit configuration
   *
   * @example
   * ```typescript
   * telemetry.emit('user.login', {
   *   level: 'info',
   *   attributes: { 'ctx.user.id': '123' },
   * })
   * ```
   */
  emit<TName extends TelemetryFlattenRegistryKeys<TRegistry> | (string & {})>(
    name: TName,
    input?: TelemetryEmitInput<TName>,
  ): void

  /**
   * Creates a new telemetry session.
   *
   * @returns A new session instance
   *
   * @example
   * ```typescript
   * const session = telemetry.session()
   *   .actor('user', 'usr_123')
   *   .scope('organization', 'org_456')
   *
   * session.emit('event', {})
   * await session.end()
   * ```
   */
  session(): IgniterTelemetrySession<TActors, TScopes>

  /**
   * Flushes all pending telemetry events.
   * Calls flush() on all transports that support it.
   *
   * @returns A promise that resolves when flushing is complete
   */
  flush(): Promise<void>

  /**
   * Shuts down the telemetry system.
   * Flushes pending events and closes all transports.
   *
   * @returns A promise that resolves when shutdown is complete
   */
  shutdown(): Promise<void>

  /**
   * Gets the service name.
   */
  readonly service: string

  /**
   * Gets the environment name.
   */
  readonly environment: string

  /**
   * Gets the service version (if set).
   */
  readonly version?: string
}

/**
 * Static class providing the builder entry point.
 *
 * @example
 * ```typescript
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .build()
 * ```
 */
export const IgniterTelemetry = {
  /**
   * Creates a new telemetry builder.
   *
   * @returns A new IgniterTelemetryBuilder instance
   */
  create: () => IgniterTelemetryBuilder.create(),
}

/**
 * Runtime implementation of IgniterTelemetry.
 */
export class IgniterTelemetryRuntime<
  TRegistry extends TelemetryEventsRegistry = TelemetryEventsRegistry,
  TScopes extends string = string,
  TActors extends string = string,
> implements IgniterTelemetry<TRegistry, TScopes, TActors> {
  private readonly config: TelemetryConfig<TRegistry, TScopes, TActors>
  private readonly sampler: (eventName: string, level: TelemetryLevel) => boolean
  private readonly redactor: (attributes: TelemetryAttributes) => Promise<TelemetryAttributes>
  private initialized = false

  constructor(config: TelemetryConfig<TRegistry, TScopes, TActors>) {
    this.config = config
    this.sampler = createSampler(config.sampling)
    this.redactor = createRedactor(config.redaction)

    // Initialize transports
    this.initTransports()
  }

  /**
   * Initializes all registered transports.
   */
  private async initTransports(): Promise<void> {
    if (this.initialized) return

    const meta = {
      service: this.config.service,
      environment: this.config.environment,
      version: this.config.version,
    }

    for (const [type, adapter] of this.config.transports) {
      try {
        if (adapter.init) {
          await adapter.init(meta)
        }
      } catch (error) {
        throw new IgniterTelemetryError({
          code: 'TELEMETRY_TRANSPORT_INIT_FAILED',
          message: `Failed to initialize transport "${type}"`,
          statusCode: 500,
          details: { type, error },
        })
      }
    }

    this.initialized = true
  }

  get service(): string {
    return this.config.service
  }

  get environment(): string {
    return this.config.environment
  }

  get version(): string | undefined {
    return this.config.version
  }

  emit<TName extends TelemetryFlattenRegistryKeys<TRegistry> | (string & {})>(
    name: TName,
    input?: TelemetryEmitInput<TName>,
  ): void {
    // Check for active session from AsyncLocalStorage
    const activeSession = getActiveSession()
    this.internalEmit(name, input, activeSession)
  }

  /**
   * Internal emit implementation that handles session context.
   */
  private internalEmit(
    name: string,
    input?: TelemetryEmitInput,
    sessionState?: TelemetrySessionState,
  ): void {
    const level = input?.level ?? 'info'

    // Apply sampling
    if (!this.sampler(name, level)) {
      return
    }

    // Build the envelope
    const envelope = this.buildEnvelope(name, input, sessionState)

    // Send to transports (async but don't wait)
    this.sendToTransports(envelope).catch((error) => {
      // Log transport errors but don't throw
      if (this.config.logger) {
        this.config.logger.error('Transport error', { error, eventName: name })
      }
    })
  }

  /**
   * Builds a telemetry envelope from input and session state.
   */
  private buildEnvelope(
    name: string,
    input?: TelemetryEmitInput,
    sessionState?: TelemetrySessionState,
  ): TelemetryEnvelope {
    const now = input?.time ?? new Date().toISOString()

    // Determine session ID
    const sessionId = input?.sessionId ?? sessionState?.sessionId ?? generateSessionId()

    // Merge attributes (session + input)
    const attributes: TelemetryAttributes = {
      ...sessionState?.attributes,
      ...input?.attributes,
    }

    // Use input actor/scope or fall back to session
    const actor = input?.actor ?? sessionState?.actor
    const scope = input?.scope ?? sessionState?.scope

    const envelope: TelemetryEnvelope = {
      name,
      time: now,
      level: input?.level ?? 'info',
      service: this.config.service,
      environment: this.config.environment,
      version: this.config.version,
      sessionId,
      actor,
      scope,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      error: input?.error,
      source: input?.source,
    }

    return envelope
  }

  /**
   * Sends an envelope to all registered transports.
   */
  private async sendToTransports(envelope: TelemetryEnvelope): Promise<void> {
    // Apply redaction
    let processedEnvelope = envelope
    if (envelope.attributes) {
      const redactedAttributes = await this.redactor(envelope.attributes)
      processedEnvelope = { ...envelope, attributes: redactedAttributes }
    }

    const errors: Array<{ type: string; error: unknown }> = []

    for (const [type, adapter] of this.config.transports) {
      try {
        await adapter.handle(processedEnvelope)
      } catch (error) {
        errors.push({ type, error })
      }
    }

    // If all transports failed, throw an error
    if (errors.length > 0 && errors.length === this.config.transports.size) {
      throw new IgniterTelemetryError({
        code: 'TELEMETRY_TRANSPORT_FAILED',
        message: 'All transports failed to handle event',
        statusCode: 500,
        details: { errors, eventName: envelope.name },
      })
    }
  }

  session(): IgniterTelemetrySession<TActors, TScopes> {
    return createSession<TActors, TScopes>((name, input, sessionState) => {
      this.internalEmit(name, input, sessionState)
    })
  }

  async flush(): Promise<void> {
    for (const [type, adapter] of this.config.transports) {
      try {
        if (adapter.flush) {
          await adapter.flush()
        }
      } catch (error) {
        if (this.config.logger) {
          this.config.logger.error('Flush error', { type, error })
        }
      }
    }
  }

  async shutdown(): Promise<void> {
    // Flush first
    await this.flush()

    // Then shutdown
    for (const [type, adapter] of this.config.transports) {
      try {
        if (adapter.shutdown) {
          await adapter.shutdown()
        }
      } catch (error) {
        if (this.config.logger) {
          this.config.logger.error('Shutdown error', { type, error })
        }
      }
    }
  }
}

// Register the runtime factory with the builder to avoid circular imports
// This is called when this module is imported, allowing the builder to create runtime instances
IgniterTelemetryBuilder._runtimeFactory = <
  R extends TelemetryEventsRegistry,
  S extends string,
  A extends string,
>(
  config: TelemetryConfig<R, S, A>,
) => new IgniterTelemetryRuntime(config)
