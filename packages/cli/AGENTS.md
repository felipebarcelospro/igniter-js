---
applyTo: '**'
---

# Lia - AI Agent for @igniter-js/cli

> **Last Updated:** 2026-01-29
> **Version:** 0.4.98

---

## 1. Package Vision & Context

@igniter-js/cli is the orchestration layer that turns Igniter.js conventions into repeatable workflows.
It exists to make scaffolding, code generation, and schema documentation deterministic across teams and runtimes.
Every change to the CLI must preserve three guarantees: predictable outputs, traceable asset changes, and safe defaults.

## 1.1 Identity & Mission

**Name:** Lia
**Role:** AI Agent for @igniter-js/cli Development & Maintenance
**Communication Language:** Always respond to users in the same language they use
**Documentation Language:** ALL written documentation, code, and content MUST be in English

### Core Mission
Maintain and extend the next-generation CLI tool for Igniter.js, ensuring reliable project scaffolding, feature generation, and developer productivity.

### Key Responsibilities
1. **CLI Architecture** - Maintain robust command structure and execution flow
2. **Template System** - Ensure templates generate correct, working code
3. **Registry Management** - Keep add-ons and starters registry up-to-date
4. **Code Generation** - Maintain accurate introspection and generation logic
5. **Developer Experience** - Ensure smooth, intuitive CLI interactions

---

## I. MAINTAINER GUIDE (Internal Architecture)

This section is for contributors and agents maintaining the CLI internals. It maps the CLI architecture, files, and operational flows so changes remain safe and consistent.

## 2. Package Overview

### What is @igniter-js/cli?

@igniter-js/cli is the next-generation command-line interface for Igniter.js that provides:

1. **Project Scaffolding** - Create new projects with starters and features
2. **Feature Generation** - Add features to existing projects
3. **Schema Generation** - Generate client schemas and OpenAPI specs
4. **Template Engine** - Handlebars-based template system
5. **Registry System** - Extensible registry for starters and add-ons

### Architecture Highlights

```
@igniter-js/cli/
├── bin/
│   └── igniter
├── dist/
│   ├── index.d.mts
│   ├── index.mjs
│   └── index.mjs.map
├── src/
│   ├── commands/
│   │   ├── dev/
│   │   │   ├── action.ts
│   │   │   ├── components/
│   │   │   │   ├── DevUI.tsx
│   │   │   │   └── index.ts
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── generate/
│   │   │   ├── controller/
│   │   │   │   ├── action.ts
│   │   │   │   └── index.ts
│   │   │   ├── caller/
│   │   │   │   ├── action.ts
│   │   │   │   └── index.ts
│   │   │   ├── docs/
│   │   │   │   ├── action.ts
│   │   │   │   └── index.ts
│   │   │   ├── feature/
│   │   │   │   ├── action.ts
│   │   │   │   ├── feature.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── prompts.ts
│   │   │   ├── index.ts
│   │   │   ├── procedure/
│   │   │   │   ├── action.ts
│   │   │   │   └── index.ts
│   │   │   └── schema/
│   │   │       ├── action.ts
│   │   │       └── index.ts
│   │   └── init/
│   │       ├── action.ts
│   │       ├── generator.ts
│   │       ├── index.ts
│   │       ├── prompts.ts
│   │       └── types.ts
│   ├── core/
│   │   ├── file-system.ts
│   │   ├── framework.ts
│   │   ├── handlebars-helpers.ts
│   │   ├── logger.ts
│   │   ├── openapi.ts
│   │   ├── package-manager.ts
│   │   ├── registry/
│   │   │   ├── add-ons/
│   │   │   │   ├── add-on-registry.ts
│   │   │   │   └── base-addon.ts
│   │   │   ├── schema-provider/
│   │   │   │   ├── base-schema-provider.ts
│   │   │   │   └── schema-provider-registry.ts
│   │   │   └── starters/
│   │   │       ├── base-starter.ts
│   │   │       └── starter-registry.ts
│   │   ├── router-instrospector.ts
│   │   ├── template-engine.ts
│   │   ├── terminal.ts
│   │   └── watcher.ts
│   ├── index.ts
│   ├── registry/
│   │   ├── add-ons/
│   │   │   ├── auth.ts
│   │   │   ├── bots.ts
│   │   │   ├── database.ts
│   │   │   ├── index.ts
│   │   │   ├── jobs.ts
│   │   │   ├── logging.ts
│   │   │   ├── mcp.ts
│   │   │   ├── shadcn.ts
│   │   │   ├── store.ts
│   │   │   └── telemetry.ts
│   │   ├── schema-provider/
│   │   │   ├── index.ts
│   │   │   └── prisma.ts
│   │   ├── starters/
│   │   │   ├── bun-api-starter.ts
│   │   │   ├── bun-react-starter.ts
│   │   │   ├── deno-starter.ts
│   │   │   ├── express-starter.ts
│   │   │   ├── index.ts
│   │   │   ├── nextjs-starter.ts
│   │   │   └── tanstack-start-starter.ts
│   │   └── types.ts
│   └── utils/
│       ├── casing.ts
│       └── try-catch.ts
├── templates/
│   ├── add-ons/
│   │   ├── auth/
│   │   │   └── better-auth/
│   │   │       └── auth.hbs
│   │   ├── bots/
│   │   │   ├── nextjs/
│   │   │   │   └── route-handler.hbs
│   │   │   ├── sample-bot.hbs
│   │   │   └── tanstack-start/
│   │   │       └── route-handler.hbs
│   │   ├── database/
│   │   │   ├── drizzle/
│   │   │   └── prisma/
│   │   │       ├── lib.hbs
│   │   │       ├── prisma.config.hbs
│   │   │       └── schema.hbs
│   │   ├── jobs/
│   │   │   ├── jobs.ts.hbs
│   │   │   ├── redis.ts.hbs
│   │   │   └── store.ts.hbs
│   │   ├── logging/
│   │   │   └── logger.ts.hbs
│   │   ├── mcp/
│   │   │   ├── mcp.ts.hbs
│   │   │   ├── nextjs/
│   │   │   │   └── route-handler.hbs
│   │   │   └── tanstack-start/
│   │   │       └── route-handler.hbs
│   │   ├── store/
│   │   │   ├── redis.ts.hbs
│   │   │   └── store.ts.hbs
│   │   └── telemetry/
│   │       └── telemetry.ts.hbs
│   ├── generate/
│   │   └── feature/
│   │       ├── empty.controller.hbs
│   │       ├── empty.interfaces.hbs
│   │       ├── procedure.hbs
│   │       ├── schema.controller.hbs
│   │       ├── schema.interfaces.hbs
│   │       └── schema.procedure.hbs
│   ├── scaffold/
│   │   ├── example-feature/
│   │   │   ├── example.controller.hbs
│   │   │   ├── example.interfaces.hbs
│   │   │   └── example.procedure.hbs
│   │   └── igniter.schema.hbs
│   └── starters/
│       ├── igniter.client.hbs
│       ├── igniter.context.hbs
│       ├── igniter.hbs
│       ├── igniter.router.hbs
│       ├── nextjs/
│       │   ├── route-handler.hbs
│       │   └── tsconfig.hbs
│       ├── open-api.hbs
│       └── tanstack-start/
│           ├── route-handler.hbs
│           └── tsconfig.hbs
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── AGENTS.md
```

---

## 3. Command System Architecture

### 3.1. Command Structure

The CLI uses Commander.js with a hierarchical command structure:

```typescript
// Main CLI entry point
igniter [command] [subcommand] [options]
```

#### Available Commands

1. **`igniter init`** - Create new Igniter.js projects
2. **`igniter generate`** - Generate application building blocks and documentation
   - `igniter generate feature` - Scaffold new feature modules (controllers, procedures, interfaces)
     - Supports `--schema <provider:model>` and `--schema-path <path>` to customise schema sources
   - `igniter generate controller` - Create a controller inside an existing or new feature
   - `igniter generate procedure` - Create a procedure inside an existing or new feature
   - `igniter generate docs` - Generate OpenAPI specification
   - `igniter generate schema` - Generate client schema
   - `igniter generate caller` - Generate IgniterCallerSchema builder + ready-to-use caller from an OpenAPI spec
3. **`igniter dev`** - Watch router and feature changes to regenerate schema/docs and optionally run the app dev server with live Ink UI feedback

### 3.2. Command Implementation Pattern

Each command follows this structure:

```
src/commands/[command]/
├── index.ts          # Command definition with Commander.js
├── action.ts         # Main action handler
├── generator.ts      # Business logic for generation
├── prompts.ts        # Interactive prompts using @clack/prompts
└── types.ts          # TypeScript type definitions
```

#### Command Template Pattern

```typescript
// index.ts
import { Command } from 'commander';
import { handleAction } from './action';

export const commandName = new Command()
  .command('command-name')
  .description('Command description')
  .argument('[name]', 'Argument description')
  .option('--option <value>', 'Option description', 'default')
  .action(handleAction);

// action.ts
export async function handleAction(arg: string, options: OptionsType) {
  // Implementation logic
}
```

### 3.3. Init Command Deep Dive

#### Command Options
- `[project-name]` - Name of the project directory
- `--mode <mode>` - 'install' (in-place) or 'new-project' (new directory)
- `--pm, --package-manager <manager>` - npm, yarn, pnpm, bun
- `--template <template>` - Specific starter template
- `--add-ons <add-ons>` - Comma-separated add-on list
- `--no-git` - Skip git initialization
- `--no-install` - Skip dependency installation
- `--no-docker` - Skip Docker Compose setup

> **Note:** The `--database` option is registered in Commander but not wired to the action handler. Database selection happens through the `--add-ons "database:orm:provider"` inline syntax or via prompts.

#### Initialization Flow

1. **Prompt Collection** - Interactive prompts via @clack/prompts
2. **Configuration Building** - Assemble ProjectSetupConfig
3. **Project Generation** - Use ProjectGenerator to create project
4. **Post-processing** - Git init, dependency install, Docker setup

### 3.4. Dev Command Deep Dive

The `igniter dev` workflow keeps Igniter artefacts in sync while you iterate on your app.

#### Command Options
- `--router <path>` - Router entry file to introspect (`src/igniter.router.ts` by default)
- `--output <path>` - Client schema output path (`src/igniter.schema.ts` by default)
- `--docs-output <dir>` - Directory that receives `openapi.json` (`./src/docs` by default)
- `--cmd <command>` - Custom command to boot your application dev server (falls back to `<pm> run dev`)

