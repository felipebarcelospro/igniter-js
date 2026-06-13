---
applyTo: "**"
---

# @igniter-js/bot – Agent Manual

> Status: `alpha` – API is stabilizing. Focus on correctness, type safety, and excellent DX.

---

## 1. Purpose & Vision

`@igniter-js/bot` is a modern, type-safe, multi-platform bot framework within the Igniter.js ecosystem.

**Core Goals:**
- **Platform Freedom**: Build bots for any messaging platform with unified API
- **Type Safety First**: Full TypeScript inference, Zod validation, compile-time checks
- **Excellent DX**: Fluent Builder Pattern, autocomplete, helpful errors
- **Extensibility**: Adapters, middlewares, plugins, session stores all pluggable
- **Production Ready**: Built-in rate limiting, auth, logging, error handling

---

## 2. Architectural Principles

1. **Builder Pattern Over Configuration Objects**
   - Fluent API for readability and discoverability
   - Type inference throughout the chain
   - Validation at build time, not runtime

2. **Capabilities-First Design**
   - Adapters declare what they support
   - Framework validates before execution
   - Graceful degradation for unsupported features

3. **Session-Aware by Default**
   - Every context has session access
   - Pluggable storage backends (Memory + custom implementations)
   - Automatic cleanup and expiration

4. **Middleware Pipeline**
   - Express-like middleware chain
   - Clear execution order (pre → middleware → listeners → commands → post)
   - Error boundaries at each stage

5. **Type Safety Everywhere**
   - Zod schemas for adapter configs and command args
   - TypeScript inference for all APIs
   - No `any` types in public surface

6. **Pure Exports, No Side Effects**
   - All imports are side-effect free
   - Initialization happens explicitly via `.start()`
   - Tree-shakeable by default

7. **AI-Friendly Code**
   - Comprehensive JSDoc comments
   - Consistent naming conventions
   - Clear separation of concerns
   - Self-documenting APIs

---

## 3. Public API Surface

### Import Paths

The package provides organized imports for better code organization:

#### Via `@igniter-js/bot` (Main — Everything)

**Builder API:**
- `IgniterBot` / `IgniterBotBuilder` — Main builder class

**Core:**
- `Bot` — Internal bot class (used by builder)
- `BotError`, `BotErrorCodes`, `BotErrorCode` — Error handling

**Adapters:**
- `telegram`, `whatsapp`, `discord` — Adapter factories
- `adapters` namespace — Convenience object `{ telegram, whatsapp, discord }`
- `nextRouteHandlerAdapter` — Next.js route helper
- `tanstackStartRouteHandlerAdapter` — TanStack Start route helper

**Middlewares:**
- `rateLimitMiddleware`, `rateLimitPresets`, `MemoryRateLimitStore`, `memoryRateLimitStore`
- `authMiddleware`, `authPresets`, `roleMiddleware`
- `loggingMiddleware`, `loggingPresets`, `commandLoggingMiddleware`

**Stores:**
- `memoryStore`, `MemorySessionStore`

**Plugins:**
- `analyticsPlugin`

**Utilities:**
- `tryCatch`, `isTryCatchError` — Error handling helpers

**Types:**
- All type definitions (see Section 8)

**Version:**
- `VERSION` — Runtime package version string

#### Via `@igniter-js/bot/adapters` (Organized)

```typescript
import { telegram, whatsapp, discord, builtinAdapters } from '@igniter-js/bot/adapters'
```

- `telegram` — Telegram adapter factory
- `whatsapp` — WhatsApp adapter factory
- `discord` — Discord adapter factory
- `builtinAdapters` — Namespace with all adapters
- `BuiltinAdapterName` — Type helper

#### Via `@igniter-js/bot/adapters/nextjs` (Route Helper)

```typescript
import { nextRouteHandlerAdapter } from '@igniter-js/bot/adapters/nextjs'
```

#### Via `@igniter-js/bot/adapters/tanstack-start` (Route Helper)

```typescript
import { tanstackStartRouteHandlerAdapter } from '@igniter-js/bot/adapters/tanstack-start'
```

#### Via `@igniter-js/bot/middlewares` (Organized)

```typescript
import {
  rateLimitMiddleware,
  rateLimitPresets,
  memoryRateLimitStore,
  MemoryRateLimitStore,
  authMiddleware,
  authPresets,
  roleMiddleware,
  loggingMiddleware,
  loggingPresets,
  commandLoggingMiddleware
} from '@igniter-js/bot/middlewares'
```

#### Via `@igniter-js/bot/plugins` (Organized)

```typescript
import { analyticsPlugin } from '@igniter-js/bot/plugins'
```

#### Via `@igniter-js/bot/stores` (Organized)

```typescript
import { memoryStore, MemorySessionStore } from '@igniter-js/bot/stores'
```

#### Via `@igniter-js/bot/types` (Organized)

```typescript
import type {
  BotContext,
  BotCommand,
  IBotAdapter,
  Middleware,
  BotPlugin,
  BotSession,
  BotSessionStore,
  BotSessionHelper,
  BotAdapterCapabilities,
  BotOutboundContent,
  BotSendOptions,
  AdapterClient,
  // ... all other types
} from '@igniter-js/bot/types'
```

### Quick Reference Table

