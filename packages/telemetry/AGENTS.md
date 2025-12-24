# AGENTS.md - @igniter-js/telemetry

> **Last Updated:** 2025-12-23
> **Version:** 0.1.12
> **Goal:** This document serves as the complete operational manual for Code Agents maintaining and extending the @igniter-js/telemetry package. It is designed to be hyper-robust, training-ready, and exhaustive.

---

## 1. Package Vision & Context

`@igniter-js/telemetry` is the mission-critical observability engine of the Igniter.js ecosystem. In modern distributed systems, "visibility is survival." This package isn't just a logging library; it's a type-safe telemetry backbone designed to provide high-fidelity insights into application behavior while strictly protecting user privacy and ensuring operational performance.

### Core Philosophy

The design of `@igniter-js/telemetry` is built upon four non-negotiable pillars:

1.  **Type Safety as a First-Class Citizen:** We believe that telemetry should be as robust as business logic. By using TypeScript's advanced type accumulation and Zod-based schemas, we eliminate "telemetry drift" where logs become useless because their format changed without the developer knowing.
2.  **Context-Aware Observability:** Events in isolation are noise. Events with context are intelligence. Our session-based system uses `AsyncLocalStorage` to ensure that every event is automatically correlated with its originating request, user, and tenant scope, without manual state passing.
3.  **Privacy by Design:** Telemetry is often the primary source of PII leaks. This package enforces a redaction-first approach where sensitive data is either hashed or completely removed at the edge—before it ever hits a network transport or a disk.
4.  **Operational Resilience:** Telemetry should never be the cause of an application crash. Our pipeline is designed to be non-blocking, exception-swallowing (with internal logging), and sampling-aware to ensure that even under extreme load, the telemetry system remains a silent, efficient observer.

### The Problem It Solves

Developers building complex TypeScript applications often struggle with:

- **Fragmented Logging:** Mixing `console.log`, Sentry calls, and custom tracking.
- **Context Loss:** Losing the "trace" of a user request as it flows through async operations.
- **PII Leakage:** Accidentally logging passwords or tokens in production logs.
- **Cost Blowout:** Sending too much data to expensive providers like Datadog or Splunk.
- **Weak Contracts:** Logs that are strings, making them impossible to query reliably.

`@igniter-js/telemetry` provides a unified, structured, and governed solution to all these problems.

---

## I. MAINTAINER GUIDE (Internal Architecture)

### 2. FileSystem Topology (Maintenance)

The internal structure is optimized for high cohesion and extreme modularity. Maintainers must understand the responsibility of every file to ensure changes are made in the correct layer.

#### `src/builders/` - The Fluent Configuration Layer

This folder contains the "Accumulators" that build the immutable configuration state.

- `main.builder.ts`: **IgniterTelemetryBuilder**. The primary entry point. Manages the overall config state and orchestrates the creation of the Manager.
- `event-registry.builder.ts`: **IgniterTelemetryEvents**. Handles the declarative definition of events and namespaces. Uses generics to provide the "magic" autocomplete.
- `event-registry-group.builder.ts`: **IgniterTelemetryEventsGroup**. Enables recursive nesting of event groups, allowing for hierarchical event organization (e.g., `igniter.jobs.worker.started`).

#### `src/core/` - The Runtime Engine

The heartbeat of the package lives here.

- `manager.ts`: **IgniterTelemetryManager**. The operational core. Implements the `emit` pipeline, transport orchestration, and lifecycle (flush/shutdown).
- `session.ts`: **IgniterTelemetrySession**. Manages `AsyncLocalStorage` interaction, session ID generation, and context merging (actor/scope/attributes).

#### `src/types/` - The Canonical Contracts

Zero runtime code. Only interfaces and type aliases.

- `builder.ts`: Defines the internal state of the builder classes.
- `config.ts`: Defines the final configuration object used by the Manager.
- `emit.ts`: Defines the valid inputs for the `emit` methods.
- `envelope.ts`: **The Golden Standard**. Defines the `IgniterTelemetryEnvelope`, the standard format for every event.
- `events.ts`: Core types for the event registry and schema inference.
- `levels.ts`: Type-safe severity levels (`debug`, `info`, `warn`, `error`).
- `manager.ts`: The public interface for the Manager.
- `policies.ts`: Schemas for sampling and redaction rules.
- `session.ts`: The public interface and internal state for sessions.
- `transport.ts`: The contract that all adapters must follow.

#### `src/adapters/` - The Integration Layer

Translates the generic `IgniterTelemetryEnvelope` into specific provider formats.

