import type { Bot } from "@/bot.provider";

export const tanstackStartRouteHandlerAdapter = (bots: Record<string, Bot<any, any, any>>) => {
  return {
    GET: async ({ request, params }: { request: Request, params: { adapter: string, botId: string } }) => {
      const { adapter, botId } = params
      const bot = bots[botId]
      if (!bot) return new Response('Not Found', { status: 404 })
      const handle = bot.handle(adapter)
      return handle(request)
    },
    POST: async ({ request, params }: { request: Request, params: { adapter: string, botId: string } }) => {
      const { adapter, botId } = params
      const bot = bots[botId]
      if (!bot) return new Response('Not Found', { status: 404 })
      const handle = bot.handle(adapter)
      return handle(request)
    },
  }
}