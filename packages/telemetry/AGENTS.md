# AGENTS.md — @igniter-js/telemetry

> **Last Updated:** 2026-06-02
> **Version:** 0.1.143
> **Goal:** Complete operational manual for Code Agents maintaining and extending `@igniter-js/telemetry`. Training-ready, implementation-grounded, exhaustive.

---

## 1. Package Vision & Context

`@igniter-js/telemetry` is the observability backbone of the Igniter.js ecosystem. It unifies logs, structured events, error reporting, and distributed tracing under a **typed, session-aware, privacy-safe** model. This is not a logging facade — it is a deterministic telemetry pipeline that enforces structure and safety across all event flows.

### Core Philosophy (4 Non-Negotiables)

1. **Type Safety as a First-Class Citizen**
   Typed event registries prevent telemetry drift. Zod-based schemas make events queryable and reliable.

2. **Context-Aware Observability**
   Sessions using `AsyncLocalStorage` correlate events across async boundaries without manual context threading.

3. **Privacy by Design**
   Redaction is applied at the edge — before transport fan-out — ensuring PII never leaves the application.

4. **Operational Resilience**
   Telemetry must never crash an application. Transport failures are isolated, sampling prevents overload, and all errors are swallowed with internal logging.

### Problems Solved

- Fragmented logging across multiple systems (console, Sentry, custom trackers)
- Missing correlation in async flows (no trace context)
- PII leakage through raw event payloads
- Cost blowouts from unbounded telemetry volume
- Inconsistent event naming and schema drift

---

## I. MAINTAINER GUIDE (Internal Architecture)

### 2. FileSystem Topology

Maintain this package by understanding each layer and enforcing immutability and runtime isolation.

```
packages/telemetry/
├── src/
│   ├── index.ts                          # Public entry point — re-exports all modules
│   ├── shim.ts                           # Server-only guard — throws in unsupported envs
│   ├── builders/
│   │   ├── index.ts                      # Builder re-exports
│   │   ├── main.builder.ts              # IgniterTelemetryBuilder (fluent config)
│   │   ├── event-registry.builder.ts    # IgniterTelemetryEvents (typed schemas)
│   │   └── event-registry-group.builder.ts  # IgniterTelemetryEventsGroup (nesting)
│   ├── core/
│   │   ├── index.ts                      # Core re-exports
│   │   ├── manager.ts                    # IgniterTelemetryManager (runtime pipeline)
│   │   └── session.ts                    # IgniterTelemetrySession (ALS-based sessions)
│   ├── types/
│   │   ├── index.ts                      # Type re-exports (11 modules)
│   │   ├── builder.ts                    # IgniterTelemetryBuilderState
│   │   ├── config.ts                     # IgniterTelemetryConfig, Actor/Scope options
│   │   ├── emit.ts                       # IgniterTelemetryEmitInput
│   │   ├── envelope.ts                   # Envelope, Actor, Scope, Error, Source, Tags, Attributes
│   │   ├── events.ts                     # EventsMap, Registry, Descriptor, Validation options
│   │   ├── keys.ts                       # IgniterTelemetryKeyValidator (naming rules)
│   │   ├── levels.ts                     # IgniterTelemetryLevel (debug|info|warn|error)
│   │   ├── manager.ts                    # IIgniterTelemetryManager interface
│   │   ├── policies.ts                   # Sampling + Redaction policies with defaults
│   │   ├── session.ts                    # IIgniterTelemetrySession, SessionState, EmitCallback
│   │   └── transport.ts                  # Transport adapter interface + meta
│   ├── adapters/
│   │   ├── index.ts                      # Adapter re-exports (10 adapters)
│   │   ├── logger.adapter.ts             # LoggerTransportAdapter (console/structured)
│   │   ├── http.adapter.ts               # HttpTransportAdapter (webhook POST)
│   │   ├── otlp.adapter.ts              # OtlpTransportAdapter (OTLP Logs over HTTP)
│   │   ├── sentry.adapter.ts            # SentryTransportAdapter (exceptions + breadcrumbs)
│   │   ├── slack.adapter.ts             # SlackTransportAdapter (webhook messages)
│   │   ├── discord.adapter.ts           # DiscordTransportAdapter (webhook embeds)
│   │   ├── telegram.adapter.ts          # TelegramTransportAdapter (bot messages)
│   │   ├── memory.adapter.ts            # InMemoryTransportAdapter (testing capture)
│   │   ├── mock.adapter.ts              # MockTelemetryAdapter (unit test assertions)
│   │   ├── store.adapter.ts             # StoreStreamTransportAdapter (Redis Streams)
│   │   └── file.adapter.ts              # FileTransportAdapter (experimental, not in dist)
│   ├── utils/
│   │   ├── index.ts                      # Utility re-exports
│   │   ├── id.ts                         # IgniterTelemetryId (session, span, trace)
│   │   ├── sampling.ts                   # IgniterTelemetrySampling (glob pattern matching)
│   │   ├── redaction.ts                  # IgniterTelemetryRedaction (SHA-256 + denylist)
│   │   └── validator.ts                  # IgniterTelemetryValidator (naming rules)
│   └── errors/
│       ├── index.ts                      # Error re-exports
│       └── telemetry.error.ts           # IgniterTelemetryError (22 error codes)
├── dist/                                 # Built output (CJS + ESM + .d.ts)
├── package.json                          # v0.1.143, Node >=22, @igniter-js/common dep
├── tsconfig.json
├── tsup.config.ts                        # Dual entry: main + adapters subpath
└── vitest.config.ts
```

