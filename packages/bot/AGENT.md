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
   - Pluggable storage backends (Memory, Redis, Prisma)
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

### Main Exports

Via `@igniter-js/bot`:

**Builder API:**
- `IgniterBot` / `IgniterBotBuilder` - Main builder class

**Core:**
- `Bot` - Internal bot class (used by builder)
- `BotError`, `BotErrorCodes` - Error handling

**Adapters:**
- `telegram` - Telegram adapter factory
- `whatsapp` - WhatsApp adapter factory
- `adapters` - Namespace with all adapters

**Middlewares:**
- `rateLimitMiddleware`, `rateLimitPresets`
- `authMiddleware`, `authPresets`, `roleMiddleware`
- `loggingMiddleware`, `loggingPresets`, `commandLoggingMiddleware`
- `memoryRateLimitStore`

**Stores:**
- `memoryStore` - Memory session store factory
- `MemorySessionStore` - Memory store class

**Plugins:**
- `analyticsPlugin` - Analytics plugin factory

**Types:**
- All types from `./types` (BotContext, BotCommand, etc)

Via `@igniter-js/bot/types`:
- All type definitions

Via `@igniter-js/bot/adapters`:
- `telegram`, `whatsapp`, `builtinAdapters`

---

## 4. File Structure

```
src/
  builder/
    bot-builder.ts       # IgniterBotBuilder class (fluent API)
    index.ts             # Builder exports
  
  core/                  # (Reserved for future Bot refactor)
  
  types/
    bot.types.ts         # Core types (BotContext, IBotAdapter, etc)
    capabilities.ts      # Capability system types
    content.ts           # Content types (text, media, interactive)
    session.ts           # Session management types
    plugins.ts           # Plugin system types
    builder.ts           # Builder-specific types
    index.ts             # Type barrel
  
  adapters/
    telegram/
      telegram.adapter.ts   # Telegram Bot API adapter
      telegram.helpers.ts   # Parsing & escaping utilities
      telegram.schemas.ts   # Zod schemas
      index.ts
    whatsapp/
      whatsapp.adapter.ts   # WhatsApp Cloud API adapter
      whatsapp.helpers.ts   # Parsing utilities
      whatsapp.schemas.ts   # Zod schemas
      index.ts
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
    try-catch.ts         # Error handling utilities
  
  bot.provider.ts        # Bot class + adapter factory + errors
  index.ts               # Main barrel export
```

---

## 5. IgniterBot Builder API

### 5.1 Builder Construction

```typescript
const bot = IgniterBot
  .create()                                  // Create builder
  .withId('bot-id')                          // Required
  .withName('Bot Name')                      // Required
  .withLogger(logger)                        // Optional
  .withSessionStore(memoryStore())           // Optional
  .withOptions({ timeout: 30000 })           // Optional
  .addAdapter('telegram', telegram({ ... })) // At least one required
  .addCommand('start', { ... })              // Optional
  .addMiddleware(middleware)                 // Optional
  .usePlugin(plugin)                         // Optional
  .onMessage(handler)                        // Optional
  .build()                                   // Required - creates Bot instance
```

### 5.2 Builder Methods

| Method | Purpose | Required |
|--------|---------|----------|
| `withId(id)` | Set bot unique ID | Yes |
| `withName(name)` | Set bot display name | Yes |
| `withLogger(logger)` | Inject logger | No |
| `withSessionStore(store)` | Configure sessions | No |
| `withOptions(options)` | Advanced config | No |
| `addAdapter(key, adapter)` | Add platform adapter | Yes (≥1) |
| `addAdapters(adapters)` | Add multiple adapters | Yes (≥1) |
| `addCommand(name, cmd)` | Register command | No |
| `addCommands(commands)` | Register multiple | No |
| `addCommandGroup(prefix, cmds)` | Prefixed commands | No |
| `addMiddleware(mw)` | Add to pipeline | No |
| `addMiddlewares(mws)` | Add multiple | No |
| `usePlugin(plugin)` | Load plugin | No |
| `onMessage(handler)` | Message listener | No |
| `onError(handler)` | Error listener | No |
| `onCommand(handler)` | Command listener | No |
| `onStart(handler)` | Start hook | No |
| `build()` | Create Bot instance | Yes |

