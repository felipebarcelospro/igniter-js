# AI Agent Maintenance Manual: Igniter.js Starter (Bun + React)

**Version:** 1.0.0
**For Agent Use Only.**

This document provides a technical guide for Large Language Model (LLM) based AI agents responsible for maintaining, debugging, and extending the **Igniter.js Starter for Bun + React**.

---

## 1. Project Overview

### 1.1. Name
Igniter.js Starter: Bun + React Full-Stack App

### 1.2. Purpose
This project is a starter template for building high-performance, full-stack, type-safe web applications. It uses **Bun** as the all-in-one runtime for both the server and the React front-end, with **Igniter.js** providing a robust, type-safe API layer.

### 1.3. Key Technologies
-   **Runtime**: Bun (v1.0+)
-   **Web Server**: Native Bun Server
-   **API Framework**: Igniter.js
-   **Frontend Library**: React 19
-   **Language**: TypeScript
-   **Styling**: TailwindCSS
-   **Caching**: Redis (via `@igniter-js/adapter-redis`)
-   **Background Jobs**: BullMQ (via `@igniter-js/adapter-bullmq`)
-   **Database ORM**: Prisma (pre-configured, requires database connection)

---

## 2. Core Architecture

The application is a tightly integrated monolith combining a server and a client.

### 2.1. Unified Server & Client Runtime
The primary entry point is `src/index.tsx`. It uses Bun's native `serve` API to handle all incoming HTTP requests.
-   **API Requests**: Any request matching the path `/api/v1/*` is handled by the Igniter.js API router.
-   **Frontend Requests**: All other requests (`/*`) serve the static `index.html`, which boots the client-side React single-page application (SPA).

### 2.2. Igniter.js API Layer
The back-end is powered by Igniter.js and follows a structured, feature-based pattern.

-   `src/igniter.ts`: This is the **central configuration file**. It creates the main `igniter` instance and registers all adapters (Redis store, BullMQ jobs, logger). You will modify this file only to add new global adapters or plugins.
-   `src/igniter.router.ts`: This file **assembles the main API router**. It imports all feature controllers and registers them under specific path prefixes (e.g., `example` maps to `/api/v1/example`).
-   `src/features/[feature]/controllers/`: This is where the **business logic** resides. Each controller defines API actions (`query` for GET, `mutation` for POST/PUT/etc.) and their handlers.
-   `src/services/`: Contains the initialization logic for external services like the Redis client, Prisma client, and adapter configurations.

### 2.3. Type-Safe React Frontend
The front-end is a standard React application with one critical enhancement: the type-safe Igniter.js client.

-   `src/igniter.client.ts`: **This file is auto-generated and MUST NOT be edited manually.** It creates a client object (`api`) that perfectly mirrors the API defined in `igniter.router.ts`. This client provides fully-typed hooks (`useQuery`, `useMutation`) that make front-end data fetching safe and predictable.
-   `src/app/`: Contains the top-level React components that act as pages.
-   `src/components/`: Contains shared, reusable UI components.
-   `src/features/[feature]/presentation/`: Contains React components and hooks that are specific to a single business feature.

---

## 3. Development Workflows

Follow these workflows for common development tasks.

### 3.1. How to Add a New API Endpoint

**Objective**: Create a new API endpoint to fetch a list of products.

1.  **Create Feature Slice**: If a `products` feature does not exist, create the directory `src/features/products/controllers`.
2.  **Create Controller**: Create a new file `src/features/products/controllers/products.controller.ts`.
3.  **Define Controller and Action**:
    ```typescript
    // src/features/products/controllers/products.controller.ts
    import { igniter } from '@/igniter';
    import { z } from 'zod';

    export const productsController = igniter.controller({
      name: 'Products',
      path: '/products',
      actions: {
        list: igniter.query({
          path: '/',
          query: z.object({
            limit: z.number().optional().default(10)
          }),
          handler: async ({ context, query, response }) => {
            // Access database via context
            const products = await context.database.product.findMany({
              take: query.limit
            });
            return response.success({ products });
          }
        })
      }
    });
    ```