- `logger.adapter.ts`: Formats events for console output (JSON or Pretty).
- `mock.adapter.ts`: A high-fidelity in-memory adapter for unit testing.
- `sentry.adapter.ts`: Maps envelopes to Sentry Breadcrumbs or Exceptions.
- `otlp.adapter.ts`: Maps envelopes to OpenTelemetry Logs Data Model.
- `slack.adapter.ts` / `discord.adapter.ts` / `telegram.adapter.ts`: Formats events as rich messages for chat webhooks.
- `file.adapter.ts`: Writes events to disk using NDJSON format.
- `store.adapter.ts`: Streams events to `@igniter-js/store` (Redis Streams).

#### `src/utils/` - Shared Logic

Stateless, tested utilities.

- `id.ts`: Secure, collision-resistant ID generation for sessions.
- `redaction.ts`: The core engine for PII removal and hashing.
- `sampling.ts`: The algorithm for deterministic and random sampling.
- `validator.ts`: Basic validation for namespaces and event names.

#### `src/errors/` - Failure Governance

- `telemetry.error.ts`: Defines the `IgniterTelemetryError` class and the centralized error code registry.

### 3. Architecture Deep-Dive

#### The Builder → Manager → Adapter Chain

1.  **Phase 1: Accumulation (Builder)**
    Every call to `.withService()`, `.addActor()`, etc., returns a _new_ instance of the builder. This ensures that the configuration is immutable and side-effect free. Types are "captured" into the class generics during this phase.

2.  **Phase 2: Realization (Build)**
    When `.build()` is called, the builder "bakes" the state into a `IgniterTelemetryConfig`. This is where default values (like default sampling rates) are merged. The Manager is instantiated, and it immediately initializes all transports.

3.  **Phase 3: Dispatch (Manager)**
    The Manager holds the "Hot Path." When `emit()` is called, it flows through:
    `Input` → `Sampling` → `Envelope Assembly` → `Async Context Lookup` → `Redaction` → `Multi-Transport Fan-out`.

#### The Async Context Isolation Engine

We use `AsyncLocalStorage` from `node:async_hooks`. This allows us to keep track of a "current session" without requiring the developer to pass a session object to every single function in their app.

- When `session.run(callback)` is called, the session state is "entered."
- Any `telemetry.emit()` call made within the `callback` (including nested async calls) will automatically find and use the session's ID, actor, and scope.
- This is critical for HTTP frameworks where multiple requests are being handled concurrently on the same event loop.

#### The Redaction Pipeline

Redaction is **mandatory and automatic** if configured. The redactor:

1.  Iterates through all keys in the `attributes` object.
2.  If a key matches the `denylistKeys` (case-insensitive), it is **deleted**.
3.  If a key matches the `hashKeys`, the value is hashed using a truncated SHA-256 hex string (prefixed with `sha256:`).
4.  If a string value exceeds `maxStringLength`, it is truncated with a warning suffix.
5.  This happens _after_ the envelope is built but _before_ it is handed to any transport.

### 4. Operational Flow Mapping (Pipelines)

#### Method: `telemetry.emit(name, input)`

1.  **Entrance:** Method receives the event name and optional input (level, attributes, etc.).
2.  **Context Detection:** Calls `IgniterTelemetrySession.getActive()` to check if we are inside an `AsyncLocalStorage` scope.
3.  **Sampling Decision:**
    - Checks if the event name matches any `never` patterns (e.g., `health.check`).
    - Checks if it matches any `always` patterns (e.g., `*.error`).
    - Applies level-based probability (e.g., only 1% of `debug` events).
4.  **Envelope Synthesis:**
    - Merges session-level attributes with event-level attributes.
    - Resolves the `actor` and `scope` (prioritizing event-level overrides).
    - Generates a timestamp and ensures a `sessionId` exists.
5.  **Redaction Pipeline:** Attributes are passed through the `IgniterTelemetryRedaction` engine.
6.  **Transport Fan-out:**
    - Iterates through the `Map` of registered adapters.
    - Each `adapter.handle(envelope)` is called.
    - **Isolation:** If one transport fails, it logs to the internal logger but does not throw, allowing other transports to proceed.
7.  **Finality:** The method returns `void`.

#### Method: `session.run(fn)`

1.  **Validation:** Ensures the session hasn't been `end()`-ed.
2.  **Context Entry:** Calls `sessionStorage.run(state, fn)`.
3.  **Execution:** The provided function `fn` is executed.
4.  **Propagation:** Any calls to `telemetry.emit` inside `fn` will now see this session's state as "Active."
5.  **Clean-up:** When `fn` completes (or throws), the `AsyncLocalStorage` context is automatically cleared for this branch of execution.

