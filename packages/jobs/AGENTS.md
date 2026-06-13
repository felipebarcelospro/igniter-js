# AGENTS.md - @igniter-js/jobs

> **Last Updated:** 2026-06-02
> **Version:** 0.1.15
> **Goal:** Complete operational manual for Code Agents maintaining and consuming the @igniter-js/jobs package.

---

## 1. Package Vision & Context

`@igniter-js/jobs` is the definitive background processing and task scheduling solution for the Igniter.js ecosystem. It transforms the often-unpredictable world of distributed queues into a type-safe, observable, and highly structured domain that feels like a native extension of the application's business logic.

### Why This Package Exists

In modern distributed systems, background processing is usually the first point of failure and the last point of visibility. Traditional queue libraries often suffer from:

- **Type Erasure:** Job payloads are treated as `any` or raw JSON, leading to "poison pill" jobs that crash workers after being enqueued from a different version of the app.
- **Context Isolation:** Accessing core resources like database connections, mailers, or configurations inside a worker usually requires brittle global variables or complex dependency injection hacks.
- **Observability Gaps:** Tracking a job from the moment it's enqueued in an API request to its final completion on a remote worker often requires manual, inconsistent instrumentation.
- **Multi-Tenant Leakage:** In SaaS environments, it's dangerously easy for a job intended for Organization A to leak context or data into Organization B's processing loop.

### The Igniter.js Solution

`@igniter-js/jobs` solves these problems by enforcing a strict **Infrastructure-as-Code** approach to background tasks:

1. **End-to-End Type Safety:** By using TypeScript's powerful inference engine, the package ensures that the `input` passed to `.dispatch()` is exactly what the `handler` expects.
2. **Resource-Aware Context:** The `withContext()` factory on `IgniterJobsBuilder` ensures that every job execution starts with a fresh, validated set of resources, exactly like a standard API request.
3. **Multi-Platform Support (Adapters):** Whether using **BullMQ** for massive production scale, **Bun SQLite** for local/desktop apps, or an **In-Memory** adapter for unit tests, the business logic remains identical.
4. **Native Observability:** Telemetry and internal event publishing are "baked in," providing immediate visibility into enqueuing, execution times, failures, and retries without writing a single line of logging code.
5. **Typed Job Streams:** Jobs can emit typed per-job stream events for live consumers and optional persisted replay.
6. **Scoped Multi-Tenancy:** First-class scope support via `addScope()` and `.scope()` for tenant isolation without risk of cross-tenant data leakage.

---

## I. MAINTAINER GUIDE (Internal Architecture)

### 2. FileSystem Topology (Maintenance)

Maintainers must respect the following directory structure and responsibilities:

- **`src/builders/`**: The configuration factory.
  - `main.builder.ts`: `IgniterJobsBuilder`. Manages immutable state accumulation and generic type narrowing for context, queues, scopes, telemetry, and auto-start workers. Uses the `this`-typed `withContext<TNewContext>()` to propagate inferred context types.
  - `queue.builder.ts`: `IgniterQueueBuilder`. Fluent API for defining jobs and crons within a queue. Validates uniqueness constraints and handler presence.
  - `worker.builder.ts`: `IgniterWorkerBuilder`. Configures worker concurrency, limiter, and lifecycle handlers. Validates queue names against registered queues.
- **`src/core/`**: The runtime heart.
  - `manager.ts`: `IgniterJobsManager`. Implements the proxy-based runtime API (dynamic queue/job accessors), handler-wrapping pipeline (telemetry, context, validation, error handling), stream infrastructure, and scoped instance creation. Uses a `WeakSet<IgniterJobsAdapter>` to prevent duplicate registration across scoped instances.
  - `queue.ts`: Lightweight utility for queue operations.
- **`src/adapters/`**: The infrastructure boundary.
  - `memory.adapter.ts`: `IgniterJobsMemoryAdapter`. Production-grade in-memory implementation for tests (non-persistent). Full adapter contract implementation.
  - `bun-sqlite.adapter.ts`: `IgniterJobsBunSQLiteAdapter`. Bun-native SQLite adapter for local, desktop, CLI, and embedded workloads. Exports `IgniterJobsBunSQLiteAdapterOptions`.
  - `bullmq.adapter.ts`: `IgniterJobsBullMQAdapter`. Reference adapter for production Redis-based queues via BullMQ. Exports `IgniterJobsBullMQAdapterOptions`.
- **`src/errors/`**: Resiliency definitions.
  - `jobs.error.ts`: `IgniterJobsError`. Extends `IgniterError` with 25 canonical error codes (`JOBS_ADAPTER_REQUIRED`, `JOBS_SERVICE_REQUIRED`, `JOBS_CONTEXT_REQUIRED`, `JOBS_CONFIGURATION_INVALID`, `JOBS_QUEUE_NOT_FOUND`, `JOBS_QUEUE_DUPLICATE`, `JOBS_QUEUE_OPERATION_FAILED`, `JOBS_INVALID_DEFINITION`, `JOBS_HANDLER_REQUIRED`, `JOBS_DUPLICATE_JOB`, `JOBS_NOT_FOUND`, `JOBS_NOT_REGISTERED`, `JOBS_EXECUTION_FAILED`, `JOBS_TIMEOUT`, `JOBS_CONTEXT_FACTORY_FAILED`, `JOBS_VALIDATION_FAILED`, `JOBS_INVALID_INPUT`, `JOBS_INVALID_CRON`, `JOBS_INVALID_SCHEDULE`, `JOBS_SCOPE_ALREADY_DEFINED`, `JOBS_WORKER_FAILED`, `JOBS_ADAPTER_ERROR`, `JOBS_ADAPTER_CONNECTION_FAILED`, `JOBS_SUBSCRIBE_FAILED`).
