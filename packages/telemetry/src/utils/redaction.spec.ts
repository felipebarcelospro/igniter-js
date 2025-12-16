/**
 * @fileoverview Tests for redaction utilities
 */

import { describe, it, expect } from 'vitest'
import { createRedactor, createSyncRedactor, redactEnvelope } from './redaction'
import type { TelemetryEnvelope } from '../types/envelope'

describe('createRedactor', () => {
  it('should return attributes unchanged with empty policy', async () => {
    const redactor = createRedactor({})
    const result = await redactor({
      key1: 'value1',
      key2: 123,
      key3: true,
    })

    expect(result).toEqual({
      key1: 'value1',
      key2: 123,
      key3: true,
    })
  })

  it('should remove denylisted keys', async () => {
    const redactor = createRedactor({
      denylistKeys: ['password', 'secret'],
    })

    const result = await redactor({
      username: 'john',
      password: 'secret123',
      secret: 'api-key',
      email: 'john@example.com',
    })

    expect(result).toEqual({
      username: 'john',
      email: 'john@example.com',
    })
  })

  it('should match denylisted keys case-insensitively', async () => {
    const redactor = createRedactor({
      denylistKeys: ['password'],
    })

    const result = await redactor({
      Password: 'secret123',
      username: 'john',
    })

    // Note: key matching is case-insensitive
    expect(result).toEqual({
      username: 'john',
    })
  })

  it('should handle null values', async () => {
    const redactor = createRedactor({})
    const result = await redactor({
      key1: 'value',
      key2: null,
    })

    expect(result).toEqual({
      key1: 'value',
      key2: null,
    })
  })

  it('should truncate long strings', async () => {
    const redactor = createRedactor({
      maxStringLength: 10,
    })

    const result = await redactor({
      short: 'hello',
      long: 'this is a very long string that should be truncated',
    })

    expect(result.short).toBe('hello')
    expect(result.long).toBe('this is a ...[truncated]')
  })

  it('should hash specified keys', async () => {
    const redactor = createRedactor({
      hashKeys: ['email'],
    })

    const result = await redactor({
      username: 'john',
      email: 'john@example.com',
    })

    expect(result.username).toBe('john')
    expect(result.email).toMatch(/^(sha256:|hash:)/)
    expect(result.email).not.toBe('john@example.com')
  })

  it('should apply all policies together', async () => {
    const redactor = createRedactor({
      denylistKeys: ['password'],
      hashKeys: ['email'],
      maxStringLength: 20,
    })

    const result = await redactor({
      username: 'john',
      password: 'secret',
      email: 'john@example.com',
      bio: 'This is a very long biography that exceeds the limit',
    })

    expect(result.password).toBeUndefined()
    expect(result.email).toMatch(/^(sha256:|hash:)/)
    expect(result.bio).toContain('...[truncated]')
    expect(result.username).toBe('john')
  })
})

describe('createSyncRedactor', () => {
  it('should work synchronously', () => {
    const redactor = createSyncRedactor({
      denylistKeys: ['password'],
    })

    const result = redactor({
      username: 'john',
      password: 'secret',
    })

    expect(result).toEqual({
      username: 'john',
    })
  })

  it('should hash values synchronously', () => {
    const redactor = createSyncRedactor({
      hashKeys: ['ip'],
    })

    const result = redactor({
      ip: '192.168.1.1',
    })

    expect(result.ip).toMatch(/^hash:/)
  })
})

describe('redactEnvelope', () => {
  it('should redact attributes in an envelope', async () => {
    const envelope: TelemetryEnvelope = {
      name: 'user.login',
      time: new Date().toISOString(),
      level: 'info',
      service: 'my-api',
      environment: 'test',
      sessionId: 'ses_123',
      attributes: {
        'ctx.user.id': 'usr_123',
        'ctx.user.password': 'secret',
      },
    }

    const redacted = await redactEnvelope(envelope, {
      denylistKeys: ['password'],
    })

    expect(redacted.attributes).toEqual({
      'ctx.user.id': 'usr_123',
    })
  })

  it('should return envelope unchanged if no attributes', async () => {
    const envelope: TelemetryEnvelope = {
      name: 'test',
      time: new Date().toISOString(),
      level: 'info',
      service: 'test',
      environment: 'test',
      sessionId: 'ses_123',
    }

    const redacted = await redactEnvelope(envelope)
    expect(redacted).toEqual(envelope)
  })
})
