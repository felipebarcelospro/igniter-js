/**
 * @fileoverview Tests for IgniterStoreKeyBuilder
 */

import { describe, it, expect } from 'vitest'
import { IgniterStoreKeyBuilder } from './store-key.builder'

describe('IgniterStoreKeyBuilder', () => {
  const defaultOptions = {
    service: 'my-api',
    scopeChain: [],
  }

  describe('build()', () => {
    it('should build key with correct namespace', () => {
      const builder = new IgniterStoreKeyBuilder(defaultOptions)

      expect(builder.build('kv', 'user:123')).toBe(
        'igniter:store:my-api:kv:user:123',
      )
      expect(builder.build('counter', 'page-views')).toBe(
        'igniter:store:my-api:counter:page-views',
      )
      expect(builder.build('claim', 'lock:process')).toBe(
        'igniter:store:my-api:claim:lock:process',
      )
      expect(builder.build('events', 'user:created')).toBe(
        'igniter:store:my-api:events:user:created',
      )
      expect(builder.build('streams', 'events')).toBe(
        'igniter:store:my-api:streams:events',
      )
    })

    it('should include scope chain in key', () => {
      const builder = new IgniterStoreKeyBuilder({
        ...defaultOptions,
        scopeChain: [
          { key: 'organization', identifier: 'org_123' },
        ],
      })

      expect(builder.build('kv', 'settings')).toBe(
        'igniter:store:my-api:organization:org_123:kv:settings',
      )
    })

    it('should include multiple scopes in key', () => {
      const builder = new IgniterStoreKeyBuilder({
        ...defaultOptions,
        scopeChain: [
          { key: 'organization', identifier: 'org_123' },
          { key: 'workspace', identifier: 'ws_456' },
        ],
      })

      expect(builder.build('kv', 'config')).toBe(
        'igniter:store:my-api:organization:org_123:workspace:ws_456:kv:config',
      )
    })
  })

  describe('pattern()', () => {
    it('should build pattern with wildcard', () => {
      const builder = new IgniterStoreKeyBuilder(defaultOptions)

      expect(builder.pattern('kv', 'user:*')).toBe(
        'igniter:store:my-api:kv:user:*',
      )
    })

    it('should include scope in pattern', () => {
      const builder = new IgniterStoreKeyBuilder({
        ...defaultOptions,
        scopeChain: [{ key: 'org', identifier: '123' }],
      })

      expect(builder.pattern('kv', '*')).toBe(
        'igniter:store:my-api:org:123:kv:*',
      )
    })
  })

  describe('withScope()', () => {
    it('should create new builder with added scope', () => {
      const builder = new IgniterStoreKeyBuilder(defaultOptions)
      const scopedBuilder = builder.withScope('organization', 'org_123')

      // Original should be unchanged
      expect(builder.build('kv', 'test')).toBe(
        'igniter:store:my-api:kv:test',
      )

      // New builder should have scope
      expect(scopedBuilder.build('kv', 'test')).toBe(
        'igniter:store:my-api:organization:org_123:kv:test',
      )
    })

    it('should chain multiple scopes', () => {
      const builder = new IgniterStoreKeyBuilder(defaultOptions)
      const scopedBuilder = builder
        .withScope('organization', 'org_123')
        .withScope('workspace', 'ws_456')

      expect(scopedBuilder.build('kv', 'settings')).toBe(
        'igniter:store:my-api:organization:org_123:workspace:ws_456:kv:settings',
      )
    })

    it('should handle numeric identifiers', () => {
      const builder = new IgniterStoreKeyBuilder(defaultOptions)
      const scopedBuilder = builder.withScope('user', 42)

      expect(scopedBuilder.build('kv', 'profile')).toBe(
        'igniter:store:my-api:user:42:kv:profile',
      )
    })
  })

  describe('getPrefix()', () => {
    it('should return base prefix without namespace', () => {
      const builder = new IgniterStoreKeyBuilder(defaultOptions)
      expect(builder.getPrefix()).toBe('igniter:store:my-api')
    })

    it('should include scopes in prefix', () => {
      const builder = new IgniterStoreKeyBuilder({
        ...defaultOptions,
        scopeChain: [{ key: 'org', identifier: '123' }],
      })
      expect(builder.getPrefix()).toBe('igniter:store:my-api:org:123')
    })
  })

})
