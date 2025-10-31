/**
 * Session Management Example
 * 
 * Demonstrates how to use sessions for stateful conversations.
 */

import { IgniterBot, telegram, memoryStore } from '@igniter-js/bot'

const bot = IgniterBot
  .create()
  .withId('session-bot')
  .withName('Session Bot')
  .withSessionStore(memoryStore())
  .addAdapter('telegram', telegram({
    token: process.env.TELEGRAM_TOKEN!,
    handle: '@session_bot',
  }))
  .addCommand('survey', {
    name: 'survey',
    aliases: ['form'],
    description: 'Start a multi-step survey',
    help: 'Use /survey to begin',
    async handle(ctx) {
      const session = ctx.session
      
      // Initialize survey
      if (!session.data.surveyStarted) {
        session.data.surveyStarted = true
        session.data.step = 1
        session.data.answers = {}
        await ctx.reply('📋 **Survey Started!**\n\nWhat is your name?')
        await session.save()
        return
      }
      
      await ctx.reply('Survey already in progress. Please answer the current question.')
    },
  })
  .addCommand('cancel', {
    name: 'cancel',
    aliases: ['stop', 'abort'],
    description: 'Cancel current survey',
    help: 'Use /cancel to stop',
    async handle(ctx) {
      await ctx.session.delete()
      await ctx.reply('Survey cancelled.')
    },
  })
  .onMessage(async (ctx) => {
    const session = ctx.session
    
    // Handle survey flow
    if (session.data.surveyStarted && ctx.message.content?.type === 'text') {
      const text = ctx.message.content.content
      const step = session.data.step || 1
      
      switch (step) {
        case 1:
          session.data.answers.name = text
          session.data.step = 2
          await ctx.reply('Great! What is your email?')
          await session.save()
          break
          
        case 2:
          session.data.answers.email = text
          session.data.step = 3
          await ctx.reply('How did you hear about us?')
          await session.save()
          break
          
        case 3:
          session.data.answers.source = text
          
          // Complete survey
          const { name, email, source } = session.data.answers
          await ctx.reply(`
✅ **Survey Complete!**

Name: ${name}
Email: ${email}
Source: ${source}

Thank you for your time!
          `.trim())
          
          // Clear session
          await session.delete()
          break
      }
    }
  })
  .build()

await bot.start()

export async function POST(req: Request) {
  return bot.handle('telegram', req)
}

export { bot }

