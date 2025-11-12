/**
 * Logging Middleware
 * 
 * Provides structured logging for bot events, commands, and errors.
 */

import type { Middleware, BotContext, BotLogger } from '../types/bot.types'

/**
 * Logging configuration options
 */
export interface LoggingOptions {
  /**
   * Logger instance (defaults to console)
   */
  logger?: BotLogger

  /**
   * Log incoming messages
   */
  logMessages?: boolean

  /**
   * Log command executions
   */
  logCommands?: boolean

  /**
   * Log errors
   */
  logErrors?: boolean

  /**
   * Log performance metrics (execution time)
   */
  logMetrics?: boolean

  /**
   * Include user information in logs
   */
  includeUserInfo?: boolean

  /**
   * Include message content in logs (may contain sensitive data)
   */
  includeContent?: boolean

  /**
   * Custom log formatter
   */
  formatter?: (ctx: BotContext, event: string, data: any) => string

  /**
   * Filter function to skip logging for certain contexts
   */
  skip?: (ctx: BotContext) => boolean
}

/**
 * Creates a logging middleware.
 * 
 * @param options - Logging configuration
 * @returns Middleware function
 * 
 * @example
 * ```typescript
 * const bot = IgniterBot
 *   .create()
 *   .addMiddleware(loggingMiddleware({
 *     logMessages: true,
 *     logCommands: true,
 *     logMetrics: true,
 *     includeUserInfo: true
 *   }))
 *   .build()
 * ```
 * 
 * @example
 * ```typescript
 * // With custom logger (Pino, Winston, etc)
 * import pino from 'pino'
 * 
 * const logger = pino()
 * 
 * const bot = IgniterBot
 *   .create()
 *   .addMiddleware(loggingMiddleware({
 *     logger,
 *     logMessages: true,
 *     includeUserInfo: true,
 *     includeContent: false // Don't log message content for privacy
 *   }))
 *   .build()
 * ```
 */
export function loggingMiddleware<TContext extends BotContext>(
  options: LoggingOptions = {}
): Middleware<TContext, {}> {
  const {
    logger = console,
    logMessages = true,
    logCommands = true,
    logErrors = true,
    logMetrics = true,
    includeUserInfo = true,
    includeContent = false,
    formatter,
    skip,
  } = options

  return async (ctx, next) => {
    // Skip logging if condition is met
    if (skip && skip(ctx)) {
      return next()
    }

    const startTime = Date.now()
    const isCommand = ctx.message.content?.type === 'command'

    // Prepare log data
    const logData: any = {
      event: ctx.event,
      provider: ctx.provider,
      channel: {
        id: ctx.channel.id,
        name: ctx.channel.name,
        isGroup: ctx.channel.isGroup,
      },
    }

    // Include user info if enabled
    if (includeUserInfo) {
      logData.user = {
        id: ctx.message.author.id,
        name: ctx.message.author.name,
        username: ctx.message.author.username,
      }
    }

    // Include content if enabled and available
    if (includeContent && ctx.message.content) {
      logData.content = ctx.message.content
    }

    // Log incoming message
    if (logMessages && !isCommand) {
      const message = formatter
        ? formatter(ctx, 'message', logData)
        : formatLog('message', logData)
      logger.info?.(message)
    }

    // Log command execution
    if (logCommands && isCommand) {
      const commandName = ctx.message.content?.type === 'command' 
        ? ctx.message.content.command 
        : 'unknown'
      logData.command = commandName
      const message = formatter
        ? formatter(ctx, 'command', logData)
        : formatLog('command', logData)
      logger.info?.(message)
    }

    try {
      await next()

      // Log metrics if enabled
      if (logMetrics) {
        const duration = Date.now() - startTime
        const metricsMessage = formatter
          ? formatter(ctx, 'metrics', { ...logData, duration })
          : formatLog('metrics', { ...logData, duration })
        logger.debug?.(metricsMessage)
      }
    } catch (error) {
      // Log errors if enabled
      if (logErrors) {
        const errorData = {
          ...logData,
          error: {
            message: (error as Error).message,
            name: (error as Error).name,
            stack: (error as Error).stack,
          },
        }
        const errorMessage = formatter
          ? formatter(ctx, 'error', errorData)
          : formatLog('error', errorData)
        logger.error?.(errorMessage)
      }
      throw error
    }
  }
}

