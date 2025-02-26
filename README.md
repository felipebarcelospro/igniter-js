# Igniter

[![npm version](https://img.shields.io/npm/v/@igniter-js/core.svg?style=flat)](https://www.npmjs.com/package/@igniter-js/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Igniter is a modern, type-safe HTTP framework designed to streamline the development of scalable TypeScript applications. It combines the flexibility of traditional HTTP frameworks with the power of full-stack type safety, making it the ideal choice for teams building robust web applications.

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

### Quick Start Guide

Building an API with Igniter is straightforward and intuitive. Here's how to get started:

## Project Structure

Igniter promotes a feature-based architecture that scales with your application:

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

import { Igniter } from "@igniter-js/core";
import type { IgniterAppContext } from "./igniter.context";

/**
 * @description Initialize the Igniter Router
 * @see https://igniter.felipebarcelospro.github.io/docs/getting-started/installation
 */
export const igniter = Igniter.context<IgniterAppContext>().create()
```

### 2. Define your App Global Context
```typescript
// src/igniter.context
import { prisma } from "@/lib/db";
import { Invariant } from "@/utils";

/**
 * @description Create the context of the application
 * @see https://igniter.felipebarcelospro.github.io/docs/getting-started/installation
 */
export const createIgniterAppContext = () => {
  return {
    providers: {
      database: prisma,
      rules: Invariant.initialize('Igniter')
    }
  }
}

/**
 * @description The context of the application
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
        return ctx.response.success({
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
      handler: async (ctx) => {
        const { name, email } = ctx.request.body
        
        return ctx.response.created({
          id: '1',
          name,
          email
        })
      }
    })
  }
})
```

### 4. Initialize Igniter Router with your framework

```typescript
// src/igniter.router.ts
import { igniter } from '@/igniter'
import { userController } from '@/features/user'

export const AppRouter = igniter.router({
  baseURL: 'http://localhost:3000',
  basePATH: '/api/v1',
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
import { nextRouteHandlerAdapter } from '@igniter-js/core/adapters/next'

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

const auth = igniter.procedure({
  handler: async (_, ctx) => {
    const token = ctx.request.headers.get('authorization')
    if (!token) {
      return ctx.response.unauthorized()
    }
    
    const user = await verifyToken(token)
    return { user }
  }
})

// Use in actions
const protectedAction = igniter.query({
  path: '/protected',
  use: [auth()],
  handler: (ctx) => {
    // ctx.context.user is typed!
    return ctx.response.success({ user: ctx.context.user })
  }
})
```

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

Igniter provides a robust response system:

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
handler: async (ctx) => {
  // Set cookies
  await ctx.response.setCookie('session', 'value', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  })

  // Set signed cookies
  await ctx.response.setSignedCookie('token', 'sensitive-data', 'secret-key')

  // Get cookies
  const session = ctx.request.cookies.get('session')
  const token = await ctx.request.cookies.getSigned('token', 'secret-key')
}
```

## React Client Integration

The Igniter React client provides a seamless integration with your frontend:

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
 * This client provides access to the Igniter query functions
 * and handles data fetching with respect to the application router.
 * It will enable the necessary hooks for query management.
 */
export const useQueryClient = useIgniterQueryClient<typeof AppRouter>;
```

Then, wrap your app with the Igniter provider:

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

### Server Actions (Next.js App Router)

Use direct server calls with React Server Components:

```tsx
// app/users/page.tsx
import { api } from '@/igniter.client'

export default async function UsersPage() {
  const users = await api.users.list.call()
  
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

  return api.users.create.call({
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
  const users = await api.users.list.call()
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
  const users = await api.users.list.call()
  
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

Igniter is designed with testability in mind:

```typescript
import { router } from '@/igniter.router'

describe('User API', () => {
  it('should create a user', async () => {
    const result = await router.users.create.call({
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

- 📚 [Documentation](https://felipebarcelospro.github.io/igniter)
- 💬 [Discord Community](https://discord.gg/igniter)
- 🐛 [Issue Tracker](https://github.com/igniter/core/issues)
- 🤝 [Contributing Guidelines](CONTRIBUTING.md)

## License

MIT License - see the [LICENSE](LICENSE) file for details.
