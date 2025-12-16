/**
 * @fileoverview Telemetry events and utilities for @igniter-js/jobs
 * @module @igniter-js/jobs/telemetry
 *
 * @description
 * Provides typed telemetry event definitions for job lifecycle tracking.
 * These events follow the OpenTelemetry semantic conventions and integrate
 * seamlessly with @igniter-js/telemetry.
 *
 * @example
 * ```typescript
 * import { IgniterTelemetry } from '@igniter-js/telemetry'
 * import { IgniterJobsTelemetryEvents } from '@igniter-js/jobs'
 *
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .withEnvironment('production')
 *   .addEvents(IgniterJobsTelemetryEvents)
 *   .build()
 *
 * // Then pass to IgniterJobs
 * const jobs = IgniterJobs.create()
 *   .withTelemetry(telemetry)
 *   // ...
 *   .build()
 * ```
 */

export { IgniterJobsTelemetryEvents } from "./jobs.telemetry";
export type { IgniterJobsTelemetryEventNames } from "./jobs.telemetry";
