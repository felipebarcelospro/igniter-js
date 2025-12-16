# @igniter-js/new-cli

The official Igniter.js command-line interface for scaffolding projects, generating features, wiring add-ons, and keeping your API docs in sync. It is designed for a fast developer experience, type-safe defaults, and seamless automation.

## Highlights

- 🚀 **Project bootstrapper** with interactive wizards, starter templates, and add-on setup (store, jobs, auth, bots, telemetry, MCP, database, Shadcn/UI).
- 🛠️ **Code generators** for features, controllers, procedures, schemas, and OpenAPI specs, all backed by Handlebars templates.
- 🧠 **Schema-aware workflow** with pluggable providers (Prisma out of the box) that produce strongly typed controllers, procedures, and interfaces.
- 👀 **Development dashboard** powered by Ink that automatically regenerates schema/docs and streams app logs in a split view.
- 🧩 **Template engine + registries** to extend starters, add-ons, and schema providers without touching the core.

---

## Requirements

- Node.js **18.17+** (supports npm, pnpm, yarn, bun)
- Git (used for cloning starters)
- Docker (optional, for add-ons that provision services such as Redis/PostgreSQL)

---

## Installation

> You can run the CLI on demand via `npx`/`pnpx`/`bunx`/`yarn dlx`, or install it globally if you prefer the `igniter` executable on your PATH.

```bash
# Execute without installing globally
npx @igniter-js/new-cli@latest --help

# Install globally with your favourite package manager
npm install -g @igniter-js/new-cli
# or
pnpm add -g @igniter-js/new-cli
# or
yarn global add @igniter-js/new-cli
# or
bun add -g @igniter-js/new-cli

# Verify
igniter --version
```

---

## Quick Start

```bash
# Scaffold a Next.js app with Redis store + Better Auth + Prisma/PostgreSQL database
igniter init my-igniter-app \
  --template nextjs \
  --add-ons store,auth,database \
  --database postgresql

# Generate a feature from a Prisma model
cd my-igniter-app
igniter generate feature user --schema prisma:User

# Keep schema + docs in sync while coding
igniter dev --cmd "pnpm dev"
```

During `igniter init` you can accept interactive defaults, or supply flags for fully scripted runs. Add-ons configure package.json, .env, docker-compose, and template files — all tailored to the starter you pick.

---

## Commands

### `igniter init`

Create a new Igniter.js project (either in-place or as a new directory).

| Option | Description | Default |
|--------|-------------|---------|
| `[project-name]` | Output directory (omit to use current working dir) | `.` |
| `--mode <install\|new-project>` | Use existing folder or scaffold a fresh directory | `new-project` |
| `--pm, --package-manager <npm\|yarn\|pnpm\|bun>` | Force package manager detection | auto |
| `--template <starter-id>` | Starter ID (`nextjs`, `express-rest-api`, `tanstack-start`, `bun-rest-api`, `bun-react-app`, `deno-rest-api`) | prompted |
| `--add-ons <list>` | Comma-separated add-ons (`store`,`jobs`,`mcp`,`logging`,`telemetry`,`bots`,`database`,`auth`,`shadcn-ui`) | prompted |
| `--database <provider>` | Preselect database provider when not using prompts (`postgresql`,`mysql`,`sqlite`,`none`) | prompted |
| `--no-git` / `--no-install` / `--no-docker` | Skip Git init, dependency install, or Docker bootstrap | `false` |

Starters are fetched from the Igniter.js monorepo, dependencies are installed via the detected package manager, and add-ons may run post-install hooks (Prisma generate, Better Auth CLI, Shadcn init, etc.).

---

### `igniter generate feature`

Scaffold a feature skeleton under `src/features/<name>/` with controllers, interfaces, and optional procedures.

```
igniter generate feature users
igniter generate feature post --schema prisma:Post --schema-path prisma/schema.prisma
```

Flags:
- `--schema <provider:model>` picks a schema provider (Prisma by default) to generate CRUD-ready files.
- `--schema-path <path>` overrides the provider’s default schema location (e.g., custom Prisma schema path).

### `igniter generate controller`

```
igniter generate controller profile --feature user
```

Adds a controller file to an existing feature, ensuring directories and naming conventions stay consistent.

### `igniter generate procedure`

```
igniter generate procedure billing --feature invoices
```

Creates a procedure scaffold (including removal of the `.gitkeep` placeholder when necessary).

### `igniter generate docs`

```
igniter generate docs --router src/igniter.router.ts --output src/docs
```

Produces an OpenAPI 3.0 JSON file using your router’s docs configuration. Useful for deploying documentation or powering Igniter Studio.

### `igniter generate schema`

```
igniter generate schema --router src/igniter.router.ts --output src/igniter.schema.ts
```

Generates a TypeScript client schema (const assertion + type) that mirrors your server endpoints.

### `igniter generate caller`

Generate Zod schemas and a ready-to-use Igniter Caller from an OpenAPI 3 spec.

```
# Remote spec
igniter generate caller --name facebook --url https://api.example.com/openapi.json

# Local spec
igniter generate caller --name billing --path ./openapi.yaml --output src/callers/billing
```

Outputs `schema.ts` (Zod schemas with the provided prefix) and `index.ts` (preconfigured caller) under `src/callers/<hostname>` by default, ready to use with `@igniter-js/caller`.

### `igniter dev`

Watch mode that keeps schema and docs regenerated while proxying your application’s dev server.

