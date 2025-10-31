import type { TypeOf, ZodObject } from 'zod'
import {
  BotEvent,
  BotContext,
  BotCommand,
  BotSendParams,
  BotHandleParams,
  IBotAdapter,
  Middleware,
} from './types/bot.types'
import type { BotLogger } from './types/bot.types'

/**
 * Error code constants – centralized for consistency & future i18n / mapping.
 */
export const BotErrorCodes = {
  PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
  COMMAND_NOT_FOUND: 'COMMAND_NOT_FOUND',
  INVALID_COMMAND_PARAMETERS: 'INVALID_COMMAND_PARAMETERS',
  ADAPTER_HANDLE_RETURNED_NULL: 'ADAPTER_HANDLE_RETURNED_NULL',
} as const
export type BotErrorCode = (typeof BotErrorCodes)[keyof typeof BotErrorCodes]

/**
 * Rich error type used internally (and optionally by adapters).
 */
export class BotError extends Error {
  constructor(
    public code: BotErrorCode,
    message?: string,
    public meta?: Record<string, unknown>,
  ) {
    super(message || code)
    this.name = 'BotError'
  }
}

/**
 * Command registry structure: we keep both original map and alias index
 * for O(1) resolution of commands regardless of alias used.
 */
interface CommandIndexEntry {
  name: string
  command: BotCommand
  aliases: string[]
}

/**
 * Main Bot class for @igniter-js/bot
 *
 * Features:
 *  - Multi-adapter routing
 *  - Middleware pipeline
 *  - Command system with alias indexing
 *  - Pluggable logging
 *  - Extensible runtime registration (adapters, commands, middleware)
 *  - Type-safe adapter factory helper
 */
export class Bot<
  TAdapters extends Record<string, IBotAdapter<any>>,
  TMiddlewares extends Middleware[],
  TCommands extends Record<string, BotCommand>,
