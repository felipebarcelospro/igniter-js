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
import type { BotSessionStore, BotSessionHelper } from './types/session'
import type { BotOutboundContent, BotSendOptions } from './types/content'
import type {
  AdapterInitParams,
  AdapterHandleParams,
  AdapterVerifyParams,
  AdapterSendTypingParams,
  AdapterSendTextParams,
  AdapterSendImageParams,
  AdapterSendVideoParams,
  AdapterSendAudioParams,
  AdapterSendDocumentParams,
  AdapterSendStickerParams,
  AdapterSendLocationParams,
  AdapterSendContactParams,
  AdapterSendPollParams,
  AdapterSendInteractiveParams,
  AdapterEditMessageParams,
  AdapterDeleteMessageParams,
  AdapterClient,
} from './types/adapter'
import { memoryStore } from './stores/memory'

/**
 * Error code constants – centralized for consistency & future i18n / mapping.
 */
export const BotErrorCodes = {
  CLIENT_NOT_PROVIDED: 'CLIENT_NOT_PROVIDED',
  PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
  COMMAND_NOT_FOUND: 'COMMAND_NOT_FOUND',
  INVALID_COMMAND_PARAMETERS: 'INVALID_COMMAND_PARAMETERS',
  ADAPTER_HANDLE_RETURNED_NULL: 'ADAPTER_HANDLE_RETURNED_NULL',
  CONTENT_TYPE_NOT_SUPPORTED: 'CONTENT_TYPE_NOT_SUPPORTED',
  INVALID_CONTENT: 'INVALID_CONTENT',
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
  TMiddlewares extends Middleware<any, any>[],
  TCommands extends Record<string, BotCommand>,
> {
  /** Unique bot identifier */
  public id: string
  /** Bot name (display) */
  public name: string
  /** Bot handle (for mentions in groups) */
  public botHandle?: string
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
  /** Session store for managing conversational state */
  private sessionStore?: BotSessionStore
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
    handle?: string
    adapters: TAdapters
    middlewares?: TMiddlewares
    commands?: TCommands
    on?: Partial<Record<BotEvent, (ctx: BotContext) => Promise<void>>>
    logger?: BotLogger
    sessionStore?: BotSessionStore
  }) {
    this.id = config.id
    this.name = config.name
    this.botHandle = config.handle
    this.adapters = config.adapters
    this.middlewares = (config.middlewares || []) as TMiddlewares
    this.commands = (config.commands || {}) as TCommands
    this.logger = config.logger
    this.sessionStore = config.sessionStore || memoryStore()

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
  use(mw: Middleware<any, any>): this {
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
   * Extended with capabilities support, global handle fallback, and specific send methods.
   */
  static adapter<TConfig extends ZodObject<any>>(adapter: {
    name: string
    parameters: TConfig
    capabilities: import('./types/capabilities').BotAdapterCapabilities
    verify?: (params: AdapterVerifyParams<TypeOf<TConfig>>) => Promise<Response | null>
    init: (params: AdapterInitParams<TypeOf<TConfig>>) => Promise<void>
    handle: (params: AdapterHandleParams<TypeOf<TConfig>>) => Promise<Omit<BotContext, 'bot' | 'session' | 'reply' | 'replyWithButtons' | 'replyWithImage' | 'replyWithDocument' | 'sendTyping'> | null>
    sendTyping?: (params: AdapterSendTypingParams<TypeOf<TConfig>>) => Promise<void>
    client?: (config: TypeOf<TConfig>, logger?: BotLogger) => AdapterClient<TypeOf<TConfig>>
    // Send methods (based on capabilities)
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
    editMessage?: (params: AdapterEditMessageParams<TypeOf<TConfig>>) => Promise<void>
    deleteMessage?: (params: AdapterDeleteMessageParams<TypeOf<TConfig>>) => Promise<void>
  }): (config?: Partial<TypeOf<TConfig>>) => IBotAdapter<TConfig> {
    return (config?: Partial<TypeOf<TConfig>>) => {
      // Merge with ENV vars - parse empty config first to get defaults
      const parsedConfig = adapter.parameters.parse(config || {}) as TypeOf<TConfig>
      
      // Helper to wrap methods with config injection
      const wrapMethod = <T extends (...args: any[]) => any>(
        method?: T
      ): T | undefined => {
        if (!method) return undefined
        return ((params: any) => {
          return method({ ...params, config: parsedConfig, logger: params.logger, client: adapter.client ? adapter.client(parsedConfig, params.logger) : undefined })
        }) as T
      }

      // Store config for validation in builder
      const adapterInstance: IBotAdapter<TConfig> = {
        name: adapter.name,
        parameters: adapter.parameters,
        capabilities: adapter.capabilities,
        _config: parsedConfig, // Store for builder validation
        
        verify: adapter.verify ? wrapMethod(adapter.verify) : undefined,
        
        async init(options?: { commands: BotCommand[]; logger?: BotLogger; botHandle?: string }) {
          await adapter.init({
            client: adapter.client ? adapter.client(parsedConfig, options?.logger) : undefined,
            config: parsedConfig,
            commands: options?.commands || [],
            logger: options?.logger,
            botHandle: options?.botHandle,
          })
        },
        
        // @ts-expect-error augmenting generic type
        async handle(params: BotHandleParams<TConfig> & { logger?: BotLogger; botHandle?: string }) {
          return adapter.handle({ 
            ...params, 
            config: parsedConfig, 
            logger: params.logger, 
            botHandle: params.botHandle,
            client: adapter.client ? adapter.client(parsedConfig, params.logger) : undefined,
          }) as any
        },
        
        
        // Send methods
        sendTyping: adapter.sendTyping ? wrapMethod(adapter.sendTyping) : undefined,
        sendText: adapter.sendText ? wrapMethod(adapter.sendText) : undefined,
        sendImage: adapter.sendImage ? wrapMethod(adapter.sendImage) : undefined,
        sendVideo: adapter.sendVideo ? wrapMethod(adapter.sendVideo) : undefined,
        sendAudio: adapter.sendAudio ? wrapMethod(adapter.sendAudio) : undefined,
        sendDocument: adapter.sendDocument ? wrapMethod(adapter.sendDocument) : undefined,
        sendSticker: adapter.sendSticker ? wrapMethod(adapter.sendSticker) : undefined,
        sendLocation: adapter.sendLocation ? wrapMethod(adapter.sendLocation) : undefined,
        sendContact: adapter.sendContact ? wrapMethod(adapter.sendContact) : undefined,
        sendPoll: adapter.sendPoll ? wrapMethod(adapter.sendPoll) : undefined,
        sendInteractive: adapter.sendInteractive ? wrapMethod(adapter.sendInteractive) : undefined,
        
        // Action methods
        editMessage: adapter.editMessage ? wrapMethod(adapter.editMessage) : undefined,
        deleteMessage: adapter.deleteMessage ? wrapMethod(adapter.deleteMessage) : undefined,
        
        // Client
        client: adapter.client ? adapter.client(parsedConfig, undefined) : undefined,
      }
      return adapterInstance
    }
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
  static command<TContext extends BotContext, TContextAdditions>(command: BotCommand<TContext, TContextAdditions>): BotCommand<TContext, TContextAdditions> {
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
  static middleware<TContext extends BotContext, TContextAdditions>(middleware: Middleware<TContext, TContextAdditions>): Middleware<TContext, TContextAdditions> {
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
    TMiddlewares extends Middleware<any, any>[] = [],
    TCommands extends Record<string, BotCommand> = {},
  >(config: {
    id: string
    name: string
    handle?: string
    adapters: TAdapters
    middlewares?: TMiddlewares
    commands?: TCommands
    on?: Partial<Record<BotEvent, (ctx: BotContext) => Promise<void>>>
    logger?: BotLogger
    sessionStore?: BotSessionStore
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
   * Routes to specific adapter methods based on content type.
   */
  async send(params: Omit<BotSendParams<any>, 'config'> & { options?: BotSendOptions }): Promise<void> {
    const adapter = this.adapters[params.provider]
    if (!adapter) {
      const err = new BotError(BotErrorCodes.PROVIDER_NOT_FOUND, `Provider ${params.provider} not found`, {
        provider: params.provider,
      })
      this.logger?.error?.(err.message, `Bot:${this.name}#${this.id}`, err.meta)
      throw err
    }

    const config = (adapter as any)._config || {}
    const logger = this.logger
    const commonParams = { 
      channel: params.channel, 
      config, 
      logger, 
      options: params.options 
    }

    const content = params.content

    // Route to specific method based on content type
    switch (content.type) {
      case 'text': {
        if (!adapter.sendText) {
          throw new BotError(
            'CONTENT_TYPE_NOT_SUPPORTED',
            `Text content not supported by adapter '${params.provider}'`,
            { provider: params.provider, contentType: 'text' }
          )
        }
        await adapter.sendText({ ...commonParams, text: content.content })
        break
      }

      case 'image': {
        if (!adapter.sendImage) {
          throw new BotError(
            'CONTENT_TYPE_NOT_SUPPORTED',
            `Image content not supported by adapter '${params.provider}'`,
            { provider: params.provider, contentType: 'image' }
          )
        }
        await adapter.sendImage({
          ...commonParams,
          image: content.file || content.content,
          caption: content.caption,
        })
        break
      }

      case 'video': {
        if (!adapter.sendVideo) {
          throw new BotError(
            'CONTENT_TYPE_NOT_SUPPORTED',
            `Video content not supported by adapter '${params.provider}'`,
            { provider: params.provider, contentType: 'video' }
          )
        }
        await adapter.sendVideo({
          ...commonParams,
          video: content.file || content.content,
          caption: content.caption,
        })
        break
      }

      case 'audio': {
        if (!adapter.sendAudio) {
          throw new BotError(
            'CONTENT_TYPE_NOT_SUPPORTED',
            `Audio content not supported by adapter '${params.provider}'`,
            { provider: params.provider, contentType: 'audio' }
          )
        }
        await adapter.sendAudio({
          ...commonParams,
          audio: content.file || content.content,
        })
        break
      }

      case 'document': {
        if (!adapter.sendDocument) {
          throw new BotError(
            'CONTENT_TYPE_NOT_SUPPORTED',
            `Document content not supported by adapter '${params.provider}'`,
            { provider: params.provider, contentType: 'document' }
          )
        }
        if (!content.file) {
          throw new BotError(
            'INVALID_CONTENT',
            'Document content requires a File object',
            { contentType: 'document' }
          )
        }
        await adapter.sendDocument({
          ...commonParams,
          file: content.file,
          filename: content.filename,
          caption: content.caption,
        })
        break
      }

      case 'sticker': {
        if (!adapter.sendSticker) {
          throw new BotError(
            'CONTENT_TYPE_NOT_SUPPORTED',
            `Sticker content not supported by adapter '${params.provider}'`,
            { provider: params.provider, contentType: 'sticker' }
          )
        }
        await adapter.sendSticker({
          ...commonParams,
          sticker: content.file || content.content,
        })
        break
      }

      case 'location': {
        if (!adapter.sendLocation) {
          throw new BotError(
            'CONTENT_TYPE_NOT_SUPPORTED',
            `Location content not supported by adapter '${params.provider}'`,
            { provider: params.provider, contentType: 'location' }
          )
        }
        await adapter.sendLocation({
          ...commonParams,
          latitude: content.latitude,
          longitude: content.longitude,
          name: content.name,
          address: content.address,
        })
        break
      }

      case 'contact': {
        if (!adapter.sendContact) {
          throw new BotError(
            'CONTENT_TYPE_NOT_SUPPORTED',
            `Contact content not supported by adapter '${params.provider}'`,
            { provider: params.provider, contentType: 'contact' }
          )
        }
        await adapter.sendContact({
          ...commonParams,
          phoneNumber: content.phoneNumber,
          firstName: content.firstName,
          lastName: content.lastName,
          userId: content.userId,
        })
        break
      }

      case 'poll': {
        if (!adapter.sendPoll) {
          throw new BotError(
            'CONTENT_TYPE_NOT_SUPPORTED',
            `Poll content not supported by adapter '${params.provider}'`,
            { provider: params.provider, contentType: 'poll' }
          )
        }
        await adapter.sendPoll({
          ...commonParams,
          question: content.question,
          options: content.options,
          allowsMultipleAnswers: content.allowsMultipleAnswers,
          isAnonymous: content.isAnonymous,
          correctOptionId: content.correctOptionId,
          sendOptions: params.options,
        })
        break
      }

      case 'interactive': {
        if (!adapter.sendInteractive) {
          throw new BotError(
            'CONTENT_TYPE_NOT_SUPPORTED',
            `Interactive content not supported by adapter '${params.provider}'`,
            { provider: params.provider, contentType: 'interactive' }
          )
        }
        await adapter.sendInteractive({
          ...commonParams,
          text: content.text,
          buttons: content.buttons,
          inlineKeyboard: content.inlineKeyboard,
        })
        break
      }

      case 'reply': {
        // Reply messages: extract nested content and send it with reply options
        const nestedContent = content.content
        const mergedOptions = {
          ...params.options,
          replyToMessageId: content.messageId,
        }
        // Recursively call send with nested content
        await this.send({
          ...params,
          content: nestedContent,
          options: mergedOptions,
        })
        return
      }

      default: {
        const contentType = (content as any).type
        throw new BotError(
          'CONTENT_TYPE_NOT_SUPPORTED',
          `Content type '${contentType}' not supported`,
          { provider: params.provider, contentType }
        )
      }
    }

    this.logger?.debug?.(
      `Message sent {provider=${params.provider}, channel=${params.channel}, type=${content.type}}`,
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
    let currentCtx = ctx

    // Pre-process hooks
    for (const hook of this.preProcessHooks) {
      await hook(currentCtx)
    }

    // Middleware chain
    const runner = async (index: number, context: BotContext): Promise<BotContext> => {
      if (index >= this.middlewares.length) {
        return context
      }
      
      const current = this.middlewares[index]
      
      let enrichedContext = context
      let nextCalled = false
      let nextResult: BotContext = context
      
      const next = async () => {
        if (!nextCalled) {
          nextCalled = true
          nextResult = await runner(index + 1, enrichedContext)
        }
      }

      const additions = await current(context, next)
      
      if (additions && typeof additions === 'object') {
        enrichedContext = { ...context, ...additions }
        // If next wasn't called yet, call it with enriched context
        if (!nextCalled) {
          nextResult = await runner(index + 1, enrichedContext)
        } else {
          // Re-run with enriched context if next was already called
          nextResult = await runner(index + 1, enrichedContext)
        }
        return nextResult
      }
      
      // If next wasn't called, ensure we call it
      if (!nextCalled) {
        await next()
      }
      
      return nextResult
    }
    currentCtx = await runner(0, currentCtx)


    // Listeners
    const listeners = this.listeners[currentCtx.event]
    if (listeners?.length) {
      await Promise.all(listeners.map((l) => l(currentCtx)))
    }

    // Command execution
    if (currentCtx.event === 'message' && currentCtx.message.content?.type === 'command') {
      const cmdToken = currentCtx.message.content.command
      const entry = this.resolveCommand(cmdToken)
      if (!entry) {
        this.logger?.warn?.(
          `Command not found '${cmdToken}'`,
          `Bot:${this.name}#${this.id}`,
        )
        await this.emit('error', {
          ...currentCtx,
          // @ts-expect-error augment error
          error: new BotError(BotErrorCodes.COMMAND_NOT_FOUND, `Command '${cmdToken}' not registered`),
        })
      } else {
        try {
          await entry.command.handle(currentCtx, currentCtx.message.content.params)
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
              provider: currentCtx.provider,
              channel: currentCtx.channel.id,
              content: { type: 'text', content: entry.command.help, raw: entry.command.help },
            })
          }
          await this.emit('error', {
            ...currentCtx,
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
      await hook(currentCtx)
    }
  }

  /**
   * Creates helper methods for the context (reply, session, etc.)
   * This function enriches the raw context from adapters with convenient methods.
   */
  private createContextHelpers(
    rawCtx: Omit<BotContext, 'bot' | 'session' | 'reply' | 'replyWithButtons' | 'replyWithImage' | 'replyWithDocument'>,
    provider: string
  ): BotContext {
    const userId = rawCtx.message.author.id
    const channelId = rawCtx.channel.id

    // Get or create session
    const sessionStore = this.sessionStore!
    let sessionData: BotSessionHelper | null = null

    // Helper to get/create session
    const getSession = async (): Promise<BotSessionHelper> => {
      if (sessionData) return sessionData

      let session = await sessionStore.get(userId, channelId)
      
      if (!session) {
        const now = new Date()
        session = {
          userId,
          channelId,
          data: {},
          createdAt: now,
          updatedAt: now,
        }
        await sessionStore.set(userId, channelId, session)
      }

      sessionData = {
        ...session,
        async save() {
          await sessionStore.set(userId, channelId, sessionData!)
        },
        async delete() {
          await sessionStore.delete(userId, channelId)
        },
        async update(data: Partial<Record<string, any>>) {
          sessionData!.data = { ...sessionData!.data, ...data }
          await sessionData!.save()
        },
      }

      return sessionData
    }

    // Create full context with helpers
    const ctx: BotContext = {
      ...rawCtx,
      bot: {
        id: this.id,
        name: this.name,
        send: async (params) => this.send(params),
        getAdapter: (p: string) => this.adapters[p as keyof TAdapters] as IBotAdapter<any> | undefined,
        getAdapters: () => this.adapters as Record<string, IBotAdapter<any>>,
      },
      session: {
        userId,
        channelId,
        data: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        async save() {
          const s = await getSession()
          await s.save()
        },
        async delete() {
          await sessionStore.delete(userId, channelId)
        },
        async update(data: Partial<Record<string, any>>) {
          const s = await getSession()
          await s.update(data)
        },
      },
      async reply(content: BotOutboundContent | string, options?: BotSendOptions) {
        const contentObj: BotOutboundContent = typeof content === 'string'
          ? { type: 'text', content, raw: content }
          : content

        await ctx.bot.send({
          provider,
          channel: channelId,
          content: contentObj,
          options,
        })
      },
      async replyWithButtons(text: string, buttons: any[], options?: BotSendOptions) {
        await ctx.bot.send({
          provider,
          channel: channelId,
          content: {
            type: 'interactive',
            text,
            buttons,
          },
          options,
        })
      },
      async replyWithImage(image: string | File, caption?: string, options?: BotSendOptions) {
        const content: BotOutboundContent = {
          type: 'image',
          content: typeof image === 'string' ? image : '',
          file: typeof image === 'object' ? image : undefined,
          caption,
        }
        await ctx.bot.send({
          provider,
          channel: channelId,
          content,
          options,
        })
      },
      async replyWithDocument(file: File, caption?: string, options?: BotSendOptions) {
        await ctx.bot.send({
          provider,
          channel: channelId,
          content: {
            type: 'document',
            content: '',
            file,
            caption,
          },
          options,
        })
      },
    }

    // Load session data asynchronously (non-blocking)
    getSession().then(s => {
      if (sessionData) {
        Object.assign(ctx.session, {
          data: s.data,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          expiresAt: s.expiresAt,
        })
      }
    }).catch(() => {
      // Ignore errors - session will be created on next access
    })

    // Add optional adapter-specific methods if adapter supports them
    const adapter = this.adapters[provider as keyof TAdapters]
    if (adapter) {
      // Check if adapter supports editing
      if (adapter.capabilities.actions.edit && adapter.editMessage) {
        ctx.editMessage = async (messageId: string, content: BotOutboundContent) => {
          await adapter.editMessage!({
            channel: channelId,
            messageId,
            content,
            config: (adapter as any)._config,
            logger: this.logger,
          })
        }
      }

      // Check if adapter supports deleting
      if (adapter.capabilities.actions.delete && adapter.deleteMessage) {
        ctx.deleteMessage = async (messageId: string) => {
          await adapter.deleteMessage!({
            channel: channelId,
            messageId,
            config: (adapter as any)._config,
            logger: this.logger,
          })
        }
      }

      // Check if adapter supports reactions
      // Note: Telegram doesn't support reactions via API, but we keep the interface for other adapters
      if (adapter.capabilities.actions.react) {
        ctx.react = async (emoji: string, messageId?: string) => {
          // This would need to be implemented by each adapter that supports reactions
          this.logger?.warn?.('react not yet implemented', `Bot:${this.name}#${this.id}`)
        }
      }

      // Check if adapter supports typing indicator
      if (adapter.sendTyping) {
        ctx.sendTyping = async () => {
          await adapter.sendTyping!({
            channel: channelId,
            config: (adapter as any)._config,
            logger: this.logger,
          })
        }
      }
    }

    return ctx
  }

  /**
   * Handle an incoming request from a provider (adapter).
   *
   * Contract:
   *  - If adapter returns `null`, we respond 204 (ignored update).
   *  - If adapter returns a context object, we process it and return 200.
   *  - Any error thrown bubbles up unless caught externally.
   */
  handle(adapter: keyof TAdapters): (request: Request) => Promise<Response> {
    return async (request: Request) => {
      if (!adapter) return new Response("Not Found", { status: 404 });
      const adapterInstance = this.adapters[adapter];
      if (!adapterInstance) return new Response("Not Found", { status: 404 });

      if (request.method === "GET") {
        if (adapterInstance.verify) {
          const res = await adapterInstance.verify({
            request,
            config: (adapterInstance as any)._config || {},
            logger: this.logger
          });
          return res || new Response("OK", { status: 200 });
        }
        return new Response("OK", { status: 200 });
      }

      if (request.method === "POST") {
        const rawContext = await (adapterInstance as any).handle({
          request,
          logger: this.logger,
          botHandle: this.botHandle
        });

        if (!rawContext) {
          return new Response(null, { status: 204 });
        }

        // Create full context with helper methods
        const ctx = this.createContextHelpers(rawContext, String(adapter));

        await this.process(ctx);

        return new Response("OK", {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response("Not Found", { status: 404 });
    };
  }

  /**
   * Initialize all adapters (idempotent at adapter level).
   * Passes current command list and bot handle so adapters can perform platform-side registration (webhooks/commands).
   */
  async start(): Promise<void> {
    const commandArray = Object.values(this.commands || {})
    for (const adapter of Object.values(this.adapters)) {
      this.logger?.debug?.(
        `Initializing adapter '${adapter.name}'`,
        `Bot:${this.name}#${this.id}`,
      )
      await (adapter as any).init({ 
        commands: commandArray, 
        logger: this.logger,
        botHandle: this.botHandle 
      })
      this.logger?.debug?.(
        `Adapter '${adapter.name}' initialized`,
        `Bot:${this.name}#${this.id}`,
      )
    }
  }
}
