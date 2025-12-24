/**
 * @fileoverview Configuration types for @igniter-js/telemetry
 * @module @igniter-js/telemetry/types/config
 */

import type { IgniterLogger } from '@igniter-js/core'
import type { IgniterTelemetryEventsRegistry, IgniterTelemetryEventsValidationOptions } from './events'
import type { IgniterTelemetryRedactionPolicy, IgniterTelemetrySamplingPolicy } from './policies'
import type { IgniterTelemetryTransportAdapter } from './transport'

/**
 * Options for actor definitions.
 *
 * @example
 * ```typescript
 * const options: IgniterTelemetryActorOptions = {
 *   description: 'Human user of the application',
 *   required: false,
 * }
 * ```
 */
export interface IgniterTelemetryActorOptions {
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
 * const options: IgniterTelemetryScopeOptions = {
 *   description: 'Organization-level tenant isolation',
 *   required: true,
 * }
 * ```
 */
export interface IgniterTelemetryScopeOptions {
  /** Description of this scope type */
  description?: string
  /** Whether this scope is required for all events */
  required?: boolean
}

/**
 * Internal configuration for the telemetry instance.
 */
export interface IgniterTelemetryConfig<
  TRegistry extends IgniterTelemetryEventsRegistry = IgniterTelemetryEventsRegistry,
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
  eventsValidation: IgniterTelemetryEventsValidationOptions
  /** Registered transports */
  transports: Map<string, IgniterTelemetryTransportAdapter>
  /** Scope definitions */
  scopeDefinitions: Record<string, IgniterTelemetryScopeOptions>
  /** Actor definitions */
  actorDefinitions: Record<string, IgniterTelemetryActorOptions>
  /** Sampling policy */
  sampling: Required<IgniterTelemetrySamplingPolicy>
  /** Redaction policy */
  redaction: Required<IgniterTelemetryRedactionPolicy>
  /** Logger instance */
  logger?: IgniterLogger
}
