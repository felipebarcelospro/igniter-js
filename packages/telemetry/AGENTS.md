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
# AGENTS.md - @igniter-js/telemetry

> **Last Updated:** 2026-01-29
> **Version:** 0.1.141
> **Goal:** This document is the complete operational manual for Code Agents maintaining and extending `@igniter-js/telemetry`. It is training-ready, implementation-grounded, and exhaustive by design.

---

## 1. Package Vision & Context

`@igniter-js/telemetry` is the observability backbone of the Igniter.js ecosystem. It unifies logs, metrics-like events, and error reporting under a **typed, session-aware, privacy-safe** model. This package is not a logging facade — it is a deterministic telemetry pipeline that enforces structure across all event flows.

### Core Philosophy

This package is grounded in four non-negotiables:

1. **Type Safety as a First-Class Citizen**
   Events should be as reliable as business logic. Typed registries prevent telemetry drift.

2. **Context-Aware Observability**
   Sessions correlate events across async boundaries without manual context threading.

3. **Privacy by Design**
   Redaction is applied before transport fan-out to prevent PII leaks.

4. **Operational Resilience**
   Telemetry must never crash an application. Transport failures are isolated.

### The Problems It Solves

- Fragmented logging across multiple systems
- Missing correlations in async flows
- PII leakage through raw event payloads
- Cost blowouts from unbounded telemetry volume
- Inconsistent event naming and shape drift

---

## I. MAINTAINER GUIDE (Internal Architecture)

### 2. FileSystem Topology (Maintenance)

Maintain this package by understanding its layers and enforcing immutability and runtime isolation.

#### `src/` root map

- `index.ts`
  - Public entrypoint
  - Exports builders, core, errors, types, utils, and adapters
  - Imports `./shim` to enforce server-only safety

- `shim.ts`
  - Server-only safeguard
  - Throws if imported in unsupported environments

#### `src/builders/`

- `main.builder.ts`
  - `IgniterTelemetryBuilder`
  - Immutable configuration chain
  - Public alias via `IgniterTelemetry` in `src/index.ts`

- `event-registry.builder.ts`
  - `IgniterTelemetryEvents`
  - Typed event registry with namespaces + groups

- `event-registry-group.builder.ts`
  - `IgniterTelemetryEventsGroup`
  - Nested grouping helper for event registries

#### `src/core/`

- `manager.ts`
  - `IgniterTelemetryManager`
  - Runtime pipeline (sampling → envelope → redaction → transport)

- `session.ts`
  - `IgniterTelemetrySession`
  - AsyncLocalStorage session manager

#### `src/types/`

- `builder.ts`
  - `IgniterTelemetryBuilderState`

- `config.ts`
  - `IgniterTelemetryConfig`
  - `IgniterTelemetryActorOptions`, `IgniterTelemetryScopeOptions`

- `emit.ts`
  - `IgniterTelemetryEmitInput`

- `envelope.ts`
  - `IgniterTelemetryEnvelope`
  - Actor/Scope/Tags/Error/Source types

- `events.ts`
  - `IgniterTelemetryEventsMap`
  - `IgniterTelemetryEventsRegistry`
  - `IgniterTelemetryEventsDescriptor`
  - `IgniterTelemetryFlattenRegistryKeys`

- `keys.ts`
  - `IgniterTelemetryKeyValidator`

- `levels.ts`
  - `IgniterTelemetryLevel`
  - `IGNITER_TELEMETRY_LEVELS`
  - `IGNITER_TELEMETRY_LEVEL_PRIORITY`

- `manager.ts`
  - `IIgniterTelemetryManager`

- `policies.ts`
  - `IgniterTelemetryRedactionPolicy`
  - `IgniterTelemetrySamplingPolicy`
  - Defaults

- `session.ts`
  - `IIgniterTelemetrySession`
  - `IgniterTelemetrySessionState`

- `transport.ts`
  - `IgniterTelemetryTransportAdapter`
  - `IgniterTelemetryTransportMeta`

#### `src/adapters/`

Public adapters (exported via `@igniter-js/telemetry/adapters`):

- `logger.adapter.ts`
- `http.adapter.ts`
- `otlp.adapter.ts`
- `sentry.adapter.ts`
- `slack.adapter.ts`
- `discord.adapter.ts`
- `telegram.adapter.ts`
- `memory.adapter.ts`
- `mock.adapter.ts`
- `store.adapter.ts`

