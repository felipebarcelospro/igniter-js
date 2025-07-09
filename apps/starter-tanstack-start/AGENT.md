# AI Agent Maintenance Manual: Igniter.js Starter (TanStack Start)

**Version:** 1.0.0
**For Agent Use Only.**

This document provides a technical guide for Large Language Model (LLM) based AI agents responsible for maintaining, debugging, and extending the **Igniter.js Starter for TanStack Start**.

---

## 1. Project Overview

### 1.1. Name
Igniter.js Starter: TanStack Start Full-Stack App

### 1.2. Purpose
This project is a modern, full-stack application template built on **TanStack Start**. It integrates an **Igniter.js** API backend, providing a seamless, end-to-end type-safe development experience powered by Vite and file-based routing.

### 1.3. Key Technologies
-   **Full-Stack Framework**: TanStack Start
-   **Build Tool**: Vite
-   **Routing**: TanStack Router (File-Based)
-   **UI Library**: React
-   **API Framework**: Igniter.js
-   **Language**: TypeScript
-   **Caching**: Redis (via `@igniter-js/adapter-redis`)
-   **Background Jobs**: BullMQ (via `@igniter-js/adapter-bullmq`)
-   **Database ORM**: Prisma

---

## 2. Core Architecture

This application is a tightly integrated full-stack project where the Igniter.js API is hosted as part of the TanStack Start application.

### 2.1. API Entry Point: TanStack Router Catch-All Route
The entire Igniter.js API is exposed through a single **catch-all API route** defined by TanStack Router.

-   **Location**: `src/routes/api/v1/$.ts`
-   **Mechanism**: This file uses `createFileRoute` to capture all requests matching the path `/api/v1/*`.
    -   The `loader` function handles `GET` and `HEAD` requests.
    -   The `action` function handles `POST`, `PUT`, `PATCH`, and `DELETE` requests.
    -   Both `loader` and `action` delegate the request directly to the `AppRouter.handler` from Igniter.js. This is the critical bridge between the two frameworks.

### 2.2. Igniter.js API Layer
The back-end business logic is defined purely within the Igniter.js structure.
-   `src/igniter.ts`: The central configuration file where the `igniter` instance is created and adapters (store, jobs, logger) are registered.
-   `src/igniter.router.ts`: Assembles the main API router by importing and registering all feature controllers.
-   `src/features/[feature]/controllers/`: This is where all business logic resides. Each controller defines API actions (`query` for GET, `mutation` for POST/PUT/etc.).

### 2.3. Type-Safe Client (`src/igniter.client.ts`)
This file is auto-generated and provides the type-safe `api` client object. This client is used in React components to interact with the API.

-   **Usage**: You MUST use the provided React hooks (`.useQuery()`, `.useMutation()`) to interact with the API from your components. These hooks manage client-side state, caching, and revalidation.
    ```typescript
    // Example in a component
    'use client';
    import { api } from '@/igniter.client';
    const { data, isLoading } = api.users.list.useQuery(); // Returns stateful hook values
    ```

### 2.4. Providers
The root layout (`src/routes/__root.tsx`) contains the `IgniterProvider`, which is **required** for all client-side hooks to function correctly. It manages the client-side cache and real-time updates.

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
      path: '/products', // Will be accessible at /api/v1/products
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
5.  **Verification**: The endpoint `GET /api/v1/products` is now active. The typed client is automatically updated, and you can immediately use `api.products.list.useQuery()` in a component.

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

1.  **Create a New Route Component**: `src/routes/products.tsx`
    ```tsx
    // src/routes/products.tsx
    import { createFileRoute } from '@tanstack/react-router';
    import { api } from '@/igniter.client';

    export const Route = createFileRoute('/products')({
      component: ProductsComponent,
    });

    function ProductsComponent() {
      // Use the type-safe hook to fetch data
      const { data, isLoading, error } = api.products.list.useQuery();

      if (isLoading) return <p>Loading products...</p>;
      if (error) return <p>Error: {error.message}</p>;

      return (
        <div>
          <h1>Products</h1>
          <ul>
            {data?.products.map(product => <li key={product.id}>{product.name}</li>)}
          </ul>
        </div>
      );
    }
    ```
