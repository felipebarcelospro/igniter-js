# AI Agent Maintenance Manual: Igniter.js Starter (Next.js)

**Version:** 1.0.0
**For Agent Use Only.**

This document is the master technical guide for Large Language Model (LLM) based AI agents responsible for maintaining, debugging, and extending this **Igniter.js Starter for Next.js** application. It is a comprehensive, self-contained summary of the entire Igniter.js framework and its integration with Next.js. **You must adhere to the principles and workflows outlined here.**

---

## 1. Project Overview

### 1.1. Name
Igniter.js Starter: Next.js Full-Stack App

### 1.2. Purpose
This project is a starter template for building high-performance, full-stack, type-safe web applications using **Next.js**. It leverages **React Server Components (RSC)** for optimal performance and **Igniter.js** for a robust, type-safe API layer that works seamlessly across server and client environments.

### 1.3. Key Technologies
-   **Framework**: Next.js (App Router)
-   **Runtime**: Node.js
-   **API Framework**: Igniter.js
-   **Frontend Library**: React 18+ (with React Server Components)
-   **Language**: TypeScript
-   **Database ORM**: Prisma
-   **Caching & Messaging**: Redis (via `@igniter-js/adapter-redis`)
-   **Background Jobs**: BullMQ (via `@igniter-js/adapter-bullmq`)

---

## 2. Core Architecture

This application utilizes Next.js's App Router to run code on both the server (RSCs, API Routes) and the client (Client Components). Igniter.js is integrated as a structured API layer within the Next.js project.

### 2.1. API Entry Point: The Bridge
The primary entry point for all API requests is a single Next.js Route Handler:
-   **File**: `app/api/[[...igniter]]/route.ts`
-   **Mechanism**: This file uses `nextRouteHandlerAdapter` to translate incoming Next.js requests into a format Igniter.js understands, and vice-versa for responses. It exports handlers for all HTTP methods (`GET`, `POST`, etc.). All requests matching `/api/*` are directed here. You will rarely need to modify this file.

### 2.2. Igniter.js API Layer: Feature-Based Structure
All backend business logic resides within the `src/features` directory, following a **Feature-Sliced Architecture**.
-   `src/igniter.ts`: The central configuration file where the `igniter` instance is created and global adapters/plugins are registered.
-   `src/igniter.router.ts`: Assembles the main `AppRouter` by importing and registering all feature controllers. **This file is the single source of truth for your API's structure.**
-   `src/features/[feature]/controllers/`: This is where business logic lives. Each controller defines API actions (`query`, `mutation`, `stream`).

### 2.3. The Universal Type-Safe Client
The file `src/igniter.client.ts` defines the **type-safe Igniter.js API client**. This is the primary way the frontend interacts with the backend.
-   **Auto-Generated**: This file **MUST NOT be edited manually**. It is a build artifact that perfectly mirrors the API defined in `igniter.router.ts`. It is regenerated automatically on change by the dev server.
-   **Universal Operation**: The client is isomorphic and works in all Next.js contexts.
    -   In **React Server Components (RSC)**, you call API actions directly (e.g., `await api.posts.list.query()`). This performs a direct function call on the server, bypassing HTTP for maximum performance.
    -   In **Client Components** (`'use client'`), you must use the provided React Hooks (`.useQuery()`, `.useMutation()`, `.useRealtime()`). These hooks make standard HTTP requests and manage the entire client-side state lifecycle (loading, error, caching, etc.).

---

## 3. Backend Deep Dive: Core Igniter.js Concepts

### 3.1. The Igniter Builder (`igniter.ts`)
The application instance is configured using a fluent builder pattern. This provides a guided, type-safe setup.

```typescript
// src/igniter.ts
export const igniter = Igniter
  // 1. Define the base context shape
  .context<IgniterAppContext>()
  // 2. Attach a structured logger
  .logger(logger)
  // 3. Enable the Redis-based Store (for cache and pub/sub)
  .store(store)
  // 4. Enable the BullMQ-based background jobs system
  .jobs(REGISTERED_JOBS)
  // 5. Finalize the configuration and create the instance
  .create();
```

### 3.2. Context: Dependency Injection
The **Context** is a type-safe dependency injection mechanism.
-   **Base Context (`src/igniter.context.ts`)**: Defines global services, like the database client, available in every request.
-   **Dynamic Extension**: **Procedures** (middleware) can return data, which gets merged into the context for subsequent steps, providing a fully-typed, request-specific context.

