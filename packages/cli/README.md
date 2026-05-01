# @igniter-js/cli

<div align="center">

[![npm version](https://img.shields.io/npm/v/@igniter-js/cli)](https://www.npmjs.com/package/@igniter-js/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-18.17+-green)](https://nodejs.org)

**The official Igniter.js CLI**

Create projects, scaffold features, wire add-ons, and keep OpenAPI + client schema output in sync.

[Quick Start](#-quick-start) • [Documentation](https://igniterjs.com/docs/cli) • [Commands](#-commands) • [Examples](#-example-library) • [Real-World](#-real-world-scenarios) • [API Reference](#-api-reference)

</div>

---

## ✨ Why @igniter-js/cli?

Igniter.js favors **speed + consistency** across teams. The CLI is your guardrail for that.

- ✅ **Fewer manual steps** — starters + add-ons configure code, dependencies, .env, and Docker
- ✅ **Type-safe scaffolding** — schema-aware generation outputs clean controllers + procedures
- ✅ **Docs in sync** — OpenAPI + client schemas regenerate as you iterate
- ✅ **Multi-runtime** — create Next.js, TanStack Start, Express, Deno, or Bun starters
- ✅ **Extensible** — add-ons + schema providers are registry-based

---

## 🚀 Quick Start

### Installation

```bash
# npm
npm install -g @igniter-js/cli

# pnpm
pnpm add -g @igniter-js/cli

# yarn
yarn global add @igniter-js/cli

# bun
bun add -g @igniter-js/cli
```

### Run without installing

```bash
npx @igniter-js/cli@latest --help
pnpm dlx @igniter-js/cli@latest --help
yarn dlx @igniter-js/cli@latest --help
bunx @igniter-js/cli@latest --help
```

### Your First Project (60 seconds)

```bash
# Create a Next.js project with database + auth
igniter init my-app \
  --template nextjs \
  --add-ons database,auth \
  --database postgresql

cd my-app

# Generate a Prisma-backed feature
igniter generate feature users --schema prisma:User

# Keep schema + docs in sync while you code
igniter dev --cmd "pnpm dev"
```

✅ **Success!** Your project now includes a starter, configured add-ons, and feature scaffolding.

---
MIT © Felipe Barcelos and the Igniter.js contributors.

### `telemetry`

**Purpose**

- Telemetry hooks + service wiring

**Templates**

- `templates/add-ons/telemetry/telemetry.ts.hbs`

**Dependencies**

- `@igniter-js/core` (latest)

**Environment variables**

- `IGNITER_TELEMETRY_ENABLE_TRACING`
- `IGNITER_TELEMETRY_ENABLE_METRICS`
- `IGNITER_TELEMETRY_ENABLE_EVENTS`
- `IGNITER_TELEMETRY_ENABLE_CLI_INTEGRATION`

**Example**

```bash
igniter init obs-app --add-ons telemetry
```

---

### `bots`

**Purpose**

- Multi-platform bot setup (Telegram, WhatsApp, Discord, etc.)

**Templates**

- `templates/add-ons/bots/sample-bot.hbs`
- `templates/add-ons/bots/nextjs/route-handler.hbs` (Next.js)
- `templates/add-ons/bots/tanstack-start/route-handler.hbs` (TanStack Start)

**Dependencies**

- `@igniter-js/bot` (alpha)

**Environment variables**

- `TELEGRAM_TOKEN`
- `TELEGRAM_WEBHOOK_URL`
- `TELEGRAM_WEBHOOK_SECRET`

**Example**

```bash
igniter init bot-app --add-ons bots
```

---

### `database`

**Purpose**

- ORM + provider configuration

**Options (order matters for inline syntax)**

1) `orm` → `prisma` or `drizzle`
2) `provider` → `postgresql`, `mysql`, `sqlite`

**Prisma templates**

- `templates/add-ons/database/prisma/lib.hbs`
- `templates/add-ons/database/prisma/prisma.config.hbs`
- `templates/add-ons/database/prisma/schema.hbs`

**Drizzle templates**

- `templates/add-ons/database/drizzle/lib.hbs`

**Prisma dependencies**

- `dotenv` (latest)
- `prisma` (^6.19.0)
- `@prisma/client` (^6.19.0)

**Docker (provider)**

- PostgreSQL → `postgres:16-alpine`
- MySQL → `mysql:8.0`

**Environment variables**

- `DATABASE_URL`
- `DATABASE_PASSWORD`
- `DATABASE_USER`
- `DATABASE_NAME`

**Inline option examples**

```bash
igniter init app --add-ons "database:prisma:postgresql"
igniter init app --add-ons "database:drizzle:mysql"
igniter init app --add-ons "database:drizzle:sqlite"
```

---

### `auth`

**Purpose**

- Better Auth configuration + plugin wiring

**Options (order matters for inline syntax)**

1) `provider` → `better-auth`
2) `plugins` → multi-select

**Template**

- `templates/add-ons/auth/better-auth/auth.hbs`

**Dependencies**

- `better-auth` (1.3.0)

**Plugins (all supported values)**

- `email`
- `two-factor`
- `username`
- `anonymous`
- `phone-number`
- `magic-link`
- `email-otp`
- `passkey`
- `generic-oauth`
- `one-tap`
- `api-key`
- `admin`
- `organization`
- `oidc`
- `sso`
- `bearer`
- `multi-session`
- `oauth-proxy`
- `open-api`
- `jwt`
- `next-cookies`

**Inline option example**

```bash
igniter init app --add-ons "auth:better-auth:email+magic-link+passkey"
```

---

### `shadcn-ui`

**Purpose**

- Run Shadcn/UI initialization

**Post-install command**

- `shadcn@latest init --base-color zinc --src-dir --silent --yes`

**Example**

```bash
igniter init ui-app --add-ons shadcn-ui
```

---

## 🧭 Starter Deep Dive

### `nextjs`

**Repository**

- `apps/starter-nextjs`

**Templates**

- `templates/starters/nextjs/route-handler.hbs`
- `templates/starters/nextjs/tsconfig.hbs`
- `templates/starters/igniter.router.hbs`
- `templates/starters/igniter.client.hbs`
- `templates/starters/igniter.context.hbs`
- `templates/starters/igniter.hbs`
- `templates/scaffold/example-feature/example.controller.hbs`
- `templates/scaffold/example-feature/example.procedure.hbs`
- `templates/scaffold/example-feature/example.interfaces.hbs`
- `templates/starters/open-api.hbs`

**Environment variables**

- `IGNITER_APP_NAME`
- `IGNITER_APP_SECRET`
- `IGNITER_API_URL`
- `IGNITER_API_BASE_PATH`
- `NEXT_PUBLIC_IGNITER_API_URL`
- `NEXT_PUBLIC_IGNITER_API_BASE_PATH`

**Example**

```bash
igniter init my-nextjs-app --template nextjs
```

---

### `tanstack-start`

**Repository**

- `apps/starter-tanstack-start`

**Templates**

