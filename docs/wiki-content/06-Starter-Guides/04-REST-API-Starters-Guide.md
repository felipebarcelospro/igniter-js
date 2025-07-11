# Guide: Building High-Performance, Type-Safe REST APIs with Igniter.js

**Words**: ~2400

Welcome to the definitive guide for building backend services with the Igniter.js REST API starters. This document provides a comprehensive walkthrough for creating high-performance, scalable, and fully type-safe REST APIs.

Igniter.js offers several starter templates for building headless backend services, allowing you to choose the runtime and ecosystem that best fits your needs without compromising on architecture or developer experience. This guide covers the three primary REST API starters:

1.  **Node.js + Express**: For developers who want a battle-tested, robust foundation with the world's most popular Node.js web framework.
2.  **Bun REST API**: For those who want to leverage Bun's incredible speed and all-in-one toolkit for a next-generation backend.
3.  **Deno REST API**: For developers who prioritize security and modern, web-standard APIs in a TypeScript-first runtime.

While each starter uses a different underlying runtime, their core architecture and development workflow within Igniter.js are **nearly identical**. This guide will walk you through the common patterns and highlight the specific differences where they matter.

---

## 1. Core Philosophy: The Headless, Type-Safe Backend

These starters are designed to build **headless services**. This means they are pure API servers, focused exclusively on processing requests and returning data (typically as JSON). They do not serve any HTML, CSS, or frontend assets.

### 1.1. A Structured, Scalable Architecture
The core philosophy is to provide a clean, structured, and scalable architecture for your business logic. Instead of placing all your logic in a single file or a flat directory of route handlers, Igniter.js promotes a **feature-based architecture**. Each distinct part of your application (e.g., "users," "invoices," "products") lives in its own self-contained feature directory. This makes the codebase easy to navigate, maintain, and scale.

The runtime (Express, Bun, or Deno) acts as a **thin HTTP layer**. Its only job is to receive an incoming HTTP request and pass it along to the Igniter.js engine for processing. All the complex work—routing, validation, middleware, and business logic—is handled by Igniter.js.

### 1.2. Type Safety for Your Consumers
The most powerful feature of a headless Igniter.js API is the type safety it provides to its **consumers**. An API is useless without clients (a web app, a mobile app, another microservice). Igniter.js ensures that the contract between your API and its clients is never broken.

It achieves this by automatically generating two critical artifacts:
-   `src/igniter.schema.ts`: A JSON schema representation of your entire API router.
-   `src/igniter.client.ts`: A fully-typed TypeScript client that can be used to call your API.

These files can be packaged and published (e.g., as a private NPM package), giving your client developers a fully-typed SDK for interacting with your backend. If you change an endpoint, the client's TypeScript compiler will immediately flag the error, preventing runtime bugs.

---

## 2. Getting Started: From Zero to a Running API Server

Let's walk through the initial setup process.

### Prerequisites
-   Your chosen runtime:
    -   Node.js (v18+) for the Express starter.
    -   Bun (v1.0+) for the Bun starter.
    -   Deno (v1.x+) for the Deno starter.
-   Docker and Docker Compose (for the database and Redis).

### Installation and Setup
1.  **Initialize the Project**: Use the Igniter.js CLI to scaffold your new API project.
    ```bash
    npx @igniter-js/cli init my-awesome-api
    ```
    During the interactive setup, you'll be asked to choose a framework. Select your desired REST API starter (e.g., `Express REST API`). Also, enable the **Store (Redis)** and **Queues (BullMQ)** features to follow along with this guide.

2.  **Configure Environment**: `cd my-awesome-api`. Rename `.env.example` to `.env`. The default `DATABASE_URL` and `REDIS_URL` are pre-configured to work with the provided Docker setup.

3.  **Start Background Services**: Launch the PostgreSQL and Redis containers.
    ```bash
    docker-compose up -d
    ```

