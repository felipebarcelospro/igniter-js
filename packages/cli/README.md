# @igniter-js/cli

<div align="center">

[![npm version](https://img.shields.io/npm/v/@igniter-js/cli)](https://www.npmjs.com/package/@igniter-js/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-18.17+-green)](https://nodejs.org)

**The official Igniter.js CLI — project scaffolding, feature generation, and schema/docs sync.**

Create projects. Scaffold features. Wire add-ons. Keep OpenAPI + client schema output in sync — all from one tool.

[Quick Start](#-quick-start) • [Core Concepts](#-core-concepts) • [Commands](#-commands) • [Real-World Examples](#-real-world-examples) • [API Reference](#-api-reference) • [Best Practices](#-best-practices) • [Troubleshooting](#-troubleshooting)

</div>

---

## ✨ Why @igniter-js/cli?

Igniter.js favors **speed + consistency** across teams. The CLI is your guardrail for that.

- ✅ **Fewer manual steps** — starters + add-ons configure code, dependencies, `.env`, and Docker
- ✅ **Type-safe scaffolding** — schema-aware generation outputs clean controllers + procedures from your Prisma models
- ✅ **Docs in sync** — OpenAPI + client schemas regenerate as you iterate
- ✅ **Multi-runtime** — create Next.js, TanStack Start, Express, Deno, or Bun starters
- ✅ **Extensible** — add-ons and schema providers are registry-based; build your own
- ✅ **Dev mode** — watch-mode dashboard with Ink UI, stream app logs side-by-side

---

## 🚀 Quick Start

### Installation

<Tabs groupId="package-manager">
  <Tab value="npm">
    ```bash
    npm install -g @igniter-js/cli
    ```
  </Tab>
  <Tab value="pnpm">
    ```bash
    pnpm add -g @igniter-js/cli
    ```
  </Tab>
  <Tab value="yarn">
    ```bash
    yarn global add @igniter-js/cli
    ```
  </Tab>
  <Tab value="bun">
    ```bash
    bun add -g @igniter-js/cli
    ```
  </Tab>
</Tabs>

### Run without installing

```bash
npx @igniter-js/cli@latest --help
pnpm dlx @igniter-js/cli@latest --help
bunx @igniter-js/cli@latest --help
```

### Your First Project (60 seconds)

```bash
# Create a Next.js project with database + auth
igniter init my-app \
  --template nextjs \
  --add-ons "database:prisma:postgresql,auth:better-auth:email+passkey"

cd my-app

# Generate a Prisma-backed feature
igniter generate feature users --schema prisma:User

# Keep schema + docs in sync while you code
igniter dev --cmd "pnpm dev"
```

✅ **Success!** Your project now includes a starter, configured add-ons, a scaffolded feature, and a watch-mode dev server.

---

## 🎯 Core Concepts

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    igniter CLI                           │
├───────────┬───────────────────────┬─────────────────────┤
│  init     │  generate             │  dev                │
│           │                       │                     │
│  • Starter│  • feature            │  • Schema watch     │
│  • Add-ons│  • controller         │  • OpenAPI watch    │
│  • Docker │  • procedure          │  • Dev server       │
│  • Git    │  • docs               │  • Ink dashboard    │
│           │  • schema             │                     │
│           │  • caller             │                     │
├───────────┴───────────────────────┴─────────────────────┤
│  Registry System                                        │
│  ┌────────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │ Starters   │  │ Add-ons  │  │ Schema Providers │    │
│  │ (6 built)  │  │ (9 built)│  │ (Prisma built-in)│    │
│  └────────────┘  └──────────┘  └──────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  Template Engine (Handlebars + 10 custom helpers)       │
│  Router Introspector (esbuild in-memory + Zod→JSON)     │
│  OpenAPI Generator (3.0 spec from router)               │
└─────────────────────────────────────────────────────────┘
```

### Key Abstractions

| Abstraction | Role | Key Methods |
|-------------|------|-------------|
| `TemplateEngine` | Abstract template rendering | `create()`, `resolvePath()`, `render()`, `renderToFile()` |
| `BaseStarter` | Project template definition | `install()`, defines templates + deps + env vars |
| `BaseAddOn` | Optional extension definition | `runSetup()`, `runPostInstall()`, defines assets + options |
| `SchemaProvider` | Schema-driven code generator | `generateFeature()`, `validateSchemaPath()`, `listModels()` |
| `RouterInstrospector` | Dynamic router loading | `loadRouter()`, `introspectRouter()` |
| `OpenAPIGenerator` | OpenAPI 3.0 spec builder | `create()`, `generate()` |
| `ProjectGenerator` | Init pipeline orchestrator | `generate()` → starter → add-ons → deps → git → docker |
| `FeatureWorkspace` | Feature directory utilities | `ensureStructure()`, `listFeatures()`, `featureDir()` |

### Command Hierarchy

```
igniter
├── init [project-name]
│   Options: --mode, --pm, --template, --add-ons, --no-git, --no-install, --no-docker
├── generate
│   ├── feature [name]
│   │   Options: --schema, --schema-path
│   ├── controller [name]
│   │   Options: --feature
│   ├── procedure [name]
│   │   Options: --feature
│   ├── docs
│   │   Options: --router, --output
│   ├── schema
│   │   Options: --router, --output
│   └── caller [name]
│       Options: --url, --path, --output
└── dev
    Options: --router, --output, --docs-output, --cmd
```

---

## 📘 Progressive Usage

### Level 1: Basic — Interactive Prompts

The simplest way to use the CLI is with no flags. Answer the prompts:

```bash
igniter init
```

You'll be asked for:
1. Project name
2. Starter (Next.js, Express, Deno, Bun, TanStack Start)
3. Add-ons (database, auth, jobs, store, telemetry, etc.)
4. Package manager
5. Git / Docker / dependency preferences

```bash
igniter generate feature
```

Prompts guide you through:
1. Schema provider selection (Prisma or none)
2. Feature name
3. Model selection (if Prisma)

### Level 2: Flags — Scriptable Automation

Skip prompts for CI/CD or team scripts:

```bash
# Non-interactive project creation
igniter init api-server \
  --template express-rest-api \
  --add-ons "database:prisma:postgresql,logging,telemetry" \
  --pm pnpm \
  --no-git \
  --no-docker

# Non-interactive feature generation
igniter generate feature users --schema prisma:User
igniter generate controller admin --feature users
igniter generate procedure billing --feature invoices
```

### Level 3: Inline Add-On Options — Precise Configuration

Control add-on behavior with the colon-separated inline syntax:

```bash
# Database: ORM + Provider
--add-ons "database:prisma:postgresql"
--add-ons "database:drizzle:sqlite"

# Auth: Provider + Plugins (separated by +)
--add-ons "auth:better-auth:email+two-factor+passkey+admin"

# Multiple add-ons with options
--add-ons "database:prisma:postgresql,auth:better-auth:email+magic-link"
```

### Level 4: Dev Mode — Watch + Regenerate

Keep schemas and docs in sync automatically while you code:

```bash
# Full dev mode with app server
igniter dev --cmd "pnpm dev"

# Custom paths
igniter dev \
  --router src/igniter.router.ts \
  --output src/generated/igniter.schema.ts \
  --docs-output ./public/docs
```

The Ink dashboard shows:
- **Tab 1 (Igniter):** Schema/docs regeneration events with durations, controller/action counts, error logs
- **Tab 2 (App):** Live dev server stdout/stderr stream

Switch tabs with `1`/`2` or arrow keys. Exit with `Ctrl+C`.

### Level 5: Caller Generation — Client SDK from OpenAPI

Generate type-safe API callers from any OpenAPI 3.x spec:

```bash
# From remote URL
igniter generate caller billing --url https://api.stripe.com/openapi.json

# From local file
igniter generate caller internal --path ./openapi.yaml --output src/callers/internal
```

Generates:
- `schema.ts` — `IgniterCallerSchema` builder + Zod schemas for all components
- `index.ts` — Preconfigured `IgniterCaller` with base URL and schemas

```typescript
// Use the generated caller
import { billingCaller } from "./src/callers/api.stripe.com";

const invoices = await billingCaller.get("/v1/invoices", {
  query: { limit: "10" }
});
// Full type inference on params, body, and response
```

---

## 💼 Real-World Examples

### Example 1: Full-Stack SaaS Starter

```bash
igniter init saas-app \
  --template nextjs \
  --add-ons "database:prisma:postgresql,auth:better-auth:email+passkey+admin,store,jobs,telemetry" \
  --pm pnpm

cd saas-app
igniter generate feature billing --schema prisma:Invoice
igniter generate feature teams --schema prisma:Team
igniter generate controller dashboard --feature analytics
igniter dev --cmd "pnpm dev"
```

**Result:** A Next.js app with PostgreSQL, Better Auth (email + passkey + admin), Redis store, BullMQ jobs, OpenTelemetry ready, and 3 scaffolded features. OpenAPI docs available at `http://localhost:3000/api/v1/docs`.

### Example 2: REST API Microservice

```bash
igniter init user-service \
  --template express-rest-api \
  --add-ons "database:prisma:postgresql,logging" \
  --pm pnpm \
  --no-docker

cd user-service
igniter generate feature users --schema prisma:User
igniter generate feature sessions --schema prisma:Session
igniter generate docs --router src/igniter.router.ts --output ./docs
```

**Result:** A standalone Express.js REST API with PostgreSQL, structured logging, OpenAPI docs, and type-safe client schema.

### Example 3: AI Bot Platform

```bash
igniter init bot-platform \
  --template tanstack-start \
  --add-ons "database:drizzle:sqlite,auth:better-auth:email,bots,mcp" \
  --pm bun

cd bot-platform
igniter generate feature conversations --schema prisma:Conversation
igniter dev --cmd "bun dev"
```

**Result:** TanStack Start app with SQLite, auth, multi-platform bot system (Telegram, WhatsApp, Discord), MCP server setup, and AI-ready architecture.

### Example 4: Deno Edge API

```bash
igniter init edge-api \
  --template deno-rest-api \
  --add-ons "database:drizzle:sqlite,telemetry" \
  --no-docker

cd edge-api
igniter generate feature products --schema prisma:Product
```

**Result:** Deno REST API with Drizzle ORM + SQLite, OpenTelemetry, and type-safe scaffolding. Deployable to Deno Deploy.

### Example 5: Bun Monolith with Jobs

```bash
igniter init bun-backend \
  --template bun-rest-api \
  --add-ons "database:prisma:postgresql,jobs,store,logging,telemetry" \

cd bun-backend
igniter generate feature orders --schema prisma:Order
igniter generate procedure process-payment --feature orders
igniter dev --cmd "bun dev"
```

**Result:** High-performance Bun API with PostgreSQL, Redis-backed jobs (BullMQ), Redis store, structured logging, and full telemetry. Schema and docs auto-regenerate in dev mode.

### Example 6: Adding Igniter to Existing Project

```bash
# Existing Next.js project
cd my-existing-app
igniter init . --mode install --add-ons "database:prisma:postgresql,shadcn-ui"

# Generate features into the existing app
igniter generate feature profiles --schema prisma:Profile
```

**Result:** Igniter.js installed into an existing codebase. CLI detects Next.js/TanStack Start automatically. Database and Shadcn/UI add-ons configured. Features scaffolded alongside existing code.

---

## 📋 Commands

### `igniter init`

Create a new Igniter.js project or install into an existing directory.

**Options**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `[project-name]` | `string` | `.` | Project directory name |
| `--mode` | `install \| new-project` | `new-project` | Use existing folder or scaffold new one |
| `--pm, --package-manager` | `npm \| yarn \| pnpm \| bun` | auto-detected | Package manager |
| `--template` | `string` | prompted | Starter ID (see [Starters](#starters)) |
| `--add-ons` | `string` | prompted | Comma-separated add-on IDs with inline options |
| `--no-git` | `boolean` | `false` | Skip Git initialization |
| `--no-install` | `boolean` | `false` | Skip dependency installation |
| `--no-docker` | `boolean` | `false` | Skip Docker Compose setup |

**Pipeline**

```
Argument parsing → Interactive prompts → Starter install → Add-on setup →
Dependency install → Docker setup → Git init → Post-install hooks
```

### `igniter generate feature`

Scaffold a new feature module (controllers, procedures, interfaces).

**Options**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `[name]` | `string` | prompted | Feature name (kebab-case) |
| `--schema` | `string` | — | Schema provider:model (e.g., `prisma:User`) |
| `--schema-path` | `string` | provider default | Path to schema file |

**Generated structure**

```
src/features/<name>/
├── controllers/
│   └── <name>.controller.ts
├── procedures/
│   └── <name>.procedure.ts      (schema-aware only)
├── <name>.interfaces.ts
└── presentation/
    ├── components/
    ├── hooks/
    ├── contexts/
    └── utils/
```

### `igniter generate controller`

Create a controller inside an existing or new feature.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `[name]` | `string` | prompted | Controller name (kebab-case) |
| `--feature` | `string` | prompted | Target feature |

### `igniter generate procedure`

Create a procedure inside an existing or new feature.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `[name]` | `string` | prompted | Procedure name (kebab-case) |
| `--feature` | `string` | prompted | Target feature |

### `igniter generate docs`

Generate OpenAPI 3.0 specification from router introspection.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--router` | `string` | `src/igniter.router.ts` | Router entry file |
| `--output` | `string` | `./src/docs` | Output directory for `openapi.json` |

### `igniter generate schema`

Generate TypeScript client schema from router introspection.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--router` | `string` | `src/igniter.router.ts` | Router entry file |
| `--output` | `string` | `src/igniter.schema.ts` | Output file path |

### `igniter generate caller`

Generate an `IgniterCaller` + Zod schema builder from an OpenAPI 3.x spec.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `[name]` | `string` | prompted | Caller name (PascalCase) |
| `--url` | `string` | prompted | Remote OpenAPI spec URL |
| `--path` | `string` | prompted | Local OpenAPI file path |
| `--output` | `string` | `src/callers/<host>` | Output directory |

### `igniter dev`

Watch-mode development server with schema/docs auto-regeneration.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--router` | `string` | `src/igniter.router.ts` | Router entry file to watch |
| `--output` | `string` | `src/igniter.schema.ts` | Client schema output path |
| `--docs-output` | `string` | `./src/docs` | OpenAPI output directory |
| `--cmd` | `string` | inferred (`<pm> run dev`) | Dev server command |

---

## 🧩 Add-Ons

Add-ons are optional project extensions that configure code, dependencies, environment variables, and Docker services.

### Available Add-Ons

| ID | Name | Options | Docker | Description |
|----|------|---------|--------|-------------|
| `database` | Database | orm:provider | PostgreSQL, MySQL | ORM + DB provider setup |
| `auth` | Authentication | provider:plugins | — | Better Auth configuration |
| `jobs` | Background Jobs | — | Redis | BullMQ job queue setup |
| `store` | Key-Value Store | — | Redis | Redis store integration |
| `logging` | Structured Logging | — | — | Logger utility setup |
| `telemetry` | Observability | — | — | OpenTelemetry hooks |
| `bots` | Bot Platform | — | — | Multi-platform bot setup |
| `mcp` | MCP Server | — | — | Model Context Protocol server |
| `shadcn-ui` | Shadcn/UI | — | — | UI component library init |

### Add-On Syntax

```
igniter init <project> --add-ons "<id>,<id>:<opt1>:<opt2>,<id>:<opt1>:<val1+val2>"
```

**Examples**

```bash
# Simple add-ons (no options)
igniter init app --add-ons "logging,telemetry,store,jobs"

# Database with ORM + Provider
igniter init app --add-ons "database:prisma:postgresql"
igniter init app --add-ons "database:drizzle:sqlite"

# Auth with provider + plugins (+ separates plugins)
igniter init app --add-ons "auth:better-auth:email+passkey+admin+organization"

# Multiple add-ons with options (comma-separated)
igniter init app --add-ons "database:prisma:postgresql,auth:better-auth:email+two-factor"
```

### Add-On Pipeline

For each selected add-on, during `igniter init`:

1. **Dependencies** → appended to `package.json`
2. **Docker services** → added to `docker-compose.yml`
3. **Environment variables** → appended to `.env`
4. **Templates** → rendered to output files
5. **Post-install** → CLI setup hooks (after `npm install`)

---

## 🧭 Starters

Starters are project templates that scaffold the base project structure.

### Available Starters

| ID | Name | Runtime | Type | Description |
|----|------|---------|------|-------------|
| `nextjs` | Next.js | Node.js | Full-stack | Next.js App Router + React |
| `tanstack-start` | TanStack Start | Node.js | Full-stack | Type-safe full-stack with SSR |
| `express-rest-api` | Express.js | Node.js | REST API | Classic Express.js REST API |
| `bun-rest-api` | Bun | Bun | REST API | High-performance Bun REST API |
| `bun-react-app` | Bun + React (Vite) | Bun | Full-stack | Bun + React + Vite |
| `deno-rest-api` | Deno | Deno | REST API | Modern Deno REST API |

### Starter Templates

Every starter generates these core files:

| Template | Output |
|----------|--------|
| `starters/igniter.router.hbs` | `src/igniter.router.ts` |
| `starters/igniter.client.hbs` | `src/igniter.client.ts` |
| `starters/igniter.context.hbs` | `src/igniter.context.ts` |
| `starters/igniter.hbs` | `src/igniter.ts` |
| `scaffold/example-feature/*.hbs` | `src/features/example/` (controller + procedure + interfaces) |
| `starters/open-api.hbs` | `src/docs/openapi.json` |

Framework-specific starters add their own templates (e.g., `route-handler.hbs`, `tsconfig.hbs`).

### Install vs New-Project Mode

```bash
# New project (downloads starter from GitHub)
igniter init my-new-app --template nextjs

# Install mode (scaffolds into current directory, detects framework)
cd my-existing-nextjs-app
igniter init . --mode install --add-ons "database:prisma:postgresql"
```

In install mode, the CLI auto-detects Next.js or TanStack Start and applies the matching starter.

---

## 🛠 Template System

The CLI uses **Handlebars.js** with 10 custom helpers for template rendering.

### Custom Helpers

| Helper | Usage | Example |
|--------|-------|---------|
| `includes` | Check array membership | `{{#if (includes addOns "store")}}...{{/if}}` |
| `isEmpty` | Check empty array | `{{#if (isEmpty deps)}}...{{/if}}` |
| `isDefined` | Check non-null/undefined | `{{#if (isDefined config)}}...{{/if}}` |
| `join` | Join array with separator | `{{join plugins ", "}}` |
| `capitalizeSlug` | "my-app" → "My App" | `{{capitalizeSlug projectName}}` |
| `get` | Safe nested property access | `{{get options "database.orm"}}` |
| `eq` | Strict equality | `{{#if (eq starter "nextjs")}}...{{/if}}` |
| `camelCase` | "two-factor" → "twoFactor" | `{{camelCase "email-otp"}}` |
| `filterPlugins` | Exclude "next-cookies" from plugins | `{{#each (filterPlugins plugins)}}...{{/each}}` |
| `generatePluginImports` | Full auth import block | `{{{generatePluginImports plugins}}}` |

### Template Context

Templates receive this context object (derived from `ProjectSetupConfig`):

```typescript
{
  projectName: string;          // "my-app"
  mode: "install" | "new-project";
  starter: string;              // "nextjs"
  addOns: string[];             // ["database", "auth"]
  enabledAddOns: string[];      // same as addOns
  addOnOptions: {               // keyed by add-on ID
    database: { orm: "prisma", provider: "postgresql" },
    auth: { provider: "better-auth", plugins: ["email", "passkey"] }
  };
  packageManager: "npm" | "yarn" | "pnpm" | "bun";
  initGit: boolean;
  initDocker: boolean;
  installDependencies: boolean;
}
```

---

## 📐 Schema Providers

Schema providers generate fully wired feature files from your domain models.

### Prisma (Built-In)

- **Provider ID:** `prisma`
- **Default schema path:** `prisma/schema.prisma`
- **Command format:** `--schema prisma:ModelName`

When selected, the CLI generates:
- `src/features/<feature>/controllers/<feature>.controller.ts` — full CRUD controller
- `src/features/<feature>/procedures/<feature>.procedure.ts` — PrismaClient-backed procedures
- `src/features/<feature>/<feature>.interfaces.ts` — model type exports

```bash
# Generate from Prisma model
igniter generate feature users --schema prisma:User

# Custom schema path
igniter generate feature billing --schema prisma:Invoice --schema-path ./db/schema.prisma
```

### Extending with Custom Providers

Custom schema providers extend the `SchemaProvider` abstract class:

```typescript
import { SchemaProvider } from "@igniter-js/cli";

export class DrizzleSchemaProvider extends SchemaProvider {
  id = "drizzle";
  name = "Drizzle ORM";
  defaultSchemaPath = "src/db/schema.ts";

  async validateSchemaPath(path?: string): Promise<void> { /* ... */ }
  async listModels(path?: string): Promise<string[]> { /* ... */ }
  async generateFeature(selection, context): Promise<void> { /* ... */ }
}
```

Register with the provider registry in your `index.ts`.

---

## ✅ Best Practices

### Do's

- ✅ **Use inline add-on syntax** for reproducible setups — `"database:prisma:postgresql,auth:better-auth:email"` is scriptable and explicit
- ✅ **Commit `src/igniter.schema.ts`** and `src/docs/openapi.json` — they're generated but should be versioned for PR review
- ✅ **Run `igniter dev`** during development to keep schema and docs in sync automatically
- ✅ **Use install mode** for existing projects — `igniter init . --mode install` adds Igniter.js without replacing your code
- ✅ **Let the CLI detect the package manager** — it reads `npm_config_user_agent` for the right commands
- ✅ **Use schema-aware generation** when you have Prisma models — `--schema prisma:User` generates complete CRUD
- ✅ **Organize features by domain** — `users`, `billing`, `notifications`, not by technical layer
- ✅ **Regenerate callers on API changes** — `igniter generate caller billing --url <url>` keeps client types in sync
- ✅ **Use `parseAddOnsArg`** in custom scripts to programmatically parse inline add-on syntax
- ✅ **Check `FeatureWorkspace.listFeatures()`** before generating into a feature to avoid collisions

### Don'ts

- ❌ **Don't edit generated caller files** — `schema.ts` and `index.ts` in `src/callers/` are auto-generated; regenerate them
- ❌ **Don't use `--database` flag** — it's registered but not wired; use `--add-ons "database:orm:provider"` instead
- ❌ **Don't run `igniter init` inside a non-empty directory without `--mode install`** — it will overwrite with a starter
- ❌ **Don't skip schema generation** in CI — run `igniter generate schema` to verify types before building
- ❌ **Don't mix installed and npx-run CLI versions** — use global install or `npx @igniter-js/cli@latest` consistently
- ❌ **Don't nest features inside other features** — keep `src/features/<name>/` flat
- ❌ **Don't manually create feature directories** — use `igniter generate feature` for proper structure and `.gitkeep` files
- ❌ **Don't delete `.gitkeep` files manually** — the CLI manages them (e.g., removes `procedures/.gitkeep` on first procedure generation)
- ❌ **Don't use incompatible runtimes for starters** — Bun starters need Bun, Deno starters need Deno
- ❌ **Don't ignore `--no-install` with post-install add-ons** — add-ons like `auth`, `database`, and `shadcn-ui` need deps installed for post-install hooks

---

## 🔧 Troubleshooting

### Common Errors and Solutions

#### ❌ `Could not locate the CLI templates directory`

**Cause:** The CLI can't find its `templates/` directory (common when running from source or in monorepos).

**Solution:**
```bash
# If running from source, ensure templates exist:
ls packages/cli/templates/

# If installed via npm, reinstall:
npm install -g @igniter-js/cli@latest

# Or use npx to ensure correct resolution:
npx @igniter-js/cli@latest init my-app
```

#### ❌ `Router file not found: src/igniter.router.ts`

**Cause:** Running `igniter dev` or `generate` in a directory without an Igniter router.

**Solution:** Run `igniter init` first, or create the router file:
```typescript
// src/igniter.router.ts
import { igniter } from "@igniter-js/core";
export default igniter.router({ /* ... */ });
```

#### ❌ `esbuild failed to compile the router file`

**Cause:** The router has a syntax error or an unresolvable import during esbuild in-memory compilation.

**Solution:**
1. Verify your router compiles normally: `npx tsc --noEmit`
2. Check for circular imports — esbuild can't always resolve them
3. External deps (`@igniter-js/*`, `@prisma/*`, etc.) are auto-excluded; ensure your custom deps are importable

#### ❌ `Model 'X' not found for provider 'Prisma'`

**Cause:** The model name doesn't match your Prisma schema.

**Solution:**
```bash
# List available models (Prisma provider auto-detects from schema.prisma)
# Ensure the model name matches exactly (case-sensitive)
igniter generate feature users --schema prisma:User  # model User { ... }
igniter generate feature posts --schema prisma:Post  # model Post { ... }
```

#### ❌ `Feature 'X' already exists`

**Cause:** The feature directory already exists.

**Solution:**
```bash
# Check existing features:
ls src/features/

# Use a different name or remove the existing feature first:
rm -rf src/features/old-feature
igniter generate feature new-feature
```

#### ❌ `Only OpenAPI 3.x documents are supported`

**Cause:** The `generate caller` command received a Swagger 2.0 or non-OpenAPI document.

**Solution:** Use an OpenAPI 3.0+ spec. Convert Swagger 2.0 with:
```bash
npx swagger2openapi spec.yaml -o openapi3.json
igniter generate caller my-api --path ./openapi3.json
```

#### ❌ `Port X is already in use`

**Cause:** Docker setup detected a port conflict.

**Solution:**
```bash
# The CLI tries to free ports automatically. If it fails:
docker ps                    # Find running containers
docker stop <container-id>   # Stop conflicting containers
# Or skip Docker:
igniter init my-app --no-docker
```

#### ❌ Type inference breaks with generated caller schemas

**Cause:** The generated `IgniterCallerSchema` has deeply nested types.

**Solution:**
```typescript
// Use the exported type alias instead of typeof inference
import { billingCallerSchemas } from "./src/callers/api.example.com/schema";
import type { BillingCallerSchemas } from "./src/callers/api.example.com/schema";

// Prefer $Infer for complex types
type Invoice = BillingCallerSchemas["$Infer"]["Response"]["/v1/invoices"]["GET"][200];
```

---

## 🧪 Testing

### Testing Generated Projects

```bash
# Create project for testing
igniter init test-project --template nextjs --no-install --no-git --no-docker

# Verify project structure
tree test-project/src/

# Generate a feature and compile
cd test-project
igniter generate feature test-users --schema prisma:User

# Run type checking
npx tsc --noEmit
```

### Testing Custom Starters

```typescript
import { NextJsStarter } from "@igniter-js/cli/registry/starters";
import { ProjectGenerator } from "@igniter-js/cli";

const starter = new NextJsStarter();
await starter.install("./test-output", {
  projectName: "test",
  mode: "new-project",
  starter: "nextjs",
  addOns: [],
  packageManager: "npm",
  initGit: false,
  initDocker: false,
  installDependencies: false,
});

// Verify output
expect(fs.existsSync("./test-output/src/igniter.router.ts")).toBe(true);
```

### Testing Custom Add-Ons

```typescript
import { BaseAddOn } from "@igniter-js/cli/core/registry/add-ons/base-addon";

class TestAddOn extends BaseAddOn {
  name = "Test";
  description = "Test add-on";
  value = "test";
  dependencies = [
    { name: "test-lib", version: "^1.0.0", type: "dependency" }
  ];
}

// Test setup in isolation
const addon = new TestAddOn();
await addon.runSetup("./test-dir", { /* config */ });
```

---

## 🏗 Framework Integration

### Next.js

```bash
igniter init my-nextjs-app --template nextjs
```

The Next.js starter scaffolds:
- API route handler bridge (`src/app/api/igniter/[...route]/route.ts`)
- Server-side `IgniterClient` with cookie-based auth
- TypeScript config with path aliases

### TanStack Start

```bash
igniter init my-tanstack-app --template tanstack-start
```

The TanStack Start starter scaffolds:
- Server function handler bridge
- Client-side `IgniterClient` integration
- TypeScript config with SSR-safe settings

### Express.js

```bash
igniter init my-express-api --template express-rest-api
```

The Express starter scaffolds:
- Express middleware pipeline
- RESTful route registration
- Error handling middleware

### Bun

```bash
# REST API
igniter init my-bun-api --template bun-rest-api

# Full-stack React app
igniter init my-bun-react-app --template bun-react-app
```

### Deno

```bash
igniter init my-deno-api --template deno-rest-api
```

---

## 📊 OpenAPI Generation

The CLI generates OpenAPI 3.0 specs from your router configuration.

### Minimal Router with Docs Config

```typescript
import { igniter } from "@igniter-js/core";

export const router = igniter.router({
  docs: {
    info: {
      title: "Acme API",
      version: "1.0.0",
      description: "Public API for Acme Corp",
    },
    servers: [
      { url: "https://api.acme.com/v1", description: "Production" },
      { url: "http://localhost:3000/api/v1", description: "Local" },
    ],
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
});
```

### What Gets Generated

| Router Element | OpenAPI Output |
|---------------|----------------|
| Controller name | Tag name |
| Controller description | Tag description |
| Controller path | Base path segment |
| Action name | `operationId` |
| Action description | `summary` |
| Action method | HTTP method (GET, POST, PUT, PATCH, DELETE) |
| Action path | URL path (path params from `:param`) |
| Action body Zod schema | `requestBody` (JSON Schema) |
| Action query Zod schema | `parameters` (JSON Schema) |
| Route path params (`:id`, `:slug`) | Path parameters |

### Defaults

| Field | Default |
|-------|---------|
| `openapi` | `3.0.0` |
| `info.title` | `"Igniter API"` |
| `info.version` | `"1.0.0"` |
| `servers[0].url` | `"http://localhost:3000/api/v1"` |

---

## 🔌 Extending the CLI

### Custom Starter

```typescript
// src/registry/starters/custom-starter.ts
import { BaseStarter } from "@igniter-js/cli/core/registry/starters/base-starter";
import path from "path";

export class CustomStarter extends BaseStarter {
  id = "custom";
  name = "Custom Framework";
  description = "My custom starter";
  hint = "Custom";
  repository = "my-org/my-repo/path/to/starter";

  templates = [
    {
      template: path.resolve(__dirname, "templates", "custom.hbs"),
      outputPath: "src/custom-file.ts",
    },
  ];

  dependencies = [
    { name: "my-framework", version: "^2.0.0", type: "dependency" },
  ];
}
```

Register in your `index.ts`:

```typescript
import { StarterRegistry } from "@igniter-js/cli/core/registry/starters/starter-registry";
export const starterRegistry = StarterRegistry.create()
  .register(new CustomStarter())
  .build();
```

### Custom Add-On

```typescript
import { BaseAddOn } from "@igniter-js/cli/core/registry/add-ons/base-addon";

export class CustomAddOn extends BaseAddOn {
  name = "Custom Service";
  description = "Integrates with Custom Service";
  value = "custom-service";
  hint = "Custom integration";

  templates = [{
    template: "templates/custom/service.hbs",
    outputPath: "src/services/custom.ts",
  }];

  dependencies = [
    { name: "custom-sdk", version: "^1.0.0", type: "dependency" },
  ];

  envVars = [
    { key: "CUSTOM_API_KEY", value: "", description: "Custom API key" },
  ];

  async runPostInstall(projectDir: string, config: ProjectSetupConfig) {
    // Post-install hook (e.g., CLI setup, config generation)
  }
}
```

---

## 📦 Package Information

| Field | Value |
|-------|-------|
| **Package** | `@igniter-js/cli` |
| **Version** | `0.4.98` |
| **Bin** | `igniter` → `dist/index.mjs` |
| **Runtime** | Node.js 18.17+ |
| **TypeScript** | 5.3+ |
| **License** | MIT |
| **Author** | Felipe Barcelos |

### Key Dependencies

| Dependency | Purpose |
|------------|---------|
| `commander` | CLI framework |
| `@clack/prompts` | Interactive prompts |
| `handlebars` | Template engine |
| `esbuild` | In-memory router compilation |
| `chokidar` | File watching (dev mode) |
| `ink` + `react` | Terminal UI dashboard |
| `zod` + `zod-to-json-schema` | Schema validation + conversion |
| `@apidevtools/swagger-parser` | OpenAPI spec parsing |
| `execa` | Shell command execution |
| `js-yaml` | YAML parsing |

---

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup and guidelines.

For agent-specific architecture documentation, see [AGENTS.md](./AGENTS.md).

---

MIT © Felipe Barcelos and the Igniter.js contributors.