- `templates/starters/tanstack-start/route-handler.hbs`
- `templates/starters/tanstack-start/tsconfig.hbs`
- `templates/starters/igniter.router.hbs`
- `templates/starters/igniter.client.hbs`
- `templates/starters/igniter.context.hbs`
- `templates/starters/igniter.hbs`
- `templates/scaffold/example-feature/example.controller.hbs`
- `templates/scaffold/example-feature/example.procedure.hbs`
- `templates/scaffold/example-feature/example.interfaces.hbs`
- `templates/starters/open-api.hbs`

**Environment variables**

- `IGNITER_APP_NAME`
- `IGNITER_APP_SECRET`
- `IGNITER_API_URL`
- `IGNITER_API_BASE_PATH`
- `REACT_APP_IGNITER_API_URL`
- `REACT_APP_IGNITER_API_BASE_PATH`

**Example**

```bash
igniter init my-tanstack-app --template tanstack-start
```

---

### `express-rest-api`

**Repository**

- `apps/starter-express-rest-api`

**Environment variables**

- `IGNITER_APP_NAME`
- `IGNITER_APP_SECRET`
- `IGNITER_API_URL`
- `IGNITER_API_BASE_PATH`

**Example**

```bash
igniter init my-express-api --template express-rest-api
```

---

### `bun-rest-api`

**Repository**

- `apps/starter-bun-rest-api`

**Environment variables**

- `IGNITER_APP_NAME`
- `IGNITER_APP_SECRET`
- `IGNITER_API_URL`
- `IGNITER_API_BASE_PATH`

**Example**

```bash
igniter init my-bun-api --template bun-rest-api
```

---

### `bun-react-app`

**Repository**

- `apps/starter-bun-react-app`

**Environment variables**

- `IGNITER_APP_NAME`
- `IGNITER_APP_SECRET`
- `IGNITER_API_URL`
- `IGNITER_API_BASE_PATH`

**Example**

```bash
igniter init my-bun-react-app --template bun-react-app
```

---

### `deno-rest-api`

**Repository**

- `apps/starter-deno-rest-api`

**Environment variables**

- `IGNITER_APP_NAME`
- `IGNITER_APP_SECRET`
- `IGNITER_API_URL`
- `IGNITER_API_BASE_PATH`

**Example**

```bash
igniter init my-deno-api --template deno-rest-api
```

---

## 🗂 Template Catalog

### Add-on templates

- `templates/add-ons/auth/better-auth/auth.hbs`
- `templates/add-ons/bots/nextjs/route-handler.hbs`
- `templates/add-ons/bots/sample-bot.hbs`
- `templates/add-ons/bots/tanstack-start/route-handler.hbs`
- `templates/add-ons/database/drizzle/lib.hbs`
- `templates/add-ons/database/prisma/lib.hbs`
- `templates/add-ons/database/prisma/prisma.config.hbs`
- `templates/add-ons/database/prisma/schema.hbs`
- `templates/add-ons/jobs/jobs.ts.hbs`
- `templates/add-ons/jobs/redis.ts.hbs`
- `templates/add-ons/jobs/store.ts.hbs`
- `templates/add-ons/logging/logger.ts.hbs`
- `templates/add-ons/mcp/mcp.ts.hbs`
- `templates/add-ons/mcp/nextjs/route-handler.hbs`
- `templates/add-ons/mcp/tanstack-start/route-handler.hbs`
- `templates/add-ons/store/redis.ts.hbs`
- `templates/add-ons/store/store.ts.hbs`
- `templates/add-ons/telemetry/telemetry.ts.hbs`

### Feature generation templates

- `templates/generate/feature/empty.controller.hbs`
- `templates/generate/feature/empty.interfaces.hbs`
- `templates/generate/feature/procedure.hbs`
- `templates/generate/feature/schema.controller.hbs`
- `templates/generate/feature/schema.interfaces.hbs`
- `templates/generate/feature/schema.procedure.hbs`

### Scaffold templates

- `templates/scaffold/example-feature/example.controller.hbs`
- `templates/scaffold/example-feature/example.interfaces.hbs`
- `templates/scaffold/example-feature/example.procedure.hbs`
- `templates/scaffold/igniter.schema.hbs`

### Starter templates

- `templates/starters/igniter.client.hbs`
- `templates/starters/igniter.context.hbs`
- `templates/starters/igniter.hbs`
- `templates/starters/igniter.router.hbs`
- `templates/starters/nextjs/route-handler.hbs`
- `templates/starters/nextjs/tsconfig.hbs`
- `templates/starters/open-api.hbs`
- `templates/starters/tanstack-start/route-handler.hbs`
- `templates/starters/tanstack-start/tsconfig.hbs`

---

## 🧩 Handlebars Helper Examples

### `includes`

```handlebars
{{#if (includes enabledAddOns "store")}}
import { store } from "@/services/store";
{{/if}}
```

### `isEmpty`

```handlebars
{{#if (isEmpty enabledAddOns)}}
// No add-ons selected
{{/if}}
```

### `isDefined`

```handlebars
{{#if (isDefined addOnOptions.database)}}
// Database configuration is available
{{/if}}
```

### `join`

```handlebars
// Generates: "email, passkey, jwt"
{{join addOnOptions.auth.plugins ", "}}
```

### `capitalizeSlug`

```handlebars
// "my-app" -> "My App"
export const appName = "{{capitalizeSlug projectName}}";
```

### `get`

```handlebars
// Access nested option
{{#if (get addOnOptions "database.orm")}}
// ORM selected
{{/if}}
```

### `eq`

```handlebars
{{#if (eq starter "nextjs")}}
// Next.js specific code
{{/if}}
```

### `camelCase`

```handlebars
// "two-factor" -> "twoFactor"
{{camelCase "two-factor"}}
```

### `filterPlugins`

```handlebars
{{#each (filterPlugins addOnOptions.auth.plugins)}}
import { {{camelCase this}} } from "better-auth/plugins";
{{/each}}
```

### `generatePluginImports`

```handlebars
{{{generatePluginImports addOnOptions.auth.plugins}}}
```

---

## 🧩 CLI Workflow Details

### Init Flow (high-level)

1) Collect prompts (project name, starter, add-ons)
2) Create project or install into existing directory
3) Apply add-ons (templates, deps, env vars, docker)
4) Install dependencies (optional)
5) Run Docker setup (optional)
6) Initialize Git (optional)
7) Run post-install hooks (add-ons)

### Add-on setup order

1) Dependencies → package.json
2) Docker services → docker-compose.yml
3) Env vars → .env
4) Templates → output files
5) Post-install → CLI setup hooks

---

## 🧠 CLI Internals (Implementation Highlights)

### Package manager detection

The CLI inspects the `npm_config_user_agent` environment variable.

- `yarn` → `yarn`
- `pnpm` → `pnpm`
- `bun` → `bun`
- default → `npm`

### Package manager command helpers

