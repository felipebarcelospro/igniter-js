import { Bot } from '../../bot.provider'
import type {
  BotAudioContent,
  BotDocumentContent,
  BotImageContent,
} from '../../types/bot.types'
import { tryCatch } from '../../utils/try-catch'
import { TelegramAdapterParams, TelegramUpdateSchema } from './telegram.schemas'
import {
  fetchTelegramFileAsFile,
  getServiceURL,
  parseTelegramMessageContent,
  escapeMarkdownV2,
} from './telegram.helpers'

/**
 * Telegram adapter implementation.
 *
 * Responsibilities:
 *  - Webhook registration (optional; only if webhook.url provided)
 *  - Command synchronization
 *  - Incoming update parsing (messages, media, commands)
 *  - Safe MarkdownV2 escaping for outgoing messages
 *
 * Logger Integration:
 *  All console logging replaced by structured logger (if provided).
 */
export const telegram = Bot.adapter({
  name: 'telegram',
  parameters: TelegramAdapterParams,
  capabilities: {
    content: {
      text: true,
      image: true,
      video: true,
      audio: true,
      document: true,
      sticker: true,
      location: true,
      contact: true,
      poll: true,
      interactive: true, // Telegram supports inline keyboards
    },
    actions: {
      edit: true,
      delete: true,
      react: false, // Telegram doesn't support reactions (only in channels)
      pin: true,
      thread: false, // Telegram doesn't support threads in the same way
    },
    features: {
      webhooks: true,
      longPolling: true,
      commands: true,
      mentions: true,
      groups: true,
      channels: true,
      users: true,
      files: true,
    },
    limits: {
      maxMessageLength: 4096,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxButtonsPerMessage: 8,
    },
  },
  /**
   * Initializes the adapter: cleans previous webhook, registers commands, sets new webhook.
   */
  init: async ({ config, commands, logger, botHandle }) => {
    if (config.webhook?.url) {
      try {
        const body: { url: string; secret_token?: string } = { url: config.webhook.url }

        if (config.webhook.secret) {
          body.secret_token = config.webhook.secret
        }

        // Delete existing webhook (ignore errors silently)
        await fetch(getServiceURL(config.token, '/deleteWebhook'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }).then(r => r.json()).catch(() => {})

        // Set bot commands
        const commandsPayload = {
          commands: commands.map(cmd => ({
            command: cmd.name,
            description: cmd.description,
          })),
          scope: { type: 'all_group_chats' },
        }

        await fetch(getServiceURL(config.token, '/deleteMyCommands'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })

        await fetch(getServiceURL(config.token, '/setMyCommands'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(commandsPayload),
        }).then(r => r.json()).catch(() => {})

        // Set webhook
        const response = await fetch(getServiceURL(config.token, '/setWebhook'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const result = await response.json()

        if (!response.ok || !result.ok) {
          logger?.error?.('[telegram] webhook setup failed', { result })
          throw new Error(`Failed to set Telegram webhook: ${result.description || response.statusText}`)
        }
        logger?.info?.('[telegram] webhook configured')
      } catch (error) {
        logger?.error?.('[telegram] initialization error', error)

        throw error
      }
    } else {
      logger?.info?.('[telegram] initialized without webhook (URL not provided)')
    }
  },
  /**
   * Sends a text message (MarkdownV2 escaped) to Telegram.
   */
  send: async (params) => {
    const { logger } = params
    const apiUrl = getServiceURL(params.config.token, '/sendMessage')
    try {
      const safeText = escapeMarkdownV2(params.content.content)
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: params.channel,
          text: safeText,
          parse_mode: 'MarkdownV2',
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.ok) {
        logger?.error?.('[telegram] send failed', { result })
        throw new Error(`Telegram API error: ${result.description || response.statusText}`)
      }
      logger?.debug?.('[telegram] message sent', { channel: params.channel })
    } catch (error) {
      logger?.error?.('[telegram] send error', error)
      throw error
    }
  },
  // Handle Telegram webhook: return bot context or null if unhandled
  handle: async ({ request, config, logger, botHandle }) => {
    // 1. Verify Secret Token (if configured)
    if (config.webhook?.secret) {
      const secretTokenHeader = request.headers.get(
        'X-Telegram-Bot-Api-Secret-Token',
      )
      if (secretTokenHeader !== config.webhook.secret) {
        logger?.warn?.('[telegram] invalid secret token received')
        throw new Error('Unauthorized: Invalid secret token.')
      }
    }

    // 2. Parse Request Body
    const updateData = await tryCatch(request.json())

    // 3. Validate Telegram Update Structure
    const parsedUpdate = TelegramUpdateSchema.safeParse(updateData.data)

    if (!parsedUpdate.success) {
      logger?.warn?.('[telegram] invalid update structure', {
        errors: parsedUpdate.error.errors,
      })
      throw new Error(
        `Invalid Telegram update structure: ${parsedUpdate.error.message}`,
      )
    }

    const update = parsedUpdate.data
    const attachments = []
    let content

    if (update.message) {
      const msg = update.message
      const author = msg.from
      const chat = msg.chat

      // Determine if this is a group chat
      const isGroup = ['group', 'supergroup'].includes(chat.type)

      // Determine if bot was mentioned
      let isMentioned = false
      const messageText = msg.text || msg.caption || ''

      if (isGroup) {
        // Use adapter handle or fallback to bot handle
        const handle = config.handle || botHandle || ''
        const botUsername = handle.replace('@', '')
        isMentioned =
          messageText.includes(`@${botUsername}`) || messageText.startsWith('/')
      } else {
        isMentioned = true
      }

      // TEXT
      if (msg.text) {
        content = parseTelegramMessageContent(msg.text)
      }
      // PHOTO
      else if (msg.photo && msg.photo.length > 0) {
        const photo = msg.photo[msg.photo.length - 1]
        const { file, base64, mimeType, fileName } =
          await fetchTelegramFileAsFile(
            photo.file_id,
            config.token,
            undefined,
            undefined,
            true,
          )
        attachments.push({ name: fileName, type: mimeType, content: base64 })
        content = {
          type: 'image',
          content: base64,
          file,
          caption: msg.caption,
        } as BotImageContent
      }
      // DOCUMENT
      else if (msg.document) {
        const { file, base64, mimeType, fileName } =
          await fetchTelegramFileAsFile(
            msg.document.file_id,
            config.token,
            msg.document.file_name,
            msg.document.mime_type,
          )
        attachments.push({ name: fileName, type: mimeType, content: base64 })
        content = {
          type: 'document',
          content: base64,
          file,
        } as BotDocumentContent
      }
      // AUDIO
      else if (msg.audio) {
        const { file, base64, mimeType, fileName } =
          await fetchTelegramFileAsFile(
            msg.audio.file_id,
            config.token,
            msg.audio.file_name,
            msg.audio.mime_type,
          )
        attachments.push({ name: fileName, type: mimeType, content: base64 })
        content = {
          type: 'audio',
          content: base64,
          file,
        } as BotAudioContent
      }
      // VOICE
      else if (msg.voice) {
        const { file, base64, mimeType, fileName } =
          await fetchTelegramFileAsFile(
            msg.voice.file_id,
            config.token,
            undefined,
            msg.voice.mime_type,
          )
        attachments.push({ name: fileName, type: mimeType, content: base64 })
        content = {
          type: 'audio',
          content: base64,
          file,
        } as BotAudioContent
      }

      if (content) {
        return {
          event: 'message',
          provider: 'telegram',
          channel: {
            id: String(chat.id),
            name: chat.title || chat.first_name || String(chat.id),
            isGroup,
          },
            message: {
            content,
            attachments,
            author: {
              id: String(author.id),
              name: `${author.first_name}${author.last_name ? ` ${author.last_name}` : ''}`,
              username: author.username || 'unknown',
            },
            isMentioned,
          },
        }
      }
    }

    // Unhandled / unsupported update type
    return null
  },
})