---

## 6. Bot Instance API

After calling `.build()`, you get an immutable `Bot` instance:

### 6.1 Core Methods

| Method | Purpose |
|--------|---------|
| `start()` | Initialize adapters (webhooks, command registration) |
| `handle(provider, request)` | Process webhook HTTP request |
| `send({ provider, channel, content })` | Send message via adapter |

### 6.2 Runtime Extension (Advanced)

| Method | Purpose |
|--------|---------|
| `registerAdapter(key, adapter)` | Add adapter after build |
| `registerCommand(name, command)` | Add command after build |
| `use(middleware)` | Add middleware after build |
| `on(event, handler)` | Subscribe to event after build |
| `emit(event, ctx)` | Manually emit event |
| `onPreProcess(hook)` | Hook before pipeline |
| `onPostProcess(hook)` | Hook after pipeline |

---

## 7. Adapter Contract

### 7.1 IBotAdapter Interface

```typescript
interface IBotAdapter<TConfig extends ZodObject<any>> {
  name: string                        // Adapter identifier
  parameters: TConfig                 // Zod schema for config
  capabilities: BotAdapterCapabilities // What this adapter supports
  
  verify?: (params: {                // Optional webhook verification
    request: Request
    config: TypeOf<TConfig>
    logger?: BotLogger
  }) => Promise<Response | null>
  
  init: (params: {                   // Initialize adapter
    config: TypeOf<TConfig>
    commands: BotCommand[]
    logger?: BotLogger
  }) => Promise<void>
  
  send: (params: {                   // Send message
    provider: string
    channel: string
    content: { type: 'text'; content: string }
    config: TConfig
    logger?: BotLogger
  }) => Promise<void>
  
  handle: (params: {                 // Parse webhook
    request: Request
    config: TypeOf<TConfig>
    logger?: BotLogger
  }) => Promise<Omit<BotContext, 'bot' | 'session' | 'reply' | ...> | null>
}
```

### 7.2 Adapter Creation

```typescript
export const myAdapter = Bot.adapter({
  name: 'my-platform',
  parameters: z.object({
    token: z.string(),
    handle: z.string()
  }),
  capabilities: {
    content: {
      text: true,
      image: true,
      video: false,
      // ... all other content types
    },
    actions: {
      edit: true,
      delete: false,
      // ... all other actions
    },
    features: {
      webhooks: true,
      commands: true,
      // ... all other features
    },
    limits: {
      maxMessageLength: 4096,
      maxFileSize: 50 * 1024 * 1024,
      maxButtonsPerMessage: 5
    }
  },
  async init({ config, commands, logger }) {
    // Register webhooks, sync commands, etc
  },
  async send({ channel, content, config, logger }) {
    // Call platform API to send message
  },
  async handle({ request, config, logger }) {
    const body = await request.json()
    
    // Parse and return context, or null to ignore
    return {
      event: 'message',
      provider: 'my-platform',
      channel: { id: '...', name: '...', isGroup: false },
      message: {
        content: { type: 'text', content: '...', raw: '...' },
        author: { id: '...', name: '...', username: '...' },
        isMentioned: true
      }
    }
  }
})
```

### 7.3 Adapter Rules

1. **No side effects** at module top-level
2. **Validate** all inputs with Zod
3. **Return null** from `handle()` to ignore updates
4. **Never return Response** from `handle()` - framework handles HTTP
5. **Use logger** instead of console
6. **Declare capabilities** accurately
7. **Handle errors** gracefully (throw or log)

---

## 8. Command System