- npm → `npx`
- pnpm → `pnpx`
- bun → `bunx`
- yarn → `yarn dlx`

### Framework detection (install mode)

- Next.js if `next.config.js` or `next.config.ts` is present
- TanStack Start if `@tanstack/react-start` dependency exists
- Otherwise `generic`

### Router introspection

- Bundles router with esbuild in-memory
- Expects `AppRouter` export, default export, or module export
- Converts Zod schemas to JSON Schema for OpenAPI

### OpenAPI defaults

- Default server: `http://localhost:3000/api/v1`
- Default info: `{ title: "Igniter API", version: "1.0.0" }`

---

## 🧾 Template Context Reference

Templates receive a context object derived from `ProjectSetupConfig` plus add-on metadata.

**Core fields**

- `projectName` — project directory name
- `mode` — `install` or `new-project`
- `starter` — starter ID
- `addOns` — selected add-on IDs
- `packageManager` — `npm`, `yarn`, `pnpm`, `bun`
- `database` — `postgresql`, `mysql`, `sqlite`, `none`
- `initGit` — boolean
- `initDocker` — boolean
- `installDependencies` — boolean

**Enhanced fields**

- `enabledAddOns` — same as `addOns`
- `addOnOptions` — object keyed by add-on ID

**Example**

```json
{
  "projectName": "my-app",
  "mode": "new-project",
  "starter": "nextjs",
  "addOns": ["database", "auth"],
  "packageManager": "pnpm",
  "database": "postgresql",
  "initGit": true,
  "initDocker": false,
  "installDependencies": true,
  "enabledAddOns": ["database", "auth"],
  "addOnOptions": {
    "database": {
      "orm": "prisma",
      "provider": "postgresql"
    },
    "auth": {
      "provider": "better-auth",
      "plugins": ["email", "passkey"]
    }
  }
}
```

---

## 🧾 OpenAPI Generation Details

The CLI builds an OpenAPI 3.0 document using router introspection.

### Docs config (router.config.docs)

Supported fields:

- `info` → `{ title, version, description }`
- `servers` → `{ url, description }[]`
- `securitySchemes` → OpenAPI security schemes object
- `playground` → custom payload (pass-through)
- `filepath` → optional metadata

### Default values

- `openapi`: `3.0.0`
- `info`: `{ title: "Igniter API", version: "1.0.0" }`
- `servers`: `[{ url: "http://localhost:3000/api/v1", description: "Default server" }]`

### Minimal config example

```typescript
export const router = igniter.router({
  docs: {
    info: {
      title: "Acme API",
      version: "1.0.0",
      description: "Public API",
    },
    servers: [
      { url: "https://api.acme.com/v1" },
    ],
  },
});
```

### Introspection fields collected

- Controller name
- Controller description
- Controller path
- Action name
- Action description
- Action method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
- Action path
- Action query schema (JSON Schema)
- Action body schema (JSON Schema)

---

## 🧠 Schema Providers

Schema providers generate fully wired feature files from your domain models.

### Prisma (built-in)

- **Provider ID:** `prisma`
- **Default schema path:** `prisma/schema.prisma`
- **Command format:** `--schema prisma:ModelName`

When selected, the CLI generates:

- `src/features/<feature>/controllers/<feature>.controller.ts`
- `src/features/<feature>/procedures/<feature>.procedure.ts`
- `src/features/<feature>/<feature>.interfaces.ts`

---

## 🛠 Templates & Helpers

All scaffolding uses Handlebars templates stored in the CLI `templates/` folder. Helpers are registered at runtime.

### Helpers

- `includes(array, value)`
- `isEmpty(array)`
- `isDefined(value)`
- `join(array, separator)`
- `capitalizeSlug(slug)`
- `get(obj, path)`
- `eq(a, b)`
- `camelCase(str)`
- `filterPlugins(plugins)`
- `generatePluginImports(plugins)`

---

## ⚙️ Commands

### `igniter init`

Create a new project or install Igniter.js into the current directory.

**Options**

| Option | Description | Default |
|--------|-------------|---------|
| `[project-name]` | Directory name | `.` |
| `--mode <install|new-project>` | Use existing folder or scaffold a new one | `new-project` |
| `--pm, --package-manager <npm|yarn|pnpm|bun>` | Choose package manager | auto-detected |
| `--template <starter-id>` | Starter ID | prompted |
| `--add-ons <list>` | Comma-separated add-on IDs | prompted |
| `--database <provider>` | `postgresql`, `mysql`, `sqlite`, `none` | prompted |
| `--no-git` | Skip Git init | `false` |
| `--no-install` | Skip dependency install | `false` |
| `--no-docker` | Skip Docker setup | `false` |

### `igniter generate`

Generate features, controllers, procedures, schemas, docs, or callers.

Subcommands:

- `feature`
- `controller`
- `procedure`
- `docs`
- `schema`
- `caller`

### `igniter dev`

Runs watch mode: regenerates docs + schema and starts your dev server.

**Options**

| Option | Description | Default |
|--------|-------------|---------|
| `--router <path>` | Router entry path | `src/igniter.router.ts` |
| `--output <path>` | Schema output path | `src/igniter.schema.ts` |
| `--docs-output <dir>` | OpenAPI output directory | `./src/docs` |
| `--cmd <command>` | Dev server command | inferred (`npm run dev`, `pnpm dev`, etc.) |

---

## 📚 Example Library

> This section includes **50** verified examples. Each example maps directly to the CLI implementation.

### Example 01 — Show CLI help

```bash
igniter --help
```

### Example 02 — Check version

```bash
igniter --version
```

### Example 03 — Run CLI without installing

```bash
npx @igniter-js/cli@latest --help
```

### Example 04 — Global install (npm)

```bash
npm install -g @igniter-js/cli
```

### Example 05 — Init with prompts

```bash
igniter init my-app
```

### Example 06 — Init with Next.js starter

```bash
igniter init my-app --template nextjs
```

### Example 07 — Init in current directory

```bash
igniter init . --mode install
```

### Example 08 — Force package manager

```bash
igniter init my-app --package-manager pnpm
```

### Example 09 — Use add-ons + PostgreSQL

```bash
igniter init my-app --add-ons database,auth --database postgresql
```

### Example 10 — Inline add-on options (database + auth)

```bash
igniter init my-app \
  --template nextjs \
  --add-ons "database:prisma:postgresql,auth:better-auth:email+two-factor" \
  --no-install
```

### Example 11 — Init without Git and Docker

```bash
igniter init my-app --no-git --no-docker
```

### Example 12 — Generate an empty feature

```bash
igniter generate feature users
```

### Example 13 — Generate a Prisma-backed feature

```bash
igniter generate feature users --schema prisma:User
```

### Example 14 — Custom Prisma schema path

```bash
igniter generate feature billing --schema prisma:Invoice --schema-path ./prisma/schema.prisma
```

### Example 15 — Generate a controller inside a feature

```bash
igniter generate controller profile --feature users
```

### Example 16 — Generate a procedure inside a feature

