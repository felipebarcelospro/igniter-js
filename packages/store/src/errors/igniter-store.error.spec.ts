/**
 * @fileoverview Tests for IgniterStoreError
 */

import { describe, it, expect } from 'vitest'
import {
  IgniterStoreError,
  IGNITER_STORE_ERROR_CODES,
  type IgniterStoreErrorCode,
} from './igniter-store.error'

describe('IgniterStoreError', () => {
  describe('constructor', () => {
    it('should create an error with required properties', () => {
      const error = new IgniterStoreError({
        code: 'STORE_OPERATION_FAILED',
        message: 'Operation failed',
      })

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(IgniterStoreError)
      expect(error.name).toBe('IgniterStoreError')
      expect(error.code).toBe('STORE_OPERATION_FAILED')
      expect(error.message).toBe('Operation failed')
      expect(error.statusCode).toBe(500) // Default
    })

    it('should create an error with all properties', () => {
      const cause = new Error('Original error')
      const error = new IgniterStoreError({
        code: 'STORE_GET_FAILED',
        message: 'Failed to get value',
        statusCode: 503,
        cause,
        details: { key: 'user:123' },
        metadata: { operation: 'get', key: 'user:123' },
      })

      expect(error.code).toBe('STORE_GET_FAILED')
      expect(error.statusCode).toBe(503)
      expect(error.cause).toBe(cause)
      expect(error.details).toEqual({ key: 'user:123' })
      expect(error.metadata).toEqual({
        operation: 'get',
        key: 'user:123',
      })
    })

    it('should include details when no cause is provided', () => {
      const error = new IgniterStoreError({
        code: 'STORE_SET_FAILED',
        message: 'Failed to set value',
        details: { error: 'Connection refused' },
      })

      expect(error.details).toEqual({ error: 'Connection refused' })
    })
  })

  describe('is()', () => {
    it('should return true for IgniterStoreError instances', () => {
      const error = new IgniterStoreError({
        code: 'STORE_ADAPTER_REQUIRED',
        message: 'Adapter required',
      })

      expect(IgniterStoreError.is(error)).toBe(true)
    })

    it('should return false for regular Error instances', () => {
      const error = new Error('Regular error')
      expect(IgniterStoreError.is(error)).toBe(false)
    })

    it('should return false for non-error values', () => {
      expect(IgniterStoreError.is(null)).toBe(false)
      expect(IgniterStoreError.is(undefined)).toBe(false)
      expect(IgniterStoreError.is('error')).toBe(false)
      expect(IgniterStoreError.is({})).toBe(false)
    })
  })

  describe('error codes', () => {
    it('should have all expected error codes', () => {
      const expectedCodes: IgniterStoreErrorCode[] = [
        'STORE_ADAPTER_REQUIRED',
        'STORE_SERVICE_REQUIRED',
        'STORE_ENVIRONMENT_REQUIRED',
        'STORE_CONFIGURATION_INVALID',
        'STORE_SCOPE_KEY_REQUIRED',
        'STORE_SCOPE_IDENTIFIER_REQUIRED',
        'STORE_SCOPE_INVALID',
        'STORE_KEY_REQUIRED',
        'STORE_VALUE_REQUIRED',
        'STORE_TTL_INVALID',
        'STORE_SCHEMA_VALIDATION_FAILED',
        'STORE_SCHEMA_CHANNEL_NOT_FOUND',
        'STORE_SERIALIZATION_FAILED',
        'STORE_DESERIALIZATION_FAILED',
        'STORE_OPERATION_FAILED',
        'STORE_GET_FAILED',
        'STORE_SET_FAILED',
        'STORE_DELETE_FAILED',
        'STORE_INCREMENT_FAILED',
        'STORE_PUBLISH_FAILED',
        'STORE_SUBSCRIBE_FAILED',
        'STORE_UNSUBSCRIBE_FAILED',
        'STORE_BATCH_FAILED',
        'STORE_BATCH_KEYS_REQUIRED',
        'STORE_BATCH_ENTRIES_REQUIRED',
        'STORE_CLAIM_FAILED',
        'STORE_STREAM_APPEND_FAILED',
        'STORE_STREAM_READ_FAILED',
        'STORE_STREAM_GROUP_CREATE_FAILED',
        'STORE_STREAM_ACK_FAILED',
        'STORE_STREAM_NAME_REQUIRED',
        'STORE_STREAM_GROUP_REQUIRED',
        'STORE_STREAM_CONSUMER_REQUIRED',
        'STORE_SCAN_FAILED',
        'STORE_SCAN_PATTERN_REQUIRED',
        'STORE_CONNECTION_FAILED',
        'STORE_NOT_CONNECTED',
      ]

      for (const code of expectedCodes) {
        expect(IGNITER_STORE_ERROR_CODES).toHaveProperty(code)
      }
    })
  })

  describe('toJSON', () => {
    it('should serialize error to JSON', () => {
      const error = new IgniterStoreError({
        code: 'STORE_OPERATION_FAILED',
        message: 'Test error',
        metadata: { key: 'test' },
      })

      const json = error.toJSON()

      expect(json).toHaveProperty('name', 'IgniterStoreError')
      expect(json).toHaveProperty('message', 'Test error')
      expect(json).toHaveProperty('code', 'STORE_OPERATION_FAILED')
    })
  })
})