### 8.1 Command Structure

```typescript
interface BotCommand<TArgs = any> {
  name: string                          // Command name (no slash)
  aliases: string[]                     // Alternative names
  description: string                   // Short description
  help: string                          // Help text
  args?: ZodType<TArgs>                // Optional Zod schema
  handle: (ctx, params: TArgs) => Promise<void>
  subcommands?: Record<string, BotCommand> // Nested commands
}
```

### 8.2 Command Registration

```typescript
// Single command
.addCommand('ping', {
  name: 'ping',
  aliases: [],
  description: 'Ping pong',
  help: 'Use /ping',
  async handle(ctx) {
    await ctx.reply('Pong!')
  }
})

// With validation
.addCommand('ban', {
  name: 'ban',
  args: z.object({
    userId: z.string(),
    reason: z.string().optional()
  }),
  async handle(ctx, args) {
    // args is typed!
  }
})

// With subcommands
.addCommand('config', {
  name: 'config',
  subcommands: {
    set: { ... },
    get: { ... }
  }
})
```

### 8.3 Command Resolution

- Case-insensitive lookup
- O(1) resolution via internal index
- Aliases work exactly like primary name
- Help text shown on validation error

---

## 9. Middleware System

### 9.1 Middleware Signature

```typescript
type Middleware = (
  ctx: BotContext,
  next: () => Promise<void>
) => Promise<void>
```

### 9.2 Execution Order

1. `preProcessHooks` (if registered via `bot.onPreProcess()`)
2. `middlewares` (in registration order)
3. Event `listeners` (all listeners for event run in parallel)
4. Command `handler` (if message is a command)
5. `postProcessHooks` (if registered via `bot.onPostProcess()`)

Errors in middleware/command trigger `error` event.

### 9.3 Built-in Middlewares

**Rate Limiting:**
```typescript
rateLimitMiddleware({
  maxRequests: 10,
  windowMs: 60000,
  store: memoryRateLimitStore(),
  message: 'Too many requests',
  skip: (ctx) => isAdmin(ctx.message.author.id)
})
```

**Authentication:**
```typescript
authMiddleware({
  allowedUsers: ['user1'],
  blockedUsers: ['spammer'],
  checkFn: async (ctx) => await isAuthorized(ctx),
  unauthorizedMessage: 'Access denied'
})
```

**Logging:**
```typescript
loggingMiddleware({
  logMessages: true,
  logCommands: true,
  logMetrics: true,
  includeUserInfo: true,
  includeContent: false // Privacy
})
```

---

## 10. Session Management

### 10.1 Session Store Interface

```typescript
interface BotSessionStore {
  get(userId: string, channelId: string): Promise<BotSession | null>
  set(userId: string, channelId: string, session: BotSession): Promise<void>
  delete(userId: string, channelId: string): Promise<void>
  clear(userId: string): Promise<void>
}
```

### 10.2 Built-in Stores

**Memory Store:**
```typescript
.withSessionStore(memoryStore({
  cleanupIntervalMs: 60000 // Clean expired every minute
}))
```

**Future Stores:**
- `redisStore(client)` - Redis-backed sessions
- `prismaStore(prisma)` - Database-backed sessions

### 10.3 Session Usage

```typescript
.addCommand('survey', {
  name: 'survey',
  async handle(ctx) {
    // Access session
    const session = ctx.session
    
    // Read data
    const step = session.data.step || 0
    
    // Write data
    session.data.step = step + 1
    session.data.answers = { ... }
    
    // Persist
    await session.save()
    
    // Or delete
    await session.delete()
  }
})
```

---

## 11. Plugin System

### 11.1 Plugin Interface

```typescript
interface BotPlugin {
  name: string
  version: string
  description?: string
  commands?: Record<string, BotCommand>
  middlewares?: Middleware[]
  adapters?: Record<string, IBotAdapter<any>>
  hooks?: {
    onStart?: () => Promise<void>
    onMessage?: (ctx: BotContext) => Promise<void>
    onError?: (ctx: BotContext & { error: BotError }) => Promise<void>
    onStop?: () => Promise<void>
  }
  config?: Record<string, any>
}
```

