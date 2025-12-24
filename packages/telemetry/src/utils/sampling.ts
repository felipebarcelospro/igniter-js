/**
 * @fileoverview Sampling utilities for @igniter-js/telemetry
 * @module @igniter-js/telemetry/utils/sampling
 *
 * @description
 * Provides utilities for sampling telemetry events based on level and patterns.
 * Sampling helps reduce telemetry volume while maintaining visibility.
 */

import type { IgniterTelemetryLevel } from '../types/levels'
import type { IgniterTelemetrySamplingPolicy } from '../types/policies'
import { IGNITER_TELEMETRY_DEFAULT_SAMPLING_POLICY } from '../types/policies'

/**
 * Static utility class for telemetry event sampling.
 *
 * @example
 * ```typescript
 * // Check if pattern matches
 * IgniterTelemetrySampling.matchesPattern('*.failed', 'job.failed') // true
 *
 * // Check if event should be sampled
 * IgniterTelemetrySampling.shouldSample(policy, 'user.login', 'info')
 *
 * // Create a sampler function
 * const sampler = IgniterTelemetrySampling.createSampler(policy)
 * ```
 */
export class IgniterTelemetrySampling {
  /**
   * Checks if a pattern matches an event name.
   *
   * Supports:
   * - Exact match: 'user.login' matches 'user.login'
   * - Wildcard prefix: '*.failed' matches 'job.failed', 'task.failed'
   * - Wildcard suffix: 'security.*' matches 'security.login', 'security.logout'
   * - Full wildcard: '*' matches everything
   *
   * @param pattern - The pattern to match
   * @param eventName - The event name to check
   * @returns True if the pattern matches the event name
   *
   * @example
   * ```typescript
   * IgniterTelemetrySampling.matchesPattern('*.failed', 'job.failed') // true
   * IgniterTelemetrySampling.matchesPattern('security.*', 'security.login') // true
   * IgniterTelemetrySampling.matchesPattern('user.login', 'user.login') // true
   * IgniterTelemetrySampling.matchesPattern('*.failed', 'job.completed') // false
   * ```
   */
  static matchesPattern(pattern: string, eventName: string): boolean {
    // Full wildcard matches everything
    if (pattern === '*') {
      return true
    }

    // Exact match
    if (pattern === eventName) {
      return true
    }

    // Wildcard prefix: *.failed
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(2)
      return eventName.endsWith(`.${suffix}`) || eventName === suffix
    }

    // Wildcard suffix: security.*
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2)
      return eventName.startsWith(`${prefix}.`) || eventName === prefix
    }

    // Wildcard in middle: job.*.completed
    if (pattern.includes('.*')) {
      const parts = pattern.split('.*')
      if (parts.length === 2) {
        const [prefix, suffix] = parts
        return eventName.startsWith(`${prefix}.`) && eventName.endsWith(`.${suffix}`)
      }
    }

    return false
  }

  /**
   * Checks if any pattern in a list matches the event name.
   *
   * @param patterns - The patterns to check
   * @param eventName - The event name to check
   * @returns True if any pattern matches
   */
  private static matchesAnyPattern(patterns: string[], eventName: string): boolean {
    return patterns.some((pattern) => this.matchesPattern(pattern, eventName))
  }

  /**
   * Gets the sampling rate for a given level.
   *
   * @param policy - The sampling policy
   * @param level - The telemetry level
   * @returns The sampling rate (0.0 to 1.0)
   */
  private static getSamplingRate(policy: Required<IgniterTelemetrySamplingPolicy>, level: IgniterTelemetryLevel): number {
    switch (level) {
      case 'debug':
        return policy.debugRate
      case 'info':
        return policy.infoRate
      case 'warn':
        return policy.warnRate
      case 'error':
        return policy.errorRate
      default:
        return 1.0
    }
  }

  /**
   * Determines if an event should be sampled (included in telemetry output).
   *
   * Sampling logic:
   * 1. Check 'never' patterns - if matched, always drop
   * 2. Check 'always' patterns - if matched, always include
   * 3. Apply level-based rate sampling
   *
   * @param policy - The sampling policy
   * @param eventName - The event name
   * @param level - The telemetry level
   * @returns True if the event should be sampled
   *
   * @example
   * ```typescript
   * const policy = {
   *   debugRate: 0.01,
   *   infoRate: 0.1,
   *   warnRate: 1.0,
   *   errorRate: 1.0,
   *   always: ['*.failed'],
   *   never: ['health.check'],
   * }
   *
   * IgniterTelemetrySampling.shouldSample(policy, 'health.check', 'info') // false (never pattern)
   * IgniterTelemetrySampling.shouldSample(policy, 'job.failed', 'info') // true (always pattern)
   * IgniterTelemetrySampling.shouldSample(policy, 'user.login', 'error') // true (100% rate)
   * IgniterTelemetrySampling.shouldSample(policy, 'user.login', 'debug') // ~1% chance
   * ```
   */
  static shouldSample(
    policy: IgniterTelemetrySamplingPolicy = {},
    eventName: string,
    level: IgniterTelemetryLevel,
  ): boolean {
    const fullPolicy: Required<IgniterTelemetrySamplingPolicy> = {
      ...IGNITER_TELEMETRY_DEFAULT_SAMPLING_POLICY,
      ...policy,
    }

    // Never patterns take precedence
    if (this.matchesAnyPattern(fullPolicy.never, eventName)) {
      return false
    }

    // Always patterns bypass rate limiting
    if (this.matchesAnyPattern(fullPolicy.always, eventName)) {
      return true
    }

    // Apply rate-based sampling
    const rate = this.getSamplingRate(fullPolicy, level)

    // Rate of 1.0 always samples
    if (rate >= 1.0) {
      return true
    }

    // Rate of 0.0 never samples
    if (rate <= 0.0) {
      return false
    }

    // Random sampling
    return Math.random() < rate
  }

  /**
   * Creates a sampler function based on the provided policy.
   *
   * @param policy - The sampling policy
   * @returns A function that determines if an event should be sampled
   *
   * @example
   * ```typescript
   * const sampler = IgniterTelemetrySampling.createSampler({
   *   debugRate: 0.01,
   *   infoRate: 0.1,
   *   always: ['*.error'],
   * })
   *
   * if (sampler('user.login', 'info')) {
   *   // Event should be included
   * }
   * ```
   */
  static createSampler(
    policy: IgniterTelemetrySamplingPolicy = {},
  ): (eventName: string, level: IgniterTelemetryLevel) => boolean {
    return (eventName: string, level: IgniterTelemetryLevel) => this.shouldSample(policy, eventName, level)
  }
}
