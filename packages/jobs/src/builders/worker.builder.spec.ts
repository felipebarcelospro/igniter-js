/**
 * @fileoverview Tests for IgniterWorkerBuilder
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { IgniterWorkerBuilder } from "./worker.builder";
import { IgniterJobsMemoryAdapter } from "../adapters/memory.adapter";
import { IgniterJobsError } from "../errors/jobs.error";
import type { IgniterJobsAdapter } from "../types";

describe("IgniterWorkerBuilder", () => {
  let adapter: IgniterJobsAdapter;

  beforeEach(() => {
    adapter = IgniterJobsMemoryAdapter.create();
    adapter.registerJob("email", "send", {
      handler: async () => ({ ok: true }),
    });
    adapter.registerJob("notifications", "push", {
      handler: async () => ({ ok: true }),
    });
  });

  const createBuilder = (allowedQueues: string[] = ["email", "notifications"]) =>
    new IgniterWorkerBuilder({
      adapter,
      allowedQueues,
    });

  describe("constructor", () => {
    it("creates a builder with default state", () => {
      const builder = createBuilder();
      expect(builder).toBeInstanceOf(IgniterWorkerBuilder);
    });

    it("accepts initial state", () => {
      const builder = new IgniterWorkerBuilder({
        adapter,
        allowedQueues: ["email"],
        state: {
          queues: ["email"],
          concurrency: 5,
        },
      });
      expect(builder).toBeInstanceOf(IgniterWorkerBuilder);
    });
  });

  describe("addQueue()", () => {
    it("adds a queue to the worker", () => {
      const builder = createBuilder().addQueue("email");
      expect(builder).toBeInstanceOf(IgniterWorkerBuilder);
    });

    it("returns new instance (immutability)", () => {
      const builder1 = createBuilder();
      const builder2 = builder1.addQueue("email");

      expect(builder1).not.toBe(builder2);
    });

    it("throws for unregistered queue", () => {
      expect(() => {
        createBuilder(["email"]).addQueue("unknown" as any);
      }).toThrow(IgniterJobsError);
    });

    it("throws with queue not found message", () => {
      expect(() => {
        createBuilder(["email"]).addQueue("unknown" as any);
      }).toThrow(/not registered/);
    });

    it("does not add duplicate queue", () => {
      const builder1 = createBuilder().addQueue("email");
      const builder2 = builder1.addQueue("email");

      // Should return same instance when adding duplicate
      expect(builder1).toBe(builder2);
    });

    it("can chain multiple queues", () => {
      const builder = createBuilder()
        .addQueue("email")
        .addQueue("notifications");

      expect(builder).toBeInstanceOf(IgniterWorkerBuilder);
    });
  });

  describe("withConcurrency()", () => {
    it("sets concurrency", () => {
      const builder = createBuilder().withConcurrency(5);
      expect(builder).toBeInstanceOf(IgniterWorkerBuilder);
    });

    it("returns new instance (immutability)", () => {
      const builder1 = createBuilder();
      const builder2 = builder1.withConcurrency(5);

      expect(builder1).not.toBe(builder2);
    });

    it("throws for invalid concurrency (zero)", () => {
      expect(() => {
        createBuilder().withConcurrency(0);
      }).toThrow(IgniterJobsError);
    });

    it("throws for invalid concurrency (negative)", () => {
      expect(() => {
        createBuilder().withConcurrency(-1);
      }).toThrow(IgniterJobsError);
    });

    it("throws for invalid concurrency (NaN)", () => {
      expect(() => {
        createBuilder().withConcurrency(NaN);
      }).toThrow(IgniterJobsError);
    });

    it("throws for invalid concurrency (Infinity)", () => {
      expect(() => {
        createBuilder().withConcurrency(Infinity);
      }).toThrow(IgniterJobsError);
    });

    it("accepts valid positive number", () => {
      expect(() => {
        createBuilder().withConcurrency(10);
      }).not.toThrow();
    });
  });

  describe("withLimiter()", () => {
    it("sets limiter", () => {
      const builder = createBuilder().withLimiter({
        max: 10,
        duration: 1000,
      });
      expect(builder).toBeInstanceOf(IgniterWorkerBuilder);
    });

    it("returns new instance (immutability)", () => {
      const builder1 = createBuilder();
      const builder2 = builder1.withLimiter({ max: 10, duration: 1000 });

      expect(builder1).not.toBe(builder2);
    });

    it("throws for invalid limiter (zero max)", () => {
      expect(() => {
        createBuilder().withLimiter({ max: 0, duration: 1000 });
      }).toThrow(IgniterJobsError);
    });

    it("throws for invalid limiter (negative max)", () => {
      expect(() => {
        createBuilder().withLimiter({ max: -1, duration: 1000 });
      }).toThrow(IgniterJobsError);
    });

    it("throws for invalid limiter (zero duration)", () => {
      expect(() => {
        createBuilder().withLimiter({ max: 10, duration: 0 });
      }).toThrow(IgniterJobsError);
    });

    it("throws for invalid limiter (negative duration)", () => {
      expect(() => {
        createBuilder().withLimiter({ max: 10, duration: -1 });
      }).toThrow(IgniterJobsError);
    });

    it("throws for invalid limiter (NaN values)", () => {
      expect(() => {
        createBuilder().withLimiter({ max: NaN, duration: 1000 });
      }).toThrow(IgniterJobsError);
    });
  });

  describe("handler hooks", () => {
    describe("onActive()", () => {
      it("sets onActive handler", () => {
        const handler = vi.fn();
        const builder = createBuilder().onActive(handler);
        expect(builder).toBeInstanceOf(IgniterWorkerBuilder);
      });

      it("returns new instance (immutability)", () => {
        const handler = vi.fn();
        const builder1 = createBuilder();
        const builder2 = builder1.onActive(handler);

        expect(builder1).not.toBe(builder2);
      });
    });

    describe("onSuccess()", () => {
      it("sets onSuccess handler", () => {
        const handler = vi.fn();
        const builder = createBuilder().onSuccess(handler);
        expect(builder).toBeInstanceOf(IgniterWorkerBuilder);
      });

      it("returns new instance (immutability)", () => {
        const handler = vi.fn();
        const builder1 = createBuilder();
        const builder2 = builder1.onSuccess(handler);

        expect(builder1).not.toBe(builder2);
      });
    });

    describe("onFailure()", () => {
      it("sets onFailure handler", () => {
        const handler = vi.fn();
        const builder = createBuilder().onFailure(handler);
        expect(builder).toBeInstanceOf(IgniterWorkerBuilder);
      });

      it("returns new instance (immutability)", () => {
        const handler = vi.fn();
        const builder1 = createBuilder();
        const builder2 = builder1.onFailure(handler);

        expect(builder1).not.toBe(builder2);
      });
    });

    describe("onIdle()", () => {
      it("sets onIdle handler", () => {
        const handler = vi.fn();
        const builder = createBuilder().onIdle(handler);
        expect(builder).toBeInstanceOf(IgniterWorkerBuilder);
      });

      it("returns new instance (immutability)", () => {
        const handler = vi.fn();
        const builder1 = createBuilder();
        const builder2 = builder1.onIdle(handler);

        expect(builder1).not.toBe(builder2);
      });
    });

    it("supports chaining all handlers", () => {
      const builder = createBuilder()
        .onActive(vi.fn())
        .onSuccess(vi.fn())
        .onFailure(vi.fn())
        .onIdle(vi.fn());

      expect(builder).toBeInstanceOf(IgniterWorkerBuilder);
    });
  });

  describe("start()", () => {
    it("starts a worker and returns a handle", async () => {
      const worker = await createBuilder().addQueue("email").start();

      expect(worker).toBeDefined();
      expect(typeof worker.id).toBe("string");
      expect(worker.queues).toContain("email");

      await worker.close();
    });

    it("returns handle with control methods", async () => {
      const worker = await createBuilder().addQueue("email").start();

      expect(typeof worker.pause).toBe("function");
      expect(typeof worker.resume).toBe("function");
      expect(typeof worker.close).toBe("function");
      expect(typeof worker.isRunning).toBe("function");
      expect(typeof worker.isPaused).toBe("function");
      expect(typeof worker.isClosed).toBe("function");
      expect(typeof worker.getMetrics).toBe("function");

      await worker.close();
    });

    it("uses default concurrency of 1", async () => {
      const worker = await createBuilder().addQueue("email").start();

      const metrics = await worker.getMetrics();
      expect(metrics.concurrency).toBe(1);

      await worker.close();
    });

    it("uses specified concurrency", async () => {
      const worker = await createBuilder()
        .addQueue("email")
        .withConcurrency(5)
        .start();

      const metrics = await worker.getMetrics();
      expect(metrics.concurrency).toBe(5);

      await worker.close();
    });
  });

  describe("worker handle operations", () => {
    it("pause() pauses the worker", async () => {
      const worker = await createBuilder().addQueue("email").start();

      await worker.pause();

      expect(worker.isPaused()).toBe(true);
      expect(worker.isRunning()).toBe(false);

      await worker.close();
    });

    it("resume() resumes a paused worker", async () => {
      const worker = await createBuilder().addQueue("email").start();

      await worker.pause();
      expect(worker.isPaused()).toBe(true);

      await worker.resume();
      expect(worker.isPaused()).toBe(false);
      expect(worker.isRunning()).toBe(true);

      await worker.close();
    });

    it("close() closes the worker", async () => {
      const worker = await createBuilder().addQueue("email").start();

      expect(worker.isClosed()).toBe(false);

      await worker.close();

      expect(worker.isClosed()).toBe(true);
    });

    it("getMetrics() returns worker metrics", async () => {
      const worker = await createBuilder()
        .addQueue("email")
        .withConcurrency(3)
        .start();

      const metrics = await worker.getMetrics();

      expect(metrics).toHaveProperty("failed");
      expect(metrics).toHaveProperty("avgDuration");
      expect(metrics).toHaveProperty("concurrency", 3);

      await worker.close();
    });
  });

  describe("full builder chain", () => {
    it("supports full fluent API chain", async () => {
      const onActive = vi.fn();
      const onSuccess = vi.fn();
      const onFailure = vi.fn();
      const onIdle = vi.fn();

      const worker = await createBuilder()
        .addQueue("email")
        .addQueue("notifications")
        .withConcurrency(2)
        .withLimiter({ max: 100, duration: 60000 })
        .onActive(onActive)
        .onSuccess(onSuccess)
        .onFailure(onFailure)
        .onIdle(onIdle)
        .start();

      expect(worker).toBeDefined();
      expect(worker.queues).toContain("email");
      expect(worker.queues).toContain("notifications");

      await worker.close();
    });
  });
});