- **`src/telemetry/`**: Observability registry.
  - `index.ts`: Exports `IgniterJobsTelemetryEvents` — a Zod-validated namespace with 17 events across 3 groups (job: 7, worker: 5, queue: 5).
- **`src/types/`**: Pure contract definitions.
  - `adapter.ts`: `IgniterJobsAdapter` interface (50+ methods), adapter-specific option types.
  - `runtime.ts`: Proxy accessor types (`IgniterJobsRuntime`, `IgniterJobsQueueAccessor`, `IgniterJobsJobAccessor`, `IgniterJobsJobInstanceAccessor`, `IgniterJobsJobManyAccessor`, `IgniterJobsQueueManagerAccessor`, `IgniterJobsWorkerBuilderAccessor`).
  - `job.ts`: `IgniterJobDefinition`, `IgniterCronDefinition`, `IgniterJobsDispatchParams`, `IgniterJobsScheduleParams`, `IgniterJobsExecutionContext`, hook types (`onStart`, `onSuccess`, `onFailure`, `onProgress`), `IgniterJobStatus`, `IgniterJobSearchResult`, `IgniterJobCounts`.
  - `queue.ts`: `IgniterJobsQueue`, `IgniterJobsQueueInfo`, `IgniterJobsQueueCleanOptions`, `IgniterJobsQueueManager`.
  - `worker.ts`: `IgniterJobsWorkerHandle`, `IgniterJobsWorkerMetrics`, `IgniterJobsWorkerHandlers`, `IgniterJobsWorkerBuilderConfig`.
  - `events.ts`: `IgniterJobsEvent`, `IgniterJobsEventHandler`, `IgniterJobsTelemetry` (mirrors `IgniterTelemetry` public API).
  - `stream.ts`: Typed per-job stream definitions, emit/read/subscribe contracts, `IgniterJobsJobStreamAccessor`, `IgniterJobsExecutionStreamEmitter`.
  - `scope.ts`: `IgniterJobsScopeEntry`, `IgniterJobsScopeOptions`, `IgniterJobsScopeDefinition`.
  - `schedule.ts`: `IgniterJobsScheduleOptions` (delay, at, cron, every, business hours, skip patterns).
  - `schema.ts`: `IgniterJobsSchema` union type (Standard Schema V1 + Zod-like), inference helpers.
  - `config.ts`: `IgniterJobsConfig`, `IgniterJobsBuilderState`.
- **`src/utils/`**: Static helper library.
  - `events.utils.ts`: Pub/sub event helpers and channel composition.
  - `id-generator.ts`: Deterministic ID utilities for adapters (`generate("job")`).
  - `prefix.ts`: Consistency logic for queue names and event channels.
  - `scope.ts`: Scope merging and extraction utilities (`mergeMetadataWithScope`).
  - `telemetry.ts`: Telemetry helper utilities.
  - `validation.ts`: Runtime schema validation utilities.

### 3. Architecture Deep-Dive

#### 3.1 The Handler-Wrapper Pattern

The core reliability of the package comes from the fact that user handlers are never called directly by the adapter. Instead, `core/manager.ts` wraps every handler in a sophisticated pipeline inside `wrapJobDefinition()`:

1. **Telemetry Injection:** A "started" event is emitted before the handler runs.
2. **Context Resolution:** The `contextFactory` provided in the builder is invoked to create the execution environment.
3. **Metadata Unpacking:** The scope (tenant ID) is extracted from the job metadata and injected into the context.
4. **Schema Enforcement:** If an `input` schema is defined, the payload is validated _inside the worker_ before being passed to the handler, using `IgniterJobsValidationUtils.parse()`.
5. **Lifecycle Management:** The wrapper executes hooks in order: `onStart` → handler → `onSuccess`/`onFailure`. On failure, it determines if it was the final attempt and emits the corresponding "failed" telemetry.
6. **Stream Initialization:** If a stream definition exists, the execution stream emitter is attached to `ctx.job.stream.emit()`.

#### 3.2 Proxy-Based Accessors

The `IgniterJobsRuntime` uses a dynamic property accessor pattern via `toRuntime()`. When you call `jobs.email.sendWelcome`, you aren't accessing a hardcoded property. Instead, a `Proxy` intercepts property access and maps the `email` queue and `sendWelcome` job from its internal configuration. This allows for a fluent, "discoverable" API that is 100% type-safe without needing code generation.

#### 3.3 Adapter Registration (WeakSet)

Scoped instances (created via `jobs.scope()`) share the same adapter. To prevent re-registering jobs and crons on scoped instances, a `WeakSet<IgniterJobsAdapter>` tracks which adapters have already been registered. The `ensureRegistered()` method checks this set before iterating queues.

#### 3.4 Builder Immutability

The `IgniterJobsBuilder` follows the immutable pattern: each method returns a new builder with refined types. The `clone()` method merges partial state into a fresh instance. The `withContext<TNewContext>()` method uses `this`-typing to reset queues when the context type changes, ensuring type compatibility.

### 4. Operational Flow Mapping (Pipelines)

#### 4.1 Method: `IgniterJobsBuilder.build()`

