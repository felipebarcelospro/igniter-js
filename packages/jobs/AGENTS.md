# AGENTS.md - @igniter-js/jobs

> **Last Updated:** 2026-01-29
> **Version:** 1.0.0-alpha.0
> **Goal:** This document serves as the complete operational manual for Code Agents maintaining and consuming the @igniter-js/jobs package.

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
2. **Resource-Aware Context:** The `withContext()` factory ensures that every job execution starts with a fresh, validated set of resources, exactly like a standard API request.
3. **Multi-Platform Support (Adapters):** Whether using **BullMQ** for massive production scale or an **In-Memory** adapter for unit tests, the business logic remains identical.
4. **Native Observability:** Telemetry and internal event publishing are "baked in," providing immediate visibility into enqueuing, execution times, failures, and retries without writing a single line of logging code.
5. **Typed Job Streams:** Jobs can emit typed per-job stream events for live consumers and optional persisted replay.

---

## I. MAINTAINER GUIDE (Internal Architecture)

### 2. FileSystem Topology (Maintenance)

Maintainers must respect the following directory structure and responsibilities:

- **`src/builders/`**: The configuration factory.
  - `main.builder.ts`: `IgniterJobsBuilder`. Manages immutable state accumulation and generic type narrowing for context and queues.
  - `queue.builder.ts`: `IgniterQueueBuilder`. Fluent API for defining jobs and crons within a queue.
  - `worker.builder.ts`: `IgniterWorkerBuilder`. Configures worker concurrency and lifecycle handlers.
- **`src/core/`**: The runtime heart.
  - `manager.ts`: `IgniterJobsManager`. Implements the proxy-based API and the handler-wrapping logic.
  - `queue.ts`: `IgniterQueue` facade for the queue builder.
- **`src/adapters/`**: The infrastructure boundary.
  - `memory.adapter.ts`: Production-grade in-memory implementation for tests (non-persistent).
  - `bun-sqlite.adapter.ts`: Bun-native SQLite adapter for local, desktop, CLI, and embedded workloads.
  - `bullmq.adapter.ts`: Reference to external `@igniter-js/adapter-bullmq` for production Redis-based queues.
- **`src/errors/`**: Resiliency definitions.
  - `jobs.error.ts`: `IgniterJobsError`. Extends `IgniterError` with metadata-rich payloads and authoritative error codes.
- **`src/telemetry/`**: Observability registry.
  - `index.ts`: defines Zod-validated telemetry events for the package.
- **`src/types/`**: Pure contract definitions.
  - `adapter.ts`: `IgniterJobsAdapter` interface.
  - `runtime.ts`: Accessor interfaces for the proxy API.
  - `job.ts`: authoritative types for job definitions, contexts, and hooks.
  - `stream.ts`: typed per-job stream definitions, emit/read/subscribe contracts, and inference helpers.
- **`src/utils/`**: Static helper library.
  - `events.utils.ts`: Pub/sub event helpers and channel composition.
  - `id-generator.ts`: Deterministic ID utilities for adapters.
  - `prefix.ts`: Consistency logic for queue names and event channels.
  - `scope.ts`: Scope merging and extraction utilities.
  - `telemetry.ts`: Telemetry helper utilities.
  - `validation.ts`: Runtime schema validation utilities.

### 3. Architecture Deep-Dive

#### 3.1 The Handler-Wrapper Pattern

The core reliability of the package comes from the fact that user handlers are never called directly by the adapter. Instead, `core/manager.ts` wraps every handler in a sophisticated pipeline:

1. **Telemetry Injection:** A "Started" event is emitted before the handler runs.
2. **Context Resolution:** The `contextFactory` provided in the builder is invoked to create the execution environment.
3. **Metadata Unpacking:** The scope (tenant ID) is extracted from the job metadata and injected into the context.
4. **Schema Enforcement:** If an `input` schema is defined, the payload is validated _inside the worker_ before being passed to the handler.
5. **Lifecycle Management:** The wrapper catches errors, determines if it was the final attempt, and emits the corresponding "Success" or "Failure" telemetry.

#### 3.2 Proxy-Based Accessors

The `IgniterJobsRuntime` uses a dynamic property accessor pattern. When you call `jobs.email.sendWelcome`, you aren't accessing a hardcoded property. Instead, the runtime maps the `email` queue and `sendWelcome` job from its internal configuration. This allows for a fluent, "discoverable" API that is 100% type-safe without needing code generation.

