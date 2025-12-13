# @igniter-js/adapter-bullmq

[![NPM Version](https://img.shields.io/npm/v/@igniter-js/adapter-bullmq.svg)](https://www.npmjs.com/package/@igniter-js/adapter-bullmq)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The official BullMQ adapter for the **Igniter.js Queues** system. This package provides a production-ready driver for handling background job processing using Redis.

## Role in the Ecosystem

This adapter acts as a bridge between the abstract `@igniter-js/core` Queues system and the powerful [BullMQ](https://bullmq.io/) library. It implements the necessary logic to enqueue, schedule, and process jobs, allowing you to add robust background task capabilities to your Igniter.js application.

## Installation

To use this adapter, you need to install it along with its peer dependencies: `bullmq` and a Redis client like `ioredis`.

```bash
# npm
npm install @igniter-js/adapter-bullmq bullmq ioredis

# yarn
yarn add @igniter-js/adapter-bullmq bullmq ioredis

# pnpm
pnpm add @igniter-js/adapter-bullmq bullmq ioredis

# bun
bun add @igniter-js/adapter-bullmq bullmq ioredis
```

## Basic Usage

The primary export of this package is the `createBullMQAdapter` factory function. You use this to create a `jobs` instance, which then provides the tools (`.router()`, `.register()`, `.merge()`) to define your background jobs.

### 1. Create the Adapter and a Job Router

First, create an instance of the adapter and use it to define a router for a specific group of jobs.

```typescript
// src/services/jobs.ts
import { createBullMQAdapter } from '@igniter-js/adapter-bullmq';
import { createRedisStoreAdapter } from '@igniter-js/adapter-redis'; // Often shares a Redis connection
import { Redis } from 'ioredis';
import { z } from 'zod';

// A single Redis client can be used for both Store and Queues
const redis = new Redis(process.env.REDIS_URL);
const store = createRedisStoreAdapter({ client: redis });

// 1. Create the BullMQ adapter instance
export const jobs = createBullMQAdapter({
  store, // The adapter requires a store for the Redis connection
  autoStartWorker: {
    concurrency: 5,
  },
});

// 2. Define a router for email-related jobs
const emailJobRouter = jobs.router({
  namespace: 'emails',
  jobs: {
    sendWelcome: jobs.register({
      input: z.object({ email: z.string().email() }),
      handler: async ({ payload, context }) => {
        context.logger.info(`Sending welcome email to ${payload.email}`);
        // Your email sending logic here...
        return { sent: true };
      },
    }),
  },
});

// 3. Merge all routers into a single configuration
export const REGISTERED_JOBS = jobs.merge({
  emails: emailJobRouter,
});
```

### 2. Register with the Igniter Builder

Pass the `REGISTERED_JOBS` object to the `.jobs()` method in your main `igniter.ts` file.

```typescript
// src/igniter.ts
import { Igniter } from '@igniter-js/core';
import { REGISTERED_JOBS } from './services/jobs';

export const igniter = Igniter
  .context<AppContext>()
  .jobs(REGISTERED_JOBS)
  .create();
```

Your background job queue is now configured and ready to use. You can invoke jobs from your actions using `igniter.jobs.emails.schedule({ task: 'sendWelcome', ... })`.

## Worker Control

The adapter provides granular control over workers via `WorkerHandle`:

```typescript
// Start a worker and get a handle
const handle = await jobs.worker({
  queues: ['email-queue'],
  concurrency: 5
});

// Control the worker
await handle.pause();   // Pause processing
await handle.resume();  // Resume processing
await handle.close();   // Gracefully close

// Check status
console.log('Running:', handle.isRunning());
console.log('Paused:', handle.isPaused());

// Get metrics
const metrics = await handle.getMetrics();
console.log(`Processed: ${metrics.processed}, Failed: ${metrics.failed}`);
```

## Rate Limiting

Control the rate at which jobs are processed to avoid overwhelming external APIs or services. This is particularly useful for:

- Avoiding API rate limits (e.g., YouTube, Twitter, Stripe)
- Preventing server overload
- Throttling resource-intensive operations

### Job-Level Rate Limiting

Configure rate limiting directly on individual job definitions:

```typescript
import { z } from 'zod';

const downloadVideoJob = jobs.register({
  name: 'Download Video',
  input: z.object({ videoId: z.string() }),
  handler: async ({ input, context }) => {
    // Download logic here
    return { downloaded: true };
  },
  // Rate limiting for YouTube downloads to avoid 429 errors
  limiter: {
    max: 1,        // Maximum 1 job at a time
    duration: 30000, // 30 seconds between jobs
  },
});
```

### Router-Level Rate Limiting

Apply rate limiting to all jobs in a router via `defaultOptions`:

```typescript
const youtubeRouter = jobs.router({
  namespace: 'youtube',
  jobs: {
    downloadVideo: downloadVideoJob,
    extractAudio: extractAudioJob,
    getMetadata: getMetadataJob,
  },
  defaultOptions: {
    queue: { name: 'youtube-downloads' },
    // All jobs in this router share the same rate limit
    limiter: {
      max: 1,        // Maximum 1 job at a time
      duration: 30000, // 30 seconds between jobs
    },
  },
});
```

### Worker-Level Rate Limiting

Configure rate limiting when starting a worker:

```typescript
const handle = await jobs.worker({
  queues: ['youtube-downloads'],
  concurrency: 1,
  limiter: {
    max: 10,       // Process maximum 10 jobs
    duration: 60000, // Per minute
  },
});
```

### Auto-Start Worker with Rate Limiting

Configure rate limiting in the adapter options for auto-started workers:

```typescript
export const jobs = createBullMQAdapter({
  store,
  autoStartWorker: {
    concurrency: 1,
    limiter: {
      max: 1,
      duration: 30000,
    },
  },
});
```

### Limiter Priority

When multiple limiters are configured, the following priority is applied:

1. **Job-level limiter** takes precedence over router-level
2. **Router-level limiter** (via `defaultOptions`) is used if job doesn't have one
3. **Worker-level limiter** applies globally to all jobs in the queue

> **Note:** Rate limiting is applied at the worker level in BullMQ. All jobs in the same queue share the same rate limit. Jobs that are rate-limited return to the "waiting" state until the limit resets.

## Queue Management

Manage queues directly via `adapter.queues`:

```typescript
// List all queues
const queues = await jobs.queues.list();

// Get specific queue info
const queueInfo = await jobs.queues.get('email-queue');
console.log(`Waiting: ${queueInfo.jobCounts.waiting}`);

// Control queues
await jobs.queues.pause('email-queue');
await jobs.queues.resume('email-queue');

// Clean old jobs
const cleaned = await jobs.queues.clean('email-queue', {
  status: ['completed', 'failed'],
  olderThan: 7 * 24 * 60 * 60 * 1000 // 7 days
});

// Drain waiting jobs
await jobs.queues.drain('email-queue');
```

## Job Management

Control individual jobs via `adapter.job`:

```typescript
// Get job info
const jobInfo = await jobs.job.get('job-123');
console.log(`Status: ${jobInfo?.status}`);

// Get job state
const state = await jobs.job.getState('job-123');

// Get job logs
const logs = await jobs.job.getLogs('job-123');

// Retry a failed job
await jobs.job.retry('job-123');

// Remove a job
await jobs.job.remove('job-123');

// Promote delayed job to immediate
await jobs.job.promote('job-123');

// Batch operations
await jobs.job.retryMany(['job-1', 'job-2', 'job-3']);
await jobs.job.removeMany(['job-1', 'job-2', 'job-3']);
```

## Management API in Controllers

Access management APIs directly in your controllers via the proxy:

```typescript
const adminController = igniter.controller({
  path: '/admin',
  actions: {
    // Pause queue processing
    pauseQueue: igniter.mutation({
      method: 'POST',
      path: '/queues/:queueName/pause',
      handler: async (ctx) => {
        await ctx.jobs.$queues.pause(ctx.params.queueName);
        return { paused: true };
      }
    }),
    
    // Retry a job
    retryJob: igniter.mutation({
      method: 'POST',
      path: '/jobs/:jobId/retry',
      handler: async (ctx) => {
        await ctx.jobs.$job.retry(ctx.params.jobId);
        return { retried: true };
      }
    }),
    
    // Get queue status
    queueStatus: igniter.query({
      path: '/queues/:queueName',
      handler: async (ctx) => {
        return await ctx.jobs.$queues.get(ctx.params.queueName);
      }
    }),
    
    // List active workers
    listWorkers: igniter.query({
      path: '/workers',
      handler: async (ctx) => {
        const workers = ctx.jobs.$workers;
        return Array.from(workers.entries()).map(([id, w]) => ({
          id,
          queueName: w.queueName,
          isRunning: w.isRunning(),
          isPaused: w.isPaused()
        }));
      }
    })
  }
});
```

For more detailed guides, please refer to the **[Official Igniter.js Wiki](https://igniterjs.com/docs)**.

## Contributing

Contributions are welcome! Please see the main [CONTRIBUTING.md](/CONTRIBUTING.md) file for details on how to get started.

## License

This package is licensed under the [MIT License](/LICENSE).