#### Behaviour Overview
- Performs an initial schema (`generateSchemaWatchMode`) and docs (`generateDocsWatchMode`) build before starting watchers
- Watches the router file plus `src/features/**/*` (when the folder exists) using chokidar with 300 ms debounce
- Re-runs schema/docs generation on each change and surfaces durations, counters, and errors inside an Ink dashboard
- Streams your application dev server logs in a separate tab; toggle between Igniter/App logs with `1`/`2` or arrow keys
- Detects the package manager to infer the default command (`npm run dev`, `pnpm dev`, `bun dev`, `yarn dev`) when `--cmd` is omitted
- Gracefully handles exit signals (Ctrl+C / ESC) by tearing down the watcher and child process

### 3.5. Operational Flow Mapping (Pipelines)

#### Command: `igniter init`
1. **Argument parsing:** `handleInitAction` parses CLI flags and inline add-on options (`parseAddOnsArg`).
2. **Interactive prompts:** `runInitPrompts` gathers project name, mode, starter, add-ons, add-on options, package manager, and install/docker/git toggles.
3. **Project generation:** `ProjectGenerator.generate()` orchestrates the pipeline.
4. **Starter install:** `starter.install()` scaffolds the base project (download/templating depending on starter).
5. **Add-on setup:** Each add-on `runSetup()` applies templates, dependencies, env vars, and docker services.
6. **Dependency install:** If enabled, installs dependencies via detected package manager.
7. **Docker setup:** If enabled, stops running containers, frees ports from `docker-compose.yml`, then runs `docker-compose up -d`.
8. **Git setup:** If enabled, initializes git and commits initial state.
9. **Post-install hooks:** Runs add-on `runPostInstall()` (Better Auth CLI, Prisma/Drizzle setup, Shadcn init).

#### Command: `igniter generate feature`
1. **Provider resolution:** Uses `schemaProviderRegistry` to resolve `--schema` or detect providers.
2. **Model selection:** Prompts for a model (if provider selected) or proceeds with empty feature.
3. **Feature slugging:** Converts user input to kebab-case and checks for collisions.
4. **Scaffold:** Ensures feature structure and renders templates (schema provider or empty feature).
5. **Success output:** Prints next steps and exits.

#### Command: `igniter generate controller`
1. **Collect controller name** via prompt or CLI argument.
2. **Resolve feature** using `FeaturePrompts.resolveFeatureSlug`.
3. **Ensure structure** with `FeatureWorkspace.ensureStructure`.
4. **Render template** `empty.controller.hbs` into the feature.

#### Command: `igniter generate procedure`
1. **Collect procedure name** via prompt or CLI argument.
2. **Resolve feature** using `FeaturePrompts.resolveFeatureSlug`.
3. **Ensure structure** and remove `.gitkeep` if present.
4. **Render template** `procedure.hbs` into the feature.

#### Command: `igniter generate docs`
1. **Load router** via `RouterInstrospector.loadRouter` (esbuild in-memory build).
2. **Validate docs config** (`router.config.docs`).
3. **Generate OpenAPI** via `OpenAPIGenerator` and write `openapi.json`.

#### Command: `igniter generate schema`
1. **Load router** via `RouterInstrospector.loadRouter`.
2. **Introspect router** to JSON schema and stats.
3. **Render template** `scaffold/igniter.schema.hbs` with schema JSON.

#### Command: `igniter generate caller`
1. **Resolve source** (URL or local path) and validate input.
2. **Load + bundle OpenAPI** (must be OpenAPI 3.x).
3. **Generate schema builder** (`IgniterCallerSchema`) and derived type aliases.
4. **Emit caller** with optional base URL from spec or source.

#### Command: `igniter dev`
1. **Resolve paths** for router, schema output, and docs output.
2. **Initial generation** of docs + schema.
3. **Start watcher** on router + features with 300 ms debounce.
4. **Start dev server** using inferred or explicit command.
5. **Render Ink UI** and stream both Igniter and app logs.

---

## 4. Registry System

### 4.1. Registry Architecture

The registry system provides an extensible way to manage:

- **Add-ons** - Optional project extensions (store, jobs, mcp, etc.)
- **Starters** - Project templates for different frameworks

#### Registry Pattern

```typescript
// Base classes
BaseAddOn   // Abstract base for all add-ons
BaseStarter  // Abstract base for all starters

// Registry classes
AddOnRegistry   // Manages add-on registration and retrieval
StarterRegistry  // Manages starter registration and retrieval

// Legacy compatibility aliases
type BaseFeature = BaseAddOn
type FeatureRegistry = AddOnRegistry
```

### 4.2. Add-On Registry

#### Available Add-Ons

| ID | Name | Description | Key assets | Docker services |
|----|------|-------------|------------|-----------------|
| `store` | Store | Caching, sessions, and pub/sub messaging | Templates: `src/services/redis.ts`, `src/services/store.ts`; dependencies: `@igniter-js/adapter-redis`, `ioredis@5.6.1`, `@types/ioredis@4.28.10`; env vars: `REDIS_*` | `redis:7-alpine` (auth via `${REDIS_PASSWORD}`) |
| `jobs` | Jobs | Background task processing and job queues | Templates: jobs/store/redis services; dependencies: `@igniter-js/adapter-redis`, `@igniter-js/adapter-bullmq`, `bullmq@5.58.7`, `ioredis@5.6.1`, `@types/ioredis@4.28.10`; env vars: `REDIS_*`, `IGNITER_JOBS_QUEUE_PREFIX` | `redis:7-alpine` |
| `mcp` | MCP Server | Model Context Protocol adapter for AI copilots | Templates: `src/igniter.mcp.ts` + Next.js/TanStack handlers; dependencies: `@igniter-js/adapter-mcp-server`, `ioredis@5.6.1`, `@types/ioredis@4.28.10`; env vars: `IGNITER_MCP_*`, `REDIS_*` | `redis:7-alpine` |
| `logging` | Logging | Structured logging utilities | Template: `src/services/logger.ts`; dependency: `@igniter-js/core`; env var: `IGNITER_LOG_LEVEL` | - |
| `telemetry` | Telemetry | Distributed tracing and metrics hooks | Template: `src/services/telemetry.ts`; dependency: `@igniter-js/core`; env vars: `IGNITER_TELEMETRY_ENABLE_*` | - |
| `bots` | Bots | Multi-platform bot starter with HTTP handlers | Templates: `src/bots/sample-bot.ts`, framework-specific route handlers; dependency: `@igniter-js/bot@alpha`; env vars: `TELEGRAM_*` | - |
| `database` | Database | Database integration with interactive ORM/provider selection | Options: `orm` (`prisma` adds `prisma@^6.19.0`, `@prisma/client@^6.19.0`, `dotenv`, plus `src/lib/database.ts`, `prisma.config.ts`, `prisma/schema.prisma`; `drizzle` scaffolds `src/lib/database.ts`); `provider` adds env vars and Docker services for PostgreSQL/MySQL plus Prisma/Drizzle CLI post-install (`prisma generate` / `drizzle init`) | PostgreSQL → `postgres:16-alpine`; MySQL → `mysql:8.0`; SQLite → none |
| `auth` | Authentication | Better Auth setup with plugin selection | Template: `src/lib/auth.ts`; dependency: `better-auth@1.3.0`; runs `@better-auth/cli generate --config src/lib/auth.ts`; supports multi-select plugins written to template context | - |
| `shadcn-ui` | Shadcn/UI | UI components bootstrap via official CLI | Post-install: runs `shadcn@latest init --base-color zinc --src-dir --silent --yes` using detected package manager | - |

#### Add-On Implementation Pattern

```typescript
// src/registry/add-ons/[addon].ts
import { BaseAddOn } from '@/core/registry/add-ons/base-addon';
import path from 'path';
import type { ProjectSetupConfig } from '@/commands/init/types';
```

```typescript
export class AddOnNameAddOn extends BaseAddOn {
  // === REQUIRED PROPERTIES ===
  name = 'Display Name';           // Human-readable name shown in CLI
  description = 'Human-readable description';  // Description shown in help
  value = 'addon-key';             // Unique identifier used in CLI options
  
  // === OPTIONAL PROPERTIES ===
  hint = 'Optional hint text';     // Optional hint shown during selection
  
  // === ASSET DEFINITIONS (Optional) ===
  templates = [
    {
      template: path.resolve(process.cwd(), 'templates/add-ons/addon/template.hbs'),
      outputPath: 'src/services/service.ts',
    },
  ];
  
  dependencies = [
    {
      name: '@igniter-js/adapter-addon',
      version: 'latest',
      type: 'dependency',          // 'dependency' | 'devDependency' | string
    },
  ];
  
  dockerServices = [
    {
      name: 'service-name',       // Service name in docker-compose.yml
      image: 'image:tag',         // Docker image
      ports: ['port:port'],       // Port mappings
      environment: { KEY: 'value' }, // Environment variables (supports ${VAR} placeholders)
      volumes: ['volume:/path'],   // Volume mounts
    },
  ];
  
  envVars = [
    {
      key: 'ENV_VAR',             // Environment variable key
      value: 'default-value',     // Default value
      description: 'Environment variable description',  // Added as comment in .env
    },
  ];
  
  // Interactive configuration options (NEW)
  options = [
    {
      key: 'orm',                  // Option key for template context
      message: 'Choose your preferred ORM',  // User prompt
      multiple: false,             // Allow multiple selections?
      required: true,              // Is this option required?
      defaultValue: 'prisma',     // Default selection
      setup: async (projectDir: string, config: ProjectSetupConfig) => {
        // Custom setup logic after selection
        console.log('Setting up ORM...');
      },
      choices: [
        {
          value: 'prisma',        // Choice value for templates
          label: 'Prisma',        // Human-readable label
          hint: 'Type-safe, mature, excellent tooling',  // Optional hint
          templates: [/* choice-specific templates */],
          dependencies: [/* choice-specific dependencies */],
          dockerServices: [/* choice-specific services */],
          envVars: [/* choice-specific env vars */],
          subOptions: [/* nested options */],
        },
      ],
    },
  ];
  
  // === CUSTOM SETUP (Optional) ===
  public async runSetup(projectDir: string, config: ProjectSetupConfig): Promise<void> {
    // Override BaseAddOn.runSetup for custom behavior
    // Default behavior: process templates, dependencies, docker, and env vars
    await super.runSetup(projectDir, config);
    
    // Custom logic here...
  }
}
```

