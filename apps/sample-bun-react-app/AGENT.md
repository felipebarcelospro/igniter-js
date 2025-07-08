> **AI Agent Instructions:**
> This document is your comprehensive guide to the Igniter.js framework. Use it as the single source of truth for understanding its philosophy, architecture, features, and usage patterns.
>
> ### Core Philosophy
> 1.  **Typesafety First**: Every feature is designed to maximize TypeScript's inference. Your primary goal is to generate code that is robust and compile-time safe. If it compiles, it should work.
> 2.  **AI Friendly**: The framework's structure, clear conventions, and strong typing are explicitly designed for seamless collaboration with AI agents like yourself. Adhere to these conventions.
> 3.  **Developer Experience (DX)**: Strive to create code that is not only functional but also easy to read, maintain, and extend. The framework should feel powerful and cohesive, abstracting away implementation details where possible.
>
> ### Foundational Knowledge
> 1.  **The Builder is the Start**: All applications begin with the `Igniter` builder. It's the root for defining context, middleware, and plugins.
> 2.  **Building Blocks**: API endpoints are `Actions` (Queries/Mutations), grouped into `Controllers`.
> 3.  **Reusability**: `Procedures` (middleware) are for cross-cutting concerns (e.g., auth, logging).
> 4.  **Dependency Injection**: The `Context` is the primary DI mechanism for services like database connections.
> 5.  **The Router**: The `Router` ties everything together, producing the final `handler` and a server-side `$caller`.
>
> ### Code Generation & Explanation
> 1.  **API Creation**: When creating APIs, follow the **feature-sliced architecture** from the `README.md`:
>     *   `igniter.ts` (Core Instance)
>     *   `igniter.context.ts` (Context Definition)
>     *   `features/[name]/...` (Self-contained feature with controllers, procedures, types)
>     *   `igniter.router.ts` (Router Assembly)
> 2.  **Client-Side**: For frontend code, always use the React hooks (`useQuery`, `useMutation`) from the created `api` client, all within an `<IgniterProvider>`. Emphasize that the provider is essential.
> 3.  **Branded Features**: Refer to core systems by their branded names:
>     *   **Igniter.js Queues**: For non-blocking, background jobs. Explain that it uses a driver-based approach (e.g., BullMQ).
>     *   **Igniter.js Store**: For caching and pub/sub messaging.
>     *   **Igniter.js Realtime**: For live data and automatic UI updates via SSE.
> 4.  **Middleware (Procedures)**: Use the `igniter.procedure({ handler: (options, ctx) => ... })` syntax. Explain how the handler's return value modifies the context.
> 5.  **Validation**: For request *structure* (body, query), use schema validation (e.g., Zod). For runtime *business logic* validation (e.g., checking if a user exists, permissions), use the **Igniter.js Ensure** service.
> 6.  **CLI**: When asked about project setup, explain the `igniter init` command. For running the dev server, describe the `igniter dev --interactive` command and its dashboard features.

---

# Igniter.js Project Overview

**Motto:** The AI-Friendly, Typesafe Framework for Modern TypeScript Applications.

## 1. What is Igniter.js?

Igniter.js is a modern, full-stack TypeScript framework designed for building scalable, maintainable, and highly type-safe web APIs and applications. It combines the best features of modern API development patterns (like those seen in tRPC) with a flexible, modular architecture that is not tied to any specific frontend framework.

Its primary goal is to provide an exceptional developer experience (DX) through end-to-end type safety, allowing you to share and infer types between your server and client without manual code generation or duplication.

## 2. Core Philosophy

*   **Typesafety First**: Every feature is designed to maximize TypeScript's inference capabilities. From API routes and background jobs to plugins and client-side hooks, the goal is to ensure that if your code compiles, it works as expected.
*   **AI Friendly**: The framework's structure, clear conventions, and comprehensive type system are explicitly designed to be easily understood and utilized by AI code generation agents.

## 3. Key Features

