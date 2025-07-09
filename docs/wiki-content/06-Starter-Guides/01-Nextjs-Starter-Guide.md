# Full-Stack Guide: Building with the Igniter.js Next.js Starter

Welcome to the comprehensive guide for the Igniter.js Next.js starter. This document provides a deep dive into building a modern, feature-complete, and end-to-end type-safe full-stack application. We will go from project initialization to deploying advanced features like real-time data synchronization and background job processing.

This guide is designed for developers who have some familiarity with React and Next.js. Our goal is not just to show you *what* to do, but to explain *why* this stack provides a superior developer experience and results in more robust, maintainable applications.

By the end of this tutorial, you will have built a functional "Posts" feature, complete with a database, a type-safe API, a React frontend, and real-time capabilities.

---

## 1. The Core Philosophy: Why This Stack?

Before we write a single line of code, it's crucial to understand the philosophy behind combining Next.js with Igniter.js. This isn't just about using two popular technologies; it's about leveraging their synergy to solve common full-stack development challenges.

### End-to-End Type Safety

This is the cornerstone of the Igniter.js philosophy. In a typical full-stack setup, the frontend and backend are often loosely connected. A change in an API endpoint on the backend can silently break the frontend, and you might not notice until runtime.

Igniter.js solves this by creating a **single source of truth**: your API router (`src/igniter.router.ts`). By introspecting this router, Igniter.js automatically generates a type-safe client (`src/igniter.client.ts`). This client exports fully-typed functions and React hooks that your Next.js components can import.

The result?
-   If you change a backend endpoint's input, output, or path, TypeScript will immediately throw an error in any frontend component that uses it incorrectly.
-   You get full IntelliSense and autocompletion for API calls on the frontend.
-   You eliminate an entire class of common bugs related to API contract mismatches.

### A Simplified Backend-for-Frontend (BFF) Pattern

The Next.js App Router paradigm encourages co-locating data-fetching logic with the components that use it. While powerful, this can sometimes lead to scattered business logic and database queries throughout your UI code.

Igniter.js provides a clean, structured API layer that acts as a Backend-for-Frontend (BFF). It lives inside your Next.js project but maintains a clear separation of concerns. Your API logic (controllers, procedures, database interactions) is neatly organized within the `src/features` directory, completely decoupled from your React components. This makes your application easier to reason about, test, and scale.

### Harmony with Server and Client Components

The generated Igniter.js client is **isomorphic**, meaning it works seamlessly in any Next.js rendering environment:

-   **In React Server Components (RSCs)**: You can directly `await` API calls. The data is fetched on the server during the rendering process, resulting in zero client-side JavaScript for data fetching and a faster initial page load.
-   **In Client Components (`'use client'`)**: You use the provided React hooks (`.useQuery()`, `.useMutation()`). These hooks are thin wrappers around TanStack Query and manage all the complexities of client-side data fetching, caching, revalidation, and loading/error states.

This flexibility allows you to choose the best rendering strategy for each part of your application without changing your API interaction patterns.

---

## 2. Getting Started: Setup and Project Tour

Let's get the project up and running.

### Prerequisites
-   Node.js (v18 or higher)
-   Docker and Docker Compose (for running the database and Redis)

### Installation and Setup

1.  **Initialize the Project**: Open your terminal and use the Igniter.js CLI to scaffold a new Next.js project.
    ```bash
    npx @igniter-js/cli init my-next-app
    ```
    The CLI will guide you through the setup, asking you to select Next.js as your framework and which features (like Store and Queues) you'd like to include. For this guide, enable both.

2.  **Configure Environment Variables**: Navigate into your new project directory (`cd my-next-app`). You'll find a `.env.example` file. Rename it to `.env` and review the contents. The default values are typically configured to work with the provided Docker setup.
    ```env
    # .env
    DATABASE_URL="postgresql://user:password@localhost:5432/igniter-db?schema=public"
    REDIS_URL="redis://localhost:6379"
    # ... other variables
    ```

3.  **Start Background Services**: Run the following command to start the PostgreSQL database and Redis server in the background.
    ```bash
    docker-compose up -d
    ```

4.  **Install Dependencies and Sync Database**:
    ```bash
    # Install all required npm packages
    npm install

    # Push the Prisma schema to the newly created database
    npx prisma db push
    ```
    The `prisma db push` command reads your `prisma/schema.prisma` file and configures your database tables accordingly.

