import { Bot, BotError, BotErrorCodes } from '../../bot.provider'
import type {
  BotAudioContent,
  BotDocumentContent,
  BotImageContent,
} from '../../types/bot.types'
import type { BotSendOptions, BotVideoContent } from '../../types/content'
import { tryCatch, isTryCatchError } from '../../utils/try-catch'
import { TelegramAdapterParams, TelegramUpdateSchema } from './telegram.schemas'
import {
  fetchTelegramFileAsFile,
  parseTelegramMessageContent,
  escapeMarkdownV2,
  convertMarkdownToTelegramHTML,
  convertMarkdownToTelegramLegacy,
  stripMarkdown,
} from './telegram.helpers'
import { createTelegramClient } from './telegram.client'

/**
 * Formats text for Telegram based on the parse mode and options.
 * 
 * By default, converts standard Markdown to HTML format (most forgiving).
 * If parseMode is explicitly set, uses that mode with appropriate escaping.
 * If autoFormat is false, sends text as-is (for pre-formatted content).
 * 
 * @param text The text to format
 * @param options Send options including parseMode and autoFormat
 * @returns Object with formatted text and parse_mode to use
 */
function formatTelegramText(text: string, options?: BotSendOptions): { text: string; parseMode?: string } {
  // If autoFormat is explicitly false, send as plain text (no formatting)
  if (options?.autoFormat === false) {
    return { text: stripMarkdown(text) }
  }
  
  // If parseMode is explicitly set, respect it
  if (options?.parseMode) {
    if (options.parseMode === 'MarkdownV2') {
      // For MarkdownV2, we escape everything (user is responsible for proper formatting)
      return { text: escapeMarkdownV2(text), parseMode: 'MarkdownV2' }
    }
    if (options.parseMode === 'HTML') {
      // Assume text is already HTML formatted
      return { text, parseMode: 'HTML' }
    }
    if (options.parseMode === 'Markdown') {
      // Legacy Markdown mode - convert standard Markdown to Telegram's legacy format
      // This handles bullet points, **bold** -> *bold*, etc.
      return { text: convertMarkdownToTelegramLegacy(text), parseMode: 'Markdown' }
    }
  }
  
  // Default: auto-convert Markdown to HTML (most robust for AI-generated content)
  return { 
    text: convertMarkdownToTelegramHTML(text), 
    parseMode: 'HTML' 
  }
}

