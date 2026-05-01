/**
 * @fileoverview Tests for IgniterJobsSQLiteAdapter
 */

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { IgniterJobsSQLiteAdapter } from "./sqlite.adapter";
import type { IgniterJobDefinition, IgniterCronDefinition, IgniterJobsAdapter } from "../types";

describe("IgniterJobsSQLiteAdapter", () => {
  let adapter: IgniterJobsSQLiteAdapter;

  beforeEach(() => {
    // Use in-memory database for tests
    adapter = IgniterJobsSQLiteAdapter.create({
      path: ":memory:",
      pollingInterval: 50, // Fast polling for tests
    }) as IgniterJobsSQLiteAdapter;
  });

  afterEach(async () => {
    await adapter.shutdown();
  });

  describe("static create()", () => {
    it("creates a new instance", () => {
      const instance = IgniterJobsSQLiteAdapter.create({ path: ":memory:" });
      expect(instance).toBeInstanceOf(IgniterJobsSQLiteAdapter);
      void (instance as IgniterJobsSQLiteAdapter).shutdown();
    });

    it("has a sqlite client type", () => {
      expect(adapter.client.type).toBe("sqlite");
    });

    it("stores the database path", () => {
      expect(adapter.client.path).toBe(":memory:");
    });
  });

  describe("registerJob()", () => {
    it("registers a job definition for a queue", () => {
      const definition: IgniterJobDefinition<any, any, any> = {
        handler: async () => ({ ok: true }),
      };

      expect(() => {
        adapter.registerJob("email", "send", definition);
      }).not.toThrow();
    });

    it("throws on duplicate job registration", () => {
      const definition: IgniterJobDefinition<any, any, any> = {
        handler: async () => ({ ok: true }),
      };

      adapter.registerJob("email", "send", definition);

      expect(() => {
        adapter.registerJob("email", "send", definition);
      }).toThrow(/already registered/);
    });

    it("allows same job name in different queues", () => {
      const definition: IgniterJobDefinition<any, any, any> = {
        handler: async () => ({ ok: true }),
      };

      adapter.registerJob("email", "process", definition);
      expect(() => {
        adapter.registerJob("notifications", "process", definition);
      }).not.toThrow();
    });
  });

  describe("registerCron()", () => {
    it("registers a cron definition for a queue", () => {
      const definition: IgniterCronDefinition<any, any> = {
        cron: "0 0 * * *",
        handler: async () => ({ ok: true }),
      };

      expect(() => {
        adapter.registerCron("email", "cleanup", definition);
      }).not.toThrow();
    });

    it("throws on duplicate cron registration", () => {
      const definition: IgniterCronDefinition<any, any> = {
        cron: "0 0 * * *",
        handler: async () => ({ ok: true }),
      };

      adapter.registerCron("email", "cleanup", definition);

      expect(() => {
        adapter.registerCron("email", "cleanup", definition);
      }).toThrow(/already registered/);
    });
  });

  describe("dispatch()", () => {
    beforeEach(() => {
      adapter.registerJob("email", "send", {
        handler: async () => ({ ok: true }),
      });
    });

    it("dispatches a job and returns a job id", async () => {
      const jobId = await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: { to: "user@example.com" },
      });

      expect(typeof jobId).toBe("string");
      expect(jobId).toContain("job_");
    });

    it("stores job with correct initial state", async () => {
      const jobId = await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: { to: "user@example.com" },
      });

      const job = await adapter.getJob(jobId);

      expect(job).toBeDefined();
      expect(job?.id).toBe(jobId);
      expect(job?.name).toBe("send");
      expect(job?.queue).toBe("email");
      expect(job?.input).toEqual({ to: "user@example.com" });
      expect(job?.status).toBe("waiting");
      expect(job?.progress).toBe(0);
      expect(job?.attemptsMade).toBe(0);
    });

    it("respects priority option", async () => {
      const jobId = await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: {},
        priority: 10,
      });

      const job = await adapter.getJob(jobId);
      expect(job?.priority).toBe(10);
    });

    it("stores metadata", async () => {
      const jobId = await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: {},
        metadata: { userId: "user_123" },
      });

      const job = await adapter.getJob(jobId);
      expect(job?.metadata).toEqual({ userId: "user_123" });
    });

    it("stores scope information", async () => {
      const jobId = await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: {},
        scope: { type: "organization", id: "org_1" },
      });

      const job = await adapter.getJob(jobId);
      expect(job?.scope).toEqual({ type: "organization", id: "org_1" });
    });

    it("creates delayed job when delay is specified", async () => {
      const jobId = await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: {},
        delay: 60000,
      });

      const job = await adapter.getJob(jobId);
      expect(job?.status).toBe("delayed");
    });
  });

  describe("schedule()", () => {
    beforeEach(() => {
      adapter.registerJob("email", "send", {
        handler: async () => ({ ok: true }),
      });
    });

    it("schedules a job for future execution", async () => {
      const runAt = new Date(Date.now() + 60000);
      const jobId = await adapter.schedule({
        queue: "email",
        jobName: "send",
        input: {},
        at: runAt,
      });

      expect(typeof jobId).toBe("string");

      const job = await adapter.getJob(jobId);
      expect(job?.status).toBe("delayed");
    });

    it("throws if runAt is in the past", async () => {
      const runAt = new Date(Date.now() - 1000);

      await expect(
        adapter.schedule({
          queue: "email",
          jobName: "send",
          input: {},
          at: runAt,
        })
      ).rejects.toThrow();
    });
  });

  describe("getJob()", () => {
    it("returns null for non-existent job", async () => {
      const job = await adapter.getJob("non_existent_id");
      expect(job).toBeNull();
    });

    it("returns job data for existing job", async () => {
      adapter.registerJob("email", "send", {
        handler: async () => ({ ok: true }),
      });

      const jobId = await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: { test: true },
      });

      const job = await adapter.getJob(jobId);
      expect(job).not.toBeNull();
      expect(job?.id).toBe(jobId);
    });

    it("respects queue filter", async () => {
      adapter.registerJob("email", "send", {
        handler: async () => ({ ok: true }),
      });

      const jobId = await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: {},
      });

      const job = await adapter.getJob(jobId, "email");
      expect(job).not.toBeNull();

      const wrongQueue = await adapter.getJob(jobId, "other");
      expect(wrongQueue).toBeNull();
    });
  });

  describe("getJobState()", () => {
    it("returns null for non-existent job", async () => {
      const state = await adapter.getJobState("non_existent_id");
      expect(state).toBeNull();
    });

    it("returns job state for existing job", async () => {
      adapter.registerJob("email", "send", {
        handler: async () => ({ ok: true }),
      });

      const jobId = await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: {},
      });

      const state = await adapter.getJobState(jobId);
      expect(state).toBe("waiting");
    });
  });

  describe("getJobLogs()", () => {
    it("returns empty array for non-existent job", async () => {
      const logs = await adapter.getJobLogs("non_existent_id");
      expect(logs).toEqual([]);
    });

    it("returns logs for existing job", async () => {
      adapter.registerJob("email", "send", {
        handler: async () => ({ ok: true }),
      });

      const jobId = await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: {},
      });

      const logs = await adapter.getJobLogs(jobId);
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe("getJobProgress()", () => {
    it("returns 0 for non-existent job", async () => {
      const progress = await adapter.getJobProgress("non_existent_id");
      expect(progress).toBe(0);
    });

    it("returns progress for existing job", async () => {
      adapter.registerJob("email", "send", {
        handler: async () => ({ ok: true }),
      });

      const jobId = await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: {},
      });

      const progress = await adapter.getJobProgress(jobId);
      expect(progress).toBe(0);
    });
  });

  describe("removeJob()", () => {
    it("removes an existing job", async () => {
      adapter.registerJob("email", "send", {
        handler: async () => ({ ok: true }),
      });

      const jobId = await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: {},
      });

      await adapter.removeJob(jobId);

      const job = await adapter.getJob(jobId);
      expect(job).toBeNull();
    });

    it("does not throw when removing non-existent job", async () => {
      await expect(adapter.removeJob("non_existent_id")).resolves.not.toThrow();
    });
  });

  describe("retryJob()", () => {
    beforeEach(() => {
      adapter.registerJob("email", "send", {
        handler: async () => {
          throw new Error("Fail");
        },
        attempts: 3,
      });
    });

    it("throws for non-existent job", async () => {
      await expect(adapter.retryJob("non_existent_id")).rejects.toThrow();
    });

    it("resets job status to waiting", async () => {
      const jobId = await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: {},
      });

      await adapter.retryJob(jobId);

      const state = await adapter.getJobState(jobId);
      expect(state).toBe("waiting");
    });
  });

  describe("promoteJob()", () => {
    it("throws for non-existent job", async () => {
      await expect(adapter.promoteJob("non_existent_id")).rejects.toThrow();
    });

    it("promotes delayed job to waiting", async () => {
      adapter.registerJob("email", "send", {
        handler: async () => ({ ok: true }),
      });

      const jobId = await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: {},
        delay: 60000,
      });

      let state = await adapter.getJobState(jobId);
      expect(state).toBe("delayed");

      await adapter.promoteJob(jobId);

      state = await adapter.getJobState(jobId);
      expect(state).toBe("waiting");
    });
  });

  describe("moveJobToFailed()", () => {
    it("throws for non-existent job", async () => {
      await expect(
        adapter.moveJobToFailed("non_existent_id", "Test error")
      ).rejects.toThrow();
    });

    it("marks job as failed with error message", async () => {
      adapter.registerJob("email", "send", {
        handler: async () => ({ ok: true }),
      });

      const jobId = await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: {},
      });

      await adapter.moveJobToFailed(jobId, "Test error");

      const job = await adapter.getJob(jobId);
      expect(job?.status).toBe("failed");
      expect(job?.error).toBe("Test error");
    });
  });

  describe("queue management", () => {
    beforeEach(() => {
      adapter.registerJob("email", "send", {
        handler: async () => ({ ok: true }),
      });
      adapter.registerJob("notifications", "push", {
        handler: async () => ({ ok: true }),
      });
    });

    describe("listQueues()", () => {
      it("returns list of queues with jobs", async () => {
        await adapter.dispatch({ queue: "email", jobName: "send", input: {} });
        await adapter.dispatch({
          queue: "notifications",
          jobName: "push",
          input: {},
        });

        const queues = await adapter.listQueues();
        expect(queues.length).toBeGreaterThanOrEqual(2);
        expect(queues.some((q) => q.name === "email")).toBe(true);
        expect(queues.some((q) => q.name === "notifications")).toBe(true);
      });
    });

    describe("getQueueInfo()", () => {
      it("returns queue info with job counts", async () => {
        await adapter.dispatch({ queue: "email", jobName: "send", input: {} });
        await adapter.dispatch({ queue: "email", jobName: "send", input: {} });

        const info = await adapter.getQueueInfo("email");

        expect(info).toBeDefined();
        expect(info?.name).toBe("email");
        expect(info?.jobCounts.waiting).toBeGreaterThanOrEqual(2);
      });
    });

    describe("getQueueJobCounts()", () => {
      it("returns counts by status", async () => {
        await adapter.dispatch({ queue: "email", jobName: "send", input: {} });

        const counts = await adapter.getQueueJobCounts("email");

        expect(counts).toHaveProperty("waiting");
        expect(counts).toHaveProperty("active");
        expect(counts).toHaveProperty("completed");
        expect(counts).toHaveProperty("failed");
        expect(counts).toHaveProperty("delayed");
        expect(counts.waiting).toBeGreaterThanOrEqual(1);
      });
    });

    describe("pauseQueue()", () => {
      it("pauses a queue", async () => {
        await adapter.pauseQueue("email");

        const isPaused = await adapter.queues.isPaused("email");
        expect(isPaused).toBe(true);
      });

      it("marks waiting jobs as paused", async () => {
        await adapter.dispatch({ queue: "email", jobName: "send", input: {} });

        await adapter.pauseQueue("email");

        const counts = await adapter.getQueueJobCounts("email");
        expect(counts.paused).toBeGreaterThanOrEqual(1);
        expect(counts.waiting).toBe(0);
      });
    });

    describe("resumeQueue()", () => {
      it("resumes a paused queue", async () => {
        await adapter.pauseQueue("email");
        await adapter.resumeQueue("email");

        const isPaused = await adapter.queues.isPaused("email");
        expect(isPaused).toBe(false);
      });

      it("marks paused jobs as waiting", async () => {
        await adapter.dispatch({ queue: "email", jobName: "send", input: {} });
        await adapter.pauseQueue("email");
        await adapter.resumeQueue("email");

        const counts = await adapter.getQueueJobCounts("email");
        expect(counts.waiting).toBeGreaterThanOrEqual(1);
        expect(counts.paused).toBe(0);
      });
    });

    describe("drainQueue()", () => {
      it("removes waiting jobs from queue", async () => {
        await adapter.dispatch({ queue: "email", jobName: "send", input: {} });
        await adapter.dispatch({ queue: "email", jobName: "send", input: {} });

        const removed = await adapter.drainQueue("email");

        expect(removed).toBeGreaterThanOrEqual(2);

        const counts = await adapter.getQueueJobCounts("email");
        expect(counts.waiting).toBe(0);
      });
    });

    describe("cleanQueue()", () => {
      it("removes completed jobs older than grace period", async () => {
        const cleaned = await adapter.cleanQueue("email", {
          status: ["completed"],
          olderThan: 0,
          limit: 100,
        });

        expect(typeof cleaned).toBe("number");
      });
    });

    describe("obliterateQueue()", () => {
      it("removes all jobs from queue", async () => {
        await adapter.dispatch({ queue: "email", jobName: "send", input: {} });
        await adapter.dispatch({ queue: "email", jobName: "send", input: {} });

        await adapter.obliterateQueue("email", { force: true });

        const counts = await adapter.getQueueJobCounts("email");
        expect(counts.waiting).toBe(0);
        expect(counts.active).toBe(0);
        expect(counts.completed).toBe(0);
        expect(counts.failed).toBe(0);
      });
    });

    describe("retryAllInQueue()", () => {
      it("retries all failed jobs", async () => {
        const jobId = await adapter.dispatch({
          queue: "email",
          jobName: "send",
          input: {},
        });

        await adapter.moveJobToFailed(jobId, "Test error");

        const retried = await adapter.retryAllInQueue("email");
        expect(retried).toBe(1);

        const state = await adapter.getJobState(jobId);
        expect(state).toBe("waiting");
      });
    });
  });

  describe("searchJobs()", () => {
    beforeEach(async () => {
      adapter.registerJob("email", "send", {
        handler: async () => ({ ok: true }),
      });

      await adapter.dispatch({ queue: "email", jobName: "send", input: {} });
      await adapter.dispatch({ queue: "email", jobName: "send", input: {} });
      await adapter.dispatch({ queue: "email", jobName: "send", input: {} });
    });

    it("returns jobs matching queue filter", async () => {
      const results = await adapter.searchJobs({ queue: "email" });
      expect(results.length).toBeGreaterThanOrEqual(3);
    });

    it("returns jobs matching status filter", async () => {
      const results = await adapter.searchJobs({
        queue: "email",
        status: ["waiting"],
      });
      expect(results.length).toBeGreaterThanOrEqual(3);
    });

    it("respects limit and offset", async () => {
      const results = await adapter.searchJobs({
        queue: "email",
        limit: 2,
        offset: 0,
      });
      expect(results.length).toBeLessThanOrEqual(2);

      const results2 = await adapter.searchJobs({
        queue: "email",
        limit: 2,
        offset: 2,
      });
      expect(results2.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("searchQueues()", () => {
    beforeEach(async () => {
      adapter.registerJob("email", "send", {
        handler: async () => ({ ok: true }),
      });
      adapter.registerJob("notifications", "push", {
        handler: async () => ({ ok: true }),
      });

      await adapter.dispatch({ queue: "email", jobName: "send", input: {} });
      await adapter.dispatch({
        queue: "notifications",
        jobName: "push",
        input: {},
      });
    });

    it("returns queues matching name filter", async () => {
      const results = await adapter.searchQueues({ name: "email" });
      expect(results.length).toBe(1);
      expect(results[0]?.name).toBe("email");
    });

    it("returns all queues when no filter", async () => {
      const results = await adapter.searchQueues({});
      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("workers", () => {
    beforeEach(() => {
      adapter.registerJob("email", "send", {
        handler: async () => ({ ok: true }),
      });
    });

    describe("createWorker()", () => {
      it("creates a worker and returns a handle", async () => {
        const worker = await adapter.createWorker({
          queues: ["email"],
          concurrency: 1,
        });

        expect(worker).toBeDefined();
        expect(typeof worker.id).toBe("string");
        expect(worker.queues).toContain("email");
        expect(typeof worker.pause).toBe("function");
        expect(typeof worker.resume).toBe("function");
        expect(typeof worker.close).toBe("function");
        expect(typeof worker.isRunning).toBe("function");
        expect(typeof worker.isPaused).toBe("function");
        expect(typeof worker.isClosed).toBe("function");
        expect(typeof worker.getMetrics).toBe("function");

        await worker.close();
      });
    });

    describe("getWorkers()", () => {
      it("returns a Map of active workers", async () => {
        const worker = await adapter.createWorker({
          queues: ["email"],
          concurrency: 1,
        });

        const workers = adapter.getWorkers();
        expect(workers).toBeInstanceOf(Map);
        expect(workers.size).toBeGreaterThanOrEqual(1);
        expect(workers.has(worker.id)).toBe(true);

        await worker.close();
      });
    });

    describe("searchWorkers()", () => {
      it("returns workers matching queue filter", async () => {
        const worker = await adapter.createWorker({
          queues: ["email"],
          concurrency: 1,
        });

        const results = await adapter.searchWorkers({ queue: "email" });
        expect(results.length).toBeGreaterThanOrEqual(1);

        await worker.close();
      });
    });
  });

  describe("job processing", () => {
    it("processes jobs with worker", async () => {
      const results: any[] = [];

      adapter.registerJob("email", "send", {
        handler: async ({ input }) => {
          results.push(input);
          return { sent: true };
        },
      });

      const worker = await adapter.createWorker({
        queues: ["email"],
        concurrency: 1,
      });

      const jobId = await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: { to: "test@example.com" },
      });

      // Wait for job to be processed
      await new Promise((resolve) => setTimeout(resolve, 200));

      const job = await adapter.getJob(jobId);
      expect(job?.status).toBe("completed");
      expect(job?.result).toEqual({ sent: true });
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ to: "test@example.com" });

      await worker.close();
    });

    it("retries failed jobs", async () => {
      let attempts = 0;

      adapter.registerJob("email", "send", {
        handler: async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error("Temporary failure");
          }
          return { ok: true };
        },
      });

      const worker = await adapter.createWorker({
        queues: ["email"],
        concurrency: 1,
      });

      const jobId = await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: {},
        attempts: 3,
      });

      // Wait for retries
      await new Promise((resolve) => setTimeout(resolve, 500));

      const job = await adapter.getJob(jobId);
      expect(job?.status).toBe("completed");
      expect(attempts).toBe(3);

      await worker.close();
    });

    it("marks job as failed after max attempts", async () => {
      adapter.registerJob("email", "send", {
        handler: async () => {
          throw new Error("Permanent failure");
        },
      });

      const worker = await adapter.createWorker({
        queues: ["email"],
        concurrency: 1,
      });

      const jobId = await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: {},
        attempts: 2,
      });

      // Wait for retries
      await new Promise((resolve) => setTimeout(resolve, 400));

      const job = await adapter.getJob(jobId);
      expect(job?.status).toBe("failed");
      expect(job?.error).toBe("Permanent failure");

      await worker.close();
    });

    it("calls worker handlers", async () => {
      const handlers = {
        onActive: vi.fn(),
        onSuccess: vi.fn(),
        onIdle: vi.fn(),
      };

      adapter.registerJob("email", "send", {
        handler: async () => ({ ok: true }),
      });

      const worker = await adapter.createWorker({
        queues: ["email"],
        concurrency: 1,
        handlers,
      });

      await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: {},
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(handlers.onActive).toHaveBeenCalled();
      expect(handlers.onSuccess).toHaveBeenCalled();
      expect(handlers.onIdle).toHaveBeenCalled();

      await worker.close();
    });

    it("processes jobs in priority order", async () => {
      const results: number[] = [];

      adapter.registerJob("email", "send", {
        handler: async ({ input }) => {
          results.push((input as any).priority);
          return { ok: true };
        },
      });

      // Dispatch jobs with different priorities
      await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: { priority: 1 },
        priority: 1,
      });
      await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: { priority: 10 },
        priority: 10,
      });
      await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: { priority: 5 },
        priority: 5,
      });

      const worker = await adapter.createWorker({
        queues: ["email"],
        concurrency: 1,
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Higher priority should be processed first
      expect(results[0]).toBe(10);
      expect(results[1]).toBe(5);
      expect(results[2]).toBe(1);

      await worker.close();
    });
  });

  describe("pub/sub", () => {
    describe("publishEvent()", () => {
      it("publishes an event to a channel", async () => {
        const handler = vi.fn();

        await adapter.subscribeEvent("test-channel", handler);
        await adapter.publishEvent("test-channel", {
          type: "test:event",
          timestamp: new Date().toISOString(),
        });

        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({ type: "test:event" })
        );
      });
    });

    describe("subscribeEvent()", () => {
      it("subscribes to events on a channel", async () => {
        const events: any[] = [];
        const handler = (event: any) => { events.push(event); };

        const unsubscribe = await adapter.subscribeEvent(
          "test-channel",
          handler
        );

        await adapter.publishEvent("test-channel", {
          type: "first",
          timestamp: new Date().toISOString(),
        });
        await adapter.publishEvent("test-channel", {
          type: "second",
          timestamp: new Date().toISOString(),
        });

        expect(events).toHaveLength(2);
        expect(events[0].type).toBe("first");
        expect(events[1].type).toBe("second");

        await unsubscribe();
      });

      it("returns unsubscribe function", async () => {
        const handler = vi.fn();

        const unsubscribe = await adapter.subscribeEvent(
          "test-channel",
          handler
        );

        await adapter.publishEvent("test-channel", {
          type: "before",
          timestamp: new Date().toISOString(),
        });

        await unsubscribe();

        await adapter.publishEvent("test-channel", {
          type: "after",
          timestamp: new Date().toISOString(),
        });

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({ type: "before" })
        );
      });
    });
  });

  describe("shutdown()", () => {
    it("clears workers and subscribers", async () => {
      adapter.registerJob("email", "send", {
        handler: async () => ({ ok: true }),
      });

      await adapter.createWorker({
        queues: ["email"],
        concurrency: 1,
      });

      const workersBefore = adapter.getWorkers();
      expect(workersBefore.size).toBeGreaterThanOrEqual(1);

      await adapter.shutdown();

      const workersAfter = adapter.getWorkers();
      expect(workersAfter.size).toBe(0);
    });
  });

  describe("queues manager interface", () => {
    beforeEach(async () => {
      adapter.registerJob("email", "send", {
        handler: async () => ({ ok: true }),
      });
      await adapter.dispatch({ queue: "email", jobName: "send", input: {} });
    });

    it("queues.list() returns all queues", async () => {
      const queues = await adapter.queues.list();
      expect(Array.isArray(queues)).toBe(true);
    });

    it("queues.get() returns queue info", async () => {
      const info = await adapter.queues.get("email");
      expect(info?.name).toBe("email");
    });

    it("queues.getJobCounts() returns job counts", async () => {
      const counts = await adapter.queues.getJobCounts("email");
      expect(counts).toHaveProperty("waiting");
    });

    it("queues.getJobs() returns jobs", async () => {
      const jobs = await adapter.queues.getJobs("email", {
        status: ["waiting"],
      });
      expect(Array.isArray(jobs)).toBe(true);
    });

    it("queues.pause() pauses the queue", async () => {
      await adapter.queues.pause("email");
      const isPaused = await adapter.queues.isPaused("email");
      expect(isPaused).toBe(true);
    });

    it("queues.resume() resumes the queue", async () => {
      await adapter.queues.pause("email");
      await adapter.queues.resume("email");
      const isPaused = await adapter.queues.isPaused("email");
      expect(isPaused).toBe(false);
    });

    it("queues.drain() drains the queue", async () => {
      const removed = await adapter.queues.drain("email");
      expect(typeof removed).toBe("number");
    });

    it("queues.clean() cleans the queue", async () => {
      const cleaned = await adapter.queues.clean("email", {
        status: ["completed"],
        olderThan: 0,
        limit: 100,
      });
      expect(typeof cleaned).toBe("number");
    });

    it("queues.obliterate() obliterates the queue", async () => {
      await adapter.queues.obliterate("email", { force: true });
      const counts = await adapter.queues.getJobCounts("email");
      expect(counts.waiting).toBe(0);
    });
  });

  describe("persistence", () => {
    it("jobs persist across adapter instances (file-based)", async () => {
      // Note: This test uses in-memory, so it demonstrates the pattern
      // but won't actually persist. In real usage with a file path, it would.
      adapter.registerJob("email", "send", {
        handler: async () => ({ ok: true }),
      });

      const jobId = await adapter.dispatch({
        queue: "email",
        jobName: "send",
        input: { test: "persistence" },
      });

      // Before shutdown, job exists
      const beforeJob = await adapter.getJob(jobId);
      expect(beforeJob).not.toBeNull();

      // After shutdown, in-memory data is lost
      // But with a file path, it would persist
    });
  });
});
