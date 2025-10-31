# Migration Guide: Bot.create() → IgniterBot Builder Pattern

This guide helps you migrate from the old `Bot.create()` API to the new `IgniterBot` Builder Pattern.

## Why Migrate?

The new Builder Pattern provides:
- ✅ Better type inference and autocomplete
- ✅ More readable, chainable API
- ✅ Enhanced functionality (sessions, plugins, presets)
- ✅ Better error messages
- ✅ Easier to extend and maintain

**Good news:** The old API still works! This migration is optional but recommended.

---

## Quick Migration

### Before

```typescript
import { Bot, telegram } from '@igniter-js/bot'

const bot = Bot.create({
  id: 'my-bot',
  name: 'My Bot',
  adapters: {
    telegram: telegram({ token: '...', handle: '@mybot' })
  },
  commands: {
    start: {
      name: 'start',
      aliases: ['hello'],
      description: 'Start the bot',
      help: 'Use /start',
      async handle(ctx) {
        await ctx.bot.send({
          provider: ctx.provider,
          channel: ctx.channel.id,
          content: { type: 'text', content: 'Welcome!' }
        })
      }
    }
  },
  middlewares: [loggingMiddleware],
  on: {
    message: async (ctx) => {
      console.log('Message:', ctx.message.content)
    }
  },
  logger: console
})
```

### After

```typescript
import { IgniterBot, telegram } from '@igniter-js/bot'

const bot = IgniterBot
  .create()
  .withId('my-bot')
  .withName('My Bot')
  .withLogger(console)
  .addAdapter('telegram', telegram({ token: '...', handle: '@mybot' }))
  .addCommand('start', {
    name: 'start',
    aliases: ['hello'],
    description: 'Start the bot',
    help: 'Use /start',
    async handle(ctx) {
      // New helper method!
      await ctx.reply('Welcome!')
    }
  })
  .addMiddleware(loggingMiddleware)
  .onMessage(async (ctx) => {
    console.log('Message:', ctx.message.content)
  })
  .build()
```

---

## Migration Steps

### Step 1: Update Imports

No changes needed! Both `Bot` and `IgniterBot` are exported from the same package.

```typescript
// Old (still works)
import { Bot } from '@igniter-js/bot'

// New (recommended)
import { IgniterBot } from '@igniter-js/bot'
```

### Step 2: Replace `Bot.create()` with Builder Chain

Transform your configuration object into builder method calls:

**Configuration → Builder Methods:**

| Old Property | New Builder Method | Example |
|---|---|---|
| `id` | `.withId(id)` | `.withId('my-bot')` |
| `name` | `.withName(name)` | `.withName('My Bot')` |
| `logger` | `.withLogger(logger)` | `.withLogger(console)` |
| `adapters` | `.addAdapter(key, adapter)` | `.addAdapter('telegram', telegram({ ... }))` |
| `commands` | `.addCommand(name, command)` | `.addCommand('start', { ... })` |
| `middlewares` | `.addMiddleware(mw)` | `.addMiddleware(loggingMiddleware)` |
| `on.message` | `.onMessage(handler)` | `.onMessage(async (ctx) => { ... })` |
| `on.error` | `.onError(handler)` | `.onError(async (ctx) => { ... })` |

### Step 3: Use Helper Methods

Replace verbose `ctx.bot.send()` calls with convenient helpers:

```typescript
// Before
await ctx.bot.send({
  provider: ctx.provider,
  channel: ctx.channel.id,
  content: { type: 'text', content: 'Hello!' }
})

// After
await ctx.reply('Hello!')
```

### Step 4: Add `.build()` at the End

```typescript
const bot = IgniterBot
  .create()
  .withId('my-bot')
  // ... other methods
  .build() // ← Don't forget this!
```

---

## Advanced Features (New!)

### Session Management

```typescript
const bot = IgniterBot
  .create()
  .withSessionStore(memoryStore()) // ← New!
  .addCommand('survey', {
    name: 'survey',
    async handle(ctx) {
      const session = ctx.session // ← New!
      session.data.step = 1
      await session.save()
    }
  })
  .build()
```

### Zod Validation for Commands

```typescript
import { z } from 'zod'

const bot = IgniterBot
  .create()
  .addCommand('ban', {
    name: 'ban',
    args: z.object({ // ← New!
      userId: z.string(),
      reason: z.string().optional()
    }),
    async handle(ctx, args) {
      // args is fully typed!
      await ctx.reply(`Banned ${args.userId}`)
    }
  })
  .build()
```

### Official Middlewares

```typescript
import { rateLimitMiddleware, authMiddleware, loggingMiddleware } from '@igniter-js/bot'

const bot = IgniterBot
  .create()
  .addMiddleware(loggingMiddleware({ logCommands: true })) // ← New!
  .addMiddleware(rateLimitMiddleware({ maxRequests: 10 })) // ← New!
  .addMiddleware(authMiddleware({ allowedUsers: [...] })) // ← New!
  .build()
```

### Plugins

```typescript
import { analyticsPlugin } from '@igniter-js/bot'

const bot = IgniterBot
  .create()
  .usePlugin(analyticsPlugin({ // ← New!
    trackMessages: true,
    trackCommands: true
  }))
  .build()
```