#### BaseAddOn Advanced Features

The `BaseAddOn` class provides powerful built-in functionality for managing add-on assets:

##### **Automatic Asset Management**

```typescript
// BaseAddOn methods self-collect assets using selected options (called by runSetup):
await this.addToPackageJson(projectDir, config);
await this.addToDockerCompose(projectDir, config);
await this.addToEnvFile(projectDir, config);
await this.renderTemplates(projectDir, config);

// Note: ProjectGenerator runs addOn.runPostInstall(projectDir, config)
// as the final step after installing dependencies.
```

##### **Interactive Options System**

The `options` property enables complex add-on configuration:

```typescript
options = [
  {
    key: 'database',
    message: 'Choose database provider',
    multiple: false,
    required: true,
    choices: [
      {
        value: 'postgresql',
        label: 'PostgreSQL',
        hint: 'Production-ready, full-featured',
        // Assets specific to PostgreSQL choice
        dependencies: [{ name: 'pg', version: '^8.0.0', type: 'dependency' }],
        dockerServices: [{
          name: 'postgres',
          image: 'postgres:16-alpine',
          ports: ['5432:5432'],
          environment: { POSTGRES_DB: '${DATABASE_NAME}' },
          volumes: ['postgres_data:/var/lib/postgresql/data']
        }],
        envVars: [
          { key: 'DATABASE_URL', value: 'postgresql://localhost:5432/db', description: 'PostgreSQL connection' }
        ],
        // Nested sub-options for this choice
        subOptions: [
          {
            key: 'orm',
            message: 'Choose ORM',
            multiple: false,
            choices: [
              { value: 'prisma', label: 'Prisma' },
              { value: 'drizzle', label: 'Drizzle' }
            ]
          }
        ]
      }
    ],
    // Custom setup function for this option
    setup: async (projectDir: string, config: ProjectSetupConfig) => {
      console.log('Setting up database...');
      // Custom setup logic
    }
  }
]
```

##### **Dynamic Template Rendering**

Templates support dynamic paths and conditional rendering:

```typescript
templates = [
  {
    // Function-based template path
    template: (data: ProjectSetupConfig) => {
      const templates = {
        nextjs: 'templates/add-on/nextjs/route.hbs',
        express: 'templates/add-on/express/middleware.hbs'
      };
      return templates[data.starter as keyof typeof templates];
    },
    // Function-based output path
    outputPath: (data: ProjectSetupConfig) => {
      const paths = {
        nextjs: 'src/app/api/addon/route.ts',
        express: 'src/middleware/addon.ts'
      };
      return paths[data.starter as keyof typeof paths];
    }
  }
]
```

##### **Template Context Variables**

Templates receive enhanced context including add-on options:

```handlebars
{{!-- templates/add-on/service.hbs --}}
// Access project configuration
export const {{camelCase projectName}}Service = {
  name: '{{projectName}}',
  mode: '{{mode}}',
  starter: '{{starter}}'
};

// Access enabled add-ons
{{#each enabledAddOns}}
import { {{pascalCase this}}Service } from './{{this}}';
{{/each}}

// Access add-on specific options
{{#if (eq addOnOptions.database.orm "prisma")}}
import { PrismaClient } from '@prisma/client';
{{/if}}

{{#if (includes addOnOptions.auth.plugins "email")}}
// Email authentication configuration
{{/if}}
```

##### **Environment Variable Handling**

The system automatically manages environment variables:

- **Duplicate Prevention**: Won't add existing env vars
- **Comments**: Adds description as comments in .env file
- **Placeholders**: Supports `${VAR}` placeholders in Docker services
- **Type Safety**: All env vars are typed via `RegistryAssetEnvVar`

##### **Docker Service Integration**

Docker services are automatically added to `docker-compose.yml`:

```typescript
dockerServices = [
  {
    name: 'redis',
    image: 'redis:7-alpine',
    ports: ['6379:6379'],
    environment: {
      REDIS_PASSWORD: '${REDIS_PASSWORD}',  // Auto-replaced with actual value
      REDIS_DB: '${REDIS_DB}'
    },
    volumes: ['redis_data:/data']  // Auto-creates volume definitions
  }
]
```

##### **Setup Function Chaining**

Multiple setup functions are collected and executed post-install:

1. **Option-level setup**: Runs for each selected option
2. **Choice-level setup**: Runs for specific choices
3. **Sub-option setup**: Runs for nested options
4. **Class-level post-install**: Override `runPostInstall()` in your add-on class

##### **Asset Collection Algorithm**

BaseAddOn automatically merges assets during `runSetup` from:
- Base class properties (`dependencies`, `templates`, etc.)
- Selected choices in options
- Nested sub-options
- Multiple selections when `multiple: true`

### 4.3. Starter Registry

#### Available Starters

| ID | Name | Framework | Description | Hint | Repository |
|----|------|-----------|-------------|------|------------|
| `nextjs` | Next.js | Next.js | A full-stack starter with Next.js | Fullstack | starter-nextjs |
| `express-rest-api` | Express.js | Express.js | A classic REST API starter with Express.js | REST API | starter-express-rest-api |
| `deno-rest-api` | Deno | Deno | A modern REST API starter with Deno | REST API | starter-deno-rest-api |
| `bun-rest-api` | Bun | Bun | A high-performance REST API starter with Bun | REST API | starter-bun-rest-api |
| `bun-react-app` | Bun + React (Vite) | Bun | A full-stack starter with Bun, React, and Vite | Fullstack | starter-bun-react-app |
| `tanstack-start` | TanStack Start | TanStack Start | A type-safe full-stack starter with TanStack Start | Fullstack | starter-tanstack-start |

#### Starter Implementation Pattern

```typescript
// src/registry/starters/[starter].ts
import { BaseStarter } from '@/core/registry/starters/base-starter';
import path from 'path';

```typescript
export class FrameworkStarter extends BaseStarter {
  id = 'starter-id';           // Used in CLI
  name = 'Display Name';       // Human-readable
  description = 'Description';
  hint = 'Hint text';
  repository = 'starter-template-name'; // Git repository
  
  templates = [
    // Framework-specific templates
    {
      template: path.resolve(process.cwd(), 'templates/starters/framework/specific.hbs'),
      outputPath: 'src/specific-file.ts',
    },
  ];
  
  dependencies = [
    { name: '@igniter-js/core', version: 'latest', type: 'dependency' },
  ];
  
  envVars = [
    { key: 'APP_NAME', value: 'My App', description: 'App name' },
  ];
}
```

---

## 5. Template System

### 5.1. Handlebars Template Engine

The CLI uses Handlebars.js with custom helpers for template rendering.

#### Template Organization

```
templates/
├── add-ons/           # Feature add-on templates (store, jobs, logging, etc.)
├── generate/
│   └── feature/       # Controller/procedure/feature scaffolding
├── scaffold/          # General scaffolding templates
│   └── example-feature/  # Example feature structure
└── starters/          # Starter-specific templates
    ├── nextjs/        # Next.js specific templates
    ├── tanstack-start/ # TanStack Start templates
    └── common/        # Shared starter templates
