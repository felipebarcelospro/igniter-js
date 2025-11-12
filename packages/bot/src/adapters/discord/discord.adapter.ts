import { Bot, BotError, BotErrorCodes } from '../../bot.provider'
import type {
  BotAudioContent,
  BotDocumentContent,
  BotImageContent,
} from '../../types/bot.types'
import type { BotSendOptions, BotVideoContent } from '../../types/content'
import { tryCatch, isTryCatchError } from '../../utils/try-catch'
import { DiscordAdapterParams, DiscordInteractionSchema } from './discord.schemas'
import {
  verifyDiscordSignature,
  parseDiscordMessageContent,
  getDiscordInteractionType,
  parseDiscordCommandData,
  isDiscordGuildChannel,
  getDiscordDisplayName,
  isBotMentioned,
} from './discord.helpers'
import { createDiscordClient } from './discord.client'

// Helper to build base payload with common options
function buildBasePayload(channel: string, options?: BotSendOptions) {
  const payload: any = {}
  if (options?.replyToMessageId) {
    payload.message_reference = {
      message_id: options.replyToMessageId,
    }
  }
  if (options?.disableNotification) {
    payload.flags = (payload.flags || 0) | 0x1000 // SUPPRESS_NOTIFICATIONS
  }
  return payload
}

/**
 * Discord adapter implementation.
 *
 * Responsibilities:
 *  - Interaction signature verification
 *  - Command synchronization (slash commands)
 *  - Incoming interaction parsing (messages, commands, components)
 *  - Message sending with embeds and attachments
 *
 * Logger Integration:
 *  All console logging replaced by structured logger (if provided).
 */
