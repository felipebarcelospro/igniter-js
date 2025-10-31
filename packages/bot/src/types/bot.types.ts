/* eslint-disable no-use-before-define */
/**
 * Types and interfaces for @igniter-js/bot core system
 *
 * This file contains all shared types and interfaces for bot events, content, context, commands, adapters, and middleware.
 *
 * @module bot.types
 */
import { TypeOf, ZodObject, ZodType } from 'zod'
import type { BotAdapterCapabilities } from './capabilities'
import type { BotSessionHelper } from './session'
import type {
  BotOutboundContent,
  BotSendOptions,
  BotTextContent,
  BotImageContent,
  BotAudioContent,
  BotDocumentContent,
  BotCommandContent,
  BotContent,
} from './content'

// Re-export content types for backward compatibility
export type {
  BotTextContent,
  BotImageContent,
  BotAudioContent,
  BotDocumentContent,
  BotCommandContent,
  BotContent,
}

/**
 * Logger interface used across the bot core and adapters for structured logging.
 * Adapters receive an optional instance so they can avoid using console.* directly.
 * All methods are optional to allow lightweight injection.
 */
export interface BotLogger {
  debug?: (...args: any[]) => void
  info?: (...args: any[]) => void
  warn?: (...args: any[]) => void
  error?: (...args: any[]) => void
}

/**
 * Represents all possible bot events that can be handled by the system.
 * - 'start': Triggered when the bot starts.
 * - 'message': Triggered when a message is received.
 * - 'error': Triggered when an error occurs.
 */
export type BotEvent = 'start' | 'message' | 'error'

/**
 * Represents an attachment content in a bot message, such as files or images.
 */
export interface BotAttachmentContent {
  /** The MIME type or file type of the attachment. */
  type: string
  /** The name of the attachment file. */
  name: string
  /** The content of the attachment, can be a string (URL/base64) or File object. */
  content: string
}

/**
 * Represents the context of a bot event, including message, channel, and author information.
 * Extended with helper methods for easier interaction.
 */
export interface BotContext {
  /** The event type (start, message, error, etc). */
  event: BotEvent
  /** The provider or platform (e.g., 'telegram', 'discord'). */
  provider: string
  /** The bot instance information and send method. */
  bot: {
    /** Bot unique identifier. */
    id: string
    /** Bot name. */
    name: string
    /** Method to send a message from this bot. */
    send: (params: Omit<BotSendParams<any>, 'config'>) => Promise<void>
    /** Get adapter for a specific provider */
    getAdapter?: (provider: string) => IBotAdapter<any> | undefined
    /** Get all registered adapters */
    getAdapters?: () => Record<string, IBotAdapter<any>>
  }
  /** Channel information where the event/message occurred. */
  channel: {
    /** Channel unique identifier. */
    id: string
    /** Channel name. */
    name: string
    /** Whether the channel is a group/supergroup (vs private chat). */
    isGroup: boolean
  }
  /** Message details, including content, attachments, and author. */
  message: {
    /** Message ID (if available) */
    id?: string
    /** The content of the message (text, command, etc). */
    content?: BotContent
    /** Any attachments sent with the message. */
    attachments?: BotAttachmentContent[]
    /** Author information. */
    author: {
      /** Author unique identifier. */
      id: string
      /** Author display name. */
      name: string
      /** Author username or handle. */
      username: string
    }
    /** Whether the bot was mentioned in this message. */
    isMentioned: boolean
  }
  
  /** Session helper for managing conversational state */
  session: BotSessionHelper
  
  // Helper methods for sending messages
  
  /** 
   * Reply to the current message with text or content
   * @param content - Text string or structured content
   * @param options - Optional send options
   */
  reply(content: BotOutboundContent | string, options?: BotSendOptions): Promise<void>
  
  /**
   * Reply with an interactive message containing buttons
   * @param text - Message text
   * @param buttons - Array of buttons
   * @param options - Optional send options
   */
  replyWithButtons(text: string, buttons: any[], options?: BotSendOptions): Promise<void>
  