### 4. Operational Flow Mapping (Pipelines)

#### 4.1 Method: `IgniterJobsBuilder.build()`

1. **Argument Validation:** Adapter, Service, Environment, and Context Factory must be present.
2. **Internal Logic:** Builds `IgniterJobsConfig` from builder state.
3. **Runtime Creation:** Instantiates `IgniterJobsManager` and calls `.toRuntime()`.
4. **Adapter Registration:** `IgniterJobsManager.ensureRegistered()` registers jobs and crons on the adapter.
5. **Result Formatting:** Returns a proxy runtime with queue/job accessors.

#### 4.2 Method: `job.dispatch(params)`

1. **Argument Validation:** Validates `input` against job schema.
2. **Telemetry (Enqueued):** Emits `igniter.jobs.job.enqueued` when telemetry is configured.
3. **Internal Logic:** Calls `IgniterJobsScopeUtils.mergeMetadataWithScope`.
4. **Adapter Call:** Calls `adapter.dispatch()`.
5. **Telemetry (Success):** Emits success event with `jobId`.

#### 4.3 Method: `worker.start()`

1. **Internal Logic:** Consolidates queues, handlers, and concurrency.
2. **Adapter Call:** Calls `adapter.createWorker()`.
3. **Result Formatting:** Returns a worker handle for control.

#### 4.4 Method: `queue.pause()`

1. **Internal Logic:** Resolves queue name.
2. **Adapter Call:** Calls `adapter.pauseQueue()`.

#### 4.5 Method: `job.get(id).retrieve()`

1. **Internal Logic:** Resolves queue and job name.
2. **Adapter Call:** Calls `adapter.getJob()`.
3. **Result Formatting:** Maps adapter result to `JobSearchResult`.

#### 4.6 Method: `job.get(id).retry()`

1. **Adapter Call:** Calls `adapter.retryJob()`.
2. **Result:** Adapter handles retry; telemetry emission depends on adapter implementation.

### 5. Dependency & Type Graph

The package is designed for maximum portability with minimal dependency creep.

- **`@igniter-js/common`**: For base `IgniterError`, `IgniterLogger`, and the `StandardSchemaV1` interface.
- **`@igniter-js/telemetry`**: Optional peer dependency for operational monitoring.

Type Flow:
`IgniterJobsBuilder` -> `IgniterJobsConfig` -> `IgniterJobsRuntime` -> `QueueAccessor` -> `JobAccessor`

### 6. Maintenance Checklist

1. **Parity Check:** If you add a new feature to the `IgniterJobsAdapter` interface, ensure it is implemented in `memory.adapter.ts`.
2. **Telemetry Audit:** Job lifecycle emits telemetry in `core/manager.ts`. Queue/worker telemetry depends on adapter behavior.
3. **Error Propagation:** Ensure that errors thrown in user hooks (`onSuccess`, `onFailure`) do not crash the worker loop.
4. **Inference Test:** Run `npm run typecheck` and verify that the `main.builder.spec.ts` can still autocomplete queue names.

### 7. Maintainer Troubleshooting

#### Issue: Context factory is called too many times

- **Check:** Is the adapter caching the context factory result per job execution?
- **Fix:** Move factory invocation to the wrapper logic in `core/manager.ts`.

#### Issue: Telemetry attributes are missing

- **Check:** Are the attributes prefixed with `ctx.job.` or `ctx.worker.`?
- **Fix:** Follow the schema in `telemetry/index.ts`.

---

## II. CONSUMER GUIDE (Developer Manual)

### 8. Distribution Anatomy (Consumption)

The package provides organized subpath exports for optimized bundling:

- **`@igniter-js/jobs`**: The main entry point. Use for `IgniterJobs` and `IgniterQueue`.
- **`@igniter-js/jobs/adapters/node`**: Node.js adapters (`BullMQ` wrapper).
- **`@igniter-js/jobs/adapters/bun`**: Bun-native SQLite adapter.
- **`@igniter-js/jobs/adapters/mock`**: In-memory adapter for tests and local mocks.
- **`@igniter-js/jobs/telemetry`**: Telemetry registry for registration.

### 9. Quick Start & Common Patterns

#### Pattern: The Singleton Instance

Setup your jobs in a central `src/services/jobs.ts` file:

