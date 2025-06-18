<div align="center">
  <a href="https://github.com/felipebarcelospro/igniter-js">
    <img src="https://raw.githubusercontent.com/felipebarcelospro/igniter-js/main/.github/assets/igniter-logo-light.svg" alt="Igniter Logo" width="200">
  </a>
  <br />
  <h1>Igniter</h1>
  <p>
    <b>Type-Safe, Builder-Centric HTTP Framework for Modern TypeScript Applications</b>
  </p>
  <p>
    Build robust, scalable, and type-safe APIs with an unparalleled developer experience. Igniter combines the power of a builder-centric architecture with first-class support for modern protocols like MCP, making it the ultimate choice for your next project.
  </p>
  <br />
  <a href="https://www.npmjs.com/package/@igniter-js/core">
    <img src="https://img.shields.io/npm/v/@igniter-js/core.svg?style=flat&colorA=000000&colorB=000000" alt="NPM Version">
  </a>
  <a href="https://github.com/felipebarcelospro/igniter-js/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/@igniter-js/core.svg?style=flat&colorA=000000&colorB=000000" alt="License">
  </a>
  <a href="https://www.typescriptlang.org/">
    <img src="https://img.shields.io/badge/TypeScript-5.0+-blue.svg?style=flat&colorA=000000&colorB=000000" alt="TypeScript">
  </a>
</div>

---

Igniter is not just another framework; it's a new way of building APIs. Designed from the ground up to be **incrementally adoptable**, **fully type-safe**, and **incredibly flexible**. Whether you're building a simple API for your startup or a complex, multi-tenant system for an enterprise, Igniter provides the tools you need to succeed.

## Key Features

