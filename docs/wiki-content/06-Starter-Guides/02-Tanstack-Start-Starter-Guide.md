# Full-Stack Guide: Building with the Igniter.js TanStack Start Starter

**Words**: ~2200

Welcome to the definitive guide for the Igniter.js TanStack Start starter. This document will walk you through building a bleeding-edge, full-stack, end-to-end type-safe application. We will explore the project's architecture, which combines the Vite-powered speed of TanStack Start with the structured, type-safe API layer of Igniter.js.

This starter is for developers who crave a modern, fast, and highly integrated development experience. If you love Vite's instant feedback loop and TanStack's powerful, type-safe tools (like Router and Query), this guide is for you.

---

## 1. Core Philosophy: The Vite-Powered Full-Stack

Understanding the "why" behind this starter is key to unlocking its full potential. It's built on a philosophy of speed, type safety, and seamless integration.

### 1.1. TanStack Start: A Modern Foundation
TanStack Start is not a framework in the traditional sense; it's a "meta-framework" starter kit that expertly assembles the best tools from the TanStack ecosystem and beyond:

-   **Vite**: The build tool. Provides near-instant Hot Module Replacement (HMR) and a lightning-fast development server.
-   **TanStack Router**: A fully type-safe, file-based router that manages your application's routes and state with powerful features like search parameter schemas and route-level data loading.
-   **TanStack Query**: The gold standard for data fetching in React. It handles caching, revalidation, and server-state management, and it's what powers the Igniter.js client hooks.

### 1.2. Igniter.js: The Structured, Type-Safe API Layer
Igniter.js integrates into this ecosystem as the dedicated API layer. It provides a clean, feature-based architecture for your backend logic, which lives right inside your TanStack Start project.

The synergy is powerful:
-   **End-to-End Type Safety**: Igniter.js introspects your API controllers and auto-generates a client. TanStack Router is also fully type-safe. This means you have a continuous chain of type safety from your database schema, through your API layer, through your router, and into your React components.
-   **Separation of Concerns**: Your frontend logic (components, routes) and backend logic (controllers, database interactions) are clearly separated but live in the same project, sharing the same type system.
-   **Ultimate Developer Experience**: You get Vite's speed, TanStack's powerful tools, and Igniter.js's structured, safe, and feature-rich backend capabilities (like built-in Redis caching, background jobs, and real-time updates).

---

## 2. Getting Started: From Zero to Running App

Let's get the project set up and explore its structure.

### Prerequisites
-   Node.js (v18 or higher)
-   Docker and Docker Compose (for the database and Redis)

### Installation and Setup

1.  **Initialize the Project**: Use the Igniter.js CLI to scaffold a new TanStack Start project.
    ```bash
    npx @igniter-js/cli init my-tanstack-app
    ```
    During the interactive setup, select **TanStack Start** as your framework. Also, be sure to enable the **Store (Redis)** and **Queues (BullMQ)** features to follow along with the entire guide.

2.  **Configure Environment**: `cd my-tanstack-app`. Rename `.env.example` to `.env`. The default values are configured to work with the provided Docker setup.

3.  **Start Background Services**: From the root of your project, start the PostgreSQL and Redis containers.
    ```bash
    docker-compose up -d
    ```

4.  **Install & Sync Database**: Install dependencies and apply the Prisma schema to your new database.
    ```bash
    npm install
    npx prisma db push
    ```

5.  **Run the Dev Server**:
    ```bash
    npm run dev
    ```
    This single command starts the Vite development server. Vite is responsible for both serving your frontend and handling the API requests, which it delegates to Igniter.js. You will see Vite's familiar, speedy output in your terminal.

### Project Structure Deep Dive

The TanStack Start project structure is organized around its file-based router.

```
my-tanstack-app/
├── src/
│   ├── routes/
│   │   ├── __root.tsx              # << Root Layout & Providers
│   │   ├── index.tsx               # Main page (/)
│   │   └── api/
│   │       └── v1/
│   │           └── $.ts            # << API Catch-All Route
│   ├── features/                   # << Your application's business logic
│   ├── services/                   # Service initializations (Prisma, etc.)
│   ├── igniter.ts                  # << Core Igniter.js initialization
│   ├── igniter.client.ts           # << Auto-generated Type-Safe Client
│   ├── igniter.router.ts           # << Main application router
│   └── routeTree.gen.ts            # Auto-generated route tree
├── vite.config.ts                  # Vite build configuration
└── package.json
```

