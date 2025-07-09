# Igniter.js Starter: Deno REST API

[![Deno](https://img.shields.io/badge/Deno-1.x-blue.svg)](https://deno.land/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Welcome to the Igniter.js starter for building high-performance, type-safe REST APIs with **Deno**. This template provides a robust and scalable foundation for creating modern back-end services.

## Features

-   **Modern Deno Runtime**: Built on Deno, a simple, modern, and secure runtime for JavaScript and TypeScript.
-   **Type-Safe from the Ground Up**: Powered by Igniter.js, ensuring a strongly-typed codebase that is easy to maintain and refactor.
-   **Feature-Based Architecture**: A scalable project structure that organizes code by business domain, not technical layers.
-   **Ready-to-Use Services**: Pre-configured examples for:
    -   **Caching**: Integrated with Redis via `@igniter-js/adapter-redis`.
    -   **Background Jobs**: Asynchronous task processing with BullMQ via `@igniter-js/adapter-bullmq`.
    -   **Structured Logging**: Production-ready, context-aware logging.
-   **Database Ready**: Comes with Prisma set up for seamless database integration.
-   **Auto-Generated Type-Safe Client**: Even as a REST API, you can generate a fully-typed client (`src/igniter.client.ts`) for consumption by other TypeScript services or a separate front-end application.

## Prerequisites

Before you begin, ensure you have the following installed:

-   [Deno](https://deno.land/manual/getting_started/installation) (v1.x or higher)
-   A running [Redis](https://redis.io/docs/getting-started/) instance (for caching and background jobs).
-   A PostgreSQL database (or you can configure Prisma for a different one).

## Getting Started

Follow these steps to get your project up and running:

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/felipebarcelospro/igniter-js.git
    cd igniter-js/apps/starter-deno-rest-api
    ```

2.  **Configure Environment Variables**
    Create a `.env` file in the root of this starter (`igniter-js/apps/starter-deno-rest-api/.env`) and add your database and Redis connection URLs:

    ```env
    # .env
    DATABASE_URL="postgresql://user:password@localhost:5432/mydatabase?schema=public"
    REDIS_URL="redis://127.0.0.1:6379"
    ```

3.  **Run Database Migrations**
    This starter uses Prisma for database management. You'll need to add a task to your `deno.json` to run migrations.

    ```json
    // deno.json
    {
      "tasks": {
        "dev": "deno run --unstable-sloppy-imports --watch --allow-net --allow-env --import-map=import_map.json src/index.ts",
        "start": "deno run --unstable-sloppy-imports --allow-net --allow-env --import-map=import_map.json src/index.ts",
        "prisma:db:push": "deno run --unstable-sloppy-imports -A npm:prisma db push"
      },
      // ... rest of the file
    }
    ```

    Then, run the task:
    ```bash
    deno task prisma:db:push
    ```

4.  **Run the Development Server**
    ```bash
    deno task dev
    ```
    This command starts the Deno server with file watching enabled. Your API will be available at `http://localhost:8000/api/v1`.

## How It Works

This starter is a pure API server built on Deno's standard library.

### 1. The Deno Server (`src/index.ts`)

The `src/index.ts` file is the main entry point. It uses `serve` from `deno.land/std/http` to handle incoming requests. A simple path-based router checks if the request URL starts with `/api/v1/` and, if so, forwards it to the Igniter.js API router handler.

### 2. The Igniter.js API Layer

The back-end API is defined using Igniter.js.

-   **Initialization (`src/igniter.ts`)**: This is where the core Igniter instance is created and configured with adapters for the store (Redis), jobs (BullMQ), logging, and telemetry.
-   **Router (`src/igniter.router.ts`)**: This file defines all API controllers. The starter includes an `exampleController` with several actions demonstrating core features.
-   **Controllers (`src/features/example/controllers/example.controller.ts`)**: Controllers group related API actions. The example shows how to implement queries (GET) and mutations (POST), interact with the cache, and schedule background jobs.
-   **Services (`src/services/`)**: This directory contains the initialization logic for external services like the Redis client, Prisma client, and the Igniter.js adapters that use them.

## Project Structure

The project follows a feature-based architecture to promote scalability and separation of concerns.

```
src/
├── features/             # Business logic, grouped by feature
│   └── example/
│       └── controllers/  # API endpoint definitions
├── services/             # Service initializations (Redis, Prisma, etc.)
├── igniter.ts            # Igniter.js core instance
├── igniter.client.ts     # Auto-generated type-safe API client (for consumers)
├── igniter.context.ts    # Application context definition
├── igniter.router.ts     # Main API router
└── index.ts              # Application entry point (Deno server)
```

## Example API Endpoints

This starter comes with a pre-built `example` controller to demonstrate key features.

-   **Health Check**
    ```bash
    curl http://localhost:8000/api/v1/example/
    ```

-   **Cache Demonstration**
    ```bash
    # First request (live data)
    curl http://localhost:8000/api/v1/example/cache/my-key
    # Second request (cached data)
    curl http://localhost:8000/api/v1/example/cache/my-key
    ```

-   **Schedule a Background Job**
    ```bash
    curl -X POST -H "Content-Type: application/json" \
      -d '{"message": "Hello from curl"}' \
      http://localhost:8000/api/v1/example/schedule-job
    ```

-   **List Jobs**
    ```bash
    curl http://localhost:8000/api/v1/example/jobs
    ```

## Available Scripts

Tasks are defined in `deno.json`.

-   `deno task dev`: Starts the development server with file watching.
-   `deno task start`: Starts the application for production.

## Further Learning

To learn more about Igniter.js and its powerful features, check out the official documentation:

-   **[Igniter.js GitHub Repository](https://github.com/felipebarcelospro/igniter-js)**
-   **[Official Documentation Wiki](https://github.com/felipebarcelospro/igniter-js/wiki)**
-   **[Core Concepts](https://github.com/felipebarcelospro/igniter-js/wiki/Core-Concepts)**
-   **[Store Adapter (Redis)](https://github.com/felipebarcelospro/igniter-js/wiki/Store-Adapter)**
-   **[Job Queue Adapter (BullMQ)](https://github.com/felipebarcelospro/igniter-js/wiki/Job-Queue-Adapter)**

## License

This starter is licensed under the [MIT License](LICENSE).