```typescript
import { IgniterJobs } from "@igniter-js/jobs";
import { IgniterJobsBullMQAdapter } from "@igniter-js/jobs/adapters/node";

export const jobs = IgniterJobs.create()
  .withAdapter(IgniterJobsBullMQAdapter.create({ redis }))
  .withService("api")
  .withEnvironment("production")
  .withContext(async () => ({ db }))
  .addQueue(myQueue)
  .build();
```

#### Pattern: Scheduled Retries

Prevent permanent failures in external API calls:

```typescript
.addJob("sync", {
  attempts: 5,
  delay: 5000,
  handler: async () => { /* ... */ }
})
```

### 10. Real-World Use Case Library

#### Case 1: E-commerce Order Expiry

- **Scenario:** Cancel unpaid orders after 1 hour.
- **Implementation:** `jobs.orders.cancel.schedule({ input: { id }, delay: 3600000 })`.

#### Case 2: Fintech Nightly Reconciliation

- **Scenario:** Verify 1M transactions against bank API.
- **Implementation:** Cron job at 3 AM. Dispatches batch jobs with 100 transactions each.

#### Case 3: Social Media Media Transcoding

- **Scenario:** Generate 5 video qualities after upload.
- **Implementation:** High-priority queue for 360p, low-priority for 4k.

#### Case 4: Healthcare Appointment Reminders

- **Scenario:** Send SMS 24h before appointment.
- **Implementation:** `.schedule({ at: reminderDate })`.

#### Case 5: SaaS Multi-Tenant CSV Import

- **Scenario:** Process 100k row CSV.
- **Implementation:** `job.updateProgress?.(percent)` every 100 rows for real-time progress bar.

### 11. Domain-Specific Guidance

- **Financial Systems:** Always use `attempts` and `backoff`. Implement `onFailure` to alert engineering.
- **High-Volume Caching:** Use `delay` to batch invalidation events.
- **AI Processing:** Set concurrency to match your GPU/API limits.

### 12. Best Practices & Anti-Patterns

| Practice             | Why?                 | Example                                 |
| :------------------- | :------------------- | :-------------------------------------- |
| ✅ Small Payloads    | Reduces overhead.    | `input: { id: '123' }`                  |
| ✅ Context Injection | Keeps handlers pure. | `withContext(() => ({ db }))`           |
| ✅ Idempotency       | Jobs WILL retry.     | Check status before taking action.      |
| ❌ Sync I/O          | Kills throughput.    | `readFileSync(...)`                     |
| ❌ Global DB         | Untestable.          | `import { db } from './db'` in handler. |

---

## III. TECHNICAL REFERENCE & RESILIENCE

### 13. Exhaustive API Reference

| Class/Method           | Parameters       | Returns           | Description            |
| :--------------------- | :--------------- | :---------------- | :--------------------- |
| `IgniterJobs.create()` | -                | `Builder`         | Starts the fluent API. |
| `dispatch()`           | `params`         | `Promise<string>` | Enqueues a job.        |
| `schedule()`           | `params`         | `Promise<string>` | Schedules a job.       |
| `search()`             | `target, filter` | `Promise<T[]>`    | Management API.        |
| `worker.create()`      | -                | `WorkerBuilder`   | Configures a worker.   |

### 14. Telemetry & Observability Registry

| Event Name       | Group  | Meaning           |
| :--------------- | :----- | :---------------- |
| `job.enqueued`   | job    | Task accepted.    |
| `job.started`    | job    | Task started.     |
| `job.completed`  | job    | Task finished.    |
| `job.failed`     | job    | Task threw error. |
| `worker.started` | worker | Worker is online. |

### 15. Troubleshooting & Error Code Library

#### JOBS_ADAPTER_REQUIRED

- **Context:** `build()`.
- **Cause:** No adapter provided.
- **Solution:** Call `.withAdapter()`.

#### JOBS_SERVICE_REQUIRED

- **Context:** `build()`.
- **Cause:** No service name.
- **Solution:** Call `.withService()`.

#### JOBS_CONTEXT_REQUIRED

- **Context:** `build()`.
- **Cause:** No context factory.
- **Solution:** Call `.withContext()`.

#### JOBS_CONFIGURATION_INVALID

- **Context:** Various.
- **Cause:** Missing environment or invalid scope.
- **Solution:** Follow builder hints.

#### JOBS_QUEUE_NOT_FOUND

