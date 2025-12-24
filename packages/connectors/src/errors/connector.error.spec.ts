/**
 * @fileoverview Tests for IgniterConnectorError
 * @module @igniter-js/connectors/errors/connector.error.spec
 */

import { describe, it, expect } from 'vitest'
import { 
  IgniterConnectorError, 
  IGNITER_CONNECTOR_ERROR_CODES,
  type IgniterConnectorErrorCode,
} from './connector.error'

describe('IgniterConnectorError', () => {
  describe('constructor', () => {
    it('should create an error with required properties', () => {
      const error = new IgniterConnectorError({
        code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_NOT_FOUND,
        message: 'Connector "telegram" is not registered',
      })

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(IgniterConnectorError)
      expect(error.code).toBe('CONNECTOR_NOT_FOUND')
      expect(error.message).toBe('Connector "telegram" is not registered')
      expect(error.statusCode).toBe(500) // default
      expect(error.metadata).toEqual({})
    })

    it('should create an error with custom status code', () => {
      const error = new IgniterConnectorError({
        code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_NOT_CONNECTED,
        message: 'Connector is not connected',
        statusCode: 400,
      })

      expect(error.statusCode).toBe(400)
    })

    it('should create an error with metadata', () => {
      const error = new IgniterConnectorError({
        code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_ACTION_FAILED,
        message: 'Action execution failed',
        metadata: {
          connector: 'telegram',
          action: 'sendMessage',
          scope: 'organization',
          identity: 'org_123',
        },
      })

      expect(error.metadata.connector).toBe('telegram')
      expect(error.metadata.action).toBe('sendMessage')
      expect(error.metadata.scope).toBe('organization')
      expect(error.metadata.identity).toBe('org_123')
    })

    it('should create an error with cause', () => {
      const originalError = new Error('Original error')
      const error = new IgniterConnectorError({
        code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_DATABASE_FAILED,
        message: 'Database operation failed',
        cause: originalError,
      })

      // causer is the module name, originalCause is the original error
      expect(error.causer).toBe('IgniterConnector')
      expect(error.cause).toBe(originalError)
    })

    it('should create an error with validation errors in metadata', () => {
      const error = new IgniterConnectorError({
        code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_CONFIG_INVALID,
        message: 'Configuration validation failed',
        metadata: {
          validationErrors: [
            { path: 'apiKey', message: 'Required' },
            { path: 'baseUrl', message: 'Invalid URL format' },
          ],
        },
      })

      expect(error.metadata.validationErrors).toHaveLength(2)
      expect(error.metadata.validationErrors?.[0]).toEqual({
        path: 'apiKey',
        message: 'Required',
      })
    })
  })

  describe('isConnectorError()', () => {
    it('should return true for IgniterConnectorError instances', () => {
      const error = new IgniterConnectorError({
        code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_NOT_FOUND,
        message: 'Not found',
      })

      expect(IgniterConnectorError.isConnectorError(error)).toBe(true)
    })

    it('should return false for regular Error instances', () => {
      const error = new Error('Regular error')
      expect(IgniterConnectorError.isConnectorError(error)).toBe(false)
    })

    it('should return false for non-error values', () => {
      expect(IgniterConnectorError.isConnectorError('string')).toBe(false)
      expect(IgniterConnectorError.isConnectorError(123)).toBe(false)
      expect(IgniterConnectorError.isConnectorError(null)).toBe(false)
      expect(IgniterConnectorError.isConnectorError(undefined)).toBe(false)
      expect(IgniterConnectorError.isConnectorError({})).toBe(false)
    })
  })

  describe('error codes', () => {
    it('should have all connector error codes defined', () => {
      const expectedCodes = [
        'CONNECTOR_NOT_FOUND',
        'CONNECTOR_NOT_CONNECTED',
        'CONNECTOR_ALREADY_CONNECTED',
        'CONNECTOR_CONFIG_INVALID',
        'CONNECTOR_DEFAULT_CONFIG_REQUIRED',
      ]

      for (const code of expectedCodes) {
        expect(IGNITER_CONNECTOR_ERROR_CODES[code as keyof typeof IGNITER_CONNECTOR_ERROR_CODES]).toBe(code)
      }
    })

    it('should have all action error codes defined', () => {
      const expectedCodes = [
        'CONNECTOR_ACTION_NOT_FOUND',
        'CONNECTOR_ACTION_INPUT_INVALID',
        'CONNECTOR_ACTION_OUTPUT_INVALID',
        'CONNECTOR_ACTION_FAILED',
      ]

      for (const code of expectedCodes) {
        expect(IGNITER_CONNECTOR_ERROR_CODES[code as keyof typeof IGNITER_CONNECTOR_ERROR_CODES]).toBe(code)
      }
    })

    it('should have all scope error codes defined', () => {
      const expectedCodes = [
        'CONNECTOR_SCOPE_INVALID',
        'CONNECTOR_SCOPE_IDENTIFIER_REQUIRED',
      ]

      for (const code of expectedCodes) {
        expect(IGNITER_CONNECTOR_ERROR_CODES[code as keyof typeof IGNITER_CONNECTOR_ERROR_CODES]).toBe(code)
      }
    })

    it('should have all database error codes defined', () => {
      const expectedCodes = [
        'CONNECTOR_DATABASE_REQUIRED',
        'CONNECTOR_DATABASE_FAILED',
      ]

      for (const code of expectedCodes) {
        expect(IGNITER_CONNECTOR_ERROR_CODES[code as keyof typeof IGNITER_CONNECTOR_ERROR_CODES]).toBe(code)
      }
    })

    it('should have all OAuth error codes defined', () => {
      const expectedCodes = [
        'CONNECTOR_OAUTH_NOT_CONFIGURED',
        'CONNECTOR_OAUTH_STATE_INVALID',
        'CONNECTOR_OAUTH_TOKEN_FAILED',
        'CONNECTOR_OAUTH_PARSE_TOKEN_FAILED',
        'CONNECTOR_OAUTH_PARSE_USERINFO_FAILED',
        'CONNECTOR_OAUTH_REFRESH_FAILED',
      ]

      for (const code of expectedCodes) {
        expect(IGNITER_CONNECTOR_ERROR_CODES[code as keyof typeof IGNITER_CONNECTOR_ERROR_CODES]).toBe(code)
      }
    })

    it('should have all webhook error codes defined', () => {
      const expectedCodes = [
        'CONNECTOR_WEBHOOK_NOT_CONFIGURED',
        'CONNECTOR_WEBHOOK_VALIDATION_FAILED',
        'CONNECTOR_WEBHOOK_VERIFICATION_FAILED',
      ]

      for (const code of expectedCodes) {
        expect(IGNITER_CONNECTOR_ERROR_CODES[code as keyof typeof IGNITER_CONNECTOR_ERROR_CODES]).toBe(code)
      }
    })

    it('should have all encryption error codes defined', () => {
      const expectedCodes = [
        'CONNECTOR_ENCRYPT_FAILED',
        'CONNECTOR_DECRYPT_FAILED',
        'CONNECTOR_ENCRYPTION_SECRET_REQUIRED',
      ]

      for (const code of expectedCodes) {
        expect(IGNITER_CONNECTOR_ERROR_CODES[code as keyof typeof IGNITER_CONNECTOR_ERROR_CODES]).toBe(code)
      }
    })

    it('should have all builder error codes defined', () => {
      const expectedCodes = [
        'CONNECTOR_BUILD_CONFIG_REQUIRED',
        'CONNECTOR_BUILD_SCOPES_REQUIRED',
        'CONNECTOR_BUILD_CONNECTORS_REQUIRED',
      ]

      for (const code of expectedCodes) {
        expect(IGNITER_CONNECTOR_ERROR_CODES[code as keyof typeof IGNITER_CONNECTOR_ERROR_CODES]).toBe(code)
      }
    })
  })

  describe('error scenarios', () => {
    it('should handle connector not found error', () => {
      const error = new IgniterConnectorError({
        code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_NOT_FOUND,
        message: 'Connector "unknown" is not registered',
        statusCode: 404,
        metadata: { connector: 'unknown' },
      })

      expect(error.code).toBe('CONNECTOR_NOT_FOUND')
      expect(error.statusCode).toBe(404)
      expect(error.metadata.connector).toBe('unknown')
    })

    it('should handle action input validation error', () => {
      const error = new IgniterConnectorError({
        code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_ACTION_INPUT_INVALID,
        message: 'Action input validation failed',
        statusCode: 400,
        metadata: {
          connector: 'telegram',
          action: 'sendMessage',
          validationErrors: [
            { path: 'message', message: 'String must contain at least 1 character(s)' },
          ],
        },
      })

      expect(error.code).toBe('CONNECTOR_ACTION_INPUT_INVALID')
      expect(error.statusCode).toBe(400)
      expect(error.metadata.validationErrors?.[0].path).toBe('message')
    })

    it('should handle OAuth state invalid error', () => {
      const error = new IgniterConnectorError({
        code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_OAUTH_STATE_INVALID,
        message: 'OAuth state is invalid or expired',
        statusCode: 400,
        metadata: { connector: 'mailchimp' },
      })

      expect(error.code).toBe('CONNECTOR_OAUTH_STATE_INVALID')
      expect(error.statusCode).toBe(400)
    })

    it('should handle encryption secret required error', () => {
      const error = new IgniterConnectorError({
        code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_ENCRYPTION_SECRET_REQUIRED,
        message: 'IGNITER_SECRET environment variable is not set',
        statusCode: 500,
      })

      expect(error.code).toBe('CONNECTOR_ENCRYPTION_SECRET_REQUIRED')
      expect(error.statusCode).toBe(500)
    })
  })

  describe('error inheritance', () => {
    it('should be throwable', () => {
      expect(() => {
        throw new IgniterConnectorError({
          code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_NOT_FOUND,
          message: 'Test error',
        })
      }).toThrow(IgniterConnectorError)
    })

    it('should be catchable as Error', () => {
      try {
        throw new IgniterConnectorError({
          code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_NOT_FOUND,
          message: 'Test error',
        })
      } catch (error) {
        expect(error instanceof Error).toBe(true)
      }
    })

    it('should preserve stack trace', () => {
      const error = new IgniterConnectorError({
        code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_NOT_FOUND,
        message: 'Test error',
      })

      expect(error.stack).toBeDefined()
      // Stack trace contains the error class name (IgniterError is the base class)
      expect(error.stack).toMatch(/Igniter(Connector)?Error/)
    })
  })
})
