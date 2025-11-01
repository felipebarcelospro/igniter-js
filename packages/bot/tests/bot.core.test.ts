/**
 * Core Bot Tests
 * 
 * Validates essential bot functionality:
 * - Context helper methods (reply, session, etc.)
 * - Middleware context enrichment
 * - Command execution
 * - Session management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IgniterBot } from '../src/builder'
import { Bot } from '../src/bot.provider'
import type { BotContext } from '../src/types/bot.types'
import { memoryStore } from '../src/stores'

// Mock adapter for testing
const createMockAdapter = () => {
  const mockSend = vi.fn()
  const mockHandle = vi.fn()
  
  return {
    name: 'mock',
    parameters: {} as any,
    capabilities: {
      content: { text: true },
      actions: { edit: false, delete: false, react: false },
      features: {},
      limits: {},
    },
    async init() {},
    async send(params: any) {
      mockSend(params)
    },
    async handle(params: any) {
      return mockHandle(params)
    },
    mockSend,
    mockHandle,
  }
}

describe('Bot Core Functionality', () => {
  describe('Context Helper Methods', () => {
    it('should create context with all helper methods', async () => {
      const mockAdapter = createMockAdapter()
      
      // Mock adapter.handle to return a raw context
      mockAdapter.mockHandle.mockResolvedValue({
        event: 'message',
        provider: 'mock',
        channel: {
          id: 'channel-123',
          name: 'Test Channel',
          isGroup: false,
        },
        message: {
          id: 'msg-123',
          content: {
            type: 'text',
            content: 'Hello',
            raw: 'Hello',
          },
          attachments: [],
          author: {
            id: 'user-123',
            name: 'Test User',
            username: 'testuser',
          },
          isMentioned: false,
        },
      })

      const bot = IgniterBot
        .create()
        .withHandle('@test_bot')
        .withSessionStore(memoryStore())
        .addAdapter('mock', mockAdapter as any)
        .build()

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      await bot.handle('mock', request)

      // Verify that mockHandle was called
      expect(mockAdapter.mockHandle).toHaveBeenCalled()

      // The context should have helper methods
      // We can't directly test this without exposing internals,
      // but we can verify through command execution
    })

    it('should have reply method available in command handlers', async () => {
      const mockAdapter = createMockAdapter()
      const sendSpy = vi.fn()

      mockAdapter.mockHandle.mockResolvedValue({
        event: 'message',
        provider: 'mock',
        channel: {
          id: 'channel-123',
          name: 'Test Channel',
          isGroup: false,
        },
        message: {
          id: 'msg-123',
          content: {
            type: 'command',
            command: 'test',
            params: [],
            raw: '/test',
          },
          attachments: [],
          author: {
            id: 'user-123',
            name: 'Test User',
            username: 'testuser',
          },
          isMentioned: false,
        },
      })

      // Override send to capture calls
      const bot = IgniterBot
        .create()
        .withHandle('@test_bot')
        .withSessionStore(memoryStore())
        .addAdapter('mock', mockAdapter as any)
        .addCommand('test', {
          name: 'test',
          aliases: [],
          description: 'Test command',
          help: 'Use /test',
          async handle(ctx) {
            // Verify ctx.reply exists and works
            expect(typeof ctx.reply).toBe('function')
            await ctx.reply('Hello from test!')
          },
        })
        .build()

      // Mock the send method
      const originalSend = (bot as any).send.bind(bot)
      ;(bot as any).send = async (params: any) => {
        sendSpy(params)
        return originalSend(params)
      }

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      await bot.handle('mock', request)

      // Verify reply was called
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'mock',
          channel: 'channel-123',
          content: expect.objectContaining({
            type: 'text',
            content: 'Hello from test!',
          }),
        })
      )
    })

    it('should have session helper available in command handlers', async () => {
      const mockAdapter = createMockAdapter()

      mockAdapter.mockHandle.mockResolvedValue({
        event: 'message',
        provider: 'mock',
        channel: {
          id: 'channel-123',
          name: 'Test Channel',
          isGroup: false,
        },
        message: {
          id: 'msg-123',
          content: {
            type: 'command',
            command: 'session',
            params: [],
            raw: '/session',
          },
          attachments: [],
          author: {
            id: 'user-123',
            name: 'Test User',
            username: 'testuser',
          },
          isMentioned: false,
        },
      })

      const bot = IgniterBot
        .create()
        .withHandle('@test_bot')
        .withSessionStore(memoryStore())
        .addAdapter('mock', mockAdapter as any)
        .addCommand('session', {
          name: 'session',
          aliases: [],
          description: 'Test session',
          help: 'Use /session',
          async handle(ctx) {
            // Verify ctx.session exists
            expect(ctx.session).toBeDefined()
            expect(ctx.session.userId).toBe('user-123')
            expect(ctx.session.channelId).toBe('channel-123')
            expect(typeof ctx.session.save).toBe('function')
            expect(typeof ctx.session.update).toBe('function')
            expect(typeof ctx.session.delete).toBe('function')

            // Test session update
            await ctx.session.update({ test: 'value' })
            expect(ctx.session.data.test).toBe('value')
          },
        })
        .build()

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      await bot.handle('mock', request)
    })
  })

  describe('Middleware Context Enrichment', () => {
    it('should enrich context with middleware additions', async () => {
      const mockAdapter = createMockAdapter()

      mockAdapter.mockHandle.mockResolvedValue({
        event: 'message',
        provider: 'mock',
        channel: {
          id: 'channel-123',
          name: 'Test Channel',
          isGroup: false,
        },
        message: {
          id: 'msg-123',
          content: {
            type: 'command',
            command: 'test',
            params: [],
            raw: '/test',
          },
          attachments: [],
          author: {
            id: 'user-123',
            name: 'Test User',
            username: 'testuser',
          },
          isMentioned: false,
        },
      })

      const bot = IgniterBot
        .create()
        .withHandle('@test_bot')
        .withSessionStore(memoryStore())
        .addAdapter('mock', mockAdapter as any)
        .addMiddleware(async (ctx, next) => {
          await next()
          return { user: { id: 'user-123', name: 'Test User' } }
        })
        .addCommand('test', {
          name: 'test',
          aliases: [],
          description: 'Test command',
          help: 'Use /test',
          async handle(ctx) {
            // Verify enriched context
            expect((ctx as any).user).toBeDefined()
            expect((ctx as any).user.id).toBe('user-123')
            expect((ctx as any).user.name).toBe('Test User')
          },
        })
        .build()

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      await bot.handle('mock', request)
    })

    it('should chain multiple middlewares correctly', async () => {
      const mockAdapter = createMockAdapter()

      mockAdapter.mockHandle.mockResolvedValue({
        event: 'message',
        provider: 'mock',
        channel: {
          id: 'channel-123',
          name: 'Test Channel',
          isGroup: false,
        },
        message: {
          id: 'msg-123',
          content: {
            type: 'command',
            command: 'test',
            params: [],
            raw: '/test',
          },
          attachments: [],
          author: {
            id: 'user-123',
            name: 'Test User',
            username: 'testuser',
          },
          isMentioned: false,
        },
      })

      const bot = IgniterBot
        .create()
        .withHandle('@test_bot')
        .withSessionStore(memoryStore())
        .addAdapter('mock', mockAdapter as any)
        .addMiddleware(async (ctx, next) => {
          await next()
          return { user: { id: 'user-123' } }
        })
        .addMiddleware(async (ctx, next) => {
          // ctx.user should be available from previous middleware
          await next()
          return { tenant: { id: 'tenant-456' } }
        })
        .addCommand('test', {
          name: 'test',
          aliases: [],
          description: 'Test command',
          help: 'Use /test',
          async handle(ctx) {
            // Verify both enrichments
            expect((ctx as any).user).toBeDefined()
            expect((ctx as any).user.id).toBe('user-123')
            expect((ctx as any).tenant).toBeDefined()
            expect((ctx as any).tenant.id).toBe('tenant-456')
          },
        })
        .build()

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      await bot.handle('mock', request)
    })
  })

  describe('Session Management', () => {
    it('should persist session data across messages', async () => {
      const mockAdapter = createMockAdapter()
      const store = memoryStore()

      mockAdapter.mockHandle.mockResolvedValue({
        event: 'message',
        provider: 'mock',
        channel: {
          id: 'channel-123',
          name: 'Test Channel',
          isGroup: false,
        },
        message: {
          id: 'msg-123',
          content: {
            type: 'command',
            command: 'save',
            params: [],
            raw: '/save',
          },
          attachments: [],
          author: {
            id: 'user-123',
            name: 'Test User',
            username: 'testuser',
          },
          isMentioned: false,
        },
      })

      const bot = IgniterBot
        .create()
        .withHandle('@test_bot')
        .withSessionStore(store)
        .addAdapter('mock', mockAdapter as any)
        .addCommand('save', {
          name: 'save',
          aliases: [],
          description: 'Save session',
          help: 'Use /save',
          async handle(ctx) {
            await ctx.session.update({ counter: 1 })
            await ctx.session.save()
          },
        })
        .build()

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      await bot.handle('mock', request)

      // Verify session was saved
      const session = await store.get('user-123', 'channel-123')
      expect(session).toBeDefined()
      expect(session?.data.counter).toBe(1)
    })
  })
})