Igniter.js is more than just a router; it's a comprehensive ecosystem for building robust applications.

| Feature                    | Description                                                                                                                                                            |
| :------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **End-to-End Typesafe RPC**| Define your API controllers once on the server, and get fully-typed client-side callers (`useQuery`, `useMutation`) for free.                                         |
| **Builder-based API**      | A fluent, chainable API (`Igniter.context(...).create()`) guides you through setup, ensuring all components are configured correctly.                                   |
| **Igniter.js Plugins**     | A powerful system to extend the framework with self-contained, reusable modules. Plugins can add new routes, middleware, context, and their own type-safe actions.      |
| **Igniter.js Queues**      | A first-class system for defining, scheduling, and running background jobs using drivers like BullMQ (Redis).                                                             |
| **Igniter.js Realtime**    | A centralized Server-Sent Events (SSE) processor that makes it simple to add real-time functionality, like notifications and automatic UI updates.                      |
| **Framework Agnostic**     | Built on standard `Request` and `Response` Web APIs, making it compatible with any modern web framework (Next.js, Express, Hono, etc.).                                    |
| **Dependency Injection**   | A robust `Context` system allows you to inject dependencies like database connections, loggers, and user session data into your API handlers.                             |

---

# Recommended Project Structure

Igniter.js promotes a feature-based architecture that scales with your application.

```
src/
├── app/
│   └── api/
│       └── v1/
│           └── [[...all]]/
│               └── route.ts              # 6. Next.js Route Handler
├── features/                             # Application features
│   └── [feature]/
│       ├── controllers/                  # 4. Feature controllers
│       │   └── [feature].controller.ts
│       ├── procedures/                   # Feature procedures/middleware
│       ├── [feature].interfaces.ts       # Type definitions
│       └── index.ts                      # Feature exports
├── services/                             # Service initializations (drivers for Igniter.js features)
│   ├── prisma.ts
│   ├── redis.ts
│   ├── store.ts                          # Driver for Igniter.js Store
│   ├── jobs.ts                           # Driver for Igniter.js Queues
│   └── logger.ts
├── igniter.ts                            # 1. Core Igniter initialization
├── igniter.client.ts                     # 7. Client implementation
├── igniter.context.ts                    # 2. Context management
├── igniter.router.ts                     # 5. Router configuration
```

---

# API Creation Guide

### Step 1: Initialize Igniter (`src/igniter.ts`)

```typescript
// src/igniter.ts
import type { IgniterAppContext } from "./igniter.context";
import { Igniter } from "@igniter-js/core";
import { logger } from "@/services/logger";
import { REGISTERED_JOBS } from "@/services/store";
import { jobs } from "@/services/jobs";
import { telemetry } from "@/services/telemetry";

// The Igniter builder, where features are enabled.
export const igniter = Igniter
  // Initialize Igniter.js Context
  .context<IgniterAppContext>()
  // Intialize Igniter.js Logger
  .logger(logger)
  // Enable Igniter.js Store
  .store(store)
  // Enable Igniter.js Queues
  .jobs(REGISTERED_JOBS)
  // Enable Igniter.js Telemetry
  .telemetry(telemetry)
  // Initialize Igniter.js Context
  .create();
```

### Step 2: Define the Application Context (`src/igniter.context.ts`)

```typescript
// src/igniter.context.ts
import { database } from "@/services/prisma";

export const createIgniterAppContext = () => {
  return {
    database,
  };
};

export type IgniterAppContext = ReturnType<typeof createIgniterAppContext>;
```

### Step 3: Create a Feature Controller (`src/features/user/controllers/user.controller.ts`)

