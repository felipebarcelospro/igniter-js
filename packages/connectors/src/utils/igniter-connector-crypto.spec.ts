/**
 * @fileoverview Tests for IgniterConnectorCrypto utilities
 * @module @igniter-js/connectors/utils/igniter-connector-crypto.spec
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('IgniterConnectorCrypto', () => {
  const originalEnv = process.env.IGNITER_SECRET

  beforeEach(() => {
    // Set a test secret (32 characters)
    process.env.IGNITER_SECRET = 'test-secret-key-for-encryption!!'
  })

  afterEach(() => {
    // Restore original env
    if (originalEnv) {
      process.env.IGNITER_SECRET = originalEnv
    } else {
      delete process.env.IGNITER_SECRET
    }
  })

  describe('encrypt()', () => {
    it('should encrypt a string value', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const plaintext = 'my-secret-api-key'
      const encrypted = await IgniterConnectorCrypto.encrypt(plaintext)

      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(plaintext)
      expect(encrypted.split(':')).toHaveLength(3) // iv:authTag:ciphertext
    })

    it('should produce different ciphertexts for same plaintext', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const plaintext = 'same-value'
      const encrypted1 = await IgniterConnectorCrypto.encrypt(plaintext)
      const encrypted2 = await IgniterConnectorCrypto.encrypt(plaintext)

      // Different IVs should produce different ciphertexts
      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should encrypt with different IVs for same plaintext', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')

      // Test that encryption produces different results due to random IV
      const plaintext = 'test-value'
      const encrypted1 = await IgniterConnectorCrypto.encrypt(plaintext)
      const encrypted2 = await IgniterConnectorCrypto.encrypt(plaintext)

      // Each encryption should produce a unique result due to random IV
      expect(encrypted1).not.toBe(encrypted2)
      expect(encrypted1.split(':').length).toBe(3)
    })

    it('should handle empty strings', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const encrypted = await IgniterConnectorCrypto.encrypt('')
      expect(encrypted).toBeDefined()
      expect(encrypted.split(':')).toHaveLength(3)
    })

    it('should handle special characters', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~'
      const encrypted = await IgniterConnectorCrypto.encrypt(specialChars)

      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(specialChars)
    })

    it('should handle unicode characters', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const unicode = '🔐 密码 пароль 🎉'
      const encrypted = await IgniterConnectorCrypto.encrypt(unicode)

      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(unicode)
    })

    it('should handle long strings', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const longString = 'a'.repeat(10000)
      const encrypted = await IgniterConnectorCrypto.encrypt(longString)

      expect(encrypted).toBeDefined()
    })
  })

  describe('decrypt()', () => {
    it('should decrypt an encrypted value', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const plaintext = 'my-secret-api-key'
      const encrypted = await IgniterConnectorCrypto.encrypt(plaintext)
      const decrypted = await IgniterConnectorCrypto.decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should correctly decrypt values with special characters', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~'
      const encrypted = await IgniterConnectorCrypto.encrypt(specialChars)
      const decrypted = await IgniterConnectorCrypto.decrypt(encrypted)

      expect(decrypted).toBe(specialChars)
    })

    it('should correctly decrypt unicode characters', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const unicode = '🔐 密码 пароль 🎉'
      const encrypted = await IgniterConnectorCrypto.encrypt(unicode)
      const decrypted = await IgniterConnectorCrypto.decrypt(encrypted)

      expect(decrypted).toBe(unicode)
    })

    it('should correctly decrypt empty strings', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const encrypted = await IgniterConnectorCrypto.encrypt('')
      const decrypted = await IgniterConnectorCrypto.decrypt(encrypted)

      expect(decrypted).toBe('')
    })

    it('should correctly decrypt long strings', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const longString = 'a'.repeat(10000)
      const encrypted = await IgniterConnectorCrypto.encrypt(longString)
      const decrypted = await IgniterConnectorCrypto.decrypt(encrypted)

      expect(decrypted).toBe(longString)
    })

    it('should throw error for invalid encrypted format', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')

      await expect(
        IgniterConnectorCrypto.decrypt('invalid-format')
      ).rejects.toThrow()
    })

    it('should throw error for tampered ciphertext', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const encrypted = await IgniterConnectorCrypto.encrypt('test')
      const parts = encrypted.split(':')
      parts[2] = 'tampered' + parts[2] // Tamper with ciphertext
      const tampered = parts.join(':')

      await expect(
        IgniterConnectorCrypto.decrypt(tampered)
      ).rejects.toThrow()
    })
  })

  describe('encryptFields()', () => {
    it('should encrypt specified fields in an object', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const config = {
        apiKey: 'secret-key',
        baseUrl: 'https://api.example.com',
        token: 'bearer-token',
      }

      const encrypted = await IgniterConnectorCrypto.encryptFields(
        config,
        ['apiKey', 'token']
      )

      expect(encrypted.apiKey).not.toBe(config.apiKey)
      expect(encrypted.baseUrl).toBe(config.baseUrl) // Not encrypted
      expect(encrypted.token).not.toBe(config.token)
    })

    it('should handle nested objects', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const config = {
        apiKey: 'secret',
        nested: {
          value: 'should-not-change',
        },
      }

      const encrypted = await IgniterConnectorCrypto.encryptFields(
        config,
        ['apiKey']
      )

      expect(encrypted.apiKey).not.toBe(config.apiKey)
      expect(encrypted.nested).toEqual(config.nested)
    })

    it('should skip non-existent fields', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const config = {
        existingField: 'value',
      }

      const encrypted = await IgniterConnectorCrypto.encryptFields(
        config,
        ['existingField', 'nonExistent']
      )

      expect(encrypted.existingField).not.toBe(config.existingField)
      expect(encrypted).not.toHaveProperty('nonExistent')
    })

    it('should handle empty fields array', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const config = {
        field1: 'value1',
        field2: 'value2',
      }

      const encrypted = await IgniterConnectorCrypto.encryptFields(config, [])

      expect(encrypted).toEqual(config)
    })

    it('should handle empty object', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const encrypted = await IgniterConnectorCrypto.encryptFields(
        {},
        ['apiKey']
      )

      expect(encrypted).toEqual({})
    })
  })

  describe('decryptFields()', () => {
    it('should decrypt specified fields in an object', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const original = {
        apiKey: 'secret-key',
        baseUrl: 'https://api.example.com',
        token: 'bearer-token',
      }

      const encrypted = await IgniterConnectorCrypto.encryptFields(
        original,
        ['apiKey', 'token']
      )

      const decrypted = await IgniterConnectorCrypto.decryptFields(
        encrypted,
        ['apiKey', 'token']
      )

      expect(decrypted.apiKey).toBe(original.apiKey)
      expect(decrypted.baseUrl).toBe(original.baseUrl)
      expect(decrypted.token).toBe(original.token)
    })

    it('should handle missing encrypted fields gracefully', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const config = {
        plainField: 'not-encrypted',
      }

      const decrypted = await IgniterConnectorCrypto.decryptFields(
        config,
        ['encryptedField', 'plainField']
      )

      expect(decrypted.plainField).toBe(config.plainField)
    })
  })

  describe('round-trip encryption', () => {
    it('should maintain data integrity through encrypt/decrypt cycle', async () => {
      const { IgniterConnectorCrypto } = await import('./igniter-connector-crypto')
      
      const testCases = [
        'simple-string',
        '12345',
        'with spaces and tabs\t',
        'line1\nline2\nline3',
        JSON.stringify({ key: 'value', nested: { array: [1, 2, 3] } }),
        'https://example.com/path?query=value&other=123',
        Buffer.from('binary data').toString('base64'),
      ]

      for (const original of testCases) {
        const encrypted = await IgniterConnectorCrypto.encrypt(original)
        const decrypted = await IgniterConnectorCrypto.decrypt(encrypted)
        expect(decrypted).toBe(original)
      }
    })
  })
})
