# AI Agent Maintenance Manual: Igniter.js Starter (Bun + React)

**Version:** 2.0.0
**For Agent Use Only.**

This document is the master technical guide for Large Language Model (LLM) based AI agents responsible for maintaining, debugging, and extending this **Igniter.js Starter for Bun + React**. It is a comprehensive, self-contained summary of the entire Igniter.js framework and its integration into a modern Single Page Application (SPA) architecture. **You must adhere to the principles and workflows outlined here.**

---

## 1. Project Overview

### 1.1. Name
Igniter.js Starter: Bun + React Full-Stack SPA

### 1.2. Purpose
This project is a starter template for building high-performance, full-stack, type-safe Single Page Applications. It uses **Bun** as the all-in-one runtime, server, and bundler for both the server-side API and the client-side React frontend. **Igniter.js** provides the robust, type-safe API layer.

### 1.3. Key Technologies
-   **Runtime / Server / Bundler**: Bun (v1.0+)
-   **API Framework**: Igniter.js
-   **Frontend Library**: React 18+
-   **Language**: TypeScript
-   **Styling**: TailwindCSS
-   **Database ORM**: Prisma
-   **Caching & Messaging**: Redis (via `@igniter-js/adapter-redis`)
-   **Background Jobs**: BullMQ (via `@igniter-js/adapter-bullmq`)

---

## 2. Core Architecture

This application is a tightly integrated monolith that follows a classic SPA architecture with a modern toolchain.

### 2.1. Unified Server & Client Entry Point
The primary entry point is `src/index.tsx`. This file uniquely serves both the server and the client:
-   **On the Server**: When executed by `bun`, it starts a native HTTP server using `Bun.serve`. This server inspects the request URL.
    -   **API Requests**: Any request matching the path `/api/v1/*` is forwarded to the Igniter.js router for processing.
    -   **Frontend Requests**: All other requests (`/*`) serve the static `public/index.html` file, which acts as the shell for the client-side React application.
-   **On the Client**: When bundled for the browser, this file's server-side logic is ignored. Instead, it executes the `ReactDOM.createRoot(...).render(...)` logic, mounting the React application into the `index.html` shell.

### 2.2. Igniter.js API Layer: Feature-Based Structure
All backend business logic resides within the `src/features` directory, following a **Feature-Sliced Architecture**.
-   `src/igniter.ts`: The central configuration file where the `igniter` instance is created using the builder pattern and global adapters/plugins are registered.
-   `src/igniter.router.ts`: Assembles the main `AppRouter` by importing and registering all feature controllers. **This file is the single source of truth for your API's structure.**
-   `src/features/[feature]/controllers/`: This is where your business logic lives. Each controller defines API actions (`query`, `mutation`).

### 2.3. Type-Safe React Frontend
-   `src/igniter.client.ts`: **This file is auto-generated and MUST NOT be edited manually.** It is a build artifact that perfectly mirrors the API defined in `igniter.router.ts`. It exports the `api` client object, which provides fully-typed React hooks (`useQuery`, `useMutation`) for data fetching.
-   `src/app/`: Contains the top-level React components that act as pages.
-   `src/components/`: Contains shared, reusable UI components.

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
  .jobs(jobs)
  // 5. Finalize the configuration and create the instance
  .create();
