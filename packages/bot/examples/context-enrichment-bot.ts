/**
 * Context Enrichment Example
 * 
 * Demonstrates the type-safe context enrichment feature.
 * Middlewares add properties to the context, which become
 * available with full type safety in subsequent steps.
 */

// Organized imports
import { IgniterBot } from '@igniter-js/bot'
import { telegram } from '@igniter-js/bot/adapters'
import type { BotContext } from '@igniter-js/bot/types'
import { z } from 'zod'

// --- Mock Database & Types ---

interface User {
  id: string
  name: string
  role: 'admin' | 'user'
  tenantId: string
}

interface Tenant {
  id: string
  name: string
  plan: 'free' | 'pro'
}

const mockUsers: Record<string, User> = {
  'user123': { id: 'user123', name: 'Alice', role: 'admin', tenantId: 'tenantA' },
  'user456': { id: 'user456', name: 'Bob', role: 'user', tenantId: 'tenantB' },
}

const mockTenants: Record<string, Tenant> = {
  'tenantA': { id: 'tenantA', name: 'Acme Corp', plan: 'pro' },
  'tenantB': { id: 'tenantB', name: 'Bob\'s Burgers', plan: 'free' },
}

const db = {
  users: {
    find: async (id: string): Promise<User | null> => mockUsers[id] || null,
  },
  tenants: {
    find: async (id: string): Promise<Tenant | null> => mockTenants[id] || null,
  },
}

// --- Middlewares for Context Enrichment ---

/**
 * Middleware 1: Adds 'user' to the context
 */
const addUserMiddleware = async (ctx: BotContext, next: () => Promise<void>) => {
  const user = await db.users.find(ctx.message.author.id)
  await next()
  return { user }
}

/**
 * Middleware 2: Adds 'tenant' to the context, using 'user' from previous middleware
 */
const addTenantMiddleware = async (
  ctx: BotContext & { user: User | null },
  next: () => Promise<void>
) => {
  // `ctx.user` is available and fully typed here!
  const tenant = ctx.user ? await db.tenants.find(ctx.user.tenantId) : null
  await next()
  return { tenant }
}

// --- Bot Definition ---

const bot = IgniterBot
  .create()
  .withHandle('@enrich_bot')
  .addAdapter('telegram', telegram({ token: process.env.TELEGRAM_TOKEN! }))
  
  // Chain the middlewares
  .addMiddleware(addUserMiddleware)
  .addMiddleware(addTenantMiddleware)
  
  // --- Commands that use the enriched context ---
  
  .addCommand('profile', {
    name: 'profile',
    description: 'Show your user profile',
    help: 'Use /profile to see your info',
    async handle(ctx) {
      // `ctx.user` and `ctx.tenant` are available and fully typed!
      if (ctx.user && ctx.tenant) {
        await ctx.reply(
          `👤 **User Profile**\n` +
          `Name: ${ctx.user.name}\n` +
          `Role: ${ctx.user.role}\n\n` +
          `🏢 **Tenant Info**\n` +
          `Name: ${ctx.tenant.name}\n` +
          `Plan: ${ctx.tenant.plan}`
        )
      } else {
        await ctx.reply('Could not find your user or tenant info. Are you registered?')
      }
    }
  })
  
  .addCommand('admin', {
    name: 'admin',
    description: 'Admin-only command',
    help: 'Use /admin to perform admin actions',
    async handle(ctx) {
      // `ctx.user` is available here too!
      if (ctx.user?.role !== 'admin') {
        await ctx.reply('🔒 Access denied. This command is for admins only.')
        return
      }
      
      await ctx.reply('Welcome, admin! ✅')
    }
  })
  
  .onMessage(async (ctx) => {
    // The enriched context is also available in global listeners!
    if (ctx.message.content?.type === 'text') {
      console.log(`Message from ${ctx.user?.name || 'Unknown User'} in tenant ${ctx.tenant?.name || 'Unknown Tenant'}`)
    }
  })
  
  .build()

// The final type of `ctx` in handlers is inferred as:
// BotContext & { user: User | null } & { tenant: Tenant | null }

// --- Initialization and Export ---

await bot.start()

export async function POST(req: Request) {
  return bot.handle('telegram', req)
}

export { bot }
