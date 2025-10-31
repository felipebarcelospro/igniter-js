/**
 * Analytics Plugin
 * 
 * Example plugin that tracks bot usage metrics.
 * Demonstrates the plugin system capabilities.
 */

import type { BotPlugin } from '../types/plugins'
import type { BotContext } from '../types/bot.types'

/**
 * Analytics configuration options
 */
export interface AnalyticsOptions {
  /**
   * Function to track events
   */
  trackEvent?: (event: string, properties: Record<string, any>) => void | Promise<void>

  /**
   * Track message events
   */
  trackMessages?: boolean

  /**
   * Track command events
   */
  trackCommands?: boolean

  /**
   * Track error events
   */
  trackErrors?: boolean

  /**
   * Include user information in events
   */
  includeUserInfo?: boolean
}

/**
 * Creates an analytics plugin.
 * 
 * @param options - Analytics configuration
 * @returns Plugin instance
 * 
 * @example
 * ```typescript
 * const bot = IgniterBot
 *   .create()
 *   .usePlugin(analyticsPlugin({
 *     trackEvent: async (event, properties) => {
 *       await analytics.track(event, properties)
 *     },
 *     trackMessages: true,
 *     trackCommands: true,
 *     includeUserInfo: true
 *   }))
 *   .build()
 * ```
 */
export function analyticsPlugin(options: AnalyticsOptions = {}): BotPlugin {
  const {
    trackEvent = (event, properties) => {
      console.log('[Analytics]', event, properties)
    },
    trackMessages = true,
    trackCommands = true,
    trackErrors = true,
    includeUserInfo = true,
  } = options

  const stats = {
    messages: 0,
    commands: 0,
    errors: 0,
    users: new Set<string>(),
  }

  return {
    name: 'analytics',
    version: '1.0.0',
    description: 'Tracks bot usage metrics and events',

    middlewares: [
      async (ctx, next) => {
        const startTime = Date.now()

        try {
          await next()
        } finally {
          const duration = Date.now() - startTime

          // Track execution time
          await trackEvent('bot.request', {
            provider: ctx.provider,
            event: ctx.event,
            duration,
            isGroup: ctx.channel.isGroup,
          })
        }
      },
    ],

    hooks: {
      onStart: async () => {
        await trackEvent('bot.started', {
          timestamp: new Date().toISOString(),
        })
      },

      onMessage: async (ctx: BotContext) => {
        stats.messages++
        stats.users.add(ctx.message.author.id)

        if (trackMessages) {
          const properties: Record<string, any> = {
            provider: ctx.provider,
            contentType: ctx.message.content?.type,
            isGroup: ctx.channel.isGroup,
            isMentioned: ctx.message.isMentioned,
            timestamp: new Date().toISOString(),
          }

          if (includeUserInfo) {
            properties.userId = ctx.message.author.id
            properties.username = ctx.message.author.username
          }

          // Track command separately
          if (ctx.message.content?.type === 'command') {
            stats.commands++
            if (trackCommands) {
              await trackEvent('bot.command', {
                ...properties,
                command: ctx.message.content.command,
                params: ctx.message.content.params,
              })
            }
          } else {
            await trackEvent('bot.message', properties)
          }
        }
      },

      onError: async (ctx) => {
        stats.errors++

        if (trackErrors) {
          const properties: Record<string, any> = {
            provider: ctx.provider,
            // @ts-expect-error - error field added dynamically
            errorMessage: ctx.error?.message,
            // @ts-expect-error - error field added dynamically
            errorCode: ctx.error?.code,
            timestamp: new Date().toISOString(),
          }

          if (includeUserInfo) {
            properties.userId = ctx.message.author.id
          }

          await trackEvent('bot.error', properties)
        }
      },
    },

    // Add a stats command
    commands: {
      stats: {
        name: 'stats',
        aliases: ['statistics', 'analytics'],
        description: 'Shows bot usage statistics',
        help: 'Use /stats to see bot usage statistics',
        async handle(ctx) {
          const statsMessage = `
📊 **Bot Statistics**

Messages: ${stats.messages}
Commands: ${stats.commands}
Errors: ${stats.errors}
Unique Users: ${stats.users.size}
          `.trim()

          await ctx.reply(statsMessage)
        },
      },
    },
  }
}

