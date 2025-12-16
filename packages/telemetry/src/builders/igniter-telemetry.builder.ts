/**
 * @fileoverview Builder for creating IgniterTelemetry instances
 * @module @igniter-js/telemetry/builders/igniter-telemetry
 *
 * @description
 * Provides a fluent builder API for configuring and creating IgniterTelemetry instances.
 * Supports service configuration, event registration, transport adapters, and policies.
 *
 * @example
 * ```typescript
 * import { IgniterTelemetry, LoggerTransportAdapter } from '@igniter-js/telemetry'
 * import { z } from 'zod'
 *
 * // Define events per feature
 * const JobsEvents = IgniterTelemetryEvents
 *   .namespace('igniter.jobs')
 *   .event('worker.started', z.object({ 'ctx.worker.id': z.string() }))
 *   .group('job', (g) =>
 *     g.event('completed', z.object({ 'ctx.job.id': z.string() }))
 *   )
 *   .build()
 *
 * // Create telemetry instance
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .withEnvironment('production')
 *   .addActor('user')
 *   .addActor('system')
 *   .addScope('organization')
 *   .addEvents(JobsEvents)
 *   .addTransport('logger', LoggerTransportAdapter.create({ logger: console }))
 *   .withSampling({ debugRate: 0.01, errorRate: 1.0 })
 *   .withRedaction({ denylistKeys: ['password', 'secret'] })
 *   .build()
 *
 * // Use telemetry
 * telemetry.emit('igniter.jobs.job.completed', {
 *   attributes: { 'ctx.job.id': 'job-123' },
 * })
 * ```
 */

import type { IgniterLogger } from '@igniter-js/core'
import type { TelemetryConfig, TelemetryActorOptions, TelemetryScopeOptions } from '../types/config'
import type { TelemetryEventsDescriptor, TelemetryEventsMap, TelemetryEventsRegistry, TelemetryEventsValidationOptions } from '../types/events'
import type { TelemetryRedactionPolicy, TelemetrySamplingPolicy } from '../types/policies'
import type { IgniterTelemetryTransportAdapter, TelemetryTransportType } from '../types/transport'
import { DEFAULT_REDACTION_POLICY, DEFAULT_SAMPLING_POLICY } from '../types/policies'
import { IgniterTelemetryError } from '../errors/igniter-telemetry.error'
import type { IgniterTelemetry } from '../core/igniter-telemetry'

/**
 * Reserved namespace prefixes that cannot be used by user code.
 */
const RESERVED_NAMESPACE_PREFIXES = ['__', '__internal'] as const

/**
 * Validates that a key does not use reserved prefixes.
 *
 * @param key - The key to validate
 * @param context - Context for error messages
 */
function validateKey(key: string, context: string): void {
  if (!key || typeof key !== 'string') {
    throw new IgniterTelemetryError({
      code: 'TELEMETRY_CONFIGURATION_INVALID',
      message: `${context} must be a non-empty string`,
      statusCode: 400,
    })
  }

  if (key.includes(' ')) {
    throw new IgniterTelemetryError({
      code: 'TELEMETRY_CONFIGURATION_INVALID',
      message: `${context} "${key}" cannot contain spaces`,
      statusCode: 400,
      details: { key, context },
    })
  }

  const lowerKey = key.toLowerCase()
  for (const reserved of RESERVED_NAMESPACE_PREFIXES) {
    if (lowerKey.startsWith(reserved)) {
      throw new IgniterTelemetryError({
        code: 'TELEMETRY_RESERVED_NAMESPACE',
        message: `${context} "${key}" uses reserved prefix "${reserved}"`,
        statusCode: 400,
        details: { key, reserved, context },
      })
    }
  }
}

/**
 * Builder state for IgniterTelemetry configuration.
 */
export interface IgniterTelemetryBuilderState<
  TRegistry extends TelemetryEventsRegistry = TelemetryEventsRegistry,
  TScopes extends string = never,
  TActors extends string = never,
> {
  service?: string
  environment?: string
  version?: string
  eventsRegistry: TRegistry
  eventsValidation: TelemetryEventsValidationOptions
  transports: Map<string, IgniterTelemetryTransportAdapter>
  scopeDefinitions: Record<string, TelemetryScopeOptions>
  actorDefinitions: Record<string, TelemetryActorOptions>
  sampling: TelemetrySamplingPolicy
  redaction: TelemetryRedactionPolicy
  logger?: IgniterLogger
}