Internal (not included in `tsup` entries):

- `file.adapter.ts` (not part of public dist; treat as experimental)

#### `src/utils/`

- `id.ts` → `IgniterTelemetryId`
- `sampling.ts` → `IgniterTelemetrySampling`
- `redaction.ts` → `IgniterTelemetryRedaction`
- `validator.ts` → `IgniterTelemetryValidator`

#### `src/errors/`

- `telemetry.error.ts` → `IgniterTelemetryError` + error codes

---

### 3. Architecture Deep-Dive

#### Builder → Manager → Adapter Flow

1. **Builder accumulation**
   - Each `with*` and `add*` method returns a **new builder instance**.
   - No method mutates state in-place.

2. **Build**
   - `buildConfig()` merges defaults and returns a config object.
   - `build()` constructs `IgniterTelemetryManager`.

3. **Runtime dispatch**
   - `emit()` resolves active session, applies sampling, builds envelope, redacts, and dispatches.

#### Async Context Isolation

- `IgniterTelemetrySession.run()` enters AsyncLocalStorage state.
- `IgniterTelemetryManager.emit()` pulls `IgniterTelemetrySession.getActive()`.
- Session fields override or merge with event-level input.

#### Redaction Pipeline

- Applied only if `attributes` exist.
- Uses `IgniterTelemetryRedaction.createRedactor()`.
- Runs **before** transport fan-out.

#### Sampling Pipeline

- Sampling occurs before envelope creation.
- `IgniterTelemetrySampling.createSampler(policy)` returns a function used by the manager.

---

### 4. Operational Flow Mapping (Pipelines)

#### Method: `IgniterTelemetryBuilder.create()`

1. Initialize default builder state.
2. Set `eventsValidation` to `{ mode: 'development', strict: false }`.
3. Return builder instance.

#### Method: `.withService(service)`

1. Copy existing state.
2. Set `service`.
3. Return new builder.

#### Method: `.withEnvironment(environment)`

1. Copy existing state.
2. Set `environment`.
3. Return new builder.

#### Method: `.withVersion(version)`

1. Copy existing state.
2. Set `version`.
3. Return new builder.

#### Method: `.addActor(key, options)`

1. Validate with `IgniterTelemetryKeyValidator`.
2. Throw `TELEMETRY_DUPLICATE_ACTOR` if already registered.
3. Update `actorDefinitions`.
4. Return new builder.

#### Method: `.addScope(key, options)`

1. Validate with `IgniterTelemetryKeyValidator`.
2. Throw `TELEMETRY_DUPLICATE_SCOPE` if already registered.
3. Update `scopeDefinitions`.
4. Return new builder.

#### Method: `.addEvents(descriptor, options)`

1. Validate namespace uniqueness.
2. Merge into `eventsRegistry`.
3. Merge validation options.
4. Return new builder.

#### Method: `.addTransport(adapter)`

1. If adapter is falsy → `TELEMETRY_INVALID_TRANSPORT`.
2. Push to `transports`.
3. Return new builder.

#### Method: `.withSampling(policy)`

1. Merge sampling policy into builder state.
2. Return new builder.

#### Method: `.withRedaction(policy)`

1. Merge redaction policy into builder state.
2. Return new builder.

#### Method: `.withValidation(options)`

1. Merge validation options into builder state.
2. Return new builder.

#### Method: `.withLogger(logger)`

1. Set internal logger in state.
2. Return new builder.

#### Method: `.build()`

1. Calls `.buildConfig()`.
2. Logs with logger if configured.
3. Instantiates `IgniterTelemetryManager`.
4. Initializes all adapters (`adapter.init()` if present).

#### Method: `.buildConfig()`

1. Default `service` to `igniter-app` if missing.
2. Default `environment` to `development` if missing.
3. Merge sampling + redaction defaults.
4. Return config.

#### Method: `IgniterTelemetryManager.emit()`

1. Read AsyncLocalStorage session state.
2. Apply sampling rule.
3. Build envelope with actor/scope merge.
4. Redact attributes.
5. Fan-out to transports.
6. If all transports fail → `TELEMETRY_TRANSPORT_FAILED`.

#### Method: `IgniterTelemetryManager.session()`

1. Create `IgniterTelemetrySession` with emit callback.

#### Method: `IgniterTelemetryManager.flush()`

