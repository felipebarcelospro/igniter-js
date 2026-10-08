import {
  Bot,
  Boxes,
  BriefcaseBusiness,
  Code2,
  CreditCard,
  Database,
  HardDrive,
  MessageSquare,
  Activity,
  ScrollText,
  Workflow,
  Layers,
  Mail,
  Plug,
} from 'lucide-react';

export interface CodeExample {
  id: string;
  packageName: string;
  title: string;
  description: string;
  docsHref: string;
  icon: typeof Code2;
  filePath: string;
  code: string;
  lang?: string;
}

export interface ComingSoonFeature {
  title: string;
  description: string;
  icon: typeof Code2;
}

export const codeExamples: CodeExample[] = [
  {
    id: 'core',
    packageName: '@igniter-js/core',
    title: 'Type-Safe HTTP API',
    description: 'Build typed queries, mutations, controllers, and routers around your application context.',
    docsHref: '/docs/core/quick-start',
    icon: Code2,
    filePath: 'src/igniter.ts',
    code: `import { Igniter } from '@igniter-js/core'

const igniter = Igniter.create()
  .withContext(() => ({ status: 'ok' }))
  .withConfig({ basePATH: '/api' })
  .build()

export const healthController = igniter.controller({
  path: '/health',
  actions: {
    status: igniter.query({
      path: '/',
      handler: async ({ context }) => ({ status: context.status }),
    }),
  },
})`,
  },
  {
    id: 'app',
    packageName: '@igniter-js/app',
    title: 'Type-Safe React App Shell',
    description: 'Connect a typed client to pages and routing with TanStack Router.',
    docsHref: '/docs/app',
    icon: Boxes,
    filePath: 'src/app.igniter.tsx',
    code: `import {
  IgniterApp,
  IgniterRouter,
  IgniterRouterProvider,
} from '@igniter-js/app'
import { client } from './client'

const app = IgniterApp.create()
  .withClient(client)
  .withContext(() => ({ requestStartedAt: Date.now() }))
  .build()

const homePage = app.page('/')
  .withMetadata({ title: 'Home' })
  .withComponent(() => <main>Welcome back</main>)
  .build()

export const router = IgniterRouter.create(app)
  .addRoute(homePage)
  .build()

export function App() {
  return <IgniterRouterProvider router={router} />
}`,
  },
  {
    id: 'caller',
    packageName: '@igniter-js/caller',
    title: 'Type-Safe HTTP Client',
    description: 'Make typed requests with a small client that works with fetch.',
    docsHref: '/docs/caller/quick-start',
    icon: Workflow,
    filePath: 'src/lib/api.ts',
    code: `import { IgniterCaller } from '@igniter-js/caller'

export const api = IgniterCaller.create()
  .withBaseUrl('https://api.example.com')
  .withHeaders({ 'X-Client': 'web' })
  .build()

const result = await api.get('/users').execute()

if (result.error) {
  throw new Error(result.error.message)
}

console.log(result.data)`,
  },
  {
    id: 'jobs',
    packageName: '@igniter-js/jobs',
    title: 'Background Jobs',
    description: 'Define validated jobs and run them through a queue adapter.',
    docsHref: '/docs/jobs/getting-started',
    icon: BriefcaseBusiness,
    filePath: 'src/jobs/email.queue.ts',
    code: `import { IgniterJobs, IgniterQueue } from '@igniter-js/jobs'
import { IgniterJobsMemoryAdapter } from '@igniter-js/jobs/adapters/mock'
import { z } from 'zod'

export const emailQueue = IgniterQueue.create('email')
  .addJob('sendWelcome', {
    input: z.object({ email: z.string().email() }),
    handler: async ({ input }) => {
      console.info('Sending welcome email to', input.email)
    },
  })
  .build()

export const jobs = IgniterJobs.create()
  .withAdapter(IgniterJobsMemoryAdapter.create())
  .withService('web')
  .withEnvironment('development')
  .withContext(async () => ({}))
  .addQueue(emailQueue)
  .withAutoStartWorker({ queues: ['email'], concurrency: 1 })
  .build()

await jobs.email.sendWelcome.dispatch({
  input: { email: 'user@example.com' },
})`,
  },
  {
    id: 'store',
    packageName: '@igniter-js/store',
    title: 'Multi-Adapter Store',
    description: 'Use one typed store API with Redis, SQLite, or in-memory adapters.',
    docsHref: '/docs/store/installation',
    icon: Database,
    filePath: 'src/lib/store.ts',
    code: `import { IgniterStore } from '@igniter-js/store'
import { IgniterStoreRedisAdapter } from '@igniter-js/store/adapters'
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)

export const store = IgniterStore.create()
  .withAdapter(IgniterStoreRedisAdapter.create({ redis }))
  .withService('web')
  .build()

await store.kv.set('user:123', { plan: 'pro' }, { ttl: 3600 })`,
  },
  {
    id: 'storage',
    packageName: '@igniter-js/storage',
    title: 'File Storage',
    description: 'Configure typed file scopes and upload files through a provider adapter.',
    docsHref: '/docs/storage/quick-start',
    icon: HardDrive,
    filePath: 'src/lib/storage.ts',
    code: `import { IgniterStorage } from '@igniter-js/storage'

export const storage = IgniterStorage.create()
  .withAdapter('s3', {
    bucket: process.env.S3_BUCKET!,
    region: process.env.AWS_REGION!,
  })
  .withUrl(process.env.CDN_URL!)
  .addScope('user', '/users/[identifier]')
  .build()

const avatarFile = new Blob(['image-bytes'], { type: 'image/png' })
const avatar = await storage
  .scope('user', 'user-123')
  .upload(avatarFile, 'avatar.png')`,
  },
  {
    id: 'mail',
    packageName: '@igniter-js/mail',
    title: 'Transactional Email',
    description: 'Send schema-validated email templates through pluggable providers.',
    docsHref: '/docs/mail',
    icon: Mail,
    filePath: 'src/mail.tsx',
    code: `import { Html, Text } from '@react-email/components'
import { IgniterMail } from '@igniter-js/mail'
import { z } from 'zod'

export const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .addTemplate('welcome', {
    subject: 'Welcome, {{name}}',
    schema: z.object({ name: z.string() }),
    render: ({ name }) => (
      <Html><Text>Welcome, {name}!</Text></Html>
    ),
  })
  .build()

await mail.send({
  to: 'user@example.com',
  template: 'welcome',
  data: { name: 'Alex' },
})`,
  },
  {
    id: 'bot',
    packageName: '@igniter-js/bot',
    title: 'Multi-Platform Bots',
    description: 'Build a typed bot with platform adapters, commands, and session storage.',
    docsHref: '/docs/bots/quick-start',
    icon: MessageSquare,
    filePath: 'src/lib/bot.ts',
    code: `import { IgniterBot, memoryStore, telegram } from '@igniter-js/bot'

export const bot = IgniterBot.create()
  .withHandle('@my_awesome_bot')
  .withSessionStore(memoryStore())
  .addAdapters({
    telegram: telegram({ token: process.env.TELEGRAM_TOKEN! }),
  })
  .addCommand('start', {
    name: 'start',
    description: 'Greet the user',
    help: 'Send /start to receive a greeting',
    async handle(ctx) {
      await ctx.reply('Hello!')
    },
  })
  .build()`,
  },
  {
    id: 'collections',
    packageName: '@igniter-js/collections',
    title: 'Schema-Driven Collections',
    description: 'Model local content with validated fields and a typed query API.',
    docsHref: '/docs/collections',
    icon: Layers,
    filePath: 'src/content/collections.ts',
    code: `import {
  IgniterCollectionModel,
  IgniterCollections,
} from '@igniter-js/collections'
import { NodeFsAdapter } from '@igniter-js/collections/adapters'
import { z } from 'zod'

const Posts = IgniterCollectionModel.create('posts')
  .withBasePath('content/posts')
  .withSchema(z.object({ title: z.string(), published: z.boolean() }))
  .build()

export const content = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .addCollection(Posts)
  .build()

const publishedPosts = await content.posts.findMany({
  where: { published: true },
})`,
  },
  {
    id: 'agents',
    packageName: '@igniter-js/agents',
    title: 'AI Agent Framework',
    description: 'Create typed agents with a model, tools, memory, and MCP support.',
    docsHref: '/docs/agents/quick-start',
    icon: Bot,
    filePath: 'src/agents/weather.agent.ts',
    code: `import {
  IgniterAgent,
  IgniterAgentTool,
  IgniterAgentToolset,
} from '@igniter-js/agents'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const weather = IgniterAgentTool.create('get_weather')
  .withDescription('Get the current weather for a city')
  .withInput(z.object({ city: z.string() }))
  .withExecute(async ({ city }) => {
    const search = new URL('https://geocoding-api.open-meteo.com/v1/search')
    search.searchParams.set('name', city)
    search.searchParams.set('count', '1')
    const locations = await fetch(search).then((response) => response.json())
    const place = locations.results?.[0]
    if (!place) throw new Error('City not found')

    const forecast = new URL('https://api.open-meteo.com/v1/forecast')
    forecast.searchParams.set('latitude', String(place.latitude))
    forecast.searchParams.set('longitude', String(place.longitude))
    forecast.searchParams.set('current', 'temperature_2m')
    return fetch(forecast).then((response) => response.json())
  })
  .build()

const weatherTools = IgniterAgentToolset.create('weather')
  .addTool(weather)
  .build()

export const assistant = IgniterAgent.create('weather-assistant')
  .withModel(openai('gpt-4o-mini'))
  .addToolset(weatherTools)
  .build()

await assistant.start()`,
  },
  {
    id: 'telemetry',
    packageName: '@igniter-js/telemetry',
    title: 'Typed Telemetry',
    description: 'Create a telemetry manager and emit structured application events.',
    docsHref: '/docs/telemetry/getting-started',
    icon: Activity,
    filePath: 'src/telemetry.ts',
    code: `import {
  IgniterTelemetry,
  LoggerTransportAdapter,
} from '@igniter-js/telemetry'

export const telemetry = IgniterTelemetry.create()
  .withService('api')
  .withEnvironment(process.env.NODE_ENV ?? 'development')
  .addTransport(
    LoggerTransportAdapter.create({ logger: console }),
  )
  .build()

telemetry.emit('api.request.completed', {
  attributes: { 'ctx.request.method': 'GET' },
})`,
  },
  {
    id: 'logger',
    packageName: '@igniter-js/logger',
    title: 'Structured Logging',
    description: 'Create a Pino-backed logger with service context and a configurable log level.',
    docsHref: '/docs/logger/quick-start',
    icon: ScrollText,
    filePath: 'src/lib/logger.ts',
    code: `import {
  IgniterLogger,
  IgniterLogLevel,
} from '@igniter-js/logger'

export const logger = IgniterLogger.create()
  .withLevel(IgniterLogLevel.Info)
  .withAppName('api')
  .withComponent('http')
  .build()

logger.info('Server started', { port: 3000 })`,
  },
  {
    id: 'connectors',
    packageName: '@igniter-js/connectors',
    title: 'Connector Management',
    description: 'Define typed integrations and actions for external services.',
    docsHref: '/docs/connectors/getting-started',
    icon: Plug,
    filePath: 'src/connectors/telegram.ts',
    code: `import { IgniterConnector } from '@igniter-js/connectors'
import { z } from 'zod'

export const telegram = IgniterConnector.create()
  .withConfig(z.object({
    botToken: z.string(),
    chatId: z.string(),
  }))
  .addAction('sendMessage', {
    description: 'Send a message to Telegram',
    input: z.object({ message: z.string() }),
    handler: async ({ input, config }) => {
      const response = await fetch(
        'https://api.telegram.org/bot' + config.botToken + '/sendMessage',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: config.chatId, text: input.message }),
        },
      )
      return response.json()
    },
  })
  .build()`,
  },
];

export const comingSoonFeatures: ComingSoonFeature[] = [
  {
    title: 'Payments',
    description: 'Type-safe payment processing with Stripe integration.',
    icon: CreditCard,
  },
];
