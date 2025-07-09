# Installation

Igniter.js is designed to be incrementally adoptable. You can add it to an existing project or start a new one from scratch using our CLI.

## Recommended: `igniter init`

For new projects, the fastest and recommended way to get started is by using the `igniter init` command. This scaffolds a new application with a pre-configured, best-practice project structure.

```bash
# Start a new project interactively
npx @igniter-js/cli init my-new-app
```

This command sets up everything you need, including the core library, folder structure, and basic configuration files. For a full walkthrough, please see our **[Quick Start Guide](./01-Quick-Start-Guide.md)**.

---

## Manual Installation

If you want to integrate Igniter.js into an existing project, you can install the core package manually.

Choose your package manager:

```bash
# npm
npm install @igniter-js/core

# yarn
yarn add @igniter-js/core

# pnpm
pnpm add @igniter-js/core

# bun
bun add @igniter-js/core
```

This will give you access to the core builder, router, and all the fundamental tools needed to create an Igniter.js application.

---

## Optional Peer Dependencies

Igniter.js uses a powerful, driver-based architecture for advanced features like caching, background jobs, and real-time events. These features require you to install additional peer dependencies.

This approach keeps the core library lightweight and ensures you only install what you need.

### For Igniter.js Store (Caching & Pub/Sub)

To use the Redis-based store for caching, session management, or pub/sub messaging, you need to install `ioredis`.

```bash
# npm
npm install ioredis
npm install @types/ioredis --save-dev

# yarn
yarn add ioredis
yarn add @types/ioredis --dev
```

### For Igniter.js Queues (Background Jobs)

To use the powerful background job processing system, which is powered by BullMQ, install the `bullmq` package.

```bash
# npm
npm install bullmq

# yarn
yarn add bullmq
```

### For Zod Validation

While not strictly required, `zod` is the recommended library for schema validation of request bodies, queries, and parameters. It's deeply integrated into the Igniter.js type system.

```bash
# npm
npm install zod

# yarn
yarn add zod
```
