# The Igniter Builder: Your Application's Foundation

Every Igniter.js application begins with the **Igniter Builder**. It is a fluent, chainable API designed to guide you through the process of composing and configuring your application's core components in a structured and fully type-safe manner.

Think of the builder as the master blueprint for your entire backend. It's where you define the application's context, integrate services like logging and caching, enable advanced features like background jobs, and extend functionality with plugins.

## The "Why": Philosophy of the Builder

Using a builder pattern isn't just for convenience; it's a core part of the Igniter.js philosophy for several key reasons:

*   **Guided Setup**: The builder's chainable methods provide a clear, step-by-step process for configuration, reducing the chances of misconfiguration.
*   **Compile-Time Safety**: The builder leverages TypeScript generics to ensure that if your application is configured correctly, it will compile. You cannot, for instance, access the job queue system if you haven't explicitly enabled it with the `.jobs()` method. This catches errors before your code ever runs.
*   **Explicit is Better**: Your `igniter.ts` file becomes a single source of truth that explicitly declares all the major components and capabilities of your application.
*   **Modularity and Testability**: By composing the application from modular pieces (plugins, services), you create a system that is easier to manage, test, and reason about.

---

## How it Works: A Method-by-Method Breakdown

You start by importing the `Igniter` object and then chain methods to build up your application's configuration. The order is flexible, but it always starts with `.context()` and ends with `.create()`.

```typescript
// src/igniter.ts
import { Igniter } from '@igniter-js/core';
```

### 1. `.context<T>()` - The First and Most Crucial Step

This method **must** be the first one you call. It establishes the base "shape" of your application's `Context`. The context is the primary mechanism for dependency injection in Igniter.js, making services like your database client available throughout your application.

**Usage:**
First, you define a type for your application context, often in a separate `igniter.context.ts` file. Then, you pass this type as a generic argument to `.context()`.

```typescript
// src/igniter.context.ts
import { PrismaClient } from '@prisma/client';

export const database = new PrismaClient();

export type AppContext = {
  db: typeof database;
  // You can add other global services here
};

// src/igniter.ts
import { Igniter } from '@igniter-js/core';
import type { AppContext } from './igniter.context';

const builder = Igniter
  // Sets the foundation for our application's context
  .context<AppContext>();
```

### 2. `.logger(loggerInstance)` - Enabling Structured Logging

This method integrates a structured logger into your application. The logger instance becomes available on the `igniter` object and inside the `context` of your actions. Igniter.js is logger-agnostic, but provides adapters for popular libraries like `pino`.

**Usage:**

```typescript
import { createConsoleLogger } from '@igniter-js/core/adapters';

const logger = createConsoleLogger({ level: 'info' });

const builder = Igniter
  .context<AppContext>()
  .logger(logger); // Attach the logger
```

### 3. `.store(storeAdapter)` - Enabling Igniter.js Store

This enables the **Igniter.js Store**, the framework's system for key-value storage, caching, and pub/sub messaging. It requires a driver-based adapter, with Redis being the most common choice.

**Usage:**

```typescript
import { createRedisStoreAdapter } from '@igniter-js/core/adapters';
import { redis } from '@/services/redis'; // Your ioredis instance

const store = createRedisStoreAdapter({ client: redis });

const builder = Igniter
  .context<AppContext>()
  .store(store); // Enable the Store feature
```

### 4. `.jobs(jobRouter)` - Enabling Igniter.js Queues

This enables **Igniter.js Queues**, the first-class system for background job processing. It also requires a driver (like BullMQ) and a "job router" where you define and register all your background jobs.

**Usage:**

```typescript
import { createBullMQAdapter } from '@igniter-js/core/adapters';
import { REGISTERED_JOBS } from '@/jobs'; // Your job definitions

const jobs = createBullMQAdapter({ ...config });
const jobRouter = jobs.merge(REGISTERED_JOBS);

const builder = Igniter
  .context<AppContext>()
  .jobs(jobRouter); // Enable the Queues feature
```

### 5. `.plugin(plugins)` - Extending Core Functionality

This is the primary way to add reusable, modular functionality. Plugins can add their own context, actions, procedures, and even lifecycle hooks.

**Usage:**

```typescript
import { authPlugin } from '@/plugins/auth';

const builder = Igniter
  .context<AppContext>()
  .plugins({
    auth: authPlugin, // Register the auth plugin under the 'auth' key
  });
```

### 6. `.create()` - The Final Step

This method must be called last. It consumes all the previous configurations and returns the final, fully-configured `igniter` instance. This instance holds all the tools you'll need to define your application's logic.

---

## Putting It All Together: A Complete Example

Here is what a typical `igniter.ts` file looks like when fully configured.

```typescript
// src/igniter.ts
import type { IgniterAppContext } from "./igniter.context";
import { Igniter } from "@igniter-js/core";
import { logger } from "@/services/logger";
import { store } from "@/services/store";
import { jobs } from "@/services/jobs";
import { authPlugin } from "@/plugins/auth";

/**
 * The core Igniter.js instance.
 * This is the single, immutable object that provides all the tools
 * for building controllers, actions, and procedures.
 */
export const igniter = Igniter
  // 1. Define the base context shape
  .context<IgniterAppContext>()
  // 2. Attach a structured logger
  .logger(logger)
  // 3. Enable the Redis-based Store
  .store(store)
  // 4. Enable the BullMQ-based background jobs system
  .jobs(jobs)
  // 5. Register custom plugins
  .plugins({
    auth: authPlugin,
  })
  // 6. Finalize the configuration and create the instance
  .create();
```

The resulting `igniter` object is then exported and used across your application to ensure consistency and type safety. It contains:

*   `igniter.controller()`: A factory function to create new controllers.
*   `igniter.query()`: A factory function to create `GET` actions.
*   `igniter.mutation()`: A factory function to create `POST`, `PUT`, `PATCH`, `DELETE` actions.
*   `igniter.procedure()`: A factory function to create reusable middleware.
*   `igniter.router()`: The final builder to assemble all controllers.
*   `igniter.logger`: Direct access to the logger instance.
*   `igniter.store`: Direct access to the store adapter.
*   `igniter.jobs`: Direct access to the job queue system.

By using the builder, you've created a powerful, type-safe foundation for your entire application.

### Next Steps

Now that you understand how the application is initialized with the builder, the next logical step is to dive deeper into the first piece of that puzzle.

*   **Learn about the [Context](./02-Context.md)**