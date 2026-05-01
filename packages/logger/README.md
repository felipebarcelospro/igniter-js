# @igniter-js/logger

High-performance logging for Igniter.js applications powered by Pino.

> **Note:** HTTP transport currently uses a fallback implementation. For production HTTP logging, use external Pino transports like [@axiomhq/pino](https://www.npmjs.com/package/@axiomhq/pino) or [@logtail/pino](https://www.npmjs.com/package/@logtail/pino).

## Features

- ✅ **Zero Pino API exposure** - Work with Igniter abstractions
- ✅ **High performance** - Built on Pino (5-10x faster than alternatives)
- ✅ **Built-in transports** - Console, File, HTTP out of the box
- ✅ **External transport support** - Use any Pino transport (pino-pretty, @logtail/pino, etc.)
- ✅ **Type-safe child loggers** - Scoped context with full type inference
- ✅ **Pretty dev logging** - Colorized, human-readable logs by default
- ✅ **Production-ready** - File rotation, batching, remote logging
- ✅ **Server-only** - Protected from browser imports

## Installation

```bash
npm install @igniter-js/logger
# or
pnpm add @igniter-js/logger
# or
yarn add @igniter-js/logger
# or
bun add @igniter-js/logger
```

## Quick Start

```typescript
import { IgniterLogger } from "@igniter-js/logger";

// Create logger (default: pretty console logging)
const logger = IgniterLogger.create().build();

// Log messages
logger.info("Application started");
logger.error("Something went wrong", { errorCode: 500 });
logger.success("Deployment completed");
```

## Why @igniter-js/logger

- **Consistent log structure** across Igniter packages
- **Transport-first design** with safe defaults for development
- **Context everywhere** with base context, scoped children, and payloads
- **Server-only safety** to prevent accidental browser usage

## Core Concepts

```
Builder (IgniterLogger)
	-> Transport configuration
	-> Context and level defaults
	-> build()
				|
				v
Manager (IgniterLoggerManager)
	-> Log methods (info/warn/error/etc.)
	-> Child loggers
	-> Runtime controls (setLevel/flush)
```

## Builder API

### Basic Configuration

```typescript
import { IgniterLogger, IgniterLogLevel } from "@igniter-js/logger";

const logger = IgniterLogger.create()
	.withLevel(IgniterLogLevel.Debug)
	.withAppName("my-api")
	.withComponent("auth")
	.withContext({ version: "1.0.0" })
	.build();
```

### Built-in Transports

#### Console Transport

```typescript
const logger = IgniterLogger.create()
	.addTransport({
		target: "console",
		options: {
			pretty: true, // Pretty formatting (default: true)
			colorize: true, // Colors (default: true)
		},
	})
	.build();
```

#### File Transport

```typescript
const logger = IgniterLogger.create()
	.addTransport({
		target: "file",
		options: {
			path: "/var/log/app.log",
			mkdir: true, // Create directory if missing
			rotation: {
				maxSizeBytes: 10_000_000,
				maxFiles: 10,
				intervalMs: 86_400_000,
			},
		},
	})
	.build();
```

#### HTTP Transport

```typescript
const logger = IgniterLogger.create()
	.addTransport({
		target: "http",
		options: {
			url: "https://logs.myapp.com/ingest",
			headers: { "X-API-Key": process.env.LOG_API_KEY ?? "" },
			batchSize: 100,
			timeoutMs: 10_000,
		},
	})
	.build();
```

> Note: The current HTTP transport resolver maps to a Pino file target internally. HTTP delivery is not implemented yet. Track updates in [AGENTS.md](./AGENTS.md).

### External Transports

Use any Pino transport from the ecosystem:

```typescript
// npm install pino-pretty
const logger = IgniterLogger.create()
	.addTransport({
		target: "pino-pretty",
		options: {
			colorize: true,
			translateTime: "SYS:standard",
		},
	})
	.build();
```

### Type-Safe Scoped Loggers

```typescript
const logger = IgniterLogger.create()
	.defineScopes<{
		http: { requestId: string; method: string };
		jobs: { jobId: string; queueName: string };
	}>()
	.build();

// ✅ Type-safe
const httpLogger = logger.child("http", {
	requestId: "req-123",
	method: "POST",
});

// ❌ Type error: missing "method"
const invalid = logger.child("http", { requestId: "req-123" });
```

## Manager API

### Log Levels

```typescript
logger.fatal("Critical system failure");
logger.error("Request failed", { statusCode: 500 });
logger.warn("Deprecated API usage");
logger.info("User logged in", { userId: "123" });
logger.debug("Cache hit", { key: "user:123" });
logger.trace("Function entry", { args: [1, 2, 3] });
```

### Custom Methods

```typescript
// Success logging
logger.success("Deployment completed");

// Grouping
logger.group("Processing batch");
logger.info("Item 1");
logger.info("Item 2");
logger.groupEnd();

// Separator
logger.separator();
```

### Child Loggers

```typescript
const httpLogger = logger.child("http", {
	requestId: "req-123",
	method: "POST",
});

httpLogger.info("Request received");
// Logs: { component: "http", requestId: "req-123", method: "POST", msg: "Request received" }
```

### Runtime Controls

```typescript
import { IgniterLogLevel } from "@igniter-js/logger";

// Change log level at runtime
logger.setLevel(IgniterLogLevel.Debug);

// Update app name (does not retroactively update Pino base)
logger.setAppName("new-name");

// Flush buffered logs
await logger.flush();
```

## API Reference

### Builder Methods

- `IgniterLogger.create()`
- `withLevel(level: IgniterLogLevel)`
- `withAppName(appName: string)`
- `withComponent(component: string)`
- `withContext(context: Record<string, unknown>)`
- `addTransport(transport: IgniterTransportConfig)`
- `defineScopes<T>()`
- `build()`

### Manager Methods

- `log(level, message, context?, error?)`
- `fatal(message, error?)`
- `error(message, error?)`
- `warn(message, ...args)`
- `info(message, ...args)`
- `debug(message, ...args)`
- `trace(message, ...args)`
- `success(message, ...args)`
- `group(name?)`
- `groupEnd()`
- `separator()`
- `child(componentName, context?)`
- `setLevel(level)`
- `setAppName(appName)`
- `setComponent(componentName)`
- `flush()`

### Types

- `IgniterLogLevel` (enum)
- `IgniterTransportTarget` (`"console" | "file" | "http" | string`)
- `IgniterTransportConfig<TOptions>`
- `ConsoleTransportOptions`
- `FileTransportOptions`
- `HttpTransportOptions`

### Log Level Enum

```typescript
import { IgniterLogLevel } from "@igniter-js/logger";

const level = IgniterLogLevel.Info;
```

### Transport Options

| Transport | Option | Type | Description |
| --- | --- | --- | --- |
| Console | colorize | boolean | ANSI colors for output |
| Console | pretty | boolean | Pretty-print JSON output |
| Console | destination | string | stdout/stderr or custom stream |
| File | path | string | Output file path |
| File | mkdir | boolean | Create directories when missing |
| File | rotation | boolean \| object | File rotation options |
| HTTP | url | string | Ingest endpoint |
| HTTP | headers | Record<string, string> | Request headers |
| HTTP | batchSize | number | Entries per batch |
| HTTP | timeoutMs | number | Timeout in ms |

## Examples

The examples folder is scaffolded but currently contains placeholders only. It will be populated alongside export wiring.

- [Basic Usage](./examples/basic-usage/)
- [File Logging](./examples/file-logging/)
- [HTTP Transport](./examples/http-transport/)
- [Child Loggers](./examples/child-loggers/)
- [External Transports](./examples/external-transports/)

## Production Best Practices

1. **Disable pretty printing in production:**
	 ```typescript
	 const logger = IgniterLogger.create()
		 .addTransport({ target: "console", options: { pretty: false } })
		 .build();
	 ```

2. **Use file transport with rotation:**
	 ```typescript
	 const logger = IgniterLogger.create()
		 .addTransport({
			 target: "file",
			 options: {
				 path: "/var/log/app.log",
				 mkdir: true,
			 },
		 })
		 .build();
	 ```

3. **Never log PII:**
	 ```typescript
	 // ❌ Bad
	 logger.info("User logged in", { email, password });

	 // ✅ Good
	 logger.info("User logged in", { userId: user.id });
	 ```

4. **Use child loggers for context:**
	 ```typescript
	 const requestLogger = logger.child("http", { requestId });
	 ```

## Troubleshooting

### TRANSPORT_INVALID

**Cause:** Invalid transport target specified.  
**Solution:** Use `"console"`, `"file"`, `"http"`, or a valid Pino transport name.

### LEVEL_INVALID

**Cause:** Invalid log level.  
**Solution:** Use `IgniterLogLevel` values: `fatal`, `error`, `warn`, `info`, `debug`, `trace`.

### File logs not appearing

**Cause:** Buffered writes not flushed.  
**Solution:** Call `await logger.flush()` before process exit.

> Note: Error codes above exist in the registry but are not thrown yet in v0.0.1. Validation will be added alongside export wiring.

## Testing

```bash
pnpm test --filter @igniter-js/logger
```

## Framework Integration

### Next.js (API Route)

```typescript
import { IgniterLogger } from "@igniter-js/logger";

const logger = IgniterLogger.create().withComponent("api").build();

export default function handler(req, res) {
	const requestLogger = logger.child("http", { requestId: req.headers["x-request-id"] });
	requestLogger.info("Incoming request", { method: req.method, path: req.url });
	res.status(200).json({ ok: true });
}
```

### Express

```typescript
import express from "express";
import { IgniterLogger } from "@igniter-js/logger";

const app = express();
const logger = IgniterLogger.create().withComponent("http").build();

app.get("/health", (req, res) => {
	logger.info("Health check", { requestId: req.header("x-request-id") });
	res.json({ ok: true });
});
```

### Fastify

```typescript
import Fastify from "fastify";
import { IgniterLogger } from "@igniter-js/logger";

const app = Fastify();
const logger = IgniterLogger.create().withComponent("http").build();

app.get("/health", async (request) => {
	logger.info("Health check", { requestId: request.headers["x-request-id"] });
	return { ok: true };
});
```

## Documentation

- [AGENTS.md](./AGENTS.md) - Complete technical reference
- [Igniter.js Docs](https://igniterjs.dev/docs/logger)
- [Examples](./examples/)

## License

MIT © [Felipe Barcelos](https://github.com/felipebarcelospro)