2.  **File Generation**: After saving the new route file, the TanStack Router generator will automatically update `src/routeTree.gen.ts`. You can now navigate to `/products` in the application.

### 3.3. Generating the Type-Safe Client
The type-safe client (`src/igniter.client.ts`) is the bridge between your back-end and front-end. It is generated by introspecting your `AppRouter`.

-   **Manual Generation**: You can run the command `npm run build:client` (which aliases `igniter generate schema`) to perform a one-time generation. This is useful in CI/CD pipelines.
-   **Automatic Generation**: The development server (`npm run dev`) runs `igniter dev`, which automatically watches for changes in your controllers and regenerates the client instantly. This provides immediate type safety on the front-end after saving a back-end file.

### 3.4. Automatic Real-Time Updates & Caching
Igniter.js features a powerful real-time system that automatically synchronizes front-end data with back-end changes. This keeps your UI effortlessly up-to-date.

#### Step 1: Make a Query "Live"
To enable real-time updates for a query, add the `stream: true` flag to its definition. This tells Igniter.js to manage its data through the real-time layer when used with the `useQuery` hook.

```typescript
// In a controller, e.g., /features/products/controllers/products.controller.ts
list: igniter.query({
  path: '/',
  // ... other options
  stream: true, // This query now supports automatic real-time updates.
  handler: async ({ response, context }) => {
    const products = await context.database.product.findMany();
    return response.success({ products });
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
  body: CreateProductSchema,
  handler: async ({ request, response, context }) => {
    const product = await context.database.product.create({ data: request.body });

    // The .revalidate() call broadcasts a message telling all clients
    // to automatically refetch the 'products.list' query.
    return response.created({ product }).revalidate('products.list');
  }
})
```

#### Step 3: Front-End Usage (Fully Automatic)
On the front-end, the `useQuery` hook handles everything automatically. No extra configuration is needed.

```tsx
// In a React component (e.g., src/routes/products.tsx)
import { api } from '@/igniter.client';

function ProductsComponent() {
  // This hook subscribes to the 'products.list' query.
  const { data, isLoading } = api.products.list.useQuery();

  // When another user adds a product and the `create` mutation
  // calls .revalidate('products.list'), this component will
  // AUTOMATICALLY re-render with the latest data.
  // No manual refetching logic is required.

  if (isLoading) return <p>Loading...</p>;

  return (
    <ul>
      {data?.products.map(product => (
        <li key={product.id}>{product.name}</li>
      ))}
    </ul>
  );
}
```

> **Note on Custom Streams**: For different use cases like building a notification feed or a live log, Igniter.js provides `igniter.stream()` and the `useRealtime()` hook. This gives you direct access to a Server-Sent Event stream for more granular control.

---

## 4. Key Principles & Constraints

1.  **Type Safety is Paramount**: All code modifications must preserve end-to-end type safety. Trust the TypeScript compiler.
2.  **Single API Entry Point**: All API traffic is routed through `src/routes/api/v1/$.ts`. Do not create other API routes outside this pattern.
3.  **DO NOT EDIT Build Artifacts**: The files `src/igniter.client.ts`, `src/igniter.schema.ts`, and `src/routeTree.gen.ts` are automatically generated. Do not edit them manually.
4.  **Adhere to Feature-Based Architecture**: All new API business logic must be encapsulated within a feature slice under `src/features/`.
5.  **Use Context for Dependencies**: Always access services like the database (`context.database`) and logger (`context.logger`) via the `context` object passed to Igniter.js action handlers.
6.  **TanStack Router Conventions**: All front-end pages and layouts are managed via file-based routing in the `src/routes` directory.

---

## 5. External Documentation Links

For more detailed information on the concepts used in this starter, refer to the official documentation.

-   **[Igniter.js Core Concepts](https://github.com/felipebarcelospro/igniter-js/wiki/Core-Concepts)**
-   **[Igniter.js React Client Integration](https://github.com/felipebarcelospro/igniter-js/wiki/React-Client-Integration)**
-   **[TanStack Start Documentation](https://tanstack.com/start/latest/docs/overview)**
-   **[TanStack Router Documentation](https://tanstack.com/router/latest/docs/overview)**