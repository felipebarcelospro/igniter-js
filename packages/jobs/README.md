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
import { IgniterJobsMemoryAdapter } from "@igniter-js/jobs/adapters";
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
│  • Scopes + telemetry + events                               │
└────────────┬────────────────────────────────────────────────┘
             │ Adapter contract (IgniterJobsAdapter)
             ▼
┌─────────────────────────────────────────────────────────────┐
│                      Adapter Layer                           │
│  Memory Adapter  •  SQLite Adapter  •  BullMQ Adapter         │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                     Queue Backend                            │
│  In-memory  •  SQLite  •  Redis (BullMQ)                      │
└─────────────────────────────────────────────────────────────┘
```

### Key Abstractions

- **IgniterJobs Builder** — Configures adapter, context, scopes, and queues.
- **IgniterQueue Builder** — Defines jobs and cron tasks.
- **Runtime Accessors** — Dynamic queue/job accessors with typed input.
- **Adapters** — Backend implementations (memory, sqlite, bullmq).
- **Telemetry** — Structured, typed events for observability.
- **Scopes** — Optional tenant isolation for multi-tenant systems.

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
18. Job retry/remove/promote
19. Move job to failed
20. Retry many jobs
21. Remove many jobs
22. Pause/resume job type
23. Create a worker
24. Worker hooks
25. Worker control
26. Worker metrics
27. Search jobs
28. Search queues
29. Search workers
30. Shutdown
31. Queue defaults
32. Worker defaults
33. Auto-start config (stored)
34. Job priority + delay combo
35. Remove-on-complete policies
36. Remove-on-fail policies
37. Custom metadata pattern
38. Scoped metadata merge
39. Standard schema guard
40. Result mapping pattern
41. Idempotency guard
42. Dead-letter alerting
43. Progress updates
44. Job logs inspection
45. Queue list with paging
46. Worker limiter pattern
47. Worker sharding by queue
48. Graceful shutdown in process
49. Global events to analytics
50. Event filtering pattern
51. SQLite adapter usage
52. SQLite adapter persistence
53. Memory adapter testing
54. BullMQ adapter usage
55. Custom adapter skeleton
56. Telemetry integration
57. Next.js integration
58. Express integration
59. Fastify integration
60. Server-only safety

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
import { IgniterJobsMemoryAdapter } from "@igniter-js/jobs/adapters";

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

### 22) Pause/Resume Job Type

```typescript
await jobs.email.sendWelcome.pause();
await jobs.email.sendWelcome.resume();
```

> Note: The BullMQ adapter throws `JOBS_QUEUE_OPERATION_FAILED` for pause/resume job type.

### 23) Create a Worker

```typescript
const worker = await jobs.worker
  .create()
  .addQueue("email")
  .withConcurrency(10)
  .start();
```

### 24) Worker Hooks

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

### 25) Worker Control

```typescript
await worker.pause();
await worker.resume();
await worker.close();
```

### 26) Worker Metrics

```typescript
const metrics = await worker.getMetrics();
console.log(metrics.processed, metrics.failed, metrics.avgDuration);
```

### 27) Search Jobs

```typescript
const failedJobs = await jobs.search("jobs", {
  status: ["failed"],
  queue: "email",
  limit: 50,
});
```

### 28) Search Queues

```typescript
const queues = await jobs.search("queues", { isPaused: false });
```

### 29) Search Workers

```typescript
const workers = await jobs.search("workers", { queue: "email" });
```

### 30) Shutdown

```typescript
await jobs.shutdown();
```

### 31) Queue Defaults

```typescript
const jobs = IgniterJobs.create()
  .withAdapter(IgniterJobsMemoryAdapter.create())
  .withService("api")
  .withEnvironment("development")
  .withContext(async () => ({ db }))
  .withQueueDefaults({ attempts: 3, removeOnComplete: 100 })
  .addQueue(emailQueue)
  .build();
```

### 32) Worker Defaults

```typescript
const jobs = IgniterJobs.create()
  .withAdapter(IgniterJobsMemoryAdapter.create())
  .withService("api")
  .withEnvironment("development")
  .withContext(async () => ({ db }))
  .withWorkerDefaults({ concurrency: 5 })
  .addQueue(emailQueue)
  .build();
```

### 33) Auto-Start Config (Stored)

```typescript
const jobs = IgniterJobs.create()
  .withAdapter(IgniterJobsMemoryAdapter.create())
  .withService("api")
  .withEnvironment("development")
  .withContext(async () => ({ db }))
  .withAutoStartWorker({ queues: ["email"], concurrency: 2 })
  .addQueue(emailQueue)
  .build();
```

> Note: Auto-start configuration is stored in runtime config; the core runtime does not start workers automatically.

### 34) Job Priority + Delay Combo

```typescript
await jobs.notifications.digest.dispatch({
  input: { userId: "u_1" },
  priority: 25,
  delay: 30_000,
});
```

### 35) Remove-on-Complete Policies

```typescript
const queue = IgniterQueue.create("cleanup")
  .addJob("purge", {
    removeOnComplete: 1000,
    handler: async () => purgeOldItems(),
  })
  .build();
```

### 36) Remove-on-Fail Policies

```typescript
const queue = IgniterQueue.create("sync")
  .addJob("pull", {
    removeOnFail: false,
    handler: async () => pullUpdates(),
  })
  .build();
```

### 37) Custom Metadata Pattern

```typescript
await jobs.email.sendWelcome.dispatch({
  input: { email: "user@example.com" },
  metadata: {
    "ctx.request.id": "req_123",
    "ctx.user.id": "user_456",
  },
});
```

### 38) Scoped Metadata Merge

```typescript
const scoped = jobs.scope("organization", "org_123", { plan: "pro" });
await scoped.email.sendWelcome.dispatch({
  input: { email: "user@example.com" },
  metadata: { "ctx.session.id": "sess_9" },
});
```

### 39) Standard Schema Guard

```typescript
const queue = IgniterQueue.create("webhooks")
  .addJob("ingest", {
    input: schema,
    handler: async ({ input }) => processWebhook(input),
  })
  .build();
```

### 40) Result Mapping Pattern

```typescript
const queue = IgniterQueue.create("billing")
  .addJob("charge", {
    input: z.object({ invoiceId: z.string() }),
    handler: async ({ input }) => {
      const chargeId = await chargeInvoice(input.invoiceId);
      return { chargeId };
    },
  })
  .build();
```

### 41) Idempotency Guard

```typescript
const queue = IgniterQueue.create("orders")
  .addJob("confirm", {
    input: z.object({ orderId: z.string() }),
    handler: async ({ input, context }) => {
      if (await context.orders.isConfirmed(input.orderId)) return;
      await context.orders.confirm(input.orderId);
    },
  })
  .build();
