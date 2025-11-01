/**
 * Discord Adapter Schemas
 *
 * Provides runtime validation + static typing for:
 *  - Adapter configuration (token + optional webhook config)
 *  - Incoming interaction payloads (Discord Interactions API)
 *
 * Design Notes:
 *  - Keep schema focused only on the fields consumed by the adapter.
 *  - Use .describe() to aid future OpenAPI / doc generation.
 *  - Optional fields remain optional; no silent coercion.
 *  - Extend cautiously: adding fields is non‑breaking; removing is breaking.
 *
 * Reference: https://discord.com/developers/docs/interactions/receiving-and-responding
 *
 * @module discord.schemas
 * @alpha
 */
import { z } from 'zod'

export const DiscordAdapterParams = z
  .object({
    token: z
      .string()
      .optional()
      .default(process.env.DISCORD_TOKEN || '')
      .describe('Discord Bot Token (defaults to DISCORD_TOKEN env var if not provided)'),
    applicationId: z
      .string()
      .optional()
      .default(process.env.DISCORD_APPLICATION_ID || '')
      .describe('Discord Application ID (defaults to DISCORD_APPLICATION_ID env var if not provided)'),
    publicKey: z
      .string()
      .optional()
      .default(process.env.DISCORD_PUBLIC_KEY || '')
      .describe('Discord Public Key for signature verification (defaults to DISCORD_PUBLIC_KEY env var if not provided)'),
    handle: z
      .string()
      .optional()
      .describe('Bot username for mention detection (e.g., @your_bot). If not provided, uses global bot handle or DISCORD_BOT_HANDLE env var.'),
  })
  .describe('Configuration parameters for the Discord adapter. Supports environment variables: DISCORD_TOKEN, DISCORD_APPLICATION_ID, DISCORD_PUBLIC_KEY, DISCORD_BOT_HANDLE')

// Discord Interaction Types
export const DiscordInteractionType = z.enum([
  'PING', // 1
  'APPLICATION_COMMAND', // 2
  'MESSAGE_COMPONENT', // 3
  'APPLICATION_COMMAND_AUTOCOMPLETE', // 4
  'MODAL_SUBMIT', // 5
])

// Discord Interaction Data (for commands)
export const DiscordInteractionDataSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  type: z.number().optional(),
  options: z.array(z.any()).optional(),
  custom_id: z.string().optional(),
  component_type: z.number().optional(),
  values: z.array(z.string()).optional(),
})

// Discord User Schema
export const DiscordUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  discriminator: z.string().optional(),
  avatar: z.string().optional().nullable(),
  bot: z.boolean().optional(),
})

// Discord Member Schema
export const DiscordMemberSchema = z.object({
  user: DiscordUserSchema.optional(),
  nick: z.string().optional().nullable(),
  roles: z.array(z.string()).optional(),
  joined_at: z.string().optional(),
})

// Discord Channel Schema
export const DiscordChannelSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  type: z.number().optional(), // 0 = text, 1 = DM, 2 = voice, etc.
  guild_id: z.string().optional(),
})

// Discord Guild Schema
export const DiscordGuildSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
})

// Discord Interaction Schema
export const DiscordInteractionSchema = z.object({
  id: z.string(),
  application_id: z.string(),
  type: z.number(),
  data: DiscordInteractionDataSchema.optional(),
  guild_id: z.string().optional(),
  channel_id: z.string().optional(),
  member: DiscordMemberSchema.optional(),
  user: DiscordUserSchema.optional(),
  token: z.string(),
  version: z.number().optional(),
  message: z.object({
    id: z.string(),
    content: z.string().optional(),
    author: DiscordUserSchema.optional(),
    channel_id: z.string(),
    attachments: z.array(z.any()).optional(),
    mentions: z.array(DiscordUserSchema).optional(),
  }).optional(),
})

// Discord Message Create Schema (for message events)
export const DiscordMessageSchema = z.object({
  id: z.string(),
  content: z.string().optional(),
  author: DiscordUserSchema,
  channel_id: z.string(),
  guild_id: z.string().optional(),
  attachments: z.array(z.any()).optional(),
  mentions: z.array(DiscordUserSchema).optional(),
  member: DiscordMemberSchema.optional(),
})

