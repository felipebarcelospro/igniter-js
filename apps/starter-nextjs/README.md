# Igniter.js Starter: Next.js Full-Stack App

[![Next.js](https://img.shields.io/badge/Next.js-15-blue.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Welcome to the Igniter.js starter for building full-stack, type-safe applications with **Next.js**. This template provides a solid foundation for creating modern, high-performance web applications featuring server components, client components, and an end-to-end type-safe API layer.

## Features

-   **Next.js App Router**: A full-featured application built using the latest Next.js conventions.
-   **End-to-End Type Safety**: Powered by Igniter.js, ensuring type safety between your React components and your back-end API.
-   **Feature-Based Architecture**: A scalable project structure that organizes code by business domain.
-   **Ready-to-Use Services**: Pre-configured examples for:
    -   **Caching**: Integrated with Redis via `@igniter-js/adapter-redis`.
    -   **Background Jobs**: Asynchronous task processing with BullMQ via `@igniter-js/adapter-bullmq`.
    -   **Structured Logging**: Production-ready logging.
-   **Database Ready**: Comes with Prisma set up for seamless database integration.
-   **Seamless Integration**: Uses the `nextRouteHandlerAdapter` to cleanly connect the Igniter.js router to the Next.js App Router.
-   **UI Components**: Includes a set of UI components from `shadcn/ui` to get you started quickly.

## Prerequisites

Before you begin, ensure you have the following installed:

-   [Node.js](https://nodejs.org/en) (v18 or higher)
-   [npm](https://www.npmjs.com/) or a compatible package manager
-   A running [Redis](https://redis.io/docs/getting-started/) instance (for caching and background jobs).
-   A PostgreSQL database (or you can configure Prisma for a different one).

## Getting Started

Follow these steps to get your project up and running:

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/felipebarcelospro/igniter-js.git
    cd igniter-js/apps/starter-next-app
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the root of this starter (`igniter-js/apps/starter-next-app/.env`) and add your database and Redis connection URLs:

    ```env
    # .env
    DATABASE_URL="postgresql://user:password@localhost:5432/mydatabase?schema=public"
    REDIS_URL="redis://127.0.0.1:6379"
    ```

4.  **Run Database Migrations**
    ```bash
    npx prisma db push
    ```

5.  **Run the Development Server**
    ```bash
    npm run dev
    ```
    This command starts the Next.js development server with Turbopack. Your application will be available at `http://localhost:3000`.

## How It Works

This starter deeply integrates Igniter.js with the Next.js App Router.

### 1. The Next.js API Route Handler

The entry point for all API requests is the catch-all route handler located at `src/app/api/[[...all]]/route.ts`. This file uses the `nextRouteHandlerAdapter` from Igniter.js to expose the entire API.

```typescript
// src/app/api/[[...all]]/route.ts
import { AppRouter } from '@/igniter.router'
import { nextRouteHandlerAdapter } from '@igniter-js/core/adapters'

// The adapter creates GET, POST, etc. handlers from your Igniter.js router.
export const { GET, POST, PUT, DELETE } = nextRouteHandlerAdapter(AppRouter)
```

### 2. The Igniter.js API Layer

The back-end API logic is defined using Igniter.js.

-   **Initialization (`src/igniter.ts`)**: This is where the core Igniter instance is created and configured with adapters for the store (Redis), jobs (BullMQ), logging, and telemetry.
-   **Router (`src/igniter.router.ts`)**: This file defines all API controllers.
-   **Controllers (`src/features/[feature]/controllers/`)**: Controllers group related API actions (`query` and `mutation`). This is where your business logic lives.

### 3. Type-Safe Client & React Hooks

Igniter.js automatically generates a type-safe client based on your API router.

-   The `api` object in `src/igniter.client.ts` is your gateway to the back-end.
-   You can call your API endpoints from both Server Components and Client Components with full type safety.

**Server Component Usage:**

```tsx
// app/some-server-page/page.tsx
import { api } from '@/igniter.client';

export default async function SomePage() {
  // Direct, type-safe API call
  const data = await api.example.health.query();
  return <div>Status: {data.status}</div>;
}
```

**Client Component Usage:**

```tsx
// components/SomeClientComponent.tsx
'use client';
import { api } from '@/igniter.client';

export function SomeClientComponent() {
  // Type-safe hook for data fetching, caching, and revalidation
  const { data, isLoading } = api.example.health.useQuery();

  if (isLoading) return <div>Loading...</div>;
  return <div>Status: {data?.status}</div>;
}
```

## Project Structure

The project follows a feature-based architecture combined with Next.js conventions.

```
src/
├── app/                  # Next.js App Router pages and layouts
│   └── api/              # API route handlers
│       └── [[...all]]/
│           └── route.ts  # Igniter.js API entry point
├── components/           # Shared, reusable UI components
├── features/             # Business logic, grouped by feature
│   └── example/
│       └── controllers/  # API endpoint definitions
├── services/             # Service initializations (Redis, Prisma, etc.)
├── igniter.ts            # Igniter.js core instance
├── igniter.client.ts     # Auto-generated type-safe API client
├── igniter.router.ts     # Main API router
└── layout.tsx            # Root layout, includes providers
```

## Available Scripts

-   `npm run dev`: Starts the development server.
-   `npm run build`: Builds the application for production.
-   `npm run start`: Starts the production server.
-   `npm run lint`: Runs the linter.

## Further Learning

To learn more about Igniter.js and its powerful features, check out the official documentation:

-   **[Igniter.js GitHub Repository](https://github.com/felipebarcelospro/igniter-js)**
-   **[Official Documentation](https://igniterjs.com/docs)**
-   **[Core Concepts](https://igniterjs.com/docs/core-concepts)**
-   **[Client-Side Integration](https://igniterjs.com/docs/client-side)**

## License

This starter is licensed under the [MIT License](LICENSE).