```typescript
// Example: An auth procedure adding a `user` object to the context.
export const authProcedure = igniter.procedure({
  handler: async ({ request }) => {
    const user = await getUserByToken(request.headers.get('Authorization'));
    if (!user) throw new Error("Unauthorized");
    // This return value is merged into the context.
    return { user };
  }
});

// In an action that uses this procedure:
getProfile: igniter.query({
  use: [authProcedure],
  handler: ({ context }) => {
    // `context.user` is now available and fully typed.
    // `context.database` is also available from the base context.
    return context.user;
  }
})
```

### 3.3. Controllers & Actions
-   **Controller (`igniter.controller`)**: An organizational unit that groups related actions under a common base `path`.
-   **Action**: A single API endpoint.
    -   `igniter.query()`: For `GET` requests (fetching data).
    -   `igniter.mutation()`: For `POST`, `PUT`, `PATCH`, `DELETE` requests (changing data).

### 3.4. Validation
Igniter.js uses a two-layer validation approach.
1.  **Schema Validation (Zod)**: For validating the **shape and type** of incoming request `body` and `query` parameters. This happens automatically before your handler runs. If validation fails, a `400 Bad Request` is returned.
2.  **Business Logic Validation (`Ensure` plugin)**: For asserting **runtime conditions** inside your handler (e.g., checking permissions, verifying a resource exists). This replaces messy `if/throw` blocks with clean, declarative assertions that provide type-narrowing.

```typescript
// Example of both validation layers
updatePost: igniter.mutation({
  // 1. Zod schema validation
  body: z.object({ content: z.string().min(10) }),
  use: [authProcedure], // Ensures user is authenticated
  handler: async ({ request, context }) => {
    const post = await context.database.post.findUnique({ where: { id: request.params.id } });

    // 2. Business logic validation
    context.plugins.ensure.toBeDefined(post, "Post not found");
    context.plugins.ensure.toBeTrue(
      post.authorId === context.user.id,
      "You do not have permission to edit this post"
    );

    // After these checks, `post` is guaranteed to be defined.
    // ... update logic
  }
})
```

---

## 4. Advanced Features

### 4.1. Queues: Background Jobs (BullMQ)
Offload long-running tasks to a background worker process.
1.  **Define a Job**: In a job router file (e.g., `src/services/jobs.ts`), use `jobs.register` to define a task, its `input` schema (Zod), and its `handler`.
2.  **Enqueue a Job**: From a mutation or other backend logic, use `igniter.jobs.<namespace>.schedule()` to add a job to the queue. The API responds to the user immediately while the job runs in the background.

```typescript
// Enqueuing a job from a mutation
await igniter.jobs.emails.schedule({
  task: 'sendWelcomeEmail',
  input: { userId: newUser.id }, // Type-checked against the job's Zod schema
});
```

### 4.2. Store: Caching & Pub/Sub (Redis)
-   **Caching**: Use `igniter.store.get()` and `igniter.store.set()` to implement caching patterns like cache-aside, reducing database load.
-   **Pub/Sub**: Use `igniter.store.publish()` and `igniter.store.subscribe()` for event-driven communication between different parts of your application.

### 4.3. Realtime: Live UI Updates (Server-Sent Events)
This is a cornerstone feature for modern UIs.
1.  **Automatic Revalidation (The "Magic")**:
    -   On a `query` action you want to be "live", add `stream: true`.
    -   From a `mutation` that changes the data for that query, chain `.revalidate('<query_key>')` to the response.
    -   **Result**: Any client component using the corresponding `useQuery` hook will **automatically** refetch its data and re-render. No client-side plumbing is required.

    ```typescript
    // Backend Controller
    export const postsController = igniter.controller({
      actions: {
        list: igniter.query({
          stream: true, // 1. Make this query "live"
          handler: /* ... */
        }),
        create: igniter.mutation({
          handler: async ({ response, ... }) => {
            const post = /* ... create post in DB ... */
            // 2. Revalidate the live query after creation
            return response.created({ post }).revalidate(['posts.list']);
          }
        })
      }
    });
    ```

2.  **Scoped Revalidation**: To target specific users, define scopes on the `<IgniterProvider>` using `getScopesIds` (e.g., `['user:123']`) and pass a function to `.revalidate()` on the backend to specify target scopes: `.revalidate(['query_key'], (ctx) => [\`user:${ctx.user.id}\`])`.

---
## 5. Client-Side Deep Dive

### 5.1. `<IgniterProvider>`
This is a **mandatory** root provider (`src/providers/igniter.provider.tsx`) for all client-side functionality. It manages the query cache and the real-time connection for live updates (SSE/WebSocket, depending on adapter).