```

### 42) Dead-Letter Alerting

```typescript
const queue = IgniterQueue.create("payments")
  .addJob("capture", {
    attempts: 3,
    input: z.object({ paymentId: z.string() }),
    handler: async ({ input }) => capturePayment(input.paymentId),
    onFailure: async ({ error, isFinalAttempt }) => {
      if (isFinalAttempt) {
        await sendAlert(`Final failure: ${error.message}`);
      }
    },
  })
  .build();
```

### 43) Progress Updates

```typescript
const queue = IgniterQueue.create("import")
  .addJob("csv", {
    input: z.object({ fileId: z.string() }),
    handler: async ({ input }) => {
      await importCsv(input.fileId);
      return { ok: true };
    },
    onProgress: async ({ progress, message }) => {
      console.log(progress, message);
    },
  })
  .build();
```

### 44) Job Logs Inspection

```typescript
const logs = await jobs.email.sendWelcome.get("job-id").logs();
for (const entry of logs) {
  console.log(entry.level, entry.message, entry.timestamp);
}
```

### 45) Queue List with Paging

```typescript
const jobsInQueue = await jobs.email.list({
  status: ["waiting", "active"],
  limit: 20,
  offset: 0,
});
```

### 46) Worker Limiter Pattern

```typescript
const worker = await jobs.worker
  .create()
  .addQueue("emails")
  .withLimiter({ max: 50, duration: 60_000 })
  .start();
```

### 47) Worker Sharding by Queue

```typescript
const workerA = await jobs.worker.create().addQueue("email").start();
const workerB = await jobs.worker.create().addQueue("analytics").start();
```

### 48) Graceful Shutdown in Process

```typescript
process.on("SIGINT", async () => {
  await jobs.shutdown();
  process.exit(0);
});
```

### 49) Global Events to Analytics

```typescript
const unsubscribe = await jobs.subscribe((event) => {
  analytics.track("job_event", {
    type: event.type,
    timestamp: event.timestamp,
    scope: event.scope,
  });
});
```

### 50) Event Filtering Pattern

```typescript
const unsubscribe = await jobs.subscribe((event) => {
  if (event.type.endsWith(":failed")) {
    console.error("Job failed", event.data);
  }
});
```

### 51) SQLite Adapter Usage

```typescript
const adapter = IgniterJobsSQLiteAdapter.create({
  path: "./jobs.sqlite",
  pollingInterval: 500,
  enableWAL: true,
});
```

### 52) SQLite Adapter Persistence

```typescript
const adapter = IgniterJobsSQLiteAdapter.create({ path: "./jobs.sqlite" });
await adapter.dispatch({ queue: "emails", jobName: "send", input: { id: "1" } });
await adapter.shutdown();
```

### 53) Memory Adapter Testing

```typescript
const adapter = IgniterJobsMemoryAdapter.create({ maxJobHistory: 500 });
```

### 54) BullMQ Adapter Usage

```typescript
const adapter = IgniterJobsBullMQAdapter.create({ redis });
```

### 55) Custom Adapter Skeleton

```typescript
class CustomAdapter implements IgniterJobsAdapter {
  readonly client = {};
  readonly queues = null as any;
  async dispatch(params: IgniterJobsAdapterDispatchParams) { return "job-id"; }
  async schedule(params: IgniterJobsAdapterScheduleParams) { return "job-id"; }
  async getJob(jobId: string) { return null; }
  async getJobState(jobId: string) { return null; }
  async getJobLogs(jobId: string) { return []; }
  async getJobProgress(jobId: string) { return 0; }
  async retryJob(jobId: string) { /* ... */ }
  async removeJob(jobId: string) { /* ... */ }
  async promoteJob(jobId: string) { /* ... */ }
  async moveJobToFailed(jobId: string, reason: string) { /* ... */ }
  async retryManyJobs(jobIds: string[]) { /* ... */ }
  async removeManyJobs(jobIds: string[]) { /* ... */ }
  async getQueueInfo(queue: string) { return null; }
  async getQueueJobCounts(queue: string) { return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 }; }
  async listQueues() { return []; }
  async pauseQueue(queue: string) { /* ... */ }
  async resumeQueue(queue: string) { /* ... */ }
  async drainQueue(queue: string) { return 0; }
  async cleanQueue(queue: string, options: IgniterJobsQueueCleanOptions) { return 0; }
  async obliterateQueue(queue: string, options?: { force?: boolean }) { /* ... */ }
  async retryAllInQueue(queue: string) { return 0; }
  async pauseJobType(queue: string, jobName: string) { /* ... */ }
  async resumeJobType(queue: string, jobName: string) { /* ... */ }
  async searchJobs(filter: Record<string, unknown>) { return []; }
  async searchQueues(filter: Record<string, unknown>) { return []; }
  async searchWorkers(filter: Record<string, unknown>) { return []; }
  async createWorker(config: IgniterJobsWorkerBuilderConfig) { return {} as IgniterJobsWorkerHandle; }
  getWorkers() { return new Map(); }
  async publishEvent(channel: string, payload: unknown) { /* ... */ }
  async subscribeEvent(channel: string, handler: IgniterJobsEventHandler) { return async () => {}; }
  registerJob(queueName: string, jobName: string, definition: IgniterJobDefinition<any, any, any>) { /* ... */ }
  registerCron(queueName: string, cronName: string, definition: IgniterCronDefinition<any, any>) { /* ... */ }
  async shutdown() { /* ... */ }
}
```

### 56) Telemetry Integration

```typescript
const telemetry = IgniterTelemetry.create()
  .withService("my-api")
  .withEnvironment("production")
  .addEvents(IgniterJobsTelemetryEvents)
  .build();
```

### 57) Next.js Integration

```typescript
export async function POST() {
  const id = await jobs.email.sendWelcome.dispatch({ input: { email: "user@example.com" } });
  return NextResponse.json({ jobId: id });
}
```

### 58) Express Integration

```typescript
app.post("/send", async (_req, res) => {
  const jobId = await jobs.email.sendWelcome.dispatch({ input: { email: "user@example.com" } });
  res.json({ jobId });
});
```

### 59) Fastify Integration

```typescript
app.post("/send", async (_req, res) => {
  const jobId = await jobs.email.sendWelcome.dispatch({ input: { email: "user@example.com" } });
  return res.send({ jobId });
});
```

### 60) Server-Only Safety

```typescript
// Import @igniter-js/jobs only in server environments.
// Client bundles will throw a server-only error from the shim.
```

---

## 🧠 Input Validation

`@igniter-js/jobs` supports **Standard Schema V1** and **Zod-like** schemas.

### Standard Schema V1

```typescript
import { type StandardSchemaV1 } from "@igniter-js/common";

