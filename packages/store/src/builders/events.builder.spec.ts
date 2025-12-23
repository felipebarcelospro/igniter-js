/**
 * @fileoverview Tests for IgniterStoreEvents
 */

import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { IgniterStoreEvents } from './events.builder'
import { IgniterStoreError } from '../errors/store.error'

describe('IgniterStoreEvents', () => {
  it('creates an events map with namespace', () => {
    const events = IgniterStoreEvents.create('user')
      .event('created', z.object({ id: z.string() }))
      .build()

    expect(events.namespace).toBe('user')
    expect(events.events).toHaveProperty('created')
  })

  it('adds nested groups', () => {
    const events = IgniterStoreEvents.create('user')
      .group('notifications', (group) =>
        group.event('email', z.object({ to: z.string() })),
      )
      .build()

    expect(events.events).toHaveProperty('notifications')
    expect((events.events as any).notifications).toHaveProperty('email')
  })

  it('throws on duplicate event name', () => {
    expect(() => {
      IgniterStoreEvents.create('user')
        .event('created', z.object({ id: z.string() }))
        .event('created', z.object({ id: z.string() }))
    }).toThrow(IgniterStoreError)
  })

  it('throws on reserved namespace', () => {
    expect(() => {
      IgniterStoreEvents.create('igniter').event('created', z.object({ id: z.string() }))
    }).toThrow(IgniterStoreError)
  })
})
