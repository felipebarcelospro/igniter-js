/**
 * @fileoverview Tests for StoreKeyBuilder
 */

import { describe, it, expect } from 'vitest'
import { StoreKeyBuilder } from './key-builder'

describe('StoreKeyBuilder', () => {
  const defaultOptions = {
    keyPrefix: 'ign:store',
    environment: 'production',
    service: 'my-api',
    scopeChain: [],
  }

  describe('build()', () => {
    it('should build key with correct namespace', () => {
      const builder = new StoreKeyBuilder(defaultOptions)

      expect(builder.build('kv', 'user:123')).toBe(
        'ign:store:production:my-api:kv:user:123',
      )
      expect(builder.build('counter', 'page-views')).toBe(
        'ign:store:production:my-api:counter:page-views',
      )
      expect(builder.build('claim', 'lock:process')).toBe(
        'ign:store:production:my-api:claim:lock:process',
      )
      expect(builder.build('events', 'user:created')).toBe(
        'ign:store:production:my-api:events:user:created',
      )
      expect(builder.build('streams', 'events')).toBe(
        'ign:store:production:my-api:streams:events',
      )
    })

    it('should include scope chain in key', () => {
      const builder = new StoreKeyBuilder({
        ...defaultOptions,
        scopeChain: [
          { key: 'organization', identifier: 'org_123' },
        ],
      })

      expect(builder.build('kv', 'settings')).toBe(
        'ign:store:production:my-api:organization:org_123:kv:settings',
      )
    })

    it('should include multiple scopes in key', () => {
      const builder = new StoreKeyBuilder({
        ...defaultOptions,
        scopeChain: [
          { key: 'organization', identifier: 'org_123' },
          { key: 'workspace', identifier: 'ws_456' },
        ],
      })

      expect(builder.build('kv', 'config')).toBe(
        'ign:store:production:my-api:organization:org_123:workspace:ws_456:kv:config',
      )
    })
  })

  describe('pattern()', () => {
    it('should build pattern with wildcard', () => {
      const builder = new StoreKeyBuilder(defaultOptions)

      expect(builder.pattern('kv', 'user:*')).toBe(
        'ign:store:production:my-api:kv:user:*',
      )
    })

    it('should include scope in pattern', () => {
      const builder = new StoreKeyBuilder({
        ...defaultOptions,
        scopeChain: [{ key: 'org', identifier: '123' }],
      })

      expect(builder.pattern('kv', '*')).toBe(
        'ign:store:production:my-api:org:123:kv:*',
      )
    })
  })

  describe('withScope()', () => {
    it('should create new builder with added scope', () => {
      const builder = new StoreKeyBuilder(defaultOptions)
      const scopedBuilder = builder.withScope('organization', 'org_123')

      // Original should be unchanged
      expect(builder.build('kv', 'test')).toBe(
        'ign:store:production:my-api:kv:test',
      )

      // New builder should have scope
      expect(scopedBuilder.build('kv', 'test')).toBe(
        'ign:store:production:my-api:organization:org_123:kv:test',
      )
    })

    it('should chain multiple scopes', () => {
      const builder = new StoreKeyBuilder(defaultOptions)
      const scopedBuilder = builder
        .withScope('organization', 'org_123')
        .withScope('workspace', 'ws_456')

      expect(scopedBuilder.build('kv', 'settings')).toBe(
        'ign:store:production:my-api:organization:org_123:workspace:ws_456:kv:settings',
      )
    })

    it('should handle numeric identifiers', () => {
      const builder = new StoreKeyBuilder(defaultOptions)
      const scopedBuilder = builder.withScope('user', 42)

      expect(scopedBuilder.build('kv', 'profile')).toBe(
        'ign:store:production:my-api:user:42:kv:profile',
      )
    })
  })

  describe('getPrefix()', () => {
    it('should return base prefix without namespace', () => {
      const builder = new StoreKeyBuilder(defaultOptions)
      expect(builder.getPrefix()).toBe('ign:store:production:my-api')
    })

    it('should include scopes in prefix', () => {
      const builder = new StoreKeyBuilder({
        ...defaultOptions,
        scopeChain: [{ key: 'org', identifier: '123' }],
      })
      expect(builder.getPrefix()).toBe('ign:store:production:my-api:org:123')
    })
  })

  describe('different environments', () => {
    it('should use development environment', () => {
      const builder = new StoreKeyBuilder({
        ...defaultOptions,
        environment: 'development',
      })

      expect(builder.build('kv', 'test')).toBe(
        'ign:store:development:my-api:kv:test',
      )
    })

    it('should use custom key prefix', () => {
      const builder = new StoreKeyBuilder({
        ...defaultOptions,
        keyPrefix: 'myapp',
      })

      expect(builder.build('kv', 'test')).toBe(
        'myapp:production:my-api:kv:test',
      )
    })
  })
})
