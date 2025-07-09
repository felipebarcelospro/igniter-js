# Client-Side: Modifying Data with `useMutation`

While `useQuery` is for fetching data, **`useMutation`** is the hook you'll use for any action that modifies data on the server. This includes creating, updating, and deleting resources, corresponding to backend actions that use `POST`, `PUT`, `PATCH`, or `DELETE` methods.

The `useMutation` hook, accessed via `api.<controllerKey>.<actionKey>.useMutation()`, provides a simple and declarative API to handle the entire lifecycle of a data modification, from optimistic updates to error handling and cache invalidation.

## 1. Basic Usage

A `useMutation` hook provides you with a `mutate` function (or `mutateAsync` for a promise-based version) that you can call to trigger the mutation.

**Example: A "Create Post" Form**

```tsx
// app/components/CreatePostForm.tsx
'use client';

import { api } from '@/igniter.client';
import { useState } from 'react';

function CreatePostForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // 1. Initialize the mutation hook
  const createPostMutation = api.posts.create.useMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 2. Call the `mutate` function with the required input
    // The `body` object is fully type-safe based on your backend Zod schema.
    createPostMutation.mutate({
      body: { title, content },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... form inputs for title and content ... */}

      {/* 3. Use the `isLoading` state for UI feedback */}
      <button type="submit" disabled={createPostMutation.isLoading}>
        {createPostMutation.isLoading ? 'Creating Post...' : 'Create Post'}
      </button>

      {createPostMutation.isError && (
        <p style={{ color: 'red' }}>
          Error: {createPostMutation.error.message}
        </p>
      )}
    </form>
  );
}
```

## 2. Key Return Values

The `useMutation` hook returns an object with properties to manage the mutation's state:

| Property    | Description                                                                                              |
| :---------- | :------------------------------------------------------------------------------------------------------- |
| `mutate`    | A function to trigger the mutation. It takes one argument: an object with `body`, `query`, or `params`.    |
| `data`      | The data returned from your backend action handler upon a successful mutation. It is `undefined` until the mutation succeeds. |
| `variables` | The variables (`body`, `query`, `params`) passed to the most recent `mutate` call. It is `undefined` until the mutation is called. |
| `isLoading` | A boolean that is `true` while the mutation is in flight.                                                |
| `isSuccess` | A boolean that is `true` if the mutation completed successfully.                                         |
| `isError`   | A boolean that is `true` if the mutation failed.                                                         |
| `error`     | If `isError` is true, this property will contain the error object.                                       |
| `retry`     | A function to re-run the last mutation with the same variables.                                          |
| `status`    | A string representing the mutation's state: `'loading'`, `'error'`, or `'success'`.                        |

---

## 3. Lifecycle Callbacks

To handle side effects like showing notifications or redirecting the user, `useMutation` accepts an options object with callback functions.

| Callback             | Description                                                                                             |
| :------------------- | :------------------------------------------------------------------------------------------------------ |
| `onSuccess(data)`    | Runs if the mutation is successful. Receives the `data` from the server.                                  |
| `onError(error)`     | Runs if the mutation fails. Receives the `error` object.                                                  |
| `onSettled(data, error)` | Runs when the mutation finishes, regardless of whether it succeeded or failed. Receives data and error. |

**Example: Showing Notifications on Success or Failure**

```tsx
const createPostMutation = api.posts.create.useMutation({
  onSuccess: (data) => {
    // `data` is the response from the backend action
    console.log(`Successfully created post with ID: ${data.post.id}`);
    // showSuccessToast('Post created!');
  },
  onError: (error) => {
    console.error(`Failed to create post: ${error.message}`);
    // showErrorToast(error.message);
  },
  onSettled: () => {
    // This runs after either onSuccess or onError
    console.log('Mutation has settled.');
  }
});
```

---

## 4. The Most Important Pattern: Cache Invalidation

After a mutation successfully modifies data on the server, your client-side cache is now out-of-date. For example, after creating a new post, your list of posts is incomplete.

The best practice is to **invalidate** the relevant queries in the `onSuccess` callback. This tells Igniter.js to automatically refetch that data, ensuring your UI always reflects the latest state.

To do this, you use the `useQueryClient` hook.

**Example: Refetching the Post List After Creation**

```tsx
'use client';

import { api, useQueryClient } from '@/igniter.client';

function CreatePostForm() {
  // 1. Get an instance of the query client
  const queryClient = useQueryClient();

  const createPostMutation = api.posts.create.useMutation({
    onSuccess: () => {
      console.log('Post created, invalidating post list...');
      // 2. Invalidate the 'posts.list' query.
      // This will cause any component using `api.posts.list.useQuery()` to refetch.
      queryClient.invalidate(['posts.list']);
    },
    // ... onError handling
  });

  const handleSubmit = (e) => {
    // ...
    createPostMutation.mutate({ body: { ... } });
  };
  
  // ... rest of the form
}
```

This pattern is fundamental to building modern, reactive web applications. It ensures that the user's actions are immediately reflected in the UI without needing complex manual state management.

If you are using **Igniter.js Realtime**, you can often skip manual invalidation and use server-side `.revalidate()` for a more powerful, automated approach.

### Next Steps

- **Learn about the `useQueryClient`** for more advanced cache interactions.
- **Learn about Realtime Streaming with [`useRealtime`](./05-useRealtime.md)** for features like live notifications.