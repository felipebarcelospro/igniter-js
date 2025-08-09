# AI Agent Maintenance Manual: Igniter.js Starter (Next.js)

**Version:** 1.0.0
**For Agent Use Only.**

This document provides a technical guide for Large Language Model (LLM) based AI agents responsible for maintaining, debugging, and extending the **Igniter.js Starter for Next.js**.

---

## 1. Project Overview

### 1.1. Name
Igniter.js Starter: Next.js Full-Stack App

### 1.2. Purpose
This project is a full-stack, type-safe application template built on the **Next.js App Router**. It integrates Igniter.js to provide a robust, end-to-end type-safe API layer that seamlessly coexists with React Server Components (RSCs) and Client Components.

### 1.3. Key Technologies
-   **Web Framework**: Next.js (App Router)
-   **Runtime**: Node.js
-   **UI Library**: React
-   **API Framework**: Igniter.js
-   **Language**: TypeScript
-   **Caching**: Redis (via `@igniter-js/adapter-redis`)
-   **Background Jobs**: BullMQ (via `@igniter-js/adapter-bullmq`)
-   **Database ORM**: Prisma

---

## 2. Core Architecture

This application is a tightly integrated Next.js project where the Igniter.js API is hosted within the same application structure.

### 2.1. API Entry Point: Next.js Route Handler
The entire Igniter.js API is exposed through a single Next.js catch-all route handler.
-   **Location**: `src/app/api/[[...all]]/route.ts`
-   **Mechanism**: This file uses the `nextRouteHandlerAdapter` from `@igniter-js/core/adapters`. This adapter translates incoming Next.js requests into the standard `Request` object that Igniter.js understands and maps the Igniter.js `Response` object back to a Next.js-compatible response. This is the primary bridge between the two frameworks.

### 2.2. Igniter.js API Layer
The back-end business logic is defined purely within the Igniter.js structure.
-   `src/igniter.ts`: The central configuration file where the `igniter` instance is created and adapters (store, jobs, logger) are registered.
-   `src/igniter.router.ts`: Assembles the main API router by importing and registering all feature controllers.
-   `src/features/[feature]/controllers/`: This is where all business logic resides. Each controller defines API actions (`query` for GET, `mutation` for POST/PUT/etc.).

### 2.3. Type-Safe Client (`src/igniter.client.ts`)
This file is auto-generated and provides the type-safe `api` client object. This client is isomorphic and can be used in both Server and Client Components.
-   **Server Components (RSC)**: You can call API actions directly using `await`. This fetches data on the server during rendering.
    ```typescript
    // Example in a Server Component
    import { api } from '@/igniter.client';
    const users = await api.users.list.query(); // Returns data directly
    ```
-   **Client Components**: You must use the provided React hooks (`.useQuery()`, `.useMutation()`). These hooks manage client-side state, caching, and revalidation.
    ```typescript
    // Example in a Client Component
    'use client';
    import { api } from '@/igniter.client';
    const { data, isLoading } = api.users.list.useQuery(); // Returns stateful hook values
    ```

### 2.4. Providers
The root layout (`src/app/layout.tsx`) must contain the `IgniterProvider` for client-side functionality to work correctly. This provider manages the client-side cache and real-time updates for hooks like `useQuery`.

---

## 3. Development Workflows

Follow these workflows for common development tasks.

### 3.1. How to Add a New API Endpoint

**Objective**: Create a new API endpoint to fetch a list of `products`.

1.  **Create Feature Slice**: If a `products` feature does not exist, create the directory `src/features/products/controllers`.
2.  **Create Controller**: Create a new file `src/features/products/controllers/products.controller.ts`.
3.  **Define Controller and Action**:
    ```typescript
    // src/features/products/controllers/products.controller.ts
    import { igniter } from '@/igniter';
    import { z } from 'zod';

    export const productsController = igniter.controller({
      name: 'Products',
      path: '/products', // Will be accessible at /api/products
      actions: {
        list: igniter.query({
          path: '/',
          query: z.object({ limit: z.number().optional().default(10) }),
          handler: async ({ context, query, response }) => {
            const products = await context.database.product.findMany({ take: query.limit });
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
5.  **Verification**: The endpoint `GET /api/products` is now active. The typed client is automatically updated, and you can immediately use `api.products.list.query()` in a Server Component or `api.products.list.useQuery()` in a Client Component.

> **Pro-Tip: Use the CLI for Faster Scaffolding**
>
> Instead of creating these files manually, you can use the `igniter generate` command to build a complete feature slice from your Prisma schema in one step. This is the recommended approach.
>
> ```bash
> # This single command creates the controller, Zod schemas, and procedures.
> npx @igniter-js/cli generate feature products --schema prisma:Product
> ```
> This saves time and ensures consistency across your application. After running the command, you just need to register the new controller in `src/igniter.router.ts`.

### 3.2. How to Use the API in a React Component

**Objective**: Display the list of products on a page.

1.  **Create a Server Component Page**: `src/app/products/page.tsx`
    ```tsx
    // src/app/products/page.tsx
    import { api } from '@/igniter.client';

    export default async function ProductsPage() {
      // Direct, server-side data fetching
      const { products } = await api.products.list.query();

      return (
        <div>
          <h1>Products</h1>
          <ul>
            {products.map(product => <li key={product.id}>{product.name}</li>)}
          </ul>
        </div>
      );
    }
    ```

2.  **Create a Client Component for Interactivity**: `src/features/products/presentation/components/ProductListInteractive.tsx`
    ```tsx
    // src/features/products/presentation/components/ProductListInteractive.tsx
    'use client';
    import { api } from '@/igniter.client';

    export function ProductListInteractive() {
      const { data, isLoading, error } = api.products.list.useQuery();

      if (isLoading) return <p>Loading...</p>;
      if (error) return <p>Error: {error.message}</p>;

      return (
        <ul>
          {data?.products.map(product => <li key={product.id}>{product.name}</li>)}
        </ul>
      );
    }
    ```

### 3.3. Generating the Type-Safe Client
The type-safe client (`src/igniter.client.ts`) is the bridge between your back-end and front-end. It is generated by introspecting your `AppRouter`.

-   **Manual Generation**: You can run the command `npm run build:client` (which aliases `igniter generate schema`) to perform a one-time generation. This is useful in CI/CD pipelines.
-   **Automatic Generation**: The development server (`npm run dev`) runs `igniter dev --interactive`, which automatically watches for changes in your controllers and regenerates the client instantly. This is why you get immediate type safety on the front-end after saving a back-end file.

### 3.4. Automatic Real-Time Data Sync (Live Queries)
Igniter.js offers a powerful and seamless real-time experience using Server-Sent Events (SSE) for "live queries". When a query is marked as `stream: true`, any client using the corresponding `useQuery` hook will automatically subscribe to updates. When a mutation invalidates that query, the server pushes the new, updated data directly to the client, which updates the UI without any additional client-side logic.

This is the **recommended** way to keep your UI in sync with your backend data.

**Step 1: Enable Streaming on a Query Action**

In your controller, add the `stream: true` flag to the `igniter.query` you want to make "live".

```typescript
// src/features/products/controllers/products.controller.ts

