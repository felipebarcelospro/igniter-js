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

import type { IgniterTelemetryConfig } from '../types/config'
import type { IgniterTelemetryEmitInput } from '../types/emit'
import type { IgniterTelemetryAttributes, IgniterTelemetryEnvelope } from '../types/envelope'
import type { IgniterTelemetryEventsRegistry, IgniterTelemetryFlattenRegistryKeys } from '../types/events'
import type { IgniterTelemetryLevel } from '../types/levels'
import { IgniterTelemetryError } from '../errors/telemetry.error'
import { IgniterTelemetrySession } from './session'
import { IgniterTelemetryId } from '../utils/id'
import { IgniterTelemetrySampling } from '../utils/sampling'
import { IgniterTelemetryRedaction } from '../utils/redaction'
import type { IIgniterTelemetrySession, IgniterTelemetrySessionState } from '../types/session'
import { IIgniterTelemetryManager } from '@/types/manager'

/**
 * Runtime implementation of IgniterTelemetry.
 */
export class IgniterTelemetryManager<
  TRegistry extends IgniterTelemetryEventsRegistry = IgniterTelemetryEventsRegistry,
  TScopes extends string = string,
  TActors extends string = string,
> implements IIgniterTelemetryManager<TRegistry, TScopes, TActors> {
  private readonly config: IgniterTelemetryConfig<TRegistry, TScopes, TActors>
  private readonly sampler: (eventName: string, level: IgniterTelemetryLevel) => boolean
  private readonly redactor: (attributes: IgniterTelemetryAttributes) => Promise<IgniterTelemetryAttributes>
  private initialized = false

  constructor(config: IgniterTelemetryConfig<TRegistry, TScopes, TActors>) {
    this.config = config
    this.sampler = IgniterTelemetrySampling.createSampler(config.sampling)
    this.redactor = IgniterTelemetryRedaction.createRedactor(config.redaction)

    if (this.config.logger) {
      this.config.logger.info('[IgniterTelemetry] Initializing manager', {
        service: config.service,
        environment: config.environment,
        transports: Array.from(config.transports.keys()),
      })
    }

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
        if (this.config.logger) {
          this.config.logger.error(`[IgniterTelemetry] Failed to initialize transport "${type}"`, { error })
        }
        throw new IgniterTelemetryError({
          code: 'TELEMETRY_TRANSPORT_INIT_FAILED',
          message: `Failed to initialize transport "${type}"`,
          statusCode: 500,
          details: { type, error },
        })
      }
    }

    this.initialized = true

    if (this.config.logger) {
      this.config.logger.info('[IgniterTelemetry] All transports initialized')
    }
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

  emit<TName extends IgniterTelemetryFlattenRegistryKeys<TRegistry> | (string & {})>(
    name: TName,
    input?: IgniterTelemetryEmitInput<TName>,
  ): void {
    // Check for active session from AsyncLocalStorage
    const activeSession = IgniterTelemetrySession.getActive()
    this.internalEmit(name, input, activeSession)
  }

  /**
   * Internal emit implementation that handles session context.
   */
  private internalEmit(
    name: string,
    input?: IgniterTelemetryEmitInput,
    sessionState?: IgniterTelemetrySessionState,
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
    input?: IgniterTelemetryEmitInput,
    sessionState?: IgniterTelemetrySessionState,
  ): IgniterTelemetryEnvelope {
    const now = input?.time ?? new Date().toISOString()

    // Determine session ID
    const sessionId = input?.sessionId ?? sessionState?.sessionId ?? IgniterTelemetryId.generateSessionId()

    // Merge attributes (session + input)
    const attributes: IgniterTelemetryAttributes = {
      ...sessionState?.attributes,
      ...input?.attributes,
    }

    // Use input actor/scope or fall back to session
    const actor = input?.actor ?? sessionState?.actor
    const scope = input?.scope ?? sessionState?.scope

    const envelope: IgniterTelemetryEnvelope = {
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
  private async sendToTransports(envelope: IgniterTelemetryEnvelope): Promise<void> {
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

  session(): IIgniterTelemetrySession<TActors, TScopes> {
    return IgniterTelemetrySession.create<TActors, TScopes>((name, input, sessionState) => {
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