1. **Argument Validation:** Adapter, Service, Environment, and Context Factory must be present. Missing any throws `JOBS_ADAPTER_REQUIRED`, `JOBS_SERVICE_REQUIRED`, `JOBS_CONFIGURATION_INVALID`, or `JOBS_CONTEXT_REQUIRED`.
2. **Config Assembly:** Builds `IgniterJobsConfig` from builder state, including `scopeDefinition`, `queueDefaults`, `workerDefaults`, `autoStartWorker`, `logger`, `telemetry`.
3. **Runtime Creation:** Instantiates `IgniterJobsManager(config)` and calls `.toRuntime()`.
4. **Adapter Registration:** `IgniterJobsManager.ensureRegistered()` registers all jobs and crons on the adapter via `adapter.registerJob()` and `adapter.registerCron()`.
5. **Result Formatting:** Returns a `Proxy`-based runtime with queue/job accessors.

#### 4.2 Method: `job.dispatch(params)`

1. **Argument Validation:** Validates `input` against job schema using `IgniterJobsValidationUtils.parse()`.
2. **Scope Merging:** Merges instance scope with per-dispatch scope via `IgniterJobsScopeUtils.mergeMetadataWithScope()`.
3. **Telemetry (Enqueued):** Emits `igniter.jobs.job.enqueued` when telemetry is configured.
4. **Adapter Call:** Calls `adapter.dispatch()`.
5. **Result:** Returns job ID string.

#### 4.3 Method: `job.schedule(params)`

1. **Input Validation:** Same as dispatch.
2. **Scope Merging:** Same as dispatch.
3. **Delay Resolution:** If `params.at` is set, converts to delay. Validates future time.
4. **Telemetry (Scheduled):** Emits `igniter.jobs.job.scheduled`.
5. **Adapter Call:** Calls `adapter.schedule()`.

#### 4.4 Method: `worker.start()`

1. **Builder Chain:** `jobs.worker.create().addQueue(name).withConcurrency(n).start()`.
2. **Config Assembly:** Consolidates queues, handlers, concurrency, and limiter into `IgniterJobsWorkerBuilderConfig`.
3. **Adapter Call:** Calls `adapter.createWorker(config)`.
4. **Result Formatting:** Returns `IgniterJobsWorkerHandle`.

#### 4.5 Method: `queue.get().retrieve()`

1. **Internal Logic:** Resolves queue name from proxy accessor.
2. **Adapter Call:** Calls `adapter.getQueueInfo(queueName)`.
3. **Result Formatting:** Returns `IgniterJobsQueueInfo`.

#### 4.6 Method: `queue.get().obliterate(options?)`

1. **Adapter Call:** Calls `adapter.obliterateQueue(queueName, options)`.
2. **Result:** Adapter handles queue destruction; force flag determines safety.

#### 4.7 Method: `job.get(id).retrieve()`

1. **Internal Logic:** Resolves queue and job name.
2. **Adapter Call:** Calls `adapter.getJob(jobId, queue?)`.
3. **Result Formatting:** Maps adapter result to `IgniterJobSearchResult`.

#### 4.8 Method: `job.get(id).stream()`

1. **Returns:** `IgniterJobsJobStreamAccessor` with `subscribe()` and `read()` methods.
2. **Subscribe:** Calls `adapter.subscribeJobStream()` with job-scoped handler.
3. **Read:** Calls `adapter.readJobStream()` with optional cursor/limit for paginated replay.

### 5. Dependency & Type Graph

The package is designed for maximum portability with carefully managed dependencies.

- **`@igniter-js/common`**: Required peer. Provides `IgniterError`, `IgniterLogger`, `StandardSchemaV1`.
- **`@igniter-js/telemetry`**: Optional peer. Provides `IgniterTelemetry` for operational monitoring.
- **`bunqueue`**: Runtime dependency. Used by the Bun SQLite adapter.

**Optional Peer Dependencies:**
- `@igniter-js/adapter-bullmq`: BullMQ adapter for production Redis queues
- `@igniter-js/store`: Optional for stream persistence
- `bullmq` + `ioredis`: Required when using the BullMQ adapter
- `zod`: Schema validation (also supports Standard Schema V1)

**Type Flow:**
`IgniterJobsBuilder` → `IgniterJobsConfig` → `IgniterJobsManager` → `Proxy` → `IgniterJobsRuntime` → `IgniterJobsQueueAccessor` → `IgniterJobsJobAccessor`

### 6. Maintenance Checklist

1. **Parity Check:** If you add a new feature to the `IgniterJobsAdapter` interface, ensure it is implemented in all three adapters (`memory.adapter.ts`, `bun-sqlite.adapter.ts`, `bullmq.adapter.ts`).
2. **Telemetry Audit:** Job lifecycle emits telemetry in `core/manager.ts` via `this.telemetry?.emit()`. Queue/worker telemetry depends on adapter behavior.
3. **Error Propagation:** Ensure that errors thrown in user hooks (`onStart`, `onSuccess`, `onFailure`, `onProgress`) do not crash the worker loop. The wrapper in `wrapJobDefinition()` must catch and report these.
4. **Inference Test:** Run `pnpm typecheck` and verify that `main.builder.spec.ts` can still autocomplete queue names and job inputs.
5. **Export Synchronization:** When adding new subpath exports, update `package.json` `exports` field and ensure the `browser` shim field is updated too.
6. **Scope Safety:** When modifying scope logic, verify that `scope()` creates new `IgniterJobsManager` instances rather than mutating existing state.

### 7. Maintainer Troubleshooting

#### Issue: Context factory is called too many times

- **Check:** Is the adapter caching the context factory result per job execution?
- **Fix:** The context factory invocation happens inside `wrapJobDefinition()` in `core/manager.ts`, once per job execution. Adapters should not invoke it.

#### Issue: Telemetry attributes are missing

- **Check:** Are the attributes prefixed with `ctx.job.` or `ctx.worker.`?
- **Fix:** Follow the schema in `telemetry/index.ts`. All job attributes use `ctx.job.*`, worker attributes use `ctx.worker.*`, queue attributes use `ctx.queue.*`.

