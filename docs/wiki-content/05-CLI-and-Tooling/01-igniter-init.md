# CLI: Scaffolding with `igniter init`

The Igniter.js Command-Line Interface (CLI) includes a powerful scaffolding tool, `igniter init`, designed to get you up and running with a new, production-ready project in minutes.

It handles all the boilerplate setup, including directory structure, package installation, and initial configuration files, allowing you to focus immediately on building your application's features.

## 1. How to Use

To create a new Igniter.js project, open your terminal and run the following command:

```bash
npx @igniter-js/cli init my-awesome-api
```

This will create a new directory named `my-awesome-api`, and the CLI will guide you through an interactive setup process.

---

## 2. The Interactive Setup

The `init` command asks a series of questions to tailor the project to your specific needs.

### Project Name
It will first confirm the name of the project based on what you provided in the command.

### Framework Selection
It will then detect if you are inside an existing project (like a Next.js monorepo) or ask you to choose a framework. This step is crucial as it sets up the correct adapters and entry points.

```
? Which framework are you using?
❯ Next.js
  Express
  Hono
  Standalone
```

### Feature Selection
Next, it will prompt you to enable optional, first-class Igniter.js features. You can select them using the spacebar.

```
? Which Igniter.js features would you like to enable?
❯ ◯ Igniter.js Store (for Caching, Sessions, Pub/Sub via Redis)
  ◯ Igniter.js Queues (for Background Jobs via BullMQ)
```

Enabling these features will automatically install the necessary dependencies (like `ioredis` or `bullmq`) and create the corresponding service files (e.g., `src/services/store.ts`, `src/services/jobs.ts`).

### Database and Docker
Finally, it can set up a `docker-compose.yml` file with services like PostgreSQL and Redis, giving you a complete, isolated development environment with a single command.

---

## 3. What It Generates

After the setup is complete, `igniter init` produces a well-organized project based on the **Feature-Based Architecture**.

A typical project structure looks like this:

```
my-awesome-api/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── v1/
│   │           └── [[...all]]/
│   │               └── route.ts        # Next.js API route handler
│   ├── features/                       # Your application features live here
│   ├── services/                       # Service initializations (Prisma, Redis, etc.)
│   ├── igniter.ts                      # Core Igniter.js initialization
│   ├── igniter.client.ts               # Type-safe client for the frontend
│   ├── igniter.context.ts              # Global application context
│   └── igniter.router.ts               # Main application router
├── prisma/
│   └── schema.prisma                   # Prisma schema if a database is chosen
├── .env.example                        # Example environment variables
├── docker-compose.yml                  # Docker services (DB, Redis)
└── package.json
```

This structured approach ensures your project is scalable, maintainable, and easy for new developers to understand.

### Next Steps

Now that you've scaffolded your project, the next step is to run it.

-   **Learn about the interactive development server with [`igniter dev`](./02-igniter-dev.md)**