4.  **Install Dependencies & Sync DB**: This step varies slightly depending on your chosen starter.
    -   **For Express/Node.js**:
        ```bash
        npm install
        npx prisma db push
        ```
    -   **For Bun**:
        ```bash
        bun install
        bunx prisma db push
        ```
    -   **For Deno**: Deno manages dependencies via `deno.json`, so there's no install step.
        ```bash
        deno task prisma:db:push
        ```

5.  **Run the Development Server**:
    -   **For Express/Node.js**: `npm run dev`
    -   **For Bun**: `bun run dev`
    -   **For Deno**: `deno task dev`

Each of these commands will start the development server with file-watching enabled. When you make changes to your backend controllers, the server will restart, and the type-safe client will be regenerated automatically.

---

## 3. Architecture Deep Dive: Same Core, Different Engines

The beauty of these starters is their shared core architecture. However, their entry points differ slightly to match the conventions of their respective runtimes.

### 3.1. The Entry Point (`src/index.ts`): The Key Difference

This file is where the underlying runtime is configured to hand off requests to Igniter.js.

**Express REST API Starter (`src/index.ts`)**
The Express starter uses the `expressAdapter`. It creates a standard Express app and mounts the Igniter.js router as a middleware. This is a classic and highly robust pattern.

```typescript
import express from 'express';
import { AppRouter } from './igniter.router';
import { expressAdapter } from '@igniter-js/core/adapters';

const app = express();
const port = process.env.PORT || 3000;

// All requests to /api/v1/* are handled by Igniter.js
app.use('/api/v1', expressAdapter(AppRouter));

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
```

**Bun REST API Starter (`src/index.ts`)**
The Bun starter uses the high-performance native `Bun.serve` API. It inspects the request URL and forwards API traffic to the Igniter.js handler.

```typescript
import { AppRouter } from './igniter.router';

const server = Bun.serve({
  port: process.env.PORT || 3000,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/v1')) {
      // Let Igniter.js handle the request
      return AppRouter.handler(request);
    }
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Listening on http://localhost:${server.port}`);
```

**Deno REST API Starter (`src/index.ts`)**
The Deno starter is very similar to Bun's, using Deno's native `Deno.serve`. It leverages the import map in `deno.json` for dependency management.

```typescript
import { serve } from 'std/http/server.ts';
import { AppRouter } from '@/igniter.router.ts'; // Note the .ts extension

serve(async (request: Request) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/v1/')) {
    // Let Igniter.js handle the request
    return AppRouter.handler(request);
  }
  return new Response('Not Found', { status: 404 });
});
```

### 3.2. The Common Core
**Beyond the entry point, the rest of your application is identical across all three starters.** All business logic, database interactions, and feature definitions reside in the same set of files:
-   `src/igniter.ts`: Where the core `igniter` instance is built and configured.
-   `src/igniter.router.ts`: Where all feature controllers are imported and assembled into the main `AppRouter`.
-   `src/features/`: The home for all your business logic, organized by feature.

This consistency means you can learn the Igniter.js patterns once and apply them anywhere, regardless of your preferred JavaScript runtime.

---

## 4. Building Our First Feature: A "Snippets" API

Let's build an API for storing and retrieving code snippets.

### Step 1: Define the Schema
Open `prisma/schema.prisma` and add a `Snippet` model.

```prisma
// prisma/schema.prisma
model Snippet {
  id          String   @id @default(cuid())
  title       String
  language    String   // e.g., "typescript", "python"
  code        String
  createdAt   DateTime @default(now())
}
```

### Step 2: Apply Database Changes
Run the `prisma db push` command appropriate for your starter.

### Step 3: Scaffold the Feature with the CLI
This command is the same for all starters.
```bash
npx @igniter-js/cli generate feature snippets --schema prisma:Snippet
```
This generates a full CRUD API for snippets inside `src/features/snippets/`.

### Step 4: Register the Controller
Open `src/igniter.router.ts` and register the new controller.

```typescript
// src/igniter.router.ts
import { igniter } from '@/igniter';
import { snippetsController } from '@/features/snippets'; // 1. Import