const schema: StandardSchemaV1<{ email: string }, { email: string }> = {
  "~standard": {
    validate: async (value) => {
      if (!value || typeof (value as any).email !== "string") {
        return { issues: [{ message: "email is required" }] } as any;
      }
      return { value } as any;
    },
  },
};

const queue = IgniterQueue.create("email")
  .addJob("send", {
    input: schema,
    handler: async ({ input }) => {
      // input is validated and typed
      await sendEmail(input.email);
    },
  })
  .build();
```

### Zod Schema

```typescript
import { z } from "zod";

const queue = IgniterQueue.create("email")
  .addJob("send", {
    input: z.object({ email: z.string().email() }),
    handler: async ({ input }) => {
      await sendEmail(input.email);
    },
  })
  .build();
```

---

## 🧩 Hooks & Lifecycle

Jobs support lifecycle hooks defined in the job definition:

- `onStart`
- `onProgress`
- `onSuccess`
- `onFailure`

### Hook Example

```typescript
const queue = IgniterQueue.create("billing")
  .addJob("charge", {
    input: z.object({ invoiceId: z.string() }),
    handler: async ({ input }) => {
      return chargeInvoice(input.invoiceId);
    },
    onStart: async ({ job }) => {
      await audit.log("billing.started", { id: job.id });
    },
    onProgress: async ({ progress }) => {
      await audit.log("billing.progress", { progress });
    },
    onSuccess: async ({ result }) => {
      await audit.log("billing.success", { result });
    },
    onFailure: async ({ error, isFinalAttempt }) => {
      await audit.log("billing.failed", {
        message: error.message,
        isFinalAttempt,
      });
    },
  })
  .build();
```

---

## ⏱ Scheduling Options

Scheduling options come from `IgniterJobsScheduleOptions` and can be used in `.schedule()`.

### Cron Scheduling

```typescript
await jobs.reports.dailySummary.schedule({
  input: { timezone: "UTC" },
  cron: "0 2 * * *",
  tz: "UTC",
});
```

### Fixed Interval

```typescript
await jobs.analytics.rollup.schedule({
  input: { hours: 24 },
  every: 60 * 60 * 1000,
  maxExecutions: 24,
});
```

### Skip Weekends

```typescript
await jobs.notifications.weekdayDigest.schedule({
  input: { userId: "u_1" },
  cron: "0 8 * * *",
  skipWeekends: true,
});
```

### Business Hours Only

```typescript
await jobs.support.assign.schedule({
  input: { ticketId: "t_1" },
  cron: "*/15 * * * *",
  onlyBusinessHours: true,
  businessHours: { start: 9, end: 17, timezone: "America/New_York" },
});
```

---

## 🔭 Telemetry

Telemetry events are exported via the **telemetry subpath**:

```typescript
import { IgniterTelemetry } from "@igniter-js/telemetry";
import { IgniterJobsTelemetryEvents } from "@igniter-js/jobs/telemetry";

const telemetry = IgniterTelemetry.create()
  .withService("my-api")
  .withEnvironment("production")
  .addEvents(IgniterJobsTelemetryEvents)
  .build();

const jobs = IgniterJobs.create()
  .withTelemetry(telemetry)
  .withAdapter(IgniterJobsMemoryAdapter.create())
  .withService("my-api")
  .withEnvironment("production")
  .withContext(async () => ({ db }))
  .addQueue(emailQueue)
  .build();
```

### Job Telemetry Events

- `igniter.jobs.job.enqueued`
- `igniter.jobs.job.started`
- `igniter.jobs.job.completed`
- `igniter.jobs.job.failed`
- `igniter.jobs.job.progress`
- `igniter.jobs.job.scheduled`

> Note: `igniter.jobs.job.retrying` exists in the telemetry schema for future parity, but the runtime does not emit it today.

### Worker Telemetry Events

- `igniter.jobs.worker.started`
- `igniter.jobs.worker.stopped`
- `igniter.jobs.worker.idle`
- `igniter.jobs.worker.paused`
- `igniter.jobs.worker.resumed`

### Queue Telemetry Events

- `igniter.jobs.queue.paused`
- `igniter.jobs.queue.resumed`
- `igniter.jobs.queue.drained`
- `igniter.jobs.queue.cleaned`
- `igniter.jobs.queue.obliterated`

---

## 🔌 Adapters

Adapters implement the `IgniterJobsAdapter` interface and are exported via:

```typescript
import { IgniterJobsMemoryAdapter, IgniterJobsSQLiteAdapter, IgniterJobsBullMQAdapter } from "@igniter-js/jobs/adapters";
```

### Adapter Comparison

| Adapter | Persistence | Multi-process | Use Case |
|--------|-------------|---------------|---------|
| Memory | ❌ | ❌ | Unit tests, local dev |
| SQLite | ✅ | ⚠️ (single process) | Desktop, CLI, local |
| BullMQ | ✅ | ✅ | Production scale |

### Memory Adapter

```typescript
import { IgniterJobsMemoryAdapter } from "@igniter-js/jobs/adapters";

const adapter = IgniterJobsMemoryAdapter.create();
```

### SQLite Adapter

```typescript
import { IgniterJobsSQLiteAdapter } from "@igniter-js/jobs/adapters";

const adapter = IgniterJobsSQLiteAdapter.create({
  path: "./data/jobs.sqlite",
  pollingInterval: 500,
  enableWAL: true,
});
```

### BullMQ Adapter

```typescript
import { IgniterJobsBullMQAdapter } from "@igniter-js/jobs/adapters";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);
const adapter = IgniterJobsBullMQAdapter.create({ redis });
```

---

## 🧪 Testing

### Unit Testing with Memory Adapter

```typescript
import { describe, it, expect } from "vitest";
import { IgniterJobs, IgniterQueue } from "@igniter-js/jobs";
import { IgniterJobsMemoryAdapter } from "@igniter-js/jobs/adapters";

