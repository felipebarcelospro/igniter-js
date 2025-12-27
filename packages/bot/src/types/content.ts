/**
 * Extended Bot Content Types
 * 
 * Defines all content types that can be sent and received by bots,
 * including interactive elements, media, and special message types.
 */

/**
 * Base interface for all content types
 */
export interface BotBaseContent {
  type: string
  raw?: string
}

/**
 * Plain text message content
 */
export interface BotTextContent extends BotBaseContent {
  type: 'text'
  content: string
  raw: string
}

/**
 * Image message content
 */
export interface BotImageContent extends BotBaseContent {
  type: 'image'
  content: string // URL or base64
  file?: File
  caption?: string
  width?: number
  height?: number
}

/**
 * Video message content
 */
export interface BotVideoContent extends BotBaseContent {
  type: 'video'
  content: string // URL or base64
  file?: File
  caption?: string
  duration?: number
  width?: number
  height?: number
  thumbnail?: string
}

/**
 * Audio/voice message content
 */
export interface BotAudioContent extends BotBaseContent {
  type: 'audio'
  content: string // URL or base64
  file?: File
  duration?: number
  mimeType?: string
}

/**
 * Document/file message content
 */
export interface BotDocumentContent extends BotBaseContent {
  type: 'document'
  content: string // URL or base64
  file?: File
  filename?: string
  mimeType?: string
  caption?: string
}

/**
 * Sticker message content
 */
export interface BotStickerContent extends BotBaseContent {
  type: 'sticker'
  content: string // URL or base64
  file?: File
  emoji?: string
}

/**
 * Location message content
 */
export interface BotLocationContent extends BotBaseContent {
  type: 'location'
  latitude: number
  longitude: number
  address?: string
  name?: string
}

/**
 * Contact message content
 */
export interface BotContactContent extends BotBaseContent {
  type: 'contact'
  phoneNumber: string
  firstName: string
  lastName?: string
  userId?: string
}

/**
 * Poll message content
 */
export interface BotPollContent extends BotBaseContent {
  type: 'poll'
  question: string
  options: string[]
  allowsMultipleAnswers?: boolean
  isAnonymous?: boolean
  correctOptionId?: number
}

/**
 * Button for interactive messages
 */
export interface BotButton {
  /** Unique button identifier */
  id: string
  /** Button label text */
  label: string
  /** Button action type */
  action: 'url' | 'callback' | 'phone' | 'location' | 'share'
  /** Action data (URL, callback data, phone number, etc) */
  data?: string | { url: string } | { phone: string }
  /** Optional emoji */
  emoji?: string
}

/**
 * Inline keyboard row
 */
export type BotInlineKeyboardRow = BotButton[]

/**
 * Quick reply button
 */
export interface BotQuickReply {
  id: string
  label: string
  payload?: string
}

/**
 * Menu for interactive messages
 */
export interface BotMenu {
  title: string
  sections: Array<{
    title?: string
    rows: Array<{
      id: string
      title: string
      description?: string
    }>
  }>
}

/**
 * Interactive message content (buttons, keyboards, menus)
 */
export interface BotInteractiveContent extends BotBaseContent {
  type: 'interactive'
  text: string
  buttons?: BotButton[]
  inlineKeyboard?: BotInlineKeyboardRow[]
  menu?: BotMenu
  quickReplies?: BotQuickReply[]
  footer?: string
}

/**
 * Command message content
 */
export interface BotCommandContent extends BotBaseContent {
  type: 'command'
  command: string
  params: string[]
  raw: string
}

/**
 * Reply/thread message content
 */
export interface BotReplyContent extends BotBaseContent {
  type: 'reply'
  messageId: string
  content: BotOutboundContent
}

/**
 * Callback query (button press) content
 */
export interface BotCallbackContent extends BotBaseContent {
  type: 'callback'
  callbackId: string
  data: string
  messageId?: string
}

/**
 * All inbound content types (received by bot)
 */
export type BotInboundContent =
  | BotTextContent
  | BotCommandContent
  | BotImageContent
  | BotVideoContent
  | BotAudioContent
  | BotDocumentContent
  | BotStickerContent
  | BotLocationContent
  | BotContactContent
  | BotPollContent
  | BotCallbackContent

/**
 * All outbound content types (sent by bot)
 */
export type BotOutboundContent =
  | BotTextContent
  | BotImageContent
  | BotVideoContent
  | BotAudioContent
  | BotDocumentContent
  | BotStickerContent
  | BotLocationContent
  | BotContactContent
  | BotPollContent
  | BotInteractiveContent
  | BotReplyContent

/**
 * Union of all content types
 */
export type BotContent = BotInboundContent | BotOutboundContent

/**
 * Send options for outbound messages
 */
export interface BotSendOptions {
  /** Reply to a specific message */
  replyToMessageId?: string
  /** Disable link previews */
  disableWebPagePreview?: boolean
  /** Disable notifications */
  disableNotification?: boolean
  /** 
   * Parse mode (HTML, Markdown, MarkdownV2, etc)
   * 
   * When not set, Telegram adapter will automatically convert standard Markdown to HTML.
   * Set explicitly if you have pre-formatted content.
   */
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  /** Protect content from forwarding */
  protectContent?: boolean
  /**
   * Automatically format Markdown content for the platform (default: true)
   * 
   * When true (default), standard Markdown like **bold**, *italic*, `code`, etc.
   * will be converted to the platform's native format (e.g., HTML for Telegram).
   * 
   * Set to false to send raw text without any formatting.
   */
  autoFormat?: boolean
}