### 5.2. `useQuery`
The primary hook for fetching data in Client Components. It is available for all `query` (GET) actions.
-   **Return Values** (see [`QueryActionCallerResult`](igniter-js/packages/core/src/types/client.interface.ts)):
    -   `data`: The response data (`TAction["$Infer"]["$Response"]["data"]`).
    -   `variables`: The input variables used for the query.
    -   `isLoading`: `true` only during the very first fetch.
    -   `isFetching`: `true` whenever a request is in-flight (initial load or refetch).
    -   `isSuccess`: `true` if the query completed successfully.
    -   `isError`: `true` if the query failed.
    -   `error`: The error object, if any.
    -   `refetch`: Function to manually trigger a refetch.
    -   `status`: `'loading' | 'error' | 'success'`.
    -   `loading`: **[DEPRECATED]** Use `isLoading` instead.
    -   `invalidate`: **[DEPRECATED]** Use `refetch` instead.
    -   `execute`: The function to execute the query directly.
-   **Options** (see [`QueryActionCallerOptions`](igniter-js/packages/core/src/types/client.interface.ts)):
    -   `enabled`: If `false`, disables automatic fetching.
    -   `initialData`: Provide initial data for hydration.
    -   `query`, `params`: Input variables for the query.
    -   `staleTime`: Time (ms) before data is considered stale.
    -   `refetchInterval`: Polling interval (ms).
    -   `refetchIntervalInBackground`: Continue polling in background.
    -   `refetchOnWindowFocus`, `refetchOnMount`, `refetchOnReconnect`: Control auto-refetch triggers.
    -   `onLoading`, `onRequest`, `onSuccess`, `onError`, `onSettled`: Lifecycle callbacks.

### 5.3. `useMutation`
The hook for creating, updating, or deleting data. Available for all `mutation` (non-GET) actions.
-   **Return Values** (see [`MutationActionCallerResult`](igniter-js/packages/core/src/types/client.interface.ts)):
    -   `mutate`: The function to execute the mutation (deprecated alias for `mutate`).
    -   `data`: The response data.
    -   `variables`: The input variables used for the mutation.
    -   `isLoading`: `true` while the mutation is in progress.
    -   `isSuccess`: `true` if the mutation completed successfully.
    -   `isError`: `true` if the mutation failed.
    -   `error`: The error object, if any.
    -   `retry`: Function to manually retry the mutation.
    -   `status`: `'loading' | 'error' | 'success'`.
    -   `loading`: **[DEPRECATED]** Use `isLoading` instead.
-   **Options** (see [`MutationActionCallerOptions`](igniter-js/packages/core/src/types/client.interface.ts)):
    -   `query`, `params`, `body`: Input variables for the mutation (all support partial updates).
    -   `onLoading`, `onRequest`, `onSuccess`, `onError`, `onSettled`: Lifecycle callbacks.

-   **CRITICAL PATTERN: Cache Invalidation**: When a mutation succeeds, the client's cache may be stale. The preferred pattern is to use the `.revalidate()` method on the backend mutation response, which will automatically trigger refetches for affected queries on all relevant clients. If you need to manually invalidate queries, use the `invalidate` method from the context (see below).

```tsx
// Manual invalidation example
'use client';
import { api, useIgniterContext } from '@/igniter.client';

function SomeComponent() {
  const igniter = useIgniterContext();
  const deleteMutation = api.posts.delete.useMutation({
    onSuccess: () => {
      // Invalidate the 'posts.list' query to force a refetch.
      igniter.invalidate('posts.list');
    }
  });
  // ...
}
```

### 5.4. `useRealtime`
For subscribing to custom, continuous data streams from the backend (e.g., for a notification feed). Requires a backend action with `stream: true`.
-   **Return Values** (see [`RealtimeActionCallerResult`](igniter-js/packages/core/src/types/client.interface.ts)):
    -   `data`: Latest data received from the stream.
    -   `isConnected`: Whether the stream is currently connected.
    -   `isReconnecting`: Whether the stream is attempting to reconnect.
    -   `error`: Last error that occurred, if any.
    -   `disconnect`: Manually disconnect the stream.
    -   `reconnect`: Manually reconnect the stream.
-   **Options** (see [`RealtimeActionCallerOptions`](igniter-js/packages/core/src/types/client.interface.ts)):
    -   `initialParams`, `initialData`: Initial values for the stream.
    -   `onConnect`, `onDisconnect`, `onError`, `onMessage`: Lifecycle callbacks.
    -   `autoReconnect`, `maxReconnectAttempts`, `reconnectDelay`: Reconnection behavior.

---

### 5.4. `useRealtime`
For subscribing to custom, continuous data streams from the backend (e.g., for a notification feed). Requires a backend action with `stream: true`.

---

## 6. Development Workflows & CLI

### 6.1. How to Add a New API Endpoint (Recommended Workflow)
**NEVER** create files manually. Use the CLI for speed and consistency.

