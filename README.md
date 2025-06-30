# Igniter

[![npm version](https://img.shields.io/npm/v/@igniter-js/core.svg?style=flat)](https://www.npmjs.com/package/@igniter-js/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Igniter.js is a modern, type-safe HTTP framework designed to streamline the development of scalable TypeScript applications. It combines the flexibility of traditional HTTP frameworks with the power of full-stack type safety, making it the ideal choice for teams building robust web applications.

## Why Igniter?

- **Type Safety Without Compromise**: End-to-end type safety from your API routes to your client code, catching errors before they reach production
- **Framework Agnostic**: Seamlessly integrates with Next.js, Express, Fastify, or any Node.js framework
- **Developer Experience First**: Built with TypeScript best practices and modern development patterns in mind
- **Production Ready**: Being used in production by companies of all sizes
- **Minimal Boilerplate**: Get started quickly without sacrificing scalability
- **Flexible Architecture**: Adapts to your project's needs, from small APIs to large-scale applications

## Features

- 🎯 **Full TypeScript Support**: End-to-end type safety from your API routes to your client code
- 🚀 **Modern Architecture**: Built with modern TypeScript features and best practices
- 🔒 **Type-Safe Routing**: Route parameters and query strings are fully typed
- 🔌 **Middleware System**: Powerful and flexible middleware support with full type inference
- 🎭 **Context Sharing**: Share context between middlewares and route handlers
- 🔄 **Built-in Error Handling**: Comprehensive error handling with type-safe error responses
- 🍪 **Cookie Management**: Built-in cookie handling with signing support
- 📦 **Framework Agnostic**: Works with any Node.js framework (Express, Fastify, Next.js, etc.)
- 🗃️ **Store Adapters**: Built-in Redis support for caching, sessions, and pub/sub messaging
- 📊 **Background Jobs**: Type-safe job queue system with BullMQ integration
- 📝 **Structured Logging**: Extensible logging system with multiple adapters

## Getting Started

### Installation

```bash
npm install @igniter-js/core
# or
yarn add @igniter-js/core
# or
pnpm add @igniter-js/core
# or
bun add @igniter-js/core
```

#### Optional Dependencies

For enhanced functionality, you can install optional peer dependencies:

```bash
# For Redis store adapter
npm install ioredis
npm install @types/ioredis --save-dev

# For job queue system
npm install bullmq

# For MCP (Model Context Protocol) support
npm install @vercel/mcp-adapter @modelcontextprotocol/sdk
```

### Quick Start Guide

Building an API with Igniter.js is straightforward and intuitive. Here's how to get started:

## Project Structure

Igniter.js promotes a feature-based architecture that scales with your application:

```
src/
├── igniter.ts                            # Core initialization
├── igniter.client.ts                     # Client implementation
├── igniter.context.ts                    # Context management
├── igniter.router.ts                     # Router configuration
├── features/                             # Application features
│   └── [feature]/
│       ├── presentation/                 # Feature presentation layer
│       │   ├── components/               # Feature-specific components
│       │   ├── hooks/                    # Custom hooks
│       │   ├── contexts/                 # Feature contexts
│       │   └── utils/                    # Utility functions
│       ├── controllers/                  # Feature controllers
│       │   └── [feature].controller.ts
│       ├── procedures/                   # Feature procedures/middleware
│       │   └── [feature].procedure.ts
│       ├── [feature].interfaces.ts       # Type definitions(interfaces, entities, inputs and outputs)
│       └── index.ts                      # Feature exports
```

### Understanding the Structure

- **Feature-based Organization**: Each feature is self-contained with its own controllers, procedures, and types
- **Clear Separation of Concerns**: Presentation, business logic, and data access are clearly separated
- **Scalable Architecture**: Easy to add new features without affecting existing ones
- **Maintainable Codebase**: Consistent structure makes it easy for teams to navigate and maintain

### 1. Initialize Igniter
```typescript
// src/igniter.ts
import type { IgniterAppContext } from "./igniter.context";
import { Igniter.js } from "@igniter-js/core";
import { store } from "@/services/store"
import { prisma } from "@/services/prisma"
import { jobs } from "@/services/jobs"
import { logger } from "@/services/logger"

/**
 * @description Initialize the Igniter.js Router with enhanced features
 * @see https://igniter.felipebarcelospro.github.io/docs/getting-started/installation
 */
export const igniter = Igniter
  .context<IgniterAppContext>()
  .logger(logger)      // Add structured logging
  .create()
```

### 2. Setup your services
```typescript
// src/services/prisma
import { PrismaClient } from '@prisma/client'

/**
 * Prisma client instance for database operations
 * @description Provides type-safe database access with Prisma ORM
 */
export const database = createPrismaClient(PrismaClient)

// src/services/redis
import { Redis } from "ioredis";

/**
 * Redis client instance for caching and pub/sub
 * @description Handles caching, session storage and real-time messaging
 */
export const redis = new Redis(process.env.REDIS_URL);

// src/services/store
import { createRedisStoreAdapter } from "@igniter-js/core/adapters";

/**
 * Store adapter for data persistence
 * @description Provides a unified interface for data storage operations
 */
export const store = createRedisStoreAdapter({ store });

// src/services/jobs
import { createBullMQAdapter } from "@igniter-js/core/adapters";

/**
 * Job queue adapter for background processing
 * @description Handles asynchronous job processing with BullMQ
 */
export const jobs = createBullMQAdapter({ store });

// src/services/logger
import { createConsoleLogger } from "@igniter-js/core/adapters";

/**
 * Logger instance for application logging
 * @description Provides structured logging with configurable log levels
 */
export const logger = createConsoleLogger({ level: 'info' });

### 2. Define your App Global Context
```typescript
// src/igniter.context
import { database } from "@/services/database"
import { jobs } from "@/services/jobs"
import { logger } from "@/services/logger"
import { logger } from "@/services/logger"

/**
 * @description Create the context of the application
 * @see https://igniter.felipebarcelospro.github.io/docs/getting-started/installation
 */
export const createIgniterAppContext = () => {
  return {
    jobs,
    prisma,
    logger,
    database
  }
}

/**
 * @description The context of the application
 * Enhanced with store, jobs, and logger from Igniter.js builder
 * @see https://igniter.felipebarcelospro.github.io/docs/getting-started/installation
 */
export type IgniterAppContext = Awaited<ReturnType<typeof createIgniterAppContext>>;
```

### 3. Create your first controller
```typescript
// src/features/user/controllers/user.controller.ts
import { igniter } from '@/igniter'

export const userController = igniter.controller({
  path: '/users',
  actions: {
    // Query action (GET)
    list: igniter.query({
      path: '/',
      use: [auth()],
      query: z.object({
        page: z.number().optional(),
        limit: z.number().optional()
      }),
      handler: async (ctx) => {
        return igniter.response.success({
          users: [
            { id: 1, name: 'John Doe' }
          ]
        })
      }
    }),

    // Mutation action (POST)
    create: igniter.mutation({
      path: '/',
      method: 'POST',
      use: [auth()],
      body: z.object({
        name: z.string(),
        email: z.string().email()
      }),
      handler: async ({ request, response, context }) => {
        const { name, email } = request.body
        
        // Log the operation
        context.logger.info('Creating new user', { email });
        
        // Create user in database
        const user = await context.database.user.create({
          data: { name, email }
        });
        
        // Cache user data
        await context.store.set(`user:${user.id}`, user, { ttl: 3600 });
        
        // Queue welcome email job (if jobs are configured)
        if (ctx.jobs) {
          await context.jobs.invoke({
            id: 'sendWelcomeEmail',
            payload: { userId: user.id, email, name }
          });
        }
        
        context.logger.info('User created successfully', { 
          userId: user.id, 
          email: user.email 
        });
        
        return response.created(user)
      }
    })
  }
})
```

### 4. Initialize Igniter.js Router with your framework

```typescript
// src/igniter.router.ts
import { igniter } from '@/igniter'
import { userController } from '@/features/user'

export const AppRouter = igniter.router({
  baseURL: process.env.NEXT_PUBLIC_IGNITER_APP_URL, // Default is http://localhost:3000
  basePATH: process.env.NEXT_PUBLIC_IGNITER_APP_BASE_PATH, // Default is /api/v1
  controllers: {
    users: userController
  }
})

// Use with any HTTP framework
// Example with Express:
import { AppRouter } from '@/igniter.router'

app.use(async (req, res) => {
  const response = await AppRouter.handler(req)
  res.status(response.status).json(response)
})

// Example with Bun:
import { AppRouter } from '@/igniter.router'

Bun.serve({
  fetch: AppRouter.handler
})

// Example with Next Route Handlers:
// src/app/api/v1/[[...all]]/route.ts
import { AppRouter } from '@/igniter.router'
import { nextRouteHandlerAdapter } from '@igniter-js/core/adapters'

export const { GET, POST, PUT, DELETE } = nextRouteHandlerAdapter(AppRouter)
```

## Core Concepts

### Application Context

The context system is the backbone of your application:

```typescript
type AppContext = {
  db: Database
  user?: User
}

const igniter = Igniter.context<AppContext>().create()
```

#### Best Practices for Context

- Keep context focused and specific to your application needs
- Use TypeScript interfaces to define context shape
- Consider splitting large contexts into domain-specific contexts
- Avoid storing request-specific data in global context

### Procedures (Middleware)

Procedures provide a powerful way to handle cross-cutting concerns:

```typescript
import { igniter } from '@/igniter'

type AuthOptions = {
 isAuthRequired?: boolean
}

const auth = igniter.procedure({
  handler: async (options: AuthOptions, { request, response, context }) => {
    // Get authorization token from cookies
    const token = request.cookies.get('authorization')

    // Return unauthorized response if token is missing and auth is required
    if (!token && options.isAuthRequired) {
      return response.unauthorized()
    }
    
    // Verify token and get user data
    const user = await verifyToken(token)

    return { 
      auth: {
        // Return authenticated user
        user,

        // Helper method to sign out user
        signOut: () => {
          // Remove auth cookie
          request.cookies.delete('authorization')

          // Publish logout event to store for real-time updates
          // This allows other parts of the app to react to logout events
          context.store.publish('user_logged_out', {
            userId: user.id,
          })
        }
      }
    }
  }
})

// Use in actions
const protectedAction = igniter.query({
  path: '/protected',
  use: [auth({ isAuthRequired: true })],
  handler: ({ request, response, context }) => {
    // ctx.context.user is typed!
    return response.success({ user: ctx.context.user })
  }
})

// Example of a protected action that requires authentication
const protectedAction = igniter.query({
  path: '/protected/logout',
  // Use auth procedure with required authentication
  use: [auth({ isAuthRequired: true })],
  handler: ({ request, response, context }) => {
    // Call signOut() from auth procedure to handle logout logic
    // This separates authentication business logic into reusable procedures
    await context.auth.signOut()

    // Return success response with user data
    // The user property is fully typed thanks to the auth procedure
    return response.success({ user: ctx.context.user })
  }
})

#### Common Use Cases for Procedures

- Authentication and Authorization
- Request Validation
- Logging and Monitoring
- Error Handling
- Performance Tracking
- Data Transformation

### Controllers and Actions

Controllers organize related functionality:

```typescript
import { igniter } from '@/igniter'

const userController = igniter.controller({
  path: 'users',
  actions: {
    list: igniter.query({
      path: '/',
      handler: (ctx) => ctx.response.success({ users: [] })
    }),
    
    get: igniter.query({
      path: '/:id',
      handler: (ctx) => {
        // ctx.request.params.id is typed!
        return ctx.response.success({ user: { id: ctx.request.params.id } })
      }
    })
  }
})
```

#### Controller Best Practices

- Group related actions together
- Keep controllers focused on a single resource or domain
- Use meaningful names that reflect the resource
- Implement proper error handling
- Follow RESTful conventions where appropriate

### Type-Safe Responses

Igniter.js provides a robust response system:

```typescript
handler: async (ctx) => {
  // Success responses
  ctx.response.success({ data: 'ok' })
  ctx.response.created({ id: 1 })
  ctx.response.noContent()

  // Error responses
  ctx.response.badRequest('Invalid input')
  ctx.response.unauthorized()
  ctx.response.forbidden('Access denied')
  ctx.response.notFound('Resource not found')
  
  // Custom responses
  ctx.response.status(418).setHeader('X-Custom', 'value').json({ message: "I'm a teapot" })
}
```

### Cookie Management

Secure cookie handling made easy:

```typescript
handler: async ({ response }) => {
  // Set cookies
  await response.setCookie('session', 'value', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  })

  // Set signed cookies
  await response.setSignedCookie('token', 'sensitive-data', 'secret-key')

  // Get cookies
  const session = request.cookies.get('session')
  const token = await request.cookies.getSigned('token', 'secret-key')
}
```

## React Client Integration

The Igniter.js React client provides a seamless integration with your frontend:

### Setup

First, create your API client:

```typescript
// src/igniter.client.ts
import { createIgniterClient, useIgniterQueryClient } from '@igniter-js/core/client';
import { AppRouter } from './igniter.router';

/**
 * Client for Igniter
 * 
 * This client is used to fetch data on the client-side
 * It uses the createIgniterClient function to create a client instance
 * 
 */
export const api = createIgniterClient(AppRouter);

/**
 * Query client for Igniter
 * 
 * This client provides access to the Igniter.js query functions
 * and handles data fetching with respect to the application router.
 * It will enable the necessary hooks for query management.
 */
export const useQueryClient = useIgniterQueryClient<typeof AppRouter>;
```

Then, wrap your app with the Igniter.js provider:

```tsx
// app/providers.tsx
import { IgniterProvider } from '@igniter-js/core/client'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <IgniterProvider>
      {children}
    </IgniterProvider>
  )
}
```

### Queries

Use the `useQuery` hook for data fetching with automatic caching and revalidation:

```tsx
import { api } from '@/igniter.client'

function UsersList() {
  const listUsers = api.users.list.useQuery({
    // Optional configuration
    initialData: [], // Initial data while loading
    initialParams: {}, // Params for query
    staleTime: 1000 * 60, // Data stays fresh for 1 minute
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when component mounts
    refetchOnReconnect: true, // Refetch when reconnecting
    onLoading: (isLoading) => console.log('Loading:', isLoading),
    onRequest: (response) => console.log('Data received:', response)
  })

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <button onClick={() => refetch()}>Refresh</button>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  )
}
```

### Mutations

Use the `useMutation` hook for data modifications:

```tsx
function CreateUserForm() {
  const createUser = api.users.create.useMutation({
    // Optional configuration
    defaultValues: { name: '', email: '' },
    onLoading: (isLoading) => console.log('Loading:', isLoading),
    onRequest: (response) => console.log('Created user:', response)
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createUser.mutate({
        body: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      })
      // Handle success
    } catch (error) {
      // Handle error
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={createUser.loading}>
        {createUser.loading ? 'Creating...' : 'Create User'}
      </button>
    </form>
  )
}
```

### Cache Invalidation

Invalidate queries manually or automatically after mutations:

```tsx
function AdminPanel() {
  const queryClient = useIgniterQueryClient()

  // Invalidate specific queries
  const invalidateUsers = () => {
    queryClient.invalidate('users.list')
  }

  // Invalidate multiple queries
  const invalidateAll = () => {
    queryClient.invalidate([
      'users.list',
      'users.get'
    ])
  }

  return (
    <button onClick={invalidateUsers}>
      Refresh Users
    </button>
  )
}
```

### Automatic Type Inference

The client provides full type inference for your API:

```typescript
// All these types are automatically inferred
type User = InferOutput<typeof api.users.get>
type CreateUserInput = InferInput<typeof api.users.create>
type QueryKeys = InferCacheKeysFromRouter<typeof router>

// TypeScript will show errors for invalid inputs
api.users.create.useMutation({
  onRequest: (data) => {
    data.id // ✅ Typed as string
    data.invalid // ❌ TypeScript error
  }
})
```

## Store Adapters

Igniter.js provides powerful store adapters for caching, session management, and pub/sub messaging. The Redis adapter is the recommended choice for production applications.

### Redis Store Adapter

Set up Redis store for caching and real-time features:

```typescript
// src/services/store
import { createRedisStoreAdapter } from "@igniter-js/core/adapters";

/**
 * Store adapter for data persistence
 * @description Provides a unified interface for data storage operations
 */
///
export const store = createRedisStoreAdapter({ store });

// src/igniter.context
// ...another services
import { store } from "@/services/store"

/**
 * @description Create the context of the application
 * @see https://igniter.felipebarcelospro.github.io/docs/getting-started/installation
 */
export const createIgniterAppContext = () => {
  return {
    // ...another services
    store,
  }
}
// @/igniter.context.ts
```

### Using Store in Actions

Access the store in your actions and procedures:

```typescript
import { igniter } from '@/igniter.ts' 

const cacheExample = igniter.query({
  path: '/cache-demo',
  handler: async ({ request, response, context }) => {
    // Cache operations
    await igniter.store.set('user:123', { name: 'John' }, { ttl: 3600 });
    const user = await igniter.store.get('user:123');
    
    // Atomic operations
    const counter = await igniter.store.increment('page:views');
    
    // Check existence
    const exists = await igniter.store.has('user:123');
    
    return response.success({ user, counter, exists });
  }
});
```

### Pub/Sub Messaging

Use Redis pub/sub for real-time communication:

```typescript
import { igniter } from '@/igniter.ts'

const realtimeHandler = igniter.mutation({
  path: '/notify',
  body: z.object({
    userId: z.string(),
    message: z.string()
  }),
  handler: async ({ request, response, context }) => {
    const { userId, message } = request.body;
    
    // Publish to user-specific channel
    await igniter.store.publish(`user:${userId}`, {
      type: 'notification',
      message,
      timestamp: new Date()
    });
    
    return response.success({ sent: true });
  }
});

// Subscribe to events (typically in a separate service)
await igniter.store.subscribe('user:123', (message) => {
  console.log('Received notification:', message);
});
```

## Background Jobs

Igniter.js includes a powerful job queue system built on BullMQ for handling background tasks, scheduled jobs, and long-running processes.

### Setup Job Queue

Configure the job system with Redis:

```typescript
// src/services/store
import { createBullMQAdapter } from "@igniter-js/core/adapters";

/**
 * Store adapter for data persistence
 * @description Provides a unified interface for data storage operations
 */
///
const jobs = createBullMQAdapter({
  store: redisStore,
  globalPrefix: 'igniter-app', // Optional: for multi-tenancy
  queueOptions: {
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 50,
    }
  }
});

// src/igniter.context
// ...another services
import { jobs } from "@/services/store"

/**
 * @description Create the context of the application
 * @see https://igniter.felipebarcelospro.github.io/docs/getting-started/installation
 */
export const createIgniterAppContext = () => {
  return {
    // ...another services
    jobs,
  }
}
// @/igniter.context.ts
```

### Define Jobs

Create type-safe job definitions:

```typescript
// jobs/email-jobs.ts
import { z } from 'zod';

export const emailJobs = {
  sendWelcomeEmail: igniter.jobs.register({
    name: 'Send Welcome Email',
    input: z.object({
      userId: z.string(),
      email: z.string().email(),
      name: z.string()
    }),
    handler: async ({ request, response, context }) => {
      const { userId, email, name } = payload;
      
      // Send email using your email service
      await igniter.email.send({
        to: email,
        subject: 'Welcome!',
        template: 'welcome',
        data: { name }
      });
      
      // Log the action
      igniter.logger.info('Welcome email sent', { userId, email });
      
      return { emailId: 'email_123', sentAt: new Date() };
    },
    options: {
      queue: { name: 'emails' },
      attempts: 3,
      removeOnComplete: 100
    }
  }),

  sendDigest: {
    name: 'Send Daily Digest',
    payload: z.object({
      frequency: z.enum(['daily', 'weekly'])
    }),
    run: async ({ payload, ctx }) => {
      // Generate and send digest
      return { processed: true };
    },
    options: {
      defaultOptions: {
        repeat: {
          cron: '0 9 * * *', // Daily at 9 AM
          tz: 'America/New_York'
        }
      }
    }
  }
};
```

### Register and Use Jobs

Register jobs with the system and invoke them:

```typescript
// Register jobs at startup
await igniter.jobs.register(emailJobs);

// Use in actions
const signupAction = igniter.mutation({
  path: '/signup',
  body: z.object({
    email: z.string().email(),
    name: z.string()
  }),
  handler: async (ctx) => {
    const { email, name } = ctx.request.body;
    
    // Create user in database
    const user = await ctx.providers.database.user.create({
      data: { email, name }
    });
    
    // Queue welcome email job
    const jobId = await ctx.jobs.invoke({
      id: 'sendWelcomeEmail',
      payload: {
        userId: user.id,
        email: user.email,
        name: user.name
      },
      options: {
        delay: 5000, // Send after 5 seconds
        priority: 1   // High priority
      }
    });
    
    return ctx.response.created({ 
      user, 
      welcomeEmailJob: jobId 
    });
  }
});
```

### Job Management

Search and manage jobs:

```typescript
const jobsController = igniter.controller({
  path: '/admin/jobs',
  actions: {
    list: igniter.query({
      path: '/',
      query: z.object({
        status: z.enum(['waiting', 'active', 'completed', 'failed']).optional(),
        limit: z.number().max(100).default(20)
      }),
      handler: async ({ request, response, context }) => {
        const { status, limit } = request.query;
        
        const jobs = await igniter.jobs.search({
          filter: {
            status: status ? [status] : undefined,
            limit,
            orderBy: 'timestamp:desc'
          }
        });
        
        return ctx.response.success({ jobs });
      }
    })
  }
});
```

### Worker Configuration

Set up workers to process jobs:

```typescript
// workers/email-worker.ts
import { igniter } from '@/igniter';

// Start worker
await igniter.jobs.worker({
  queues: ['emails', 'notifications'],
  concurrency: 5, // Process 5 jobs in parallel
  onActive: ({ job }) => {
    console.log(`Processing job: ${job.name}`);
  },
  onSuccess: ({ job, result }) => {
    console.log(`Job completed: ${job.name}`, result);
  },
  onFailure: ({ job, error }) => {
    console.error(`Job failed: ${job.name}`, error.message);
  }
});
```

## Structured Logging

Igniter.js provides a flexible logging system with multiple adapters for different output targets.

### Console Logger

The built-in console logger with colorization and structured output:

```typescript
import { createConsoleLogger, IgniterLogLevel } from "@igniter-js/core/adapters";

const logger = createConsoleLogger({
  level: IgniterLogLevel.INFO,
  colorize: true, // Enable colors in development
  context: { service: 'api' } // Base context for all logs
});

const igniter = Igniter
  .context<AppContext>()
  .logger(logger)
  .create();
```

### Using Logger in Actions

Access structured logging in your handlers:

```typescript
const userAction = igniter.query({
  path: '/users/:id',
  handler: async ({ request, response, context }) => {
    const { id } = request.params;
    
    // Log with context
    igniter.logger.info('Fetching user', { userId: id });
    
    try {
      const user = await igniter.database.user.findUnique({
        where: { id }
      });
      
      if (!user) {
        ctx.logger.warn('User not found', { userId: id });
        return ctx.response.notFound('User not found');
      }
      
      igniter.logger.info('User fetched successfully', { 
        userId: id, 
        userEmail: user.email 
      });
      
      return response.success({ user });
    } catch (error) {
      logger.error('Failed to fetch user', { userId: id }, error);
      throw error;
    }
  }
});
```

### Child Loggers

Create child loggers with additional context:

```typescript
const authProcedure = igniter.procedure({
  handler: async (, { request, response, context }) => {
    const token = request.headers.get('authorization');
    
    if (!token) {
      return response.unauthorized();
    }
    
    const user = await verifyToken(token);
    
    // Create child logger with user context
    const userLogger = igniter.logger.child({
      userId: user.id,
      userEmail: user.email
    });
    
    userLogger.info('User authenticated');
    
    return { 
      user,
      logger: userLogger // Pass to actions
    };
  }
});
```

### Log Levels

Available log levels in order of severity:

```typescript
igniter.logger.fatal('System crash', { error: 'critical' });  // Most severe
igniter.logger.error('Request failed', { statusCode: 500 });
igniter.logger.warn('Deprecated API used', { endpoint: '/old-api' });
igniter.logger.info('Request processed', { duration: '120ms' });
igniter.logger.debug('Cache hit', { key: 'user:123' });       // Development
igniter.logger.trace('Function entry', { function: 'handler' }); // Most verbose
```

### Server Actions (Next.js App Router)

Use direct server calls with React Server Components:

```tsx
// app/users/page.tsx
import { api } from '@/igniter.client'

export default async function UsersPage() {
  const users = await api.users.list.query()
  
  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  )
}
```

Use with Server Actions:

```tsx
// app/users/actions.ts
'use server'

import { api } from '@/igniter.client'

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string

  return api.users.create.query({
    body: { name, email }
  })
}

// app/users/create-form.tsx
export function CreateUserForm() {
  return (
    <form action={createUser}>
      <input name="name" />
      <input name="email" type="email" />
      <button type="submit">Create User</button>
    </form>
  )
}
```

Combine Server and Client Components:

```tsx
// app/users/hybrid-page.tsx
import { api } from '@/igniter.client'

// Server Component
async function UsersList() {
  const users = await api.users.list.query()
  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  )
}

// Client Component
'use client'
function UserCount() {
  const { count } = api.users.count.useQuery()
  return <div>Total Users: {count}</div>
}

// Main Page Component
export default function UsersPage() {
  return (
    <div>
      <UserCount />
      <Suspense fallback={<div>Loading...</div>}>
        <UsersList />
      </Suspense>
    </div>
  )
}
```

### Performance Optimization

- **Caching Strategy**: Configure caching behavior per query
- **Automatic Revalidation**: Keep data fresh with smart revalidation
- **Prefetching**: Improve perceived performance
- **Optimistic Updates**: Provide instant feedback
- **Parallel Queries**: Handle multiple requests efficiently

### Error Handling and Recovery

```typescript
function UserProfile() {
  const { data, error, retry } = api.users.get.useQuery({
    onError: (error) => {
      console.error('Failed to fetch user:', error)
    },
    retry: 3, // Retry failed requests
    retryDelay: 1000, // Wait 1 second between retries
  })

  if (error) {
    return (
      <div>
        Error loading profile
        <button onClick={retry}>Try Again</button>
      </div>
    )
  }

  return <div>{/* ... */}</div>
}
```

## Advanced Usage

### Server-Side Rendering

Use direct server calls with React Server Components:

```tsx
// app/users/page.tsx
import { api } from '@/igniter.client'

export default async function UsersPage() {
  const users = await api.users.list.query()
  
  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  )
}
```

### Testing

Igniter.js is designed with testability in mind:

```typescript
import { router } from '@/igniter.router'

describe('User API', () => {
  it('should create a user', async () => {
    const result = await router.users.create.mutate({
      body: {
        name: 'Test User',
        email: 'test@example.com'
      }
    })

    expect(result.status).toBe(201)
    expect(result.data).toHaveProperty('id')
  })
})
```

### Security Best Practices

- Use procedures for authentication and authorization
- Implement rate limiting
- Validate all inputs
- Use secure cookie options
- Handle errors safely
- Implement CORS properly

### Performance Monitoring

```typescript
import { igniter } from '@/igniter'

const monitor = igniter.procedure({
  handler: async (_, ctx) => {
    const start = performance.now()
    
    // Wait for the next middleware/handler
    const result = await ctx.next()
    
    const duration = performance.now() - start
    console.log(`${ctx.request.method} ${ctx.request.path} - ${duration}ms`)
    
    return result
  }
})
```

## Adapters

Igniter.js features a modular adapter system for integrating with different services and frameworks. All adapters are available through the `@igniter-js/core/adapters` import.

### Available Adapters

```typescript
import {
  // Server Adapters
  nextRouteHandlerAdapter,  // Next.js App Router integration
  createMcpAdapter,         // Model Context Protocol server
} from "@igniter-js/core/adapters";
```

### Server Adapters

#### Next.js Route Handlers

Seamlessly integrate with Next.js App Router:

```typescript
// app/api/v1/[[...all]]/route.ts
import { AppRouter } from '@/igniter.router';
import { nextRouteHandlerAdapter } from '@igniter-js/core/adapters';

export const { GET, POST, PUT, DELETE, PATCH } = nextRouteHandlerAdapter(AppRouter);
```

#### MCP (Model Context Protocol) Support

Create MCP servers for AI integration:

```typescript
// app/api/mcp/[transport]
import { createMcpAdapter } from '@igniter-js/core/adapters';
import { AppRouter } from '@/igniter.router.ts'

const mcpHandler = createMcpAdapter(AppRouter, {
  // Optional custom context function with automatic type inference
  context: async (req) => ({
    context: { user: await getUser(req) },
    tools: [],
    request: req,
    timestamp: Date.now(),
    client: req.headers.get('user-agent') || 'unknown'
  }),

  // Optional event handlers
  events: {
    onToolCall: (name, args, ctx) => {
      console.log(`Tool ${name} called with args:`, args);
    },
    onToolSuccess: (name, result, duration, ctx) => {
      console.log(`Tool ${name} succeeded in ${duration}ms`);
    }
  },

  // Optional server configuration
  serverInfo: {
    name: 'My MCP Server',
    version: '1.0.0'
  },

  // Optional custom instructions
  instructions: 'You have access to tools from the Igniter router.',

  // Optional adapter configuration
  adapter: {
    basePath: '/api/mcp',
    maxDuration: 60,
    verboseLogs: true
  }
});

// Export for Next.js route handlers
export { mcpHandler as GET, mcpHandler as POST };


```

### Connect with MCP-Compatible Clients

#### Cursor Desktop
1. Open Cursor Desktop
2. Go to Settings > AI > Custom MCP Server
3. Enter your server URL: `http://localhost:3000/api/mcp/sse`
4. Click "Test Connection" to verify setup

#### Claude Desktop
1. Open Claude Desktop
2. Go to Settings > Advanced > Custom MCP Server
3. Enter your server URL: `http://localhost:3000/api/mcp/sse`
4. Click "Connect" to test the connection

#### Other MCP Clients
You can connect any MCP-compatible client using:

- SSE Endpoint: `http://localhost:3000/api/mcp/sse`
- WebSocket Endpoint: `ws://localhost:3000/api/mcp/ws`

Some popular MCP clients include:
- CopilotKit's Open MCP Client
- Windsurf
- Blender MCP
- Ghidra MCP

For more MCP clients and servers, check out [MCP Repository](https://mcprepository.com)

### Adapter Architecture

Adapters follow a consistent pattern:

1. **Server Adapters**: Connect Igniter.js to HTTP frameworks
2. **Store Adapters**: Provide storage and caching capabilities  
3. **Queue Adapters**: Handle background job processing
4. **Logger Adapters**: Structured logging output

All adapters are optional and can be mixed and matched based on your needs.

## TypeScript Configuration

Recommended `tsconfig.json` settings:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "CommonJS",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## Contributing

We welcome contributions! Please see our [contributing guidelines](CONTRIBUTING.md) for details.

## Support and Community

- 📚 [Documentation](https://felipebarcelospro.github.io/igniter-js)
- 🐛 [Issue Tracker](https://github.com/felipebarcelospro/igniter-js/core/issues)
- 🤝 [Contributing Guidelines](CONTRIBUTING.md)

## License

MIT License - see the [LICENSE](LICENSE) file for details.