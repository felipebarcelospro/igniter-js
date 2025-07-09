import type {
  ProjectSetupConfig,
  TemplateFile,
} from './types'
import { getEnvironmentVariables, getDockerServices, DATABASE_CONFIGS } from './features'
import type { SupportedFramework } from '../framework'

/**
 * Generate main igniter.ts file with proper imports and configuration
 */
export function generateIgniterRouter(config: ProjectSetupConfig): TemplateFile {
  const { features } = config

  let imports = [`import { Igniter } from '@igniter-js/core'`]
  let serviceImports: string[] = []

  // Add context import
  imports.push('import { createIgniterAppContext } from "./igniter.context"')

  // Add feature service imports based on enabled features
  if (features.store) {
    serviceImports.push('import { store } from "@/services/store"')
  }

  if (features.jobs) {
    serviceImports.push('import { REGISTERED_JOBS } from "@/services/jobs"')
  }

  if (features.logging) {
    serviceImports.push('import { logger } from "@/services/logger"')
  }

  // Telemetry service import
  if (features.telemetry) {
    serviceImports.push('import { telemetry } from "@/services/telemetry"')
  }

  const allImports = [...imports, ...serviceImports].join('\n')

  // Build configuration chain
  let configChain = ['export const igniter = Igniter', '  .context(createIgniterAppContext)']

  if (features.store) configChain.push('  .store(store)')
  if (features.jobs) configChain.push('  .jobs(REGISTERED_JOBS)')
  if (features.logging) configChain.push('  .logger(logger)')
  if (features.telemetry) configChain.push('  .telemetry(telemetry)')

  configChain.push('  .create()')

  const content = `${allImports}

/**
 * @description Initialize the Igniter.js
 * @see https://github.com/felipebarcelospro/igniter-js
 */
${configChain.join('\n')}
`

  return {
    path: 'src/igniter.ts',
    content
  }
}

/**
 * Generate igniter.context.ts file with proper type definitions
 */
export function generateIgniterContext(config: ProjectSetupConfig): TemplateFile {
  const { database } = config

  let serviceImports: string[] = []
  let contextProperties: string[] = []

  if (database.provider !== 'none') {
    serviceImports.push('import { database } from "@/services/database"')
    contextProperties.push('    // database,')
  }

  const allImports = serviceImports.join('\n')

  const content = `${allImports}

/**
 * @description Create the context of the Igniter.js application
 * @see https://github.com/felipebarcelospro/igniter-js
 */
export const createIgniterAppContext = () => {
  return {
${contextProperties.join('\n')}
  }
}

/**
 * @description The context of the Igniter.js application
 * @see https://github.com/felipebarcelospro/igniter-js
 */
export type IgniterAppContext = Awaited<ReturnType<typeof createIgniterAppContext>>
`

  return {
    path: 'src/igniter.context.ts',
    content
  }
}

/**
 * Generate example controller following the new feature structure
 */
