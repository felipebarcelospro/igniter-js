/**
 * Telegram Adapter Schemas
 *
 * Provides runtime validation + static typing for:
 *  - Adapter configuration (token + optional webhook config)
 *  - Incoming update payloads (subset of Telegram Bot API Update object)
 *
 * Design Notes:
 *  - Keep schema focused only on the fields consumed by the adapter.
 *  - Use .describe() to aid future OpenAPI / doc generation.
 *  - Optional fields remain optional; no silent coercion.
 *  - Extend cautiously: adding fields is non‑breaking; removing is breaking.
 *
 * Reference: https://core.telegram.org/bots/api#update
 *
 * @module telegram.schemas
 * @alpha
 */
import { z } from 'zod'

export const TelegramAdapterParams = z
  .object({
    token: z
      .string()
      .min(1, 'Telegram Bot Token is required.')
      .describe('Telegram Bot API token'),
    handle: z
      .string()
      .optional()
      .describe('Bot username for mention detection in groups (e.g., @your_bot). If not provided, uses global bot handle.'),
    webhook: z
      .object({
        url: z
          .string()
          .url('Webhook URL must be a valid URL.')
          .optional()
          .describe('Public HTTPS endpoint for Telegram to POST updates'),
        secret: z
          .string()
          .min(1)
          .max(100)
          .optional()
          .describe('Optional secret token to validate webhook authenticity'),
      })
      .optional()
      .describe('Optional webhook configuration'),
  })
  .describe('Configuration parameters for the Telegram adapter')

export const TelegramUpdateSchema = z
  .object({
    update_id: z.number().describe('Unique identifier for this update'),
    message: z
      .object({
        message_id: z.number().describe('Unique message identifier inside this chat'),
        from: z
          .object({
            id: z.number().describe('Unique Telegram user identifier'),
            is_bot: z.boolean().describe('Whether the sender is a bot'),
            first_name: z.string().describe('Sender first name'),
            last_name: z.string().optional().describe('Sender last name'),
            username: z.string().optional().describe('Sender @username'),
            language_code: z.string().optional().describe('IETF language code'),
          })
          .describe('Sender of the message'),
        chat: z
          .object({
            id: z.number().describe('Unique chat identifier'),
            first_name: z.string().optional().describe('Private chat first name'),
            last_name: z.string().optional().describe('Private chat last name'),
            username: z.string().optional().describe('Private chat username'),
            title: z.string().optional().describe('Group/channel title'),
            type: z
              .enum(['private', 'group', 'supergroup', 'channel'])
              .describe('Chat type discriminator'),
          })
          .describe('Chat to which the message belongs'),
        date: z.number().describe('Message date (Unix time)'),
        text: z.string().optional().describe('Text of the message (if text message)'),
        photo: z
          .array(
            z.object({
              file_id: z.string().describe('File identifier to download or reuse'),
              file_unique_id: z.string().describe('Unique file identifier'),
              file_size: z.number().optional(),
              width: z.number().optional(),
              height: z.number().optional(),
            }),
          )
          .optional()
          .describe('Array of PhotoSize objects (different sizes)'),
        document: z
          .object({
            file_id: z.string(),
            file_unique_id: z.string(),
            file_name: z.string().optional(),
            mime_type: z.string().optional(),
            file_size: z.number().optional(),
          })
          .optional()
          .describe('Document message attachment'),
        audio: z
          .object({
            file_id: z.string(),
            file_unique_id: z.string(),
            duration: z.number().optional(),
            mime_type: z.string().optional(),
            file_size: z.number().optional(),
            file_name: z.string().optional(),
          })
          .optional()
          .describe('Audio file attachment'),
        voice: z
          .object({
            file_id: z.string(),
            file_unique_id: z.string(),
            duration: z.number().optional(),
            mime_type: z.string().optional(),
            file_size: z.number().optional(),
          })
          .optional()
          .describe('Voice message attachment'),
        caption: z.string().optional().describe('Media caption'),
      })
      .optional()
      .describe('Message data (present for message updates)'),
  })
  .describe('Telegram Update object subset leveraged by the adapter')
