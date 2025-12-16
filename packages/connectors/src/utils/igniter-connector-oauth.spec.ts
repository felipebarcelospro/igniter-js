/**
 * @fileoverview Tests for IgniterConnectorOAuthUtils
 * @module @igniter-js/connectors/utils/igniter-connector-oauth.spec
 */

import { describe, it, expect } from 'vitest'
import { IgniterConnectorOAuthUtils } from './igniter-connector-oauth'

describe('IgniterConnectorOAuthUtils', () => {
  describe('parseTokenResponse()', () => {
    it('should parse standard OAuth token response', () => {
      const response = {
        access_token: 'abc123',
        refresh_token: 'xyz789',
        expires_in: 3600,
        token_type: 'Bearer',
      }

      const tokens = IgniterConnectorOAuthUtils.parseTokenResponse(response)

      expect(tokens).not.toBeNull()
      expect(tokens?.accessToken).toBe('abc123')
      expect(tokens?.refreshToken).toBe('xyz789')
      expect(tokens?.expiresIn).toBe(3600)
      expect(tokens?.tokenType).toBe('Bearer')
    })

    it('should parse camelCase token response', () => {
      const response = {
        accessToken: 'token123',
        refreshToken: 'refresh456',
        expiresIn: 7200,
        tokenType: 'bearer',
      }

      const tokens = IgniterConnectorOAuthUtils.parseTokenResponse(response)

      expect(tokens?.accessToken).toBe('token123')
      expect(tokens?.refreshToken).toBe('refresh456')
      expect(tokens?.expiresIn).toBe(7200)
    })

    it('should parse minimal token response', () => {
      const response = {
        access_token: 'minimal-token',
      }

      const tokens = IgniterConnectorOAuthUtils.parseTokenResponse(response)

      expect(tokens).not.toBeNull()
      expect(tokens?.accessToken).toBe('minimal-token')
      expect(tokens?.refreshToken).toBeUndefined()
      expect(tokens?.expiresIn).toBeUndefined()
    })

    it('should parse response with "token" key', () => {
      const response = {
        token: 'simple-token',
        expires: 1800,
      }

      const tokens = IgniterConnectorOAuthUtils.parseTokenResponse(response)

      expect(tokens?.accessToken).toBe('simple-token')
      expect(tokens?.expiresIn).toBe(1800)
    })

    it('should return null when access token is missing', () => {
      const response = {
        refresh_token: 'refresh-only',
        expires_in: 3600,
      }

      const tokens = IgniterConnectorOAuthUtils.parseTokenResponse(response)

      expect(tokens).toBeNull()
    })

    it('should calculate expiresAt from expiresIn', () => {
      const now = Date.now()
      const response = {
        access_token: 'token',
        expires_in: 3600,
      }

      const tokens = IgniterConnectorOAuthUtils.parseTokenResponse(response)

      expect(tokens?.expiresAt).toBeDefined()
      expect(tokens?.expiresAt).toBeInstanceOf(Date)
      
      // Should be approximately 1 hour from now
      const expectedTime = now + 3600 * 1000
      const actualTime = tokens?.expiresAt?.getTime() ?? 0
      expect(actualTime).toBeGreaterThan(expectedTime - 1000) // Allow 1 second tolerance
      expect(actualTime).toBeLessThan(expectedTime + 1000)
    })

    it('should handle empty response', () => {
      const tokens = IgniterConnectorOAuthUtils.parseTokenResponse({})
      expect(tokens).toBeNull()
    })

    it('should ignore null/undefined values', () => {
      const response = {
        access_token: 'valid-token',
        refresh_token: null,
        expires_in: undefined,
      }

      const tokens = IgniterConnectorOAuthUtils.parseTokenResponse(response as any)

      expect(tokens?.accessToken).toBe('valid-token')
      expect(tokens?.refreshToken).toBeUndefined()
      expect(tokens?.expiresIn).toBeUndefined()
    })
  })

  describe('parseUserInfo()', () => {
    it('should parse standard OIDC user info', () => {
      const response = {
        sub: 'user_12345',
        name: 'John Doe',
        email: 'john@example.com',
        picture: 'https://example.com/avatar.jpg',
      }

      const userInfo = IgniterConnectorOAuthUtils.parseUserInfo(response)

      expect(userInfo).not.toBeNull()
      expect(userInfo?.id).toBe('user_12345')
      expect(userInfo?.name).toBe('John Doe')
      expect(userInfo?.email).toBe('john@example.com')
      expect(userInfo?.avatar).toBe('https://example.com/avatar.jpg')
    })

    it('should parse response with "id" key', () => {
      const response = {
        id: '123',
        displayName: 'Jane Smith',
        emailAddress: 'jane@example.com',
      }

      const userInfo = IgniterConnectorOAuthUtils.parseUserInfo(response)

      expect(userInfo?.id).toBe('123')
      expect(userInfo?.name).toBe('Jane Smith')
      expect(userInfo?.email).toBe('jane@example.com')
    })

    it('should parse response with snake_case keys', () => {
      const response = {
        user_id: 'uid_456',
        display_name: 'Bob',
        email_address: 'bob@example.com',
        avatar_url: 'https://example.com/bob.png',
      }

      const userInfo = IgniterConnectorOAuthUtils.parseUserInfo(response)

      expect(userInfo?.id).toBe('uid_456')
      expect(userInfo?.name).toBe('Bob')
      expect(userInfo?.email).toBe('bob@example.com')
      expect(userInfo?.avatar).toBe('https://example.com/bob.png')
    })

    it('should parse minimal user info with only ID', () => {
      const response = {
        sub: 'minimal-user',
      }

      const userInfo = IgniterConnectorOAuthUtils.parseUserInfo(response)

      expect(userInfo).not.toBeNull()
      expect(userInfo?.id).toBe('minimal-user')
      expect(userInfo?.name).toBeUndefined()
      expect(userInfo?.email).toBeUndefined()
    })

    it('should return null when ID is missing', () => {
      const response = {
        name: 'No ID User',
        email: 'noid@example.com',
      }

      const userInfo = IgniterConnectorOAuthUtils.parseUserInfo(response)

      expect(userInfo).toBeNull()
    })

    it('should handle various avatar key names', () => {
      const avatarKeys = [
        { picture: 'https://example.com/1.jpg' },
        { avatar: 'https://example.com/2.jpg' },
        { avatar_url: 'https://example.com/3.jpg' },
        { photo: 'https://example.com/4.jpg' },
        { image: 'https://example.com/5.jpg' },
        { profile_image: 'https://example.com/6.jpg' },
      ]

      for (const avatarObj of avatarKeys) {
        const response = { id: 'test', ...avatarObj }
        const userInfo = IgniterConnectorOAuthUtils.parseUserInfo(response)
        expect(userInfo?.avatar).toBeDefined()
      }
    })

    it('should handle empty response', () => {
      const userInfo = IgniterConnectorOAuthUtils.parseUserInfo({})
      expect(userInfo).toBeNull()
    })
  })

  describe('generateState()', () => {
    it('should generate a random state string', () => {
      const state = IgniterConnectorOAuthUtils.generateState()

      expect(state).toBeDefined()
      expect(typeof state).toBe('string')
      expect(state.length).toBeGreaterThan(0)
    })

    it('should generate unique states', () => {
      const states = new Set<string>()
      
      for (let i = 0; i < 100; i++) {
        states.add(IgniterConnectorOAuthUtils.generateState())
      }

      // All states should be unique
      expect(states.size).toBe(100)
    })
  })

  describe('generateCodeVerifier()', () => {
    it('should generate a code verifier for PKCE', () => {
      const verifier = IgniterConnectorOAuthUtils.generateCodeVerifier()

      expect(verifier).toBeDefined()
      expect(typeof verifier).toBe('string')
      // PKCE code verifier should be 43-128 characters (Base64URL encoded)
      expect(verifier.length).toBeGreaterThanOrEqual(43)
    })

    it('should generate unique code verifiers', () => {
      const verifiers = new Set<string>()
      
      for (let i = 0; i < 100; i++) {
        verifiers.add(IgniterConnectorOAuthUtils.generateCodeVerifier())
      }

      expect(verifiers.size).toBe(100)
    })
  })

  describe('generateCodeChallenge()', () => {
    it('should generate a code challenge from verifier', async () => {
      const verifier = IgniterConnectorOAuthUtils.generateCodeVerifier()
      const challenge = await IgniterConnectorOAuthUtils.generateCodeChallenge(verifier)

      expect(challenge).toBeDefined()
      expect(typeof challenge).toBe('string')
      // Code challenge should be Base64URL encoded
      expect(challenge).not.toContain('+')
      expect(challenge).not.toContain('/')
      expect(challenge).not.toContain('=')
    })

    it('should generate consistent challenge for same verifier', async () => {
      const verifier = 'test-verifier-string'
      const challenge1 = await IgniterConnectorOAuthUtils.generateCodeChallenge(verifier)
      const challenge2 = await IgniterConnectorOAuthUtils.generateCodeChallenge(verifier)

      expect(challenge1).toBe(challenge2)
    })

    it('should generate different challenges for different verifiers', async () => {
      const verifier1 = IgniterConnectorOAuthUtils.generateCodeVerifier()
      const verifier2 = IgniterConnectorOAuthUtils.generateCodeVerifier()
      
      const challenge1 = await IgniterConnectorOAuthUtils.generateCodeChallenge(verifier1)
      const challenge2 = await IgniterConnectorOAuthUtils.generateCodeChallenge(verifier2)

      expect(challenge1).not.toBe(challenge2)
    })
  })

  describe('buildAuthUrl()', () => {
    it('should build authorization URL with params', () => {
      const baseUrl = 'https://provider.com/oauth/authorize'
      const params = {
        client_id: 'test-client',
        redirect_uri: 'https://app.com/callback',
        response_type: 'code',
        state: 'random-state',
      }

      const url = IgniterConnectorOAuthUtils.buildAuthUrl(baseUrl, params)

      expect(url).toContain(baseUrl)
      expect(url).toContain('client_id=test-client')
      expect(url).toContain('redirect_uri=')
      expect(url).toContain('response_type=code')
      expect(url).toContain('state=random-state')
    })

    it('should URL-encode parameter values', () => {
      const baseUrl = 'https://provider.com/authorize'
      const params = {
        redirect_uri: 'https://app.com/callback?extra=value',
        scope: 'read write profile',
      }

      const url = IgniterConnectorOAuthUtils.buildAuthUrl(baseUrl, params)

      expect(url).toContain(encodeURIComponent('https://app.com/callback?extra=value'))
      // URLSearchParams encodes spaces as + (which is valid for query strings)
      expect(url).toMatch(/scope=read[+%20]write[+%20]profile/)
    })

    it('should handle empty params', () => {
      const baseUrl = 'https://provider.com/authorize'
      const url = IgniterConnectorOAuthUtils.buildAuthUrl(baseUrl, {})

      expect(url).toBe(baseUrl)
    })
  })

  describe('isTokenExpired()', () => {
    it('should return true for expired tokens', () => {
      const tokens = {
        accessToken: 'token',
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      }

      expect(IgniterConnectorOAuthUtils.isExpired(tokens)).toBe(true)
    })

    it('should return false for valid tokens', () => {
      const tokens = {
        accessToken: 'token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      }

      expect(IgniterConnectorOAuthUtils.isExpired(tokens)).toBe(false)
    })

    it('should return false when expiresAt is not set', () => {
      const tokens = {
        accessToken: 'token',
      }

      expect(IgniterConnectorOAuthUtils.isExpired(tokens)).toBe(false)
    })

    it('should consider buffer time for expiration', () => {
      // Token expires in 30 seconds
      const tokens = {
        accessToken: 'token',
        expiresAt: new Date(Date.now() + 30000),
      }

      // With default buffer of 60 seconds, should be considered expired
      expect(IgniterConnectorOAuthUtils.isExpired(tokens, 60)).toBe(true)
      
      // With 0 buffer, should not be expired
      expect(IgniterConnectorOAuthUtils.isExpired(tokens, 0)).toBe(false)
    })
  })
})
