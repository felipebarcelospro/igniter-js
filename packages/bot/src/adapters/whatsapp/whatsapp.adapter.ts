import { Bot, BotError, BotErrorCodes } from '../../bot.provider'
import type { BotAttachmentContent, BotContent } from '../../types/bot.types'
import { z } from 'zod'
import { tryCatch, isTryCatchError } from '../../utils/try-catch'
import { parsers } from './whatsapp.helpers'
import {
  WhatsAppAdapterParams,
  type WhatsAppWebhookSchema,
} from './whatsapp.schemas'
import { createWhatsAppClient } from './whatsapp.client'

/**
 * Helper to convert File to data URL format.
 * Note: WhatsApp Cloud API prefers public URLs, but data URLs can work for small files.
 */
async function fileToDataUrl(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  return `data:${file.type || 'application/octet-stream'};base64,${base64}`
}

/**
 * WhatsApp adapter implementation.
 *
 * Responsibilities:
 *  - Outgoing message dispatch through the Meta WhatsApp Cloud API
 *  - Parsing inbound webhook updates into a normalized BotContext
 *  - Basic media retrieval (delegated to helpers)
 *  - Mention detection heuristics for group contexts
 *
 * Logger Usage:
 *  - Uses structured logger (if provided) instead of console.* calls
 *  - Debug for flow traces, info for lifecycle, warn for recoverable anomalies, error for failures
 *
 * Notes:
 *  - Webhook verification (challenge) handling is expected to be done outside (route layer), this adapter only parses payload
 *  - `init` is a noop because WhatsApp Cloud API may use manual / external webhook setup
 */