- **Context:** Worker creation.
- **Cause:** Wrong queue name.
- **Solution:** Check `addQueue()` vs `worker.addQueue()`.

#### JOBS_QUEUE_DUPLICATE

- **Context:** Initialization.
- **Cause:** Same name twice.
- **Solution:** Use unique names.

#### JOBS_INVALID_DEFINITION

- **Context:** Job registration.
- **Cause:** Malformed job object.
- **Solution:** Ensure `handler` exists.

#### JOBS_HANDLER_REQUIRED

- **Context:** Job registration.
- **Cause:** Handler is null.
- **Solution:** Provide async function.

#### JOBS_DUPLICATE_JOB

- **Context:** Queue building.
- **Cause:** Two jobs with same name.
- **Solution:** Rename one.

#### JOBS_NOT_FOUND

- **Context:** `get(id)`.
- **Cause:** Invalid ID.
- **Solution:** Verify ID or check retention.

#### JOBS_NOT_REGISTERED

- **Context:** Worker execution.
- **Cause:** Worker doesn't know job.
- **Solution:** Check runtime config parity.

#### JOBS_EXECUTION_FAILED

- **Context:** Worker.
- **Cause:** Handler threw error.
- **Solution:** Check business logic.

#### JOBS_TIMEOUT

- **Context:** Worker.
- **Cause:** Job took too long.
- **Solution:** Increase `timeout` in job opts.

#### JOBS_CONTEXT_FACTORY_FAILED

- **Context:** Worker.
- **Cause:** Factory threw error.
- **Solution:** Check DB/resource health.

#### JOBS_VALIDATION_FAILED

- **Context:** `dispatch`.
- **Cause:** Schema mismatch.
- **Solution:** Correct the input.

#### JOBS_INVALID_INPUT

- **Context:** Runtime.
- **Cause:** Malformed data.
- **Solution:** Validate early.

#### JOBS_INVALID_CRON

- **Context:** Registration.
- **Cause:** Bad syntax.
- **Solution:** Check cron expression.

#### JOBS_INVALID_SCHEDULE

- **Context:** `schedule`.
- **Cause:** Past date.
- **Solution:** Use future date.

#### JOBS_SCOPE_ALREADY_DEFINED

- **Context:** Builder.
- **Cause:** Two scopes added.
- **Solution:** Only one allowed.

#### JOBS_WORKER_FAILED

- **Context:** Worker.
- **Cause:** Connection failure.
- **Solution:** Check Redis health.

#### JOBS_ADAPTER_ERROR

- **Context:** Generic.
- **Cause:** Backend failure.
- **Solution:** Check Redis/Adapter logs.

#### JOBS_ADAPTER_CONNECTION_FAILED

- **Context:** Generic.
- **Cause:** Redis down.
- **Solution:** Restore connectivity.

#### JOBS_SUBSCRIBE_FAILED

- **Context:** `subscribe`.
- **Cause:** Pub/Sub failure.
- **Solution:** Check Redis ACLs.

---

## IV. ADAPTERS REFERENCE

The `@igniter-js/jobs` package supports multiple adapters for different use cases and environments. This section provides comprehensive documentation for each adapter.

### 16. Adapter Architecture Overview

All adapters implement the `IgniterJobsAdapter` interface defined in `src/types/adapter.ts`. This interface ensures consistent behavior across different storage backends.