  /**
   * Reply with an image
   * @param image - Image URL, base64, or File
   * @param caption - Optional caption
   * @param options - Optional send options
   */
  replyWithImage(image: string | File, caption?: string, options?: BotSendOptions): Promise<void>
  
  /**
   * Reply with a document/file
   * @param file - File to send
   * @param caption - Optional caption
   * @param options - Optional send options
   */
  replyWithDocument(file: File, caption?: string, options?: BotSendOptions): Promise<void>
  
  /**
   * Edit an existing message
   * @param messageId - ID of message to edit
   * @param content - New content
   */
  editMessage?(messageId: string, content: BotOutboundContent): Promise<void>
  
  /**
   * Delete a message
   * @param messageId - ID of message to delete
   */
  deleteMessage?(messageId: string): Promise<void>
  
  /**
   * React to a message with an emoji
   * @param emoji - Emoji to react with
   * @param messageId - Optional message ID (defaults to current message)
   */
  react?(emoji: string, messageId?: string): Promise<void>
}

/**
 * Parameters for sending a message using a bot adapter.
 * @template TConfig Adapter configuration type.
 */
export type BotSendParams<TConfig extends Record<string, any>> = {
  /** The provider/platform to send the message to. */
  provider: string
  /** The channel identifier to send the message to. */
  channel: string
  /** The message content (only text supported for now). */
  content: { type: 'text'; content: string }
  /** Adapter-specific configuration. */
  config: TConfig
}

/**
 * Represents a command that can be handled by the bot.
 * Extended with Zod validation support for type-safe arguments.
 */
export interface BotCommand<TArgs = any> {
  /** The command name (without the slash). */
  name: string
  /** Alternative names for the command. */
  aliases: string[]
  /** Description of what the command does. */
  description: string
  /** Help text to be shown if the command fails or is used incorrectly. */
  help: string
  /** Optional Zod schema for validating and typing command arguments */
  args?: ZodType<TArgs>
  /** Handler function to execute the command logic. */
  handle: (ctx: BotContext, params: TArgs) => Promise<void>
  /** Optional subcommands for nested command structures */
  subcommands?: Record<string, Omit<BotCommand, 'name' | 'aliases'>>
}

/**
 * Parameters for handling an incoming request in a bot adapter.
 * @template TConfig Adapter configuration type.
 */
export type BotHandleParams<TConfig extends Record<string, any>> = {
  /** The incoming request object. */
  request: Request
  /** Adapter-specific configuration. */
  config: TConfig
}

/**
 * Interface for a bot adapter, which connects the bot to a specific provider/platform.
 * Extended with capabilities declaration and verification hook.
 * @template TConfig Adapter configuration type (Zod schema).
 */
export interface IBotAdapter<TConfig extends ZodObject<any>> {
  /** Adapter name (e.g., 'telegram', 'discord'). */
  name: string
  /** Adapter configuration schema (Zod). */
  parameters: TConfig
  /** Capabilities declaration - what this adapter can do */
  capabilities: BotAdapterCapabilities
  /** Optional webhook verification hook (for GET requests, challenges, etc) */
  verify?: (params: { request: Request; config: TypeOf<TConfig>; logger?: BotLogger }) => Promise<Response | null>
  /** Initializes the adapter with configuration, available commands and optional logger. */
  init: (params: {
    config: TypeOf<TConfig>
    commands: BotCommand[]
    logger?: BotLogger
  }) => Promise<void>
  /** Sends a message using the adapter (logger provided for structured emission). */
  send: (params: BotSendParams<TConfig> & { logger?: BotLogger }) => Promise<void>
  /** Handles an incoming request (logger available) and returns the bot context or null to ignore the update. */
  handle: (params: BotHandleParams<TConfig> & { logger?: BotLogger }) => Promise<Omit<BotContext, 'bot' | 'session' | 'reply' | 'replyWithButtons' | 'replyWithImage' | 'replyWithDocument'> | null>
}

/**
 * Middleware function type for processing bot context before/after main logic.
 * Receives the context and a next function to continue the chain.
 */
export type Middleware = (
  ctx: BotContext,
  next: () => Promise<void>,
) => Promise<void>