1. For each adapter with `flush()` → await flush.
2. Log errors, do not throw.

#### Method: `IgniterTelemetryManager.shutdown()`

1. Call `flush()`.
2. For each adapter with `shutdown()` → await shutdown.
3. Log errors, do not throw.

#### Method: `IgniterTelemetrySession.run()`

1. Guard against ended session.
2. Enter AsyncLocalStorage context.
3. Execute callback.

#### Method: `IgniterTelemetrySession.emit()`

1. Guard against ended session.
2. Delegate to `emitFn` with session state.

#### Method: `IgniterTelemetrySession.end()`

1. Mark session as ended.

---

### 5. Dependency & Type Graph

- `@igniter-js/common`
  - `IgniterLogger`
  - `IgniterError`
  - `StandardSchemaV1`

- `@igniter-js/store` (peer dependency)
  - Required by `StoreStreamTransportAdapter`
  - Uses Redis Streams internally

- `zod` (dev dependency)
  - Used in examples and tests

- `node:async_hooks`
  - AsyncLocalStorage session engine

- `node:crypto`
  - Hashing and ID generation

---

### 6. Maintenance Checklist

- [ ] Confirm builder immutability (no state mutation).
- [ ] Update `src/types/` before runtime changes.
- [ ] Update event naming validation if rules change.
- [ ] Ensure redaction covers new attribute surfaces.
- [ ] Validate transport init errors are isolated.
- [ ] Update adapter tests and snapshots.
- [ ] Update this AGENTS document if runtime pipeline changes.

---

### 7. Maintainer Troubleshooting

#### Issue: Session data missing in nested async calls

- **Cause:** Async chain doesn’t preserve AsyncLocalStorage.
- **Fix:** Wrap entry points with `session.run()`.

#### Issue: Transport initialization fails

- **Cause:** `adapter.init()` throws.
- **Fix:** Validate credentials and network access.

#### Issue: Excessive memory in custom transports

- **Cause:** Unbounded buffering.
- **Fix:** Add `flush()` / queue limits / sampling.

---

### 8. Adapter Implementation Checklist (Maintainers)

When adding a new adapter:

1. Implement `IgniterTelemetryTransportAdapter`.
2. Add entry in `src/adapters/index.ts`.
3. Add entry in `tsup.config.ts` if public.
4. Add tests in `src/adapters/*.spec.ts`.
5. Update this AGENTS file (Tables + Examples + Error coverage).

---

### 9. Event Naming Rules (Maintainers)

- No colons (`:`)
- No spaces
- Prefer dot notation (`domain.feature.action`)
- Avoid reserved prefixes (`__`, `__internal`)

---

### 10. Internal Testing Matrix

Required coverage:

- Builder immutability tests
- Session lifecycle tests
- Sampling rules
- Redaction policies
- Each adapter `handle` path
- Transport init failure handling
- Type inference tests for registry events

---

## II. CONSUMER GUIDE (Developer Manual)

### 11. Distribution Anatomy (Consumption)

- Main entrypoint: `@igniter-js/telemetry`
- Adapters subpath: `@igniter-js/telemetry/adapters`
- Individual adapter subpaths: `@igniter-js/telemetry/adapters/*.adapter`
- Types and interfaces are bundled with `.d.ts`

---

### 12. Quick Start & Common Patterns

#### Golden Path Setup

```typescript
import { IgniterTelemetry } from '@igniter-js/telemetry'
import { LoggerTransportAdapter } from '@igniter-js/telemetry/adapters'

export const telemetry = IgniterTelemetry.create()
  .withService('billing-service')
  .withEnvironment('production')
  .addActor('user')
  .addScope('organization')
  .addTransport(LoggerTransportAdapter.create({ logger: console, format: 'json' }))
  .withRedaction({ denylistKeys: ['password', 'token'] })
  .build()

telemetry.emit('service.booted', { attributes: { 'ctx.uptime_ms': 1234 } })
```

#### Request Correlation Pattern

```typescript
await telemetry.session()
  .actor('user', req.user.id)
  .scope('organization', req.tenant.id)
  .run(async () => {
    telemetry.emit('request.received', { attributes: { 'ctx.request.path': req.path } })
    await next()
  })
```

---

### 13. Real-World Use Case Library (10 scenarios)

#### Case A: E-commerce orders

