/**
 * @fileoverview Redaction utilities for @igniter-js/telemetry
 * @module @igniter-js/telemetry/utils/redaction
 *
 * @description
 * Provides utilities for redacting sensitive data from telemetry events.
 * Supports denylisting keys, hashing values, and truncating long strings.
 */

import type { IgniterTelemetryAttributes, IgniterTelemetryEnvelope } from '../types/envelope'
import type { IgniterTelemetryRedactionPolicy } from '../types/policies'
import { IGNITER_TELEMETRY_DEFAULT_REDACTION_POLICY } from '../types/policies'

/**
 * Static utility class for redacting sensitive telemetry data.
 *
 * @example
 * ```typescript
 * // Create async redactor
 * const redact = IgniterTelemetryRedaction.createRedactor({ denylistKeys: ['password'] })
 * const redacted = await redact({ password: 'secret', email: 'test@test.com' })
 *
 * // Create sync redactor
 * const redactSync = IgniterTelemetryRedaction.createSyncRedactor({ hashKeys: ['email'] })
 * const redactedSync = redactSync({ email: 'test@test.com' })
 *
 * // Redact envelope
 * const envelope = await IgniterTelemetryRedaction.redactEnvelope(envelope, policy)
 * ```
 */
export class IgniterTelemetryRedaction {
  /**
   * Simple hash function using Web Crypto API.
   * Returns a truncated SHA-256 hash as hex string.
   *
   * @param value - The value to hash
   * @returns A promise resolving to the hash string
   */
  private static async hashValueAsync(value: string): Promise<string> {
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
  private static hashValueSync(value: string): string {
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
   */
  private static truncateString(value: string, maxLength: number): string {
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
  private static keyMatchesPatterns(key: string, patterns: string[]): boolean {
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
   * const redact = IgniterTelemetryRedaction.createRedactor({
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
  static createRedactor(
    policy: IgniterTelemetryRedactionPolicy = {},
  ): (attributes: IgniterTelemetryAttributes) => Promise<IgniterTelemetryAttributes> {
    const {
      denylistKeys = IGNITER_TELEMETRY_DEFAULT_REDACTION_POLICY.denylistKeys,
      hashKeys = IGNITER_TELEMETRY_DEFAULT_REDACTION_POLICY.hashKeys,
      maxStringLength = IGNITER_TELEMETRY_DEFAULT_REDACTION_POLICY.maxStringLength,
    } = policy

    return async (attributes: IgniterTelemetryAttributes): Promise<IgniterTelemetryAttributes> => {
      const result: IgniterTelemetryAttributes = {}

      for (const [key, value] of Object.entries(attributes)) {
        // Skip denylisted keys
        if (this.keyMatchesPatterns(key, denylistKeys)) {
          continue
        }

        // Handle null values
        if (value === null) {
          result[key] = null
          continue
        }

        // Hash if needed
        if (this.keyMatchesPatterns(key, hashKeys) && typeof value === 'string') {
          try {
            result[key] = await this.hashValueAsync(value)
          } catch {
            result[key] = this.hashValueSync(value)
          }
          continue
        }

        // Truncate long strings
        if (typeof value === 'string') {
          result[key] = this.truncateString(value, maxStringLength)
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
  static createSyncRedactor(
    policy: IgniterTelemetryRedactionPolicy = {},
  ): (attributes: IgniterTelemetryAttributes) => IgniterTelemetryAttributes {
    const {
      denylistKeys = IGNITER_TELEMETRY_DEFAULT_REDACTION_POLICY.denylistKeys,
      hashKeys = IGNITER_TELEMETRY_DEFAULT_REDACTION_POLICY.hashKeys,
      maxStringLength = IGNITER_TELEMETRY_DEFAULT_REDACTION_POLICY.maxStringLength,
    } = policy

    return (attributes: IgniterTelemetryAttributes): IgniterTelemetryAttributes => {
      const result: IgniterTelemetryAttributes = {}

      for (const [key, value] of Object.entries(attributes)) {
        // Skip denylisted keys
        if (this.keyMatchesPatterns(key, denylistKeys)) {
          continue
        }

        // Handle null values
        if (value === null) {
          result[key] = null
          continue
        }

        // Hash if needed
        if (this.keyMatchesPatterns(key, hashKeys) && typeof value === 'string') {
          result[key] = this.hashValueSync(value)
          continue
        }

        // Truncate long strings
        if (typeof value === 'string') {
          result[key] = this.truncateString(value, maxStringLength)
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
  static async redactEnvelope(
    envelope: IgniterTelemetryEnvelope,
    policy: IgniterTelemetryRedactionPolicy = {},
  ): Promise<IgniterTelemetryEnvelope> {
    if (!envelope.attributes) {
      return envelope
    }

    const redactor = this.createRedactor(policy)
    const redactedAttributes = await redactor(envelope.attributes)

    return {
      ...envelope,
      attributes: redactedAttributes,
    }
  }
}
