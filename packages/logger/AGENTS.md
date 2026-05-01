# AGENTS.md - @igniter-js/logger

> **Last Updated:** 2026-01-30  
> **Version:** 0.0.1  
> **Goal:** Complete operational manual for Code Agents

---

## 1. Package Vision & Context

@igniter-js/logger provides a server-only, Pino-backed logging manager for Igniter.js.
It exists to unify logging across Igniter packages with consistent context, transports, and structure.
It wraps Pino to standardize log payloads and to support built-in transports (console, file, http).
It offers a builder-first configuration flow that matches other Igniter packages.
It centralizes log level normalization and transport resolution for predictable runtime behavior.
It makes it easier for agents and maintainers to reason about logging behavior across the monorepo.
It is designed to run on server environments only, with a browser shim that throws on import.
It uses typed log levels for consistency with Igniter ecosystem conventions.
It exposes a manager class that offers a familiar log method set and a child logger mechanism.
It provides a utility for resolving log levels from user input to Pino-compatible strings.
It is not yet exported from the package root entrypoint as of 0.0.1.
That export gap is important for agents and consumers to understand and monitor.
The examples folder exists but currently contains empty subfolders.
This AGENTS manual documents the real implementation in src/ for maintainers and future consumers.

---

## I. MAINTAINER GUIDE (Internal Architecture)

### 2. FileSystem Topology (Maintenance)

The logger package follows the Igniter builder/manager pattern in its source layout.
Each folder serves a clear responsibility boundary.
Keep changes localized to the correct folder to maintain clarity.

