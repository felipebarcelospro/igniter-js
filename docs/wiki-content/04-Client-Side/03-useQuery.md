# Client-Side: Fetching Data with `useQuery`

The `useQuery` hook is the primary tool for fetching data from your Igniter.js backend in a client-side React component. Its design is heavily inspired by modern data-fetching libraries like [TanStack Query](https://tanstack.com/query/latest), but it is a completely custom implementation built specifically for Igniter.js. This provides a familiar, powerful API with a crucial advantage: it's **end-to-end type-safe**.

This means the parameters you pass to the hook and the data it returns are all automatically typed based on your backend's `AppRouter` definition.

## 1. Basic Usage

To use the hook, you access it through the `api` client you created, following the path to your desired query action: `api.<controllerKey>.<actionKey>.useQuery()`.

**Example: Fetching a list of posts**

```tsx
// app/components/PostsList.tsx
'use client';

import { api } from '@/igniter.client';

function PostsList() {
  // 1. Call the useQuery hook
  const postsQuery = api.posts.list.useQuery();

  // 2. Handle the loading state
  if (postsQuery.isLoading) {
    return <div>Loading posts...</div>;
  }

  // 3. Handle the error state
  if (postsQuery.isError) {
    return <div>Error fetching posts: {postsQuery.error.message}</div>;
  }

  // 4. Render the success state
  // `postsQuery.data` is fully typed based on your backend action's return value.
  return (
    <ul>
      {postsQuery.data?.posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

## 2. Passing Parameters

Most queries require parameters to fetch specific data. The `useQuery` hook accepts a configuration object where you can provide `params` (for URL path parameters) and `query` (for URL query parameters).

### `query` Parameters (for filtering, pagination)

If your backend action defines a `query` schema, you can pass matching data here.

**Backend Action:**
```typescript
list: igniter.query({
  path: '/',
  query: z.object({ page: z.number() }),
  // ...
})
```

**Frontend `useQuery` call:**
```tsx
// Pass the page number as a query parameter.
const postsQuery = api.posts.list.useQuery({
  query: { page: 2 }, // This is type-checked!
});
```

### `params` (for dynamic routes)

If your backend action has a dynamic path, you provide the values in the `params` object.

**Backend Action:**
```typescript
getById: igniter.query({
  path: '/:postId', // Dynamic segment
  // ...
})
```

**Frontend `useQuery` call:**
```tsx
const postQuery = api.posts.getById.useQuery({
  // Provide the value for the ':postId' dynamic segment.
  params: { postId: '123' }, // Also type-checked!
});
```

## 3. Key Return Values

The `useQuery` hook returns an object with a rich set of properties to manage the entire lifecycle of a data-fetching request.

| Property      | Description                                                                                                     |
| :------------ | :-------------------------------------------------------------------------------------------------------------- |
| `data`        | The data returned from a successful query. It will be `undefined` until the fetch succeeds.                       |
| `variables`   | The parameters (`query`, `params`) that were used for the most recent query execution.                            |
| `isLoading`   | A boolean that is `true` only during the very first fetch for a query.                                          |
| `isFetching`  | A boolean that is `true` whenever a request is in-flight (including initial load and subsequent refetches).     |
| `isSuccess`   | A boolean that is `true` if the query has completed successfully.                                               |
| `isError`     | A boolean that is `true` if the query has failed.                                                               |
| `error`       | If `isError` is true, this property will contain the error object.                                              |
| `refetch`     | A function you can call to manually trigger a refetch of the query.                                             |
| `status`      | A string representing the query's state: `'loading'`, `'error'`, or `'success'`.                                  |

## 4. Configuration Options

You can customize the behavior of `useQuery` by passing an options object. Here are some of the most common options:

### `enabled`

A boolean to conditionally enable or disable a query. If `false`, the query will not run automatically. This is useful for dependent queries (e.g., fetching a user's profile only after you have their ID).

```tsx
const session = useUserSession();

const userProfileQuery = api.users.getProfile.useQuery({
  // Only run this query if we have a valid session and user ID.
  enabled: !!session.isAuthenticated && !!session.userId,
});
```

### `staleTime`

The time in milliseconds that query data is considered "fresh". As long as data is fresh, it will be served from the cache without a network request. After `staleTime` has passed, the data is considered "stale" and will be refetched in the background on the next render.

-   **Type:** `number`
-   **Default:** `0` (data is considered stale immediately)

```tsx
// Consider this data fresh for 5 minutes (300,000 ms)
const query = api.users.list.useQuery({
  staleTime: 1000 * 60 * 5,
});
```

### `refetchInterval`

If set to a number, the query will automatically refetch at that interval in milliseconds. This is useful for polling data that changes frequently.

-   **Type:** `number | false`
-   **Default:** `false`

```tsx
// Refetch this data every 30 seconds
const query = api.system.status.useQuery({
  refetchInterval: 30000,
});
```

### `refetchOnWindowFocus`

If `true`, the query will automatically refetch whenever the browser window regains focus. This is a great way to ensure data is up-to-date when a user returns to your application.

-   **Type:** `boolean`
-   **Default:** `true`

---

## 5. Lifecycle Callbacks

You can execute side effects based on the query's result using callback functions.

| Callback        | Description                                                               |
| :-------------- | :------------------------------------------------------------------------ |
| `onSuccess(data)` | A function that is called if the query succeeds. It receives the `data`.  |
| `onError(error)`  | A function that is called if the query fails. It receives the `error`.    |
| `onSettled(data, error)` | A function that is called when the query finishes, whether it succeeded or failed. |

**Example:**

```tsx
const userQuery = api.users.getById.useQuery({
  params: { id: userId },
  onSuccess: (data) => {
    // This runs only on success
    console.log(`Successfully fetched user: ${data.user.name}`);
    // You could trigger another action here, like sending an analytics event.
  },
  onError: (error) => {
    // This runs only on failure
    console.error(`Failed to fetch user: ${error.message}`);
    // You could show a toast notification here.
  }
});
```

By mastering these options, you can fine-tune your data-fetching logic to create a highly performant and responsive user experience.

### Next Steps

Now that you know how to fetch data, the next step is to learn how to modify it.

-   **Learn how to modify data with [`useMutation`](./04-useMutation.md)**