| What You Need | Import Path | Example |
|---------------|-------------|---------|
| Everything | `@igniter-js/bot` | `import { IgniterBot, telegram } from '@igniter-js/bot'` |
| Adapters only | `@igniter-js/bot/adapters` | `import { telegram, whatsapp, discord } from '@igniter-js/bot/adapters'` |
| Next.js route helper | `@igniter-js/bot/adapters/nextjs` | `import { nextRouteHandlerAdapter } from '@igniter-js/bot/adapters/nextjs'` |
| TanStack Start helper | `@igniter-js/bot/adapters/tanstack-start` | `import { tanstackStartRouteHandlerAdapter } from '@igniter-js/bot/adapters/tanstack-start'` |
| Middlewares only | `@igniter-js/bot/middlewares` | `import { rateLimitMiddleware } from '@igniter-js/bot/middlewares'` |
| Plugins only | `@igniter-js/bot/plugins` | `import { analyticsPlugin } from '@igniter-js/bot/plugins'` |
| Stores only | `@igniter-js/bot/stores` | `import { memoryStore } from '@igniter-js/bot/stores'` |
| Types only | `@igniter-js/bot/types` | `import type { BotContext } from '@igniter-js/bot/types'` |

---

## 4. File Structure

```
src/
  builder/
    bot-builder.ts       # IgniterBotBuilder class (fluent API)
    index.ts             # Builder exports

  types/
    bot.types.ts         # Core types (BotContext, BotSendParams, etc)
    adapter.ts           # IBotAdapter interface and adapter parameter types
    capabilities.ts      # Capability system types
    content.ts           # Content types (text, media, interactive)
    session.ts           # Session management types
    plugins.ts           # Plugin system types
    builder.ts           # Builder-specific types
    utils.interface.ts   # Utility type helpers (Input, Prettify, Path, FieldType, etc)
    index.ts             # Type barrel

  adapters/
    telegram/
      telegram.adapter.ts   # Telegram Bot API adapter (implements IBotAdapter)
      telegram.client.ts    # HTTP client factory for Telegram API
      telegram.helpers.ts   # Parsing & escaping utilities
      telegram.schemas.ts   # Zod schemas for Telegram config
      index.ts              # Exports adapter factory
    whatsapp/
      whatsapp.adapter.ts   # WhatsApp Cloud API adapter (implements IBotAdapter)
      whatsapp.client.ts    # HTTP client factory for WhatsApp Cloud API
      whatsapp.helpers.ts   # Parsing utilities
      whatsapp.schemas.ts   # Zod schemas for WhatsApp config
      index.ts              # Exports adapter factory
    discord/
      discord.adapter.ts    # Discord Interactions adapter (implements IBotAdapter)
      discord.client.ts     # HTTP client factory for Discord API
      discord.helpers.ts    # Parsing utilities
      discord.schemas.ts    # Zod schemas for Discord config
      index.ts              # Exports adapter factory
    nextjs/
      index.ts              # Next.js route handler adapter
    tanstack-start/
      index.ts              # TanStack Start route handler adapter
    index.ts             # Adapter barrel

  middlewares/
    rate-limit.ts        # Rate limiting middleware + store
    auth.ts              # Authentication middleware + presets
    logging.ts           # Logging middleware + presets
    index.ts

  stores/
    memory.ts            # In-memory session store
    index.ts

  plugins/
    analytics.ts         # Analytics plugin example
    index.ts

  utils/
    try-catch.ts         # Error handling utilities (tryCatch, isTryCatchError)

  bot.provider.ts        # Bot class + adapter factory + errors + context helpers
  index.ts               # Main barrel export
```

### File Responsibilities

**Core Files:**
- `bot.provider.ts`: Contains the `Bot` class, `Bot.adapter()` factory, `Bot.command()` factory, `Bot.middleware()` factory, error handling (`BotError`, `BotErrorCodes`), and context helper creation (`createContextHelpers()`).
- `index.ts`: Main barrel export — re-exports everything from the package.

**Types (`types/`):**
- `bot.types.ts`: Core runtime types (`BotContext`, `BotSendParams`, `BotHandleParams`, `BotCommand`, `Middleware`, `BotLogger`, `BotAttachmentContent`, etc.)
- `adapter.ts`: Complete `IBotAdapter` interface definition, all adapter parameter types (`AdapterInitParams`, `AdapterSendTextParams`, etc.), and `AdapterClient` interface.
- `capabilities.ts`: `BotAdapterCapabilities` type and related capability declarations (`BotContentCapabilities`, `BotActionCapabilities`, `BotFeatureCapabilities`, `BotLimits`).
- `content.ts`: All content types (`BotTextContent`, `BotImageContent`, `BotOutboundContent`, `BotInboundContent`, `BotSendOptions`, `BotButton`, `BotInteractiveContent`, `BotCommandContent`, etc.)
- `session.ts`: Session-related types (`BotSession`, `BotSessionStore`, `BotSessionHelper`).
- `plugins.ts`: Plugin system types (`BotPlugin`, `BotPluginFactory`, `BotPluginRegistry`).
- `builder.ts`: Builder-specific types (`BotBuilderConfig`, `BotOptions`, `BotEventHandler`, `BotErrorHandler`, `BotStartHandler`).
- `utils.interface.ts`: Utility type helpers for advanced TypeScript patterns (`Input`, `Prettify`, `Path`, `FieldType`, `DeepPartial`, `WithContext`, etc.)

**Adapters (`adapters/`):**
- Each adapter directory contains:
  - `*.adapter.ts`: Main adapter implementation implementing `IBotAdapter`.
  - `*.client.ts`: HTTP client factory (`createTelegramClient`, `createWhatsAppClient`, `createDiscordClient`) that returns pre-configured `AdapterClient` instances.
  - `*.helpers.ts`: Platform-specific parsing and utility functions.
  - `*.schemas.ts`: Zod schemas for adapter configuration (supports environment variable defaults).
  - `index.ts`: Exports the adapter factory function.

**Builder (`builder/`):**
- `bot-builder.ts`: `IgniterBotBuilder` class implementing the fluent Builder Pattern API.
- `index.ts`: Exports builder API.

