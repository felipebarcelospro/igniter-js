/**
 * @fileoverview Telemetry event definitions for @igniter-js/jobs
 * @module @igniter-js/jobs/telemetry/jobs.telemetry
 *
 * @description
 * Defines all telemetry events emitted by the jobs package during job
 * lifecycle operations. These events can be consumed by any transport
 * adapter configured on the telemetry instance.
 *
 * Events follow the pattern: igniter.jobs.<group>.<event>
 *
 * Groups:
 * - job: Job lifecycle events (enqueued, started, completed, failed, progress, retrying)
 * - worker: Worker lifecycle events (started, stopped, idle)
 * - queue: Queue management events (paused, resumed, drained, cleaned)
 *
 * @example
 * ```typescript
 * import { IgniterTelemetry } from '@igniter-js/telemetry'
 * import { IgniterJobsTelemetryEvents } from '@igniter-js/jobs'
 *
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .addEvents(IgniterJobsTelemetryEvents)
 *   .build()
 * ```
 */

/**
 * Telemetry event definitions for @igniter-js/jobs.
 *
 * This descriptor can be passed to `IgniterTelemetry.addEvents()` to register
 * all job-related telemetry events with proper type inference.
 *
 * Event names follow the pattern: `igniter.jobs.<group>.<event>`
 *
 * @example
 * ```typescript
 * import { IgniterTelemetry } from '@igniter-js/telemetry'
 * import { IgniterJobsTelemetryEvents } from '@igniter-js/jobs'
 *
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .addEvents(IgniterJobsTelemetryEvents)
 *   .build()
 *
 * // Type-safe emit
 * telemetry.emit('igniter.jobs.job.completed', {
 *   attributes: {
 *     'ctx.job.id': 'job_123',
 *     'ctx.job.name': 'sendWelcome',
 *     'ctx.job.queue': 'email',
 *     'ctx.job.duration': 1500,
 *   },
 * })
 * ```
 */
export const IgniterJobsTelemetryEvents = {
  namespace: "igniter.jobs",
  events: {
    // Job lifecycle events
    job: {
      enqueued: {} as {
        "ctx.job.id": string;
        "ctx.job.name": string;
        "ctx.job.queue": string;
        "ctx.job.priority"?: number;
        "ctx.job.delay"?: number;
      },
      started: {} as {
        "ctx.job.id": string;
        "ctx.job.name": string;
        "ctx.job.queue": string;
        "ctx.job.attempt": number;
        "ctx.job.maxAttempts": number;
      },
      completed: {} as {
        "ctx.job.id": string;
        "ctx.job.name": string;
        "ctx.job.queue": string;
        "ctx.job.duration": number;
      },
      failed: {} as {
        "ctx.job.id": string;
        "ctx.job.name": string;
        "ctx.job.queue": string;
        "ctx.job.error.message": string;
        "ctx.job.error.code"?: string;
        "ctx.job.attempt": number;
        "ctx.job.maxAttempts": number;
        "ctx.job.isFinalAttempt": boolean;
      },
      progress: {} as {
        "ctx.job.id": string;
        "ctx.job.name": string;
        "ctx.job.queue": string;
        "ctx.job.progress": number;
        "ctx.job.progress.message"?: string;
      },
      retrying: {} as {
        "ctx.job.id": string;
        "ctx.job.name": string;
        "ctx.job.queue": string;
        "ctx.job.attempt": number;
        "ctx.job.maxAttempts": number;
        "ctx.job.nextRetryDelay": number;
      },
      scheduled: {} as {
        "ctx.job.id": string;
        "ctx.job.name": string;
        "ctx.job.queue": string;
        "ctx.job.scheduledAt"?: string;
        "ctx.job.cron"?: string;
      },
    },
    // Worker lifecycle events
    worker: {
      started: {} as {
        "ctx.worker.id": string;
        "ctx.worker.queues": string;
        "ctx.worker.concurrency": number;
      },
      stopped: {} as {
        "ctx.worker.id": string;
        "ctx.worker.processed": number;
        "ctx.worker.failed": number;
        "ctx.worker.uptime": number;
      },
      idle: {} as {
        "ctx.worker.id": string;
        "ctx.worker.queues": string;
      },
      paused: {} as {
        "ctx.worker.id": string;
        "ctx.worker.queues": string;
      },
      resumed: {} as {
        "ctx.worker.id": string;
        "ctx.worker.queues": string;
      },
    },
    // Queue management events
    queue: {
      paused: {} as {
        "ctx.queue.name": string;
      },
      resumed: {} as {
        "ctx.queue.name": string;
      },
      drained: {} as {
        "ctx.queue.name": string;
        "ctx.queue.drained.count": number;
      },
      cleaned: {} as {
        "ctx.queue.name": string;
        "ctx.queue.cleaned.count": number;
        "ctx.queue.cleaned.status": string;
      },
      obliterated: {} as {
        "ctx.queue.name": string;
        "ctx.queue.obliterated.force": boolean;
      },
    },
  },
} as const;

