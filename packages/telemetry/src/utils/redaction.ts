/**
 * @fileoverview Redaction utilities for @igniter-js/telemetry
 * @module @igniter-js/telemetry/utils/redaction
 *
 * @description
 * Provides utilities for redacting sensitive data from telemetry events.
 * Supports denylisting keys, hashing values, and truncating long strings.
 */

import type { TelemetryAttributes, TelemetryEnvelope } from '../types/envelope'
import type { TelemetryRedactionPolicy } from '../types/policies'
import { DEFAULT_REDACTION_POLICY } from '../types/policies'

/**
 * Simple hash function using Web Crypto API.
 * Returns a truncated SHA-256 hash as hex string.
 *
 * @param value - The value to hash
 * @returns A promise resolving to the hash string
 *
 * @example
 * ```typescript
 * const hash = await hashValue('sensitive-data')
 * // 'sha256:a1b2c3d4...'
 * ```
 */
async function hashValueAsync(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  // Return first 16 chars for reasonable length
  return `sha256:${hashHex.slice(0, 16)}`
}

/**
 * Synchronous hash function fallback using a simple djb2 hash.
 * Used when crypto.subtle is not available.
 *
 * @param value - The value to hash
 * @returns The hash string
 */
function hashValueSync(value: string): string {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i)
  }
  const hashHex = (hash >>> 0).toString(16).padStart(8, '0')
  return `hash:${hashHex}`
}

/**
 * Truncates a string to the specified maximum length.
 *
 * @param value - The string to truncate
 * @param maxLength - The maximum length
 * @returns The truncated string with suffix if truncated
 *
 * @example
 * ```typescript
 * truncateString('hello world', 5) // 'hello...[truncated]'
 * truncateString('hi', 5) // 'hi'
 * ```
 */
function truncateString(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }
  return `${value.slice(0, maxLength)}...[truncated]`
}

/**
 * Checks if a key matches any pattern in a list (case-insensitive).
 *
 * @param key - The key to check
 * @param patterns - The patterns to match against
 * @returns True if the key matches any pattern
 */
function keyMatchesPatterns(key: string, patterns: string[]): boolean {
  const lowerKey = key.toLowerCase()
  return patterns.some((pattern) => {
    const lowerPattern = pattern.toLowerCase()
    // Check for exact match or if key ends with the pattern (for nested keys)
    return lowerKey === lowerPattern ||
           lowerKey.endsWith(`.${lowerPattern}`) ||
           lowerKey.includes(`.${lowerPattern}.`) ||
           lowerKey.startsWith(`${lowerPattern}.`)
  })
}

/**
 * Creates a redaction function based on the provided policy.
 *
 * @param policy - The redaction policy
 * @returns A function that redacts attributes
 *
 * @example
 * ```typescript
 * const redact = createRedactor({
 *   denylistKeys: ['password', 'secret'],
 *   hashKeys: ['email'],
 *   maxStringLength: 100,
 * })
 *
 * const redacted = await redact({
 *   password: 'secret123',
 *   email: 'user@example.com',
 *   message: 'short message',
 * })
 * // { email: 'sha256:a1b2...', message: 'short message' }
 * ```
 */
export function createRedactor(
  policy: TelemetryRedactionPolicy = {},
): (attributes: TelemetryAttributes) => Promise<TelemetryAttributes> {
  const {
    denylistKeys = DEFAULT_REDACTION_POLICY.denylistKeys,
    hashKeys = DEFAULT_REDACTION_POLICY.hashKeys,
    maxStringLength = DEFAULT_REDACTION_POLICY.maxStringLength,
  } = policy

  return async (attributes: TelemetryAttributes): Promise<TelemetryAttributes> => {
    const result: TelemetryAttributes = {}

    for (const [key, value] of Object.entries(attributes)) {
      // Skip denylisted keys
      if (keyMatchesPatterns(key, denylistKeys)) {
        continue
      }

      // Handle null values
      if (value === null) {
        result[key] = null
        continue
      }

      // Hash if needed
      if (keyMatchesPatterns(key, hashKeys) && typeof value === 'string') {
        try {
          result[key] = await hashValueAsync(value)
        } catch {
          result[key] = hashValueSync(value)
        }
        continue
      }

      // Truncate long strings
      if (typeof value === 'string') {
        result[key] = truncateString(value, maxStringLength)
        continue
      }

      // Pass through other values
      result[key] = value
    }

    return result
  }
}

/**
 * Synchronous redactor for use in non-async contexts.
 * Uses a simpler hash function.
 *
 * @param policy - The redaction policy
 * @returns A function that redacts attributes synchronously
 */
export function createSyncRedactor(
  policy: TelemetryRedactionPolicy = {},
): (attributes: TelemetryAttributes) => TelemetryAttributes {
  const {
    denylistKeys = DEFAULT_REDACTION_POLICY.denylistKeys,
    hashKeys = DEFAULT_REDACTION_POLICY.hashKeys,
    maxStringLength = DEFAULT_REDACTION_POLICY.maxStringLength,
  } = policy

  return (attributes: TelemetryAttributes): TelemetryAttributes => {
    const result: TelemetryAttributes = {}

    for (const [key, value] of Object.entries(attributes)) {
      // Skip denylisted keys
      if (keyMatchesPatterns(key, denylistKeys)) {
        continue
      }

      // Handle null values
      if (value === null) {
        result[key] = null
        continue
      }

      // Hash if needed
      if (keyMatchesPatterns(key, hashKeys) && typeof value === 'string') {
        result[key] = hashValueSync(value)
        continue
      }

      // Truncate long strings
      if (typeof value === 'string') {
        result[key] = truncateString(value, maxStringLength)
        continue
      }

      // Pass through other values
      result[key] = value
    }

    return result
  }
}

/**
 * Applies redaction to a telemetry envelope.
 *
 * @param envelope - The envelope to redact
 * @param policy - The redaction policy
 * @returns A promise resolving to the redacted envelope
 */
export async function redactEnvelope(
  envelope: TelemetryEnvelope,
  policy: TelemetryRedactionPolicy = {},
): Promise<TelemetryEnvelope> {
  if (!envelope.attributes) {
    return envelope
  }

  const redactor = createRedactor(policy)
  const redactedAttributes = await redactor(envelope.attributes)

  return {
    ...envelope,
    attributes: redactedAttributes,
  }
}
