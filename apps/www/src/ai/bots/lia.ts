import { IgniterBot, Bot, type BotInboundContent, telegram } from '@igniter-js/bot'
import { liaAgent } from '../agents/lia';
import { buildAppContext, type AgentProvider } from '../agents/shared';
import { convertBotMessageToUIMessage } from '../utils';
import { randomUUID } from 'crypto';

export const bot = IgniterBot
  .create()
  .withLogger(console)
  .withHandle('@igniterjs_bot')
  .addAdapter('telegram', telegram())
  .onMessage(async (ctx) => {
    // Show typing indicator while processing
    await ctx.sendTyping?.()

    // Generate response using AI SDK Agent
    liaAgent.toUIMessageStream({
      message: convertBotMessageToUIMessage(
        randomUUID(),
        'user',
        ctx.message.content as BotInboundContent,
        ctx.message.attachments,
      ),
      context: buildAppContext({
        provider: ctx.provider as AgentProvider,
        chatId: ctx.channel.id,
        userId: `user-${ctx.message.author.id}`,
        userName: ctx.message.author.name,
      }),
      strategy: "auto",
      maxRounds: 5,
      maxSteps: 20,
      onEvent: async (event) => {
        if (event.type === 'agent-step') {
          for (const part of event.step.content) {
            if (part.type === 'text') {
              await ctx.reply(part.text, { parseMode: 'Markdown' });
            } 
          }
        }
      },
    });
  })
  .build()