export function generateExampleController(config: ProjectSetupConfig): TemplateFile {
  const { features } = config

  let imports = `import { igniter } from '@/igniter'
import { z } from 'zod'`

  let exampleActions = `    // Health check action
    health: igniter.query({
      name: 'health',
      description: 'Health check',
      path: '/',
      handler: async ({ request, response, context }) => {
        ${features.logging ? 'context.logger.info(\'Health check requested\')' : ''}
        return response.success({
          status: 'ok',
          timestamp: new Date().toISOString(),
          features: {
            store: ${features.store},
            jobs: ${features.jobs},
            mcp: ${features.mcp},
            logging: ${features.logging}
          }
        })
      }
    })`

  // Add store example if enabled
  if (features.store) {
    exampleActions += `,

    // Cache demonstration action
    cacheDemo: igniter.query({
      name: 'cacheDemo',
      description: 'Demonstrate caching',
      path: '/cache/:key' as const,
      handler: async ({ request, response, context }) => {
        const { key } = request.params
        const cached = await context.store.get(key)

        if (cached) {
          return response.success({
            data: cached,
            source: 'cache'
          })
        }

        // Generate sample data
        const data = {
          message: \`Hello from \${key}\`,
          timestamp: new Date().toISOString()
        }

        // Cache for 1 hour
        await context.store.set(key, data, { ttl: 3600 })

        return response.success({
          data,
          source: 'generated'
        })
      }
    })`
  }

  // Add jobs example if enabled
  if (features.jobs) {
    exampleActions += `,

    // Background job scheduling action
    scheduleJob: igniter.mutation({
      name: 'scheduleJob',
      description: 'Schedule a background job',
      path: '/schedule-job',
      method: 'POST',
      body: z.object({
        message: z.string(),
        delay: z.number().optional()
      }),
      handler: async ({ request, response, context }) => {
        const { message, delay = 0 } = request.body

        const jobId = await context.jobs.add('processMessage', {
          message,
          timestamp: new Date().toISOString()
        }, { delay })

        ${features.logging ? 'context.logger.info(\'Job scheduled\', { jobId, message })' : ''}

        return response.success({
          jobId,
          message: 'Job scheduled successfully',
          delay
        })
      }
    })`
  }

  const content = `${imports}

/**
 * @description Example controller demonstrating Igniter.js features
 * @see https://github.com/felipebarcelospro/igniter-js
 */
export const exampleController = igniter.controller({
  name: 'example',
  path: '/example',
  actions: {
${exampleActions}
  }
})
`

  return {
    path: 'src/features/example/controllers/example.controller.ts',
    content
  }
}

/**
 * Generate main router configuration
 */
export function generateMainRouter(config: ProjectSetupConfig): TemplateFile {
  const content = `import { igniter } from '@/igniter'
import { exampleController } from '@/features/example'

/**
 * @description Main application router configuration
 * @see https://github.com/felipebarcelospro/igniter-js
 */
export const AppRouter = igniter.router({
  controllers: {
    example: exampleController
  }
})

export type AppRouterType = typeof AppRouter
`

  return {
    path: 'src/igniter.router.ts',
    content
  }
}

/**
 * Generate feature index file
 */
export function generateFeatureIndex(config: ProjectSetupConfig): TemplateFile {
  const content = `export { exampleController } from './controllers/example.controller'
export * from './example.interfaces'
`

  return {
    path: 'src/features/example/index.ts',
    content
  }
}

/**
 * Generates service files based on enabled features and database provider.
 *
 * @param config - The project setup configuration.
 * @returns An array of TemplateFile objects representing service files.
 *
 * @see https://github.com/felipebarcelospro/igniter-js
 */