// ...
list: igniter.query({
  path: '/',
  query: z.object({ limit: z.number().optional().default(10) }),
  stream: true, // <-- IMPORTANT: This makes the query "live"
  handler: async ({ context, query, response }) => {
    const products = await context.database.product.findMany({ take: query.limit });
    return response.success({ products });
  }
})
// ...
```

**Step 2: Use the Query on the Frontend**

In a Client Component, use the `useQuery` hook as you normally would. No extra configuration is needed.

```tsx
// src/features/products/presentation/components/ProductListInteractive.tsx
'use client';
import { api } from '@/igniter.client';

export function ProductListInteractive() {
  // This hook is now subscribed to real-time updates for 'products.list'
  const { data, isLoading } = api.products.list.useQuery();

  if (isLoading) return <p>Loading...</p>;

  // `data` will automatically update when a mutation invalidates it.
  return (
    <ul>
      {data?.products.map(product => <li key={product.id}>{product.name}</li>)}
    </ul>
  );
}
```

**Step 3: Trigger Updates from a Mutation**

In a `mutation` action, use the `.revalidate()` method on the response. Pass the full path of the query you want to update (`controllerName.actionName`).

```typescript
// src/features/products/controllers/products.controller.ts
// ...
create: igniter.mutation({
  path: '/',
  method: 'POST',
  body: z.object({ name: z.string() }),
  handler: async ({ context, body, response }) => {
    const newProduct = await context.database.product.create({ data: body });

    // This response does two things:
    // 1. Returns the new product to the caller of the mutation.
    // 2. Notifies all clients subscribed to 'products.list' to update their data.
    return response.created(
      { product: newProduct },
      { revalidate: ['products.list'] } // <-- This triggers the real-time update
    );
  }
})
// ...
```

When this `create` mutation is called, any user viewing the `ProductListInteractive` component will see the new product appear instantly without a manual refetch or polling.

### 3.5. Advanced: Custom Data Streams

For use cases that don't map to query revalidation (e.g., live logging, notification feeds), you can use `igniter.stream` and the `useRealtime` hook to create a custom data pipe. This provides more granular control but does not have the automatic revalidation capabilities of `stream: true`.

**Backend (`igniter.stream`):**
```typescript
live: igniter.stream({
  path: '/live',
  stream: true,
  handler: ({ response }) => {
    return response.stream({
      initialData: [],
    });
  }
})
```

**Frontend (`useRealtime`):**
```tsx
api.notifications.live.useRealtime({
  onMessage: (event) => {
    console.log('Received custom event:', event.data);
  }
});
```
This pattern is powerful for specific real-time features but should be considered secondary to the automatic data sync provided by `stream: true`.

---

## 4. Key Principles & Constraints

1.  **Type Safety is Paramount**: All code modifications must preserve end-to-end type safety. Trust the TypeScript compiler.
2.  **Server vs. Client Logic**: Clearly distinguish between Server Components (direct `await` calls) and Client Components (`'use client'` and hooks). Do not use hooks in Server Components.
3.  **Single API Entry Point**: All API traffic is routed through `src/app/api/[[...all]]/route.ts`. Do not create other API route handlers unless for a specific, non-Igniter.js purpose (e.g., webhooks).
4.  **DO NOT EDIT Build Artifacts**: The files `src/igniter.client.ts` and `src/igniter.schema.ts` are automatically generated. Do not edit them manually.
5.  **Adhere to Feature-Based Architecture**: All new business logic must be encapsulated within a feature slice under `src/features/`.
6.  **Use Context for Dependencies**: Always access services like the database (`context.database`) and logger (`context.logger`) via the `context` object passed to action handlers.

---

## 5. External Documentation Links

For more detailed information on Igniter.js concepts, refer to the official documentation wiki.

-   **[Core Concepts](https://igniterjs.com/docs/core-concepts)**
-   **[Client-Side Integration](https://igniterjs.com/docs/client-side)**
-   **[Store (Redis)](https://igniterjs.com/docs/advanced-features/store)**
-   **[Queues (BullMQ)](https://igniterjs.com/docs/advanced-features/queues)**
