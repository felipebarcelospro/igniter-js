import { describe, it, expect, expectTypeOf } from "vitest";
import { z } from "zod";
import { IgniterJobs } from "./main.builder";
import { IgniterQueue } from "../core/queue";
import { IgniterJobsMemoryAdapter } from "../adapters/memory.adapter";
import { IgniterJobsError } from "../errors/jobs.error";
import type { IgniterJobDefinition, IgniterJobsQueue } from "../types";

describe("IgniterJobsBuilder", () => {
  it("requires adapter/service/environment/context", () => {
    expect(() => IgniterJobs.create().build()).toThrow(IgniterJobsError);

    expect(() =>
      IgniterJobs.create()
        .withAdapter(IgniterJobsMemoryAdapter.create())
        .build(),
    ).toThrow(IgniterJobsError);

    expect(() =>
      IgniterJobs.create()
        .withAdapter(IgniterJobsMemoryAdapter.create())
        .withService("svc")
        .build(),
    ).toThrow(IgniterJobsError);

    expect(() =>
      IgniterJobs.create()
        .withAdapter(IgniterJobsMemoryAdapter.create())
        .withService("svc")
        .withEnvironment("test")
        .build(),
    ).toThrow(IgniterJobsError);
  });

  it("creates a runtime with typed queues and dispatch validates input", async () => {
    const emailQueue = IgniterQueue.create("email")
      .addJob("sendWelcome", {
        input: z.object({ email: z.string().email() }),
        handler: async ({ input }) => ({ email: input.email }),
      })
      .build();

    const jobs = IgniterJobs.create()
      .withAdapter(IgniterJobsMemoryAdapter.create())
      .withService("svc")
      .withEnvironment("test")
      .withContext(async () => ({ ok: true }))
      .addQueue(emailQueue)
      .build();

    await expect(
      jobs.email.sendWelcome.dispatch({ input: { email: "not-an-email" } }),
    ).rejects.toThrow(IgniterJobsError);

    const jobId = await jobs.email.sendWelcome.dispatch({
      input: { email: "user@example.com" },
    });

    expect(typeof jobId).toBe("string");
  });

  it("supports subscribe + worker execution with memory adapter", async () => {
    const emailQueue = IgniterQueue.create("email")
      .addJob("sendWelcome", {
        input: z.object({ email: z.string().email() }),
        handler: async ({ input }) => ({ sent: input.email }),
      })
      .build();

    const jobs = IgniterJobs.create()
      .withAdapter(IgniterJobsMemoryAdapter.create())
      .withService("svc")
      .withEnvironment("test")
      .withContext(async () => ({ ok: true }))
      .addQueue(emailQueue)
      .build();

    const events: string[] = [];

    const off = await jobs.email.sendWelcome.subscribe((event: any) => {
      events.push(event.type);
    });

    await jobs.worker.create().addQueue("email").start();

    await jobs.email.sendWelcome.dispatch({
      input: { email: "user@example.com" },
    });

    // Allow microtasks to run.
    await new Promise((r) => setTimeout(r, 10));

    await off();

    expect(events.some((t) => t.endsWith(":enqueued"))).toBe(true);
    expect(events.some((t) => t.endsWith(":started"))).toBe(true);
    expect(events.some((t) => t.endsWith(":completed"))).toBe(true);
  });

  it("enforces required scope when configured", async () => {
    const queue = IgniterQueue.create("email")
      .addJob("send", { handler: async () => ({ ok: true }) })
      .build();

    const jobs = IgniterJobs.create()
      .withAdapter(IgniterJobsMemoryAdapter.create())
      .withService("svc")
      .withEnvironment("test")
      .withContext(async () => ({ ok: true as const }))
      .addScope("organization", { required: true })
      .addQueue(queue)
      .build();

    jobs.scope("organization", "org_1").email.subscribe((event: any) => {
      event.type;
    });

    await expect(jobs.email.send.dispatch({ input: {} })).rejects.toThrow(
      IgniterJobsError,
    );

    const scoped = jobs.scope("organization", "org_1");

    await expect(scoped.email.send.dispatch({ input: {} })).resolves.toBeTypeOf(
      "string",
    );
  });

  it("infers typed stream events for emit subscribe and read", async () => {
    const inputSchema = z.object({ prompt: z.string() });
    const textDeltaSchema = z.string();
    const statusSchema = z.object({ phase: z.string() });
    type GenerateJob = IgniterJobDefinition<
      unknown,
      typeof inputSchema,
      { ok: true },
      {
        "text-delta": typeof textDeltaSchema;
        status: typeof statusSchema;
      }
    >;

    const queue = IgniterQueue.create("ai")
      .addJob("generate", {
        input: inputSchema,
        stream: {
          persistence: { enabled: true, maxEvents: 100 },
          events: {
            "text-delta": textDeltaSchema,
            status: statusSchema,
          },
        },
        handler: async ({ job }) => {
          await job.stream.emit("text-delta", "hello");
          await job.stream.emit("status", { phase: "done" });
          return { ok: true as const };
        },
      })
      .build() as unknown as IgniterJobsQueue<
      unknown,
      { generate: GenerateJob },
      {}
    > & { name: "ai" };

    const jobs = IgniterJobs.create()
      .withAdapter(IgniterJobsMemoryAdapter.create())
      .withService("svc")
      .withEnvironment("test")
      .withContext(async () => ({}) as unknown)
      .addQueue(queue)
      .build();

    await jobs.ai.generate
      .get("job_1")
      .stream()
      .subscribe((event) => {
        if (event.type === "text-delta") {
          expectTypeOf(event.data).toEqualTypeOf<string>();
        }

        if (event.type === "status") {
          expectTypeOf(event.data).toEqualTypeOf<{ phase: string }>();
        }
      });

    const readResult = await jobs.ai.generate.get("job_1").stream().read();
    const item = readResult.items[0];
    if (item?.type === "text-delta") {
      expectTypeOf(item.data).toEqualTypeOf<string>();
    }
  });

  it("falls back to string and unknown for stream events without schemas", async () => {
    type GenerateJob = IgniterJobDefinition<unknown, unknown, { ok: boolean }>;

    const queue = IgniterQueue.create("ai")
      .addJob("generate", {
        stream: {
          persistence: { enabled: false },
        },
        handler: async ({ job }) => {
          await job.stream.emit("chunk", { ok: true });
          return { ok: true };
        },
      })
      .build() as unknown as IgniterJobsQueue<
      unknown,
      { generate: GenerateJob },
      {}
    > & { name: "ai" };

    const jobs = IgniterJobs.create()
      .withAdapter(IgniterJobsMemoryAdapter.create())
      .withService("svc")
      .withEnvironment("test")
      .withContext(async () => ({}) as unknown)
      .addQueue(queue)
      .build();

    await jobs.ai.generate
      .get("job_1")
      .stream()
      .subscribe((event) => {
        expectTypeOf(event.type).toEqualTypeOf<string>();
        expectTypeOf(event.data).toEqualTypeOf<unknown>();
      });
  });

  it("streams live events and persisted history through the runtime", async () => {
    const textDeltaSchema = z.string();
    const doneSchema = z.object({ chunks: z.number() });
    type GenerateJob = IgniterJobDefinition<
      unknown,
      unknown,
      { ok: boolean },
      {
        "text-delta": typeof textDeltaSchema;
        done: typeof doneSchema;
      }
    >;

    const queue = IgniterQueue.create("ai")
      .addJob("generate", {
        stream: {
          persistence: { enabled: true, maxEvents: 10 },
          events: {
            "text-delta": textDeltaSchema,
            done: doneSchema,
          },
        },
        handler: async ({ job }) => {
          await job.stream.emit("text-delta", "hello");
          await job.stream.emit("text-delta", " world");
          await job.stream.emit("done", { chunks: 2 });
          return { ok: true };
        },
      })
      .build() as unknown as IgniterJobsQueue<
      unknown,
      { generate: GenerateJob },
      {}
    > & { name: "ai" };

    const jobs = IgniterJobs.create()
      .withAdapter(IgniterJobsMemoryAdapter.create())
      .withService("svc")
      .withEnvironment("test")
      .withContext(async () => ({}) as unknown)
      .addQueue(queue)
      .build();

    await jobs.worker.create().addQueue("ai").start();
    const jobId = await jobs.ai.generate.dispatch({ input: {} });

    const liveEvents: Array<{ type: string; data: unknown }> = [];
    const off = await jobs.ai.generate
      .get(jobId)
      .stream()
      .subscribe((event) => {
        liveEvents.push({ type: event.type, data: event.data });
      });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const history = await jobs.ai.generate.get(jobId).stream().read();
    await off();

    expect(liveEvents.map((event) => event.type)).toEqual([
      "text-delta",
      "text-delta",
      "done",
    ]);
    expect(history.items).toHaveLength(3);
    expect(history.items[0]?.data).toBe("hello");
    expect(history.items[2]?.type).toBe("done");
  });

  it("returns empty stream history when persistence is disabled", async () => {
    const queue = IgniterQueue.create("ai")
      .addJob("generate", {
        stream: {
          persistence: { enabled: false },
        },
        handler: async () => {
          return { ok: true };
        },
      })
      .build() as unknown as IgniterJobsQueue<
      unknown,
      { generate: IgniterJobDefinition<unknown, unknown, { ok: boolean }> },
      {}
    > & { name: "ai" };

    const jobs = IgniterJobs.create()
      .withAdapter(IgniterJobsMemoryAdapter.create())
      .withService("svc")
      .withEnvironment("test")
      .withContext(async () => ({}) as unknown)
      .addQueue(queue)
      .build();

    await jobs.worker.create().addQueue("ai").start();
    const jobId = await jobs.ai.generate.dispatch({ input: {} });
    await new Promise((resolve) => setTimeout(resolve, 25));

    const history = await jobs.ai.generate.get(jobId).stream().read();
    expect(history.items).toEqual([]);
  });
});