```

### 3.2. Context: Dependency Injection
The **Context** is a type-safe dependency injection mechanism.
-   **Base Context (`src/igniter.context.ts`)**: Defines global services, like the database client (`PrismaClient`), available in every request.
-   **Dynamic Extension**: **Procedures** (middleware) can return data, which gets merged into the context for subsequent steps, providing a fully-typed, request-specific context.

### 3.3. Controllers & Actions
-   **Controller (`igniter.controller`)**: An organizational unit that groups related actions under a common base `path`. As a best practice, always provide a `name` and `description`.
    ```typescript
    export const postsController = igniter.controller({
      name: 'Posts',
      description: 'Actions related to blog posts',
      path: '/posts',
      actions: { /* ... */ }
    });
    ```
-   **Action**: A single API endpoint. `igniter.query()` for `GET` requests, and `igniter.mutation()` for state-changing requests (`POST`, `PUT`, etc.). Actions also benefit from a `name` and `description`.

### 3.4. Validation
Igniter.js uses a two-layer validation approach.
1.  **Schema Validation (Zod)**: For validating the **shape and type** of incoming request `body` and `query` parameters. This happens automatically before your handler runs. If validation fails, a `400 Bad Request` is returned.
2.  **Business Logic Validation (`Ensure` plugin)**: For asserting **runtime conditions** inside your handler (e.g., checking permissions, verifying a resource exists). This replaces messy `if/throw` blocks with clean, declarative assertions that provide type-narrowing.

```typescript
updatePost: igniter.mutation({
  name: 'Update Post',
  // 1. Zod schema validation
  body: z.object({ content: z.string().min(10) }),
  use: [authProcedure], // Assumes a procedure adds `user` to context
  handler: async ({ request, context }) => {
    const post = await context.database.post.findUnique({ where: { id: request.params.id } });
    
    // 2. Business logic validation
    context.$plugins.ensure.toBeDefined(post, "Post not found");
    context.$plugins.ensure.toBeTrue(
      post.authorId === context.user.id,
      "You do not have permission to edit this post"
    );

    // After these checks, `post` is guaranteed to be defined and permissions are checked.
    // ... update logic
  }
})
```

---

## 4. Advanced Backend Features

### 4.1. Queues: Background Jobs (BullMQ)
Offload long-running tasks to a background worker process.
1.  **Define a Job**: In a job router file (e.g., `src/services/jobs.ts`), use `jobs.register` to define a task, its `input` schema (Zod), and its `handler`.
2.  **Enqueue a Job**: From a mutation, use `igniter.jobs.<namespace>.schedule()` to add a job to the queue. The API responds to the user immediately.

```typescript
// Enqueuing a job from a mutation
await igniter.jobs.emails.schedule({
  task: 'sendWelcomeEmail',
  input: { userId: newUser.id }, // Type-checked against the job's Zod schema
});
```

### 4.2. Store: Caching & Pub/Sub (Redis)
-   **Caching**: Use `igniter.store.get()` and `igniter.store.set()` to implement caching patterns like cache-aside.
-   **Pub/Sub**: Use `igniter.store.publish()` and `igniter.store.subscribe()` for event-driven communication.

### 4.3. Realtime: Live UI Updates
This is the **primary method** for keeping UI in sync.
1.  On a `query` action you want to be "live", add `stream: true`.
2.  From a `mutation` that changes the data for that query, chain `.revalidate('<query_key>')` to the response.
3.  **Result**: Any client component using the corresponding `useQuery` hook will **automatically** refetch its data and re-render.

---

## 5. Client-Side Deep Dive (React)

### 5.1. The `<IgniterProvider>`
This is a **mandatory** root provider (`src/app/_app.tsx`) for all client-side functionality. It manages the query cache and the real-time SSE connection.

### 5.2. `useQuery` Hook
Used to fetch data. Based on `@igniter-js/core/src/types/client.interface.ts`.

**Key Options (`QueryActionCallerOptions`):**
| Option | Type | Description |
| :--- | :--- | :--- |
| `enabled` | `boolean` | If `false`, the query will not run automatically. Used for dependent queries. |
| `staleTime`| `number` | Time in ms that data is considered "fresh" and served from cache without a network request. Default: `0`. |
| `refetchInterval` | `number` | If set, the query will poll at this interval in ms. |
| `refetchOnWindowFocus` | `boolean` | `true` by default. Automatically refetches when the browser window is focused. |
| `onSuccess`| `(data) => void`| Callback that runs on a successful query. The `data` is the unwrapped payload. |
| `onError`| `(error) => void`| Callback that runs on a failed query. |

**Key Return Values (`QueryActionCallerResult`):**
| Property | Description |
| :--- | :--- |
| `data` | The successfully fetched data. `undefined` until success. |
| `isLoading`| `true` only during the *initial* fetch for a query. |
| `isFetching`| `true` whenever a request is in-flight (initial load and subsequent refetches). |
| `isError` | `true` if the query has failed. |
| `error` | The error object if `isError` is true. |
| `refetch` | A function to manually trigger a refetch. |

### 5.3. `useMutation` Hook
Used for creating, updating, or deleting data. Based on `@igniter-js/core/src/types/client.interface.ts`.

**Key Return Values (`MutationActionCallerResult`):**
| Property | Description |
| :--- | :--- |
| `mutate` | Function to trigger the mutation. Takes an object with `body`, `query`, or `params`. |
| `data` | The data returned from the backend upon successful mutation. |
| `isLoading`| `true` while the mutation is in flight. |
| `isError` | `true` if the mutation failed. |
| `error` | The error object if the mutation failed. |

**CRITICAL: UI Update Patterns**
After a mutation, the client's UI must be updated. You have two primary patterns:

1.  **Server-Side Revalidation (Preferred)**: Call a mutation that uses `.revalidate()` on the backend. The `useQuery` hooks on the client will automatically refetch. This is the most robust and recommended pattern.
2.  **Client-Side Invalidation (Alternative)**: If the backend mutation doesn't use `.revalidate()`, you must manually invalidate the query on the client.

```tsx
// Client-Side Invalidation Example
'use client';
import { api, useQueryClient } from '@/igniter.client';

