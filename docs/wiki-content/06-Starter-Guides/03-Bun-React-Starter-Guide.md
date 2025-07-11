# Full-Stack Guide: Building a High-Performance SPA with Bun, React, and Igniter.js

**Words**: ~2300

Welcome to the comprehensive guide for the Igniter.js Bun + React Starter. This document will take you on a journey to build an ultra-fast, modern, and fully type-safe Single Page Application (SPA). We'll harness the incredible speed of Bun as our server, runtime, and bundler, and pair it with the robust, type-safe API capabilities of Igniter.js.

This starter is for developers who want to build a classic client-rendered React SPA but with a next-generation toolchain that offers unparalleled performance and a simplified, all-in-one developer experience.

---

## 1. Core Philosophy: Speed, Simplicity, and Safety

This starter is built on three core principles, each enabled by its key technologies.

### 1.1. Speed and Simplicity with Bun
Bun is the star of the show in this starter. It's a new, incredibly fast JavaScript runtime designed from the ground up for performance. In this project, Bun serves multiple roles, simplifying the toolchain significantly:
-   **Runtime**: It executes your server-side TypeScript code.
-   **Server**: We use Bun's native, high-performance `Bun.serve` API to handle HTTP requests.
-   **Bundler**: Bun's built-in bundler is used to package our React frontend for the browser.
-   **Package Manager**: Bun can be used as a drop-in replacement for `npm`, offering much faster dependency installation.

This all-in-one approach reduces configuration overhead and provides a cohesive, lightning-fast development experience.

### 1.2. A Robust SPA Architecture
This starter implements a classic, robust Single Page Application architecture.
-   The **Bun server** has two jobs: serve the static `index.html` file (the shell for our React app) for any non-API routes, and handle all API requests under the `/api/v1/*` path.
-   The **React frontend** is a pure client-side application. Once loaded, it takes over routing and rendering in the browser, communicating with the backend via type-safe API calls.
-   **Igniter.js** provides the entire backend API layer, bringing structure, scalability, and its signature end-to-end type safety to the project.

### 1.3. End-to-End Type Safety
Just like in other Igniter.js starters, this is a non-negotiable feature. Igniter.js generates a type-safe client based on your API controllers. Your React application imports this client, giving you full IntelliSense and compile-time guarantees that your frontend and backend are always in sync.

---

## 2. Getting Started: From Zero to Running App

Let's get the project installed and take a tour.

### Prerequisites
-   Bun (v1.0 or higher)
-   Docker and Docker Compose (for the database and Redis)

### Installation and Setup
1.  **Initialize the Project**: Use the Igniter.js CLI to scaffold a new project.
    ```bash
    npx @igniter-js/cli init my-bun-app
    ```
    When prompted, select **Bun + React** as your framework. Make sure to enable the **Store (Redis)** and **Queues (BullMQ)** features to get the full experience.

2.  **Configure Environment**: `cd my-bun-app`. Rename `.env.example` to `.env`. The default URLs should work correctly with the Docker setup.

3.  **Start Services**: Launch the PostgreSQL database and Redis instance.
    ```bash
    docker-compose up -d
    ```

