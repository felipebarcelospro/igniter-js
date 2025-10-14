/**
 * WhatsApp Adapter Helpers
 *
 * Provides parsing utilities for text and media messages coming from
 * the WhatsApp Cloud API webhook payloads and normalizes them into
 * framework BotContent shapes.
 *
 * Design Goals:
 *  - No side effects (pure functions)
 *  - Explicit, strongly typed return values
 *  - Safe fallbacks (undefined when parsing not possible)
 *
 * NOTE:
 *  - Network retrieval of media is intentionally colocated (fetchWhatsAppMedia)
 *    to keep adapter logic slim.
 *  - If media volume grows significantly, consider extraction + caching layer.
 *
 * @module whatsapp.helpers
 * @alpha
 */
import type {
  BotAttachmentContent,
  BotAudioContent,
  BotCommandContent,
  BotDocumentContent,
  BotImageContent,
  BotTextContent,
} from '../../types/bot.types'

/**
 * Collection of helper parser functions for WhatsApp message payloads.
 *
 * All functions are side‑effect free and return either a specific
 * BotContent implementation or undefined when the input is not applicable.
 *
 * @internal - Subject to evolution during alpha.
 */
export const parsers = {
  /**
   * Parses a WhatsApp text message object and returns either:
   *  - BotCommandContent (if starts with '/')
   *  - BotTextContent   (plain text)
   *
   * Ignores non-text messages.
   *
   * @param message Raw WhatsApp message object (single message entity).
   * @returns BotCommandContent | BotTextContent | undefined
   */
  text(message: any): BotTextContent | BotCommandContent | undefined {
    /**
     * Internal helper that classifies a raw text string as either a command
     * (leading slash) or plain text content.
     *
     * @param text WhatsApp message body.
     * @returns BotCommandContent | BotTextContent | undefined
     * @internal
     */
    function parseWhatsAppMessageContent(
      text: string,
    ): BotTextContent | BotCommandContent | undefined {
      if (!text) return undefined
      if (text.startsWith('/')) {
        const [commandWithSlash, ...args] = text.trim().split(' ')
        const command = commandWithSlash.slice(1)
        return {
          type: 'command',
          command,
          params: args,
          raw: text,
        }
      }
      return {
        type: 'text',
        content: text,
        raw: text,
      }
    }

    if (message?.text?.body) {
      return parseWhatsAppMessageContent(message.text.body)
    }
    return undefined
  },

  /**
   * Parses WhatsApp media messages (image, document, audio), downloads the
   * underlying binary via the Cloud API, converts it to a base64 representation
   * and returns the corresponding BotContent variant.
   *
   * Side Effect:
   *  - Pushes an attachment descriptor to the provided attachments array.
   *
   * @param message Raw WhatsApp message (expected to contain one media type).
   * @param token   WhatsApp API access token.
   * @param attachments Mutable array collecting attachment metadata.
   * @returns BotImageContent | BotDocumentContent | BotAudioContent | undefined
   */
  async media(
    message: any,
    token: string,
    attachments: BotAttachmentContent[],
  ): Promise<
    BotImageContent | BotDocumentContent | BotAudioContent | undefined
  > {
    /**
     * Downloads a media asset referenced by its WhatsApp media ID.
     *
     * Flow:
     *  1. Resolve direct download URL
     *  2. Fetch binary
     *  3. Encode base64 + construct File abstraction
     *
     * @param mediaId WhatsApp media identifier.
     * @param token   WhatsApp API token (Bearer auth).
     * @throws Error if resolution or download fails.
     * @returns Object containing base64, mimeType and File instance.
     * @internal
     */
    async function fetchWhatsAppMedia(
      mediaId: string,
      token: string,
    ): Promise<{ base64: string; mimeType: string; file: File }> {
      const mediaUrlRes = await fetch(
        `https://graph.facebook.com/v17.0/${mediaId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      const mediaUrlData = await mediaUrlRes.json()
      if (!mediaUrlRes.ok || !mediaUrlData.url) {
        throw new Error('Failed to fetch WhatsApp media URL')
      }
      const mediaRes = await fetch(mediaUrlData.url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!mediaRes.ok) {
        throw new Error('Failed to download WhatsApp media file')
      }

      const arrayBuffer = await mediaRes.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64 = buffer.toString('base64')
      const mimeType =
        mediaRes.headers.get('content-type') || 'application/octet-stream'
      const fileName = mediaId

      let file: File
      try {
        file = new File([arrayBuffer], fileName, { type: mimeType })
      } catch {
        file = { name: fileName, type: mimeType, size: buffer.length } as any
      }

      return { base64, mimeType, file }
    }

    let mediaType: 'image' | 'document' | 'audio' | undefined
    let mediaObj: any
    let caption: string | undefined

    if (
      message?.image &&
      typeof message.image === 'object' &&
      'id' in message.image
    ) {
      mediaType = 'image'
      mediaObj = message.image
      caption = message.image.caption
    } else if (
      message?.document &&
      typeof message.document === 'object' &&
      'id' in message.document
    ) {
      mediaType = 'document'
      mediaObj = message.document
    } else if (
      message?.audio &&
      typeof message.audio === 'object' &&
      'id' in message.audio
    ) {
      mediaType = 'audio'
      mediaObj = message.audio
    }

    if (!mediaType || !mediaObj) return undefined

    const mediaId = mediaObj.id
    const media = await fetchWhatsAppMedia(mediaId, token)

    attachments.push({
      name: mediaId,
      type: media.mimeType,
      content: media.base64,
    })

    if (mediaType === 'image') {
      return {
        type: 'image',
        content: media.base64,
        file: media.file,
        caption,
      }
    }
    if (mediaType === 'document') {
      return {
        type: 'document',
        content: media.base64,
        file: media.file,
      }
    }
    if (mediaType === 'audio') {
      return {
        type: 'audio',
        content: media.base64,
        file: media.file,
      }
    }

    return undefined
  },
}
