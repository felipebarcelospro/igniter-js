/**
 * @fileoverview Tests for ID generation utilities
 */

import { describe, it, expect } from 'vitest'
import { generateSessionId, generateSpanId, generateTraceId, isValidSessionId } from './id'

describe('generateSessionId', () => {
  it('should generate a session ID with correct format', () => {
    const id = generateSessionId()
    expect(id).toMatch(/^ses_[a-z0-9]+_[a-f0-9]+$/i)
  })

  it('should generate unique IDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateSessionId())
    }
    expect(ids.size).toBe(100)
  })

  it('should start with "ses_" prefix', () => {
    const id = generateSessionId()
    expect(id.startsWith('ses_')).toBe(true)
  })
})

describe('generateSpanId', () => {
  it('should generate a 16-character hex string', () => {
    const id = generateSpanId()
    expect(id).toMatch(/^[a-f0-9]{16}$/i)
    expect(id.length).toBe(16)
  })

  it('should generate unique IDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateSpanId())
    }
    expect(ids.size).toBe(100)
  })
})

describe('generateTraceId', () => {
  it('should generate a 32-character hex string', () => {
    const id = generateTraceId()
    expect(id).toMatch(/^[a-f0-9]{32}$/i)
    expect(id.length).toBe(32)
  })

  it('should generate unique IDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateTraceId())
    }
    expect(ids.size).toBe(100)
  })
})

describe('isValidSessionId', () => {
  it('should return true for valid session IDs', () => {
    expect(isValidSessionId('ses_abc123_1a2b3c4d')).toBe(true)
    expect(isValidSessionId(generateSessionId())).toBe(true)
  })

  it('should return false for invalid session IDs', () => {
    expect(isValidSessionId('')).toBe(false)
    expect(isValidSessionId('invalid')).toBe(false)
    expect(isValidSessionId('session_123')).toBe(false)
    expect(isValidSessionId('ses_')).toBe(false)
  })

  it('should return false for non-string values', () => {
    expect(isValidSessionId(null as any)).toBe(false)
    expect(isValidSessionId(undefined as any)).toBe(false)
    expect(isValidSessionId(123 as any)).toBe(false)
  })
})