- 🏗️ **Builder-Centric Architecture**: A fluent, chainable API to build your server by composing middleware, security policies, and configurations with full type-safety.
- 🤖 **First-Class MCP Support**: Seamlessly create [Model Context Protocol](https://docs.google.com/document/d/1W2adwGVIe_k1iSV_Mh_3oT2sA8x0aW_95T2j3IG53gM/edit) servers with automatic type inference from your existing Igniter router.
- 🛡️ **Built-in Security Procedures**: Production-ready procedures for Authentication (JWT/Session), CORS, and Rate Limiting. Highly configurable and secure by default.
- 🔄 **End-to-End Type Safety**: From your database to your client, Igniter guarantees type safety, catching errors at build time, not runtime.
- 🔌 **Framework Agnostic**: Deploy anywhere. Igniter integrates effortlessly with Next.js, Express, Fastify, Bun, or any Node.js environment.
- ⚡ **Optimized for DX**: Enjoy a world-class developer experience with minimal boilerplate, intuitive APIs, and comprehensive IntelliSense.

## Installation

Get started in seconds. Igniter is a single package with zero required dependencies.

```bash
bun add @igniter-js/core
# or pnpm, yarn, npm
```

## Quick Start: Your First API in 5 Minutes

Let's create a fully-functional, type-safe API endpoint.

### 1. Define the Context

The context is the heart of your application, holding shared data like database connections or user info.

```typescript
// src/igniter/context.ts
export interface AppContext {
  db: {
    // Your DB client, e.g., Prisma
    user: {
      findFirst: (args: any) => Promise<{ id: string; name: string } | null>
    }
  },
  user?: { id: string; name: string; role: 'admin' | 'user' }
}
```

### 2. Initialize with the Builder

Create your Igniter instance using the powerful builder pattern.

```typescript
// src/igniter/index.ts
import { Igniter } from '@igniter-js/core';
import type { AppContext } from './context';

export const igniter = Igniter.context<AppContext>().create();
```

### 3. Create a Controller

Controllers group related API actions together.

```typescript
// src/features/users/user.controller.ts
import { z } from 'zod';
import { igniter } from '@/igniter';

export const userController = igniter.controller({
  path: '/users',
  actions: {
    getById: igniter.query({
      path: '/:id',
      params: z.object({
        id: z.string(),
      }),
      handler: async ({ request, response, context }) => {
        const { id } = request.params;
        const user = await context.db.user.findFirst({ where: { id } });

        if (!user) {
          return response.notFound(`User with id ${id} not found`);
        }

        return response.success({ user });
      },
    }),
  },
});
```

### 4. Build the Router

The router assembles all your controllers into a single, cohesive API.

```typescript
// src/igniter/router.ts
import { igniter } from '.';
import { userController } from '@/features/users/user.controller';

export const appRouter = igniter.router({
  controllers: {
    users: userController,
  },
});

export type AppRouter = typeof appRouter;
```

### 5. Deploy Anywhere

Expose your router using your favorite framework. Here's an example with **Next.js Route Handlers**:

```typescript
// src/app/api/[[...igniter]]/route.ts
import { nextRouteHandlerAdapter } from '@igniter-js/core/adapters';
import { appRouter } from '@/igniter/router';
import { createContext } from '@/igniter/context'; // Your function to create the context

const handler = nextRouteHandlerAdapter({
  router: appRouter,
  context: createContext, // Pass your context creation function
});

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };
```

That's it! You now have a fully type-safe endpoint at `/api/users/:id`.

---

## Core Concepts

Dive deeper into the powerful features that make Igniter unique.

### The Builder-Centric API

Go beyond the basics by extending the Igniter builder to apply global middleware, security policies, and configurations. The context is automatically enriched and typed every step of the way.

```typescript
// src/igniter/index.ts
import { Igniter } from '@igniter-js/core';
import { corsProcedure, rateLimitProcedure } from '@igniter-js/core/procedures';
import type { AppContext } from './context';

const t = Igniter.context<AppContext>()
  .extend(builder => builder
    // Apply global middleware that runs on every request
    .middleware([
      corsProcedure({
        origin: (origin) => origin.endsWith('.your-domain.com'),
        credentials: true
      }),
      rateLimitProcedure({
        windowMs: 60 * 1000, // 1 minute
        max: 100,
        message: "You are being rate limited."
      })
    ])
    // Add security policies and other configurations
    .security({
      // ... your security configs
    })
  )
  .create();

// Now, create a procedure that enriches the context
const authProcedure = t.procedure({
  handler: async ({ request }) => {
    // Imagine you validate a token and get a user
    const user = { id: '123', name: 'John Doe', role: 'admin' as const };
    return { user }; // This 'user' is now added to the context
  }
});

// Use it in an action, and `ctx.user` is fully typed!
const protectedAction = t.query({
  use: [authProcedure()],
  handler: ({ context, response }) => {
    // context.user is available and typed as { id: string; name: string; role: 'admin' }
    if (context.user.role !== 'admin') {
      return response.forbidden('Admins only');
    }
    return response.success({ secret: 'data' });
  }
});
```

### Security Procedures

Stop reinventing the wheel. Igniter provides production-grade security middleware out of the box.

- `authProcedure`: Handles complex authentication flows (JWT, Session, Custom) and enriches the context with the authenticated user.
- `corsProcedure`: Manages Cross-Origin Resource Sharing with fine-grained control.
- `rateLimitProcedure`: Protects your API from abuse with flexible rate-limiting strategies.

**Example: A secure-by-default builder**

```typescript
import { authProcedure, corsProcedure, rateLimitProcedure } from '@igniter-js/core/procedures';

const igniter = Igniter.context<AppContext>()
  .extend(builder => builder
    .middleware([
      corsProcedure({ /* ... */ }),
      rateLimitProcedure({ /* ... */ }),
      authProcedure({ // This will now run on every request
        jwt: { secret: process.env.JWT_SECRET! },
        onError: ({ response }) => response.unauthorized('Invalid Token')
      })
    ])
  )
  .create();

// Every handler created with this `igniter` instance will now have
// `ctx.user` automatically typed and available, or will fail with a 401.
```

## Advanced: Model Context Protocol (MCP)

Supercharge your application by exposing your API to Large Language Models (LLMs) through the Model Context Protocol. Igniter's adapter makes this incredibly simple and **fully type-safe**.

The `createMcpAdapter` automatically infers all your routes, inputs, and outputs from your `AppRouter`, creating a compliant MCP server instantly.

```typescript
// src/mcp/server.ts
import { createMcpAdapter } from '@igniter-js/core/adapters';
import { appRouter } from '@/igniter/router';
import { createContext, AppContext } from '@/igniter/context';

const mcpServer = createMcpAdapter(appRouter, {
  server: {
    name: 'MyAwesomeApp',
    version: '1.0.0',
  },
  // The context function is fully typed.
  // `baseContext` is the initial context from your HTTP request.
  context: async (baseContext: AppContext) => {
    // You can add more context specific to your MCP server
    return {
      ...baseContext,
      llm: { // e.g., an LLM client
        generate: (prompt: string) => `Generated: ${prompt}`,
      },
    };
  },
  // Define custom tools the LLM can use.
  tools: {
    summarizeText: {
      name: 'summarizeText',
      description: 'Summarizes a given text.',
      inputSchema: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
      // The context here is the enriched MCP context!
      handler: async ({ text }, context) => {
        const summary = await context.llm.generate(`Summarize: ${text}`);
        return { summary };
      },
    },
  },
  instructions: 'You are a helpful assistant for MyAwesomeApp. Use the available tools to help the user.',
});

// Expose the MCP handler, e.g., in a Next.js route
export default mcpServer.handler;
```

With this, you have a powerful, type-safe bridge between your API and the world of AI.

## Client-Side Integration (React)

Igniter provides a seamless experience for frontend development with its React client, offering hooks for queries, mutations, and cache management.

### 1. Create the Client

```typescript
// src/lib/igniter-client.ts
import { createIgniterClient } from '@igniter-js/core/client';
import type { AppRouter } from '@/igniter/router';

export const api = createIgniterClient<AppRouter>({
  // Configure your API client
});
```

### 2. Use the Hooks

Fetch data and perform mutations with fully-typed hooks that feel like magic.

```tsx
// src/components/UserProfile.tsx
import { api } from '@/lib/igniter-client';

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = api.users.getById.useQuery({
    params: { id: userId },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  // `data` is fully typed based on your `getById` action's return type!
  // e.g., { user: { id: string; name: string } }
  return <h1>{data.user.name}</h1>;
}
```

## Contributing

Contributions are welcome! Please see our [contributing guidelines](CONTRIBUTING.md) for more details on how to get involved.

## License

Igniter is licensed under the [MIT License](LICENSE). 