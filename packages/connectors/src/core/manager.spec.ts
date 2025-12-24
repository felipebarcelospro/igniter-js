/**
 * @fileoverview Tests for IgniterConnectorManagerCore
 * @module @igniter-js/connectors/core/manager.spec
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import { IgniterConnectorManagerCore } from './manager'
import { IgniterConnectorMockAdapter } from '../adapters/mock.adapter'
import { IgniterConnector } from '../builders/connector.builder'
import type { IgniterConnectorManagerConfig } from '../types/manager'
import { IgniterConnectorError } from '../errors/connector.error'

// Mock telemetry
const mockTelemetry = {
  emit: vi.fn(),
}

// Test connector
const testConnector = IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .addAction('test', {
    input: z.object({ val: z.string() }),
    handler: async ({ input }) => ({ result: input.val }),
  })
  .build()

describe('IgniterConnectorManagerCore', () => {
  let adapter: IgniterConnectorMockAdapter
  let manager: IgniterConnectorManagerCore<any, any>

  beforeEach(() => {
    adapter = new IgniterConnectorMockAdapter()
    mockTelemetry.emit.mockClear()

    const config: IgniterConnectorManagerConfig = {
      adapter,
      telemetry: mockTelemetry as any,
      encryption: { fields: ['apiKey'] },
      scopes: new Map([['org', { key: 'org', required: true }]]),
      connectors: new Map([['test', testConnector]]),
      eventHandlers: [],
      hooks: {},
    }

    manager = new IgniterConnectorManagerCore(config)
  })

  describe('scope()', () => {
    it('should create a scoped instance', () => {
      const scoped = manager.scope('org', '123')
      expect(scoped).toBeDefined()
    })

    it('should throw if scope is not defined', () => {
      expect(() => manager.scope('invalid', '123')).toThrow(IgniterConnectorError)
    })

    it('should throw if identity is missing for required scope', () => {
      expect(() => manager.scope('org', '')).toThrow(IgniterConnectorError)
    })
  })

  describe('emit()', () => {
    it('should emit events to telemetry', async () => {
      await manager.emit({
        type: 'connector.connected',
        connector: 'test',
        scope: 'org',
        identity: '123',
        timestamp: new Date(),
      })

      expect(mockTelemetry.emit).toHaveBeenCalledWith(
        'igniter.connectors.connector.connected',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'ctx.connector.provider': 'test',
            'ctx.scope.type': 'org',
            'ctx.scope.identity': '123',
          }),
        })
      )
    })
  })

  describe('encryption', () => {
    it('should encrypt and decrypt values', async () => {
      // Mock env for crypto
      process.env.IGNITER_SECRET = '12345678901234567890123456789012'

      const original = 'secret-value'
      const encrypted = await manager.encrypt(original)
      expect(encrypted).not.toBe(original)
      expect(encrypted).toContain(':')

      const decrypted = await manager.decrypt(encrypted)
      expect(decrypted).toBe(original)
    })

    it('should encrypt config objects', async () => {
      process.env.IGNITER_SECRET = '12345678901234567890123456789012'

      const config = { apiKey: 'secret', other: 'public' }
      const encrypted = await manager.encryptConfig(config)

      expect(encrypted.apiKey).not.toBe('secret')
      expect(encrypted.other).toBe('public')

      const decrypted = await manager.decryptConfig(encrypted)
      expect(decrypted).toEqual(config)
    })
  })

  describe('handle()', () => {
    it('should handle webhook requests', async () => {
      // Setup: Create a connection with webhook secret
      const secret = 'test-secret'
      await adapter.save('org', '123', 'test', {
        apiKey: 'key',
        webhook: { secret },
      }, true)

      const req = new Request(`https://api.com/api/v1/connectors/test/webhook/${secret}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'ping' }),
      })

      // Mock connector with webhook support
      const webhookConnector = IgniterConnector.create()
        .withConfig(z.object({ apiKey: z.string() }))
        .withWebhook({
          schema: z.object({ event: z.string() }),
          // @ts-expect-error - Handler return type defaults to void but we return object for testing
          handler: async () => ({ received: true }),
        })
        .build()
      
      // Re-init manager with webhook connector
      const config: IgniterConnectorManagerConfig = {
        adapter,
        telemetry: mockTelemetry as any,
        encryption: { fields: [] },
        scopes: new Map([['org', { key: 'org', required: true }]]),
        connectors: new Map([['test', webhookConnector]]),
        eventHandlers: [],
        hooks: {},
      }
      manager = new IgniterConnectorManagerCore(config)

      const res = await manager.handle('webhook', req)
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ received: true })
    })

    it('should return 400 for invalid webhook URL', async () => {
      const req = new Request('https://api.com/invalid', { method: 'POST' })
      const res = await manager.handle('webhook', req)
      
      expect(res.status).toBe(400)
    })
  })
})
