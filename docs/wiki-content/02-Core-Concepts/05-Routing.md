# Routing: Assembling Your API

The **Igniter.js Router** is the final and most crucial step in the backend configuration process. Its purpose is to take all the individual `Controllers` you've built and assemble them into a single, unified, and fully-routable API.

The `AppRouter`, which you create in `src/igniter.router.ts`, becomes the single source of truth for your entire API's structure. It's not just a request handler; it's a complete, type-safe definition of every endpoint, which is later used to power the end-to-end type safety of the client.

## 1. Creating the Application Router

You create your application's router using the `igniter.router()` factory function. This is typically done once in `src/igniter.router.ts`.

**Example: A typical `igniter.router.ts` file**

```typescript
// src/igniter.router.ts
import { igniter } from '@/igniter';

// 1. Import all the controllers you've created
import { userController } from '@/features/user/controllers/user.controller';
import { postController } from '@/features/post/controllers/post.controller';

/**
 * The main application router.
 * It combines all controllers into a single API definition.
 */
export const AppRouter = igniter.router({
  /**
   * The base URL of your application. This is used for generating
   * absolute URLs and is important for server-side clients.
   * Recommended: Use an environment variable.
   */
  baseURL: process.env.APP_URL || 'http://localhost:3000',

  /**
   * A global path prefix for all API routes.
   * This is useful for versioning your API (e.g., /api/v1).
   */
  basePATH: '/api/v1',

  /**
   * The collection of all controllers registered with this router.
   */
  controllers: {
    // 2. Register your controllers here
    users: userController,
    posts: postController,
  },
});

/**
 * We export the *type* of the AppRouter.
 * This is crucial for providing type safety to the client without
 * bundling any server-side code.
 */
export type AppRouter = typeof AppRouter;
```

## 2. Router Configuration Explained

Let's break down the configuration options for `igniter.router()`:

### `controllers`

This is the most important property. It's an object where you register all the feature controllers that make up your API.

*   **The `key` is important:** The key you assign to each controller (e.g., `users`, `posts`) directly maps to the namespace used on the type-safe client. Registering `users: userController` is what enables you to later call `api.users.list.useQuery()` on the frontend.
*   **The `value` is the controller instance** created with `igniter.controller()`.

### `basePATH`

This is a string that will be prepended to all routes in your application. It's the standard way to handle API versioning.

*   **Controller Path:** `/users`
*   **Action Path:** `/:id`
*   **`basePATH`:** `/api/v1`
*   **Final URL Path:** `/api/v1/users/:id`

### `baseURL`

This is the full root URL of your server. While not always used for routing incoming requests, it's essential for a few key scenarios:
*   **Server-Side Rendering (SSR):** When fetching data on the server, the client needs to know the full URL to call.
*   **Generating Absolute URLs:** If you need to generate a full link to an API resource (e.g., in an email), the router can use the `baseURL` to construct it.

## 3. Integrating the Router with a Web Framework

The `AppRouter` object exposes a `handler` function that is framework-agnostic. It's designed to work with the standard Web `Request` and `Response` objects, making it compatible with any modern Node.js web framework.

### Integration with Next.js (Recommended)

Igniter.js provides a dedicated adapter for Next.js App Router to make integration seamless.

Create a catch-all route handler at `src/app/api/v1/[[...all]]/route.ts`:

```typescript
// src/app/api/v1/[[...all]]/route.ts
import { AppRouter } from '@/igniter.router';
import { nextRouteHandlerAdapter } from '@igniter-js/core/adapters';

/**
 * The adapter takes your AppRouter and returns an object containing
 * handlers for each HTTP method (GET, POST, etc.).
 * Next.js will automatically call the correct handler based on the
 * incoming request's method.
 */
export const { GET, POST, PUT, DELETE, PATCH } = nextRouteHandlerAdapter(AppRouter);
```

This single file is all you need to connect your entire Igniter.js API to your Next.js application.

### Integration with Other Frameworks (e.g., Express)

You can easily create your own adapter for other frameworks like Express or Hono.

```typescript
// Example for an Express server
import express from 'express';
import { AppRouter } from '@/igniter.router';
import { createExpressAdapter } from './my-express-adapter'; // A simple custom adapter

const app = express();

// Use the handler for all routes matching the base path
app.use('/api/v1/*', createExpressAdapter(AppRouter.handler));

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
```

## 4. The Router's Role in End-to-End Type Safety

The `AppRouter` object is more than just a request handler. It is a deeply-typed representation of your entire API. This static object contains all the information about every controller, action, path, input schema, and output type.

When you create your **Type-Safe Client**, you will import the *type* of `AppRouter` (`type AppRouter = typeof AppRouter`). The client uses this type to generate a fully-typed SDK for your frontend, ensuring that your backend and frontend are always perfectly in sync.

### Next Steps

Congratulations! You have now learned how to build a complete, fully-functional backend with Igniter.js. You can define the application's core with the Builder, manage dependencies with Context, write business logic in Controllers and Actions, create reusable middleware with Procedures, and finally, assemble everything with the Router.

The next logical step is to learn how to consume this powerful, type-safe API from a frontend application.

*   **Explore the [Client-Side Integration](./04-Client-Side/01-API-Client.md)**