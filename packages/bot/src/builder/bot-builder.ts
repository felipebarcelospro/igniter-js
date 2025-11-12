/**
 * Igniter Bot Builder
 * 
 * Fluent API for constructing bot instances with type safety and excellent DX.
 * Inspired by the @adapter-mcp-server builder pattern.
 * 
 * @example
 * ```typescript
 * const bot = IgniterBot
 *   .create()
 *   .withId('my-bot')
 *   .withName('My Awesome Bot')
 *   .addAdapter('telegram', telegram({ token: '...' }))
 *   .addCommand('start', {
 *     name: 'start',
 *     description: 'Start the bot',
 *     async handle(ctx) {
 *       await ctx.reply('Hello!')
 *     }
 *   })
 *   .build()
 * ```
 */

import type {
  BotCommand,
  IBotAdapter,
  Middleware,
  BotLogger,
  BotContext,
} from '../types/bot.types'
import type { BotSessionStore } from '../types/session'
import type { BotPlugin } from '../types/plugins'
import type {
  BotOptions,
  BotEventHandler,
  BotErrorHandler,
  BotStartHandler,
  BotBuilderConfig,
} from '../types/builder'
import { Bot } from '../bot.provider'

/**
 * Main Builder class for creating Igniter Bot instances.
 * 
 * Provides a fluent API for configuring all aspects of a bot:
 * - Adapters (Telegram, WhatsApp, Discord, etc)
 * - Commands with validation
 * - Middlewares and plugins
 * - Session management
 * - Event handlers
 * 
 * @template TAdapters - Record of registered adapters
 * @template TCommands - Record of registered commands
 * @template TContext - The current, possibly extended, bot context type
 */
export class IgniterBotBuilder<
  TAdapters extends Record<string, IBotAdapter<any>> = Record<string, never>,
  TCommands extends Record<string, BotCommand> = Record<string, never>,
  TContext extends BotContext = BotContext