#### Issue: Duplicate job registration errors with scoped instances

- **Check:** Is the `WeakSet` check in `ensureRegistered()` working?
- **Fix:** The `registeredAdapters` WeakSet should prevent re-registration. If the adapter is replaced on a scoped instance, the set check won't trigger because the adapter object reference is different.

#### Issue: Type inference breaks after `withContext()`

- **Check:** Was `withContext()` called before `addQueue()`?
- **Fix:** `withContext()` resets the queues map. Always call it before adding queues. The method signature uses `this: IgniterJobsBuilder<unknown, {}, TScope>` to enforce this at the type level.

---

## II. CONSUMER GUIDE (Developer Manual)

### 8. Distribution Anatomy (Consumption)

The package provides organized subpath exports for optimized bundling:

| Import Path | Description | Runtime |
|------------|-------------|---------|
| `@igniter-js/jobs` | Main entry point. `IgniterJobs`, `IgniterQueue`, all types. | Node, Bun |
| `@igniter-js/jobs/telemetry` | Telemetry event registry (`IgniterJobsTelemetryEvents`). | Node, Bun |
| `@igniter-js/jobs/adapters/node` | Node.js BullMQ adapter (`IgniterJobsBullMQAdapter`). | Node |
| `@igniter-js/jobs/adapters/bun` | Bun-native SQLite adapter (`IgniterJobsBunSQLiteAdapter`). | Bun |
| `@igniter-js/jobs/adapters/mock` | In-memory adapter (`IgniterJobsMemoryAdapter`) for tests/dev. | Universal |

All subpath exports have a `browser` field mapping to `dist/shim.js` for bundler compatibility.

### 9. Quick Start & Common Patterns

#### Pattern: The Singleton Instance

Setup your jobs in a central `src/services/jobs.ts` file:

```typescript
import { IgniterJobs, IgniterQueue } from "@igniter-js/jobs";
import { IgniterJobsBullMQAdapter } from "@igniter-js/jobs/adapters/node";
import { z } from "zod";
import Redis from "ioredis";

type AppContext = { db: PrismaClient; cache: Redis };

const emailQueue = IgniterQueue.create("email")
  .addJob("sendWelcome", {
    input: z.object({ email: z.string().email() }),
    handler: async ({ input, context }) => {
      await context.db.user.update({ where: { email: input.email }, data: { welcomed: true } });
    },
  })
  .build();

export const jobs = IgniterJobs.create()
  .withAdapter(IgniterJobsBullMQAdapter.create({ redis: new Redis() }))
  .withService("api")
  .withEnvironment("production")
  .withContext<AppContext>(async () => ({ db: prisma, cache: redis }))
  .addQueue(emailQueue)
  .build();
```

#### Pattern: Scheduled Retries with Backoff

Prevent permanent failures in external API calls:

```typescript
.addJob("sync", {
  attempts: 5,
  delay: 5000,
  handler: async ({ input }) => {
    await externalApi.sync(input.id);
  },
  onFailure: async ({ error, isFinalAttempt }) => {
    if (isFinalAttempt) {
      await alerting.pagerDuty("Sync permanently failed", error);
    }
  },
})
```

#### Pattern: Multi-Tenant Scoping

```typescript
const jobs = IgniterJobs.create()
  .withAdapter(adapter)
  .withService("api")
  .withEnvironment("production")
  .withContext(async () => ({ db }))
  .addScope("organization", { required: true })
  .addQueue(emailQueue)
  .build();

// Scoped dispatch — scope metadata flows to telemetry and adapter
const orgJobs = jobs.scope("organization", "org_123");
await orgJobs.email.sendWelcome.dispatch({ input: { email: "user@org.com" } });

// Or per-dispatch override
await jobs.email.sendWelcome.dispatch({
  input: { email: "user@org.com" },
  scope: { type: "organization", id: "org_123" },
});
```

#### Pattern: Typed Job Streams

```typescript
const uploadQueue = IgniterQueue.create("uploads")
  .addJob("processImage", {
    input: z.object({ url: z.string() }),
    stream: {
      persistence: { enabled: true, maxEvents: 100 },
      events: {
        "resize.started": z.object({ width: z.number(), height: z.number() }),
        "resize.complete": z.object({ outputUrl: z.string() }),
        "resize.failed": z.object({ reason: z.string() }),
      },
    },
    handler: async ({ input, job }) => {
      await job.stream.emit("resize.started", { width: 800, height: 600 });
      const result = await resize(input.url, 800, 600);
      await job.stream.emit("resize.complete", { outputUrl: result.url });
    },
  })
  .build();
```

### 10. Real-World Use Case Library

#### Case 1: E-commerce Order Expiry
- **Scenario:** Cancel unpaid orders after 1 hour.
- **Implementation:** `jobs.orders.cancel.schedule({ input: { id }, delay: 3600000 })`.

#### Case 2: Fintech Nightly Reconciliation
- **Scenario:** Verify 1M transactions against bank API at 3 AM.
- **Implementation:** Cron job `"0 3 * * *"`. Dispatches batch jobs with 100 transactions each.

#### Case 3: Social Media Transcoding
- **Scenario:** Generate 5 video qualities after upload.
- **Implementation:** High-priority queue for 360p, low-priority for 4K. Progress updates via `job.updateProgress?.(percent)`.

#### Case 4: Healthcare Appointment Reminders
- **Scenario:** Send SMS 24h before appointment.
- **Implementation:** `.schedule({ at: reminderDate })`. Uses `onFailure` to alert if SMS provider is down.