export const AppRouter = igniter.router({
  controllers: {
    snippets: snippetsController, // 2. Register
  },
});
```

### Step 5: Test the API with `curl`
Your API is now live. Let's test it from the command line.

```bash
# Create a new snippet
curl -X POST http://localhost:3000/api/v1/snippets \
     -H "Content-Type: application/json" \
     -d '{"title": "Hello World", "language": "typescript", "code": "console.log(\"Hello, World!\");"}'

# Retrieve all snippets
curl http://localhost:3000/api/v1/snippets
```

---

## 5. Advanced Features in a Headless Context

### 5.1. Background Jobs with Igniter Queues
Imagine you want to perform syntax highlighting on a snippet after it's saved, which might be a slow process. This is a perfect use case for a background job.

**1. Define the Job**
In `src/services/jobs.ts`:
```typescript
// src/services/jobs.ts
// ... inside REGISTERED_JOBS.system.jobs
syntaxHighlight: jobs.register({
  name: 'syntaxHighlight',
  input: z.object({ snippetId: z.string() }),
  handler: async ({ input, log }) => {
    log.info(`Performing syntax highlighting for snippet ${input.snippetId}...`);
    // ... slow processing logic here ...
    await new Promise(res => setTimeout(res, 3000));
    log.info(`Highlighting complete for ${input.snippetId}.`);
  }
}),
```

**2. Enqueue the Job from the `create` Mutation**
In `src/features/snippets/controllers/snippets.controller.ts`:
```typescript
// ... inside the create mutation handler
const snippet = await context.database.snippet.create({ data: body });

// Enqueue the job without waiting for it to finish
await igniter.jobs.system.enqueue({
  task: 'syntaxHighlight',
  input: { snippetId: snippet.id },
});

return response.created({ snippet });
```
The API responds instantly, and the slow task runs in the background.

### 5.2. Caching with the Igniter Store (Redis)
To improve performance for frequently accessed snippets, you can cache them in Redis.

```typescript
// In the getById action handler in the snippets controller
const { id } = params;
const cacheKey = `snippet:${id}`;

// 1. Try to fetch from cache first
let snippet = await igniter.store.get<Snippet>(cacheKey);

if (!snippet) {
  // 2. If not found, get from database
  snippet = await context.database.snippet.findUnique({ where: { id } });
  if (snippet) {
    // 3. Save it to the cache for an hour
    await igniter.store.set(cacheKey, snippet, { ttl: 3600 });
  }
}

if (!snippet) {
  return response.notFound({ message: 'Snippet not found' });
}
return response.success({ snippet });
```

---

## 6. Consuming Your Type-Safe API

The primary output of your API project for other developers is the set of generated client files.

-   `dist/igniter.client.mjs`
-   `dist/igniter.schema.json`
-   `dist/igniter.client.d.ts` (the type definitions)

You have two main strategies for sharing these with your client applications:

**Strategy 1: Publish a Private NPM Package**
This is the most robust approach for larger teams. You can configure your `package.json` to only include the `dist` directory and publish it to a private registry like GitHub Packages or npm Pro.

Your frontend team can then install it like any other package:
```bash
npm install @my-org/my-awesome-api-client
```
They get a fully typed, ready-to-use client for interacting with your API.

**Strategy 2: Monorepo Integration**
If your frontend and backend live in the same monorepo, you can often configure your build tools (like Turborepo or Nx) to allow the frontend project to directly import from the backend project's `dist` directory. This provides the tightest integration loop.

---

## Conclusion

The Igniter.js REST API starters provide a powerful, flexible, and type-safe foundation for any backend service. By decoupling the core application logic from the underlying runtime, you gain the freedom to choose the best engine for your needs (the stability of Express, the speed of Bun, or the security of Deno) while benefiting from a consistent, scalable, and highly productive development workflow.

You have learned to:
-   Set up a headless API server in your preferred runtime.
-   Understand the shared architecture and the specific role of the entry point file.
-   Use the CLI to rapidly generate full CRUD APIs from a database schema.
-   Implement advanced backend features like background jobs and caching.
-   Understand how to package and distribute the type-safe client for your API consumers.

You are now well-equipped to build robust backend services that are a pleasure to maintain and a joy for other developers to consume. Happy coding!