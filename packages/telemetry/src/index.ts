/**
 * @fileoverview Main entry point for @igniter-js/telemetry
 * @module @igniter-js/telemetry
 *
 * @description
 * A type-safe, extensible telemetry library for Igniter.js.
 * Provides session-based event emission, typed event registry,
 * transport adapters, and sampling/redaction policies.
 *
 * @example
 * ```typescript
 * import { IgniterTelemetry, IgniterTelemetryEvents, LoggerTransportAdapter } from '@igniter-js/telemetry'
 * import { z } from 'zod'
 *
 * // 1. Define events per feature
 * const JobsTelemetryEvents = IgniterTelemetryEvents
 *   .namespace('igniter.jobs')
 *   .event('worker.started', z.object({ 'ctx.worker.id': z.string() }))
 *   .group('job', (g) =>
 *     g.event('start', z.object({ 'ctx.job.id': z.string() }))
 *      .event('completed', z.object({ 'ctx.job.id': z.string(), 'ctx.job.duration': z.number() }))
 *      .event('failed', z.object({ 'ctx.job.id': z.string() }))
 *   )
 *   .build()
 *
 * // 2. Create telemetry instance
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .withEnvironment(process.env.NODE_ENV ?? 'development')
 *   .withVersion(process.env.APP_VERSION ?? 'unknown')
 *   .addActor('user')
 *   .addActor('system')
 *   .addScope('organization')
 *   .addScope('workspace')
 *   .addEvents(JobsTelemetryEvents)
 *   .addTransport('logger', LoggerTransportAdapter.create({ logger: console }))
 *   .withSampling({ debugRate: 0.01, errorRate: 1.0 })
 *   .withRedaction({ denylistKeys: ['password', 'secret'] })
 *   .build()
 *
 * // 3. Mode A: Direct emit
 * telemetry.emit('igniter.jobs.job.completed', {
 *   attributes: { 'ctx.job.id': 'job-123', 'ctx.job.duration': 1500 },
 * })
 *
 * // 4. Mode B: Session handle
 * const session = telemetry.session()
 *   .actor('user', 'usr_123', { role: 'admin' })
 *   .scope('organization', 'org_456', { plan: 'enterprise' })
 *
 * session.emit('igniter.jobs.job.start', { attributes: { 'ctx.job.id': 'job-456' } })
 * await session.end()
 *
 * // 5. Mode C: Scoped execution
 * await telemetry.session()
 *   .actor('user', 'usr_123')
 *   .scope('organization', 'org_456')
 *   .run(async () => {
 *     telemetry.emit('igniter.jobs.worker.started', { attributes: { 'ctx.worker.id': 'w1' } })
 *     telemetry.emit('igniter.jobs.job.completed', { attributes: { 'ctx.job.id': 'j1', 'ctx.job.duration': 100 } })
 *   })
 *
 * // 6. Shutdown gracefully
 * await telemetry.shutdown()
 * ```
 */

// Core
export { IgniterTelemetry, IgniterTelemetryRuntime, type IgniterTelemetry as IgniterTelemetryInterface } from './core/igniter-telemetry'
export { createSession, getActiveSession, type IgniterTelemetrySession, type TelemetrySessionState } from './core/session'

// Builders
export { IgniterTelemetryBuilder, type IgniterTelemetryBuilderState } from './builders/igniter-telemetry.builder'

// Errors
export { IgniterTelemetryError, IGNITER_TELEMETRY_ERROR_CODES, type IgniterTelemetryErrorCode, type IgniterTelemetryErrorPayload } from './errors/igniter-telemetry.error'

// Types
export type { TelemetryLevel } from './types/levels'
export type {
  TelemetryTags,
  TelemetryAttributes,
  TelemetryActor,
  TelemetryScope,
  TelemetryError,
  TelemetrySource,
  TelemetryEnvelope,
} from './types/envelope'

export type {
  TelemetryEmitInput,
  TelemetryActorInput,
  TelemetryScopeInput,
} from './types/emit'

export type {
  TelemetryEventSchema,
  TelemetryEventDescriptor,
  TelemetryEventsMap,
  TelemetryEventsRegistry,
  TelemetryEventsDescriptor,
  TelemetryEventsValidationOptions,
  TelemetryFlattenEventKeys,
  TelemetryFlattenRegistryKeys,
  TelemetryGetEventSchema,
  TelemetryInferEventSchema,
} from './types/events'

export type {
  TelemetryRedactionPolicy,
  TelemetrySamplingPolicy,
} from './types/policies'

export {
  DEFAULT_REDACTION_POLICY,
  DEFAULT_SAMPLING_POLICY,
} from './types/policies'

export type {
  TelemetryTransportType,
  TelemetryTransportMeta,
  IgniterTelemetryTransportAdapter,
  TelemetryTransportConfig,
} from './types/transport'

export type {
  TelemetryActorOptions,
  TelemetryScopeOptions,
  TelemetryConfig,
} from './types/config'

export {
  TELEMETRY_LEVELS,
  TELEMETRY_LEVEL_PRIORITY,
  isTelemetryLevel,
} from './types/levels'

// Utils
export { IgniterTelemetryEvents, IgniterTelemetryEventsGroup } from './utils/events'
export { generateSessionId, generateSpanId, generateTraceId, isValidSessionId } from './utils/id'
export { createRedactor, createSyncRedactor, redactEnvelope } from './utils/redaction'
export { createSampler, matchesPattern, shouldSample } from './utils/sampling'

// Adapters (also available via @igniter-js/telemetry/adapters)
export { LoggerTransportAdapter, type LoggerTransportConfig, type TelemetryLogger } from './adapters/logger.adapter'
export { StoreStreamTransportAdapter, type StoreStreamTransportConfig, type TelemetryStoreInterface } from './adapters/store.adapter'