#### Case 5: SaaS Multi-Tenant CSV Import
- **Scenario:** Process 100k row CSV per tenant.
- **Implementation:** `scope("workspace", wsId)`. Progress via `job.updateProgress?.(percent)` every 100 rows. Stream events for real-time progress bar.

### 11. Domain-Specific Guidance

- **Financial Systems:** Always use `attempts` and `backoff`. Implement `onFailure` to alert engineering. Consider idempotency keys.
- **High-Volume Caching:** Use `delay` to batch invalidation events. Leverage `removeOnComplete` to keep queue lean.
- **AI Processing:** Set concurrency to match GPU/API limits. Use `withLimiter({ max, duration })` for rate limiting.
- **Multi-Tenant SaaS:** Always use scopes. Never rely on job payload metadata alone for tenant isolation.

### 12. Best Practices & Anti-Patterns

| Practice             | Why?                 | Example                                 |
| :------------------- | :------------------- | :-------------------------------------- |
| ✅ Small Payloads    | Reduces overhead.    | `input: { id: '123' }`                  |
| ✅ Context Injection | Keeps handlers pure. | `withContext(() => ({ db }))`           |
| ✅ Idempotency       | Jobs WILL retry.     | Check status before taking action.      |
| ✅ Schema Validation | Prevents poison pills.| `input: z.object({ id: z.string() })`   |
| ✅ Graceful Shutdown | Prevents data loss.  | `await jobs.shutdown()` on SIGTERM      |
| ❌ Sync I/O          | Kills throughput.    | Use `async` handlers always.            |
| ❌ Large Payloads    | Bloats the queue.    | Store payloads in DB, pass ID only.     |
| ❌ Mutable Context   | Cross-job pollution. | Context must be fresh each invocation.  |
| ❌ Ignoring onFailure| Silent data loss.    | Always log/alert on final failure.      |

---

## III. TECHNICAL REFERENCE & RESILIENCE

### 13. Exhaustive API Reference

#### IgniterJobs (Factory)
```typescript
import { IgniterJobs } from "@igniter-js/jobs";

// IgniterJobs is the factory namespace. The actual builder class is IgniterJobsBuilder.
const jobs = IgniterJobs.create()  // → IgniterJobsBuilder<unknown>
```

#### IgniterJobsBuilder Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `create()` | `static create(): IgniterJobsBuilder<unknown>` | Creates initial builder. |
| `withAdapter(a)` | `(adapter: IgniterJobsAdapter): Builder` | Attaches backend adapter. Required before `build()`. |
| `withService(s)` | `(service: string): Builder` | Service identifier for telemetry. Required before `build()`. |
| `withEnvironment(e)` | `(environment: string): Builder` | Environment name. Required before `build()`. |
| `withContext(f)` | `<T>(factory: () => T): Builder<T>` | Context factory. Must be called before `addQueue()`. |
| `addScope(n, o?)` | `(name: string, options?: ScopeOptions): Builder` | Single scope definition. Throws if already defined. |
| `addQueue(q)` | `(queue: IgniterJobsQueue): Builder` | Registers a queue. Throws on duplicate names. |
| `withQueueDefaults(d)` | `(defaults: Partial<JobDefinition>): Builder` | Default job options applied to all queues. |
| `withWorkerDefaults(d)` | `(defaults: Partial<WorkerConfig>): Builder` | Default worker options. |
| `withAutoStartWorker(c)` | `(config: {queues, concurrency?, limiter?}): Builder` | Auto-start config (stored, not auto-executed by builder). |
| `withTelemetry(t)` | `(telemetry: IgniterJobsTelemetry): Builder` | Attaches telemetry instance. |
| `withLogger(l)` | `(logger: IgniterLogger): Builder` | Attaches custom logger. |
| `build()` | `(): IgniterJobsRuntime<TConfig>` | Finalizes and returns the typed runtime proxy. |

#### IgniterQueue Builder Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `create(n)` | `static create(name: string): Builder` | Creates queue builder with name. |
| `addJob(n, d)` | `(name: string, def: JobDefinition): Builder` | Registers a job. Validates handler presence and uniqueness. |
| `addCron(n, d)` | `(name: string, def: CronDefinition): Builder` | Registers cron. Validates cron expression and handler. |
| `build()` | `(): IgniterJobsQueue & { name }` | Returns queue config with name. |

#### IgniterWorkerBuilder Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `addQueue(q)` | `(queue: string): Builder` | Adds queue to worker. Must be registered on jobs. |
| `withConcurrency(n)` | `(concurrency: number): Builder` | Sets worker concurrency (default 1). |
| `withLimiter(l)` | `(limiter: {max, duration}): Builder` | Sets rate limiter. |
| `onActive(h)` | `(handler): Builder` | Active job hook. |
| `onSuccess(h)` | `(handler): Builder` | Success hook. |
| `onFailure(h)` | `(handler): Builder` | Failure hook. |
| `onIdle(h)` | `(handler): Builder` | Idle hook. |
| `start()` | `async start(): Promise<WorkerHandle>` | Creates and starts worker. |

#### Runtime Accessors

| Accessor | Methods |
|----------|---------|
| `jobs.<queue>.<job>` | `dispatch(params)`, `schedule(params)`, `get(id)`, `many(ids)`, `subscribe(handler)` |
| `jobs.<queue>.<job>.get(id)` | `retrieve()`, `retry()`, `remove()`, `promote()`, `move("failed", reason)`, `state()`, `progress()`, `logs()`, `stream()` |
| `jobs.<queue>.<job>.many(ids)` | `retry()`, `remove()` |
| `jobs.<queue>.get()` | `retrieve()`, `pause()`, `resume()`, `drain()`, `clean(options)`, `obliterate(options?)`, `retryAll()` |
| `jobs.<queue>.list(filter?)` | List jobs in queue with optional status/limit/offset filter |
| `jobs.<queue>.subscribe(h)` | Subscribe to queue-scoped events |
| `jobs.worker.create()` | Returns `IgniterWorkerBuilder` |
| `jobs.subscribe(h)` | Subscribe to all events |
| `jobs.search(target, filter)` | Search jobs, queues, or workers |
| `jobs.shutdown()` | Graceful shutdown |
| `jobs.scope(type, id, tags?)` | Create scoped instance |

