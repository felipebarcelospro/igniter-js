import { describe, it, expect } from 'vitest'
import { IgniterTelemetryValidator } from './validator'
import { IgniterTelemetryError } from '../errors'

describe('IgniterTelemetryValidator', () => {
  describe('validate()', () => {
    it('should delegate to validateNamespace when context is Namespace', () => {
      expect(() => IgniterTelemetryValidator.validate('valid.namespace', 'Namespace')).not.toThrow()
      expect(() => IgniterTelemetryValidator.validate('invalid namespace', 'Namespace')).toThrow(IgniterTelemetryError)
    })

    it('should delegate to validateEventName when context is Event', () => {
      expect(() => IgniterTelemetryValidator.validate('valid_event', 'Event')).not.toThrow()
      expect(() => IgniterTelemetryValidator.validate('invalid:event', 'Event')).toThrow(IgniterTelemetryError)
    })

    it('should delegate to validateEventName when context is Group', () => {
      expect(() => IgniterTelemetryValidator.validate('valid_group', 'Group')).not.toThrow()
      expect(() => IgniterTelemetryValidator.validate('invalid group', 'Group')).toThrow(IgniterTelemetryError)
    })

    it('should throw for unknown validation context', () => {
      expect(() => IgniterTelemetryValidator.validate('any', 'UnknownContext')).toThrow(IgniterTelemetryError)
      try {
        IgniterTelemetryValidator.validate('any', 'UnknownContext')
      } catch (error: any) {
        expect(error.code).toBe('TELEMETRY_SCHEMA_VALIDATION_FAILED')
        expect(error.message).toContain('Unknown validation context "UnknownContext"')
      }
    })
  })

  describe('validateEventName()', () => {
    it('should allow valid event names', () => {
      const validNames = ['user_login', 'user.login', 'order-completed', 'v1_event']
      validNames.forEach(name => {
        expect(() => IgniterTelemetryValidator.validateEventName(name, 'Event')).not.toThrow()
      })
    })

    it('should throw for empty or non-string names', () => {
      // @ts-expect-error Testing invalid input
      expect(() => IgniterTelemetryValidator.validateEventName(null, 'Event')).toThrow('Event name must be a non-empty string')
      expect(() => IgniterTelemetryValidator.validateEventName('', 'Event')).toThrow('Event name must be a non-empty string')
    })

    it('should throw for names containing colons', () => {
      expect(() => IgniterTelemetryValidator.validateEventName('user:login', 'Event')).toThrow('cannot contain colons')
    })

    it('should throw for names containing spaces', () => {
      expect(() => IgniterTelemetryValidator.validateEventName('user login', 'Event')).toThrow('cannot contain spaces')
    })

    it('should throw for reserved prefixes', () => {
      expect(() => IgniterTelemetryValidator.validateEventName('__internal_event', 'Event')).toThrow('uses reserved prefix')
      expect(() => IgniterTelemetryValidator.validateEventName('__secret', 'Event')).toThrow('uses reserved prefix')
    })

    it('should be case-insensitive for reserved prefixes', () => {
      expect(() => IgniterTelemetryValidator.validateEventName('__INTERNAL_EVENT', 'Event')).toThrow('uses reserved prefix')
    })
  })

  describe('validateNamespace()', () => {
    it('should allow valid namespaces', () => {
      const validNamespaces = ['igniter.jobs', 'app.v1', 'core_services']
      validNamespaces.forEach(ns => {
        expect(() => IgniterTelemetryValidator.validateNamespace(ns)).not.toThrow()
      })
    })

    it('should throw for empty or non-string namespaces', () => {
      // @ts-expect-error Testing invalid input
      expect(() => IgniterTelemetryValidator.validateNamespace(null)).toThrow('Namespace must be a non-empty string')
      expect(() => IgniterTelemetryValidator.validateNamespace('')).toThrow('Namespace must be a non-empty string')
    })

    it('should throw for namespaces containing colons', () => {
      expect(() => IgniterTelemetryValidator.validateNamespace('app:v1')).toThrow('cannot contain colons')
    })

    it('should throw for namespaces containing spaces', () => {
      expect(() => IgniterTelemetryValidator.validateNamespace('my namespace')).toThrow('cannot contain spaces')
    })
  })
})
