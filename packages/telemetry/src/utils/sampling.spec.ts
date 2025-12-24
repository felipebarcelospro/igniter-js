/**
 * @fileoverview Tests for sampling utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IgniterTelemetrySampling } from './sampling'

describe('IgniterTelemetrySampling', () => {
  describe('matchesPattern()', () => {
    it('should match exact event names', () => {
      expect(IgniterTelemetrySampling.matchesPattern('user.login', 'user.login')).toBe(true)
      expect(IgniterTelemetrySampling.matchesPattern('user.login', 'user.logout')).toBe(false)
    })

    it('should match full wildcard', () => {
      expect(IgniterTelemetrySampling.matchesPattern('*', 'user.login')).toBe(true)
      expect(IgniterTelemetrySampling.matchesPattern('*', 'any.event.name')).toBe(true)
    })

    it('should match wildcard prefix (*.suffix)', () => {
      expect(IgniterTelemetrySampling.matchesPattern('*.failed', 'job.failed')).toBe(true)
      expect(IgniterTelemetrySampling.matchesPattern('*.failed', 'task.failed')).toBe(true)
      expect(IgniterTelemetrySampling.matchesPattern('*.failed', 'job.completed')).toBe(false)
    })

    it('should match wildcard suffix (prefix.*)', () => {
      expect(IgniterTelemetrySampling.matchesPattern('security.*', 'security.login')).toBe(true)
      expect(IgniterTelemetrySampling.matchesPattern('security.*', 'security.logout')).toBe(true)
      expect(IgniterTelemetrySampling.matchesPattern('security.*', 'user.login')).toBe(false)
    })

    it('should match suffix without prefix', () => {
      expect(IgniterTelemetrySampling.matchesPattern('*.failed', 'failed')).toBe(true)
    })

    it('should match prefix without suffix', () => {
      expect(IgniterTelemetrySampling.matchesPattern('security.*', 'security')).toBe(true)
    })
  })

  describe('shouldSample()', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random')
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should never sample events matching never patterns', () => {
      const policy = {
        errorRate: 1.0,
        never: ['health.check'],
      }

      // Even with rate 1.0, never patterns should be dropped
      expect(IgniterTelemetrySampling.shouldSample(policy, 'health.check', 'error')).toBe(false)
    })

    it('should always sample events matching always patterns', () => {
      const policy = {
        debugRate: 0,
        always: ['*.failed'],
      }

      // Even with rate 0, always patterns should be sampled
      expect(IgniterTelemetrySampling.shouldSample(policy, 'job.failed', 'debug')).toBe(true)
    })

    it('should sample error events by default', () => {
      expect(IgniterTelemetrySampling.shouldSample({}, 'any.event', 'error')).toBe(true)
    })

    it('should sample warn events by default', () => {
      expect(IgniterTelemetrySampling.shouldSample({}, 'any.event', 'warn')).toBe(true)
    })

    it('should apply rate-based sampling', () => {
      // Test rate of 0 - should never sample
      const policyZero = { infoRate: 0 }
      expect(IgniterTelemetrySampling.shouldSample(policyZero, 'some.event', 'info')).toBe(false)

      // Test rate of 1 - should always sample
      const policyOne = { infoRate: 1 }
      expect(IgniterTelemetrySampling.shouldSample(policyOne, 'some.event', 'info')).toBe(true)

      // Test rate between 0 and 1 - run multiple times to verify statistical behavior
      const policyHalf = { infoRate: 0.5 }
      let sampled = 0
      const iterations = 100
      for (let i = 0; i < iterations; i++) {
        if (IgniterTelemetrySampling.shouldSample(policyHalf, 'some.event', 'info')) {
          sampled++
        }
      }
      // With 50% rate, we expect roughly half to be sampled (allow wide margin for randomness)
      expect(sampled).toBeGreaterThan(10)
      expect(sampled).toBeLessThan(90)
    })

    it('should respect rate of 0', () => {
      const policy = { debugRate: 0 }
      expect(IgniterTelemetrySampling.shouldSample(policy, 'some.event', 'debug')).toBe(false)
    })

    it('should respect rate of 1', () => {
      const policy = { infoRate: 1 }
      expect(IgniterTelemetrySampling.shouldSample(policy, 'some.event', 'info')).toBe(true)
    })
  })

  describe('createSampler()', () => {
    it('should create a sampler function', () => {
      const sampler = IgniterTelemetrySampling.createSampler({
        errorRate: 1.0,
        never: ['health.check'],
      })

      expect(typeof sampler).toBe('function')
      expect(sampler('any.event', 'error')).toBe(true)
      expect(sampler('health.check', 'error')).toBe(false)
    })
  })
})
