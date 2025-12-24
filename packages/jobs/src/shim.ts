/**
 * @fileoverview Browser/client-side shim for @igniter-js/jobs
 * @module @igniter-js/jobs/shim
 *
 * @description
 * This module prevents @igniter-js/jobs from being used in browser environments.
 * The jobs package depends on server-only APIs (queues, workers, redis) and
 * should not be bundled into client-side code.
 */

const SERVER_ONLY_ERROR = `
================================================================================
@igniter-js/jobs: Server-Only Package
================================================================================

This package cannot be used in browser/client environments.

@igniter-js/jobs is designed exclusively for server-side usage because it:
- Depends on Redis and other backend infrastructure
- Manages background workers and queues
- Uses Node.js specific APIs
- Should never run in browser bundles

SOLUTIONS:

1. Next.js App Router:
   - Use Server Components (default in app/ directory)
   - Use Server Actions with "use server" directive
   - Use API routes (app/api/*)

2. Next.js Pages Router:
   - Use getServerSideProps
   - Use API routes (pages/api/*)

3. Other Frameworks:
   - Move job dispatching logic to server-side endpoints
   - Use server-side workers or background jobs

For documentation, visit: https://igniterjs.com/docs/jobs

================================================================================
`;

function throwServerOnlyError(): never {
  throw new Error(SERVER_ONLY_ERROR);
}

export const IgniterJobs = {
  create: throwServerOnlyError,
};

export const IgniterJobsBuilder = {
  create: throwServerOnlyError,
};

export const IgniterWorkerBuilder = {
  create: throwServerOnlyError,
};

export const IgniterQueueBuilder = {
  create: throwServerOnlyError,
};

export class IgniterJobsError extends Error {
  constructor() {
    super(SERVER_ONLY_ERROR);
    this.name = "IgniterJobsError";
  }
}

export const IgniterJobsTelemetryEvents = {
  namespace: "igniter.jobs",
  events: {},
};

export const IgniterJobsValidationUtils = {
  isStandardSchema: throwServerOnlyError,
  isZodLikeSchema: throwServerOnlyError,
  validateInput: throwServerOnlyError,
};
