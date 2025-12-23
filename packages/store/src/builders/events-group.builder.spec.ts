/**
 * @fileoverview Tests for IgniterStoreEventsGroup
 */

import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { IgniterStoreEventsGroup } from './events-group.builder'
import { IgniterStoreError } from '../errors/store.error'

describe('IgniterStoreEventsGroup', () => {
  it('adds events to the group', () => {
    const group = IgniterStoreEventsGroup.create()
      .event('created', z.object({ id: z.string() }))
      .event('updated', z.object({ id: z.string() }))
      .build()

    expect(group).toHaveProperty('created')
    expect(group).toHaveProperty('updated')
  })

  it('throws on invalid event name', () => {
    expect(() => {
      IgniterStoreEventsGroup.create().event('invalid.name', z.object({ id: z.string() }))
    }).toThrow(IgniterStoreError)
  })
})