/**
 * Union type of all job telemetry event names.
 *
 * @example
 * ```typescript
 * import type { IgniterJobsTelemetryEventNames } from '@igniter-js/jobs'
 *
 * function handleEvent(name: IgniterJobsTelemetryEventNames) {
 *   // name is type-safe
 * }
 * ```
 */
export type IgniterJobsTelemetryEventNames =
  | "igniter.jobs.job.enqueued"
  | "igniter.jobs.job.started"
  | "igniter.jobs.job.completed"
  | "igniter.jobs.job.failed"
  | "igniter.jobs.job.progress"
  | "igniter.jobs.job.retrying"
  | "igniter.jobs.job.scheduled"
  | "igniter.jobs.worker.started"
  | "igniter.jobs.worker.stopped"
  | "igniter.jobs.worker.idle"
  | "igniter.jobs.worker.paused"
  | "igniter.jobs.worker.resumed"
  | "igniter.jobs.queue.paused"
  | "igniter.jobs.queue.resumed"
  | "igniter.jobs.queue.drained"
  | "igniter.jobs.queue.cleaned"
  | "igniter.jobs.queue.obliterated";

/**
 * Telemetry event attributes for job.enqueued
 */
export interface JobEnqueuedAttributes {
  "ctx.job.id": string;
  "ctx.job.name": string;
  "ctx.job.queue": string;
  "ctx.job.priority"?: number;
  "ctx.job.delay"?: number;
}

/**
 * Telemetry event attributes for job.started
 */
export interface JobStartedAttributes {
  "ctx.job.id": string;
  "ctx.job.name": string;
  "ctx.job.queue": string;
  "ctx.job.attempt": number;
  "ctx.job.maxAttempts": number;
}

/**
 * Telemetry event attributes for job.completed
 */
export interface JobCompletedAttributes {
  "ctx.job.id": string;
  "ctx.job.name": string;
  "ctx.job.queue": string;
  "ctx.job.duration": number;
}

/**
 * Telemetry event attributes for job.failed
 */
export interface JobFailedAttributes {
  "ctx.job.id": string;
  "ctx.job.name": string;
  "ctx.job.queue": string;
  "ctx.job.error.message": string;
  "ctx.job.error.code"?: string;
  "ctx.job.attempt": number;
  "ctx.job.maxAttempts": number;
  "ctx.job.isFinalAttempt": boolean;
}

/**
 * Telemetry event attributes for job.progress
 */
export interface JobProgressAttributes {
  "ctx.job.id": string;
  "ctx.job.name": string;
  "ctx.job.queue": string;
  "ctx.job.progress": number;
  "ctx.job.progress.message"?: string;
}

/**
 * Telemetry event attributes for job.retrying
 */
export interface JobRetryingAttributes {
  "ctx.job.id": string;
  "ctx.job.name": string;
  "ctx.job.queue": string;
  "ctx.job.attempt": number;
  "ctx.job.maxAttempts": number;
  "ctx.job.nextRetryDelay": number;
}

/**
 * Telemetry event attributes for job.scheduled
 */
export interface JobScheduledAttributes {
  "ctx.job.id": string;
  "ctx.job.name": string;
  "ctx.job.queue": string;
  "ctx.job.scheduledAt"?: string;
  "ctx.job.cron"?: string;
}

/**
 * Telemetry event attributes for worker.started
 */
export interface WorkerStartedAttributes {
  "ctx.worker.id": string;
  "ctx.worker.queues": string;
  "ctx.worker.concurrency": number;
}

/**
 * Telemetry event attributes for worker.stopped
 */
export interface WorkerStoppedAttributes {
  "ctx.worker.id": string;
  "ctx.worker.processed": number;
  "ctx.worker.failed": number;
  "ctx.worker.uptime": number;
}

/**
 * Telemetry event attributes for worker.idle
 */
export interface WorkerIdleAttributes {
  "ctx.worker.id": string;
  "ctx.worker.queues": string;
}

/**
 * Telemetry event attributes for queue events
 */
export interface QueuePausedAttributes {
  "ctx.queue.name": string;
}

export interface QueueResumedAttributes {
  "ctx.queue.name": string;
}

export interface QueueDrainedAttributes {
  "ctx.queue.name": string;
  "ctx.queue.drained.count": number;
}

export interface QueueCleanedAttributes {
  "ctx.queue.name": string;
  "ctx.queue.cleaned.count": number;
  "ctx.queue.cleaned.status": string;
}

export interface QueueObliteratedAttributes {
  "ctx.queue.name": string;
  "ctx.queue.obliterated.force": boolean;
}
