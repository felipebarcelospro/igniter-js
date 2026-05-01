# AGENTS.md - @igniter-js/common

> **Last Updated:** 2026-01-29  
> **Version:** 0.1.0  
> **Goal:** The definitive maintainer + consumer manual for Igniter.js shared primitives: errors, logger contracts, and schema interfaces.

---

## 1. Package Vision & Context

`@igniter-js/common` is the smallest possible “core contract” package in Igniter.js. It exports a single runtime class (`IgniterError`) and a set of shared TypeScript interfaces (`IgniterLogger` and Standard Schema interfaces) used by multiple packages. This package must stay stable and dependency-free so it can be safely imported across the entire monorepo.

Key outcomes:

- Ensure every package reports errors consistently.
- Ensure every package logs with the same shape.
- Ensure every package can accept a schema validator through Standard Schema contracts.

---

# I. MAINTAINER GUIDE (Internal Architecture)

## 2. FileSystem Topology (Maintenance)

```
packages/common/
├── src/
│   ├── error/
│   │   ├── igniter.error.ts      # Runtime class: IgniterError
│   │   └── index.ts              # Re-exports error types
│   ├── types/
│   │   ├── logger.interface.ts   # Logger contracts + log level enum
│   │   ├── schema.interface.ts   # StandardTypedV1/StandardSchemaV1/StandardJSONSchemaV1
│   │   └── index.ts              # Re-exports types
│   └── index.ts                  # Package barrel (exports error + types)
├── README.md
├── AGENTS.md
└── package.json
```

Responsibility map:

- `src/error/igniter.error.ts` — only runtime logic in this package.
- `src/types/logger.interface.ts` — logging interfaces and `IgniterLogLevel` enum.
- `src/types/schema.interface.ts` — Standard Schema type contracts. No runtime logic.
- `src/index.ts` — primary export surface.

## 3. Architecture Deep-Dive

This package has no adapters, builders, or managers. The architecture is intentionally minimal:

```
Consumer Code
	│
	├── IgniterError (runtime class)
	│
	└── Types (IgniterLogger, StandardSchemaV1, StandardJSONSchemaV1)
					└── Compile-time contracts only
```

Design constraints:

- **Dependency-free** at runtime.
- **Stable surface** to prevent ripple effects across packages.
- **Strictly additive** changes (no breaking changes without strong justification).

## 4. Operational Flow Mapping (Pipelines)

### Method: `new IgniterError(...)`

1. **Argument assignment:** copies `message`, `code`, `statusCode`, `details`, `metadata`, `causer`, `cause` into instance fields.
2. **Defaults:** `statusCode` defaults to `500` if not provided.
3. **Stack capture:** stores `stackTrace` from native `Error` stack.
4. **Logger integration (optional):** if `logger` is provided, calls `logger.error(this.message, { statusCode, code, details, metadata, stackTrace })`.
5. **No side effects beyond logging** and property assignment.

### Method: `IgniterError.toJSON()`

1. Returns a plain object with: `name`, `message`, `code`, `details`, `metadata`, `stackTrace`.
2. **Note:** `statusCode` is *not* included in `toJSON()` output by design.

### Types: `IgniterLogger`, `StandardSchemaV1`, `StandardJSONSchemaV1`

These are compile-time contracts with **no runtime behavior**. Any runtime behavior is defined by consumer implementations.

## 5. Dependency & Type Graph

```
IgniterError
	└── uses IgniterLogger (type only)

IgniterLogger
	├── uses IgniterLogLevel (enum)
	└── uses IgniterLogEntry, IgniterLoggerOptions (interfaces)

StandardSchemaV1
	└── extends StandardTypedV1 (types only)

StandardJSONSchemaV1
	└── extends StandardTypedV1 (types only)
```

## 6. Maintenance Checklist

When modifying this package:

1. **Verify stability:** changes must be additive when possible.
2. **Avoid new dependencies:** do not add runtime deps.
3. **Preserve types:** do not rename existing interfaces or exports.
4. **Update documentation:** README and AGENTS must reflect any behavior change.
5. **Test:** update or add tests in downstream packages if behavior changes.

## 7. Common Pitfalls (Maintainers)

- **Breaking changes:** renaming types or removing fields is a breaking change for all packages.
- **Logging assumptions:** `IgniterError` only calls `logger.error` with an error-like object. Do not change the call shape without verifying all logger implementations.
- **Schema contracts:** `StandardSchemaV1` and `StandardJSONSchemaV1` are *contracts*, not implementations.

---

# II. CONSUMER GUIDE (Developer Manual)

## 8. Distribution Anatomy (Consumption)

Build output and exports are defined in `package.json`:

```
exports:
	".":
		types: "./dist/index.d.ts"
		import: "./dist/index.mjs"
		require: "./dist/index.js"
```

Consumers import from the root entrypoint only:

```ts
import { IgniterError, IgniterLogLevel } from "@igniter-js/common";
import type { IgniterLogger, StandardSchemaV1 } from "@igniter-js/common";
```

## 9. Quick Start & Common Patterns

### Minimal Error + Logger

```ts
import { IgniterError, IgniterLogLevel, type IgniterLogger } from "@igniter-js/common";

const logger: IgniterLogger = {
	log(level, message) {
		console.log(`[${level}]`, message);
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
	message: "Invalid payload",
	code: "INVALID_PAYLOAD",
	statusCode: 400,
	logger,
});

logger.log(IgniterLogLevel.INFO, "Error created", err.toJSON());
```

### Minimal StandardSchemaV1

