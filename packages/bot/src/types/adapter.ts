/**
 * Adapter Types
 * 
 * Separate types for all adapter method parameters.
 * This ensures type-safety and better code organization.
 */

import type { ZodObject, TypeOf } from 'zod'
import type { BotLogger, BotCommand, BotContext } from './bot.types'
import type { BotAdapterCapabilities } from './capabilities'
import type { BotSendOptions, BotButton, BotInlineKeyboardRow } from './content'

// ============================================
// PARAMETER TYPES (separated)
// ============================================

/**
 * Parameters for adapter initialization
 */
export interface AdapterInitParams<TConfig extends Record<string, any>> {
  client?: AdapterClient<TConfig>
  config: TConfig
  commands: BotCommand[]
  logger?: BotLogger
  botHandle?: string
}

/**
 * Parameters for processing inbound request
 */
export interface AdapterHandleParams<TConfig extends Record<string, any>> {
  client?: AdapterClient<TConfig>
  request: Request
  config: TConfig
  logger?: BotLogger
  botHandle?: string
}

/**
 * Parameters for webhook verification
 */
export interface AdapterVerifyParams<TConfig extends Record<string, any>> {
  client?: AdapterClient<TConfig>
  request: Request
  config: TConfig
  logger?: BotLogger
}

/**
 * Parameters for typing indicator
 */
export interface AdapterSendTypingParams<TConfig extends Record<string, any>> {
  client?: AdapterClient<TConfig>
  channel: string
  config: TConfig
  logger?: BotLogger
}

/**
 * Parameters for sending text
 */
export interface AdapterSendTextParams<TConfig extends Record<string, any>> {
  client?: AdapterClient<TConfig>
  channel: string
  text: string
  options?: BotSendOptions
  config: TConfig
  logger?: BotLogger
}

/**
 * Parameters for sending image
 */
export interface AdapterSendImageParams<TConfig extends Record<string, any>> {
  client?: AdapterClient<TConfig>
  channel: string
  image: string | File
  caption?: string
  options?: BotSendOptions
  config: TConfig
  logger?: BotLogger
}

/**
 * Parameters for sending video
 */
export interface AdapterSendVideoParams<TConfig extends Record<string, any>> {
  client?: AdapterClient<TConfig>
  channel: string
  video: string | File
  caption?: string
  options?: BotSendOptions
  config: TConfig
  logger?: BotLogger
}

/**
 * Parameters for sending audio
 */
export interface AdapterSendAudioParams<TConfig extends Record<string, any>> {
  client?: AdapterClient<TConfig>
  channel: string
  audio: string | File
  options?: BotSendOptions
  config: TConfig
  logger?: BotLogger
}

/**
 * Parameters for sending document
 */
export interface AdapterSendDocumentParams<TConfig extends Record<string, any>> {
  client?: AdapterClient<TConfig>
  channel: string
  file: File
  filename?: string
  caption?: string
  options?: BotSendOptions
  config: TConfig
  logger?: BotLogger
}

/**
 * Parameters for sending sticker
 */
export interface AdapterSendStickerParams<TConfig extends Record<string, any>> {
  client?: AdapterClient<TConfig>
  channel: string
  sticker: string | File
  options?: BotSendOptions
  config: TConfig
  logger?: BotLogger
}

/**
 * Parameters for sending location
 */
export interface AdapterSendLocationParams<TConfig extends Record<string, any>> {
  client?: AdapterClient<TConfig>
  channel: string
  latitude: number
  longitude: number
  name?: string
  address?: string
  options?: BotSendOptions
  config: TConfig
  logger?: BotLogger
}

/**
 * Parameters for sending contact
 */
export interface AdapterSendContactParams<TConfig extends Record<string, any>> {
  client?: AdapterClient<TConfig>
  channel: string
  phoneNumber: string
  firstName: string
  lastName?: string
  userId?: string
  options?: BotSendOptions
  config: TConfig
  logger?: BotLogger
}

/**
 * Parameters for sending poll
 */
export interface AdapterSendPollParams<TConfig extends Record<string, any>> {
  client?: AdapterClient<TConfig>
  channel: string
  question: string
  options: string[]
  allowsMultipleAnswers?: boolean
  isAnonymous?: boolean
  correctOptionId?: number
  sendOptions?: BotSendOptions
  config: TConfig
  logger?: BotLogger
}

/**
 * Parameters for sending interactive message
 */
export interface AdapterSendInteractiveParams<TConfig extends Record<string, any>> {
  client?: AdapterClient<TConfig>
  channel: string
  text: string
  buttons?: BotButton[]
  inlineKeyboard?: BotInlineKeyboardRow[]
  options?: BotSendOptions
  config: TConfig
  logger?: BotLogger
}

/**
 * Parameters for editing an existing message
 */
export interface AdapterEditMessageParams<TConfig extends Record<string, any>> {
  client?: AdapterClient<TConfig>
  channel: string
  messageId: string
  content: import('./content').BotOutboundContent
  options?: BotSendOptions
  config: TConfig
  logger?: BotLogger
}

/**
 * Parameters for deleting a message
 */
export interface AdapterDeleteMessageParams<TConfig extends Record<string, any>> {
  client?: AdapterClient<TConfig>
  channel: string
  messageId: string
  config: TConfig
  logger?: BotLogger
}