4.  **Register Controller**: Open `src/igniter.router.ts` and add the new controller.
    ```typescript
    // src/igniter.router.ts
    import { igniter } from '@/igniter';
    import { exampleController } from '@/features/example';
    import { productsController } from '@/features/products/controllers/products.controller'; // 1. Import

    export const AppRouter = igniter.router({
      controllers: {
        example: exampleController,
        products: productsController // 2. Register
      }
    });
    // ...
    ```
5.  **Verification**: The endpoint `GET /api/v1/products` is now active. The client `api.products.list.useQuery()` is automatically available on the front-end (after regenerating the client schema).

> **Pro-Tip: Use the CLI for Faster Scaffolding**
>
> Instead of creating these files manually, you can use the `igniter generate` command to build a complete feature slice from your Prisma schema in one step. This is the recommended approach.
>
> ```bash
> # This single command creates the controller, Zod schemas, and procedures.
> npx @igniter-js/cli generate feature products --schema prisma:Product
> ```
> This saves time and ensures consistency across your application. After running the command, you just need to register the new controller in `src/igniter.router.ts`.

### 3.2. How to Use the API on the Front-End

**Objective**: Display the list of products using a new React component.

1.  **Create Component**: Create a new file at `src/features/products/presentation/components/ProductList.tsx`.
2.  **Implement Component**: Use the `api` client to fetch data.
    ```tsx
    // src/features/products/presentation/components/ProductList.tsx
    import * as React from 'react';
    import { api } from '@/igniter.client';

    export function ProductList() {
      const listProductsQuery = api.products.list.useQuery({
        query: { limit: 20 }
      });

      if (listProductsQuery.isLoading) {
        return <div>Loading products...</div>;
      }

      if (listProductsQuery.isError) {
        return <div>Error: {listProductsQuery.error.message}</div>;
      }

      // `listProductsQuery.data` is fully typed based on the server response.
      return (
        <ul>
          {listProductsQuery.data.products.map(product => (
            <li key={product.id}>{product.name}</li>
          ))}
        </ul>
      );
    }
    ```
3.  **Render Component**: Import and use `<ProductList />` in one of the page components inside `src/app/`, for example in `src/app/Home.tsx`.

### 3.3. How to Add a Background Job

**Objective**: Create a job to process a newly uploaded product image.

1.  **Define Job**: Open `src/services/jobs.ts` and add the job definition to the `system` router.
    ```typescript
    // src/services/jobs.ts
    // ... inside REGISTERED_JOBS.system.jobs
    processImage: jobs.register({
      name: 'processImage',
      input: z.object({
        productId: z.string(),
        imageUrl: z.string().url()
      }),
      handler: async ({ input, log }) => {
        log.info('Processing image for product', { productId: input.productId });
        // ... image processing logic ...
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate work
        log.info('Image processing complete');
        return { status: 'processed' };
      }
    })
    ```
2.  **Enqueue Job**: From a relevant API action (e.g., a `products.create` mutation), enqueue the job.
    ```typescript
    // In a controller action handler
    const jobInfo = await igniter.jobs.system.enqueue({
      task: 'processImage',
      input: {
        productId: newProduct.id,
        imageUrl: newProduct.imageUrl
      }
    });

    igniter.logger.info('Scheduled image processing job', { jobId: jobInfo.id });
    ```

### 3.4. Generating the Type-Safe Client
The type-safe client (`src/igniter.client.ts`) is the bridge between your back-end and front-end. It is generated by introspecting your `AppRouter`.

-   **Manual Generation**: You can run the command `bun run build:client` (which aliases `igniter generate schema`) to perform a one-time generation. This is useful in CI/CD pipelines.
-   **Automatic Generation**: The development server (`bun run dev`) runs `igniter dev`, which automatically watches for changes in your controllers and regenerates the client instantly. This provides immediate type safety on the front-end after saving a back-end file.