### 14. Telemetry & Observability Registry

The `IgniterJobsTelemetryEvents` namespace defines 17 typed events across 3 groups:

**Job Events (`igniter.jobs.job.*`):**
| Event | Attributes |
|-------|-----------|
| `enqueued` | `ctx.job.id`, `ctx.job.name`, `ctx.job.queue`, `ctx.job.priority?`, `ctx.job.delay?` |
| `started` | `ctx.job.id`, `ctx.job.name`, `ctx.job.queue`, `ctx.job.attempt`, `ctx.job.maxAttempts` |
| `completed` | `ctx.job.id`, `ctx.job.name`, `ctx.job.queue`, `ctx.job.duration` |
| `failed` | `ctx.job.id`, `ctx.job.name`, `ctx.job.queue`, `ctx.job.error.message`, `ctx.job.error.code?`, `ctx.job.attempt`, `ctx.job.maxAttempts`, `ctx.job.isFinalAttempt` |
| `progress` | `ctx.job.id`, `ctx.job.name`, `ctx.job.queue`, `ctx.job.progress`, `ctx.job.progress.message?` |
| `retrying` | `ctx.job.id`, `ctx.job.name`, `ctx.job.queue`, `ctx.job.attempt`, `ctx.job.maxAttempts`, `ctx.job.nextRetryDelay` |
| `scheduled` | `ctx.job.id`, `ctx.job.name`, `ctx.job.queue`, `ctx.job.scheduledAt?`, `ctx.job.cron?` |

**Worker Events (`igniter.jobs.worker.*`):**
| Event | Attributes |
|-------|-----------|
| `started` | `ctx.worker.id`, `ctx.worker.queues`, `ctx.worker.concurrency` |
| `stopped` | `ctx.worker.id`, `ctx.worker.processed`, `ctx.worker.failed`, `ctx.worker.uptime` |
| `idle` | `ctx.worker.id`, `ctx.worker.queues` |
| `paused` | `ctx.worker.id`, `ctx.worker.queues` |
| `resumed` | `ctx.worker.id`, `ctx.worker.queues` |

**Queue Events (`igniter.jobs.queue.*`):**
| Event | Attributes |
|-------|-----------|
| `paused` | `ctx.queue.name` |
| `resumed` | `ctx.queue.name` |
| `drained` | `ctx.queue.name`, `ctx.queue.drained.count` |
| `cleaned` | `ctx.queue.name`, `ctx.queue.cleaned.count`, `ctx.queue.cleaned.status` |
| `obliterated` | `ctx.queue.name`, `ctx.queue.obliterated.force` |

Usage:
```typescript
import { IgniterTelemetry } from "@igniter-js/telemetry";
import { IgniterJobsTelemetryEvents } from "@igniter-js/jobs/telemetry";

const telemetry = IgniterTelemetry.create()
  .withService("my-api")
  .withEnvironment("production")
  .addEvents(IgniterJobsTelemetryEvents)
  .build();

const jobs = IgniterJobs.create()
  .withAdapter(adapter)
  .withService("my-api")
  .withEnvironment("production")
  .withContext(async () => ({ db }))
  .withTelemetry(telemetry)
  .addQueue(emailQueue)
  .build();
```

### 15. Troubleshooting & Error Code Library

All errors thrown by `@igniter-js/jobs` are instances of `IgniterJobsError` with a canonical `code`:

| Error Code | Description | Common Cause |
|-----------|-------------|--------------|
| `JOBS_ADAPTER_REQUIRED` | No adapter set before `build()`. | Missing `.withAdapter()` call. |
| `JOBS_SERVICE_REQUIRED` | No service name set. | Missing `.withService()` call. |
| `JOBS_CONTEXT_REQUIRED` | No context factory set. | Missing `.withContext()` call. |
| `JOBS_CONFIGURATION_INVALID` | Invalid config value. | Wrong type or missing required config. |
| `JOBS_QUEUE_NOT_FOUND` | Queue not registered. | Worker references unregistered queue name. |
| `JOBS_QUEUE_DUPLICATE` | Queue already registered. | Two queues with same name. |
| `JOBS_QUEUE_OPERATION_FAILED` | Queue operation failed. | Adapter-level queue error. |
| `JOBS_INVALID_DEFINITION` | Invalid job definition. | Missing or malformed job config. |
| `JOBS_HANDLER_REQUIRED` | Job missing handler. | Job definition has no `handler` function. |
| `JOBS_DUPLICATE_JOB` | Job name already in queue. | Two jobs/crons with same name in same queue. |
| `JOBS_NOT_FOUND` | Job not found by ID. | Stale or incorrect job ID. |
| `JOBS_NOT_REGISTERED` | Job not registered on adapter. | `dispatch()` called before `build()`. |
| `JOBS_EXECUTION_FAILED` | Job execution failed. | Handler threw an unhandled exception. |
| `JOBS_TIMEOUT` | Job timed out. | Handler exceeded time limit (adapter-dependent). |
| `JOBS_CONTEXT_FACTORY_FAILED` | Context factory threw. | Error in `withContext()` factory function. |
| `JOBS_VALIDATION_FAILED` | Input validation failed. | Dispatch input doesn't match schema. |
| `JOBS_INVALID_INPUT` | Invalid input format. | Input type mismatch. |
| `JOBS_INVALID_CRON` | Invalid cron definition. | Missing cron expression or duplicate name. |
| `JOBS_INVALID_SCHEDULE` | Invalid schedule params. | `at` date is in the past. |
| `JOBS_SCOPE_ALREADY_DEFINED` | Multiple scopes attempted. | Only one scope supported. |
| `JOBS_WORKER_FAILED` | Worker operation failed. | Worker-level adapter error. |
| `JOBS_ADAPTER_ERROR` | Generic adapter error. | Adapter internal error. |
| `JOBS_ADAPTER_CONNECTION_FAILED` | Adapter connection lost. | Redis connection down, etc. |
| `JOBS_SUBSCRIBE_FAILED` | Event subscription failed. | Adapter event system error. |

