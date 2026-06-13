# @igniter-js/jobs

<div align="center">

[![npm version](https://img.shields.io/npm/v/@igniter-js/jobs)](https://www.npmjs.com/package/@igniter-js/jobs)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green)](https://nodejs.org)

**Type-safe jobs, queues, and workers for Igniter.js**  
Define queues and jobs with full TypeScript inference, validate inputs at runtime, and run workers with built-in observability.

[Quick Start](#-quick-start) • [Why](#-why-igniter-jsjobs) • [Examples](#-real-world-examples) • [API Reference](#-api-reference) • [Telemetry](#-telemetry)

</div>

---

## ✨ Why @igniter-js/jobs?

Background processing is notoriously hard to keep reliable and observable. `@igniter-js/jobs` is built to solve the most common pain points:

- ✅ **Type-safe job inputs** — Your job handlers and dispatch calls stay in sync.
- ✅ **Zero-boilerplate queues** — Define jobs with a fluent queue builder.
- ✅ **Runtime validation** — Zod or Standard Schema V1 input validation.
- ✅ **Scoped jobs** — First-class multi-tenant support via `scope()`.
- ✅ **Observability built-in** — Telemetry events and pub/sub job lifecycle events.
- ✅ **Typed job streams** — Emit live per-job stream events with optional persistence and replay.
- ✅ **Adapter-based backends** — In-memory for tests, SQLite for local, BullMQ for production.

---

## 🚀 Quick Start

### Installation

```bash
# npm
npm install @igniter-js/jobs zod
```

```bash
# pnpm
pnpm add @igniter-js/jobs zod
```

```bash
# yarn
yarn add @igniter-js/jobs zod
```

```bash
# bun
bun add @igniter-js/jobs zod
```

### Your First Queue (60 seconds)

```typescript
import { IgniterJobs, IgniterQueue } from "@igniter-js/jobs";
import { IgniterJobsMemoryAdapter } from "@igniter-js/jobs/adapters/mock";
import { z } from "zod";

type AppContext = { mailer: { sendWelcome: (email: string) => Promise<void> } };

const emailQueue = IgniterQueue.create("email")
  .addJob("sendWelcome", {
    input: z.object({ email: z.string().email() }),
    handler: async ({ input, context }) => {
      await context.mailer.sendWelcome(input.email);
    },
  })
  .build();

const jobs = IgniterJobs.create()
  .withAdapter(IgniterJobsMemoryAdapter.create())
  .withService("my-api")
  .withEnvironment("development")
  .withContext(async () => ({ mailer }))
  .addQueue(emailQueue)
  .build();

await jobs.email.sendWelcome.dispatch({ input: { email: "user@example.com" } });
```

**✅ Success!** You just created a typed job, registered it with a queue, and dispatched it.

---

## 🎯 Core Concepts

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Your App                             │
├─────────────────────────────────────────────────────────────┤
│ jobs.email.sendWelcome.dispatch({ input })                   │
└────────────┬────────────────────────────────────────────────┘
             │ Typed runtime (Proxy accessors)
             ▼
┌─────────────────────────────────────────────────────────────┐
│                 IgniterJobsManager (core)                    │
│  • Dispatch & schedule                                       │
│  • Worker builder                                            │
│  • Queue & job management                                    │
│  • Scopes + telemetry + events + streams                     │
└────────────┬────────────────────────────────────────────────┘
             │ Adapter contract (IgniterJobsAdapter)
             ▼
┌─────────────────────────────────────────────────────────────┐
│                      Adapter Layer                           │
│  Memory Adapter  •  Bun SQLite Adapter  •  BullMQ Adapter    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                     Queue Backend                            │
│  In-memory  •  SQLite  •  Redis (BullMQ)                     │
└─────────────────────────────────────────────────────────────┘
```

### Key Abstractions

- **IgniterJobs Builder** — Configures adapter, context, scopes, and queues. The `withContext()` factory infers context types automatically.
- **IgniterQueue Builder** — Defines jobs and cron tasks within a queue.
- **Runtime Accessors** — Dynamic queue/job accessors with typed input inferred from schemas.
- **Adapters** — Backend implementations (memory, SQLite, BullMQ). All implement the same `IgniterJobsAdapter` interface.
- **Telemetry** — Structured, typed events for observability. 17 events across job/worker/queue groups.
- **Scopes** — Optional tenant isolation for multi-tenant systems. Single scope per instance.

---

## 📖 Usage Examples

### Example Index

1. Basic queue + job
2. Typed input with Zod
3. Register jobs runtime
4. Dispatch a job
5. Schedule a job (delay)
6. Schedule a job (absolute time)
7. Add cron tasks
8. Scope jobs (multi-tenant)
9. Per-dispatch scope override
10. Subscribe to all events
11. Subscribe to queue events
12. Subscribe to job events
13. Queue management APIs
14. Queue cleaning
15. Queue obliterate
16. Queue retry all failed
17. Job inspection
18. Job retry / remove / promote
19. Move job to failed
20. Retry many jobs
21. Remove many jobs
22. Create a worker
23. Worker hooks
24. Worker control
25. Worker metrics
26. Search jobs
27. Search queues
28. Search workers
29. Shutdown
30. Queue defaults
31. Worker defaults
32. Auto-start config (stored)
33. Job priority + delay combo
34. Remove-on-complete policies
35. Remove-on-fail policies
36. Custom metadata pattern
37. Scoped metadata merge
38. Standard Schema V1 guard
39. Result mapping pattern
40. Idempotency guard
41. Dead-letter alerting
42. Progress updates
43. Typed job streams
44. Job logs inspection
45. Queue list with paging
46. Worker limiter pattern
47. Worker sharding by queue
48. Graceful shutdown in process
49. Global events to analytics
50. Event filtering pattern

### 1) Basic Queue + Job

```typescript
import { IgniterQueue } from "@igniter-js/jobs";

const emailQueue = IgniterQueue.create("email")
  .addJob("sendReceipt", {
    handler: async ({ input }) => {
      // input is unknown unless you define a schema
      await sendReceipt(input as { orderId: string });
    },
  })
  .build();
```

### 2) Typed Input with Zod

```typescript
import { z } from "zod";

const uploadQueue = IgniterQueue.create("uploads")
  .addJob("processImage", {
    input: z.object({ url: z.string().url(), width: z.number().min(1) }),
    handler: async ({ input }) => {
      await resizeImage(input.url, input.width);
    },
  })
  .build();
```

### 3) Register Jobs Runtime

```typescript
import { IgniterJobs } from "@igniter-js/jobs";
import { IgniterJobsMemoryAdapter } from "@igniter-js/jobs/adapters/mock";

const jobs = IgniterJobs.create()
  .withAdapter(IgniterJobsMemoryAdapter.create())
  .withService("worker")
  .withEnvironment("local")
  .withContext(async () => ({ db }))
  .addQueue(uploadQueue)
  .build();
```

### 4) Dispatch a Job

```typescript
await jobs.uploads.processImage.dispatch({
  input: { url: "https://cdn.example.com/a.png", width: 640 },
  priority: 10,
});
```

### 5) Schedule a Job (Delay)

```typescript
await jobs.uploads.processImage.schedule({
  input: { url: "https://cdn.example.com/a.png", width: 640 },
  delay: 60_000,
});
```

### 6) Schedule a Job (Absolute Time)

```typescript
await jobs.uploads.processImage.schedule({
  input: { url: "https://cdn.example.com/a.png", width: 640 },
  at: new Date(Date.now() + 5 * 60 * 1000),
});
```

### 7) Add Cron Tasks

```typescript
const reportsQueue = IgniterQueue.create("reports")
  .addCron("dailySummary", {
    cron: "0 2 * * *",
    handler: async ({ context }) => {
      await context.reports.runDailySummary();
    },
  })
  .build();
```

### 8) Scope Jobs (Multi-Tenant)

```typescript
const jobs = IgniterJobs.create()
  .withAdapter(IgniterJobsMemoryAdapter.create())
  .withService("api")
  .withEnvironment("production")
  .withContext(async () => ({ db }))
  .addScope("organization", { required: true })
  .addQueue(emailQueue)
  .build();

const orgJobs = jobs.scope("organization", "org_123");
await orgJobs.email.sendWelcome.dispatch({ input: { email: "a@b.com" } });
```

### 9) Per-Dispatch Scope Override

```typescript
await jobs.email.sendWelcome.dispatch({
  input: { email: "a@b.com" },
  scope: { type: "organization", id: "org_123" },
});
```

### 10) Subscribe to All Events

```typescript
const unsubscribe = await jobs.subscribe((event) => {
  console.log(event.type, event.data, event.timestamp);
});

await unsubscribe();
```

### 11) Subscribe to Queue Events

```typescript
const unsubscribe = await jobs.email.subscribe((event) => {
  console.log(event.type, event.data);
});

await unsubscribe();
```

### 12) Subscribe to Job Events

```typescript
const unsubscribe = await jobs.email.sendWelcome.subscribe((event) => {
  console.log(event.type, event.data);
});

await unsubscribe();
```

### 13) Queue Management APIs

```typescript
const info = await jobs.email.get().retrieve();
await jobs.email.get().pause();
await jobs.email.get().resume();
await jobs.email.get().drain();
```

### 14) Queue Cleaning

```typescript
await jobs.email.get().clean({
  status: ["completed", "failed"],
  olderThan: 7 * 24 * 60 * 60 * 1000,
  limit: 1000,
});
```

### 15) Queue Obliterate

```typescript
await jobs.email.get().obliterate({ force: true });
```

### 16) Queue Retry All Failed

```typescript
const retried = await jobs.email.get().retryAll();
console.log(`Retried ${retried} jobs`);
```

### 17) Job Inspection

```typescript
const job = await jobs.email.sendWelcome.get("job-id").retrieve();
const state = await jobs.email.sendWelcome.get("job-id").state();
const logs = await jobs.email.sendWelcome.get("job-id").logs();
const progress = await jobs.email.sendWelcome.get("job-id").progress();
```

### 18) Job Retry / Remove / Promote

```typescript
await jobs.email.sendWelcome.get("job-id").retry();
await jobs.email.sendWelcome.get("job-id").remove();
await jobs.email.sendWelcome.get("job-id").promote();
```

### 19) Move Job to Failed

```typescript
await jobs.email.sendWelcome.get("job-id").move("failed", "Manual fail");
```

### 20) Retry Many Jobs

```typescript
await jobs.email.sendWelcome.many(["job-1", "job-2"]).retry();
```

### 21) Remove Many Jobs

```typescript
await jobs.email.sendWelcome.many(["job-1", "job-2"]).remove();
```

### 22) Create a Worker

```typescript
const worker = await jobs.worker
  .create()
  .addQueue("email")
  .withConcurrency(10)
  .start();
```

### 23) Worker Hooks

```typescript
const worker = await jobs.worker
  .create()
  .addQueue("email")
  .onActive(({ job }) => console.log("Active", job.id))
  .onSuccess(({ job }) => console.log("Success", job.id))
  .onFailure(({ job, error }) => console.error("Fail", job.id, error))
  .onIdle(() => console.log("Idle"))
  .start();
```

### 24) Worker Control

```typescript
await worker.pause();
await worker.resume();
await worker.close();
```

### 25) Worker Metrics

```typescript
const metrics = await worker.getMetrics();
console.log(metrics.processed, metrics.failed, metrics.avgDuration);
```

### 26) Search Jobs

```typescript
const failedJobs = await jobs.search("jobs", {
  status: "failed",
  queue: "email",
  limit: 50,
});
```

### 27) Search Queues

```typescript
const queues = await jobs.search("queues", {});
```

### 28) Search Workers

```typescript
const workers = await jobs.search("workers", { queue: "email" });
```

### 29) Shutdown

```typescript
await jobs.shutdown();
```

### 30) Queue Defaults

```typescript
const jobs = IgniterJobs.create()
  .withAdapter(IgniterJobsMemoryAdapter.create())
  .withService("api")
  .withEnvironment("production")
  .withContext(async () => ({ db }))
  .withQueueDefaults({ attempts: 3, removeOnComplete: 100 })
  .addQueue(emailQueue)
  .build();
```

### 31) Worker Defaults

```typescript
const jobs = IgniterJobs.create()
  .withAdapter(IgniterJobsMemoryAdapter.create())
  .withService("api")
  .withEnvironment("production")
  .withContext(async () => ({ db }))
  .withWorkerDefaults({ concurrency: 5 })
  .addQueue(emailQueue)
  .build();
```

### 32) Auto-Start Config (Stored)

```typescript
const jobs = IgniterJobs.create()
  .withAdapter(IgniterJobsMemoryAdapter.create())
  .withService("api")
  .withEnvironment("production")
  .withContext(async () => ({ db }))
  .withAutoStartWorker({ queues: ["email"], concurrency: 2 })
  .addQueue(emailQueue)
  .build();
```

### 33) Job Priority + Delay Combo

```typescript
await jobs.email.sendWelcome.dispatch({
  input: { email: "vip@example.com" },
  priority: 10,
  delay: 30_000,
});
```

### 34) Remove-on-Complete Policies

```typescript
const queue = IgniterQueue.create("logs")
  .addJob("audit", {
    removeOnComplete: 500,
    handler: async ({ input }) => {
      await auditLog.write(input);
    },
  })
  .build();
```

### 35) Remove-on-Fail Policies

```typescript
const queue = IgniterQueue.create("critical")
  .addJob("payment", {
    removeOnFail: false,
    attempts: 5,
    handler: async ({ input }) => {
      await processPayment(input);
    },
  })
  .build();
```

### 36) Custom Metadata Pattern

```typescript
await jobs.email.sendWelcome.dispatch({
  input: { email: "user@example.com" },
  metadata: { source: "signup-flow", campaign: "q1-2026" },
});
```

### 37) Scoped Metadata Merge

```typescript
const orgJobs = jobs.scope("organization", "org_123", { plan: "enterprise" });
await orgJobs.email.sendWelcome.dispatch({
  input: { email: "user@org123.com" },
  metadata: { source: "admin-dashboard" },
});
```

### 38) Standard Schema V1 Guard

```typescript
import type { StandardSchemaV1 } from "@igniter-js/common";

const mySchema: StandardSchemaV1<string, string> = {
  "~standard": { version: 1, vendor: "custom", validate: () => ({ value: "ok" }) },
};

const queue = IgniterQueue.create("validated")
  .addJob("process", {
    input: mySchema,
    handler: async ({ input }) => {
      console.log(input); // type is string
    },
  })
  .build();
```

### 39) Result Mapping Pattern

```typescript
const queue = IgniterQueue.create("analytics")
  .addJob("compute", {
    input: z.object({ data: z.array(z.number()) }),
    output: z.object({ sum: z.number(), avg: z.number() }),
    handler: async ({ input }) => {
      const sum = input.data.reduce((a, b) => a + b, 0);
      return { sum, avg: sum / input.data.length };
    },
  })
  .build();

const result = await jobs.analytics.compute.get("job-id").retrieve();
console.log(result?.result); // { sum: number, avg: number }
```

### 40) Idempotency Guard

```typescript
const queue = IgniterQueue.create("orders")
  .addJob("process", {
    input: z.object({ orderId: z.string() }),
    handler: async ({ input, context }) => {
      const existing = await context.db.orders.findOne({ id: input.orderId });
      if (existing?.status === "processed") return;
      await context.db.orders.update({ id: input.orderId, status: "processed" });
    },
  })
  .build();
```

### 41) Dead-Letter Alerting

```typescript
const queue = IgniterQueue.create("critical")
  .addJob("sync", {
    attempts: 3,
    handler: async ({ input }) => {
      await externalApi.sync(input.id);
    },
    onFailure: async ({ error, isFinalAttempt }) => {
      if (isFinalAttempt) {
        await pagerDuty.alert(`Sync permanently failed: ${error.message}`);
      }
    },
  })
  .build();
```

### 42) Progress Updates

```typescript
const queue = IgniterQueue.create("imports")
  .addJob("csvImport", {
    input: z.object({ fileUrl: z.string() }),
    handler: async ({ input, job }) => {
      const rows = await fetchCsv(input.fileUrl);
      for (let i = 0; i < rows.length; i++) {
        await processRow(rows[i]);
        if (i % 100 === 0 && job.updateProgress) {
          await job.updateProgress(Math.round((i / rows.length) * 100));
        }
      }
    },
  })
  .build();
```

### 43) Typed Job Streams

```typescript
const queue = IgniterQueue.create("uploads")
  .addJob("processImage", {
    input: z.object({ url: z.string() }),
    stream: {
      persistence: { enabled: true, maxEvents: 100 },
      events: {
        "resize.started": z.object({ width: z.number(), height: z.number() }),
        "resize.complete": z.object({ outputUrl: z.string() }),
      },
    },
    handler: async ({ input, job }) => {
      await job.stream.emit("resize.started", { width: 800, height: 600 });
      const result = await resize(input.url, 800, 600);
      await job.stream.emit("resize.complete", { outputUrl: result.url });
    },
  })
  .build();

// Subscribe to stream events for a specific job
const stream = jobs.uploads.processImage.get("job-id").stream();
const unsub = await stream.subscribe((event) => {
  if (event.type === "resize.complete") {
    updateUI(event.data.outputUrl);
  }
});

// Read persisted events (pagination support)
const { items, nextCursor, hasMore } = await stream.read({ limit: 20 });
```

### 44) Job Logs Inspection

```typescript
const logs = await jobs.email.sendWelcome.get("job-id").logs();
for (const log of logs) {
  console.log(`${log.timestamp.toISOString()} [${log.level}] ${log.message}`);
}
```

### 45) Queue List with Paging

```typescript
const pending = await jobs.email.list({
  status: ["waiting", "delayed"],
  limit: 25,
  offset: 0,
});
```

### 46) Worker Limiter Pattern

```typescript
const worker = await jobs.worker
  .create()
  .addQueue("external-api")
  .withLimiter({ max: 100, duration: 60_000 })
  .start();
```

### 47) Worker Sharding by Queue

```typescript
const highPrioWorker = await jobs.worker
  .create()
  .addQueue("critical")
  .withConcurrency(20)
  .start();

const lowPrioWorker = await jobs.worker
  .create()
  .addQueue("analytics")
  .withConcurrency(5)
  .start();
```

### 48) Graceful Shutdown in Process

```typescript
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  await jobs.shutdown();
  process.exit(0);
});
```

### 49) Global Events to Analytics

```typescript
await jobs.subscribe((event) => {
  analytics.track(`jobs.${event.type}`, {
    ...event.data,
    timestamp: event.timestamp,
    scope: event.scope,
  });
});
```

### 50) Event Filtering Pattern

```typescript
const unsub = await jobs.email.subscribe((event) => {
  if (event.type === "email:job:completed") {
    metrics.increment("email.jobs.completed");
  }
  if (event.type === "email:job:failed") {
    metrics.increment("email.jobs.failed");
  }
});
```

---

## 🔌 Adapters

### Adapter Comparison

| Feature | Memory | Bun SQLite | BullMQ |
|---------|--------|------------|--------|
| Persistence | ❌ | ✅ | ✅ |
| Multi-process | ❌ | ❌ | ✅ |
| Production-ready | ❌ | ✅ (single instance) | ✅ |
| Cron support | Manual | ✅ | ✅ |
| Delayed jobs | ✅ | ✅ | ✅ |
| Job progress | ✅ | ✅ | ✅ |
| Stream events | ✅ | ✅ | ✅ |
| Rate limiter | ❌ | ✅ | ✅ |
| Worker metrics | ✅ | ✅ | ✅ |

### Memory Adapter (Testing & Development)

```typescript
import { IgniterJobsMemoryAdapter } from "@igniter-js/jobs/adapters/mock";

const adapter = IgniterJobsMemoryAdapter.create();
```

- **Persistence:** None. All jobs lost on process exit.
- **Use:** Unit tests, integration tests, local development.
- **Limitations:** No multi-process, no persistence, cron requires manual triggers.

### Bun SQLite Adapter (Desktop, CLI, Local Apps)

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

| Option | Default | Description |
|--------|---------|-------------|
| `path` | *(required)* | SQLite file path for persistence. |
| `durable` | `false` | Forces immediate persistence for dispatched jobs. |
| `heartbeatInterval` | `10000` | Worker heartbeat interval in milliseconds. |
| `pollTimeout` | `0` | Long-poll timeout while the queue is empty. |
| `batchSize` | `10` | Number of jobs pulled per worker batch. |
| `lockDuration` | `30000` | Lock duration for active jobs in milliseconds. |
| `maxStalledCount` | `1` | Maximum stalled detections before a job fails. |

### BullMQ Adapter (Production Scale)

```typescript
import { IgniterJobsBullMQAdapter } from "@igniter-js/jobs/adapters/node";
import Redis from "ioredis";

const adapter = IgniterJobsBullMQAdapter.create({
  redis: new Redis({ host: "localhost", port: 6379 }),
});
```

---

## 🧠 Input Validation

### Standard Schema V1

```typescript
import type { StandardSchemaV1 } from "@igniter-js/common";

declare const emailSchema: StandardSchemaV1<{ email: string }, { email: string }>;

const queue = IgniterQueue.create("email")
  .addJob("sendWelcome", {
    input: emailSchema,
    handler: async ({ input }) => {
      console.log(input.email); // type: string
    },
  })
  .build();
```

### Zod Schema

```typescript
import { z } from "zod";

const queue = IgniterQueue.create("email")
  .addJob("sendWelcome", {
    input: z.object({
      email: z.string().email(),
      name: z.string().min(1),
    }),
    handler: async ({ input }) => {
      console.log(input.email, input.name); // both typed as string
    },
  })
  .build();
```

---

## 🧩 Hooks & Lifecycle

IgniterJobs provides four lifecycle hooks on every job definition:

| Hook | Signature | When Called |
|------|-----------|-------------|
| `onStart` | `(ctx: HookContext) => void` | Before handler execution. |
| `onProgress` | `(ctx: HookContext & {progress, message?}) => void` | When `job.updateProgress()` is called. |
| `onSuccess` | `(ctx: HookContext & {result}) => void` | After handler completes successfully. |
| `onFailure` | `(ctx: HookContext & {error, isFinalAttempt}) => void` | After handler throws. |

### Hook Example

```typescript
const queue = IgniterQueue.create("email")
  .addJob("sendWelcome", {
    input: z.object({ email: z.string().email() }),
    handler: async ({ input }) => {
      await sendEmail(input.email);
    },
    onStart: async ({ job }) => {
      console.log(`Starting job ${job.id}`);
    },
    onSuccess: async ({ job, result, duration }) => {
      console.log(`Job ${job.id} completed in ${duration}ms`);
    },
    onFailure: async ({ job, error, isFinalAttempt }) => {
      if (isFinalAttempt) {
        await alerting.notify(`Job ${job.id} permanently failed: ${error.message}`);
      }
    },
  })
  .build();
```

---

## ⏱ Scheduling Options

### Cron Scheduling

```typescript
const queue = IgniterQueue.create("reports")
  .addCron("dailySummary", {
    cron: "0 2 * * *",
    tz: "America/New_York",
    handler: async ({ context }) => {
      await context.reports.generateDaily();
    },
  })
  .build();
```

### Fixed Interval

```typescript
await jobs.email.sendWelcome.schedule({
  input: { email: "user@example.com" },
  every: 3600_000, // Every hour
  maxExecutions: 24,
});
```

### Skip Weekends

```typescript
const queue = IgniterQueue.create("alerts")
  .addCron("check", {
    cron: "0 9 * * *",
    skipWeekends: true,
    handler: async ({ context }) => {
      await context.alerts.run();
    },
  })
  .build();
```

### Business Hours Only

```typescript
const queue = IgniterQueue.create("notifications")
  .addCron("reminder", {
    cron: "0 */2 * * *",
    onlyBusinessHours: true,
    businessHours: { start: 9, end: 18, timezone: "America/Sao_Paulo" },
    handler: async ({ context }) => {
      await context.notifications.sendReminders();
    },
  })
  .build();
```

---

## 🔭 Telemetry

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

### Job Telemetry Events

| Event | Emitted When |
|-------|-------------|
| `igniter.jobs.job.enqueued` | Job dispatched to queue. |
| `igniter.jobs.job.started` | Worker begins executing job. |
| `igniter.jobs.job.completed` | Job completes successfully. |
| `igniter.jobs.job.failed` | Job fails (includes `isFinalAttempt`). |
| `igniter.jobs.job.progress` | `job.updateProgress()` called. |
| `igniter.jobs.job.retrying` | Failed job scheduled for retry. |
| `igniter.jobs.job.scheduled` | Job scheduled with delay or cron. |

### Worker Telemetry Events

| Event | Emitted When |
|-------|-------------|
| `igniter.jobs.worker.started` | Worker process starts. |
| `igniter.jobs.worker.stopped` | Worker process stops. |
| `igniter.jobs.worker.idle` | Worker has no pending jobs. |
| `igniter.jobs.worker.paused` | Worker paused. |
| `igniter.jobs.worker.resumed` | Worker resumed. |

### Queue Telemetry Events

| Event | Emitted When |
|-------|-------------|
| `igniter.jobs.queue.paused` | Queue paused. |
| `igniter.jobs.queue.resumed` | Queue resumed. |
| `igniter.jobs.queue.drained` | Queue drained. |
| `igniter.jobs.queue.cleaned` | Queue cleaned (old jobs removed). |
| `igniter.jobs.queue.obliterated` | Queue obliterated. |

---

## 🧪 Testing

### Unit Testing with Memory Adapter

```typescript
import { IgniterJobs, IgniterQueue } from "@igniter-js/jobs";
import { IgniterJobsMemoryAdapter } from "@igniter-js/jobs/adapters/mock";
import { z } from "zod";
import { describe, it, expect } from "vitest";

describe("Email Jobs", () => {
  it("dispatches and processes a welcome email", async () => {
    const sent: string[] = [];
    const mockMailer = { sendWelcome: async (email: string) => { sent.push(email); } };

    const emailQueue = IgniterQueue.create("email")
      .addJob("sendWelcome", {
        input: z.object({ email: z.string().email() }),
        handler: async ({ input, context }) => {
          await context.mailer.sendWelcome(input.email);
        },
      })
      .build();

    const jobs = IgniterJobs.create()
      .withAdapter(IgniterJobsMemoryAdapter.create())
      .withService("test")
      .withEnvironment("test")
      .withContext(async () => ({ mailer: mockMailer }))
      .addQueue(emailQueue)
      .build();

    const worker = await jobs.worker.create().addQueue("email").start();

    await jobs.email.sendWelcome.dispatch({ input: { email: "test@example.com" } });

    // Memory adapter processes synchronously
    expect(sent).toContain("test@example.com");

    await worker.close();
  });
});
```

---

## 🌍 Real-World Examples

### 1) E-commerce: Order Expiry

Cancel unpaid orders after 1 hour.

```typescript
interface OrderContext {
  db: Database;
  paymentGateway: PaymentGateway;
}

const ordersQueue = IgniterQueue.create("orders")
  .addJob("cancelUnpaid", {
    input: z.object({ orderId: z.string() }),
    handler: async ({ input, context }) => {
      const order = await context.db.orders.findOne({ id: input.orderId });
      if (order && order.status === "pending") {
        await context.paymentGateway.cancel(order.paymentId);
        await context.db.orders.update({ id: input.orderId, status: "cancelled" });
      }
    },
  })
  .build();

// Schedule cancellation 1 hour after order creation
await jobs.orders.cancelUnpaid.schedule({
  input: { orderId: "order_123" },
  delay: 3600_000,
});
```

### 2) Fintech: Nightly Reconciliation

Verify transactions against bank API at 3 AM.

```typescript
const reconciliationQueue = IgniterQueue.create("reconciliation")
  .addCron("nightlyReconcile", {
    cron: "0 3 * * *",
    handler: async ({ context }) => {
      const pending = await context.db.transactions.findPending();
      const batches = chunk(pending, 100);
      for (const batch of batches) {
        // Dispatch sub-jobs for each batch
        await jobs.reconciliation.reconcileBatch.dispatch({ input: { ids: batch.map(t => t.id) } });
      }
    },
  })
  .addJob("reconcileBatch", {
    input: z.object({ ids: z.array(z.string()) }),
    handler: async ({ input, context }) => {
      for (const id of input.ids) {
        const txn = await context.db.transactions.findOne({ id });
        const bankStatus = await context.bankApi.verify(txn.externalId);
        await context.db.transactions.update({ id, status: bankStatus });
      }
    },
  })
  .build();
```

### 3) SaaS: CSV Import with Progress

Process 100k row CSV per tenant with real-time progress.

```typescript
const importQueue = IgniterQueue.create("imports")
  .addJob("csvImport", {
    input: z.object({ fileUrl: z.string(), tenantId: z.string() }),
    stream: {
      persistence: { enabled: true, maxEvents: 500 },
      events: {
        "import.row.processed": z.object({ row: z.number(), total: z.number() }),
        "import.complete": z.object({ rows: z.number(), duration: z.number() }),
      },
    },
    handler: async ({ input, job, context }) => {
      const rows = await fetchCsv(input.fileUrl);
      const total = rows.length;
      for (let i = 0; i < total; i++) {
        await context.db.importRow(input.tenantId, rows[i]);
        if (i % 100 === 0) {
          await job.stream.emit("import.row.processed", { row: i, total });
          await job.updateProgress?.(Math.round((i / total) * 100));
        }
      }
      await job.stream.emit("import.complete", { rows: total, duration: Date.now() - start });
    },
  })
  .build();

// Dispatch scoped to tenant
const tenantJobs = jobs.scope("organization", tenantId);
const jobId = await tenantJobs.imports.csvImport.dispatch({ input: { fileUrl, tenantId } });

// Monitor progress via streams
const stream = tenantJobs.imports.csvImport.get(jobId).stream();
await stream.subscribe((event) => {
  if (event.type === "import.row.processed") {
    updateProgressBar(event.data.row, event.data.total);
  }
});
```

### 4) Media Platform: Video Transcoding

Generate multiple video qualities after upload with priority queues.

```typescript
const videoQueue = IgniterQueue.create("video")
  .addJob("transcode", {
    input: z.object({ videoUrl: z.string(), qualities: z.array(z.enum(["360p", "720p", "1080p", "4k"])) }),
    handler: async ({ input, job, context }) => {
      for (const quality of input.qualities) {
        await job.stream.emit("transcode.quality.started", { quality });
        const result = await context.transcoder.process(input.videoUrl, quality);
        await job.stream.emit("transcode.quality.complete", { quality, outputUrl: result.url });
      }
    },
    onSuccess: async ({ job, result }) => {
      await notifyUser(job.metadata?.userId, "Video processing complete");
    },
  })
  .build();

// Dispatch with priority
await jobs.video.transcode.dispatch({
  input: { videoUrl: "s3://bucket/raw/video.mp4", qualities: ["720p", "1080p"] },
  priority: 5,
  metadata: { userId: "user_456", videoId: "vid_789" },
});
```

### 5) Healthcare: Appointment Reminders

Send SMS 24h before appointment.

```typescript
const remindersQueue = IgniterQueue.create("reminders")
  .addJob("sendReminder", {
    input: z.object({ appointmentId: z.string() }),
    handler: async ({ input, context }) => {
      const appointment = await context.db.appointments.findOne({ id: input.appointmentId });
      if (appointment.status === "cancelled") return;
      await context.smsService.send({
        to: appointment.patientPhone,
        body: `Reminder: You have an appointment on ${appointment.date.toDateString()}`,
      });
    },
    onFailure: async ({ error, isFinalAttempt }) => {
      if (isFinalAttempt) {
        await context.alerting.notifyOnCall(`SMS reminder failed: ${error.message}`);
      }
    },
  })
  .build();

// Schedule reminder 24h before appointment
await jobs.reminders.sendReminder.schedule({
  input: { appointmentId: "apt_123" },
  at: new Date(appointment.date.getTime() - 24 * 3600_000),
});
```

### 6) Marketplace: Fraud Review Queue

High-priority fraud detection with human review.

```typescript
const fraudQueue = IgniterQueue.create("fraud")
  .addJob("detect", {
    input: z.object({ transactionId: z.string() }),
    handler: async ({ input, context }) => {
      const score = await context.fraudEngine.analyze(input.transactionId);
      if (score > 0.8) {
        await context.db.transactions.update({ id: input.transactionId, status: "blocked" });
      } else if (score > 0.5) {
        await context.db.transactions.update({ id: input.transactionId, status: "review" });
      }
    },
  })
  .build();
```

### 7) DevOps: Cleanup Jobs

Periodic cleanup of stale resources.

```typescript
const cleanupQueue = IgniterQueue.create("cleanup")
  .addCron("hourlyCleanup", {
    cron: "0 * * * *",
    handler: async ({ context }) => {
      await context.db.sessions.deleteExpired();
      await context.db.tempFiles.deleteOlderThan({ days: 7 });
      await context.cache.clearStale();
    },
  })
  .build();
```

---

## 📚 API Reference

### IgniterJobs (Factory)

```typescript
import { IgniterJobs } from "@igniter-js/jobs";

// Factory namespace. create() returns IgniterJobsBuilder.
// Context type is inferred from withContext().
const builder = IgniterJobs.create(); // → IgniterJobsBuilder<unknown>
```

### IgniterJobsBuilder

```typescript
class IgniterJobsBuilder<TContext, TQueues, TScope> {
  static create(): IgniterJobsBuilder<unknown>;
  
  withAdapter(adapter: IgniterJobsAdapter): this;
  withService(service: string): this;
  withEnvironment(environment: string): this;
  withContext<TNewContext>(factory: () => TNewContext | Promise<TNewContext>): IgniterJobsBuilder<TNewContext>;
  addScope<TNewScope extends string>(name: TNewScope, options?: IgniterJobsScopeOptions): IgniterJobsBuilder<TContext, TQueues, TScope | TNewScope>;
  addQueue<TName extends string, TQueue>(queue: TQueue & { name: TName }): IgniterJobsBuilder<TContext, TQueues & Record<TName, TQueue>, TScope>;
  withQueueDefaults(defaults: Partial<IgniterJobDefinition<TContext>>): this;
  withWorkerDefaults(defaults: Partial<IgniterJobsWorkerBuilderConfig>): this;
  withAutoStartWorker(config: { queues: string[]; concurrency?: number; limiter?: IgniterJobsLimiter }): this;
  withTelemetry(telemetry: IgniterJobsTelemetry): this;
  withLogger(logger: IgniterLogger): this;
  build(): IgniterJobsRuntime<IgniterJobsConfig<TContext, TQueues, TScope>>;
}
```

### IgniterQueue (Factory)

```typescript
import { IgniterQueue } from "@igniter-js/jobs";

const queue = IgniterQueue.create(name);
```

### IgniterQueueBuilder

```typescript
class IgniterQueueBuilder<TContext, TJobs, TCron, TName> {
  static create<TName extends string>(name: TName): IgniterQueueBuilder<unknown>;
  
  addJob<TJobName, TInput, TResult, TStreamEvents>(
    jobName: TJobName,
    definition: IgniterJobDefinition<TContext, TInput, TResult, TStreamEvents>,
  ): IgniterQueueBuilder<TContext, TJobs & Record<TJobName, IgniterJobDefinition>, TCron, TName>;
  
  addCron<TCronName, TResult>(
    cronName: TCronName,
    definition: IgniterCronDefinition<TContext, TResult>,
  ): IgniterQueueBuilder<TContext, TJobs, TCron & Record<TCronName, IgniterCronDefinition>, TName>;
  
  build(): IgniterJobsQueue<TContext, TJobs, TCron> & { name: TName };
}
```

### Runtime Methods

| Accessor | Method | Returns |
|----------|--------|---------|
| `jobs.<queue>.<job>` | `dispatch(params)` | `Promise<string>` (job ID) |
| `jobs.<queue>.<job>` | `schedule(params)` | `Promise<string>` (job ID) |
| `jobs.<queue>.<job>` | `get(id)` | `IgniterJobsJobInstanceAccessor` |
| `jobs.<queue>.<job>` | `many(ids)` | `IgniterJobsJobManyAccessor` |
| `jobs.<queue>.<job>` | `subscribe(handler)` | `Promise<() => Promise<void>>` |
| `jobs.<queue>` | `get()` | `IgniterJobsQueueManagerAccessor` |
| `jobs.<queue>` | `list(filter?)` | `Promise<IgniterJobSearchResult[]>` |
| `jobs.<queue>` | `subscribe(handler)` | `Promise<() => Promise<void>>` |
| `jobs` | `subscribe(handler)` | `Promise<() => Promise<void>>` |
| `jobs` | `search(target, filter)` | `Promise<unknown[]>` |
| `jobs` | `shutdown()` | `Promise<void>` |
| `jobs` | `scope(type, id, tags?)` | `IgniterJobsRuntime` |

### Queue Accessor

`jobs.<queue>.get()` returns:

```typescript
{
  retrieve(): Promise<IgniterJobsQueueInfo | null>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  drain(): Promise<number>;
  clean(options: IgniterJobsQueueCleanOptions): Promise<number>;
  obliterate(options?: { force?: boolean }): Promise<void>;
  retryAll(): Promise<number>;
}
```

### Job Accessor

`jobs.<queue>.<job>.get(id)` returns:

```typescript
{
  retrieve(): Promise<IgniterJobSearchResult | null>;
  retry(): Promise<void>;
  remove(): Promise<void>;
  promote(): Promise<void>;
  move(state: "failed", reason: string): Promise<void>;
  state(): Promise<IgniterJobStatus | null>;
  progress(): Promise<number>;
  logs(): Promise<{ timestamp: Date; message: string; level: "info" | "warn" | "error" }[]>;
  stream(): IgniterJobsJobStreamAccessor;
}
```

`jobs.<queue>.<job>.many(ids)` returns:

```typescript
{
  retry(): Promise<void>;
  remove(): Promise<void>;
}
```

### Worker Builder

```typescript
class IgniterWorkerBuilder<TAllowedQueues> {
  addQueue(queue: TAllowedQueues): this;
  withConcurrency(concurrency: number): this;
  withLimiter(limiter: IgniterJobsLimiter): this;
  onActive(handler: (ctx: { job: IgniterJobSearchResult }) => void): this;
  onSuccess(handler: (ctx: { job: IgniterJobSearchResult; result: unknown }) => void): this;
  onFailure(handler: (ctx: { job: IgniterJobSearchResult; error: Error }) => void): this;
  onIdle(handler: () => void): this;
  start(): Promise<IgniterJobsWorkerHandle>;
}
```

### Worker Handle

```typescript
interface IgniterJobsWorkerHandle {
  readonly id: string;
  readonly queues: string[];
  pause(): Promise<void>;
  resume(): Promise<void>;
  close(): Promise<void>;
  isRunning(): boolean;
  isPaused(): boolean;
  isClosed(): boolean;
  getMetrics(): Promise<IgniterJobsWorkerMetrics>;
}
```

### IgniterJobDefinition

```typescript
interface IgniterJobDefinition<TContext, TInput, TResult, TStreamEvents> {
  input?: TInput;                           // Schema for input validation
  output?: IgniterJobsSchema;                // Schema for output validation
  queue?: string;                            // Optional child queue override
  stream?: IgniterJobsJobStreamDefinition;   // Stream configuration
  handler: (ctx: IgniterJobsExecutionContext) => Promise<TResult> | TResult;
  onStart?: (ctx: IgniterJobsHookContext) => void | Promise<void>;
  onProgress?: (ctx: IgniterJobsHookContext & { progress: number; message?: string }) => void;
  onSuccess?: (ctx: IgniterJobsHookContext & { result: TResult }) => void;
  onFailure?: (ctx: IgniterJobsHookContext & { error: Error; isFinalAttempt: boolean }) => void;
  
  // InvokeOptions
  jobId?: string;
  priority?: number;
  delay?: number;
  attempts?: number;
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  metadata?: Record<string, unknown>;
  limiter?: IgniterJobsLimiter;
}
```

### IgniterCronDefinition

```typescript
interface IgniterCronDefinition<TContext, TResult> {
  cron: string;                    // Cron expression
  tz?: string;                     // Timezone
  maxExecutions?: number;
  skipWeekends?: boolean;
  onlyBusinessHours?: boolean;
  businessHours?: { start: number; end: number; timezone?: string };
  onlyWeekdays?: number[];         // 0=Sunday..6=Saturday
  skipDates?: Array<string | Date>;
  startDate?: Date;
  endDate?: Date;
  handler: (ctx: Omit<IgniterJobsExecutionContext, "input">) => Promise<TResult> | TResult;
}
```

---

## 🔧 Framework Integration

### Next.js (App Router)

```typescript
// lib/jobs.ts
import { IgniterJobs, IgniterQueue } from "@igniter-js/jobs";
import { IgniterJobsBullMQAdapter } from "@igniter-js/jobs/adapters/node";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

const emailQueue = IgniterQueue.create("email")
  .addJob("sendWelcome", {
    input: z.object({ email: z.string().email() }),
    handler: async ({ input, context }) => {
      await context.resend.emails.send({ to: input.email, subject: "Welcome!" });
    },
  })
  .build();

export const jobs = IgniterJobs.create()
  .withAdapter(IgniterJobsBullMQAdapter.create({ redis }))
  .withService("nextjs-app")
  .withEnvironment(process.env.NODE_ENV)
  .withContext(async () => ({ resend }))
  .addQueue(emailQueue)
  .build();

// app/api/users/route.ts
export async function POST(req: Request) {
  const { email } = await req.json();
  await jobs.email.sendWelcome.dispatch({ input: { email } });
  return Response.json({ ok: true });
}
```

### Express

```typescript
// services/jobs.ts
export const jobs = IgniterJobs.create()
  .withAdapter(IgniterJobsBullMQAdapter.create({ redis }))
  .withService("express-api")
  .withEnvironment(process.env.NODE_ENV || "development")
  .withContext(async () => ({ db }))
  .addQueue(emailQueue)
  .build();

// routes/users.ts
app.post("/users", async (req, res) => {
  await jobs.email.sendWelcome.dispatch({ input: { email: req.body.email } });
  res.json({ ok: true });
});
```

### Fastify

```typescript
// plugins/jobs.ts
export default async function jobsPlugin(fastify: FastifyInstance) {
  const jobs = IgniterJobs.create()
    .withAdapter(IgniterJobsBullMQAdapter.create({ redis: fastify.redis }))
    .withService("fastify-api")
    .withEnvironment(process.env.NODE_ENV || "development")
    .withContext(async () => ({ db: fastify.db }))
    .addQueue(emailQueue)
    .build();

  fastify.decorate("jobs", jobs);
}

// routes/users.ts
fastify.post("/users", async (req) => {
  await fastify.jobs.email.sendWelcome.dispatch({ input: { email: req.body.email } });
  return { ok: true };
});
```

### Server-Only Safety

```typescript
// lib/jobs.server.ts
import "server-only";
import { IgniterJobs } from "@igniter-js/jobs";

// This module can only be imported in server components/API routes.
// Browser imports will hit the shim export and throw.
export const jobs = IgniterJobs.create() /* ... */.build();
```

---

## ✅ Best Practices

| Practice | Why | Example |
|----------|-----|---------|
| ✅ Small Payloads | Reduces queue overhead. | `input: { id: '123' }` |
| ✅ Context Injection | Keeps handlers pure and testable. | `withContext(() => ({ db }))` |
| ✅ Idempotency | Jobs WILL retry. | Check status before acting. |
| ✅ Schema Validation | Prevents poison pill jobs. | `input: z.object({ id: z.string() })` |
| ✅ Graceful Shutdown | Prevents data loss. | `await jobs.shutdown()` on SIGTERM |
| ✅ withContext() First | Required for type inference. | Call before `addQueue()`. |
| ❌ Sync I/O | Kills worker throughput. | Always use `async` handlers. |
| ❌ Large Payloads | Bloats the queue. | Store data in DB, pass ID only. |
| ❌ Mutable Context | Cross-job pollution. | Factory must return fresh instances. |
| ❌ Ignoring onFailure | Silent data loss. | Always log/alert on final failure. |

---

## 🔍 Troubleshooting

| Error Code | Cause | Fix |
|-----------|-------|-----|
| `JOBS_ADAPTER_REQUIRED` | No adapter set before `build()`. | Call `.withAdapter(adapter)`. |
| `JOBS_SERVICE_REQUIRED` | No service name set. | Call `.withService("my-api")`. |
| `JOBS_CONTEXT_REQUIRED` | No context factory set. | Call `.withContext(() => ({ ... }))`. |
| `JOBS_CONFIGURATION_INVALID` | Invalid config value. | Check environment/concurrency values. |
| `JOBS_QUEUE_NOT_FOUND` | Queue not registered. | Worker references unregistered queue. |
| `JOBS_QUEUE_DUPLICATE` | Duplicate queue name. | Use unique queue names. |
| `JOBS_DUPLICATE_JOB` | Duplicate job name. | Job/cron names must be unique per queue. |
| `JOBS_HANDLER_REQUIRED` | Missing handler function. | Every job/cron needs a `handler`. |
| `JOBS_NOT_FOUND` | Job ID not found. | Verify job ID is from a recent dispatch. |
| `JOBS_VALIDATION_FAILED` | Input doesn't match schema. | Check dispatch input against Zod schema. |
| `JOBS_INVALID_SCHEDULE` | Scheduled time is in the past. | `at` must be a future date. |
| `JOBS_SCOPE_ALREADY_DEFINED` | Multiple `addScope()` calls. | Only one scope supported per instance. |

---

## 📄 License

MIT © Felipe Barcelos

---

<div align="center">

**[Documentation](https://igniterjs.com)** • **[GitHub](https://github.com/felipebarcelospro/igniter-js)** • **[Issues](https://github.com/felipebarcelospro/igniter-js/issues)**

</div>