```typescript
await telemetry.session()
  .scope('order', orderId)
  .actor('user', userId)
  .run(async () => {
    telemetry.emit('order.payment_started')
    // ...
    telemetry.emit('order.payment_succeeded')
  })
```

#### Case B: SaaS billing usage

```typescript
telemetry.emit('workspace.created', {
  attributes: { 'ctx.workspace.plan': 'pro' },
})
```

#### Case C: Healthcare access audit

```typescript
telemetry.emit('patient.record.accessed', {
  attributes: { 'ctx.patient.id': patientId },
})
```

#### Case D: Fintech compliance

```typescript
telemetry.emit('kyc.completed', {
  attributes: { 'ctx.kyc.level': 'l2' },
})
```

#### Case E: DevOps pipeline

```typescript
telemetry.emit('pipeline.stage_completed', {
  attributes: { 'ctx.stage.name': 'build' },
})
```

#### Case F: Fraud detection

```typescript
telemetry.emit('fraud.signal.detected', {
  level: 'warn',
  attributes: { 'ctx.fraud.score': 0.92 },
})
```

#### Case G: Multi-tenant API

```typescript
telemetry.emit('request.completed', {
  scope: { type: 'organization', id: orgId },
  attributes: { 'ctx.request.status': 200 },
})
```

#### Case H: AI agent orchestration

```typescript
telemetry.emit('agent.plan.completed', {
  attributes: { 'ctx.plan.tokens_used': 800 },
})
```

#### Case I: Media streaming

```typescript
telemetry.emit('stream.segment.buffered', {
  attributes: { 'ctx.segment.ms': 4000 },
})
```

#### Case J: IoT fleet

```typescript
telemetry.emit('sensor.heartbeat', {
  attributes: { 'ctx.sensor.temp_c': 21.3 },
})
```

---

### 14. Best Practices vs Anti-Patterns

| ✅ Do | Why | Example |
| --- | --- | --- |
| Use `ctx.` attribute keys | Prevent collisions | `'ctx.user.id'` |
| Define typed events | Enforce schema safety | `IgniterTelemetryEvents` |
| Use sessions in HTTP flows | Context correlation | `session.run()` |
| Redact PII | Prevent leakage | `withRedaction({ hashKeys: ['email'] })` |

| ❌ Don’t | Why | Example |
| --- | --- | --- |
| Log raw secrets | Security risk | `{ token: '...' }` |
| Skip sampling | Cost blowout | No `withSampling()` |
| Use colon delimiters | Invalid names | `auth:login` |

---

### 15. Domain-Scoped Guidance

- **High-frequency trading**: set `debugRate` to `0`, `infoRate` to `0.01`.
- **Public APIs**: add `source` metadata for traceability.
- **Mobile backends**: ship errors to Sentry, business events to OTLP.
- **Multi-tenant SaaS**: always set `scope` for every request.

---

## III. TECHNICAL REFERENCE & RESILIENCE

### 16. Exhaustive API Reference (Public Surface)

#### Builders

- `IgniterTelemetry.create()` → builder instance
- `IgniterTelemetryBuilder` methods:
  - `withService(name)`
  - `withEnvironment(name)`
  - `withVersion(version)`
  - `addActor(key, options?)`
  - `addScope(key, options?)`
  - `addEvents(descriptor, options?)`
  - `addTransport(adapter)`
  - `withSampling(policy)`
  - `withRedaction(policy)`
  - `withValidation(options)`
  - `withLogger(logger)`
  - `build()`
  - `buildConfig()`

#### Core runtime

- `IgniterTelemetryManager`
  - `emit(name, input?)`
  - `session()`
  - `flush()`
  - `shutdown()`
  - `service`
  - `environment`
  - `version`

- `IgniterTelemetrySession`
  - `id(sessionId)`
  - `actor(type, id?, tags?)`
  - `scope(type, id, tags?)`
  - `attributes(attrs)`
  - `emit(name, input?)`
  - `run(fn)`
  - `end()`
  - `getState()`

#### Event registry

- `IgniterTelemetryEvents`
  - `namespace(name)`
  - `event(name, schema)`
  - `group(name, builder)`
  - `build()`

- `IgniterTelemetryEventsGroup`
  - `event(name, schema)`
  - `group(name, builder)`
  - `build()`

#### Utilities

- `IgniterTelemetryId`
  - `generateSessionId()`
  - `generateSpanId()`
  - `generateTraceId()`
  - `isValidSessionId(id)`