### 11.2 Creating Plugins

```typescript
export const myPlugin: BotPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  
  commands: {
    plugincmd: { ... }
  },
  
  middlewares: [
    async (ctx, next) => {
      // Plugin middleware
      await next()
    }
  ],
  
  hooks: {
    onStart: async () => {
      console.log('Plugin started')
    }
  }
}

// Usage
.usePlugin(myPlugin)
```

---

## 12. Capabilities System

### 12.1 Capability Declaration

Every adapter must declare:

```typescript
capabilities: {
  content: {
    text: boolean
    image: boolean
    video: boolean
    audio: boolean
    document: boolean
    sticker: boolean
    location: boolean
    contact: boolean
    poll: boolean
    interactive: boolean
  },
  actions: {
    edit: boolean
    delete: boolean
    react: boolean
    pin: boolean
    thread: boolean
  },
  features: {
    webhooks: boolean
    longPolling: boolean
    commands: boolean
    mentions: boolean
    groups: boolean
    channels: boolean
    users: boolean
    files: boolean
  },
  limits: {
    maxMessageLength: number
    maxFileSize: number
    maxButtonsPerMessage: number
  }
}
```

### 12.2 Checking Capabilities

```typescript
.addCommand('feature', {
  name: 'feature',
  async handle(ctx) {
    const adapter = ctx.bot.getAdapter?.(ctx.provider)
    
    if (!adapter?.capabilities.actions.edit) {
      await ctx.reply('Edit not supported on this platform')
      return
    }
    
    await ctx.editMessage?.('msg_id', { ... })
  }
})
```

---

## 13. Context Object

### 13.1 Context Structure

```typescript
interface BotContext {
  event: 'message' | 'error' | 'start'
  provider: string
  bot: {
    id: string
    name: string
    send: (params) => Promise<void>
    getAdapter?: (provider) => IBotAdapter | undefined
    getAdapters?: () => Record<string, IBotAdapter>
  }
  channel: {
    id: string
    name: string
    isGroup: boolean
  }
  message: {
    id?: string
    content?: BotContent
    attachments?: BotAttachmentContent[]
    author: {
      id: string
      name: string
      username: string
    }
    isMentioned: boolean
  }
  session: BotSessionHelper
  
  // Helper methods
  reply(content, options?): Promise<void>
  replyWithButtons(text, buttons, options?): Promise<void>
  replyWithImage(image, caption?, options?): Promise<void>
  replyWithDocument(file, caption?, options?): Promise<void>
  editMessage?(messageId, content): Promise<void>
  deleteMessage?(messageId): Promise<void>
  react?(emoji, messageId?): Promise<void>
}
```

### 13.2 Helper Methods

Framework injects these into context automatically:

- `reply()` - Simple text/content reply
- `replyWithButtons()` - Interactive message
- `replyWithImage()` - Image with caption
- `replyWithDocument()` - File with caption
- `editMessage()` - Edit existing message (if supported)
- `deleteMessage()` - Delete message (if supported)
- `react()` - React with emoji (if supported)

Adapters should NOT implement these - they're added by the framework.

---

## 14. Content Types

### 14.1 Inbound Content

Content received from users:

- `BotTextContent` - Plain text
- `BotCommandContent` - Commands (starting with `/`)
- `BotImageContent` - Images
- `BotVideoContent` - Videos
- `BotAudioContent` - Audio/voice
- `BotDocumentContent` - Files
- `BotStickerContent` - Stickers
- `BotLocationContent` - GPS locations
- `BotContactContent` - Contact cards
- `BotPollContent` - Polls
- `BotCallbackContent` - Button presses

### 14.2 Outbound Content

