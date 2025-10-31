/**
 * Builder Pattern Types
 * 
 * Defines types for the fluent Builder API for constructing bots.
 */

import type { BotCommand, IBotAdapter, Middleware, BotLogger, BotContext } from './bot.types'
import type { BotSessionStore } from './session'
import type { BotPlugin } from './plugins'
import type { BotError } from '../bot.provider'

/**
 * Bot configuration options (for advanced settings)
 */
export interface BotOptions {
  /** Request timeout in milliseconds */
  timeout?: number
  /** Number of retry attempts for failed operations */
  retries?: number
  /** Whether to automatically register commands with platforms */
  autoRegisterCommands?: boolean
  /** Custom error handler */
  errorHandler?: (error: BotError, context?: BotContext) => void | Promise<void>
}

/**
 * Event handler type for lifecycle events
 */
export type BotEventHandler<TContext extends BotContext = BotContext> = (
  ctx: TContext,
) => Promise<void> | void

/**
 * Error event handler type
 */
export type BotErrorHandler<TContext extends BotContext = BotContext> = (
  ctx: TContext & { error: BotError },
) => Promise<void> | void

/**
 * Start hook handler type
 */
export type BotStartHandler = () => Promise<void> | void

/**
 * Builder configuration accumulator
 * Used internally to track builder state
 */
export interface BotBuilderConfig {
  handle?: string
  id?: string
  name?: string
  logger?: BotLogger
  adapters: Record<string, IBotAdapter<any>>
  commands: Record<string, BotCommand>
  middlewares: Middleware[]
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

