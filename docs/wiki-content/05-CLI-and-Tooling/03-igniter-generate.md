# `igniter generate`: Scaffolding & Schema Generation

The `igniter generate` command is a powerful, multi-purpose tool designed to accelerate your development workflow. It serves two primary functions:

1.  **Scaffolding**: Automatically create boilerplate files for new features, either from a database schema or from scratch. This ensures consistency and lets you focus on business logic.
2.  **Schema Generation**: Analyze your `AppRouter` to generate a type-safe client, keeping your frontend and backend perfectly in sync.

---

## 1. Schema-First Scaffolding (Recommended)

This is the fastest way to build a feature. With a single command, you can generate a complete, production-ready CRUD API directly from your existing database models.

### `generate feature <name> --schema <provider:Model>`

This command reads your database schema, understands your model's structure, and generates all the necessary files for a full CRUD implementation.

**Command:**

```bash
# Example: Generate a 'user' feature from the 'User' model in your Prisma schema
npx @igniter-js/cli generate feature user --schema prisma:User
```

**What it Creates:**

This command creates a new directory at `src/features/user/` and populates it with the following:

*   **`user.interfaces.ts`**:
    *   Generates a Zod schema (`UserSchema`) based on your Prisma model's fields.
    *   Creates schemas for create (`CreateUserInputSchema`) and update (`UpdateUserInputSchema`) operations, automatically omitting fields like `id` and `createdAt`.
    *   Exports inferred TypeScript types (`User`, `CreateUserInput`, etc.).

*   **`procedures/user.procedure.ts`**:
    *   Creates a reusable procedure that acts as a **repository** for your feature.
    *   This procedure centralizes all your database logic (`findAll`, `findById`, `create`, `update`, `delete`) and makes it available in the `context`.

*   **`controllers/user.controller.ts`**:
    *   Generates a controller with all standard CRUD actions (`list`, `getById`, `create`, `update`, `delete`).
    *   Each action is pre-wired to use the `userProcedure` and its repository methods, completely separating the HTTP layer from the data layer.

*   **`index.ts`**:
    *   Exports all the necessary modules from the feature, making it easy to register in your main router.

This approach provides a robust, clean, and scalable foundation for your feature in seconds.

---

## 2. Manual Scaffolding

If you don't have a database model or need to build a feature with custom logic that doesn't fit a CRUD pattern, you can generate an empty feature structure.

### `generate feature <name>`

**Command:**
```bash
# Example: Generate a new, empty feature called 'dashboard'
npx @igniter-js/cli generate feature dashboard
```

**What it Creates:**
This command scaffolds a basic feature directory with placeholder files, allowing you to build your logic from the ground up while still maintaining a consistent project structure.

---

## 3. Client Schema Generation

The `igniter generate schema` command is responsible for the end-to-end type safety of your application. It reads your backend's `AppRouter` and creates a type-safe client that your frontend can use.

### `igniter generate schema`

This command performs a **one-time generation** of the client schema. It's perfect for integrating into build scripts or CI/CD pipelines.

**Usage:**
```bash
# Manually generate the client
npx @igniter-js/cli generate schema
```
```json
// Example in package.json
{
  "scripts": {
    "build": "igniter generate schema && next build"
  }
}
```

### `igniter generate schema --watch`

This command starts a persistent watcher that monitors your controller files. Whenever you save a change, it automatically and instantly regenerates the client schema.

This is used internally by the main `igniter dev` command to provide a seamless, real-time development experience. You typically won't need to run this command manually.