<div align="center">
  <h1>🔥 Igniter.js</h1>
  <p><strong>The End-to-End Typesafe Full-stack TypeScript Framework for Humans and AI.</strong></p>

  [![npm version](https://img.shields.io/npm/v/@igniter-js/core.svg?style=flat)](https://www.npmjs.com/package/@igniter-js/core)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
</div>

---

**Igniter.js** is a modern, full-stack TypeScript framework engineered for building scalable, maintainable, and robust web APIs and applications. It was born from the need to eliminate the common friction points in modern development: API versioning, manual type synchronization between frontend and backend, and complex boilerplate. By combining the best patterns from tools like tRPC with a flexible, modular architecture, Igniter.js lets you build with confidence and speed.

The core promise is a seamless **Developer Experience (DX)** centered around **end-to-end type safety**. Define your logic once on the server, and immediately get fully-typed, auto-completable clients for your web or React Native application without any code generation steps. This means you can refactor your API and your frontend code will instantly show TypeScript errors if something breaks, catching bugs before they ever reach your users.

## Core Philosophy

Our philosophy is built on three pillars that guide every design decision within the framework.

*   #### Typesafety First: Write Code That Just Works
    We believe your compiler should be your first line of defense. Every feature in Igniter.js, from API routes and background jobs to real-time events and plugins, is designed to maximize TypeScript's static analysis and inference. The goal is simple: **if it compiles, it should work as expected.** This approach drastically reduces runtime errors, simplifies debugging, and makes refactoring a safe and predictable process. You're not just writing code; you're building a resilient, self-documenting system.

*   #### AI Friendly: Supercharge Your Workflow
    Igniter.js is built for the future of development, where humans and AI collaborate. Its predictable structure, clear conventions, and comprehensive type system create a "low-entropy" environment that AI agents can easily understand, navigate, and modify. This allows you to delegate tasks like creating new endpoints, writing tests, or generating client components, knowing the AI will adhere to the framework's patterns and produce type-safe, high-quality code.

*   #### Developer Experience (DX): Power and Simplicity
    Powerful tools shouldn't be complicated. We focus on creating a cohesive and intuitive API that feels great to use. Through a fluent, builder-based pattern, Igniter.js guides you through the setup process, while high-level abstractions for complex features like job queues and real-time updates let you focus on your business logic, not the underlying implementation. The result is a development process that is both productive and enjoyable.

## Key Features

Igniter.js is an integrated ecosystem, providing all the tools you need to build a modern application out of the box.

| Feature                    | Description                                                                                                                                                            |
| :------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **End-to-End Typesafe RPC**| **Define APIs once, use them everywhere.** Create a controller on your server, and instantly get a fully-typed and auto-completable client for React (`useQuery`, `useMutation`) and server-to-server communication. No schemas to share, no code generation. |
| **Builder-based API**      | A fluent, chainable API (`Igniter.context(...).jobs(...).create()`) guides you through a logical setup process, ensuring all components are configured correctly and your application context is properly typed. |
| **Igniter.js Plugins**     | Extend the framework with **self-contained, reusable modules.** Plugins can add new routes, middleware, context, and their own type-safe actions, making it easy to share functionality across projects or integrate third-party services. |
| **Igniter.js Queues**      | **Offload long-running tasks** with a first-class system for background jobs. Built on a driver-based architecture (e.g., BullMQ), it allows you to define, schedule, and process jobs with full type safety for inputs and outputs. |
| **Igniter.js Realtime**    | **Bring your app to life with live updates.** A centralized Server-Sent Events (SSE) processor makes it trivial to add real-time features. Revalidate client-side queries automatically after a mutation or stream custom data for notifications and live dashboards. |
| **Framework Agnostic**     | **Never get locked in.** Igniter.js is built on the standard Web `Request` and `Response` APIs, making it compatible with any modern runtime or framework, including Next.js, Express, Hono, Bun, and more. |
| **Dependency Injection**   | A robust `Context` system allows you to **inject dependencies** like database connections, loggers, and user session data into your API handlers in a clean, type-safe, and testable way. |

---

## Getting Started: The `init` Command

The fastest way to start a new Igniter.js project is by using the official CLI. The `igniter init` command scaffolds a new project with a production-ready structure, including all the necessary configuration files and optional features.

```bash
# Create a new project in a new directory
npx @igniter-js/cli@latest init my-awesome-api

# Follow the interactive prompts to:
# 1. Choose your framework (Next.js, etc.)
# 2. Enable features like Queues and Realtime.
# 3. Set up a database and Docker Compose file.
```

This will create a new directory `my-awesome-api/` with a complete project structure, ready for you to start building.

### Manual Installation

If you prefer to integrate Igniter.js into an existing project, you can install the core package manually:

```bash
npm install @igniter-js/core zod
# or
yarn add @igniter-js/core zod
# or
pnpm add @igniter-js/core zod
```

You may also need to install peer dependencies for specific drivers:

```bash
# For the Redis driver (used by Store & Queues)
npm install ioredis @igniter-js/adapter-redis
npm install @types/ioredis -D

# For the BullMQ driver (used by Queues)
npm install bullmq @igniter-js/adapter-bullmq
```
---

## Understanding the Project Structure

Igniter.js promotes a **feature-sliced architecture**. This design philosophy is crucial for building scalable and maintainable applications. Instead of organizing your code by technical layers (e.g., separate folders for all controllers, all models, etc.), you group code by business features.

This approach has several advantages:
-   **High Cohesion**: All code related to a specific feature (e.g., "users," "posts") resides in a single directory.
-   **Low Coupling**: Features are self-contained and independent, making them easier to modify or remove without impacting other parts of the application.
-   **Improved Navigation**: It's easier to find what you're looking for because the structure mirrors your application's domain.

Here is the recommended structure generated by `igniter init`:

```
src/
├── app/
│   └── api/
│       └── v1/
│           └── [[...all]]/
│               └── route.ts              # 6. The entry point that connects Igniter.js to your web framework (e.g., Next.js).
├── features/                             # ★ Your application's business logic lives here.
│   └── [feature]/                      # A self-contained module for a business domain (e.g., 'users', 'billing').
│       ├── controllers/                  # 4. Defines the API endpoints (actions) for the feature.
│       │   └── [feature].controller.ts
│       ├── procedures/                   # Reusable middleware specific to this feature (e.g., check ownership).
│       ├── [feature].interfaces.ts       # TypeScript types and Zod schemas for the feature's data.
│       └── index.ts                      # Barrel file that exports the feature's public API (e.g., the controller).
├── services/                             # Initializes and configures external services and drivers.
│   ├── prisma.ts                         # Example: Prisma client setup for your database.
│   ├── redis.ts                          # Example: Redis client setup for caching and queues.
│   ├── store.ts                          # Configures the driver for Igniter.js Store.
│   ├── jobs.ts                           # Configures the driver for Igniter.js Queues.
│   └── logger.ts                         # Configures the application-wide logger.
├── igniter.ts                            # 1. Core Igniter.js instance creation and global configuration.
├── igniter.client.ts                     # 7. Type-safe client for the frontend
├── igniter.context.ts                    # 2. Application context definition
├── igniter.router.ts                     # 5. Router assembly
```

---

## API Creation Guide: A Step-by-Step Walkthrough

This guide will walk you through creating a complete `users` API from scratch. We will follow the feature-sliced architecture to build a feature that includes a reusable authentication procedure, a controller with query and mutation actions, and finally, wiring it all up in the main router.

### Step 1: Initialize Igniter (`src/igniter.ts`)

This file is the heart of your application. It's where you create the core `igniter` instance. Using the builder pattern, you can progressively enable features like logging, background jobs, and a Redis-backed store. Each feature you add here enhances the global `igniter` object and its context.

```typescript
// src/igniter.ts
import type { IgniterAppContext } from "./igniter.context";
import { Igniter } from "@igniter-js/core";
import { logger } from "@/services/logger";
import { store } from "@/services/store";
import { jobs, REGISTERED_JOBS } from "@/services/jobs";
import { telemetry } from "@/services/telemetry";

// The Igniter builder is fluent and type-safe.
// Each method extends the context and capabilities of the `igniter` instance.
export const igniter = Igniter
  // 1. Define the base shape of your application's context.
  //    This makes it type-safe from the start.
  .context<IgniterAppContext>()

  // 2. Register a logger. Now you can use `igniter.logger` anywhere.
  .logger(logger)

  // 3. Enable the Redis-backed store for caching and pub/sub.
  //    This adds `igniter.store` for data operations.
  .store(store)

  // 4. Enable background jobs with defined job routers.
  //    This adds `igniter.jobs` to enqueue and manage jobs.
  .jobs(jobs.merge(REGISTERED_JOBS))

  // 5. (Optional) Add telemetry for monitoring.
  .telemetry(telemetry)

  // 6. Finalize the build process.
  .create();
```

### Step 2: Define the Application Context (`src/igniter.context.ts`)

The context is the dependency injection system for your application. It holds instances of services (like a database connection) that you want to be accessible in your API handlers (`actions`) and `procedures`. This file defines the *base* context. It will be automatically merged with context from procedures and plugins.

```typescript
// src/igniter.context.ts
import { database } from "@/services/database";

/**
 * Creates the base context for every request.
 * This function is called at the beginning of each API request.
 * @returns An object containing dependencies to be injected.
 */
export const createIgniterAppContext = () => {
  // This is where you would instantiate or import your services.
  return {
    database,
    // you could also add other services like:
    // emailService,
    // analytics,
  };
};

// We infer the type directly from the factory function.
// This ensures your context type is always in sync with its implementation.
export type IgniterAppContext = ReturnType<typeof createIgniterAppContext>;
```

### Step 3: Define Feature Types (`src/features/user/user.types.ts`)

It's a good practice to define your Zod schemas and TypeScript types in a dedicated file within your feature slice. This keeps your logic clean and allows you to reuse types across your application.

```typescript
// src/features/user/user.types.ts
import { z } from 'zod';

// Zod schema for creating a user.
// This will be used to validate the incoming request body.
export const UserInput = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  email: z.string().email("Invalid email address."),
});

// We can infer the TypeScript type directly from the Zod schema.
// This avoids type duplication and ensures they are always in sync.
export type UserInput = z.infer<typeof UserInput>;
```

### Step 4: Create a Reusable Procedure (`src/features/user/procedures/auth.procedure.ts`)

Procedures are Igniter.js's middleware. They are perfect for handling cross-cutting concerns like authentication, logging, or adding specific data to the context. Here, we'll create a procedure to check for a user session.

The value returned from a procedure's handler is **merged into the context**, making it available to subsequent procedures and the final API action handler.

```typescript
// src/features/user/procedures/auth.procedure.ts
import { igniter } from '@/igniter';

// This is a simplified example. In a real app, you would
// verify a session token (e.g., a JWT) from a cookie or header.
const getCurrentUser = async () => {
  // Replace with your actual session logic
  return { id: '1', name: 'John Doe', roles: ['admin'] };
};

type AuthOptions = {
  isAuthRequired?: boolean;
};

export const auth = igniter.procedure({
  handler: async (options: AuthOptions, { response }) => {
    const user = await getCurrentUser();

    // If auth is required but there's no user, return an unauthorized error.
    // This stops the request from proceeding further.
    if (options.isAuthRequired && !user) {
      return response.unauthorized('Authentication required.');
    }

    // The returned object is merged into the context.
    // Now, `context.auth.user` will be available in our controller.
    return {
      auth: {
        user,
      },
    };
  },
});
```

### Step 5: Create a Feature Controller (`src/features/user/controllers/user.controller.ts`)

This is where your core business logic lives. A controller groups related API **actions**. An action can be a `query` (for reading data, typically a `GET` request) or a `mutation` (for writing data, typically `POST`, `PUT`, `PATCH`, `DELETE`).

```typescript
// src/features/user/controllers/user.controller.ts
import { igniter } from '@/igniter';
import { z } from 'zod';
import { auth } from '@/features/user/procedures/auth.procedure';
import { UserInput } from '@/features/user/user.types';

export const userController = igniter.controller({
  // Base path for all actions in this controller.
  // Final path will be /api/v1/users (assuming default base path)
  path: '/users',

  // Actions are the individual API endpoints.
  actions: {
    /**
     * A 'query' action to list users.
     * Uses the `auth` procedure to ensure the user is authenticated.
     */
    list: igniter.query({
      path: '/',
      // Use the procedure created in the previous step.
      // TypeScript knows that `context.auth.user` is now available!
      use: [auth({ isAuthRequired: true })],
      // Define and validate query parameters using Zod.
      query: z.object({ page: z.number().optional().default(1) }),
      handler: async ({ response, context, query }) => {
        // The `user` object is typed and available from the `auth` procedure.
        igniter.logger.info(`User ${context.auth.user?.id} is listing users.`);

        const users = await context.database.user.findMany({
          take: 10,
          skip: (query.page - 1) * 10,
        });

        return response.success({ users });
      },
    }),

    /**
     * A 'mutation' action to create a new user.
     * It validates the request body and uses multiple Igniter.js features.
     */
    create: igniter.mutation({
      path: '/',
      method: 'POST',
      // The body schema is defined in a separate types file for reusability.
      body: UserInput,
      handler: async ({ request, response, context }) => {
        const { name, email } = request.body;

        // Use the logger registered in igniter.ts
        igniter.logger.info('Attempting to create new user', { email });

        const user = await context.database.user.create({ data: { name, email } });

        // 1. Use the Igniter.js Store to cache the new user data for an hour.
        await igniter.store.set(`user:${user.id}`, user, { ttl: 3600 });

        // 2. Use Igniter.js Queues to send a welcome email in the background.
        // This doesn't block the API response.
        await igniter.jobs.system.schedule({
          task: 'sendWelcomeEmail',
          delay: 1000,
          input: { userId: user.id, email, name },
        });

        // 3. Use Igniter.js Realtime to notify clients.
        // This tells any client listening to the 'users.list' query to refetch their data.
        return response.created(user).revalidate('users.list');
      },
    }),
  },
});
```

### Step 6: Assemble the Router (`src/igniter.router.ts`)

The router is the final piece on the server side. It imports all your feature controllers and combines them into a single API router. This router object handles incoming requests and serves as the source of truth for the client-side types.

```typescript
// src/igniter.router.ts
import { igniter } from '@/igniter';
import { userController } from '@/features/user/controllers/user.controller';

export const AppRouter = igniter.router({
  // (Optional) Define the base URL and path for your API.
  // These are used for generating absolute URLs and for client-side fetching.
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  basePath: '/api/v1',

  // Register your feature controllers here.
  // The key ('users') becomes the first segment of the client-side path.
  // e.g., `api.users.list.useQuery()`
  controllers: {
    users: userController,
    // posts: postController, // Add other controllers here
  },
});

// Export the type of the router. This is crucial for client-side type inference.
export type AppRouter = typeof AppRouter;
```

### Step 7: Integrate with Your Framework

Finally, expose your `AppRouter` to the web using a framework-specific adapter. Because Igniter.js is built on web standards, this is simple. Here's how to do it with a Next.js App Router route handler.

```typescript
// src/app/api/v1/[[...all]]/route.ts
import { AppRouter } from '@/igniter.router';
import { nextRouteHandlerAdapter } from '@igniter-js/core/adapters';

// The adapter takes your AppRouter and returns a standard Next.js route handler.
// It automatically maps GET, POST, etc., requests to the correct Igniter.js actions.
export const { GET, POST, PUT, DELETE, PATCH } = nextRouteHandlerAdapter(AppRouter);
```

---

## Client-Side Usage with React

Once your API is built, consuming it on the frontend is where the magic of Igniter.js truly shines. You get a fully-typed, auto-completable client that makes fetching and mutating data feel like calling a local function.

### Step 1: Create the Type-Safe Client (`src/igniter.client.ts`)

This file creates your `api` client object. It's a lightweight wrapper that points to your server's `AppRouter` type definition, giving you end-to-end type safety.

```typescript
// src/igniter.client.ts
import { createIgniterClient, useIgniterQueryClient } from '@igniter-js/core/client';
// IMPORTANT: Only import the *type* of your router.
// This prevents the server-side code from being bundled into your client application.
import type { AppRouter } from './igniter.router';

/**
 * The type-safe API client.
 * This object is your gateway to all your API endpoints.
 *
 * - In Server Components: `await api.users.list.query()`
 * - In Client Components: `api.users.list.useQuery()`
 */
export const api = createIgniterClient<AppRouter>({
  // These options configure the base URL for client-side requests.
  // They should match the `baseURL` and `basePath` in your `igniter.router.ts`.
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  basePath: '/api/v1',
});

/**
 * A hook to access the underlying query client instance.
 * Useful for manually invalidating cache or performing other advanced actions.
 */
export const useQueryClient = useIgniterQueryClient<AppRouter>();
```

### Step 2: Setup the `IgniterProvider`

For the client hooks to work, you must wrap your root application layout (or the relevant part of your component tree) with the `IgniterProvider`. This provider manages the client-side cache and handles real-time events.

```tsx
// app/providers.tsx
'use client';

import { IgniterProvider } from '@igniter-js/core/client';
import React from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <IgniterProvider
      // Igniter.js Realtime is enabled by default. Set to `false` to disable.
      enableRealtime={true}
      // Optional: Define client-side context. This can be used by features
      // like Igniter.js Realtime to subscribe to user-specific events.
      getContext={() => {
        // In a real app, you might get this from a client-side auth library.
        const userId = 'user-123';
        return { userId };
      }}
      // Optional: Define scopes for real-time updates.
      // This tells the provider to listen for events on these specific channels.
      getScopes={(ctx) => {
        return [`user:${ctx.userId}`];
      }}
    >
      {children}
    </IgniterProvider>
  );
}

// Then, in your root layout.tsx:
// <Providers>
//   {children}
// </Providers>
```

### Step 3: Fetching Data with `useQuery`

The `useQuery` hook is used for reading data. It handles fetching, caching, revalidation, and error states for you automatically.

```tsx
// src/features/users/components/UsersList.tsx
'use client';

import { api } from '@/igniter.client';

function UsersList() {
  const listUsersQuery = api.users.list.useQuery({
    // Type-safe query parameters! TypeScript will show an error
    // if you pass a parameter that doesn't exist or has the wrong type.
    query: { page: 1 },
    // Options for controlling caching and fetching behavior.
    staleTime: 1000 * 60, // Data is considered fresh for 1 minute.
  });

  // Handle loading state
  if (listUsersQuery.isLoading) {
    return <div>Loading users...</div>;
  }

  // Handle error state
  if (listUsersQuery.isError) {
    return <div>Error: {listUsersQuery.error.message}</div>;
  }

  // Data is fully typed based on your server's response.
  // `listUsersQuery.data.users` is known to be an array of users.
  return (
    <div>
      {listUsersQuery.data.users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

### Step 4: Modifying Data with `useMutation`

The `useMutation` hook is used for creating, updating, or deleting data.

```tsx
// src/features/users/components/CreateUserForm.tsx
'use client';

import { api } from '@/igniter.client';
import { useState } from 'react';
import type { UserInput } from '@/features/users/user.types';

function CreateUserForm() {
  const [formData, setFormData] = useState<UserInput>({
    name: '',
    email: ''
  });

  const createUserMutation = api.users.create.useMutation({
    onRequest: ({ data, error }) => {
      // This function is called when the mutation is successful.
      // The `createdUser` is the typed output from your server action.
      console.log('Successfully created user:', createdUser.name);
      // Because our server action returns `.revalidate('users.list')`,
      // any component using `api.users.list.useQuery()` will automatically update.
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // The `mutate` function is fully typed.
    // TypeScript will enforce that `body` matches the `UserInput` Zod schema.
    createUserMutation.mutate({ body: formData });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... form inputs for name and email ... */}
      <button type="submit" disabled={createUserMutation.isLoading}>
        {createUserMutation.isLoading ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}
```

### Step 5: Manually Invalidating Cache with `useQueryClient`

Sometimes you need to manually refetch data. The `useQueryClient` hook gives you access to the underlying cache, allowing you to invalidate queries and trigger refetches.

```tsx
// src/features/users/components/UserActions.tsx
'use client';

import { useQueryClient } from '@/igniter.client';

function UserActions() {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    // Invalidate the 'users.list' query.
    // This will cause any active `useQuery` hooks for this key
    // to immediately refetch their data.
    queryClient.invalidate('users.list');
  };

  return (
    <button onClick={handleRefresh}>
      Refresh User List
    </button>
  );
}
```
---

### 1. Setup the `IgniterProvider`

Wrap your root application layout with the `IgniterProvider`. This is **mandatory** for all client-side hooks to work, as it manages state, cache, and real-time connections.

```tsx
// app/providers.tsx
'use client';
import { IgniterProvider } from '@igniter-js/core/client';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <IgniterProvider
      // Igniter.js Realtime is enabled by default
      autoReconnect={true}
      enableRealtime={true}
      // Define your context here for features like scoped realtime updates
      getContext={() => ({ userId: '123', roles: ['admin'] })}
      getScopes={(ctx) => [`user:${ctx.userId}`, `user:${ctx.userId}:roles`]}
    >
      {children}
    </IgniterProvider>
  );
}
```

### 2. Create the Type-Safe Client (`src/igniter.client.ts`)

This client connects your frontend to the backend API, enabling end-to-end type safety.

```typescript
// src/igniter.client.ts
import { createIgniterClient, useIgniterQueryClient } from '@igniter-js/core/client';
import type { AppRouter } from './igniter.router'; // Import only the type!
import type { AppRouterType } from './igniter.router';


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

Use the `useQuery` hook to fetch data from a `query` action. It provides automatic caching, revalidation, and state management.

```tsx
import { api } from '@/igniter.client';

function UsersList() {
  const listUsers = api.users.list.useQuery({
    // Optional configuration for fine-tuning behavior
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

  if (listUsers.isLoading) return <div>Loading...</div>;
  if (listUsers.error) return <div>Error: {listUsers.error.message}</div>;

  return (
    <div>
      {/* `listUsers.data.users` is fully typed from your backend! */}
      {listUsers.data?.users.map(user => <div key={user.id}>{user.name}</div>)}
    </div>
  );
}
```

### 4. Modifying Data with `useMutation`

Use the `useMutation` hook to call `mutation` actions.

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
    // The `body` object is fully typed based on the Zod schema in the backend.
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

## Advanced Features

### Procedures (Middleware)

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

### Igniter.js Queues (Background Processing)

**Igniter.js Queues** is a first-class system for defining, scheduling, and running background jobs. This is essential for any task that shouldn't block the user's request, such as sending emails or generating reports. It uses a driver-based architecture, with BullMQ being the recommended driver for production.

#### Define and Register Jobs

```typescript
// jobs/email-jobs.ts
import { z } from 'zod';
import { igniter } from '@/igniter';
import { jobs } from '@/services/jobs'; // Assuming this is your createBullMQAdapter instance

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
    // Define lifecycle hooks for this group of jobs
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
This `REGISTERED_JOBS` object is then passed to the `.jobs()` method in the `igniter.ts` builder.

#### Enqueue Jobs from Actions

```typescript
// In a mutation handler
await igniter.jobs.system.schedule({
  task: 'sendWelcomeEmail',
  delay: 1000s
  input: { userId: user.id, email: user.email, name: user.name },
});
```

### Igniter.js Plugins

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

### Igniter.js Realtime (Live Updates with SSE)

**Igniter.js Realtime** is the built-in engine for real-time communication via Server-Sent Events (SSE).

#### Automatic Revalidation

This is the most powerful feature of Igniter.js Realtime. Automatically update client UIs after a mutation with a single line of code.

```typescript
// In a mutation handler
const createPost = igniter.mutation({
  handler: async ({ context, request, response }) => {
    const newPost = await context.db.posts.create({ data: request.body });
    // This tells all connected clients to refetch queries with the key 'posts.list'.
    // The UI will update automatically for anyone viewing the post list.
    return response
      .created(newPost)
      .revalidate(['posts.list']);
    //.revalidate(['posts.list'], (ctx) => [`user:${ctx.user.id}`]);
  },
});
```

#### Custom Data Streams

For features like chat or notification feeds, you can create custom data streams.

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

// 3. Backend: Publish to the channel from anywhere in your code
igniter.realtime.publish('notifications.stream', { message: 'Hello!' });
```

### Igniter.js Ensure

The **Ensure** service provides type-safe validation and assertion utilities, replacing `if/throw` patterns for runtime business logic.

#### Usage (as a Plugin)
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

#### Key Methods

| Method | Description |
|---|---|
| `toBeNotEmpty(val, msg)` | Ensures value is not null, undefined, or an empty string. |
| `toBeDefined(val, msg)` | Ensures value is not null or undefined, narrowing its type. |
| `toBeValidEmail(val, msg)` | Validates email format. |
| `toMatchPattern(val, regex, msg)` | Validates against a regular expression. |
| `toBeOneOf(val, options, msg)` | Checks if a value is one of the specified options. |

---

## Igniter.js CLI

### `igniter init` Command

An interactive tool for scaffolding new Igniter.js projects.

#### Overview
```bash
# Create a new project in a new directory
igniter init my-awesome-api
```

#### Features
The `init` command guides you through setting up:
-   **Project Name & Framework Detection**
-   **Igniter.js Features**:
    -   `Igniter.js Store`: For caching, sessions, pub/sub.
    -   `Igniter.js Queues`: For background task processing.
    -   `Igniter.js MCP`: For AI assistant integration.
-   **Database and Docker Compose**

### `igniter dev` Interactive Mode

A powerful interactive dashboard for development.

#### How to Use
```bash
# Start in interactive mode
igniter dev --interactive

# Specify the framework to run alongside Igniter's watcher
igniter dev --interactive --framework nextjs
```

#### Dashboard Interface

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

---

## Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Support and Community

- 📚 [Documentation](https://felipebarcelospro.github.io/igniter-js)
- 🐛 [Issue Tracker](https://github.com/felipebarcelospro/igniter-js/issues)
- 🤝 [Contributing Guidelines](CONTRIBUTING.md)

## License

MIT License - see the [LICENSE](LICENSE) file for details.