function SomeComponent() {
  const queryClient = useQueryClient(); // Get the client instance
  const deleteMutation = api.posts.delete.useMutation({
    onSuccess: () => {
      // Manually invalidate the 'posts.list' query to force a refetch.
      queryClient.invalidate(['posts.list']);
      console.log('Post deleted, list invalidated.');
    }
  });
  // ...
}
```

---

## 6. Development Workflows & CLI

### 6.1. Recommended Workflow: Schema-First Generation
**NEVER** create API files manually. Use the CLI for speed and consistency. This is the most efficient way to build features.

1.  **Define Schema**: Add or update a model in `prisma/schema.prisma`.
    ```prisma
    model Task {
      id        String  @id @default(cuid())
      text      String
      completed Boolean @default(false)
    }
    ```
2.  **Apply to DB**: Run `bunx prisma db push`.
3.  **Scaffold Feature**: Use `igniter generate feature`.
    ```bash
    bunx @igniter-js/cli generate feature tasks --schema prisma:Task
    ```
    This command generates a complete, production-ready CRUD API feature slice in `src/features/tasks/`, including controllers, Zod schemas, and a repository procedure.
4.  **Register Controller**: Open `src/igniter.router.ts` and register the new `tasksController`.
    ```typescript
    // src/igniter.router.ts
    import { tasksController } from '@/features/tasks';

    export const AppRouter = igniter.router({
      controllers: {
        // ...
        tasks: tasksController,
      }
    });
    ```
5.  **Use the API**: The dev server (`bun run dev`) automatically regenerates `igniter.client.ts`. You can immediately use `api.tasks.list.useQuery()` in your React components.

### 6.2. Client Generation
The development server (`bun run dev`) automatically watches for changes in your controllers and regenerates `src/igniter.client.ts`. For CI/CD pipelines or manual updates, you can run `bun run build:client`.

---

## 7. Key Principles & Constraints for AI Agents

1.  **Type Safety is Paramount**: All modifications must preserve end-to-end type safety. Trust the TypeScript compiler.
2.  **DO NOT EDIT Generated Files**: Specifically, `src/igniter.client.ts` and `src/igniter.schema.ts` are build artifacts. Modify backend controllers in `src/features/` to change the client.
3.  **Adhere to Feature-Based Architecture**: All new business logic must be encapsulated within a feature slice under `src/features/`.
4.  **Use Context for Dependencies**: Always access services (`context.database`, `context.logger`, etc.) via the `context` object in handlers. Do not import service instances directly into controllers.
5.  **Use the CLI for Scaffolding**: Always prefer `igniter generate feature --schema ...` to create new CRUD endpoints.
6.  **Use `.revalidate()` for UI Sync**: For mutations that affect a list or item view, the `.revalidate()` pattern is the preferred method to keep the UI synchronized. Use manual client-side invalidation only when necessary.