/**
 * @igniter-js/bot
 *
 * Public entry-point (barrel file).
 *
 * This file re-exports:
 *  - Builder Pattern API (IgniterBot) - Recommended
 *  - All public type definitions
 *  - Session stores (memory, and interfaces for Redis/Prisma)
 *  - Official middlewares (rate-limit, auth, logging)
 *  - Official plugins (analytics, etc)
 *  - All first‑party adapters (telegram, whatsapp)
 *
 * Goals:
 *  - Excellent DX: a single import surface for 90%+ of use cases.
 *  - Tree-shake friendly: pure re-exports; no side effects executed here.
 *  - Extensibility: adapters also remain individually importable if desired.
 *
 * Example (Builder Pattern - Recommended):
 *  import { IgniterBot, telegram, whatsapp, memoryStore } from '@igniter-js/bot'
 *
 *  const bot = IgniterBot
 *    .create()
 *    .withId('demo-bot')
 *    .withName('Demo Bot')
 *    .withSessionStore(memoryStore())
 *    .addAdapters({
 *      telegram: telegram({ token: process.env.TELEGRAM_TOKEN!, handle: '@demo' }),
 *      whatsapp: whatsapp({ token: process.env.WHATSAPP_TOKEN!, phone: process.env.WHATSAPP_PHONE! })
 *    })
 *    .addCommand('start', {
 *      name: 'start',
 *      aliases: ['hello'],
 *      description: 'Greets the user',
 *      help: 'Use /start to receive a greeting',
 *      async handle(ctx) {
 *        await ctx.reply('👋 Hello from Igniter Bot!')
 *      }
 *    })
 *    .build()
 *
 *  await bot.start()
 *
 *  // In a Next.js API route:
 *  export async function POST(req: Request) {
 *    return bot.handle('telegram', req)
 *  }
 */

// -----------------------------
// Core Provider (Internal - Bot class used by builder)
// -----------------------------
export { Bot, BotError, BotErrorCodes } from './bot.provider'
export type { BotErrorCode } from './bot.provider'

// -----------------------------
// Builder Pattern API (Recommended)
// -----------------------------
export * from './builder'

// -----------------------------
// Types
// (Keep explicit to avoid accidental re-export of internals
// if more files are added under ./types in the future.)
// -----------------------------
export * from './types/bot.types'
export * from './types/capabilities'
export * from './types/content'
export * from './types/session'
export * from './types/plugins'
export * from './types/builder'

// -----------------------------
// Session Stores
// -----------------------------
export * from './stores'

// -----------------------------
// Official Middlewares
// -----------------------------
export * from './middlewares'

// -----------------------------
// Official Plugins
// -----------------------------
export * from './plugins'

// -----------------------------
// Adapters (first-party)
// -----------------------------
export * from './adapters/telegram'
export * from './adapters/whatsapp'

// Optionally provide a convenience namespace for ergonomic adapter access.
// This does not impede tree-shaking because the individual adapter factories
// are still pure functions and fully side‑effect free.
import { telegram } from './adapters/telegram'
import { whatsapp } from './adapters/whatsapp'

/**
 * Convenience collection of built-in adapter factories.
 *
 * Example:
 *   import { adapters } from '@igniter-js/bot'
 *   const bot = Bot.create({
 *     id: 'x',
 *     name: 'x',
 *     adapters: { telegram: adapters.telegram({...}) }
 *   })
 */
export const adapters = {
  telegram,
  whatsapp,
} as const

/**
 * Version helper (injected / replaced at build or publish time if desired).
 * Keeping a symbol exported allows external tooling to introspect runtime package version.
 * Fallback to '0.0.0-dev' when not injected.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const VERSION: string =
  // @ts-expect-error - Optional global replacement hook
  (typeof __IGNITER_BOT_VERSION__ !== 'undefined'
    ? // @ts-expect-error - Provided by build tooling if configured
      __IGNITER_BOT_VERSION__
    : '0.0.0-dev')
