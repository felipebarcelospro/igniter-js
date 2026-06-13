# @igniter-js/logger

<p align="center">
  <a href="https://www.npmjs.com/package/@igniter-js/logger"><img src="https://img.shields.io/npm/v/@igniter-js/logger?color=blue" alt="npm version"></a>
  <a href="https://github.com/felipebarcelospro/igniter-js/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@igniter-js/logger" alt="license"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0%2B-blue" alt="TypeScript"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/runtime-Node.js-green" alt="runtime"></a>
</p>

**High-performance, structured logging for Node.js applications.** Built on [Pino](https://getpino.io/) (5-10x faster than alternatives), wrapped in an ergonomic Igniter.js builder API.

→ [Quick Start](#quick-start) · [API Reference](#api-reference) · [Examples](./examples/) · [AGENTS.md](./AGENTS.md)

## Why @igniter-js/logger

Logging shouldn't leak infrastructure details into your application code. `@igniter-js/logger` gives you:

- ✅ **Zero Pino API exposure** — Work entirely with Igniter abstractions; no raw Pino import needed
- ✅ **Blazing fast** — Pino is the fastest Node.js logger; you get all that speed with a clean interface
- ✅ **Built-in transports** — Console (pretty), File (with rotation), HTTP (async batching) out of the box
- ✅ **External transport support** — Use any Pino-compatible transport (pino-pretty, @logtail/pino, Datadog, etc.)
- ✅ **Type-safe child loggers** — Scoped context with full TypeScript type inference via `defineScopes<T>()`
- ✅ **Pretty dev logging** — Colorized, human-readable console output by default; no config needed
- ✅ **Production-ready** — File rotation, batch flushing, remote HTTP ingestion with retry
- ✅ **Server-only safety** — Protected from accidental browser imports with a descriptive error shim
- ✅ **Consistent structure** — Same builder pattern as all Igniter.js packages; zero learning curve

## Installation

```bash
npm install @igniter-js/logger
```

```bash
pnpm add @igniter-js/logger
```

```bash
yarn add @igniter-js/logger
```

```bash
bun add @igniter-js/logger
```

## Quick Start

In under 60 seconds, you have a fully configured logger:

```typescript
import { IgniterLogger, IgniterLogLevel } from "@igniter-js/logger";

// Create a logger — defaults to pretty console output
const logger = IgniterLogger.create()
  .withAppName("my-api")
  .withComponent("bootstrap")
  .withLevel(IgniterLogLevel.Info)
  .withContext({ env: "production", version: "1.0.0" })
  .build();

// Use it anywhere
logger.info("Server started", { port: 3000 });
logger.warn("Using in-memory cache");
logger.error("Connection failed", new Error("timeout"));
logger.success("Bootstrap complete");
```

✅ **Success check:** You should see colorized, timestamped log output in your terminal. That's it — no extra config files, no Pino imports.

## Core Concepts

```
┌─────────────────────────────────────────────────┐
│                  Builder                         │
│  IgniterLogger.create()                         │
│    .withLevel()    .withAppName()                │
│    .withComponent() .withContext()                │
│    .addTransport()  .defineScopes<T>()           │
│    .build()  ──────────────────────┐            │
└────────────────────────────────────┼────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────┐
│                  Manager                         │
│  IgniterLoggerManager                           │
│    ├── Log methods: fatal/error/warn/info/       │
│    │                debug/trace/success          │
│    ├── Structure:   group/groupEnd/separator     │
│    ├── Children:    child(component, context)    │
│    └── Runtime:     setLevel/setAppName/flush    │
└─────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Console  │  │  File    │  │  HTTP    │   ...custom
│ (pretty) │  │ (rotate) │  │ (batch)  │
└──────────┘  └──────────┘  └──────────┘
```

**Builder** — An immutable configuration accumulator. Each method returns a new builder instance. The fluent chain ends with `.build()`, which returns a `Manager`.

**Manager** — The runtime logger. Built on Pino. Exposes log methods at every severity level, plus `child()`, `group()`, `separator()`, `success()`, and runtime controls.

**Transports** — Where logs go. Built-in: `console`, `file`, `http`. Custom: any string matching a Pino transport module.

**Child loggers** — Scoped loggers that inherit and extend the parent's context. Use them for request-scoped or component-scoped logging.

## Builder API

### Basic Configuration

```typescript
import { IgniterLogger, IgniterLogLevel } from "@igniter-js/logger";

const logger = IgniterLogger.create()
  .withLevel(IgniterLogLevel.Debug)
  .withAppName("billing-service")
  .withComponent("invoice-generator")
  .withContext({ region: "us-east-1", instanceId: "i-abc123" })
  .build();
```

Every log entry will include `appName`, `component`, `region`, and `instanceId` as base fields.

### Transports

The builder supports multiple transports. If none are configured, a default console (pretty) transport is used.

#### Console Transport

Human-readable output for development:

```typescript
const logger = IgniterLogger.create()
  .addTransport({
    target: "console",
    options: {
      pretty: true,     // Pretty-print JSON (default: true)
      colorize: true,   // ANSI colors (default: true)
      destination: "stdout",
    },
  })
  .build();

logger.info("Dev logger ready");
```

#### File Transport

Persistent file output with optional rotation:

```typescript
const logger = IgniterLogger.create()
  .addTransport({
    target: "file",
    options: {
      path: "/var/log/myapp/app.log",
      mkdir: true,       // Create directories if missing
      rotation: {
        maxSizeBytes: 10_000_000,  // 10 MB
        maxFiles: 10,              // Keep last 10 files
        intervalMs: 86_400_000,    // Rotate daily
      },
    },
  })
  .build();

logger.info("File logger ready");
```

#### HTTP Transport

Async, non-blocking remote log ingestion with retry:

```typescript
const logger = IgniterLogger.create()
  .addTransport({
    target: "http",
    options: {
      url: "https://logs.myapp.com/ingest",
      headers: { "X-API-Key": process.env.LOG_API_KEY! },
      batchSize: 100,        // Entries per batch
      timeoutMs: 10_000,     // Request timeout
      flushInterval: 5_000,  // Periodic flush interval (ms)
    },
  })
  .build();

logger.info("HTTP logger ready");
```

**How HTTP transport works:**
- Logs are buffered in memory and sent in batches via `fetch()`.
- A periodic timer flushes the buffer every N milliseconds.
- On network failure, logs are placed back in the buffer for retry.
- Silent failure — failed deliveries don't block your application.
- The flush timer uses `unref()` so it doesn't keep the process alive.

#### External Transports

Any Pino-compatible transport works:

```typescript
import { IgniterLogger } from "@igniter-js/logger";

// Using pino-pretty directly
const devLogger = IgniterLogger.create()
  .addTransport({
    target: "pino-pretty",
    options: { colorize: true, translateTime: "SYS:standard" },
  })
  .build();

// Using Logtail
const prodLogger = IgniterLogger.create()
  .addTransport({
    target: "@logtail/pino",
    options: { sourceToken: process.env.LOGTAIL_TOKEN! },
  })
  .build();

// Using Datadog
const ddLogger = IgniterLogger.create()
  .addTransport({
    target: "pino-datadog-transport",
    options: { ddsource: "nodejs", service: "my-api" },
  })
  .build();
```

> **Note:** External transports must be installed separately (`npm install pino-pretty`, etc.).

#### Multiple Transports

Combine transports for different destinations:

```typescript
const logger = IgniterLogger.create()
  .addTransport({ target: "console", options: { pretty: true } })
  .addTransport({ target: "file", options: { path: "./logs/app.log" } })
  .addTransport({
    target: "http",
    options: { url: "https://logs.example.com/ingest" },
  })
  .build();

// One log line → three destinations
logger.info("Multi-transport active");
```

### Type-Safe Scoped Loggers

Define the contract for child logger context with `defineScopes<T>()`:

```typescript
const logger = IgniterLogger.create()
  .defineScopes<{
    http: { requestId: string; method: string; path: string };
    jobs: { jobId: string; queueName: string };
  }>()
  .build();

// ✅ TypeScript enforces the shape
const httpLogger = logger.child("http", {
  requestId: "req-abc",
  method: "POST",
  path: "/checkout",
});

// ❌ Type error: missing 'method'
const invalid = logger.child("http", { requestId: "req-abc" });
```

The scope key (`"http"`, `"jobs"`) matches the `componentName` passed to `child()`.

## Manager API

Once you have a logger instance from `.build()`, you have the full logging surface:

### Log Levels

```typescript
logger.fatal("System crash — shutting down");
logger.error("Payment failed", { orderId: "ord-456" });
logger.warn("Rate limit approaching", { remaining: 10 });
logger.info("User authenticated", { userId: "user-789" });
logger.debug("Cache lookup", { key: "session:abc", hit: true });
logger.trace("Entering handler", { args: [req, res] });
```

Each level method accepts `(message: string, ...args: any[])`. For `fatal()` and `error()`, the second argument is an `Error` object:

```typescript
try {
  await riskyOperation();
} catch (err) {
  logger.error("Risky operation failed", err);
  // Pino will serialize err.stack, err.message, etc.
}
```

### Success Logging

```typescript
logger.success("Deployment completed");
logger.success("Email sent", { campaignId: "camp-001" });
// Outputs: ✓ Deployment completed { type: "success" }
```

Uses `info` level with a `✓` prefix and `type: "success"` tag.

### Log Grouping

```typescript
logger.group("Processing batch #42");
  logger.info("Item 1 processed");
  logger.info("Item 2 processed");
  logger.separator();
  logger.info("Item 3 processed");
logger.groupEnd();
```

Output:
```
┌ Processing batch #42
  Item 1 processed
  Item 2 processed
  ──────────────────────────────────────────────────
  Item 3 processed
```

Groups nest via indentation. Each `group()` increments the indent level; `groupEnd()` decrements it.

### Child Loggers

Create scoped loggers that inherit base context and add their own:

```typescript
const baseLogger = IgniterLogger.create()
  .withAppName("task-runner")
  .withContext({ env: "production" })
  .build();

const taskLogger = baseLogger.child("email-worker", {
  taskId: "task-001",
  priority: "high",
});

taskLogger.info("Starting task");
// Logs: { appName: "task-runner", env: "production", component: "email-worker",
//         taskId: "task-001", priority: "high", msg: "Starting task" }
```

Child loggers are full `IgniterLoggerManager` instances — you can call any method on them.

### Runtime Controls

```typescript
import { IgniterLogLevel } from "@igniter-js/logger";

// Toggle log verbosity at runtime
logger.setLevel(IgniterLogLevel.Debug);

// Update metadata (note: does not retroactively change existing Pino base)
logger.setAppName("renamed-service");
logger.setComponent("new-component");

// Ensure buffered logs are written before process exit
process.on("beforeExit", async () => {
  await logger.flush();
});
```

## Real-World Examples

### 1. Express API Server

```typescript
import express from "express";
import { IgniterLogger, IgniterLogLevel } from "@igniter-js/logger";

const app = express();
const logger = IgniterLogger.create()
  .withAppName("api-gateway")
  .withComponent("http")
  .withLevel(IgniterLogLevel.Info)
  .addTransport({ target: "console", options: { pretty: true } })
  .addTransport({ target: "file", options: { path: "./logs/api.log" } })
  .build();

app.use((req, res, next) => {
  const requestLogger = logger.child("request", {
    requestId: req.headers["x-request-id"] as string || crypto.randomUUID(),
    method: req.method,
    path: req.path,
  });
  (req as any).logger = requestLogger;
  next();
});

app.get("/health", (req, res) => {
  (req as any).logger.info("Health check");
  res.json({ status: "ok" });
});

app.listen(3000, () => logger.success("API listening on :3000"));
```

### 2. Background Job Processor

```typescript
import { IgniterLogger } from "@igniter-js/logger";

const logger = IgniterLogger.create()
  .withAppName("job-processor")
  .withComponent("nightly-sync")
  .build();

async function processBatch(batchId: number, items: string[]) {
  logger.group(`Batch ${batchId}`);
  logger.info("Starting", { itemCount: items.length });

  for (const item of items) {
    try {
      await processItem(item);
      logger.debug("Item processed", { item });
    } catch (err) {
      logger.error("Item failed", err);
    }
  }

  logger.separator();
  logger.success("Batch complete", { batchId, processed: items.length });
  logger.groupEnd();
}

await processBatch(1, ["a", "b", "c"]);
await logger.flush();
```

### 3. Next.js API Routes (App Router)

```typescript
// lib/logger.ts
import { IgniterLogger } from "@igniter-js/logger";

export const logger = IgniterLogger.create()
  .withAppName("nextjs-app")
  .withComponent("api")
  .build();

// app/api/users/route.ts
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const reqLogger = logger.child("users", {
    requestId: request.headers.get("x-request-id")!,
    method: "GET",
  });

  reqLogger.info("Fetching users");
  const users = await db.user.findMany();
  reqLogger.info("Users fetched", { count: users.length });

  return Response.json(users);
}
```

### 4. CLI Tool with Progress Reporting

```typescript
#!/usr/bin/env node
import { IgniterLogger } from "@igniter-js/logger";

const logger = IgniterLogger.create()
  .withComponent("cli")
  .build();

async function main() {
  logger.group("Scaffolding project");

  logger.info("Creating directory structure...");
  await createDirectories();

  logger.info("Installing dependencies...");
  await installDeps();

  logger.separator();
  logger.success("Project scaffolded successfully!");
  logger.groupEnd();

  await logger.flush();
}

main().catch((err) => {
  logger.fatal("Scaffolding failed", err);
  process.exit(1);
});
```

### 5. Multi-Service with HTTP Transport

```typescript
// auth-service
import { IgniterLogger } from "@igniter-js/logger";

const logger = IgniterLogger.create()
  .withAppName("auth-service")
  .withContext({ region: "us-west-2" })
  .addTransport({ target: "console", options: { pretty: false } }) // JSON in prod
  .addTransport({
    target: "http",
    options: {
      url: "https://logs.internal.example.com/v1/ingest",
      headers: { Authorization: `Bearer ${process.env.LOG_TOKEN}` },
      batchSize: 50,
      flushInterval: 3000,
    },
  })
  .build();

export function authenticate(token: string) {
  logger.info("Auth attempt", { tokenHash: hash(token) });

  try {
    const user = verifyToken(token);
    logger.info("Auth success", { userId: user.id });
    return user;
  } catch (err) {
    logger.warn("Auth failed", { tokenHash: hash(token) });
    throw err;
  }
}
```

### More Examples

The [examples/](./examples/) directory contains runnable projects:
- [Basic Usage](./examples/basic-usage/) — Minimal setup
- [Child Loggers](./examples/child-loggers/) — Scoped context
- [File Logging](./examples/file-logging/) — Disk output with rotation
- [HTTP Transport](./examples/http-transport/) — Remote log ingestion
- [External Transports](./examples/external-transports/) — Custom Pino transports

## API Reference

### `IgniterLogger` (alias for `IgniterLoggerBuilder`)

| Method | Description |
|--------|-------------|
| `IgniterLogger.create()` | Create a new builder instance |
| `.withLevel(level: IgniterLogLevel)` | Set minimum log level |
| `.withAppName(appName: string)` | Application name in all logs |
| `.withComponent(component: string)` | Component name in all logs |
| `.withContext(context: Record<string, unknown>)` | Default context merged into every entry |
| `.addTransport(transport: IgniterTransportConfig)` | Add a transport destination |
| `.defineScopes<T extends Record<string, unknown>>()` | Type child logger context shape |
| `.build()` | Build and return `IgniterLoggerManager` |

### `IgniterLoggerManager`

#### Log Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `fatal` | `(message: string, error?: Error \| unknown)` | Unrecoverable errors |
| `error` | `(message: string, error?: Error \| unknown)` | Error conditions |
| `warn` | `(message: string, ...args: any[])` | Warnings |
| `info` | `(message: string, ...args: any[])` | Informational |
| `debug` | `(message: string, ...args: any[])` | Debug details |
| `trace` | `(message: string, ...args: any[])` | Verbose tracing |
| `success` | `(message: string, ...args: any[])` | Success milestones (info level) |
| `log` | `(level, message, context?, error?)` | Generic log at any level |

#### Structure Methods

| Method | Description |
|--------|-------------|
| `.group(name?: string)` | Start an indented log group |
| `.groupEnd()` | End the current log group |
| `.separator()` | Print a visual separator line |

#### Scoping & Controls

| Method | Description |
|--------|-------------|
| `.child(componentName, context?)` | Create a child logger with extra context |
| `.setLevel(level)` | Change log level at runtime |
| `.setAppName(appName)` | Update application name |
| `.setComponent(componentName)` | Update component name |
| `.flush()` | Flush buffered log entries (returns Promise) |

### `IgniterLogLevel` Enum

| Member | Value | Use Case |
|--------|-------|----------|
| `Fatal` | `"fatal"` | System is unusable |
| `Error` | `"error"` | Runtime errors |
| `Warn` | `"warn"` | Degraded or unusual |
| `Info` | `"info"` | Normal operations |
| `Debug` | `"debug"` | Development details |
| `Trace` | `"trace"` | Very verbose |

### Types

| Type | Description |
|------|-------------|
| `IgniterTransportTarget` | `"console" \| "file" \| "http" \| (string & {})` |
| `IgniterTransportConfig<TOptions>` | `{ target, options? }` |
| `ConsoleTransportOptions` | `{ colorize?, pretty?, destination?, translateTime? }` |
| `FileTransportOptions` | `{ path, mkdir?, rotation? }` |
| `HttpTransportOptions` | `{ url, headers?, batchSize?, timeoutMs?, flushInterval? }` |
| `IgniterFileTransportRotationOptions` | `{ maxSizeBytes?, maxFiles?, intervalMs? }` |
| `IgniterLoggerConfig` | Full configuration object |
| `IgniterLoggerBuilderState` | Builder internal state |

### Errors

```typescript
import { IgniterLoggerError, IGNITER_LOGGER_ERROR_CODES } from "@igniter-js/logger";

// Factory methods
IgniterLoggerError.transportInvalid("bad-target", "addTransport");
IgniterLoggerError.levelInvalid("CRITICAL", "withLevel");
IgniterLoggerError.configInvalid("Missing path", "build");
IgniterLoggerError.flushFailed("Network error", "flush");

// Error codes
IGNITER_LOGGER_ERROR_CODES.TRANSPORT_INVALID
IGNITER_LOGGER_ERROR_CODES.LEVEL_INVALID
IGNITER_LOGGER_ERROR_CODES.CONFIG_INVALID
IGNITER_LOGGER_ERROR_CODES.FLUSH_FAILED
```

> **Note:** Error classes are defined but not yet thrown by the manager at runtime. They exist for future validation. Manual validation is recommended until auto-validation is implemented.

## Configuration Reference

### ConsoleTransportOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `colorize` | `boolean` | `true` | Enable ANSI color output |
| `pretty` | `boolean` | `true` | Pretty-print JSON |
| `destination` | `"stdout" \| "stderr" \| string` | `"stdout"` | Output stream |
| `translateTime` | `string \| boolean` | `"SYS:standard"` | Timestamp format |

### FileTransportOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | `string` | *(required)* | Output file path |
| `mkdir` | `boolean` | `true` | Create directories if missing |
| `rotation` | `boolean \| IgniterFileTransportRotationOptions` | — | Rotation config |

### HttpTransportOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `string` | *(required)* | Ingest endpoint URL |
| `headers` | `Record<string, string>` | — | Request headers |
| `batchSize` | `number` | `10` | Entries per batch |
| `timeoutMs` | `number` | `5000` | Request timeout (ms) |
| `flushInterval` | `number` | `5000` | Periodic flush interval (ms) |

## Best Practices

### ✅ Do

```typescript
// Use child loggers for request-scoped context
const reqLogger = logger.child("http", { requestId });

// Use structured payloads (objects, not strings)
logger.info("Order created", { orderId: "ord-123", total: 99.95 });

// Use the IgniterLogLevel enum for consistency
logger.setLevel(IgniterLogLevel.Debug);

// Flush before process exit
process.on("beforeExit", () => logger.flush());

// Define scope types for type safety
const typed = IgniterLogger.create()
  .defineScopes<{ http: { requestId: string } }>()
  .build();

// Use success() for milestones
logger.success("Deployment completed");

// Use groups for batch operations
logger.group("Batch processing");
// ...operations
logger.groupEnd();
```

### ❌ Don't

```typescript
// Never log PII or secrets
logger.info("User login", { email: user.email });  // ❌
logger.info("User login", { userId: user.id });     // ✅

// Never log raw request bodies or tokens
logger.info("Request", { headers: req.headers });   // ❌

// Never rebuild the logger per request
app.use((req) => {
  const logger = IgniterLogger.create().build();    // ❌ Expensive!
  const logger = baseLogger.child("http", {...});    // ✅ Cheap!
});

// Don't use string context for structured data
logger.info("Event", "some-string");                // ❌
logger.info("Event", { key: "value" });             // ✅

// Don't forget groupEnd()
logger.group("Section");
// ...no groupEnd() -> indentation leaks!            // ❌

// Don't overuse debug in production
logger.debug("Cache hit", { key });                 // Only if level permits
```

## Troubleshooting

### No logs visible

**Cause:** Log level set too high (e.g., `Error` only).  
**Fix:** Lower the level:
```typescript
logger.setLevel(IgniterLogLevel.Info);
// or configure at build time:
IgniterLogger.create().withLevel(IgniterLogLevel.Debug).build();
```

### Pretty output missing in console

**Cause:** Console transport configured without `pretty: true`.  
**Fix:** Add `{ pretty: true }` to console transport options:
```typescript
.addTransport({ target: "console", options: { pretty: true } })
```

### File logs not appearing

**Cause:** Invalid file path, missing directory, or buffered writes not flushed.  
**Fix:** Ensure the directory exists (or set `mkdir: true`) and call `flush()`:
```typescript
logger.info("Message");
await logger.flush();
```

### Indentation problems

**Cause:** `group()` called without matching `groupEnd()`.  
**Fix:** Ensure every `group()` has a corresponding `groupEnd()`:
```typescript
logger.group("Task");
  // ... operations
logger.groupEnd(); // ← Required
```

### Missing context fields in output

**Cause:** Context passed as a string instead of an object.  
**Fix:** Pass an object:
```typescript
// ❌ String becomes { label: "some-string" }
logger.child("component", "some-string");

// ✅ Object preserves all keys
logger.child("component", { requestId: "abc", userId: "123" });
```

### HTTP transport not sending

**Cause:** Incorrect URL, authentication headers, or network.  
**Fix:** The HTTP transport silently retries on failure — check:
1. The URL is reachable from your server
2. Headers (e.g., API keys) are set correctly via environment variables
3. The `flushInterval` hasn't elapsed yet — logs are batched, not sent immediately

### Browser build throws "server-only" error

**Cause:** `@igniter-js/logger` is imported in browser code.  
**Fix:** Remove the import from client-side bundles, or use dynamic imports guarded by `typeof window === "undefined"`.

## Framework Integration

### Express

```typescript
import express from "express";
import { IgniterLogger } from "@igniter-js/logger";

const app = express();
const logger = IgniterLogger.create().withComponent("http").build();

// Middleware: attach logger to request
app.use((req, _res, next) => {
  (req as any).logger = logger.child("request", {
    requestId: req.headers["x-request-id"] as string || crypto.randomUUID(),
  });
  next();
});

app.get("/health", (req, res) => {
  (req as any).logger.info("Health check");
  res.json({ status: "ok" });
});

app.listen(3000);
```

### Fastify

```typescript
import Fastify from "fastify";
import { IgniterLogger } from "@igniter-js/logger";

const fastify = Fastify({ logger: false });
const logger = IgniterLogger.create().withComponent("http").build();

fastify.addHook("onRequest", async (request) => {
  (request as any).logger = logger.child("request", {
    requestId: request.headers["x-request-id"] as string || crypto.randomUUID(),
  });
});

fastify.get("/health", async (request) => {
  (request as any).logger.info("Health check");
  return { status: "ok" };
});

fastify.listen({ port: 3000 });
```

### Hono

```typescript
import { Hono } from "hono";
import { IgniterLogger } from "@igniter-js/logger";

const app = new Hono();
const logger = IgniterLogger.create().withComponent("http").build();

app.use("*", async (c, next) => {
  c.set("logger", logger.child("request", {
    requestId: c.req.header("x-request-id") || crypto.randomUUID(),
    method: c.req.method,
    path: c.req.path,
  }));
  await next();
});

app.get("/health", (c) => {
  c.get("logger").info("Health check");
  return c.json({ status: "ok" });
});

export default app;
```

## Testing

```bash
# Run logger tests
pnpm test --filter @igniter-js/logger

# Run a single test file
pnpm test --filter @igniter-js/logger -- src/core/manager.spec.ts

# Run with type checking
pnpm typecheck --filter @igniter-js/logger
```

In your own tests, mock the logger or use a test transport:

```typescript
import { IgniterLogger } from "@igniter-js/logger";
import { describe, it, expect, vi } from "vitest";

describe("MyService", () => {
  it("logs on success", () => {
    const logger = IgniterLogger.create()
      .addTransport({ target: "console", options: { pretty: false } })
      .build();

    // Spy on the underlying pino instance
    const spy = vi.spyOn((logger as any).pino, "info");

    logger.info("Test message", { key: "value" });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ key: "value" }),
      "Test message"
    );
  });
});
```

## Related Packages

- [@igniter-js/common](https://www.npmjs.com/package/@igniter-js/common) — Shared types and errors
- [@igniter-js/collections](https://www.npmjs.com/package/@igniter-js/collections) — Persistent data with logging integration
- [@igniter-js/mail](https://www.npmjs.com/package/@igniter-js/mail) — Email dispatch with log hooks
- [@igniter-js/storage](https://www.npmjs.com/package/@igniter-js/storage) — File storage with operation logging

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines on contributing to Igniter.js packages.

## License

MIT © [Felipe Barcelos](https://github.com/felipebarcelospro)