export function generateServiceFiles(config: ProjectSetupConfig): TemplateFile[] {
  const { features, database } = config
  const files: TemplateFile[] = []

  files.push({
   path: 'src/app/api/v1/[[...all]]/route.ts',
   content: `import { AppRouter } from '@/igniter.router'
import { nextRouteHandlerAdapter } from '@igniter-js/core/adapters'

export const { GET, POST, PUT, DELETE } = nextRouteHandlerAdapter(AppRouter)
`
  })

  // Initialize Redis service if store or jobs feature is enabled
  if (features.store || features.jobs) {
    files.push({
      path: 'src/services/redis.ts',
      content: `import { Redis } from 'ioredis'

/**
  * Redis client instance for caching, session storage, and pub/sub.
  *
  * @remarks
  * Used for caching, session management, and real-time messaging.
  *
  * @see https://github.com/luin/ioredis
  */
export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
})
`
    })
  }

  // Store service (requires Redis)
  if (features.store) {
    files.push({
      path: 'src/services/store.ts',
      content: `import { createRedisStoreAdapter } from '@igniter-js/adapter-redis'
import { redis } from './redis'

/**
  * Store adapter for data persistence.
  *
  * @remarks
  * Provides a unified interface for data storage operations using Redis.
  *
  * @see https://github.com/felipebarcelospro/igniter-js/tree/main/packages/adapter-redis
  */
export const store = createRedisStoreAdapter(redis)
`
    })
  }

  // Jobs service (requires Redis)
  if (features.jobs) {
    files.push({
      path: 'src/services/jobs.ts',
      content: `import { store } from './store'
import { createBullMQAdapter } from '@igniter-js/adapter-bullmq'
import { z } from 'zod'

/**
  * Job queue adapter for background processing.
  *
  * @remarks
  * Handles asynchronous job processing with BullMQ.
  *
  * @see https://github.com/felipebarcelospro/igniter-js/tree/main/packages/adapter-bullmq
  */
export const jobs = createBullMQAdapter({
  store,
  autoStartWorker: {
    concurrency: 1,
    queues: ['*']
  }
})

export const REGISTERED_JOBS = jobs.merge({
  system: jobs.router({
    jobs: {
      sampleJob: jobs.register({
        name: 'sampleJob',
        input: z.object({
          message: z.string()
        }),
        handler: async ({ input }) => {
          console.log(input.message)
        }
      })
    }
  })
})
`
    })
  }

  // Logger service
  if (features.logging) {
    files.push({
      path: 'src/services/logger.ts',
      content: `import { createConsoleLogger, IgniterLogLevel } from '@igniter-js/core'

/**
  * Logger instance for application logging.
  *
  * @remarks
  * Provides structured logging with configurable log levels.
  *
  * @see https://github.com/felipebarcelospro/igniter-js/tree/main/packages/core
  */
export const logger = createConsoleLogger({
  level: IgniterLogLevel.INFO,
  showTimestamp: true,
})
`
    })
  }

  // Database service (Prisma)
  if (database.provider !== 'none') {
    files.push({
      path: 'src/services/database.ts',
      content: `import { PrismaClient } from '@prisma/client'

/**
 * Prisma client instance for database operations.
 *
 * @remarks
 * Provides type-safe database access with Prisma ORM.
 *
 * @see https://www.prisma.io/docs/concepts/components/prisma-client
 */
export const database = new PrismaClient()
`
    })
  }

  // Telemetry service
  if (features.telemetry) {
    files.push({
      path: 'src/services/telemetry.ts',
      content: `import { createConsoleTelemetryAdapter } from '@igniter-js/core/adapters'
      import { store } from './store'

      /**
       * Telemetry service for tracking requests and errors.
       *
       * @remarks
       * Provides telemetry tracking with configurable options.
       *
       * @see https://github.com/felipebarcelospro/igniter-js/tree/main/packages/core
       */
      export const telemetry = createConsoleTelemetryAdapter({
        serviceName: 'my-igniter-app',
        enableEvents: process.env.IGNITER_TELEMETRY_ENABLE_EVENTS === 'true',
        enableMetrics: process.env.IGNITER_TELEMETRY_ENABLE_METRICS === 'true',
        enableTracing: process.env.IGNITER_TELEMETRY_ENABLE_TRACING === 'true',
      }, {
        enableCliIntegration: process.env.IGNITER_TELEMETRY_ENABLE_CLI_INTEGRATION === 'true',
        store: store
      })
`
    })
  }

  // MCP service

  // MCP service
  if (features.mcp) {
    files.push({
      path: 'src/app/api/mcp/[transport].ts',
      content: `import { createMcpAdapter } from '@igniter-js/adapter-mcp'
import { AppRouter } from '@/igniter.router'

/**
 * MCP server instance for exposing API as a MCP server.
 *
 * @see https://github.com/felipebarcelospro/igniter-js/tree/main/packages/adapter-mcp
 */
export default createMcpAdapter(AppRouter, {
  serverInfo: {
    name: 'Igniter.js MCP Server',
    version: '1.0.0',
  },
  adapter: {
    redis: {
      url: process.env.REDIS_URL!,
      maxRetriesPerRequest: null,
    },
    basePath: process.env.IGNITER_MCP_SERVER_BASE_PATH || '/api/mcp',
    maxDuration: process.env.IGNITER_MCP_SERVER_TIMEOUT || 60,
  },
})
`
    })
  }

  return files
}