```typescript
// src/features/user/controllers/user.controller.ts
import { igniter } from '@/igniter';
import { z } from 'zod';
import { auth } from '@/features/user/procedures/auth.procedure';

export const userController = igniter.controller({
  path: '/users',
  actions: {
    // Query action (GET)
    list: igniter.query({
      path: '/',
      use: [auth({ isAuthRequired: true })],
      query: z.object({ page: z.number().optional() }),
      handler: async ({ response, context }) => {
        const users = await context.database.user.findMany();
        return response.success({ users });
      }
    }),

    // Mutation action (POST)
    create: igniter.mutation({
      path: '/',
      method: 'POST',
      use: [auth({ isAuthRequired: true })],
      body: z.object({ name: z.string(), email: z.string().email() }),
      handler: async ({ request, response, context }) => {
        const { name, email } = request.body;
        igniter.logger.info('Creating new user', { email });

        const user = await context.database.user.create({ data: { name, email } });

        // Use the Igniter.js Store to cache user data
        await igniter.store.set(`user:${user.id}`, user, { ttl: 3600 });

        // Use Igniter.js Queues to send a welcome email in the background
        await igniter.jobs.sendWelcomeEmail.invoke({
            payload: { userId: user.id, email, name }
        });

        // Automatically update clients via Igniter.js Realtime
        return response.created(user).revalidate('users.list');
      }
    })
  }
});
```

### Step 4: Assemble the Router (`src/igniter.router.ts`)

```typescript
// src/igniter.router.ts
import { igniter } from '@/igniter';
import { userController } from '@/features/user/controllers/user.controller';

export const AppRouter = igniter.router({
  baseURL: process.env.NEXT_PUBLIC_IGNITER_APP_URL,
  basePATH: process.env.NEXT_PUBLIC_IGNITER_APP_BASE_PATH,
  controllers: {
    users: userController
  }
});
```

### Step 5: Integrate with Next.js (`src/app/api/v1/[[...all]]/route.ts`)

```typescript
// src/app/api/v1/[[...all]]/route.ts
import { AppRouter } from '@/igniter.router';
import { nextRouteHandlerAdapter } from '@igniter-js/core/adapters';

export const { GET, POST, PUT, DELETE, PATCH } = nextRouteHandlerAdapter(AppRouter);
```

---

# Client-Side Usage with React

### 1. Setup the `IgniterProvider`

Wrap your root application layout. This is mandatory for hooks to work.

```tsx
// app/providers.tsx
'use client';
import { IgniterProvider } from '@igniter-js/core/client';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <IgniterProvider
      // Igniter.js Realtime is enabled by default
      autoReconnect={true}
      // Enable Igniter.js Realtime
      enableRealtime={true}
      // Define your context here
      getContext={() => ({ userId: '123', roles: ['admin'] })}
      // Define your scopes here
      getScopes={(ctx) => [`user:${ctx.userId}`, `user:${ctx.userId}:roles`]}
    >
      {children}
    </IgniterProvider>
  );
}
```

### 2. Create the Type-Safe Client (`src/igniter.client.ts`)

```typescript
// src/igniter.client.ts
import { createIgniterClient, useIgniterQueryClient } from '@igniter-js/core/client';
import type { AppRouter } from './igniter.router'; // Only types


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
  baseURL: 'http://localhost:3000', // Default is http://localhost:3000
  basePath: '/api/v1/', // Default is /api/v1
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
export const useQueryClient = useIgniterQueryClient<AppRouterType>

```

### 3. Fetching Data with `useQuery`

```tsx
import { api } from '@/igniter.client';

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

  if (listUsers.loading) return <div>Loading...</div>;

  return (
    <div>
      {listUsers.data?.users.map(user => <div key={user.id}>{user.name}</div>)}
    </div>
  );
}
```

### 4. Modifying Data with `useMutation`

```tsx
import { api, useQueryClient } from '@/igniter.client';

function CreateUserForm() {
  const queryClient = useQueryClient();

  const createUser = api.users.create.useMutation({
    // Optional configuration
    defaultValues: { name: '', email: '' },
    onLoading: (isLoading) => console.log('Loading:', isLoading),
    onRequest: (response) => console.log('Created user:', response)
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createUser.mutate({ body: { name: 'John Doe', email: 'john@example.com' } });
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={createUser.loading}>
        {createUser.loading ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}
```

