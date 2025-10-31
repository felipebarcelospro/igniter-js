/**
 * Basic Bot Example
 * 
 * The simplest possible bot using the Builder Pattern.
 */

// You can import from main package
import { IgniterBot, telegram } from '@igniter-js/bot'

// Or use organized imports
// import { IgniterBot } from '@igniter-js/bot'
// import { telegram } from '@igniter-js/bot/adapters'

const bot = IgniterBot
  .create()
  .withId('basic-bot')
  .withName('Basic Bot')
  .addAdapter('telegram', telegram({
    token: process.env.TELEGRAM_TOKEN!,
    handle: '@basic_bot',
  }))
  .addCommand('start', {
    name: 'start',
    aliases: ['hello', 'hi'],
    description: 'Start the bot',
    help: 'Use /start to begin',
    async handle(ctx) {
      await ctx.reply('👋 Hello! I am a basic bot.')
    },
  })
  .addCommand('ping', {
    name: 'ping',
    aliases: [],
    description: 'Check if bot is alive',
    help: 'Use /ping to test',
    async handle(ctx) {
      await ctx.reply('🏓 Pong!')
    },
  })
  .build()

// Start the bot
await bot.start()

// Export handler for use in Next.js/Express/etc
export async function POST(req: Request) {
  return bot.handle('telegram', req)
}

export { bot }