/**
 * Generate client file for frontend usage
 */
export function generateIgniterClient(config: ProjectSetupConfig): TemplateFile {
  const content = `import { createIgniterClient, useIgniterQueryClient } from '@igniter-js/core/client'
import type { AppRouterType } from './igniter.router'

/**
  * Type-safe API client generated from your Igniter router
  *
  * Usage in Server Components:
  * const users = await api.users.list.query()
  *
  * Usage in Client Components:
  * const { data } = api.users.list.useQuery()
  */
export const api = createIgniterClient<AppRouterType>({
  baseURL: 'http://localhost:3000',
  basePath: '/api/v1/',
  router: () => {
    if (typeof window === 'undefined') {
      return require('./igniter.router').AppRouter
    }

    return require('./igniter.schema').AppRouterSchema
  },
})

/**
  * Type-safe API client generated from your Igniter router
  *
  * Usage in Server Components:
  * const users = await api.users.list.query()
  *
  * Usage in Client Components:
  * const { data } = api.users.list.useQuery()
  */
export type ApiClient = typeof api

/**
  * Type-safe query client generated from your Igniter router
  *
  * Usage in Client Components:
  * const { invalidate } = useQueryClient()
  */
export const useQueryClient = useIgniterQueryClient<AppRouterType>;
`

  return {
    path: 'src/igniter.client.ts',
    content
  }
}

/**
 * Generate example interfaces file
 */
export function generateExampleInterfaces(): TemplateFile {
  const content = `/**
 * Example feature interfaces and types
 * @description Define your feature's types here
 */

export interface ExampleUser {
  id: string
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
}

export interface ExampleCreateUserInput {
  name: string
  email: string
}

export interface ExampleCacheItem {
  message: string
  timestamp: string
}

export interface ExampleJobPayload {
  message: string
  timestamp: string
}
`

  return {
    path: 'src/features/example/example.interfaces.ts',
    content
  }
}

/**
 * Generate package.json
 */
export function generatePackageJson(config: ProjectSetupConfig, dependencies: string[], devDependencies: string[]): TemplateFile {
  const scripts: Record<string, string> = {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }

  // Add database scripts if using Prisma
  if (config.database.provider !== 'none') {
    scripts["db:generate"] = "prisma generate"
    scripts["db:push"] = "prisma db push"
    scripts["db:studio"] = "prisma studio"
    scripts["db:migrate"] = "prisma migrate dev"
  }

  // Framework-specific script adjustments
  switch (config.framework) {
    case 'vite':
      scripts.dev = "vite"
      scripts.build = "vite build"
      scripts.start = "vite preview"
      break
    case 'nuxt':
      scripts.dev = "nuxt dev"
      scripts.build = "nuxt build"
      scripts.start = "nuxt start"
      break
    case 'sveltekit':
      scripts.dev = "vite dev"
      scripts.build = "svelte-kit build"
      scripts.start = "node build"
      break
    case 'remix':
      scripts.dev = "remix dev"
      scripts.build = "remix build"
      scripts.start = "remix-serve build"
      break
    case 'astro':
      scripts.dev = "astro dev"
      scripts.build = "astro build"
      scripts.start = "astro preview"
      break
    case 'express':
      scripts.dev = "tsx watch src/server.ts"
      scripts.build = "tsc"
      scripts.start = "node dist/server.js"
      break
  }

  const deps = dependencies.reduce((acc, dep) => {
    const [name, version] = dep.split('@')
    acc[name] = version
    return acc
  }, {} as Record<string, string>)

  const devDeps = devDependencies.reduce((acc, dep) => {
    const [name, version] = dep.split('@')
    acc[name] = version
    return acc
  }, {} as Record<string, string>)

  const packageJson = {
    name: config.projectName,
    version: "0.1.0",
    private: true,
    scripts,
    dependencies: deps,
    devDependencies: devDeps
  }

  return {
    path: 'package.json',
    content: JSON.stringify(packageJson, null, 2)
  }
}

