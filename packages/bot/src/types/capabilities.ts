/**
 * Bot Adapter Capabilities
 * 
 * Define what features and content types each adapter supports.
 * This allows the bot framework to validate and adapt behavior
 * based on platform capabilities.
 */

/**
 * Describes the content types supported by an adapter.
 */
export interface BotContentCapabilities {
  /** Plain text messages */
  text: boolean
  /** Image messages */
  image: boolean
  /** Video messages */
  video: boolean
  /** Audio/voice messages */
  audio: boolean
  /** Document/file messages */
  document: boolean
  /** Sticker messages */
  sticker: boolean
  /** Location sharing */
  location: boolean
  /** Contact sharing */
  contact: boolean
  /** Polls and surveys */
  poll: boolean
  /** Interactive elements (buttons, keyboards, menus) */
  interactive: boolean
}

/**
 * Describes the actions supported by an adapter.
 */
export interface BotActionCapabilities {
  /** Edit existing messages */
  edit: boolean
  /** Delete messages */
  delete: boolean
  /** Add reactions/emojis */
  react: boolean
  /** Pin messages */
  pin: boolean
  /** Thread/reply support */
  thread: boolean
}

/**
 * Describes the features available in an adapter.
 */
export interface BotFeatureCapabilities {
  /** Webhook support */
  webhooks: boolean
  /** Long polling support */
  longPolling: boolean
  /** Built-in command system */
  commands: boolean
  /** Mention detection */
  mentions: boolean
  /** Group chat support */
  groups: boolean
  /** Channel support */
  channels: boolean
  /** User management */
  users: boolean
  /** File handling */
  files: boolean
}

/**
 * Describes platform-specific limits.
 */
export interface BotLimits {
  /** Maximum message length in characters */
  maxMessageLength: number
  /** Maximum file size in bytes */
  maxFileSize: number
  /** Maximum buttons per interactive message */
  maxButtonsPerMessage: number
}

/**
 * Complete capabilities definition for a bot adapter.
 * 
 * Adapters must declare their capabilities so the framework
 * can validate operations and provide appropriate fallbacks.
 */
export interface BotAdapterCapabilities {
  /** Supported content types */
  content: BotContentCapabilities
  /** Supported actions */
  actions: BotActionCapabilities
  /** Available features */
  features: BotFeatureCapabilities
  /** Platform limits */
  limits: BotLimits
}

