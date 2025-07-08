# Igniter.js Queues: Reliable Background Processing

Many web applications need to perform tasks that are slow or resource-intensive, such as sending emails, processing images, generating reports, or calling third-party APIs. Performing these tasks during a web request leads to long loading times and a poor user experience.

**Igniter.js Queues** is a first-class, integrated system for solving this problem by enabling reliable background job processing. It allows you to offload long-running tasks from the main request thread to a separate worker process, ensuring your API remains fast and responsive.

## The Driver-Based Architecture

The Queues system is built on a modular, driver-based architecture. The core of Igniter.js provides the structure and type-safety, while a driver provides the implementation. The officially recommended driver is for **BullMQ**, which uses Redis for a robust, high-performance job queue.

---

## 1. Setup and Configuration

Setting up Igniter.js Queues involves three steps: installing the necessary peer dependencies, creating the job adapter, and registering it with the Igniter Builder.

### Step A: Install Peer Dependencies

First, you need to install `bullmq` and the Redis client `ioredis`.

```bash
# npm
npm install bullmq ioredis

# yarn
yarn add bullmq ioredis
```

### Step B: Create the Jobs Adapter

Next, create a file at `src/services/jobs.ts` to initialize the BullMQ adapter. This adapter will manage the connection to Redis and provide the tools for defining and processing jobs.

```typescript
// src/services/jobs.ts
import { createBullMQAdapter } from '@igniter-js/core/adapters';
import { store } from '@/services/store'; // Assuming you have an ioredis instance exported from here

/**
 * Job queue adapter for background processing using BullMQ.
 * It connects to your Redis instance to manage job queues.
 */
export const jobs = createBullMQAdapter({
  // The ioredis client instance
  store: store,

  // Optional: BullMQ worker settings
  // In development, it's convenient to autostart the worker.
  // In production, you'll likely run the worker as a separate process.
  autoStartWorker: {
    concurrency: 10, // Process up to 10 jobs concurrently
    debug: process.env.NODE_ENV === 'development',
  },

  // Optional: Default options for all jobs created
  defaultJobOptions: {
    attempts: 3, // Retry a failed job up to 3 times
    backoff: {
      type: 'exponential',
      delay: 1000, // Wait 1s before the first retry, 2s for the second, etc.
    },
  },
});
```

### Step C: Register with the Igniter Builder

Finally, enable the Queues system in your main `igniter.ts` file by passing your `jobs` adapter to the `.jobs()` method on the builder.

```typescript
// src/igniter.ts
import { Igniter } from '@igniter-js/core';
import { jobs } from '@/services/jobs'; // 1. Import the jobs adapter
// ... other imports

export const igniter = Igniter
  .context<AppContext>()
  // ... other builder methods
  .jobs(jobs) // 2. Enable the Queues feature
  .create();
```

---

## 2. Defining Jobs with Routers

In Igniter.js, jobs are organized into **Job Routers**. A router is a collection of related jobs grouped under a unique `namespace`.

### Step A: Create a Job Router

Let's define a router for all email-related background tasks.

```typescript
// features/emails/jobs/email.jobs.ts
import { z } from 'zod';
import { jobs } from '@/services/jobs'; // Your BullMQ adapter instance
import { sendEmail } from '@/services/email'; // Your actual email sending logic

export const emailJobRouter = jobs.router({
  /**
   * A unique namespace for this group of jobs.
   * This will be used to invoke jobs (e.g., igniter.jobs.emails.schedule(...))
   */
  namespace: 'emails',

  /**
   * An object containing all jobs for this router.
   */
  jobs: {
    /**
     * Defines a job named 'sendWelcomeEmail'.
     */
    sendWelcomeEmail: jobs.register({
      /**
       * A Zod schema for the job's payload. This ensures that any data
       * sent to this job is type-safe and automatically validated.
       */
      input: z.object({
        userId: z.string(),
        email: z.string().email(),
        name: z.string(),
      }),

      /**
       * The handler function containing the job's logic.
       * This is what the worker process will execute.
       */
      handler: async ({ payload, context }) => {
        // `payload` is fully typed from the Zod schema.
        // `context` is the same global context available in your API actions.
        context.logger.info(`Sending welcome email to ${payload.name}`);
        await sendEmail({ to: payload.email, subject: 'Welcome!' });
        return { sentAt: new Date() };
      },
    }),

    // You could define another job here, like 'sendPasswordReset'
  },

  /**
   * Optional: Global lifecycle hooks for all jobs in this router.
   */
  onSuccess: (job) => {
    console.log(`Email job '${job.name}' completed successfully.`);
  },
  onFailure: (job, error) => {
    console.error(`Email job '${job.name}' failed:`, error);
  },
});
```

### Step B: Merge and Register Job Routers

If you have multiple job routers (e.g., for emails, reports, etc.), you can combine them into a single configuration object using `jobs.merge()`.

```typescript
// src/services/jobs.ts (or a central jobs file)
import { emailJobRouter } from '@/features/emails/jobs/email.jobs';
import { reportJobRouter } from '@/features/reports/jobs/report.jobs';
import { jobs } from '@/services/jobs';

export const REGISTERED_JOBS = jobs.merge({
  emails: emailJobRouter,
  reports: reportJobRouter,
});
```
This `REGISTERED_JOBS` object is what you would pass to the builder: `igniter.jobs(REGISTERED_JOBS)`.

---

## 3. Invoking Jobs from Your Application

Jobs are typically invoked from a `mutation` handler after a state change occurs. You use the `igniter.jobs.<namespace>.schedule()` method to enqueue a job.

**Example: Invoking the job after user creation**

```typescript
// src/features/users/controllers/user.controller.ts
import { igniter } from '@/igniter';
import { z } from 'zod';

export const userController = igniter.controller({
  path: '/users',
  actions: {
    create: igniter.mutation({
      path: '/',
      method: 'POST',
      body: z.object({ name: z.string(), email: z.string().email() }),
      handler: async ({ request, context, response }) => {
        const { name, email } = request.body;
        const user = await context.database.user.create({ data: { name, email } });

        // Invoke the background job via its namespace and task name.
        // The request is NOT blocked by this call.
        await igniter.jobs.emails.schedule({
          // The name of the task to run, matching the key in the router.
          task: 'sendWelcomeEmail',

          // The payload is type-checked against the job's Zod schema.
          input: {
            userId: user.id,
            email: user.email,
            name: user.name,
          },

          // Optional: Job-specific options.
          options: {
            delay: 5000, // Delay this job by 5 seconds (5000ms).
          },
        });

        // The handler returns a response to the client immediately.
        return response.created(user);
      },
    }),
  },
});
```
When `schedule()` is called, it adds the job to the Redis queue and returns a promise that resolves immediately. A separate worker process will pick up the job, validate its payload, and execute its handler, ensuring your API endpoint remains fast and responsive.
