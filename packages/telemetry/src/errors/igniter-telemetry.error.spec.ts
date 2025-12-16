/**
 * @fileoverview Tests for IgniterTelemetryError
 */

import { describe, it, expect } from 'vitest'
import { IgniterTelemetryError, IGNITER_TELEMETRY_ERROR_CODES } from './igniter-telemetry.error'

describe('IgniterTelemetryError', () => {
  describe('constructor', () => {
    it('should create an error with required fields', () => {
      const error = new IgniterTelemetryError({
        code: 'TELEMETRY_DUPLICATE_TRANSPORT',
        message: 'Transport type "logger" is already registered',
      })

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(IgniterTelemetryError)
      expect(error.name).toBe('IgniterTelemetryError')
      expect(error.code).toBe('TELEMETRY_DUPLICATE_TRANSPORT')
      expect(error.message).toBe('Transport type "logger" is already registered')
    })

    it('should create an error with all fields', () => {
      const error = new IgniterTelemetryError({
        code: 'TELEMETRY_TRANSPORT_FAILED',
        message: 'Failed to send event',
        statusCode: 500,
        details: { transportType: 'logger' },
        metadata: { eventName: 'user.login' },
      })

      expect(error.code).toBe('TELEMETRY_TRANSPORT_FAILED')
      expect(error.statusCode).toBe(500)
      expect(error.details).toEqual({ transportType: 'logger' })
      expect(error.metadata).toEqual({ eventName: 'user.login' })
    })
  })

  describe('is()', () => {
    it('should return true for IgniterTelemetryError instances', () => {
      const error = new IgniterTelemetryError({
        code: 'TELEMETRY_INVALID_EVENT_NAME',
        message: 'Invalid event name',
      })

      expect(IgniterTelemetryError.is(error)).toBe(true)
    })

    it('should return false for regular errors', () => {
      const error = new Error('Regular error')
      expect(IgniterTelemetryError.is(error)).toBe(false)
    })

    it('should return false for non-error values', () => {
      expect(IgniterTelemetryError.is(null)).toBe(false)
      expect(IgniterTelemetryError.is(undefined)).toBe(false)
      expect(IgniterTelemetryError.is('string')).toBe(false)
      expect(IgniterTelemetryError.is({})).toBe(false)
    })
  })

  describe('hasCode()', () => {
    it('should return true for matching code', () => {
      const error = new IgniterTelemetryError({
        code: 'TELEMETRY_UNKNOWN_EVENT',
        message: 'Unknown event',
      })

      expect(error.hasCode('TELEMETRY_UNKNOWN_EVENT')).toBe(true)
    })

    it('should return false for non-matching code', () => {
      const error = new IgniterTelemetryError({
        code: 'TELEMETRY_UNKNOWN_EVENT',
        message: 'Unknown event',
      })

      expect(error.hasCode('TELEMETRY_TRANSPORT_FAILED')).toBe(false)
    })
  })

  describe('error codes', () => {
    it('should have all expected error codes', () => {
      expect(IGNITER_TELEMETRY_ERROR_CODES.TELEMETRY_DUPLICATE_TRANSPORT).toBe('TELEMETRY_DUPLICATE_TRANSPORT')
      expect(IGNITER_TELEMETRY_ERROR_CODES.TELEMETRY_INVALID_TRANSPORT).toBe('TELEMETRY_INVALID_TRANSPORT')
      expect(IGNITER_TELEMETRY_ERROR_CODES.TELEMETRY_TRANSPORT_FAILED).toBe('TELEMETRY_TRANSPORT_FAILED')
      expect(IGNITER_TELEMETRY_ERROR_CODES.TELEMETRY_INVALID_EVENT_NAME).toBe('TELEMETRY_INVALID_EVENT_NAME')
      expect(IGNITER_TELEMETRY_ERROR_CODES.TELEMETRY_UNKNOWN_EVENT).toBe('TELEMETRY_UNKNOWN_EVENT')
      expect(IGNITER_TELEMETRY_ERROR_CODES.TELEMETRY_SCHEMA_VALIDATION_FAILED).toBe('TELEMETRY_SCHEMA_VALIDATION_FAILED')
    })
  })
})