5.  **Run the Development Server**:
    ```bash
    npm run dev
    ```
    This command starts the `igniter dev --interactive` process. This is a powerful, terminal-based dashboard that manages multiple processes for you: the Next.js development server and the Igniter.js file watcher that handles auto-regeneration of the type-safe client. You get a unified view of your entire stack's logs and status.

### Project Structure Deep Dive

Let's take a tour of the key files and directories:

-   `src/app/api/[[...all]]/route.ts`: This is the **single entry point** for your entire Igniter.js API. It's a Next.js catch-all route handler. It uses the `nextRouteHandlerAdapter` to translate incoming Next.js requests into a format Igniter.js understands, and vice-versa for responses. You will likely never need to touch this file.

-   `src/igniter.ts`: The heart of your backend. Here, you create the main `igniter` instance using the builder pattern. This is where you register global plugins and adapters, like the Redis Store for caching (`adapter-redis`) and the BullMQ adapter for background jobs (`adapter-bullmq`).

-   `src/igniter.router.ts`: This is your API's table of contents. It imports all your feature controllers and combines them into a single `AppRouter`. The structure of this router is what the CLI reads to generate the type-safe client.

-   `src/igniter.client.ts`: The auto-generated, type-safe client. **You must never edit this file manually.** It is automatically updated whenever you save a change in a controller or the main router. It exports the `api` object that your frontend will use.

-   `src/features/`: This is where your application's business logic lives. The starter encourages a **Feature-Based Architecture**. Each feature (e.g., "users", "posts", "products") gets its own directory containing its controllers, procedures, database logic, and even its related frontend components.

-   `src/services/`: This directory contains initialization logic for external services like the Prisma client (`database.ts`) or the Redis client (`store.ts`).

-   `prisma/schema.prisma`: The single source of truth for your database schema. Prisma uses this file to generate the Prisma Client and to manage database migrations.

---

## 3. Building Our First Feature: A "Posts" API

Now for the fun part. We will build a complete CRUD API for blog posts.

### Step 1: Define the Schema
Open `prisma/schema.prisma` and add a new model for `Post`.

```prisma
// prisma/schema.prisma

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Also, add a relation to your User model if you have one.
model User {
  id    String @id @default(cuid())
  email String @unique
  name  String?
  // posts Post[] // Uncomment if you want to link users to posts
}
```

### Step 2: Apply Database Changes
Run `prisma db push` again to create the `Post` table in your database.
```bash
npx prisma db push
```

### Step 3: Scaffold the Feature with the CLI
Instead of manually creating all the boilerplate files for our new feature, we'll use the Igniter.js CLI to do the heavy lifting.
```bash
npx @igniter-js/cli generate feature posts --schema prisma:Post
```
This is an incredibly powerful command. It inspects the `Post` model in your Prisma schema and generates a complete, production-ready feature slice for you inside `src/features/posts/`. This includes:
-   `controllers/posts.controller.ts`: An API controller with pre-built CRUD actions (`list`, `getById`, `create`, `update`, `delete`).
-   `procedures/posts.procedure.ts`: A reusable procedure that centralizes all database logic (a repository pattern), keeping your controller clean.
-   `interfaces/posts.interfaces.ts`: Zod schemas for input validation (`CreatePostInputSchema`, `UpdatePostInputSchema`) inferred directly from your Prisma model. It also exports the inferred TypeScript types.
-   `index.ts`: An entry file that exports all the necessary modules.

### Step 4: Register the Controller
The CLI creates the files but doesn't automatically register the feature. You need to do this one final manual step. Open `src/igniter.router.ts` and add the new `postsController`.

```typescript
// src/igniter.router.ts
import { igniter } from '@/igniter';
import { exampleController } from '@/features/example';
// 1. Import the new controller
import { postsController } from '@/features/posts';

export const AppRouter = igniter.router({
  controllers: {
    example: exampleController,
    // 2. Register it in the router
    posts: postsController,
  },
});

export type AppRouter = typeof AppRouter;
```
As soon as you save this file, the `igniter dev` process will regenerate `src/igniter.client.ts`, and `api.posts` will now be available on your frontend client with full type-safety.

