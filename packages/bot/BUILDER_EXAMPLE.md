# Igniter Bot Builder Pattern Examples

This document demonstrates the new Builder Pattern API for creating bots with Igniter.js.

## Table of Contents

- [Basic Bot](#basic-bot)
- [Multi-Platform Bot](#multi-platform-bot)
- [Bot with Middlewares](#bot-with-middlewares)
- [Bot with Session Management](#bot-with-session-management)
- [Bot with Plugins](#bot-with-plugins)
- [E-commerce Bot Example](#e-commerce-bot-example)
- [Advanced Configuration](#advanced-configuration)

---

## Basic Bot

The simplest bot with a single platform and one command:

```typescript
import { IgniterBot, telegram } from '@igniter-js/bot'

const bot = IgniterBot
  .create()
  .withId('my-first-bot')
  .withName('My First Bot')
  .addAdapter('telegram', telegram({
    token: process.env.TELEGRAM_TOKEN!,
    handle: '@mybot'
  }))
  .addCommand('start', {
    name: 'start',
    aliases: ['hello', 'hi'],
    description: 'Start the bot',
    help: 'Use /start to begin',
    async handle(ctx) {
      await ctx.reply('👋 Welcome! I am your bot.')
    }
  })
  .build()

// Start the bot
await bot.start()

// Use in Next.js API route
export async function POST(req: Request) {
  return bot.handle('telegram', req)
}
```

---

## Multi-Platform Bot

Bot that works on multiple platforms simultaneously:

```typescript
import { IgniterBot, telegram, whatsapp } from '@igniter-js/bot'

const bot = IgniterBot
  .create()
  .withId('multi-platform-bot')
  .withName('Multi-Platform Assistant')
  .addAdapters({
    telegram: telegram({
      token: process.env.TELEGRAM_TOKEN!,
      handle: '@assistant_bot'
    }),
    whatsapp: whatsapp({
      token: process.env.WHATSAPP_TOKEN!,
      phone: process.env.WHATSAPP_PHONE!,
      handle: 'assistant'
    })
  })
  .addCommand('ping', {
    name: 'ping',
    aliases: [],
    description: 'Check if bot is alive',
    help: 'Use /ping to test',
    async handle(ctx) {
      await ctx.reply(`🏓 Pong! From ${ctx.provider}`)
    }
  })
  .build()

await bot.start()

// Telegram handler
export async function POST_Telegram(req: Request) {
  return bot.handle('telegram', req)
}

// WhatsApp handler
export async function POST_WhatsApp(req: Request) {
  return bot.handle('whatsapp', req)
}
```

---

## Bot with Middlewares

Using built-in middlewares for common functionality:

```typescript
import {
  IgniterBot,
  telegram,
  authMiddleware,
  rateLimitMiddleware,
  loggingMiddleware,
  memoryRateLimitStore
} from '@igniter-js/bot'

const bot = IgniterBot
  .create()
  .withId('protected-bot')
  .withName('Protected Bot')
  .addAdapter('telegram', telegram({
    token: process.env.TELEGRAM_TOKEN!,
    handle: '@protected_bot'
  }))
  // Add logging
  .addMiddleware(loggingMiddleware({
    logMessages: true,
    logCommands: true,
    includeUserInfo: true
  }))
  // Add rate limiting
  .addMiddleware(rateLimitMiddleware({
    maxRequests: 10,
    windowMs: 60000, // 1 minute
    store: memoryRateLimitStore(),
    message: '⚠️ Too many requests. Please wait.'
  }))
  // Add authentication
  .addMiddleware(authMiddleware({
    allowedUsers: ['user_id_1', 'user_id_2'],
    unauthorizedMessage: '🔒 You are not authorized to use this bot.'
  }))
  .addCommand('admin', {
    name: 'admin',
    aliases: [],
    description: 'Admin command',
    help: 'Use /admin',
    async handle(ctx) {
      await ctx.reply('Admin command executed!')
    }
  })
  .build()
```

---

## Bot with Session Management

Stateful conversations using session store:

```typescript
import { IgniterBot, telegram, memoryStore } from '@igniter-js/bot'
import { z } from 'zod'

const bot = IgniterBot
  .create()
  .withId('survey-bot')
  .withName('Survey Bot')
  .withSessionStore(memoryStore())
  .addAdapter('telegram', telegram({
    token: process.env.TELEGRAM_TOKEN!,
    handle: '@survey_bot'
  }))
  .addCommand('survey', {
    name: 'survey',
    aliases: ['start'],
    description: 'Start a survey',
    help: 'Use /survey to begin',
    async handle(ctx) {
      const session = ctx.session
      
      // Step 1: Ask for name
      if (!session.data.step) {
        session.data.step = 1
        session.data.answers = {}
        await ctx.reply('What is your name?')
        await session.save()
        return
      }
      
      // Step 2: Ask for age
      if (session.data.step === 1) {
        session.data.answers.name = ctx.message.content?.type === 'text' 
          ? ctx.message.content.content 
          : 'Unknown'
        session.data.step = 2
        await ctx.reply('What is your age?')
        await session.save()
        return
      }
      
      // Step 3: Complete survey
      if (session.data.step === 2) {
        session.data.answers.age = ctx.message.content?.type === 'text'
          ? ctx.message.content.content
          : 'Unknown'
        
        const { name, age } = session.data.answers
        await ctx.reply(`Thank you ${name}! You are ${age} years old.`)
        await session.delete()
      }
    }
  })
  .onMessage(async (ctx) => {
    // Handle messages for ongoing surveys
    const session = ctx.session
    if (session.data.step) {
      // Reuse survey command handler
      // (In real implementation, you'd call the appropriate handler)
    }
  })
  .build()
```

---

## Bot with Plugins

Using the plugin system for modular features:

```typescript
import { IgniterBot, telegram, analyticsPlugin } from '@igniter-js/bot'

const bot = IgniterBot
  .create()
  .withId('analytics-bot')
  .withName('Analytics Bot')
  .addAdapter('telegram', telegram({
    token: process.env.TELEGRAM_TOKEN!,
    handle: '@analytics_bot'
  }))
  // Add analytics plugin (includes /stats command automatically)
  .usePlugin(analyticsPlugin({
    trackEvent: async (event, properties) => {
      // Send to your analytics service
      await fetch('https://analytics.example.com/track', {
        method: 'POST',
        body: JSON.stringify({ event, properties })
      })
    },
    trackMessages: true,
    trackCommands: true,
    includeUserInfo: true
  }))
  .build()
```

---

## E-commerce Bot Example

Complete example of an e-commerce bot with interactive buttons:

```typescript
import {
  IgniterBot,
  telegram,
  whatsapp,
  memoryStore,
  rateLimitMiddleware,
  loggingMiddleware
} from '@igniter-js/bot'
import { z } from 'zod'

const bot = IgniterBot
  .create()
  .withId('shop-bot')
  .withName('E-commerce Bot')
  .withSessionStore(memoryStore())
  .withLogger(console)
  .addAdapters({
    telegram: telegram({
      token: process.env.TELEGRAM_TOKEN!,
      handle: '@shop_bot'
    }),
    whatsapp: whatsapp({
      token: process.env.WHATSAPP_TOKEN!,
      phone: process.env.WHATSAPP_PHONE!,
      handle: 'shop'
    })
  })
  .addMiddleware(loggingMiddleware({
    logCommands: true,
    includeUserInfo: true
  }))
  .addMiddleware(rateLimitMiddleware({
    maxRequests: 20,
    windowMs: 60000
  }))
  .addCommand('catalog', {
    name: 'catalog',
    aliases: ['shop', 'products'],
    description: 'Browse products',
    help: 'Use /catalog to see available products',
    async handle(ctx) {
      // Get products from database
      const products = await getProducts()
      
      // Show products with buttons
      await ctx.replyWithButtons(
        '🛍️ Choose a product:',
        products.map(p => ({
          id: p.id,
          label: `${p.name} - $${p.price}`,
          action: 'callback',
          data: `product:${p.id}`
        }))
      )
    }
  })
  .addCommand('cart', {
    name: 'cart',
    aliases: ['basket'],
    description: 'View your cart',
    help: 'Use /cart to see items in your cart',
    async handle(ctx) {
      const session = ctx.session
      const cart = session.data.cart || []
      
      if (cart.length === 0) {
        await ctx.reply('🛒 Your cart is empty')
        return
      }
      
      const total = cart.reduce((sum: number, item: any) => sum + item.price, 0)
      const message = `
🛒 Your Cart:
${cart.map((item: any) => `- ${item.name}: $${item.price}`).join('\n')}

Total: $${total}
      `.trim()
      
      await ctx.reply(message)
    }
  })
  .onMessage(async (ctx) => {
    // Handle callback queries (button presses)
    if (ctx.message.content?.type === 'callback') {
      const [type, id] = ctx.message.content.data.split(':')
      
      if (type === 'product') {
        const product = await getProduct(id)
        const session = ctx.session
        
        // Add to cart
        if (!session.data.cart) {
          session.data.cart = []
        }
        session.data.cart.push(product)
        await session.save()
        
        await ctx.reply(`✅ ${product.name} added to cart!`)
      }
    }
  })
  .build()

// Helper functions
async function getProducts() {
  // Fetch from database
  return [
    { id: '1', name: 'Product A', price: 10 },
    { id: '2', name: 'Product B', price: 20 },
    { id: '3', name: 'Product C', price: 30 }
  ]
}

async function getProduct(id: string) {
  const products = await getProducts()
  return products.find(p => p.id === id)!
}
```

---

## Advanced Configuration

All available configuration options:

```typescript
import {
  IgniterBot,
  telegram,
  whatsapp,
  memoryStore,
  authMiddleware,
  rateLimitMiddleware,
  loggingMiddleware,
  analyticsPlugin
} from '@igniter-js/bot'
import pino from 'pino'

const logger = pino()

const bot = IgniterBot
  .create()
  // Core configuration
  .withId('advanced-bot')
  .withName('Advanced Bot')
  .withLogger(logger)
  .withOptions({
    timeout: 30000,
    retries: 3,
    autoRegisterCommands: true
  })
  
  // Session management
  .withSessionStore(memoryStore({
    cleanupIntervalMs: 60000
  }))
  
  // Multiple adapters
  .addAdapter('telegram', telegram({
    token: process.env.TELEGRAM_TOKEN!,
    handle: '@bot',
    webhook: {
      url: process.env.TELEGRAM_WEBHOOK_URL!,
      secret: process.env.TELEGRAM_WEBHOOK_SECRET
    }
  }))
  .addAdapter('whatsapp', whatsapp({
    token: process.env.WHATSAPP_TOKEN!,
    phone: process.env.WHATSAPP_PHONE!,
    handle: 'bot'
  }))
  
  // Middlewares
  .addMiddlewares([
    loggingMiddleware({ logCommands: true }),
    rateLimitMiddleware({ maxRequests: 10, windowMs: 60000 }),
    authMiddleware({ allowedUsers: ['admin_id'] })
  ])
  
  // Plugins
  .usePlugin(analyticsPlugin({
    trackMessages: true,
    trackCommands: true
  }))
  
  // Commands
  .addCommands({
    start: {
      name: 'start',
      aliases: ['begin'],
      description: 'Start the bot',
      help: 'Use /start',
      async handle(ctx) {
        await ctx.reply('Started!')
      }
    },
    help: {
      name: 'help',
      aliases: ['?'],
      description: 'Show help',
      help: 'Use /help',
      async handle(ctx) {
        await ctx.reply('Help message')
      }
    }
  })
  
  // Event handlers
  .onMessage(async (ctx) => {
    logger.info({ event: 'message', user: ctx.message.author.id })
  })
  .onError(async (ctx) => {
    logger.error({ event: 'error', error: (ctx as any).error })
  })
  .onStart(async () => {
    logger.info('Bot started!')
  })
  
  .build()

await bot.start()

export { bot }
```

---

## Migration from Old API

### Before (Old API)

```typescript
const bot = Bot.create({
  id: 'my-bot',
  name: 'My Bot',
  adapters: {
    telegram: telegram({ token: '...' })
  },
  commands: {
    start: { ... }
  },
  middlewares: [middleware1, middleware2],
  on: {
    message: async (ctx) => { ... }
  }
})
```

### After (New Builder API)

```typescript
const bot = IgniterBot
  .create()
  .withId('my-bot')
  .withName('My Bot')
  .addAdapter('telegram', telegram({ token: '...' }))
  .addCommand('start', { ... })
  .addMiddleware(middleware1)
  .addMiddleware(middleware2)
  .onMessage(async (ctx) => { ... })
  .build()
```

The old API still works for backward compatibility!

---

## Type Safety with Zod

Commands can validate their arguments with Zod:

```typescript
import { z } from 'zod'

bot.addCommand('ban', {
  name: 'ban',
  description: 'Ban a user',
  help: 'Use /ban <userId> [reason]',
  args: z.object({
    userId: z.string().min(1),
    reason: z.string().optional(),
    duration: z.number().positive().optional()
  }),
  async handle(ctx, args) {
    // args is fully typed!
    await ctx.reply(`User ${args.userId} banned. Reason: ${args.reason || 'N/A'}`)
  }
})
```

---

## Best Practices

1. **Use Builder Pattern** - The new API is more readable and type-safe
2. **Leverage Middlewares** - Don't repeat authentication/logging logic
3. **Use Sessions** - For conversational flows and stateful interactions
4. **Type Your Commands** - Use Zod schemas for argument validation
5. **Create Plugins** - Package reusable functionality as plugins
6. **Handle Errors** - Use `onError` to gracefully handle failures
7. **Check Capabilities** - Use `adapter.capabilities` to check platform support

---

## Type-Safe Context Enrichment (Advanced)

Middlewares can enrich the `ctx` object in a type-safe way. Each middleware can add properties that become available to subsequent middlewares and handlers.

```typescript
import { IgniterBot, telegram } from '@igniter-js/bot'

interface User {
  id: string
  name: string
  role: 'admin' | 'user'
}

interface Tenant {
  id: string
  name: string
  plan: 'free' | 'pro'
}

// 1. Define a middleware that adds 'user' to the context
const addUserMiddleware = async (ctx, next) => {
  await next()
  const user: User | null = await getUserFromDb(ctx.message.author.id)
  return { user }
}

// 2. Define a middleware that adds 'tenant' and uses 'user'
const addTenantMiddleware = async (ctx, next) => {
  await next()
  // ctx.user is available and fully typed here!
  const tenant: Tenant | null = ctx.user ? await getTenantFromDb(ctx.user.tenantId) : null
  return { tenant }
}

const bot = IgniterBot
  .create()
  .withHandle('@mybot')
  .addAdapter('telegram', telegram({ token: '...' }))
  
  // 3. Chain the middlewares
  .addMiddleware(addUserMiddleware)
  .addMiddleware(addTenantMiddleware)
  
  .addCommand('profile', {
    name: 'profile',
    description: 'Show user and tenant info',
    async handle(ctx) {
      // 4. ctx.user and ctx.tenant are available and fully typed!
      if (ctx.user && ctx.tenant) {
        await ctx.reply(
          `User: ${ctx.user.name} (${ctx.user.role})\n` +
          `Tenant: ${ctx.tenant.name} (${ctx.tenant.plan} plan)`
        )
      } else {
        await ctx.reply('Could not find user or tenant info.')
      }
    }
  })
  .build()

// The final type of ctx in the command handler will be:
// BotContext & { user: User | null } & { tenant: Tenant | null }
```

---

## Next Steps

- Read the [full documentation](https://igniterjs.com/docs/bot)
- Explore [middleware options](https://igniterjs.com/docs/bot/middlewares)
- Learn about [session management](https://igniterjs.com/docs/bot/sessions)
- Create [custom adapters](https://igniterjs.com/docs/bot/custom-adapters)
- Build [plugins](https://igniterjs.com/docs/bot/plugins)