describe("jobs", () => {
  it("dispatches and processes a job", async () => {
    const queue = IgniterQueue.create("email")
      .addJob("send", {
        handler: async ({ input }) => `sent:${(input as any).id}`,
      })
      .build();

    const jobs = IgniterJobs.create()
      .withAdapter(IgniterJobsMemoryAdapter.create())
      .withService("test")
      .withEnvironment("test")
      .withContext(async () => ({}))
      .addQueue(queue)
      .build();

    const worker = await jobs.worker.create().addQueue("email").start();
    const id = await jobs.email.send.dispatch({ input: { id: "1" } });

    await new Promise((r) => setTimeout(r, 20));

    const job = await jobs.email.send.get(id).retrieve();
    expect(job?.status).toBe("completed");
    await worker.close();
  });
});
```

    ---

    ## 📦 Adapter Deep Dives

    ### Memory Adapter

    Use for unit tests and local dev. It stores everything in memory and supports all management APIs.

    Key traits:

    - Fast, deterministic execution
    - Single-process only
    - Data lost on restart
    - Great for CI and tests

    ```typescript
    const adapter = IgniterJobsMemoryAdapter.create({ maxJobHistory: 1000 });
    ```

    ### SQLite Adapter

    Use for desktop apps, CLI tools, or local persistence without Redis.

    Key traits:

    - Persistent storage on disk
    - Single-process (WAL helps but not distributed)
    - Polling-based worker loop
    - Great for edge or MCP servers

    ```typescript
    const adapter = IgniterJobsSQLiteAdapter.create({
      path: "./data/jobs.sqlite",
      pollingInterval: 500,
      enableWAL: true,
    });
    ```

    ### BullMQ Adapter

    Use for production and distributed workers. Wraps `@igniter-js/adapter-bullmq`.

    Key traits:

    - Redis-backed persistence
    - Distributed workers
    - Advanced scheduling
    - Strong throughput

    ```typescript
    const adapter = IgniterJobsBullMQAdapter.create({ redis });
    ```

    Known limitations:

    - Pause/resume for a single job type is not supported; pause the whole queue instead.

    ---

    ## 📊 Observability & Events

    ### Event Types

    Jobs events are emitted through the adapter pub/sub channel and are scoped by service, environment, and optional scope.

    Examples:

    - `email:sendWelcome:enqueued`
    - `email:sendWelcome:started`
    - `email:sendWelcome:completed`
    - `email:sendWelcome:failed`
    - `email:sendWelcome:progress`

    ### Event Channel Composition

    The runtime builds the channel using service, environment, and scope metadata. Scoped instances use a scope-specific channel, ensuring multi-tenant isolation.

    ---

    ## 📈 Performance & Scaling

    ### Queue Sizing Tips

    - Keep payloads small and store large blobs in external storage.
    - Use `priority` for latency-sensitive work.
    - Set `attempts` and `delay` to smooth burst failures.

    ### Worker Scaling Tips

    - Start with low `concurrency`, then scale after measuring throughput.
    - Use `withLimiter()` for API-bound workloads.
    - Shard by queue when jobs have very different resource needs.

    ### Polling (SQLite)

    - Lower `pollingInterval` means faster reaction but higher CPU.
    - Higher `pollingInterval` reduces CPU at the cost of latency.

    ---

    ## 🧾 Error Code Library

    Each error code is defined in `IGNITER_JOBS_ERROR_CODES`.

    ### JOBS_ADAPTER_REQUIRED

    - **Context:** `IgniterJobsBuilder.build()`
    - **Cause:** Adapter not configured.
    - **Mitigation:** Always call `.withAdapter()`.
    - **Solution:**
      ```typescript
      IgniterJobs.create().withAdapter(IgniterJobsMemoryAdapter.create())
      ```

    ### JOBS_SERVICE_REQUIRED

    - **Context:** `IgniterJobsBuilder.build()`
    - **Cause:** Service name not configured.
    - **Mitigation:** Always call `.withService()`.
    - **Solution:**
      ```typescript
      IgniterJobs.create().withService("my-api")
      ```

    ### JOBS_CONTEXT_REQUIRED

    - **Context:** `IgniterJobsBuilder.build()`
    - **Cause:** Context factory not configured.
    - **Mitigation:** Always call `.withContext()`.
    - **Solution:**
      ```typescript
      IgniterJobs.create().withContext(async () => ({ db }))
      ```

    ### JOBS_CONFIGURATION_INVALID

    - **Context:** Builder or runtime validation.
    - **Cause:** Invalid environment, scope conflicts, or invalid options.
    - **Mitigation:** Validate inputs and ensure scope consistency.
    - **Solution:** Check builder inputs, then retry.

    ### JOBS_QUEUE_NOT_FOUND

    - **Context:** Worker builder or adapter dispatch.
    - **Cause:** Queue name not registered.
    - **Mitigation:** Ensure `.addQueue()` includes the queue.
    - **Solution:** Register the queue before building.

    ### JOBS_QUEUE_DUPLICATE

    - **Context:** `IgniterJobsBuilder.addQueue()`
    - **Cause:** Duplicate queue name.
    - **Mitigation:** Use unique queue names.
    - **Solution:** Rename the queue.

    ### JOBS_QUEUE_OPERATION_FAILED

    - **Context:** Adapter queue operations.
    - **Cause:** Unsupported operation (e.g., BullMQ job-type pause).
    - **Mitigation:** Use queue-level pause.
    - **Solution:** Pause the whole queue or adjust worker filters.

    ### JOBS_INVALID_DEFINITION

    - **Context:** Queue builder `addJob()`
    - **Cause:** Invalid job definition object.
    - **Mitigation:** Ensure `handler` exists.
    - **Solution:** Provide a valid job definition.

    ### JOBS_HANDLER_REQUIRED

    - **Context:** Queue builder `addJob()` or `addCron()`
    - **Cause:** Missing handler function.
    - **Mitigation:** Provide a valid handler.
    - **Solution:** Add `handler: async () => { ... }`.

    ### JOBS_DUPLICATE_JOB

    - **Context:** Queue builder `addJob()`
    - **Cause:** Duplicate job name in same queue.
    - **Mitigation:** Use unique job names.
    - **Solution:** Rename the job.

    ### JOBS_NOT_FOUND

    - **Context:** Job retrieval
    - **Cause:** Invalid job id or retention policy cleaned it.
    - **Mitigation:** Keep job ids and tune retention.
    - **Solution:** Re-dispatch or adjust retention settings.

    ### JOBS_NOT_REGISTERED

    - **Context:** Worker execution
    - **Cause:** Worker executing a job that wasn’t registered.
    - **Mitigation:** Ensure build() ran and registration completed.
    - **Solution:** Restart worker with correct config.

    ### JOBS_EXECUTION_FAILED

    - **Context:** Handler execution
    - **Cause:** Handler throws.
    - **Mitigation:** Add retries and guard logic.
    - **Solution:** Fix business logic or add `onFailure`.

    ### JOBS_TIMEOUT

    - **Context:** Adapter-specific worker
    - **Cause:** Job exceeded timeout.
    - **Mitigation:** Reduce job scope or increase timeout in adapter.
    - **Solution:** Split job or adjust adapter settings.

    ### JOBS_CONTEXT_FACTORY_FAILED

    - **Context:** Context factory
    - **Cause:** Factory threw an error.
    - **Mitigation:** Make factory resilient and guarded.
    - **Solution:** Wrap with try/catch and verify dependencies.

    ### JOBS_VALIDATION_FAILED

    - **Context:** Dispatch or execution
    - **Cause:** Input schema mismatch.
    - **Mitigation:** Validate before dispatch.
    - **Solution:** Fix input shape or schema.

    ### JOBS_INVALID_INPUT

    - **Context:** Runtime
    - **Cause:** Malformed data for job input.
    - **Mitigation:** Validate upstream.
    - **Solution:** Fix caller input.

    ### JOBS_INVALID_CRON

    - **Context:** Queue builder `addCron()`
    - **Cause:** Invalid cron syntax or duplicate name.
    - **Mitigation:** Validate cron expressions.
    - **Solution:** Correct cron string.

    ### JOBS_INVALID_SCHEDULE

    - **Context:** `schedule()`
    - **Cause:** Invalid scheduling params (e.g., past date).
    - **Mitigation:** Validate dates.
    - **Solution:** Use future date.

    ### JOBS_SCOPE_ALREADY_DEFINED

    - **Context:** Builder `addScope()`
    - **Cause:** Multiple scopes defined.
    - **Mitigation:** Single scope only.
    - **Solution:** Remove extra scope.

    ### JOBS_WORKER_FAILED

    - **Context:** Worker lifecycle
    - **Cause:** Adapter or worker error.
    - **Mitigation:** Monitor worker health.
    - **Solution:** Restart worker and verify backend.

    ### JOBS_ADAPTER_ERROR

    - **Context:** Adapter operations
    - **Cause:** Backend failure.
    - **Mitigation:** Monitor backend health.
    - **Solution:** Retry or failover.

    ### JOBS_ADAPTER_CONNECTION_FAILED

    - **Context:** Adapter connection
    - **Cause:** Redis or database unreachable.
    - **Mitigation:** Check network.
    - **Solution:** Restore connectivity.

    ### JOBS_SUBSCRIBE_FAILED

    - **Context:** Event subscriptions
    - **Cause:** Pub/sub connection failure.
    - **Mitigation:** Reconnect on failures.
    - **Solution:** Restart subscriber or adapter.

    ---

    ## 📘 Appendix: Field-by-Field Reference

    ### IgniterJobsBuilder State (Conceptual)

    - `adapter`
    - `service`
    - `environment`
    - `contextFactory`
    - `queues`
    - `scopeDefinition`
    - `queueDefaults`
    - `workerDefaults`
    - `autoStartWorker`
    - `logger`
    - `telemetry`

    ### IgniterJobDefinition Fields

    - `input`
    - `output`
    - `queue`
    - `handler`
    - `onStart`
    - `onProgress`
    - `onSuccess`
    - `onFailure`
    - `jobId`
    - `priority`
    - `delay`
    - `attempts`
    - `removeOnComplete`
    - `removeOnFail`
    - `metadata`
    - `limiter`

    ### IgniterCronDefinition Fields

    - `cron`
    - `tz`
    - `maxExecutions`
    - `skipWeekends`
    - `onlyBusinessHours`
    - `businessHours`
    - `onlyWeekdays`
    - `skipDates`
    - `startDate`
    - `endDate`
    - `handler`

    ### IgniterJobsScheduleOptions Fields

    - `at`
    - `delay`
    - `cron`
    - `every`
    - `maxExecutions`
    - `tz`
    - `skipWeekends`
    - `businessHours`
    - `onlyBusinessHours`
    - `onlyWeekdays`
    - `skipDates`

    ### IgniterJobsExecutionContext Fields

    - `input`
    - `context`
    - `job.id`
    - `job.name`
    - `job.queue`
    - `job.attemptsMade`
    - `job.createdAt`
    - `job.metadata`
    - `scope`

    ### IgniterJobsHookContext Fields

    - `startedAt`
    - `duration`

    ### IgniterJobsQueueInfo Fields

    - `name`
    - `isPaused`
    - `jobCounts.waiting`
    - `jobCounts.active`
    - `jobCounts.completed`
    - `jobCounts.failed`
    - `jobCounts.delayed`
    - `jobCounts.paused`

    ### IgniterJobSearchResult Fields

    - `id`
    - `name`
    - `queue`
    - `status`
    - `input`
    - `result`
    - `error`
    - `progress`
    - `attemptsMade`
    - `priority`
    - `createdAt`
    - `startedAt`
    - `completedAt`
    - `metadata`
    - `scope`

    ### IgniterJobsWorkerMetrics Fields

    - `processed`
    - `failed`
    - `avgDuration`
    - `concurrency`
    - `uptime`

    ### IgniterJobsWorkerHandle Fields

    - `id`
    - `queues`
    - `pause()`
    - `resume()`
    - `close()`
    - `isRunning()`
    - `isPaused()`
    - `isClosed()`
    - `getMetrics()`

    ### IgniterJobsAdapter Methods

    - `dispatch()`
    - `schedule()`
    - `getJob()`
    - `getJobState()`
    - `getJobLogs()`
    - `getJobProgress()`
    - `retryJob()`
    - `removeJob()`
    - `promoteJob()`
    - `moveJobToFailed()`
    - `retryManyJobs()`
    - `removeManyJobs()`
    - `getQueueInfo()`
    - `getQueueJobCounts()`
    - `listQueues()`
    - `pauseQueue()`
    - `resumeQueue()`
    - `drainQueue()`
    - `cleanQueue()`
    - `obliterateQueue()`
    - `retryAllInQueue()`
    - `pauseJobType()`
    - `resumeJobType()`
    - `searchJobs()`
    - `searchQueues()`
    - `searchWorkers()`
    - `createWorker()`
    - `getWorkers()`
    - `publishEvent()`
    - `subscribeEvent()`
    - `registerJob()`
    - `registerCron()`
    - `shutdown()`

    ### IgniterJobsEvent Fields

    - `type`
    - `data`
    - `timestamp`
    - `scope`

    ### IgniterJobsScopeEntry Fields

    - `type`
    - `id`
    - `tags`

---

## 🌍 Real-World Examples

### 1) E-commerce: Order Expiry

Cancel unpaid orders after 1 hour.

```typescript
const ordersQueue = IgniterQueue.create("orders")
  .addJob("cancelUnpaid", {
    input: z.object({ orderId: z.string() }),
    handler: async ({ input, context }) => {
      await context.orders.cancelIfUnpaid(input.orderId);
    },
  })
  .build();

