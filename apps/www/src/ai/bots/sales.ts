import { IgniterBot, telegram, type BotTextContent } from '@igniter-js/bot'
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import z from 'zod';

export const bot = IgniterBot
  .create()
  .withLogger(console)
  .addAdapter('telegram', telegram())
  .onMessage(async (ctx) => {
    // Show typing indicator while processing
    await ctx.sendTyping?.()

    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      messages: [
        // Need has complete message history
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: (ctx.message.content as BotTextContent).content,
            }
          ],
        }
      ],
      schema: z.object({
        sale: z.object({
          product: z.object({
            name: z.string(),
            description: z.string(),
            price: z.number(),
            quantity: z.number(),
            total: z.number(),
          }),          
        }).optional().describe('The sale object if the user message is a complete order'),
      }),
      system: `You are a sales agent. You need analyze the user message, with you recognize a complete order, you need to return the product, quantity, total, payment method, payment status, payment date, payment transaction id, payment transaction status.`
    })

    console.log(result.object);
  })
  .build()
