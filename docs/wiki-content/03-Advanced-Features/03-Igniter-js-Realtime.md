# Igniter.js Realtime: Live Data, Effortlessly

**Igniter.js Realtime** is the framework's integrated solution for pushing live data from the server to connected clients. Built on top of the robust and simple **Server-Sent Events (SSE)** web standard, it allows you to build real-time features like live UI updates, notifications, and activity feeds with minimal effort and maximum type safety.

The Realtime system is designed around two primary use cases:

1.  **Automatic UI Revalidation:** The most powerful feature. Automatically refetch data on your clients after a mutation on the server, ensuring your UI is always in sync with your backend state.
2.  **Custom Data Streams:** Create dedicated, real-time channels for features like notifications, chat messages, or live data dashboards.

## How It Works: The SSE Connection

Under the hood, when you enable realtime features on the client, the `IgniterProvider` establishes a single, persistent SSE connection to a dedicated endpoint on your Igniter.js server.

-   **Client-Side:** The client subscribes to specific "channels" over this single connection. These channels can be for revalidation events or for custom data streams.
-   **Server-Side:** When an event occurs (e.g., a database record is updated), the server publishes a message to the relevant channel. All clients subscribed to that channel will receive the message instantly.

This approach is highly efficient as it uses a single long-lived connection per client, avoiding the overhead of WebSockets for scenarios where only server-to-client communication is needed.

---

## 1. Automatic UI Updates with `.revalidate()`

This is the "magic" of Igniter.js Realtime. You can trigger a client-side data refetch directly from your backend mutation, ensuring that any user viewing that data sees the update instantly.

### Step 1: The Mutation (Backend)

In your `mutation` handler, after you've successfully modified data, chain the `.revalidate()` method to your response.

`.revalidate()` takes one argument: an array of **query keys** to invalidate. The query key is typically the path to the query action on your client-side `api` object (e.g., `api.users.list` becomes `'users.list'`).

```typescript
// src/features/posts/controllers/post.controller.ts
import { igniter } from '@/igniter';
import { z } from 'zod';

export const postController = igniter.controller({
  path: '/posts',
  actions: {
    // A query to list all posts
    list: igniter.query({
      path: '/',
      handler: async ({ context, response }) => {
        const posts = await context.database.post.findMany();
        return response.success({ posts });
      },
    }),

    // A mutation to create a new post
    create: igniter.mutation({
      path: '/',
      method: 'POST',
      body: z.object({ title: z.string(), content: z.string() }),
      handler: async ({ request, context, response }) => {
        const newPost = await context.database.post.create({ data: request.body });

        // This is the key part!
        // We return a successful response AND tell the client
        // to revalidate any queries associated with the 'posts.list' key.
        return response.created(newPost).revalidate(['posts.list']);
      },
    }),
  },
});
```

### Step 2: The UI Component (Frontend)

On the frontend, you simply use the `useQuery` hook as you normally would. No extra code is needed. The hook automatically listens for revalidation events.