---

## IV. ADAPTERS REFERENCE

### 16. Adapter Architecture Overview

All adapters implement the `IgniterJobsAdapter` interface (defined in `src/types/adapter.ts`). The interface has 50+ methods covering:

- **Dispatch & Schedule:** `dispatch()`, `schedule()`
- **Job Management:** `getJob()`, `getJobState()`, `getJobLogs()`, `getJobProgress()`, `retryJob()`, `removeJob()`, `promoteJob()`, `moveJobToFailed()`, `retryManyJobs()`, `removeManyJobs()`
- **Queue Management:** `getQueueInfo()`, `getQueueJobCounts()`, `listQueues()`, `pauseQueue()`, `resumeQueue()`, `drainQueue()`, `cleanQueue()`, `obliterateQueue()`, `retryAllInQueue()`
- **Search:** `searchJobs()`, `searchQueues()`, `searchWorkers()`
- **Worker Management:** `createWorker()`, `getWorkers()`
- **Events:** `publishEvent()`, `subscribeEvent()`
- **Streams:** `writeJobStreamEvent()`, `readJobStream()`, `subscribeJobStream()`
- **Registration:** `registerJob()`, `registerCron()`
- **Lifecycle:** `shutdown()`

### 17. Adapter Comparison Matrix

| Feature | Memory | Bun SQLite | BullMQ |
|---------|--------|------------|--------|
| Persistence | ❌ | ✅ | ✅ |
| Multi-process | ❌ | ❌ (single-process) | ✅ |
| Production-ready | ❌ | ✅ (single instance) | ✅ |
| Cron support | ❌ (manual) | ✅ | ✅ |
| Delayed jobs | ✅ | ✅ | ✅ |
| Job progress | ✅ | ✅ | ✅ |
| Job logs | ✅ | ✅ | ✅ |
| Stream events | ✅ | ✅ | ✅ |
| Rate limiter | ❌ | ✅ | ✅ |
| Worker metrics | ✅ | ✅ | ✅ |
| Graceful shutdown | ✅ | ✅ | ✅ |

### 18. Memory Adapter (Testing & Development)

```typescript
import { IgniterJobsMemoryAdapter } from "@igniter-js/jobs/adapters/mock";

const adapter = IgniterJobsMemoryAdapter.create();
```

- **Persistence:** None. All jobs lost on process exit.
- **Cron:** Stores as delayed jobs; no automatic execution engine.
- **Streams:** In-memory storage. Events lost on adapter disposal.
- **Use:** Unit tests, integration tests, local development.
- **Limitations:** No multi-process, no persistence, cron requires manual triggers.

### 19. Bun SQLite Adapter (Desktop, CLI, Local Apps)

```typescript
import { IgniterJobsBunSQLiteAdapter } from "@igniter-js/jobs/adapters/bun";

const adapter = IgniterJobsBunSQLiteAdapter.create({
  path: "./data/jobs.db",
  durable: true,
  heartbeatInterval: 10_000,
  pollTimeout: 5_000,
  batchSize: 10,
  lockDuration: 30_000,
  maxStalledCount: 1,
});
```

- **Persistence:** SQLite-backed. Survives restarts.
- **Cron:** Built-in cron scheduling via `bunqueue`.
- **Streams:** SQLite-persisted event storage.
- **Use:** Desktop apps (Electron, Tauri), CLI tools, single-server apps.
- **Limitations:** Single-process only (SQLite file locking). Not suitable for horizontally scaled deployments.

### 20. BullMQ Adapter (Production Scale)

```typescript
import { IgniterJobsBullMQAdapter } from "@igniter-js/jobs/adapters/node";
import Redis from "ioredis";

const adapter = IgniterJobsBullMQAdapter.create({
  redis: new Redis({ host: "localhost", port: 6379 }),
});
```

- **Persistence:** Redis-backed. Production-grade durability.
- **Cron:** Full BullMQ repeatable jobs scheduling.
- **Streams:** Redis pub/sub for real-time events.
- **Use:** Production APIs, horizontally scaled workers, high-throughput systems.

### 21. Implementing Custom Adapters

To implement a custom adapter, implement the `IgniterJobsAdapter` interface:

```typescript
import type { IgniterJobsAdapter } from "@igniter-js/jobs";

class MyCustomAdapter implements IgniterJobsAdapter {
  readonly client = { type: "custom" as const };

  // Implement all 50+ methods...
  async dispatch(params: IgniterJobsAdapterDispatchParams): Promise<string> { /* ... */ }
  async schedule(params: IgniterJobsAdapterScheduleParams): Promise<string> { /* ... */ }
  // ... etc

  readonly queues: IgniterJobsQueueManager = {
    list: async () => this.listQueues(),
    get: async (name) => this.getQueueInfo(name),
    // ... etc
  };
}
```