// Helper to build base payload with common options
function buildBasePayload(channel: string, options?: BotSendOptions) {
  const payload: any = { chat_id: channel }
  if (options?.replyToMessageId) payload.reply_to_message_id = parseInt(options.replyToMessageId)
  if (options?.disableNotification) payload.disable_notification = true
  if (options?.disableWebPagePreview) payload.disable_web_page_preview = true
  if (options?.protectContent) payload.protect_content = true
  // Note: parse_mode is now handled by formatTelegramText
  return payload
}

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
   * Returns a pre-configured HTTP client for the Telegram API.
   */
  client: (config, logger) => {
    return createTelegramClient(config.token, logger)
  },
  /**
   * Initializes the adapter: cleans previous webhook, registers commands, sets new webhook.
   */
  init: async ({ config, commands, logger, client }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Telegram client not provided')
    }

    if (!config.webhook || !config.webhook?.url) {
      logger?.info?.('[telegram] initialized without webhook (URL not provided)')
      return
    }

    // Build body for webhook configuration
    const body: { url: string; secret_token?: string } = { url: config.webhook.url }

    // Add secret token if provided
    if (config.webhook.secret) body.secret_token = config.webhook.secret

    // Delete existing webhook (ignore errors silently)
    await tryCatch(client.post('/deleteWebhook', {}))

    // Set bot commands
    await tryCatch(client.post('/deleteMyCommands', {}))
    await tryCatch(client.post('/setMyCommands', {
      commands: commands.map(cmd => ({
        command: cmd.name,
        description: cmd.description,
      })),
      scope: { type: 'all_group_chats' },
    }))

    // Set webhook
    const setWebhookResult = await tryCatch(() => client.post('/setWebhook', body))
    if (isTryCatchError(setWebhookResult)) {
      logger?.error?.('[telegram] initialization error', setWebhookResult.error)
      throw setWebhookResult.error
    }

    logger?.info?.('[telegram] webhook configured')
  },
  // Send text message
  sendText: async ({ client, channel, text, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Telegram client not provided')
    }

    const basePayload = buildBasePayload(channel, options)
    const formatted = formatTelegramText(text, options)
    const payload = { 
      ...basePayload, 
      text: formatted.text,
      ...(formatted.parseMode && { parse_mode: formatted.parseMode })
    }
    await client.post('/sendMessage', payload)
    logger?.debug?.('[telegram] text message sent', { channel })
  },

  // Send image
  sendImage: async ({ client, channel, image, caption, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Telegram client not provided')
    }

    const basePayload = buildBasePayload(channel, options)
    const payload: any = { ...basePayload, photo: image }
    if (caption) {
      const formatted = formatTelegramText(caption, options)
      payload.caption = formatted.text
      if (formatted.parseMode) payload.parse_mode = formatted.parseMode
    }
    await client.post('/sendPhoto', payload)
    logger?.debug?.('[telegram] image sent', { channel })
  },

  // Send video
  sendVideo: async ({ client, channel, video, caption, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Telegram client not provided')
    }

    const basePayload = buildBasePayload(channel, options)
    const payload: any = { ...basePayload, video }
    if (caption) {
      const formatted = formatTelegramText(caption, options)
      payload.caption = formatted.text
      if (formatted.parseMode) payload.parse_mode = formatted.parseMode
    }
    await client.post('/sendVideo', payload)
    logger?.debug?.('[telegram] video sent', { channel })
  },

  // Send audio
  sendAudio: async ({ client, channel, audio, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Telegram client not provided')
    }

    const basePayload = buildBasePayload(channel, options)
    const payload: any = { ...basePayload, audio }
    // Note: Telegram doesn't support captions for audio, only for voice messages
    await client.post('/sendAudio', payload)
    logger?.debug?.('[telegram] audio sent', { channel })
  },

  // Send document
  sendDocument: async ({ client, channel, file, filename, caption, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Telegram client not provided')
    }

    const basePayload = buildBasePayload(channel, options)
    const payload: any = { ...basePayload, document: file }
    if (filename) payload.filename = filename
    if (caption) {
      const formatted = formatTelegramText(caption, options)
      payload.caption = formatted.text
      if (formatted.parseMode) payload.parse_mode = formatted.parseMode
    }
    await client.post('/sendDocument', payload)
    logger?.debug?.('[telegram] document sent', { channel })
  },

  // Send sticker
  sendSticker: async ({ client, channel, sticker, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Telegram client not provided')
    }

    const basePayload = buildBasePayload(channel, options)
    const payload = { ...basePayload, sticker }
    await client.post('/sendSticker', payload)
    logger?.debug?.('[telegram] sticker sent', { channel })
  },

  // Send location
  sendLocation: async ({ client, channel, latitude, longitude, name, address, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Telegram client not provided')
    }

    const basePayload = buildBasePayload(channel, options)
    const payload: any = { ...basePayload, latitude, longitude }
    if (name) payload.name = name
    if (address) payload.address = address
    await client.post('/sendLocation', payload)
    logger?.debug?.('[telegram] location sent', { channel })
  },

  // Send contact
  sendContact: async ({ client, channel, phoneNumber, firstName, lastName, userId, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Telegram client not provided')
    }

    const basePayload = buildBasePayload(channel, options)
    const payload: any = { ...basePayload, phone_number: phoneNumber, first_name: firstName }
    if (lastName) payload.last_name = lastName
    if (userId) payload.user_id = parseInt(userId)
    await client.post('/sendContact', payload)
    logger?.debug?.('[telegram] contact sent', { channel })
  },

  // Send poll
  sendPoll: async ({ client, channel, question, options: pollOptions, allowsMultipleAnswers, isAnonymous, correctOptionId, sendOptions, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Telegram client not provided')
    }

    const basePayload = buildBasePayload(channel, sendOptions)
    const payload: any = { ...basePayload, question, options: pollOptions }
    if (allowsMultipleAnswers) payload.allows_multiple_answers = true
    if (isAnonymous !== undefined) payload.is_anonymous = isAnonymous
    if (correctOptionId !== undefined) payload.correct_option_id = correctOptionId
    await client.post('/sendPoll', payload)
    logger?.debug?.('[telegram] poll sent', { channel })
  },

  // Send interactive message (with buttons/keyboard)
  sendInteractive: async ({ client, channel, text, buttons, inlineKeyboard, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Telegram client not provided')
    }

    const basePayload = buildBasePayload(channel, options)
    const formatted = formatTelegramText(text, options)
    const payload: any = { 
      ...basePayload, 
      text: formatted.text,
      ...(formatted.parseMode && { parse_mode: formatted.parseMode })
    }

    // Convert BotButton[] to Telegram inline_keyboard format
    if (inlineKeyboard && inlineKeyboard.length > 0) {
      payload.reply_markup = {
        inline_keyboard: inlineKeyboard.map(row =>
          row.map(button => {
            const telegramButton: any = { text: button.label }
            
            switch (button.action) {
              case 'url':
                telegramButton.url = typeof button.data === 'string' ? button.data : (button.data as any)?.url
                break
              case 'callback':
                telegramButton.callback_data = typeof button.data === 'string' ? button.data : button.id
                break
              case 'phone':
                telegramButton.callback_data = `phone:${typeof button.data === 'string' ? button.data : (button.data as any)?.phone}`
                break
              case 'location':
                telegramButton.callback_data = 'location'
                break
              case 'share':
                telegramButton.switch_inline_query = typeof button.data === 'string' ? button.data : ''
                break
            }
            
            return telegramButton
          })
        ),
      }
    }
    // Regular buttons as reply keyboard
    else if (buttons && buttons.length > 0) {
      payload.reply_markup = {
        keyboard: buttons.map(button => [{ text: button.label }]),
        resize_keyboard: true,
        one_time_keyboard: true,
      }
    }

    await client.post('/sendMessage', payload)
    logger?.debug?.('[telegram] interactive message sent', { channel })
  },
  
  // Send typing indicator to show the bot is processing
  sendTyping: async ({ client, channel, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Telegram client not provided')
    }

    const result = await tryCatch(() => client.post('/sendChatAction', {
      chat_id: channel,
      action: 'typing',
    }))
    
    if (isTryCatchError(result)) {
      logger?.warn?.('[telegram] sendTyping error', result.error)
      // Don't throw - typing indicator failures are not critical
    } else {
      logger?.debug?.('[telegram] typing indicator sent', { channel })
    }
  },

  // Edit an existing message
  editMessage: async ({ client, channel, messageId, content, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Telegram client not provided')
    }

    const payload: any = {
      chat_id: channel,
      message_id: parseInt(messageId),
    }

    // Handle different content types
    if (content.type === 'text') {
      const formatted = formatTelegramText(content.content, options)
      payload.text = formatted.text
      if (formatted.parseMode) payload.parse_mode = formatted.parseMode
      if (options?.disableWebPagePreview) payload.disable_web_page_preview = true

      await client.post('/editMessageText', payload)
      logger?.debug?.('[telegram] message edited', { channel, messageId })
    } else if (content.type === 'image' || content.type === 'video') {
      // For media messages, we can only edit the caption
      const mediaContent = content as BotImageContent | BotVideoContent
      if (mediaContent.caption !== undefined) {
        const formatted = formatTelegramText(mediaContent.caption, options)
        await client.post('/editMessageCaption', {
          ...payload,
          caption: formatted.text,
          ...(formatted.parseMode && { parse_mode: formatted.parseMode }),
        })
        logger?.debug?.('[telegram] message caption edited', { channel, messageId })
      } else {
        logger?.warn?.('[telegram] cannot edit media message without caption', { channel, messageId })
        throw new BotError(
          BotErrorCodes.INVALID_CONTENT,
          'Cannot edit media message: only caption can be edited',
          { contentType: content.type }
        )
      }
    } else if (content.type === 'interactive') {
      // For interactive messages, we can edit the reply markup
      const replyMarkup: any = {}
      
      if (content.inlineKeyboard && content.inlineKeyboard.length > 0) {
        replyMarkup.inline_keyboard = content.inlineKeyboard.map(row =>
          row.map(button => {
            const telegramButton: any = { text: button.label }
            
            switch (button.action) {
              case 'url':
                telegramButton.url = typeof button.data === 'string' ? button.data : (button.data as any)?.url
                break
              case 'callback':
                telegramButton.callback_data = typeof button.data === 'string' ? button.data : button.id
                break
              case 'phone':
                telegramButton.callback_data = `phone:${typeof button.data === 'string' ? button.data : (button.data as any)?.phone}`
                break
              case 'location':
                telegramButton.callback_data = 'location'
                break
              case 'share':
                telegramButton.switch_inline_query = typeof button.data === 'string' ? button.data : ''
                break
            }
            
            return telegramButton
          })
        )
      }

      await client.post('/editMessageReplyMarkup', {
        ...payload,
        reply_markup: replyMarkup,
      })
      logger?.debug?.('[telegram] message reply markup edited', { channel, messageId })
    } else {
      logger?.warn?.('[telegram] content type not supported for editing', { contentType: content.type })
      throw new BotError(
        BotErrorCodes.CONTENT_TYPE_NOT_SUPPORTED,
        `Content type '${content.type}' cannot be edited`,
        { contentType: content.type }
      )
    }
  },

  // Delete a message
  deleteMessage: async ({ client, channel, messageId, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Telegram client not provided')
    }

    const result = await tryCatch(() => client.post('/deleteMessage', {
      chat_id: channel,
      message_id: parseInt(messageId),
    }))

    if (isTryCatchError(result)) {
      logger?.error?.('[telegram] deleteMessage error', result.error)
      throw result.error
    }

    logger?.debug?.('[telegram] message deleted', { channel, messageId })
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
    const updateDataResult = await tryCatch(request.json())
    if (isTryCatchError(updateDataResult)) {
      logger?.warn?.('[telegram] failed to parse JSON body', { error: updateDataResult.error })
      throw updateDataResult.error
    }
    const updateData = updateDataResult.data

    // 3. Validate Telegram Update Structure
    const parsedUpdate = TelegramUpdateSchema.safeParse(updateData)

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
