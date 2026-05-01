# @igniter-js/bot

[![NPM Version](https://img.shields.io/npm/v/@igniter-js/bot.svg)](https://www.npmjs.com/package/@igniter-js/bot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, type-safe, multi-platform bot framework for the Igniter.js ecosystem. Build sophisticated chatbots for **Telegram**, **WhatsApp**, **Discord**, and other platforms with a clean, fluent API, powerful middleware system, session management, and extensive TypeScript support.

> **Status:** Alpha - API is stabilizing. Breaking changes are minimized but may occur before v1.0.0.

---

## Why @igniter-js/bot?

- ✅ **Unified API** — One builder for Telegram, WhatsApp, and Discord
- ✅ **Type safety** — Zod-backed validation with strong TypeScript types
- ✅ **Middleware pipeline** — Auth, rate-limit, logging, custom policies
- ✅ **Session support** — Stateful conversation flows with pluggable stores
- ✅ **Capabilities-aware** — Guard features by adapter support at runtime
- ✅ **Framework-ready** — Route adapters for Next.js and TanStack Start

## Table of Contents

- [Key Features](#key-features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Framework Integration](#framework-integration)
- [Builder Pattern API](#builder-pattern-api)
- [Adapters](#adapters)
- [Commands](#commands)
- [Session Management](#session-management)
- [Middlewares](#middlewares)
- [Plugins](#plugins)
- [Context Helpers](#context-helpers)
- [Capabilities System](#capabilities-system)
- [Examples](#examples)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Key Features

- 🎯 **Builder Pattern** - Fluent, chainable API inspired by modern frameworks
- 🚀 **Multi-Platform** - Telegram, WhatsApp, Discord, and more
- 🧩 **Type-Safe** - Full TypeScript support with end-to-end type inference
- ⚡ **Zod Validation** - Validate command arguments with Zod schemas
- 💾 **Session Management** - Stateful conversations with pluggable storage
- ⚙️ **Middleware Pipeline** - Express-like middleware for cross-cutting concerns
- 🔌 **Plugin System** - Modular extensions for reusable functionality
- 🛡️ **Built-in Security** - Rate limiting, authentication, and authorization
- 📊 **Observability** - Structured logging and analytics support
- 🎨 **Excellent DX** - Autocomplete, type inference, and helpful error messages
- 🌳 **Tree-Shakeable** - Zero runtime overhead for unused features
- 🔄 **Capabilities System** - Adapters declare what they support

---

## Installation

```bash
npm install @igniter-js/bot zod
# or
pnpm add @igniter-js/bot zod
# or
yarn add @igniter-js/bot zod
# or
bun add @igniter-js/bot zod
```

**Requirements:**
- Node.js >= 18
- TypeScript >= 5.0
- Zod >= 3.0

### Import Paths

The package provides organized imports for better code organization and tree-shaking:

```typescript
// Main exports (everything in one import)
import { IgniterBot, telegram, memoryStore, rateLimitMiddleware } from '@igniter-js/bot'

// Organized imports (recommended for large projects)
import { telegram, whatsapp, discord } from '@igniter-js/bot/adapters'
import { rateLimitMiddleware, authMiddleware, loggingMiddleware } from '@igniter-js/bot/middlewares'
import { analyticsPlugin } from '@igniter-js/bot/plugins'
import { memoryStore } from '@igniter-js/bot/stores'
import type { BotContext, BotCommand } from '@igniter-js/bot/types'
```

**Why use organized imports?**
- 📦 **Better tree-shaking** - Only import what you need
- 🗂️ **Clearer code** - Explicit about where things come from
- 🔍 **Easier to find** - Know exactly which module exports what
- 🎯 **Better autocomplete** - IDE shows only relevant exports

---

## Quick Start

Create your first bot in under 2 minutes:

```typescript
import { IgniterBot, telegram } from '@igniter-js/bot'

const bot = IgniterBot
  .create()
  .withHandle('@mybot')  // ← Your bot's handle (ID and name auto-derived)
  .addAdapter('telegram', telegram({
      token: process.env.TELEGRAM_TOKEN!,
    // handle inherited from global
  }))
  .addCommand('start', {
      name: 'start',
      aliases: ['hello'],
    description: 'Start the bot',
    help: 'Use /start to begin',
      async handle(ctx) {
      await ctx.reply('👋 Welcome! I am your bot.')
      }
  })
  .build()

// Initialize the bot (registers webhooks, commands, etc)
await bot.start()

// Use in Next.js API route
export async function POST(req: Request) {
  return bot.handle('telegram')(req)
}
```

---

## Framework Integration

### Next.js (App Router)

```typescript
import { nextRouteHandlerAdapter } from '@igniter-js/bot/adapters/nextjs'

const handlers = nextRouteHandlerAdapter({
  'my-bot': bot,
})

export const GET = handlers.GET
export const POST = handlers.POST
```

### TanStack Start

```typescript
import { tanstackStartRouteHandlerAdapter } from '@igniter-js/bot/adapters/tanstack-start'

const handlers = tanstackStartRouteHandlerAdapter({
  'my-bot': bot,
})

export const handler = handlers
```

## Builder Pattern API

The `IgniterBot` builder provides a fluent API for configuring your bot:

### Core Configuration

```typescript
const bot = IgniterBot
  .create()
  .withHandle('@mybot')              // Recommended: Bot handle (ID/name auto-derived)
  .withId('custom-id')               // Optional: Override auto-generated ID
  .withName('Custom Name')           // Optional: Override auto-generated name
  .withLogger(console)               // Optional: Logger instance
  .withOptions({                     // Optional: Advanced options
    timeout: 30000,
    retries: 3,
    autoRegisterCommands: true
  })
  .withSessionStore(memoryStore())   // Optional: Session storage
```

**Handle Benefits:**
- 🎯 One handle for all platforms (DRY principle)
- 🤖 Auto-generates `id` and `name` from handle
- 🔄 Each adapter can override if needed
- 📝 Simpler configuration

### Adding Adapters

```typescript
// Single adapter (inherits global handle)
.addAdapter('telegram', telegram({
  token: '...',
  // handle: '@custom' ← Optional override
}))

// Multiple adapters (all inherit global handle)
.addAdapters({
  telegram: telegram({ token: '...' }),
  whatsapp: whatsapp({ token: '...', phone: '...' }),
  discord: discord({ token: '...', applicationId: '...' })
})

// Override handle for specific adapter
.addAdapter('telegram', telegram({
  token: '...',
  handle: '@custom_telegram_handle' // ← Platform-specific override
}))
```

### Adding Commands

```typescript
// Single command
.addCommand('start', {
  name: 'start',
  aliases: ['hello'],
  description: 'Start the bot',
  help: 'Use /start',
  async handle(ctx) {
    await ctx.reply('Hello!')
  }
})

// Multiple commands
.addCommands({
  start: { ... },
  help: { ... }
})

// Command with Zod validation
.addCommand('ban', {
  name: 'ban',
  description: 'Ban a user',
  args: z.object({
    userId: z.string(),
    reason: z.string().optional()
  }),
  async handle(ctx, args) {
    // args is fully typed!
    await ctx.reply(`Banned ${args.userId}`)
  }
})
```

### Adding Middlewares

```typescript
// Import from main package
import { rateLimitMiddleware, authMiddleware, loggingMiddleware } from '@igniter-js/bot'

// Or use organized imports (recommended)
import {
  rateLimitMiddleware,
  authMiddleware,
  loggingMiddleware
} from '@igniter-js/bot/middlewares'

.addMiddleware(loggingMiddleware({ logCommands: true }))
.addMiddleware(rateLimitMiddleware({ maxRequests: 10, windowMs: 60000 }))
.addMiddleware(authMiddleware({ allowedUsers: ['admin_id'] }))

// Or add multiple at once
.addMiddlewares([
  loggingMiddleware({ ... }),
  rateLimitMiddleware({ ... })
])
```

### Event Handlers

```typescript
.onMessage(async (ctx) => {
  console.log('Message:', ctx.message.content)
})
.onError(async (ctx) => {
  console.error('Error:', ctx.error)
})
.onCommand(async (ctx) => {
  console.log('Command executed')
})
.onStart(async () => {
  console.log('Bot started!')
})
```

**Note:** `onCommand` is stored by the builder but `Bot.process()` does not emit the `command` event yet.

### Using Plugins

```typescript
// Import from main package
import { analyticsPlugin } from '@igniter-js/bot'

// Or use organized imports (recommended)
import { analyticsPlugin } from '@igniter-js/bot/plugins'

.usePlugin(analyticsPlugin({
  trackMessages: true,
  trackCommands: true
}))
```

### Building

```typescript
.build() // Creates the bot instance
```

---

## Adapters

### Telegram

Full-featured Telegram Bot API adapter with webhook support:

```typescript
import { telegram } from '@igniter-js/bot/adapters'

// Minimal (uses global bot handle)
.addAdapter('telegram', telegram({
  token: 'your_bot_token'
}))

// With webhook
.addAdapter('telegram', telegram({
  token: 'your_bot_token',
  webhook: {
    url: 'https://example.com/api/telegram',
    secret: 'webhook_secret'
  }
}))

// Override global handle for this platform
.addAdapter('telegram', telegram({
  token: 'your_bot_token',
  handle: '@custom_telegram_bot' // ← Override
}))
```

**Capabilities:**
- ✅ Text, images, videos, audio, documents, stickers
- ✅ Locations, contacts, polls
- ✅ Interactive buttons and inline keyboards
- ✅ Edit and delete messages
- ✅ Webhooks and long polling
- ✅ Slash commands
- **Limits:** 4096 chars, 50MB files, 8 buttons

### WhatsApp

WhatsApp Cloud API adapter:

```typescript
import { whatsapp } from '@igniter-js/bot/adapters'

// Minimal (uses global bot handle)
.addAdapter('whatsapp', whatsapp({
  token: 'your_whatsapp_token',
  phone: 'phone_number_id'
}))

// Override global handle for this platform
.addAdapter('whatsapp', whatsapp({
  token: 'your_whatsapp_token',
  phone: 'phone_number_id',
  handle: 'custom_keyword' // ← Override for WhatsApp-specific keyword
}))
```

**Capabilities:**
- ✅ Text, images, videos, audio, documents
- ✅ Locations, contacts
- ✅ Interactive buttons and lists
- ✅ Message reactions
- ❌ No edit/delete via API
- **Limits:** 4096 chars, 100MB files, 3 buttons

### Discord

Discord Interactions API adapter with slash commands support:

```typescript
import { discord } from '@igniter-js/bot/adapters'

// Minimal (uses global bot handle)
.addAdapter('discord', discord({
  token: 'your_discord_token',
  applicationId: 'your_application_id',
  publicKey: 'your_public_key' // Optional but recommended for signature verification
}))

// Override global handle for this platform
.addAdapter('discord', discord({
  token: 'your_discord_token',
  applicationId: 'your_application_id',
  publicKey: 'your_public_key',
  handle: '@custom_discord_bot' // ← Override
}))
```

**Capabilities:**
- ✅ Text, images, videos, audio, documents
- ✅ Interactive buttons and message components
- ✅ Edit and delete messages
- ✅ Message reactions
- ✅ Slash commands (APPLICATION_COMMAND)
- ✅ Message components (MESSAGE_COMPONENT - button clicks)
- ✅ Ed25519 signature verification
- ❌ No stickers, location, contact, or polls via API
- **Limits:** 2000 chars, 25MB files (100MB for verified bots), 5 buttons per row

### Creating Custom Adapters

```typescript
import { Bot } from '@igniter-js/bot'
import { z } from 'zod'

const myAdapter = Bot.adapter({
  name: 'my-platform',
  parameters: z.object({
    token: z.string(),
    handle: z.string().optional(),
  }),
  capabilities: {
    content: {
      text: true,
      image: false,
      video: false,
      audio: false,
      document: false,
      sticker: false,
      location: false,
      contact: false,
      poll: false,
      interactive: false,
    },
    actions: { edit: false, delete: false, react: false, pin: false, thread: false },
    features: { webhooks: true, longPolling: false, commands: false, mentions: false, groups: false, channels: false, users: false, files: false },
    limits: { maxMessageLength: 2000, maxFileSize: 5 * 1024 * 1024, maxButtonsPerMessage: 0 },
  },
  async init({ logger }) {
    logger?.info?.('Adapter initialized')
  },
  async handle({ request }) {
    const body = await request.json()
    return {
      event: 'message',
      provider: 'my-platform',
      channel: { id: body.channelId, name: body.channelId, isGroup: false },
      message: {
        content: { type: 'text', content: body.text, raw: body.text },
        author: { id: body.userId, name: body.userId, username: body.userId },
        isMentioned: true,
      },
    }
  },
  async sendText({ client, channel, text }) {
    await client?.post('/send', { channel, text })
  },
})
```

---

## Commands

### Basic Command

```typescript
.addCommand('ping', {
  name: 'ping',
  aliases: ['pong'],
  description: 'Check if bot is alive',
  help: 'Use /ping to test',
  async handle(ctx) {
    await ctx.reply('🏓 Pong!')
  }
})
```

### Command with Validation

```typescript
import { z } from 'zod'

.addCommand('remind', {
  name: 'remind',
  description: 'Set a reminder',
  help: 'Use /remind <time> <message>',
  args: z.object({
    time: z.number().positive(),
    message: z.string().min(1)
  }),
  async handle(ctx, args) {
    // args is fully typed!
    await ctx.reply(`Reminder set for ${args.time} minutes: ${args.message}`)
  }
})
```

### Command with Subcommands

```typescript
.addCommand('config', {
  name: 'config',
  description: 'Bot configuration',
  subcommands: {
    set: {
      args: z.object({ key: z.string(), value: z.string() }),
      async handle(ctx, args) {
        await ctx.reply(`Set ${args.key} = ${args.value}`)
  }
    },
    get: {
      args: z.object({ key: z.string() }),
      async handle(ctx, args) {
        await ctx.reply(`Value of ${args.key}`)
      }
    }
  }
})
```

---

## Session Management

Manage stateful conversations across messages:

```typescript
// Import from main package
import { memoryStore } from '@igniter-js/bot'

// Or use organized imports (recommended)
import { memoryStore } from '@igniter-js/bot/stores'

const bot = IgniterBot
  .create()
  .withSessionStore(memoryStore())
  .addCommand('survey', {
    name: 'survey',
    async handle(ctx) {
      const session = ctx.session
      
      if (!session.data.step) {
        session.data.step = 1
        session.data.answers = {}
        await ctx.reply('What is your name?')
        await session.save()
        return
      }
      
      if (session.data.step === 1) {
        session.data.answers.name = ctx.message.content?.content
        session.data.step = 2
        await ctx.reply('What is your email?')
        await session.save()
        return
      }
      
      // Complete survey
      await ctx.reply('Thank you!')
      await session.delete()
    }
  })
  .build()
```

**Session API:**
- `session.data` - Store arbitrary data
- `session.save()` - Persist changes
- `session.delete()` - Remove session
- `session.update(data)` - Merge partial data

---

## Middlewares

### Official Middlewares

#### Rate Limiting

```typescript
// Import from main package
import { rateLimitMiddleware, rateLimitPresets } from '@igniter-js/bot'

// Or use organized imports (recommended)
import { rateLimitMiddleware, rateLimitPresets } from '@igniter-js/bot/middlewares'

// Custom configuration
.addMiddleware(rateLimitMiddleware({
  maxRequests: 10,
  windowMs: 60000,
  message: 'Too many requests!',
  skip: (ctx) => isAdmin(ctx.message.author.id)
}))

// Or use presets
.addMiddleware(rateLimitPresets.moderate())
```

**Presets:** `strict`, `moderate`, `lenient`, `perCommand`

#### Authentication

```typescript
// Organized imports (recommended)
import { authMiddleware, authPresets } from '@igniter-js/bot/middlewares'

// Whitelist users
.addMiddleware(authMiddleware({
  allowedUsers: ['user1', 'user2'],
  unauthorizedMessage: 'Access denied'
}))

// Or use presets
.addMiddleware(authPresets.adminsOnly(['admin1']))
.addMiddleware(authPresets.privateOnly())
.addMiddleware(authPresets.groupsOnly())
```

#### Logging

```typescript
// Organized imports (recommended)
import { loggingMiddleware, loggingPresets } from '@igniter-js/bot/middlewares'

// Custom logging
.addMiddleware(loggingMiddleware({
  logMessages: true,
  logCommands: true,
  logMetrics: true,
  includeUserInfo: true
}))

// Or use presets
.addMiddleware(loggingPresets.production())
```

**Presets:** `minimal`, `standard`, `verbose`, `debug`, `production`

### Custom Middleware

```typescript
const myMiddleware: Middleware = async (ctx, next) => {
  console.log('Before')
  return next()
}

.addMiddleware(myMiddleware)
```

---

## Plugins

Plugins package commands, middlewares, and hooks into reusable modules:

```typescript
// Import from main package
import { analyticsPlugin } from '@igniter-js/bot'

// Or use organized imports (recommended)
import { analyticsPlugin } from '@igniter-js/bot/plugins'

.usePlugin(analyticsPlugin({
  trackEvent: async (event, properties) => {
    await analytics.track(event, properties)
  },
  trackMessages: true,
  trackCommands: true
}))
```

The analytics plugin automatically adds a `/stats` command!

### Creating Custom Plugins

```typescript
import type { BotPlugin } from '@igniter-js/bot'

const myPlugin: BotPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My custom plugin',
  
  commands: {
    custom: {
      name: 'custom',
      aliases: [],
      description: 'Custom command',
      help: 'Use /custom',
      async handle(ctx) {
        await ctx.reply('From plugin!')
      }
    }
  },
  
  middlewares: [
    async (ctx, next) => {
      console.log('Plugin middleware')
      await next()
    }
  ],
  
  hooks: {
    onStart: async () => console.log('Plugin started'),
    onMessage: async (ctx) => console.log('Message'),
    onError: async (ctx) => console.error('Error')
  }
}

.usePlugin(myPlugin)
```

---

## Context Helpers

The `BotContext` includes convenient helper methods:

### Sending Messages

```typescript
// Simple text reply
await ctx.reply('Hello!')

// Reply with buttons
await ctx.replyWithButtons('Choose an option:', [
  { id: '1', label: 'Option 1', action: 'callback', data: 'opt1' },
  { id: '2', label: 'Option 2', action: 'callback', data: 'opt2' }
])

// Reply with image
await ctx.replyWithImage('https://example.com/image.jpg', 'Caption')

// Reply with document
await ctx.replyWithDocument(file, 'Document caption')
```

### Message Actions

```typescript
// Edit message (if adapter supports)
await ctx.editMessage?.('message_id', { type: 'text', content: 'Updated!' })

// Delete message (if adapter supports)
await ctx.deleteMessage?.('message_id')

// React to message (if adapter supports)
await ctx.react?.('👍')
```

### Session Access

```typescript
// Access session
const step = ctx.session.data.step || 0
ctx.session.data.step = step + 1
await ctx.session.save()
```

---

## Capabilities System

Adapters declare their capabilities, allowing you to check support before using features:

```typescript
.addCommand('feature', {
  name: 'feature',
  async handle(ctx) {
    const adapter = ctx.bot.getAdapter?.(ctx.provider)
    
    if (!adapter?.capabilities.content.image) {
      await ctx.reply('This platform does not support images')
      return
    }
    
    await ctx.replyWithImage('...')
  }
})
```

**Capability Categories:**
- **content** - Text, image, video, audio, document, sticker, location, contact, poll, interactive
- **actions** - Edit, delete, react, pin, thread
- **features** - Webhooks, long polling, commands, mentions, groups, channels, users, files
- **limits** - maxMessageLength, maxFileSize, maxButtonsPerMessage

---

## Examples

### Multi-Platform Bot

```typescript
const bot = IgniterBot
  .create()
  .withId('multi-bot')
  .withName('Multi-Platform Bot')
  .addAdapters({
    telegram: telegram({ token: '...', handle: '@bot' }),
    whatsapp: whatsapp({ token: '...', phone: '...' }),
    discord: discord({ token: '...', applicationId: '...' })
})
  .addCommand('broadcast', {
    name: 'broadcast',
    description: 'Send to all platforms',
    args: z.object({ message: z.string() }),
    async handle(ctx, args) {
      const adapters = ctx.bot.getAdapters?.() || {}
      for (const [key, adapter] of Object.entries(adapters)) {
        await ctx.bot.send({
          provider: key,
          channel: ctx.channel.id,
          content: { type: 'text', content: args.message }
        })
      }
    }
  })
  .build()
```

### E-commerce Bot

```typescript
import { memoryStore, rateLimitMiddleware } from '@igniter-js/bot'

const bot = IgniterBot
  .create()
  .withId('shop-bot')
  .withName('Shop Bot')
  .withSessionStore(memoryStore())
  .addAdapter('telegram', telegram({ ... }))
  .addMiddleware(rateLimitMiddleware({ maxRequests: 20 }))
  .addCommand('catalog', {
    name: 'catalog',
    async handle(ctx) {
      const products = await getProducts()
      await ctx.replyWithButtons(
        'Choose a product:',
        products.map(p => ({
          id: p.id,
          label: p.name,
          action: 'callback',
          data: `product:${p.id}`
        }))
      )
    }
  })
  .addCommand('cart', {
    name: 'cart',
    async handle(ctx) {
      const cart = ctx.session.data.cart || []
      const total = cart.reduce((s, item) => s + item.price, 0)
      await ctx.reply(`Cart total: $${total}`)
    }
  })
  .build()
```

More examples in [`examples/`](./examples/) directory.

---

## API Reference

### IgniterBot Builder

| Method | Description |
|--------|-------------|
| `.create()` | Creates new builder instance |
| `.withId(id)` | Sets bot ID (optional, derived from handle if omitted) |
| `.withName(name)` | Sets bot name (optional, derived from handle if omitted) |
| `.withLogger(logger)` | Configures logger |
| `.withSessionStore(store)` | Configures session storage |
| `.withOptions(options)` | Advanced options |
| `.addAdapter(key, adapter)` | Adds platform adapter |
| `.addAdapters(adapters)` | Adds multiple adapters |
| `.addCommand(name, command)` | Adds command |
| `.addCommands(commands)` | Adds multiple commands |
| `.addCommandGroup(prefix, commands)` | Adds prefixed command group |
| `.addMiddleware(middleware)` | Adds middleware |
| `.addMiddlewares(middlewares)` | Adds multiple middlewares |
| `.usePlugin(plugin)` | Loads plugin |
| `.onMessage(handler)` | Message event listener |
| `.onError(handler)` | Error event listener |
| `.onCommand(handler)` | Command event listener |
| `.onStart(handler)` | Start hook |
| `.build()` | Builds bot instance |

### Bot Instance

| Method | Description |
|--------|-------------|
| `start()` | Initialize bot (webhooks, commands) |
| `handle(provider)` | Returns a handler `(request) => Response` |
| `send(params)` | Send message via adapter |
| `registerAdapter(key, adapter)` | Add adapter at runtime |
| `registerCommand(name, command)` | Add command at runtime |
| `use(middleware)` | Add middleware at runtime |
| `on(event, handler)` | Subscribe to event |
| `emit(event, ctx)` | Emit event manually |

### Context Object

| Property/Method | Description |
|--------|-------------|
| `event` | Event type (message, error, start) |
| `provider` | Platform name (telegram, whatsapp) |
| `channel` | Channel info (id, name, isGroup) |
| `message` | Message data (content, author, etc) |
| `session` | Session helper |
| `bot` | Bot instance methods |
| `reply(content)` | Send reply |
| `replyWithButtons(text, buttons)` | Interactive reply |
| `replyWithImage(image, caption)` | Image reply |
| `replyWithDocument(file, caption)` | Document reply |
| `editMessage(id, content)` | Edit message |
| `deleteMessage(id)` | Delete message |
| `react(emoji)` | Add reaction |

---

## Configuration

### BotOptions

```typescript
interface BotOptions {
  timeout?: number
  retries?: number
  autoRegisterCommands?: boolean
  errorHandler?: (error: BotError, context?: BotContext) => void | Promise<void>
}
```

### RateLimitOptions

```typescript
interface RateLimitOptions {
  maxRequests: number
  windowMs: number
  store?: RateLimitStore
  keyGenerator?: (ctx: BotContext) => string
  message?: string | ((ctx: BotContext, retryAfter: number) => string)
  skip?: (ctx: BotContext) => boolean | Promise<boolean>
  onLimitReached?: (ctx: BotContext, retryAfter: number) => void | Promise<void>
}
```

### AuthOptions

```typescript
interface AuthOptions<TContext extends BotContext> {
  allowedUsers?: string[]
  allowedChannels?: string[]
  blockedUsers?: string[]
  blockedChannels?: string[]
  checkFn?: (ctx: TContext) => boolean | Promise<boolean>
  unauthorizedMessage?: string | ((ctx: TContext) => string)
  skip?: (ctx: TContext) => boolean | Promise<boolean>
  onUnauthorized?: (ctx: TContext) => void | Promise<void>
}
```

### LoggingOptions

```typescript
interface LoggingOptions {
  logger?: BotLogger
  logMessages?: boolean
  logCommands?: boolean
  logErrors?: boolean
  logMetrics?: boolean
  includeUserInfo?: boolean
  includeContent?: boolean
  formatter?: (ctx: BotContext, event: string, data: any) => string
  skip?: (ctx: BotContext) => boolean
}
```

### AnalyticsOptions

```typescript
interface AnalyticsOptions {
  trackEvent?: (event: string, properties: Record<string, any>) => void | Promise<void>
  trackMessages?: boolean
  trackCommands?: boolean
  trackErrors?: boolean
  includeUserInfo?: boolean
}
```

## Testing

```typescript
import { describe, it, expect } from 'vitest'
import { IgniterBot, telegram } from '@igniter-js/bot'

describe('My Bot', () => {
  it('should respond to /start', async () => {
    const bot = IgniterBot
      .create()
      .withId('test-bot')
      .withName('Test')
      .addAdapter('telegram', telegram({ token: 'test', handle: '@test' }))
      .addCommand('start', {
        name: 'start',
        async handle(ctx) {
          await ctx.reply('Started!')
        }
      })
      .build()
    
    expect(bot).toBeDefined()
  })
})
```

---

## Security Best Practices

1. **Never commit tokens** - Use environment variables
2. **Use webhook secrets** - Validate incoming requests
3. **Enable rate limiting** - Prevent abuse
4. **Implement auth** - Whitelist authorized users
5. **Validate inputs** - Use Zod schemas
6. **Handle errors gracefully** - Use `onError` handler
7. **Sanitize output** - Escape special characters
8. **Log securely** - Don't log sensitive data

---

## Performance Tips

- Use **memory store** for development, implement a custom store for production
- Enable **rate limiting** to prevent spam
- Use **logging presets** appropriate for environment
- **Check capabilities** before attempting unsupported operations
- **Cache** expensive operations in session data
- Use **middleware** to avoid repeating logic
- **Monitor** with analytics plugin

---

## Roadmap

See the GitHub issues and discussions for planned features.

---

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch: `feat/bot-<feature>`
3. Follow the [AGENTS.md](./AGENTS.md) guidelines
4. Run `npm run build` and `npm run typecheck`
5. Submit a PR with clear description

---

## Documentation

- 📖 [Full Documentation](https://igniterjs.com/docs/bots)
- 📕 [Agent Manual](./AGENTS.md)

---

## Support

- **Website:** https://igniterjs.com
- **Issues:** https://github.com/felipebarcelospro/igniter-js/issues
- **Discord:** Coming soon
- **Email:** felipebarcelospro@gmail.com

---

## License

MIT © Felipe Barcelos & Igniter.js Contributors

---

## Acknowledgments

This package is part of the [Igniter.js](https://igniterjs.com) ecosystem - a modern, type-safe HTTP framework for TypeScript applications.

Built with ❤️ for developers who love type safety and excellent DX.
