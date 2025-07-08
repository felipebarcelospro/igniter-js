# Client-Side: The `<IgniterProvider>`

The `<IgniterProvider>` is the root component that powers the entire Igniter.js client-side experience. It is a mandatory wrapper that must be placed at the root of your React application tree.

Its primary responsibilities are:

1.  **Query Cache Management:** It initializes and provides the cache for all API queries, using [TanStack Query](https://tanstack.com/query/latest) under the hood. This enables automatic caching, re-fetching, and state management for hooks like `useQuery` and `useMutation`.
2.  **Realtime Connection:** It manages the persistent Server-Sent Events (SSE) connection to your backend, which is essential for `Igniter.js Realtime` features like automatic revalidation and custom data streams.
3.  **Client Context:** It holds the client-side context, such as the current user's session, making it available for features like scoped real-time updates.

> **Important:** None of the client-side hooks (`useQuery`, `useMutation`, `useStream`) will work unless they are descendants of an `<IgniterProvider>`.

---

## 1. Basic Setup

The provider should be placed as high up in your component tree as possible, typically in your root layout file. In a Next.js App Router application, this is often done in a dedicated `app/providers.tsx` file.

**Example: Setting up the provider**

```tsx
// app/providers.tsx
'use client';

import { IgniterProvider } from '@igniter-js/core/client';
import type { PropsWithChildren } from 'react';

export function Providers({ children }: PropsWithChildren) {
  return (
    <IgniterProvider>
      {children}
    </IgniterProvider>
  );
}
```

Then, use this `Providers` component in your root `layout.tsx`:

```tsx
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

---

## 2. Configuration Props

The `<IgniterProvider>` accepts several optional props to configure its behavior, especially for real-time features.

### `enableRealtime`

Controls whether the real-time SSE client is enabled. It defaults to `true`.

-   **Type:** `boolean`
-   **Default:** `true`

```tsx
<IgniterProvider enableRealtime={false}>
  {/* Realtime features like .revalidate() and useStream will be disabled. */}
</IgniterProvider>
```

### `autoReconnect`

If the SSE connection is lost, this prop determines whether the client will automatically try to reconnect.

-   **Type:** `boolean`
-   **Default:** `true`

```tsx
<IgniterProvider autoReconnect={false}>
  {/* The client will not attempt to reconnect if the connection drops. */}
</IgniterProvider>
```

---

## 3. Scoped Realtime with `getContext` and `getScopes`

For **scoped revalidation** to work, you must configure the `getContext` and `getScopes` props. This tells the provider which "channels" or "topics" the current client is interested in.

### `getContext`

A function that returns an object representing the client-side context. This is typically where you provide information about the currently logged-in user.

-   **Type:** `() => TContext`
-   **Purpose:** To provide data that can be used by other provider props, like `getScopes`.

### `getScopes`

A function that receives the client context (from `getContext`) and returns an array of string identifiers. These strings are the "scopes" that this client will subscribe to for real-time updates.

-   **Type:** `(context: TContext) => string[]`
-   **Purpose:** To subscribe the client to specific real-time channels.

**Example: A complete setup for a logged-in user**

```tsx
// app/providers.tsx
'use client';

import { IgniterProvider } from '@igniter-js/core/client';
import { useUserSession } from '@/hooks/use-user-session'; // Your custom hook to get user data

// Define the shape of our client context
interface ClientContext {
  user: {
    id: string;
    roles: string[];
  } | null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Assume this hook provides the current user's session data
  const { user } = useUserSession();

  return (
    <IgniterProvider
      // 1. Provide the current user's data to the client context.
      getContext={(): ClientContext => ({
        user,
      })}
      
      // 2. Use the context to determine which scopes to subscribe to.
      getScopes={(ctx: ClientContext) => {
        if (!ctx.user) {
          // If no user is logged in, subscribe to no specific scopes.
          return [];
        }
        
        // Subscribe the client to a scope for their user ID and for each of their roles.
        return [
          `user:${ctx.user.id}`,
          ...ctx.user.roles.map(role => `role:${role}`)
        ];
      }}
    >
      {children}
    </IgniterProvider>
  );
}
```

With this configuration, the client is now set up to receive targeted real-time updates. When a backend mutation calls `.revalidate(['some-key'], (ctx) => ['user:123'])`, only the client whose user ID is `123` will receive the revalidation event.

### Next Steps

Now that your application is wrapped in the provider, you're ready to start fetching and modifying data.

-   **Learn how to fetch data with [`useQuery`](./03-useQuery.md)**