```ts
import type { StandardSchemaV1 } from "@igniter-js/common";

const schema: StandardSchemaV1<number> = {
	"~standard": {
		version: 1,
		vendor: "custom",
		validate(value) {
			if (typeof value !== "number") return { issues: [{ message: "Expected number" }] };
			return { value };
		},
	},
};
```

## 10. Real-World Use Case Library

### Case A — HTTP Error Normalization

```ts
import { IgniterError } from "@igniter-js/common";

export function toHttpError(err: unknown) {
	if (err instanceof IgniterError) return err;
	return new IgniterError({ message: "Internal error", code: "INTERNAL" });
}
```

### Case B — Background Job Logging

```ts
const jobLogger = logger.child("jobs", { jobId: "job-42" });
jobLogger.info("Job started");
jobLogger.success("Job finished");
```

### Case C — CLI Configuration Validation

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
```

### Case D — Schema-driven Data Import

```ts
async function validateRow<T>(schema: StandardSchemaV1<T>, row: unknown) {
	const result = await schema["~standard"].validate(row);
	if ("issues" in result) {
		throw new IgniterError({ message: "Row invalid", code: "ROW_INVALID", details: result.issues });
	}
	return result.value;
}
```

### Case E — JSON Schema for Tooling

```ts
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

const openapiSchema = jsonSchema["~standard"].jsonSchema.output({ target: "openapi-3.0" });
```

### Case F — Multi-tenant Logging Context

```ts
const tenantLogger = logger.child("tenant", { tenantId: "t-42" });
tenantLogger.info("Billing cycle started");
```

## 11. Best Practices & Anti-Patterns

| Practice | Why | Example |
| --- | --- | --- |
| ✅ Use `IgniterError` for operational errors | Ensures machine-readable codes | `throw new IgniterError({ message: "Unauthorized", code: "UNAUTHORIZED" })` |
| ✅ Provide `statusCode` for HTTP | Downstream responders can use it | `statusCode: 401` |
| ✅ Keep `details` safe | It may be logged | `details: { field: "email" }` |
| ❌ Throw raw `Error` for domain failures | Loses structured context | `throw new Error("Not found")` |
| ❌ Log secrets in metadata | Risky and unnecessary | `metadata: { token }` |

## 12. Domain-Specific Guidance

### API Servers

- Use `IgniterError` in your error middleware.
- Add `statusCode` for all user-facing errors.

### CLI Tools

- Use `IgniterError.statusCode` as `process.exit` code.
- Use `details` to include file paths and invalid options.

### Observability Pipelines

- Use `IgniterLogger.child()` to bind request IDs or job IDs.
- Keep `logger.error` resilient (never throw).

---

# III. TECHNICAL REFERENCE & RESILIENCE

## 13. Exhaustive API Reference

### `IgniterError`

- Constructor parameters: `message`, `code`, `statusCode`, `causer`, `details`, `metadata`, `logger`, `cause`.
- Properties: `name`, `message`, `code`, `statusCode`, `details`, `metadata`, `causer`, `cause`, `stackTrace`.
- Method: `toJSON()` → `{ name, message, code, details, metadata, stackTrace }`.

### `IgniterLogger`

- Required methods: `log`, `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `success`, `group`, `groupEnd`, `child`, `setComponent`, `setAppName`, `setLevel`, `flush`, `separator`.

### `StandardSchemaV1`

- `validate(value, options)` returns `Result` or `Promise<Result>`.
- `Result` is either `{ value }` or `{ issues: Issue[] }`.

### `StandardJSONSchemaV1`

- `jsonSchema.input(options)` and `jsonSchema.output(options)` return JSON schema objects.
- `Options.target` must be a valid target (`draft-2020-12`, `draft-07`, `openapi-3.0`, or custom).

## 14. Troubleshooting & Error Library

### Error: `IgniterError` not serialized as expected

- **Context:** You are returning raw errors in an HTTP response.
- **Cause:** `toJSON()` was not used.
- **Mitigation:** Standardize error middleware.
- **Solution:**

```ts
return Response.json(err.toJSON(), { status: err.statusCode });
```

### Error: Logger implementation crashes your app

- **Context:** Logging errors in production cause process crashes.
- **Cause:** Logger methods throw.
- **Mitigation:** Wrap transport errors inside the logger.
- **Solution:**

```ts
error(message, err) {
	try {
		console.error(message, err);
	} catch {
		// swallow logger errors
	}
}
```

### Error: StandardSchemaV1 always passes

- **Context:** Invalid input still succeeds.
- **Cause:** You return `{ value }` in all cases.
- **Mitigation:** Return `{ issues }` for invalid input.
- **Solution:**

```ts
if (invalid) return { issues: [{ message: "Invalid" }] };
```

### Error: StandardSchemaV1 always fails

- **Context:** Valid input still fails.
- **Cause:** `issues: []` is returned, which is truthy.
- **Mitigation:** Return `{ value }` on success.
- **Solution:**

```ts
return { value };
```

### Error: JSON Schema target mismatch

- **Context:** Tooling expects OpenAPI 3.0 but receives draft-07.
- **Cause:** `Options.target` is not set correctly.
- **Mitigation:** Always pass explicit `target`.
- **Solution:**

```ts
jsonSchema["~standard"].jsonSchema.output({ target: "openapi-3.0" });
```

---

## 15. Contribution Checklist

When adding or updating primitives:

1. Update source definitions in `src/error` or `src/types`.
2. Update exports in `src/index.ts` (if new symbol).
3. Update `README.md` and this `AGENTS.md`.
4. Ensure changes are additive and backwards compatible.
5. Run `pnpm test --filter @igniter-js/common` if tests are added.

---

## 16. Change Log Discipline

- Update `CHANGELOG.md` for any behavior change.
- If behavior impacts other packages, coordinate updates in their README/AGENTS docs.