```bash
igniter generate procedure billing --feature invoices
```

### Example 17 — Generate OpenAPI docs

```bash
igniter generate docs --router src/igniter.router.ts --output src/docs
```

### Example 18 — Generate client schema

```bash
igniter generate schema --router src/igniter.router.ts --output src/igniter.schema.ts
```

### Example 19 — Generate caller from URL

```bash
igniter generate caller --name billing --url https://api.example.com/openapi.json
```

### Example 20 — Generate caller from local file

```bash
igniter generate caller --name billing --path ./openapi.yaml --output src/callers/billing
```

### Example 21 — Run dev mode (defaults)

```bash
igniter dev
```

### Example 22 — Dev mode with custom paths

```bash
igniter dev \
  --router src/igniter.router.ts \
  --output src/igniter.schema.ts \
  --docs-output src/docs
```

### Example 23 — Dev mode with explicit command

```bash
igniter dev --cmd "pnpm dev"
```

### Example 24 — Store add-on

```bash
igniter init cache-app --add-ons store
```

### Example 25 — Jobs add-on

```bash
igniter init jobs-app --add-ons jobs
```

### Example 26 — MCP add-on

```bash
igniter init ai-app --add-ons mcp
```

### Example 27 — Logging add-on

```bash
igniter init logs-app --add-ons logging
```

### Example 28 — Telemetry add-on

```bash
igniter init telemetry-app --add-ons telemetry
```

### Example 29 — Bots add-on

```bash
igniter init bot-app --add-ons bots
```

### Example 30 — Database add-on (Drizzle + SQLite)

```bash
igniter init db-app --add-ons "database:drizzle:sqlite"
```

### Example 31 — Auth add-on (Better Auth + plugins)

```bash
igniter init auth-app --add-ons "auth:better-auth:email+magic-link+passkey"
```

### Example 32 — Shadcn/UI add-on

```bash
igniter init ui-app --add-ons shadcn-ui
```

### Example 33 — Template helper: includes

```handlebars
{{#if (includes enabledAddOns "store")}}
import { store } from "@/services/store";
{{/if}}
```

### Example 34 — Template helper: generatePluginImports

```handlebars
{{{generatePluginImports addOnOptions.auth.plugins}}}
```

### Example 35 — Generated caller usage

```typescript
import { billingCallerSchemas } from "./src/callers/api.example.com/schema";

export type InvoicesResponse = ReturnType<
  typeof billingCallerSchemas.$Infer.Response<"/invoices", "GET", 200>
>;
```

### Example 36 — Generate docs with a custom output folder

```bash
igniter generate docs --router src/igniter.router.ts --output ./docs
```

### Example 37 — Generate schema to a custom path

```bash
igniter generate schema --router src/igniter.router.ts --output ./src/generated/igniter.schema.ts
```

### Example 38 — Generate controller with prompt selection

```bash
igniter generate controller
```

### Example 39 — Generate procedure with prompt selection

```bash
igniter generate procedure
```

### Example 40 — Generate feature with prompts only

```bash
igniter generate feature
```

### Example 41 — Init with Bun starter and database

```bash
igniter init bun-api --template bun-rest-api --add-ons database --database sqlite
```

### Example 42 — Init with Deno starter + logging

```bash
igniter init deno-api --template deno-rest-api --add-ons logging
```

### Example 43 — Init with Express starter + jobs

```bash
igniter init express-api --template express-rest-api --add-ons jobs
```

### Example 44 — Init with TanStack Start + telemetry

```bash
igniter init tanstack-app --template tanstack-start --add-ons telemetry
```

### Example 45 — Init with Next.js + bots + mcp

```bash
igniter init ai-suite --template nextjs --add-ons bots,mcp
```

### Example 46 — Auth only with minimal plugins

```bash
igniter init auth-only --add-ons "auth:better-auth:email"
```

### Example 47 — Database + store combo

```bash
igniter init data-cache --add-ons database,store --database postgresql
```

### Example 48 — Jobs + store combo

```bash
igniter init background-workers --add-ons jobs,store
```

### Example 49 — Dev mode with custom command

```bash
igniter dev --cmd "npm run dev"
```

### Example 50 — Generate caller with explicit output directory

```bash
igniter generate caller \
  --name billing \
  --url https://api.example.com/openapi.json \
  --output src/callers/billing
```

---

## 🍱 Add-on Recipes

### Recipe 01 — Observability starter

```bash
igniter init observability-app \
  --template nextjs \
  --add-ons logging,telemetry
```

### Recipe 02 — Redis-first API

```bash
igniter init redis-api \
  --template express-rest-api \
  --add-ons store
```

### Recipe 03 — Jobs + database

```bash
igniter init jobs-db \
  --template nextjs \
  --add-ons "database:prisma:postgresql,jobs"
```

### Recipe 04 — Auth + database

```bash
igniter init auth-db \
  --template nextjs \
  --add-ons "database:prisma:postgresql,auth:better-auth:email+passkey"
```

### Recipe 05 — MCP AI server

```bash
igniter init mcp-server \
  --template tanstack-start \
  --add-ons mcp
```

### Recipe 06 — Bot webhook service

```bash
igniter init bot-service \
  --template nextjs \
  --add-ons bots
```

### Recipe 07 — SQLite + Drizzle starter

```bash
igniter init sqlite-app \
  --template bun-rest-api \
  --add-ons "database:drizzle:sqlite"
```

### Recipe 08 — MySQL + Prisma starter

```bash
igniter init mysql-app \
  --template express-rest-api \
  --add-ons "database:prisma:mysql"
```

### Recipe 09 — UI-first stack

```bash
igniter init ui-stack \
  --template nextjs \
  --add-ons shadcn-ui
```

### Recipe 10 — Full-stack telemetry

```bash
igniter init full-observability \
  --template nextjs \
  --add-ons logging,telemetry,store
```

---

## 🌍 Real-World Scenarios

### Scenario 1 — SaaS Dashboard (Next.js + Auth + Database)

```bash
igniter init saas-app \
  --template nextjs \
  --add-ons "database:prisma:postgresql,auth:better-auth:email+passkey" \
  --no-docker
```

```bash
cd saas-app
igniter generate feature teams --schema prisma:Team
```

### Scenario 2 — Fintech API (Express + Jobs + Telemetry)

```bash
igniter init fintech-api \
  --template express-rest-api \
  --add-ons jobs,telemetry \
  --database postgresql
```

```bash
igniter generate feature transactions --schema prisma:Transaction
```

### Scenario 3 — Ecommerce Catalog (Bun + Store)

```bash
igniter init shop-api --template bun-rest-api --add-ons store
```

```bash
igniter generate feature products --schema prisma:Product
```

### Scenario 4 — AI Assistant Platform (MCP + Bots)

```bash
igniter init assistant-platform --template nextjs --add-ons mcp,bots
```

```bash
igniter dev --cmd "pnpm dev"
```

### Scenario 5 — Content API (Deno + Docs/Schema)

