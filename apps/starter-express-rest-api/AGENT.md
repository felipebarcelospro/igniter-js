# AI Agent Maintenance Manual: Igniter.js Starter (Express REST API)

**Version:** 1.0.0
**For Agent Use Only.**

This document provides a technical guide for Large Language Model (LLM) based AI agents responsible for maintaining, debugging, and extending the **Igniter.js Starter for Express REST API**.

---

## 1. Project Overview

### 1.1. Name
Igniter.js Starter: Express REST API

### 1.2. Purpose
This project is a high-performance starter template for building **type-safe REST APIs**. It uses **Express.js** as the web server running on **Node.js**, with **Igniter.js** providing the core type-safe application layer. It is designed for back-end services that require a battle-tested foundation with modern, maintainable architecture.

### 1.3. Key Technologies
-   **Web Framework**: Express.js (v4.x)
-   **Runtime**: Node.js (v18+)
-   **API Framework**: Igniter.js
-   **Language**: TypeScript
-   **Caching**: Redis (via `@igniter-js/adapter-redis`)
-   **Background Jobs**: BullMQ (via `@igniter-js/adapter-bullmq`)
-   **Database ORM**: Prisma (pre-configured, requires a database connection)

---

## 2. Core Architecture

This application is a **pure API server**. It uses Express as the HTTP layer and delegates API request handling to Igniter.js.

### 2.1. Server Entry Point (`src/index.ts`)
The primary entry point is `src/index.ts`. It performs two key functions:
1.  It creates a standard Express application instance.
2.  It uses the **`expressAdapter`** from `@igniter-js/core/adapters` to mount the entire Igniter.js router as a middleware on the `/api/v1` path. This adapter is the critical link between the Express and Igniter.js ecosystems.

### 2.2. Igniter.js API Layer
The back-end business logic is powered by Igniter.js and follows a structured, feature-based pattern.
-   `src/igniter.ts`: This is the **central configuration file**. It creates the main `igniter` instance and registers all adapters (Redis store, BullMQ jobs, logger). You will modify this file only to add new global adapters or plugins.
-   `src/igniter.router.ts`: This file **assembles the main API router**. It imports all feature controllers and registers them under specific path prefixes (e.g., `example` maps to `/api/v1/example`).
-   `src/features/[feature]/controllers/`: This is where the **business logic** resides. Each controller defines API actions (`query` for GET, `mutation` for POST/PUT/etc.) and their handlers.
-   `src/services/`: Contains the initialization logic for external services like the Redis client, Prisma client, and adapter configurations.

### 2.3. Type-Safe Client (for Consumers)
The file `src/igniter.client.ts` is an auto-generated, type-safe client.
-   **Purpose**: It is intended for consumption by **external TypeScript clients** (e.g., a separate front-end application, another microservice).
-   **Constraint**: This file is a build artifact and **MUST NOT** be used internally within this project.

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
5.  **Verification**: The endpoint `GET /api/v1/products` is now active. The `expressAdapter` will automatically route requests to this new action.

### 3.2. How to Add a Background Job

**Objective**: Create a job to process a newly uploaded product image.

1.  **Define Job**: Open `src/services/jobs.ts` and add the job definition inside the `jobs.router` call within `REGISTERED_JOBS`.
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
2.  **Enqueue Job**: From a relevant API action (e.g., a `products.create` mutation), enqueue the job using the `igniter.jobs` instance.
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

### 3.3. How to Modify the Database Schema

1.  **Edit Schema**: Modify the `prisma/schema.prisma` file.
2.  **Generate Client**: After saving the schema, run the following command to update the Prisma client types:
    ```bash
    npx prisma generate
    ```
3.  **Apply Changes**: To apply the schema changes to the database:
    ```bash
    npx prisma db push
    ```

---

## 4. Key Principles & Constraints

1.  **Type Safety is Paramount**: All code modifications must preserve end-to-end type safety. Trust the TypeScript compiler; if it reports an error, the issue is valid.
2.  **Express as a Thin Wrapper**: Treat Express (`src/index.ts`) solely as the HTTP server and entry point. All application and business logic MUST reside within the Igniter.js structure (controllers, procedures, etc.). Do not add business logic handlers directly to the Express `app`.
3.  **DO NOT EDIT Build Artifacts**: The files `src/igniter.client.ts` and `src/igniter.schema.ts` are automatically generated. Do not edit them manually.
4.  **Adhere to Feature-Based Architecture**: All new business logic must be encapsulated within a feature slice under `src/features/`.
5.  **Use Context for Dependencies**: Always access services like the database (`context.database`), logger (`context.logger`), and store (`context.store`) via the `context` object passed to action handlers. **Never import service instances directly into controllers.**
6.  **Environment Variables**: All required secrets and configurations must be defined in the `.env` file.

---

## 5. External Documentation Links

For more detailed information on Igniter.js concepts, refer to the official documentation wiki.

-   **[Core Concepts](https://github.com/felipebarcelospro/igniter-js/wiki/Core-Concepts)**: Understand Actions, Controllers, Context, and the builder pattern.
-   **[Adapters](https://github.com/felipebarcelospro/igniter-js/wiki/Adapters)**: Learn more about integrating with frameworks like Express.
-   **[Store Adapter (Redis)](https://github.com/felipebarcelospro/igniter-js/wiki/Store-Adapter)**: Learn about caching and Pub/Sub.
-   **[Job Queue Adapter (BullMQ)](https://github.com/felipebarcelospro/igniter-js/wiki/Job-Queue-Adapter)**: Learn how to define and manage background jobs.