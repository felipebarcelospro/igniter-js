/**
 * @fileoverview ID generation utilities for @igniter-js/telemetry
 * @module @igniter-js/telemetry/utils/id
 *
 * @description
 * Provides utilities for generating unique identifiers for sessions and spans.
 * Uses built-in crypto for secure random generation without external dependencies.
 */

/**
 * Generates a random hex string of specified length.
 *
 * @param length - The number of hex characters (must be even)
 * @returns A random hex string
 *
 * @example
 * ```typescript
 * const hex = generateHex(16) // '1a2b3c4d5e6f7890'
 * ```
 */
function generateHex(length: number): string {
  const bytes = new Uint8Array(length / 2)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Generates a unique session ID.
 *
 * Format: `ses_<timestamp>_<random>`
 * - Prefix: 'ses_' for easy identification
 * - Timestamp: Base36 encoded milliseconds for rough ordering
 * - Random: 8 random hex chars for uniqueness
 *
 * @returns A unique session ID
 *
 * @example
 * ```typescript
 * const sessionId = generateSessionId()
 * // 'ses_lk3m5n7p_a1b2c3d4'
 * ```
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36)
  const random = generateHex(8)
  return `ses_${timestamp}_${random}`
}

/**
 * Generates a unique span ID.
 *
 * Format: 16 random hex characters (64 bits).
 * Compatible with OpenTelemetry span ID format.
 *
 * @returns A unique span ID
 *
 * @example
 * ```typescript
 * const spanId = generateSpanId()
 * // '1a2b3c4d5e6f7890'
 * ```
 */
export function generateSpanId(): string {
  return generateHex(16)
}

/**
 * Generates a unique trace ID.
 *
 * Format: 32 random hex characters (128 bits).
 * Compatible with OpenTelemetry trace ID format.
 *
 * @returns A unique trace ID
 *
 * @example
 * ```typescript
 * const traceId = generateTraceId()
 * // '1a2b3c4d5e6f78901a2b3c4d5e6f7890'
 * ```
 */
export function generateTraceId(): string {
  return generateHex(32)
}

/**
 * Checks if a string is a valid session ID format.
 *
 * @param id - The ID to check
 * @returns True if the ID matches the session ID format
 *
 * @example
 * ```typescript
 * isValidSessionId('ses_lk3m5n7p_a1b2c3d4') // true
 * isValidSessionId('invalid') // false
 * ```
 */
export function isValidSessionId(id: string): boolean {
  return typeof id === 'string' && /^ses_[a-z0-9]+_[a-f0-9]+$/i.test(id)
}
