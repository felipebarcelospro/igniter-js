/**
 * @fileoverview Telemetry level types for @igniter-js/telemetry
 * @module @igniter-js/telemetry/types/levels
 */

/**
 * Telemetry severity levels.
 *
 * Levels are ordered from least to most severe:
 * - `debug`: Detailed information for debugging purposes
 * - `info`: General informational messages
 * - `warn`: Warning conditions that should be addressed
 * - `error`: Error conditions that require attention
 *
 * @example
 * ```typescript
 * const level: IgniterTelemetryLevel = 'info'
 *
 * // Use in emit
 * telemetry.emit('user.login', { level: 'info', attributes: { userId: '123' } })
 * ```
 */
export type IgniterTelemetryLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Numeric priority for telemetry levels.
 * Higher values indicate more severe levels.
 */
export const IGNITER_TELEMETRY_LEVEL_PRIORITY: Record<IgniterTelemetryLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const

/**
 * All telemetry levels as an array (ordered by severity).
 */
export const IGNITER_TELEMETRY_LEVELS: readonly IgniterTelemetryLevel[] = ['debug', 'info', 'warn', 'error'] as const

/**
 * Check if a value is a valid telemetry level.
 *
 * @param value - The value to check
 * @returns True if the value is a valid IgniterTelemetryLevel
 *
 * @example
 * ```typescript
 * isIgniterTelemetryLevel('info') // true
 * isIgniterTelemetryLevel('trace') // false
 * ```
 */
export function isIgniterTelemetryLevel(value: unknown): value is IgniterTelemetryLevel {
  return typeof value === 'string' && IGNITER_TELEMETRY_LEVELS.includes(value as IgniterTelemetryLevel)
}
