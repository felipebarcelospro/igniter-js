import { describe, it, expect, vi } from "vitest";
import { IgniterJobs } from "../builders/main.builder";
import { IgniterQueueBuilder } from "../builders/queue.builder";
import { IgniterJobsMemoryAdapter } from "../adapters/memory.adapter";
import type { IgniterJobsTelemetry } from "../types/events";

describe("IgniterJobs Telemetry", () => {
  const mockTelemetry: IgniterJobsTelemetry = {
    service: "test-service",
    environment: "test-env",
    emit: vi.fn(),
  };

  const createJobs = (telemetry?: IgniterJobsTelemetry) => {
    const queue = IgniterQueueBuilder.create("test-queue")
      .addJob("simple-job", {
        handler: async () => ({ result: "ok" }),
      })
      .addJob("failing-job", {
        handler: async () => {
          throw new Error("Task failed successfully");
        },
      })
      .build();

    return IgniterJobs.create()
      .withAdapter(IgniterJobsMemoryAdapter.create())
      .withService("test-service")
      .withEnvironment("test-env")
      .withContext(async () => ({}))
      .withTelemetry(telemetry!)
      .addQueue(queue)
      .build();
  };

  it("emits job.enqueued when dispatching a job", async () => {
    const jobs = createJobs(mockTelemetry) as any;

    const jobId = await jobs["test-queue"]["simple-job"].dispatch({
      input: {},
    });

    expect(mockTelemetry.emit).toHaveBeenCalledWith(
      "igniter.jobs.job.enqueued",
      expect.objectContaining({
        attributes: expect.objectContaining({
          "ctx.job.id": jobId,
          "ctx.job.name": "simple-job",
          "ctx.job.queue": "test-queue",
        }),
      }),
    );
  });

  it("emits job.scheduled when scheduling a job", async () => {
    const jobs = createJobs(mockTelemetry) as any;

    const runAt = new Date(Date.now() + 10000);
    const jobId = await jobs["test-queue"]["simple-job"].schedule({
      input: {},
      runAt,
    });

    expect(mockTelemetry.emit).toHaveBeenCalledWith(
      "igniter.jobs.job.scheduled",
      expect.objectContaining({
        attributes: expect.objectContaining({
          "ctx.job.id": jobId,
          "ctx.job.name": "simple-job",
          "ctx.job.queue": "test-queue",
          "ctx.job.scheduledAt": runAt.toISOString(),
        }),
      }),
    );
  });

  it("emits job.started and job.completed for successful execution", async () => {
    const jobs = createJobs(mockTelemetry) as any;

    // Start worker to process jobs
    const worker = await jobs.worker.create().addQueue("test-queue").start();

    await jobs["test-queue"]["simple-job"].dispatch({ input: {} });

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockTelemetry.emit).toHaveBeenCalledWith(
      "igniter.jobs.job.started",
      expect.objectContaining({
        attributes: expect.objectContaining({
          "ctx.job.name": "simple-job",
          "ctx.job.queue": "test-queue",
        }),
      }),
    );

    expect(mockTelemetry.emit).toHaveBeenCalledWith(
      "igniter.jobs.job.completed",
      expect.objectContaining({
        attributes: expect.objectContaining({
          "ctx.job.name": "simple-job",
          "ctx.job.queue": "test-queue",
        }),
      }),
    );

    await worker.close();
  });

  it("emits job.failed for failing execution", async () => {
    const jobs = createJobs(mockTelemetry) as any;

    const worker = await jobs.worker.create().addQueue("test-queue").start();

    await jobs["test-queue"]["failing-job"].dispatch({ input: {} });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockTelemetry.emit).toHaveBeenCalledWith(
      "igniter.jobs.job.failed",
      expect.objectContaining({
        level: "error",
        attributes: expect.objectContaining({
          "ctx.job.name": "failing-job",
          "ctx.job.queue": "test-queue",
          "ctx.job.error.message": "Task failed successfully",
        }),
      }),
    );

    await worker.close();
  });
});