---

## V. EXAMPLES & USE CASES

### 22. Example Directory Structure

```
src/
├── services/
│   └── jobs.ts          # Central jobs configuration
├── jobs/
│   ├── email/
│   │   ├── send-welcome.job.ts
│   │   └── send-receipt.job.ts
│   └── reports/
│       ├── daily-summary.cron.ts
│       └── weekly-report.cron.ts
└── workers/
    └── main.worker.ts   # Worker entry point
```

### 23. Running the Bun SQLite Example

```bash
bun run src/workers/main.worker.ts
```

The worker:
1. Creates `IgniterJobsBunSQLiteAdapter` with `path: "./data/jobs.db"`
2. Builds jobs with all queues
3. Starts a worker with `concurrency: 5`
4. Handles graceful shutdown on SIGTERM/SIGINT

---

## VI. MIGRATION GUIDE

### 24. Migrating from Memory to Bun SQLite

```typescript
// Before (Memory)
import { IgniterJobsMemoryAdapter } from "@igniter-js/jobs/adapters/mock";
const adapter = IgniterJobsMemoryAdapter.create();

// After (Bun SQLite)
import { IgniterJobsBunSQLiteAdapter } from "@igniter-js/jobs/adapters/bun";
const adapter = IgniterJobsBunSQLiteAdapter.create({
  path: "./data/jobs.db",
  durable: true,
});
```

No changes needed to job definitions or handler logic. The adapter swap is transparent.

### 25. Migrating from Bun SQLite to BullMQ

```typescript
// Before (Bun SQLite)
import { IgniterJobsBunSQLiteAdapter } from "@igniter-js/jobs/adapters/bun";

// After (BullMQ)
import { IgniterJobsBullMQAdapter } from "@igniter-js/jobs/adapters/node";
import Redis from "ioredis";

const adapter = IgniterJobsBullMQAdapter.create({
  redis: new Redis({ host: "redis.production", port: 6379 }),
});
```

**Considerations:**
- BullMQ supports multiple worker processes (horizontal scaling).
- Redis must be configured for persistence (AOF + RDB).
- Job IDs are now globally unique across workers.
- Cron jobs will execute on all workers unless using BullMQ's `repeat` deduplication.

---

## VII. MAINTENANCE CHANGELOG

### Version 0.1.15 (2026-06-02)
- Current version. All features documented.

### Version 0.1.2 (2025-12-23)
- Initial implementation with builder pattern, memory adapter, and basic worker support.

---

## VIII. FAQ & TROUBLESHOOTING

### 26. Frequently Asked Questions

**Q: Can I use multiple adapters in the same app?**
A: No. A single `IgniterJobs` instance uses one adapter. Create separate instances for different backends.

**Q: How do scopes work with telemetry?**
A: Scope metadata is attached to telemetry events automatically. The scope type and ID are available in event attributes.

**Q: Can I have jobs with the same name in different queues?**
A: Yes. Job names are scoped to their queue. `email.sendWelcome` and `sms.sendWelcome` are distinct.

**Q: What happens if the context factory throws?**
A: The wrapper in `core/manager.ts` catches the error, emits a `JOBS_CONTEXT_FACTORY_FAILED` error, and the job is marked as failed on the current attempt.

**Q: Does the package support Standard Schema V1?**
A: Yes, alongside Zod-like schemas. The `IgniterJobsSchema` type accepts both formats.

### 27. Common Issues & Solutions

| Issue | Likely Cause | Solution |
|-------|-------------|----------|
| `JOBS_CONTEXT_REQUIRED` on build | Missing `withContext()` | Call `.withContext(() => ({ ... }))` before `.build()`. |
| `JOBS_QUEUE_DUPLICATE` | Two queues with same name | Ensure unique queue names. |
| `JOBS_SCOPE_ALREADY_DEFINED` | Multiple `addScope()` calls | Only one scope is supported. Remove duplicate calls. |
| Jobs not executing | Worker not started | Call `await jobs.worker.create().addQueue(name).start()`. |
| Type inference lost | `withContext()` called after `addQueue()` | Always call `withContext()` first, before any queue registration. |
| `JOBS_VALIDATION_FAILED` | Input doesn't match schema | Check the dispatch input against the Zod/schema definition. |
| Telemetry events not appearing | Telemetry not attached | Call `.withTelemetry(telemetryInstance)` before `.build()`. |

---

## IX. PERFORMANCE CONSIDERATIONS

### 28. Bun SQLite Adapter Performance Tips

- Set `durable: false` for maximum throughput (writes are batched).
- Use `durable: true` only when data loss is unacceptable.
- Tune `batchSize` based on job size: larger batches = more throughput, more memory.
- Set `pollTimeout > 0` for long-polling instead of busy-waiting.
- `lockDuration` should be 2-3x the expected max job duration.

### 29. Memory Considerations

- The memory adapter stores all jobs in RAM. Not suitable for long-running processes with high job volumes.
- The Bun SQLite adapter uses SQLite in WAL mode for concurrent reads.
- Large job payloads (>10KB) should be stored externally and referenced by ID.

---

## X. SECURITY BEST PRACTICES

### 30. Input Validation

- **Always define input schemas** for jobs that accept external data.
- Use Zod `strict()` or `passthrough()` depending on your data policy.
- Validate all inputs from webhooks, API requests, and external systems.

### 31. Sensitive Data Handling

- **Never** pass API keys, passwords, or secrets in job payloads.
- Store sensitive data in a secrets manager and fetch it in the context factory.
- Job metadata is stored in plain text in the queue backend. Don't put PII in metadata.
- Use scopes to enforce tenant-level data access controls in multi-tenant apps.