### 3. Architecture Deep-Dive

#### 3.1 Builder → Manager → Adapter Flow

```
┌──────────────────────────────────────────┐
│  IgniterTelemetry.create()               │  ← Entry point
│    .withService()                        │
│    .withEnvironment()                    │
│    .withVersion()                        │
│    .addActor()                           │  ← Immutable builder chain
│    .addScope()                           │     Each method returns NEW instance
│    .addEvents()                          │
│    .addTransport()                       │
│    .withSampling()                       │
│    .withRedaction()                      │
│    .withValidation()                     │
│    .withLogger()                         │
│    .build()  ──────────────────────────► │
└──────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────┐
│  IgniterTelemetryManager                 │  ← Runtime singleton
│    constructor(config)                   │
│      → creates sampler (from policy)     │
│      → creates redactor (from policy)    │
│      → initTransports() (calls init())   │
│                                          │
│    emit(name, input?)                    │  ← Core dispatch
│      → getActive() session               │
│      → sampler(name, level)              │
│      → buildEnvelope()                   │
│      → sendToTransports()                │
│        → redactor(attributes)            │
│        → adapter.handle(envelope)        │
│                                          │
│    session() → IgniterTelemetrySession   │
│    flush()    → adapter.flush()          │
│    shutdown() → flush() + shutdown()     │
└──────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────┐
│  Transport Fan-out                       │
│  Logger | HTTP | OTLP | Sentry | Slack   │
│  Discord | Telegram | InMemory | Mock    │
│  Store (Redis Streams)                   │
└──────────────────────────────────────────┘
```

#### 3.2 Builder Immutability Contract

Every builder method creates a **new** `IgniterTelemetryBuilder` instance. No method mutates state in-place. This is enforced by spreading `this.state` and creating a fresh builder.

```typescript
// Simplified — actual code in main.builder.ts
withService(service: string): IgniterTelemetryBuilder<TRegistry, TScopes, TActors> {
  return new IgniterTelemetryBuilder({
    ...this.state,
    transports: [...this.state.transports],  // shallow copy transports array
    service,
  });
}
```

**Maintainer rule:** Never introduce state mutation in builder methods. Always return a new instance.

#### 3.3 AsyncLocalStorage Session Model

`IgniterTelemetrySession` uses a shared `AsyncLocalStorage` instance to provide automatic context propagation:

```typescript
// session.ts — static singleton
const sessionStorage = new AsyncLocalStorage<IgniterTelemetrySessionState>();

// session.run() enters the store
async run<T>(fn: () => Promise<T> | T): Promise<T> {
  return IgniterTelemetrySession.runWith(this.state, fn);
}

// manager.emit() reads the store
emit(name, input?) {
  const activeSession = IgniterTelemetrySession.getActive();
  this.internalEmit(name, input, activeSession);
}
```

**Three DX modes:**
1. **Direct emit** — No explicit session; auto-generates session ID
2. **Manual session handle** — `telemetry.session().actor(...).emit(...)`
3. **Scoped execution (recommended)** — `session.run(async () => { telemetry.emit(...) })`

#### 3.4 Pipeline: emit() full trace

```
telemetry.emit('igniter.jobs.job.completed', { attributes: { 'ctx.job.id': 'j1' } })
  │
  ├─ 1. Read AsyncLocalStorage → activeSession?
  │
  ├─ 2. Sampling check
  │     sampler(name='igniter.jobs.job.completed', level='info')
  │       → 'never' patterns? → drop
  │       → 'always' patterns? → pass
  │       → infoRate (0.1) → Math.random() < 0.1?
  │     If fails → return (silent drop)
  │
  ├─ 3. Build envelope
  │     sessionId ← input.sessionId ?? activeSession.sessionId ?? generateSessionId()
  │     attributes ← { ...activeSession.attributes, ...input.attributes }
  │     actor      ← input.actor ?? activeSession.actor
  │     scope      ← input.scope ?? activeSession.scope
  │     time       ← input.time ?? new Date().toISOString()
  │
  ├─ 4. Send to transports (async, fire-and-forget)
  │     for each adapter in transports:
  │       ├─ redactor(envelope.attributes) → redacted attributes
  │       └─ adapter.handle(redactedEnvelope)
  │     If ALL fail → throw TELEMETRY_TRANSPORT_FAILED
  │     (Individual failures are swallowed with logger.error)
  │
  └─ 5. Return void (non-blocking)
```

### 4. Operational Flow Mapping (Every Public Method)

#### IgniterTelemetryBuilder

