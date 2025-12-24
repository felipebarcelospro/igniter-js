/**
 * @fileoverview Telemetry event definitions for @igniter-js/jobs
 * @module @igniter-js/jobs/telemetry/jobs.telemetry
 *
 * @description
 * Defines all telemetry events emitted by the jobs package during job
 * lifecycle operations. These events can be consumed by any transport
 * adapter configured on the telemetry instance.
 */

import { IgniterTelemetryEvents } from "@igniter-js/telemetry";
import { z } from "zod";

/**
 * Telemetry event definitions for @igniter-js/jobs.
 */
export const IgniterJobsTelemetryEvents = IgniterTelemetryEvents.namespace("igniter.jobs")
  .group("job", (g) =>
    g
      .event("enqueued", z.object({
        "ctx.job.id": z.string(),
        "ctx.job.name": z.string(),
        "ctx.job.queue": z.string(),
        "ctx.job.priority": z.number().optional(),
        "ctx.job.delay": z.number().optional(),
      }))
      .event("started", z.object({
        "ctx.job.id": z.string(),
        "ctx.job.name": z.string(),
        "ctx.job.queue": z.string(),
        "ctx.job.attempt": z.number(),
        "ctx.job.maxAttempts": z.number(),
      }))
      .event("completed", z.object({
        "ctx.job.id": z.string(),
        "ctx.job.name": z.string(),
        "ctx.job.queue": z.string(),
        "ctx.job.duration": z.number(),
      }))
      .event("failed", z.object({
        "ctx.job.id": z.string(),
        "ctx.job.name": z.string(),
        "ctx.job.queue": z.string(),
        "ctx.job.error.message": z.string(),
        "ctx.job.error.code": z.string().optional(),
        "ctx.job.attempt": z.number(),
        "ctx.job.maxAttempts": z.number(),
        "ctx.job.isFinalAttempt": z.boolean(),
      }))
      .event("progress", z.object({
        "ctx.job.id": z.string(),
        "ctx.job.name": z.string(),
        "ctx.job.queue": z.string(),
        "ctx.job.progress": z.number(),
        "ctx.job.progress.message": z.string().optional(),
      }))
      .event("retrying", z.object({
        "ctx.job.id": z.string(),
        "ctx.job.name": z.string(),
        "ctx.job.queue": z.string(),
        "ctx.job.attempt": z.number(),
        "ctx.job.maxAttempts": z.number(),
        "ctx.job.nextRetryDelay": z.number(),
      }))
      .event("scheduled", z.object({
        "ctx.job.id": z.string(),
        "ctx.job.name": z.string(),
        "ctx.job.queue": z.string(),
        "ctx.job.scheduledAt": z.string().optional(),
        "ctx.job.cron": z.string().optional(),
      }))
  )
  .group("worker", (g) =>
    g
      .event("started", z.object({
        "ctx.worker.id": z.string(),
        "ctx.worker.queues": z.string(),
        "ctx.worker.concurrency": z.number(),
      }))
      .event("stopped", z.object({
        "ctx.worker.id": z.string(),
        "ctx.worker.processed": z.number(),
        "ctx.worker.failed": z.number(),
        "ctx.worker.uptime": z.number(),
      }))
      .event("idle", z.object({
        "ctx.worker.id": z.string(),
        "ctx.worker.queues": z.string(),
      }))
      .event("paused", z.object({
        "ctx.worker.id": z.string(),
        "ctx.worker.queues": z.string(),
      }))
      .event("resumed", z.object({
        "ctx.worker.id": z.string(),
        "ctx.worker.queues": z.string(),
      }))
  )
  .group("queue", (g) =>
    g
      .event("paused", z.object({
        "ctx.queue.name": z.string(),
      }))
      .event("resumed", z.object({
        "ctx.queue.name": z.string(),
      }))
      .event("drained", z.object({
        "ctx.queue.name": z.string(),
        "ctx.queue.drained.count": z.number(),
      }))
      .event("cleaned", z.object({
        "ctx.queue.name": z.string(),
        "ctx.queue.cleaned.count": z.number(),
        "ctx.queue.cleaned.status": z.string(),
      }))
      .event("obliterated", z.object({
        "ctx.queue.name": z.string(),
        "ctx.queue.obliterated.force": z.boolean(),
      }))
  )
  .build();

export type IgniterJobsTelemetryEvents = typeof IgniterJobsTelemetryEvents;
