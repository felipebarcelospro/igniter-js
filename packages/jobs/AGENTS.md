# AGENTS.md - @igniter-js/jobs

> **Last Updated:** 2025-12-23
> **Version:** 0.1.2
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

---

## I. MAINTAINER GUIDE (Internal Architecture)

### 2. FileSystem Topology (Maintenance)

Maintainers must respect the following directory structure and responsibilities:

- **`src/builders/`**: The configuration factory.
  - `main.builder.ts`: `IgniterJobsBuilder`. Manages immutable state accumulation and generic type narrowing for context and queues.
  - `queue.builder.ts`: `IgniterQueueBuilder`. Fluent API for defining jobs and crons within a queue.
  - `worker.builder.ts`: `IgniterWorkerBuilder`. Configures worker concurrency and lifecycle handlers.
- **`src/core/`**: The runtime heart.
  - `igniter-jobs.ts`: `IgniterJobs` runtime factory. Implements the proxy-based API and the handler-wrapping logic.
  - `igniter-queue.ts`: Public entry point facade.
- **`src/adapters/`**: The infrastructure boundary.
  - `memory.adapter.ts`: Production-grade in-memory implementation for tests.
- **`src/errors/`**: Resiliency definitions.
  - `igniter-jobs.error.ts`: `IgniterJobsError`. Extends `IgniterError` with metadata-rich payloads and 31 authoritative error codes.
- **`src/telemetry/`**: Observability registry.
  - `jobs.telemetry.ts`: defines Zod-validated telemetry events for the package.
- **`src/types/`**: Pure contract definitions.
  - `adapter.ts`: `IgniterJobsAdapter` interface.
  - `runtime.ts`: Accessor interfaces for the proxy API.
  - `job.ts`: authoritative types for job definitions, contexts, and hooks.
- **`src/utils/`**: Static helper library.
  - `validation.ts`: Runtime schema validation utilities.
  - `prefix.ts`: Consistency logic for Redis keys and event channels.

### 3. Architecture Deep-Dive

#### 3.1 The Handler-Wrapper Pattern

The core reliability of the package comes from the fact that user handlers are never called directly by the adapter. Instead, `core/igniter-jobs.ts` wraps every handler in a sophisticated pipeline:

1. **Telemetry Injection:** A "Started" event is emitted before the handler runs.
2. **Context Resolution:** The `contextFactory` provided in the builder is invoked to create the execution environment.
3. **Metadata Unpacking:** The scope (tenant ID) is extracted from the job metadata and injected into the context.
4. **Schema Enforcement:** If an `input` schema is defined, the payload is validated _inside the worker_ before being passed to the handler.
5. **Lifecycle Management:** The wrapper catches errors, determines if it was the final attempt, and emits the corresponding "Success" or "Failure" telemetry.

#### 3.2 Proxy-Based Accessors

The `IgniterJobsRuntime` uses a dynamic property accessor pattern. When you call `jobs.email.sendWelcome`, you aren't accessing a hardcoded property. Instead, the runtime maps the `email` queue and `sendWelcome` job from its internal configuration. This allows for a fluent, "discoverable" API that is 100% type-safe without needing code generation.

### 4. Operational Flow Mapping (Pipelines)

#### 4.1 Method: `IgniterJobsBuilder.build()`

1. **Argument Validation:** [Checked] Adapter, Service, Env, and Context Factory must be present.
2. **Telemetry (Started):** Emits `igniter.jobs.job.started` (if auto-start configured).
3. **Internal Logic:** Iterates through `config.queues`, then `queue.jobs`.
4. **Adapter Call:** Calls `adapter.registerJob` for each entry.
5. **Result Formatting:** Returns `IgniterJobs.fromConfig(config)`.

#### 4.2 Method: `job.dispatch(params)`

