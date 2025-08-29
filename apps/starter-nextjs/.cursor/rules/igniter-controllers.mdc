---
description: |
  A focused guide on creating Igniter.js controllers and actions (queries and mutations). This rule details the properties, validation layers (Zod and Ensure), and the response object for building API endpoints.
alwaysApply: false
---

# Igniter.js: Controllers and Actions

This guide provides a detailed reference for creating controllers and actions, which are the fundamental building blocks of an Igniter.js API.

## 1. Controllers (`igniter.controller`)

A controller is a logical grouping of related API actions under a common base path.

### 1.1. Definition
```typescript
export const postsController = igniter.controller({
  name: 'Posts', // A descriptive name for documentation and debugging
  path: '/posts', // The base URL path for all actions in this controller
  actions: {
    // ... actions are defined here
  },
});
```

### 1.2. Controller Properties
| Property    | Type   | Required | Description                                                                 |
| :---------- | :----- | :------- | :-------------------------------------------------------------------------- |
| `name`      | string | Yes      | A descriptive name for the controller, used in documentation.               |
| `path`      | string | Yes      | The base URL segment for all actions within this controller (e.g., `/posts`). |
| `actions`   | object | Yes      | An object containing all the API endpoints (actions) for this controller.   |

## 2. Actions (`igniter.query` & `igniter.mutation`)

Actions are the individual API endpoints within a controller.

### 2.1. Query Actions (`igniter.query`)
Used for fetching data, corresponding to `GET` requests.

```typescript
list: igniter.query({
  path: '/', // Final path: /posts/
  query: z.object({ // Zod schema for URL query parameter validation
    limit: z.string().optional(),
  }),
  handler: ({ request, response, context }) => {
    // ... business logic
  },
})
```

### 2.2. Mutation Actions (`igniter.mutation`)
Used for creating, updating, or deleting data. Corresponds to `POST`, `PUT`, `PATCH`, or `DELETE` requests.

```typescript
create: igniter.mutation({
  path: '/', // Final path: /posts/
  method: 'POST', // Explicitly define the HTTP method
  body: z.object({ // Zod schema for request body validation
    title: z.string(),
    content: z.string(),
  }),
  handler: ({ request, response, context }) => {
    // ... business logic
  },
})
```

## 3. Validation Layers

Igniter.js employs a powerful two-layer validation strategy.

### 3.1. Layer 1: Schema Validation (Zod)
This layer validates the **shape and type** of incoming request data (`body` and `query`) before your handler is executed. If validation fails, Igniter.js automatically returns a `400 Bad Request` response with detailed error messages.

-   **`body`**: A Zod schema for the request body (for mutations).
-   **`query`**: A Zod schema for the URL query parameters (for both queries and mutations).

### 3.2. Layer 2: Business Logic Validation (`Ensure` Plugin)
This layer is for asserting **runtime conditions** inside your handler. The `ensure` plugin provides a clean, declarative way to handle business logic checks (e.g., permissions, resource existence) that also provides TypeScript with type-narrowing.

```typescript
update: igniter.mutation({
  path: '/:id',
  method: 'PUT',
  body: z.object({ content: z.string().min(10) }),
  use: [authProcedure({ required: true })],
  handler: async ({ request, context, response }) => {
    // 1. Fetch the resource
    const post = await context.database.post.findUnique({ where: { id: request.params.id } });

    // 2. Assert conditions using the 'ensure' plugin
    context.plugins.ensure.toBeDefined(post, "Post not found"); // Throws 404 if post is null
    context.plugins.ensure.toBeTrue(
      post.authorId === context.user.id,
      "You do not have permission to edit this post" // Throws 403 if false
    );

    // After these checks, TypeScript knows `post` is not null.
    // ... proceed with update logic
  }
})
```

## 4. The Handler Context

The `handler` function of every action receives a single object with the following properties:

| Property    | Description                                                                                             |
| :---------- | :------------------------------------------------------------------------------------------------------ |
| `request`   | Contains all incoming request data: `method`, `path`, `params`, `headers`, `cookies`, and the validated `body` and `query`. |
| `response`  | A fluent API for building the HTTP response.                                                            |
| `context`   | The dependency injection container, providing access to global services (like `database`) and data from procedures. |
| `plugins`   | Type-safe access to registered plugins, like `ensure`.                                                  |
| `realtime`  | Services for triggering real-time updates to connected clients.                                         |

## 5. The Response Object

The `response` object provides a chainable, fluent API for constructing the HTTP response.

### Success Responses
-   `.success(data)`: Returns a `200 OK` with a JSON payload.
-   `.created(data)`: Returns a `201 Created` with a JSON payload.
-   `.noContent()`: Returns a `204 No Content`.

### Error Responses
-   `.badRequest(message?)`: Returns a `400 Bad Request`.
-   `.unauthorized(message?)`: Returns a `401 Unauthorized`.
-   `.forbidden(message?)`: Returns a `403 Forbidden`.
-   `.notFound(message?)`: Returns a `404 Not Found`.
-   `.error({ code, message, data? })`: Returns a `500 Internal Server Error` with a custom error payload.

### Other Methods
-   `.status(code)`: Sets a custom HTTP status code.
-   `.setHeader(name, value)`: Sets a response header.
-   `.revalidate(queryKeys)`: Triggers automatic client-side cache revalidation for specified queries.
-   `.redirect(url)`: Performs a server-side redirect.