1.  **Define Schema**: Add or update a model in `prisma/schema.prisma`.
    ```prisma
    model Product {
      id    String @id @default(cuid())
      name  String
      price Float
    }
    ```
2.  **Apply to DB**: Run `npx prisma db push`.
3.  **Scaffold Feature**: Use `igniter generate feature`.
    ```bash
    npx @igniter-js/cli generate feature products --schema prisma:Product
    ```
    This command generates a complete, production-ready CRUD API feature slice in `src/features/products/`, including controllers, Zod schemas, and a repository procedure.
4.  **Register Controller**: Open `src/igniter.router.ts` and register the new `productsController`.
    ```typescript
    // src/igniter.router.ts
    import { productsController } from '@/features/products';

    export const AppRouter = igniter.router({
      controllers: {
        // ...
        products: productsController,
      }
    });
    ```
5.  **Use the API**: The dev server will auto-regenerate the client. You can immediately use `api.products.list.query()` (RSC) or `api.products.list.useQuery()` (Client Component).

### 6.2. `igniter dev`
The `igniter dev --interactive` command (aliased to `npm run dev`) is your primary development tool. It runs and manages all processes (Next.js, Igniter watcher) in a unified dashboard.

---

## 7. Key Principles & Constraints

1.  **Type Safety is Paramount**: All modifications must preserve end-to-end type safety. Trust the TypeScript compiler.
2.  **DO NOT EDIT Generated Files**: Specifically, `src/igniter.client.ts` and `src/igniter.schema.ts` are build artifacts. Modify backend controllers to change the client.
3.  **Adhere to Feature-Based Architecture**: All new business logic must be encapsulated within a feature slice under `src/features/`.
4.  **Use Context for Dependencies**: Always access services (`context.database`, `context.logger`, etc.) via the `context` object in handlers. Do not import service instances directly into controllers.
5.  **Prioritize RSC for Initial Data Fetch**: Whenever possible, fetch initial page data in React Server Components by `await`ing the API call. This improves performance and reduces client-side JavaScript.
6.  **Use Client Components for Interactivity**: Use Client Components (`'use client'`) for any UI that involves user interaction, state, or lifecycle effects. This is where you will use the Igniter.js hooks.

---

## 8. External Documentation Links

For more detailed information on Igniter.js concepts, refer to the official documentation wiki.

-   **[Core Concepts](https://github.com/felipebarcelospro/igniter-js/wiki/Core-Concepts)**: The starting point for understanding the framework's architecture.
    -   **The Igniter Builder**: Explains how `src/igniter.ts` uses a fluent API (`.context()`, `.logger()`, `.create()`) to build the application instance. **Consult when adding global services or plugins.**
    -   **Context**: Details the dependency injection system. The `context` object starts with a base shape and is dynamically extended by `Procedures`, making services available to `actions`.
    -   **Controllers & Actions**: The core of the API. `Controllers` group related `Actions`. `Actions` are the individual endpoints (`igniter.query` for GET, `igniter.mutation` for CUD). **Consult when creating new endpoints.**
    -   **Procedures (Middleware)**: Reusable functions (e.g., for auth, logging) that run before an `action`. They can halt execution or extend the `context`. **Consult when implementing cross-cutting concerns like auth.**

-   **[React Client Integration](https://github.com/felipebarcelospro/igniter-js/wiki/React-Client-Integration)**: Essential reading for frontend work.
    -   **API Client**: Explains `src/igniter.client.ts`. This file creates the type-safe `api` object used to call the backend from both Server and Client Components.
    -   **IgniterProvider**: A mandatory React provider that wraps the entire application. It manages the client-side cache and real-time connection. All client-side hooks depend on it.
    -   **useQuery, useMutation, useRealtime**: The hooks for interacting with the API from Client Components. The documentation details their parameters, return values, and usage patterns.

-   **[Adapters (Next.js)](https://github.com/felipebarcelospro/igniter-js/wiki/Adapters)**
    -   Describes how Igniter.js connects to the web framework. For this project, `nextRouteHandlerAdapter` in `src/app/api/[[...all]]/route.ts` is the key piece.

-   **[Store Adapter (Redis)](https://github.com/felipebarcelospro/igniter-js/wiki/Store-Adapter)**
    -   Details the key-value storage, caching, and pub/sub system. This project uses Redis via `@igniter-js/adapter-redis`.

-   **[Job Queue Adapter (BullMQ)](https://github.com/felipebarcelospro/igniter-js/wiki/Job-Queue-Adapter)**
    -   Explains the background job processing system. This project uses BullMQ via `@igniter-js/adapter-bullmq`.