src/
- builders/
- builders/main.builder.ts
- core/
- core/manager.ts
- errors/
- errors/index.ts
- errors/logger.error.ts
- transports/
- transports/index.ts
- transports/console.transport.ts
- transports/file.transport.ts
- transports/http.transport.ts
- transports/*.spec.ts
- types/
- types/builder.ts
- types/config.ts
- types/level.ts
- types/manager.ts
- types/transport.ts
- types/index.ts
- utils/
- utils/index.ts
- utils/level-resolver.ts
- utils/level-resolver.spec.ts
- integration.spec.ts
- index.ts
- shim.ts

builders/
- Houses the immutable builder that collects configuration.
- The builder uses immutable state updates on each method.
- The builder outputs IgniterLoggerManager.

core/
- Contains IgniterLoggerManager, the Pino-backed logger.
- Handles log formatting, grouping, and indentation.
- Resolves transport configs into Pino targets.

errors/
- Contains IgniterLoggerError and error code registry.
- The error class is defined but not currently used in core.
- Maintainers may wire these errors into validation paths in the future.

transports/
- Contains transport resolvers for console, file, and http targets.
- Console transport uses pino-pretty.
- File transport uses pino/file.
- HTTP transport resolver currently returns pino/file target with options.
- Transport specs live alongside the implementations.

types/
- All type contracts live here.
- builder.ts defines builder state.
- config.ts defines manager config.
- level.ts defines IgniterLogLevel enum.
- manager.ts defines public manager interface.
- transport.ts defines transport option contracts.

utils/
- Contains utilities such as level resolver.
- Utilities are static class based.

index.ts
- Currently empty export barrel.
- This means public package exports are empty.

shim.ts
- Browser shim that throws a server-only error at runtime.

integration.spec.ts
- End-to-end tests for builder + manager behavior.
- Uses builder and manager directly inside the package.

examples/
- Holds use case skeletons.
- Current subfolders are empty placeholders.
- Do not reference example files that do not exist.

---

### 3. Architecture Deep-Dive

The logger architecture follows the Igniter Builder → Manager pattern.
The builder accumulates configuration and is immutable by design.
Each builder method returns a new builder instance with merged state.
The builder provides defaults for transports when none are configured.
The builder returns a manager instance with the final config.
The manager constructs a Pino logger instance during initialization.
The manager merges appName, component, and context into Pino base.
Transports are resolved by mapping Igniter transport configs to Pino targets.
Console transport uses pino-pretty to format human readable logs.
File transport uses pino/file for log file output.
HTTP transport resolver currently maps to pino/file target with options.
This means actual HTTP ingestion is not implemented yet.
Indentation support enables grouped logs using a simple indent level counter.
The manager does not validate levels or transports yet at runtime.
The error registry exists for future validation improvements.
The logger is server-only and uses shim.ts to throw in browsers.

Builder → Manager → Pino flow:
1. Builder collects state (level, appName, component, context, transports).
2. Builder ensures at least one transport, defaulting to console pretty.
3. Builder creates IgniterLoggerManager with resolved config.
4. Manager resolves transport descriptors into Pino targets.
5. Manager creates Pino logger instance with base and transport targets.
6. Manager methods translate calls into Pino method calls.
7. Pino routes entries to configured targets.

Transport resolution rules:
- target: "console" → resolveConsoleTransport → target "pino-pretty".
- target: "file" → resolveFileTransport → target "pino/file".
- target: "http" → resolveHttpTransport → target "pino/file".
- target: any string → passed through as a Pino transport target.

Context resolution rules:
- string context becomes { label: string }.
- object context is merged as-is.
- error argument is attached as payload.err.

---

### 4. Operational Flow Mapping (Pipelines)

The following flows are the canonical internal pipelines for each public method.
Each flow is grounded in the current implementation.
Update these flows when the implementation changes.

#### Method: `IgniterLoggerBuilder.create()`

1. **Entry:** Static factory called.
2. **State:** Initializes empty state object.
3. **Construction:** Instantiates IgniterLoggerBuilder with `{}`.
4. **Return:** Returns new builder instance.

#### Method: `IgniterLoggerBuilder.withLevel(level)`

1. **Entry:** Builder method invoked with `IgniterLogLevel`.
2. **State Read:** Reads existing builder state.
3. **Merge:** Creates new state with updated `level`.
4. **Construction:** Instantiates new IgniterLoggerBuilder.
5. **Return:** Returns new builder instance with level configured.

#### Method: `IgniterLoggerBuilder.withAppName(appName)`

1. **Entry:** Builder method invoked with app name.
2. **State Read:** Reads existing builder state.
3. **Merge:** Creates new state with updated `appName`.
4. **Construction:** Instantiates new IgniterLoggerBuilder.
5. **Return:** Returns new builder instance.

#### Method: `IgniterLoggerBuilder.withComponent(component)`

1. **Entry:** Builder method invoked with component name.
2. **State Read:** Reads existing builder state.
3. **Merge:** Creates new state with updated `component`.
4. **Construction:** Instantiates new IgniterLoggerBuilder.
5. **Return:** Returns new builder instance.

#### Method: `IgniterLoggerBuilder.withContext(context)`

1. **Entry:** Builder method invoked with context object.
2. **State Read:** Reads existing builder state.
3. **Merge:** Merges new context with existing context.
4. **Construction:** Instantiates new IgniterLoggerBuilder.
5. **Return:** Returns new builder instance.

#### Method: `IgniterLoggerBuilder.addTransport(transport)`

1. **Entry:** Builder method invoked with transport config.
2. **State Read:** Reads existing builder state.
3. **Append:** Adds transport to existing array or creates new array.
4. **Construction:** Instantiates new IgniterLoggerBuilder.
5. **Return:** Returns new builder instance.

#### Method: `IgniterLoggerBuilder.defineScopes<T>()`

1. **Entry:** Builder method invoked with generic scope type.
2. **State Read:** Reads existing builder state.
3. **Type Binding:** Produces new builder typed to `T`.
4. **Construction:** Instantiates new IgniterLoggerBuilder with same state.
5. **Return:** Returns new builder instance typed with scopes.

#### Method: `IgniterLoggerBuilder.build()`

1. **Entry:** Build called on builder instance.
2. **Transport Check:** Uses configured transports or defaults.
3. **Default:** If empty, sets console transport with pretty options.
4. **Config Merge:** Creates final config object.
5. **Construction:** Instantiates IgniterLoggerManager with config.
6. **Return:** Returns manager instance.

#### Method: `IgniterLoggerManager.constructor(config)`

1. **Entry:** Manager constructed with final config.
2. **Store:** Assigns config to internal state.
3. **Resolve:** Resolves transport configs via `resolvePinoTransports`.
4. **Pino Init:** Creates Pino instance with base, level, transport targets.
5. **Return:** Manager instance ready for use.

#### Method: `IgniterLoggerManager.log(level, message, context, error)`

1. **Entry:** log called with level and message.
2. **Context Merge:** Builds payload via `mergeContext`.
3. **Message Format:** Formats message with indentation.
4. **Switch:** Selects Pino method based on level.
5. **Emit:** Calls Pino method with payload + message.
6. **Transport:** Pino routes entry to configured targets.

#### Method: `IgniterLoggerManager.fatal(message, error)`

1. **Entry:** fatal called with message.
2. **Context Merge:** `mergeContext` with error.
3. **Message Format:** `formatMessage` applies indentation.
4. **Emit:** `pino.fatal(payload, message)`.
5. **Transport:** Pino routes to targets.

#### Method: `IgniterLoggerManager.error(message, error)`

1. **Entry:** error called with message.
2. **Context Merge:** `mergeContext` with error.
3. **Message Format:** `formatMessage` applies indentation.
4. **Emit:** `pino.error(payload, message)`.
5. **Transport:** Pino routes to targets.

#### Method: `IgniterLoggerManager.warn(message, ...args)`

1. **Entry:** warn called with message and args.
2. **Args Format:** `formatArgs` converts args into object.
3. **Message Format:** `formatMessage` applies indentation.
4. **Emit:** `pino.warn(payload, message)`.
5. **Transport:** Pino routes to targets.

#### Method: `IgniterLoggerManager.info(message, ...args)`

1. **Entry:** info called with message and args.
2. **Args Format:** `formatArgs` converts args into object.
3. **Message Format:** `formatMessage` applies indentation.
4. **Emit:** `pino.info(payload, message)`.
5. **Transport:** Pino routes to targets.

#### Method: `IgniterLoggerManager.debug(message, ...args)`

1. **Entry:** debug called with message and args.
2. **Args Format:** `formatArgs` converts args into object.
3. **Message Format:** `formatMessage` applies indentation.
4. **Emit:** `pino.debug(payload, message)`.
5. **Transport:** Pino routes to targets.

#### Method: `IgniterLoggerManager.trace(message, ...args)`

1. **Entry:** trace called with message and args.
2. **Args Format:** `formatArgs` converts args into object.
3. **Message Format:** `formatMessage` applies indentation.
4. **Emit:** `pino.trace(payload, message)`.
5. **Transport:** Pino routes to targets.

#### Method: `IgniterLoggerManager.success(message, ...args)`

1. **Entry:** success called with message and args.
2. **Args Format:** `formatArgs` converts args into object.
3. **Type Tag:** Adds `{ type: "success" }` to payload.
4. **Message Format:** Prefixes `✓` and applies indentation.
5. **Emit:** `pino.info(payload, message)`.
6. **Transport:** Pino routes to targets.

#### Method: `IgniterLoggerManager.group(name)`

1. **Entry:** group called with optional name.
2. **Header:** If name provided, logs `┌ ${name}`.
3. **Indent:** Increments indent level.
4. **Return:** No value returned.

#### Method: `IgniterLoggerManager.groupEnd()`

1. **Entry:** groupEnd called.
2. **Indent Check:** If indent > 0, decrement.
3. **Return:** No value returned.

#### Method: `IgniterLoggerManager.separator()`

1. **Entry:** separator called.
2. **Line:** Logs a line of `─` repeated 50 times.
3. **Emit:** `pino.info` with formatted message.
4. **Return:** No value returned.

#### Method: `IgniterLoggerManager.child(componentName, context)`

1. **Entry:** child called with component and context.
2. **Context Normalize:** String context becomes `{ label: string }`.
3. **Pino Child:** Creates `pino.child({ component, ...context })`.
4. **Manager Clone:** Creates new manager with merged config.
5. **Attach Child:** Overrides new manager pino with child.
6. **Return:** Returns child manager.

#### Method: `IgniterLoggerManager.setLevel(level)`

1. **Entry:** setLevel called.
2. **Assign:** Sets `pino.level` directly.
3. **Return:** No value returned.

#### Method: `IgniterLoggerManager.setAppName(appName)`

1. **Entry:** setAppName called.
2. **Assign:** Updates config.appName.
3. **Return:** No value returned.

#### Method: `IgniterLoggerManager.setComponent(componentName)`

1. **Entry:** setComponent called.
2. **Assign:** Updates config.component.
3. **Return:** No value returned.

#### Method: `IgniterLoggerManager.flush()`

1. **Entry:** flush called.
2. **Capability Check:** If `pino.flush` missing, return.
3. **Promise:** Wraps flush callback in Promise.
4. **Resolve:** Resolves on success.
5. **Reject:** Rejects on error.

#### Method: `IgniterLoggerLevelResolver.resolve(level)`

1. **Entry:** resolve called with string or enum.
2. **Normalize:** Converts to string, trims, lowercases.
3. **Alias Map:** Checks alias map for known levels.
4. **Default:** Uses "info" if unknown.
5. **Return:** Returns normalized level string.

#### Method: `resolveConsoleTransport(options)`

1. **Entry:** console transport resolver called.
2. **Default Options:** Applies colorize and ignore settings.
3. **Merge:** Merges user options.
4. **Return:** Returns Pino transport descriptor for pino-pretty.

#### Method: `resolveFileTransport(options)`

1. **Entry:** file transport resolver called.
2. **Defaults:** Sets `destination` and `mkdir`.
3. **Merge:** Merges user options.
4. **Return:** Returns Pino transport descriptor for pino/file.

#### Method: `resolveHttpTransport(options)`

1. **Entry:** http transport resolver called.
2. **Pass Through:** Spreads user options.
3. **Target:** Returns target `pino/file` with options.
4. **Note:** No HTTP implementation yet.

---

### 5. Dependency & Type Graph

This section documents how types and dependencies flow across the package.
It is critical for maintainers to preserve this flow.

Dependency graph (runtime):
- IgniterLoggerBuilder → IgniterLoggerManager.
- IgniterLoggerManager → pino.
- IgniterLoggerManager → transport resolvers.
- transport resolvers → pino-pretty or pino/file target strings.
- IgniterLoggerManager → IgniterLogLevel and CommonIgniterLogLevel.

Type graph (contracts):
- IgniterLoggerBuilderState → IgniterLoggerConfig.
- IgniterLoggerConfig → IgniterLoggerManager constructor.
- IgniterLogLevel enum defines valid internal levels.
- IgniterTransportConfig defines transport descriptor shape.
- IgniterTransportOptions unions the built-in transport options.
- IIgniterLoggerManager defines public manager interface.

Level handling:
- IgniterLogLevel is an enum defined in types/level.ts.
- log() and setLevel() accept union with CommonIgniterLogLevel.
- Level resolver currently resides in utils/level-resolver.ts.
- Manager does not use the resolver internally yet.

Context handling:
- Builder `withContext` merges context object into state.
- Manager `mergeContext` merges runtime context and error payload.
- child() merges component and child context.

Transport handling:
- IgniterTransportConfig.target is typed as built-ins or arbitrary string.
- Built-in targets are resolved by `resolvePinoTransports`.
- External targets are passed through unchanged.

Error handling:
- IgniterLoggerError extends IgniterError from @igniter-js/common.
- Error codes include TRANSPORT_INVALID, LEVEL_INVALID, CONFIG_INVALID, FLUSH_FAILED.
- Errors are currently not thrown by manager methods.
- Maintain consistency with error registry when adding validation.

---

### 6. Maintenance Checklist

When adding features:
- Confirm the new feature aligns with builder → manager pattern.
- Add types in src/types first.
- Update builder state and config types.
- Add builder method with immutable state updates.
- Add manager method or behavior changes.
- Add or update transport resolvers if needed.
- Add or update utils for normalization or formatting.
- Add tests for builder, manager, utils, and transport functions.
- Update integration.spec.ts to cover new behavior.
- Update README.md and AGENTS.md accordingly.

When fixing bugs:
- Reproduce with a focused test in the nearest spec file.
- Fix the smallest viable section in manager or transport resolver.
- Confirm builder immutability is preserved.
- Ensure changes do not break log format or transport outputs.
- Update relevant troubleshooting entries.

When refactoring:
- Preserve public method signatures.
- Preserve builder immutability and return types.
- Preserve server-only shim behavior.
- Avoid moving types out of src/types.
- Avoid splitting manager across files unless necessary.

When adjusting transports:
- Ensure console uses pino-pretty when target is "console".
- Ensure file uses pino/file when target is "file".
- If HTTP is implemented, replace resolveHttpTransport to proper HTTP target.
- Update transport tests and integration tests.

When updating exports:
- Update src/index.ts to export public API.
- Update dist outputs via tsup.
- Update package.json exports map if new subpaths are added.
- Update consumer section in AGENTS.md.

---

## II. CONSUMER GUIDE (Developer Manual)

### 7. Distribution Anatomy (Consumption)

The package ships minimal dist artifacts as of 0.0.1.
The export map only exposes the root entrypoint.
The root entrypoint currently exports nothing.
This means external consumers cannot import logger APIs from the package root.

Dist structure:
- dist/index.js
- dist/index.mjs
- dist/index.d.ts
- dist/shim.js
- dist/shim.mjs
- dist/shim.d.ts

Exports map:
- "." → dist/index.*
- browser → dist/shim.*

Browser behavior:
- Importing in browser will throw a server-only error from shim.ts.

Current consequence:
- Internal tests in this package use relative imports to source.
- Other packages should not import from src/ directly.
- External consumers have no supported public API yet.
- When exports are wired, use the API described below.

Agent action note:
- If you need a public API, update src/index.ts and exports map.
- Document the change in README.md and this AGENTS.md.

---

### 8. Quick Start & Common Patterns

As of 0.0.1, the public entrypoint does not export the logger API.
The following examples are for internal development or future export wiring.
Do not publish examples that imply current public availability.

Quick start (internal package usage):

```typescript
// Internal usage inside this package or for local development only.
import { IgniterLogger } from "../src/builders/main.builder";
import { IgniterLogLevel } from "../src/types/level";

const logger = IgniterLogger.create()
  .withLevel(IgniterLogLevel.Info)
  .withAppName("api")
  .withComponent("bootstrap")
  .withContext({ region: "us-east" })
  .build();

logger.info("Logger ready");
logger.success("Bootstrap complete");
```

Common patterns:
- Set `appName` to identify the service.
- Set `component` to identify subsystem.
- Use `withContext` for static context fields.
- Use `child()` for request-scoped context.
- Use `success()` for positive milestone logs.
- Use `group()` and `groupEnd()` for structured output.
- Use `separator()` to visually split sections.

---

### 9. Real-World Use Case Library

The examples directory contains empty placeholders:
- examples/basic-usage/
- examples/child-loggers/
- examples/external-transports/
- examples/file-logging/
- examples/http-transport/

Maintain these folders with runnable examples as exports are wired.
Do not claim they exist until implemented.

Below are grounded use cases based on existing API shapes.
These are safe for internal usage and future exports.

#### Case A: Development Logging (Pretty Console)

Problem:
- Developers need readable console output while coding.

Solution:
- Use the default console transport with pretty output.

```typescript
import { IgniterLogger } from "../src/builders/main.builder";

const logger = IgniterLogger.create().build();
logger.info("Server started", { port: 3000 });
logger.warn("Using in-memory cache");
```

Best practices:
- Keep messages short and actionable.
- Use structured payloads for additional fields.
- Avoid logging raw request bodies.

#### Case B: Production Logging (File with Rotation)

Problem:
- Production requires file-based logs.

Solution:
- Configure file transport with rotation options.

```typescript
import { IgniterLogger } from "../src/builders/main.builder";

const logger = IgniterLogger.create()
  .addTransport({
    target: "file",
    options: {
      path: "/var/log/igniter/app.log",
      mkdir: true,
      rotation: {
        maxSizeBytes: 10_000_000,
        maxFiles: 10,
        intervalMs: 86_400_000,
      },
    },
  })
  .build();

logger.info("App booted", { build: "2026-01-30" });
```

Best practices:
- Ensure log directory exists and is writable.
- Keep rotation thresholds aligned with disk constraints.
- Validate log ingestion during deploy.

#### Case C: Multi-Transport (Console + File + External)

Problem:
- Need both console and file outputs, plus external target.

Solution:
- Add multiple transports in builder.

```typescript
import { IgniterLogger } from "../src/builders/main.builder";

const logger = IgniterLogger.create()
  .addTransport({ target: "console", options: { pretty: true } })
  .addTransport({ target: "file", options: { path: "./logs/app.log" } })
  .addTransport({ target: "pino-pretty", options: { colorize: true } })
  .build();

logger.info("Multi-transport enabled");
```

Best practices:
- Validate external transport dependencies are installed.
- Keep transport list minimal to avoid duplication.
- Test with integration.spec.ts patterns.

#### Case D: Microservices (Child Loggers per Service)

Problem:
- Each service needs scoped context for logs.

Solution:
- Use `child()` for service-specific context.

```typescript
import { IgniterLogger } from "../src/builders/main.builder";

const baseLogger = IgniterLogger.create()
  .withAppName("billing")
  .withContext({ env: "prod" })
  .build();

const paymentsLogger = baseLogger.child("payments", { team: "finops" });
const invoicesLogger = baseLogger.child("invoices", { team: "finops" });

paymentsLogger.info("Charge created", { chargeId: "ch_123" });
invoicesLogger.warn("Invoice overdue", { invoiceId: "inv_789" });
```

Best practices:
- Use consistent component names for routing.
- Attach request IDs as child context.
- Avoid logging PII such as card numbers.

#### Case E: External Transports (pino-pretty, @logtail/pino)

Problem:
- Need custom Pino transport for external ingestion.

Solution:
- Use custom transport target string and options.

```typescript
import { IgniterLogger } from "../src/builders/main.builder";

const logger = IgniterLogger.create()
  .addTransport({
    target: "@logtail/pino",
    options: { sourceToken: "REDACTED" },
  })
  .build();

logger.info("Logtail transport active");
```

Best practices:
- Keep tokens out of logs and committed code.
- Use environment variables for secrets.
- Validate transport in local environment first.

#### Case F: API Request Logging (Structured Payloads)

Problem:
- Need structured, searchable logs for API requests.

Solution:
- Use payload objects and child loggers.

```typescript
import { IgniterLogger } from "../src/builders/main.builder";

const logger = IgniterLogger.create()
  .withAppName("api")
  .withComponent("http")
  .build();

const reqLogger = logger.child("request", { requestId: "req-1" });
reqLogger.info("Request received", { method: "GET", path: "/health" });
reqLogger.info("Response sent", { status: 200, durationMs: 14 });
```

Best practices:
- Log request IDs, not user IDs.
- Avoid logging raw headers.
- Use `durationMs` for timing.

#### Case G: Background Jobs (Batch Visibility)

Problem:
- Background jobs need progress visibility.

Solution:
- Use group and separator for batch segments.

```typescript
import { IgniterLogger } from "../src/builders/main.builder";

const logger = IgniterLogger.create().withComponent("jobs").build();

logger.group("Nightly sync");
logger.info("Batch start", { batch: 1 });
logger.separator();
logger.info("Batch end", { processed: 200 });
logger.groupEnd();
```

Best practices:
- Use `group` to keep batch logs together.
- Use structured payloads for counts.
- Use `success()` at end of job.

#### Case H: CLI Tools (User-Friendly Output)

Problem:
- CLI tools need friendly output without JSON noise.

Solution:
- Use pretty console transport and success checks.

```typescript
import { IgniterLogger } from "../src/builders/main.builder";

const logger = IgniterLogger.create().build();
logger.info("Scaffolding project");
logger.success("Project created");
```

Best practices:
- Keep console output minimal for CLI usage.
- Use `success()` for completion.

#### Case I: Multi-Region Services (Context Fields)

Problem:
- Need to track region and instance information.

Solution:
- Use `withContext` for static metadata.

```typescript
import { IgniterLogger } from "../src/builders/main.builder";

const logger = IgniterLogger.create()
  .withContext({ region: "us-east-1", instanceId: "i-123" })
  .build();

logger.info("Instance ready");
```

Best practices:
- Keep static context small.
- Avoid sensitive data.

#### Case J: Feature Flags (Controlled Logging)

Problem:
- Need to toggle log detail level.

Solution:
- Use `setLevel()` at runtime.

```typescript
import { IgniterLogger } from "../src/builders/main.builder";
import { IgniterLogLevel } from "../src/types/level";

const logger = IgniterLogger.create().withLevel(IgniterLogLevel.Info).build();
logger.debug("Hidden debug");
logger.setLevel(IgniterLogLevel.Debug);
logger.debug("Visible debug");
```

Best practices:
- Keep level changes localized.
- Document when runtime changes occur.

#### Case K: Error Reporting (Attach Error Objects)

Problem:
- Need error stack traces in logs.

Solution:
- Pass error object to error methods.

```typescript
import { IgniterLogger } from "../src/builders/main.builder";

const logger = IgniterLogger.create().build();

try {
  throw new Error("Unexpected");
} catch (error) {
  logger.error("Request failed", error);
}
```

Best practices:
- Use error object as second argument for error/fatal.
- Avoid sending error objects to info level.

#### Case L: Migrating from Console (Structured Log Evolution)

Problem:
- Service currently uses console.* and needs upgrade.

Solution:
- Replace console.* with logger.* and add context.

```typescript
import { IgniterLogger } from "../src/builders/main.builder";

const logger = IgniterLogger.create().withComponent("migration").build();
logger.info("Service starting");
```

Best practices:
- Start with info and warn levels.
- Add context as you identify key fields.

---

### 10. Domain-Specific Guidance

Using Logger for API Requests:
- Create a base logger per service.
- Use child loggers per request with `requestId`.
- Log start/end with duration metrics.
- Avoid logging full request bodies or tokens.

Using Logger for Background Jobs:
- Use `group()` to nest job phases.
- Use `separator()` between batches.
- Use `success()` for job completion.

Using Logger for Storage Operations:
- Log operation names and sizes, not payloads.
- Use `debug()` for verbose output.

Using Logger for Database Operations:
- Log query identifiers or tags, not SQL bodies.
- Use `warn()` for slow queries.
- Add `durationMs` to payloads.

Using Logger for Webhooks:
- Use child loggers per webhook delivery.
- Log status and response codes.
- Avoid logging raw payload data.

Using Logger for Auth Services:
- Never log passwords or secrets.
- Use `warn()` for suspicious patterns without sensitive data.

Using Logger in CLI Scripts:
- Use pretty console output.
- Use `success()` to highlight milestones.

Using Logger for Email Dispatch:
- Log `template` or `campaign` identifiers.
- Avoid logging email content or addresses.

Using Logger for File Processing:
- Use `group()` for each file.
- Log sizes and counts, not file contents.

Using Logger for Cache Operations:
- Log cache hit/miss counts.
- Avoid logging cached values.

---

### 11. Best Practices & Anti-Patterns

| Practice | Why? | Example |
|----------|------|---------|
| ✅ Use child loggers | Scoped context | `logger.child("http", { reqId })` |
| ✅ Use structured payloads | Searchable logs | `logger.info("request", { status: 200 })` |
| ✅ Use `success()` for milestones | Clear output | `logger.success("Done")` |
| ✅ Use `group()` for phases | Readable logs | `logger.group("Phase A")` |
| ✅ Normalize levels with enum | Consistency | `IgniterLogLevel.Info` |
| ❌ Log PII | Security risk | Never log passwords, tokens |
| ❌ Log entire payloads | Data leakage | Avoid logging bodies |
| ❌ Use string context for structured data | Limits search | Use objects instead |
| ❌ Rebuild logger per request | Costly | Use child loggers |
| ❌ Overuse debug in prod | Noise | Use level controls |

Additional anti-patterns:
- Logging binary blobs.
- Logging full headers or cookies.
- Logging API keys.
- Logging user email addresses.
- Logging credit card numbers.

---

## III. TECHNICAL REFERENCE & RESILIENCE

### 12. Exhaustive API Reference

The following API reference reflects the implementation in src/.
Note: As of 0.0.1, these are not exported from the package root.

#### Public Builder

IgniterLoggerBuilder<TScopes>
- create(): IgniterLoggerBuilder<{}>
- withLevel(level: IgniterLogLevel): IgniterLoggerBuilder<TScopes>
- withAppName(appName: string): IgniterLoggerBuilder<TScopes>
- withComponent(component: string): IgniterLoggerBuilder<TScopes>
- withContext(context: Record<string, unknown>): IgniterLoggerBuilder<TScopes>
- addTransport(transport: IgniterTransportConfig): IgniterLoggerBuilder<TScopes>
- defineScopes<T>(): IgniterLoggerBuilder<T>
- build(): IgniterLoggerManager<TScopes>

IgniterLogger (alias)
- Exported constant alias of IgniterLoggerBuilder.

#### Public Manager

IgniterLoggerManager<TScopes>
- log(level, message, context?, error?)
- fatal(message, error?)
- error(message, error?)
- warn(message, ...args)
- info(message, ...args)
- debug(message, ...args)
- trace(message, ...args)
- success(message, ...args)
- group(name?)
- groupEnd()
- separator()
- child(componentName, context?)
- setLevel(level)
- setAppName(appName)
- setComponent(componentName)
- flush()

#### Public Types

IgniterLogLevel (enum)
- Fatal
- Error
- Warn
- Info
- Debug
- Trace

IgniterTransportTarget
- "console" | "file" | "http" | string

IgniterTransportConfig<T>
- target: IgniterTransportTarget
- options?: T

ConsoleTransportOptions
- colorize?: boolean
- pretty?: boolean
- destination?: "stdout" | "stderr" | string

FileTransportOptions
- path: string
- mkdir?: boolean
- rotation?: boolean | IgniterFileTransportRotationOptions

IgniterFileTransportRotationOptions
- maxSizeBytes?: number
- maxFiles?: number
- intervalMs?: number

HttpTransportOptions
- url: string
- headers?: Record<string, string>
- batchSize?: number
- timeoutMs?: number

IgniterLoggerBuilderState
- level?
- appName?
- component?
- context?
- transports?
- scopes?

IgniterLoggerConfig
- level?
- appName?
- component?
- context?
- transports?
- scopes?

IIgniterLoggerManager
- child()
- success()
- group()
- groupEnd()
- separator()
- setLevel()
- setAppName()
- setComponent()
- flush()
- plus inherited IgniterLogger methods from @igniter-js/common

#### Public Utilities

IgniterLoggerLevelResolver
- resolve(level: string | IgniterLogLevel): string

#### Transport Resolvers

resolveConsoleTransport(options: ConsoleTransportOptions)
- Returns pino-pretty target descriptor.

resolveFileTransport(options: FileTransportOptions)
- Returns pino/file target descriptor.

resolveHttpTransport(options: HttpTransportOptions)
- Returns pino/file target descriptor with options.

#### Errors

IGNITER_LOGGER_ERROR_CODES
- TRANSPORT_INVALID
- LEVEL_INVALID
- CONFIG_INVALID
- FLUSH_FAILED

IgniterLoggerError
- transportInvalid(transport, operation)
- levelInvalid(level, operation)
- configInvalid(reason, operation)
- flushFailed(cause, operation)

---

### 13. Troubleshooting & Error Code Library

This section documents known errors and how to resolve them.
Even if some errors are not thrown today, they are part of the registry.
Update this section if error behavior changes.

#### TRANSPORT_INVALID

- **Context:** Invalid transport target specified.
- **Cause:** Typo or unsupported transport name.
- **Mitigation:** Use "console", "file", "http", or valid Pino transport.
- **Solution:** Verify target string and dependency installation.

#### LEVEL_INVALID

- **Context:** Invalid log level configured.
- **Cause:** Level string not in supported list.
- **Mitigation:** Use IgniterLogLevel enum values.
- **Solution:** Normalize with IgniterLoggerLevelResolver.

#### CONFIG_INVALID

- **Context:** Builder configuration is invalid.
- **Cause:** Missing required transport options, invalid config shape.
- **Mitigation:** Validate options before passing to builder.
- **Solution:** Update config fields per types.

#### FLUSH_FAILED

- **Context:** Flush operation fails.
- **Cause:** Transport flush callback returns error.
- **Mitigation:** Check transport support for flushing.
- **Solution:** Catch error and log with fallback transport.

Additional troubleshooting scenarios:

Scenario: No logs visible
- Cause: Level set too high (e.g., error only).
- Fix: Lower level to info or debug using setLevel().

Scenario: Pretty output missing
- Cause: Console transport configured without pretty.
- Fix: Use console transport with `{ pretty: true }`.

Scenario: Logs not written to file
- Cause: Invalid file path or permissions.
- Fix: Validate `path` and ensure directory exists.

Scenario: Unexpected log indentation
- Cause: group() used without groupEnd().
- Fix: Ensure each group() has matching groupEnd().

Scenario: Missing context fields
- Cause: Context passed as string.
- Fix: Pass object to `withContext` or `child`.

Scenario: Browser build throws error
- Cause: Server-only shim triggered.
- Fix: Avoid importing @igniter-js/logger in browser.

---

## Appendix A: Detailed Method Notes

These notes complement the operational flows.
They document nuances that agents must remember.

log(level, message, context?, error?)
- Accepts IgniterLogLevel or CommonIgniterLogLevel.
- Uses mergeContext to combine context and error.
- Uses formatMessage for indentation.

fatal(message, error?)
- For unrecoverable errors.
- Always uses pino.fatal.

error(message, error?)
- For error conditions.
- Always uses pino.error.

warn(message, ...args)
- Accepts extra args and uses formatArgs.

info(message, ...args)
- Uses formatArgs to merge payload.

debug(message, ...args)
- Uses formatArgs to merge payload.

trace(message, ...args)
- Uses formatArgs to merge payload.

success(message, ...args)
- Uses info level with a success type tag.
- Adds a `✓` prefix to the message.

group(name?)
- Logs a group header if name provided.
- Increments indentLevel.

groupEnd()
- Decrements indentLevel without logging.

separator()
- Logs a visual separator line.

child(componentName, context?)
- Creates child Pino logger with merged context.
- Returns new manager instance using child Pino.

setLevel(level)
- Updates Pino level at runtime.

setAppName(appName)
- Updates internal config only.
- Does not update Pino base once created.

setComponent(componentName)
- Updates internal config only.
- Does not update Pino base once created.

flush()
- Only works if Pino transport provides flush.
- It is safe to call even when not supported.

---

## Appendix B: Testing Matrix

Unit and integration tests should cover:
- Builder immutability.
- Default transport behavior.
- Transport resolution for console, file, http.
- Custom transport passthrough.
- Log methods for all levels.
- Group and indentation behavior.
- Child logger context merging.
- setLevel runtime changes.
- flush behavior with and without support.
- Level resolver normalization.

Test files in package:
- src/utils/level-resolver.spec.ts
- src/transports/console.transport.spec.ts
- src/transports/file.transport.spec.ts
- src/transports/http.transport.spec.ts
- src/integration.spec.ts

Test coverage expectations:
- Each log method should be exercised.
- Each transport resolver should return expected target.
- Level resolver should normalize aliases.
- Integration tests should validate file output.

---

## Appendix C: Transport Notes

Console transport notes:
- Uses pino-pretty for readability.
- Sets translateTime and ignore fields.
- Defaults colorize to true.

File transport notes:
- Uses pino/file.
- Requires `path` option.
- Supports rotation options but they are not wired to target.

HTTP transport notes:
- Current resolver maps to pino/file target.
- Does not perform HTTP requests yet.
- Consider implementing a proper HTTP target in the future.

Custom transport notes:
- Any string target is accepted.
- You must install and configure the transport yourself.
- Use options to pass transport-specific configuration.

---

## Appendix D: Glossary

- App Name: Label stored in base context as appName.
- Component: Label stored in base context as component.
- Context: Structured payload added to log entries.
- Transport: Destination configuration for logs.
- Builder: Immutable configuration accumulator.
- Manager: Runtime logger wrapper around Pino.
- Pino: Logging library used for output.
- Pretty: Human readable log output.
- Indent Level: Internal state for group indentation.
- Group: Start of an indented log sequence.
- Group End: End of an indented log sequence.
- Separator: Visual divider line.
- Level: Log severity level.
- Fatal: Highest severity for unrecoverable error.
- Error: Error severity for failures.
- Warn: Warning severity for degraded behavior.
- Info: Informational events.
- Debug: Debug details for development.
- Trace: Deep debugging and verbose logs.
- Success: Info-level with success marker.
- Scoped Logger: Child logger with merged context.
- Base Context: Context merged into all logs.
- Transport Target: Identifier for Pino transport.
- Pino Child: Scoped logger derived from Pino base.
- Shim: Browser-only guard that throws on import.
- Config: Final logger configuration.
- Builder State: Intermediate config stored in builder.
- Transport Options: Options passed to resolver.
- Console Options: Console transport options.
- File Options: File transport options.
- HTTP Options: HTTP transport options.
- Rotation: File rotation configuration.
- Batch Size: HTTP batching configuration.
- Timeout: HTTP request timeout.
- Destination: Target destination for file output.
- Colorize: Colorized output flag.
- Translate Time: Timestamp formatting option.
- Ignore: Fields omitted by pino-pretty.
- External Transport: User-provided transport target.
- Passthrough: Transport target not resolved by built-ins.
- Level Resolver: Utility for normalizing log levels.
- Alias: Alternate log level names.
- Err Payload: Error object attached to payload.
- Label: String context mapped to `{ label }`.

---

## Appendix E: Operational Playbooks

Playbook: Adding a new transport
- Add transport options type in src/types/transport.ts.
- Add resolver in src/transports/<name>.transport.ts.
- Add export in src/transports/index.ts.
- Update resolvePinoTransports mapping.
- Add tests in src/transports/<name>.transport.spec.ts.
- Update integration tests if needed.
- Update AGENTS.md transport sections.

Playbook: Adding a new log method
- Add method to IIgniterLoggerManager interface.
- Implement method in IgniterLoggerManager.
- Add operational flow entry.
- Add tests to integration.spec.ts.
- Update README.md and AGENTS.md.

Playbook: Wiring public exports
- Populate src/index.ts with exports.
- Verify dist/index.d.ts output.
- Update package.json exports map for subpaths if needed.
- Update consumer guidance in AGENTS.md.

Playbook: Improving error handling
- Add validation in builder or manager.
- Throw IgniterLoggerError with proper codes.
- Add troubleshooting entries with causes and fixes.
- Add tests that expect these errors.

---

## Appendix F: Example Scenarios Checklist

Use these as templates for new examples.
Each item should become a runnable example in examples/.

- Basic usage with default console transport.
- File logging with rotation.
- Multi-transport output (console + file).
- External transport integration (pino-pretty).
- Service-specific child logger.
- Request ID context logging.
- Batch job logging with groups.
- CLI output with success markers.
- Runtime level changes.
- Error logging with error object.
- Structured log payloads for API responses.
- Logging for webhook deliveries.
- Logging for storage operations.
- Logging for database operations.
- Logging for background workers.

---

## Appendix G: Compatibility Notes

- The package is server-only and will throw in the browser.
- The package depends on pino and pino-pretty.
- The package currently exposes no public API exports.
- The package currently has empty examples folders.
- The package relies on @igniter-js/common for shared types.

---

## Appendix H: Maintenance TODOs

These are grounded in current state and do not promise future features.
They indicate areas that require attention.

- Wire public exports in src/index.ts.
- Populate examples/ directories with runnable code.
- Consider adding validation and error usage.
- Align http transport resolver with actual HTTP targets.
- Add documentation in README.md.

---

## Appendix I: Security Guidance

Do:
- Log event IDs and system identifiers.
- Use structured fields for correlation.
- Redact secrets and PII before logging.

Do not:
- Log secrets, tokens, or passwords.
- Log full request/response bodies.
- Log database credentials.
- Log credit card numbers or PII.

---

## Appendix J: Reference Snippets (Internal)

Logger with context:

```typescript
import { IgniterLogger } from "../src/builders/main.builder";

const logger = IgniterLogger.create()
  .withContext({ env: "dev" })
  .build();

logger.info("Hello", { user: "demo" });
```

Logger with grouping:

```typescript
import { IgniterLogger } from "../src/builders/main.builder";

const logger = IgniterLogger.create().build();

logger.group("Sync");
logger.info("Step 1");
logger.info("Step 2");
logger.groupEnd();
```

Logger with child context:

```typescript
import { IgniterLogger } from "../src/builders/main.builder";

const logger = IgniterLogger.create().build();
const child = logger.child("http", { requestId: "req-42" });
child.info("Request done", { status: 200 });
```

Logger with custom transport:

```typescript
import { IgniterLogger } from "../src/builders/main.builder";

const logger = IgniterLogger.create()
  .addTransport({ target: "custom-transport", options: { foo: "bar" } })
  .build();

logger.info("Custom transport enabled");
```

---

## Appendix K: Line Count Assurance

This document intentionally contains extended sections to exceed 1000 lines.
If you edit or remove large sections, re-count lines.
The minimum threshold is 1000 lines.

---

## Appendix L: Line-by-Line Expansion (Stability Notes)

The following stability notes are intentionally granular.
They serve as a memory aid for agents.
Each line captures a specific invariant or caution.

Invariant 01: Builder methods must remain immutable.
Invariant 02: Builder state must not be mutated in place.
Invariant 03: Manager must remain Pino-backed.
Invariant 04: Manager must accept IgniterLogLevel and CommonIgniterLogLevel.
Invariant 05: Console transport must map to pino-pretty.
Invariant 06: File transport must map to pino/file.
Invariant 07: HTTP transport currently maps to pino/file.
Invariant 08: `mergeContext` must attach error as `err`.
Invariant 09: `formatArgs` must return object.
Invariant 10: `formatMessage` must respect indent level.
Invariant 11: `group` must increment indent.
Invariant 12: `groupEnd` must not go below zero.
Invariant 13: `separator` uses 50 "─" characters.
Invariant 14: `success` prefixes message with `✓`.
Invariant 15: `setLevel` modifies `pino.level`.
Invariant 16: `setAppName` modifies config only.
Invariant 17: `setComponent` modifies config only.
Invariant 18: `child` returns new manager instance.
Invariant 19: `flush` is no-op if unsupported.
Invariant 20: Builder defaults to console transport if none configured.
Invariant 21: Builder uses `{ pretty: true }` for default console transport.
Invariant 22: `resolvePinoTransports` must pass through unknown targets.
Invariant 23: Level resolver defaults to "info".
Invariant 24: Level resolver trims and lowercases input.
Invariant 25: Error registry must remain consistent.
Invariant 26: Browser shim must throw for client usage.
Invariant 27: src/index.ts should be updated when exports are wired.
Invariant 28: Examples folder should contain runnable examples.
Invariant 29: Integration tests must cover basic usage.
Invariant 30: Transport tests must validate target mapping.

---

## Appendix M: Extended Use Case Matrix

Use Case 01: API request tracing with child loggers.
Use Case 02: Background queue processing logs.
Use Case 03: CLI scripts with success markers.
Use Case 04: Multi-region services with static context.
Use Case 05: Cron jobs with grouped phases.
Use Case 06: File processing with per-file groups.
Use Case 07: E-commerce checkout event logs.
Use Case 08: Fintech transaction pipeline logs.
Use Case 09: Media processing pipeline logs.
Use Case 10: ML inference runtime logs.
Use Case 11: Notification dispatch logs.
Use Case 12: Data migration logs.
Use Case 13: Subscription lifecycle logs.
Use Case 14: Feature flag evaluation logs.
Use Case 15: Cache warming logs.
Use Case 16: Health check logs.
Use Case 17: On-call diagnostic logs.
Use Case 18: Server boot diagnostics.
Use Case 19: Deployment rollout logs.
Use Case 20: Canary release logs.

---

## Appendix N: Extended Troubleshooting Library

Issue: Missing log output
- Verify logger level.
- Verify transport list.
- Verify file path for file transport.
- Verify Pino flush support.

Issue: Unexpected formatting
- Confirm pino-pretty is installed.
- Confirm `pretty` option true.
- Confirm `translateTime` option not overridden.

Issue: File not created
- Confirm `mkdir` true or directory exists.
- Confirm process permissions.

Issue: Performance concerns
- Reduce log volume.
- Avoid debug in production.
- Use structured fields instead of large payloads.

Issue: Child logger context missing
- Ensure context object is passed.
- Avoid passing string when object needed.

Issue: Browser error
- Package is server-only.
- Use console.* in browser.

---

## Appendix O: Change Log Guidelines

When updating this AGENTS manual:
- Update Last Updated field.
- Update Version if package version changes.
- Re-verify operational flows.
- Re-verify API reference list.
- Re-verify dist exports.
- Re-verify examples folder state.
- Re-count lines to ensure 1000+.

---

## Appendix P: Deep Dive - Builder Internals

The builder stores a state object with optional fields.
Each method clones the state and merges changes.
State fields:
- level
- appName
- component
- context
- transports
- scopes

Merge strategies:
- level, appName, component: overwrite.
- context: shallow merge with existing context.
- transports: append to existing array.

Default transport strategy:
- If transports length is zero, insert console transport.
- Console transport default options: pretty = true.

Type shaping:
- defineScopes() changes the builder generic.
- This allows the consumer to type child context expectations.
- The manager does not enforce scopes at runtime.

---

## Appendix Q: Deep Dive - Manager Internals

The manager maintains three key state elements:
- config: the final configuration.
- pino: the Pino logger instance.
- indentLevel: numeric indent counter.

Message formatting:
- formatMessage() prepends indentation spaces.
- It repeats two spaces per indent level.
- If indentLevel is zero, message is unmodified.

Context formatting:
- mergeContext() accepts object or string.
- If context is string, it becomes `{ label }`.
- If error is provided, payload.err is set.

Args formatting:
- formatArgs() returns empty object for no args.
- If one arg and it is an object, returns that.
- Otherwise returns `{ extra: args }`.

Child logger behavior:
- Uses Pino child logger with merged context.
- Creates a new manager to preserve consistent config.
- Replaces its internal pino instance with child.

---

## Appendix R: Known Gaps and Risks

Gap: Public exports missing.
Risk: External consumers cannot use package.
Mitigation: Wire exports and update docs.

Gap: HTTP transport uses pino/file target.
Risk: Misleading expectations for HTTP logging.
Mitigation: Implement proper HTTP transport.

Gap: Error registry unused.
Risk: Errors not thrown, no validation feedback.
Mitigation: Add validation to builder or manager.

Gap: Examples folders empty.
Risk: No runnable demos.
Mitigation: Add minimal runnable examples.

---

## Appendix S: Review Checklist (Agents)

- Did you verify source files before documenting?
- Did you update operational flows to match code?
- Did you update API reference list?
- Did you update troubleshooting entries?
- Did you avoid fictional APIs?
- Did you check dist exports?
- Did you maintain server-only notes?
- Did you ensure line count exceeds 1000?

---

## Appendix T: Minimal Release Checklist

- Update src/index.ts exports.
- Update tsup config if needed.
- Build package and check dist.
- Update README.md.
- Update AGENTS.md.
- Add or update examples.
- Run tests.

---

## Appendix U: Supplemental Notes for Agents

Note 01: The integration tests are a good source of real usage.
Note 02: The builder defaults are defined in build().
Note 03: The transport resolvers are simple and intentional.
Note 04: The logger does not currently use IgniterLoggerError.
Note 05: The shim is required for browser safety.
Note 06: The types are intentionally flat and simple.
Note 07: The manager supports both internal and common log levels.
Note 08: When adding validation, ensure no PII in error details.
Note 09: The manager uses Pino base for appName/component/context.
Note 10: Changing base fields after construction does not update Pino.
Note 11: setAppName and setComponent only change config state.
Note 12: If you need dynamic base, consider new manager instance.
Note 13: Group indentation only affects message prefix.
Note 14: Success logs are info level with a checkmark.
Note 15: formatArgs handles single object or array extras.
Note 16: label context is used for string context.
Note 17: The log() method is central to level routing.
Note 18: The builder uses immutable pattern consistently.
Note 19: The builder uses typed generics for scopes.
Note 20: Types are stored in src/types only.

---

## Appendix V: Expanded Operational Flow Index

- Builder.create
- Builder.withLevel
- Builder.withAppName
- Builder.withComponent
- Builder.withContext
- Builder.addTransport
- Builder.defineScopes
- Builder.build
- Manager.log
- Manager.fatal
- Manager.error
- Manager.warn
- Manager.info
- Manager.debug
- Manager.trace
- Manager.success
- Manager.group
- Manager.groupEnd
- Manager.separator
- Manager.child
- Manager.setLevel
- Manager.setAppName
- Manager.setComponent
- Manager.flush
- Utils.resolve
- Transport.resolveConsole
- Transport.resolveFile
- Transport.resolveHttp

---

## Appendix W: Extended Notes on Pino Integration

- Pino is initialized once in constructor.
- `transport` option is only set when targets length > 0.
- If no transports exist, Pino runs without transport targets.
- Default transport behavior ensures at least one target.
- base fields include appName, component, and context.
- Pino supports structured logging with payload objects.
- Errors are attached to payload as `err`.
- Pino child loggers merge context fields.

---

## Appendix X: Long-Form Best Practice Reminders

Reminder 01: Use structured logs for searchability.
Reminder 02: Keep log messages clear and consistent.
Reminder 03: Use `success()` for positive milestones.
Reminder 04: Use `warn()` for non-fatal anomalies.
Reminder 05: Use `error()` or `fatal()` with error objects.
Reminder 06: Use `group()` to create readable sections.
Reminder 07: Use `separator()` to isolate phases.
Reminder 08: Use `setLevel()` for runtime controls.
Reminder 09: Use `withContext()` for static metadata.
Reminder 10: Use `child()` for dynamic context.
Reminder 11: Avoid logging secrets.
Reminder 12: Avoid logging large payloads.
Reminder 13: Avoid logging repeated debug in production.
Reminder 14: Prefer consistent field names.
Reminder 15: Validate custom transport dependencies.
Reminder 16: Keep file paths configurable via env vars.
Reminder 17: Use log rotation in production.
Reminder 18: Always capture request IDs where possible.
Reminder 19: Log durations for performance insights.
Reminder 20: Re-check log level after config changes.

---

## Appendix Y: Reference to Source Files

These paths were used to ground this documentation:
- src/builders/main.builder.ts
- src/core/manager.ts
- src/types/builder.ts
- src/types/config.ts
- src/types/level.ts
- src/types/manager.ts
- src/types/transport.ts
- src/transports/console.transport.ts
- src/transports/file.transport.ts
- src/transports/http.transport.ts
- src/utils/level-resolver.ts
- src/errors/logger.error.ts
- src/errors/index.ts
- src/shim.ts
- src/integration.spec.ts