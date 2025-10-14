/* eslint-disable no-use-before-define */
/**
 * Types and interfaces for @igniter-js/bot core system
 *
 * This file contains all shared types and interfaces for bot events, content, context, commands, adapters, and middleware.
 *
 * @module bot.types
 */
import { TypeOf, ZodObject } from 'zod'

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
 * Represents a plain text message content.
 */
export interface BotTextContent {
  /** The type of content, always 'text'. */
  type: 'text'
  /** The text content. */
  content: string
  /** The raw representation of the text message. */
  raw: string
}

/**
 * Represents an image message content.
 * Used when the bot receives or sends an image.
 */
export interface BotImageContent {
  /** The type of content, always 'image'. */
  type: 'image'
  /** The image content, typically a URL or base64 string. */
  content: string
  /** The image file object. */
  file: File
  /** Caption of image */
  caption?: string
}

/**
 * Represents a document message content.
 * Used when the bot receives or sends a document file (PDF, DOCX, etc).
 */
export interface BotDocumentContent {
  /** The type of content, always 'document'. */
  type: 'document'
  /** The document content, typically a URL or base64 string. */
  content: string
  /** The document file object. */
  file: File
}

/**
 * Represents an audio message content.
 * Used when the bot receives or sends an audio file or recording.
 */
export interface BotAudioContent {
  /** The type of content, always 'audio'. */
  type: 'audio'
  /** The audio content, typically a URL or base64 string. */
  content: string
  /** The audio file object. */
  file: File
}

/**
 * Represents a command message content, such as "/help" or "/start".
 */
export interface BotCommandContent {
  /** The type of content, always 'command'. */
  type: 'command'
  /** The command name (without the slash). */
  command: string
  /** The parameters passed to the command. */
  params: string[]
  /** The raw representation of the command message. */
  raw: string
}

/**
 * Union type for all possible message content types handled by the bot.
 */
export type BotContent =
  | BotTextContent
  | BotCommandContent
  | BotImageContent
  | BotAudioContent
  | BotDocumentContent

/**
 * Represents the context of a bot event, including message, channel, and author information.
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
 */
export interface BotCommand {
  /** The command name (without the slash). */
  name: string
  /** Alternative names for the command. */
  aliases: string[]
  /** Description of what the command does. */
  description: string
  /** Help text to be shown if the command fails or is used incorrectly. */
  help: string
  /** Handler function to execute the command logic. */
  handle: (ctx: BotContext, params: any) => Promise<void>
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
 * @template TConfig Adapter configuration type (Zod schema).
 */
export interface IBotAdapter<TConfig extends ZodObject<any>> {
  /** Adapter name (e.g., 'telegram', 'discord'). */
  name: string
  /** Adapter configuration schema (Zod). */
  parameters: TConfig
  /** Initializes the adapter with configuration, available commands and optional logger. */
  init: (params: {
    config: TypeOf<TConfig>
    commands: BotCommand[]
    logger?: BotLogger
  }) => Promise<void>
  /** Sends a message using the adapter (logger provided for structured emission). */
  send: (params: BotSendParams<TConfig> & { logger?: BotLogger }) => Promise<void>
  /** Handles an incoming request (logger available) and returns the bot context or null to ignore the update. */
  handle: (params: BotHandleParams<TConfig> & { logger?: BotLogger }) => Promise<Omit<BotContext, 'bot'> | null>
}

/**
 * Middleware function type for processing bot context before/after main logic.
 * Receives the context and a next function to continue the chain.
 */
export type Middleware = (
  ctx: BotContext,
  next: () => Promise<void>,
) => Promise<void>
