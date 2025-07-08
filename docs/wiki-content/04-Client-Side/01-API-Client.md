# Client-Side: The Type-Safe API Client

The **Igniter.js API Client** is a fully type-safe SDK that is automatically generated from your backend's `AppRouter` definition. It's the bridge that connects your frontend application to your backend API, providing an exceptional developer experience with end-to-end type safety.

This means no more manual type definitions for your API responses, no more guesswork about what parameters an endpoint expects, and no more out-of-sync frontend and backend code. If your backend API changes, TypeScript will immediately notify you of any errors in your frontend code that consumes it.

## 1. Creating the API Client

The client is typically defined once in `src/igniter.client.ts`. It uses the `createIgniterClient` factory function from `@igniter-js/core/client`.

```typescript
// src/igniter.client.ts
import { createIgniterClient, useIgniterQueryClient } from '@igniter-js/core/client';
// This is a TYPE-ONLY import. No server code is bundled.
import type { AppRouter } from './igniter.router';

/**
 * Type-safe API client generated from your Igniter router.
 * This is the main object you will use to interact with your API.
 */
export const api = createIgniterClient<AppRouter>({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  basePath: process.env.NEXT_PUBLIC_APP_BASE_PATH || '/api/v1',

  /**
   * This function dynamically provides the router definition.
   * - On the server (e.g., in Server Components), it returns the full router instance.
   * - On the client (browser), it returns only the router's schema,
   *   which contains the API structure without any server-side logic.
   */
  router: () => {
    if (typeof window === 'undefined') {
      // Server-side: Use the full router for direct function calls.
      return require('./igniter.router').AppRouter;
    }
    // Client-side: Use the lightweight schema for fetching.
    return require('./igniter.schema').AppRouterSchema;
  },
});

/**
 * A utility type to infer the type of the API client.
 * Useful for passing the client as props.
 */
export type ApiClient = typeof api;

/**
 * A type-safe hook to get the query client instance.
 * Used for advanced cache manipulation, like manual invalidation.
 */
export const useQueryClient = useIgniterQueryClient<AppRouter>();
```

---

## 2. Understanding the Client's Anatomy

### `createIgniterClient<AppRouter>()`

This is the factory function that builds your client. The crucial part is passing your `AppRouter` type as a generic argument: `createIgniterClient<AppRouter>()`. This is what gives the client its "knowledge" of your API's structure, including all controllers, actions, input schemas, and output types.

### The `import type` Statement

```typescript
import type { AppRouter } from './igniter.router';
```

This is one of the most important lines. By using `import type`, we are telling TypeScript to only import the *type definition* of `AppRouter`, not the actual implementation code. This ensures that none of your backend server code (database connections, private logic, etc.) is ever accidentally bundled and sent to the client's browser.

### The Dynamic `router` Function

The `router` property in the configuration is designed for **universal applications** (like Next.js) where code can run on both the server and the client.

-   `if (typeof window === 'undefined')`: This checks if the code is running in a Node.js environment (the server). If so, it `require`s the full `igniter.router`, allowing for direct, high-performance function calls without an HTTP round-trip. This is perfect for React Server Components (RSC) or server-side rendering (SSR).
-   `else`: If the code is running in a browser (`window` exists), it `require`s the `igniter.schema`. This is a lightweight JSON object containing only the API structure, which is used by the client to make actual HTTP requests.

---

## 3. How to Use the `api` Client

The exported `api` object is your gateway to all backend operations. It mirrors the structure of your `AppRouter`.

### In Client Components (React)

In client-side components, you use the React hooks attached to each action.

```tsx
'use client';
import { api } from '@/igniter.client';

function UserProfile({ userId }: { userId: string }) {
  // Access the query via `api.controllerKey.actionKey.useQuery()`
  const userQuery = api.users.getById.useQuery({
    params: { id: userId }, // Type-safe parameters
  });

  if (userQuery.isLoading) return <p>Loading...</p>;

  // `userQuery.data` is fully typed based on your backend action's return type.
  return <h1>{userQuery.data?.user.name}</h1>;
}
```

### In Server Components or Server Actions

On the server, you can call the action's `.query()` or `.mutate()` method directly. This bypasses the HTTP layer for maximum performance.

```tsx
// app/users/[id]/page.tsx (React Server Component)
import { api } from '@/igniter.client';

export default async function UserPage({ params }: { params: { id: string } }) {
  // Call the action directly. No hook is needed.
  // The call is type-safe.
  const response = await api.users.getById.query({
    params: { id: params.id },
  });

  // The `response` object is also fully typed.
  const user = response.user;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

This unified API client allows you to write data-fetching logic in a consistent way, whether you are on the server or the client, all with the guarantee of end-to-end type safety.

### Next Steps

Now that you have a type-safe client, the next step is to provide it to your React application so the hooks can work.

-   **Learn about the [`<IgniterProvider>`](./02-IgniterProvider.md)**