```bash
igniter init content-api --template deno-rest-api
```

```bash
igniter generate docs --router src/igniter.router.ts --output src/docs
```

### Scenario 6 — Multi-tenant Admin (TanStack Start + Database + Logging)

```bash
igniter init admin-console \
  --template tanstack-start \
  --add-ons database,logging \
  --database mysql
```

```bash
igniter generate feature tenants --schema prisma:Tenant
```

---

## 📚 API Reference

### CLI Entry Point

```bash
igniter [command] [subcommand] [options]
```

### Commands Overview

| Command | Purpose |
|---------|---------|
| `init` | Create a project or install Igniter.js |
| `generate` | Scaffold features, controllers, procedures, schemas, docs, callers |
| `dev` | Watch mode + regenerate OpenAPI + schema |

---

### `igniter init` — Detailed Reference

**Usage**

```bash
igniter init [project-name] [options]
```

**Options**

- `[project-name]` — Directory name (default: current folder)
- `--mode <install|new-project>` — `install` writes into existing folder, `new-project` downloads starter
- `--pm, --package-manager <npm|yarn|pnpm|bun>` — Force package manager
- `--template <starter-id>` — Starter ID from registry
- `--add-ons <list>` — Comma-separated add-ons
- `--database <provider>` — `postgresql`, `mysql`, `sqlite`, `none`
- `--no-git` — Skip Git init + commit
- `--no-install` — Skip dependency install
- `--no-docker` — Skip Docker setup

**Inline add-on syntax**

```
<add-on-id>[:option1][:option2+option3]
```

Order is defined by the add-on option list. Examples:

- `database:prisma:postgresql`
- `auth:better-auth:email+two-factor`

**Exit Codes**

- `0` success
- `1` error

---

### `igniter generate feature`

**Usage**

```bash
igniter generate feature [name] [--schema <provider:model>] [--schema-path <path>]
```

**Options**

- `--schema <value>` — `prisma:ModelName`
- `--schema-path <path>` — Override provider schema path

**Output**

- `src/features/<feature>/controllers/<feature>.controller.ts`
- `src/features/<feature>/procedures/<feature>.procedure.ts` (schema provider)
- `src/features/<feature>/<feature>.interfaces.ts`
- `src/features/<feature>/procedures/.gitkeep` (empty feature)

---

### `igniter generate controller`

**Usage**

```bash
igniter generate controller [name] --feature <feature>
```

**Options**

- `--feature <feature>` — Target feature slug

**Output**

- `src/features/<feature>/controllers/<name>.controller.ts`

---

### `igniter generate procedure`

**Usage**

```bash
igniter generate procedure [name] --feature <feature>
```

**Options**

- `--feature <feature>` — Target feature slug

**Output**

- `src/features/<feature>/procedures/<name>.procedure.ts`

---

### `igniter generate docs`

**Usage**

```bash
igniter generate docs --router <path> --output <dir>
```

**Output**

- `<output>/openapi.json`

**Notes**

- Requires `router.config.docs` in your router

---

### `igniter generate schema`

**Usage**

```bash
igniter generate schema --router <path> --output <path>
```

**Output**

- TypeScript schema file (rendered from `templates/scaffold/igniter.schema.hbs`)

---

### `igniter generate caller`

**Usage**

```bash
igniter generate caller --name <name> --url <openapi-url>
igniter generate caller --name <name> --path <openapi-file>
```

**Options**

- `--name <name>` — Caller name used for exports
- `--url <url>` — OpenAPI URL (3.x)
- `--path <path>` — Local OpenAPI file (JSON/YAML)
- `--output <path>` — Output directory (default: `src/callers/<hostname>`)

**Output**

- `schema.ts` — Generated `IgniterCallerSchema` + types
- `index.ts` — Preconfigured `IgniterCaller`

---

### `igniter dev`

**Usage**

```bash
igniter dev [--router <path>] [--output <path>] [--docs-output <dir>] [--cmd <command>]
```

**Behavior**

- Generates docs + schema once, then watches:
  - `src/igniter.router.ts`
  - `src/features/**/*` (if the folder exists)
- Debounce: 300ms
- UI: Ink-based log dashboard with two tabs

**Exit Codes**

- `0` success or manual exit
- `1` on fatal error

---

## 📟 Verbose Command Reference

### `igniter init` (all options)

- `igniter init` → prompt-driven flow
- `igniter init <project-name>` → uses provided directory name
- `--mode install` → install into existing folder
- `--mode new-project` → scaffold new starter
- `--package-manager npm` → force npm
- `--package-manager pnpm` → force pnpm
- `--package-manager yarn` → force yarn
- `--package-manager bun` → force bun
- `--template nextjs` → Next.js starter
- `--template tanstack-start` → TanStack Start starter
- `--template express-rest-api` → Express starter
- `--template bun-rest-api` → Bun REST starter
- `--template bun-react-app` → Bun + React starter
- `--template deno-rest-api` → Deno starter
- `--add-ons store` → Redis store add-on
- `--add-ons jobs` → Jobs add-on
- `--add-ons mcp` → MCP server add-on
- `--add-ons logging` → Logging add-on
- `--add-ons telemetry` → Telemetry add-on
- `--add-ons bots` → Bots add-on
- `--add-ons database` → Database add-on
- `--add-ons auth` → Auth add-on
- `--add-ons shadcn-ui` → Shadcn/UI add-on
- `--database postgresql` → PostgreSQL provider
- `--database mysql` → MySQL provider
- `--database sqlite` → SQLite provider
- `--database none` → Skip provider preselect
- `--no-git` → skip git init
- `--no-install` → skip dependency install
- `--no-docker` → skip docker setup

### `igniter generate` (all subcommands)

- `igniter generate feature [name]`
- `igniter generate feature [name] --schema prisma:Model`
- `igniter generate feature [name] --schema-path <path>`
- `igniter generate controller [name] --feature <feature>`
- `igniter generate procedure [name] --feature <feature>`
- `igniter generate docs --router <path> --output <dir>`
- `igniter generate schema --router <path> --output <path>`
- `igniter generate caller --name <name> --url <url>`
- `igniter generate caller --name <name> --path <path>`
- `igniter generate caller --name <name> --output <dir>`

### `igniter dev` (all options)

- `igniter dev` → run with defaults
- `igniter dev --router <path>` → custom router path
- `igniter dev --output <path>` → custom schema output
- `igniter dev --docs-output <dir>` → custom OpenAPI output directory
- `igniter dev --cmd <command>` → custom dev server command

---

## 🧾 Add-on Options Reference

### `auth` options

| Key | Type | Allowed Values | Notes |
|-----|------|----------------|-------|
| `provider` | single | `better-auth` | Required |
| `plugins` | multi | `email`, `two-factor`, `username`, `anonymous`, `phone-number`, `magic-link`, `email-otp`, `passkey`, `generic-oauth`, `one-tap`, `api-key`, `admin`, `organization`, `oidc`, `sso`, `bearer`, `multi-session`, `oauth-proxy`, `open-api`, `jwt`, `next-cookies` | Required |

