---
description: |
  A guide to Igniter.js procedures and the context system. Explains how to create middleware for reusable business logic, dependency injection, and extending the request context in a type-safe manner.
alwaysApply: false
---

# Igniter.js: Procedures and Context

This guide covers two core concepts in Igniter.js: the **Context** system for dependency injection and **Procedures** for creating reusable middleware.

## 1. The Context System

The Context is a type-safe dependency injection mechanism that makes global services and request-specific data available throughout your API layer.

### 1.1. Base Context
The base context defines services that are available in *every* request handler. It is defined once when you initialize the Igniter instance.

-   **File Location:** `src/igniter.context.ts`
-   **Purpose:** To provide singleton services like database clients, loggers, and other providers to your actions and procedures.

```typescript
// src/igniter.context.ts
export function createContext() {
  return {
    database: prisma, // Prisma client instance
    // ... other global services
  };
}

export type IgniterAppContext = ReturnType<typeof createContext>;

// src/igniter.ts
export const igniter = Igniter
  .context<IgniterAppContext>()
  // ... rest of the configuration
  .create();
```
Inside any action handler, you can now access `context.database` in a fully type-safe way.

### 1.2. Dynamic Context Extension
The real power of the context comes from its ability to be dynamically extended on a per-request basis. **Procedures** are the mechanism for this.

When a procedure returns a value, that value is deeply merged into the `context` object, making it available to all subsequent procedures and the final action handler. This process is fully type-safe.

## 2. Procedures (`igniter.procedure`)

A Procedure is a piece of reusable logic that runs before your main action handler. It is the Igniter.js equivalent of middleware. Procedures are ideal for handling cross-cutting concerns like authentication, logging, or data transformation.

### 2.1. Creating a Simple Procedure
A procedure is a function that receives the handler context and can perform actions. If it returns an object, that object is merged into the main context.

```typescript
// A simple logging procedure
export const logProcedure = igniter.procedure({
  handler: async (_, { request, context }) => {
    context.logger.info(`Request received for path: ${request.path}`);
    // This procedure doesn't return anything, so it doesn't modify the context.
  },
});
```

### 2.2. A Procedure that Extends the Context
This is the most common pattern. Here, an authentication procedure verifies a user token and adds the user object to the context.

```typescript
// src/features/auth/procedures/auth.procedure.ts
import { getUserByToken } from '@/services/authService';

export const authProcedure = igniter.procedure({
  handler: async (_, { request, response, context }) => {
    const token = request.headers.get('Authorization');
    const user = await getUserByToken(token);

    if (!user) {
      // Procedures can short-circuit the request
      return response.unauthorized('Invalid or missing authentication token.');
    }

    // The returned object is merged into the context
    return {
      auth: {
        user: user, // Now `context.auth.user` will be available
      }
    };
  },
});
```

### 2.3. Using Procedures in Actions
You can apply one or more procedures to an action using the `use` array. They are executed in the order they are defined.

```typescript
// In a controller
getProfile: igniter.query({
  path: '/me',
  use: [authProcedure()], // Apply the auth procedure
  handler: ({ context }) => {
    // Because authProcedure ran, `context.auth.user` is now available and fully typed.
    // The base context `context.database` is also still available.
    return context.auth.user;
  },
})
```

### 2.4. Parameterized Procedures
Procedures can also accept options, making them even more flexible.

```typescript
// A procedure that can require different roles
type RoleAuthOptions = {
  role: 'ADMIN' | 'MEMBER';
};

export const roleAuthProcedure = igniter.procedure({
  handler: async (options: RoleAuthOptions, { response, context }) => {
    // Assumes authProcedure has already run and added `context.auth.user`
    const { user } = context.auth;

    if (user.role !== options.role) {
      return response.forbidden(`Requires ${options.role} role.`);
    }

    // No return value needed if we are just performing a check
  },
});

// Using the parameterized procedure in an action
deletePost: igniter.mutation({
  path: '/:id',
  method: 'DELETE',
  use: [
    authProcedure(), // First, ensure the user is authenticated
    roleAuthProcedure({ role: 'ADMIN' }), // Then, check if they are an admin
  ],
  handler: ({ request, context }) => {
    // This handler will only run if the user is an authenticated admin.
    // ... delete logic
  },
});
```
