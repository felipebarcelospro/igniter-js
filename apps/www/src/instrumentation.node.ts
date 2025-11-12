import { tryCatch } from '@igniter-js/core'
import { bot } from './ai/bots/lia'

export async function register() {
  const result = await tryCatch(bot.start())
  console.log(result)
  if (result.error) {
    console.error(result.error)
  }
}