| Method | Signature | Flow |
|--------|-----------|------|
| `create()` | `static create(): IgniterTelemetryBuilder` | Initialize state with `eventsValidation: { mode: 'development', strict: false }`, empty transports, empty registries |
| `withService(name)` | `(service: string): Builder` | Copy state, set `service`, return new builder |
| `withEnvironment(name)` | `(environment: string): Builder` | Copy state, set `environment`, return new builder |
| `withVersion(version)` | `(version: string): Builder` | Copy state, set `version`, return new builder |
| `addActor(key, options?)` | `(key: TKey, options?: ActorOptions): Builder` | Validate key → throw `TELEMETRY_DUPLICATE_ACTOR` if exists → add to `actorDefinitions` → return new builder |
| `addScope(key, options?)` | `(key: TKey, options?: ScopeOptions): Builder` | Validate key → throw `TELEMETRY_DUPLICATE_SCOPE` if exists → add to `scopeDefinitions` → return new builder |
| `addEvents(descriptor, options?)` | `(descriptor: EventsDescriptor, options?: ValidationOptions): Builder` | Validate namespace uniqueness → merge into `eventsRegistry` → merge validation options → return new builder |
| `addTransport(adapter)` | `(transport: TransportAdapter): Builder` | Throw `TELEMETRY_INVALID_TRANSPORT` if falsy → push to `transports` → return new builder |
| `withSampling(policy)` | `(policy: SamplingPolicy): Builder` | Merge with existing sampling → return new builder |
| `withRedaction(policy)` | `(policy: RedactionPolicy): Builder` | Merge with existing redaction → return new builder |
| `withValidation(options)` | `(options: ValidationOptions): Builder` | Merge with existing validation → return new builder |
| `withLogger(logger)` | `(logger: IgniterLogger): Builder` | Set internal logger → return new builder |
| `build()` | `(): IIgniterTelemetryManager` | Call `buildConfig()` → log if logger configured → instantiate `IgniterTelemetryManager` → init adapters (`adapter.init()` if present) |
| `buildConfig()` | `(): IgniterTelemetryConfig` | Default `service` to `'igniter-app'`, `environment` to `'development'` → merge sampling/redaction defaults → return config object |

#### IgniterTelemetryManager

| Method | Flow |
|--------|------|
| `constructor(config)` | Store config → create sampler from policy → create redactor from policy → log init → call `initTransports()` |
| `emit(name, input?)` | Read ALS session → `internalEmit()`: sampling → build envelope → send to transports |
| `session()` | Create `IgniterTelemetrySession` with emit callback bound to this manager |
| `flush()` | For each adapter with `flush()`: await → log errors, don't throw |
| `shutdown()` | Call `flush()` → for each adapter with `shutdown()`: await → log errors, don't throw |
| `service` (getter) | Returns `config.service` |
| `environment` (getter) | Returns `config.environment` |
| `version` (getter) | Returns `config.version` |

#### IgniterTelemetrySession

| Method | Flow |
|--------|------|
| `create(emitFn)` | Generate session ID, set `startedAt`, store `emitFn` |
| `getActive()` (static) | Return `sessionStorage.getStore()` |
| `runWith(state, fn)` (static) | `sessionStorage.run(state, async () => { await fn() })` |
| `id(sessionId)` | Assert not ended → set `state.sessionId` |
| `actor(type, id?, tags?)` | Assert not ended → set `state.actor = { type, id, tags }` |
| `scope(type, id, tags?)` | Assert not ended → set `state.scope = { type, id, tags }` |
| `attributes(attrs)` | Assert not ended → merge into `state.attributes` |
| `emit(name, input?)` | Assert not ended → delegate to `emitFn(name, input, state)` |
| `run(fn)` | Assert not ended → `runWith(state, fn)` |
| `end()` | Set `state.ended = true` |
| `getState()` | Return copy of `state` |

#### IgniterTelemetryEvents

| Method | Flow |
|--------|------|
| `namespace(name)` | Validate → create builder with namespace |
| `event(name, schema)` | Validate → add to events map → return new builder |
| `group(name, builder)` | Validate → create group → call builder → add group events → return new builder |
| `build()` | Return descriptor with `namespace`, `events`, `get.key()`, `get.schema()`, `$Infer` |

#### IgniterTelemetryEventsGroup

| Method | Flow |
|--------|------|
| `create()` | Return new empty group |
| `event(name, schema)` | Validate → add to events map → return new group |
| `group(name, builder)` | Validate → create sub-group → add → return new group |
| `build()` | Return events map |

### 5. Dependency & Type Graph

```
@igniter-js/telemetry
├── @igniter-js/common (dependency)
│   ├── IgniterLogger        — internal logger interface
│   ├── IgniterError          — base error class
│   └── StandardSchemaV1      — standard schema protocol
├── @igniter-js/store (peer dependency)
│   └── StoreStreamTransportAdapter uses it internally
├── zod (dev dependency)
│   └── Used in examples and tests for schema definitions
├── node:async_hooks
│   └── AsyncLocalStorage — session context engine
├── node:crypto
│   └── crypto.getRandomValues() — ID generation
│   └── crypto.subtle.digest('SHA-256') — redaction hashing
└── node:fs (file adapter only, experimental)
```

**TypeScript generics flow:**
```
IgniterTelemetryBuilder<TRegistry, TScopes, TActors>
  ├── TRegistry extends IgniterTelemetryEventsRegistry = {}
  │     └── Accumulated via addEvents() — merges namespaces
  ├── TScopes extends string = string
  │     └── Accumulated via addScope() — union of scope keys
  └── TActors extends string = string
        └── Accumulated via addActor() — union of actor keys
```

### 6. Maintenance Checklist

Before shipping any change to this package:

