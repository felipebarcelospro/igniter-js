/**
 * @fileoverview Encryption utilities for IgniterConnector
 * @module @igniter-js/connectors/utils/crypto
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import {
  IgniterConnectorError,
  IGNITER_CONNECTOR_ERROR_CODES,
} from '../errors/connector.error'

/**
 * Encryption algorithm used by default.
 */
const ALGORITHM = 'aes-256-gcm'

/**
 * IV length in bytes.
 */
const IV_LENGTH = 16

/**
 * Static utility class for encryption and decryption operations.
 * Uses AES-256-GCM by default with IGNITER_SECRET environment variable.
 *
 * @example
 * ```typescript
 * // Encrypt a value
 * const encrypted = await IgniterConnectorCrypto.encrypt('secret-value')
 *
 * // Decrypt a value
 * const decrypted = await IgniterConnectorCrypto.decrypt(encrypted)
 *
 * // Encrypt specific fields in an object
 * const config = { apiKey: 'secret', name: 'public' }
 * const encrypted = await IgniterConnectorCrypto.encryptFields(config, ['apiKey'])
 * // { apiKey: 'encrypted...', name: 'public' }
 * ```
 */
export class IgniterConnectorCrypto {
  /**
   * Get the encryption key from environment or throw error.
   *
   * @returns The 32-byte encryption key
   * @throws IgniterConnectorError if IGNITER_SECRET is not set
   */
  private static getKey(): Buffer {
    const secret = process.env.IGNITER_SECRET

    // Validation: Check if secret is set
    if (!secret) {
      throw IgniterConnectorError.encryptionSecretRequired()
    }

    // Data Transform: Derive 32-byte key from secret
    // Using simple padding/truncation for now, could use PBKDF2 for more security
    const key = Buffer.alloc(32)
    const secretBuffer = Buffer.from(secret, 'utf8')
    secretBuffer.copy(key, 0, 0, Math.min(secretBuffer.length, 32))

    return key
  }

  /**
   * Encrypt a string value using AES-256-GCM.
   *
   * @param value - The plain text value to encrypt
   * @param customKey - Optional custom encryption key (32 bytes)
   * @returns The encrypted value as base64 string (iv:authTag:ciphertext)
   *
   * @example
   * ```typescript
   * const encrypted = await IgniterConnectorCrypto.encrypt('my-secret-token')
   * // Returns: 'base64iv:base64authTag:base64ciphertext'
   * ```
   */
  static async encrypt(value: string, customKey?: Buffer): Promise<string> {
    try {
      // Initialization: Get encryption key
      const key = customKey ?? IgniterConnectorCrypto.getKey()

      // Initialization: Generate random IV
      const iv = randomBytes(IV_LENGTH)

      // Data Transform: Create cipher and encrypt
      const cipher = createCipheriv(ALGORITHM, key, iv)
      const encrypted = Buffer.concat([
        cipher.update(value, 'utf8'),
        cipher.final(),
      ])

      // Data Transform: Get auth tag for integrity
      const authTag = cipher.getAuthTag()

      // Response: Return formatted encrypted string
      return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
    } catch (error) {
      // Error Handling: Wrap and throw connector error
      throw new IgniterConnectorError({
        code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_ENCRYPT_FAILED,
        message: 'Failed to encrypt value',
        cause: error instanceof Error ? error : undefined,
      })
    }
  }