4.  **Install & Sync DB**: Use Bun to install dependencies (it's much faster!) and then apply the Prisma schema.
    ```bash
    bun install
    bunx prisma db push
    ```

5.  **Run the Dev Server**:
    ```bash
    bun run dev
    ```
    This command starts the `igniter dev` process, which in turn runs the Bun server with file-watching and hot-reloading enabled for both the backend and the React frontend.

### Project Structure Deep Dive
The project structure is clean and organized for a full-stack SPA.

```
my-bun-app/
├── public/
│   └── index.html              # << The HTML shell for the React SPA
├── src/
│   ├── app/                      # React page components
│   ├── components/               # Shared React components
│   ├── features/                 # << Your application's business logic
│   ├── services/                 # Service initializations
│   ├── index.tsx                 # << Unified Server & Client Entry Point
│   ├── igniter.ts                # Core Igniter.js initialization
│   ├── igniter.client.ts         # << Auto-generated Type-Safe Client
│   └── igniter.router.ts         # Main application router
└── prisma/
    └── schema.prisma
```

-   **`src/index.tsx`**: This is the most unique file in this starter. It acts as the **unified entry point for both the server and the client**.
    -   When run by Bun (on the server), it executes the `Bun.serve` block, which starts the HTTP server. This server inspects incoming request URLs. If the URL starts with `/api/v1/`, it passes the request to the Igniter.js router. Otherwise, it serves the `public/index.html` file.
    -   When this file is processed by the bundler for the client, it ignores the server block and instead executes the React rendering logic (`ReactDOM.createRoot...`), mounting the main React component into the DOM.
-   **`public/index.html`**: The static HTML file that serves as the foundation for your React application. The bundled JavaScript will be injected into this file.
-   **`src/app/`**: Contains the top-level React components that act as "pages" in your SPA.
-   **`igniter.ts`, `igniter.router.ts`, `features/`**: These form the core of your backend, responsible for configuring Igniter.js, defining the API's shape, and housing all your business logic.
-   **`igniter.client.ts`**: The auto-generated, type-safe client that provides the React hooks (`.useQuery()`, `.useMutation()`) your SPA will use to communicate with the backend.

---

## 3. Building Our First Feature: A "Journal" API

Let's build a simple daily journal application.

### Step 1: Define the Schema
Open `prisma/schema.prisma` and add a `JournalEntry` model.

```prisma
// prisma/schema.prisma
model JournalEntry {
  id        String   @id @default(cuid())
  content   String
  mood      String   // e.g., "Happy", "Sad", "Productive"
  createdAt DateTime @default(now())
}
```

### Step 2: Apply Database Changes
Run `bunx prisma db push` to create the `JournalEntry` table.
```bash
bunx prisma db push
```

### Step 3: Scaffold the Feature with the CLI
Use the `igniter generate` command to create the backend files automatically.
```bash
bunx @igniter-js/cli generate feature journalEntries --schema prisma:JournalEntry
```
This command generates the controller, procedures, and Zod interfaces for your `JournalEntry` feature inside `src/features/journalEntries/`.

### Step 4: Register the Controller
Open `src/igniter.router.ts` and register the new `journalEntriesController`.

```typescript
// src/igniter.router.ts
import { igniter } from '@/igniter';
import { exampleController } from '@/features/example';
// 1. Import the new controller
import { journalEntriesController } from '@/features/journalEntries';

export const AppRouter = igniter.router({
  controllers: {
    example: exampleController,
    // 2. Register it
    journalEntries: journalEntriesController,
  },
});

export type AppRouter = typeof AppRouter;
```
When you save this, the dev server will regenerate `igniter.client.ts`. The `api.journalEntries` client is now ready to be used by your React app.

---

## 4. Building the Frontend React SPA

Now, let's build the UI for our journal.

### Displaying Journal Entries
We'll create a component to fetch and display all entries.

Create a new file at `src/features/journalEntries/presentation/components/JournalFeed.tsx`:

```tsx
// src/features/journalEntries/presentation/components/JournalFeed.tsx
import { api } from '@/igniter.client';

export function JournalFeed() {
  // Use the auto-generated hook to fetch data.
  const { data, isLoading, error } = api.journalEntries.list.useQuery();

  if (isLoading) return <p>Loading journal...</p>;
  if (error) return <p className="text-red-500">Error: {error.message}</p>;

  return (
    <div className="space-y-4">
      {data?.journalEntries.map((entry) => (
        <div key={entry.id} className="p-4 border rounded-lg bg-white shadow">
          <p>{entry.content}</p>
          <div className="text-sm text-gray-500 mt-2">
            <span>Mood: {entry.mood}</span> | <span>{new Date(entry.createdAt).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Creating an Entry Form
Now for the form to add new entries.

Create a new file at `src/features/journalEntries/presentation/components/CreateEntryForm.tsx`:

```tsx
// src/features/journalEntries/presentation/components/CreateEntryForm.tsx
import { api } from '@/igniter.client';
import { useState } from 'react';

export function CreateEntryForm() {
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('Productive');
  const createEntryMutation = api.journalEntries.create.useMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    createEntryMutation.mutate({ body: { content, mood } }, {
      onSuccess: () => {
        setContent('');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-gray-100 mb-8">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        className="w-full p-2 border rounded"
        rows={3}
        disabled={createEntryMutation.isPending}
      />
      <div className="flex items-center justify-between mt-2">
        <select value={mood} onChange={(e) => setMood(e.target.value)} className="p-2 border rounded">
          <option>Productive</option>
          <option>Happy</option>
          <option>Neutral</option>
          <option>Sad</option>
        </select>
        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400" disabled={createEntryMutation.isPending}>
          {createEntryMutation.isPending ? 'Saving...' : 'Save Entry'}
        </button>
      </div>
    </form>
  );
}
```

### Assembling the Main Page
Finally, let's put these components together on our main application page. Open `src/app/Home.tsx` and replace its content:

```tsx
// src/app/Home.tsx
import { CreateEntryForm } from '@/features/journalEntries/presentation/components/CreateEntryForm';
import { JournalFeed } from '@/features/journalEntries/presentation/components/JournalFeed';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto p-4 sm:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">My Daily Journal</h1>
          <p className="text-lg text-gray-600">A simple journal built with Bun, React, and Igniter.js</p>
        </header>
        <CreateEntryForm />
        <JournalFeed />
      </main>
    </div>
  );
}
```

Your app is now functional! You can add journal entries, but you have to refresh the page to see them in the feed. Let's enable real-time updates.

---

## 5. Automatic Real-Time Updates

Igniter.js makes real-time functionality incredibly simple.

### Step 1: Make the `list` Query "Live"
In your backend controller at `src/features/journalEntries/controllers/journalEntries.controller.ts`, add the `stream: true` flag to the `list` action.

```typescript
// ... inside journalEntriesController
list: igniter.query({
  path: '/',
  stream: true, // This enables real-time updates for the feed
  handler: async ({ context, response }) => {
    const journalEntries = await context.database.journalEntry.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return response.success({ journalEntries });
  },
}),
```

### Step 2: Trigger the Update from the `create` Mutation
In the same file, chain `.revalidate()` to the `create` mutation's response. This tells Igniter.js which live query to update.

```typescript
// ... inside journalEntriesController
create: igniter.mutation({
  path: '/',
  method: 'POST',
  body: CreateJournalEntryInputSchema,
  handler: async ({ context, response, body }) => {
    const entry = await context.database.journalEntry.create({ data: body });
    // This response returns the new entry AND tells all clients
    // to update their 'journalEntries.list' query.
    return response.created({ journalEntry: entry }).revalidate('journalEntries.list');
  },
}),
```

### Step 3: Witness the Magic
**No frontend changes are needed.** Go back to your application. Open it in two browser windows. When you create a new entry in one window, the feed in **both** windows will update instantly. This powerful, reactive experience is achieved with just two small changes to your backend code.

---

## 6. Conclusion

You have now built a high-performance, full-stack, type-safe Single Page Application using a truly modern toolchain. The combination of Bun's speed, React's component model, and Igniter.js's structured, safe API layer creates a development experience that is both productive and enjoyable.

In this guide, we covered:
-   The philosophy of using Bun as an all-in-one tool to simplify development.
-   The structure of a unified Bun server that handles both API requests and serves a React SPA.
-   Using the Igniter.js CLI to rapidly scaffold a complete backend feature from a database schema.
-   Building a client-side React application that consumes the API via fully-typed hooks.
-   Implementing seamless, automatic real-time UI updates with `stream: true` and `.revalidate()`.

The Bun + React starter is a testament to how modern tools can create applications that are not only fast for the user but also fast to develop and easy to maintain. Happy coding!