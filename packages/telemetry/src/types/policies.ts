/**
 * @fileoverview Policy types for sampling and redaction in @igniter-js/telemetry
 * @module @igniter-js/telemetry/types/policies
 */

/**
 * Configuration for redacting sensitive data from telemetry events.
 *
 * Redaction is applied before events are sent to transports, ensuring
 * sensitive data never leaves the application.
 *
 * @example
 * ```typescript
 * const redactionPolicy: TelemetryRedactionPolicy = {
 *   // Keys that will be completely removed from attributes
 *   denylistKeys: ['authorization', 'cookie', 'password', 'secret'],
 *
 *   // Keys whose values will be hashed (SHA-256)
 *   hashKeys: ['ip', 'userAgent', 'email'],
 *
 *   // Maximum string length (longer strings will be truncated)
 *   maxStringLength: 5000,
 * }
 * ```
 */
export interface TelemetryRedactionPolicy {
  /**
   * Keys that will be completely removed from attributes.
   * Case-insensitive matching is applied.
   *
   * @example ['authorization', 'cookie', 'password', 'apiKey']
   */
  denylistKeys?: string[]

  /**
   * Keys whose values will be hashed using SHA-256.
   * Useful for PII that needs to be correlated without storing raw values.
   * Case-insensitive matching is applied.
   *
   * @example ['ip', 'userAgent', 'email', 'userId']
   */
  hashKeys?: string[]

  /**
   * Maximum string length for attribute values.
   * Longer strings will be truncated with '...[truncated]' suffix.
   *
   * @default 5000
   */
  maxStringLength?: number
}

/**
 * Configuration for sampling telemetry events.
 *
 * Sampling determines which events are actually sent to transports.
 * This is useful for reducing telemetry volume while maintaining visibility.
 *
 * @example
 * ```typescript
 * const samplingPolicy: TelemetrySamplingPolicy = {
 *   // Sample 1% of debug events
 *   debugRate: 0.01,
 *
 *   // Sample 10% of info events
 *   infoRate: 0.1,
 *
 *   // Sample all warn and error events
 *   warnRate: 1.0,
 *   errorRate: 1.0,
 *
 *   // Always sample these event patterns (ignores rates)
 *   always: ['*.failed', '*.error', 'security.*'],
 *
 *   // Never sample these patterns (drops them entirely)
 *   never: ['health.check', 'metrics.heartbeat'],
 * }
 * ```
 */
export interface TelemetrySamplingPolicy {
  /**
   * Sampling rate for debug-level events (0.0 to 1.0).
   * @default 0.01 (1%)
   */
  debugRate?: number

  /**
   * Sampling rate for info-level events (0.0 to 1.0).
   * @default 0.1 (10%)
   */
  infoRate?: number

  /**
   * Sampling rate for warn-level events (0.0 to 1.0).
   * @default 1.0 (100%)
   */
  warnRate?: number

  /**
   * Sampling rate for error-level events (0.0 to 1.0).
   * @default 1.0 (100%)
   */
  errorRate?: number

  /**
   * Event name patterns that should always be sampled (ignores rates).
   * Supports basic glob patterns with `*` wildcard.
   *
   * @example ['*.failed', '*.error', 'security.*', 'audit.*']
   */
  always?: string[]

  /**
   * Event name patterns that should never be sampled (always dropped).
   * Supports basic glob patterns with `*` wildcard.
   *
   * @example ['health.check', 'metrics.heartbeat', 'debug.*']
   */
  never?: string[]
}

/**
 * Default redaction policy values.
 */
export const DEFAULT_REDACTION_POLICY: Required<TelemetryRedactionPolicy> = {
  denylistKeys: [],
  hashKeys: [],
  maxStringLength: 5000,
}

/**
 * Default sampling policy values.
 */
export const DEFAULT_SAMPLING_POLICY: Required<TelemetrySamplingPolicy> = {
  debugRate: 0.01,
  infoRate: 0.1,
  warnRate: 1.0,
  errorRate: 1.0,
  always: [],
  never: [],
}