---

## Complete Migration Example

### Before (Old API)

```typescript
import { Bot, telegram, whatsapp } from '@igniter-js/bot'

const metricsMiddleware = async (ctx, next) => {
  const start = Date.now()
  await next()
  console.log('Duration:', Date.now() - start)
}

const bot = Bot.create({
  id: 'shop-bot',
  name: 'Shop Bot',
  adapters: {
    telegram: telegram({ token: process.env.TELEGRAM_TOKEN!, handle: '@shop' }),
    whatsapp: whatsapp({ token: process.env.WHATSAPP_TOKEN!, phone: process.env.WHATSAPP_PHONE! })
  },
  commands: {
    start: {
      name: 'start',
      aliases: [],
      description: 'Start the bot',
      help: 'Use /start',
      async handle(ctx) {
        await ctx.bot.send({
          provider: ctx.provider,
          channel: ctx.channel.id,
          content: { type: 'text', content: 'Welcome!' }
        })
      }
    },
    catalog: {
      name: 'catalog',
      aliases: ['shop'],
      description: 'View catalog',
      help: 'Use /catalog',
      async handle(ctx) {
        await ctx.bot.send({
          provider: ctx.provider,
          channel: ctx.channel.id,
          content: { type: 'text', content: 'Catalog here' }
        })
      }
    }
  },
  middlewares: [metricsMiddleware],
  on: {
    message: async (ctx) => {
      console.log('Message received')
    },
    error: async (ctx) => {
      console.error('Error occurred')
    }
  },
  logger: console
})
```

### After (New Builder Pattern)

```typescript
import {
  IgniterBot,
  telegram,
  whatsapp,
  memoryStore,
  loggingMiddleware,
  rateLimitMiddleware,
  analyticsPlugin
} from '@igniter-js/bot'

const bot = IgniterBot
  .create()
  // Configuration
  .withId('shop-bot')
  .withName('Shop Bot')
  .withLogger(console)
  .withSessionStore(memoryStore())
  
  // Adapters
  .addAdapters({
    telegram: telegram({ 
      token: process.env.TELEGRAM_TOKEN!,
      handle: '@shop'
    }),
    whatsapp: whatsapp({ 
      token: process.env.WHATSAPP_TOKEN!,
      phone: process.env.WHATSAPP_PHONE!
    })
  })
  
  // Middlewares (with presets!)
  .addMiddleware(loggingMiddleware({ 
    logCommands: true,
    logMetrics: true
  }))
  .addMiddleware(rateLimitMiddleware({
    maxRequests: 20,
    windowMs: 60000
  }))
  
  // Plugins
  .usePlugin(analyticsPlugin({
    trackMessages: true,
    trackCommands: true
  }))
  
  // Commands (with helper methods!)
  .addCommands({
    start: {
      name: 'start',
      aliases: [],
      description: 'Start the bot',
      help: 'Use /start',
      async handle(ctx) {
        await ctx.reply('Welcome!') // ← Much simpler!
      }
    },
    catalog: {
      name: 'catalog',
      aliases: ['shop'],
      description: 'View catalog',
      help: 'Use /catalog',
      async handle(ctx) {
        await ctx.reply('Catalog here') // ← Much simpler!
      }
    }
  })
  
  // Event handlers
  .onMessage(async (ctx) => {
    console.log('Message received')
  })
  .onError(async (ctx) => {
    console.error('Error occurred')
  })
  
  .build()
```

---

## Breaking Changes

### Context Helper Methods

The new `BotContext` interface includes helper methods that adapters must account for:

```typescript
// These are injected by the framework, not by adapters
ctx.reply()
ctx.replyWithButtons()
ctx.replyWithImage()
ctx.session
```

Adapters should return context without these fields. The framework adds them automatically.

### Adapter Capabilities

Adapters must now declare their capabilities:

```typescript
export const myAdapter = Bot.adapter({
  name: 'my-adapter',
  parameters: schema,
  capabilities: { // ← New required field
    content: { text: true, image: true, ... },
    actions: { edit: true, delete: false, ... },
    features: { webhooks: true, ... },
    limits: { maxMessageLength: 4096, ... }
  },
  init: async (...) => { ... },
  send: async (...) => { ... },
  handle: async (...) => { ... }
})
```

---

## FAQ

**Q: Do I need to migrate immediately?**
A: No! The old API still works. Migrate when convenient.

**Q: Will my existing bot break?**
A: No! The old `Bot.create()` API is maintained for backward compatibility.

**Q: Can I mix old and new APIs?**
A: Yes! You can use `Bot.create()` and still use new middlewares and plugins.

**Q: What about custom adapters?**
A: Custom adapters need to add `capabilities` declaration. See [Adapter Authoring Guide](./AGENT.md).

**Q: How do I test the new API?**
A: Check the [examples directory](./examples/) for working code you can run.

---

## Support

Need help migrating? Open an issue or check the documentation:
- GitHub Issues: https://github.com/felipebarcelospro/igniter-js/issues
- Documentation: https://igniterjs.com/docs/bots

