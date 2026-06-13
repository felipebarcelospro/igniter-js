import { 
  Code2, Database, Mail, Zap, Bot, Puzzle, Plug, Server, 
  Layers, Lock, HardDrive, CreditCard, MessageCircle 
} from "lucide-react";
import { z } from "zod";

export interface CodeExample {
  id: string;
  title: string;
  description: string;
  icon: typeof Code2;
  filePath: string;
  code: string;
}

export interface ComingSoonFeature {
  title: string;
  description: string;
  icon: typeof Lock;
}

export const codeExamples: CodeExample[] = [
  {
    id: "jobs",
    title: "Background Jobs",
    description: "Type-safe job queues with scheduling, CRON, retries, and concurrency control",
    icon: Zap,
    filePath: "src/services/jobs.ts",
    code: `import { IgniterJobs, IgniterQueue } from '@igniter-js/jobs'
import { IgniterJobsBullMQAdapter } from '@igniter-js/jobs/adapters'
import { z } from 'zod'

// 1. Define a queue with typed jobs
const emailQueue = IgniterQueue.create('email')
  .addJob('sendWelcome', {
    input: z.object({
      userId: z.string(),
      email: z.string().email(),
    }),
    handler: async (ctx) => {
      await ctx.services.mail.send({
        to: ctx.input.email,
        template: 'welcome',
      })
    },
  })
  .addJob('sendReceipt', {
    input: z.object({
      userId: z.string(),
      orderId: z.string(),
    }),
    handler: async (ctx) => {
      const order = await ctx.db.order.findUnique({
        where: { id: ctx.input.orderId }
      })
      await ctx.services.mail.send({
        to: ctx.input.email,
        template: 'receipt',
        data: { order },
      })
    },
  })
  .build()

// 2. Create the jobs runtime with adapter and context
export const jobs = IgniterJobs.create()
  .withAdapter(IgniterJobsBullMQAdapter.create({
    connection: { host: 'localhost', port: 6379 }
  }))
  .withService('my-api')
  .withEnvironment('production')
  .withContext(async () => ({
    db: prisma,
    services: { mail: mailService },
  }))
  .addQueue(emailQueue)
  .withAutoStartWorker({ queues: ['email'], concurrency: 5 })
  .build()

// 3. Dispatch jobs — fully typed, with auto-complete!
await jobs.email.sendWelcome.dispatch({
  input: { userId: '123', email: 'alice@example.com' },
  delay: 5000, // optional delay in ms
})

// 4. Multi-tenant scoping
const orgJobs = jobs.scope('organization', 'org_456')
await orgJobs.email.sendReceipt.dispatch({
  input: { userId: '789', orderId: 'ord_001' },
})`
  },
  {
    id: "store",
    title: "Multi-Adapter Store",
    description: "Distributed key-value store with Pub/Sub, counters, locks, and streams",
    icon: Database,
    filePath: "src/services/store.ts",
    code: `import { IgniterStore, IgniterStoreEvents } from '@igniter-js/store'
import { IgniterStoreRedisAdapter } from '@igniter-js/store/adapters'
import { z } from 'zod'
import Redis from 'ioredis'

// 1. Define typed events per domain
const UserEvents = IgniterStoreEvents
  .create('user')
  .event('created', z.object({
    userId: z.string(),
    email: z.string().email(),
  }))
  .event('deleted', z.object({
    userId: z.string(),
  }))
  .group('notifications', (g) =>
    g.event('email', z.object({ to: z.string(), subject: z.string() }))
     .event('push', z.object({ token: z.string(), title: z.string() }))
  )
  .build()

// 2. Build the store instance
const redis = new Redis()
export const store = IgniterStore.create()
  .withAdapter(IgniterStoreRedisAdapter.create({ redis }))
  .withService('my-api')
  .addEvents(UserEvents)
  .build()

// 3. Key-value with TTL
await store.kv.set('user:123', { name: 'Alice', plan: 'pro' }, { ttl: 3600 })
const user = await store.kv.get<UserProfile>('user:123')

// 4. Distributed counters
const views = await store.counter.increment('page-views')
await store.counter.decrement('available-slots')

// 5. Distributed locks (claims)
const claimed = await store.claim.once('process:order-001', 'worker-1', { ttl: 30 })
if (claimed) {
  // Safe to process — only one worker holds the lock
  await processOrder('order-001')
  await store.claim.release('process:order-001', 'worker-1')
}

// 6. Typed Pub/Sub
await store.events.user.created.subscribe((msg) => {
  console.log('New user:', msg.userId, msg.email)
  // msg is fully typed from the Zod schema!
})
await store.events.user.created.publish({
  userId: '123',
  email: 'alice@example.com',
})

// 7. Multi-tenant scoping
const orgStore = store.scope('organization', 'org_456')
await orgStore.kv.set('settings', { theme: 'dark' })
// Key: igniter:store:my-api:organization:org_456:kv:settings`
  },
  {
    id: "caller",
    title: "Type-Safe HTTP Client",
    description: "Schema-typed HTTP client with Zod validation and interceptors",
    icon: Code2,
    filePath: "src/services/api.ts",
    code: `import { IgniterCaller } from '@igniter-js/caller'
import { z } from 'zod'

// 1. Shared schemas
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
})

// 2. Build the typed API client
export const api = IgniterCaller.create()
  .withBaseUrl('https://api.example.com')
  .withHeaders({ 'X-Client': 'my-app' })
  .withSchemas({
    '/users': {
      GET: {
        responses: {
          200: z.array(UserSchema),
          401: z.object({ error: z.string() }),
        },
      },
      POST: {
        request: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
        responses: {
          201: UserSchema,
          400: z.object({ error: z.string(), fields: z.record(z.string()) }),
        },
      },
    },
    '/users/:id': {
      GET: {
        responses: {
          200: UserSchema,
          404: z.object({ error: z.literal('not_found') }),
        },
      },
    },
  })
  .withResponseInterceptor(async (result) => {
    if (result.error && result.response?.status === 401) {
      await refreshToken()
      return result.retry()
    }
    return result
  })
  .build()

// 3. Use it — fully typed at every step!
const { data: users } = await api.get('/users').execute()
//     ^? User[]

const { data: newUser } = await api.post('/users')
  .body({ name: 'Alice', email: 'alice@example.com' })
  .execute()
//     ^? User

const { data: profile } = await api.get('/users/:id')
  .params({ id: '123' })
  .execute()
//     ^? User

// Runtime validation — catches API mismatches instantly
try {
  await api.get('/users').execute()
} catch (err) {
  // err.message = "Response validation failed for GET /users"
}`
  },
  {
    id: "mail",
    title: "Transactional Email",
    description: "Type-safe email sending with templates, hooks, and pluggable providers",
    icon: Mail,
    filePath: "src/services/mail.ts",
    code: `import { IgniterMail, IgniterMailTemplate } from '@igniter-js/mail'
import { z } from 'zod'

// 1. Define typed templates
const WelcomeTemplate = IgniterMailTemplate.create('welcome')
  .withSubject('Welcome to {{appName}}, {{name}}!')
  .withHtml('<h1>Welcome {{name}}!</h1><p>Thanks for joining {{appName}}.</p>')
  .withInput(z.object({
    name: z.string(),
    email: z.string().email(),
  }))
  .build()

const ReceiptTemplate = IgniterMailTemplate.create('receipt')
  .withSubject('Your receipt for order #{{orderId}}')
  .withInput(z.object({
    orderId: z.string(),
    amount: z.number(),
    items: z.array(z.object({ name: z.string(), price: z.number() })),
  }))
  .build()

// 2. Build the mail service
export const mail = IgniterMail.create()
  .withFrom('noreply@myapp.com')
  .withAdapter('sendgrid', process.env.SENDGRID_API_KEY!)
  .addTemplate('welcome', WelcomeTemplate)
  .addTemplate('receipt', ReceiptTemplate)
  .onSendStarted(async (params) => {
    console.log('Sending:', params.template, '→', params.to)
  })
  .onSendError(async (params, error) => {
    console.error('Failed:', params.template, error.message)
  })
  .onSendSuccess(async (params) => {
    console.log('Sent:', params.template, '→', params.to)
  })
  .build()

// 3. Send — fully typed templates!
await mail.send({
  template: 'welcome',
  to: 'alice@example.com',
  input: { name: 'Alice', email: 'alice@example.com' },
  // ^? { name: string, email: string } — typed from the template!
})

await mail.send({
  template: 'receipt',
  to: 'alice@example.com',
  input: {
    orderId: 'ORD-1234',
    amount: 49.90,
    items: [
      { name: 'Premium Plan', price: 29.90 },
      { name: 'Add-on Storage', price: 20.00 },
    ],
  },
})

// 4. Schedule for later (requires queue adapter)
await mail.schedule({
  template: 'welcome',
  to: 'bob@example.com',
  input: { name: 'Bob', email: 'bob@example.com' },
  delay: 60000, // send in 1 minute
})`
  },
  {
    id: "collections",
    title: "Schema-Driven Collections",
    description: "Prisma-like ORM for Markdown files with Zod schemas and hooks",
    icon: Layers,
    filePath: "src/content/collections.ts",
    code: `import { IgniterCollections, IgniterCollectionModel } from '@igniter-js/collections'
import { NodeFsAdapter } from '@igniter-js/collections/adapters'
import { z } from 'zod'

// 1. Define collection models with Zod schemas
const Posts = IgniterCollectionModel.create('posts')
  .withBasePath('content/blog')
  .withSchema(z.object({
    title: z.string(),
    description: z.string().optional(),
    published: z.boolean().default(false),
    tags: z.array(z.string()),
  }))
  .onCreated(({ value }) => {
    console.log('Post created:', value.id);
    return value;
  })
  .build()

const Authors = IgniterCollectionModel.create('authors')
  .withBasePath('content/authors')
  .withSchema(z.object({
    name: z.string(),
    bio: z.string(),
    github: z.string().url().optional(),
  }))
  .build()

// 2. Build the collections manager
export const docs = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .addCollection(Posts)
  .addCollection(Authors)
  .build()

// 3. Full Prisma-like query API
const published = await docs.posts.findMany({
  where: { published: true },
  orderBy: { createdAt: 'desc' },
  take: 10,
})

const draft = await docs.posts.create({
  data: {
    title: 'My First Post',
    published: false,
    tags: ['typescript', 'igniter'],
  },
  content: '# Hello World\\n\\nThis is my first post.',
})

const updated = await docs.posts.update({
  where: { id: draft.id },
  data: { published: true, tags: ['typescript', 'igniter', 'tutorial'] },
})

// 4. Global event listeners
docs.on('created', ({ collection, value }) => {
  console.log(\`New \${collection}: \${value.id}\`);
})

// 5. File watcher — auto-reloads on file changes
await docs.watcher.start()`
  },
  {
    id: "agents",
    title: "AI Agent Framework",
    description: "Type-safe agent creation with toolsets, MCP, memory, and multi-agent orchestration",
    icon: Bot,
    filePath: "src/services/agent.ts",
    code: `import { 
  IgniterAgent, IgniterAgentToolset, IgniterAgentTool,
  IgniterAgentMCPClient, IgniterAgentPrompt,
  IgniterAgentManager 
} from '@igniter-js/agents'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

// 1. Define tools with Zod schemas
const dbTool = IgniterAgentTool.create('queryDatabase')
  .withDescription('Execute a SQL query against the database')
  .withInput(z.object({
    query: z.string().describe('The SQL query to execute'),
  }))
  .withExecute(async ({ query }) => {
    const result = await db.query(query)
    return JSON.stringify(result)
  })
  .build()

const emailTool = IgniterAgentTool.create('sendEmail')
  .withDescription('Send an email to a user')
  .withInput(z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
  }))
  .withExecute(async ({ to, subject, body }) => {
    await mail.send({ template: 'custom', to, input: { subject, body } })
    return 'Email sent!'
  })
  .build()

// 2. Group tools into toolsets
const utilsToolset = IgniterAgentToolset.create('utils')
  .addTool(dbTool)
  .addTool(emailTool)
  .build()

// 3. MCP integration for agent-to-agent communication
const mcp = IgniterAgentMCPClient.create('filesystem')
  .withType('stdio')
  .withCommand('npx')
  .withArgs(['-y', '@modelcontextprotocol/server-filesystem', '/tmp'])
  .build()

// 4. Typed prompt template
const prompt = IgniterAgentPrompt.create(
  'You are {{agent}}, a helpful assistant. Today is {{date}}.'
)

// 5. Build the agent
export const assistant = IgniterAgent.create('assistant')
  .withModel(openai('gpt-4o'))
  .withPrompt(prompt)
  .addToolset(utilsToolset)
  .addMCP(mcp)
  .build()

// 6. Multi-agent orchestration
export const agents = IgniterAgentManager.create()
  .addAgent(assistant)
  .addAgent(IgniterAgent.create('researcher')
    .withModel(openai('gpt-4o'))
    .withPrompt(prompt)
    .addMCP(mcp)
    .build()
  )
  .build()

// 7. Execute
const result = await assistant.generate({
  chatId: 'chat_123',
  userId: 'user_456',
  message: { role: 'user', content: 'How many users signed up today?' },
})
// The agent can autonomously call queryDatabase and sendEmail!`
  },
  {
    id: "connectors",
    title: "Connector Management",
    description: "Multi-tenant third-party integrations with OAuth 2.0 and webhook pipelines",
    icon: Plug,
    filePath: "src/services/connectors.ts",
    code: `import { 
  IgniterConnector, IgniterConnectorManager,
  IgniterConnectorPrismaAdapter 
} from '@igniter-js/connectors'
import { z } from 'zod'
import { prisma } from '@/lib/db'

// 1. Define a connector with actions and OAuth
const telegramConnector = IgniterConnector.create()
  .withMetadata(
    z.object({ name: z.string(), icon: z.string(), description: z.string().optional() }),
    { name: 'Telegram', icon: 'telegram.svg', description: 'Telegram Bot API' },
  )
  .withConfig(
    z.object({
      botToken: z.string(),
      chatId: z.string(),
    })
  )
  .withOAuth({
    authorizationUrl: 'https://oauth.telegram.org/auth',
    tokenUrl: 'https://oauth.telegram.org/token',
    scopes: ['bot', 'messages'],
    clientId: process.env.TELEGRAM_CLIENT_ID!,
    clientSecret: process.env.TELEGRAM_CLIENT_SECRET!,
  })
  .addAction('sendMessage', {
    description: 'Send a message to a Telegram chat',
    input: z.object({
      text: z.string().max(4096),
      parseMode: z.enum(['HTML', 'Markdown']).optional(),
    }),
    handler: async ({ input, config }) => {
      const response = await fetch(
        \`https://api.telegram.org/bot\${config.botToken}/sendMessage\`,
        {
          method: 'POST',
          body: JSON.stringify({
            chat_id: config.chatId,
            text: input.text,
            parse_mode: input.parseMode,
          }),
        }
      )
      return response.json()
    },
  })
  .build()

// 2. Build the connector manager with encryption
export const connectors = IgniterConnectorManager.create()
  .withDatabase(IgniterConnectorPrismaAdapter.create(prisma))
  .withEncrypt(['accessToken', 'refreshToken', 'apiKey'])
  .addScope('organization', { required: true })
  .addScope('user', { required: true })
  .addConnector('telegram', telegramConnector)
  .onConnect(async ({ connector, scope, identity }) => {
    console.log(\`\${connector} connected for \${scope}:\${identity}\`)
  })
  .onError(async ({ connector, error }) => {
    console.error(\`\${connector} error:\`, error.message)
  })
  .build()

// 3. Create scoped instance for multi-tenancy
const scoped = connectors.scope('organization', 'org_456')

// 4. Connect a connector — encrypted credentials + OAuth handled automatically
const connection = await scoped.connect('telegram', {
  botToken: 'abc123',
  chatId: '987654',
})

// 5. Execute actions — fully typed input and output!
const { data, error } = await scoped
  .action('telegram', 'sendMessage')
  .call({
    text: '🚀 Deployment successful!',
    parseMode: 'HTML',
  })

if (error) {
  console.error('Action failed:', error.message)
}

// 6. List, toggle, and disconnect
const all = await scoped.list({ where: { enabled: true } })
await scoped.toggle('telegram', false) // disable
await scoped.disconnect('telegram')     // remove`
  },
  {
    id: "mcp-server",
    title: "MCP Server",
    description: "Transform any Igniter.js API into AI-native tools for Code Agents",
    icon: Server,
    filePath: "src/app/api/mcp/[...transport]/route.ts",
    code: `import { IgniterMcpServer } from '@igniter-js/adapter-mcp-server'
import { IgniterRouter } from '@igniter-js/core'
import { z } from 'zod'

// 1. Your existing Igniter.js API router
const appRouter = IgniterRouter.create()
  .controller(userController)
  .controller(postController)
  .controller(paymentController)

// 2. Expose the entire API as MCP tools — one line!
const { handler } = IgniterMcpServer
  .create()
  .router(appRouter)
  .withServerInfo({
    name: 'My App MCP Server',
    version: '1.0.0',
  })
  .withInstructions(
    'Use these tools to manage users, posts, and payments ' +
    'in the production database. Always confirm destructive actions.'
  )
  .addCustomTool({
    name: 'analyze-user-activity',
    description: 'Analyze user activity patterns over a time period',
    args: z.object({
      userId: z.string(),
      days: z.number().default(30),
    }),
    handler: async (args) => {
      const activity = await analytics.getUserActivity(args.userId, args.days)
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(activity, null, 2),
        }],
      }
    },
  })
  .build()

// 3. Plug into Next.js, Express, Hono — any framework
export const GET = handler
export const POST = handler

// AI agents like Cursor, Claude, Copilot can now:
// - List users: "Show me all admin users"
// - Create posts: "Publish a draft titled 'New Feature'"
// - Analyze data: "Check user activity for user_123" (custom tool)
// — all with your actual API logic, not mock data!`
  },
];

export const comingSoonFeatures: ComingSoonFeature[] = [
  {
    title: "File Storage",
    description: "Upload, download and manage files with local and S3 adapters",
    icon: HardDrive,
  },
  {
    title: "Payments",
    description: "Type-safe payment processing with Stripe integration",
    icon: CreditCard,
  },
  {
    title: "Multi-Platform Bots",
    description: "Build chatbots for Telegram, WhatsApp, and Discord with unified API",
    icon: MessageCircle,
  },
];
