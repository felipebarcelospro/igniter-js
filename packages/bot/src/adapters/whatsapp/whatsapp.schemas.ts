import { z } from 'zod'

/**
 * WhatsApp Cloud API Schemas
 *
 * These Zod schemas provide strong runtime validation and static typing
 * for all inbound and configuration structures handled by the WhatsApp
 * adapter.
 *
 * Design Notes:
 *  - Keep schemas narrow & explicit (fail fast on unexpected structure)
 *  - Use `.describe()` to improve generated OpenAPI / docs integration
 *  - Export inferred types for reuse in higher-level logic or tests
 *  - Optional fields remain optional; do not coerce silently
 *
 * @module whatsapp.schemas
 * @alpha
 */

/**
 * Schema for WhatsApp Adapter configuration parameters.
 * - token: WhatsApp API access token (required).
 * - phone: WhatsApp phone number ID (required).
 * - handle: Bot keyword for group mention detection (optional, uses global bot handle if not provided).
 */
export const WhatsAppAdapterParams = z
  .object({
    handle: z
      .string()
      .optional()
      .describe('Bot keyword for mention detection in groups (e.g., "bot" or "@bot"). If not provided, uses global bot handle.'),
    token: z
      .string()
      .min(1, 'WhatsApp API Token is required.')
      .describe('WhatsApp Cloud API access token'),
    phone: z
      .string()
      .min(1, 'Phone is required.')
      .describe('WhatsApp phone number ID (phone_number_id)'),
  })
  .describe('Adapter configuration for WhatsApp integration')

/**
 * Schema for WhatsApp contact information.
 * - wa_id: WhatsApp user ID.
 * - profile: Optional profile object containing the user's name.
 */
export const WhatsAppContactSchema = z
  .object({
    wa_id: z.string().describe('WhatsApp unique user identifier'),
    profile: z
      .object({
        name: z.string().optional().describe('Display name (if provided)'),
      })
      .optional()
      .describe('Optional profile metadata'),
  })
  .describe('Contact metadata entry from WhatsApp webhook payload')

/**
 * Schema for WhatsApp message object.
 * - id: Message ID.
 * - from: Sender's WhatsApp ID.
 * - type: Message type ('text', 'image', 'document', 'audio').
 * - text: Optional text content.
 * - image: Optional image file reference.
 * - document: Optional document file reference.
 * - audio: Optional audio file reference.
 * - timestamp: Message timestamp (string epoch).
 */
export const WhatsAppMessageSchema = z
  .object({
    id: z.string().describe('Unique message ID'),
    from: z.string().describe('Sender WhatsApp ID (phone)'),
    type: z.enum(['text', 'image', 'document', 'audio']).describe('Message kind'),
    text: z
      .object({ body: z.string().describe('Text body content') })
      .optional()
      .describe('Text message payload'),
    image: z.custom<File>().optional().describe('Image media file reference'),
    document: z.custom<File>().optional().describe('Document media file reference'),
    audio: z.custom<File>().optional().describe('Audio / voice media file reference'),
    timestamp: z.string().describe('Message creation timestamp (epoch seconds as string)'),
  })
  .describe('Normalized WhatsApp message entity')

/**
 * Schema for WhatsApp webhook payload value.
 * - messaging_product: Messaging product name.
 * - metadata: Optional metadata (display phone number, phone number ID).
 * - contacts: Optional array of contact objects.
 * - messages: Optional array of message objects.
 */
export const WhatsAppWebhookValueSchema = z
  .object({
    messaging_product: z.string().describe('Messaging product identifier'),
    metadata: z
      .object({
        display_phone_number: z
          .string()
          .optional()
          .describe('Human-readable display phone number'),
        phone_number_id: z
          .string()
          .optional()
          .describe('Internal phone number ID reference'),
      })
      .optional()
      .describe('Webhook metadata for the receiving business number'),
    contacts: z
      .array(WhatsAppContactSchema)
      .optional()
      .describe('Contacts referenced in this webhook change'),
    messages: z
      .array(WhatsAppMessageSchema)
      .optional()
      .describe('Messages included in this webhook change'),
  })
  .describe('Primary value object of a WhatsApp webhook change entry')

/**
 * Schema for WhatsApp webhook payload.
 * - field: Event field name.
 * - value: Webhook value object.
 */
export const WhatsAppWebhookSchema = z
  .object({
    field: z.string().describe('Changed field (e.g., messages)'),
    value: WhatsAppWebhookValueSchema.describe('Structured payload for the change'),
  })
  .describe('Single WhatsApp webhook change record upper wrapper')

/* ------------------------------------------------------------------ */
/* Inferred Types (exported for consumer convenience)                 */
/* ------------------------------------------------------------------ */

export type WhatsAppAdapterParamsType = z.infer<typeof WhatsAppAdapterParams>
export type WhatsAppContact = z.infer<typeof WhatsAppContactSchema>
export type WhatsAppMessage = z.infer<typeof WhatsAppMessageSchema>
export type WhatsAppWebhookValue = z.infer<typeof WhatsAppWebhookValueSchema>
export type WhatsAppWebhook = z.infer<typeof WhatsAppWebhookSchema>