#### Method: `telemetry.shutdown()`

1.  **Flush:** Automatically calls `this.flush()` to ensure all buffered data in adapters is sent.
2.  **Cleanup Loop:** Iterates through all adapters.
3.  **Graceful Exit:** If an adapter implements `shutdown()`, it is awaited (e.g., closing a file handle or a socket).
4.  **Status Update:** Internal state is marked as shutdown (preventing further emits).

### 5. Dependency & Type Graph

- **`@igniter-js/core`**: Provides `IgniterLogger` and `StandardSchemaV1`.
- **`@igniter-js/store`**: Peer dependency used by `StoreStreamTransportAdapter` for persistent event storage.
- **`zod`**: Used for runtime schema validation if the user chooses.
- **`node:async_hooks`**: Core dependency for session isolation.
- **`node:crypto`**: Used for SHA-256 hashing in the redaction pipeline.

#### The Generic Loop

The `TRegistry` generic is passed from `IgniterTelemetryEvents` to the `IgniterTelemetryBuilder` and finally to the `IgniterTelemetryManager`. This "thread" of type information is what enables full autocomplete across the entire application.

### 6. Maintenance Checklist

When modifying this package, follow these steps:

1.  **Contract First:** Update `src/types/` if the structure of an envelope or config changes.
2.  **Immutability Check:** Ensure that any new method on the `Builder` returns a _new_ instance using `return new IgniterTelemetryBuilder({ ...this.state, ... })`.
3.  **Validation Parity:** If a new key type is added (e.g., "Version"), add validation to `IgniterTelemetryKeyValidator`.
4.  **Redaction Safety:** Ensure that new envelope fields (like `traceId`) are considered for redaction if they could contain PII.
5.  **Transport Isolation:** Never allow a transport's `handle` method to throw an error that bubbles up to the application's `emit()` call.
6.  **AsyncLocalStorage Guard:** Always use `IgniterTelemetrySession.getActive()` instead of referencing internal state directly to ensure thread safety.
7.  **Test Everything:** Every new utility needs a `.spec.ts` with 100% branch coverage.

### 7. Maintainer Troubleshooting

#### Issue: Session data is missing in nested async calls

- **Cause:** The async chain was broken by a library that doesn't preserve `AsyncLocalStorage` or by a manual `Promise` wrapper that doesn't propagate context.
- **Fix:** Ensure the `session.run()` wraps the entry point of the async work. Check for "floating promises" that might have started before the session was entered.

#### Issue: `TELEMETRY_TRANSPORT_FAILED` is thrown

- **Cause:** All registered transports returned a rejection.
- **Fix:** Check network connectivity to OTLP/Sentry/Slack. Check for disk permission issues for the File adapter. Ensure Sentry is properly initialized before the adapter is created.

#### Issue: High memory usage in Manager

- **Cause:** A custom transport adapter is buffering too many events in memory without flushing.
- **Fix:** Review the `handle` method of registered adapters. Ensure they are not pushing to an array without a corresponding `setInterval` or `limit` to flush.

---

## II. CONSUMER GUIDE (Developer Manual)

### 8. Distribution Anatomy (Consumption)

`@igniter-js/telemetry` is designed for modern ESM-first environments but maintains compatibility with legacy systems.

- **Main Entrypoint:** `import { ... } from '@igniter-js/telemetry'` - Use this for the Builder and Manager.
- **Adapters Subpath:** `import { ... } from '@igniter-js/telemetry/adapters'` - Use this to import transport adapters. This subpath is separated to allow for tree-shaking of heavy dependencies (like Sentry).
- **TypeScript Sources:** We ship full `.d.ts` and `.d.ts.map` files. Command-clicking any symbol should take you to its clean definition.

### 9. Quick Start & Common Patterns

#### The "Golden Path" Setup

```typescript
import {
  IgniterTelemetry,
  LoggerTransportAdapter,
} from "@igniter-js/telemetry";

// 1. Create your instance (usually in src/lib/telemetry.ts)
export const telemetry = IgniterTelemetry.create()
  .withService("billing-service")
  .withEnvironment("production")
  .addActor("user")
  .addScope("organization")
  .addTransport("logger", LoggerTransportAdapter.create({ format: "json" }))
  .withRedaction({ denylistKeys: ["password", "token"] })
  .build();

// 2. Simple usage
telemetry.emit("service.booted", { attributes: { uptime: process.uptime() } });
```