**Middlewares (`middlewares/`):**
- `rate-limit.ts`: Rate limiting middleware (`rateLimitMiddleware`), in-memory store (`MemoryRateLimitStore`), factory (`memoryRateLimitStore`), presets (`rateLimitPresets`), and `RateLimitOptions`/`RateLimitStore` interfaces.
- `auth.ts`: Authentication middleware (`authMiddleware`), presets (`authPresets`), role-based middleware (`roleMiddleware`), and `AuthOptions`/`RoleOptions` interfaces.
- `logging.ts`: Logging middleware (`loggingMiddleware`), presets (`loggingPresets`), command-specific logging (`commandLoggingMiddleware`), and `LoggingOptions` interface.
- `index.ts`: Re-exports all middlewares.

**Stores (`stores/`):**
- `memory.ts`: In-memory session store implementation (`MemorySessionStore`, `memoryStore()`).
- Custom stores should implement `BotSessionStore`.

**Plugins (`plugins/`):**
- `analytics.ts`: Example plugin demonstrating the plugin system (`analyticsPlugin()`).

**Utils (`utils/`):**
- `try-catch.ts`: Error handling utilities (`tryCatch`, `isTryCatchError`) for safe async operations.

---

## 5. IgniterBot Builder API

### 5.1 Builder Construction

```typescript
const bot = IgniterBot
  .create()                                  // Create builder
  .withHandle('@mybot')                      // Recommended: sets handle, auto-derives id/name
  .withId('custom-id')                       // Optional: override auto-derived ID
  .withName('Custom Name')                   // Optional: override auto-derived name
  .withLogger(logger)                        // Optional: structured logger
  .withSessionStore(memoryStore())           // Optional: session storage (defaults to memoryStore)
  .withOptions({ timeout: 30000 })           // Optional: advanced options
  .addAdapter('telegram', telegram({ ... })) // Required (≥1): platform adapter
  .addCommand('start', { ... })              // Optional: command
  .addMiddleware(middleware)                 // Optional: middleware
  .usePlugin(plugin)                         // Optional: plugin
  .onMessage(handler)                        // Optional: message listener
  .build()                                   // Required: creates Bot instance
```

### 5.2 Builder Methods

| Method | Purpose | Required |
|--------|---------|----------|
| `withHandle(handle)` | Set handle (@ prefixed), auto-derives id and name | Recommended |
| `withId(id)` | Override auto-derived bot ID | No |
| `withName(name)` | Override auto-derived display name | No |
| `withLogger(logger)` | Inject structured logger | No |
| `withSessionStore(store)` | Configure session storage (default: memoryStore) | No |
| `withOptions(options)` | Advanced config (timeout, retries, errorHandler) | No |
| `addAdapter(key, adapter)` | Add single platform adapter | Yes (≥1) |
| `addAdapters(adapters)` | Add multiple adapters at once | Yes (≥1) |
| `addCommand(name, cmd)` | Register single command | No |
| `addCommands(commands)` | Register multiple commands | No |
| `addCommandGroup(prefix, cmds)` | Register commands with common prefix | No |
| `addMiddleware(mw)` | Add to middleware pipeline | No |
| `addMiddlewares(mws)` | Add multiple middlewares | No |
| `usePlugin(plugin)` | Load plugin (registers commands, middlewares, adapters, hooks) | No |
| `onMessage(handler)` | Message event listener | No |
| `onError(handler)` | Error event listener | No |
| `onCommand(handler)` | Command event listener (see note below) | No |
| `onStart(handler)` | Start lifecycle hook | No |
| `build()` | Create Bot instance | Yes |

**Note on `onCommand`:** The builder stores `onCommand` handlers in `config.listeners.command`, but the current `Bot.process()` implementation does not emit a `command` event. This handler is preserved for future use and can be manually emitted via `bot.emit('command', ctx)`.

**Note on `withHandle`:** Calling `withHandle('@mybot')` sets `config.handle = '@mybot'`, auto-generates `config.id = 'mybot'` (strips `@`), and auto-generates `config.name = 'Mybot'` (capitalizes handle parts). Each adapter can override the global handle via its own config.

---

## 6. Bot Instance API

After calling `.build()`, you get a `Bot` instance that supports runtime extension:

### 6.1 Core Methods

| Method | Purpose |
|--------|---------|
| `start()` | Initialize all adapters (webhooks, command registration) |
| `handle(provider)` | Returns a `(request: Request) => Promise<Response>` handler |
| `send(params)` | Send message via adapter — routes to adapter-specific send methods based on content type |

**Handle flow:**
- **GET** → calls `adapter.verify()` if present; otherwise responds `200 OK`
- **POST** → calls `adapter.handle()`; returns `204` if handler returns `null`
- Unknown adapter → `404 Not Found`

**Bot.send() Content-Type Routing:**
The `Bot.send()` method automatically routes to the appropriate adapter method:

| `content.type` | Adapter Method Called |
|----------------|----------------------|
| `'text'` | `adapter.sendText()` |
| `'image'` | `adapter.sendImage()` |
| `'video'` | `adapter.sendVideo()` |
| `'audio'` | `adapter.sendAudio()` |
| `'document'` | `adapter.sendDocument()` |
| `'sticker'` | `adapter.sendSticker()` |
| `'location'` | `adapter.sendLocation()` |
| `'contact'` | `adapter.sendContact()` |
| `'poll'` | `adapter.sendPoll()` |
| `'interactive'` | `adapter.sendInteractive()` |
| `'reply'` | Recursively calls `send()` with nested content + reply options |