Content sent by bot (extends inbound):

- All inbound types, plus:
- `BotInteractiveContent` - Buttons, keyboards, menus
- `BotReplyContent` - Thread/reply to specific message

---

## 15. Error Handling

### 15.1 Error Codes

```typescript
export const BotErrorCodes = {
  PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
  COMMAND_NOT_FOUND: 'COMMAND_NOT_FOUND',
  INVALID_COMMAND_PARAMETERS: 'INVALID_COMMAND_PARAMETERS',
  ADAPTER_HANDLE_RETURNED_NULL: 'ADAPTER_HANDLE_RETURNED_NULL',
}
```

### 15.2 Error Handling

```typescript
.onError(async (ctx) => {
  const errorCtx = ctx as typeof ctx & { error?: BotError }
  
  if (errorCtx.error?.code === BotErrorCodes.COMMAND_NOT_FOUND) {
    await ctx.reply('Unknown command. Use /help')
  } else {
    await ctx.reply('Something went wrong. Please try again.')
  }
})
```

---

## 16. Testing Guidelines

### 16.1 Unit Tests

Test individual components:

```typescript
import { describe, it, expect } from 'vitest'
import { IgniterBot, telegram } from '@igniter-js/bot'

describe('Bot Builder', () => {
  it('should build valid bot', () => {
    const bot = IgniterBot
      .create()
      .withId('test')
      .withName('Test')
      .addAdapter('telegram', telegram({ token: 'test', handle: '@test' }))
      .build()
    
    expect(bot).toBeDefined()
  })
  
  it('should throw without ID', () => {
    expect(() => {
      IgniterBot.create().withName('Test').build()
    }).toThrow('Bot ID is required')
  })
})
```

### 16.2 Adapter Tests

Mock HTTP calls:

```typescript
describe('Telegram Adapter', () => {
  it('should parse text message', async () => {
    const adapter = telegram({ token: 'test', handle: '@test' })
    const request = new Request('https://example.com', {
      method: 'POST',
      body: JSON.stringify({ message: { text: 'Hello' } })
    })
    
    const context = await adapter.handle({ request, config: { ... } })
    expect(context?.message.content?.type).toBe('text')
  })
})
```

---

## 17. Best Practices for AI Agents

### 17.1 Before Creating New Adapters

1. Study existing adapters (`telegram.adapter.ts`, `whatsapp.adapter.ts`)
2. Understand the platform's webhook/API structure
3. Review the `IBotAdapter` contract
4. Check capabilities you can support
5. Plan error handling strategy

### 17.2 Before Adding Features

1. Check if it should be a middleware, plugin, or core feature
2. Consider type safety implications
3. Add Zod schemas for validation
4. Update relevant type definitions
5. Add JSDoc comments

### 17.3 When Modifying Types