-   `src/routes/`: This is the heart of TanStack Router. Every `.tsx` file here becomes a route in your application.
-   `src/routes/__root.tsx`: This is the root layout component for your entire application. It's where you'll find the main `<html>` and `<body>` tags, and it's where the **`IgniterProvider`** is set up. This provider is essential for the client-side hooks (`useQuery`, `useMutation`) to work correctly.
-   `src/routes/api/v1/$.ts`: This is the critical bridge between TanStack Start and Igniter.js. It's a **catch-all API route**. The `$` in the filename tells TanStack Router to match any path under `/api/v1/`.
    -   Inside this file, `createFileRoute` is used to define handlers. A `loader` function handles `GET` requests, and an `action` function handles `POST`, `PUT`, `PATCH`, and `DELETE` requests. Both of these functions simply pass the request to `AppRouter.handler()`, which takes care of the translation.
-   `vite.config.ts`: The configuration file for Vite, which manages the build process, development server, and plugins.
-   The `igniter.*.ts` and `features/` directories serve the exact same purpose as in the Next.js starter: they define your backend API's structure and logic.

---

## 3. Building Our First Feature: A "Tasks" API

Let's build a simple to-do list application.

### Step 1: Define the Schema
Open `prisma/schema.prisma` and add a `Task` model.

```prisma
// prisma/schema.prisma
model Task {
  id        String   @id @default(cuid())
  text      String
  completed Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

### Step 2: Apply Database Changes
Run `prisma db push` to create the `Task` table.
```bash
npx prisma db push
```

### Step 3: Scaffold the Feature with the CLI
Use the `igniter generate` command to create all the necessary backend files.
```bash
npx @igniter-js/cli generate feature tasks --schema prisma:Task
```
This command creates the controller, procedures, and Zod interfaces for your `Task` feature inside `src/features/tasks/`.

### Step 4: Register the Controller
Open `src/igniter.router.ts` and register the new `tasksController`.

```typescript
// src/igniter.router.ts
import { igniter } from '@/igniter';
import { exampleController } from '@/features/example';
// 1. Import the new controller
import { tasksController } from '@/features/tasks';

export const AppRouter = igniter.router({
  controllers: {
    example: exampleController,
    // 2. Register it
    tasks: tasksController,
  },
});

export type AppRouter = typeof AppRouter;
```
When you save this file, Vite's dev server will automatically detect the change, and Igniter.js will regenerate `igniter.client.ts` in the background. `api.tasks` is now available on your client.

---

## 4. Building the Frontend with TanStack Router

Now, let's create the UI for our tasks application.

### Displaying Tasks on a New Page

With TanStack Router, creating a new page is as simple as creating a new file.

Create a new file at `src/routes/tasks.tsx`:

```tsx
// src/routes/tasks.tsx
import { createFileRoute } from '@tanstack/react-router';
import { api } from '@/igniter.client';

// This line defines our new route at the path '/tasks'
export const Route = createFileRoute('/tasks')({
  component: TasksComponent,
});

