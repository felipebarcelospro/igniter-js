# @igniter-js/bot Examples

This directory contains practical examples demonstrating various features of the Igniter Bot framework.

## Examples

### 1. Basic Bot (`basic-bot.ts`)

The simplest possible bot with a single platform and two commands.

**Features:**
- Single Telegram adapter
- Two simple commands (`/start`, `/ping`)
- Helper method usage (`ctx.reply()`)

**Run:**
```bash
# Set environment variables
export TELEGRAM_TOKEN="your_bot_token"

# Run the example
bun run basic-bot.ts
```

---

### 2. Session Bot (`session-bot.ts`)

Demonstrates stateful conversations using session management.

**Features:**
- Session storage with memory store
- Multi-step survey flow
- Session persistence across messages
- Session cleanup on completion

**Use Cases:**
- Forms and surveys
- Onboarding flows
- Shopping experiences
- Wizards and multi-step processes

---

### 3. Complete Bot (`complete-bot.ts`)

Full-featured e-commerce bot demonstrating all framework capabilities.

**Features:**
- Multi-platform (Telegram + WhatsApp)
- Session management for shopping cart
- Middlewares (auth, rate limiting, logging)
- Analytics plugin
- Type-safe commands with Zod validation
- Admin-only commands with role checking
- Product catalog browsing
- Shopping cart management
- Order placement and tracking

**Use Cases:**
- E-commerce bots
- Customer support
- Multi-platform automation
- Business applications

---

## Running Examples

### Prerequisites

1. Install dependencies:
```bash
npm install @igniter-js/bot zod
```

2. Set up environment variables:
```bash
# Telegram
export TELEGRAM_TOKEN="your_bot_token"
export TELEGRAM_WEBHOOK_URL="https://your-domain.com/api/telegram"
export TELEGRAM_WEBHOOK_SECRET="your_secret"

# WhatsApp (optional)
export WHATSAPP_TOKEN="your_whatsapp_token"
export WHATSAPP_PHONE="your_phone_number_id"
```

### Using with Next.js

1. Create API routes for each platform:

**`app/api/telegram/route.ts`:**
```typescript
import { bot } from '@/bot/complete-bot'

export async function POST(req: Request) {
  return bot.handle('telegram', req)
}
```

**`app/api/whatsapp/route.ts`:**
```typescript
import { bot } from '@/bot/complete-bot'

export async function POST(req: Request) {
  return bot.handle('whatsapp', req)
}
```

2. Start your Next.js app:
```bash
npm run dev
```

3. Set up webhooks for each platform pointing to your API routes.

---

## Key Concepts Demonstrated

### Builder Pattern
All examples use the new fluent Builder API:

```typescript
const bot = IgniterBot
  .create()
  .withId('my-bot')
  .addAdapter('telegram', telegram({ ... }))
  .addCommand('start', { ... })
  .build()
```

### Type Safety
Commands can validate arguments with Zod:

```typescript
.addCommand('add', {
  name: 'add',
  args: z.object({
    productId: z.string(),
    quantity: z.number().positive().default(1)
  }),
  async handle(ctx, args) {
    // args is fully typed!
  }
})
```

### Session Management
Maintain state across messages:

```typescript
const session = ctx.session
session.data.cart = []
await session.save()
```

### Helper Methods
Simplified message sending:

```typescript
await ctx.reply('Hello!')
await ctx.replyWithImage(url, 'caption')
await ctx.replyWithButtons('Choose:', buttons)
```

### Middlewares
Reusable cross-cutting concerns:

```typescript
.addMiddleware(rateLimitMiddleware({ maxRequests: 10 }))
.addMiddleware(authMiddleware({ allowedUsers: [...] }))
.addMiddleware(loggingMiddleware({ logCommands: true }))
```

### Plugins
Modular extensions:

```typescript
.usePlugin(analyticsPlugin({
  trackMessages: true,
  trackCommands: true
}))
```

---

## Best Practices

1. **Use environment variables** for tokens and secrets
2. **Enable logging** for debugging and monitoring
3. **Add rate limiting** to prevent abuse
4. **Use sessions** for stateful conversations
5. **Validate inputs** with Zod schemas
6. **Handle errors** gracefully with `onError`
7. **Check capabilities** before using platform-specific features
8. **Organize commands** logically by feature
9. **Use plugins** for reusable functionality
10. **Test locally** before deploying to production

---

## Next Steps

- Read the [full documentation](../README.md)
- Explore [middleware options](../src/middlewares/)
- Learn about [session stores](../src/stores/)
- Create [custom adapters](../AGENT.md#adapter-authoring-guide)
- Build [custom plugins](../src/plugins/)

---

## Support

- Website: https://igniterjs.com
- Issues: https://github.com/felipebarcelospro/igniter-js/issues
- Documentation: https://igniterjs.com/docs/bots