/**
 * Default log formatter
 */
function formatLog(event: string, data: any): string {
  const parts: string[] = [`[${event.toUpperCase()}]`]

  if (data.provider) {
    parts.push(`provider=${data.provider}`)
  }

  if (data.user?.username) {
    parts.push(`user=@${data.user.username}`)
  } else if (data.user?.id) {
    parts.push(`user=${data.user.id}`)
  }

  if (data.channel?.name) {
    parts.push(`channel=${data.channel.name}`)
  }

  if (data.command) {
    parts.push(`command=/${data.command}`)
  }

  if (data.duration !== undefined) {
    parts.push(`duration=${data.duration}ms`)
  }

  if (data.error) {
    parts.push(`error=${data.error.message}`)
  }

  return parts.join(' ')
}

/**
 * Pre-configured logging middleware for common use cases
 */
export const loggingPresets = {
  /**
   * Minimal logging: only errors
   */
  minimal: <TContext extends BotContext>(): Middleware<TContext, {}> =>
    loggingMiddleware({
      logMessages: false,
      logCommands: false,
      logErrors: true,
      logMetrics: false,
    }),

  /**
   * Standard logging: messages, commands, and errors
   */
  standard: <TContext extends BotContext>(): Middleware<TContext, {}> =>
    loggingMiddleware({
      logMessages: true,
      logCommands: true,
      logErrors: true,
      logMetrics: false,
      includeUserInfo: true,
      includeContent: false,
    }),

  /**
   * Verbose logging: everything including metrics and content
   */
  verbose: <TContext extends BotContext>(): Middleware<TContext, {}> =>
    loggingMiddleware({
      logMessages: true,
      logCommands: true,
      logErrors: true,
      logMetrics: true,
      includeUserInfo: true,
      includeContent: true,
    }),

  /**
   * Debug logging: maximum detail for troubleshooting
   */
  debug: <TContext extends BotContext>(): Middleware<TContext, {}> =>
    loggingMiddleware({
      logMessages: true,
      logCommands: true,
      logErrors: true,
      logMetrics: true,
      includeUserInfo: true,
      includeContent: true,
      formatter: (ctx, event, data) => {
        return `[${event.toUpperCase()}] ${JSON.stringify(data, null, 2)}`
      },
    }),

  /**
   * Production logging: standard without sensitive content
   */
  production: <TContext extends BotContext>(): Middleware<TContext, {}> =>
    loggingMiddleware({
      logMessages: true,
      logCommands: true,
      logErrors: true,
      logMetrics: true,
      includeUserInfo: false, // Don't log user info in production
      includeContent: false, // Don't log content in production
    }),
}

/**
 * Command-specific logging middleware
 */
export function commandLoggingMiddleware<TContext extends BotContext>(options: {
  logger?: BotLogger
  includeParams?: boolean
}): Middleware<TContext, {}> {
  const { logger = console, includeParams = false } = options

  return async (ctx, next) => {
    const isCommand = ctx.message.content?.type === 'command'

    if (!isCommand) {
      return next()
    }

    const command = ctx.message.content?.type === 'command' ? ctx.message.content.command : 'unknown'
    const params = ctx.message.content?.type === 'command' ? ctx.message.content.params : []

    const startTime = Date.now()

    logger.info?.(`[COMMAND] /${command} by @${ctx.message.author.username}`)

    if (includeParams && params.length > 0) {
      logger.debug?.(`[PARAMS] ${JSON.stringify(params)}`)
    }

    try {
      await next()
      const duration = Date.now() - startTime
      logger.info?.(`[SUCCESS] /${command} completed in ${duration}ms`)
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error?.(`[FAILED] /${command} failed after ${duration}ms: ${(error as Error).message}`)
      throw error
    }
  }
}

