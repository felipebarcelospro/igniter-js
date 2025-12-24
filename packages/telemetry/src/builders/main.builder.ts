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
import type { IgniterTelemetryActorOptions, IgniterTelemetryConfig, IgniterTelemetryScopeOptions } from '../types/config'
import type { IgniterTelemetryEventsDescriptor, IgniterTelemetryEventsMap, IgniterTelemetryEventsRegistry, IgniterTelemetryEventsValidationOptions } from '../types/events'
import type { IgniterTelemetryRedactionPolicy, IgniterTelemetrySamplingPolicy } from '../types/policies'
import type { IgniterTelemetryTransportAdapter, IgniterTelemetryTransportType } from '../types/transport'
import { IGNITER_TELEMETRY_DEFAULT_REDACTION_POLICY, IGNITER_TELEMETRY_DEFAULT_SAMPLING_POLICY } from '../types/policies'
import { IgniterTelemetryError } from '../errors/telemetry.error'
import { IgniterTelemetryManager } from '../core/manager'
import type { IIgniterTelemetryManager } from '../types/manager'
import { IgniterTelemetryKeyValidator } from '../types/keys'
import type { IgniterTelemetryBuilderState } from '../types/builder'

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
  TRegistry extends IgniterTelemetryEventsRegistry = {},
  TScopes extends string = never,
  TActors extends string = never,
> {
  private readonly state: IgniterTelemetryBuilderState<TRegistry, TScopes, TActors>

  constructor(state: IgniterTelemetryBuilderState<TRegistry, TScopes, TActors>) {
    this.state = state
  }

  /**
   * Creates a new telemetry builder instance.
   *
   * @returns A new IgniterTelemetryBuilder instance
   *
   * @example
   * ```typescript
   * const builder = IgniterTelemetry.create()
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
    options?: IgniterTelemetryActorOptions,
  ): IgniterTelemetryBuilder<TRegistry, TScopes, TActors | TKey> {
    IgniterTelemetryKeyValidator.validateKey(key, 'Actor key')

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
    options?: IgniterTelemetryScopeOptions,
  ): IgniterTelemetryBuilder<TRegistry, TScopes | TKey, TActors> {
    IgniterTelemetryKeyValidator.validateKey(key, 'Scope key')

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
  addEvents<TEvents extends IgniterTelemetryEventsMap, TNamespace extends string>(
    descriptor: IgniterTelemetryEventsDescriptor<TNamespace, TEvents> & { namespace: TNamespace },
    options?: IgniterTelemetryEventsValidationOptions,
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
    type: IgniterTelemetryTransportType,
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
  withSampling(policy: IgniterTelemetrySamplingPolicy): IgniterTelemetryBuilder<TRegistry, TScopes, TActors> {
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
  withRedaction(policy: IgniterTelemetryRedactionPolicy): IgniterTelemetryBuilder<TRegistry, TScopes, TActors> {
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
  withValidation(options: IgniterTelemetryEventsValidationOptions): IgniterTelemetryBuilder<TRegistry, TScopes, TActors> {
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
  build(): IIgniterTelemetryManager<TRegistry, TScopes, TActors> {
    const config = this.buildConfig()

    if (config.logger) {
      config.logger.info('[IgniterTelemetry] Building telemetry manager', {
        service: config.service,
        environment: config.environment,
      })
    }

    return new IgniterTelemetryManager<TRegistry, TScopes, TActors>(config)
  }

  /**
   * Builds the configuration object without creating the runtime.
   * Useful for testing or custom runtime instantiation.
   *
   * @returns The telemetry configuration
   * @throws IgniterTelemetryError if required configuration is missing
   */
  buildConfig(): IgniterTelemetryConfig<TRegistry, TScopes, TActors> {
    // Set default service if not set
    this.state.service ??= 'igniter-app'

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
      sampling: { ...IGNITER_TELEMETRY_DEFAULT_SAMPLING_POLICY, ...this.state.sampling },
      redaction: { ...IGNITER_TELEMETRY_DEFAULT_REDACTION_POLICY, ...this.state.redaction },
      logger: this.state.logger,
    }
  }
}

export const IgniterTelemetry = {
  create: IgniterTelemetryBuilder.create,
}