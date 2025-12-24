/**
 * @fileoverview Tests for IgniterTelemetryEvents builder
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { IgniterTelemetryEventsGroup } from './event-registry-group.builder'

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