export const whatsapp = Bot.adapter({
  name: 'whatsapp',
  parameters: WhatsAppAdapterParams,
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
      poll: false, // WhatsApp doesn't support polls via Cloud API yet
      interactive: true, // WhatsApp supports buttons and lists
    },
    actions: {
      edit: false, // WhatsApp doesn't support editing messages
      delete: false, // WhatsApp doesn't support deleting via API
      react: true, // WhatsApp supports reactions
      pin: false,
      thread: false,
    },
    features: {
      webhooks: true,
      longPolling: false,
      commands: false, // WhatsApp doesn't have built-in commands
      mentions: true,
      groups: true,
      channels: false,
      users: true,
      files: true,
    },
    limits: {
      maxMessageLength: 4096,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxButtonsPerMessage: 3, // WhatsApp limits to 3 buttons
    },
  },

  /**
   * Returns a pre-configured HTTP client for the WhatsApp Cloud API.
   */
  client: (config, logger) => {
    return createWhatsAppClient(config.phone, config.token, logger)
  },

  /**
   * Initialization hook (noop for now). Kept for parity with other adapters.
   */
  init: async ({ logger }) => {
    logger?.info?.('[whatsapp] adapter initialized (manual webhook management)')
  },

  // Send text message
  sendText: async ({ client, channel, text, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'WhatsApp client not provided')
    }

    const baseBody: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: channel,
      type: 'text',
      text: { body: text },
    }

    if (options?.replyToMessageId) {
      baseBody.context = { message_id: options.replyToMessageId }
    }

    await client.post('/messages', baseBody)
    logger?.debug?.('[whatsapp] text message sent', { channel })
  },

  // Send image
  sendImage: async ({ client, channel, image, caption, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'WhatsApp client not provided')
    }

    // WhatsApp expects URLs for media - if it's a File, assume it's already been uploaded
    // or convert to base64 data URL format
    const imageUrl = typeof image === 'string' 
      ? image 
      : image instanceof File
        ? await fileToDataUrl(image)
        : String(image)

    const baseBody: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: channel,
      type: 'image',
      image: {
        link: imageUrl,
        ...(caption && { caption }),
      },
    }

    if (options?.replyToMessageId) {
      baseBody.context = { message_id: options.replyToMessageId }
    }

    await client.post('/messages', baseBody)
    logger?.debug?.('[whatsapp] image sent', { channel })
  },

  // Send video
  sendVideo: async ({ client, channel, video, caption, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'WhatsApp client not provided')
    }

    // WhatsApp expects URLs for media - if it's a File, assume it's already been uploaded
    // or convert to base64 data URL format
    const videoUrl = typeof video === 'string' 
      ? video 
      : video instanceof File
        ? await fileToDataUrl(video)
        : String(video)

    const baseBody: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: channel,
      type: 'video',
      video: {
        link: videoUrl,
        ...(caption && { caption }),
      },
    }

    if (options?.replyToMessageId) {
      baseBody.context = { message_id: options.replyToMessageId }
    }

    await client.post('/messages', baseBody)
    logger?.debug?.('[whatsapp] video sent', { channel })
  },

  // Send audio
  sendAudio: async ({ client, channel, audio, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'WhatsApp client not provided')
    }

    // WhatsApp expects URLs for media - if it's a File, assume it's already been uploaded
    // or convert to base64 data URL format
    const audioUrl = typeof audio === 'string' 
      ? audio 
      : audio instanceof File
        ? await fileToDataUrl(audio)
        : String(audio)

    const baseBody: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: channel,
      type: 'audio',
      audio: {
        link: audioUrl,
      },
    }

    if (options?.replyToMessageId) {
      baseBody.context = { message_id: options.replyToMessageId }
    }

    await client.post('/messages', baseBody)
    logger?.debug?.('[whatsapp] audio sent', { channel })
  },

  // Send document
  sendDocument: async ({ client, channel, file, filename, caption, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'WhatsApp client not provided')
    }

    // WhatsApp expects URLs for media - convert File to data URL if needed
    const fileUrl = file instanceof File
      ? await fileToDataUrl(file)
      : String(file)

    const baseBody: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: channel,
      type: 'document',
      document: {
        link: fileUrl,
        ...(filename && { filename }),
        ...(caption && { caption }),
      },
    }

    if (options?.replyToMessageId) {
      baseBody.context = { message_id: options.replyToMessageId }
    }

    await client.post('/messages', baseBody)
    logger?.debug?.('[whatsapp] document sent', { channel })
  },

  // Send sticker
  sendSticker: async ({ client, channel, sticker, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'WhatsApp client not provided')
    }

    // WhatsApp expects URLs for media - if it's a File, convert to data URL
    const stickerUrl = typeof sticker === 'string' 
      ? sticker 
      : sticker instanceof File
        ? await fileToDataUrl(sticker)
        : String(sticker)

    const baseBody: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: channel,
      type: 'sticker',
      sticker: {
        link: stickerUrl,
      },
    }

    if (options?.replyToMessageId) {
      baseBody.context = { message_id: options.replyToMessageId }
    }

    await client.post('/messages', baseBody)
    logger?.debug?.('[whatsapp] sticker sent', { channel })
  },

  // Send location
  sendLocation: async ({ client, channel, latitude, longitude, name, address, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'WhatsApp client not provided')
    }

    const baseBody: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: channel,
      type: 'location',
      location: {
        latitude,
        longitude,
        ...(name && { name }),
        ...(address && { address }),
      },
    }

    if (options?.replyToMessageId) {
      baseBody.context = { message_id: options.replyToMessageId }
    }

    await client.post('/messages', baseBody)
    logger?.debug?.('[whatsapp] location sent', { channel })
  },

  // Send contact
  sendContact: async ({ client, channel, phoneNumber, firstName, lastName, userId, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'WhatsApp client not provided')
    }

    const baseBody: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: channel,
      type: 'contacts',
      contacts: [{
        name: {
          formatted_name: `${firstName}${lastName ? ` ${lastName}` : ''}`,
          first_name: firstName,
          ...(lastName && { last_name: lastName }),
        },
        phones: [{
          phone: phoneNumber,
          type: 'CELL',
          ...(userId && { wa_id: userId }),
        }],
      }],
    }

    if (options?.replyToMessageId) {
      baseBody.context = { message_id: options.replyToMessageId }
    }

    await client.post('/messages', baseBody)
    logger?.debug?.('[whatsapp] contact sent', { channel })
  },

  // Send interactive message (with buttons/keyboard)
  sendInteractive: async ({ client, channel, text, buttons, inlineKeyboard, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'WhatsApp client not provided')
    }

    const baseBody: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: channel,
      type: 'interactive',
      interactive: {
        type: inlineKeyboard && inlineKeyboard.length > 0 ? 'button' : 'list',
        body: { text },
      },
    }

    // Convert BotButton[] or BotInlineKeyboardRow[] to WhatsApp format
    if (inlineKeyboard && inlineKeyboard.length > 0) {
      // Convert to WhatsApp button format (max 3 buttons)
      const whatsappButtons = inlineKeyboard[0].slice(0, 3).map((btn, idx) => {
        const button: any = {
          type: 'reply',
          reply: {
            id: btn.id || `btn_${idx}`,
            title: btn.label,
          },
        }

        if (btn.action === 'url') {
          button.type = 'url'
          button.url = typeof btn.data === 'string' ? btn.data : (btn.data as any)?.url
        }

        return button
      })

      baseBody.interactive.action = {
        buttons: whatsappButtons,
      }
    } else if (buttons && buttons.length > 0) {
      // Convert regular buttons to WhatsApp format (max 3 buttons)
      const whatsappButtons = buttons.slice(0, 3).map((btn, idx) => {
        const button: any = {
          type: 'reply',
          reply: {
            id: btn.id || `btn_${idx}`,
            title: btn.label,
          },
        }

        if (btn.action === 'url') {
          button.type = 'url'
          button.url = typeof btn.data === 'string' ? btn.data : (btn.data as any)?.url
        }

        return button
      })

      baseBody.interactive.action = {
        buttons: whatsappButtons,
      }
    }

    if (options?.replyToMessageId) {
      baseBody.context = { message_id: options.replyToMessageId }
    }

    await client.post('/messages', baseBody)
    logger?.debug?.('[whatsapp] interactive message sent', { channel })
  },

  // Send typing indicator to show the bot is processing
  sendTyping: async ({ client, channel, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'WhatsApp client not provided')
    }

    const result = await tryCatch(() => client.post('/messages', {
      messaging_product: 'whatsapp',
      to: channel,
      type: 'typing',
      action: 'typing', // 'typing' or 'cancel'
    }))

    if (isTryCatchError(result)) {
      logger?.warn?.('[whatsapp] sendTyping error', result.error)
      // Don't throw - typing indicator failures are not critical
    } else {
      logger?.debug?.('[whatsapp] typing indicator sent', { channel })
    }
  },
  /**
   * Parses an inbound WhatsApp webhook update and returns a normalized BotContext
   * or null when the update does not contain a supported message event.
   *
   * @returns BotContext without the bot field, or null to ignore update
   */
  handle: async ({ request, config, logger, botHandle }) => {
    const updateDataResult = await tryCatch(request.json())
    if (isTryCatchError(updateDataResult)) {
      logger?.warn?.('[whatsapp] failed to parse JSON body', { error: updateDataResult.error })
      throw updateDataResult.error
    }
    const updateData = updateDataResult.data

    const parsed = updateData.entry[0].changes[0] as z.infer<
      typeof WhatsAppWebhookSchema
    >
    const value = parsed.value
    const message = value.messages?.[0]
    const attachments: BotAttachmentContent[] = []

    if (!message) {
      logger?.debug?.('[whatsapp] ignoring update without message')
      return null as any
    }

    const authorId = message.from
    const authorName = value.contacts?.[0]?.profile?.name || authorId
    // For WhatsApp, the channel is the sender (from field)
    // In groups, message.from is the sender, but we need the group ID from metadata
    const channelId = message.from

    // Determine if this is a group chat
    const isGroup = channelId?.includes('@g.us') || false

    // Determine if bot was mentioned
    let isMentioned = false
    let messageText = ''

    if (message.type === 'text' && message.text?.body) {
      messageText = message.text.body
    }

    if (isGroup) {
      // Use adapter handle or fallback to bot handle
      const handle = config.handle || botHandle || ''
      const cleanHandle = handle.replace('@', '')
      isMentioned = messageText.toLowerCase().includes(cleanHandle.toLowerCase())
    } else {
      isMentioned = true
    }

    let content: BotContent | undefined
    switch (message.type) {
      case 'text':
        content = parsers.text(message)
        break
      case 'image':
      case 'document':
      case 'audio':
        content = await parsers.media(message, config.token, attachments)
        break
      default:
        content = undefined
    }

    logger?.debug?.('[whatsapp] inbound message parsed', {
      type: message.type,
      hasContent: Boolean(content),
      isGroup,
      isMentioned,
    })

    return {
      event: 'message',
      provider: 'whatsapp',
      channel: {
        id: channelId as string,
        name: value.metadata?.display_phone_number || channelId,
        isGroup,
      },
      message: {
        content,
        attachments,
        author: {
          id: authorId,
          name: authorName,
          username: authorId,
        },
        isMentioned,
      },
    }
  },
})