- [ ] Confirm builder immutability — every method returns new instance, no state mutation
- [ ] Update `src/types/` before modifying runtime behavior
- [ ] Update event naming validation in `validator.ts` if rules change
- [ ] Ensure redaction covers all new attribute surfaces
- [ ] Validate transport init errors are isolated (one failing adapter doesn't block others)
- [ ] Run full test suite: `pnpm --filter @igniter-js/telemetry test`
- [ ] Update this AGENTS.md if runtime pipeline, config shape, or public API changes
- [ ] Version bump in `package.json` following semver
- [ ] If adding a new adapter: follow Section 8 checklist
- [ ] If adding a new builder method: add to Section 4 flow mapping

### 7. Maintainer Troubleshooting

#### Session data missing in nested async calls
- **Symptom:** `telemetry.emit()` doesn't pick up session actor/scope in nested callbacks.
- **Cause:** Async chain breaks `AsyncLocalStorage` context (e.g., `setTimeout`, bare `Promise` without `run()`).
- **Fix:** Wrap entry points with `session.run(async () => { /* all async work */ })`.
- **Debug:** Call `IgniterTelemetrySession.getActive()` to check if session is alive.

#### Transport initialization fails at build()
- **Symptom:** `TELEMETRY_TRANSPORT_INIT_FAILED` thrown during `.build()`.
- **Cause:** An adapter's `init()` method threw (missing env vars, invalid config, network failure).
- **Fix:** Validate credentials, env vars, and network access before building. Check adapter logs.
- **Note:** `build()` blocks on init — all adapters must initialize successfully.

#### Excessive memory in custom transports
- **Symptom:** Process memory grows over time.
- **Cause:** Unbounded buffering in custom adapters.
- **Fix:** Implement `flush()` method, add queue size limits, apply sampling to reduce volume.

#### All transports failing silently
- **Symptom:** Events seem to disappear but no errors in app logs.
- **Cause:** `TELEMETRY_TRANSPORT_FAILED` is only thrown when ALL transports fail. Check each transport's error handling.
- **Fix:** Add `withLogger()` to the builder to see transport error logs.

#### TypeScript inference not picking up typed events
- **Symptom:** `telemetry.emit('some.event')` shows `string` instead of typed union.
- **Cause:** Builder chain broken — calling non-generic intermediate variable.
- **Fix:** Chain all builder calls together, or use explicit type annotations on intermediate variables.

### 8. Adapter Implementation Checklist

When adding a new transport adapter:

1. **Implement `IgniterTelemetryTransportAdapter`** interface:
   - `readonly type: string` — unique type identifier
   - `handle(envelope: IgniterTelemetryEnvelope): Promise<void> | void` — required
   - `init?(meta: IgniterTelemetryTransportMeta): Promise<void> | void` — optional init
   - `flush?(): Promise<void>` — optional flush
   - `shutdown?(): Promise<void>` — optional cleanup

2. **Add static `create()` method** following convention: factory that returns new instance.

3. **Export** in `src/adapters/index.ts`.

4. **Add entry** in `tsup.config.ts` if public (all built-in adapters are public).

5. **Add tests** in `src/adapters/<name>.adapter.spec.ts`:
   - Test `handle()` with valid envelope
   - Test error handling (don't throw from handle unless intentional)
   - Test `init()`, `flush()`, `shutdown()` if implemented
   - Test edge cases (empty attributes, null values, missing optional fields)

6. **Update this AGENTS.md**: Add to FileSystem Topology (Section 2), Adapter table (Section 16).

7. **Update README.md**: Add usage example and adapter table entry.

### 9. Event Naming Rules (Enforced by Validator)

`IgniterTelemetryValidator.validate()` checks these rules:

- ❌ No colons (`:`) — use dots instead
- ❌ No spaces or special characters (only `[a-zA-Z0-9._-]` allowed)
- ❌ No reserved prefixes (`__`, `__internal`)
- ✅ Dot notation: `domain.feature.action`
- ✅ Hyphens allowed: `worker.started`, `job.completed`
- ✅ Max length: enforced per name/namespace segment

**Recommended conventions:**
- Namespaces: `igniter.<domain>` (e.g., `igniter.jobs`, `igniter.auth`)
- Attribute keys: `ctx.<domain>.<field>` (e.g., `ctx.user.id`, `ctx.job.duration`)

### 10. Internal Testing Matrix

Required test coverage for any PR:

- [ ] Builder immutability — each method returns new instance, original unchanged
- [ ] Session lifecycle — create → configure → emit → end → cannot emit after end
- [ ] Session `run()` — ALS context propagation in async callbacks
- [ ] Sampling rules — always/never patterns, rate-based randomness
- [ ] Redaction policies — denylist removal, hash generation, truncation
- [ ] Each adapter `handle()` path — success + failure modes
- [ ] Transport init failure handling — one failure doesn't cascade
- [ ] Type inference — typed event keys resolve correctly
- [ ] `flush()` and `shutdown()` — all adapters called, errors isolated
- [ ] Error code coverage — all 22 codes have trigger paths

---

## II. CONSUMER GUIDE (Developer Manual)

### 11. Distribution Anatomy

```
@igniter-js/telemetry
├── Main entry:   @igniter-js/telemetry
│   └── Exports: builders, core, errors, types, utils, adapters
├── Adapters:     @igniter-js/telemetry/adapters
│   └── Exports: all 10 adapter classes
└── Per-adapter:  @igniter-js/telemetry/adapters/<name>.adapter
    └── Tree-shakeable individual imports
```

### 12. Quick Start & Common Patterns

#### Golden Path (2-minute setup)

```typescript
import { IgniterTelemetry } from '@igniter-js/telemetry'
import { LoggerTransportAdapter } from '@igniter-js/telemetry/adapters'

export const telemetry = IgniterTelemetry.create()
  .withService('billing-service')
  .withEnvironment(process.env.NODE_ENV ?? 'development')
  .withVersion(process.env.APP_VERSION ?? '0.0.0')
  .addActor('user', { description: 'Human user' })
  .addActor('system', { description: 'Automated system' })
  .addScope('organization', { required: true })
  .addTransport(LoggerTransportAdapter.create({ logger: console, format: 'json' }))
  .withRedaction({ denylistKeys: ['password', 'token', 'authorization'] })
  .withSampling({ debugRate: 0.01, infoRate: 0.1, errorRate: 1.0 })
  .build()

telemetry.emit('service.booted', { attributes: { 'ctx.uptime_ms': process.uptime() * 1000 } })
```

#### Request Correlation (Express middleware)

```typescript
import type { IIgniterTelemetryManager } from '@igniter-js/telemetry'

export function telemetryMiddleware(telemetry: IIgniterTelemetryManager) {
  return async (req, res, next) => {
    await telemetry.session()
      .actor('user', req.headers['x-user-id'] as string)
      .scope('organization', req.headers['x-org-id'] as string)
      .attributes({ 'ctx.request.id': req.headers['x-request-id'] as string })
      .run(async () => {
        telemetry.emit('request.received', {
          attributes: { 'ctx.request.path': req.path, 'ctx.request.method': req.method },
        })
        await next()
        telemetry.emit('request.completed', {
          attributes: { 'ctx.request.status': res.statusCode },
        })
      })
  }
}
```

#### Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  telemetry.emit('service.shutting_down')
  await telemetry.shutdown()
  process.exit(0)
})
```

### 13. Real-World Use Case Library

#### A. E-commerce Order Flow
```typescript
await telemetry.session()
  .actor('user', userId)
  .scope('order', orderId)
  .run(async () => {
    telemetry.emit('order.created')
    await processPayment()
    telemetry.emit('order.payment_succeeded', {
      attributes: { 'ctx.payment.amount': 99.99, 'ctx.payment.provider': 'stripe' },
    })
  })
