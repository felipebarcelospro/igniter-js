/**
 * @fileoverview Tests for IgniterTelemetryEvents builder
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { IgniterTelemetryError } from '../errors/telemetry.error'
import { IgniterTelemetryEvents } from './event-registry.builder'

describe('IgniterTelemetryEvents', () => {
  describe('namespace()', () => {
    it('should create a builder with a namespace', () => {
      const builder = IgniterTelemetryEvents.namespace('igniter.jobs')
      expect(builder).toBeDefined()
    })

    it('should throw for empty namespace', () => {
      expect(() => IgniterTelemetryEvents.namespace('')).toThrow(IgniterTelemetryError)
    })

    it('should throw for namespace with spaces', () => {
      expect(() => IgniterTelemetryEvents.namespace('my namespace')).toThrow(IgniterTelemetryError)
    })

    it('should throw for namespace with colons', () => {
      expect(() => IgniterTelemetryEvents.namespace('my:namespace')).toThrow(IgniterTelemetryError)
    })
  })

  describe('event()', () => {
    it('should add a flat event', () => {
      const schema = z.object({ 'ctx.user.id': z.string() })
      const descriptor = IgniterTelemetryEvents
        .namespace('app')
        .event('user.login', schema)
        .build()

      expect(descriptor.namespace).toBe('app')
      expect(descriptor.events['user.login']).toBe(schema)
    })

    it('should add multiple events', () => {
      const schema1 = z.object({ id: z.string() })
      const schema2 = z.object({ count: z.number() })

      const descriptor = IgniterTelemetryEvents
        .namespace('app')
        .event('event1', schema1)
        .event('event2', schema2)
        .build()

      expect(descriptor.events['event1']).toBe(schema1)
      expect(descriptor.events['event2']).toBe(schema2)
    })

    it('should throw for event name with colons', () => {
      expect(() =>
        IgniterTelemetryEvents
          .namespace('app')
          .event('user:login', z.object({}))
      ).toThrow(IgniterTelemetryError)
    })

    it('should throw for event name with spaces', () => {
      expect(() =>
        IgniterTelemetryEvents
          .namespace('app')
          .event('user login', z.object({}))
      ).toThrow(IgniterTelemetryError)
    })
  })

  describe('group()', () => {
    it('should add a group of events', () => {
      const descriptor = IgniterTelemetryEvents
        .namespace('igniter.jobs')
        .group('job', (g) =>
          g.event('start', z.object({ 'ctx.job.id': z.string() }))
           .event('completed', z.object({ 'ctx.job.id': z.string() }))
        )
        .build()

      expect(descriptor.namespace).toBe('igniter.jobs')
      expect(descriptor.events.job).toBeDefined()
      expect((descriptor.events.job as any).start).toBeDefined()
      expect((descriptor.events.job as any).completed).toBeDefined()
    })

    it('should support mixed flat events and groups', () => {
      const descriptor = IgniterTelemetryEvents
        .namespace('igniter.jobs')
        .event('worker.started', z.object({ 'ctx.worker.id': z.string() }))
        .group('job', (g) =>
          g.event('completed', z.object({ 'ctx.job.id': z.string() }))
        )
        .build()

      expect(descriptor.events['worker.started']).toBeDefined()
      expect(descriptor.events.job).toBeDefined()
    })
  })

  describe('build()', () => {
    it('should return a descriptor with namespace and events', () => {
      const descriptor = IgniterTelemetryEvents
        .namespace('app')
        .event('test', z.object({}))
        .build()

      expect(descriptor).toHaveProperty('namespace')
      expect(descriptor).toHaveProperty('events')
      expect(descriptor.namespace).toBe('app')
    })
  })

  describe('get.key() and get.schema()', () => {
    it('should retrieve full event key and schema', () => {
      const builder = IgniterTelemetryEvents
        .namespace('app')
        .event('user.login', z.object({ 'ctx.user.id': z.string() }))

      const registry = builder.build()

      const fullKey = registry.get.key('user.login')
      expect(fullKey).toBe('app.user.login')

      const schema = registry.get.schema('user.login')
      expect(schema).toBeInstanceOf(z.ZodObject)
    })

    it('should throw when retrieving undefined event key', () => {
      const builder = IgniterTelemetryEvents
        .namespace('app')
        .event('user.login', z.object({ 'ctx.user.id': z.string() }))
        .build()

      // @ts-expect-error Testing error case
      expect(() => builder.get.key('non.existent')).toThrow(Error)

      // @ts-expect-error Testing error case
      expect(() => builder.get.schema('non.existent')).toThrow(Error) 
    })

    it('should work with nested group events', () => {
      const builder = IgniterTelemetryEvents
        .namespace('igniter.jobs')
        .group('job', (g) =>
          g.event('completed', z.object({ 'ctx.job.id': z.string() }))
           .event('failed', z.object({ 'ctx.job.id': z.string(), 'ctx.error.message': z.string() }))
        )
        .build()

      const fullKey = builder.get.key('job.completed')
      expect(fullKey).toBe('igniter.jobs.job.completed')

      const schema = builder.get.schema('job.failed')
      expect(schema.shape).toHaveProperty('ctx.job.id')
      expect(schema.shape).toHaveProperty('ctx.error.message')
    })
  })
})
