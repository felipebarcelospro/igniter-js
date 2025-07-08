# Recommended Project Structure

A well-organized project structure is crucial for building scalable, maintainable, and collaborative applications. Igniter.js promotes a **Feature-Sliced Architecture** that is designed to grow with your project, keeping your codebase clean and easy to navigate.

The `igniter init` command automatically scaffolds a project with this structure.

---

## The Feature-Based Philosophy

Instead of organizing your code by file type (e.g., a single folder for all controllers, another for all services), we organize it by **feature**. A feature is a self-contained vertical slice of your application's functionality, such as `users`, `products`, or `auth`.

This approach has several key benefits:
*   **High Cohesion**: All code related to a single feature (its routes, logic, types, etc.) lives together.
*   **Low Coupling**: Features are isolated and have minimal dependencies on each other, making them easier to develop, test, and remove if needed.
*   **Scalability**: As your application grows, you simply add new feature folders without cluttering existing ones.
*   **Improved Developer Experience**: It's intuitive to find the code you're looking for because it's grouped by its business purpose.

---

## Top-Level Directory Structure

Here is the recommended top-level structure for an Igniter.js project:

```
src/
├── app/
│   └── api/
│       └── v1/
│           └── [[...all]]/
│               └── route.ts              # Framework-specific route handler (e.g., Next.js)
├── features/                             # ★ Your application's features live here
│   └── [feature]/
│       ├── controllers/
│       ├── procedures/
│       ├── [feature].interfaces.ts
│       └── index.ts
├── services/                             # Third-party service initializations (Prisma, Redis)
│   ├── database.ts
│   └── redis.ts
├── igniter.ts                            # Core Igniter.js instance initialization
├── igniter.client.ts                     # Type-safe client for frontend use
├── igniter.context.ts                    # Global application context definition
└── igniter.router.ts                     # The main application router where all controllers are assembled
```

### Explanation of Directories

*   **`src/app`**: Contains framework-specific integration files. In a Next.js project, this is where the API route handler lives. Igniter.js itself is framework-agnostic, but it needs a single entry point.
*   **`src/features`**: The heart of your application. Each subdirectory within `features` represents a distinct business capability.
*   **`src/services`**: A dedicated place to initialize and export instances of external services, such as a database client (`Prisma`), a Redis client, or a logger.
*   **`src/igniter.ts`**: Where you create and configure the core `Igniter` instance, enabling plugins and global middleware.
*   **`src/igniter.context.ts`**: Defines the shape of the global `Context` object that is available in all your actions and procedures.
*   **`src/igniter.router.ts`**: Where you import all your feature controllers and assemble them into the final `AppRouter`.
*   **`src/igniter.client.ts`**: Defines the type-safe client used by your frontend application to interact with the API.

---

## Inside a Feature Directory

Let's look at the structure of a single feature, for example, `src/features/user`:

```
features/
└── user/
    ├── controllers/
    │   └── user.controller.ts      # Defines API endpoints (/users, /users/:id)
    ├── procedures/
    │   └── auth.procedure.ts       # Reusable middleware (e.g., for checking authentication)
    ├── user.interfaces.ts          # Zod schemas and TypeScript types for the User feature
    └── index.ts                    # Exports the feature's public modules (e.g., userController)
```

*   **`controllers/`**: Contains one or more controller files that define the API routes for the feature using `igniter.controller`.
*   **`procedures/`**: Contains reusable middleware created with `igniter.procedure`. For example, an `auth` procedure here could be used to protect user-related routes.
*   **`[feature].interfaces.ts`**: A central file for all TypeScript `interface` or `type` definitions and `zod` schemas related to this feature. This keeps your data shapes explicit and organized.
*   **`index.ts`**: The public entry point for the feature. It typically exports the controllers so they can be easily imported into the main router.

By following this structure, you create a codebase that is organized, scalable, and a pleasure to work on.

**Next:** Now that you understand the structure, let's dive into the **[Core Concepts](./02-Core-Concepts/01-The-Igniter-Builder.md)** of Igniter.js.