> {
  /** Unique bot identifier */
  public id: string
  /** Bot name (display) */
  public name: string
  /** Registered adapters (keyed by provider name) */
  private adapters: TAdapters
  /** Registered middlewares (ordered pipeline) */
  private middlewares: TMiddlewares
  /** Command map (original user supplied) */
  private commands: TCommands
  /** Indexed / normalized command lookup */
  private commandIndex: Map<string, CommandIndexEntry> = new Map()
  /** Optional logger */
  private logger?: BotLogger
  /** Event listeners */
  private listeners: Partial<Record<BotEvent, ((ctx: BotContext) => Promise<void>)[]>> = {}

  /**
   * Optional hook executed just before middleware pipeline
   * to allow last‑minute context enrichment (e.g., session loading).
   */
  private preProcessHooks: Array<(ctx: BotContext) => Promise<void> | void> = []

  /**
   * Optional hook executed after successful processing (not on thrown errors).
   */
  private postProcessHooks: Array<(ctx: BotContext) => Promise<void> | void> = []

  /**
   * Creates a new Bot instance.
   */
  constructor(config: {
    id: string
    name: string
    adapters: TAdapters
    middlewares?: TMiddlewares
    commands?: TCommands
    on?: Partial<Record<BotEvent, (ctx: BotContext) => Promise<void>>>
    logger?: BotLogger
  }) {
    this.id = config.id
    this.name = config.name
    this.adapters = config.adapters
    this.middlewares = (config.middlewares || []) as TMiddlewares
    this.commands = (config.commands || {}) as TCommands
    this.logger = config.logger

    // Register listeners
    if (config.on) {
      for (const evt of Object.keys(config.on) as BotEvent[]) {
        const handler = config.on[evt]
        if (handler) this.on(evt, handler)
      }
    }

    // Build command index
    this.rebuildCommandIndex()
  }

  /**
   * Rebuilds the internal command index (idempotent).
   * Called at construction and whenever a command is dynamically registered.
   */
  private rebuildCommandIndex() {
    this.commandIndex.clear()
    for (const key of Object.keys(this.commands)) {
      const cmd = this.commands[key]!
      const entry: CommandIndexEntry = {
        name: cmd.name.toLowerCase(),
        command: cmd,
        aliases: cmd.aliases.map((a) => a.toLowerCase()),
      }
      this.commandIndex.set(entry.name, entry)
      for (const alias of entry.aliases) {
        this.commandIndex.set(alias, entry)
      }
    }
  }

  /**
   * Dynamically register a new command at runtime.
   * Useful for plugin systems / hot-reload dev flows.
   */
  registerCommand(name: string, command: BotCommand): this {
    // @ts-expect-error augmenting generic map
    this.commands[name] = command
    this.rebuildCommandIndex()
    this.logger?.debug?.(`Command registered '${name}'`, `Bot:${this.name}#${this.id}`)
    return this
  }

  /**
   * Dynamically register a middleware (appended to the chain).
   */
  use(mw: Middleware): this {
    this.middlewares.push(mw)
    this.logger?.debug?.(`Middleware registered (#${this.middlewares.length})`, `Bot:${this.name}#${this.id}`)
    return this
  }

  /**
   * Dynamically register an adapter.
   */
  registerAdapter<K extends string, A extends IBotAdapter<any>>(key: K, adapter: A): this {
    // @ts-expect-error generic expansion
    this.adapters[key] = adapter
    this.logger?.debug?.(`Adapter registered '${key}'`, `Bot:${this.name}#${this.id}`)
    return this
  }

  /**
   * Hook executed before processing pipeline. Runs in registration order.
   */
  onPreProcess(hook: (ctx: BotContext) => Promise<void> | void): this {
    this.preProcessHooks.push(hook)
    return this
  }

  /**
   * Hook executed after successful processing (not on thrown errors).
   */
  onPostProcess(hook: (ctx: BotContext) => Promise<void> | void): this {
    this.postProcessHooks.push(hook)
    return this
  }

  /**
   * Emits a bot event to registered listeners manually.
   */
  async emit(event: BotEvent, ctx: BotContext) {
    const listeners = this.listeners[event]
    if (listeners?.length) {
      await Promise.all(listeners.map((l) => l(ctx)))
    }
  }

  /**
   * Adapter factory helper (legacy static name kept for backwards compatibility).
   * Now logger-aware: logger will be injected at call sites (init/send/handle).
   * Extended with capabilities support.
   */
  static adapter<TConfig extends ZodObject<any>>(adapter: {
    name: string
    parameters: TConfig
    capabilities: import('./types/capabilities').BotAdapterCapabilities
    verify?: (params: { request: Request; config: TypeOf<TConfig>; logger?: BotLogger }) => Promise<Response | null>
    init: (params: { config: TypeOf<TConfig>; commands: BotCommand[]; logger?: BotLogger }) => Promise<void>
    send: (params: BotSendParams<TypeOf<TConfig>> & { logger?: BotLogger }) => Promise<void>
    handle: (params: { request: Request; config: TypeOf<TConfig>; logger?: BotLogger }) => Promise<Omit<BotContext, 'bot' | 'session' | 'reply' | 'replyWithButtons' | 'replyWithImage' | 'replyWithDocument'> | null>
  }): (config: TypeOf<TConfig>) => IBotAdapter<TConfig> {
    return (config: TypeOf<TConfig>) => ({
      name: adapter.name,
      parameters: adapter.parameters,
      capabilities: adapter.capabilities,
      verify: adapter.verify ? async (params: { request: Request; config: TypeOf<TConfig>; logger?: BotLogger }) => {
        return adapter.verify!({ ...params, config, logger: params.logger })
      } : undefined,
      async send(params: BotSendParams<TConfig> & { logger?: BotLogger }) {
        return adapter.send({ ...params, config, logger: params.logger })
      },
      async handle(params: BotHandleParams<TConfig> & { logger?: BotLogger }) {
        return adapter.handle({ ...params, config, logger: params.logger }) as any
      },
      async init(options?: { commands: BotCommand[]; logger?: BotLogger }) {
        await adapter.init({
          config,
          commands: options?.commands || [],
          logger: options?.logger,
        })
      },
    })
  }

  /**
   * Factory helper for creating commands with validation and type safety.
   * 
   * This method validates that all required fields are present and provides
   * type safety when creating commands in separate files.
   * 
   * @example
   * ```typescript
   * // src/bot/commands/start.ts
   * import { Bot } from '@igniter-js/bot'
   * 
   * export const startCommand = Bot.command({
   *   name: 'start',
   *   aliases: ['hello'],
   *   description: 'Greets the user',
   *   help: 'Use /start to receive a welcome message',
   *   async handle(ctx) {
   *     await ctx.bot.send({
   *       provider: ctx.provider,
   *       channel: ctx.channel.id,
   *       content: { type: 'text', content: '👋 Welcome!' }
   *     })
   *   }
   * })
   * ```
   */
  static command(command: BotCommand): BotCommand {
    // Validate required fields
    if (!command.name || typeof command.name !== 'string') {
      throw new Error('Command must have a valid name (string)')
    }
    if (!Array.isArray(command.aliases)) {
      throw new Error('Command aliases must be an array')
    }
    if (!command.description || typeof command.description !== 'string') {
      throw new Error('Command must have a valid description (string)')
    }
    if (!command.help || typeof command.help !== 'string') {
      throw new Error('Command must have valid help text (string)')
    }
    if (typeof command.handle !== 'function') {
      throw new Error('Command must have a handle function')
    }

    // Validate command name format (no slashes, no spaces)
    if (command.name.includes('/') || command.name.includes(' ')) {
      throw new Error('Command name must not contain slashes or spaces')
    }

    // Validate aliases format
    for (const alias of command.aliases) {
      if (typeof alias !== 'string') {
        throw new Error(`Command alias must be a string: ${alias}`)
      }
      if (alias.includes('/') || alias.includes(' ')) {
        throw new Error(`Command alias must not contain slashes or spaces: ${alias}`)
      }
    }

    return command
  }

  /**
   * Factory helper for creating middleware with validation and type safety.
   * 
   * This method validates that the middleware function is properly structured
   * and provides type safety when creating middleware in separate files.
   * 
   * @example
   * ```typescript
   * // src/bot/middleware/auth.ts
   * import { Bot } from '@igniter-js/bot'
   * 
   * export const authMiddleware = Bot.middleware(async (ctx, next) => {
   *   if (!isAuthorized(ctx.message.author.id)) {
   *     await ctx.bot.send({
   *       provider: ctx.provider,
   *       channel: ctx.channel.id,
   *       content: { type: 'text', content: 'Unauthorized' }
   *     })
   *     return // Block request
   *   }
   *   await next() // Continue to next middleware/handler
   * })
   * ```
   */
  static middleware(middleware: Middleware): Middleware {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function')
    }

    // Validate function signature (should accept ctx and next)
    if (middleware.length !== 2) {
      throw new Error('Middleware function must accept exactly 2 parameters: (ctx, next)')
    }

    return middleware
  }

  /**
   * Internal factory for constructing a Bot with strong typing.
   * 
   * @deprecated Use IgniterBot builder pattern instead.
   * @internal This is used by the builder and should not be called directly.
   */
  static create<
    TAdapters extends Record<string, IBotAdapter<any>>,
    TMiddlewares extends Middleware[] = [],
    TCommands extends Record<string, BotCommand> = {},
  >(config: {
    id: string
    name: string
    adapters: TAdapters
    middlewares?: TMiddlewares
    commands?: TCommands
    on?: Partial<Record<BotEvent, (ctx: BotContext) => Promise<void>>>
    logger?: BotLogger
  }): Bot<TAdapters, TMiddlewares, TCommands> {
    return new Bot(config)
  }

  /**
   * Register (subscribe) to a lifecycle/event stream.
   */
  on(event: BotEvent, callback: (ctx: BotContext) => Promise<void>): void {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event]!.push(callback)
    this.logger?.debug?.(`Listener registered '${event}'`, `Bot:${this.name}#${this.id}`)
  }

  /**
   * Resolve command by name or alias (case-insensitive).
   */
  private resolveCommand(raw: string): CommandIndexEntry | undefined {
    return this.commandIndex.get(raw.toLowerCase())
  }

  /**
   * Sends a message (provider abstraction).
   */
  async send(params: Omit<BotSendParams<any>, 'config'>): Promise<void> {
    const adapter = this.adapters[params.provider]
    if (!adapter) {
      const err = new BotError(BotErrorCodes.PROVIDER_NOT_FOUND, `Provider ${params.provider} not found`, {
        provider: params.provider,
      })
      this.logger?.error?.(err.message, `Bot:${this.name}#${this.id}`, err.meta)
      throw err
    }
    await (adapter as any).send({
      provider: params.provider,
      channel: params.channel,
      content: params.content,
      logger: this.logger,
    })
    this.logger?.debug?.(
      `Message sent {provider=${params.provider}, channel=${params.channel}}`,
      `Bot:${this.name}#${this.id}`,
    )
  }

  /**
   * Core processing pipeline:
   *  1. preProcess hooks
   *  2. middleware chain
   *  3. listeners for event
   *  4. command execution (if command)
   *  5. postProcess hooks
   */
  async process(ctx: BotContext): Promise<void> {
    // Pre-process hooks
    for (const hook of this.preProcessHooks) {
      await hook(ctx)
    }

    // Middleware chain
    let index = 0
    const runner = async (): Promise<void> => {
      if (index < this.middlewares.length) {
        const current = this.middlewares[index++]
        try {
          await current(ctx, runner)
        } catch (err) {
          this.logger?.warn?.(
            `Middleware error at position ${index - 1}: ${(err as any)?.message || err}`,
            `Bot:${this.name}#${this.id}`,
          )
          // Emit error event
          await this.emit('error', {
            ...ctx,
            // @ts-expect-error extension (not public on type)
            error: err,
          })
        }
      }
    }
    await runner()

    // Listeners
    const listeners = this.listeners[ctx.event]
    if (listeners?.length) {
      await Promise.all(listeners.map((l) => l(ctx)))
    }

    // Command execution
    if (ctx.event === 'message' && ctx.message.content?.type === 'command') {
      const cmdToken = ctx.message.content.command
      const entry = this.resolveCommand(cmdToken)
      if (!entry) {
        this.logger?.warn?.(
          `Command not found '${cmdToken}'`,
          `Bot:${this.name}#${this.id}`,
        )
        await this.emit('error', {
          ...ctx,
          // @ts-expect-error augment error
          error: new BotError(BotErrorCodes.COMMAND_NOT_FOUND, `Command '${cmdToken}' not registered`),
        })
      } else {
        try {
          await entry.command.handle(ctx, ctx.message.content.params)
          this.logger?.debug?.(
            `Command executed '${entry.name}' (alias used: ${cmdToken !== entry.name ? cmdToken : 'no'})`,
            `Bot:${this.name}#${this.id}`,
          )
        } catch (err: any) {
          this.logger?.warn?.(
            `Command error '${entry.name}': ${err?.message || err}`,
            `Bot:${this.name}#${this.id}`,
          )
          if (entry.command.help) {
            await this.send({
              provider: ctx.provider,
              channel: ctx.channel.id,
              content: { type: 'text', content: entry.command.help },
            })
          }
          await this.emit('error', {
            ...ctx,
            // @ts-expect-error augment
            error: new BotError(
              BotErrorCodes.INVALID_COMMAND_PARAMETERS,
              err?.message || 'Invalid command parameters',
            ),
          })
        }
      }
    }

    // Post-process hooks (only if we reached here without throw)
    for (const hook of this.postProcessHooks) {
      await hook(ctx)
    }
  }

  /**
   * Handle an incoming request from a provider (adapter).
   *
   * Contract:
   *  - If adapter returns `null`, we respond 204 (ignored update).
   *  - If adapter returns a context object, we process it and return 200.
   *  - Any error thrown bubbles up unless caught externally.
   */
  async handle(adapter: keyof TAdapters, request: Request): Promise<Response> {
    const selectedAdapter = this.adapters[adapter]
    if (!selectedAdapter) {
      const err = new BotError(BotErrorCodes.PROVIDER_NOT_FOUND, `No adapter '${String(adapter)}'`)
      this.logger?.error?.(err.message, `Bot:${this.name}#${this.id}`)
      throw err
    }

    const rawContext = await (selectedAdapter as any).handle({ request, logger: this.logger })
    if (!rawContext) {
      this.logger?.debug?.(
        `Adapter '${String(adapter)}' returned null (ignored update)`,
        `Bot:${this.name}#${this.id}`,
      )
      return new Response(null, { status: 204 })
    }

    const ctx: BotContext = {
      ...rawContext,
      bot: {
        id: this.id,
        name: this.name,
        send: async (params) => this.send(params),
      },
    }

    this.logger?.debug?.(
      `Inbound event '${ctx.event}' from '${String(adapter)}'`,
      `Bot:${this.name}#${this.id}`,
    )

    await this.process(ctx)

    return new Response('OK', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  /**
   * Initialize all adapters (idempotent at adapter level).
   * Passes current command list so adapters can perform platform-side registration (webhooks/commands).
   */
  async start(): Promise<void> {
    const commandArray = Object.values(this.commands || {})
    for (const adapter of Object.values(this.adapters)) {
      this.logger?.debug?.(
        `Initializing adapter '${adapter.name}'`,
        `Bot:${this.name}#${this.id}`,
      )
      await (adapter as any).init({ commands: commandArray, logger: this.logger })
      this.logger?.debug?.(
        `Adapter '${adapter.name}' initialized`,
        `Bot:${this.name}#${this.id}`,
      )
    }
  }
}
