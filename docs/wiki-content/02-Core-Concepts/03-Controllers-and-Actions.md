# Controllers & Actions: Building Your API Logic

At the core of every Igniter.js application are **Controllers** and **Actions**. This is where you define your API's endpoints, implement your business logic, and handle interactions with your data and services.

-   A **Controller** is an organizational unit that groups together a set of related Actions.
-   An **Action** is a single API endpoint that handles a specific request, such as fetching a list of users or creating a new post.

This structure provides a clean, maintainable, and scalable way to build your API, following the principles of the [Feature-Based Architecture](./03-Recommended-Project-Structure.md).

## 1. Controllers: Organizing Your Endpoints

A Controller is created using the `igniter.controller()` factory function. Its primary role is to define a base `path` that acts as a prefix for all the Actions it contains.

**Example: A `userController`**

```typescript
// src/features/user/controllers/user.controller.ts
import { igniter } from '@/igniter';

export const userController = igniter.controller({
  /**
   * The base path for all actions in this controller.
   * All action paths will be prefixed with `/users`.
   */
  path: '/users',

  /**
   * A collection of all API endpoints related to users.
   */
  actions: {
    // Actions like 'list', 'getById', 'create', etc., will go here.
  },
});
```

By grouping all user-related endpoints in `userController`, you make your code intuitive to navigate. When you need to work on user functionality, you know exactly where to look.

## 2. Actions: The Heart of Your Business Logic

An Action defines a single, executable API endpoint. Igniter.js has two types of Actions, each with a distinct semantic purpose:

-   **`igniter.query()`**: Used for **`GET`** requests. Queries are designed for fetching data and should be side-effect-free and idempotent (calling them multiple times should produce the same result).
-   **`igniter.mutation()`**: Used for **`POST`**, **`PUT`**, **`PATCH`**, and **`DELETE`** requests. Mutations are designed for creating, updating, or deleting data—any operation that changes the state of your system.

### The Anatomy of an Action

Both `query` and `mutation` actions are configured with an options object that defines their behavior. Let's look at the key properties:

| Property      | Description                                                                                             | Used In          |
| :------------ | :------------------------------------------------------------------------------------------------------ | :--------------- |
| `path`        | The URL path for this specific action, appended to the controller's base path.                          | Query & Mutation |
| `method`      | The HTTP method (`'POST'`, `'PUT'`, `'DELETE'`, etc.). Defaults to `'POST'` if not specified.            | Mutation only    |
| `use`         | An array of **Procedures** (middleware) to run before the action's handler.                             | Query & Mutation |
| `query`       | A **Zod schema** to validate and type incoming URL query parameters.                                    | Query & Mutation |
| `body`        | A **Zod schema** to validate and type the incoming request body.                                        | Mutation only    |
| `handler`     | The asynchronous function containing your business logic. It receives the fully-typed `ctx` object.     | Query & Mutation |

---

## 3. Deep Dive: Creating a Query Action

Let's create a `query` action to fetch a list of users, with support for pagination through query parameters.

```typescript
// In src/features/user/controllers/user.controller.ts

import { igniter } from '@/igniter';
import { z } from 'zod';

export const userController = igniter.controller({
  path: '/users',
  actions: {
    /**
     * An action to list users.
     * Final Path: GET /users/
     */
    list: igniter.query({
      path: '/',

      // 1. Define and validate query parameters using Zod.
      // These are optional and have default values.
      query: z.object({
        page: z.coerce.number().int().positive().optional().default(1),
        limit: z.coerce.number().int().positive().optional().default(10),
      }),

      // 2. The main handler function.
      handler: async ({ request, context, response }) => {
        // `request.query` is fully typed by TypeScript as { page: number; limit: number; }
        // based on the Zod schema above. No manual parsing or validation needed.
        const { page, limit } = request.query;

        const skip = (page - 1) * limit;

        // Use the database client from the global context.
        const users = await context.database.user.findMany({
          take: limit,
          skip: skip,
        });

        const totalUsers = await context.database.user.count();

        // Use the response processor to return a structured, successful response.
        return response.success({
          users,
          pagination: {
            page,
            limit,
            total: totalUsers,
          },
        });
      },
    }),
  },
});
```

In this example, Igniter.js automatically validates that `page` and `limit` are positive integers. If validation fails, it will return a `400 Bad Request` response with a descriptive error message *before* your handler code is ever executed.

## 4. Deep Dive: Creating a Mutation Action

Now, let's create a `mutation` to add a new user to the database. This action will require authentication, which we'll enforce with a procedure.

```typescript
// In src/features/user/controllers/user.controller.ts

import { igniter } from '@/igniter';
import { z } from 'zod';
import { auth } from '@/features/auth/procedures/auth.procedure'; // Assuming an auth procedure exists

export const userController = igniter.controller({
  path: '/users',
  actions: {
    // ... (list action from above)

    /**
     * An action to create a new user.
     * Final Path: POST /users/
     */
    create: igniter.mutation({
      path: '/',
      method: 'POST',

      // 1. Apply the 'auth' procedure to protect this route.
      // This will run before the handler and can extend the context.
      use: [auth],

      // 2. Define and validate the request body using a Zod schema.
      body: z.object({
        name: z.string().min(2),
        email: z.string().email(),
      }),

      // 3. The main handler function.
      handler: async ({ request, context, response }) => {
        // `request.body` is fully typed as { name: string; email: string; }
        const { name, email } = request.body;

        // `context.user` is available and typed here because the `auth`
        // procedure added it to the context.
        const createdBy = context.user;
        context.logger.info(`User creation initiated by ${createdBy.email}`);

        const newUser = await context.database.user.create({
          data: { name, email },
        });

        // Use the `created` helper for a 201 Created status code.
        return response.created(newUser);
      },
    }),
  },
});
```

This mutation demonstrates the composability of Igniter.js. The validation, authentication, and business logic are all declared in a clean, readable, and type-safe way.

## The Power of the `ctx` Object

The `ctx` object passed to every `handler` is your unified gateway to everything you need for a request. It's an instance of `IgniterActionContext` and contains:

-   `ctx.request`: Fully-typed request data, including `params`, `query`, `body`, `headers`, and `cookies`.
-   `ctx.context`: The dynamic application context, containing your global services (like `database`) and any data added by procedures (like `user`).
-   `ctx.response`: The response processor for building type-safe HTTP responses (`.success()`, `.created()`, `.unauthorized()`, etc.).
-   `ctx.plugins`: A type-safe entry point for interacting with any registered plugins.

By centralizing these concerns, Igniter.js allows you to focus purely on the business logic inside your handler.

### Next Steps

Now you know how to build the core logic of your API. The next step is to understand the powerful middleware system that makes your code reusable and clean.

*   **Learn about [Procedures (Middleware)](./04-Procedures.md)**