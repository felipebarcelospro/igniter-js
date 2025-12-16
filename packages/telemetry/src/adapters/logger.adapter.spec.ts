/**
 * @fileoverview Tests for LoggerTransportAdapter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LoggerTransportAdapter } from './logger.adapter'
import type { TelemetryEnvelope } from '../types/envelope'

describe('LoggerTransportAdapter', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>
    debug: ReturnType<typeof vi.spyOn>
    info: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const createEnvelope = (overrides: Partial<TelemetryEnvelope> = {}): TelemetryEnvelope => ({
    name: 'test.event',
    time: '2025-01-01T00:00:00.000Z',
    level: 'info',
    service: 'test-service',
    environment: 'test',
    sessionId: 'ses_test_123',
    ...overrides,
  })

  describe('create()', () => {
    it('should create adapter with default config', () => {
      const adapter = LoggerTransportAdapter.create({ logger: console })
      expect(adapter).toBeInstanceOf(LoggerTransportAdapter)
      expect(adapter.type).toBe('logger')
    })
  })

  describe('handle()', () => {
    it('should log to console.debug for debug level', () => {
      const adapter = LoggerTransportAdapter.create({ logger: console })
      adapter.handle(createEnvelope({ level: 'debug' }))

      expect(consoleSpy.debug).toHaveBeenCalled()
    })

    it('should log to console.info for info level', () => {
      const adapter = LoggerTransportAdapter.create({ logger: console })
      adapter.handle(createEnvelope({ level: 'info' }))

      expect(consoleSpy.info).toHaveBeenCalled()
    })

    it('should log to console.warn for warn level', () => {
      const adapter = LoggerTransportAdapter.create({ logger: console })
      adapter.handle(createEnvelope({ level: 'warn' }))

      expect(consoleSpy.warn).toHaveBeenCalled()
    })

    it('should log to console.error for error level', () => {
      const adapter = LoggerTransportAdapter.create({ logger: console })
      adapter.handle(createEnvelope({ level: 'error' }))

      expect(consoleSpy.error).toHaveBeenCalled()
    })

    it('should respect minLevel option', () => {
      const adapter = LoggerTransportAdapter.create({
        logger: console,
        minLevel: 'warn',
      })

      adapter.handle(createEnvelope({ level: 'debug' }))
      adapter.handle(createEnvelope({ level: 'info' }))
      adapter.handle(createEnvelope({ level: 'warn' }))
      adapter.handle(createEnvelope({ level: 'error' }))

      expect(consoleSpy.debug).not.toHaveBeenCalled()
      expect(consoleSpy.info).not.toHaveBeenCalled()
      expect(consoleSpy.warn).toHaveBeenCalled()
      expect(consoleSpy.error).toHaveBeenCalled()
    })

    it('should output JSON by default', () => {
      const adapter = LoggerTransportAdapter.create({
        logger: console,
        format: 'json',
      })

      adapter.handle(createEnvelope())

      expect(consoleSpy.info).toHaveBeenCalled()
      const output = consoleSpy.info.mock.calls[0][0]
      expect(() => JSON.parse(output as string)).not.toThrow()
    })

    it('should output pretty format when configured', () => {
      const adapter = LoggerTransportAdapter.create({
        logger: console,
        format: 'pretty',
      })

      adapter.handle(createEnvelope())

      expect(consoleSpy.info).toHaveBeenCalled()
      const output = consoleSpy.info.mock.calls[0][0]
      expect(output).toContain('test.event')
    })

    it('should include all envelope data in output', () => {
      const adapter = LoggerTransportAdapter.create({
        logger: console,
        format: 'json',
      })

      const envelope = createEnvelope({
        attributes: { 'ctx.user.id': 'user_123' },
        actor: { type: 'user', id: 'usr_456' },
      })

      adapter.handle(envelope)

      // @ts-expect-error -- accessing mock calls
      const output = JSON.parse(consoleSpy.info.mock.calls[0][0])
      expect(output.name).toBe('test.event')
      expect(output.attributes['ctx.user.id']).toBe('user_123')
      expect(output.actor.type).toBe('user')
    })
  })

  describe('flush()', () => {
    it('should resolve immediately', async () => {
      const adapter = LoggerTransportAdapter.create({ logger: console })
      await expect(adapter.flush()).resolves.toBeUndefined()
    })
  })

  describe('shutdown()', () => {
    it('should resolve immediately', async () => {
      const adapter = LoggerTransportAdapter.create({ logger: console })
      await expect(adapter.shutdown()).resolves.toBeUndefined()
    })
  })

  describe('custom logger', () => {
    it('should use custom logger if provided', () => {
      const customLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      const adapter = LoggerTransportAdapter.create({
        logger: customLogger as any,
      })

      adapter.handle(createEnvelope({ level: 'info' }))

      expect(customLogger.info).toHaveBeenCalled()
      expect(consoleSpy.info).not.toHaveBeenCalled()
    })
  })
})