If an adapter doesn't implement the required method, a `BotError` with code `CONTENT_TYPE_NOT_SUPPORTED` is thrown.

### 6.2 Runtime Extension (Advanced)

| Method | Purpose |
|--------|---------|
| `registerAdapter(key, adapter)` | Add adapter after build |
| `registerCommand(name, command)` | Add command after build |
| `use(middleware)` | Add middleware after build |
| `on(event, callback)` | Subscribe to lifecycle event |
| `emit(event, ctx)` | Manually emit event to listeners |
| `onPreProcess(hook)` | Hook executed before middleware pipeline |
| `onPostProcess(hook)` | Hook executed after successful processing |

### 6.3 Static Factory Methods

**`Bot.adapter(definition)`** — Creates a validated adapter factory function. Used internally by first-party adapters and available for custom adapters. Accepts:
- `name`: Adapter identifier string
- `parameters`: Zod schema for config validation
- `capabilities`: `BotAdapterCapabilities` declaration
- `verify?`: Webhook verification handler (GET requests)
- `init`: Initialization handler (webhook setup, command registration)
- `handle`: Inbound request handler (POST requests)
- `client?`: HTTP client factory `(config, logger?) => AdapterClient`
- `sendText?`, `sendImage?`, etc.: Type-specific send methods
- `editMessage?`, `deleteMessage?`: Action methods

**`Bot.command(command)`** — Validates a command definition (name, aliases, description, help, handle). Throws if any required field is missing or invalid.

**`Bot.middleware(middleware)`** — Validates a middleware function (must accept exactly 2 parameters: ctx, next).

**`Bot.create(config)`** — Deprecated internal factory. Prefer `IgniterBot.create().build()`.

### 6.4 Error Handling

```typescript
export const BotErrorCodes = {
  CLIENT_NOT_PROVIDED: 'CLIENT_NOT_PROVIDED',
  PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
  COMMAND_NOT_FOUND: 'COMMAND_NOT_FOUND',
  INVALID_COMMAND_PARAMETERS: 'INVALID_COMMAND_PARAMETERS',
  ADAPTER_HANDLE_RETURNED_NULL: 'ADAPTER_HANDLE_RETURNED_NULL',
  CONTENT_TYPE_NOT_SUPPORTED: 'CONTENT_TYPE_NOT_SUPPORTED',
  INVALID_CONTENT: 'INVALID_CONTENT',
} as const

export class BotError extends Error {
  constructor(
    public code: BotErrorCode,
    message?: string,
    public meta?: Record<string, unknown>
  ) { ... }
}
```

---

## 7. Adapter Contract

### 7.1 IBotAdapter Interface

Adapters implement specific send methods based on their declared capabilities:

```typescript
interface IBotAdapter<TConfig extends ZodObject<any>> {
  name: string                          // Adapter identifier
  parameters: TConfig                   // Zod schema for config
  capabilities: BotAdapterCapabilities  // What this adapter supports
  _config?: TypeOf<TConfig>            // Internal: stored parsed config

  // ===== REQUIRED METHODS =====

  init: (params: AdapterInitParams<TypeOf<TConfig>>) => Promise<void>
  handle: (params: AdapterHandleParams<TypeOf<TConfig>>) => Promise<
    Omit<BotContext, 'bot' | 'session' | 'reply' | 'replyWithButtons' | 'replyWithImage' | 'replyWithDocument' | 'sendTyping'> | null
  >

  // ===== OPTIONAL METHODS =====

  verify?: (params: AdapterVerifyParams<TypeOf<TConfig>>) => Promise<Response | null>
  sendTyping?: (params: AdapterSendTypingParams<TypeOf<TConfig>>) => Promise<void>

  // ===== HTTP CLIENT =====

  client?: (config: TypeOf<TConfig>, logger?: BotLogger) => AdapterClient<TypeOf<TConfig>>

  // ===== SEND METHODS (based on capabilities.content.*) =====

  sendText?: (params: AdapterSendTextParams<TypeOf<TConfig>>) => Promise<void>
  sendImage?: (params: AdapterSendImageParams<TypeOf<TConfig>>) => Promise<void>
  sendVideo?: (params: AdapterSendVideoParams<TypeOf<TConfig>>) => Promise<void>
  sendAudio?: (params: AdapterSendAudioParams<TypeOf<TConfig>>) => Promise<void>
  sendDocument?: (params: AdapterSendDocumentParams<TypeOf<TConfig>>) => Promise<void>
  sendSticker?: (params: AdapterSendStickerParams<TypeOf<TConfig>>) => Promise<void>
  sendLocation?: (params: AdapterSendLocationParams<TypeOf<TConfig>>) => Promise<void>
  sendContact?: (params: AdapterSendContactParams<TypeOf<TConfig>>) => Promise<void>
  sendPoll?: (params: AdapterSendPollParams<TypeOf<TConfig>>) => Promise<void>
  sendInteractive?: (params: AdapterSendInteractiveParams<TypeOf<TConfig>>) => Promise<void>

  // ===== ACTION METHODS (based on capabilities.actions.*) =====

  editMessage?: (params: AdapterEditMessageParams<TypeOf<TConfig>>) => Promise<void>
  deleteMessage?: (params: AdapterDeleteMessageParams<TypeOf<TConfig>>) => Promise<void>
}
```

### 7.2 AdapterClient Interface

Adapters can optionally provide an HTTP client factory that returns a pre-configured client:

```typescript
interface AdapterClient<TConfig extends Record<string, any>> {
  get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T>
  post<T = any>(endpoint: string, body?: Record<string, any>): Promise<T>
  put<T = any>(endpoint: string, body?: Record<string, any>): Promise<T>
  patch<T = any>(endpoint: string, body?: Record<string, any>): Promise<T>
  delete<T = any>(endpoint: string, params?: Record<string, any>): Promise<T>
  request<T = any>(options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    endpoint: string
    body?: Record<string, any>
    params?: Record<string, any>
    headers?: Record<string, string>
  }): Promise<T>
}
```

### 7.3 Adapter Parameter Types

All adapter methods use typed parameter interfaces defined in `types/adapter.ts`:

- `AdapterInitParams` — For `init()` method
- `AdapterHandleParams` — For `handle()` method
- `AdapterVerifyParams` — For `verify()` method
- `AdapterSendTypingParams` — For `sendTyping()` method
- `AdapterSendTextParams`, `AdapterSendImageParams`, etc. — For each send method
- `AdapterEditMessageParams`, `AdapterDeleteMessageParams` — For action methods

All parameters include: `client?`, `config`, `logger?`, and method-specific fields.

### 7.4 Custom Adapter Creation

```typescript
export const myAdapter = Bot.adapter({
  name: 'my-platform',
  parameters: z.object({
    token: z.string().optional().default(process.env.MY_PLATFORM_TOKEN || ''),
    handle: z.string().optional()
  }),
  capabilities: {
    content: {
      text: true,
      image: true,
      video: false,
      audio: false,
      document: true,
      sticker: false,
      location: false,
      contact: false,
      poll: false,
      interactive: true,
    },
    actions: {
      edit: true,
      delete: true,
      react: false,
      pin: false,
      thread: false,
    },
    features: {
      webhooks: true,
      longPolling: false,
      commands: true,
      mentions: true,
      groups: true,
      channels: false,
      users: true,
      files: true,
    },
    limits: {
      maxMessageLength: 4096,
      maxFileSize: 50 * 1024 * 1024,
      maxButtonsPerMessage: 5
    }
  },

  // Optional: HTTP client factory
  client: (config, logger) => {
    return createMyPlatformClient(config.token, logger)
  },

  async init({ client, config, commands, logger, botHandle }) {
    if (client) {
      await client.post('/registerWebhook', { url: config.webhookUrl })
      await client.post('/setCommands', { commands })
    }
  },

  async handle({ request, config, logger, botHandle, client }) {
    const body = await request.json()
    return {
      event: 'message',
      provider: 'my-platform',
      channel: { id: body.channelId, name: body.channelId, isGroup: false },
      message: {
        id: body.messageId,
        content: { type: 'text', content: body.text, raw: body.text },
        author: { id: body.userId, name: body.userName, username: body.username },
        isMentioned: true
      }
    }
  },

  async sendText({ client, channel, text, options, config, logger }) {
    if (!client) throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED)
    await client.post('/sendMessage', { chat_id: channel, text, ...options })
  },

  async sendImage({ client, channel, image, caption, options, config, logger }) {
    if (!client) throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED)
    await client.post('/sendPhoto', { chat_id: channel, photo: image, caption })
  },

  async sendInteractive({ client, channel, text, buttons, inlineKeyboard, options, config, logger }) {
    if (!client) throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED)
    await client.post('/sendMessage', {
      chat_id: channel,
      text,
      reply_markup: { inline_keyboard: inlineKeyboard }
    })
  }
})
```

### 7.5 Built-in Adapter Capabilities Matrix

| Feature | Telegram | WhatsApp | Discord |
|---------|----------|----------|---------|
| Text | ✅ | ✅ | ✅ |
| Image | ✅ | ✅ | ✅ |
| Video | ✅ | ✅ | ✅ |
| Audio | ✅ | ✅ | ✅ |
| Document | ✅ | ✅ | ✅ |
| Sticker | ✅ | ❌ | ❌ |
| Location | ✅ | ✅ | ❌ |
| Contact | ✅ | ✅ | ❌ |
| Poll | ✅ | ❌ | ❌ |
| Interactive (buttons) | ✅ | ✅ | ✅ |
| Edit messages | ✅ | ❌ | ✅ |
| Delete messages | ✅ | ❌ | ✅ |
| Reactions | ❌ | ✅ | ✅ |
| Pin messages | ✅ | ❌ | ❌ |
| Webhooks | ✅ | ✅ | ✅ |
| Long polling | ✅ | ❌ | ❌ |
| Slash commands | ✅ | ❌ | ✅ |
| Max message length | 4,096 | 4,096 | 2,000 |
| Max file size | 50 MB | 100 MB | 25 MB |
| Max buttons/message | 8 | 3 | 5 per row |

---

## 8. Type System Reference

### 8.1 Core Types

**`BotContext`** — The primary context object passed through the middleware pipeline and to command handlers:
```typescript
interface BotContext {
  event: BotEvent                              // 'start' | 'message' | 'error'
  provider: string                              // e.g., 'telegram', 'whatsapp'
  bot: {
    id: string                                  // Bot unique identifier
    name: string                                // Bot display name
    send: (params) => Promise<void>             // Send messages
    getAdapter?: (provider: string) => IBotAdapter<any> | undefined
    getAdapters?: () => Record<string, IBotAdapter<any>>
  }
  channel: {
    id: string
    name: string
    isGroup: boolean
  }
  message: {
    id?: string
    content?: BotContent                        // Parsed content
    attachments?: BotAttachmentContent[]
    author: { id: string; name: string; username: string }
    isMentioned: boolean
  }
  session: BotSessionHelper                     // Session accessor

  // Helper methods (injected by createContextHelpers)
  reply(content, options?): Promise<void>
  replyWithButtons(text, buttons, options?): Promise<void>
  replyWithImage(image, caption?, options?): Promise<void>
  replyWithDocument(file, caption?, options?): Promise<void>
  editMessage?(messageId, content): Promise<void>
  deleteMessage?(messageId): Promise<void>
  react?(emoji, messageId?): Promise<void>
  sendTyping?(): Promise<void>
}
```

