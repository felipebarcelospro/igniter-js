import type { BotAttachmentContent, BotContent } from '../../types/bot.types'
import { z } from 'zod'
import { Bot } from '../../bot.provider'
import { parsers } from './whatsapp.helpers'
import {
  WhatsAppAdapterParams,
  type WhatsAppWebhookSchema,
} from './whatsapp.schemas'
import { tryCatch } from '../../utils/try-catch'

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
   * Initialization hook (noop for now). Kept for parity with other adapters.
   */
  init: async ({ logger, botHandle }) => {
    logger?.info?.('[whatsapp] adapter initialized (manual webhook management)')
  },

  /**
   * Sends a plain text message to a WhatsApp destination.
   * @param params.message - text content already validated by upstream caller
   * @throws Error if API responds with failure
   */
  send: async (params) => {
    const { token, phone } = params.config
    const { logger } = params

    const apiUrl = `https://graph.facebook.com/v22.0/${phone}/messages`

    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: params.channel,
      type: 'text',
      text: { body: params.content.content },
    }

    try {
      logger?.debug?.('[whatsapp] sending message', {
        channel: params.channel,
        length: body.text.body.length,
      })

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        logger?.error?.('[whatsapp] send failed', { result })
        throw new Error(result.error?.message || response.statusText)
      }
      logger?.debug?.('[whatsapp] message sent', { messageId: result.messages?.[0]?.id })
    } catch (error) {
      logger?.error?.('[whatsapp] send error', error)
      throw error
    }
  },

  /**
   * Parses an inbound WhatsApp webhook update and returns a normalized BotContext
   * or null when the update does not contain a supported message event.
   *
   * @returns BotContext without the bot field, or null to ignore update
   */
  handle: async ({ request, config, logger, botHandle }) => {
    const updateData = await tryCatch(request.json())
    if (updateData.error) {
      logger?.warn?.('[whatsapp] failed to parse JSON body', { error: updateData.error })
      throw updateData.error
    }

    const parsed = updateData.data.entry[0].changes[0] as z.infer<
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
    const channelId = parsed.value.contacts?.[0].wa_id

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