```
┌─────────────────────────────────────────────────────────────────┐
│                    IgniterJobsAdapter Interface                  │
├─────────────────────────────────────────────────────────────────┤
│  Job Management                                                  │
│  ├── registerJob(queue, name, definition)                       │
│  ├── registerCron(queue, name, definition)                      │
│  ├── dispatch(params) → jobId                                   │
│  ├── schedule(params) → jobId                                   │
│  ├── getJob(id) → job | null                                    │
│  ├── getJobState(id) → status | null                            │
│  ├── getJobLogs(id) → logs[]                                    │
│  ├── getJobProgress(id) → number                                │
│  ├── removeJob(id)                                              │
│  ├── retryJob(id)                                               │
│  ├── promoteJob(id)                                             │
│  └── moveJobToFailed(id, error)                                 │
├─────────────────────────────────────────────────────────────────┤
│  Queue Management                                                │
│  ├── listQueues() → queue[]                                     │
│  ├── getQueueInfo(name) → info | null                           │
│  ├── getQueueJobCounts(name) → counts                           │
│  ├── pauseQueue(name)                                           │
│  ├── resumeQueue(name)                                          │
│  ├── drainQueue(name) → removed                                 │
│  ├── cleanQueue(name, options) → cleaned                        │
│  ├── obliterateQueue(name, options)                             │
│  └── retryAllInQueue(name) → retried                            │
├─────────────────────────────────────────────────────────────────┤
│  Worker Management                                               │
│  ├── createWorker(config) → WorkerHandle                        │
│  ├── getWorkers() → Map<id, worker>                             │
│  └── searchWorkers(filter) → workers[]                          │
├─────────────────────────────────────────────────────────────────┤
│  Search & Discovery                                              │
│  ├── searchJobs(filter) → jobs[]                                │
│  └── searchQueues(filter) → queues[]                            │
├─────────────────────────────────────────────────────────────────┤
│  Pub/Sub                                                         │
│  ├── publishEvent(channel, data)                                │
│  └── subscribeEvent(channel, handler) → unsubscribe             │
├─────────────────────────────────────────────────────────────────┤
│  Lifecycle                                                       │
│  └── shutdown()                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 17. Adapter Comparison Matrix

| Feature                 | Memory            | Bun SQLite               | BullMQ            |
| ----------------------- | ----------------- | ------------------------ | ----------------- |
| **Persistence**         | ❌ In-memory only | ✅ File-based            | ✅ Redis          |
| **Multi-process**       | ❌ Single process | ⚠️ Single process/local  | ✅ Distributed    |
| **Installation**        | Built-in          | Bundled with package     | `bullmq` + Redis  |
| **Use Case**            | Tests, demos      | Desktop, CLI, local apps | Production, scale |
| **Job Limits**          | Memory-bound      | Disk-bound               | Redis-bound       |
| **Worker Mechanism**    | Immediate         | Embedded worker runtime  | Event-driven      |
| **Cron Jobs**           | ⚠️ Basic          | ✅ Supported             | ✅ Supported      |
| **Distributed Locking** | ❌                | ❌                       | ✅                |
| **Rate Limiting**       | ⚠️ Basic          | ✅ Supported             | ✅ Advanced       |

---

### 18. Memory Adapter (Testing & Development)

The `IgniterJobsMemoryAdapter` provides a full-featured in-memory implementation perfect for unit tests and quick development.

#### 18.1 When to Use

- **Unit Tests:** Fast, isolated, no external dependencies.
- **Integration Tests:** When you need predictable job behavior.
- **Development:** Quick experimentation without Redis.
- **CI/CD Pipelines:** Zero-config test environments.

#### 18.2 Installation

No additional dependencies required. The adapter is built into `@igniter-js/jobs`.

#### 18.3 Basic Usage

```typescript
import { IgniterJobs } from "@igniter-js/jobs";
import { IgniterJobsMemoryAdapter } from "@igniter-js/jobs/adapters/mock";

const adapter = IgniterJobsMemoryAdapter.create();

const jobs = IgniterJobs.create()
  .withAdapter(adapter)
  .withService("test")
  .withContext(async () => ({ db: mockDb }))
  .addQueue(emailQueue)
  .build();
```

#### 18.4 Configuration Options

```typescript
interface IgniterJobsMemoryAdapterOptions {
  /** Maximum jobs to retain in history (default: 1000) */
  maxJobHistory?: number;
}
```

#### 18.5 Testing Patterns

```typescript
// Access internal state for assertions
const adapter = IgniterJobsMemoryAdapter.create();

// Dispatch a job
const jobId = await adapter.dispatch({
  queue: "email",
  jobName: "send",
  input: { to: "test@example.com" },
});

// Verify job was created
const job = await adapter.getJob(jobId);
expect(job?.status).toBe("waiting");

// Simulate worker processing
const worker = await adapter.createWorker({
  queues: ["email"],
  concurrency: 1,
});

// Wait for processing
await new Promise((r) => setTimeout(r, 100));

// Verify completion
const completed = await adapter.getJob(jobId);
expect(completed?.status).toBe("completed");