```

#### B. SaaS Billing
```typescript
telemetry.emit('workspace.created', {
  attributes: { 'ctx.workspace.plan': 'pro', 'ctx.workspace.seats': 5 },
})
```

#### C. Healthcare Audit Trail
```typescript
telemetry.emit('patient.record.accessed', {
  actor: { type: 'doctor', id: doctorId },
  scope: { type: 'hospital', id: hospitalId },
  attributes: { 'ctx.patient.id': patientId, 'ctx.access.reason': 'consultation' },
})
```

#### D. Fintech Compliance
```typescript
telemetry.emit('kyc.verification.completed', {
  level: 'info',
  attributes: { 'ctx.kyc.level': 'l2', 'ctx.kyc.provider': 'onfido' },
})
```

#### E. CI/CD Pipeline
```typescript
telemetry.emit('pipeline.stage.completed', {
  attributes: { 'ctx.stage.name': 'build', 'ctx.stage.duration_ms': 45000 },
  source: { causer: '@myapp/ci', file: 'pipeline.ts', line: 88 },
})
```

#### F. Fraud Detection
```typescript
telemetry.emit('fraud.signal.detected', {
  level: 'warn',
  attributes: { 'ctx.fraud.score': 0.92, 'ctx.fraud.rule': 'velocity_check' },
})
```

#### G. Multi-Tenant API Gateway
```typescript
await telemetry.session()
  .scope('organization', tenantId)
  .run(async () => {
    telemetry.emit('api.request.completed', {
      attributes: { 'ctx.request.path': '/api/users', 'ctx.request.status': 200 },
    })
  })