await jobs.orders.cancelUnpaid.schedule({
  input: { orderId: "ord_123" },
  delay: 60 * 60 * 1000,
});
```

### 2) Fintech: Nightly Reconciliation

Batch reconcile bank transactions every night.

```typescript
const reconQueue = IgniterQueue.create("reconciliation")
  .addCron("nightly", {
    cron: "0 3 * * *",
    handler: async ({ context }) => {
      await context.reconcile.runNightly();
    },
  })
  .build();
```

### 3) SaaS: CSV Import with Progress

```typescript
const importQueue = IgniterQueue.create("imports")
  .addJob("csv", {
    input: z.object({ fileId: z.string() }),
    handler: async ({ input, context }) => {
      const rows = await context.files.readCsv(input.fileId);
      for (let i = 0; i < rows.length; i++) {
        await context.imports.processRow(rows[i]);
        await context.imports.progress(i / rows.length);
      }
      return { processed: rows.length };
    },
  })
  .build();
```

### 4) Media Platform: Video Transcoding

```typescript
const mediaQueue = IgniterQueue.create("media")
  .addJob("transcode", {
    input: z.object({ assetId: z.string(), preset: z.string() }),
    handler: async ({ input, context }) => {
      await context.media.transcode(input.assetId, input.preset);
    },
  })
  .build();