### Step 5: Test the API
Your CRUD API for posts is now live. You can test it with a tool like `curl`.
```bash
# Get all posts (will be an empty array for now)
curl http://localhost:3000/api/posts

# Create a new post
curl -X POST http://localhost:3000/api/posts \
-H "Content-Type: application/json" \
-d '{"title": "My First Post", "content": "Hello, World!"}'
```

---

## 4. Building the Frontend

Now let's build the UI to interact with our new API.

### Displaying Data with a Server Component
We'll create a page to display all our posts. Using a Server Component is perfect for this, as the data can be fetched on the server and rendered as static HTML.

Create a new file at `src/app/posts/page.tsx`:
```tsx
// src/app/posts/page.tsx
import { api } from '@/igniter.client';
import Link from 'next/link';

// This is a React Server Component
export default async function PostsPage() {
  // We can directly await the API call. This happens on the server.
  // The 'api' client is fully typed, so TypeScript knows 'data' has a 'posts' property.
  const { data } = await api.posts.list.query({});

  return (
    <main className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Blog Posts</h1>
      <div className="space-y-4">
        {data.posts.map((post) => (
          <div key={post.id} className="p-4 border rounded-lg">
            <h2 className="text-xl font-semibold">{post.title}</h2>
          </div>
        ))}
      </div>
    </main>
  );
}
```
Navigate to `http://localhost:3000/posts`, and you should see the post you created earlier.

### Creating Data with a Client Component

For interactive elements like forms, we need a Client Component. Let's create a form to add new posts.

Create a new file at `src/features/posts/presentation/components/CreatePostForm.tsx`:

```tsx
// src/features/posts/presentation/components/CreatePostForm.tsx
'use client';

import { api } from '@/igniter.client';
import { useState } from 'react';

export function CreatePostForm() {
  const [title, setTitle] = useState('');

  // The useMutation hook handles the API call and manages state for us.
  const createPostMutation = api.posts.create.useMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 'mutate' is the function to trigger the mutation.
    // The input is fully typed based on our Zod schema.
    createPostMutation.mutate(
      { body: { title } },
      {
        onSuccess: () => {
          setTitle(''); // Clear the form on success
          alert('Post created!');
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-gray-50 mb-8">
      <h2 className="text-lg font-semibold mb-2">Create a New Post</h2>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Post Title"
        className="w-full p-2 border rounded"
        disabled={createPostMutation.isPending}
      />
      <button
        type="submit"
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        disabled={createPostMutation.isPending}
      >
        {createPostMutation.isPending ? 'Creating...' : 'Create Post'}
      </button>
      {createPostMutation.isError && (
        <p className="text-red-500 mt-2">{createPostMutation.error.message}</p>
      )}
    </form>
  );
}
```
Now, add this form component to your `PostsPage` at `src/app/posts/page.tsx`:
```tsx
// src/app/posts/page.tsx
import { api } from '@/igniter.client';
import { CreatePostForm } from '@/features/posts/presentation/components/CreatePostForm'; // Import the form

export default async function PostsPage() {
  const { data } = await api.posts.list.query({});

  return (
    <main className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Blog Posts</h1>
      {/* Add the form here */}
      <CreatePostForm />
      <div className="space-y-4">
        {data.posts.map((post) => (
          // ... rest of the component
        ))}
      </div>
    </main>
  );
}
```
Now you have a functional form. When you create a new post, you'll see the "Post created!" alert. However, you'll have to manually refresh the page to see the new post in the list. Let's fix that with some real-time magic.

---

## 5. Unleashing Real-Time Magic

This is where the power of Igniter.js truly shines. We will make our posts list update automatically across all connected clients the instant a new post is created.

### Step 1: Make the `list` Query "Live"
Go to your backend controller at `src/features/posts/controllers/posts.controller.ts`. Find the `list` action and add one line: `stream: true`.

```typescript
// src/features/posts/controllers/posts.controller.ts
// ... inside the postsController actions object
list: igniter.query({
  path: '/',
  stream: true, // <-- This is the magic!
  handler: async ({ context, response }) => {
    // ... handler logic remains the same
    const posts = await context.database.post.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return response.success({ posts });
  },
}),
// ...
```
By adding `stream: true`, you are telling Igniter.js that any client using `api.posts.list.useQuery()` should be subscribed to a real-time Server-Sent Event (SSE) stream for updates.

