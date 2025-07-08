# Procedures: Reusable, Type-Safe Middleware

In Igniter.js, a **Procedure** is a powerful, reusable function that runs before your action's handler. It is the framework's implementation of the middleware pattern, but with a type-safe twist: procedures can dynamically extend the `context` object, providing new, fully-typed data to subsequent procedures or the final action handler.

Procedures are the ideal place to handle cross-cutting concerns, such as:

*   **Authentication & Authorization**: Checking if a user is logged in and has the necessary permissions.
*   **Logging**: Recording information about incoming requests.
*   **Rate Limiting**: Protecting your API from abuse.
*   **Data Transformation**: Pre-processing incoming data before it reaches your business logic.

By abstracting this logic into procedures, you keep your action handlers clean, focused on their core business logic, and highly reusable.

## 1. Creating a Basic Procedure

You create a procedure using the `igniter.procedure()` factory function. The core of a procedure is its `handler` function.

**Example: A Simple Logging Procedure**

This procedure logs the path of every request that uses it.

```typescript
// src/features/logging/procedures/request-logger.procedure.ts
import { igniter } from '@/igniter';

export const requestLogger = igniter.procedure({
  /**
   * The handler function is the heart of the procedure.
   * It receives the same context object as an action.
   */
  handler: async ({ request, context }) => {
    context.logger.info(`Incoming request to: ${request.path}`);

    // This procedure doesn't return anything, so it doesn't modify the context.
    // The request will simply proceed to the next function in the chain.
  },
});
```

To use it, you add it to the `use` array in any action:

```typescript
import { requestLogger } from '@/features/logging/procedures/request-logger.procedure';

// ... inside a controller
myAction: igniter.query({
  path: '/some-data',
  use: [requestLogger], // Apply the logger procedure
  handler: async ({ response }) => {
    return response.success({ data: '...' });
  },
}),
```

## 2. The Core Concept: Extending the Context

The most powerful feature of Igniter.js procedures is their ability to dynamically and safely add properties to the `context` object.

**How it works:** If a procedure's `handler` returns an object, that object is **deeply merged** into the context that is passed to the next procedure or the final action handler. Igniter.js infers these changes at compile time, providing full TypeScript autocompletion and type safety.

**Use Case: An Authentication Procedure**

Let's create a procedure that validates a session token and adds the authenticated `user` to the context.

```typescript
// src/features/auth/procedures/auth.procedure.ts
import { igniter } from '@/igniter';
import { findUserById } from '@/services/user'; // Your user service logic

export const auth = igniter.procedure({
  handler: async ({ request, response }) => {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      // Returning a response here will halt the request chain
      // and send the response to the client immediately.
      return response.unauthorized({ message: 'User ID is missing' });
    }

    const user = await findUserById(userId);
    if (!user) {
      return response.unauthorized({ message: 'Invalid user' });
    }

    // This is the key part!
    // We return an object that will be merged into the context.
    return {
      // The key 'auth' will be added to the final context object.
      auth: {
        user: {
          id: user.id,
          email: user.email,
          roles: user.roles,
        },
      },
    };
  },
});
```

Now, when we use this `auth` procedure, the action's handler will have access to `context.auth.user`:

```typescript
// in a controller
getProfile: igniter.query({
  path: '/me',
  use: [auth], // Apply the auth procedure
  handler: async ({ context, response }) => {
    // TypeScript knows `context.auth.user` exists and what its type is!
    // It also still knows about `context.database` from the base context.
    const currentUser = context.auth.user;

    return response.success({ profile: currentUser });
  },
}),
```
Igniter.js automatically infers that the context for `getProfile`'s handler is `IgniterAppContext & { auth: { user: ... } }`.

## 3. Parameterized Procedures for Maximum Flexibility

You can make your procedures even more powerful by designing them to accept an `options` object. This allows you to modify the procedure's behavior at the point of use.

**Use Case: Optional Authentication**

Let's refactor our `auth` procedure to handle cases where authentication is required versus optional.

```typescript
// src/features/auth/procedures/auth.procedure.ts
import { igniter } from '@/igniter';
import { findUserById } from '@/services/user';

// 1. Define the shape of the options object.
type AuthOptions = {
  isAuthRequired?: boolean;
};

export const auth = igniter.procedure({
  /**
   * The handler for a parameterized procedure receives `options` as its first argument.
   */
  handler: async (options: AuthOptions, { request, response }) => {
    const userId = request.headers.get('x-user-id');

    // If there's no user ID...
    if (!userId) {
      // ...and authentication is required, halt the request.
      if (options.isAuthRequired) {
        return response.unauthorized({ message: 'Authentication is required' });
      }
      // ...otherwise, do nothing and let the request continue without an authenticated user.
      return;
    }

    const user = await findUserById(userId);
    if (!user) {
      if (options.isAuthRequired) {
        return response.unauthorized({ message: 'Invalid user' });
      }
      return;
    }

    // If the user is valid, add them to the context as before.
    return {
      auth: { user },
    };
  },
});
```

Now you can use the same procedure for both public and protected routes:

```typescript
// A protected route that requires a user
createPost: igniter.mutation({
  path: '/',
  method: 'POST',
  use: [auth({ isAuthRequired: true })], // Authentication is mandatory
  handler: async ({ context, response }) => {
    // Here, `context.auth.user` is guaranteed to exist and is not nullable.
    const post = await context.database.post.create({ authorId: context.auth.user.id });
    return response.created(post);
  },
}),

// A public route that shows more info if the user is logged in
getPublicPost: igniter.query({
  path: '/:id',
  use: [auth({ isAuthRequired: false })], // Authentication is optional
  handler: async ({ context, response }) => {
    // Here, `context.auth.user` might be undefined.
    // TypeScript will correctly type it as `User | undefined`.
    if (context.auth?.user) {
      // show extra data for logged-in users
    }
    // ... logic to fetch post
  },
}),
```

This pattern of creating parameterized procedures is extremely powerful and is a cornerstone of writing clean, DRY, and highly reusable code in Igniter.js.

### Next Steps

Now that you've mastered the building blocks of business logic, it's time to assemble them into a cohesive API.

*   **Learn about [Routing](./05-Routing.md)**