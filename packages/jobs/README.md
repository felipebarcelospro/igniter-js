# @igniter-js/jobs

Type-safe jobs, scheduling, and worker builder for Igniter.js. Provides a fluent API to define queues, jobs, cron tasks, scope-aware dispatch, typed events, and adapter-based backends (BullMQ first, in-memory for tests).

> Status: Work in progress. API follows the spec in `.specs/jobs.spec.md` and mirrors the DX of `@igniter-js/store`.

## Features

- Fluent builder API: `IgniterJobs.create<TContext>() ... .build()`
- Queue/job registry with full TypeScript inference via `IgniterQueue`
- Cron tasks via `queue.addCron()` (BullMQ auto-schedules repeatable jobs)
- Optional runtime input validation (Zod-like schemas or StandardSchemaV1)
- Single-scope support for multi-tenancy (`jobs.scope(type, id)` or per-dispatch scope)
- Typed events via `subscribe()` at runtime/queue/job levels
- Distributed management APIs (queue/job search, pause/resume, retry, logs, progress)

## Installation

```bash
npm install @igniter-js/jobs @igniter-js/core
# Optional adapters/peers
npm install bullmq ioredis zod @igniter-js/adapter-bullmq
```

## Quick Start

```ts
import { IgniterJobs, IgniterQueue } from "@igniter-js/jobs";
import { IgniterJobsBullMQAdapter } from "@igniter-js/jobs/adapters";
import Redis from "ioredis";
import { z } from "zod";

type AppContext = { mailer: Mailer };

const redis = new Redis();

const emailQueue = IgniterQueue.create("email")
  .withContext<AppContext>()
  .addJob("sendWelcome", {
    input: z.object({ email: z.string().email() }),
    handler: async ({ input, context }) => {
      await context.mailer.send(input);
    },
  })
  .addCron("cleanupExpired", {
    cron: "0 2 * * *",
    handler: async ({ context }) => {
      await context.mailer.cleanup();
    },
  })
  .build();

const jobs = IgniterJobs.create<AppContext>()
  .withAdapter(IgniterJobsBullMQAdapter.create({ redis }))
  .withService("my-api")
  .withEnvironment("development")
  .withContext(async () => ({ mailer }))
  .addQueue(emailQueue)
  .build();

await jobs.email.sendWelcome.dispatch({ input: { email: "user@example.com" } });
```

## Scope (single-scope)

```ts
const jobs = IgniterJobs.create<AppContext>()
  .withAdapter(IgniterJobsBullMQAdapter.create({ redis }))
  .withService("my-api")
  .withEnvironment("development")
  .withContext(async () => ({ mailer }))
  .addScope("organization", { required: true })
  .addQueue(emailQueue)
  .build();

// Option A: bind scope once
const orgJobs = jobs.scope("organization", "org_123", { plan: "pro" });
await orgJobs.email.sendWelcome.dispatch({
  input: { email: "user@example.com" },
});

// Option B: per-dispatch scope
await jobs.email.sendWelcome.dispatch({
  input: { email: "user@example.com" },
  scope: { type: "organization", id: "org_123", tags: { plan: "pro" } },
});
```

## Events (subscribe)

```ts
// Global listener (unscoped)
const unsubscribe = await jobs.subscribe((event) => {
  console.log(event.type, event.data, event.timestamp, event.scope);
});

// Job-level listener
await jobs.email.sendWelcome.subscribe((event) => {
  // type is "email:sendWelcome:enqueued" | "email:sendWelcome:started" | ...
  console.log(event.type, event.data);
});

await unsubscribe();
```

## Telemetry

Integrate with `@igniter-js/telemetry` to automatically emit OpenTelemetry events for job lifecycle, workers, and queues.

```ts
import { IgniterTelemetry } from "@igniter-js/telemetry";
import { IgniterJobsTelemetryEvents } from "@igniter-js/jobs";

// 1. Configure telemetry with job events
const telemetry = IgniterTelemetry.create()
  .withService("my-api")
  .addEvents(IgniterJobsTelemetryEvents)
  .build();

// 2. Pass to jobs instance
const jobs = IgniterJobs.create<AppContext>()
  .withTelemetry(telemetry)
  // ...
  .build();
```

This will automatically emit events like:

- `igniter.jobs.job.enqueued`
- `igniter.jobs.job.started`
- `igniter.jobs.job.completed` (with duration)
- `igniter.jobs.job.failed` (with error details)
- `igniter.jobs.job.progress`

## Management APIs (examples)

```ts
// Queue management
const queues = await jobs.search("queues", {});
await jobs.email.get().pause();
await jobs.email.get().resume();

// Inspect a job
const job = await jobs.email.sendWelcome.get("jobId").retrieve();
const logs = await jobs.email.sendWelcome.get("jobId").logs();
const progress = await jobs.email.sendWelcome.get("jobId").progress();
```

## Workers

```ts
const worker = await jobs.worker
  .create()
  .addQueue("email")
  .withConcurrency(10)
  .build();

// Later
await worker.pause();
await worker.resume();
await worker.close();
```

## Contributing

- Keep TSDoc on all public APIs.
- Preserve adapter features from `@igniter-js/adapter-bullmq`.
- Update `.specs/jobs.spec.md` time tracking after each task with timestamps.

## License

MIT