---

# Procedures (Middleware)

Procedures provide a powerful way to handle cross-cutting concerns like authentication.

```typescript
// src/features/user/procedures/auth.procedure.ts
import { igniter } from '@/igniter';

type AuthOptions = { isAuthRequired?: boolean }

export const auth = igniter.procedure({
  handler: async (options: AuthOptions, { request, response }) => {
    const token = request.cookies.get('authorization');

    if (!token && options.isAuthRequired) {
      return response.unauthorized();
    }

    const user = await verifyToken(token); // Your token verification logic

    return {
      auth: {
        user,
        signOut: () => {
          request.cookies.delete('authorization');
          // Publish logout event via Igniter.js Store
          igniter.store.publish('user_logged_out', { userId: user.id });
        }
      }
    };
  }
});
```

---

# Advanced Features

## 1. Igniter.js Queues (Background Processing)

**Igniter.js Queues** is a first-class system for defining, scheduling, and running background jobs. This is essential for any task that shouldn't block the user's request, such as sending emails or generating reports. It uses a driver-based architecture, with BullMQ being the recommended driver for production.

### Define and Register Jobs
```typescript
// jobs/email-jobs.ts
import { z } from 'zod';
import { igniter } from '@/igniter';

/**
 * Job queue adapter for background processing
 * @description Handles asynchronous job processing with BullMQ
 */
export const jobs = createBullMQAdapter({
  store,
  autoStartWorker: {
    concurrency: 2,
    debug: true,
  },
})

export const REGISTERED_JOBS = jobs.merge({
  system: jobs.router({
    namespace: 'system',
    jobs: {
      sendWelcomeEmail: jobs.register({
        name: 'sendWelcomeEmail',
        input: z.object({
          userId: z.string(),
          email: z.string().email(),
          name: z.string()
        }),
        handler: async ({ payload, context }) => {
          // Send email using your preferred email service
          context.logger.info('Welcome email sent', { userId: payload.userId });
          return { sentAt: new Date() };
        },
      }),
    },
    onSuccess: (job) => {
      console.log('Job completed', job)
    },
    onFailure: (job) => {
      console.error('Job failed', job)
    },
    onStart: (job) => {
      console.log('Job started', job)
    },
  }),
})
```

### Enqueue Jobs from Actions
```typescript
// In a mutation handler
await igniter.jobs.sendWelcomeEmail.invoke({
  payload: { userId: user.id, email: user.email, name: user.name },
  options: { delay: 1000 } // delay for 1 second
});
```

## 2. Igniter.js Plugins

Plugins are the primary mechanism for creating reusable, modular, and encapsulated functionality. A plugin can provide its own actions, controllers, middleware, and even extend the global context.

```typescript
export const auditPlugin = createIgniterPlugin({
  name: 'audit',
  // Internal actions, not exposed as API endpoints
  actions: {
    logEvent: createIgniterPluginAction({
      input: z.object({ event: z.string() }),
      handler: async ({ input }) => { console.log(`[AUDIT]: ${input.event}`); },
    }),
  },
  // API endpoints exposed by the plugin
  controllers: {
    logs: {
      path: '/logs/:userId',
      handler: async ({ self, request }) => {
        // logic to get logs for request.params.userId
        return self.response.success({ logs: [] });
      }
    },
  },
  // Lifecycle hooks
  hooks: {
    afterRequest: async (ctx, req, res, self) => {
      await self.actions.logEvent({ event: 'request:success' });
    },
  },
});

// Register in the builder
export const igniter = Igniter.context<AppContext>().plugins({ audit: auditPlugin }).create();
```

## 3. Igniter.js Realtime (Live Updates with SSE)

**Igniter.js Realtime** is the built-in engine for real-time communication via Server-Sent Events (SSE).

