import type { IgniterLogger } from '@igniter-js/core'
import type { IgniterTelemetryConfig, IgniterTelemetryActorOptions, IgniterTelemetryScopeOptions } from './config'
import type { IgniterTelemetryEventsRegistry, IgniterTelemetryEventsValidationOptions } from './events'
import type { IgniterTelemetryRedactionPolicy, IgniterTelemetrySamplingPolicy } from './policies'
import type { IgniterTelemetryTransportAdapter } from './transport'

/**
 * Builder state for IgniterTelemetry configuration.
 */
export interface IgniterTelemetryBuilderState<
  TRegistry extends IgniterTelemetryEventsRegistry = IgniterTelemetryEventsRegistry,
  TScopes extends string = never,
  TActors extends string = never,
> {
  service?: string
  environment?: string
  version?: string
  eventsRegistry: TRegistry
  eventsValidation: IgniterTelemetryEventsValidationOptions
  transports: Map<string, IgniterTelemetryTransportAdapter>
  scopeDefinitions: Record<string, IgniterTelemetryScopeOptions>
  actorDefinitions: Record<string, IgniterTelemetryActorOptions>
  sampling: IgniterTelemetrySamplingPolicy
  redaction: IgniterTelemetryRedactionPolicy
  logger?: IgniterLogger
}
