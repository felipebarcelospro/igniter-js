# Igniter Framework

[![npm version](https://img.shields.io/npm/v/@igniter/core.svg?style=flat)](https://www.npmjs.com/package/@igniter/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, type-safe, and flexible HTTP framework for building scalable APIs with TypeScript.

## Features

- 🎯 **Full TypeScript Support**: End-to-end type safety from your API routes to your client code
- 🚀 **Modern Architecture**: Built with modern TypeScript features and best practices
- 🔒 **Type-Safe Routing**: Route parameters and query strings are fully typed
- 🔌 **Middleware System**: Powerful and flexible middleware support with full type inference
- 🎭 **Context Sharing**: Share context between middlewares and route handlers
- 🔄 **Built-in Error Handling**: Comprehensive error handling with type-safe error responses
- 🍪 **Cookie Management**: Built-in cookie handling with signing support
- 📦 **Framework Agnostic**: Works with any Node.js framework (Express, Fastify, Next.js, etc.)

## Installation

```bash
npm install @igniter/core
# or
yarn add @igniter/core
# or
pnpm add @igniter/core
# or
bun add @igniter/core
```

## Quick Start

Here's a simple example to get you started:

```typescript
import { Igniter } from '@igniter/core'
import { z } from 'zod'

// Define your application context type
type AppContext = {
  user?: {
    id: string
    name: string
  }
}

// Initialize Igniter with your context type
const api = Igniter
  .context<AppContext>()
  .create()

// Create an authentication middleware
const auth = api.procedure({
  handler: async (_, ctx) => {
    const token = ctx.request.headers.get('authorization')
    if (!token) {
      return ctx.response.unauthorized()
    }
    
    return {
      user: {
        id: '1',
        name: 'John Doe'
      }
    }
  }
})

// Create a users controller
const usersController = api.controller({
  path: 'users',
  actions: {
    // Query action (GET)
    list: api.query({
      path: '',
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
    create: api.mutation({
      path: '',
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

// Create and configure the router
const router = api.router({
  endpoint: '/api/v1',
  controllers: {
    users: usersController
  }
})

// Use with any HTTP framework
// Example with Express:
app.use(async (req, res) => {
  const response = await router.handler(req)
  res.status(response.status).json(response)
})
```

## Core Concepts

### Context

The context system allows you to share data between middlewares and route handlers:

```typescript
type AppContext = {
  db: Database
  user?: User
}

const api = Igniter
  .context<AppContext>()
  .create()
```

### Procedures (Middleware)

Create reusable middleware with full type safety:

```typescript
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
  path: 'protected',
  use: [auth()],
  handler: (ctx) => {
    // ctx.context.user is typed!
    return ctx.response.success({ user: ctx.context.user })
  }
})
```

### Controllers

Group related actions together:

```typescript
const usersController = igniter.controller({
  path: 'users',
  actions: {
    list: igniter.query({
      path: '',
      handler: (ctx) => ctx.response.success({ users: [] })
    }),
    
    get: igniter.query({
      path: ':id',
      handler: (ctx) => {
        // ctx.request.params.id is typed!
        return ctx.response.success({ user: { id: ctx.request.params.id } })
      }
    })
  }
})
```

### Type-Safe Responses

Built-in response helpers with proper typing:

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
  ctx.response
    .status(418)
    .setHeader('X-Custom', 'value')
    .json({ message: "I'm a teapot" })
}
```

### Cookie Management

Built-in cookie handling with signing support:

```typescript
handler: async (ctx) => {
  // Set cookies
  await ctx.request.cookies.set('session', 'value', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  })

  // Set signed cookies
  await ctx.request.cookies.setSigned('token', 'sensitive-data', 'secret-key')

  // Get cookies
  const session = ctx.request.cookies.get('session')
  const token = await ctx.request.cookies.getSigned('token', 'secret-key')
}
```

## Advanced Usage

### Direct Controller Calls

Call controller actions directly from server-side code:

```typescript
const result = await router.processor.call(
  'users', // controller name
  'create', // action name
  {
    body: {
      name: 'John',
      email: 'john@example.com'
    }
  }
)
```

### Custom Error Handling

Create custom error responses:

```typescript
ctx.response.error({
  status: 400,
  code: 'VALIDATION_ERROR',
  message: 'Invalid input',
  data: { field: 'email' }
})
```

### File Uploads

Handle file uploads with built-in multipart support:

```typescript
const uploadAction = api.mutation({
  path: 'upload',
  method: 'POST',
  handler: async (ctx) => {
    const formData = await ctx.request.body
    const file = formData.get('file')
    // Handle file upload...
    return ctx.response.success({ fileId: '123' })
  }
})
```

## Framework Integration

### Next.js Integration

```typescript
// app/api/v1/[[...all]]/route.ts
import { router } from '../../../api/router'
import { nextRouteHandlerAdapter } from '@igniter/core/adapters/next'

export const { GET, POST, PUT, DELETE } = nextRouteHandlerAdapter(router)
```

### Express Integration

```typescript
import { router } from './api/router'

import express from 'express'

const app = express()

app.use(async (req, res) => {
  const response = await router.handler(req)
  return response
})
```

## React Client

The Igniter Framework includes a powerful React client with built-in hooks for data fetching, mutations, and real-time updates.

### Setup

First, create your API client:

```typescript
// api/client.ts
import { createIgniterClient } from '@igniter/core'
import { router } from './router'

export const api = createIgniterClient({
  endpoint: '/api/v1',
  router: router
})
```

Then, wrap your app with the Igniter provider:

```tsx
// app/providers.tsx
import { IgniterProvider } from '@igniter/core'

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
import { api } from '@/api/client'

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
import { api } from '@/api/client'

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

import { api } from '@/api/client'

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
import { api } from '@/api/client'

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

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📚 [Documentation](https://felipebarcelospro.github.io/igniter)
- 💬 [Discord Community](https://discord.gg/igniter)
- 🐛 [Issue Tracker](https://github.com/igniter/core/issues)
- 🤝 [Contributing Guidelines](CONTRIBUTING.md)