### Automatic Revalidation

This is the most powerful feature of Igniter.js Realtime. Automatically update client UIs after a mutation.

```typescript
// In a mutation handler
const createPost = igniter.mutation({
  handler: async (ctx) => {
    const newPost = await ctx.context.db.posts.create({ data: ctx.request.body });
    // This tells all clients to refetch queries with the key 'posts.list'.
    return ctx.response
      .created(newPost)
      .revalidate(['posts.list']);
    // You can also revalidate based on scopes.
    // .revalidate(['posts.list'], (ctx) => [`user:${ctx.user.id}`]);
  },
});

// Any client component using this hook will update in real-time automatically.
const { data } = api.posts.list.useQuery();
```

### Custom Data Streams

For features like chat or notification feeds.

```typescript
// 1. Backend: Create a streamable query action
const notificationsStream = igniter.query({
  path: '/notifications',
  stream: true, // Mark this action as a stream
  handler: async (ctx) => ctx.response.success({ status: 'connected' }),
});

// 2. Frontend: Subscribe with useStream
const { data } = api.notifications.stream.useStream({
  onMessage: (newMessage) => { console.log('New notification:', newMessage); }
});

// 3. Backend: Publish to the channel from anywhere
igniter.realtime.publish('notifications.stream', { message: 'Hello!' });
```

---

# Igniter.js Ensure

The **Ensure** service provides type-safe validation and assertion utilities, replacing `if/throw` patterns.

### Usage (as a Plugin)
```typescript
const ensurePlugin = createIgniterPlugin({
  name: 'ensure',
  build: () => Ensure.initialize('MyApp')
});

const igniter = Igniter.context<AppContext>().plugin(ensurePlugin).create();

// Use in handlers
handler: ({ context }) => {
  const user = context.$plugins.ensure.toBeDefined(
    await db.user.find(id),
    'User not found'
  );
  // user is now guaranteed to be non-nullable
  return context.response.success({ user });
}
```

### Key Methods

| Method | Description |
|---|---|
| `toBeNotEmpty(val, msg)` | Ensures value is not null, undefined, or an empty string. |
| `toBeDefined(val, msg)` | Ensures value is not null or undefined, narrowing its type. |
| `toBeValidEmail(val, msg)` | Validates email format. |
| `toMatchPattern(val, regex, msg)` | Validates against a regular expression. |
| `toBeOneOf(val, options, msg)` | Checks if a value is one of the specified options. |

---

# Igniter.js CLI

## `igniter init` Command

An interactive tool for scaffolding new Igniter.js projects.

### Overview
```bash
# Create a new project in a new directory
igniter init my-awesome-api
```

### Features
The `init` command guides you through setting up:
-   **Project Name & Framework Detection**
-   **Igniter.js Features**:
    -   `Igniter.js Store`: For caching, sessions, pub/sub.
    -   `Igniter.js Queues`: For background task processing.
    -   `Igniter.js MCP`: For AI assistant integration.
-   **Database and Docker Compose**

## `igniter dev` Interactive Mode

A powerful interactive dashboard for development.

### How to Use
```bash
# Start in interactive mode
igniter dev --interactive

# Specify the framework to run alongside Igniter's watcher
igniter dev --interactive --framework nextjs
```

### Dashboard Interface

Provides a **static dashboard** that does not scroll, showing real-time status for multiple processes, including a dedicated **API Requests** monitor.

```
Igniter.js Interactive Dashboard
Uptime: 2m 45s | Press h for help

● 1. Igniter  ○ 2. Next.js  ● 3. API Requests

Status: Running | PID: 12345 | Last: 14:30:25
────────────────────────────────────────────────────────
14:30:23 GET  /api/users           200 45ms
14:30:24 POST /api/auth/login      201 120ms
14:30:25 GET  /api/health          200 12ms

1-5: Switch process | Tab: Next | c: Clear logs | r: Refresh | h: Help | q: Quit
```
