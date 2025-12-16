/**
 * @fileoverview Tests for IgniterTelemetryEvents builder
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { IgniterTelemetryEvents, IgniterTelemetryEventsGroup } from './events'
import { IgniterTelemetryError } from '../errors/igniter-telemetry.error'

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
})

describe('IgniterTelemetryEventsGroup', () => {
  describe('create()', () => {
    it('should create an empty group', () => {
      const group = IgniterTelemetryEventsGroup.create()
      expect(group.build()).toEqual({})
    })
  })

  describe('event()', () => {
    it('should add events to the group', () => {
      const schema = z.object({ id: z.string() })
      const group = IgniterTelemetryEventsGroup.create()
        .event('test', schema)
        .build()

      expect(group.test).toBe(schema)
    })

    it('should chain multiple events', () => {
      const events = IgniterTelemetryEventsGroup.create()
        .event('a', z.object({}))
        .event('b', z.object({}))
        .event('c', z.object({}))
        .build()

      expect(events.a).toBeDefined()
      expect(events.b).toBeDefined()
      expect(events.c).toBeDefined()
    })
  })
})