#### The "Request Correlation" Pattern

```typescript
// In your middleware (Express/Next.js)
async function middleware(req, res, next) {
  await telemetry
    .session()
    .actor("user", req.user.id)
    .scope("organization", req.tenant.id)
    .run(async () => {
      // Every log inside here is now linked to this user and organization
      telemetry.emit("request.received", {
        attributes: { method: req.method },
      });
      await next();
    });
}
```

### 10. Real-World Use Case Library

#### Case 1: E-commerce Order Processing (Industry: Retail)

**Problem:** Need to track an order from "Cart" to "Payment" to "Shipment" across multiple microservices.
**Implementation:**

```typescript
const session = telemetry
  .session()
  .scope("order", orderId)
  .actor("user", userId);

await session.run(async () => {
  telemetry.emit("order.payment_started", {
    attributes: { "ctx.payment.provider": "stripe" },
  });

  const result = await processPayment(orderId);

  if (result.success) {
    telemetry.emit("order.payment_succeeded", {
      attributes: { "ctx.payment.transaction_id": result.id },
    });
  } else {
    telemetry.emit("order.payment_failed", {
      level: "error",
      error: { name: "PaymentError", message: result.error },
    });
  }
});
```

#### Case 2: SaaS Multi-tenant Usage Monitoring (Industry: SaaS)

**Problem:** Bill users based on the number of "Workspaces" they create and "Members" they invite.
**Implementation:**

```typescript
telemetry.emit("workspace.created", {
  scope: { type: "organization", id: orgId },
  attributes: {
    "ctx.workspace.id": wsId,
    "ctx.workspace.plan": "pro",
  },
});
```

#### Case 3: Security & Compliance Audit (Industry: Fintech/Healthcare)

**Problem:** Must log every time sensitive patient data is accessed, ensuring the IP address is hashed.
**Implementation:**

```typescript
const telemetry = IgniterTelemetry.create()
  .withRedaction({ hashKeys: ["ctx.request.ip"] })
  // ...
  .build();

telemetry.emit("patient.record.accessed", {
  attributes: {
    "ctx.patient.id": patientId,
    "ctx.request.ip": req.ip,
  },
});
```

#### Case 4: Performance Bottleneck Discovery (Industry: General)

**Problem:** Identify which API endpoints are slow in production without logging every request.
**Implementation:**

```typescript
const telemetry = IgniterTelemetry.create()
  .withSampling({ infoRate: 0.1 }) // Only log 10% of successful requests
  .withSampling({ always: ["*.error"] }) // But log 100% of errors
  // ...
  .build();

// In handler
const start = performance.now();
await doWork();
telemetry.emit("api.request.completed", {
  attributes: { "ctx.perf.duration_ms": performance.now() - start },
});
```

#### Case 5: CI/CD Pipeline Observability (Industry: DevOps)

**Problem:** Track build success rates and stage durations across a large engineering team.
**Implementation:**

```typescript
const session = telemetry.session().scope("pipeline", ciJobId);

session.emit("pipeline.stage_started", {
  attributes: { "ctx.stage.name": "test" },
});
// ... logic ...
session.emit("pipeline.stage_completed", {
  attributes: {
    "ctx.stage.name": "test",
    "ctx.stage.status": "success",
  },
});
```

### 11. Domain-Specific Guidance

- **High-Frequency Trading:** Set `sampling.debugRate` to `0` and use the `StoreStreamTransportAdapter` for sub-millisecond event capturing with zero event loop blocking.
- **Public APIs:** Always include `traceId` in your envelopes to allow cross-service debugging using tools like Jaeger or Honeycomb.
- **Mobile Backends:** Use the `SentryTransportAdapter` for errors but keep business events in `OTLP` for long-term trend analysis.

### 12. Best Practices & Anti-Patterns

| Practice                            | Why?                                             | Example                                   |
| :---------------------------------- | :----------------------------------------------- | :---------------------------------------- |
| ✅ **Use `ctx.` prefix**            | Prevents collisions with system fields.          | `'ctx.user.role': 'admin'`                |
| ✅ **Always `await session.end()`** | Prevents memory leaks in long-running processes. | `finally { await session.end() }`         |
| ✅ **Define schemas**               | Ensures data quality and enables analytics.      | `IgniterTelemetryEvents.namespace(...)`   |
| ❌ **Don't log raw tokens**         | Security risk. Use the redaction denylist.       | `telemetry.emit('...', { token: '...' })` |
| ❌ **Don't use `any` in schemas**   | Breaks type-safe autocomplete.                   | `z.any()`                                 |
| ❌ **Don't block the event loop**   | Telemetry should be async.                       | `fs.writeFileSync()` in an adapter        |