**`BotCommand`** — Command definition:
```typescript
interface BotCommand<TContext = BotContext, TArgs = any> {
  name: string                    // Command name (no slash)
  aliases: string[]               // Alternative names
  description: string             // Short description
  help: string                    // Help text
  args?: ZodType<TArgs>           // Zod schema for validation
  handle: (ctx: TContext, params: TArgs) => Promise<void>
  subcommands?: Record<string, Omit<BotCommand<TContext>, 'name' | 'aliases'>>
}
```

**`Middleware`** — Middleware function signature:
```typescript
type Middleware<TContextIn = BotContext, TContextOut = TContextIn> = (
  ctx: TContextIn,
  next: () => Promise<void>
) => Promise<void | Partial<TContextOut>>
```

### 8.2 Session Types

```typescript
interface BotSession {
  userId: string
  channelId: string
  data: Record<string, any>
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
}

interface BotSessionStore {
  get(userId: string, channelId: string): Promise<BotSession | null>
  set(userId: string, channelId: string, session: BotSession): Promise<void>
  delete(userId: string, channelId: string): Promise<void>
  clear(userId: string): Promise<void>
}

interface BotSessionHelper extends BotSession {
  save(): Promise<void>
  delete(): Promise<void>
  update(data: Partial<Record<string, any>>): Promise<void>
}
```

### 8.3 Plugin Types

```typescript
interface BotPlugin {
  name: string
  version: string
  description?: string
  commands?: Record<string, BotCommand>
  middlewares?: Middleware<any, any>[]
  adapters?: Record<string, IBotAdapter<any>>
  hooks?: {
    onStart?: () => Promise<void> | void
    onMessage?: (ctx: BotContext) => Promise<void> | void
    onError?: (ctx: BotContext & { error: BotError }) => Promise<void> | void
    onStop?: () => Promise<void> | void
  }
  config?: Record<string, any>
}
```

### 8.4 Builder Types

```typescript
interface BotOptions {
  timeout?: number
  retries?: number
  autoRegisterCommands?: boolean
  errorHandler?: (error: BotError, context?: BotContext) => void | Promise<void>
}

interface BotBuilderConfig {
  handle?: string
  id?: string
  name?: string
  logger?: BotLogger
  adapters: Record<string, IBotAdapter<any>>
  commands: Record<string, BotCommand>
  middlewares: Middleware<any, any>[]
  sessionStore?: BotSessionStore
  plugins: BotPlugin[]
  options?: BotOptions
  listeners: {
    message: BotEventHandler[]
    error: BotErrorHandler[]
    command: BotEventHandler[]
    start: BotStartHandler[]
  }
}
```

### 8.5 Utility Types (utils.interface.ts)

- `Input<T>` — Marks optional/undefined properties correctly
- `Prettify<T>` — Flattens intersection types for better IDE hints
- `Path<T>` — All dot-notation paths through an object type
- `FieldType<T, K>` — Type at a specific dot-notation path
- `DeepPartial<T>` — Recursively partial
- `WithContext<Payload, Context>` — Adds context property to payload
- `NonUnknownObject<T>` — Filters out unknown-typed keys
- `IsEmptyObject<T>` — Checks if object has no properties

---

## 9. Middleware Reference

### 9.1 Rate Limiting (`rate-limit.ts`)

**Exports:**
- `rateLimitMiddleware(options: RateLimitOptions)` — Creates rate-limiting middleware
- `rateLimitPresets` — `{ strict, moderate, lenient, perCommand }` (all functions)
- `MemoryRateLimitStore` — In-memory rate limit store class
- `memoryRateLimitStore()` — Factory for in-memory store
- `RateLimitOptions` — Configuration interface
- `RateLimitStore` — Store interface (for custom backends)

**RateLimitOptions:**
- `maxRequests: number` — Max requests in window
- `windowMs: number` — Time window in ms
- `store?: RateLimitStore` — Storage backend (default: `MemoryRateLimitStore`)
- `keyGenerator?: (ctx) => string` — Custom key (default: `provider:userId`)
- `message?: string | ((ctx, retryAfter) => string)` — Rate limit message
- `skip?: (ctx) => boolean | Promise<boolean>` — Skip condition
- `onLimitReached?: (ctx, retryAfter) => void | Promise<void>` — Handler

### 9.2 Authentication (`auth.ts`)

**Exports:**
- `authMiddleware(options: AuthOptions)` — Creates authentication middleware
- `authPresets` — `{ adminsOnly, privateOnly, groupsOnly, whitelist, blacklist }` (all functions)
- `roleMiddleware(options: RoleOptions)` — Creates role-based auth middleware
- `AuthOptions` — Configuration interface
- `RoleOptions` — Role configuration interface

**AuthOptions:**
- `allowedUsers?: string[]` — Whitelist user IDs
- `allowedChannels?: string[]` — Whitelist channel IDs
- `blockedUsers?: string[]` — Blacklist user IDs
- `blockedChannels?: string[]` — Blacklist channel IDs
- `checkFn?: (ctx) => boolean | Promise<boolean>` — Custom auth function
- `unauthorizedMessage?: string | ((ctx) => string)`
- `skip?: (ctx) => boolean | Promise<boolean>`
- `onUnauthorized?: (ctx) => void | Promise<void>`

**RoleOptions:**
- `getRoles: (userId, ctx) => string[] | Promise<string[]>` — Role resolver
- `requiredRoles: string[]` — Required roles (user must have at least one)
- `unauthorizedMessage?: string`

