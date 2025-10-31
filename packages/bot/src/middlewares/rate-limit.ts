/**
 * Rate Limiting Middleware
 * 
 * Prevents abuse by limiting the number of requests a user can make
 * within a time window.
 */

import type { Middleware, BotContext } from '../types/bot.types'

/**
 * Interface for rate limit storage backends
 */
export interface RateLimitStore {
  /**
   * Get the current count for a key
   */
  get(key: string): Promise<number>
  
  /**
   * Increment the count for a key and set expiration
   */
  increment(key: string, windowMs: number): Promise<number>
  
  /**
   * Reset the count for a key
   */
  reset(key: string): Promise<void>
}

/**
 * In-memory rate limit store
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private counts: Map<string, { count: number; expiresAt: number }> = new Map()
  private cleanupInterval?: NodeJS.Timeout

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, value] of this.counts.entries()) {
        if (value.expiresAt < now) {
          this.counts.delete(key)
        }
      }
    }, 60000)
  }

  async get(key: string): Promise<number> {
    const entry = this.counts.get(key)
    if (!entry) return 0
    
    if (entry.expiresAt < Date.now()) {
      this.counts.delete(key)
      return 0
    }
    
    return entry.count
  }

  async increment(key: string, windowMs: number): Promise<number> {
    const now = Date.now()
    const entry = this.counts.get(key)
    
    if (!entry || entry.expiresAt < now) {
      const newCount = 1
      this.counts.set(key, {
        count: newCount,
        expiresAt: now + windowMs,
      })
      return newCount
    }
    
    entry.count++
    return entry.count
  }

  async reset(key: string): Promise<void> {
    this.counts.delete(key)
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

/**
 * Rate limit configuration options
 */
export interface RateLimitOptions {
  /** Maximum number of requests allowed in the time window */
  maxRequests: number
  
  /** Time window in milliseconds */
  windowMs: number
  
  /** Storage backend (defaults to in-memory) */
  store?: RateLimitStore
  
  /** 
   * Custom key generator function
   * Defaults to: `${ctx.provider}:${ctx.message.author.id}`
   */
  keyGenerator?: (ctx: BotContext) => string
  
  /**
   * Custom message to send when rate limit is exceeded
   */
  message?: string | ((ctx: BotContext, retryAfter: number) => string)
  
  /**
   * Skip rate limiting for certain conditions
   */
  skip?: (ctx: BotContext) => boolean | Promise<boolean>
  
  /**
   * Handler called when rate limit is exceeded
   */
  onLimitReached?: (ctx: BotContext, retryAfter: number) => void | Promise<void>
}

/**
 * Creates a rate limiting middleware.
 * 
 * @param options - Rate limit configuration
 * @returns Middleware function
 * 
 * @example
 * ```typescript
 * const bot = IgniterBot
 *   .create()
 *   .addMiddleware(rateLimitMiddleware({
 *     maxRequests: 10,
 *     windowMs: 60000, // 1 minute
 *     message: 'Too many requests. Please try again later.'
 *   }))
 *   .build()
 * ```
 * 
 * @example
 * ```typescript
 * // With Redis store
 * const bot = IgniterBot
 *   .create()
 *   .addMiddleware(rateLimitMiddleware({
 *     maxRequests: 20,
 *     windowMs: 60000,
 *     store: redisRateLimitStore(redisClient),
 *     keyGenerator: (ctx) => `ratelimit:${ctx.provider}:${ctx.message.author.id}`
 *   }))
 *   .build()
 * ```
 */
export function rateLimitMiddleware<TContext extends BotContext>(
  options: RateLimitOptions
): Middleware<TContext, {}> {
  const {
    maxRequests,
    windowMs,
    store = new MemoryRateLimitStore(),
    keyGenerator = (ctx) => `${ctx.provider}:${ctx.message.author.id}`,
    message = 'Rate limit exceeded. Please try again later.',
    skip,
    onLimitReached,
  } = options

  return async (ctx: TContext, next: () => Promise<void>) => {
    // Skip rate limiting if condition is met
    if (skip && (await skip(ctx))) {
      await next()
      return
    }

    const key = keyGenerator(ctx)
    const count = await store.increment(key, windowMs)

    if (count > maxRequests) {
      // Calculate retry after time
      const retryAfter = Math.ceil(windowMs / 1000) // in seconds

      // Call onLimitReached handler if provided
      if (onLimitReached) {
        await onLimitReached(ctx, retryAfter)
      }

      // Send rate limit message
      const rateLimitMessage =
        typeof message === 'function' ? message(ctx, retryAfter) : message

      await ctx.reply(rateLimitMessage)
      return // Block the request
    }

    await next()
  }
}

/**
 * Factory function for creating a memory-based rate limit store
 */
export function memoryRateLimitStore(): RateLimitStore {
  return new MemoryRateLimitStore()
}

/**
 * Pre-configured rate limit middleware for common use cases
 */
export const rateLimitPresets = {
  /**
   * Strict rate limit: 5 requests per minute
   */
  strict: <TContext extends BotContext>(): Middleware<TContext, {}> =>
    rateLimitMiddleware({
      maxRequests: 5,
      windowMs: 60000,
      message: '⚠️ Too many requests. Please wait before trying again.',
    }),

  /**
   * Moderate rate limit: 10 requests per minute
   */
  moderate: <TContext extends BotContext>(): Middleware<TContext, {}> =>
    rateLimitMiddleware({
      maxRequests: 10,
      windowMs: 60000,
      message: 'Please slow down! Try again in a minute.',
    }),

  /**
   * Lenient rate limit: 20 requests per minute
   */
  lenient: <TContext extends BotContext>(): Middleware<TContext, {}> =>
    rateLimitMiddleware({
      maxRequests: 20,
      windowMs: 60000,
      message: 'You are sending messages too quickly. Please wait.',
    }),

  /**
   * Per-command rate limit: 3 requests per 10 seconds
   */
  perCommand: <TContext extends BotContext>(): Middleware<TContext, {}> =>
    rateLimitMiddleware({
      maxRequests: 3,
      windowMs: 10000,
      keyGenerator: (ctx) => {
        const command = ctx.message.content?.type === 'command' 
          ? ctx.message.content.command 
          : 'message'
        return `${ctx.provider}:${ctx.message.author.id}:${command}`
      },
      message: 'Command rate limit exceeded. Please wait before using this command again.',
    }),
}

