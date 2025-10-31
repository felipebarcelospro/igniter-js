/**
 * Complete Bot Example
 * 
 * Demonstrates all features of the @igniter-js/bot package:
 * - Builder Pattern API
 * - Multi-platform support
 * - Session management
 * - Middlewares (auth, rate limiting, logging)
 * - Plugins
 * - Type-safe commands with Zod validation
 * - Helper methods (reply, replyWithButtons, etc)
 */

// Organized imports (recommended)
import { IgniterBot } from '@igniter-js/bot'
import { telegram, whatsapp } from '@igniter-js/bot/adapters'
import { authMiddleware, rateLimitMiddleware, loggingMiddleware } from '@igniter-js/bot/middlewares'
import { analyticsPlugin } from '@igniter-js/bot/plugins'
import { memoryStore } from '@igniter-js/bot/stores'
import type { BotContext } from '@igniter-js/bot/types'
import { z } from 'zod'

/**
 * Example: E-commerce Bot
 * 
 * A complete bot for managing an e-commerce store with:
 * - Product catalog browsing
 * - Shopping cart management
 * - Order placement
 * - Admin commands
 * - Analytics tracking
 */

// Mock database
const products = [
  { id: '1', name: 'Laptop', price: 999, stock: 10, image: 'https://example.com/laptop.jpg' },
  { id: '2', name: 'Mouse', price: 29, stock: 50, image: 'https://example.com/mouse.jpg' },
  { id: '3', name: 'Keyboard', price: 79, stock: 30, image: 'https://example.com/keyboard.jpg' },
  { id: '4', name: 'Monitor', price: 299, stock: 15, image: 'https://example.com/monitor.jpg' },
]

const orders: any[] = []

// Admin user IDs
const ADMIN_IDS = ['admin_user_1', 'admin_user_2']

