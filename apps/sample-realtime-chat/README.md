# Igniter.js Real-Time Chat Example

[![Igniter.js](https://img.shields.io/badge/Igniter.js-v1-blue.svg)](https://igniterjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-blue.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Welcome to the Igniter.js Real-Time Chat Example! This project demonstrates how to build a full-stack, type-safe, real-time chat application using **Igniter.js**, **Next.js**, and **Prisma**. It serves as a practical example of how to leverage Igniter.js for building modern, high-performance web applications.

## Features

-   **Real-Time Chat**: A functional chat application demonstrating real-time communication.
-   **Next.js App Router**: Built with the latest Next.js conventions for server and client components.
-   **End-to-End Type Safety**: Powered by Igniter.js, ensuring type safety from your React components to your back-end API.
-   **Feature-Based Architecture**: A scalable project structure that organizes code by business domain.
-   **Database Ready**: Comes with Prisma set up for seamless database integration with PostgreSQL.
-   **WebSockets**: Real-time functionality powered by a simple WebSocket implementation.
-   **UI Components**: Includes a set of UI components from `shadcn/ui` to get you started quickly.

## Prerequisites

Before you begin, ensure you have the following installed:

-   [Node.js](https://nodejs.org/en) (v18 or higher)
-   [Bun](https://bun.sh/)
-   A PostgreSQL database (or you can configure Prisma for a different one).

## Getting Started

Follow these steps to get your project up and running:

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/felipebarcelospro/todo-igniter-project.git
    cd todo-igniter-project
    ```

2.  **Install Dependencies**
    ```bash
    bun install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the root of the project and add your database connection URL:

    ```env
    # .env
    DATABASE_URL="postgresql://user:password@localhost:5432/mydatabase?schema=public"
    ```

4.  **Run Database Migrations**
    ```bash
    bun prisma db push
    ```

5.  **Run the Development Server**
    ```bash
    bun dev
    ```
    This command starts the Next.js development server. Your application will be available at `http://localhost:3000`.

## How It Works

This starter deeply integrates Igniter.js with the Next.js App Router to create a real-time chat application.

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

-   **Initialization (`src/igniter.ts`)**: This is where the core Igniter instance is created.
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
│   └── message/
│       ├── controllers/  # API endpoint definitions
│       └── presentation/ # React components for the feature
├── services/             # Service initializations (Prisma, etc.)
├── igniter.ts            # Igniter.js core instance
├── igniter.client.ts     # Auto-generated type-safe API client
├── igniter.router.ts     # Main API router
└── layout.tsx            # Root layout, includes providers
```

## Available Scripts

-   `bun dev`: Starts the development server.
-   `bun build`: Builds the application for production.
-   `bun start`: Starts the production server.
-   `bun lint`: Runs the linter.

## Further Learning

To learn more about Igniter.js and its powerful features, check out the official resources:

-   **[Igniter.js Website](https://igniterjs.com/)**
-   **[Igniter.js GitHub Repository](https://github.com/felipebarcelospro/igniter-js)**
-   **[Follow on X](https://x.com/IgniterJs)**

## License

This starter is licensed under the [MIT License](LICENSE).