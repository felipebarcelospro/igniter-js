/**
 * @fileoverview Tests for IgniterTelemetry and IgniterTelemetryManager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import { IgniterTelemetryManager } from './manager'
import { IgniterTelemetryBuilder } from '../builders/main.builder'
import { IgniterTelemetryEvents } from '../builders/event-registry.builder'
import type { IgniterTelemetryTransportAdapter } from '../types/transport'
import type { TelemetryEnvelope } from '../types/envelope'

describe('IgniterTelemetryManager', () => {
  let runtime: IgniterTelemetryManager<any>
  let mockTransport: IgniterTelemetryTransportAdapter
  let handledEnvelopes: TelemetryEnvelope[]

  beforeEach(() => {
    handledEnvelopes = []
    mockTransport = {
      type: 'logger',
      init: vi.fn(),
      handle: vi.fn((envelope: TelemetryEnvelope) => {
        handledEnvelopes.push(envelope)
      }),
      flush: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
    }

    const events = IgniterTelemetryEvents
      .namespace('app')
      .event('user.login', z.object({ 'ctx.user.id': z.string() }))
      .event('user.logout', z.object({ 'ctx.user.id': z.string() }))
      .build()

    runtime = IgniterTelemetryBuilder.create()
      .withService('test-service')
      .withEnvironment('test')
      .addEvents(events)
      .addTransport('logger', mockTransport)
      .withSampling({
        debugRate: 1.0,
        infoRate: 1.0,
        warnRate: 1.0,
        errorRate: 1.0,
      })
      .build() as IgniterTelemetryManager<any>
  })

  afterEach(async () => {
    if (runtime) {
      await runtime.shutdown()
    }
  })

  describe('emit()', () => {
    it('should emit event directly without session', async () => {
      ;(runtime as any).emit('app:user.login', {
        level: 'info',
        attributes: { 'ctx.user.id': 'user_123' },
      })

      // Wait for async transport handling
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockTransport.handle).toHaveBeenCalled()
      expect(handledEnvelopes).toHaveLength(1)
      expect(handledEnvelopes[0].name).toBe('app:user.login')
    })

    it('should include service metadata in envelope', async () => {
      ;(runtime as any).emit('app:user.login', {
        level: 'info',
        attributes: { 'ctx.user.id': 'user_123' },
      })

      // Wait for async transport handling
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(handledEnvelopes[0].service).toBe('test-service')
      expect(handledEnvelopes[0].environment).toBe('test')
    })

    it('should include timestamp in envelope', async () => {
      ;(runtime as any).emit('app:user.login', {
        level: 'info',
        attributes: { 'ctx.user.id': 'user_123' },
      })

      // Wait for async transport handling
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(handledEnvelopes[0].time).toBeDefined()
      expect(typeof handledEnvelopes[0].time).toBe('string')
    })
  })

  describe('session()', () => {
    it('should create a session', () => {
      const session = runtime.session()
      expect(session).toBeDefined()
      expect(typeof session.actor).toBe('function')
      expect(typeof session.scope).toBe('function')
      expect(typeof session.emit).toBe('function')
      expect(typeof session.end).toBe('function')
    })

    it('should emit with session context', async () => {
      const session = runtime.session()
        .actor('user', 'usr_456')

      session.emit('app:user.login', {
        level: 'info',
        attributes: { 'ctx.user.id': 'user_123' },
      })

      // Wait for async transport handling
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(handledEnvelopes).toHaveLength(1)
      expect(handledEnvelopes[0].actor?.type).toBe('user')
      expect(handledEnvelopes[0].actor?.id).toBe('usr_456')
    })

    it('should emit with scope context', async () => {
      const session = runtime.session()
        .scope('organization', 'org_789')

      session.emit('app:user.login', {
        level: 'info',
        attributes: { 'ctx.user.id': 'user_123' },
      })

      // Wait for async transport handling
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(handledEnvelopes[0].scope?.type).toBe('organization')
      expect(handledEnvelopes[0].scope?.id).toBe('org_789')
    })

    it('should merge session attributes with emit attributes', async () => {
      const session = runtime.session()
        .attributes({ 'ctx.feature': 'checkout' })

      session.emit('app:user.login', {
        level: 'info',
        attributes: { 'ctx.user.id': 'user_123' },
      })

      // Wait for async transport handling
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(handledEnvelopes[0].attributes?.['ctx.feature']).toBe('checkout')
      expect(handledEnvelopes[0].attributes?.['ctx.user.id']).toBe('user_123')
    })
  })

  describe('flush()', () => {
    it('should call flush on all transports', async () => {
      await runtime.flush()
      expect(mockTransport.flush).toHaveBeenCalled()
    })
  })

  describe('shutdown()', () => {
    it('should call shutdown on all transports', async () => {
      await runtime.shutdown()
      expect(mockTransport.shutdown).toHaveBeenCalled()
    })
  })
})
