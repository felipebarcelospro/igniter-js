# @igniter-js/bot (Alpha)

A modern, type‑safe, multi‑platform bot framework for the Igniter.js ecosystem.
It provides a clean abstraction layer for building chatbot-style integrations with **Telegram**, **WhatsApp** (Cloud API), and future providers—featuring middleware chains, command handling with aliases, logging, strong typing (TypeScript + Zod), and an extensible adapter architecture.

> Status: **alpha** – Public API may still evolve. Breaking changes may occur to improve DX and internal consistency before the first stable release.

---

## Table of Contents

1. [Key Features](#key-features)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Configuration Overview](#configuration-overview)
5. [Adapters](#adapters)
   - [Telegram](#telegram-adapter)
   - [WhatsApp](#whatsapp-adapter)
6. [Commands](#commands)
7. [Mentions & Bot Handle Activation](#mentions--bot-handle-activation)
8. [Middleware](#middleware)
9. [Lifecycle Hooks](#lifecycle-hooks)
10. [Logging](#logging)
11. [Error Model](#error-model)
12. [API Reference (Core)](#api-reference-core)
13. [Types Overview](#types-overview)
14. [Sending Messages](#sending-messages)
15. [Adapter Authoring Guide](#adapter-authoring-guide)
16. [Testing Strategy (Planned)](#testing-strategy-planned)
17. [Security Considerations](#security-considerations)
18. [Performance Notes](#performance-notes)
19. [Roadmap](#roadmap)
20. [Contributing](#contributing)
21. [FAQ](#faq)
22. [License](#license)

---

## Key Features

- 🚀 **Multi-platform**: First-party adapters (Telegram, WhatsApp); more coming soon.
- 🧩 **Adapter Pattern**: Clean contract for adding new messaging providers.
- 🧠 **Type Safety**: End-to-end TypeScript with Zod runtime validation.
- ⚙️ **Middleware Pipeline**: Express-like chain for cross-cutting concerns (auth, metrics, rate limiting).
- 🗣️ **Command System**: Aliases, help text, structured command events.
- 🔔 **Mention Activation**: Customizable `handle` (username/keyword) for group contexts.
- 🪵 **Structured Logging**: Inject your logger, avoid hard-coded consoles.
- 🧱 **Error Codes & BotError**: Consistent error semantics for automation & observability.
- 🪶 **Lightweight & Tree-Shakeable**: Pure exports; no hidden side effects.
- 🔌 **Extensible**: Dynamic runtime registration: adapters, commands, middleware, hooks.

---

## Installation

```bash
npm install @igniter-js/bot
# or
yarn add @igniter-js/bot
# or
pnpm add @igniter-js/bot
```

Peer requirements: TypeScript >= 5.x

---

## Quick Start

```ts
import { Bot, telegram } from '@igniter-js/bot'

const bot = Bot.create({
  id: 'demo-bot',
  name: 'Demo Bot',
  adapters: {
    telegram: telegram({
      token: process.env.TELEGRAM_TOKEN!,
      handle: '@demo_bot',               // used for group mention detection
      webhook: {
        url: process.env.TELEGRAM_WEBHOOK_URL!,
        secret: process.env.TELEGRAM_WEBHOOK_SECRET
      }
    })
  },
  commands: {
    start: {
      name: 'start',
      aliases: ['hello'],
      description: 'Greets the user',
      help: 'Use /start to receive a welcome message.',
      async handle(ctx) {
        await ctx.bot.send({
          provider: ctx.provider,
          channel: ctx.channel.id,
            content: { type: 'text', content: '👋 Welcome, friend!' }
        })
      }
    }
  },
  on: {
    message: async (ctx) => {
      if (ctx.message.content?.type === 'text') {
        console.log('[inbound]', ctx.message.content.raw)
      }
    },
    error: async (ctx) => {
      // @ts-expect-error error injected internally
      console.warn('[bot-error]', ctx.error?.code || ctx.error?.message)
    }
  },
  logger: console // minimal, but you can bring pino/winston/etc
})

await bot.start()

// Example (Next.js / edge-like handler)
export async function POST(req: Request) {
  return bot.handle('telegram', req)
}
```

---

## Configuration Overview

Each adapter defines its own Zod-based configuration schema. Core fields:

| Field      | Purpose                              |
|------------|--------------------------------------|
| `token`    | Provider API token                   |
| `handle`   | Mention trigger (username/keyword)   |
| `webhook`  | (Telegram) Webhook URL + secret      |
| `phone`    | (WhatsApp) Phone number ID           |

**Example (Telegram):**
```ts
telegram({
  token: '123:ABC',
  handle: '@my_bot',
  webhook: { url: 'https://example.com/api/telegram', secret: 's3cr3t' }
})
```

**Example (WhatsApp Cloud API):**
```ts
whatsapp({
  token: process.env.WHATSAPP_TOKEN!,
  phone: process.env.WHATSAPP_PHONE_ID!,
  handle: 'mybot' // keyword for group mention
})
```

---

## Adapters

### Telegram Adapter

Supports:
- Webhook registration (auto on `start()` if `webhook.url` provided)
- Command synchronization (`setMyCommands`)
- Text, photo, document, audio, voice
- MarkdownV2 escaping

Config fields:
| Field     | Required | Description |
|-----------|----------|-------------|
| `token`   | Yes      | Bot API token |
| `handle`  | Yes      | `@<username>` used to detect mentions |
| `webhook.url` | Optional | HTTPS endpoint for updates |
| `webhook.secret` | Optional | Validates authenticity |

### WhatsApp Adapter

Supports:
- Cloud API send text
- Media parsing (image/document/audio)
- Mention keyword detection in group contexts
- Manual webhook management (you configure the endpoint at Meta dashboard)

Config fields:
| Field    | Required | Description |
|----------|----------|-------------|
| `token`  | Yes      | Cloud API token |
| `phone`  | Yes      | Phone number (ID) |
| `handle` | Yes      | Keyword to consider a group mention |

---

## Commands

A command is triggered by messages starting with `/` (Telegram style or custom typed message).
Structure:

```ts
const echo = {
  name: 'echo',
  aliases: ['repeat', 'say'],
  description: 'Repeats your message back',
  help: 'Usage: /echo <text>',
  async handle(ctx, params) {
    await ctx.bot.send({
      provider: ctx.provider,
      channel: ctx.channel.id,
      content: { type: 'text', content: params.join(' ') || '(empty)' }
    })
  }
}
```

Register at creation or dynamically:
```ts
bot.registerCommand('echo', echo)
```

---

## Mentions & Bot Handle Activation

In group chats:
- **Telegram**: Message is considered addressing the bot if it contains `@<handle>` or starts with `/`.
- **WhatsApp**: We treat `handle` as a keyword; if it appears (case-insensitive) in a group message, `isMentioned = true`.
- In private chats: `isMentioned` defaults to `true`.

Use `ctx.message.isMentioned` inside listeners or middleware to implement mention-gated logic.

---

## Middleware

Signature:
```ts
type Middleware = (ctx: BotContext, next: () => Promise<void>) => Promise<void>
```

Example:
```ts
const metrics: Middleware = async (ctx, next) => {
  const t0 = Date.now()
  await next()
  console.log('[latency]', ctx.event, Date.now() - t0)
}
bot.use(metrics)
```

Common use cases:
- Rate limiting
- Authorization
- Session loading
- Telemetry
- Caching attachments

---

## Lifecycle Hooks

```ts
bot
  .onPreProcess(async (ctx) => {/* enrich context */})
  .onPostProcess(async (ctx) => {/* audit / metrics */})
```

Execution order:
1. preProcess hooks
2. middleware chain
3. event listeners
4. command execution (if applicable)
5. postProcess hooks

---

## Logging

Inject a logger implementing:
```ts
interface BotLogger {
  debug?: (...a: any[]) => void
  info?: (...a: any[]) => void
  warn?: (...a: any[]) => void
  error?: (...a: any[]) => void
}
```

Adapters use `logger?.level?.()` – no console fallback if omitted (silent mode except thrown errors).

---

## Error Model

Core emits structured `BotError` instances internally:

| Code                        | Meaning                                  |
|----------------------------|------------------------------------------|
| `PROVIDER_NOT_FOUND`       | Adapter key not registered               |
| `COMMAND_NOT_FOUND`        | Command or alias not present             |
| `INVALID_COMMAND_PARAMETERS` | Command handler threw / invalid usage |
| `ADAPTER_HANDLE_RETURNED_NULL` | Update intentionally ignored        |

Listen to errors:
```ts
bot.on('error', async (ctx) => {
  // @ts-expect-error internal injection
  const err = ctx.error
  console.error('[bot-error]', err.code, err.message)
})
```

---

## API Reference (Core)

### `Bot.create(options)`
Creates an instance with:
- `id`, `name`
- `adapters`: record of adapter instances
- `middlewares?`
- `commands?`
- `on?`: event handlers (`message`, `error`, `start`)
- `logger?`

### Instance Methods

| Method | Description |
|--------|-------------|
| `start()` | Initializes adapters (webhook setup, sync commands). |
| `handle(provider, request)` | Processes inbound HTTP webhook events. |
| `send({ provider, channel, content })` | Sends message using adapter. |
| `use(mw)` | Adds middleware dynamically. |
| `registerCommand(name, command)` | Adds command at runtime. |
| `registerAdapter(name, adapter)` | Dynamically adds an adapter. |
| `on(event, handler)` | Subscribes to an event. |
| `emit(event, ctx)` | Manually emits an event. |
| `onPreProcess(hook)` | Adds pre-process hook. |
| `onPostProcess(hook)` | Adds post-process hook. |

---

## Types Overview

Frequently used:
```ts
import type {
  BotContext,
  BotCommand,
  BotEvent,
  BotContent,
  Middleware
} from '@igniter-js/bot/types'
```

Message content union: `BotTextContent | BotCommandContent | BotImageContent | BotAudioContent | BotDocumentContent`

---

## Sending Messages

```ts
await bot.send({
  provider: 'telegram',
  channel: '<chat_id>',
  content: { type: 'text', content: 'Hello world' }
})
```

Content currently supports:
- `text` (outbound)
- Other types primarily parsed inbound (attachments extracted)

Future: structured replies, interactive elements, attachments sending.

---

## Adapter Authoring Guide

Create a new adapter:

```ts
import { Bot } from '@igniter-js/bot'
import { z } from 'zod'

const MyAdapterParams = z.object({
  token: z.string(),
  handle: z.string().optional()
})

export const myAdapter = Bot.adapter({
  name: 'my-adapter',
  parameters: MyAdapterParams,
  async init({ config, commands, logger }) {
    logger?.info?.('[my-adapter] init')
  },
  async send({ channel, content, config, logger }) {
    logger?.debug?.('[my-adapter] send', { channel })
    // ... send logic
  },
  async handle({ request, config, logger }) {
    const body = await request.json()
    if (!body.message) return null
    return {
      event: 'message',
      provider: 'my-adapter',
      channel: { id: body.channelId, name: body.channelName, isGroup: !!body.isGroup },
      message: {
        content: { type: 'text', content: body.message, raw: body.message },
        author: { id: body.userId, name: body.userName, username: body.userHandle },
        isMentioned: true
      }
    }
  }
})
```

Rules:
1. Do not return `Response` – return context or `null`.
2. Perform validation (Zod schema).
3. Use logger instead of console.
4. Keep side effects inside `init` / functions (no top-level network calls).

---

## Testing Strategy (Planned)

Planned categories (to be introduced when exiting alpha):

| Layer | Scope |
|-------|-------|
| Unit  | Command handlers, helpers |
| Adapter | Parsing & send logic (HTTP mocked) |
| Integration | Middleware + command pipeline |
| Contract | Type-level assertions (d.ts health) |

---

## Security Considerations

| Concern | Recommendation |
|---------|---------------|
| Tokens | Never commit; load via env |
| Webhooks | Use HTTPS + secrets |
| Markdown (Telegram) | Escape via provided helper |
| Rate limiting | Implement via middleware |
| Error leakage | Avoid echoing raw provider errors to users |

---

## Performance Notes

- Adapters avoid heavy processing; CPU cost dominated by network I/O.
- Media fetching is synchronous per request; consider caching large files externally.
- Middleware chain is linear; keep each middleware efficient.
- Logging can be the heaviest operation in high-throughput setups—use conditional log levels.

---

## Roadmap

| Area | Planned Enhancements |
|------|----------------------|
| Adapters | Discord, Slack, Matrix |
| Media | Outbound file sending helpers |
| Commands | Subcommand & parameter schema validation |
| Sessions | Pluggable session store (Redis / Memory) |
| Telemetry | OpenTelemetry integration |
| Rate Limiting | Official middleware |
| Plugin System | `bot.usePlugin()` style ecosystem |
| Testing | Official test harness utilities |

---

## Contributing

1. Fork the monorepo
2. Create a branch: `feat/bot-<feature>`
3. Align with `AGENT.md` guidelines
4. Run build & typecheck locally
5. Open a PR with clear description & rationale

We enforce:
- Clear naming
- Strong typing (no `any` unless justified)
- No unbounded console usage (use logger)
- Document all public APIs with JSDoc

---

## FAQ

**Q: Why does `handle` return a Response from `bot.handle()` but adapters return context?**
A: Separation of concerns. Adapters parse; core coordinates and finalizes the HTTP response.

**Q: How do I ignore irrelevant provider updates?**
Return `null` from the adapter’s `handle` method.

**Q: Can I mutate `ctx.message.content` in middleware?**
Yes, but preserve structural integrity (avoid deleting required fields).

**Q: How do I trigger custom events?**
Use `bot.emit('message', ctxLike)`—ensure the shape matches `BotContext`.

**Q: Are retries built-in?**
Not yet. Wrap `bot.send` externally if you need resilience.

---

## License

MIT © Felipe Barcelos & Igniter.js Contributors

---

## Support & Links

- Website: https://igniterjs.com
- Issues: https://github.com/felipebarcelospro/igniter-js/issues
- Future Community: Discord / Telegram (planned)

---

> This README reflects the **alpha** state. Expect rapid iteration. Feedback and issue reports are highly appreciated.