```

#### H. AI Agent Orchestration
```typescript
telemetry.emit('agent.plan.completed', {
  attributes: { 'ctx.plan.steps': 5, 'ctx.plan.tokens_used': 800 },
  actor: { type: 'agent', id: 'agent-42' },
})
```

#### I. Media Streaming
```typescript
telemetry.emit('stream.segment.buffered', {
  attributes: { 'ctx.segment.index': 15, 'ctx.segment.ms': 4000 },
})
```

#### J. IoT Fleet Monitoring
```typescript
telemetry.emit('sensor.heartbeat', {
  attributes: { 'ctx.sensor.id': 'sensor-7', 'ctx.sensor.temp_c': 21.3 },
  scope: { type: 'fleet', id: 'fleet-europe' },
})
```

### 14. Best Practices

| ✅ Do | Why | Code |
|------|-----|------|
| Use `ctx.` prefix for attributes | Prevents key collisions across features | `'ctx.user.id'` |
| Define typed event registries | Autocomplete + schema validation | `IgniterTelemetryEvents.namespace(...)` |
| Use `session.run()` for HTTP flows | Automatic context propagation | `session.run(async () => { ... })` |
| Chain all builder calls | Preserves TypeScript generics | `IgniterTelemetry.create().withService(...).build()` |
| Redact PII at the edge | Never send raw secrets to transports | `withRedaction({ hashKeys: ['email'] })` |
| Apply sampling in production | Control telemetry volume + cost | `withSampling({ debugRate: 0.01 })` |
| Add `withLogger()` for debugging | See transport errors in dev | `withLogger(myLogger)` |
| Call `shutdown()` on process exit | Flush buffered events gracefully | `process.on('SIGTERM', ...)` |

| ❌ Don't | Why | Better Approach |
|----------|-----|----------------|
| Log raw secrets in attributes | Security risk, PII leakage | `withRedaction({ denylistKeys: [...] })` |
| Skip sampling entirely | Cost blowout in production | Always set `withSampling()` |
| Use colon delimiters in names | Invalid event names | Use dots: `auth.login` not `auth:login` |
| Mutate builder state | Breaks TypeScript generics | Chain immutably |
| Await `emit()` for critical logic | `emit()` is fire-and-forget | Use `flush()` before critical checkpoints |
| Pass `undefined` transport to `addTransport()` | Throws `TELEMETRY_INVALID_TRANSPORT` | Always pass adapter instance |
| Emit after `session.end()` | Throws `TELEMETRY_SESSION_ENDED` | Emit before calling `end()` |

### 15. Domain-Scoped Configuration Guidance

| Domain | Sampling | Redaction | Transports |
|--------|----------|-----------|------------|
| **High-frequency trading** | `debugRate: 0, infoRate: 0.01` | Hash all PII aggressively | OTLP + Store |
| **Public REST APIs** | `infoRate: 0.1, always: ['*.error']` | Hash user IDs, emails | Logger + HTTP + Sentry |
| **Mobile backends** | `infoRate: 0.2` | Standard denylist | Sentry (errors) + OTLP (events) |
| **Multi-tenant SaaS** | `always: ['audit.*']` | Hash tenant data | Store (persistence) + Logger (dev) |
| **Healthcare** | `always: ['*.accessed']` | Hash ALL patient data | Store (audit trail) + HTTP (SIEM) |
| **Dev/CI environments** | `debugRate: 1.0, infoRate: 1.0` | No redaction needed | Logger (pretty format) |

---

## III. TECHNICAL REFERENCE & RESILIENCE

### 16. Exhaustive API Reference

#### Builders

**`IgniterTelemetry`** (alias for `IgniterTelemetryBuilder`)
```typescript
// Entry point
IgniterTelemetry.create(): IgniterTelemetryBuilder<{}, string, string>
```

**`IgniterTelemetryBuilder<TRegistry, TScopes, TActors>`**
| Method | Params | Returns |
|--------|--------|---------|
| `withService(name)` | `service: string` | `Builder<TRegistry, TScopes, TActors>` |
| `withEnvironment(name)` | `environment: string` | `Builder<TRegistry, TScopes, TActors>` |
| `withVersion(version)` | `version: string` | `Builder<TRegistry, TScopes, TActors>` |
| `addActor(key, options?)` | `key: TKey`, `options?: { description?, required? }` | `Builder<TRegistry, TScopes, TActors \| TKey>` |
| `addScope(key, options?)` | `key: TKey`, `options?: { description?, required? }` | `Builder<TRegistry, TScopes \| TKey, TActors>` |
| `addEvents(descriptor, options?)` | `descriptor: EventsDescriptor`, `options?: { mode?, strict? }` | `Builder<TRegistry & Namespace, TScopes, TActors>` |
| `addTransport(adapter)` | `transport: TransportAdapter` | `Builder<TRegistry, TScopes, TActors>` |
| `withSampling(policy)` | `policy: SamplingPolicy` | `Builder<TRegistry, TScopes, TActors>` |
| `withRedaction(policy)` | `policy: RedactionPolicy` | `Builder<TRegistry, TScopes, TActors>` |
| `withValidation(options)` | `options: { mode?: 'development' \| 'always' \| 'none', strict?: boolean }` | `Builder<TRegistry, TScopes, TActors>` |
| `withLogger(logger)` | `logger: IgniterLogger` | `Builder<TRegistry, TScopes, TActors>` |
| `build()` | — | `IIgniterTelemetryManager<TRegistry, TScopes, TActors>` |
| `buildConfig()` | — | `IgniterTelemetryConfig<TRegistry, TScopes, TActors>` |

**`IgniterTelemetryEvents<TNamespace, TEvents>`**
| Method | Params | Returns |
|--------|--------|---------|
| `namespace(name)` (static) | `namespace: TNamespace` | `IgniterTelemetryEvents<TNamespace, {}>` |
| `event(name, schema)` | `name: TName`, `schema: EventSchema` | `IgniterTelemetryEvents<TNamespace, TEvents & { [K in TName]: Schema }>` |
| `group(name, builder)` | `name: TName`, `builder: (g) => EventsGroup<TGroup>` | `IgniterTelemetryEvents<TNamespace, TEvents & { [K in TName]: TGroup }>` |
| `build()` | — | `EventsDescriptor<TNamespace, TEvents>` with `get.key()`, `get.schema()`, `$Infer` |

**`IgniterTelemetryEventsGroup<TEvents>`**
| Method | Params | Returns |
|--------|--------|---------|
| `create()` (static) | — | `IgniterTelemetryEventsGroup<{}>` |
| `event(name, schema)` | `name: TName`, `schema: EventSchema` | `EventsGroup<TEvents & { [K in TName]: Schema }>` |
| `group(name, builder)` | `name: TName`, `builder: (g) => EventsGroup<TGroup>` | `EventsGroup<TEvents & { [K in TName]: TGroup }>` |
| `build()` | — | `TEvents` (events map) |

#### Core Runtime

**`IgniterTelemetryManager<TRegistry, TScopes, TActors>`** (via `IIgniterTelemetryManager`)
| Member | Type | Description |
|--------|------|-------------|
| `emit(name, input?)` | `Method` | Dispatch event through sampling → envelope → redaction → transports |
| `session()` | `Method → IIgniterTelemetrySession` | Create session handle for context management |
| `flush()` | `Method → Promise<void>` | Flush all transport buffers |
| `shutdown()` | `Method → Promise<void>` | Flush then shutdown all transports |
| `service` | `getter → string` | Configured service name |
| `environment` | `getter → string` | Configured environment |
| `version` | `getter → string \| undefined` | Configured version |

**`IgniterTelemetrySession<TActor, TScope>`** (via `IIgniterTelemetrySession`)
| Member | Type | Description |
|--------|------|-------------|
| `id(sessionId)` | `Method → this` | Set custom session ID |
| `actor(type, id?, tags?)` | `Method → this` | Set session actor |
| `scope(type, id, tags?)` | `Method → this` | Set session scope |
| `attributes(attrs)` | `Method → this` | Merge session attributes |
| `emit(name, input?)` | `Method → void` | Emit within session context |
| `run(fn)` | `Method → Promise<T>` | Execute callback with session as active context |
| `end()` | `Method → Promise<void>` | End session (prevents further emits) |
| `getState()` | `Method → SessionState` | Get copy of current session state |
| `getActive()` | `Static → SessionState \| undefined` | Read active session from ALS |
| `runWith(state, fn)` | `Static → Promise<T>` | Run function with explicit session state |

#### Transport Adapters

| Adapter | `type` | `create()` config | Notes |
|---------|--------|-------------------|-------|
| `LoggerTransportAdapter` | `'logger'` | `{ logger, format?, includeTimestamp?, minLevel? }` | Console/structured logging |
| `HttpTransportAdapter` | `'http'` | `{ url, headers?, timeout?, retries? }` | Generic webhook POST |
| `OtlpTransportAdapter` | `'otlp'` | `{ url, headers? }` | OTLP Logs over HTTP/JSON |
| `SentryTransportAdapter` | `'sentry'` | `{ sentry }` | Exceptions + breadcrumbs |
| `SlackTransportAdapter` | `'slack'` | `{ webhookUrl, minLevel?, username?, iconEmoji? }` | Slack webhook messages |
| `DiscordTransportAdapter` | `'discord'` | `{ webhookUrl, minLevel?, username?, avatarUrl? }` | Discord webhook embeds |
| `TelegramTransportAdapter` | `'telegram'` | `{ botToken, chatId, minLevel? }` | Telegram bot messages |
| `InMemoryTransportAdapter` | `'memory'` | `()` | In-memory capture for testing |
| `MockTelemetryAdapter` | `'mock'` | `()` | Unit test assertions (`getLastEvent()`) |
| `StoreStreamTransportAdapter` | `'store'` | `{ redis, stream?, maxLen?, approximate?, streamBuilder? }` | Redis Streams via `@igniter-js/store` |

#### Utility Classes

**`IgniterTelemetryId`**
| Method | Returns | Description |
|--------|---------|-------------|
| `generateSessionId()` | `string` | `ses_<timestamp>_<random>` format |
| `generateSpanId()` | `string` | 16 hex chars (64-bit) |
| `generateTraceId()` | `string` | 32 hex chars (128-bit) |
| `isValidSessionId(id)` | `boolean` | Validates `ses_*` format |
| `generateHex(length)` | `string` | Private; used internally |

**`IgniterTelemetrySampling`**
| Method | Returns | Description |
|--------|---------|-------------|
| `matchesPattern(pattern, eventName)` | `boolean` | Glob matching (`*.failed`, `security.*`, `job.*.completed`) |
| `shouldSample(policy, eventName, level)` | `boolean` | Full sampling decision (never → always → rate) |
| `createSampler(policy)` | `(name, level) => boolean` | Returns sampler function |

**`IgniterTelemetryRedaction`**
| Method | Returns | Description |
|--------|---------|-------------|
| `createRedactor(policy)` | `(attrs) => Promise<Attributes>` | Async redactor with SHA-256 hashing |
| `createSyncRedactor(policy)` | `(attrs) => Attributes` | Sync redactor with djb2 hash |
| `redactEnvelope(envelope, policy)` | `Promise<Envelope>` | Apply redaction to full envelope |

**`IgniterTelemetryValidator`**
| Method | Returns | Description |
|--------|---------|-------------|
| `validate(name, context)` | `void` | Throws on invalid names (colons, spaces, reserved prefixes) |

#### Error Class

**`IgniterTelemetryError`** extends `IgniterError`
| Member | Description |
|--------|-------------|
| `code: IgniterTelemetryErrorCode` | Machine-readable error code |
| `static is(error): error is IgniterTelemetryError` | Type guard |
| `hasCode(code): boolean` | Check specific error code |

### 17. Exhaustive Error Code Library

All 22 error codes from `IGNITER_TELEMETRY_ERROR_CODES`:

#### Configuration Errors

| Code | When Thrown | Mitigation |
|------|------------|------------|
| `TELEMETRY_SERVICE_REQUIRED` | Reserved (not emitted; builder defaults to `'igniter-app'`) | Set `withService()` explicitly |
| `TELEMETRY_ENVIRONMENT_REQUIRED` | Reserved (not emitted; defaults to `'development'`) | Set `withEnvironment()` in production |
| `TELEMETRY_CONFIGURATION_INVALID` | Reserved for future use | Validate config in custom pipelines |

#### Transport Errors

| Code | When Thrown | Mitigation |
|------|------------|------------|
| `TELEMETRY_INVALID_TRANSPORT` | `addTransport()` called with falsy value | Pass adapter instance |
| `TELEMETRY_TRANSPORT_FAILED` | ALL transports failed in `sendToTransports()` | Check downstream health, credentials |
| `TELEMETRY_TRANSPORT_INIT_FAILED` | Adapter `init()` threw at `build()` | Validate env vars, network, permissions |

#### Event Errors

| Code | When Thrown | Mitigation |
|------|------------|------------|
| `TELEMETRY_INVALID_EVENT_NAME` | Event name with invalid characters | Follow naming rules (Section 9) |
| `TELEMETRY_UNKNOWN_EVENT` | Emitting unregistered event in strict mode | Register event or disable strict mode |
| `TELEMETRY_DUPLICATE_EVENT` | Duplicate event name in same namespace | Use unique event names |

#### Schema / Validation Errors

| Code | When Thrown | Mitigation |
|------|------------|------------|
| `TELEMETRY_SCHEMA_VALIDATION_FAILED` | Event attributes fail schema validation | Fix attribute shape to match schema |
| `TELEMETRY_INVALID_NAMESPACE` | Invalid namespace format | Use dot notation, no special chars |
| `TELEMETRY_RESERVED_NAMESPACE` | Using reserved namespace prefix (`__`) | Choose different namespace |
| `TELEMETRY_DUPLICATE_NAMESPACE` | `addEvents()` with duplicate namespace | Use unique namespace per feature |

#### Session Errors

| Code | When Thrown | Mitigation |
|------|------------|------------|
| `TELEMETRY_SESSION_ENDED` | Emit/modify after `session.end()` | Check session state before emitting |
| `TELEMETRY_SESSION_INVALID` | Invalid session configuration | Validate session params |

#### Scope & Actor Errors

| Code | When Thrown | Mitigation |
|------|------------|------------|
| `TELEMETRY_DUPLICATE_SCOPE` | `addScope()` with duplicate key | Use unique scope keys |
| `TELEMETRY_INVALID_SCOPE` | Invalid scope key format | Follow key naming rules |
| `TELEMETRY_DUPLICATE_ACTOR` | `addActor()` with duplicate key | Use unique actor keys |
| `TELEMETRY_INVALID_ACTOR` | Invalid actor key format | Follow key naming rules |

#### Emit & Runtime Errors

| Code | When Thrown | Mitigation |
|------|------------|------------|
| `TELEMETRY_EMIT_FAILED` | Reserved for emit-level failures | Check event name and attributes |
| `TELEMETRY_RUNTIME_NOT_INITIALIZED` | Using manager before build | Call `.build()` before using |

### 18. Recommended Event Namespaces

| Domain | Namespace | Example Events |
|--------|-----------|----------------|
| Authentication | `igniter.auth` | `login.succeeded`, `login.failed`, `token.refreshed` |
| Background Jobs | `igniter.jobs` | `job.started`, `job.completed`, `job.failed` |
| Data Store | `igniter.store` | `query.executed`, `cache.hit`, `cache.miss` |
| File Storage | `igniter.storage` | `file.uploaded`, `file.deleted`, `file.downloaded` |
| HTTP Layer | `igniter.http` | `request.started`, `request.completed`, `request.failed` |
| Billing | `igniter.billing` | `invoice.created`, `invoice.paid`, `payment.failed` |
| Analytics | `igniter.analytics` | `event.tracked`, `funnel.step_completed` |
| Security/Audit | `igniter.audit` | `permission.granted`, `resource.accessed` |

**Attribute naming convention:** `ctx.<domain>.<field>`
- `ctx.user.id`, `ctx.job.duration_ms`, `ctx.request.path`, `ctx.payment.amount`

---

## IV. APPENDIX

### 19. Version History & Change Notes

- **0.1.143** (current): Latest stable. All 10 adapters, 13 builder methods, 22 error codes.
- **0.1.12**: Initial public release with Logger, HTTP, Store adapters.
- See `CHANGELOG.md` for full history.

### 20. Related Resources

- [README.md](./README.md) — Consumer-facing documentation with 50+ examples
- [package.json](./package.json) — Dependencies, exports map, scripts
- [tsup.config.ts](./tsup.config.ts) — Build configuration (dual entry)
- [vitest.config.ts](./vitest.config.ts) — Test configuration
- GitHub: [https://github.com/felipebarcelospro/igniter-js](https://github.com/felipebarcelospro/igniter-js)
- Homepage: [https://igniterjs.com](https://igniterjs.com)
