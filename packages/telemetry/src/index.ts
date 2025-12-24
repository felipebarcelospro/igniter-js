import './shim'

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

// Builders
export * from "./builders";
export type * from "./builders";

import { IgniterTelemetryBuilder } from "./builders";

/**
 * Main entry point for IgniterTelemetry.
 * Alias for IgniterTelemetryBuilder.
 */
export const IgniterTelemetry = IgniterTelemetryBuilder;

// Core
export * from './core'
export type * from './core'

// Errors
export * from "./errors";
export type * from "./errors";

// Types
export * from "./types";
export type * from "./types";

// Utils
export * from "./utils";
export type * from "./utils";

// Adapters (also available via @igniter-js/telemetry/adapters)
export * from "./adapters";
export type * from "./adapters";