/**
 * Pre-configured HTTP client for making requests to the provider API
 * Similar to axios.create() - pre-configured with token, base URL, etc
 */
export interface AdapterClient<TConfig extends Record<string, any>> {
  /**
   * Makes a GET request to the provider API
   */
  get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T>
  
  /**
   * Makes a POST request to the provider API
   */
  post<T = any>(endpoint: string, body?: Record<string, any>): Promise<T>
  
  /**
   * Makes a PUT request to the provider API
   */
  put<T = any>(endpoint: string, body?: Record<string, any>): Promise<T>
  
  /**
   * Makes a PATCH request to the provider API
   */
  patch<T = any>(endpoint: string, body?: Record<string, any>): Promise<T>
  
  /**
   * Makes a DELETE request to the provider API
   */
  delete<T = any>(endpoint: string, params?: Record<string, any>): Promise<T>
  
  /**
   * Makes a custom generic request
   */
  request<T = any>(options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    endpoint: string
    body?: Record<string, any>
    params?: Record<string, any>
    headers?: Record<string, string>
  }): Promise<T>
}

/**
 * Complete adapter interface
 * 
 * Required methods: init, handle
 * Optional methods: verify, sendTyping, client
 * Send methods: based on capabilities (sendText, sendImage, etc.)
 */
export interface IBotAdapter<TConfig extends ZodObject<any>> {
  /** Adapter name (e.g., 'telegram', 'whatsapp') */
  name: string
  
  /** Zod schema for parameter validation */
  parameters: TConfig
  
  /** Declared adapter capabilities */
  capabilities: BotAdapterCapabilities
  
  /** Stored configuration (for internal use) */
  _config?: TypeOf<TConfig>
  
  // ===== REQUIRED METHODS =====
  
  /**
   * Initializes the adapter with configuration and commands
   */
  init: (params: AdapterInitParams<TypeOf<TConfig>>) => Promise<void>
  
  /**
   * Processes an inbound request and returns context or null
   */
  handle: (params: AdapterHandleParams<TypeOf<TConfig>>) => Promise<
    Omit<BotContext, 'bot' | 'session' | 'reply' | 'replyWithButtons' | 'replyWithImage' | 'replyWithDocument' | 'sendTyping'> | null
  >
  
  // ===== OPTIONAL METHODS =====
  
  /**
   * Verifies webhook (for GET requests, challenges, etc)
   * Returns Response if should respond, null otherwise
   */
  verify?: (params: AdapterVerifyParams<TypeOf<TConfig>>) => Promise<Response | null>
  
  /**
   * Sends typing indicator
   */
  sendTyping?: (params: AdapterSendTypingParams<TypeOf<TConfig>>) => Promise<void>
  
  /**
   * Pre-configured HTTP client for custom requests to the provider API
   * Similar to axios.create() - comes with token, base URL, headers, etc pre-configured
   */
  client?: AdapterClient<TypeOf<TConfig>>
  
  // ===== SEND METHODS (based on capabilities) =====
  
  /**
   * Sends a text message
   * Required if capabilities.content.text === true
   */
  sendText?: (params: AdapterSendTextParams<TypeOf<TConfig>>) => Promise<void>
  
  /**
   * Sends an image
   * Required if capabilities.content.image === true
   */
  sendImage?: (params: AdapterSendImageParams<TypeOf<TConfig>>) => Promise<void>
  
  /**
   * Sends a video
   * Required if capabilities.content.video === true
   */
  sendVideo?: (params: AdapterSendVideoParams<TypeOf<TConfig>>) => Promise<void>
  
  /**
   * Sends audio
   * Required if capabilities.content.audio === true
   */
  sendAudio?: (params: AdapterSendAudioParams<TypeOf<TConfig>>) => Promise<void>
  
  /**
   * Sends a document/file
   * Required if capabilities.content.document === true
   */
  sendDocument?: (params: AdapterSendDocumentParams<TypeOf<TConfig>>) => Promise<void>
  
  /**
   * Sends a sticker
   * Required if capabilities.content.sticker === true
   */
  sendSticker?: (params: AdapterSendStickerParams<TypeOf<TConfig>>) => Promise<void>
  
  /**
   * Sends location
   * Required if capabilities.content.location === true
   */
  sendLocation?: (params: AdapterSendLocationParams<TypeOf<TConfig>>) => Promise<void>
  
  /**
   * Sends contact
   * Required if capabilities.content.contact === true
   */
  sendContact?: (params: AdapterSendContactParams<TypeOf<TConfig>>) => Promise<void>
  
  /**
   * Sends poll
   * Required if capabilities.content.poll === true
   */
  sendPoll?: (params: AdapterSendPollParams<TypeOf<TConfig>>) => Promise<void>
  
  /**
   * Sends interactive message with buttons
   * Required if capabilities.content.interactive === true
   */
  sendInteractive?: (params: AdapterSendInteractiveParams<TypeOf<TConfig>>) => Promise<void>
  
  // ===== ACTION METHODS (based on capabilities.actions) =====
  
  /**
   * Edits an existing message
   * Required if capabilities.actions.edit === true
   */
  editMessage?: (params: AdapterEditMessageParams<TypeOf<TConfig>>) => Promise<void>
  
  /**
   * Deletes a message
   * Required if capabilities.actions.delete === true
   */
  deleteMessage?: (params: AdapterDeleteMessageParams<TypeOf<TConfig>>) => Promise<void>
}

