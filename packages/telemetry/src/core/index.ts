/**
 * @fileoverview Core exports for @igniter-js/telemetry
 * @module @igniter-js/telemetry/core
 */

export { IgniterTelemetry, IgniterTelemetryRuntime, type IgniterTelemetry as IgniterTelemetryInterface } from './igniter-telemetry'
export {
  createSession,
  getActiveSession,
  runWithSession,
  type IgniterTelemetrySession,
  type TelemetrySessionState,
  type SessionEmitFn,
} from './session'
