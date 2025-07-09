# Quick Start Guide

Welcome to Igniter.js! This guide will walk you through creating your first fully type-safe API endpoint in just a few minutes. By the end, you will have a running Igniter.js application and a basic understanding of its core components.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js**: Version 18.x or higher.
*   **A Package Manager**: `npm`, `yarn`, `pnpm`, or `bun`.

## Step 1: Create a New Project

The fastest way to start with Igniter.js is by using the official CLI. The `igniter init` command scaffolds a new project with all the necessary files and configurations.

Open your terminal and run:

```bash
npx @igniter-js/cli init my-first-api
```

This will create a new directory named `my-first-api` and install the required dependencies. Navigate into your new project directory:

```bash
cd my-first-api
```

## Step 2: Explore the Project Structure

The `init` command generates a logical, feature-based project structure. Here are the key files to know:

```
src/
├── features/               # Where your business logic lives
├── services/               # Services like database connections
├── igniter.ts              # Core Igniter.js instance initialization
├── igniter.context.ts      # Application context definition
└── igniter.router.ts       # Your application's main router
```

## Step 3: Create Your First Controller

A `Controller` groups related API endpoints, which are defined as `Actions` (Queries or Mutations). Let's create a simple "hello world" controller.

Create a new file at `src/features/greeting/controllers/greeting.controller.ts`:

```typescript
// src/features/greeting/controllers/greeting.controller.ts
import { igniter } from '@/igniter';
import { z } from 'zod';

export const greetingController = igniter.controller({
  /**
   * Base path for all actions in this controller.
   * Final URL will be /greetings/...
   */
  path: '/greetings',
  actions: {
    /**
     * A simple GET request handler (a "Query").
     * Final URL will be /greetings/hello
     */
    hello: igniter.query({
      path: '/hello',
      // Define and validate query parameters with Zod
      query: z.object({
        name: z.string().optional().default('World'),
      }),
      // The main logic for the action
      handler: ({ request, response }) => {
        const { name } = request.query;
        return response.success({ message: `Hello, ${name}!` });
      },
    }),
  },
});
```

## Step 4: Add the Controller to the Router

Now, you need to register your new `greetingController` with the main application router.

Open `src/igniter.router.ts` and add your controller to the `controllers` object:

```typescript
// src/igniter.router.ts
import { igniter } from '@/igniter';
// 1. Import your new controller
import { greetingController } from '@/features/greeting/controllers/greeting.controller';

export const AppRouter = igniter.router({
  // Base URL for the entire application
  baseURL: process.env.NEXT_PUBLIC_IGNITER_APP_URL,
  basePATH: process.env.NEXT_PUBLIC_IGNITER_APP_BASE_PATH,
  controllers: {
    // 2. Register the controller
    greetings: greetingController,
    // ...other controllers may be here
  },
});

export type AppRouter = typeof AppRouter;
```

## Step 5: Run the Development Server

Igniter.js comes with a powerful interactive development server that provides real-time feedback on your API.

Run the following command in your terminal:

```bash
npm run dev
```

This will start the `igniter dev --interactive` command, and you should see the dashboard, indicating that the server is running.

## Step 6: Test Your Endpoint

Your API is now live! You can test it using a tool like `curl` or by simply opening the URL in your browser.

Open a new terminal window and run:

```bash
# Test with the default name
curl http://localhost:3000/api/v1/greetings/hello

# Expected response: {"message":"Hello, World!"}
```

Now try providing a name in the query string:

```bash
# Test with a custom name
curl http://localhost:3000/api/v1/greetings/hello?name=Igniter

# Expected response: {"message":"Hello, Igniter!"}
```

## Congratulations!

You have successfully built and tested your first API endpoint with Igniter.js. You've learned how to:

*   Scaffold a new project with `igniter init`.
*   Create a `Controller` with a `Query Action`.
*   Register the controller with the `Router`.
*   Run the interactive development server.

### Next Steps

Now that you have a feel for the basics, dive deeper into the framework's architecture:

*   **[Core Concepts](./02-Core-Concepts/01-The-Igniter-Builder.md)**: Learn about the fundamental building blocks of Igniter.js in detail.