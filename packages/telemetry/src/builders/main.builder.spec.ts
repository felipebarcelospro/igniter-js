/**
 * @fileoverview Tests for IgniterTelemetryBuilder
 */

import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { IgniterTelemetryBuilder } from './main.builder'
import { IgniterTelemetryError } from '../errors/telemetry.error'
import { IgniterTelemetryEvents } from './event-registry.builder'
import type { IgniterTelemetryTransportAdapter } from '../types/transport'

describe('IgniterTelemetryBuilder', () => {
  // Mock transport for testing
  const createMockTransport = (type: string): IgniterTelemetryTransportAdapter => ({
    type: type as any,
    init: vi.fn(),
    handle: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
  })

  describe('create()', () => {
    it('should create a builder instance', () => {
      const builder = IgniterTelemetryBuilder.create()
      expect(builder).toBeInstanceOf(IgniterTelemetryBuilder)
    })
  })

  describe('withService()', () => {
    it('should set the service name', () => {
      const builder = IgniterTelemetryBuilder.create().withService('my-api')
      const runtime = builder
        .withEnvironment('test')
        .addTransport('logger', createMockTransport('logger'))
        .build()

      expect(runtime).toBeDefined()
    })

    it('should be immutable (return new builder)', () => {
      const builder1 = IgniterTelemetryBuilder.create()
      const builder2 = builder1.withService('my-api')

      expect(builder1).not.toBe(builder2)
    })
  })

  describe('withEnvironment()', () => {
    it('should set the environment', () => {
      const builder = IgniterTelemetryBuilder.create()
        .withService('my-api')
        .withEnvironment('production')
        .addTransport('logger', createMockTransport('logger'))

      expect(builder.build()).toBeDefined()
    })
  })

  describe('withVersion()', () => {
    it('should set the version', () => {
      const builder = IgniterTelemetryBuilder.create()
        .withService('my-api')
        .withEnvironment('test')
        .withVersion('1.0.0')
        .addTransport('logger', createMockTransport('logger'))

      expect(builder.build()).toBeDefined()
    })
  })

  describe('addActor()', () => {
    it('should add an actor configuration', () => {
      const builder = IgniterTelemetryBuilder.create()
        .withService('my-api')
        .withEnvironment('test')
        .addActor('user', { description: 'User actor' })
        .addTransport('logger', createMockTransport('logger'))

      expect(builder.build()).toBeDefined()
    })

    it('should throw on duplicate actor', () => {
      expect(() =>
        IgniterTelemetryBuilder.create()
          .addActor('user', { description: 'First' })
          .addActor('user', { description: 'Second' })
      ).toThrow(IgniterTelemetryError)
    })

    it('should be immutable', () => {
      const builder1 = IgniterTelemetryBuilder.create()
      const builder2 = builder1.addActor('user')

      expect(builder1).not.toBe(builder2)
    })
  })

  describe('addScope()', () => {
    it('should add a scope configuration', () => {
      const builder = IgniterTelemetryBuilder.create()
        .withService('my-api')
        .withEnvironment('test')
        .addScope('request', { description: 'Request scope' })
        .addTransport('logger', createMockTransport('logger'))

      expect(builder.build()).toBeDefined()
    })

    it('should throw on duplicate scope', () => {
      expect(() =>
        IgniterTelemetryBuilder.create()
          .addScope('request', { description: 'First' })
          .addScope('request', { description: 'Second' })
      ).toThrow(IgniterTelemetryError)
    })
  })

  describe('addEvents()', () => {
    it('should add events descriptor', () => {
      const events = IgniterTelemetryEvents
        .namespace('app')
        .event('user.login', z.object({}))
        .build()

      const builder = IgniterTelemetryBuilder.create()
        .withService('my-api')
        .withEnvironment('test')
        .addEvents(events)
        .addTransport('logger', createMockTransport('logger'))

      expect(builder.build()).toBeDefined()
    })

    it('should throw on duplicate namespace', () => {
      const events1 = IgniterTelemetryEvents.namespace('app').build()
      const events2 = IgniterTelemetryEvents.namespace('app').build()

      expect(() =>
        IgniterTelemetryBuilder.create()
          .addEvents(events1)
          .addEvents(events2)
      ).toThrow(IgniterTelemetryError)
    })
  })

  describe('addTransport()', () => {
    it('should add a transport', () => {
      const transport = createMockTransport('logger')
      const builder = IgniterTelemetryBuilder.create()
        .withService('my-api')
        .withEnvironment('test')
        .addTransport('logger', transport)

      expect(builder.build()).toBeDefined()
    })

    it('should throw on duplicate transport key', () => {
      const t1 = createMockTransport('logger')
      const t2 = createMockTransport('logger')

      expect(() =>
        IgniterTelemetryBuilder.create()
          .addTransport('logger', t1)
          .addTransport('logger', t2)
      ).toThrow(IgniterTelemetryError)
    })

    it('should allow different transport keys', () => {
      const builder = IgniterTelemetryBuilder.create()
        .withService('my-api')
        .withEnvironment('test')
        .addTransport('logger', createMockTransport('logger'))
        .addTransport('stream', createMockTransport('stream'))

      expect(builder.build()).toBeDefined()
    })
  })

  describe('withSampling()', () => {
    it('should configure sampling policy', () => {
      const builder = IgniterTelemetryBuilder.create()
        .withService('my-api')
        .withEnvironment('test')
        .withSampling({
          debugRate: 0.1,
          infoRate: 0.5,
          never: ['health.check'],
        })
        .addTransport('logger', createMockTransport('logger'))

      expect(builder.build()).toBeDefined()
    })
  })

  describe('withRedaction()', () => {
    it('should configure redaction policy', () => {
      const builder = IgniterTelemetryBuilder.create()
        .withService('my-api')
        .withEnvironment('test')
        .withRedaction({
          denylistKeys: ['password', 'secret'],
          hashKeys: ['email'],
        })
        .addTransport('logger', createMockTransport('logger'))

      expect(builder.build()).toBeDefined()
    })
  })

  describe('withValidation()', () => {
    it('should enable/disable validation', () => {
      const builder = IgniterTelemetryBuilder.create()
        .withService('my-api')
        .withEnvironment('test')
        .withValidation({ mode: 'always', strict: false })
        .addTransport('logger', createMockTransport('logger'))

      expect(builder.build()).toBeDefined()
    })
  })

  describe('withLogger()', () => {
    it('should set custom logger', () => {
      const customLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      const builder = IgniterTelemetryBuilder.create()
        .withService('my-api')
        .withEnvironment('test')
        .withLogger(customLogger as any)
        .addTransport('logger', createMockTransport('logger'))

      expect(builder.build()).toBeDefined()
    })
  })

  describe('build()', () => {
    it('should use development as default environment', () => {
      const runtime = IgniterTelemetryBuilder.create()
        .withService('my-api')
        .addTransport('logger', createMockTransport('logger'))
        .build()

      expect(runtime).toBeDefined()
      expect(runtime.environment).toBe('development')
    })

    it('should build with no transports', () => {
      const runtime = IgniterTelemetryBuilder.create()
        .withService('my-api')
        .withEnvironment('test')
        .build()

      expect(runtime).toBeDefined()
    })

    it('should build successfully with valid config', () => {
      const runtime = IgniterTelemetryBuilder.create()
        .withService('my-api')
        .withEnvironment('test')
        .addTransport('logger', createMockTransport('logger'))
        .build()

      expect(runtime).toBeDefined()
      expect(typeof runtime.emit).toBe('function')
      expect(typeof runtime.session).toBe('function')
      expect(typeof runtime.flush).toBe('function')
      expect(typeof runtime.shutdown).toBe('function')
    })
  })
})