await jobs.media.transcode.dispatch({
  input: { assetId: "vid_1", preset: "1080p" },
  priority: 10,
});
```

### 5) Healthcare: Appointment Reminders

```typescript
const remindersQueue = IgniterQueue.create("reminders")
  .addJob("appointment", {
    input: z.object({ appointmentId: z.string(), at: z.string() }),
    handler: async ({ input, context }) => {
      await context.reminders.sendAppointment(input.appointmentId);
    },
  })
  .build();

await jobs.reminders.appointment.schedule({
  input: { appointmentId: "apt_1", at: "2026-02-10T10:00:00Z" },
  at: new Date("2026-02-09T10:00:00Z"),
});
```

### 6) Marketplace: Fraud Review Queue

```typescript
const fraudQueue = IgniterQueue.create("fraud")
  .addJob("review", {
    input: z.object({ transactionId: z.string() }),
    handler: async ({ input, context }) => {
      await context.risk.reviewTransaction(input.transactionId);
    },
  })
  .build();

await jobs.fraud.review.dispatch({
  input: { transactionId: "txn_99" },
  priority: 100,
});
```

### 7) DevOps: Cleanup Jobs

```typescript
const cleanupQueue = IgniterQueue.create("maintenance")
  .addCron("cleanupUploads", {
    cron: "0 4 * * 0",
    handler: async ({ context }) => {
      await context.storage.cleanupOrphans();
    },
  })
  .build();
```

---

## 📚 API Reference

### IgniterJobs (Factory)

```typescript
export const IgniterJobs: {
  create: () => IgniterJobsBuilder<unknown>;
};
```

### IgniterJobsBuilder

```typescript
class IgniterJobsBuilder<TContext, TQueues, TScope> {
  static create(): IgniterJobsBuilder<unknown>;

  withAdapter(adapter: IgniterJobsAdapter): IgniterJobsBuilder<TContext, TQueues, TScope>;
  withService(service: string): IgniterJobsBuilder<TContext, TQueues, TScope>;
  withEnvironment(environment: string): IgniterJobsBuilder<TContext, TQueues, TScope>;
  withContext<TNewContext>(factory: () => TNewContext | Promise<TNewContext>): IgniterJobsBuilder<TNewContext, {}, TScope>;
  addScope(name: string, options?: IgniterJobsScopeOptions): IgniterJobsBuilder<TContext, TQueues, TScope | string>;
  addQueue(queue: IgniterJobsQueue<TContext, any, any> & { name: string }): IgniterJobsBuilder<TContext, TQueues & Record<string, any>, TScope>;
  withQueueDefaults(defaults: Partial<IgniterJobDefinition<TContext, any, any>>): IgniterJobsBuilder<TContext, TQueues, TScope>;
  withWorkerDefaults(defaults: Partial<IgniterJobsWorkerBuilderConfig>): IgniterJobsBuilder<TContext, TQueues, TScope>;
  withAutoStartWorker(config: { queues: (keyof TQueues)[]; concurrency?: number; limiter?: IgniterJobsLimiter }): IgniterJobsBuilder<TContext, TQueues, TScope>;
  withTelemetry(telemetry: IgniterJobsTelemetry): IgniterJobsBuilder<TContext, TQueues, TScope>;
  withLogger(logger: IgniterLogger): IgniterJobsBuilder<TContext, TQueues, TScope>;
  build(): IgniterJobsRuntime<IgniterJobsConfig<TContext, TQueues, TScope>>;
}
```

> Note: `queueDefaults`, `workerDefaults`, and `autoStartWorker` are stored in the runtime configuration.

### IgniterQueue

```typescript
class IgniterQueue {
  static create<const TName extends string>(name: TName): IgniterQueueBuilder<unknown, {}, {}, TName>;
}
```

### IgniterQueueBuilder

```typescript
class IgniterQueueBuilder<TContext, TJobs, TCron, TName> {
  addJob<TJobName extends string, TInput, TResult>(
    jobName: TJobName,
    definition: IgniterJobDefinition<TContext, TInput, TResult>
  ): IgniterQueueBuilder<TContext, TJobs & Record<TJobName, IgniterJobDefinition<TContext, TInput, TResult>>, TCron, TName>;

  addCron<TCronName extends string, TResult>(
    cronName: TCronName,
    definition: IgniterCronDefinition<TContext, TResult>
  ): IgniterQueueBuilder<TContext, TJobs, TCron & Record<TCronName, IgniterCronDefinition<TContext, TResult>>, TName>;

  build(): IgniterJobsQueue<TContext, TJobs, TCron> & { name: TName };
}
```

### Runtime Methods

```typescript
interface IgniterJobsRuntime<TConfig> {
  config: TConfig;
  subscribe(handler: IgniterJobsEventHandler): Promise<() => Promise<void>>;
  search(target: "jobs" | "queues" | "workers", filter: Record<string, unknown>): Promise<unknown[]>;
  shutdown(): Promise<void>;
  worker: { create(): IgniterWorkerBuilder<keyof TConfig["queues"] & string> };
  scope(type: string, id: string | number, tags?: Record<string, unknown>): IgniterJobsRuntime<TConfig>;