### 9.3 Logging (`logging.ts`)

**Exports:**
- `loggingMiddleware(options?: LoggingOptions)` — Creates logging middleware
- `loggingPresets` — `{ minimal, standard, verbose, debug, production }` (all functions)
- `commandLoggingMiddleware(options)` — Command-specific logging middleware
- `LoggingOptions` — Configuration interface

**LoggingOptions:**
- `logger?: BotLogger` — Logger instance (default: `console`)
- `logMessages?: boolean` — Log incoming messages
- `logCommands?: boolean` — Log command executions
- `logErrors?: boolean` — Log errors
- `logMetrics?: boolean` — Log execution time
- `includeUserInfo?: boolean` — Include user data
- `includeContent?: boolean` — Include message content (may contain PII)
- `formatter?: (ctx, event, data) => string` — Custom log formatter
- `skip?: (ctx) => boolean` — Skip condition

---

## 10. Execution Pipeline

### 10.1 Request Processing Flow

```
Inbound Request (POST)
  ↓
bot.handle(provider)(request)
  ↓
adapter.handle(request, config, logger, botHandle)
  ↓ (returns BotContext or null)
  ↓
bot.process(context)  [internal]
  ↓
  1. Pre-process hooks (ctx → enriched ctx)
  2. Middleware pipeline (ordered, each calls next())
  3. Command resolution (if content.type === 'command')
  4. Command handler execution
  5. Post-process hooks
  6. Event emission (message, error)
  ↓
Response (204 No Content, or adapter-specific)
```

### 10.2 Middleware Execution Order

```
Middleware 1 → Middleware 2 → Middleware 3 → Command Handler
     ↑              ↑              ↑
     └──────────────┴──────────────┘  (each calls next())
```

If a middleware does NOT call `next()`, the chain stops and no subsequent middlewares or command handlers execute.

### 10.3 Session Lifecycle

```
1. Pre-process hook loads session from store (or creates new)
2. Middleware pipeline executes (session available via ctx.session)
3. Command handler reads/writes session data
4. Post-process hook saves session to store
5. Session expires after expiresAt (configurable per store)
```

---

## 11. TSDoc Quality Standards

All public-facing symbols must have JSDoc comments following these rules:

### 11.1 Required for All Public Exports

- **Classes**: `@description` with purpose and usage example
- **Functions/Methods**: `@param` for each parameter, `@returns` for return type, `@example` for usage
- **Interfaces**: `@description` per interface, `@description` per property
- **Types**: `@description` with `@example` showing usage
- **Constants**: `@description` explaining purpose

### 11.2 Convention

```typescript
/**
 * Brief one-line summary.
 *
 * Detailed description with context and behavior notes.
 *
 * @param name - Parameter description with type info
 * @returns Description of return value
 *
 * @example
 * ```typescript
 * // Minimal working example
 * ```
 */
```

### 11.3 Current Coverage

Current TSDoc coverage is strong in:
- `bot.provider.ts` — All public classes, methods, and errors documented
- `bot-builder.ts` — Every builder method documented with @param and @example
- `types/bot.types.ts` — All interfaces and types documented
- `types/adapter.ts` — All parameter interfaces documented
- `types/capabilities.ts` — All capability interfaces documented
- `types/session.ts` — All session types documented
- `types/plugins.ts` — All plugin types documented
- `types/utils.interface.ts` — All utility types documented with @example
- `middlewares/` — All middleware functions documented with @param and @example
- `stores/memory.ts` — Session store documented with @example
- `plugins/analytics.ts` — Plugin documented with @param and @example

**Note for contributors:** When adding new public exports, follow the existing JSDoc patterns. Adapter implementations (`*.adapter.ts`, `*.client.ts`, `*.helpers.ts`, `*.schemas.ts`) may have lighter documentation if their API is encapsulated by the adapter factory.

---

## 12. Context Helper Methods

The `BotContext` object is enriched with helper methods via `createContextHelpers()` in `bot.provider.ts`. These helpers delegate to adapter-specific methods:

| Method | Adapter Method Required | Fallback if Missing |
|--------|------------------------|---------------------|
| `ctx.reply(content, options?)` | Routes to appropriate `send*` based on content type | Throws `CONTENT_TYPE_NOT_SUPPORTED` |
| `ctx.replyWithButtons(text, buttons, options?)` | `sendInteractive` | Throws `CONTENT_TYPE_NOT_SUPPORTED` |
| `ctx.replyWithImage(image, caption?, options?)` | `sendImage` | Throws `CONTENT_TYPE_NOT_SUPPORTED` |
| `ctx.replyWithDocument(file, caption?, options?)` | `sendDocument` | Throws `CONTENT_TYPE_NOT_SUPPORTED` |
| `ctx.editMessage?(messageId, content)` | `editMessage` | Method is `undefined` (optional) |
| `ctx.deleteMessage?(messageId)` | `deleteMessage` | Method is `undefined` (optional) |
| `ctx.react?(emoji, messageId?)` | N/A (not implemented in adapters) | Method is `undefined` (optional) |
| `ctx.sendTyping?()` | `sendTyping` | Method is `undefined` (optional) |

---

## 13. Frameworks Integration

### 13.1 Next.js (App Router)

The `nextRouteHandlerAdapter` creates GET/POST handlers for Next.js App Router dynamic routes:

```typescript
// app/api/bots/[botId]/[adapter]/route.ts
import { nextRouteHandlerAdapter } from '@igniter-js/bot/adapters/nextjs'

const handlers = nextRouteHandlerAdapter({
  'my-bot': bot,
})

export const GET = handlers.GET
export const POST = handlers.POST
```