/**
 * Builder class for creating IgniterTelemetry instances.
 * Uses a fluent API pattern for configuration.
 *
 * @typeParam TRegistry - The events registry type
 * @typeParam TScopes - The typed scope keys (from addScope)
 * @typeParam TActors - The typed actor keys (from addActor)
 *
 * @example
 * ```typescript
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .withEnvironment('production')
 *   .addActor('user')
 *   .addScope('organization')
 *   .addEvents(JobsEvents)
 *   .addTransport('logger', loggerAdapter)
 *   .build()
 * ```
 */
export class IgniterTelemetryBuilder<
  TRegistry extends TelemetryEventsRegistry = {},
  TScopes extends string = never,
  TActors extends string = never,
> {
  private readonly state: IgniterTelemetryBuilderState<TRegistry, TScopes, TActors>

  private constructor(state: IgniterTelemetryBuilderState<TRegistry, TScopes, TActors>) {
    this.state = state
  }

  /**
   * Creates a new telemetry builder instance.
   *
   * @returns A new IgniterTelemetryBuilder instance
   *
   * @example
   * ```typescript
   * const builder = IgniterTelemetryBuilder.create()
   * ```
   */
  static create(): IgniterTelemetryBuilder<{}, never, never> {
    return new IgniterTelemetryBuilder({
      eventsRegistry: {},
      eventsValidation: { mode: 'development', strict: false },
      transports: new Map(),
      scopeDefinitions: {},
      actorDefinitions: {},
      sampling: {},
      redaction: {},
    })
  }

  /**
   * Sets the service name.
   *
   * @param service - The service name (e.g., 'my-api', 'worker')
   * @returns A new builder with the service configured
   *
   * @example
   * ```typescript
   * builder.withService('my-api')
   * ```
   */
  withService(service: string): IgniterTelemetryBuilder<TRegistry, TScopes, TActors> {
    return new IgniterTelemetryBuilder({
      ...this.state,
      transports: new Map(this.state.transports),
      service,
    })
  }

  /**
   * Sets the environment name.
   *
   * @param environment - The environment (e.g., 'development', 'production')
   * @returns A new builder with the environment configured
   *
   * @example
   * ```typescript
   * builder.withEnvironment(process.env.NODE_ENV ?? 'development')
   * ```
   */
  withEnvironment(environment: string): IgniterTelemetryBuilder<TRegistry, TScopes, TActors> {
    return new IgniterTelemetryBuilder({
      ...this.state,
      transports: new Map(this.state.transports),
      environment,
    })
  }

  /**
   * Sets the service version.
   *
   * @param version - The version string (e.g., '1.0.0')
   * @returns A new builder with the version configured
   *
   * @example
   * ```typescript
   * builder.withVersion(process.env.APP_VERSION ?? 'unknown')
   * ```
   */
  withVersion(version: string): IgniterTelemetryBuilder<TRegistry, TScopes, TActors> {
    return new IgniterTelemetryBuilder({
      ...this.state,
      transports: new Map(this.state.transports),
      version,
    })
  }

  /**
   * Adds a typed actor definition.
   *
   * @param key - The actor key (e.g., 'user', 'system', 'agent')
   * @param options - Optional configuration for the actor
   * @returns A new builder with the actor added
   *
   * @example
   * ```typescript
   * builder
   *   .addActor('user', { description: 'Human user' })
   *   .addActor('system')
   *   .addActor('agent', { description: 'AI agent' })
   * ```
   */
  addActor<TKey extends string>(
    key: TKey,
    options?: TelemetryActorOptions,
  ): IgniterTelemetryBuilder<TRegistry, TScopes, TActors | TKey> {
    validateKey(key, 'Actor key')

    if (key in this.state.actorDefinitions) {
      throw new IgniterTelemetryError({
        code: 'TELEMETRY_DUPLICATE_ACTOR',
        message: `Actor "${key}" is already defined`,
        statusCode: 400,
        details: { key },
      })
    }

    return new IgniterTelemetryBuilder({
      ...this.state,
      transports: new Map(this.state.transports),
      actorDefinitions: {
        ...this.state.actorDefinitions,
        [key]: options ?? {},
      },
    })
  }

  /**
   * Adds a typed scope definition.
   *
   * @param key - The scope key (e.g., 'organization', 'workspace')
   * @param options - Optional configuration for the scope
   * @returns A new builder with the scope added
   *
   * @example
   * ```typescript
   * builder
   *   .addScope('organization', { required: true })
   *   .addScope('workspace')
   *   .addScope('project')
   * ```
   */
  addScope<TKey extends string>(
    key: TKey,
    options?: TelemetryScopeOptions,
  ): IgniterTelemetryBuilder<TRegistry, TScopes | TKey, TActors> {
    validateKey(key, 'Scope key')

    if (key in this.state.scopeDefinitions) {
      throw new IgniterTelemetryError({
        code: 'TELEMETRY_DUPLICATE_SCOPE',
        message: `Scope "${key}" is already defined`,
        statusCode: 400,
        details: { key },
      })
    }

    return new IgniterTelemetryBuilder({
      ...this.state,
      transports: new Map(this.state.transports),
      scopeDefinitions: {
        ...this.state.scopeDefinitions,
        [key]: options ?? {},
      },
    })
  }

  /**
   * Adds events from a descriptor built with IgniterTelemetryEvents.
   *
   * @param descriptor - The events descriptor from IgniterTelemetryEvents.build()
   * @param options - Optional validation options
   * @returns A new builder with the events added
   *
   * @example
   * ```typescript
   * const JobsEvents = IgniterTelemetryEvents
   *   .namespace('igniter.jobs')
   *   .event('worker.started', schema)
   *   .build()
   *
   * builder.addEvents(JobsEvents)
   * ```
   */
  addEvents<TEvents extends TelemetryEventsMap, TNamespace extends string>(
    descriptor: TelemetryEventsDescriptor<TEvents> & { namespace: TNamespace },
    options?: TelemetryEventsValidationOptions,
  ): IgniterTelemetryBuilder<TRegistry & { [K in TNamespace]: TEvents }, TScopes, TActors> {
    const namespace = descriptor.namespace

    if (namespace in this.state.eventsRegistry) {
      throw new IgniterTelemetryError({
        code: 'TELEMETRY_DUPLICATE_NAMESPACE',
        message: `Namespace "${namespace}" is already registered`,
        statusCode: 400,
        details: { namespace },
      })
    }

    const newRegistry = {
      ...this.state.eventsRegistry,
      [namespace]: descriptor.events,
    } as TRegistry & { [K in TNamespace]: TEvents }

    const validation = options
      ? { ...this.state.eventsValidation, ...options }
      : this.state.eventsValidation

    return new IgniterTelemetryBuilder({
      ...this.state,
      transports: new Map(this.state.transports),
      eventsRegistry: newRegistry,
      eventsValidation: validation,
    })
  }

  /**
   * Adds a transport adapter.
   *
   * Only one transport per type is allowed. Adding a duplicate type
   * will throw an error.
   *
   * @param type - The transport type
   * @param adapter - The transport adapter instance
   * @returns A new builder with the transport added
   *
   * @example
   * ```typescript
   * builder
   *   .addTransport('logger', LoggerTransportAdapter.create({ logger: console }))
   *   .addTransport('store', StoreStreamTransportAdapter.create({ store }))
   * ```
   */
  addTransport(
    type: TelemetryTransportType,
    adapter: IgniterTelemetryTransportAdapter,
  ): IgniterTelemetryBuilder<TRegistry, TScopes, TActors> {
    if (this.state.transports.has(type)) {
      throw new IgniterTelemetryError({
        code: 'TELEMETRY_DUPLICATE_TRANSPORT',
        message: `Transport type "${type}" is already registered`,
        statusCode: 400,
        details: { type },
      })
    }

    // Validate adapter type matches
    if (adapter.type !== type) {
      throw new IgniterTelemetryError({
        code: 'TELEMETRY_INVALID_TRANSPORT',
        message: `Transport adapter type "${adapter.type}" does not match registered type "${type}"`,
        statusCode: 400,
        details: { expectedType: type, actualType: adapter.type },
      })
    }

    const newTransports = new Map(this.state.transports)
    newTransports.set(type, adapter)

    return new IgniterTelemetryBuilder({
      ...this.state,
      transports: newTransports,
    })
  }

  /**
   * Sets the sampling policy.
   *
   * @param policy - The sampling policy configuration
   * @returns A new builder with sampling configured
   *
   * @example
   * ```typescript
   * builder.withSampling({
   *   debugRate: 0.01,
   *   infoRate: 0.1,
   *   warnRate: 1.0,
   *   errorRate: 1.0,
   *   always: ['*.failed', '*.error'],
   *   never: ['health.check'],
   * })
   * ```
   */
  withSampling(policy: TelemetrySamplingPolicy): IgniterTelemetryBuilder<TRegistry, TScopes, TActors> {
    return new IgniterTelemetryBuilder({
      ...this.state,
      transports: new Map(this.state.transports),
      sampling: { ...this.state.sampling, ...policy },
    })
  }

  /**
   * Sets the redaction policy.
   *
   * @param policy - The redaction policy configuration
   * @returns A new builder with redaction configured
   *
   * @example
   * ```typescript
   * builder.withRedaction({
   *   denylistKeys: ['password', 'secret', 'authorization'],
   *   hashKeys: ['email', 'ip', 'userAgent'],
   *   maxStringLength: 5000,
   * })
   * ```
   */
  withRedaction(policy: TelemetryRedactionPolicy): IgniterTelemetryBuilder<TRegistry, TScopes, TActors> {
    return new IgniterTelemetryBuilder({
      ...this.state,
      transports: new Map(this.state.transports),
      redaction: { ...this.state.redaction, ...policy },
    })
  }

  /**
   * Sets event validation options.
   *
   * @param options - The validation options
   * @returns A new builder with validation configured
   *
   * @example
   * ```typescript
   * builder.withValidation({
   *   mode: 'always',
   *   strict: true,
   * })
   * ```
   */
  withValidation(options: TelemetryEventsValidationOptions): IgniterTelemetryBuilder<TRegistry, TScopes, TActors> {
    return new IgniterTelemetryBuilder({
      ...this.state,
      transports: new Map(this.state.transports),
      eventsValidation: { ...this.state.eventsValidation, ...options },
    })
  }

  /**
   * Sets the logger instance.
   *
   * @param logger - The logger to use
   * @returns A new builder with the logger configured
   *
   * @example
   * ```typescript
   * builder.withLogger(myLogger)
   * ```
   */
  withLogger(logger: IgniterLogger): IgniterTelemetryBuilder<TRegistry, TScopes, TActors> {
    return new IgniterTelemetryBuilder({
      ...this.state,
      transports: new Map(this.state.transports),
      logger,
    })
  }

  /**
   * Builds the IgniterTelemetry instance.
   *
   * @returns The configured IgniterTelemetry instance
   * @throws IgniterTelemetryError if required configuration is missing
   *
   * @example
   * ```typescript
   * const telemetry = IgniterTelemetry.create()
   *   .withService('my-api')
   *   .withEnvironment('production')
   *   .build()
   * ```
   */
  build(): IgniterTelemetry<TRegistry, TScopes, TActors> {
    // We need to return synchronously but avoid circular imports
    // Solution: use a deferred import that resolves at runtime
    return this.buildSync()
  }

  /**
   * Builds the configuration object without creating the runtime.
   * Useful for testing or custom runtime instantiation.
   *
   * @returns The telemetry configuration
   * @throws IgniterTelemetryError if required configuration is missing
   */
  buildConfig(): TelemetryConfig<TRegistry, TScopes, TActors> {
    if (!this.state.service) {
      throw new IgniterTelemetryError({
        code: 'TELEMETRY_SERVICE_REQUIRED',
        message: 'Service name is required. Use .withService("my-service") to set it.',
        statusCode: 400,
      })
    }

    // Default environment to 'development' if not set
    const environment = this.state.environment ?? 'development'

    return {
      service: this.state.service,
      environment,
      version: this.state.version,
      eventsRegistry: this.state.eventsRegistry,
      eventsValidation: this.state.eventsValidation,
      transports: this.state.transports,
      scopeDefinitions: this.state.scopeDefinitions,
      actorDefinitions: this.state.actorDefinitions,
      sampling: { ...DEFAULT_SAMPLING_POLICY, ...this.state.sampling },
      redaction: { ...DEFAULT_REDACTION_POLICY, ...this.state.redaction },
      logger: this.state.logger,
    }
  }

  /**
   * Synchronously builds the telemetry instance.
   * Uses a runtime factory that's set during module initialization.
   */
  private buildSync(): IgniterTelemetry<TRegistry, TScopes, TActors> {
    const config = this.buildConfig()

    // The runtime factory is set by the core module to avoid circular imports
    if (!IgniterTelemetryBuilder._runtimeFactory) {
      throw new IgniterTelemetryError({
        code: 'TELEMETRY_RUNTIME_NOT_INITIALIZED',
        message: 'Telemetry runtime factory not initialized. Import from @igniter-js/telemetry first.',
        statusCode: 500,
      })
    }

    return IgniterTelemetryBuilder._runtimeFactory(config)
  }

  /**
   * @internal
   * Factory function to create runtime instances.
   * Set by the core module during initialization.
   */
  static _runtimeFactory: (<R extends TelemetryEventsRegistry, S extends string, A extends string>(
    config: TelemetryConfig<R, S, A>,
  ) => IgniterTelemetry<R, S, A>) | null = null
}