**Inline syntax examples**

```bash
igniter init app --add-ons "auth:better-auth:email+magic-link"
igniter init app --add-ons "auth:better-auth:passkey+two-factor+jwt"
```

---

### `database` options

| Key | Type | Allowed Values | Notes |
|-----|------|----------------|-------|
| `orm` | single | `prisma`, `drizzle` | Required |
| `provider` | single | `postgresql`, `mysql`, `sqlite` | Required |

**Inline syntax examples**

```bash
igniter init app --add-ons "database:prisma:postgresql"
igniter init app --add-ons "database:prisma:mysql"
igniter init app --add-ons "database:drizzle:sqlite"
```

---

## 🧮 Inline Add-on Grammar

The CLI parses `--add-ons` using a strict positional grammar.

```
<add-ons>   ::= <add-on> ("," <add-on>)*
<add-on>    ::= <id> | <id> ":" <opt> (":" <opt>)*
<opt>       ::= <value> | <value> ("+" <value>)+
<id>        ::= store | jobs | mcp | logging | telemetry | bots | database | auth | shadcn-ui
```

Examples:

```
database:prisma:postgresql
auth:better-auth:email+magic-link
database:drizzle:sqlite,logging
```

---

## 🧩 Add-on Asset Matrix

| Add-on | Templates | Dependencies | Docker Services | Post-install |
|--------|-----------|--------------|----------------|--------------|
| `store` | redis.ts, store.ts | adapter-redis, ioredis | redis | none |
| `jobs` | jobs.ts, redis.ts, store.ts | adapter-redis, adapter-bullmq, bullmq, ioredis | redis | none |
| `mcp` | igniter.mcp.ts + routes | adapter-mcp-server, ioredis | redis | none |
| `logging` | logger.ts | @igniter-js/core | none | none |
| `telemetry` | telemetry.ts | @igniter-js/core | none | none |
| `bots` | sample-bot.ts + routes | @igniter-js/bot | none | none |
| `database` | lib.ts (+ prisma config/schema) | prisma + @prisma/client + dotenv (prisma only) | postgres/mysql | prisma generate / drizzle init |
| `auth` | auth.ts | better-auth | none | better-auth generate |
| `shadcn-ui` | none | none | none | shadcn init |

---

## 🧬 Generated Output Examples

### Example: Feature structure (empty)

```
src/
  features/
    users/
      controllers/
        users.controller.ts
      procedures/
        .gitkeep
      users.interfaces.ts
```

### Example: Feature structure (schema provider)

```
src/
  features/
    users/
      controllers/
        users.controller.ts
      procedures/
        users.procedure.ts
      users.interfaces.ts
```

### Example: Caller output structure

```
src/
  callers/
    api.example.com/
      schema.ts
      index.ts
```

### Example: Generated caller index.ts (simplified)

```typescript
import { IgniterCaller } from "@igniter-js/caller";
import { billingCallerSchemas } from "./schema";

export const billingCaller = IgniterCaller.create()
  .withSchemas(billingCallerSchemas, { mode: "strict" })
  .build();
```

### Example: Generated schema file header (simplified)

```typescript
/**
 * @generated by @igniter-js/cli
 * Do not edit manually. Regenerate via `igniter generate schema`.
 */
```

---

## 🧰 Command Cheat Sheet

```bash
# Initialize a project
igniter init my-app

# Initialize with add-ons
igniter init my-app --add-ons store,logging

# Generate a feature
igniter generate feature users

# Generate a feature from Prisma
igniter generate feature users --schema prisma:User

# Generate controller and procedure
igniter generate controller profile --feature users
igniter generate procedure billing --feature invoices

# Generate OpenAPI docs
igniter generate docs --router src/igniter.router.ts --output src/docs

# Generate client schema
igniter generate schema --router src/igniter.router.ts --output src/igniter.schema.ts

# Generate caller from OpenAPI
igniter generate caller --name billing --url https://api.example.com/openapi.json

# Dev watch mode
igniter dev --cmd "pnpm dev"
```

---

## 🧭 Dev Mode UI Reference

- Tab 1 → Igniter logs
- Tab 2 → Application logs
- `1` → Switch to Igniter
- `2` → Switch to Application
- `←` or `→` → Switch tabs
- `Ctrl+C` → Exit
- `ESC` → Exit

---

## 🔧 Configuration

### Base Environment Variables

Every starter adds these env vars by default:

- `IGNITER_APP_NAME`
- `IGNITER_APP_SECRET`
- `IGNITER_API_BASE_PATH`

### Next.js extra env vars

- `IGNITER_API_URL`
- `NEXT_PUBLIC_IGNITER_API_URL`
- `NEXT_PUBLIC_IGNITER_API_BASE_PATH`

### TanStack Start extra env vars

- `IGNITER_API_URL`
- `REACT_APP_IGNITER_API_URL`
- `REACT_APP_IGNITER_API_BASE_PATH`

### Add-on Environment Variables

#### Store

- `REDIS_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`

#### Jobs

