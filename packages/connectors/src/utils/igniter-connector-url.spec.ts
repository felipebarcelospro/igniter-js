/**
 * @fileoverview Tests for IgniterConnectorUrl
 * @module @igniter-js/connectors/utils/igniter-connector-url.spec
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { IgniterConnectorUrl } from './igniter-connector-url'

describe('IgniterConnectorUrl', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Clear cache before each test
    IgniterConnectorUrl.clearCache()
    // Reset environment variables
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    IgniterConnectorUrl.clearCache()
  })

  describe('getBaseUrl()', () => {
    it('should return IGNITER_BASE_URL if set', () => {
      process.env.IGNITER_BASE_URL = 'https://app.example.com'

      const url = IgniterConnectorUrl.getBaseUrl()

      expect(url).toBe('https://app.example.com')
    })

    it('should remove trailing slash from URL', () => {
      process.env.IGNITER_BASE_URL = 'https://app.example.com/'

      const url = IgniterConnectorUrl.getBaseUrl()

      expect(url).toBe('https://app.example.com')
    })

    it('should check multiple environment variables in order', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://next-app.example.com'

      const url = IgniterConnectorUrl.getBaseUrl()

      expect(url).toBe('https://next-app.example.com')
    })

    it('should return fallback when no env vars are set', () => {
      delete process.env.IGNITER_BASE_URL
      delete process.env.NEXT_PUBLIC_IGNITER_BASE_URL
      delete process.env.NEXT_PUBLIC_APP_URL
      delete process.env.REACT_APP_BASE_URL
      delete process.env.VITE_BASE_URL
      delete process.env.BASE_URL
      delete process.env.APP_URL
      delete process.env.VERCEL_URL

      const url = IgniterConnectorUrl.getBaseUrl('http://localhost:3000')

      expect(url).toBe('http://localhost:3000')
    })

    it('should return undefined when no env vars and no fallback', () => {
      delete process.env.IGNITER_BASE_URL
      delete process.env.NEXT_PUBLIC_IGNITER_BASE_URL
      delete process.env.NEXT_PUBLIC_APP_URL
      delete process.env.REACT_APP_BASE_URL
      delete process.env.VITE_BASE_URL
      delete process.env.BASE_URL
      delete process.env.APP_URL
      delete process.env.VERCEL_URL

      const url = IgniterConnectorUrl.getBaseUrl()

      expect(url).toBeUndefined()
    })

    it('should cache the base URL', () => {
      process.env.IGNITER_BASE_URL = 'https://cached.example.com'
      
      // First call
      const url1 = IgniterConnectorUrl.getBaseUrl()
      
      // Change env var
      process.env.IGNITER_BASE_URL = 'https://different.example.com'
      
      // Second call should return cached value
      const url2 = IgniterConnectorUrl.getBaseUrl()

      expect(url1).toBe('https://cached.example.com')
      expect(url2).toBe('https://cached.example.com')
    })
  })

  describe('clearCache()', () => {
    it('should clear the cached base URL', () => {
      process.env.IGNITER_BASE_URL = 'https://first.example.com'
      IgniterConnectorUrl.getBaseUrl()

      process.env.IGNITER_BASE_URL = 'https://second.example.com'
      IgniterConnectorUrl.clearCache()

      const url = IgniterConnectorUrl.getBaseUrl()

      expect(url).toBe('https://second.example.com')
    })
  })

  describe('setBaseUrl()', () => {
    it('should override environment detection', () => {
      process.env.IGNITER_BASE_URL = 'https://env.example.com'

      IgniterConnectorUrl.setBaseUrl('https://custom.example.com')

      const url = IgniterConnectorUrl.getBaseUrl()

      expect(url).toBe('https://custom.example.com')
    })

    it('should remove trailing slash', () => {
      IgniterConnectorUrl.setBaseUrl('https://custom.example.com/')

      const url = IgniterConnectorUrl.getBaseUrl()

      expect(url).toBe('https://custom.example.com')
    })
  })

  describe('buildWebhookUrl()', () => {
    beforeEach(() => {
      IgniterConnectorUrl.setBaseUrl('https://app.example.com')
    })

    it('should build a complete webhook URL', () => {
      const url = IgniterConnectorUrl.buildWebhookUrl('telegram', 'secret123')

      expect(url).toContain('https://app.example.com')
      expect(url).toContain('/connectors/telegram/webhook/secret123')
    })

    it('should use custom base URL if provided', () => {
      const url = IgniterConnectorUrl.buildWebhookUrl(
        'slack',
        'abc123',
        'https://custom.example.com'
      )

      expect(url).toContain('https://custom.example.com')
      expect(url).toContain('/connectors/slack/webhook/abc123')
    })

    it('should throw error when no base URL configured', () => {
      IgniterConnectorUrl.clearCache()
      delete process.env.IGNITER_BASE_URL

      expect(() => {
        IgniterConnectorUrl.buildWebhookUrl('test', 'secret')
      }).toThrow('Base URL not configured')
    })
  })

  describe('buildOAuthCallbackUrl()', () => {
    beforeEach(() => {
      IgniterConnectorUrl.setBaseUrl('https://app.example.com')
    })

    it('should build a complete OAuth callback URL', () => {
      const url = IgniterConnectorUrl.buildOAuthCallbackUrl('mailchimp')

      expect(url).toContain('https://app.example.com')
      expect(url).toContain('/connectors/mailchimp/oauth/callback')
    })

    it('should use custom base URL if provided', () => {
      const url = IgniterConnectorUrl.buildOAuthCallbackUrl(
        'github',
        'https://custom.example.com'
      )

      expect(url).toContain('https://custom.example.com')
      expect(url).toContain('/connectors/github/oauth/callback')
    })

    it('should throw error when no base URL configured', () => {
      IgniterConnectorUrl.clearCache()
      delete process.env.IGNITER_BASE_URL

      expect(() => {
        IgniterConnectorUrl.buildOAuthCallbackUrl('test')
      }).toThrow('Base URL not configured')
    })
  })

  describe('generateSecret()', () => {
    it('should generate a hex string of specified length', () => {
      const secret = IgniterConnectorUrl.generateSecret(32)

      expect(secret).toHaveLength(32)
      expect(secret).toMatch(/^[0-9a-f]+$/)
    })

    it('should generate default length of 32', () => {
      const secret = IgniterConnectorUrl.generateSecret()

      expect(secret).toHaveLength(32)
    })

    it('should generate unique secrets', () => {
      const secrets = new Set<string>()

      for (let i = 0; i < 100; i++) {
        secrets.add(IgniterConnectorUrl.generateSecret())
      }

      expect(secrets.size).toBe(100)
    })

    it('should respect custom length', () => {
      const secret16 = IgniterConnectorUrl.generateSecret(16)
      const secret64 = IgniterConnectorUrl.generateSecret(64)

      expect(secret16).toHaveLength(16)
      expect(secret64).toHaveLength(64)
    })
  })

  describe('parseWebhookUrl()', () => {
    it('should parse valid webhook URL', () => {
      const url = 'https://app.example.com/api/v1/connectors/telegram/webhook/secret123'

      const result = IgniterConnectorUrl.parseWebhookUrl(url)

      expect(result).not.toBeNull()
      expect(result?.connectorKey).toBe('telegram')
      expect(result?.secret).toBe('secret123')
    })

    it('should return null for invalid URL', () => {
      const result = IgniterConnectorUrl.parseWebhookUrl('https://example.com/random/path')

      expect(result).toBeNull()
    })

    it('should handle URL with query parameters', () => {
      const url = 'https://app.example.com/api/v1/connectors/slack/webhook/abc123?verify=true'

      const result = IgniterConnectorUrl.parseWebhookUrl(url)

      expect(result?.connectorKey).toBe('slack')
      expect(result?.secret).toBe('abc123')
    })
  })

  describe('parseOAuthCallbackUrl()', () => {
    it('should parse valid OAuth callback URL', () => {
      const url = 'https://app.example.com/api/v1/connectors/mailchimp/oauth/callback'

      const result = IgniterConnectorUrl.parseOAuthCallbackUrl(url)

      expect(result).not.toBeNull()
      expect(result?.connectorKey).toBe('mailchimp')
    })

    it('should return null for invalid URL', () => {
      const result = IgniterConnectorUrl.parseOAuthCallbackUrl('https://example.com/random')

      expect(result).toBeNull()
    })

    it('should handle URL with query parameters', () => {
      const url = 'https://app.example.com/api/v1/connectors/github/oauth/callback?code=abc&state=xyz'

      const result = IgniterConnectorUrl.parseOAuthCallbackUrl(url)

      expect(result?.connectorKey).toBe('github')
    })
  })
})
