/**
 * @fileoverview Tests for IgniterStoreEventValidator
 */

import { describe, expect, it } from 'vitest'
import { IgniterStoreEventValidator } from './events'
import { IgniterStoreError } from '../errors/store.error'

describe('IgniterStoreEventValidator', () => {
  it('accepts valid namespace', () => {
    expect(() => IgniterStoreEventValidator.ensureValidNamespace('user')).not.toThrow()
  })

  it('rejects namespaces with dots', () => {
    expect(() => IgniterStoreEventValidator.ensureValidNamespace('user.profile')).toThrow(
      IgniterStoreError,
    )
  })

  it('rejects namespaces with colons', () => {
    expect(() => IgniterStoreEventValidator.ensureValidNamespace('user:created')).toThrow(
      IgniterStoreError,
    )
  })

  it('rejects reserved namespaces', () => {
    expect(() => IgniterStoreEventValidator.ensureValidNamespace('igniter')).toThrow(
      IgniterStoreError,
    )
  })

  it('rejects invalid event names', () => {
    expect(() => IgniterStoreEventValidator.ensureValidName('invalid.name', 'Event')).toThrow(
      IgniterStoreError,
    )
  })
})