/**
 * Generate TypeScript configuration
 */
export function generateTsConfig(framework: SupportedFramework): TemplateFile {
  let compilerOptions: any = {
    target: "ES2020",
    lib: ["ES2020", "DOM"],
    allowJs: true,
    skipLibCheck: true,
    strict: true,
    forceConsistentCasingInFileNames: true,
    noEmit: true,
    esModuleInterop: true,
    module: "esnext",
    moduleResolution: "node",
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: "preserve",
    incremental: true,
    baseUrl: ".",
    paths: {
      "@/*": ["./src/*"]
    }
  }

  // Framework-specific adjustments
  switch (framework) {
    case 'nextjs':
      compilerOptions.plugins = [{ name: "next" }]
      break
    case 'vite':
      compilerOptions.types = ["vite/client"]
      break
    case 'nuxt':
      compilerOptions.paths["~/*"] = ["./src/*"]
      break
  }

  const tsConfig = {
    compilerOptions,
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"]
  }

  return {
    path: 'tsconfig.json',
    content: JSON.stringify(tsConfig, null, 2)
  }
}

/**
 * Generate environment variables file
 */
export function generateEnvFile(config: ProjectSetupConfig): TemplateFile {
  const envVars = getEnvironmentVariables(
    Object.entries(config.features).filter(([_, enabled]) => enabled).map(([key, _]) => key),
    config.database.provider,
    config.projectName
  )

  let content = `# Environment variables for ${config.projectName}
# Generated by @igniter-js/cli

`

  envVars.forEach(envVar => {
    if (envVar.description) {
      content += `# ${envVar.description}\n`
    }
    content += `${envVar.key}=${envVar.value}\n\n`
  })

  return {
    path: '.env.example',
    content
  }
}

/**
 * Generate Docker Compose configuration
 */
export function generateDockerCompose(config: ProjectSetupConfig): TemplateFile | null {
  if (!config.dockerCompose) return null

  const services = getDockerServices(
    Object.entries(config.features).filter(([_, enabled]) => enabled).map(([key, _]) => key),
    config.database.provider
  )

  if (services.length === 0) return null

  const dockerCompose = {
    version: '3.8',
    services: services.reduce((acc, service) => {
      acc[service.name] = {
        image: service.image,
        ports: service.ports,
        environment: service.environment,
        volumes: service.volumes
      }
      return acc
    }, {} as any),
    volumes: services.some(s => s.volumes) ?
      services.reduce((acc, service) => {
        service.volumes?.forEach(volume => {
          const volumeName = volume.split(':')[0]
          if (!volumeName.startsWith('/')) {
            acc[volumeName] = {}
          }
        })
        return acc
      }, {} as any) : undefined
  }

  return {
    path: 'docker-compose.yml',
    content: `# Docker Compose for ${config.projectName}
# Generated by @igniter-js/cli

version: '3.8'

services:
${Object.entries(dockerCompose.services).map(([name, service]: [string, any]) => `
  ${name}:
    image: ${service.image}
${service.ports ? `    ports:\n${service.ports.map((port: string) => `      - "${port}"`).join('\n')}` : ''}
${service.environment ? `    environment:\n${Object.entries(service.environment).map(([key, value]) => `      ${key}: ${value}`).join('\n')}` : ''}
${service.volumes ? `    volumes:\n${service.volumes.map((volume: string) => `      - ${volume}`).join('\n')}` : ''}
`).join('')}
${dockerCompose.volumes ? `\nvolumes:\n${Object.keys(dockerCompose.volumes).map(volume => `  ${volume}:`).join('\n')}` : ''}
`
  }
}

/**
 * Generate .gitignore file
 */
