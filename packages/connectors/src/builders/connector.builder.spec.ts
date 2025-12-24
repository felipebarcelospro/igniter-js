/**
 * @fileoverview Tests for IgniterConnectorBuilder
 * @module @igniter-js/connectors/builders/connector.builder.spec
 */

import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { IgniterConnector } from './connector.builder'

describe('IgniterConnectorBuilder', () => {
  describe('create()', () => {
    it('should create a new builder instance', () => {
      const builder = IgniterConnector.create()
      expect(builder).toBeDefined()
    })
  })

  describe('withConfig()', () => {
    it('should set the configuration schema', () => {
      const configSchema = z.object({
        apiKey: z.string(),
        baseUrl: z.string().url(),
      })

      const connector = IgniterConnector.create()
        .withConfig(configSchema)
        .build()

      expect(connector.configSchema).toBe(configSchema)
    })
  })

  describe('withMetadata()', () => {
    it('should set metadata schema and value', () => {
      const metadataSchema = z.object({
        name: z.string(),
        icon: z.string(),
      })
      const metadataValue = {
        name: 'Test IgniterConnector',
        icon: 'test.svg',
      }

      const connector = IgniterConnector.create()
        .withConfig(z.object({ apiKey: z.string() }))
        .withMetadata(metadataSchema, metadataValue)
        .build()

      expect(connector.metadataSchema).toBe(metadataSchema)
      expect(connector.metadata).toEqual(metadataValue)
    })
  })

  describe('withDefaultConfig()', () => {
    it('should set default configuration', () => {
      const defaultConfig = {
        apiKey: 'default-key',
        baseUrl: 'https://api.example.com',
      }

      const connector = IgniterConnector.create()
        .withConfig(z.object({
          apiKey: z.string(),
          baseUrl: z.string(),
        }))
        .withDefaultConfig(defaultConfig)
        .build()

      expect(connector.defaultConfig).toEqual(defaultConfig)
    })
  })

  describe('withOAuth()', () => {
    it('should configure OAuth options', () => {
      const oauthOptions = {
        authorizationUrl: 'https://provider.com/oauth/authorize',
        tokenUrl: 'https://provider.com/oauth/token',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        scopes: ['read', 'write'],
      }

      const connector = IgniterConnector.create()
        .withConfig(z.object({ workspace: z.string() }))
        .withOAuth(oauthOptions)
        .build()

      expect(connector.oauth).toEqual(oauthOptions)
    })
  })

  describe('withWebhook()', () => {
    it('should configure webhook options', () => {
      const webhookHandler = vi.fn()
      const webhookSchema = z.object({
        type: z.string(),
        data: z.unknown(),
      })

      const connector = IgniterConnector.create()
        .withConfig(z.object({ webhookSecret: z.string() }))
        .withWebhook({
          description: 'Receive events',
          schema: webhookSchema,
          handler: webhookHandler,
        })
        .build()

      expect(connector.webhook).toBeDefined()
      expect(connector.webhook?.schema).toBe(webhookSchema)
      expect(connector.webhook?.description).toBe('Receive events')
    })
  })

  describe('addAction()', () => {
    it('should add a single action', () => {
      const handler = vi.fn().mockResolvedValue({ success: true })

      const connector = IgniterConnector.create()
        .withConfig(z.object({ apiKey: z.string() }))
        .addAction('sendMessage', {
          description: 'Send a message',
          input: z.object({ message: z.string() }),
          output: z.object({ success: z.boolean() }),
          handler,
        })
        .build()

      expect(connector.actions).toBeDefined()
      expect(connector.actions.sendMessage).toBeDefined()
      expect(connector.actions.sendMessage.description).toBe('Send a message')
      expect(connector.actions.sendMessage.handler).toBe(handler)
    })

    it('should add multiple actions', () => {
      const connector = IgniterConnector.create()
        .withConfig(z.object({ apiKey: z.string() }))
        .addAction('action1', {
          input: z.object({ data: z.string() }),
          handler: vi.fn(),
        })
        .addAction('action2', {
          input: z.object({ id: z.number() }),
          handler: vi.fn(),
        })
        .addAction('action3', {
          input: z.object({ flag: z.boolean() }),
          handler: vi.fn(),
        })
        .build()

      expect(Object.keys(connector.actions)).toHaveLength(3)
      expect(connector.actions.action1).toBeDefined()
      expect(connector.actions.action2).toBeDefined()
      expect(connector.actions.action3).toBeDefined()
    })

    it('should preserve action input schema', () => {
      const inputSchema = z.object({
        message: z.string().min(1).max(4096),
        priority: z.enum(['low', 'high']),
      })

      const connector = IgniterConnector.create()
        .withConfig(z.object({ apiKey: z.string() }))
        .addAction('send', {
          input: inputSchema,
          handler: vi.fn(),
        })
        .build()

      expect(connector.actions.send.input).toBe(inputSchema)
    })
  })

  describe('onContext()', () => {
    it('should set context hook', () => {
      const contextHook = vi.fn().mockResolvedValue({ client: {} })

      const connector = IgniterConnector.create()
        .withConfig(z.object({ apiUrl: z.string() }))
        .onContext(contextHook)
        .build()

      expect(connector.hooks?.onContext).toBe(contextHook)
    })
  })

  describe('onValidate()', () => {
    it('should set validation hook', () => {
      const validateHook = vi.fn().mockResolvedValue(undefined)

      const connector = IgniterConnector.create()
        .withConfig(z.object({ apiKey: z.string() }))
        .onValidate(validateHook)
        .build()

      expect(connector.hooks?.onValidate).toBe(validateHook)
    })
  })

  describe('build()', () => {
    it('should return a complete connector definition', () => {
      const connector = IgniterConnector.create()
        .withConfig(z.object({
          apiKey: z.string(),
          baseUrl: z.string(),
        }))
        .withMetadata(
          z.object({ name: z.string() }),
          { name: 'Test' }
        )
        .addAction('test', {
          input: z.object({ data: z.string() }),
          handler: vi.fn(),
        })
        .build()

      expect(connector).toHaveProperty('configSchema')
      expect(connector).toHaveProperty('metadataSchema')
      expect(connector).toHaveProperty('metadata')
      expect(connector).toHaveProperty('actions')
    })

    it('should return connector without optional fields', () => {
      const connector = IgniterConnector.create()
        .withConfig(z.object({ apiKey: z.string() }))
        .build()

      expect(connector.configSchema).toBeDefined()
      expect(connector.oauth).toBeUndefined()
      expect(connector.webhook).toBeUndefined()
      expect(connector.defaultConfig).toBeUndefined()
    })
  })

  describe('complete connector definition', () => {
    it('should build a full-featured connector', () => {
      const configSchema = z.object({
        botToken: z.string(),
        chatId: z.string(),
      })

      const connector = IgniterConnector.create()
        .withConfig(configSchema)
        .withMetadata(
          z.object({ name: z.string(), icon: z.string() }),
          { name: 'Telegram', icon: 'telegram.svg' }
        )
        .onContext(async ({ config }) => ({
          apiUrl: `https://api.telegram.org/bot${config.botToken}`,
        }))
        .onValidate(async ({ config }) => {
          if (!config.botToken.startsWith('bot')) {
            throw new Error('Invalid bot token format')
          }
        })
        .addAction('sendMessage', {
          description: 'Send a message to Telegram',
          input: z.object({
            text: z.string(),
            parseMode: z.enum(['HTML', 'Markdown']).optional(),
          }),
          output: z.object({
            messageId: z.number(),
          }),
          handler: async ({ input, config, context }) => {
            return { messageId: 12345 }
          },
        })
        .addAction('getUpdates', {
          input: z.object({ offset: z.number().optional() }),
          handler: async () => ({ updates: [] }),
        })
        .build()
        

      // Verify structure
      expect(connector.configSchema).toBe(configSchema)
      expect(connector.metadata?.name).toBe('Telegram')
      expect(connector.hooks?.onContext).toBeDefined()
      expect(connector.hooks?.onValidate).toBeDefined()
      expect(Object.keys(connector.actions)).toEqual(['sendMessage', 'getUpdates'])
    })
  })
})