```
igniter dev \
  --router src/igniter.router.ts \
  --output src/igniter.schema.ts \
  --docs-output src/docs \
  --cmd "pnpm dev"
```

Features:
- Ink-powered UI with two tabs (Igniter logs / Application logs) — switch via `←/→` or `1/2`.
- Debounced regeneration (300 ms) when `src/igniter.router.ts` or `src/features/**/*` changes.
- Default dev command inferred from the running package manager (`npm run dev`, `pnpm dev`, `bun dev`, `yarn dev`) when `--cmd` is omitted.
- Graceful teardown on `Ctrl+C` or `ESC`.

---

## Add-On Catalogue

| ID | Purpose | What you get | Docker |
|----|---------|--------------|--------|
| `store` | Redis-backed caching, sessions, pub/sub | `src/services/redis.ts`, `src/services/store.ts`, deps `@igniter-js/adapter-redis`, `ioredis`, env `REDIS_*` | `redis:7-alpine` |
| `jobs` | BullMQ job processing | Services for Redis + BullMQ, deps `@igniter-js/adapter-bullmq`, `bullmq`, env `IGNITER_JOBS_QUEUE_PREFIX` | `redis:7-alpine` |
| `mcp` | Model Context Protocol server | `src/igniter.mcp.ts`, Next.js/TanStack route handlers, deps `@igniter-js/adapter-mcp-server`, env `IGNITER_MCP_*`, `REDIS_*` | `redis:7-alpine` |
| `logging` | Structured logging | `src/services/logger.ts`, dep `@igniter-js/core`, env `IGNITER_LOG_LEVEL` | – |
| `telemetry` | Tracing + metrics hooks | `src/services/telemetry.ts`, dep `@igniter-js/core`, env `IGNITER_TELEMETRY_ENABLE_*` | – |
| `bots` | Multi-platform bot starter | Sample bot + framework-specific HTTP routes, dep `@igniter-js/bot@alpha`, env `TELEGRAM_*` | – |
| `database` | ORM + provider support | Interactive `orm` (Prisma/Drizzle) and `provider` (PostgreSQL/MySQL/SQLite) selection, generates env vars, `src/lib/database.ts`, Prisma schema & config when chosen; runs CLI post-install (`prisma generate` / `drizzle init`) | PostgreSQL (`postgres:16-alpine`) / MySQL (`mysql:8.0`) as needed |
| `auth` | Better Auth integration | `src/lib/auth.ts` with plugin imports, installs `better-auth@1.3.0`, runs `@better-auth/cli generate` | – |
| `shadcn-ui` | UI component kit | Runs `shadcn@latest init --base-color zinc --src-dir --silent --yes` after dependencies | – |

Add-on selections are fully templated: dependencies, `.env`, `docker-compose.yml`, and generated files all stay in sync with your choices.

---

## Schema Providers

Schema providers convert domain models into fully wired Igniter.js features.

- Providers live under `src/core/registry/schema-provider` and register through `schemaProviderRegistry`.
- Prisma support is built-in: run `igniter generate feature <name> --schema prisma:ModelName`.
- Use `--schema-path` to point at a custom Prisma schema (e.g., `--schema-path apps/admin/prisma/schema.prisma`).
- Providers can contribute templates, env vars, docker services, and post-install steps.

Extending the system:

1. Implement a class extending `SchemaProvider`.
2. Register it in `src/registry/schema-provider/index.ts`.
3. Ship templates under `templates/generate/feature/` as needed.

---

## Development Mode UI

The Ink dashboard offers:

- **Tabs**: `Igniter.js` (CLI logs) and `Application` (child process output).
- **Shortcuts**: `1` / `←` toggles to Igniter, `2` / `→` toggles to Application, `Ctrl+C` or `ESC` exits.
- **Log retention**: Keeps the last 1,000 entries per stream with coloured severity badges.
- **Metrics**: Each regeneration reports duration, controller/action counts, and OpenAPI file size.

Ideal for local development alongside frameworks like Next.js, TanStack Start, Express, Bun, or Deno.

---

## Local Development (Maintainers)

```bash
# Install dependencies
npm install

# Watch build (tsup --watch)
npm run dev

# Type-check and build
npm run typecheck
npm run build

# Try the locally built CLI
npm link            # once
igniter --help
```

Useful tips:
- The repository uses npm workspaces; run the commands from `packages/cli`.
- `npm run dev` rebuilds `dist/index.mjs` automatically when editing `src/**`.
- Keep `templates/` and registries in sync; always update `AGENTS.md` when adding new files.

---

## Troubleshooting

- **Router not found**: Ensure `--router` points to the compiled TypeScript entry (default `src/igniter.router.ts`).
- **Docs generation fails**: Your router must include a `docs` configuration (`router.config.docs`). Without it, `igniter generate docs` exits with an error.
- **Docker conflicts**: The init command attempts to free ports used in `docker-compose.yml`. Free them manually if the helper cannot terminate existing processes.
- **Better Auth / Prisma CLI errors**: These post-install hooks require the dependencies to be installed. Re-run `npm install` and `igniter init` (or rerun the add-on setup) if they fail.
- **Ink UI not rendering**: Ensure you are running inside a Node-supported terminal (macOS Terminal, iTerm, Windows Terminal, etc.).

---

## License

MIT © Felipe Barcelos and the Igniter.js contributors.