export const discord = Bot.adapter({
  name: 'discord',
  parameters: DiscordAdapterParams,
  capabilities: {
    content: {
      text: true,
      image: true,
      video: true,
      audio: true,
      document: true,
      sticker: false, // Discord doesn't support sending stickers via API
      location: false, // Discord doesn't support location sharing
      contact: false, // Discord doesn't support contact sharing
      poll: false, // Discord doesn't support polls
      interactive: true, // Discord supports buttons and select menus
    },
    actions: {
      edit: true,
      delete: true,
      react: true, // Discord supports reactions
      pin: false, // Discord doesn't support pinning via bot API
      thread: true, // Discord supports threads
    },
    features: {
      webhooks: true, // Discord uses interactions, not traditional webhooks
      longPolling: false, // Discord doesn't support long polling
      commands: true, // Discord supports slash commands
      mentions: true, // Discord supports mentions
      groups: true, // Discord supports servers/guilds
      channels: true, // Discord supports channels
      users: true, // Discord supports DMs
      files: true, // Discord supports file attachments
    },
    limits: {
      maxMessageLength: 2000,
      maxFileSize: 25 * 1024 * 1024, // 25MB for regular bots, 100MB for verified bots
      maxButtonsPerMessage: 5, // Discord allows up to 5 buttons per row, 5 rows max
    },
  },
  /**
   * Returns a pre-configured HTTP client for the Discord API.
   */
  client: (config, logger) => {
    return createDiscordClient(config.token, logger)
  },
  /**
   * Initializes the adapter: registers slash commands.
   */
  init: async ({ config, commands, logger, client }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Discord client not provided')
    }

    if (!config.applicationId) {
      logger?.info?.('[discord] initialized without command registration (applicationId not provided)')
      return
    }

    // Register slash commands
    try {
      const discordCommands = commands.map(cmd => ({
        name: cmd.name,
        description: cmd.description || cmd.help,
        type: 1, // CHAT_INPUT
      }))

      await tryCatch(() => 
        client.post(`/applications/${config.applicationId}/commands`, discordCommands)
      )

      logger?.info?.('[discord] commands registered', { count: commands.length })
    } catch (error) {
      logger?.error?.('[discord] failed to register commands', error)
      // Don't throw - command registration failure shouldn't break initialization
    }
  },
  /**
   * Verifies Discord interaction signature
   */
  verify: async ({ request, config, logger }) => {
    if (!config.publicKey) {
      logger?.warn?.('[discord] public key not configured, skipping verification')
      return null
    }

    const signature = request.headers.get('X-Signature-Ed25519')
    const timestamp = request.headers.get('X-Signature-Timestamp')

    if (!signature || !timestamp) {
      logger?.warn?.('[discord] missing signature headers')
      return new Response('Unauthorized', { status: 401 })
    }

    const body = await request.text()
    const isValid = verifyDiscordSignature(signature, timestamp, body, config.publicKey)

    if (!isValid) {
      logger?.warn?.('[discord] invalid signature')
      return new Response('Unauthorized', { status: 401 })
    }

    return null
  },
  // Send text message
  sendText: async ({ client, channel, text, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Discord client not provided')
    }

    const basePayload = buildBasePayload(channel, options)
    const payload = { ...basePayload, content: text }

    await client.post(`/channels/${channel}/messages`, payload)
    logger?.debug?.('[discord] text message sent', { channel })
  },

  // Send image
  sendImage: async ({ client, channel, image, caption, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Discord client not provided')
    }

    const basePayload = buildBasePayload(channel, options)
    
    // If image is a File, use multipart/form-data
    if (image instanceof File) {
      const formData = {
        file: image,
        payload_json: JSON.stringify({
          ...basePayload,
          content: caption || '',
        }),
      }
      await client.post(`/channels/${channel}/messages`, formData)
    } else {
      // URL or base64
      const payload = {
        ...basePayload,
        content: caption || '',
        embeds: [{
          image: {
            url: image,
          },
        }],
      }
      await client.post(`/channels/${channel}/messages`, payload)
    }

    logger?.debug?.('[discord] image sent', { channel })
  },

  // Send video
  sendVideo: async ({ client, channel, video, caption, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Discord client not provided')
    }

    const basePayload = buildBasePayload(channel, options)
    
    // If video is a File, use multipart/form-data
    if (video instanceof File) {
      const formData = {
        file: video,
        payload_json: JSON.stringify({
          ...basePayload,
          content: caption || '',
        }),
      }
      await client.post(`/channels/${channel}/messages`, formData)
    } else {
      // URL - Discord doesn't support video embeds, so we just send the URL
      const payload = {
        ...basePayload,
        content: caption ? `${caption}\n${video}` : video,
      }
      await client.post(`/channels/${channel}/messages`, payload)
    }

    logger?.debug?.('[discord] video sent', { channel })
  },

  // Send audio
  sendAudio: async ({ client, channel, audio, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Discord client not provided')
    }

    const basePayload = buildBasePayload(channel, options)
    
    // If audio is a File, use multipart/form-data
    if (audio instanceof File) {
      const formData = {
        file: audio,
        payload_json: JSON.stringify(basePayload),
      }
      await client.post(`/channels/${channel}/messages`, formData)
    } else {
      // URL
      const payload = {
        ...basePayload,
        content: audio,
      }
      await client.post(`/channels/${channel}/messages`, payload)
    }

    logger?.debug?.('[discord] audio sent', { channel })
  },

  // Send document
  sendDocument: async ({ client, channel, file, filename, caption, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Discord client not provided')
    }

    if (!file) {
      throw new BotError(BotErrorCodes.INVALID_CONTENT, 'File is required for document')
    }

    const basePayload = buildBasePayload(channel, options)
    const formData = {
      file: file,
      payload_json: JSON.stringify({
        ...basePayload,
        content: caption || '',
      }),
    }

    await client.post(`/channels/${channel}/messages`, formData)
    logger?.debug?.('[discord] document sent', { channel })
  },

  // Send sticker - Discord doesn't support sending stickers via API
  sendSticker: undefined,

  // Send location - Discord doesn't support location sharing
  sendLocation: undefined,

  // Send contact - Discord doesn't support contact sharing
  sendContact: undefined,

  // Send poll - Discord doesn't support polls
  sendPoll: undefined,

  // Send interactive message (with buttons/keyboard)
  sendInteractive: async ({ client, channel, text, buttons, inlineKeyboard, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Discord client not provided')
    }

    const basePayload = buildBasePayload(channel, options)
    const payload: any = { ...basePayload, content: text }

    // Convert BotButton[] to Discord components format
    const components: any[] = []

    if (inlineKeyboard && inlineKeyboard.length > 0) {
      // Discord allows up to 5 buttons per row, 5 rows max
      for (const row of inlineKeyboard.slice(0, 5)) {
        const discordRow = {
          type: 1, // ACTION_ROW
          components: row.slice(0, 5).map(button => {
            const discordButton: any = {
              type: 2, // BUTTON
              style: button.action === 'url' ? 5 : 1, // LINK vs PRIMARY
              label: button.label,
              custom_id: button.id,
            }

            switch (button.action) {
              case 'url':
                if (typeof button.data === 'string') {
                  discordButton.url = button.data
                } else if (button.data && typeof button.data === 'object' && 'url' in button.data) {
                  discordButton.url = (button.data as any).url
                }
                discordButton.style = 5 // LINK
                break
              case 'callback':
                discordButton.style = 1 // PRIMARY
                break
              case 'phone':
              case 'location':
              case 'share':
                // Not directly supported by Discord
                discordButton.style = 2 // SECONDARY
                break
            }

            return discordButton
          }),
        }
        components.push(discordRow)
      }
    } else if (buttons && buttons.length > 0) {
      // Regular buttons as a single row
      const discordRow = {
        type: 1, // ACTION_ROW
        components: buttons.slice(0, 5).map(button => ({
          type: 2, // BUTTON
          style: 1, // PRIMARY
          label: button.label,
          custom_id: button.id,
        })),
      }
      components.push(discordRow)
    }

    if (components.length > 0) {
      payload.components = components
    }

    await client.post(`/channels/${channel}/messages`, payload)
    logger?.debug?.('[discord] interactive message sent', { channel })
  },
  
  // Send typing indicator
  sendTyping: async ({ client, channel, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Discord client not provided')
    }

    const result = await tryCatch(() => client.post(`/channels/${channel}/typing`, {}))
    
    if (isTryCatchError(result)) {
      logger?.warn?.('[discord] sendTyping error', result.error)
      // Don't throw - typing indicator failures are not critical
    } else {
      logger?.debug?.('[discord] typing indicator sent', { channel })
    }
  },

  // Edit an existing message
  editMessage: async ({ client, channel, messageId, content, options, logger }) => {
    if (!client) {
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Discord client not provided')
    }

    const payload: any = {}

    // Handle different content types
    if (content.type === 'text') {
      payload.content = content.content
      await client.request({
        method: 'PATCH',
        endpoint: `/channels/${channel}/messages/${messageId}`,
        body: payload,
      })
      logger?.debug?.('[discord] message edited', { channel, messageId })
    } else if (content.type === 'interactive') {
      // For interactive messages, we can edit the components
      const components: any[] = []
      
      if (content.inlineKeyboard && content.inlineKeyboard.length > 0) {
        for (const row of content.inlineKeyboard.slice(0, 5)) {
          const discordRow = {
            type: 1,
            components: row.slice(0, 5).map(button => ({
              type: 2,
              style: button.action === 'url' ? 5 : 1,
              label: button.label,
              custom_id: button.id,
              url: button.action === 'url' && typeof button.data === 'string' ? button.data : undefined,
            })),
          }
          components.push(discordRow)
        }
      }

      payload.components = components.length > 0 ? components : []
      await client.request({
        method: 'PATCH',
        endpoint: `/channels/${channel}/messages/${messageId}`,
        body: payload,
      })
      logger?.debug?.('[discord] message components edited', { channel, messageId })
    } else {
      logger?.warn?.('[discord] content type not supported for editing', { contentType: content.type })
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
      throw new BotError(BotErrorCodes.CLIENT_NOT_PROVIDED, 'Discord client not provided')
    }

    const result = await tryCatch(() => client.delete(`/channels/${channel}/messages/${messageId}`))

    if (isTryCatchError(result)) {
      logger?.error?.('[discord] deleteMessage error', result.error)
      throw result.error
    }

    logger?.debug?.('[discord] message deleted', { channel, messageId })
  },

  // Handle Discord interaction: return bot context or null if unhandled
  handle: async ({ request, config, logger, botHandle }) => {
    // 1. Verify Signature (if configured)
    if (config.publicKey) {
      const signature = request.headers.get('X-Signature-Ed25519')
      const timestamp = request.headers.get('X-Signature-Timestamp')

      if (signature && timestamp) {
        const body = await request.text()
        const isValid = verifyDiscordSignature(signature, timestamp, body, config.publicKey)

        if (!isValid) {
          logger?.warn?.('[discord] invalid signature')
          throw new Error('Unauthorized: Invalid signature.')
        }

        // Recreate request from body for parsing
        request = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body,
        })
      }
    }

    // 2. Parse Request Body
    const interactionDataResult = await tryCatch(request.json())
    if (isTryCatchError(interactionDataResult)) {
      logger?.warn?.('[discord] failed to parse JSON body', { error: interactionDataResult.error })
      throw interactionDataResult.error
    }
    const interactionData = interactionDataResult.data

    // 3. Handle PING (Discord requires this for health checks)
    if (interactionData.type === 1) {
      // Return PONG response
      return {
        event: 'message',
        provider: 'discord',
        channel: {
          id: interactionData.channel_id || 'unknown',
          name: 'ping',
          isGroup: false,
        },
        message: {
          content: {
            type: 'text',
            content: 'pong',
            raw: 'pong',
          },
          author: {
            id: 'system',
            name: 'Discord',
            username: 'discord',
          },
          isMentioned: false,
        },
      }
    }

    // 4. Validate Discord Interaction Structure
    const parsedInteraction = DiscordInteractionSchema.safeParse(interactionData)

    if (!parsedInteraction.success) {
      logger?.warn?.('[discord] invalid interaction structure', {
        errors: parsedInteraction.error.errors,
      })
      throw new Error(
        `Invalid Discord interaction structure: ${parsedInteraction.error.message}`,
      )
    }

    const interaction = parsedInteraction.data
    const interactionType = getDiscordInteractionType(interaction.type)

    // 5. Handle APPLICATION_COMMAND (slash commands)
    if (interactionType === 'APPLICATION_COMMAND' && interaction.data) {
      const { command, params } = parseDiscordCommandData(interaction.data)
      const user = interaction.member?.user || interaction.user
      const channelId = interaction.channel_id || 'unknown'
      const guildId = interaction.guild_id

      if (!user) {
        logger?.warn?.('[discord] interaction missing user')
        return null
      }

      return {
        event: 'message',
        provider: 'discord',
        channel: {
          id: channelId,
          name: guildId ? `guild-${guildId}` : 'dm',
          isGroup: !!guildId,
        },
        message: {
          id: interaction.id,
          content: {
            type: 'command',
            command,
            params,
            raw: `/${command} ${params.join(' ')}`,
          },
          author: {
            id: user.id,
            name: getDiscordDisplayName(user, interaction.member),
            username: user.username || 'unknown',
          },
          isMentioned: true, // Slash commands always mention the bot
        },
      }
    }

    // 6. Handle MESSAGE_COMPONENT (button clicks)
    if (interactionType === 'MESSAGE_COMPONENT' && interaction.data) {
      const user = interaction.member?.user || interaction.user
      const channelId = interaction.channel_id || 'unknown'
      const guildId = interaction.guild_id

      if (!user) {
        logger?.warn?.('[discord] interaction missing user')
        return null
      }

      return {
        event: 'message',
        provider: 'discord',
        channel: {
          id: channelId,
          name: guildId ? `guild-${guildId}` : 'dm',
          isGroup: !!guildId,
        },
        message: {
          id: interaction.id,
          content: {
            type: 'callback',
            callbackId: interaction.data.custom_id || '',
            data: interaction.data.custom_id || '',
            raw: interaction.data.custom_id || '',
          },
          author: {
            id: user.id,
            name: getDiscordDisplayName(user, interaction.member),
            username: user.username || 'unknown',
          },
          isMentioned: true,
        },
      }
    }

    // 7. Handle regular messages (if Discord sends message events)
    // Note: Discord bots typically receive interactions, not regular message events
    // This is a fallback for potential future message events
    if (interaction.message) {
      const msg = interaction.message
      const user = msg.author
      const channelId = msg.channel_id

      if (!user) {
        return null
      }

      const content = parseDiscordMessageContent(msg.content || '')
      if (!content) {
        return null
      }

      const isMentioned = isBotMentioned(
        msg.content || '',
        config.applicationId,
        msg.mentions || [],
      )

      return {
        event: 'message',
        provider: 'discord',
        channel: {
          id: channelId,
          name: `channel-${channelId}`,
          isGroup: true,
        },
        message: {
          id: msg.id,
          content,
          author: {
            id: user.id,
            name: getDiscordDisplayName(user),
            username: user.username || 'unknown',
          },
          isMentioned,
        },
      }
    }

    // Unhandled interaction type
    logger?.debug?.('[discord] unhandled interaction type', { type: interactionType })
    return null
  },
})