```

#### Template File Extensions

- `.hbs` - Handlebars template files
- All template files MUST use `.hbs` extension

### 5.2. Custom Handlebars Helpers

The CLI registers several custom helpers:

```typescript
// Available in all templates
{{includes array "value"}}     // Check if array includes value
{{isEmpty array}}               // Check if array is empty
{{isDefined value}}             // Check if value is defined/not null
{{join array ", "}}             // Join array with separator
{{capitalizeSlug "my-project"}} // "My Project"
```

#### Helper Usage Examples

```handlebars
{{#if (includes enabledAddOns "store")}}
import { store } from "@/services/store"
{{/if}}
```

{{#if (isEmpty dependencies)}}
<!-- No dependencies message -->
{{/if}}

{{capitalizeSlug projectName}}  <!-- "My Awesome Project" -->
```

#### Template Context

Templates receive this context object:

```typescript
interface TemplateContext {
  projectName: string;           // Project name from init
  mode: 'install' | 'new-project'; // Installation mode
  starter: string;               // Selected starter
  addOns: string[];             // Enabled add-ons (NEW)
  features?: string[];            // Legacy compatibility
  packageManager: PackageManager; // npm, yarn, pnpm, bun
  database: DatabaseProvider;    // postgresql, mysql, sqlite, none
  initGit: boolean;              // Git initialization flag
  initDocker: boolean;           // Docker setup flag
  installDependencies: boolean;   // Auto-install flag
}
```

---

## 6. Code Generation System

### 6.1. Router Introspection

The CLI can dynamically load and introspect Igniter routers using esbuild:

#### Router Loading Process

1. **Compile with esbuild** - Bundle router in memory
2. **Load in isolated context** - Prevent dependency conflicts
3. **Introspect structure** - Extract controllers, actions, schemas
4. **Convert schemas** - Transform Zod to JSON Schema

#### RouterIntrospector Class

```typescript
class RouterInstrospector {
  async loadRouter(routerPath: string): Promise<IgniterRouter>
  introspectRouter(router: IgniterRouter): IntrospectionResult
}

interface IntrospectedRouter {
  controllers: Record<string, IntrospectedController>;
  docs?: any;
}

interface IntrospectedAction {
  name?: string;
  description?: string;
  path: string;
  method: HttpMethod;
  tags?: string[];
  bodySchema?: any;        // JSON Schema
  querySchema?: any;       // JSON Schema
  paramSchemas?: Record<string, any>; // JSON Schema
  responseSchema?: any;    // JSON Schema
  isStream?: boolean;
  security?: any;
}
```

### 6.2. Schema Generation

#### Client Schema Generation

#### Schema Generation
```bash
igniter generate schema --router src/igniter.router.ts --output src/igniter.schema.ts
```

Generates TypeScript client schema from router introspection using Handlebars template at `templates/scaffold/igniter.schema.hbs`. The generated schema exports `AppRouterSchema` as a const assertion and `AppRouterSchemaType` as the type.

#### OpenAPI Documentation Generation

```bash
igniter generate docs --router src/igniter.router.ts --output ./src/docs
```

Generates OpenAPI 3.0 specification from router.

### 6.3. Feature Generation

#### Interactive Feature Generation

```bash
igniter generate feature [name]
```

Supports:
- **Manual naming** - `igniter generate feature users`
- **Prisma-aware CRUD** - If a Prisma schema is present, the CLI offers model selection (`--schema prisma:User`)
- **Template-driven output** - Uses Handlebars templates under `templates/generate/feature`

#### Feature Structure Generation

Creates standard feature structure:

```
src/features/[feature-name]/
├── controllers/
│   └── [feature-name].controller.ts
├── procedures/
│   └── [feature-name].procedure.ts    # Generated only for schema-aware features
└── [feature-name].interfaces.ts
```

Key conventions:
- Controllers export PascalCase constants (`UserController`, `PostController`) and actions use friendly names (`List`, `Get By Id`, `Create`, `Update`, `Delete`).
- Procedures export PascalCase constants (`UserProcedure`) and return `{ UserProcedure: { services: { ... } } }` to avoid name collisions.
- Empty features generate only the controller and interface files; schema-aware providers add the procedure automatically.
- Barrel files are intentionally not created to avoid bundling contamination.

#### Standalone Controller Generation

```bash
igniter generate controller <name> --feature <feature>
```

- Works with existing features or creates a new feature structure on the fly
- Generates controller files via `templates/generate/feature/empty.controller.hbs`

#### Standalone Procedure Generation

```bash
igniter generate procedure <name> --feature <feature>
```

- Creates reusable procedure scaffolds using `templates/generate/feature/procedure.hbs`
- Ensures feature directories exist without creating barrel files
- Ideal for adding repository-style helpers without regenerating entire features

**Note:** All code generation commands operate on application features (controllers, procedures, interfaces) — not on CLI add-ons.

#### Schema Provider Architecture

- `SchemaProvider` (in `src/core/registry/schema-provider/base-schema-provider.ts`) encapsulates schema validation, option parsing, interactive prompts, and feature generation contracts.
- `SchemaProviderRegistry` (in `src/core/registry/schema-provider/schema-provider-registry.ts`) provides the builder API (`create().register(...).build()`) used to compose providers and detect availability.
- The runtime registry (`src/registry/schema-provider/index.ts`) wires built-in providers; extend it to add custom sources.
- `PrismaSchemaProvider` lives in `src/registry/schema-provider/prisma.ts` and generates fully wired controllers/procedures/interfaces from Prisma models with type-aware Zod schemas.
- `FeaturePrompts` (in `src/commands/generate/feature/prompts.ts`) centralises human prompts, while `FeatureWorkspace` provides filesystem helpers and collision checks.
- All providers honour the `--schema` and `--schema-path` CLI options and may contribute additional templates, env vars, or checks via the shared template engine abstraction.

---

## 7. Core Utilities

### 7.1. Feature Workspace Utilities

The `FeatureWorkspace` abstract class (located at `src/commands/generate/feature/feature.ts`) centralises filesystem helpers for features:

```typescript
FeatureWorkspace.root(): string
FeatureWorkspace.featureDir(name: string): string
FeatureWorkspace.ensureStructure(featureDir: string): Promise<void>
FeatureWorkspace.listFeatures(): Promise<string[]>
FeatureWorkspace.fileExists(filePath: string): Promise<boolean>
```

All generation commands rely on these helpers to normalise paths and guard against file collisions.

### 7.2. Package Manager Detection

#### Supported Package Managers
```typescript
type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

// Detection based on npm_config_user_agent environment variable
function detectPackageManager(): PackageManager

// Get installation command for package manager
function getInstallCommand(pm: PackageManager): { command: string; args: string[] }

// Resolve an executable helper for CLIs (npx/pnpx/bunx/yarn dlx)
function getPackageManagerCommand(pm: PackageManager, command?: string): string
```

The `detectPackageManager` function analyzes the `npm_config_user_agent` environment variable to determine which package manager initiated the CLI call. `getInstallCommand` returns the appropriate command/args pair for installing dependencies, while `getPackageManagerCommand` resolves the executable prefix (`npx`, `pnpx`, `bunx`, `yarn dlx`) used when invoking secondary CLIs such as Prisma, Drizzle, Better Auth, or Shadcn.

### 7.3. Framework Detection

#### Supported Frameworks

```typescript
type SupportedFramework = 'nextjs' | 'tanstack-start' | 'generic';

// Detection based on project files
function detectFramework(projectDir: string): SupportedFramework
```

### 7.4. Logger Utility

#### Structured Logging
```typescript
// logger.ts
export function createLogger(component: string): Logger

class Logger {
  info(message: string, data?: object): void
  warn(message: string, data?: object): void
  error(message: string, data?: object): void
  success(message: string, data?: object): void
}
```

The logger uses `@clack/prompts` for consistent CLI output formatting and `picocolors` for colored text. Each logger instance is associated with a component name for better debugging. Messages include timestamps and component information.

### 7.5. Template Rendering Utilities

Located in `src/core/template-engine.ts`. Provides a thin abstraction over Handlebars:

```typescript
const engine = TemplateEngine.create();
engine.resolvePath("generate", "feature", "schema.controller.hbs");
await engine.render(templatePath, context);
await engine.renderToFile(templatePath, context, outputPath);
```

Key features:

- Automatically registers custom Handlebars helpers on first use
- Searches multiple candidate directories so templates resolve both in source (`src/templates`) and packaged (`dist/templates`) environments
- Ensures output directories exist before writing files
- Used by all generation commands to render scaffolding templates safely

### 7.6. Naming Utilities

The `Casing` abstract class (`src/utils/casing.ts`) provides shared helpers for converting between kebab, camel, and Pascal cases, plus simple pluralisation. All generation logic relies on these helpers to keep export names and routes consistent.

### 7.7. Terminal Utilities

Located in `src/core/terminal.ts`:

```typescript
runCommand(command: string, options?: { cwd?: string }): Promise<{ success: boolean; errorMessage?: string }>
parseCommandOptions(record: Record<string, string | string[] | undefined>): string
```

`runCommand` wraps cross-platform child-process spawning (used by add-on post-install hooks such as Better Auth, Prisma, Drizzle, and Shadcn). `parseCommandOptions` serialises CLI option dictionaries into `--flag=value` strings when delegating to companion CLIs.

---

## 8. Build & Deployment

### 8.1. Build Configuration

#### tsup Configuration
```typescript
// tsup.config.ts
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  banner: {
    js: '#!/usr/bin/env node',  // Shebang for CLI
  },
});
```

The build configuration creates a single ESM bundle with TypeScript declarations, source maps, and a shebang for direct CLI execution. The `shims: true` option ensures compatibility with different Node.js environments.

#### TypeScript Configuration

- **Base config** - Extends `@igniter-js/typescript-config/base.json`
- **Module / resolution** - `module: NodeNext`, `moduleResolution: nodenext`
- **Target** - ES2020 with React JSX support for the Ink dashboard
- **Output directory** - `dist`, source root `src`
- **Paths** - `@/*` mapped to `./src/*`

### 8.2. NPM Package Configuration

#### Package.json Structure

```json
{
  "name": "@igniter-js/cli",
  "bin": {
    "igniter": "./dist/index.js"
  },
  "files": [
    "dist",
    "templates"
  ],
  "scripts": {
    "dev": "tsup --watch",
    "build": "tsup",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  }
}
```

### 8.3. Dependencies

#### Runtime Dependencies
- **@clack/prompts** - Interactive CLI prompts and spinners
- **commander** - CLI command framework with argument parsing
- **chokidar** - Filesystem watcher for dev mode regeneration
- **esbuild** - Bundle and compile router files for introspection
- **execa** - Process execution for package managers and git
- **handlebars** - Template engine for code generation
- **ink** - React-based CLI UI toolkit powering the dev dashboard
- **js-yaml** - YAML parsing for Docker Compose configuration
- **@mrleebo/prisma-ast** - Prisma schema parsing for CRUD scaffolding
- **picocolors** - Color utilities for CLI output
- **react** - Render target for Ink components (bundled with Ink)
- **zod** - Schema validation
- **zod-to-json-schema** - Schema conversion for OpenAPI generation

#### Development Dependencies
- **@igniter-js/eslint-config** - Shared ESLint configuration
- **@igniter-js/typescript-config** - Shared TypeScript configuration
- **@types/handlebars** - Type definitions for handlebars helpers
- **@types/js-yaml** - Type definitions for js-yaml
- **@types/react** - Type definitions for Ink components
- **tsup** - TypeScript bundler for CLI build
- **@types/node** - Node.js type definitions
- **typescript** - TypeScript compiler

---

## 9. Development Workflow

### 9.1. Local Development

#### Setup Commands

```bash
# Install dependencies
npm install

# Development mode with watch
npm run dev

# Type checking
npm run typecheck

# Build for testing
npm run build

# Test CLI locally
npm start [command]
```

#### Testing CLI Changes

```bash
# Link package globally for testing
npm link

# Test commands
igniter --help
igniter init test-project
igniter generate feature users
```

### 9.2. Adding New Add-Ons

#### Step 1: Create Add-On Class

```typescript
// src/registry/add-ons/new-addon.ts
import { BaseAddOn } from '@/core/registry/add-ons/base-addon';

export class NewAddOnAddOn extends BaseAddOn {
  name = 'New Add-On';
  description = 'Description of the add-on';
  value = 'new-addon';
  // ... implementation
}
```

#### Step 2: Register Add-On

```typescript
// src/registry/add-ons/index.ts
import { NewAddOnAddOn } from "./new-addon";

export const addOnRegistry = AddOnRegistry.create()
  .register(new NewAddOnAddOn())
  // ... other add-ons
  .build();
```

#### Step 3: Create Templates

```handlebars
<!-- templates/add-ons/new-addon/service.hbs -->
import { something } from 'somewhere';

export const {{camelCase projectName}}Service = {
  // implementation
}
```

#### Step 4: Update Registry

Add add-on to the registry list in the index file.

### 9.3. Adding New Starters

#### Step 1: Create Starter Class

```typescript
// src/registry/starters/new-starter.ts
import { BaseStarter } from '@/core/registry/starters/base-starter';

export class NewStarter extends BaseStarter {
  id = 'new-starter';
  name = 'New Framework Starter';
  description = 'Description';
  hint = 'Hint';
  repository = 'starter-new-framework';
  // ... implementation
}
```

#### Step 2: Register Starter

```typescript
// src/registry/starters/index.ts
import { NewStarter } from "./new-starter";

export const starterRegistry = StarterRegistry.create()
  .register(new NewStarter())
  // ... other starters
  .build();
```

#### Step 3: Create Templates

```
templates/starters/new-starter/
├── config-file.hbs
├── entry-point.hbs
└── framework-specific.hbs
```

---

## 10. Template Development Guidelines

### 10.1. Template Best Practices

#### Naming Conventions

- **File names** - kebab-case (`my-service.hbs`)
- **Variables** - camelCase in templates, kebab-case in CLI
- **Helpers** - descriptive names (`capitalizeSlug`, `includes`)

#### Template Structure

```handlebars
{{!-- File header with purpose --}}
{{!--
  @description Brief description of the file
  @generated by @igniter-js/cli
--}}

{{!-- Imports with conditional includes --}}
{{#if (includes enabledAddOns "store")}}
import { store } from "@/services/store"
{{/if}}

{{!-- Main implementation --}}
export const {{camelCase projectName}}Service = {
  {{!-- implementation --}}
}
```

#### Conditional Logic Patterns

```handlebars
{{!-- Feature-based includes --}}
{{#if (includes enabledAddOns "feature-name")}}
// Feature-specific code
{{/if}}

{{!-- Empty checks --}}
{{#if (isEmpty dependencies)}}
// No dependencies needed
{{/if}}

{{!-- Value existence --}}
{{#if (isDefined database)}}
// Database-specific code
{{/if}}
```

### 10.2. Template Context Usage

#### Available Variables

```handlebars
{{!-- Project information --}}
{{projectName}}           <!-- "my-awesome-project" -->
{{capitalizeSlug projectName}}  <!-- "My Awesome Project" -->

{{!-- Configuration --}}
{{starter}}              <!-- "nextjs" -->
{{packageManager}}       <!-- "npm" -->
{{database}}             <!-- "postgresql" -->
{{mode}}                 <!-- "rest" | "graphql" | "fullstack" -->

{{!-- Add-on information --}}
{{enabledAddOns}}         <!-- Array of enabled add-on values -->
{{#each enabledAddOns}}
  {{this}}               <!-- "store", "jobs", "auth", etc. -->
{{/each}}

{{!-- Add-on specific options --}}
{{addOnOptions}}         <!-- Object with selected add-on options -->
{{addOnOptions.database.provider}}    <!-- "postgresql" | "mysql" | "sqlite" -->
{{addOnOptions.database.orm}}         <!-- "prisma" | "drizzle" -->
{{addOnOptions.auth.plugins}}         <!-- ["email", "magic-link", etc.] -->
{{addOnOptions.auth.provider}}        <!-- "better-auth" -->

{{!-- Conditional examples --}}
{{#if (includes enabledAddOns "store")}}
// Store add-on is enabled
{{/if}}

{{#if (eq addOnOptions.database.provider "postgresql")}}
// PostgreSQL specific configuration
{{/if}}

{{#if (includes addOnOptions.auth.plugins "email")}}
// Email authentication is enabled
{{/if}}

{{!-- Boolean flags --}}
{{#if initGit}}
// Git enabled
{{/if}}

{{#if initDocker}}
// Docker enabled
{{/if}}

{{#if installDependencies}}
// Auto-install enabled
{{/if}}
```

---

## II. CONSUMER GUIDE (Developer Manual)

This section is for developers using the CLI. It explains how the CLI is distributed, how to apply it to real projects, and how to avoid common pitfalls.

### Distribution Anatomy (Consumption)

- **Executable**: `igniter` points to `dist/index.mjs` via the `bin` field in [packages/cli/package.json](packages/cli/package.json).
- **Templates**: `templates/` and `dist/templates` are shipped via the `files` list.
- **Runtime**: Node.js 18.17+ with ESM output; commands are executed via `node` or through your package manager.

### Quick Start & Common Patterns

```bash
# Create a new project
igniter init my-app --template nextjs --add-ons database,auth

# Generate a schema-aware feature
igniter generate feature users --schema prisma:User

# Keep OpenAPI + client schema in sync during development
igniter dev --cmd "pnpm dev"
```

### Real-World Use Case Library

1. **SaaS Platform (Next.js + Auth + Database)**
  ```bash
  igniter init saas-app --template nextjs --add-ons "database:prisma:postgresql,auth:better-auth:email+passkey"
  ```
2. **Fintech API (Express + Jobs + Telemetry)**
  ```bash
  igniter init fintech-api --template express-rest-api --add-ons jobs,telemetry
  ```
3. **Realtime Workers (Bun + Jobs + Store)**
  ```bash
  igniter init workers --template bun-rest-api --add-ons jobs,store
  ```
4. **AI Platform (Next.js + MCP + Bots)**
  ```bash
  igniter init ai-platform --template nextjs --add-ons mcp,bots
  ```
5. **Docs-First API (Deno + OpenAPI)**
  ```bash
  igniter init docs-api --template deno-rest-api
  igniter generate docs --router src/igniter.router.ts --output src/docs
  ```

### Best Practices vs Anti-Patterns

| ✅ Do | ❌ Don't |
| --- | --- |
| Pin add-on options with inline syntax for CI reproducibility. | Rely on interactive prompts inside automated pipelines. |
| Register new controllers in your router after generation. | Assume the CLI auto-registers controllers in your router. |
| Use `--schema-path` when your Prisma schema is not in `prisma/schema.prisma`. | Hardcode schema paths in templates. |

### Domain-Scoped Guidance

- **High-change APIs**: Use `igniter dev` to keep `openapi.json` and `igniter.schema.ts` in sync while iterating.
- **Automation-heavy teams**: Always pass `--template`, `--add-ons`, and `--package-manager` in CI.
- **Multiple services**: Prefer separate CLI runs per service to avoid mixing add-on assets.

## 16. Documentation & Examples

### 16.1. CLI Help System

#### Command Help Structure

```bash
igniter --help              # Main help
igniter init --help         # Command-specific help
igniter generate --help     # Subcommand help
igniter generate feature --help  # Detailed help
```

#### Help Content Guidelines

1. **Clear Descriptions** - One-line purpose for each command
2. **Usage Examples** - Practical examples for common use cases
3. **Option Documentation** - All options with types and defaults
4. **Related Commands** - Links to related functionality

### 16.2. Example Templates

#### Feature Template Example

```handlebars
{{!-- templates/add-ons/auth/better-auth/auth.hbs --}}
{{!--
  @description Better Auth configuration wired to the selected database adapter and plugins
  @generated by @igniter-js/cli
--}}

import { betterAuth } from "better-auth"
import { database } from "@/lib/database"
{{#if (eq addOnOptions.database.orm "prisma")}}
import { prismaAdapter } from "better-auth/adapters/prisma";
{{/if}}
{{#if (eq addOnOptions.database.orm "drizzle")}}
import { drizzleAdapter } from "better-auth/adapters/drizzle";
{{/if}}
{{{generatePluginImports addOnOptions.auth.plugins}}}

export const auth = betterAuth({
  appName: process.env.IGNITER_APP_NAME,
  appSecret: process.env.IGNITER_APP_SECRET,
  baseURL: process.env.IGNITER_API_URL,
  basePath: process.env.IGNITER_API_BASE_PATH,

  {{#if addOnOptions.database.orm}}
  database: {{#if (eq addOnOptions.database.orm "prisma")}}prismaAdapter{{/if}}{{#if (eq addOnOptions.database.orm "drizzle")}}drizzleAdapter{{/if}}(database, {
    provider: "{{addOnOptions.database.provider}}",
  }),
  {{/if}}

  emailAndPassword: {
    enabled: true,
  },

  {{#if addOnOptions.auth.plugins}}
  plugins: [
    {{#each addOnOptions.auth.plugins}}
    {{camelCase this}}(){{#unless @last}},{{/unless}}
    {{/each}}
  ]
  {{/if}}
})
```

#### Starter Template Example

```handlebars
{{!-- templates/starters/nextjs/route-handler.hbs --}}
{{!--
  @description Next.js App Router route handler for Igniter.js
  @framework: nextjs
--}}

import { igniter } from '@/igniter'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

{{#if (includes enabledAddOns "logging")}}
import { logger } from '@/services/logger'
{{/if}}

/**
 * API route handler that forwards requests to Igniter.js router
 */
export async function GET(request: NextRequest) {
  return handleRequest(request)
}

export async function POST(request: NextRequest) {
  return handleRequest(request)
}

export async function PUT(request: NextRequest) {
  return handleRequest(request)
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request)
}

export async function PATCH(request: NextRequest) {
  return handleRequest(request)
}

async function handleRequest(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url)
    const method = request.method
    const headers = Object.fromEntries(request.headers)
    const query = Object.fromEntries(url.searchParams)

    let body = null
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        body = await request.json()
      } catch {
        body = undefined
      }
    }

    const result = await igniter.handle({
      path: url.pathname.replace('/api/v1', ''),
      method: method as any,
      headers,
      query,
      body,
    })

    {{#if (includes enabledAddOns "logging")}}
    logger.info('API request processed', {
      method,
      path: url.pathname,
      status: result.status,
    })
    {{/if}}

    return NextResponse.json(result.body, {
      status: result.status,
      headers: result.headers,
    })
  } catch (error) {
    {{#if (includes enabledAddOns "logging")}}
    logger.error('API request failed', error)
    {{/if}}

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
```

---

## 17. Migration & Upgrade Guide

### 17.1. Version Migration

#### Breaking Changes Pattern

```typescript
// Version compatibility matrix
const COMPATIBILITY_MATRIX = {
  '0.1.x': {
    compatibleStarters: ['nextjs', 'express'],
    deprecatedFeatures: ['old-feature'],
    requiredMigrations: ['update-template-structure'],
  },
  '0.2.x': {
    compatibleStarters: ['nextjs', 'express', 'tanstack-start'],
    newFeatures: ['mcp', 'telemetry'],
    requiredMigrations: [],
  },
};
```

#### Migration Scripts

```typescript
// Automatic migration helpers
export async function migrateProject(projectDir: string, fromVersion: string, toVersion: string): Promise<void> {
  const migrations = getRequiredMigrations(fromVersion, toVersion);

  for (const migration of migrations) {
    await migration.execute(projectDir);
    logger.info(`Applied migration: ${migration.name}`);
  }
}
```

### 17.2. Template Migration

#### Template Versioning

```handlebars
{{!-- Template version marker --}}
{{!-- @template-version: 2.0 --}}
{{!-- @requires-cli-version: >=0.2.0 --}}

{{!-- Version-specific logic --}}
{{#if (gte templateVersion "2.0")}}
// New template structure
{{else}}
// Legacy template structure
{{/if}}
```

---

## III. TECHNICAL REFERENCE & RESILIENCE

### 12. Exhaustive API Reference

| Command | Purpose | Key Options |
| --- | --- | --- |
| `igniter init` | Scaffold a project or install into an existing folder. | `--mode`, `--package-manager`, `--template`, `--add-ons`, `--database`, `--no-git`, `--no-install`, `--no-docker` |
| `igniter generate feature` | Create a new feature module. | `--schema`, `--schema-path` |
| `igniter generate controller` | Add a controller to a feature. | `--feature` |
| `igniter generate procedure` | Add a procedure to a feature. | `--feature` |
| `igniter generate docs` | Generate OpenAPI 3.0 docs. | `--router`, `--output` |
| `igniter generate schema` | Generate client schema output. | `--router`, `--output` |
| `igniter generate caller` | Build caller schemas from OpenAPI 3.x. | `--name`, `--url`, `--path`, `--output` |
| `igniter dev` | Watch mode with schema/docs regeneration. | `--router`, `--output`, `--docs-output`, `--cmd` |

### 13. Telemetry & Observability Registry

The CLI does not emit telemetry events. Observability is handled through structured logs in the Ink UI:

- **Log types:** `info`, `success`, `warn`, `error`
- **Streams:** Igniter logs (generation + watcher), Application logs (dev server)

### 14. Troubleshooting & Error Code Library

#### "Project initialization failed"
- **Context:** `igniter init` error in prompts, generator, or filesystem.
- **Cause:** Validation or runtime error during scaffolding.
- **Mitigation:** Run in a clean directory and ensure Git/Docker/Node are available.
- **Solution:** Re-run `igniter init` with verbose shell output and review the error above.

#### "Starter not found"
- **Context:** Starter ID not registered.
- **Cause:** Invalid `--template` value or registry mismatch.
- **Mitigation:** Use a registered starter ID (`nextjs`, `tanstack-start`, `express-rest-api`, `bun-rest-api`, `bun-react-app`, `deno-rest-api`).
- **Solution:** Re-run with a valid `--template`.

#### "Router file not found: <path>"
- **Context:** `igniter dev` cannot resolve the router path.
- **Cause:** Missing or renamed router file.
- **Mitigation:** Keep `src/igniter.router.ts` or pass `--router`.
- **Solution:** Provide the correct router path.

#### "Router not found at: <path>"
- **Context:** `igniter generate docs` could not load the router module.
- **Cause:** Path typo or compile error in router.
- **Mitigation:** Build the project or fix TypeScript errors.
- **Solution:** Fix router build errors and retry.

#### "Router does not have docs configuration"
- **Context:** OpenAPI generation.
- **Cause:** `router.config.docs` missing.
- **Mitigation:** Add docs configuration to the router.
- **Solution:** Define `docs` in your router config and re-run.

#### "Failed to generate schema: <message>"
- **Context:** Schema generation failed.
- **Cause:** Router compilation errors or invalid exports.
- **Mitigation:** Ensure router exports `AppRouter` or default export.
- **Solution:** Fix compilation issues and rerun `igniter generate schema`.

#### "No registered schema provider can handle '<value>'"
- **Context:** `igniter generate feature --schema ...`.
- **Cause:** Unknown provider prefix.
- **Mitigation:** Use `prisma:` or register a provider.
- **Solution:** Update the schema option or register provider in `src/registry/schema-provider/index.ts`.

#### "Schema provider '<value>' is not registered."
- **Context:** Interactive schema provider selection.
- **Cause:** Provider not registered in the registry.
- **Mitigation:** Ensure provider exists and is registered.
- **Solution:** Register the provider and retry.

#### "Feature '<slug>' already exists ..."
- **Context:** Generating a feature with an existing slug.
- **Cause:** Feature directory already exists.
- **Mitigation:** Choose a new feature name or delete the folder.
- **Solution:** Re-run with a unique feature slug.

#### "Controller '<slug>' already exists ..."
- **Context:** Generating a controller in an existing feature.
- **Cause:** File collision.
- **Mitigation:** Rename the controller or remove the existing file.
- **Solution:** Re-run with a unique name.

#### "Procedure '<slug>' already exists ..."
- **Context:** Generating a procedure in an existing feature.
- **Cause:** File collision.
- **Mitigation:** Rename the procedure or remove the existing file.
- **Solution:** Re-run with a unique name.

#### "Use either --url or --path, not both."
- **Context:** Caller generation.
- **Cause:** Both inputs provided.
- **Mitigation:** Provide only one input source.
- **Solution:** Re-run with `--url` or `--path`.

#### "Only OpenAPI 3.x documents are supported."
- **Context:** Caller generation.
- **Cause:** Spec is OpenAPI 2.x.
- **Mitigation:** Upgrade the spec to 3.x.
- **Solution:** Convert the document and rerun.

#### "Could not parse OpenAPI document (JSON/YAML)."
- **Context:** Caller generation.
- **Cause:** Invalid JSON/YAML.
- **Mitigation:** Validate the file.
- **Solution:** Fix syntax errors and retry.

#### "Module was compiled and loaded, but no valid Igniter router export was found."
- **Context:** Router introspection.
- **Cause:** Router module does not export `AppRouter` or default export.
- **Mitigation:** Export `AppRouter` in the router module.
- **Solution:** Update the router exports and retry.

## 18. Troubleshooting Guide

### 18.1. Common Issues

#### Issue: Template Not Found

**Symptoms:** Error loading template files
**Causes:** Incorrect path resolution in feature/starter classes
**Solution:** Use absolute paths with `path.resolve(process.cwd(), 'templates/...')`

#### Issue: Router Loading Fails

**Symptoms:** Cannot load user's Igniter router
**Causes:** Missing dependencies in esbuild externals
**Solution:** Add missing packages to `external` array in `RouterInstrospector`

#### Issue: Handlebars Compilation Error

**Symptoms:** Template rendering fails
**Causes:** Invalid Handlebars syntax or missing helpers
**Solution:** Validate template syntax and ensure helpers are registered

#### Issue: Add-On Options Not Working

**Symptoms:** Interactive options not showing or values not passed to templates
**Causes:** Missing `options` property or incorrect `key` references
**Solution:** 
```typescript
// Ensure options are properly defined
options = [
  {
    key: 'database',  // This key becomes available in templates as addOnOptions.database
    message: 'Choose database',
    multiple: false,
    required: true,
    choices: [/* ... */]
  }
]
```

#### Issue: Add-On Assets Not Merged

**Symptoms:** Dependencies, env vars, or templates from choices not being added
**Causes:** Missing asset properties in choices or incorrect option selection
**Solution:** Ensure choices have the required assets:
```typescript
choices: [
  {
    value: 'postgresql',
    label: 'PostgreSQL',
    dependencies: [/* Must include this */],
    envVars: [/* Must include this */],
    dockerServices: [/* Must include this */],
    templates: [/* Must include this */]
  }
]
```

#### Issue: Docker Services Not Added

**Symptoms:** Services not appearing in docker-compose.yml
**Causes:** Incorrect service definition or missing environment variable placeholders
**Solution:** Check service format and placeholder syntax:
```typescript
dockerServices: [
  {
    name: 'postgres',
    image: 'postgres:16-alpine',
    environment: {
      POSTGRES_PASSWORD: '${POSTGRES_PASSWORD}',  // Must use ${VAR} format
      POSTGRES_DB: '${POSTGRES_DB}'
    }
  }
]
```

#### Issue: Environment Variables Duplicate

**Symptoms:** Same env var added multiple times to .env
**Causes:** Base class and choice both define same env var
**Solution:** BaseAddOn automatically prevents duplicates, but ensure unique keys:
```typescript
// Base class
envVars = [{ key: 'REDIS_URL', value: 'redis://localhost:6379' }]

// Choice - avoid using same key
envVars: [{ key: 'REDIS_HOST', value: 'localhost' }]  // Different key
```

#### Issue: Template Functions Not Working

**Symptoms:** Dynamic template paths returning undefined
**Causes:** Function not returning value or incorrect data access
**Solution:** Ensure functions always return valid paths:
```typescript
template: (data: ProjectSetupConfig) => {
  const templates = {
    nextjs: path.resolve(process.cwd(), 'templates/addon/nextjs.hbs'),
    express: path.resolve(process.cwd(), 'templates/addon/express.hbs')
  };
  
  // Always return something
  return templates[data.starter as keyof typeof templates] || templates.nextjs;
}
```

#### Issue: Setup Functions Not Executed

**Symptoms:** Custom setup logic not running
**Causes:** Missing `setup` property or incorrect async/await usage
**Solution:** Ensure setup functions are properly defined:
```typescript
options: [
  {
    key: 'database',
    setup: async (projectDir: string, config: ProjectSetupConfig) => {
      // Must be async and properly implemented
      console.log('Setting up database...');
      // Custom logic here
    }
  }
]
```

#### Issue: Git Initialization Fails

**Symptoms:** Git repo not created
**Causes:** Git not installed or permission issues
**Solution:** Check Git installation and directory permissions

### 18.2. Debug Commands

#### CLI Debugging

```bash
# Enable all debug logs
DEBUG=igniter:* igniter [command]

# Specific category debugging
DEBUG=igniter:templates igniter generate feature users
DEBUG=igniter:registry igniter init my-project

# Add-on specific debugging
DEBUG=igniter:addons igniter init my-project
DEBUG=igniter:setup igniter init my-project --add-ons database,auth
```

#### Add-On Debugging

```bash
# Check add-on registration
npx igniter --help | grep "add-ons"

# Test specific add-on
igniter init test-project --add-ons store --no-git --no-install
cd test-project
cat package.json  # Check dependencies
cat .env          # Check environment variables
cat docker-compose.yml  # Check Docker services

# Validate template rendering
DEBUG=igniter:templates igniter init test-project --add-ons auth
```

#### Common Debug Commands

```bash
# List available add-ons
igniter --help

# Check template paths
find templates/add-ons -name "*.hbs" | head -10

# Validate add-on syntax
npm run build  # Should catch TypeScript errors
npm run typecheck  # Should catch type errors

# Test specific starter combination
igniter init test-project --starter nextjs --add-ons database,auth,store
```
DEBUG=igniter:router igniter generate docs
```

#### Project Validation

```bash
# Validate generated project structure
igniter validate --project ./my-project

# Check template syntax
igniter validate --template templates/features/store

# Test registry configuration
igniter validate --registry
```

---

## 19. Best Practices & Guidelines

### 19.1. Code Quality

#### TypeScript Best Practices

1. **Strict Typing** - Use strict TypeScript configuration
2. **No Any Types** - Avoid `any` in public APIs
3. **Interface Segregation** - Small, focused interfaces
4. **Error Handling** - Proper error types and handling
5. **Async/Await** - Prefer async/await over Promises

#### Code Organization

```typescript
// Preferred structure
export class ClassName {
  // 1. Public properties
  public property: Type;

  // 2. Private properties
  private _internal: Type;

  // 3. Constructor
  constructor() {
    // initialization
  }

  // 4. Public methods
  public method(): ReturnType {
    // implementation
  }

  // 5. Private methods
  private _helper(): void {
    // implementation
  }
}
```

### 19.2. Template Best Practices

#### Template Structure Guidelines

1. **Clear Headers** - Always include purpose and generation notice
2. **Conditional Logic** - Use helpers for complex conditions
3. **Consistent Formatting** - Follow project formatting rules
4. **Documentation** - Include @description and @see references
5. **Error Handling** - Gracefully handle missing variables

#### Template Performance

```handlebars
{{!-- Cache expensive operations --}}
{{#unless (isDefined cachedData)}}
  {{set "cachedData" (expensiveOperation context)}}
{{/unless}}

{{!-- Use partials for repeated content --}}
{{> feature-partial data}}

{{!-- Minimize nested conditionals --}}
{{#if (and condition1 condition2)}}
  {{#if condition3}}
    <!-- content -->
  {{/if}}
{{/if}}
```

### 19.3. CLI/UX Best Practices

#### User Experience Guidelines

1. **Clear Progress Indicators** - Use @clack/prompts for feedback
2. **Helpful Error Messages** - Provide actionable error information
3. **Sensible Defaults** - Choose smart defaults for all options
4. **Confirmation Prompts** - Ask before destructive operations
5. **Consistent Interface** - Maintain uniform interaction patterns

#### Command Design

```typescript
// Good command design
.command('feature <name>')
.description('Create a new feature module')
.option('--schema <value>', 'Generate from schema provider')
.option('--force', 'Overwrite existing files')
.action(async (name, options) => {
  // Validate input
  if (!name) {
    throw new Error('Feature name is required');
  }

  // Confirm destructive actions
  if (options.force || await confirmOverwrite()) {
    await generateFeature(name, options);
  }
});
```

---

#### Quick Reference

### 20.1. Command Reference
#### Init Command
```bash
igniter init [project-name] [options]

Options:
  --mode <mode>              install | new-project (default: new-project)
  --pm, --package-manager    npm | yarn | pnpm | bun
  --template <template>      Specific starter template (nextjs, express-rest-api, etc.)
  --add-ons <add-ons>        Comma-separated add-ons (store,jobs,mcp,logging,telemetry,bots,database,auth,shadcn-ui)
  --database <database>      postgresql | mysql | sqlite | none (when not using interactive prompts)
  --no-git                  Skip git initialization
  --no-install              Skip dependency installation
  --no-docker               Skip Docker setup
```

#### Generate Commands

```bash
# Feature generation
igniter generate feature [name] [--schema <provider:model>] [--schema-path <path>]

# Controller generation
igniter generate controller <name> --feature <feature>

# Procedure generation
igniter generate procedure <name> --feature <feature>

# Documentation generation
igniter generate docs [--router <path>] [--output <dir>]

# Schema generation
igniter generate schema [--router <path>] [--output <path>]

# Caller generation
igniter generate caller [--name <name>] [--url <url> | --path <path>] [--output <dir>]

# Development mode
igniter dev [--router <path>] [--output <path>] [--docs-output <dir>] [--cmd "<custom dev command>"]
```

### 20.2. Template Helpers

#### Available Helpers

```handlebars
{{includes array "value"}}     // boolean: array.includes(value)
{{isEmpty array}}               // boolean: array.length === 0
{{isDefined value}}             // boolean: value !== null && value !== undefined
{{join array ", "}}             // string: array.join(separator)
{{capitalizeSlug "my-project"}} // string: "My Project"

{{!-- Template context variables --}}
{{enabledAddOns}}               // Array of enabled add-on identifiers
{{#if (includes enabledAddOns "store")}}  // Check for specific add-on
```

#### Context Variables

```typescript
{
  projectName: string,
  mode: 'install' | 'new-project',
  starter: string,
  addOns: string[],           // NEW: Array of enabled add-ons
  features?: string[],          // Legacy: backward compatibility
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun',
  database: 'postgresql' | 'mysql' | 'sqlite' | 'none',
  initGit: boolean,
  initDocker: boolean,
  installDependencies: boolean,
}
```

### 20.3. Registry Patterns

#### Add-On Class Template

```typescript
export class AddOnNameAddOn extends BaseAddOn {
  // === REQUIRED PROPERTIES ===
  name = 'Display Name';           // Human-readable name shown in CLI
  description = 'Human description';  // Description shown in help
  value = 'addon-key';             // Unique identifier used in CLI options

  // === OPTIONAL PROPERTIES ===
  hint = 'Optional hint';           // Optional hint shown during selection

  // === ASSET DEFINITIONS (Optional) ===
  templates = [/* template definitions */];
  dependencies = [/* dependency definitions */];
  dockerServices = [/* service definitions */];
  envVars = [/* env var definitions */];
  
  // === INTERACTIVE CONFIGURATION (Optional) ===
  options = [/* option definitions */];
  
  // === CUSTOM SETUP (Optional) ===
  public async runSetup(projectDir: string, config: ProjectSetupConfig): Promise<void> {
    await super.runSetup(projectDir, config);
    // Custom logic here...
  }
}
```

#### Starter Class Template

```typescript
export class FrameworkStarter extends BaseStarter {
  id = 'starter-id';
  name = 'Display Name';
  description = 'Description';
  hint = 'Hint';
  repository = 'starter-template-name';

  templates = [/* template definitions */];
  dependencies = [/* dependency definitions */];
  envVars = [/* env var definitions */];
}
```

### 20.4. File Structure Patterns

#### Add-On Template Structure

```
templates/add-ons/[addon]/
├── service.hbs           # Main service implementation
├── config.hbs            # Configuration files
├── types.hbs             # Type definitions
└── README.md.hbs         # Documentation
```

#### Starter Template Structure

```
templates/starters/[starter]/
├── entry-point.hbs       # Application entry point
├── config.hbs            # Framework configuration
├── middleware.hbs        # Custom middleware
└── deployment.hbs        # Deployment configuration
```

#### Add-On File Structure

```
src/registry/add-ons/
├── index.ts              # Main registry file
├── auth.ts               # Authentication add-on
├── bots.ts               # Bots add-on
├── database.ts           # Database add-on
├── jobs.ts               # Jobs add-on
├── logging.ts            # Logging add-on
├── mcp.ts                # MCP Server add-on
├── shadcn.ts             # Shadcn/UI add-on
├── store.ts              # Store add-on
└── telemetry.ts          # Telemetry add-on
```

#### BaseAddOn Type Reference

All BaseAddOn properties use typed interfaces from `@/registry/types`:

```typescript
// === CORE INTERFACES ===

interface RegistryAssetDependency {
  name: string;                    // Package name
  version: string;                 // Version specification
  type: 'dependency' | 'devDependency' | string;  // Dependency type
}

interface RegistryAssetTemplate {
  template: string | ((data: ProjectSetupConfig) => string);  // Template path or function
  outputPath: string | ((data: ProjectSetupConfig) => string); // Output path or function
}

interface RegistryAssetEnvVar {
  key: string;                     // Environment variable key
  value: string;                   // Default value
  description: string;             // Description for .env comments
}

interface RegistryAssetDockerService {
  name: string;                    // Service name
  image: string;                   // Docker image
  ports: string[];                 // Port mappings
  environment: Record<string, string>; // Env vars (supports ${VAR} placeholders)
  volumes: string[];               // Volume mounts
}

// === OPTION INTERFACES ===

interface AddOnOption {
  key: string;                     // Option identifier
  message: string;                  // User prompt message
  multiple: boolean;                // Allow multiple selections?
  required?: boolean;               // Required option?
  defaultValue?: string;             // Default value
  choices: AddOnChoice[];           // Available choices
  setup?: (projectDir: string, config: ProjectSetupConfig) => Promise<void>; // Custom setup
}

interface AddOnChoice {
  value: string;                   // Choice value (used in templates)
  label: string;                   // Human-readable label
  hint?: string;                   // Optional hint
  templates?: RegistryAssetTemplate[];    // Choice-specific templates
  dependencies?: RegistryAssetDependency[]; // Choice-specific dependencies
  envVars?: RegistryAssetEnvVar[];       // Choice-specific env vars
  dockerServices?: RegistryAssetDockerService[]; // Choice-specific Docker services
  subOptions?: AddOnOption[];       // Nested options
}
```

**Usage Examples:**

```typescript
// Using typed dependencies
dependencies: [
  {
    name: '@igniter-js/adapter-redis',
    version: '^1.0.0',
    type: 'dependency'
  },
  {
    name: '@types/ioredis',
    version: '^4.28.10',
    type: 'devDependency'
  }
]

// Using typed templates
templates: [
  {
    template: (data) => {
      const templates = {
        nextjs: 'templates/addon/nextjs.hbs',
        express: 'templates/addon/express.hbs'
      };
      return templates[data.starter];
    },
    outputPath: (data) => {
      const paths = {
        nextjs: 'src/app/api/addon/route.ts',
        express: 'src/middleware/addon.ts'
      };
      return paths[data.starter];
    }
  }
]

// Using typed Docker services
dockerServices: [
  {
    name: 'redis',
    image: 'redis:7-alpine',
    ports: ['6379:6379'],
    environment: {
      REDIS_PASSWORD: '${REDIS_PASSWORD}', // Placeholder will be replaced
      REDIS_DB: 'igniter'
    },
    volumes: ['redis_data:/data']
  }
]
```

---

## 21. Future Roadmap

### 21.1. Planned Features

#### CLI Enhancements

1. **Interactive Mode** - Full interactive project setup
2. **Plugin System** - Official plugin architecture
3. **Template Marketplace** - Community template sharing
4. **Project Templates** - Pre-configured project types
5. **Configuration Management** - Global CLI configuration

#### Generation Improvements

1. **AI-Assisted Generation** - AI-powered code generation
2. **Schema Evolution** - Automatic migration generation
3. **Component Library** - Reusable UI component generation
4. **API Client Generation** - TypeScript client generation
5. **Testing Generation** - Automatic test generation

### 21.2. Architecture Evolution

#### Next-Gen Features

1. **Distributed Templates** - Template loading from remote sources
2. **Real-time Updates** - Live template updates
3. **Performance Monitoring** - Built-in performance tracking
4. **Multi-language Support** - Internationalized CLI
5. **Visual Interface** - Web-based project setup

---

## 22. Contributing Guidelines

### 22.1. Development Setup

#### Prerequisites

- Node.js 18+
- TypeScript 5.0+
- Git
- Docker (for testing)

#### Setup Process

```bash
# Clone repository
git clone https://github.com/felipebarcelospro/igniter-js.git
cd igniter-js/packages/cli

# Install dependencies
npm install

# Setup development environment
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### 22.2. Contribution Workflow
#### Feature Development
1. **Create Feature Branch** - `git checkout -b feature/new-feature`
2. **Implement Add-On** - Follow existing patterns in BaseAddOn and BaseStarter
3. **Add Tests** - Test template rendering and CLI integration
4. **Update Registry** - Add new add-on/starter to respective registry index files
5. **Submit PR** - Include description, testing steps, and template examples

#### Template Development
1. **Template Structure** - Follow template naming conventions (`.hbs` extension)
2. **Handlebars Helpers** - Use custom helpers: `includes`, `isEmpty`, `isDefined`, `join`, `capitalizeSlug`
3. **Context Variables** - Leverage available context: projectName, starter, features, packageManager, etc.
4. **Framework-Specific** - Create framework-specific templates when needed (nextjs/, tanstack-start/)
5. **Test Templates** - Verify with different starter/feature combinations
6. **Documentation** - Include @description and @see comments in templates

#### Core Module Changes
1. **Command Updates** - Follow patterns in `src/commands/` with index.ts, action.ts, generator.ts structure
2. **Core Utilities** - Update logger, file-system, and other core utilities with consistent patterns
3. **Registry Changes** - Ensure backward compatibility when modifying BaseAddOn/BaseStarter
4. **Type Safety** - Maintain strict TypeScript typing throughout the codebase

---

## Changelog

### v1.0 (2025-01-01)
- **Initial Release** - Complete CLI implementation
- **Registry System** - Add-on and starter registries
- **Template Engine** - Handlebars-based templating
- **Code Generation** - Router introspection and generation
- **Documentation** - Comprehensive developer documentation

### Future Updates
- Template marketplace integration
- Plugin system
- AI-assisted generation
- Performance improvements

---
## 23. DOCUMENTATION MAINTENANCE REQUIREMENTS ⚠️

### 23.1. MANDATORY UPDATES - CRITICAL ⚠️

You **MUST** update this AGENTS.md file after **ANY** of these changes:

#### 🚨 **IMMEDIATE UPDATES REQUIRED:**

1. **New Commands Added**
   - Add to `src/commands/` tree structure
   - Update command references in sections 3, 12, 20
   - Document new options and parameters

2. **New Add-Ons Added**
   - Add to `src/registry/add-ons/` tree structure
   - Update add-ons table in section 4.2
   - Add to available add-ons list in section 20
   - Document dependencies and templates

3. **New Starters Added**
   - Add to `src/registry/starters/` tree structure
   - Update starters table in section 4.3
   - Add to available starters list in section 20
   - Document framework-specific templates

4. **New Templates Created**
   - Add to `templates/` tree structure (features/, scaffold/, starters/)
   - Document new template patterns in section 10
   - Update template context variables if changed

5. **Core Files Modified**
   - Update `src/core/` tree structure
   - Document new utilities in section 7
   - Update interfaces and type definitions

6. **File Structure Changes**
   - **ALWAYS** keep the complete tree structure in section 2 accurate
   - Include ALL files, no exceptions
   - Maintain exact directory hierarchy

🔄 **UPDATE PROCESS:**

For **EVERY** code change:

```bash
# 1. List all files in modified directories
find src/ -type f -name "*.ts" | sort

# 2. Update tree structure in section 2
# 3. Update relevant tables and references
# 4. Add new patterns if introduced
# 5. Update version and changelog
```

**SPECIAL ATTENTION:**
- Features → Add-ons terminology consistency
- Template paths: `templates/features/` → `templates/add-ons/`
- Registry paths: `src/registry/features/` → `src/registry/add-ons/`
- Template variables: `enabledFeatures` → `enabledAddOns`

### 23.2. VALIDATION CHECKLIST ✅

After updating documentation, **MUST** verify:

- [ ] Tree structure matches actual files 100%
- [ ] All new commands are documented
- [ ] All new features are in tables
- [ ] All new starters are listed
- [ ] All new templates are mapped
- [ ] Cross-references are updated
- [ ] Version numbers are current
- [ ] Examples still work

### 23.3. AUTOMATION REQUIREMENTS 🤖

When adding new add-ons/starters:

```typescript
// MUST follow this pattern for discovery:
// 1. Add to registry index.ts
// 2. Create implementation file
// 3. Update documentation tree
// 4. Add to tables
```

**IMPORTANT:**
- New CLI extensions use `BaseAddOn` class
- Templates go in `templates/add-ons/[addon]/`
- Import from `@/core/registry/add-ons/base-addon.ts`

When creating new templates:

```handlebars
{{!-- MUST include generation comment --}}
{{!-- @generated by @igniter-js/cli --}}
{{!-- @description Brief description --}}
```

### 23.4. CONSEQUENCES ⚡

**FAILURE TO MAINTAIN DOCUMENTATION:**

- Feature discovery breaks
- CLI help becomes inaccurate
- Template generation fails
- Developer experience degrades
- Bug reports increase

**SUCCESSFUL MAINTENANCE:**

- Zero manual discovery needed
- Perfect CLI accuracy
- Reliable template generation
- Excellent developer experience
- Reduced support burden

### 23.5. QUALITY GATES 🚪

Before **ANY** commit:

1. **Tree Accuracy Check**
   ```bash
   # Verify tree structure matches reality
   diff <(tree src/ -I node_modules) AGENTS.md
   ```

2. **Table Completeness Check**
   - Every add-on in registry = entry in table
   - Every starter in registry = entry in table
   - No orphaned implementations

3. **Reference Consistency Check**
   - All command names match
   - All option names accurate (`--add-ons` instead of `--features`)
   - All file paths correct
   - Template variables consistent (`enabledAddOns`)

---

## 24. Changelog
### v1.4 (2025-12-23)
- **✨ Caller schema builder output** - `igniter generate caller` now emits IgniterCallerSchema builders with registry refs, `$Infer` helpers, and derived types

### v1.3 (2025-12-13)
- **🆕 Caller generator** - Added `igniter generate caller` to build Zod schemas from OpenAPI 3 specs and emit ready-to-use IgniterCaller instances (`schema.ts` + `index.ts`)
- **🧰 OpenAPI ingestion** - Support JSON/YAML, remote fetch or local path, `$ref` resolution via swagger-parser, and sensible defaults for output folder (`src/callers/<hostname>`)
- **📖 Documentation** - Updated command references, tree structure, and examples to cover the new generator
- **📦 Dependencies** - Added `@apidevtools/swagger-parser` and `openapi-types` for OpenAPI processing


### v1.2 (2025-11-12)
- **🆕 Dev workflow** - Documented the `igniter dev` command, Ink dashboard shortcuts, chokidar debounce strategy, and default package-manager-aware boot commands
- **📦 Add-on catalogue refresh** - Captured database/auth/shadcn option trees, dependencies, Docker assets, and env vars; updated template examples to match current Handlebars sources
- **🧠 Schema providers** - Added coverage for the `src/core/registry/schema-provider` architecture and Prisma generator responsibilities
- **⚙️ Build & deps** - Clarified ESM bundling, NodeNext TypeScript config, and new runtime dependencies (`chokidar`, `ink`, `react`)
- **📘 Reference updates** - Synced command flags (`--add-ons`) and quick reference material with current CLI behaviour

### v1.1 (2025-01-01)
- **🔄 MAJOR REFACTORING** - Features → Add-ons terminology
  - Changed CLI options: `--features` → `--add-ons`
  - Updated interface prompts: "features" → "add-ons"
  - Renamed registry: `FeatureRegistry` → `AddOnRegistry`
  - Updated base classes: `BaseFeature` → `BaseAddOn`
  - Modified template variables: `enabledFeatures` → `enabledAddOns`
  - Renamed directories: `src/registry/features/` → `src/registry/add-ons/`
  - Updated all add-on implementations to use new terminology
- **🔄 BACKWARD COMPATIBILITY** - Maintained legacy type aliases and exports
  - `type BaseFeature = BaseAddOn` for existing code compatibility
  - `type FeatureRegistry = AddOnRegistry` for external compatibility
  - Legacy exports in registry for smooth migration
- **🔄 TEMPLATE UPDATES** - Updated all Handlebars templates
  - Changed conditional helpers to use `enabledAddOns`
  - Maintained both `enabledAddOns` and `enabledFeatures` in template context
- **📚 DOCUMENTATION** - Updated all references throughout codebase
  - Updated AGENTS.md with new terminology and structure
  - Added migration notes and backward compatibility information
- **✅ QUALITY IMPROVEMENTS** - Clarified tsup configuration and ensured CLI bundles ship with shebang-compatible ESM output

### v1.0 (Previous)
- Initial release with complete CLI implementation
- Registry system for add-ons and starters
- Template engine with Handlebars
- Code generation and router introspection

---

**Remember:** This AGENTS.md is your primary reference for maintaining @igniter-js/cli. Follow these guidelines consistently, test thoroughly before releases, and prioritize developer experience in all changes.

**🚨 CRITICAL: ALWAYS UPDATE DOCUMENTATION FIRST** - Before committing code, update this AGENTS.md file. Documentation accuracy is non-negotiable.

**Always test template changes thoroughly** - A single template error can break entire project generation. Test with multiple configurations and edge cases before merging.

**📋 NEVER SKIP DOCUMENTATION UPDATES** - This is the single most important maintenance task. Incomplete documentation makes the entire CLI unusable.

**🔄 MIGRATION NOTES** - When updating existing projects:
- Replace `--features` with `--add-ons` in CLI calls
- Update templates to use `enabledAddOns` instead of `enabledFeatures`
- All existing functionality preserved through backward compatibility