  /**
   * Decrypt a string value encrypted with AES-256-GCM.
   *
   * @param encryptedValue - The encrypted value (iv:authTag:ciphertext)
   * @param customKey - Optional custom decryption key (32 bytes)
   * @returns The decrypted plain text value
   *
   * @example
   * ```typescript
   * const encrypted = 'base64iv:base64authTag:base64ciphertext'
   * const decrypted = await IgniterConnectorCrypto.decrypt(encrypted)
   * // Returns: 'my-secret-token'
   * ```
   */
  static async decrypt(
    encryptedValue: string,
    customKey?: Buffer
  ): Promise<string> {
    try {
      // Initialization: Get decryption key
      const key = customKey ?? IgniterConnectorCrypto.getKey()

      // Data Transform: Parse encrypted parts
      const parts = encryptedValue.split(':')

      // Validation: Check format
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted value format')
      }

      const [ivBase64, authTagBase64, ciphertextBase64] = parts
      const iv = Buffer.from(ivBase64, 'base64')
      const authTag = Buffer.from(authTagBase64, 'base64')
      const ciphertext = Buffer.from(ciphertextBase64, 'base64')

      // Data Transform: Create decipher and decrypt
      const decipher = createDecipheriv(ALGORITHM, key, iv)
      decipher.setAuthTag(authTag)

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ])

      // Response: Return decrypted string
      return decrypted.toString('utf8')
    } catch (error) {
      // Error Handling: Wrap and throw connector error
      throw new IgniterConnectorError({
        code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_DECRYPT_FAILED,
        message: 'Failed to decrypt value',
        cause: error instanceof Error ? error : undefined,
      })
    }
  }

  /**
   * Check if a value appears to be encrypted.
   *
   * @param value - The value to check
   * @returns True if the value appears to be encrypted
   *
   * @example
   * ```typescript
   * IgniterConnectorCrypto.isEncrypted('plain-text') // false
   * IgniterConnectorCrypto.isEncrypted('iv:tag:cipher') // true
   * ```
   */
  static isEncrypted(value: string): boolean {
    // Validation: Check if value matches encrypted format
    if (typeof value !== 'string') {
      return false
    }

    const parts = value.split(':')

    // Conditional: Must have exactly 3 parts (iv:authTag:ciphertext)
    if (parts.length !== 3) {
      return false
    }

    // Validation: Each part should be valid base64
    const base64Regex = /^[A-Za-z0-9+/]+=*$/

    return parts.every(
      (part) => part.length > 0 && base64Regex.test(part)
    )
  }

  /**
   * Encrypt specific fields in an object.
   *
   * @param obj - The object containing fields to encrypt
   * @param fields - Array of field names to encrypt
   * @param customEncrypt - Optional custom encrypt function
   * @returns The object with specified fields encrypted
   *
   * @example
   * ```typescript
   * const config = {
   *   apiKey: 'secret-key',
   *   webhookUrl: 'https://example.com',
   *   name: 'My Integration'
   * }
   *
   * const encrypted = await IgniterConnectorCrypto.encryptFields(
   *   config,
   *   ['apiKey']
   * )
   * // { apiKey: 'encrypted...', webhookUrl: 'https://example.com', name: 'My Integration' }
   * ```
   */
  static async encryptFields<T extends Record<string, unknown>>(
    obj: T,
    fields: string[],
    customEncrypt?: (value: string) => Promise<string> | string
  ): Promise<T> {
    // Data Transform: Clone object to avoid mutation
    const result = { ...obj }

    // Loop: Process each field
    for (const field of fields) {
      const value = result[field]

      // Conditional: Only encrypt string values that are not already encrypted
      if (typeof value === 'string' && value.length > 0) {
        // Conditional: Skip if already encrypted
        if (IgniterConnectorCrypto.isEncrypted(value)) {
          continue
        }

        // Data Transform: Encrypt the field
        if (customEncrypt !== undefined) {
          ;(result as any)[field] = await customEncrypt(value)
        } else {
          ;(result as any)[field] = await IgniterConnectorCrypto.encrypt(value)
        }
      }
    }

    return result
  }

  /**
   * Decrypt specific fields in an object.
   *
   * @param obj - The object containing fields to decrypt
   * @param fields - Array of field names to decrypt
   * @param customDecrypt - Optional custom decrypt function
   * @returns The object with specified fields decrypted
   *
   * @example
   * ```typescript
   * const encrypted = {
   *   apiKey: 'encrypted...',
   *   name: 'My Integration'
   * }
   *
   * const decrypted = await IgniterConnectorCrypto.decryptFields(
   *   encrypted,
   *   ['apiKey']
   * )
   * // { apiKey: 'secret-key', name: 'My Integration' }
   * ```
   */
  static async decryptFields<T extends Record<string, unknown>>(
    obj: T,
    fields: string[],
    customDecrypt?: (value: string) => Promise<string> | string
  ): Promise<T> {
    // Data Transform: Clone object to avoid mutation
    const result = { ...obj }

    // Loop: Process each field
    for (const field of fields) {
      const value = result[field]

      // Conditional: Only decrypt string values that appear encrypted
      if (typeof value === 'string' && IgniterConnectorCrypto.isEncrypted(value)) {
        // Data Transform: Decrypt the field
        if (customDecrypt !== undefined) {
          ;(result as any)[field] = await customDecrypt(value)
        } else {
          ;(result as any)[field] = await IgniterConnectorCrypto.decrypt(value)
        }
      }
    }

    return result
  }

  /**
   * Mask sensitive fields for display/logging.
   *
   * @param obj - The object containing fields to mask
   * @param fields - Array of field names to mask
   * @param maskChar - Character to use for masking
   * @param visibleChars - Number of characters to leave visible at start/end
   * @returns The object with specified fields masked
   *
   * @example
   * ```typescript
   * const config = { apiKey: 'xxxxxx', name: 'Test' }
   * const masked = IgniterConnectorCrypto.maskFields(config, ['apiKey'])
   * // { apiKey: 'sk_l***nop', name: 'Test' }
   * ```
   */
  static maskFields<T extends Record<string, unknown>>(
    obj: T,
    fields: string[],
    maskChar = '*',
    visibleChars = 4
  ): T {
    // Data Transform: Clone object to avoid mutation
    const result = { ...obj }

    // Loop: Process each field
    for (const field of fields) {
      const value = result[field]

      // Conditional: Only mask string values
      if (typeof value === 'string' && value.length > 0) {
        // Data Transform: Create masked value
        const length = value.length

        if (length <= visibleChars * 2) {
          // Short values: mask entirely
          ;(result as any)[field] = maskChar.repeat(length)
        } else {
          // Longer values: show start and end
          const start = value.slice(0, visibleChars)
          const end = value.slice(-visibleChars)
          const masked = maskChar.repeat(3)
          ;(result as any)[field] = `${start}${masked}${end}`
        }
      }
    }

    return result
  }
}