  // Queue accessors (dynamic)
  [queueName: string]: IgniterJobsQueueAccessor<any>;
}
```

### Queue Accessor

```typescript
interface IgniterJobsQueueAccessor {
  get(): {
    retrieve(): Promise<IgniterJobsQueueInfo | null>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    drain(): Promise<number>;
    clean(options: IgniterJobsQueueCleanOptions): Promise<number>;
    obliterate(options?: { force?: boolean }): Promise<void>;
    retryAll(): Promise<number>;
  };
  list(filter?: { status?: IgniterJobStatus[]; limit?: number; offset?: number }): Promise<IgniterJobSearchResult[]>;
  subscribe(handler: IgniterJobsEventHandler): Promise<() => Promise<void>>;
  jobs: Record<string, IgniterJobsJobAccessor>;
}
```

### Job Accessor

```typescript
interface IgniterJobsJobAccessor<TInput = unknown> {
  dispatch(params: IgniterJobsDispatchParams<TInput>): Promise<string>;
  schedule(params: IgniterJobsScheduleParams<TInput>): Promise<string>;
  get(id: string): {
    retrieve(): Promise<IgniterJobSearchResult | null>;
    retry(): Promise<void>;
    remove(): Promise<void>;
    promote(): Promise<void>;
    move(state: "failed", reason: string): Promise<void>;
    state(): Promise<IgniterJobStatus | null>;
    progress(): Promise<number>;
    logs(): Promise<IgniterJobsJobLog[]>;
  };
  many(ids: string[]): { retry(): Promise<void>; remove(): Promise<void> };
  pause(): Promise<void>;
  resume(): Promise<void>;
  subscribe(handler: IgniterJobsEventHandler): Promise<() => Promise<void>>;
}
```

### Worker Builder

```typescript
interface IgniterJobsWorkerFluentBuilder<TQueueNames extends string> {
  addQueue(queue: TQueueNames): IgniterJobsWorkerFluentBuilder<TQueueNames>;
  withConcurrency(concurrency: number): IgniterJobsWorkerFluentBuilder<TQueueNames>;
  withLimiter(limiter: IgniterJobsLimiter): IgniterJobsWorkerFluentBuilder<TQueueNames>;
  onActive(handler: (ctx: { job: IgniterJobSearchResult }) => void | Promise<void>): IgniterJobsWorkerFluentBuilder<TQueueNames>;
  onSuccess(handler: (ctx: { job: IgniterJobSearchResult; result: unknown }) => void | Promise<void>): IgniterJobsWorkerFluentBuilder<TQueueNames>;
  onFailure(handler: (ctx: { job: IgniterJobSearchResult; error: Error }) => void | Promise<void>): IgniterJobsWorkerFluentBuilder<TQueueNames>;
  onIdle(handler: () => void | Promise<void>): IgniterJobsWorkerFluentBuilder<TQueueNames>;
  start(): Promise<IgniterJobsWorkerHandle>;
}
```

---

## ⚙️ Configuration Reference

### IgniterJobsSQLiteAdapterOptions

```typescript
interface IgniterJobsSQLiteAdapterOptions {
  path: string;
  pollingInterval?: number; // default: 500
  enableWAL?: boolean; // default: true
}
```

### IgniterJobsScheduleOptions

```typescript
interface IgniterJobsScheduleOptions {
  at?: Date;
  delay?: number;
  cron?: string;
  every?: number;
  maxExecutions?: number;
  tz?: string;
  skipWeekends?: boolean;
  businessHours?: { start: number; end: number; timezone?: string };
  onlyBusinessHours?: boolean;
  onlyWeekdays?: number[];
  skipDates?: Array<string | Date>;
}
```

---

## ✅ Best Practices

| Do | Why | Example |
|----|-----|---------|
| ✅ Use input schemas | Prevent invalid jobs | `input: z.object({ ... })` |
| ✅ Keep payloads small | Faster serialization | `{ id: "order_1" }` |
| ✅ Use scopes | Tenant isolation | `jobs.scope("org", "org_1")` |
| ✅ Use retries | Resilience | `attempts: 5` |
| ✅ Use worker hooks | Observability | `onFailure(...)` |

### Anti-Patterns

| Don’t | Why | Alternative |
|------|-----|-------------|
| ❌ Store PII in metadata | Metadata is observable | Store IDs only |
| ❌ Use sync I/O in handlers | Blocks workers | Use async I/O |
| ❌ Dispatch without schema | Runtime surprises | Add `input` schema |
| ❌ Long-running jobs without progress | No visibility | Use `onProgress` |

---

## 🧯 Troubleshooting

### JOBS_ADAPTER_REQUIRED

**Cause:** No adapter configured.  
**Fix:** Call `.withAdapter(...)`.

### JOBS_SERVICE_REQUIRED

**Cause:** Missing service name.  
**Fix:** Call `.withService("my-service")`.

### JOBS_CONTEXT_REQUIRED

**Cause:** Missing context factory.  
**Fix:** Call `.withContext(() => ({ ... }))`.

### JOBS_INVALID_SCHEDULE

**Cause:** `at` time is in the past.  
**Fix:** Use a future date.

### JOBS_QUEUE_OPERATION_FAILED

**Cause:** BullMQ adapter cannot pause a single job type.  
**Fix:** Pause the entire queue or filter queues per worker.

---

## 🧩 Framework Integration

### Next.js API Route

```typescript
// app/api/queue/route.ts
import { NextResponse } from "next/server";
import { jobs } from "@/lib/jobs";

export async function POST() {
  const id = await jobs.email.sendWelcome.dispatch({
    input: { email: "user@example.com" },
  });
  return NextResponse.json({ jobId: id });
}
```

### Express

```typescript
import express from "express";
import { jobs } from "./jobs";

const app = express();
app.post("/send", async (_req, res) => {
  const jobId = await jobs.email.sendWelcome.dispatch({
    input: { email: "user@example.com" },
  });
  res.json({ jobId });
});
```

### Fastify

```typescript
import Fastify from "fastify";
import { jobs } from "./jobs";

const app = Fastify();
app.post("/send", async (_req, res) => {
  const jobId = await jobs.email.sendWelcome.dispatch({
    input: { email: "user@example.com" },
  });
  return res.send({ jobId });
});
```

---

## 🔐 Server-Only Safety

`@igniter-js/jobs` is server-only. Browser builds resolve to a shim that throws an explicit error.  
Do not import this package in client-side bundles.

---

## 🧭 Migration Guides

### Memory → SQLite

```typescript
import { IgniterJobsSQLiteAdapter } from "@igniter-js/jobs/adapters";