### 3.5. Automatic Real-Time Updates & Caching
Igniter.js features a powerful real-time system that automatically synchronizes front-end data with back-end changes. This keeps your UI effortlessly up-to-date.

#### Step 1: Make a Query "Live"
To enable real-time updates for a query, add the `stream: true` flag to its definition. This tells Igniter.js to manage its data through the real-time layer when used with the `useQuery` hook.

```typescript
// In a controller, e.g., /features/posts/controllers/posts.controller.ts
list: igniter.query({
  path: '/',
  // ... other options
  stream: true, // This query now supports automatic real-time updates.
  handler: async ({ response, context }) => {
    const posts = await context.database.post.findMany();
    return response.success({ posts });
  }
})
```

#### Step 2: Trigger Updates from a Mutation
When a mutation alters data, use the `.revalidate()` method on the response to specify which live queries are now out-of-date.

```typescript
// In the same controller
create: igniter.mutation({
  path: '/',
  method: 'POST',
  body: CreatePostSchema,
  handler: async ({ request, response, context }) => {
    const post = await context.database.post.create({ data: request.body });

    // The .revalidate() call broadcasts a message telling all clients
    // to automatically refetch the 'posts.list' query.
    return response.created({ post }).revalidate('posts.list');
  }
})
```

#### Step 3: Front-End Usage (Fully Automatic)
On the front-end, the `useQuery` hook handles everything automatically. No extra configuration is needed.

```tsx
// In a React component
import { api } from '@/igniter.client';

function PostList() {
  // This hook subscribes to the 'posts.list' query.
  const { data, isLoading } = api.posts.list.useQuery();

  // When another user adds a post and the `create` mutation
  // calls .revalidate('posts.list'), this component will
  // AUTOMATICALLY re-render with the latest data.
  // No manual refetching logic is required.

  if (isLoading) return <p>Loading...</p>;

  return (
    <ul>
      {data?.posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

> **Note on Custom Streams**: For different use cases like building a notification feed or a live log, Igniter.js provides `igniter.stream()` and the `useRealtime()` hook. This gives you direct access to a Server-Sent Event stream for more granular control.

---

## 4. Key Principles & Constraints

1.  **Type Safety is Paramount**: All code modifications must preserve end-to-end type safety. Trust the TypeScript compiler; if it reports an error, the issue is valid.
2.  **DO NOT EDIT `src/igniter.client.ts`**: This file is a build artifact. It is automatically regenerated when the API router changes. To modify the client, modify the back-end controllers.
3.  **Adhere to Feature-Based Architecture**: All new functionality should be encapsulated within a feature slice under `src/features/`. Avoid adding business logic to top-level files.
4.  **Use Context for Dependencies**: Always access services like the database (`context.database`), logger (`context.logger`), and store (`context.store`) via the `context` object passed to action handlers. Do not import service instances directly into controllers.
5.  **Environment Variables**: All required secrets and environment-specific configurations (e.g., `REDIS_URL`, `DATABASE_URL`) must be defined in the `.env` file at the root of the starter.

---

## 5. External Documentation Links

For more detailed information on Igniter.js concepts, refer to the official documentation wiki.

-   **[Core Concepts](https://github.com/felipebarcelospro/igniter-js/wiki/Core-Concepts)**: Understand Actions, Controllers, Context, and the builder pattern.
-   **[React Client Integration](https://github.com/felipebarcelospro/igniter-js/wiki/React-Client-Integration)**: Deep dive into `useQuery`, `useMutation`, and the `IgniterProvider`.
-   **[Store Adapter (Redis)](https://github.com/felipebarcelospro/igniter-js/wiki/Store-Adapter)**: Learn about caching (`get`, `set`) and Pub/Sub (`publish`, `subscribe`).
-   **[Job Queue Adapter (BullMQ)](https://github.com/felipebarcelospro/igniter-js/wiki/Job-Queue-Adapter)**: Learn how to define, schedule, and manage background jobs.