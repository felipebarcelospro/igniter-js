/**
 * @fileoverview Tests for IgniterConnectorManagerBuilder
 * @module @igniter-js/connectors/builders/main.builder.spec
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import { IgniterConnectorManagerBuilder } from './main.builder'
import { IgniterConnector } from './connector.builder'
import type { IgniterConnectorAdapter, IgniterConnectorRecord } from '../types/adapter'

// Mock adapter for testing
class MockAdapter implements IgniterConnectorAdapter {
  private records: Map<string, IgniterConnectorRecord> = new Map()

  private getKey(scope: string, identity: string, provider: string): string {
    return `${scope}:${identity}:${provider}`
  }

  async get(scope: string, identity: string, provider: string): Promise<IgniterConnectorRecord | null> {
    return this.records.get(this.getKey(scope, identity, provider)) || null
  }

  async list(scope: string, identity: string): Promise<IgniterConnectorRecord[]> {
    const prefix = `${scope}:${identity}:`
    return Array.from(this.records.values()).filter(r => 
      this.getKey(r.scope, r.identity, r.provider).startsWith(prefix)
    )
  }

  async upsert(
    scope: string, 
    identity: string, 
    provider: string, 
    data: { value?: Record<string, unknown>; enabled?: boolean }
  ): Promise<IgniterConnectorRecord> {
    const key = this.getKey(scope, identity, provider)
    const existing = this.records.get(key)
    const now = new Date()
    
    const record: IgniterConnectorRecord = {
      id: existing?.id || `id_${Date.now()}`,
      scope,
      identity,
      provider,
      value: data.value || existing?.value || {},
      enabled: data.enabled ?? existing?.enabled ?? true,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }
    
    this.records.set(key, record)
    return record
  }

  async update(
    scope: string, 
    identity: string, 
    provider: string, 
    data: { value?: Record<string, unknown>; enabled?: boolean }
  ): Promise<IgniterConnectorRecord> {
    return this.upsert(scope, identity, provider, data)
  }

  async delete(scope: string, identity: string, provider: string): Promise<void> {
    this.records.delete(this.getKey(scope, identity, provider))
  }

  save(scope: string, identity: string, provider: string, value: Record<string, unknown>, enabled: boolean): Promise<IgniterConnectorRecord> {
    return this.upsert(scope, identity, provider, { value, enabled })
  }

  countConnections(provider: string): Promise<number> {
    const count = Array.from(this.records.values()).filter(r => r.provider === provider).length
    return Promise.resolve(count)
  }

  exists(scope: string, identity: string, provider: string): Promise<boolean> {
    return Promise.resolve(this.records.has(this.getKey(scope, identity, provider)))
  }

  findByWebhookSecret(provider: string, secret: string): Promise<IgniterConnectorRecord | null> {
    for (const record of this.records.values()) {
      if (record.provider === provider && record.value?.webhookSecret === secret) {
        return Promise.resolve(record)
      }
    }
    return Promise.resolve(null)
  }

  updateWebhookMetadata(provider: string, secret: string, metadata: { lastEventAt: Date; lastEventResult: 'success' | 'error'; error?: string }): Promise<void> {
    for (const record of this.records.values()) {
      if (record.provider === provider && record.value?.webhookSecret === secret) {
        record.value = {
          ...record.value,
          webhookMetadata: {
            lastEventAt: metadata.lastEventAt,
            lastEventResult: metadata.lastEventResult,
            error: metadata.error,
          },
        }
        record.updatedAt = new Date()
        this.records.set(this.getKey(record.scope, record.identity, record.provider), record)
        break
      }
    }
    return Promise.resolve()
  }

  clear(): void {
    this.records.clear()
  }
}

// Test connector
const createTestConnector = () => {
  return IgniterConnector.create()
    .withConfig(z.object({
      apiKey: z.string(),
      baseUrl: z.string().optional(),
    }))
    .withMetadata(
      z.object({ name: z.string() }),
      { name: 'Test IgniterConnector' }
    )
    .addAction('testAction', {
      input: z.object({ data: z.string() }),
      handler: async ({ input }) => ({ result: input.data.toUpperCase() }),
    })
    .build()
}

describe('IgniterConnectorManagerBuilder', () => {
  let adapter: MockAdapter

  beforeEach(() => {
    adapter = new MockAdapter()
  })

  describe('create()', () => {
    it('should create a new builder instance', () => {
      const builder = IgniterConnectorManagerBuilder.create()
      expect(builder).toBeDefined()
    })
  })

  describe('withDatabase()', () => {
    it('should set the database adapter', () => {
      const builder = IgniterConnectorManagerBuilder.create()
        .withDatabase(adapter)
      
      expect(builder).toBeDefined()
    })
  })

  describe('withLogger()', () => {
    it('should set the logger', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      const builder = IgniterConnectorManagerBuilder.create()
        .withDatabase(adapter)
        .withLogger(logger)

      expect(builder).toBeDefined()
    })
  })

  describe('withEncrypt()', () => {
    it('should set encryption fields', () => {
      const builder = IgniterConnectorManagerBuilder.create()
        .withDatabase(adapter)
        .withEncrypt(['apiKey', 'accessToken', 'refreshToken'])

      expect(builder).toBeDefined()
    })

    it('should accept custom encryption functions', () => {
      const encrypt = vi.fn().mockImplementation((v: string) => `enc:${v}`)
      const decrypt = vi.fn().mockImplementation((v: string) => v.replace('enc:', ''))

      const builder = IgniterConnectorManagerBuilder.create()
        .withDatabase(adapter)
        .withEncrypt(['apiKey'], { encrypt, decrypt })

      expect(builder).toBeDefined()
    })
  })

  describe('addScope()', () => {
    it('should add a required scope', () => {
      const builder = IgniterConnectorManagerBuilder.create()
        .withDatabase(adapter)
        .addScope('organization', { required: true })

      expect(builder).toBeDefined()
    })

    it('should add an optional scope', () => {
      const builder = IgniterConnectorManagerBuilder.create()
        .withDatabase(adapter)
        .addScope('system', { required: false })

      expect(builder).toBeDefined()
    })

    it('should add multiple scopes', () => {
      const builder = IgniterConnectorManagerBuilder.create()
        .withDatabase(adapter)
        .addScope('organization', { required: true })
        .addScope('user', { required: true })
        .addScope('system', { required: false })

      expect(builder).toBeDefined()
    })
  })

  describe('addConnector()', () => {
    it('should add a connector definition', () => {
      const connector = createTestConnector()

      const builder = IgniterConnectorManagerBuilder.create()
        .withDatabase(adapter)
        .addScope('organization', { required: true })
        .addConnector('test', connector)

      expect(builder).toBeDefined()
    })

    it('should add multiple connectors', () => {
      const connector1 = createTestConnector()
      const connector2 = IgniterConnector.create()
        .withConfig(z.object({ token: z.string() }))
        .build()

      const builder = IgniterConnectorManagerBuilder.create()
        .withDatabase(adapter)
        .addScope('organization', { required: true })
        .addConnector('first', connector1)
        .addConnector('second', connector2)

      expect(builder).toBeDefined()
    })
  })

  describe('onConnect()', () => {
    it('should set connect hook', () => {
      const onConnect = vi.fn()

      const builder = IgniterConnectorManagerBuilder.create()
        .withDatabase(adapter)
        .onConnect(onConnect)

      expect(builder).toBeDefined()
    })
  })

  describe('onDisconnect()', () => {
    it('should set disconnect hook', () => {
      const onDisconnect = vi.fn()

      const builder = IgniterConnectorManagerBuilder.create()
        .withDatabase(adapter)
        .onDisconnect(onDisconnect)

      expect(builder).toBeDefined()
    })
  })

  describe('onError()', () => {
    it('should set error hook', () => {
      const onError = vi.fn()

      const builder = IgniterConnectorManagerBuilder.create()
        .withDatabase(adapter)
        .onError(onError)

      expect(builder).toBeDefined()
    })
  })

  describe('build()', () => {
    it('should build a complete manager instance', () => {
      const connector = createTestConnector()

      const manager = IgniterConnectorManagerBuilder.create()
        .withDatabase(adapter)
        .addScope('organization', { required: true })
        .addConnector('test', connector)
        .build()

      expect(manager).toBeDefined()
      expect(typeof manager.scope).toBe('function')
    })

    it('should throw error when database adapter is not set', () => {
      const connector = createTestConnector()

      expect(() => {
        IgniterConnectorManagerBuilder.create()
          .addScope('organization', { required: true })
          .addConnector('test', connector)
          .build()
      }).toThrow()
    })

    it('should build with all configurations', () => {
      const connector = createTestConnector()
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      const manager = IgniterConnectorManagerBuilder.create()
        .withDatabase(adapter)
        .withLogger(logger)
        .withEncrypt(['apiKey', 'accessToken'])
        .addScope('organization', { required: true })
        .addScope('user', { required: true })
        .addConnector('test', connector)
        .onConnect(vi.fn())
        .onDisconnect(vi.fn())
        .onError(vi.fn())
        .build()

      expect(manager).toBeDefined()
    })
  })

  describe('complete workflow', () => {
    it('should create a functional manager', () => {
      const connector = IgniterConnector.create()
        .withConfig(z.object({
          apiKey: z.string(),
          endpoint: z.string(),
        }))
        .withMetadata(
          z.object({ name: z.string(), category: z.string() }),
          { name: 'API IgniterConnector', category: 'utility' }
        )
        .addAction('fetch', {
          description: 'Fetch data from API',
          input: z.object({ path: z.string() }),
          output: z.object({ data: z.unknown() }),
          handler: async ({ input, config }) => {
            return { data: { path: input.path, endpoint: config.endpoint } }
          },
        })
        .build()

      const manager = IgniterConnectorManagerBuilder.create()
        .withDatabase(adapter)
        .withEncrypt(['apiKey'])
        .addScope('organization', { required: true })
        .addScope('project', { required: true })
        .addConnector('api', connector)
        .build()

      // Verify manager methods exist
      expect(typeof manager.scope).toBe('function')
      expect(typeof manager.handle).toBe('function')
      expect(typeof manager.getConnector).toBe('function')
      expect(typeof manager.getAdapter).toBe('function')
    })
  })
})