// Cleanup
await worker.close();
```

#### 18.6 Limitations

- **Non-persistent:** All data lost on process restart.
- **Single-process:** Cannot share state across workers.
- **Memory-bound:** Large job volumes may cause OOM.

---

### 19. Bun SQLite Adapter (Desktop, CLI, Local Apps)

The `IgniterJobsBunSQLiteAdapter` is the local persistent adapter for Bun runtimes. It is the recommended choice for desktop applications, embedded tools, local orchestrators, and Bun services that want SQLite-backed jobs without Redis.

#### 19.1 When to Use

- **Desktop Applications:** Tauri or Electron apps with a Bun sidecar/runtime.
- **CLI Tools:** Long-running commands with progress tracking and durable jobs.
- **Local Services:** Single-node Bun services that need persistence and recurring jobs.
- **Embedded Workloads:** Sidecar workers, local automation, and job-heavy scripts.

#### 19.2 Installation

No extra adapter package is required. Install `@igniter-js/jobs`, run the app in Bun, and import the adapter from `@igniter-js/jobs/adapters/bun`.

#### 19.3 Basic Usage

```typescript
import { IgniterJobs } from "@igniter-js/jobs";
import { IgniterJobsBunSQLiteAdapter } from "@igniter-js/jobs/adapters/bun";

const adapter = IgniterJobsBunSQLiteAdapter.create({
  path: "./jobs.sqlite",
  durable: true,
});

const jobs = IgniterJobs.create()
  .withAdapter(adapter)
  .withService("desktop-app")
  .withEnvironment("production")
  .withContext(async () => ({ settings: loadSettings() }))
  .addQueue(syncQueue)
  .build();
```

#### 19.4 Configuration Options

```typescript
interface IgniterJobsBunSQLiteAdapterOptions {
  path: string;
  durable?: boolean;
  heartbeatInterval?: number;
  pollTimeout?: number;
  batchSize?: number;
  lockDuration?: number;
  maxStalledCount?: number;
}
```

#### 19.5 Runtime Characteristics

- Uses an embedded SQLite-backed runtime under Bun.
- Persists jobs to a local file path.
- Supports immediate dispatch, `at`, `delay`, `cron`, and `every` scheduling.
- Provides progress updates, logs, worker lifecycle events, and queue inspection APIs.
- Designed for local and embedded topologies, not distributed Redis-style clusters.

#### 19.6 Complete Example

```typescript
import { IgniterJobsBunSQLiteAdapter } from "@igniter-js/jobs/adapters/bun";

async function main() {
  const adapter = IgniterJobsBunSQLiteAdapter.create({
    path: "./my-app-jobs.sqlite",
    durable: true,
    batchSize: 25,
  });

  adapter.registerJob("sync", "upload", {
    handler: async ({ input, job }) => {
      const { fileId } = input as { fileId: string };
      await job.updateProgress?.(25, "Uploading metadata");
      await uploadFile(fileId);
      await job.updateProgress?.(100, "Upload completed");
      return { uploaded: true };
    },
  });

  const worker = await adapter.createWorker({
    queues: ["sync"],
    concurrency: 2,
  });

  const jobId = await adapter.dispatch({
    queue: "sync",
    jobName: "upload",
    input: { fileId: "file_123" },
    priority: 10,
  });

  console.log(jobId);

  process.on("SIGINT", async () => {
    await worker.close();
    await adapter.shutdown();
  });
}
```

#### 19.7 Persistence & Recovery

- Jobs remain on disk across process restarts.
- Delayed and recurring work is persisted in the local SQLite backend.
- Worker shutdown should always call `adapter.shutdown()` during graceful exits.

#### 19.8 Limitations

- **Local Topology:** The adapter is intended for Bun-local deployments and desktop-class runtimes.
- **No Redis-style Distribution:** Use BullMQ when you need multi-node horizontal workers.
- **Runtime Requirement:** This adapter runs only under Bun.

---

### 20. BullMQ Adapter (Production Scale)

The `IgniterJobsBullMQAdapter` (external package) provides Redis-based job queuing for production environments.

#### 20.1 When to Use

- **Production Deployments:** High availability and reliability.
- **Distributed Systems:** Multiple workers across nodes.
- **High Throughput:** Thousands of jobs per second.
- **Advanced Features:** Rate limiting, priorities, delayed jobs, cron.

#### 20.2 Installation

```bash
npm install @igniter-js/adapter-bullmq bullmq ioredis
```

#### 20.3 Basic Usage

```typescript
import { IgniterJobs } from "@igniter-js/jobs";
import { IgniterJobsBullMQAdapter } from "@igniter-js/adapter-bullmq";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

const adapter = IgniterJobsBullMQAdapter.create({ redis });

