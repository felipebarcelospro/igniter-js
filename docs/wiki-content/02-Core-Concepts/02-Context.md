# Context: The Heart of Your Application's State

In Igniter.js, the **Context** is an object that is available in every API action and procedure. Its primary purpose is to act as a powerful, type-safe **Dependency Injection (DI)** mechanism. It holds all the services, data, and helpers your application needs to process a request, such as a database connection, the current user's session, or a logging instance.

Unlike the context in some other frameworks which is often a simple, static object, the context in Igniter.js is **dynamic and composable**. It starts with a base shape and is progressively enriched by middleware (Procedures), creating a tailored, fully-typed context for each specific action.

## 1. The Base Application Context (`AppContext`)

Everything starts with the base context. This is the global state that should be available to your entire application. You define its shape and creation logic in `src/igniter.context.ts`.

**Why it's important:** This file establishes a single source of truth for your application's core dependencies.

**Example: Defining a Context with a Database Connection**

Let's create a base context that provides a Prisma database client.

```typescript
// src/services/database.ts
import { PrismaClient } from '@prisma/client';

// Initialize the client once and export it
export const database = new PrismaClient();

// src/igniter.context.ts
import { database } from '@/services/database';

/**
 * A function that returns the base context object.
 * This function will be called for every incoming request.
 */
export const createIgniterAppContext = () => {
  return {
    database, // Provide the database client to the context
  };
};

/**
 * The TypeScript type of our base context.
 * We infer it directly from the creation function to ensure they are always in sync.
 */
export type IgniterAppContext = ReturnType<typeof createIgniterAppContext>;
```

This `IgniterAppContext` type is then passed to the Igniter Builder in `src/igniter.ts` to set the foundation for your application's type system:

```typescript
// src/igniter.ts
import { Igniter } from '@igniter-js/core';
import type { IgniterAppContext } from './igniter.context';

export const igniter = Igniter
  .context<IgniterAppContext>() // Setting the base context type
  // ... other configurations
  .create();
```

## 2. Accessing Context in an Action

Once defined, the base context is available in the `handler` of every action via the `ctx` (context) argument.

```typescript
// src/features/user/controllers/user.controller.ts
import { igniter } from '@/igniter';

export const userController = igniter.controller({
  path: '/users',
  actions: {
    list: igniter.query({
      path: '/',
      handler: async ({ context, response }) => {
        // The `context` object is fully typed!
        // TypeScript knows `context.database` exists and what methods it has.
        const users = await context.database.user.findMany();

        return response.success({ users });
      },
    }),
  },
});
```

Because we defined `database` in our `IgniterAppContext`, TypeScript provides full autocompletion and type-checking for `context.database`.

## 3. The Magic: A Dynamic, Extendable Context

Here is where Igniter.js truly shines. The context passed to your action handler is not just the base context; it's a **merged object** composed of the base context **plus** any data returned by the procedures (middleware) used in that action.

### Extending Context with Procedures

A **Procedure** can return an object from its handler. This return value is then deeply merged into the context of the next procedure in the chain, and ultimately, into the context of the final action handler.

**Use Case: An Authentication Procedure**

Let's create a procedure that verifies a user's token and adds the `user` object to the context.

```typescript
// src/features/auth/procedures/auth.procedure.ts
import { igniter } from '@/igniter';
import { verifyToken } from '@/services/auth'; // Your token verification logic

export const auth = igniter.procedure({
  handler: async ({ request, response }) => {
    const token = request.headers.get('Authorization')?.split(' ')[1];

    if (!token) {
      return response.unauthorized({ message: 'No token provided' });
    }

    const userPayload = await verifyToken(token);
    if (!userPayload) {
      return response.unauthorized({ message: 'Invalid token' });
    }

    // This is the magic!
    // We return an object that will be merged into the context.
    return {
      // The key 'user' will be added to the final context object.
      user: {
        id: userPayload.id,
        email: userPayload.email,
      },
    };
  },
});
```

### Using the Extended Context

Now, let's use this `auth` procedure in a protected route.

```typescript
// src/features/user/controllers/user.controller.ts
import { igniter } from '@/igniter';
import { auth } from '@/features/auth/procedures/auth.procedure'; // 1. Import the procedure

export const userController = igniter.controller({
  path: '/users',
  actions: {
    getProfile: igniter.query({
      path: '/me',
      // 2. Apply the procedure to this action
      use: [auth],
      handler: async ({ context, response }) => {
        // 3. Access the extended context!
        // TypeScript knows `context.user` exists because the `auth` procedure provides it.
        // It also still knows about `context.database` from the base context.
        const currentUser = context.user;
        const userDetails = await context.database.user.findUnique({
          where: { id: currentUser.id },
        });

        return response.success({ profile: userDetails });
      },
    }),
  },
});
```

Notice that we didn't have to manually tell TypeScript that `context.user` exists. Igniter.js infers this automatically from the `use: [auth]` array. The final context for the `getProfile` handler is a merged type of `IgniterAppContext & { user: { id: string; email: string; } }`.

## The Final Context Object

For any given request, the context is built layer by layer, ensuring perfect type safety and data isolation at each step.

1.  **Base Context:** The request starts with the global `IgniterAppContext` (e.g., `{ database }`).
2.  **Procedure 1:** A procedure runs, returns `{ a: 1 }`. The context becomes `{ database, a: 1 }`.
3.  **Procedure 2:** Another procedure runs, returns `{ b: 2 }`. The context becomes `{ database, a: 1, b: 2 }`.
4.  **Action Handler:** The final handler receives the fully merged and typed context: `{ database, a: 1, b: 2 }`.

This powerful, composable pattern allows you to build clean, decoupled, and highly testable business logic.

### Next Steps

Now that you understand how to manage state and dependencies with Context, let's see how to structure your API endpoints.

*   **Learn about [Controllers & Actions](./03-Controllers-and-Actions.md)**