- `REDIS_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `IGNITER_JOBS_QUEUE_PREFIX`

#### MCP

- `IGNITER_MCP_SERVER_BASE_PATH`
- `IGNITER_MCP_SERVER_TIMEOUT`
- `REDIS_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`

#### Logging

- `IGNITER_LOG_LEVEL`

#### Telemetry

- `IGNITER_TELEMETRY_ENABLE_TRACING`
- `IGNITER_TELEMETRY_ENABLE_METRICS`
- `IGNITER_TELEMETRY_ENABLE_EVENTS`
- `IGNITER_TELEMETRY_ENABLE_CLI_INTEGRATION`

#### Bots

- `TELEGRAM_TOKEN`
- `TELEGRAM_WEBHOOK_URL`
- `TELEGRAM_WEBHOOK_SECRET`

#### Database

**PostgreSQL (database:prisma|drizzle:postgresql)**

- `DATABASE_URL`
- `DATABASE_PASSWORD`
- `DATABASE_USER`

**MySQL (database:prisma|drizzle:mysql)**

- `DATABASE_URL`
- `DATABASE_PASSWORD`
- `DATABASE_USER`
- `DATABASE_NAME`

**SQLite (database:prisma|drizzle:sqlite)**

- `DATABASE_URL`

---

## 🧩 Framework Integration

The CLI wires framework-specific files using starter templates. Use the same command shape across frameworks and switch the `--template` value.

### Next.js (App Router)

```bash
igniter init my-next-app --template nextjs --add-ons database,auth
```

### TanStack Start

```bash
igniter init my-tanstack-app --template tanstack-start --add-ons logging,telemetry
```

### Express REST API

```bash
igniter init my-express-api --template express-rest-api --add-ons jobs
```

### Bun REST API

```bash
igniter init my-bun-api --template bun-rest-api --add-ons store
```

### Deno REST API

```bash
igniter init my-deno-api --template deno-rest-api
```

Use `--mode install` to apply Igniter.js to an existing project folder.

---

## 🧪 Testing

### CLI Development

```bash
# From packages/cli
npm install
npm run dev
npm run typecheck
npm run build
```

### Local CLI testing

```bash
npm link
igniter --help
```

### Validation checklist

- [ ] `igniter init` scaffolds a starter without errors
- [ ] `igniter generate feature` creates files in correct locations
- [ ] `igniter generate docs` writes `openapi.json`
- [ ] `igniter generate schema` writes `igniter.schema.ts`
- [ ] `igniter dev` starts UI and watcher

---

## ✅ Best Practices

- ✅ Use `--add-ons` to keep code + env + docker in sync
- ✅ Use `--schema prisma:Model` to generate CRUD-ready features
- ✅ Run `igniter dev` in active development to keep docs fresh
- ✅ Commit generated changes after init (or use `--no-git`)
- ✅ Use inline add-on notation for repeatable scaffolding

### Best Practices by Stage

#### Initialization

- ✅ Run `igniter init` in a clean directory
- ✅ Use explicit starter IDs in CI
- ✅ Pin add-ons via inline syntax for reproducible builds
- ✅ Keep `.env` managed by the CLI on first run

#### Feature generation

- ✅ Prefer `--schema prisma:Model` when Prisma is available
- ✅ Keep feature names kebab-case for clean URLs
- ✅ Register controllers in your router after generation

#### Dev mode

- ✅ Use `--cmd` to ensure the correct package manager is invoked
- ✅ Keep the router file stable (avoid renaming it constantly)
- ✅ Watch the dashboard for generation errors

#### Add-ons

- ✅ Combine `database` + `auth` for auth providers that require storage
- ✅ Use `jobs` when long-running tasks should be backgrounded
- ✅ Use `telemetry` + `logging` together for observability

### Example: Stable init in CI

```bash
igniter init app \
  --template nextjs \
  --add-ons "database:prisma:postgresql,auth:better-auth:email+passkey" \
  --no-install \
  --no-docker \
  --no-git
```

---

## ❌ Anti-Patterns

- ❌ Manually editing generated files without keeping templates aligned
- ❌ Running `igniter generate docs` without `router.config.docs`
- ❌ Mixing schema providers without adding them to the registry
- ❌ Using `--schema` with a missing Prisma schema file
- ❌ Editing `.env` before running add-ons (let the CLI manage first)

### Anti-Pattern Examples

#### ❌ Inline options in the wrong order

```bash
# Wrong: provider before orm (database uses orm then provider)
igniter init app --add-ons "database:postgresql:prisma"
```

#### ✅ Correct order

```bash
igniter init app --add-ons "database:prisma:postgresql"
```

#### ❌ Missing router docs

```bash
# Will fail if router.config.docs is missing
igniter generate docs --router src/igniter.router.ts --output src/docs
```

---

## 🩺 Troubleshooting

### Router not found

- Verify the file exists at `src/igniter.router.ts`
- Use `--router` to pass a custom path

### Docs generation fails

- Ensure your router has `config.docs`
- Validate docs configuration format

### Prisma schema not found

- Confirm `prisma/schema.prisma` exists
- Use `--schema-path` to override

### Add-on assets missing

- Check `--add-ons` spelling (e.g., `shadcn-ui` not `shadcn`)
- Confirm add-on exists in registry

### Docker ports not freed

- Stop containers manually
- Re-run `docker-compose up -d` in the project

### Auth setup fails

- Ensure `better-auth` installed
- Re-run `igniter init` or re-run the add-on setup

### Shadcn fails to install

- Confirm `shadcn` CLI is available via package manager
- Ensure the starter supports Tailwind

### Inline add-on options ignored

- Ensure the add-on exists in the registry
- Check the option order (see inline grammar)

### Prisma feature generation fails

- Confirm model name in schema matches exactly
- Run `prisma format` to normalize the schema
- Use `--schema-path` for custom locations

### Dev mode not watching features

- Ensure `src/features` exists
- Confirm the filesystem watcher is running

### OpenAPI output is empty

- Add route-level docs metadata in your controller actions
- Verify router docs config passed to OpenAPI generator

### Caller generation fails with non-3.x spec

- The CLI only supports OpenAPI 3.x
- Upgrade or convert your spec if needed

### Docker services not added

- Ensure `--no-docker` is not set
- Confirm add-on defines Docker services (store/jobs/mcp/database)

### Add-on dependencies not installed

- Ensure `--no-install` is not set
- Run your package manager install manually

### Ink UI not rendering correctly

- Use a fully interactive terminal (avoid dumb terminals)
- Verify React/Ink dependencies are installed

### Commands exit immediately

- Check output for a validation error
- Run with a clean working directory

### Project directory not empty

- Use `--mode install` to avoid overwriting
- Or move to a new directory before running init

### Git initialization failed

- Ensure Git is installed and available in PATH
- Re-run `git init` manually if needed

### Post-install steps skipped

- If you pass `--no-install`, post-install hooks are skipped
- Run the add-on CLI manually if you need it

### Starter download fails

- Confirm you have network access to GitHub
- Ensure `git` is installed

### Template rendering fails

- Validate template path in registry
- Check Handlebars syntax

### Missing add-on files

- Confirm the add-on defines templates
- Re-run `igniter init` with the add-on explicitly

### Duplicate env vars

- The CLI avoids duplicates by default
- Remove conflicts manually if needed

### Docker compose file missing

- Some starters may not ship a docker-compose.yml
- Add-ons will create one when needed

### CLI crashes during init

- Re-run with a clean directory
- Remove partial files and retry

### Caller generation produces empty types

- Ensure your OpenAPI spec includes `paths`
- Ensure response schemas are present

### `igniter dev` does not start app

- Provide `--cmd` if the default is not `npm run dev`
- Ensure your package manager scripts include `dev`

### Schema output is stale

- Verify watcher is running (look at Ink UI logs)
- Save the router file to trigger regeneration

### OpenAPI file not created

- Ensure output directory exists or is writable
- Check router docs config

### Prisma model not found

- Verify model name case
- Use `prisma format` to normalize

### Add-on inline options ignored

- Ensure options are in correct order
- Avoid unknown values

### Shadcn CLI not found

- Verify `shadcn` is available in PATH
- Re-run with the correct package manager

### Drizzle init does not run

- Ensure `database` add-on uses `drizzle`
- Run `drizzle init` manually if needed

---

## 🧯 Error Messages Catalog

These messages are emitted by the CLI. Use them to diagnose issues quickly.

### "Project initialization failed"

- **Context:** `igniter init` throws or rejects
- **Cause:** Failure in prompts, generator, or file system
- **Fix:** Re-run in a clean directory or inspect the prior output

### "Starter not found"

- **Context:** Starter registry lookup failed
- **Cause:** Invalid `--template` ID
- **Fix:** Use one of the registered starter IDs

### "Router not found at: <path>"

- **Context:** `igniter generate docs`
- **Cause:** Router path invalid
- **Fix:** Pass correct `--router` path

### "Router does not have docs configuration"

- **Context:** OpenAPI generation
- **Cause:** `router.config.docs` missing
- **Fix:** Add docs config to your router

### "Failed to generate schema: <message>"

- **Context:** `igniter generate schema`
- **Cause:** Router load failure
- **Fix:** Ensure router compiles and exports `AppRouter`

### "No registered schema provider can handle '<value>'"

- **Context:** `igniter generate feature --schema ...`
- **Cause:** Schema provider not registered
- **Fix:** Use `prisma:` or register a provider

### "Model '<name>' not found for provider 'Prisma'"

- **Context:** Prisma feature generation
- **Cause:** Model not in schema
- **Fix:** Update Prisma schema and re-run

### "Use either --url or --path, not both."

- **Context:** Caller generation
- **Cause:** Both inputs provided
- **Fix:** Choose one input source

### "Only OpenAPI 3.x documents are supported."

- **Context:** Caller generation
- **Cause:** OpenAPI 2.x spec
- **Fix:** Upgrade the spec to 3.x

### "Could not parse OpenAPI document (JSON/YAML)."

- **Context:** Caller generation
- **Cause:** Invalid JSON/YAML
- **Fix:** Validate the spec file

### "Module was compiled and loaded, but no valid Igniter router export was found."

- **Context:** Router introspection
- **Cause:** Router does not export `AppRouter` or default export
- **Fix:** Export `AppRouter` from your router module

---

## ❓ FAQ

### Does the CLI modify my existing files?

Only when you run `igniter init` in `install` mode or `igniter generate` commands. It always writes the generated files explicitly.

### Can I use multiple add-ons?

Yes. Add-ons are designed to be combined.

### Can I build my own add-on?

Yes. See the [Templates & Helpers](#-templates--helpers) and registry examples below.

### Does `igniter dev` run my app automatically?

Yes. It uses the detected package manager and runs `<pm> dev` unless you provide `--cmd`.

### Where does `igniter generate docs` write the file?

It writes `openapi.json` inside the `--output` directory (default: `./src/docs`).

### What OpenAPI versions are supported for caller generation?

Only OpenAPI 3.x is supported.

### Can I use the CLI in CI without prompts?

Yes. Provide all required flags (starter, add-ons, package manager) explicitly.

---

## 🧩 Registry Extension Examples

### Custom Add-on (BaseAddOn)

```typescript
import { BaseAddOn } from "@/core/registry/add-ons/base-addon";

