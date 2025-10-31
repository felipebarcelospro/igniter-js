/**
 * Authentication Middleware
 * 
 * Controls access to bot commands and features based on user permissions.
 */

import type { Middleware, BotContext } from '../types/bot.types'

/**
 * Authentication configuration options
 */
export interface AuthOptions<TContext extends BotContext> {
  /**
   * List of allowed user IDs
   * If provided, only these users can access the bot
   */
  allowedUsers?: string[]

  /**
   * List of allowed channel/group IDs
   * If provided, bot only responds in these channels
   */
  allowedChannels?: string[]

  /**
   * List of blocked user IDs
   * These users cannot access the bot
   */
  blockedUsers?: string[]

  /**
   * List of blocked channel/group IDs
   * Bot will not respond in these channels
   */
  blockedChannels?: string[]

  /**
   * Custom authorization function
   * Return true to allow, false to deny
   */
  checkFn?: (ctx: TContext) => boolean | Promise<boolean>

  /**
   * Message to send when access is denied
   */
  unauthorizedMessage?: string | ((ctx: TContext) => string)

  /**
   * Skip authorization for certain conditions
   */
  skip?: (ctx: TContext) => boolean | Promise<boolean>

  /**
   * Handler called when unauthorized access is attempted
   */
  onUnauthorized?: (ctx: TContext) => void | Promise<void>
}

/**
 * Creates an authentication middleware.
 * 
 * @param options - Authentication configuration
 * @returns Middleware function
 * 
 * @example
 * ```typescript
 * // Allow only specific users
 * const bot = IgniterBot
 *   .create()
 *   .addMiddleware(authMiddleware({
 *     allowedUsers: ['user123', 'user456'],
 *     unauthorizedMessage: 'You are not authorized to use this bot.'
 *   }))
 *   .build()
 * ```
 * 
 * @example
 * ```typescript
 * // Custom authorization logic
 * const bot = IgniterBot
 *   .create()
 *   .addMiddleware(authMiddleware({
 *     checkFn: async (ctx) => {
 *       const user = await getUserFromDatabase(ctx.message.author.id)
 *       return user?.isSubscribed === true
 *     },
 *     unauthorizedMessage: 'Please subscribe to use this bot.'
 *   }))
 *   .build()
 * ```
 */
export function authMiddleware<TContext extends BotContext>(
  options: AuthOptions<TContext>
): Middleware<TContext, {}> {
  const {
    allowedUsers,
    allowedChannels,
    blockedUsers,
    blockedChannels,
    checkFn,
    unauthorizedMessage = 'You are not authorized to use this bot.',
    skip,
    onUnauthorized,
  } = options

  return async (ctx: TContext, next: () => Promise<void>) => {
    // Skip auth if condition is met
    if (skip && (await skip(ctx))) {
      await next()
      return
    }

    const userId = ctx.message.author.id
    const channelId = ctx.channel.id

    // Check blocked users
    if (blockedUsers?.includes(userId)) {
      await handleUnauthorized(ctx, unauthorizedMessage, onUnauthorized)
      return
    }

    // Check blocked channels
    if (blockedChannels?.includes(channelId)) {
      await handleUnauthorized(ctx, unauthorizedMessage, onUnauthorized)
      return
    }

    // Check allowed users
    if (allowedUsers && !allowedUsers.includes(userId)) {
      await handleUnauthorized(ctx, unauthorizedMessage, onUnauthorized)
      return
    }

    // Check allowed channels
    if (allowedChannels && !allowedChannels.includes(channelId)) {
      await handleUnauthorized(ctx, unauthorizedMessage, onUnauthorized)
      return
    }

    // Custom check function
    if (checkFn && !(await checkFn(ctx))) {
      await handleUnauthorized(ctx, unauthorizedMessage, onUnauthorized)
      return
    }

    // Authorized, proceed
    await next()
  }
}

/**
 * Helper function to handle unauthorized access
 */
async function handleUnauthorized<TContext extends BotContext>(
  ctx: TContext,
  message: string | ((ctx: TContext) => string),
  onUnauthorized?: (ctx: TContext) => void | Promise<void>
): Promise<void> {
  // Call onUnauthorized handler if provided
  if (onUnauthorized) {
    await onUnauthorized(ctx)
  }

  // Send unauthorized message
  const unauthorizedMsg = typeof message === 'function' ? message(ctx) : message
  await ctx.reply(unauthorizedMsg)
}

/**
 * Pre-configured auth middleware for common use cases
 */
export const authPresets = {
  /**
   * Allow only admins (requires admin user IDs)
   */
  adminsOnly: <TContext extends BotContext>(adminIds: string[]): Middleware<TContext, {}> =>
    authMiddleware({
      allowedUsers: adminIds,
      unauthorizedMessage: '🔒 This bot is restricted to administrators only.',
    }),

  /**
   * Allow only in private chats (no groups)
   */
  privateOnly: <TContext extends BotContext>(): Middleware<TContext, {}> =>
    authMiddleware({
      checkFn: (ctx) => !ctx.channel.isGroup,
      unauthorizedMessage: '🚫 This bot only works in private chats.',
    }),

  /**
   * Allow only in groups (no private chats)
   */
  groupsOnly: <TContext extends BotContext>(): Middleware<TContext, {}> =>
    authMiddleware({
      checkFn: (ctx) => ctx.channel.isGroup,
      unauthorizedMessage: '👥 This bot only works in group chats.',
    }),

  /**
   * Whitelist specific users
   */
  whitelist: <TContext extends BotContext>(userIds: string[]): Middleware<TContext, {}> =>
    authMiddleware({
      allowedUsers: userIds,
      unauthorizedMessage: '⛔ You are not on the whitelist.',
    }),

  /**
   * Blacklist specific users
   */
  blacklist: <TContext extends BotContext>(userIds: string[]): Middleware<TContext, {}> =>
    authMiddleware({
      blockedUsers: userIds,
      unauthorizedMessage: '🚫 You have been blocked from using this bot.',
    }),
}

/**
 * Role-based authentication middleware
 */
export interface RoleOptions<TContext extends BotContext> {
  /**
   * Function to get user roles
   */
  getRoles: (userId: string, ctx: TContext) => string[] | Promise<string[]>

  /**
   * Required roles (user must have at least one)
   */
  requiredRoles: string[]

  /**
   * Message to send when user doesn't have required roles
   */
  unauthorizedMessage?: string
}

/**
 * Creates a role-based authentication middleware.
 * 
 * @param options - Role configuration
 * @returns Middleware function
 * 
 * @example
 * ```typescript
 * const bot = IgniterBot
 *   .create()
 *   .addMiddleware(roleMiddleware({
 *     getRoles: async (userId) => {
 *       const user = await database.users.findById(userId)
 *       return user.roles
 *     },
 *     requiredRoles: ['admin', 'moderator'],
 *     unauthorizedMessage: 'You need admin or moderator role.'
 *   }))
 *   .build()
 * ```
 */
export function roleMiddleware<TContext extends BotContext>(
  options: RoleOptions<TContext>
): Middleware<TContext, {}> {
  const {
    getRoles,
    requiredRoles,
    unauthorizedMessage = 'You do not have the required permissions.',
  } = options

  return authMiddleware({
    checkFn: async (ctx) => {
      const userId = ctx.message.author.id
      const userRoles = await getRoles(userId, ctx)
      
      // Check if user has at least one required role
      return requiredRoles.some((role) => userRoles.includes(role))
    },
    unauthorizedMessage,
  })
}