**Route Pattern:** `/api/bots/[botId]/[adapter]`

### 13.2 TanStack Start

```typescript
// app/routes/api/bots/$botId/$adapter.ts
import { tanstackStartRouteHandlerAdapter } from '@igniter-js/bot/adapters/tanstack-start'

const handlers = tanstackStartRouteHandlerAdapter({
  'my-bot': bot,
})

export const handler = handlers
```

**Route Pattern:** `/api/bots/$botId/$adapter`

---

## 14. Package Configuration

```json
{
  "exports": {
    ".": "./dist/index.mjs",
    "./adapters": "./dist/adapters/index.mjs",
    "./adapters/telegram": "./dist/adapters/telegram/index.mjs",
    "./adapters/whatsapp": "./dist/adapters/whatsapp/index.mjs",
    "./adapters/discord": "./dist/adapters/discord/index.mjs",
    "./adapters/nextjs": "./dist/adapters/nextjs/index.mjs",
    "./adapters/tanstack-start": "./dist/adapters/tanstack-start/index.mjs",
    "./middlewares": "./dist/middlewares/index.mjs",
    "./plugins": "./dist/plugins/index.mjs",
    "./stores": "./dist/stores/index.mjs",
    "./types": "./dist/types/index.mjs"
  },
  "sideEffects": false
}
```

**Key constraints:**
- `sideEffects: false` — All imports are pure; tree-shaking works by default
- No circular dependencies between modules
- Only `zod` is a runtime dependency; everything else is bundled
- TypeScript >= 5.0 required as peer dependency

---

## 15. Testing

### 15.1 Unit Testing Middlewares

```typescript
import { describe, it, expect, vi } from 'vitest'
import { rateLimitMiddleware, MemoryRateLimitStore } from '@igniter-js/bot/middlewares'

describe('rateLimitMiddleware', () => {
  it('should allow requests within limit', async () => {
    const middleware = rateLimitMiddleware({
      maxRequests: 3,
      windowMs: 60000,
      store: new MemoryRateLimitStore(),
    })

    const ctx = createMockContext()
    const next = vi.fn()

    await middleware(ctx, next)
    expect(next).toHaveBeenCalled()
  })

  it('should block requests exceeding limit', async () => {
    const middleware = rateLimitMiddleware({
      maxRequests: 1,
      windowMs: 60000,
      store: new MemoryRateLimitStore(),
    })

    const ctx = createMockContext()
    ctx.reply = vi.fn()

    await middleware(ctx, vi.fn()) // First request
    await middleware(ctx, vi.fn()) // Second request (blocked)

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Rate limit'))
  })
})
```

### 15.2 Testing Commands

```typescript
it('should handle start command', async () => {
  const command = {
    name: 'start',
    aliases: [],
    description: 'Start',
    help: 'Use /start',
    async handle(ctx) {
      await ctx.reply('Hello!')
    }
  }

  const ctx = createMockContext()
  await command.handle(ctx)
  expect(ctx.reply).toHaveBeenCalledWith('Hello!')
})
```

### 15.3 Testing Adapters

```typescript
it('should create telegram adapter with config', () => {
  const adapter = telegram({ token: 'test-token' })
  expect(adapter.name).toBe('telegram')
  expect(adapter.capabilities.content.text).toBe(true)
})
```

---

## 16. Code Generation Targets

All builds target `ES2022` with both ESM (`.mjs`) and CJS (`.cjs`) outputs via tsup:

```
dist/
  index.mjs          # ESM main entry
  index.js           # CJS main entry
  index.d.ts         # Type declarations
  adapters/
    index.mjs
    index.js
    index.d.ts
    telegram/
      index.mjs
      index.js
      index.d.ts
    whatsapp/...
    discord/...
    nextjs/...
    tanstack-start/...
  middlewares/
    index.mjs, index.js, index.d.ts
  plugins/
    index.mjs, index.js, index.d.ts
  stores/
    index.mjs, index.js, index.d.ts
  types/
    index.mjs, index.js, index.d.ts
```

---

## 17. Maintenance Notes

### 17.1 When Adding a New Adapter

1. Create directory under `src/adapters/<platform>/`
2. Implement files: `*.adapter.ts`, `*.client.ts`, `*.helpers.ts`, `*.schemas.ts`, `index.ts`
3. Add export to `src/adapters/index.ts`
4. Add export to `src/index.ts`
5. Add tsup entry in `package.json`
6. Add exports map in `package.json`
7. Update this AGENTS.md (Sections 3, 4, 7.5)
8. Update README.md with adapter details

### 17.2 When Adding a New Middleware

1. Create file under `src/middlewares/<name>.ts`
2. Export from `src/middlewares/index.ts`
3. Follow existing patterns (factory function, presets object)
4. Add full JSDoc with @param, @returns, @example
5. Update this AGENTS.md (Sections 3, 9)
6. Update README.md with middleware docs

### 17.3 When Adding a New Export to index.ts

1. Add explicit re-export in `src/index.ts`
2. Add organized import path in `package.json` exports if needed
3. Update AGENTS.md import reference table
4. Update README.md if user-facing

### 17.4 Package Health Checks

```bash
cd packages/bot
pnpm typecheck        # Verify no type errors
pnpm lint             # ESLint checks
pnpm test             # Run test suite
pnpm build            # Verify build succeeds
```

---

## 18. Related Resources

- [Igniter.js Documentation](https://igniterjs.com)
- [Telegram Bot API Docs](https://core.telegram.org/bots/api)
- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Discord Developer Docs](https://discord.com/developers/docs)
- [Zod Documentation](https://zod.dev)