// This is our route's component
function TasksComponent() {
  // We use the auto-generated hook to fetch data.
  // TanStack Query handles caching, loading, and error states for us.
  const { data, isLoading, error } = api.tasks.list.useQuery();

  if (isLoading) return <div>Loading tasks...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">My Tasks</h1>
      <ul className="space-y-2">
        {data?.tasks.map((task) => (
          <li key={task.id} className="p-2 border rounded">
            {task.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
```
After you save this file, TanStack Router's generator will update `src/routeTree.gen.ts`. You can now navigate to `http://localhost:5173/tasks` to see your new page.

### Creating New Tasks with a Form

Let's create an interactive form component.

Create a new file at `src/features/tasks/presentation/components/CreateTaskForm.tsx`:

```tsx
// src/features/tasks/presentation/components/CreateTaskForm.tsx
import { api } from '@/igniter.client';
import { useState } from 'react';

export function CreateTaskForm() {
  const [text, setText] = useState('');
  const createTaskMutation = api.tasks.create.useMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    createTaskMutation.mutate(
      { body: { text } },
      {
        onSuccess: () => {
          setText('');
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What needs to be done?"
        className="w-full p-2 border rounded"
        disabled={createTaskMutation.isPending}
      />
      <button
        type="submit"
        className="mt-2 px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-400"
        disabled={createTaskMutation.isPending}
      >
        {createTaskMutation.isPending ? 'Adding...' : 'Add Task'}
      </button>
    </form>
  );
}
```

Now, add this form to your `TasksComponent` in `src/routes/tasks.tsx`:

```tsx
// src/routes/tasks.tsx
import { createFileRoute } from '@tanstack/react-router';
import { api } from '@/igniter.client';
// 1. Import the form component
import { CreateTaskForm } from '@/features/tasks/presentation/components/CreateTaskForm';

export const Route = createFileRoute('/tasks')({
  component: TasksComponent,
});

function TasksComponent() {
  const { data, isLoading, error } = api.tasks.list.useQuery();

  // ...
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">My Tasks</h1>
      {/* 2. Add the form here */}
      <CreateTaskForm />
      <ul className="space-y-2">
        {/* ... */}
      </ul>
    </div>
  );
}
```
You now have a working form, but you have to refresh the page to see newly added tasks. Let's fix that.

---

## 5. Automatic Real-Time Updates

We'll now enable Igniter.js's automatic real-time feature to make our task list update instantly.

### Step 1: Make the `list` Query "Live"
In your backend controller at `src/features/tasks/controllers/tasks.controller.ts`, add `stream: true` to the `list` action.

```typescript
// src/features/tasks/controllers/tasks.controller.ts
// ... inside tasksController
list: igniter.query({
  path: '/',
  stream: true, // This enables real-time updates
  handler: async ({ context, response }) => {
    const tasks = await context.database.task.findMany({ orderBy: { createdAt: 'asc' } });
    return response.success({ tasks });
  },
}),
// ...
```

### Step 2: Trigger the Update from the `create` Mutation
In the same file, find the `create` mutation and chain the `.revalidate()` method to its response.

```typescript
// src/features/tasks/controllers/tasks.controller.ts
// ... inside tasksController
create: igniter.mutation({
  path: '/',
  method: 'POST',
  body: CreateTaskInputSchema,
  handler: async ({ context, response, body }) => {
    const task = await context.database.task.create({ data: { text: body.text } });
    // This response returns the created task AND
    // broadcasts a message to refetch the 'tasks.list' query.
    return response.created({ task }).revalidate('tasks.list');
  },
}),
// ...
```

### Step 3: Witness the Magic
That's all. Go back to your browser (you might need to open two windows to see it clearly). When you add a new task in one window, the list updates in **both** windows instantly. The `useQuery` hook handles the underlying SSE connection and data synchronization automatically.

---

## 6. Advanced Feature: Toggling Task Completion

Let's add one more piece of functionality: marking a task as complete.

### Step 1: Add an `update` Mutation
The CLI already generated an `update` mutation for us. We just need to ensure it also revalidates our list.

```typescript
// src/features/tasks/controllers/tasks.controller.ts
// ... inside tasksController
update: igniter.mutation({
  path: '/:id',
  method: 'PUT',
  body: UpdateTaskInputSchema,
  handler: async ({ context, response, body, params }) => {
    const task = await context.database.task.update({
      where: { id: params.id },
      data: { completed: body.completed },
    });
    // Revalidate the list after updating a task
    return response.success({ task }).revalidate('tasks.list');
  },
}),
// ...
```

### Step 2: Update the Frontend Component
Now, let's modify our `TasksComponent` to handle toggling the `completed` status.

```tsx
// src/routes/tasks.tsx

// ... inside TasksComponent
function TasksComponent() {
  const { data, isLoading, error } = api.tasks.list.useQuery();
  // Add a mutation for updating tasks
  const updateTaskMutation = api.tasks.update.useMutation();

  const handleToggle = (id: string, completed: boolean) => {
    updateTaskMutation.mutate({
      params: { id },
      body: { completed: !completed },
    });
  };

  if (isLoading) return <div>Loading tasks...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">My Tasks</h1>
      <CreateTaskForm />
      <ul className="space-y-2">
        {data?.tasks.map((task) => (
          <li
            key={task.id}
            className="flex items-center gap-4 p-2 border rounded cursor-pointer"
            onClick={() => handleToggle(task.id, task.completed)}
          >
            <input
              type="checkbox"
              checked={task.completed}
              readOnly
              className="h-5 w-5"
            />
            <span className={task.completed ? 'line-through text-gray-500' : ''}>
              {task.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Now, when you click on a task, the `update` mutation is called. It updates the database and then calls `.revalidate('tasks.list')`, which instantly pushes the updated list to all clients. Your UI reflects the change immediately.

---

## Conclusion

You have successfully built a fast, modern, and fully type-safe full-stack application using TanStack Start and Igniter.js.

We've covered:
-   The core principles of combining Vite, TanStack tools, and Igniter.js.
-   Scaffolding a project and understanding its file-based routing structure.
-   Using the CLI to rapidly generate a complete backend feature.
-   Building a reactive frontend with TanStack Router and the auto-generated Igniter.js client hooks.
-   Implementing seamless, automatic real-time data synchronization with `stream: true` and `.revalidate()`.

This starter provides an incredibly productive and enjoyable developer experience, allowing you to build complex features with confidence and speed. Happy coding!