1. **Argument Validation:** Validates `input` against job schema.
2. **Telemetry (Started):** Emits `igniter.jobs.job.enqueued`.
3. **Internal Logic:** Calls `IgniterJobsScopeUtils.mergeMetadataWithScope`.
4. **Adapter Call:** Calls `adapter.dispatch()`.
5. **Telemetry (Success):** Emits success event with `jobId`.

#### 4.3 Method: `worker.start()`

1. **Telemetry (Started):** Emits `igniter.jobs.worker.started`.
2. **Internal Logic:** Consolidates handlers and concurrency.
3. **Adapter Call:** Calls `adapter.createWorker()`.
4. **Result Formatting:** Returns handle for control.

#### 4.4 Method: `queue.pause()`

1. **Internal Logic:** Resolves queue name.
2. **Adapter Call:** Calls `adapter.pauseQueue()`.
3. **Telemetry (Success):** Emits `igniter.jobs.queue.paused`.

#### 4.5 Method: `job.get(id).retrieve()`

1. **Internal Logic:** Resolves queue and job name.
2. **Adapter Call:** Calls `adapter.getJob()`.
3. **Result Formatting:** Maps adapter result to `JobSearchResult`.

#### 4.6 Method: `job.get(id).retry()`

1. **Adapter Call:** Calls `adapter.retryJob()`.
2. **Telemetry (Success):** Emits `igniter.jobs.job.enqueued` (as retrying).

### 5. Dependency & Type Graph

The package is designed for maximum portability with minimal dependency creep.

- **`@igniter-js/core`**: For base `IgniterError`, `IgniterLogger`, and the `StandardSchemaV1` interface.
- **`@igniter-js/telemetry`**: Optional peer dependency for operational monitoring.

Type Flow:
`IgniterJobsBuilder` -> `IgniterJobsConfig` -> `IgniterJobsRuntime` -> `QueueAccessor` -> `JobAccessor`

### 6. Maintenance Checklist

1. **Parity Check:** If you add a new feature to the `IgniterJobsAdapter` interface, ensure it is implemented in `memory.adapter.ts`.
2. **Telemetry Audit:** Every public method that changes state must emit at least one `igniter.jobs.*` event.
3. **Error Propagation:** Ensure that errors thrown in user hooks (`onSuccess`, `onFailure`) do not crash the worker loop.
4. **Inference Test:** Run `npm run typecheck` and verify that the `main.builder.spec.ts` can still autocomplete queue names.

### 7. Maintainer Troubleshooting

#### Issue: Context factory is called too many times

- **Check:** Is the adapter caching the context factory result per job execution?
- **Fix:** Move factory invocation to the wrapper logic in `igniter-jobs.ts`.

#### Issue: Telemetry attributes are missing

- **Check:** Are the attributes prefixed with `ctx.job.` or `ctx.worker.`?
- **Fix:** Follow the schema in `telemetry/jobs.telemetry.ts`.

---

## II. CONSUMER GUIDE (Developer Manual)

### 8. Distribution Anatomy (Consumption)

The package provides organized subpath exports for optimized bundling:

- **`@igniter-js/jobs`**: The main entry point. Use for `IgniterJobs` and `IgniterQueue`.
- **`@igniter-js/jobs/adapters`**: Built-in adapters (Memory).
- **`@igniter-js/jobs/telemetry`**: Telemetry registry for registration.

### 9. Quick Start & Common Patterns

#### Pattern: The Singleton Instance

Setup your jobs in a central `src/services/jobs.ts` file:

```typescript
import { IgniterJobs } from "@igniter-js/jobs";
import { IgniterJobsBullMQAdapter } from "@igniter-js/adapter-bullmq";

export const jobs = IgniterJobs.create()
  .withAdapter(IgniterJobsBullMQAdapter.create({ redis }))
  .withService("api")
  .withContext(async () => ({ db }))
  .addQueue(myQueue)
  .build();
```

#### Pattern: Scheduled Retries

Prevent permanent failures in external API calls:

```typescript
.addJob("sync", {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5000 },
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
- **Implementation:** `job.progress(percent)` every 100 rows for real-time progress bar.

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