export function generateGitIgnore(): TemplateFile {
  const content = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.npm
.yarn/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
.next/
.nuxt/
.svelte-kit/

# Database
*.db
*.sqlite
prisma/migrations/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Coverage
coverage/
.nyc_output/

# Cache
.cache/
.tmp/
.temp/
`

  return {
    path: '.gitignore',
    content
  }
}

/**
 * Generate README.md
 */
export function generateReadme(config: ProjectSetupConfig): TemplateFile {
  const enabledFeatures = Object.entries(config.features)
    .filter(([_, enabled]) => enabled)
    .map(([key, _]) => `- **${key}**: Enabled`)

  const content = `# ${config.projectName}

A modern, type-safe API built with [Igniter.js](https://github.com/felipebarcelospro/igniter-js) and ${config.framework}.

## Features

${enabledFeatures.join('\n')}
${config.database.provider !== 'none' ? `- **Database**: ${config.database.provider}` : ''}
${config.dockerCompose ? '- **Docker**: Compose setup included' : ''}

## Development

### Prerequisites

- Node.js 18+
- ${config.packageManager}
${config.dockerCompose ? '- Docker and Docker Compose' : ''}

### Getting Started

1. **Install dependencies:**
   \`\`\`bash
   ${config.packageManager} install
   \`\`\`

${config.dockerCompose ? `2. **Start services with Docker:**
   \`\`\`bash
   docker-compose up -d
   \`\`\`

` : ''}${config.database.provider !== 'none' ? `3. **Setup database:**
   \`\`\`bash
   ${config.packageManager} run db:push
   \`\`\`

` : ''}4. **Start development server:**
   \`\`\`bash
   ${config.packageManager} run dev
   \`\`\`

Visit [http://localhost:3000](http://localhost:3000) to see your app!

## Project Structure

\`\`\`
src/
├── igniter.ts                     # Core initialization
├── igniter.client.ts              # Client implementation
├── igniter.context.ts             # Context management
├── igniter.router.ts              # Router configuration
├── igniter.schema.ts             # Schemas configuration
├── features/                      # Application features
│   └── example/
│       ├── controllers/           # Feature controllers
│       ├── procedures/            # Feature procedures/middleware
│       ├── example.interfaces.ts  # Type definitions
│       └── index.ts               # Feature exports
└── providers/                     # Providers layer
\`\`\`

## API Endpoints

- \`GET /api/v1/example\` - Health check
${config.features.store ? '- `GET /api/v1/example/cache/:key` - Cache example' : ''}
${config.features.jobs ? '- `POST /api/v1/example/schedule-job` - Schedule background job' : ''}

## Learn More

- [Igniter.js Documentation](https://github.com/felipebarcelospro/igniter-js)
- [${config.framework} Documentation](https://docs.${config.framework === 'nextjs' ? 'nextjs.org' : config.framework + '.dev'})
${config.database.provider !== 'none' ? '- [Prisma Documentation](https://prisma.io/docs)' : ''}

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
`

  return {
    path: 'README.md',
    content
  }
}

/**
 * Generate all template files for the project
 */
export function generateAllTemplates(
  config: ProjectSetupConfig,
  isExistingProject: boolean
): TemplateFile[] {
  const templates: TemplateFile[] = [
    // Core Igniter files - always generate
    generateIgniterRouter(config),
    generateIgniterContext(config),
    generateMainRouter(config),
    generateIgniterClient(config),

    // Feature files - always generate
    generateExampleController(config),
    generateFeatureIndex(config),
    generateExampleInterfaces(),

    // .env.example is safe to generate as it won't overwrite a user's .env file
    generateEnvFile(config),
  ]

  // Add service files for enabled features
  const serviceFiles = generateServiceFiles(config)
  templates.push(...serviceFiles)

  // Add Docker Compose if enabled. The generator logic handles confirmation for overwrites.
  const dockerCompose = generateDockerCompose(config)
  if (dockerCompose) {
    templates.push(dockerCompose)
  }

  // Project-level boilerplate (like package.json, tsconfig.json, etc.) is now handled
  // in the generator for new projects.

  return templates
}