> {
  private config: BotBuilderConfig

  constructor(initialConfig?: Partial<BotBuilderConfig>) {
    this.config = {
      adapters: {},
      commands: {},
      middlewares: [],
      plugins: [],
      listeners: {
        message: [],
        error: [],
        command: [],
        start: [],
      },
      ...initialConfig,
    }
  }

  /**
   * Creates a new bot builder instance.
   * 
   * @example
   * ```typescript
   * const bot = IgniterBot.create()
   * ```
   */
  static create(): IgniterBotBuilder {
    return new IgniterBotBuilder()
  }

  /**
   * Sets the bot handle (used for mentions in groups).
   * This is the primary identifier for your bot.
   * 
   * If not set, each adapter must provide its own handle.
   * If id or name are not provided, they will be derived from the handle.
   * 
   * @param handle - Bot handle (e.g., '@mybot' for Telegram, 'mybot' for WhatsApp)
   * @example
   * ```typescript
   * builder.withHandle('@mybot')
   * ```
   */
  withHandle(handle: string): this {
    this.config.handle = handle
    
    // Auto-generate ID from handle if not already set
    if (!this.config.id) {
      this.config.id = handle.replace(/^@/, '')
    }
    
    // Auto-generate name from handle if not already set
    if (!this.config.name) {
      const cleanHandle = handle.replace(/^@/, '')
      this.config.name = cleanHandle
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }
    
    return this
  }

  /**
   * Sets the unique identifier for this bot.
   * 
   * Optional - if not provided, will be derived from handle.
   * 
   * @param id - Unique bot identifier
   * @example
   * ```typescript
   * builder.withId('my-ecommerce-bot')
   * ```
   */
  withId(id: string): this {
    this.config.id = id
    return this
  }

  /**
   * Sets the display name for this bot.
   * 
   * Optional - if not provided, will be derived from handle.
   * 
   * @param name - Bot display name
   * @example
   * ```typescript
   * builder.withName('E-commerce Assistant')
   * ```
   */
  withName(name: string): this {
    this.config.name = name
    return this
  }

  /**
   * Configures a logger for structured logging.
   * 
   * @param logger - Logger instance implementing BotLogger interface
   * @example
   * ```typescript
   * builder.withLogger(console)
   * builder.withLogger(pinoLogger)
   * ```
   */
  withLogger(logger: BotLogger): this {
    this.config.logger = logger
    return this
  }

  /**
   * Configures session storage for maintaining conversational state.
   * 
   * @param store - Session store implementation
   * @example
   * ```typescript
   * builder.withSessionStore(memoryStore())
   * builder.withSessionStore(redisStore(redisClient))
   * ```
   */
  withSessionStore(store: BotSessionStore): this {
    this.config.sessionStore = store
    return this
  }

  /**
   * Sets advanced bot options (timeouts, retries, etc).
   * 
   * @param options - Bot configuration options
   * @example
   * ```typescript
   * builder.withOptions({
   *   timeout: 30000,
   *   retries: 3,
   *   autoRegisterCommands: true
   * })
   * ```
   */
  withOptions(options: BotOptions): this {
    this.config.options = { ...this.config.options, ...options }
    return this
  }

  /**
   * Adds a platform adapter to the bot.
   * 
   * @param key - Unique adapter key (e.g., 'telegram', 'whatsapp')
   * @param adapter - Adapter instance
   * @example
   * ```typescript
   * builder.addAdapter('telegram', telegram({
   *   token: process.env.TELEGRAM_TOKEN!,
   *   handle: '@mybot'
   * }))
   * ```
   */
  addAdapter<K extends string, A extends IBotAdapter<any>>(
    key: K,
    adapter: A
  ): IgniterBotBuilder<TAdapters & Record<K, A>, TCommands, TContext> {
    const newConfig = { ...this.config }
    newConfig.adapters = { ...newConfig.adapters, [key]: adapter }
    return new IgniterBotBuilder<TAdapters & Record<K, A>, TCommands, TContext>(newConfig)
  }

  /**
   * Adds multiple adapters at once.
   * 
   * @param adapters - Record of adapters
   * @example
   * ```typescript
   * builder.addAdapters({
   *   telegram: telegram({ token: '...' }),
   *   whatsapp: whatsapp({ token: '...' })
   * })
   * ```
   */
  addAdapters<A extends Record<string, IBotAdapter<any>>>(
    adapters: A
  ): IgniterBotBuilder<TAdapters & A, TCommands, TContext> {
    const newConfig = { ...this.config }
    newConfig.adapters = { ...newConfig.adapters, ...adapters }
    return new IgniterBotBuilder<TAdapters & A, TCommands, TContext>(newConfig)
  }

  /**
   * Registers a command with the bot.
   * 
   * @param name - Command name (without slash)
   * @param command - Command configuration
   * @example
   * ```typescript
   * builder.addCommand('start', {
   *   name: 'start',
   *   aliases: ['hello'],
   *   description: 'Start the bot',
   *   help: 'Use /start to begin',
   *   async handle(ctx) {
   *     await ctx.reply('Welcome!')
   *   }
   * })
   * ```
   */
  addCommand<K extends string, C extends BotCommand<TContext>>(
    name: K,
    command: C
  ): IgniterBotBuilder<TAdapters, TCommands & Record<K, C>, TContext> {
    const newConfig = { ...this.config }
    newConfig.commands = { ...newConfig.commands, [name]: command as any }
    return new IgniterBotBuilder<TAdapters, TCommands & Record<K, C>, TContext>(newConfig)
  }

  /**
   * Registers multiple commands at once.
   * 
   * @param commands - Record of commands
   * @example
   * ```typescript
   * builder.addCommands({
   *   start: { ... },
   *   help: { ... }
   * })
   * ```
   */
  addCommands<C extends Record<string, BotCommand<TContext>>>(
    commands: C
  ): IgniterBotBuilder<TAdapters, TCommands & C, TContext> {
    const newConfig = { ...this.config }
    newConfig.commands = { ...newConfig.commands, ...(commands as any) }
    return new IgniterBotBuilder<TAdapters, TCommands & C, TContext>(newConfig)
  }

  /**
   * Adds a command group with a common prefix.
   * 
   * @param prefix - Prefix for all commands in the group
   * @param commands - Record of commands (prefix will be prepended)
   * @example
   * ```typescript
   * builder.addCommandGroup('admin', {
   *   ban: { ... },  // Becomes 'admin_ban'
   *   kick: { ... }  // Becomes 'admin_kick'
   * })
   * ```
   */
  addCommandGroup<C extends Record<string, BotCommand<TContext>>>(
    prefix: string,
    commands: C
  ): IgniterBotBuilder<TAdapters, TCommands, TContext> {
    const newConfig = { ...this.config }
    for (const [key, command] of Object.entries(commands)) {
      const prefixedKey = `${prefix}_${key}`
      newConfig.commands = {
        ...newConfig.commands,
        [prefixedKey]: {
          ...(command as any),
          name: `${prefix}_${command.name}`,
        },
      }
    }
    return new IgniterBotBuilder<TAdapters, TCommands, TContext>(newConfig)
  }

  /**
   * Adds a middleware to the processing pipeline.
   * 
   * @param middleware - Middleware function
   * @example
   * ```typescript
   * builder.addMiddleware(async (ctx, next) => {
   *   console.log('Before')
   *   await next()
   *   console.log('After')
   * })
   * ```
   */
  addMiddleware<TContextAdditions>(
    middleware: Middleware<TContext, TContextAdditions>
  ): IgniterBotBuilder<TAdapters, TCommands, TContext & Awaited<TContextAdditions>> {
    const newConfig = { ...this.config }
    newConfig.middlewares.push(middleware as any)
    return new IgniterBotBuilder<TAdapters, TCommands, TContext & Awaited<TContextAdditions>>(newConfig)
  }

  /**
   * Adds multiple middlewares to the pipeline.
   * 
   * @param middlewares - Array of middleware functions
   * @example
   * ```typescript
   * builder.addMiddlewares([
   *   authMiddleware,
   *   rateLimitMiddleware,
   *   loggingMiddleware
   * ])
   * ```
   */
  addMiddlewares(
    middlewares: Middleware<TContext, any>[]
  ): IgniterBotBuilder<TAdapters, TCommands, TContext> {
    this.config.middlewares.push(...(middlewares as any))
    return this
  }

  /**
   * Loads a plugin with all its commands, middlewares, and hooks.
   * 
   * @param plugin - Plugin instance
   * @example
   * ```typescript
   * builder.usePlugin(analyticsPlugin)
   * ```
   */
  usePlugin(plugin: BotPlugin): this {
    this.config.plugins.push(plugin)
    
    // Register plugin commands
    if (plugin.commands) {
      this.config.commands = { ...this.config.commands, ...plugin.commands }
    }
    
    // Register plugin middlewares
    if (plugin.middlewares) {
      this.config.middlewares.push(...plugin.middlewares)
    }
    
    // Register plugin adapters
    if (plugin.adapters) {
      this.config.adapters = { ...this.config.adapters, ...plugin.adapters }
    }
    
    // Register plugin hooks
    if (plugin.hooks) {
      if (plugin.hooks.onMessage) {
        this.config.listeners.message.push(plugin.hooks.onMessage as any)
      }
      if (plugin.hooks.onError) {
        this.config.listeners.error.push(plugin.hooks.onError as any)
      }
      if (plugin.hooks.onStart) {
        this.config.listeners.start.push(plugin.hooks.onStart)
      }
    }
    
    return this
  }

  /**
   * Registers a message event listener.
   * 
   * @param handler - Message handler function
   * @example
   * ```typescript
   * builder.onMessage(async (ctx) => {
   *   console.log('Message received:', ctx.message.content)
   * })
   * ```
   */
  onMessage(handler: BotEventHandler<TContext>): this {
    this.config.listeners.message.push(handler as any)
    return this
  }

  /**
   * Registers an error event listener.
   * 
   * @param handler - Error handler function
   * @example
   * ```typescript
   * builder.onError(async (ctx) => {
   *   console.error('Error:', ctx.error)
   * })
   * ```
   */
  onError(handler: BotErrorHandler<TContext>): this {
    this.config.listeners.error.push(handler as any)
    return this
  }

  /**
   * Registers a command event listener (called for all commands).
   * 
   * @param handler - Command handler function
   * @example
   * ```typescript
   * builder.onCommand(async (ctx, command) => {
   *   console.log('Command executed:', command)
   * })
   * ```
   */
  onCommand(handler: BotEventHandler<TContext>): this {
    this.config.listeners.command.push(handler as any)
    return this
  }

  /**
   * Registers a start hook (called when bot initializes).
   * 
   * @param handler - Start handler function
   * @example
   * ```typescript
   * builder.onStart(async () => {
   *   console.log('Bot starting...')
   * })
   * ```
   */
  onStart(handler: BotStartHandler): this {
    this.config.listeners.start.push(handler)
    return this
  }

  /**
   * Builds the final Bot instance.
   * Validates configuration and returns an immutable bot.
   * 
   * Auto-generates id and name from handle if not provided.
   * 
   * @throws {Error} If required configuration is missing
   * @example
   * ```typescript
   * const bot = builder.build()
   * await bot.start()
   * ```
   */
  build(): Bot<TAdapters, Middleware<TContext, any>[], TCommands> {
    // Validate at least one adapter
    if (Object.keys(this.config.adapters).length === 0) {
      throw new Error('At least one adapter is required. Use addAdapter() to add one.')
    }

    // Validate that we have a handle (either global or in all adapters)
    const hasGlobalHandle = !!this.config.handle
    const allAdaptersHaveHandle = Object.values(this.config.adapters).every(
      adapter => {
        // Check if adapter config has handle property
        const config = (adapter as any)._config || {}
        return !!config.handle
      }
    )

    if (!hasGlobalHandle && !allAdaptersHaveHandle) {
      throw new Error(
        'Bot handle is required. Use withHandle() for a global handle, ' +
        'or ensure each adapter has its own handle configured.'
      )
    }

    // Auto-generate ID from handle if not provided
    if (!this.config.id) {
      if (this.config.handle) {
        this.config.id = this.config.handle.replace(/^@/, '')
      } else {
        // Generate from timestamp if no handle
        this.config.id = `bot-${Date.now()}`
      }
    }

    // Auto-generate name from handle if not provided
    if (!this.config.name) {
      if (this.config.handle) {
        const cleanHandle = this.config.handle.replace(/^@/, '')
        this.config.name = cleanHandle
          .split(/[-_]/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      } else {
        this.config.name = this.config.id
      }
    }

    // Create bot using old API (for now, will be refactored)
    const bot = Bot.create({
      id: this.config.id,
      name: this.config.name,
      handle: this.config.handle,
      adapters: this.config.adapters as TAdapters,
      commands: this.config.commands as TCommands,
      middlewares: this.config.middlewares as Middleware<TContext, any>[],
      logger: this.config.logger,
      sessionStore: this.config.sessionStore,
      on: {
        message: async (ctx) => {
          for (const handler of this.config.listeners.message) {
            await handler(ctx)
          }
        },
        error: async (ctx) => {
          for (const handler of this.config.listeners.error) {
            // @ts-expect-error - error field added dynamically
            await handler(ctx)
          }
        },
      },
    })

    // Execute start hooks
    const originalStart = bot.start.bind(bot)
    bot.start = async () => {
      for (const handler of this.config.listeners.start) {
        await handler()
      }
      await originalStart()
    }

    return bot
  }
}

/**
 * Convenience export with shorter name
 */
export const IgniterBot = IgniterBotBuilder

