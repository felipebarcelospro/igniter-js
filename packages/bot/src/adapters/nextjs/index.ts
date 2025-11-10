import type { Bot } from "@/bot.provider";

export const nextRouteHandlerAdapter = (bots: Record<string, Bot<any, any, any>>) => {
  return {
    GET: async (request: Request, { params }: { params: Promise<{ adapter: string, botId: string }> }) => {
      const { adapter, botId } = await params

      console.log('GET', adapter, botId)
      console.log('request', request)

      const bot = bots[botId]
      if (!bot) return new Response('Not Found', { status: 404 })
      const handle = bot.handle(adapter)
      return handle(request)
    },
    POST: async (request: Request, { params }: { params: Promise<{ adapter: string, botId: string }> }) => {
      const { adapter, botId } = await params

      console.log('POST', adapter, botId)
      console.log('request', request)

      const bot = bots[botId]
      if (!bot) return new Response('Not Found', { status: 404 })
      const handle = bot.handle(adapter)
      return handle(request)
    },
  }
}