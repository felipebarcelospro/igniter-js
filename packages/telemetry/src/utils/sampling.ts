/**
 * @fileoverview Sampling utilities for @igniter-js/telemetry
 * @module @igniter-js/telemetry/utils/sampling
 *
 * @description
 * Provides utilities for sampling telemetry events based on level and patterns.
 * Sampling helps reduce telemetry volume while maintaining visibility.
 */

import type { TelemetryLevel } from '../types/levels'
import type { TelemetrySamplingPolicy } from '../types/policies'
import { DEFAULT_SAMPLING_POLICY } from '../types/policies'

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
 * matchesPattern('*.failed', 'job.failed') // true
 * matchesPattern('security.*', 'security.login') // true
 * matchesPattern('user.login', 'user.login') // true
 * matchesPattern('*.failed', 'job.completed') // false
 * ```
 */
export function matchesPattern(pattern: string, eventName: string): boolean {
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
function matchesAnyPattern(patterns: string[], eventName: string): boolean {
  return patterns.some((pattern) => matchesPattern(pattern, eventName))
}

/**
 * Gets the sampling rate for a given level.
 *
 * @param policy - The sampling policy
 * @param level - The telemetry level
 * @returns The sampling rate (0.0 to 1.0)
 */
function getSamplingRate(policy: Required<TelemetrySamplingPolicy>, level: TelemetryLevel): number {
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
 * shouldSample(policy, 'health.check', 'info') // false (never pattern)
 * shouldSample(policy, 'job.failed', 'info') // true (always pattern)
 * shouldSample(policy, 'user.login', 'error') // true (100% rate)
 * shouldSample(policy, 'user.login', 'debug') // ~1% chance
 * ```
 */
export function shouldSample(
  policy: TelemetrySamplingPolicy = {},
  eventName: string,
  level: TelemetryLevel,
): boolean {
  const fullPolicy: Required<TelemetrySamplingPolicy> = {
    ...DEFAULT_SAMPLING_POLICY,
    ...policy,
  }

  // Never patterns take precedence
  if (matchesAnyPattern(fullPolicy.never, eventName)) {
    return false
  }

  // Always patterns bypass rate limiting
  if (matchesAnyPattern(fullPolicy.always, eventName)) {
    return true
  }

  // Apply rate-based sampling
  const rate = getSamplingRate(fullPolicy, level)

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
 * const sampler = createSampler({
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
export function createSampler(
  policy: TelemetrySamplingPolicy = {},
): (eventName: string, level: TelemetryLevel) => boolean {
  return (eventName: string, level: TelemetryLevel) => shouldSample(policy, eventName, level)
}