const jobs = IgniterJobs.create()
  .withAdapter(adapter)
  .withService("api-server")
  .withContext(async () => ({ db, cache }))
  .addQueue(emailQueue)
  .addQueue(analyticsQueue)
  .build();
```

#### 20.4 Reference

See `@igniter-js/adapter-bullmq` package documentation for full configuration options.

---

### 21. Implementing Custom Adapters

To create a custom adapter, implement the `IgniterJobsAdapter` interface:

```typescript
import type {
  IgniterJobsAdapter,
  IgniterJobsDispatchParams,
  IgniterJobsWorkerConfig,
  IgniterJobsWorkerHandle,
  IgniterJobSearchResult,
  IgniterJobsQueueInfo,
} from "@igniter-js/jobs";

export class CustomAdapter implements IgniterJobsAdapter {
  // ... implement all required methods
}
```

#### 21.1 Required Method Signatures

See `src/types/adapter.ts` for the complete interface definition.

#### 21.2 Testing Custom Adapters

Use the existing test suites as a reference:

- `src/adapters/memory.adapter.spec.ts`
- `src/core/telemetry.spec.ts`

---

## V. EXAMPLES & USE CASES

### 22. Example Directory Structure

The `examples/` directory contains runnable examples:

```
packages/jobs/examples/
├── README.md                 # Example documentation
└── bun-sqlite-example.ts     # Complete Bun SQLite adapter demo
```

### 23. Running the Bun SQLite Example

```bash
cd packages/jobs
bun run examples/bun-sqlite-example.ts
```

This example demonstrates:

- Creating a Bun SQLite adapter with file persistence
- Registering multiple job types
- Priority-based job processing
- Delayed job scheduling
- Worker metrics and lifecycle handlers
- Queue status monitoring
- Graceful shutdown

---

## VI. MIGRATION GUIDE

### 24. Migrating from Memory to Bun SQLite

For development to production-like local testing:

```typescript
// Before: Memory adapter
import { IgniterJobsMemoryAdapter } from "@igniter-js/jobs/adapters/mock";
const adapter = IgniterJobsMemoryAdapter.create();

// After: Bun SQLite adapter
import { IgniterJobsBunSQLiteAdapter } from "@igniter-js/jobs/adapters/bun";
const adapter = IgniterJobsBunSQLiteAdapter.create({
  path: "./dev-jobs.sqlite",
});

// Rest of the code remains identical!
```

### 25. Migrating from Bun SQLite to BullMQ

For local development to production:

```typescript
// Before: Bun SQLite adapter
import { IgniterJobsBunSQLiteAdapter } from "@igniter-js/jobs/adapters/bun";
const adapter = IgniterJobsBunSQLiteAdapter.create({
  path: "./jobs.sqlite",
});

// After: BullMQ adapter
import { IgniterJobsBullMQAdapter } from "@igniter-js/adapter-bullmq";
const adapter = IgniterJobsBullMQAdapter.create({
  redis: new Redis(process.env.REDIS_URL),
});