- `IgniterTelemetrySampling`
  - `matchesPattern(pattern, name)`
  - `shouldSample(policy, name, level)`
  - `createSampler(policy)`

- `IgniterTelemetryRedaction`
  - `createRedactor(policy)`
  - `createSyncRedactor(policy)`
  - `redactEnvelope(envelope, policy)`

- `IgniterTelemetryValidator`
  - `validate(name, context)`

---

### 17. Telemetry & Observability Registry Guidance

Recommended event namespaces by domain:

- `igniter.auth.*`
- `igniter.jobs.*`
- `igniter.store.*`
- `igniter.storage.*`
- `igniter.http.*`
- `igniter.billing.*`

Recommended attribute pattern:

- `ctx.<domain>.<attribute>`

Examples:

- `ctx.job.id`
- `ctx.user.id`
- `ctx.request.path`
- `ctx.payment.transaction_id`

---

### 18. Exhaustive Error Code Library

All codes from `IGNITER_TELEMETRY_ERROR_CODES`:

#### `TELEMETRY_SERVICE_REQUIRED`

- **Status:** Reserved (not currently emitted by builder, which defaults to `igniter-app`).
- **Mitigation:** Still set `.withService()` explicitly for clarity.

#### `TELEMETRY_ENVIRONMENT_REQUIRED`

- **Status:** Reserved (builder defaults to `development`).
- **Mitigation:** Always set `.withEnvironment()` in production.

#### `TELEMETRY_CONFIGURATION_INVALID`

- **Status:** Reserved.
- **Mitigation:** Validate config in custom pipelines.

#### `TELEMETRY_INVALID_TRANSPORT`

- **Context:** `.addTransport()` with falsy adapter.
- **Cause:** `undefined` or `null` adapter.
- **Solution:** Pass adapter instance.

#### `TELEMETRY_TRANSPORT_FAILED`

- **Context:** All adapters throw on `handle()`.
- **Cause:** Downstream outage or adapter bug.
- **Solution:** Inspect logs; check network and credentials.

#### `TELEMETRY_TRANSPORT_INIT_FAILED`

- **Context:** Adapter `init()` failed at build.
- **Cause:** Invalid configuration.
- **Solution:** Validate env vars, permissions.

#### `TELEMETRY_INVALID_EVENT_NAME`

- **Context:** Event name validation.
- **Cause:** Spaces, colons, reserved prefixes.
- **Solution:** Use dot notation.

#### `TELEMETRY_UNKNOWN_EVENT`

- **Status:** Reserved for future schema enforcement.
- **Mitigation:** Keep registries updated.

#### `TELEMETRY_DUPLICATE_EVENT`

- **Status:** Reserved for future enforcement.
- **Mitigation:** Avoid duplicates in registries.

#### `TELEMETRY_SCHEMA_VALIDATION_FAILED`

- **Status:** Thrown by validator on invalid context.
- **Mitigation:** Use supported validation contexts.

#### `TELEMETRY_INVALID_NAMESPACE`

- **Context:** Namespace validation.
- **Cause:** Invalid characters.
- **Solution:** Use dot notation.

#### `TELEMETRY_RESERVED_NAMESPACE`

- **Context:** Reserved namespace prefix usage.
- **Cause:** Prefix `__`.
- **Solution:** Choose a non-reserved namespace.

#### `TELEMETRY_DUPLICATE_NAMESPACE`

- **Context:** `.addEvents()` with existing namespace.
- **Cause:** Multiple registries with same namespace.
- **Solution:** Merge or rename registries.

#### `TELEMETRY_SESSION_ENDED`

- **Context:** Session used after `.end()`.
- **Cause:** Misordered lifecycle.
- **Solution:** Create new session.

#### `TELEMETRY_SESSION_INVALID`

- **Status:** Reserved.
- **Mitigation:** Validate session usage in custom extensions.

#### `TELEMETRY_DUPLICATE_SCOPE`

- **Context:** `addScope()` with duplicate key.
- **Cause:** Key already registered.
- **Solution:** Remove duplicate registration.

#### `TELEMETRY_INVALID_SCOPE`

- **Status:** Reserved.
- **Mitigation:** Validate scope usage in custom pipelines.

#### `TELEMETRY_DUPLICATE_ACTOR`

- **Context:** `addActor()` with duplicate key.
- **Cause:** Key already registered.
- **Solution:** Remove duplicate registration.