// Create the bot
const bot = IgniterBot
  .create()
  
  // Core configuration
  .withId('ecommerce-bot')
  .withName('E-commerce Assistant')
  .withLogger(console)
  
  // Session management
  .withSessionStore(memoryStore({
    cleanupIntervalMs: 300000, // 5 minutes
  }))
  
  // Multi-platform adapters
  .addAdapters({
    telegram: telegram({
      token: process.env.TELEGRAM_TOKEN!,
      handle: '@shop_bot',
      webhook: {
        url: process.env.TELEGRAM_WEBHOOK_URL!,
        secret: process.env.TELEGRAM_WEBHOOK_SECRET,
      },
    }),
    whatsapp: whatsapp({
      token: process.env.WHATSAPP_TOKEN!,
      phone: process.env.WHATSAPP_PHONE!,
      handle: 'shop',
    }),
  })
  
  // Middlewares
  .addMiddleware(loggingMiddleware({
    logMessages: true,
    logCommands: true,
    logErrors: true,
    logMetrics: true,
    includeUserInfo: true,
    includeContent: false, // Don't log message content for privacy
  }))
  .addMiddleware(rateLimitMiddleware({
    maxRequests: 20,
    windowMs: 60000, // 1 minute
    message: '⚠️ Slow down! You can make up to 20 requests per minute.',
    skip: (ctx) => ADMIN_IDS.includes(ctx.message.author.id), // Admins bypass rate limit
  }))
  
  // Plugins
  .usePlugin(analyticsPlugin({
    trackMessages: true,
    trackCommands: true,
    trackErrors: true,
    includeUserInfo: true,
  }))
  
  // Public commands
  .addCommands({
    start: {
      name: 'start',
      aliases: ['begin', 'hello'],
      description: 'Start the bot and see welcome message',
      help: 'Use /start to begin',
      async handle(ctx) {
        await ctx.reply(`
🛍️ **Welcome to E-commerce Bot!**

I can help you:
- Browse products (/catalog)
- Manage your cart (/cart)
- Place orders (/checkout)
- Track orders (/orders)

Need help? Use /help
        `.trim())
      },
    },
    
    help: {
      name: 'help',
      aliases: ['?', 'commands'],
      description: 'Show available commands',
      help: 'Use /help to see all commands',
      async handle(ctx) {
        await ctx.reply(`
📚 **Available Commands:**

**Shopping:**
/catalog - Browse products
/cart - View your cart
/checkout - Place order
/orders - View your orders

**General:**
/help - Show this message
/stats - Bot statistics (Analytics plugin)

**Admin Only:**
/inventory - Manage inventory
/broadcast - Send message to all users
        `.trim())
      },
    },
    
    catalog: {
      name: 'catalog',
      aliases: ['shop', 'products', 'browse'],
      description: 'Browse product catalog',
      help: 'Use /catalog to see available products',
      async handle(ctx) {
        const productList = products
          .map(p => `• ${p.name} - $${p.price} (${p.stock} in stock)`)
          .join('\n')
        
        await ctx.reply(`
🛒 **Product Catalog:**

${productList}

To add to cart, use: /add <product_id>
        `.trim())
      },
    },
    
    add: {
      name: 'add',
      aliases: ['addtocart'],
      description: 'Add product to cart',
      help: 'Use /add <product_id>',
      args: z.object({
        productId: z.string().min(1),
        quantity: z.number().positive().default(1),
      }),
      async handle(ctx, args) {
        const product = products.find(p => p.id === args.productId)
        
        if (!product) {
          await ctx.reply('❌ Product not found. Use /catalog to see available products.')
          return
        }
        
        if (product.stock < args.quantity) {
          await ctx.reply(`❌ Insufficient stock. Only ${product.stock} available.`)
          return
        }
        
        const session = ctx.session
        if (!session.data.cart) {
          session.data.cart = []
        }
        
        session.data.cart.push({
          ...product,
          quantity: args.quantity,
        })
        await session.save()
        
        await ctx.reply(`✅ ${product.name} x${args.quantity} added to cart!`)
      },
    },
    
    cart: {
      name: 'cart',
      aliases: ['basket', 'mycart'],
      description: 'View your shopping cart',
      help: 'Use /cart to see items in your cart',
      async handle(ctx) {
        const session = ctx.session
        const cart = session.data.cart || []
        
        if (cart.length === 0) {
          await ctx.reply('🛒 Your cart is empty. Use /catalog to browse products.')
          return
        }
        
        const total = cart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
        const itemsList = cart
          .map((item: any, i: number) => `${i + 1}. ${item.name} x${item.quantity} - $${item.price * item.quantity}`)
          .join('\n')
        
        await ctx.reply(`
🛒 **Your Cart:**

${itemsList}

**Total: $${total}**

Use /checkout to place order
Use /clear to empty cart
        `.trim())
      },
    },
    
    clear: {
      name: 'clear',
      aliases: ['clearcart', 'empty'],
      description: 'Clear your shopping cart',
      help: 'Use /clear to empty your cart',
      async handle(ctx) {
        const session = ctx.session
        session.data.cart = []
        await session.save()
        await ctx.reply('🗑️ Cart cleared!')
      },
    },
    
    checkout: {
      name: 'checkout',
      aliases: ['buy', 'order'],
      description: 'Place an order',
      help: 'Use /checkout to place your order',
      async handle(ctx) {
        const session = ctx.session
        const cart = session.data.cart || []
        
        if (cart.length === 0) {
          await ctx.reply('❌ Your cart is empty. Add items first with /add')
          return
        }
        
        // Create order
        const total = cart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
        const order = {
          id: `ORDER-${Date.now()}`,
          userId: ctx.message.author.id,
          items: cart,
          total,
          status: 'pending',
          createdAt: new Date(),
        }
        
        orders.push(order)
        
        // Update stock
        for (const item of cart) {
          const product = products.find(p => p.id === item.id)
          if (product) {
            product.stock -= item.quantity
          }
        }
        
        // Clear cart
        session.data.cart = []
        await session.save()
        
        await ctx.reply(`
✅ **Order Placed Successfully!**

Order ID: ${order.id}
Total: $${total}

Thank you for your purchase!
Use /orders to track your orders.
        `.trim())
      },
    },
    
    orders: {
      name: 'orders',
      aliases: ['myorders', 'history'],
      description: 'View your order history',
      help: 'Use /orders to see your orders',
      async handle(ctx) {
        const userOrders = orders.filter(o => o.userId === ctx.message.author.id)
        
        if (userOrders.length === 0) {
          await ctx.reply('📦 You have no orders yet.')
          return
        }
        
        const ordersList = userOrders
          .map(o => `• ${o.id} - $${o.total} (${o.status})`)
          .join('\n')
        
        await ctx.reply(`
📦 **Your Orders:**

${ordersList}
        `.trim())
      },
    },
  })
  
  // Admin commands (protected by middleware)
  .addCommand('inventory', {
    name: 'inventory',
    aliases: ['stock'],
    description: 'View inventory (admin only)',
    help: 'Use /inventory to see stock levels',
    async handle(ctx) {
      const stockList = products
        .map(p => `• ${p.name}: ${p.stock} units`)
        .join('\n')
      
      await ctx.reply(`
📊 **Inventory Report:**

${stockList}
      `.trim())
    },
  })
  .addCommand('broadcast', {
    name: 'broadcast',
    aliases: ['announce'],
    description: 'Send message to all platforms (admin only)',
    help: 'Use /broadcast <message>',
    args: z.object({
      message: z.string().min(1),
    }),
    async handle(ctx, args) {
      // Get all adapters
      const adapters = ctx.bot.getAdapters?.() || {}
      
      for (const [key, adapter] of Object.entries(adapters)) {
        if (adapter.capabilities.content.text) {
          await ctx.bot.send({
            provider: key,
            channel: ctx.channel.id,
            content: { type: 'text', content: `📢 ${args.message}` },
          })
        }
      }
      
      await ctx.reply('✅ Broadcast sent to all platforms!')
    },
  })
  
  // Event handlers
  .onMessage(async (ctx) => {
    // Handle callback queries (button presses)
    if (ctx.message.content?.type === 'callback') {
      const [type, id] = ctx.message.content.data.split(':')
      
      if (type === 'product') {
        const product = products.find(p => p.id === id)
        if (product) {
          await ctx.replyWithImage(
            product.image,
            `${product.name}\n$${product.price}\nStock: ${product.stock}\n\nUse /add ${product.id} to add to cart`
          )
        }
      }
    }
  })
  
  .onError(async (ctx) => {
    const errorCtx = ctx as typeof ctx & { error?: { message: string; code?: string } }
    console.error('Bot Error:', errorCtx.error)
    
    // Send friendly error message
    await ctx.reply('❌ Something went wrong. Please try again.')
  })
  
  .onStart(async () => {
    console.log('🚀 E-commerce bot started successfully!')
  })
  
  // Apply admin-only middleware to specific commands
  .addMiddleware(async (ctx, next) => {
    // Check if command is admin-only
    if (ctx.message.content?.type === 'command') {
      const adminCommands = ['inventory', 'broadcast']
      const command = ctx.message.content.command
      
      if (adminCommands.includes(command)) {
        // Check if user is admin
        if (!ADMIN_IDS.includes(ctx.message.author.id)) {
          await ctx.reply('🔒 This command is only available to administrators.')
          return
        }
      }
    }
    
    await next()
  })
  
  .build()

/**
 * Initialize the bot
 */
export async function initBot() {
  await bot.start()
  console.log('Bot initialized and webhooks registered')
  return bot
}

/**
 * Telegram webhook handler
 */
export async function handleTelegram(req: Request): Promise<Response> {
  return bot.handle('telegram', req)
}

/**
 * WhatsApp webhook handler
 */
export async function handleWhatsApp(req: Request): Promise<Response> {
  return bot.handle('whatsapp', req)
}

/**
 * Next.js API Route Example
 */
// export { handleTelegram as POST } from './bot'
// 
// // In app/api/bot/whatsapp/route.ts:
// export { handleWhatsApp as POST } from './bot'

export { bot }