const adapter = IgniterJobsSQLiteAdapter.create({
  path: "./jobs.sqlite",
});
```

### SQLite → BullMQ

```typescript
import { IgniterJobsBullMQAdapter } from "@igniter-js/jobs/adapters";
import Redis from "ioredis";

const adapter = IgniterJobsBullMQAdapter.create({
  redis: new Redis(process.env.REDIS_URL),
});
```

---

## ❓ FAQ

### Which adapter should I use?

- **Memory** — Unit tests and local development.
- **SQLite** — CLI tools, desktop apps, local environments.
- **BullMQ** — Production and distributed workers.

### Does `@igniter-js/jobs` require Redis?

No. Redis is only required for the BullMQ adapter.

### Can I use multiple queues in one runtime?

Yes. Add as many queues as you need via `.addQueue(...)`.

### Can I switch adapters later?

Yes. The adapter interface is stable and jobs/queues remain unchanged.

---

## 🧪 Full Example (SQLite + Worker)

```typescript
import { IgniterJobs, IgniterQueue } from "@igniter-js/jobs";
import { IgniterJobsSQLiteAdapter } from "@igniter-js/jobs/adapters";
import { z } from "zod";

type AppContext = { uploads: { process: (id: string) => Promise<void> } };

const queue = IgniterQueue.create("uploads")
  .addJob("process", {
    input: z.object({ id: z.string() }),
    handler: async ({ input, context }) => {
      await context.uploads.process(input.id);
    },
  })
  .build();

const jobs = IgniterJobs.create()
  .withAdapter(IgniterJobsSQLiteAdapter.create({ path: "./jobs.sqlite" }))
  .withService("uploader")
  .withEnvironment("local")
  .withContext(async () => ({ uploads }))
  .addQueue(queue)
  .build();

const worker = await jobs.worker.create().addQueue("uploads").start();

const id = await jobs.uploads.process.dispatch({ input: { id: "file_1" } });
console.log("dispatched", id);

await new Promise((r) => setTimeout(r, 500));

const job = await jobs.uploads.process.get(id).retrieve();
console.log(job?.status);

await worker.close();
await jobs.shutdown();
```

---

## 📑 Appendix: Event Matrix

### Job Events (Runtime)

| Event | When | Payload Keys |
|------|------|--------------|
| `enqueued` | After dispatch | `jobId`, `queue`, `jobName` |
| `scheduled` | After schedule | `jobId`, `queue`, `jobName` |
| `started` | Before handler | `jobId`, `jobName`, `queue`, `attemptsMade`, `startedAt` |
| `completed` | After handler | `jobId`, `jobName`, `queue`, `result`, `duration`, `completedAt` |
| `failed` | On error | `jobId`, `jobName`, `queue`, `error`, `attemptsMade`, `isFinalAttempt`, `duration`, `failedAt` |
| `progress` | On progress hook | `jobId`, `jobName`, `queue`, `progress`, `message`, `timestamp` |

### Telemetry Event Attributes

#### Job Group

- `ctx.job.id`
- `ctx.job.name`
- `ctx.job.queue`
- `ctx.job.priority`
- `ctx.job.delay`
- `ctx.job.attempt`
- `ctx.job.maxAttempts`
- `ctx.job.duration`
- `ctx.job.error.message`
- `ctx.job.error.code`
- `ctx.job.isFinalAttempt`
- `ctx.job.progress`
- `ctx.job.progress.message`
- `ctx.job.scheduledAt`
- `ctx.job.cron`

#### Worker Group

- `ctx.worker.id`
- `ctx.worker.queues`
- `ctx.worker.concurrency`
- `ctx.worker.processed`
- `ctx.worker.failed`
- `ctx.worker.uptime`

#### Queue Group

- `ctx.queue.name`
- `ctx.queue.drained.count`
- `ctx.queue.cleaned.count`
- `ctx.queue.cleaned.status`
- `ctx.queue.obliterated.force`

---

## 📑 Appendix: Adapter API Matrix

| API | Memory | SQLite | BullMQ |
|-----|--------|--------|--------|
| `dispatch()` | ✅ | ✅ | ✅ |
| `schedule()` | ✅ | ✅ | ✅ |
| `getJob()` | ✅ | ✅ | ✅ |
| `getJobState()` | ✅ | ✅ | ✅ |
| `getJobLogs()` | ✅ | ✅ | ✅ |
| `getJobProgress()` | ✅ | ✅ | ✅ |
| `pauseJobType()` | ✅ | ✅ | ❌ |
| `resumeJobType()` | ✅ | ✅ | ❌ |
| `pauseQueue()` | ✅ | ✅ | ✅ |
| `resumeQueue()` | ✅ | ✅ | ✅ |
| `drainQueue()` | ✅ | ✅ | ✅ |
| `cleanQueue()` | ✅ | ✅ | ✅ |
| `obliterateQueue()` | ✅ | ✅ | ✅ |
| `retryAllInQueue()` | ✅ | ✅ | ✅ |

---

## 📑 Appendix: Method-by-Method Examples

### Adapter `dispatch()`

```typescript
await adapter.dispatch({
  queue: "email",
  jobName: "send",
  input: { id: "1" },
  priority: 10,
});
```

### Adapter `schedule()`

```typescript
await adapter.schedule({
  queue: "email",
  jobName: "send",
  input: { id: "1" },
  delay: 5_000,
});
```

### Adapter `getQueueInfo()`

```typescript
const info = await adapter.getQueueInfo("email");
```

### Adapter `getQueueJobCounts()`

```typescript
const counts = await adapter.getQueueJobCounts("email");
```

### Adapter `pauseQueue()`

```typescript
await adapter.pauseQueue("email");
```

### Adapter `resumeQueue()`

```typescript
await adapter.resumeQueue("email");
```

### Adapter `retryJob()`

```typescript
await adapter.retryJob("job-id", "email");
```

### Adapter `removeJob()`

```typescript
await adapter.removeJob("job-id", "email");
```

### Adapter `promoteJob()`

```typescript
await adapter.promoteJob("job-id", "email");
```

### Adapter `moveJobToFailed()`

```typescript
await adapter.moveJobToFailed("job-id", "Manual fail", "email");
```

### Adapter `publishEvent()`

```typescript
await adapter.publishEvent("channel", { type: "event", data: {} });
```

### Adapter `subscribeEvent()`

```typescript
const unsubscribe = await adapter.subscribeEvent("channel", (payload) => {
  console.log(payload);
});
await unsubscribe();
```

---

## 🤝 Contributing

- Keep TSDoc up-to-date for all public APIs.
- Add tests for new adapters, utils, and core behaviors.
- Keep examples accurate and runnable.

---

## 📝 License

MIT
