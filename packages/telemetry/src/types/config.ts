/**
 * @fileoverview Configuration types for @igniter-js/telemetry
 * @module @igniter-js/telemetry/types/config
 */

import type { IgniterLogger } from '@igniter-js/core'
import type { TelemetryEventsRegistry, TelemetryEventsValidationOptions } from './events'
import type { TelemetryRedactionPolicy, TelemetrySamplingPolicy } from './policies'
import type { IgniterTelemetryTransportAdapter } from './transport'

/**
 * Options for actor definitions.
 *
 * @example
 * ```typescript
 * const options: TelemetryActorOptions = {
 *   description: 'Human user of the application',
 *   required: false,
 * }
 * ```
 */
export interface TelemetryActorOptions {
  /** Description of this actor type */
  description?: string
  /** Whether this actor is required for all events */
  required?: boolean
}

/**
 * Options for scope definitions.
 *
 * @example
 * ```typescript
 * const options: TelemetryScopeOptions = {
 *   description: 'Organization-level tenant isolation',
 *   required: true,
 * }
 * ```
 */
export interface TelemetryScopeOptions {
  /** Description of this scope type */
  description?: string
  /** Whether this scope is required for all events */
  required?: boolean
}

/**
 * Internal configuration for the telemetry instance.
 */
export interface TelemetryConfig<
  TRegistry extends TelemetryEventsRegistry = TelemetryEventsRegistry,
  TScopes extends string = never,
  TActors extends string = never,
> {
  /** Service name */
  service: string
  /** Environment name */
  environment: string
  /** Optional service version */
  version?: string
  /** Events registry */
  eventsRegistry: TRegistry
  /** Events validation options */
  eventsValidation: TelemetryEventsValidationOptions
  /** Registered transports */
  transports: Map<string, IgniterTelemetryTransportAdapter>
  /** Scope definitions */
  scopeDefinitions: Record<string, TelemetryScopeOptions>
  /** Actor definitions */
  actorDefinitions: Record<string, TelemetryActorOptions>
  /** Sampling policy */
  sampling: Required<TelemetrySamplingPolicy>
  /** Redaction policy */
  redaction: Required<TelemetryRedactionPolicy>
  /** Logger instance */
  logger?: IgniterLogger
}