export class CacheAddOn extends BaseAddOn {
  name = "Cache";
  description = "Adds cache utilities";
  value = "cache";
  hint = "Useful for caching";

  templates = [
    {
      template: "templates/add-ons/cache/cache.ts.hbs",
      outputPath: "src/services/cache.ts",
    },
  ];
}
```

### Registering a Custom Add-on

```typescript
import { AddOnRegistry } from "@/core/registry/add-ons/add-on-registry";
import { CacheAddOn } from "./cache";

export const addOnRegistry = AddOnRegistry.create()
  .register(new CacheAddOn())
  .build();
```

### Custom Starter (BaseStarter)

```typescript
import { BaseStarter } from "@/core/registry/starters/base-starter";

export class CustomStarter extends BaseStarter {
  id = "custom";
  name = "Custom";
  description = "My custom starter";
  hint = "Fullstack";
  repository = "starter-custom";
}
```

### Custom Schema Provider

```typescript
import { SchemaProvider } from "@/core/registry/schema-provider/base-schema-provider";

export class MySchemaProvider extends SchemaProvider {
  id = "my-schema";
  name = "My Schema";
  defaultSchemaPath = "./schema.json";

  async validateSchemaPath(schemaPath: string) {
    // validate file
  }

  async listModels(schemaPath: string) {
    return ["User", "Project"];
  }

  async generateFeature(selection, context) {
    // generate files
  }
}
```

---

## 🤝 Contributing

See the repository [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.

---

## 📄 License

MIT © Felipe Barcelos and the Igniter.js contributors# @igniter-js/cli

The official Igniter.js command-line interface for scaffolding projects, generating features, wiring add-ons, and keeping your API docs in sync. It is designed for a fast developer experience, type-safe defaults, and seamless automation.

## Highlights

- **Project bootstrapper** with interactive wizards, starter templates, and add-on setup (store, jobs, auth, bots, telemetry, MCP, database, Shadcn/UI).
- **Code generators** for features, controllers, procedures, schemas, and OpenAPI specs, all backed by Handlebars templates.
- **Schema-aware workflow** with pluggable providers (Prisma out of the box) that produce strongly typed controllers, procedures, and interfaces.
- **Development dashboard** powered by Ink that automatically regenerates schema/docs and streams app logs in a split view.
- **Template engine + registries** to extend starters, add-ons, and schema providers without touching the core.

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
npx @igniter-js/cli@latest --help

# Install globally with your favourite package manager
npm install -g @igniter-js/cli
# or
pnpm add -g @igniter-js/cli
# or
yarn global add @igniter-js/cli
# or
bun add -g @igniter-js/cli

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
### Advanced Init (Inline Options)

You can pre-configure add-on options directly in the `--add-ons` flag using the `addon:opt1:opt2` notation to skip interactive prompts.

```bash
# auth:provider:plugins+list
# database:orm:provider
igniter init my-app \
  --template nextjs \
  --add-ons "database:prisma:postgresql,auth:better-auth:email+two-factor,store" \
  --no-install
```
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

Generate an `IgniterCallerSchema` builder plus a ready-to-use Igniter Caller from an OpenAPI 3 spec.

```
# Remote spec
igniter generate caller --name facebook --url https://api.example.com/openapi.json

# Local spec
igniter generate caller --name billing --path ./openapi.yaml --output src/callers/billing
```

Outputs `schema.ts` (path-first schema builder with registry, `$Infer` helpers, and derived types) and
`index.ts` (preconfigured caller) under `src/callers/<hostname>` by default, ready to use with
`@igniter-js/caller`.

Example usage:

```
import { facebookCallerSchemas } from "./src/callers/api.example.com/schema"

type ProductsResponse = ReturnType<
  typeof facebookCallerSchemas.$Infer.Response<"/products", "GET", 200>
>
```

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
- **Log retention**: Stores the last 1,000 entries per stream (UI renders the most recent 50 lines).
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
- **Docker conflicts**: `igniter init` attempts to stop running containers and free ports from `docker-compose.yml`, but you may still need to stop containers or free ports manually.
- **Better Auth / Prisma CLI errors**: These post-install hooks require the dependencies to be installed. Re-run `npm install` and `igniter init` (or rerun the add-on setup) if they fail.
- **Ink UI not rendering**: Ensure you are running inside a Node-supported terminal (macOS Terminal, iTerm, Windows Terminal, etc.).

---

## License

MIT © Felipe Barcelos and the Igniter.js contributors.