// Rest of the code remains identical!
```

---

## VII. MAINTENANCE CHANGELOG

### Version 0.2.0 (2026-01-17)

- **Added:** `IgniterJobsBunSQLiteAdapter` for persistent local Bun job queues
- **Added:** `examples/` directory with runnable examples
- **Updated:** Adapter exports to include Bun SQLite adapter
- **Updated:** AGENTS.md with comprehensive adapter documentation

### Version 0.1.2 (2025-12-23)

- Initial stable release
- Memory adapter for testing
- BullMQ adapter reference

---

## VIII. FAQ & TROUBLESHOOTING

### 26. Frequently Asked Questions

#### Q: Which adapter should I choose?

| Environment                  | Recommended Adapter  |
| ---------------------------- | -------------------- |
| Unit/Integration Tests       | Memory Adapter       |
| Desktop App (Tauri/Electron) | Bun SQLite Adapter   |
| CLI Tool                     | Bun SQLite Adapter   |
| MCP Server                   | Bun SQLite Adapter   |
| Local Development            | Bun SQLite Adapter   |
| Production (Single Node)     | Bun SQLite or BullMQ |
| Production (Multi Node)      | BullMQ Adapter       |
| Serverless                   | BullMQ Adapter       |

#### Q: Can I switch adapters without changing business logic?

**Yes!** All adapters implement the same `IgniterJobsAdapter` interface. Your job definitions, handlers, and queue configurations remain identical.

#### Q: How do I handle job failures?

```typescript
adapter.registerJob("email", "send", {
  handler: async ({ input }) => {
    // Your logic here
  },
  attempts: 3, // Retry up to 3 times
  onFailure: async ({ error, isFinalAttempt }) => {
    if (isFinalAttempt) {
      // Send alert, log to monitoring, etc.
      await alertOps(`Job failed permanently: ${error.message}`);
    }
  },
});
```

#### Q: How do I track job progress?

```typescript
adapter.registerJob("import", "csv", {
  handler: async ({ input, job }) => {
    const rows = await parseCSV(input.file);

    for (let i = 0; i < rows.length; i++) {
      await processRow(rows[i]);

      // Update progress
      await job.updateProgress?.(Math.floor((i / rows.length) * 100));
    }

    return { processed: rows.length };
  },
  onProgress: async ({ progress, message }) => {
    console.log(`Progress: ${progress}%`);
  },
});
```

#### Q: Can Bun SQLite handle high throughput?

The Bun SQLite adapter handles local persistent workloads very well, especially for desktop, CLI, and embedded apps. For distributed workers or multi-node scale, use BullMQ.

### 27. Common Issues & Solutions

#### Issue: Bun SQLite adapter throws a runtime error in Node.js

**Cause:** The Bun SQLite adapter only runs inside Bun.

**Solution:** Use the BullMQ adapter in Node.js runtimes, or run the local adapter from Bun.

#### Issue: Jobs stuck in "active" status after restart

**Cause:** Process crashed while job was processing.

**Solution:**

```typescript
// On startup, reset stale active jobs
const staleJobs = await adapter.searchJobs({
  queue: "my-queue",
  status: ["active"],
});

for (const job of staleJobs) {
  await adapter.retryJob(job.id);
}
```

#### Issue: Worker not processing jobs

**Cause:** Worker queues don't match job queue names.

**Solution:**

```typescript
// Ensure queue names match
adapter.registerJob("email", "send", { ... }); // Queue: "email"

// Worker must listen to "email" queue
const worker = await adapter.createWorker({
  queues: ["email"], // Must include "email"
  concurrency: 1,
});
```

#### Issue: Bun SQLite database locked

**Cause:** Multiple processes trying to write simultaneously.

**Solution:**

- Ensure the local runtime is the primary writer to the database path.
- Avoid multiple unrelated Bun processes sharing the same local queue file.
- Consider BullMQ for multi-process or multi-node scenarios.

---

## IX. PERFORMANCE CONSIDERATIONS

### 28. Bun SQLite Adapter Performance Tips

1. **Use durable mode only for critical jobs:** durable writes trade throughput for stronger persistence.

2. **Tune worker batch settings:** `batchSize`, `pollTimeout`, and `heartbeatInterval` affect local throughput.

3. **Batch Operations:** When dispatching many jobs, consider batching:

```typescript
const jobIds = [];
for (const item of items) {
  jobIds.push(
    await adapter.dispatch({
      queue: "process",
      jobName: "item",
      input: item,
    }),
  );
}
```

4. **Clean Old Jobs:** Periodically clean completed/failed jobs:

```typescript
await adapter.cleanQueue("email", {
  status: ["completed", "failed"],
  olderThan: 7 * 24 * 60 * 60 * 1000, // 7 days
});
```

5. **Split high-volume workloads into dedicated queues:** local SQLite workloads benefit from clear queue boundaries.

### 29. Memory Considerations

- **Memory Adapter:** All jobs stored in RAM; limit maxJobHistory.
- **Bun SQLite Adapter:** Disk-based; memory usage scales with active workers and buffered operations.
- **BullMQ Adapter:** Redis memory; configure maxmemory policy.

---

## X. SECURITY BEST PRACTICES

### 30. Input Validation

Always validate job inputs using schemas:

```typescript
import { z } from "zod";

const emailQueue = IgniterQueue.create("email")
  .addJob("send", {
    input: z.object({
      to: z.string().email(),
      subject: z.string().max(200),
      body: z.string(),
    }),
    handler: async ({ input }) => {
      // input is validated and typed
    },
  })
  .build();
```

### 31. Sensitive Data Handling

- **Never log raw inputs** containing passwords, tokens, or PII.
- **Use job IDs** for reference rather than storing sensitive data in jobs.
- **Encrypt at rest** if storing sensitive metadata.

---