```tsx
// app/components/PostsList.tsx
'use client';

import { api } from '@/igniter.client';

function PostsList() {
  const listPostsQuery = api.posts.list.useQuery();

  if (listPostsQuery.isLoading) {
    return <div>Loading posts...</div>;
  }

  return (
    <ul>
      {listPostsQuery.data?.posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

**What Happens?**
1.  A user is viewing the `PostsList` component.
2.  Another user (or the same user in a different tab) creates a new post, triggering the `create` mutation.
3.  The backend responds with `201 Created` and publishes a `revalidate` event for the `posts.list` key to the central SSE channel.
4.  The `IgniterProvider` on the client receives this event.
5.  It notifies the `api.posts.list.useQuery()` hook that its data is now stale.
6.  The hook automatically refetches the data from the `/posts` endpoint.
7.  The `PostsList` component re-renders with the new post, all in real-time.

---

### Scoped Revalidation: Targeting Specific Clients

Broadcasting a revalidation event to every single client is not always desirable, especially for user-specific data (e.g., updating a user's own profile). Igniter.js allows you to target specific clients by using **scopes**.

A scope is simply a string identifier that you associate with a client connection. Common scopes include a user's ID (`user:123`), their roles (`role:admin`), or a tenant ID (`tenant:abc-corp`).

**Step 1: Define Scopes on the Client**

In your `IgniterProvider`, you must define the scopes for the current client using the `getScopes` prop. This function receives the client context and should return an array of scope strings.

```tsx
// app/providers.tsx
import { IgniterProvider } from '@igniter-js/core/client';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <IgniterProvider
      // ... other props
      // Define the scopes for this connection
      getScopesIds={() => {
        'use server'
        // ctx is the client context (e.g., from useSession())
        const session = getSession()

        return [
          `user:${session.user.id}`, // Scope for this specific user
          ...session.user.roles.map(role => `role:${role}`) // Scopes for each of the user's roles
        ];
      }}
    >
      {children}
    </IgniterProvider>
  );
}
```

**Step 2: Publish to Scopes on the Backend**

Now, in your mutation, you can pass a function as the second argument to `.revalidate()`. This function receives the action's `context` and must return an array of scope strings to target. The revalidation event will **only** be sent to clients whose scopes match.

```typescript
// In a user profile update mutation
updateProfile: igniter.mutation({
  path: '/profile',
  method: 'PATCH',
  body: z.object({ name: z.string() }),
  use: [auth], // Auth procedure adds `user` to context
  handler: async ({ request, context, response }) => {
    const updatedUser = await context.database.user.update({
      where: { id: context.auth.user.id },
      data: { name: request.body.name },
    });

    // This revalidation will only be sent to the user whose ID matches.
    return response.success(updatedUser).revalidate(
      ['users.getProfile'], // The query key to invalidate
      (ctx) => [`user:${ctx.auth.user.id}`] // The target scopes
    );
  }
}),
```

This ensures that when a user updates their profile, only their own client sessions will refetch the profile data, making your real-time updates efficient and secure.

---

## 2. Custom Data Streams

For features like a live notification feed or a chat, you need to push arbitrary data to clients. This is done by creating a dedicated streamable query.

### Step 1: Create a Streamable Query (Backend)

Define a `query` action and set the `stream` property to `true`. This tells Igniter.js that this endpoint is not for fetching data via a single request, but for opening a persistent subscription channel.

The channel name will be automatically created from the query key (e.g., `api.notifications.stream` -> `'notifications.stream'`).

```typescript
// src/features/notifications/controllers/notification.controller.ts
import { igniter } from '@/igniter';

export const notificationController = igniter.controller({
  path: '/notifications',
  actions: {
    // This action establishes a subscription channel.
    stream: igniter.query({
      path: '/stream',
      stream: true, // Mark this action as a stream
      // The handler can be used for authentication or to send an initial confirmation message.
      handler: ({ response }) => {
        return response.success({ status: 'Connected to notifications stream' });
      },
    }),
  },
});
```

### Step 2: Subscribe to the Stream (Frontend)

In your React component, use the `useStream` hook to subscribe to the channel defined in the backend.

```tsx
// app/components/NotificationsBell.tsx
'use client';
import { useState } from 'react';
import { api } from '@/igniter.client';

function NotificationsBell() {
  const [notifications, setNotifications] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Subscribe to the stream
  api.notifications.stream.useStream({
    onConnect: () => {
      console.log('Successfully connected to notifications stream!');
      setIsConnected(true);
    },
    // This callback runs every time the server sends a message
    onMessage: (newMessage) => {
      console.log('New notification received:', newMessage);
      setNotifications((prev) => [...prev, newMessage.text]);
    },
    onError: (error) => {
      console.error('Stream error:', error);
      setIsConnected(false);
    }
  });

  return (
    <div>
      <span>{isConnected ? '🟢' : '🔴'}</span>
      <span>{notifications.length}</span>
      {/* ... render notifications */}
    </div>
  );
}
```

### Step 3: Publish to the Stream (Backend)

From anywhere in your backend application, you can now publish messages to this stream using the `igniter.realtime.publish()` method.

```typescript
// For example, in another action that triggers a notification
someOtherAction: igniter.mutation({
  handler: async ({ context, response }) => {
    // ... do some work ...

    // Now, publish a message to the 'notifications.stream' channel.
    // All clients subscribed via `useStream` will receive this data.
    igniter.realtime.publish('notifications.stream', {
      text: 'Your report is ready for download!',
      link: '/reports/123',
    });

    return response.success({ status: 'ok' });
  },
}),
```

This completes the loop, allowing you to push any data you want to your clients in real-time.