---

## III. TECHNICAL REFERENCE & RESILIENCE

### 13. Exhaustive API Reference

#### `IgniterTelemetryBuilder`

| Method                        | Description                                       |
| :---------------------------- | :------------------------------------------------ |
| `.withService(name)`          | Sets the unique identifier for the service.       |
| `.withEnvironment(name)`      | Sets the deployment environment (prod/stage/dev). |
| `.addActor(type)`             | Registers a valid actor type (e.g., 'user').      |
| `.addScope(type)`             | Registers a valid scope type (e.g., 'org').       |
| `.addEvents(descriptor)`      | Registers a typed event map.                      |
| `.addTransport(key, adapter)` | Attaches a destination for events.                |
| `.withSampling(policy)`       | Configures event volume reduction.                |
| `.withRedaction(policy)`      | Configures PII protection.                        |
| `.build()`                    | Returns the immutable `IgniterTelemetryManager`.  |

#### `IIgniterTelemetryManager` (Runtime)

| Method               | Description                                  |
| :------------------- | :------------------------------------------- |
| `.emit(name, input)` | Dispatches an event to all transports.       |
| `.session()`         | Creates a new context-aware session.         |
| `.flush()`           | Forces all adapters to send buffered data.   |
| `.shutdown()`        | Gracefully closes all transport connections. |

#### `IIgniterTelemetrySession`

| Method                    | Description                                    |
| :------------------------ | :--------------------------------------------- |
| `.actor(type, id, tags?)` | Sets who is performing the actions.            |
| `.scope(type, id, tags?)` | Sets where the actions are performed (tenant). |
| `.run(callback)`          | Enters the async context for correlation.      |
| `.emit(name, input)`      | Emits an event bound to this session.          |
| `.end()`                  | Closes the session.                            |

### 14. Telemetry & Observability Registry

| Event Namespace     | Common Groups            | Typical Attributes                                         |
| :------------------ | :----------------------- | :--------------------------------------------------------- |
| `igniter.telemetry` | `transport`, `runtime`   | `ctx.telemetry.transport_type`, `ctx.telemetry.error_code` |
| `igniter.auth`      | `login`, `token`, `mfa`  | `ctx.auth.method`, `ctx.auth.provider`                     |
| `igniter.jobs`      | `worker`, `job`, `queue` | `ctx.job.id`, `ctx.job.attempts`, `ctx.job.duration`       |

### 15. Troubleshooting & Error Code Library

#### `TELEMETRY_SERVICE_REQUIRED`

- **Context:** Occurs during `.build()`.
- **Cause:** No service name was provided.
- **Mitigation:** Call `.withService('my-app')` in your initialization code.
- **Solution:** `telemetry.withService('api')`

#### `TELEMETRY_DUPLICATE_TRANSPORT`

- **Context:** Occurs during registration.
- **Cause:** Attempted to add two adapters with the same type (e.g., two 'logger' adapters).
- **Mitigation:** Ensure each transport key is unique.
- **Solution:** `.addTransport('console', log1).addTransport('file', log2)`

#### `TELEMETRY_SESSION_ENDED`

- **Context:** Occurs during `emit` or context modification.
- **Cause:** Calling methods on a session that has already been ended.
- **Mitigation:** Create a new session or check the session lifecycle in your code.
- **Solution:** Check `if (!session.getState().ended)` before calling.

#### `TELEMETRY_VALIDATION_ERROR`

- **Context:** Occurs during `emit` (if validation is enabled).
- **Cause:** The provided `attributes` do not match the Zod schema defined in the event registry.
- **Mitigation:** Ensure the data types passed to `emit` match the `StandardSchemaV1` requirements.
- **Solution:** Review the `attributes` object and the corresponding event definition.

#### `TELEMETRY_RUNTIME_NOT_INITIALIZED`

- **Context:** Attempting to emit before `.build()` is called.
- **Cause:** Using the builder where the manager is expected.
- **Mitigation:** Follow the `create() -> configuration -> build()` sequence.
- **Solution:** Ensure `telemetry` is the result of `.build()`.

---

**Maintenance Rules:**

1.  **Never** lower the line count of this file without explicit justification.
2.  **Always** update the `Operational Flow Mapping` when changing the `Manager` logic.
3.  **Ensure** all new transport adapters are added to the technical reference tables.

---

_End of AGENTS.md for @igniter-js/telemetry_