#### `TELEMETRY_INVALID_ACTOR`

- **Status:** Reserved.
- **Mitigation:** Validate actor usage in custom pipelines.

#### `TELEMETRY_EMIT_FAILED`

- **Status:** Reserved for future error signaling.

#### `TELEMETRY_RUNTIME_NOT_INITIALIZED`

- **Status:** Reserved.
- **Mitigation:** Ensure `.build()` is used before `emit()`.

---

### 19. Distribution Anatomy (Consumer)

- `@igniter-js/telemetry`
  - Builder, Manager, Session, Events, Errors, Types, Utils

- `@igniter-js/telemetry/adapters`
  - Logger, HTTP, OTLP, Sentry, Slack, Discord, Telegram, Memory, Mock, Store

- `@igniter-js/telemetry/adapters/*.adapter`
  - Direct adapter imports for tree-shaking

---

### 20. Contribution Checklist (Maintainers)

- [ ] Update types in `src/types/` first
- [ ] Keep builder immutable
- [ ] Add tests for new runtime behavior
- [ ] Update README examples if public API changes
- [ ] Update this AGENTS manual
- [ ] Keep telemetry redaction safe (no PII)

---

### 21. Maintenance Rules

1. Do not reduce this file’s line count unless explicitly justified.
2. Update Operational Flow Mapping when Manager logic changes.
3. Update adapter lists when adding or removing exports.

---

### 22. Adapter Operational Notes (Maintainers)

#### LoggerTransportAdapter

Pipeline:

1. Checks `minLevel` threshold using `IGNITER_TELEMETRY_LEVEL_PRIORITY`.
2. Formats JSON or pretty string output.
3. Logs via provided logger.

Key config:

- `logger` (required)
- `format` (`json` | `pretty`)
- `includeTimestamp`
- `minLevel`

#### HttpTransportAdapter

Pipeline:

1. Creates `AbortController` with optional timeout.
2. POSTs envelope as JSON to configured URL.
3. Logs errors to console.

Key config:

- `url` (required)
- `headers` (optional)
- `timeout` (optional)
- `retries` (reserved)

#### OtlpTransportAdapter

Pipeline:

1. Transforms envelope to OTLP Logs JSON payload.
2. POSTs to `v1/logs` endpoint.
3. Logs errors to console.

Key config:

- `url` (required)
- `headers` (optional)

#### SentryTransportAdapter

Pipeline:

1. Errors: uses `captureException()` with context.
2. Non-errors: adds breadcrumbs.

Key config:

- `sentry` SDK instance (required)

#### SlackTransportAdapter

Pipeline:

1. Level filter using `minLevel`.
2. Builds Slack blocks payload.
3. POSTs to webhook URL.

Key config:

- `webhookUrl` (required)
- `minLevel` (optional)
- `username` (optional)
- `iconEmoji` (optional)

#### DiscordTransportAdapter

Pipeline:

1. Level filter using `minLevel`.
2. Builds embed payload.
3. POSTs to webhook URL.

Key config:

- `webhookUrl` (required)
- `minLevel` (optional)
- `username` (optional)
- `avatarUrl` (optional)

#### TelegramTransportAdapter

Pipeline:

1. Level filter using `minLevel`.
2. Builds Telegram message with HTML formatting.
3. POSTs to `sendMessage` endpoint.

Key config:

- `botToken` (required)
- `chatId` (required)
- `minLevel` (optional)

#### StoreStreamTransportAdapter

Pipeline:

1. Resolves stream name (`streamBuilder` or `stream`).
2. Builds stream payload with serialized JSON fields.
3. Appends to Redis Stream via `@igniter-js/store`.

Key config:

- `redis` (required)
- `stream` (optional)
- `maxLen` (optional)
- `approximate` (optional)
- `streamBuilder` (optional)

---

### 23. Event Schema Cookbook (Extra Examples)

#### Example: Authentication

```typescript
const AuthEvents = IgniterTelemetryEvents
  .namespace('igniter.auth')
  .event('login.started', z.object({ 'ctx.user.id': z.string() }))
  .event('login.succeeded', z.object({ 'ctx.user.id': z.string() }))
  .event('login.failed', z.object({ 'ctx.auth.reason': z.string() }))
  .build()
```

#### Example: Notifications