### Step 2: Trigger the Update from the Mutation
Now, in the same file, find the `create` mutation. We need to tell it to notify the `list` query's stream that its data is now stale. You do this by chaining `.revalidate()` to the response.

```typescript
// src/features/posts/controllers/posts.controller.ts
// ... inside the postsController actions object
create: igniter.mutation({
  path: '/',
  method: 'POST',
  body: CreatePostInputSchema, // Our Zod schema
  handler: async ({ context, response, body }) => {
    const post = await context.database.post.create({
      data: { title: body.title, content: body.content },
    });

    // This response does two things:
    // 1. Returns the created post with a 201 status.
    // 2. Broadcasts a message to revalidate the 'posts.list' query.
    return response.created({ post }).revalidate('posts.list');
  },
}),
// ...
```

### Step 3: Witness the Magic (No Frontend Changes Needed!)
That's it. **You don't need to change a single line of frontend code.**

Open two browser windows side-by-side, both pointing to `http://localhost:3000/posts`. In one window, create a new post using the form. The moment you click "Create Post", you will see the post list in **both** windows update instantly to include the new post.

This happens because:
1.  The `useQuery` hook subscribed to the SSE stream because of `stream: true`.
2.  The `create` mutation's `.revalidate('posts.list')` call sent a message over that stream.
3.  The hook received the message and automatically refetched the query, triggering a re-render with the new data.

This powerful pattern provides a snappy, real-time user experience with minimal developer effort.

---

## 6. Advanced Concepts

Let's briefly touch on other powerful features of the starter.

### Background Jobs with Igniter Queues
What if you wanted to send an email notification when a post is created, but you don't want to make the user wait for the email to be sent? This is a perfect use case for background jobs.

1.  **Define a Job**: In `src/services/jobs.ts`, you can register a new job.
    ```typescript
    // src/services/jobs.ts
    // ... inside REGISTERED_JOBS.system.jobs
    notifyOnNewPost: jobs.register({
      name: 'notifyOnNewPost',
      input: z.object({ postId: z.string(), title: z.string() }),
      handler: async ({ input, log }) => {
        log.info(`Sending notification for new post: "${input.title}"`);
        // Fake sending an email
        await new Promise(res => setTimeout(res, 2000));
        log.info('Notification sent!');
      }
    }),
    ```

2.  **Enqueue the Job**: In your `create` mutation, you can enqueue this job.
    ```typescript
    // In the create mutation handler
    const post = await context.database.post.create({ data: body });
    // Enqueue job without waiting for it to complete
    await igniter.jobs.system.enqueue({
      task: 'notifyOnNewPost',
      input: { postId: post.id, title: post.title },
    });
    return response.created({ post }).revalidate('posts.list');
    ```
The API response is sent back to the user immediately, and the job runs in the background.

### Caching with the Igniter Store
To reduce database load, you can cache frequently accessed data in Redis.
```typescript
// In a getById action handler
const { id } = params;
const cacheKey = `post:${id}`;

// 1. Check the cache first
let post = await igniter.store.get<Post>(cacheKey);

if (!post) {
  // 2. If not in cache, fetch from DB
  post = await context.database.post.findUnique({ where: { id } });
  if (post) {
    // 3. Store it in the cache for 1 hour
    await igniter.store.set(cacheKey, post, { ttl: 3600 });
  }
}

if (!post) {
  return response.notFound({ message: 'Post not found' });
}
return response.success({ post });
```

---

## Conclusion

Congratulations! You have successfully built a full-stack, type-safe application with a sophisticated feature set.

We have covered:
-   The core principles of combining Igniter.js and Next.js for maximum type safety and developer experience.
-   Scaffolding a project and understanding its structure.
-   Using the CLI to rapidly generate a complete API feature from a database schema.
-   Building both Server and Client Components that interact with the API in a type-safe way.
-   Implementing a seamless, automatic real-time data synchronization with just two lines of code.
-   An overview of advanced features like background jobs and caching.

This starter provides a robust and scalable foundation for your next project. By adhering to its patterns, you can build complex applications faster and with more confidence. For more information, continue exploring the official documentation wiki. Happy coding!