1. Check impact on adapters (they must return valid context)
2. Update `BotContext` carefully (it's widely used)
3. Maintain backward compatibility when possible
4. Update examples and documentation
5. Run `npm run build` to verify types

### 17.4 Code Quality

- **No `any` types** in public API
- **Always use logger** (never `console.*` directly)
- **Add JSDoc** to all public methods
- **Use Zod** for runtime validation
- **Write examples** for new features
- **Update AGENT.md** when architecture changes

---

## 18. Common Patterns

### 18.1 Admin-Only Commands

```typescript
.addMiddleware(async (ctx, next) => {
  const isCommand = ctx.message.content?.type === 'command'
  const command = ctx.message.content?.type === 'command' 
    ? ctx.message.content.command 
    : null
  
  if (isCommand && ['admin', 'ban'].includes(command!)) {
    if (!ADMIN_IDS.includes(ctx.message.author.id)) {
      await ctx.reply('Admin only')
      return
    }
  }
  
  await next()
})
```

### 18.2 Conversation Flow

```typescript
.onMessage(async (ctx) => {
  const session = ctx.session
  
  if (session.data.waitingForInput) {
    const input = ctx.message.content?.content
    session.data.lastInput = input
    session.data.waitingForInput = false
    await session.save()
    
    await ctx.reply(`Got it: ${input}`)
  }
})
```

### 18.3 Platform-Specific Behavior

```typescript
.addCommand('media', {
  name: 'media',
  async handle(ctx) {
    const adapter = ctx.bot.getAdapter?.(ctx.provider)
    
    if (adapter?.capabilities.content.video) {
      // Send video
    } else {
      await ctx.reply('Video not supported, sending image instead')
      // Send image
    }
  }
})
```

---

## 19. Troubleshooting

### 19.1 Common Issues

**Build fails:**
- Run `npm run build` to see TypeScript errors
- Check that all imports are from correct paths
- Verify Zod schemas are properly defined

**Bot doesn't respond:**
- Check webhook is configured correctly
- Verify token is valid
- Check logs with `.withLogger(console)`
- Use `.addMiddleware(loggingPresets.debug())`

**Type errors:**
- Ensure `zod` is installed
- Check TypeScript version (>= 5.0 required)
- Verify imports are correct

**Session not persisting:**
- Call `await session.save()` after modifying data
- Check session store is configured
- Verify expiration settings

---

## 20. Roadmap

| Feature | Status | Priority |
|---------|--------|----------|
| Builder Pattern API | ✅ Complete | - |
| Session Management | ✅ Complete | - |
| Plugin System | ✅ Complete | - |
| Official Middlewares | ✅ Complete | - |
| Capabilities System | ✅ Complete | - |
| Discord Adapter | 🚧 In Progress | High |
| Slack Adapter | 📋 Planned | High |
| Redis Session Store | 📋 Planned | High |
| Prisma Session Store | 📋 Planned | Medium |
| Test Utilities | 📋 Planned | High |
| Interactive Components | 📋 Planned | Medium |
| Long Polling Support | 📋 Planned | Low |
| CLI Scaffolding | 📋 Planned | Low |

---

## 21. Contributing

We welcome contributions! Please follow these guidelines:

1. **Read** [AGENT.md](./AGENT.md) for architecture details
2. **Follow** existing patterns and conventions
3. **Test** locally with `npm run build` and `npm run typecheck`
4. **Document** new features with JSDoc and examples
5. **Update** README.md and AGENT.md if needed

### Contribution Checklist

- [ ] Adapter has no top-level side effects
- [ ] Zod schemas created for configs
- [ ] `handle` returns context or null (never Response)
- [ ] Capabilities declared accurately
- [ ] Errors wrapped in BotError when appropriate
- [ ] Help text provided for commands
- [ ] JSDoc added to public APIs
- [ ] Examples updated if API changed
- [ ] Build passes (`npm run build`)
- [ ] No lint errors (`npm run lint`)

---

## 22. Resources

- 📖 **Full Documentation:** https://igniterjs.com/docs/bots
- 💡 **Examples:** [examples/](./examples/)
- 📘 **Builder Examples:** [BUILDER_EXAMPLE.md](./BUILDER_EXAMPLE.md)
- 📗 **Migration Guide:** [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- 📙 **Implementation Details:** [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- 🐛 **Report Issues:** https://github.com/felipebarcelospro/igniter-js/issues
- 💬 **Discussions:** https://github.com/felipebarcelospro/igniter-js/discussions

---

## 23. License

MIT © Felipe Barcelos & Igniter.js Contributors

---

## 24. Acknowledgments

Built with ❤️ by the Igniter.js team.

Special thanks to all contributors and early adopters!

This package is part of the [Igniter.js](https://igniterjs.com) ecosystem - a modern, type-safe framework for building scalable TypeScript applications.

---

**Ready to build your bot? Check out the [examples](./examples/) or read the [Quick Start guide](https://igniterjs.com/docs/bots/quick-start)!**
