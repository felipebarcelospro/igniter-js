# @igniter-js/common

<div align="center">

[![npm version](https://img.shields.io/npm/v/@igniter-js/common)](https://www.npmjs.com/package/@igniter-js/common)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-orange)](https://bun.sh)

**Shared primitives for Igniter.js packages**  
Standardized errors, logger contracts, and schema interfaces with zero runtime dependencies.

[Quick Start](#-quick-start) • [Core Concepts](#-core-concepts) • [Examples](#-examples-library) • [API Reference](#-api-reference) • [Real-World Scenarios](#-real-world-scenarios)

</div>

---

## ✨ Why @igniter-js/common?

Most apps rebuild these low-level building blocks. This package keeps them consistent and stable so every Igniter.js package can share the same foundation:

- ✅ **Structured errors** — `IgniterError` with metadata and safe serialization
- ✅ **Logger contract** — one interface shared across the ecosystem
- ✅ **Portable schemas** — `StandardSchemaV1` and `StandardJSONSchemaV1` to integrate any validator
- ✅ **Zero runtime deps** — no external packages at runtime
- ✅ **Interoperability** — adapters, plugins, and apps use the same types

---

## 🚀 Quick Start

### Installation

```bash
# npm
npm install @igniter-js/common

# pnpm
pnpm add @igniter-js/common

# yarn
yarn add @igniter-js/common

# bun
bun add @igniter-js/common
```

### 60-Second Example

```ts
import {
	IgniterError,
	IgniterLogLevel,
	type IgniterLogger,
} from "@igniter-js/common";

const logger: IgniterLogger = {
	log(level, message, context, error) {
		console.log(`[${level}]`, message, { context, error });
	},
	fatal: (message, error) => console.error("FATAL", message, error),
	error: (message, error) => console.error("ERROR", message, error),
	warn: (message, ...args) => console.warn("WARN", message, ...args),
	info: (message, ...args) => console.info("INFO", message, ...args),
	debug: (message, ...args) => console.debug("DEBUG", message, ...args),
	trace: (message, ...args) => console.trace("TRACE", message, ...args),
	success: (message, ...args) => console.log("SUCCESS", message, ...args),
	group: (name) => console.group(name),
	groupEnd: () => console.groupEnd(),
	child: () => logger,
	setComponent: () => {},
	setAppName: () => {},
	setLevel: () => {},
	flush: async () => {},
	separator: () => console.log("----------------"),
};

const err = new IgniterError({
	message: "Invalid input",
	code: "INVALID_INPUT",
	statusCode: 400,
	details: { field: "email" },
	logger,
});

logger.log(IgniterLogLevel.INFO, "Created error", err.toJSON());
```

**✅ Success!** You now have a structured error and a reusable logger contract.

---

## 🎯 Core Concepts

### What This Package Provides

This package exports three categories of primitives:

1. **Error Handling**
	 - `IgniterError`
2. **Logging Contracts**
	 - `IgniterLogLevel`
	 - `IgniterLogEntry`
	 - `IgniterLoggerOptions`
	 - `IgniterLogger`
3. **Schema Contracts**
	 - `StandardTypedV1`
	 - `StandardSchemaV1`
	 - `StandardJSONSchemaV1`

### Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                  Your Application / Package              │
├──────────────────────────────────────────────────────────┤
│ IgniterError • IgniterLogger • StandardSchemaV1          │
└──────────────┬───────────────────────────────────────────┘
							│ Shared contracts
							▼
┌──────────────────────────────────────────────────────────┐
│                 @igniter-js/common                       │
│  error/  → IgniterError                                  │
│  types/  → logger interfaces + schema interfaces         │
└──────────────────────────────────────────────────────────┘
```

### Exports

```ts
import {
	IgniterError,
	IgniterLogLevel,
	type IgniterLogEntry,
	type IgniterLogger,
	type IgniterLoggerOptions,
	type StandardTypedV1,
	type StandardSchemaV1,
	type StandardJSONSchemaV1,
} from "@igniter-js/common";
```

---

## 📖 Examples Library

> This library contains **40+ examples** showing how to use the exported primitives. Every example below only uses the actual exports of `@igniter-js/common`.

### Errors: IgniterError

#### Example 01 — Minimal Import

```ts
import { IgniterError } from "@igniter-js/common";
```

#### Example 02 — Basic IgniterError

```ts
const err = new IgniterError({
	message: "Something went wrong",
	code: "UNKNOWN",
});
```

#### Example 03 — IgniterError with HTTP Status

```ts
const err = new IgniterError({
	message: "Unauthorized",
	code: "UNAUTHORIZED",
	statusCode: 401,
});
```

#### Example 04 — IgniterError with Cause

```ts
const cause = new Error("Low-level failure");
const err = new IgniterError({
	message: "Failed to process",
	code: "PROCESSING_FAILED",
	cause,
});
```

#### Example 05 — IgniterError with Details

```ts
const err = new IgniterError({
	message: "Validation failed",
	code: "VALIDATION_FAILED",
	details: { field: "email" },
});
```

#### Example 06 — IgniterError with Metadata

```ts
const err = new IgniterError({
	message: "Storage error",
	code: "STORAGE_ERROR",
	metadata: { bucket: "uploads", region: "us-east-1" },
});
```

#### Example 07 — IgniterError with Causer

```ts
const err = new IgniterError({
	message: "Upstream service failed",
	code: "UPSTREAM_ERROR",
	causer: "payment-service",
});
```

#### Example 08 — IgniterError toJSON

```ts
const err = new IgniterError({
	message: "Bad request",
	code: "BAD_REQUEST",
	statusCode: 400,
});

const payload = err.toJSON();
```

#### Example 09 — IgniterError + Logger

```ts
const err = new IgniterError({
	message: "Database timeout",
	code: "DB_TIMEOUT",
	logger,
	details: { timeoutMs: 5000 },
});
```

#### Example 10 — IgniterError in a Guard

```ts
function requireValue(value: string | undefined) {
	if (!value) {
		throw new IgniterError({
			message: "Missing value",
			code: "MISSING_VALUE",
			statusCode: 400,
		});
	}
	return value;
}
```

#### Example 11 — IgniterError Serialization for API

```ts
try {
	throw new IgniterError({ message: "Not found", code: "NOT_FOUND", statusCode: 404 });
} catch (err) {
	if (err instanceof IgniterError) {
		return Response.json(err.toJSON(), { status: err.statusCode });
	}
}
```

#### Example 12 — Error Normalization Helper

```ts
function normalizeError(err: unknown) {
	if (err instanceof IgniterError) return err;
	return new IgniterError({
		message: "Unknown error",
		code: "UNKNOWN",
		cause: err as Error,
	});
}
```

#### Example 13 — Structured Error for CLI

```ts
const err = new IgniterError({
	message: "Invalid config",
	code: "CONFIG_INVALID",
	statusCode: 1,
	details: { file: "igniter.config.ts" },
});

console.error(err.message);
process.exit(err.statusCode);
```

#### Example 14 — Wrap External Error

```ts
try {
	throw new Error("Network down");
} catch (cause) {
	throw new IgniterError({
		message: "Upstream request failed",
		code: "UPSTREAM_REQUEST_FAILED",
		cause: cause as Error,
	});
}
```

#### Example 15 — Error with Structured Metadata

```ts
const err = new IgniterError({
	message: "Auth failed",
	code: "AUTH_FAILED",
	metadata: { provider: "oauth", stage: "token" },
});
```

### Logging: IgniterLogger

#### Example 16 — IgniterLogLevel Usage

```ts
import { IgniterLogLevel } from "@igniter-js/common";

const level = IgniterLogLevel.INFO;
```

#### Example 17 — IgniterLogEntry Construction

```ts
import type { IgniterLogEntry } from "@igniter-js/common";

const entry: IgniterLogEntry = {
	level: "info",
	message: "Request completed",
	timestamp: new Date(),
	context: { requestId: "req-1" },
};
```

#### Example 18 — IgniterLoggerOptions with Formatter

```ts
import type { IgniterLoggerOptions, IgniterLogEntry } from "@igniter-js/common";

const options: IgniterLoggerOptions = {
	level: "debug",
	colorize: true,
	formatter: (entry: IgniterLogEntry) => {
		return `[${entry.level}] ${entry.message}`;
	},
};
```

#### Example 19 — Minimal Logger Implementation

```ts
import { IgniterLogLevel, type IgniterLogger } from "@igniter-js/common";

const logger: IgniterLogger = {
	log(level, message, context, error) {
		console.log(level, message, context, error);
	},
	fatal: (message, error) => console.error("FATAL", message, error),
	error: (message, error) => console.error("ERROR", message, error),
	warn: (message, ...args) => console.warn("WARN", message, ...args),
	info: (message, ...args) => console.info("INFO", message, ...args),
	debug: (message, ...args) => console.debug("DEBUG", message, ...args),
	trace: (message, ...args) => console.trace("TRACE", message, ...args),
	success: (message, ...args) => console.log("SUCCESS", message, ...args),
	group: (name) => console.group(name),
	groupEnd: () => console.groupEnd(),
	child: () => logger,
	setComponent: () => {},
	setAppName: () => {},
	setLevel: () => {},
	flush: async () => {},
	separator: () => console.log("----------------"),
};

logger.log(IgniterLogLevel.INFO, "Hello");
```

#### Example 20 — Logger with Level Filtering

```ts
import { IgniterLogLevel, type IgniterLogger } from "@igniter-js/common";

function createLogger(minLevel: IgniterLogLevel): IgniterLogger {
	const levels = [
		IgniterLogLevel.TRACE,
		IgniterLogLevel.DEBUG,
		IgniterLogLevel.INFO,
		IgniterLogLevel.WARN,
		IgniterLogLevel.ERROR,
		IgniterLogLevel.FATAL,
	];

	const shouldLog = (level: IgniterLogLevel) =>
		levels.indexOf(level) >= levels.indexOf(minLevel);

	const base: IgniterLogger = {
		log(level, message, context, error) {
			if (!shouldLog(level)) return;
			console.log(`[${level}]`, message, { context, error });
		},
		fatal: (message, error) => base.log(IgniterLogLevel.FATAL, message, undefined, error),
		error: (message, error) => base.log(IgniterLogLevel.ERROR, message, undefined, error),
		warn: (message, ...args) => base.log(IgniterLogLevel.WARN, message, args),
		info: (message, ...args) => base.log(IgniterLogLevel.INFO, message, args),
		debug: (message, ...args) => base.log(IgniterLogLevel.DEBUG, message, args),
		trace: (message, ...args) => base.log(IgniterLogLevel.TRACE, message, args),
		success: (message, ...args) => base.log(IgniterLogLevel.INFO, message, args),
		group: (name) => console.group(name),
		groupEnd: () => console.groupEnd(),
		child: () => base,
		setComponent: () => {},
		setAppName: () => {},
		setLevel: () => {},
		flush: async () => {},
		separator: () => console.log("----------------"),
	};

	return base;
}
```

#### Example 21 — Logger Child Context

```ts
import { IgniterLogLevel, type IgniterLogger } from "@igniter-js/common";

const root: IgniterLogger = {
	log(level, message, context) {
		console.log(`[${level}]`, message, context);
	},
	fatal: (message, error) => console.error("FATAL", message, error),
	error: (message, error) => console.error("ERROR", message, error),
	warn: (message, ...args) => console.warn("WARN", message, ...args),
	info: (message, ...args) => console.info("INFO", message, ...args),
	debug: (message, ...args) => console.debug("DEBUG", message, ...args),
	trace: (message, ...args) => console.trace("TRACE", message, ...args),
	success: (message, ...args) => console.log("SUCCESS", message, ...args),
	group: (name) => console.group(name),
	groupEnd: () => console.groupEnd(),
	child: (componentName, context) => ({
		...root,
		log(level, message, extra, error) {
			root.log(level, message, { componentName, context, extra }, error);
		},
	}),
	setComponent: () => {},
	setAppName: () => {},
	setLevel: () => {},
	flush: async () => {},
	separator: () => console.log("----------------"),
};

const reqLogger = root.child("http", { requestId: "req-123" });
reqLogger.info("Request started");
```

#### Example 22 — Logger Separator

```ts
logger.separator();
logger.info("Service booted");
```

#### Example 23 — Logger with Component Name

```ts
logger.setComponent("payments");
logger.info("Charge started");
```

#### Example 24 — Logger with App Name

```ts
logger.setAppName("igniter-api");
logger.info("Boot complete");
```

#### Example 25 — Flush Logger (Async)

```ts
await logger.flush();
```

#### Example 26 — Grouped Logs

```ts
logger.group("startup");
logger.info("Load config");
logger.info("Init services");
logger.groupEnd();
```

#### Example 27 — Success Log

```ts
logger.success("Deployment finished");
```

#### Example 28 — Typed Log Entry

```ts
import type { IgniterLogEntry } from "@igniter-js/common";

const entry: IgniterLogEntry = {
	level: "warn",
	message: "Cache miss",
	timestamp: new Date().toISOString(),
	context: { key: "user:123" },
};
```

#### Example 29 — Logger Options with Context

```ts
import type { IgniterLoggerOptions } from "@igniter-js/common";

const options: IgniterLoggerOptions = {
	level: "info",
	context: { service: "billing" },
};
```

#### Example 30 — Logger with Error Object

```ts
try {
	throw new Error("boom");
} catch (error) {
	logger.error("Failed", error);
}
```

### Schemas: StandardSchemaV1 / StandardJSONSchemaV1

#### Example 31 — Custom StandardSchemaV1 (Sync)

```ts
import type { StandardSchemaV1 } from "@igniter-js/common";

const numberSchema: StandardSchemaV1<number> = {
	"~standard": {
		version: 1,
		vendor: "custom",
		validate(value) {
			if (typeof value !== "number") {
				return { issues: [{ message: "Expected number" }] };
			}
			return { value };
		},
	},
};
```

#### Example 32 — Custom StandardSchemaV1 (Async)

```ts
const asyncSchema: StandardSchemaV1<string> = {
	"~standard": {
		version: 1,
		vendor: "custom",
		async validate(value) {
			if (typeof value !== "string") {
				return { issues: [{ message: "Expected string" }] };
			}
			return { value };
		},
	},
};
```

#### Example 33 — StandardSchemaV1.InferInput / InferOutput

```ts
import type { StandardSchemaV1 } from "@igniter-js/common";

type Input = StandardSchemaV1.InferInput<typeof numberSchema>;
type Output = StandardSchemaV1.InferOutput<typeof numberSchema>;
```

#### Example 34 — StandardTypedV1 for Input/Output Only

```ts
import type { StandardTypedV1 } from "@igniter-js/common";

const typed: StandardTypedV1<string, number> = {
	"~standard": {
		version: 1,
		vendor: "custom",
		types: { input: "", output: 0 },
	},
};
```

#### Example 35 — StandardJSONSchemaV1 Converter

```ts
import type { StandardJSONSchemaV1 } from "@igniter-js/common";

const jsonSchema: StandardJSONSchemaV1 = {
	"~standard": {
		version: 1,
		vendor: "custom",
		jsonSchema: {
			input: ({ target }) => ({ $schema: target, type: "string" }),
			output: ({ target }) => ({ $schema: target, type: "string" }),
		},
	},
};
```

#### Example 36 — Validating with StandardSchemaV1

```ts
const result = numberSchema["~standard"].validate(123);
if ("issues" in result) {
	console.error(result.issues);
} else {
	console.log(result.value);
}
```

#### Example 37 — Returning Issues

```ts
const result = numberSchema["~standard"].validate("nope");
if ("issues" in result) {
	console.log(result.issues[0].message);
}
```

#### Example 38 — StandardSchemaV1.Options

```ts
const result = numberSchema["~standard"].validate("x", {
	libraryOptions: { strict: true },
});
```

#### Example 39 — StandardJSONSchemaV1.Options

```ts
const schema = jsonSchema["~standard"].jsonSchema.input({
	target: "draft-07",
});
```

#### Example 40 — Typed Utility Function

```ts
import type { StandardSchemaV1 } from "@igniter-js/common";

async function validateOrThrow<T>(schema: StandardSchemaV1<T>, value: unknown) {
	const result = await schema["~standard"].validate(value);
	if ("issues" in result) {
		throw new IgniterError({
			message: "Validation failed",
			code: "VALIDATION_FAILED",
			details: { issues: result.issues },
		});
	}
	return result.value;
}
```

#### Example 41 — Schema Composition (Manual)

```ts
const stringSchema: StandardSchemaV1<string> = {
	"~standard": {
		version: 1,
		vendor: "custom",
		validate(value) {
			if (typeof value !== "string") {
				return { issues: [{ message: "Expected string" }] };
			}
			return { value };
		},
	},
};

const nonEmptyString: StandardSchemaV1<string> = {
	"~standard": {
		version: 1,
		vendor: "custom",
		validate(value) {
			const base = stringSchema["~standard"].validate(value);
			if ("issues" in base) return base;
			if (base.value.length === 0) {
				return { issues: [{ message: "Empty string" }] };
			}
			return base;
		},
	},
};
```

#### Example 42 — Schema Issue Path

```ts
const result = numberSchema["~standard"].validate("x");
if ("issues" in result) {
	const issue = result.issues[0];
	console.log(issue.path);
}
```

---

## 🌍 Real-World Scenarios

### Scenario 1 — API Input Validation

```ts
const EmailSchema: StandardSchemaV1<string> = {
	"~standard": {
		version: 1,
		vendor: "custom",
		validate(value) {
			if (typeof value !== "string" || !value.includes("@")) {
				return { issues: [{ message: "Invalid email" }] };
			}
			return { value };
		},
	},
};

const email = await validateOrThrow(EmailSchema, "user@example.com");
```

### Scenario 2 — Job Processing Logs

```ts
const jobLogger = logger.child("jobs", { jobId: "job-1" });
jobLogger.info("Job started");
jobLogger.success("Job completed");
```

### Scenario 3 — CLI Config Validation

```ts
const ConfigSchema: StandardSchemaV1<{ port: number }> = {
	"~standard": {
		version: 1,
		vendor: "custom",
		validate(value) {
			if (!value || typeof (value as any).port !== "number") {
				return { issues: [{ message: "port must be a number" }] };
			}
			return { value: value as { port: number } };
		},
	},
};

const config = await validateOrThrow(ConfigSchema, { port: 3000 });
```

### Scenario 4 — Storage Layer Error Wrapping

```ts
async function readFile(path: string) {
	try {
		return await Bun.file(path).text();
	} catch (cause) {
		throw new IgniterError({
			message: "File read failed",
			code: "FILE_READ_FAILED",
			details: { path },
			cause: cause as Error,
		});
	}
}
```

### Scenario 5 — Adapter Validation Contract

```ts
function ensureSchema<T>(schema: StandardSchemaV1<T> | undefined) {
	if (!schema) {
		throw new IgniterError({
			message: "Schema required",
			code: "SCHEMA_REQUIRED",
			statusCode: 400,
		});
	}
	return schema;
}
```

### Scenario 6 — StandardJSONSchemaV1 Output for Tooling

```ts
const openapiSchema = jsonSchema["~standard"].jsonSchema.output({
	target: "openapi-3.0",
});
```

### Scenario 7 — Error Mapping to HTTP Responses

```ts
function toHttpResponse(error: unknown) {
	const err = normalizeError(error);
	return Response.json(err.toJSON(), { status: err.statusCode });
}
```

### Scenario 8 — Multi-tenant Logger Context

```ts
const tenantLogger = logger.child("tenant", { tenantId: "t-42" });
tenantLogger.info("Billing cycle started");
```

### Scenario 9 — Schema-based CLI Validation

```ts
const CliSchema: StandardSchemaV1<{ dryRun: boolean }> = {
	"~standard": {
		version: 1,
		vendor: "custom",
		validate(value) {
			if (!value || typeof (value as any).dryRun !== "boolean") {
				return { issues: [{ message: "dryRun must be boolean" }] };
			}
			return { value: value as { dryRun: boolean } };
		},
	},
};

const parsed = await validateOrThrow(CliSchema, { dryRun: true });
```

---

## 📚 API Reference

> All public types and classes are defined in the package exports. This section mirrors the source code in `packages/common/src`.

### IgniterError

**File:** packages/common/src/error/igniter.error.ts

**Purpose:** Structured error class with metadata, optional logger integration, and serialization support.

**Constructor:**

```ts
new IgniterError({
	message: string;
	code: string;
	statusCode?: number;
	causer?: string;
	details?: unknown;
	metadata?: Record<string, unknown>;
	logger?: IgniterLogger;
	cause?: Error;
})
```

**Properties:**

- `name: string` (always "IgniterError")
- `message: string`
- `code: string`
- `statusCode: number`
- `details?: unknown`
- `metadata?: Record<string, unknown>`
- `causer?: string`
- `cause?: Error`
- `stackTrace?: string`

**Methods:**

- `toJSON(): Record<string, unknown>` — returns `name`, `message`, `code`, `details`, `metadata`, `stackTrace`

**Example:**

```ts
const err = new IgniterError({
	message: "Unauthorized",
	code: "UNAUTHORIZED",
	statusCode: 401,
});
```

---

### IgniterLogLevel

**Type:** `enum`

```ts
enum IgniterLogLevel {
	FATAL = "fatal",
	ERROR = "error",
	WARN = "warn",
	INFO = "info",
	DEBUG = "debug",
	TRACE = "trace",
}
```

**Example:**

```ts
logger.log(IgniterLogLevel.DEBUG, "cache hit");
```

---

### IgniterLogEntry

**Type:** `interface`

```ts
interface IgniterLogEntry {
	level: IgniterLogLevel;
	message: string;
	timestamp?: Date | string;
	context?: Record<string, unknown>;
	error?: Error | unknown;
	[key: string]: unknown;
}
```

---

### IgniterLoggerOptions

**Type:** `interface`

```ts
interface IgniterLoggerOptions {
	level?: IgniterLogLevel;
	colorize?: boolean;
	formatter?: (entry: IgniterLogEntry) => string;
	showTimestamp?: boolean;
	appName?: string;
	component?: string;
	context?: Record<string, unknown>;
	[key: string]: unknown;
}
```

---

### IgniterLogger

**Type:** `interface`

```ts
interface IgniterLogger {
	log(level: IgniterLogLevel, message: string, context?: any, error?: Error | unknown): void;
	fatal(message: string, error?: Error | unknown): void;
	error(message: string, error?: Error | unknown): void;
	warn(message: string, ...args: any[]): void;
	info(message: string, ...args: any[]): void;
	debug(message: string, ...args: any[]): void;
	trace(message: string, ...args: any[]): void;
	success(message: string, ...args: any[]): void;
	group(name?: string): void;
	groupEnd(): void;
	child(componentName: string, context?: Record<string, unknown> | string): IgniterLogger;
	setComponent(componentName: string | undefined): void;
	setAppName(appName: string | undefined): void;
	setLevel(level: IgniterLogLevel): void;
	flush(): Promise<void>;
	separator(): void;
}
```

---

### StandardTypedV1

**Type:** `interface`

```ts
interface StandardTypedV1<Input = unknown, Output = Input> {
	readonly "~standard": StandardTypedV1.Props<Input, Output>;
}
```

**Namespace:** `StandardTypedV1`

- `Props` — includes `version`, `vendor`, and optional `types`
- `Types` — defines `input` and `output`
- `InferInput` / `InferOutput` — type inference helpers

---

### StandardSchemaV1

**Type:** `interface`

```ts
interface StandardSchemaV1<Input = unknown, Output = Input> {
	readonly "~standard": StandardSchemaV1.Props<Input, Output>;
}
```

**Namespace:** `StandardSchemaV1`

- `Props` — includes `version`, `vendor`, and `validate`
- `Result`, `SuccessResult`, `FailureResult`
- `Issue`, `PathSegment`, `Options`
- `InferInput` / `InferOutput`

---

### StandardJSONSchemaV1

**Type:** `interface`

```ts
interface StandardJSONSchemaV1<Input = unknown, Output = Input> {
	readonly "~standard": StandardJSONSchemaV1.Props<Input, Output>;
}
```

**Namespace:** `StandardJSONSchemaV1`

- `Props` — includes `version`, `vendor`, and `jsonSchema`
- `Converter` — `input()` and `output()`
- `Options` — `target`, `libraryOptions`
- `Target` — "draft-2020-12", "draft-07", "openapi-3.0", or custom

---

## 🔧 Configuration

This package has **no runtime configuration** and **no runtime dependencies**. Any configuration is implemented by consumers via:

- `IgniterLoggerOptions` (for logger implementations)
- Schema-specific configuration via `StandardSchemaV1.Options`
- JSON Schema conversion options via `StandardJSONSchemaV1.Options`

---

## 🧪 Testing

This package exports types and a single error class. Example tests you can use in your own packages:

### Test IgniterError Serialization

```ts
import { describe, it, expect } from "vitest";
import { IgniterError } from "@igniter-js/common";

describe("IgniterError", () => {
	it("serializes with toJSON", () => {
		const err = new IgniterError({ message: "X", code: "X" });
		expect(err.toJSON()).toMatchObject({ code: "X", message: "X" });
	});
});
```

### Test StandardSchemaV1 Validation

```ts
import { describe, it, expect } from "vitest";
import type { StandardSchemaV1 } from "@igniter-js/common";

const schema: StandardSchemaV1<number> = {
	"~standard": {
		version: 1,
		vendor: "custom",
		validate(value) {
			if (typeof value !== "number") return { issues: [{ message: "bad" }] };
			return { value };
		},
	},
};

describe("StandardSchemaV1", () => {
	it("validates number", () => {
		const result = schema["~standard"].validate(1);
		expect("issues" in result).toBe(false);
	});
});
```

---

## ✅ Best Practices

- Use `IgniterError` to provide **machine-readable** error codes.
- Always include `statusCode` for errors exposed to HTTP consumers.
- Use `details` for debugging context that is safe to log.
- Avoid PII inside `metadata`, `details`, and logs.
- Implement `IgniterLogger.child()` to preserve request-scoped context.
- Keep `StandardSchemaV1` validation deterministic and side-effect free.
- Return consistent `issues` shapes for predictable error handling.

---

## ❌ Anti-Patterns

- Throwing raw `Error` instances where `IgniterError` is expected.
- Logging secrets or raw credentials in `details` or `metadata`.
- Returning non-serializable values inside `IgniterError.details`.
- Ignoring `issues` and assuming validation succeeded.
- Implementing logger methods that throw (logging should never fail the app).

---

## 🩺 Troubleshooting

### Problem: `IgniterError` not serializing correctly

- **Cause:** You are logging `error.toJSON()` but not returning it.
- **Fix:** Return `err.toJSON()` in HTTP responses.

### Problem: Logger implementation fails in production

- **Cause:** Logger throws in `error()` or `log()`.
- **Fix:** Ensure logger methods never throw.

### Problem: `StandardSchemaV1` validation always succeeds

- **Cause:** You returned `{ value }` even on failure.
- **Fix:** Return `{ issues: [...] }` for invalid values.

### Problem: `StandardSchemaV1` validation always fails

- **Cause:** You returned `{ issues: [] }` (empty array is truthy).
- **Fix:** For success, return `{ value }` with no `issues` field.

### Problem: `StandardJSONSchemaV1` output is wrong target

- **Cause:** `Options.target` not set correctly.
- **Fix:** Pass one of the supported targets: `"draft-2020-12"`, `"draft-07"`, or `"openapi-3.0"`.

---

## 🧩 Framework Integration

### Next.js (API Route)

```ts
import { IgniterError } from "@igniter-js/common";

export async function GET() {
	try {
		throw new IgniterError({ message: "Not found", code: "NOT_FOUND", statusCode: 404 });
	} catch (err) {
		if (err instanceof IgniterError) {
			return Response.json(err.toJSON(), { status: err.statusCode });
		}
		return Response.json({ message: "Unknown" }, { status: 500 });
	}
}
```

### Express

```ts
import { IgniterError } from "@igniter-js/common";
import type { Request, Response, NextFunction } from "express";

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
	const normalized = err instanceof IgniterError
		? err
		: new IgniterError({ message: "Internal error", code: "INTERNAL" });

	res.status(normalized.statusCode).json(normalized.toJSON());
}
```

### Fastify

```ts
import { IgniterError } from "@igniter-js/common";
import type { FastifyInstance } from "fastify";

export async function register(app: FastifyInstance) {
	app.setErrorHandler((err, _req, reply) => {
		const normalized = err instanceof IgniterError
			? err
			: new IgniterError({ message: "Internal error", code: "INTERNAL" });
		reply.status(normalized.statusCode).send(normalized.toJSON());
	});
}
```

---

## ❓ FAQ

### Does `IgniterError.toJSON()` include `statusCode`?

No. `statusCode` is available as a property on the instance but is not included in the `toJSON()` output. Add it manually if your API response requires it.

### Can I add runtime dependencies to this package?

No. The package is designed to be dependency-free to keep it portable and safe as a core primitive.

### Can I log structured context with `IgniterError`?

Yes. Use `details` or `metadata`, but ensure you do not include secrets or PII.

---

## 📌 Glossary

- **Standard Schema** — A minimal, portable schema contract defined in this package.
- **Issue** — A validation error entry for StandardSchemaV1.
- **Logger Contract** — The agreed-upon interface for loggers in Igniter.js.
- **Structured Error** — An error with code, details, and metadata.

---

## 🧭 Related Packages

- `@igniter-js/core`
- `@igniter-js/store`
- `@igniter-js/storage`
- `@igniter-js/mail`
- `@igniter-js/telemetry`

---

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

---

## 📄 License

MIT © Igniter.js
