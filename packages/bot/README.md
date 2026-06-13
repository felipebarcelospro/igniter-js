# @igniter-js/bot

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/@igniter-js/bot.svg)](https://www.npmjs.com/package/@igniter-js/bot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)

**Type-safe, multi-platform bot framework for the Igniter.js ecosystem.**

Build sophisticated chatbots for **Telegram**, **WhatsApp**, **Discord**, and custom platforms with a clean fluent API, powerful middleware system, session management, and end-to-end TypeScript inference.

[Quick Start](#-quick-start) · [Adapters](#-adapters) · [API Reference](#-api-reference) · [Examples](#-real-world-examples) · [Troubleshooting](#-troubleshooting)

</div>

> **Status:** Alpha — API is stabilizing. Breaking changes are minimized but may occur before v1.0.0.

---

## ✨ Why @igniter-js/bot?

Building chatbots across multiple platforms shouldn't mean learning a different API for each one. @igniter-js/bot gives you:

- ✅ **Unified API** — One builder, one context, one middleware pipeline. Telegram, WhatsApp, and Discord feel the same.
- ✅ **Type safety** — Zod-backed validation with full TypeScript inference. Catch errors at compile time, not runtime.
- ✅ **Middleware pipeline** — Express-like middleware for auth, rate-limiting, logging, and custom policies.
- ✅ **Session support** — Stateful conversation flows with pluggable stores (Memory, Redis-ready interface).
- ✅ **Capabilities-aware** — Adapters declare what they support. The framework validates before execution.
- ✅ **Framework-ready** — Dedicated route adapters for Next.js and TanStack Start.
- ✅ **Extensible** — Build custom adapters, middlewares, plugins, and session stores.
- ✅ **Tree-shakeable** — Zero runtime overhead for unused features.

---

## 📦 Installation

```bash
npm install @igniter-js/bot zod
# or
pnpm add @igniter-js/bot zod
# or
yarn add @igniter-js/bot zod
# or
bun add @igniter-js/bot zod
```

**Requirements:** Node.js >= 18, TypeScript >= 5.0, Zod >= 3.0

### Import Paths

The package supports organized imports for better tree-shaking and code clarity:

```typescript
// Main entry — everything in one import
import { IgniterBot, telegram, memoryStore } from '@igniter-js/bot'

// Organized imports — recommended for larger projects
import { telegram, whatsapp, discord } from '@igniter-js/bot/adapters'
import { rateLimitMiddleware, authMiddleware, loggingMiddleware } from '@igniter-js/bot/middlewares'
import { analyticsPlugin } from '@igniter-js/bot/plugins'
import { memoryStore } from '@igniter-js/bot/stores'
import type { BotContext, BotCommand } from '@igniter-js/bot/types'
```

---

## 🚀 Quick Start

Create your first bot in under 60 seconds:

```typescript
import { IgniterBot, telegram } from '@igniter-js/bot'

const bot = IgniterBot
  .create()
  .withHandle('@mybot')
  .addAdapter('telegram', telegram({
    token: process.env.TELEGRAM_TOKEN!,
  }))
  .addCommand('start', {
    name: 'start',
    aliases: ['hello'],
    description: 'Greets the user',
    help: 'Use /start to begin',
    async handle(ctx) {
      await ctx.reply('👋 Welcome! I am your bot.')
    }
  })
  .build()

// Initialize adapters (register webhooks, commands)
await bot.start()

// Use in a Next.js API route
export async function POST(req: Request) {
  return bot.handle('telegram')(req)
}
```

✅ **Success check:** Your bot now responds to `/start` on Telegram.

---

## 🧱 Core Concepts

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    IgniterBotBuilder                     │
│  .create() → .withHandle() → .addAdapter() → .build()  │
└──────────────────────┬──────────────────────────────────┘
                       │ build()
                       ▼
┌─────────────────────────────────────────────────────────┐
│                      Bot Instance                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Telegram │  │ WhatsApp │  │ Discord  │  ...adapters │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
│       └──────────────┼──────────────┘                    │
│                      ▼                                   │
│           ┌──────────────────┐                          │
│           │ Middleware Chain │  auth → rate-limit → log │
│           └────────┬─────────┘                          │
│                    ▼                                     │
│           ┌──────────────────┐                          │
│           │ Command Handler  │  /start, /help, /admin   │
│           └────────┬─────────┘                          │
│                    ▼                                     │
│           ┌──────────────────┐                          │
│           │  Session Store   │  Memory / Custom         │
│           └──────────────────┘                          │
└─────────────────────────────────────────────────────────┘
```

### Key Abstractions

| Concept | Description |
|---------|-------------|
| **Builder** | Fluent API for configuring your bot (adapters, commands, middlewares, plugins) |
| **Adapter** | Platform-specific implementation (Telegram Bot API, WhatsApp Cloud API, Discord API) |
| **Middleware** | Function `(ctx, next) => Promise<void>` that processes every request |
| **Command** | Named handler triggered by `/command` messages, with optional Zod validation |
| **Session** | Per-user, per-channel state persisted across messages |
| **Plugin** | Reusable package of commands, middlewares, adapters, and hooks |
| **Context** | Rich object passed through the pipeline with helpers: `ctx.reply()`, `ctx.session`, etc. |

---

## 🛠 Builder API

### Configuration

```typescript
const bot = IgniterBot
  .create()
  .withHandle('@mybot')              // Sets handle; auto-derives id='mybot', name='Mybot'
  .withId('custom-id')               // Optional: override auto-derived ID
  .withName('My Custom Bot')         // Optional: override auto-derived name
  .withLogger(console)               // Optional: structured logger (console, pino, winston)
  .withSessionStore(memoryStore())   // Optional: session storage (default: in-memory)
  .withOptions({                     // Optional: advanced configuration
    timeout: 30000,
    retries: 3,
    autoRegisterCommands: true,
    errorHandler: async (error, ctx) => {
      console.error('Bot error:', error.code, error.message)
    }
  })
```

**Handle inheritance:** When you call `.withHandle('@mybot')`, the `id` and `name` are auto-derived from the handle. Each adapter inherits the global handle but can override it per platform.

### Adding Adapters

```typescript
// Single adapter
.addAdapter('telegram', telegram({
  token: process.env.TELEGRAM_TOKEN!,
  // handle inherits from bot-level .withHandle()
}))

// Multiple adapters at once
.addAdapters({
  telegram: telegram({ token: process.env.TELEGRAM_TOKEN! }),
  whatsapp: whatsapp({ token: process.env.WHATSAPP_TOKEN!, phone: process.env.WHATSAPP_PHONE! }),
  discord: discord({ token: process.env.DISCORD_TOKEN!, applicationId: process.env.DISCORD_APP_ID! })
})

// Override handle for a specific platform
.addAdapter('telegram', telegram({
  token: '...',
  handle: '@custom_telegram_handle'  // Platform-specific override
}))
```

### Adding Commands

```typescript
// Simple command
.addCommand('ping', {
  name: 'ping',
  aliases: ['pong'],
  description: 'Check if bot is alive',
  help: 'Use /ping to test connectivity',
  async handle(ctx) {
    await ctx.reply('🏓 Pong!')
  }
})

// Command with Zod validation — fully typed args
.addCommand('ban', {
  name: 'ban',
  description: 'Ban a user',
  help: 'Use /ban <userId> [reason]',
  args: z.object({
    userId: z.string(),
    reason: z.string().optional()
  }),
  async handle(ctx, args) {
    // args is fully typed: { userId: string; reason?: string }
    await banUser(args.userId, args.reason)
    await ctx.reply(`Banned ${args.userId}: ${args.reason || 'No reason given'}`)
  }
})

// Command with subcommands
.addCommand('config', {
  name: 'config',
  description: 'Bot configuration',
  subcommands: {
    set: {
      args: z.object({ key: z.string(), value: z.string() }),
      async handle(ctx, args) {
        await setConfig(args.key, args.value)
        await ctx.reply(`Set ${args.key} = ${args.value}`)
      }
    },
    get: {
      args: z.object({ key: z.string() }),
      async handle(ctx, args) {
        const value = await getConfig(args.key)
        await ctx.reply(`${args.key}: ${value}`)
      }
    }
  }
})

// Bulk registration
.addCommands({
  start: { name: 'start', /* ... */ },
  help: { name: 'help', /* ... */ },
  about: { name: 'about', /* ... */ }
})

// Prefixed command groups
.addCommandGroup('admin', {
  ban: { name: 'ban', /* ... */ },   // Registered as 'admin_ban'
  kick: { name: 'kick', /* ... */ }  // Registered as 'admin_kick'
})
```

### Event Handlers

```typescript
.onMessage(async (ctx) => {
  console.log(`Message from ${ctx.message.author.username}`)
})

.onError(async (ctx) => {
  console.error('Bot error:', (ctx as any).error?.message)
})

.onStart(async () => {
  console.log('Bot is online!')
})

// Note: onCommand is stored but not auto-emitted by process() yet.
// Use bot.emit('command', ctx) to trigger manually.
.onCommand(async (ctx) => {
  console.log('Command executed')
})
```

### Building

```typescript
const bot = IgniterBot
  .create()
  // ... configuration ...
  .build()  // Returns a Bot instance

// Start all adapters
await bot.start()
```

---

## 🌐 Adapters

### Telegram

Full-featured Telegram Bot API adapter with webhook and long-polling support:

```typescript
import { telegram } from '@igniter-js/bot/adapters'

// Minimal — uses global bot handle
telegram({ token: 'your_bot_token' })

// With webhook
telegram({
  token: 'your_bot_token',
  webhook: {
    url: 'https://example.com/api/telegram',
    secret: 'webhook_secret_token'
  }
})

// Override handle
telegram({
  token: 'your_bot_token',
  handle: '@custom_telegram_bot'
})
```

**Capabilities:**
- ✅ Text, images, videos, audio, documents, stickers
- ✅ Locations, contacts, polls
- ✅ Interactive buttons and inline keyboards
- ✅ Edit and delete messages
- ✅ Webhooks and long polling
- ✅ Slash commands
- **Limits:** 4,096 chars, 50 MB files, 8 buttons per message

### WhatsApp

WhatsApp Cloud API adapter:

```typescript
import { whatsapp } from '@igniter-js/bot/adapters'

// Minimal — uses global bot handle
whatsapp({ token: 'your_token', phone: 'phone_number_id' })

// Override handle (WhatsApp uses keywords, not @handles)
whatsapp({
  token: 'your_token',
  phone: 'phone_number_id',
  handle: 'custom_keyword'
})
```

**Capabilities:**
- ✅ Text, images, videos, audio, documents
- ✅ Locations, contacts
- ✅ Interactive buttons and lists
- ✅ Message reactions
- ❌ No edit/delete via API
- **Limits:** 4,096 chars, 100 MB files, 3 buttons per message

### Discord

Discord Interactions API adapter with slash commands:

```typescript
import { discord } from '@igniter-js/bot/adapters'

discord({
  token: 'your_token',
  applicationId: 'your_app_id',
  publicKey: 'your_public_key'  // Recommended for Ed25519 signature verification
})
```

**Capabilities:**
- ✅ Text, images, videos, audio, documents
- ✅ Interactive buttons and message components
- ✅ Edit and delete messages
- ✅ Message reactions
- ✅ Slash commands (APPLICATION_COMMAND)
- ✅ Message components (MESSAGE_COMPONENT — button clicks)
- ✅ Ed25519 signature verification
- ❌ No stickers, location, contact, or polls via API
- **Limits:** 2,000 chars, 25 MB files (100 MB for verified bots), 5 buttons per row

### Creating Custom Adapters

```typescript
import { Bot, BotError, BotErrorCodes } from '@igniter-js/bot'
import { z } from 'zod'

const myAdapter = Bot.adapter({
  name: 'my-platform',
  parameters: z.object({
    token: z.string(),
    handle: z.string().optional(),
  }),
  capabilities: {
    content: {
      text: true, image: false, video: false, audio: false,
      document: false, sticker: false, location: false,
      contact: false, poll: false, interactive: false,
    },
    actions: { edit: false, delete: false, react: false, pin: false, thread: false },
    features: { webhooks: true, longPolling: false, commands: false,
      mentions: false, groups: false, channels: false, users: false, files: false },
    limits: { maxMessageLength: 2000, maxFileSize: 5 * 1024 * 1024, maxButtonsPerMessage: 0 },
  },
  async init({ client, config, commands, logger }) {
    logger?.info?.('Adapter initialized')
  },
  async handle({ request, config, logger, client }) {
    const body = await request.json()
    return {
      event: 'message',
      provider: 'my-platform',
      channel: { id: body.channelId, name: body.channelId, isGroup: false },
      message: {
        id: body.messageId,
        content: { type: 'text', content: body.text, raw: body.text },
        author: { id: body.userId, name: body.userName, username: body.username },
        isMentioned: true,
      },
    }
  },
  async sendText({ client, channel, text, options, config, logger }) {
    if (!client) throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED)
    await client.post('/send', { channel, text })
  },
})
```

---

## ⚙️ Middlewares

### Rate Limiting

```typescript
import { rateLimitMiddleware, rateLimitPresets } from '@igniter-js/bot/middlewares'

// Custom configuration
.addMiddleware(rateLimitMiddleware({
  maxRequests: 10,
  windowMs: 60000,  // 1 minute
  message: 'Too many requests. Please try again later.',
  skip: (ctx) => isAdmin(ctx.message.author.id)
}))

// Pre-built presets
.addMiddleware(rateLimitPresets.strict())     // 5 req/min
.addMiddleware(rateLimitPresets.moderate())   // 10 req/min
.addMiddleware(rateLimitPresets.lenient())    // 20 req/min
.addMiddleware(rateLimitPresets.perCommand()) // 3 req/10s per command
```

### Authentication

```typescript
import { authMiddleware, authPresets, roleMiddleware } from '@igniter-js/bot/middlewares'

// Whitelist specific users
.addMiddleware(authMiddleware({
  allowedUsers: ['user123', 'user456'],
  unauthorizedMessage: 'You are not authorized to use this bot.'
}))

// Pre-built presets
.addMiddleware(authPresets.adminsOnly(['admin1', 'admin2']))
.addMiddleware(authPresets.privateOnly())     // No groups
.addMiddleware(authPresets.groupsOnly())      // Only groups
.addMiddleware(authPresets.whitelist(['user1', 'user2']))
.addMiddleware(authPresets.blacklist(['blocked1']))

// Role-based authorization
.addMiddleware(roleMiddleware({
  getRoles: async (userId) => {
    const user = await database.users.findById(userId)
    return user.roles  // e.g., ['admin', 'moderator']
  },
  requiredRoles: ['admin', 'moderator'],
  unauthorizedMessage: 'You need admin or moderator role.'
}))
```

### Logging

```typescript
import { loggingMiddleware, loggingPresets, commandLoggingMiddleware } from '@igniter-js/bot/middlewares'

// Standard logging
.addMiddleware(loggingMiddleware({
  logMessages: true,
  logCommands: true,
  logErrors: true,
  logMetrics: true,
  includeUserInfo: true,
  includeContent: false,  // Don't log PII
}))

// Pre-built presets
.addMiddleware(loggingPresets.minimal())     // Only errors
.addMiddleware(loggingPresets.standard())    // Messages, commands, errors
.addMiddleware(loggingPresets.verbose())     // Everything + metrics + content
.addMiddleware(loggingPresets.debug())       // JSON-formatted for troubleshooting
.addMiddleware(loggingPresets.production())  // Standard without user info

// Command-specific logging
.addMiddleware(commandLoggingMiddleware({
  logger: pinoLogger,
  includeParams: true
}))
```

### Custom Middleware

```typescript
import type { Middleware } from '@igniter-js/bot'

const translationMiddleware: Middleware = async (ctx, next) => {
  const lang = ctx.message.author.id.startsWith('BR') ? 'pt' : 'en'
  ;(ctx as any).lang = lang
  return next()
}

.addMiddleware(translationMiddleware)
```

---

## 🔌 Plugins

Plugins package commands, middlewares, and hooks into reusable modules:

```typescript
import { analyticsPlugin } from '@igniter-js/bot/plugins'

.usePlugin(analyticsPlugin({
  trackEvent: async (event, properties) => {
    await analyticsService.track(event, properties)
  },
  trackMessages: true,
  trackCommands: true,
  trackErrors: true,
  includeUserInfo: false,
}))
```

The analytics plugin automatically registers a `/stats` command showing message count, command count, error count, and unique users.

### Creating Custom Plugins

```typescript
import type { BotPlugin } from '@igniter-js/bot'

const welcomePlugin: BotPlugin = {
  name: 'welcome',
  version: '1.0.0',
  description: 'Sends welcome message to new members',

  middlewares: [
    async (ctx, next) => {
      if (ctx.event === 'message' && ctx.channel.isGroup) {
        console.log(`New message in group ${ctx.channel.name}`)
      }
      await next()
    }
  ],

  commands: {
    welcome: {
      name: 'welcome',
      aliases: [],
      description: 'Set welcome message',
      help: 'Use /welcome <message>',
      args: z.object({ message: z.string() }),
      async handle(ctx, args) {
        await saveWelcomeMessage(ctx.channel.id, args.message)
        await ctx.reply('Welcome message set!')
      }
    }
  },

  hooks: {
    onStart: async () => console.log('Welcome plugin ready'),
  }
}

.usePlugin(welcomePlugin)
```

---

## 💬 Context Helpers

The `BotContext` includes convenient helper methods for common operations:

```typescript
// Simple text reply
await ctx.reply('Hello!')

// Reply with interactive buttons
await ctx.replyWithButtons('Choose an option:', [
  { id: '1', label: 'Option A', action: 'callback', data: 'opt_a' },
  { id: '2', label: 'Option B', action: 'callback', data: 'opt_b' },
  { id: '3', label: 'Website', action: 'url', data: { url: 'https://example.com' } },
])

// Reply with inline keyboard (Telegram-style)
await ctx.replyWithButtons('Menu:', [], {
  parseMode: 'MarkdownV2'
})

// Reply with image
await ctx.replyWithImage('https://example.com/photo.jpg', 'Check this out!')

// Reply with document
await ctx.replyWithDocument(fileObject, 'Important document')

// Edit an existing message (if adapter supports it)
if (ctx.editMessage) {
  await ctx.editMessage('message_id', { type: 'text', content: 'Updated!' })
}

// Delete a message (if adapter supports it)
if (ctx.deleteMessage) {
  await ctx.deleteMessage('message_id')
}

// Show typing indicator
if (ctx.sendTyping) {
  await ctx.sendTyping()
  // Simulate processing...
  await ctx.reply('Here is your answer!')
}

// React to a message (if adapter supports it)
if (ctx.react) {
  await ctx.react('👍')
}
```

### Session Helpers

```typescript
// Access session data
const step = ctx.session.data.step || 0

// Update and persist
ctx.session.data.step = step + 1
await ctx.session.save()

// Partial update (merge)
await ctx.session.update({ lastCommand: 'start' })

// Delete session
await ctx.session.delete()
```

---

## 🔍 Capabilities System

Adapters declare their capabilities. Check support before using features:

```typescript
.addCommand('sendphoto', {
  name: 'sendphoto',
  async handle(ctx) {
    const adapter = ctx.bot.getAdapter?.(ctx.provider)

    if (!adapter?.capabilities.content.image) {
      await ctx.reply('❌ This platform does not support images.')
      return
    }

    await ctx.replyWithImage('https://example.com/photo.jpg')
  }
})
```

**Capability categories:**
- **content** — `text`, `image`, `video`, `audio`, `document`, `sticker`, `location`, `contact`, `poll`, `interactive`
- **actions** — `edit`, `delete`, `react`, `pin`, `thread`
- **features** — `webhooks`, `longPolling`, `commands`, `mentions`, `groups`, `channels`, `users`, `files`
- **limits** — `maxMessageLength`, `maxFileSize`, `maxButtonsPerMessage`

---

## 🏗 Framework Integration

### Next.js (App Router)

```typescript
// app/api/bots/[botId]/[adapter]/route.ts
import { nextRouteHandlerAdapter } from '@igniter-js/bot/adapters/nextjs'

const handlers = nextRouteHandlerAdapter({
  'my-bot': bot,
})

export const GET = handlers.GET
export const POST = handlers.POST
```

**Route pattern:** `/api/bots/my-bot/telegram`

### TanStack Start

```typescript
// app/routes/api/bots/$botId/$adapter.ts
import { tanstackStartRouteHandlerAdapter } from '@igniter-js/bot/adapters/tanstack-start'

const handlers = tanstackStartRouteHandlerAdapter({
  'my-bot': bot,
})

export const handler = handlers
```

### Express / Fastify / Hono

Use the raw handler directly:

```typescript
// Express
app.post('/api/telegram', async (req, res) => {
  const response = await bot.handle('telegram')(req)
  res.status(response.status).send(await response.text())
})

// Hono
app.post('/api/telegram', async (c) => {
  return bot.handle('telegram')(c.req.raw)
})
```

---

## 🧪 Testing

### Testing Commands

```typescript
import { describe, it, expect, vi } from 'vitest'

function createMockContext(overrides?: Partial<BotContext>): BotContext {
  return {
    event: 'message',
    provider: 'telegram',
    bot: {
      id: 'test-bot',
      name: 'Test Bot',
      send: vi.fn(),
      getAdapter: () => undefined,
      getAdapters: () => ({}),
    },
    channel: { id: 'ch1', name: 'test-chat', isGroup: false },
    message: {
      id: 'msg1',
      content: { type: 'text', content: '/start', raw: '/start' },
      author: { id: 'u1', name: 'Tester', username: 'tester' },
      isMentioned: false,
    },
    session: {
      userId: 'u1',
      channelId: 'ch1',
      data: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      save: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    reply: vi.fn(),
    replyWithButtons: vi.fn(),
    replyWithImage: vi.fn(),
    replyWithDocument: vi.fn(),
    ...overrides,
  }
}

it('start command replies with welcome', async () => {
  const ctx = createMockContext()
  const command = {
    name: 'start',
    aliases: [],
    description: 'Start',
    help: 'Use /start',
    async handle(ctx) { await ctx.reply('Welcome!') }
  }

  await command.handle(ctx)
  expect(ctx.reply).toHaveBeenCalledWith('Welcome!')
})
```

### Testing Middlewares

```typescript
it('rate limit blocks after max requests', async () => {
  const middleware = rateLimitMiddleware({
    maxRequests: 1,
    windowMs: 60000,
  })

  const ctx = createMockContext()
  ctx.reply = vi.fn()

  await middleware(ctx, vi.fn())  // First request passes
  await middleware(ctx, vi.fn())  // Second is blocked

  expect(ctx.reply).toHaveBeenCalledWith(
    expect.stringContaining('Rate limit')
  )
})
```

### Testing Adapters

```typescript
it('telegram adapter has correct capabilities', () => {
  const adapter = telegram({ token: 'test' })
  expect(adapter.name).toBe('telegram')
  expect(adapter.capabilities.content.text).toBe(true)
  expect(adapter.capabilities.content.image).toBe(true)
  expect(adapter.capabilities.limits.maxMessageLength).toBe(4096)
})
```

---

## 🌍 Real-World Examples

### 1. Multi-Platform Customer Support Bot

```typescript
const supportBot = IgniterBot
  .create()
  .withHandle('@support_bot')
  .addAdapters({
    telegram: telegram({ token: process.env.TELEGRAM_TOKEN! }),
    whatsapp: whatsapp({ token: process.env.WHATSAPP_TOKEN!, phone: process.env.WHATSAPP_PHONE! }),
  })
  .withSessionStore(memoryStore({ cleanupIntervalMs: 300000 }))
  .addMiddleware(loggingPresets.production())
  .addCommand('help', {
    name: 'help',
    aliases: ['support', 'faq'],
    description: 'Get help',
    help: 'Use /help for assistance',
    async handle(ctx) {
      await ctx.replyWithButtons('How can I help you?', [
        { id: 'order', label: '📦 Order Status', action: 'callback', data: 'help:order' },
        { id: 'refund', label: '💰 Refund', action: 'callback', data: 'help:refund' },
        { id: 'agent', label: '👤 Talk to Agent', action: 'callback', data: 'help:agent' },
      ])
    }
  })
  .build()
```

### 2. E-commerce Bot with Cart

```typescript
const shopBot = IgniterBot
  .create()
  .withHandle('@shop_bot')
  .addAdapter('telegram', telegram({ token: process.env.TELEGRAM_TOKEN! }))
  .withSessionStore(memoryStore())
  .addMiddleware(rateLimitMiddleware({ maxRequests: 20, windowMs: 60000 }))
  .addCommand('catalog', {
    name: 'catalog',
    description: 'Browse products',
    help: 'Use /catalog to see products',
    async handle(ctx) {
      const products = await getProducts()
      await ctx.replyWithButtons('🛍 Our Products:', products.map(p => ({
        id: p.id,
        label: `${p.name} — $${p.price}`,
        action: 'callback',
        data: `product:${p.id}`
      })))
    }
  })
  .addCommand('cart', {
    name: 'cart',
    description: 'View your cart',
    help: 'Use /cart to see items',
    async handle(ctx) {
      const cart = ctx.session.data.cart || []
      if (cart.length === 0) {
        await ctx.reply('Your cart is empty.')
        return
      }
      const total = cart.reduce((s: number, i: any) => s + i.price, 0)
      await ctx.reply(
        `🛒 Cart (${cart.length} items):\n${cart.map((i: any) => `- ${i.name}: $${i.price}`).join('\n')}\n\nTotal: $${total}`
      )
    }
  })
  .addCommand('checkout', {
    name: 'checkout',
    description: 'Complete your order',
    help: 'Use /checkout to pay',
    async handle(ctx) {
      const cart = ctx.session.data.cart || []
      if (cart.length === 0) {
        await ctx.reply('Nothing to checkout!')
        return
      }
      const orderId = await createOrder(ctx.message.author.id, cart)
      ctx.session.data.cart = []
      await ctx.session.save()
      await ctx.reply(`✅ Order #${orderId} placed! Total: $${cart.reduce((s: number, i: any) => s + i.price, 0)}`)
    }
  })
  .build()
```

### 3. Moderation Bot

```typescript
const modBot = IgniterBot
  .create()
  .withHandle('@mod_bot')
  .addAdapter('discord', discord({
    token: process.env.DISCORD_TOKEN!,
    applicationId: process.env.DISCORD_APP_ID!,
    publicKey: process.env.DISCORD_PUBLIC_KEY!,
  }))
  .addMiddleware(authMiddleware({
    checkFn: async (ctx) => {
      const roles = await getDiscordRoles(ctx.message.author.id)
      return roles.includes('moderator') || roles.includes('admin')
    },
    unauthorizedMessage: 'This command is for moderators only.'
  }))
  .addCommand('warn', {
    name: 'warn',
    description: 'Warn a user',
    help: 'Use /warn @user <reason>',
    args: z.object({ userId: z.string(), reason: z.string() }),
    async handle(ctx, args) {
      await addWarning(args.userId, args.reason, ctx.message.author.id)
      await ctx.reply(`⚠️ ${args.userId} warned: ${args.reason}`)
    }
  })
  .addCommand('clear', {
    name: 'clear',
    description: 'Clear recent messages',
    help: 'Use /clear <count>',
    args: z.object({ count: z.number().min(1).max(100) }),
    async handle(ctx, args) {
      await clearMessages(ctx.channel.id, args.count)
      await ctx.reply(`🧹 Cleared ${args.count} messages.`)
    }
  })
  .build()
```

### 4. Survey / Feedback Bot

```typescript
const surveyBot = IgniterBot
  .create()
  .withHandle('@survey_bot')
  .addAdapter('whatsapp', whatsapp({
    token: process.env.WHATSAPP_TOKEN!,
    phone: process.env.WHATSAPP_PHONE!,
  }))
  .withSessionStore(memoryStore())
  .addCommand('survey', {
    name: 'survey',
    description: 'Start a survey',
    help: 'Use /survey to begin',
    async handle(ctx) {
      const step = ctx.session.data.step || 0
      const answers = ctx.session.data.answers || {}

      switch (step) {
        case 0:
          await ctx.reply('Q1: How satisfied are you? (1-5)')
          ctx.session.data.step = 1
          break
        case 1: {
          const rating = parseInt(ctx.message.content?.content || '0')
          if (rating < 1 || rating > 5) {
            await ctx.reply('Please enter a number between 1 and 5.')
            return
          }
          answers.rating = rating
          ctx.session.data.answers = answers
          ctx.session.data.step = 2
          await ctx.reply('Q2: What can we improve?')
          break
        }
        case 2: {
          answers.feedback = ctx.message.content?.content || ''
          await saveSurveyResponse(ctx.message.author.id, answers)
          await ctx.reply('Thank you for your feedback! 🎉')
          await ctx.session.delete()
          return
        }
      }

      await ctx.session.save()
    }
  })
  .build()
```

### 5. Notifications Bot with Broadcast

```typescript
const notifyBot = IgniterBot
  .create()
  .withHandle('@notify_bot')
  .addAdapters({
    telegram: telegram({ token: process.env.TELEGRAM_TOKEN! }),
    whatsapp: whatsapp({ token: process.env.WHATSAPP_TOKEN!, phone: process.env.WHATSAPP_PHONE! }),
    discord: discord({ token: process.env.DISCORD_TOKEN!, applicationId: process.env.DISCORD_APP_ID! }),
  })
  .addMiddleware(authPresets.adminsOnly([process.env.ADMIN_ID!]))
  .addCommand('broadcast', {
    name: 'broadcast',
    description: 'Send message to all platforms',
    help: 'Use /broadcast <message>',
    args: z.object({ message: z.string().min(1) }),
    async handle(ctx, args) {
      const adapters = ctx.bot.getAdapters?.() || {}
      const results: string[] = []

      for (const [key] of Object.entries(adapters)) {
        try {
          await ctx.bot.send({
            provider: key,
            channel: ctx.channel.id,
            content: { type: 'text', content: `📢 Broadcast: ${args.message}` }
          })
          results.push(`✅ ${key}`)
        } catch (e) {
          results.push(`❌ ${key}: ${(e as Error).message}`)
        }
      }

      await ctx.reply(`Broadcast results:\n${results.join('\n')}`)
    }
  })
  .build()
```

---

## 📚 API Reference

### IgniterBotBuilder Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `create()` | `static create(): IgniterBotBuilder` | Create a new builder instance |
| `withHandle(handle)` | `(handle: string): this` | Set bot handle; auto-derives id and name |
| `withId(id)` | `(id: string): this` | Override auto-derived ID |
| `withName(name)` | `(name: string): this` | Override auto-derived name |
| `withLogger(logger)` | `(logger: BotLogger): this` | Configure structured logger |
| `withSessionStore(store)` | `(store: BotSessionStore): this` | Configure session storage |
| `withOptions(options)` | `(options: BotOptions): this` | Set timeouts, retries, error handler |
| `addAdapter(key, adapter)` | `(key: K, adapter: A): Builder<A, ...>` | Add single platform adapter |
| `addAdapters(adapters)` | `(adapters: A): Builder<A, ...>` | Add multiple adapters at once |
| `addCommand(name, cmd)` | `(name: K, cmd: C): Builder<..., C, ...>` | Register a command |
| `addCommands(commands)` | `(commands: C): Builder<..., C, ...>` | Register multiple commands |
| `addCommandGroup(prefix, cmds)` | `(prefix: string, cmds: C): Builder` | Register prefixed commands |
| `addMiddleware(mw)` | `(mw: Middleware): Builder<..., ..., extended>` | Add to pipeline |
| `addMiddlewares(mws)` | `(mws: Middleware[]): Builder` | Add multiple middlewares |
| `usePlugin(plugin)` | `(plugin: BotPlugin): this` | Load a plugin |
| `onMessage(handler)` | `(handler: BotEventHandler): this` | Message event listener |
| `onError(handler)` | `(handler: BotErrorHandler): this` | Error event listener |
| `onCommand(handler)` | `(handler: BotEventHandler): this` | Command event listener |
| `onStart(handler)` | `(handler: BotStartHandler): this` | Start lifecycle hook |
| `build()` | `(): Bot` | Create the bot instance |

### Bot Instance Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `start()` | `(): Promise<void>` | Initialize all adapters |
| `handle(provider)` | `(provider: string): (req: Request) => Promise<Response>` | Create HTTP handler for a provider |
| `send(params)` | `(params: BotSendParams): Promise<void>` | Send a message through an adapter |
| `registerAdapter(key, adapter)` | `(key: string, adapter: IBotAdapter): this` | Add adapter at runtime |
| `registerCommand(name, cmd)` | `(name: string, cmd: BotCommand): this` | Add command at runtime |
| `use(middleware)` | `(middleware: Middleware): this` | Add middleware at runtime |
| `on(event, callback)` | `(event: BotEvent, callback): void` | Subscribe to event |
| `emit(event, ctx)` | `(event: BotEvent, ctx: BotContext): Promise<void>` | Manually emit event |
| `onPreProcess(hook)` | `(hook: (ctx) => void): this` | Hook before middleware pipeline |
| `onPostProcess(hook)` | `(hook: (ctx) => void): this` | Hook after successful processing |

### Static Factory Methods (Bot)

| Method | Signature | Description |
|--------|-----------|-------------|
| `Bot.adapter(def)` | `(def: AdapterDefinition): (config?) => IBotAdapter` | Create an adapter factory |
| `Bot.command(cmd)` | `(cmd: BotCommand): BotCommand` | Validate command definition |
| `Bot.middleware(mw)` | `(mw: Middleware): Middleware` | Validate middleware function |

### BotOptions

```typescript
interface BotOptions {
  timeout?: number                          // Request timeout in ms
  retries?: number                          // Retry attempts for failed operations
  autoRegisterCommands?: boolean            // Auto-register commands with platforms
  errorHandler?: (error: BotError, context?: BotContext) => void | Promise<void>
}
```

### BotErrorCodes

| Code | Description |
|------|-------------|
| `CLIENT_NOT_PROVIDED` | Adapter client not available |
| `PROVIDER_NOT_FOUND` | No adapter registered for provider |
| `COMMAND_NOT_FOUND` | Command not found in registry |
| `INVALID_COMMAND_PARAMETERS` | Command args failed Zod validation |
| `ADAPTER_HANDLE_RETURNED_NULL` | Adapter.handle() returned null |
| `CONTENT_TYPE_NOT_SUPPORTED` | Platform doesn't support content type |
| `INVALID_CONTENT` | Content payload is invalid |

---

## ✅ Best Practices

### Do's

```typescript
// ✅ Use withHandle() to keep config DRY
const bot = IgniterBot
  .create()
  .withHandle('@mybot')  // id and name derived automatically
  .addAdapter('telegram', telegram({ token: '...' }))
  .addAdapter('whatsapp', whatsapp({ token: '...', phone: '...' }))
  .build()

// ✅ Use organized imports for clarity
import { telegram } from '@igniter-js/bot/adapters'
import { rateLimitMiddleware } from '@igniter-js/bot/middlewares'

// ✅ Use Zod schemas for type-safe command arguments
args: z.object({
  userId: z.string(),
  reason: z.string().optional().default('No reason given')
})

// ✅ Check capabilities before using platform-specific features
if (!adapter?.capabilities.content.interactive) {
  await ctx.reply('Buttons are not supported here.')
  return
}

// ✅ Use session for multi-step flows
ctx.session.data.step = 2
await ctx.session.save()

// ✅ Use middleware for cross-cutting concerns (auth, logging, rate limiting)
```

### Don'ts

```typescript
// ❌ Don't call .start() before .build()
await bot.start()  // Error if called on builder

// ❌ Don't repeat handle in every adapter if they share one
.addAdapter('telegram', telegram({ token: '...', handle: '@bot' }))
.addAdapter('whatsapp', whatsapp({ token: '...', phone: '...', handle: '@bot' }))
// Instead:
.withHandle('@bot')
.addAdapter('telegram', telegram({ token: '...' }))
.addAdapter('whatsapp', whatsapp({ token: '...', phone: '...' }))

// ❌ Don't store large objects in session.data
ctx.session.data.largeArray = new Array(100000)  // Memory leak risk

// ❌ Don't forget to call ctx.session.save() after modifying session data
ctx.session.data.cart = newCart  // Won't persist without save()

// ❌ Don't assume all adapters support all content types
// Always check capabilities or handle BotError with CONTENT_TYPE_NOT_SUPPORTED

// ❌ Don't use ctx.reply() for platform-specific features without checking
// ctx.editMessage?.(...) uses optional chaining for a reason
```

---

## 🔧 Troubleshooting

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| Bot doesn't respond | Webhook not configured | Check `webhook.url` in adapter config. Ensure the URL is publicly accessible. |
| `PROVIDER_NOT_FOUND` error | Adapter key mismatch | Verify `bot.handle('telegram')` matches the key used in `.addAdapter('telegram', ...)` |
| `CLIENT_NOT_PROVIDED` error | Missing adapter client | Ensure you passed required credentials (token, phone, etc.) and the client factory is defined |
| `CONTENT_TYPE_NOT_SUPPORTED` | Unsupported content type | Check `adapter.capabilities.content` before sending. Use `ctx.reply('text fallback')` instead of `ctx.replyWithImage(...)` on unsupported platforms |
| `COMMAND_NOT_FOUND` | Command not registered | Verify command name matches (case-insensitive). Check for typos in `.addCommand()` or that the plugin was loaded. |
| Session data not persisting | `ctx.session.save()` not called | Always call `await ctx.session.save()` after modifying `ctx.session.data`. |
| Rate limit not working across restarts | Using default in-memory store | Switch to a persistent store (Redis, database). The `MemoryRateLimitStore` is ephemeral. |
| Type inference breaks | Middleware chain type mismatch | Ensure `addMiddleware` types are consistent. Use `addMiddlewares([...])` for batch additions. |
| Webhook verification fails (Discord) | Missing or wrong `publicKey` | Pass `publicKey` in Discord adapter config. Discord requires Ed25519 signature verification. |
| Build fails with missing exports | Wrong import path | Use exact subpath exports: `@igniter-js/bot/adapters`, `@igniter-js/bot/middlewares`, etc. |

---

## 📝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup and guidelines.

---

## 📄 License

MIT © Felipe Barcelos