```typescript
const NotificationEvents = IgniterTelemetryEvents
  .namespace('igniter.notifications')
  .event('email.sent', z.object({ 'ctx.message.id': z.string() }))
  .event('sms.sent', z.object({ 'ctx.message.id': z.string() }))
  .build()
```

#### Example: Store Operations

```typescript
const StoreEvents = IgniterTelemetryEvents
  .namespace('igniter.store')
  .event('kv.set', z.object({ 'ctx.kv.key': z.string() }))
  .event('kv.get', z.object({ 'ctx.kv.key': z.string() }))
  .build()
```

#### Example: Storage Operations

```typescript
const StorageEvents = IgniterTelemetryEvents
  .namespace('igniter.storage')
  .event('file.uploaded', z.object({ 'ctx.file.id': z.string() }))
  .event('file.deleted', z.object({ 'ctx.file.id': z.string() }))
  .build()
```

#### Example: Webhooks

```typescript
const WebhookEvents = IgniterTelemetryEvents
  .namespace('igniter.webhooks')
  .event('delivery.started', z.object({ 'ctx.webhook.id': z.string() }))
  .event('delivery.failed', z.object({ 'ctx.webhook.error': z.string() }))
  .build()
```

#### Example: Search

```typescript
const SearchEvents = IgniterTelemetryEvents
  .namespace('igniter.search')
  .event('query.executed', z.object({ 'ctx.search.query': z.string() }))
  .event('query.completed', z.object({ 'ctx.search.count': z.number() }))
  .build()
```

#### Example: Billing

```typescript
const BillingEvents = IgniterTelemetryEvents
  .namespace('igniter.billing')
  .event('invoice.created', z.object({ 'ctx.invoice.id': z.string() }))
  .event('invoice.paid', z.object({ 'ctx.invoice.id': z.string() }))
  .build()
```

#### Example: Jobs

```typescript
const JobsEvents = IgniterTelemetryEvents
  .namespace('igniter.jobs')
  .event('job.started', z.object({ 'ctx.job.id': z.string() }))
  .event('job.completed', z.object({ 'ctx.job.id': z.string() }))
  .build()
```

#### Example: Bots

```typescript
const BotEvents = IgniterTelemetryEvents
  .namespace('igniter.bot')
  .event('message.received', z.object({ 'ctx.bot.id': z.string() }))
  .event('message.sent', z.object({ 'ctx.bot.id': z.string() }))
  .build()
```

#### Example: Agents

```typescript
const AgentEvents = IgniterTelemetryEvents
  .namespace('igniter.agents')
  .event('task.started', z.object({ 'ctx.task.id': z.string() }))
  .event('task.completed', z.object({ 'ctx.task.id': z.string() }))
  .build()
```

---

### 24. Testing Blueprint (Maintainers)

Required tests per layer:

1. **Builder tests**
   - Ensure immutability (new instance each call)
   - Type inference with events registry
   - Error codes for duplicate namespace/scope/actor

2. **Session tests**
   - Actor/scope merge behavior
   - `session.run()` context propagation
   - `session.end()` lifecycle guard

3. **Sampling tests**
   - Pattern matching (`*.failed`, `security.*`)
   - Rate sampling bounds (0, 1)
   - `always` and `never` precedence

4. **Redaction tests**
   - Denylist removal
   - Hashing behavior
   - Truncation behavior

5. **Adapter tests**
   - `logger.adapter` level filtering
   - `http.adapter` payload shape
   - `otlp.adapter` transformation
   - `sentry.adapter` breadcrumb vs exception
   - `slack/discord/telegram` payload formatting
   - `store.adapter` stream payload correctness

---

### 25. Migration Notes (Maintainers)

- `addTransport()` accepts only adapter instances (no type parameter).
- Builder defaults `service` to `igniter-app` and `environment` to `development`.
- File adapter is not exported; do not document as public unless added to `tsup` entries.

---

### 26. Attribute Glossary (Consumer Guidance)

Common patterns:

- `ctx.request.id`
- `ctx.request.path`
- `ctx.request.status`
- `ctx.user.id`
- `ctx.user.role`
- `ctx.org.id`
- `ctx.workspace.id`
- `ctx.job.id`
- `ctx.job.duration_ms`
- `ctx.payment.transaction_id`
- `ctx.payment.provider`
- `ctx.cache.key`
- `ctx.cache.hit`
- `ctx.search.query`
- `ctx.search.count`

---

---

_End of AGENTS.md for @igniter-js/telemetry_
