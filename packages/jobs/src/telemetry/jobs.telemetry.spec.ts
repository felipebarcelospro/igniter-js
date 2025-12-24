/**
 * @fileoverview Tests for IgniterJobsTelemetryEvents definitions
 */

import { describe, it, expect } from "vitest";
import { IgniterJobsTelemetryEvents } from "./index";

describe("IgniterJobsTelemetryEvents", () => {
  describe("namespace", () => {
    it("has the correct namespace", () => {
      expect(IgniterJobsTelemetryEvents.namespace).toBe("igniter.jobs");
    });
  });

  describe("events structure", () => {
    it("has events property", () => {
      expect(IgniterJobsTelemetryEvents.events).toBeDefined();
      expect(typeof IgniterJobsTelemetryEvents.events).toBe("object");
    });

    it("has get utility object", () => {
      expect(IgniterJobsTelemetryEvents.get).toBeDefined();
      expect(typeof IgniterJobsTelemetryEvents.get.key).toBe("function");
      expect(typeof IgniterJobsTelemetryEvents.get.schema).toBe("function");
    });
  });

  describe("job group", () => {
    it("defines job group in events", () => {
      expect(IgniterJobsTelemetryEvents.events.job).toBeDefined();
    });

    it("job group contains enqueued event", () => {
      expect(IgniterJobsTelemetryEvents.events.job.enqueued).toBeDefined();
    });

    it("job group contains started event", () => {
      expect(IgniterJobsTelemetryEvents.events.job.started).toBeDefined();
    });

    it("job group contains completed event", () => {
      expect(IgniterJobsTelemetryEvents.events.job.completed).toBeDefined();
    });

    it("job group contains failed event", () => {
      expect(IgniterJobsTelemetryEvents.events.job.failed).toBeDefined();
    });

    it("job group contains progress event", () => {
      expect(IgniterJobsTelemetryEvents.events.job.progress).toBeDefined();
    });

    it("job group contains retrying event", () => {
      expect(IgniterJobsTelemetryEvents.events.job.retrying).toBeDefined();
    });

    it("job group contains scheduled event", () => {
      expect(IgniterJobsTelemetryEvents.events.job.scheduled).toBeDefined();
    });
  });

  describe("worker group", () => {
    it("defines worker group in events", () => {
      expect(IgniterJobsTelemetryEvents.events.worker).toBeDefined();
    });

    it("worker group contains started event", () => {
      expect(IgniterJobsTelemetryEvents.events.worker.started).toBeDefined();
    });

    it("worker group contains stopped event", () => {
      expect(IgniterJobsTelemetryEvents.events.worker.stopped).toBeDefined();
    });

    it("worker group contains idle event", () => {
      expect(IgniterJobsTelemetryEvents.events.worker.idle).toBeDefined();
    });

    it("worker group contains paused event", () => {
      expect(IgniterJobsTelemetryEvents.events.worker.paused).toBeDefined();
    });

    it("worker group contains resumed event", () => {
      expect(IgniterJobsTelemetryEvents.events.worker.resumed).toBeDefined();
    });
  });

  describe("queue group", () => {
    it("defines queue group in events", () => {
      expect(IgniterJobsTelemetryEvents.events.queue).toBeDefined();
    });

    it("queue group contains paused event", () => {
      expect(IgniterJobsTelemetryEvents.events.queue.paused).toBeDefined();
    });

    it("queue group contains resumed event", () => {
      expect(IgniterJobsTelemetryEvents.events.queue.resumed).toBeDefined();
    });

    it("queue group contains drained event", () => {
      expect(IgniterJobsTelemetryEvents.events.queue.drained).toBeDefined();
    });

    it("queue group contains cleaned event", () => {
      expect(IgniterJobsTelemetryEvents.events.queue.cleaned).toBeDefined();
    });

    it("queue group contains obliterated event", () => {
      expect(IgniterJobsTelemetryEvents.events.queue.obliterated).toBeDefined();
    });
  });

  describe("get.key()", () => {
    it("returns full key for job.enqueued", () => {
      const key = IgniterJobsTelemetryEvents.get.key("job.enqueued");
      expect(key).toBe("igniter.jobs.job.enqueued");
    });

    it("returns full key for job.completed", () => {
      const key = IgniterJobsTelemetryEvents.get.key("job.completed");
      expect(key).toBe("igniter.jobs.job.completed");
    });

    it("returns full key for job.failed", () => {
      const key = IgniterJobsTelemetryEvents.get.key("job.failed");
      expect(key).toBe("igniter.jobs.job.failed");
    });

    it("returns full key for worker.started", () => {
      const key = IgniterJobsTelemetryEvents.get.key("worker.started");
      expect(key).toBe("igniter.jobs.worker.started");
    });

    it("returns full key for queue.paused", () => {
      const key = IgniterJobsTelemetryEvents.get.key("queue.paused");
      expect(key).toBe("igniter.jobs.queue.paused");
    });
  });

  describe("get.schema()", () => {
    it("returns schema for job.enqueued", () => {
      const schema = IgniterJobsTelemetryEvents.get.schema("job.enqueued");
      expect(schema).toBeDefined();
      expect(schema.shape).toHaveProperty("ctx.job.id");
      expect(schema.shape).toHaveProperty("ctx.job.name");
      expect(schema.shape).toHaveProperty("ctx.job.queue");
    });

    it("returns schema for job.started", () => {
      const schema = IgniterJobsTelemetryEvents.get.schema("job.started");
      expect(schema).toBeDefined();
      expect(schema.shape).toHaveProperty("ctx.job.id");
      expect(schema.shape).toHaveProperty("ctx.job.attempt");
      expect(schema.shape).toHaveProperty("ctx.job.maxAttempts");
    });

    it("returns schema for job.completed", () => {
      const schema = IgniterJobsTelemetryEvents.get.schema("job.completed");
      expect(schema).toBeDefined();
      expect(schema.shape).toHaveProperty("ctx.job.id");
      expect(schema.shape).toHaveProperty("ctx.job.duration");
    });

    it("returns schema for job.failed", () => {
      const schema = IgniterJobsTelemetryEvents.get.schema("job.failed");
      expect(schema).toBeDefined();
      expect(schema.shape).toHaveProperty("ctx.job.id");
      expect(schema.shape).toHaveProperty("ctx.job.error.message");
      expect(schema.shape).toHaveProperty("ctx.job.isFinalAttempt");
    });

    it("returns schema for worker.started", () => {
      const schema = IgniterJobsTelemetryEvents.get.schema("worker.started");
      expect(schema).toBeDefined();
      expect(schema.shape).toHaveProperty("ctx.worker.id");
      expect(schema.shape).toHaveProperty("ctx.worker.queues");
      expect(schema.shape).toHaveProperty("ctx.worker.concurrency");
    });

    it("returns schema for worker.stopped", () => {
      const schema = IgniterJobsTelemetryEvents.get.schema("worker.stopped");
      expect(schema).toBeDefined();
      expect(schema.shape).toHaveProperty("ctx.worker.id");
      expect(schema.shape).toHaveProperty("ctx.worker.processed");
      expect(schema.shape).toHaveProperty("ctx.worker.failed");
    });

    it("returns schema for queue.drained", () => {
      const schema = IgniterJobsTelemetryEvents.get.schema("queue.drained");
      expect(schema).toBeDefined();
      expect(schema.shape).toHaveProperty("ctx.queue.name");
      expect(schema.shape).toHaveProperty("ctx.queue.drained.count");
    });

    it("returns schema for queue.cleaned", () => {
      const schema = IgniterJobsTelemetryEvents.get.schema("queue.cleaned");
      expect(schema).toBeDefined();
      expect(schema.shape).toHaveProperty("ctx.queue.name");
      expect(schema.shape).toHaveProperty("ctx.queue.cleaned.count");
      expect(schema.shape).toHaveProperty("ctx.queue.cleaned.status");
    });
  });

  describe("complete event list", () => {
    it("has all expected job events", () => {
      const jobEvents = [
        "enqueued",
        "started",
        "completed",
        "failed",
        "progress",
        "retrying",
        "scheduled",
      ];

      for (const eventName of jobEvents) {
        expect(IgniterJobsTelemetryEvents.events.job).toHaveProperty(eventName);
      }
    });

    it("has all expected worker events", () => {
      const workerEvents = ["started", "stopped", "idle", "paused", "resumed"];

      for (const eventName of workerEvents) {
        expect(IgniterJobsTelemetryEvents.events.worker).toHaveProperty(
          eventName,
        );
      }
    });

    it("has all expected queue events", () => {
      const queueEvents = [
        "paused",
        "resumed",
        "drained",
        "cleaned",
        "obliterated",
      ];

      for (const eventName of queueEvents) {
        expect(IgniterJobsTelemetryEvents.events.queue).toHaveProperty(
          eventName,
        );
      }
    });
  });
});
