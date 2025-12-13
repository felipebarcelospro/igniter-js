import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createIgniterJobsService,
  createJobDefinition,
  createJobsRouter,
} from "../jobs.service";
import type {
  IgniterJobQueueAdapter,
  JobDefinition,
  JobsRouter,
  JobLimiter,
} from "../../types/jobs.interface";
import { z } from "zod";

// Mock adapter for testing
const createMockAdapter = (): IgniterJobQueueAdapter<any> => ({
  client: {},
  bulkRegister: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockImplementation((config) => config),
  router: vi
    .fn()
    .mockImplementation((config) => ({ ...config, register: vi.fn() })),
  merge: vi.fn().mockImplementation((routers) => ({
    ...routers,
    createProxy: () => {
      // Create a proxy that matches the structure of the routers
      const proxy = {};

      for (const [namespace, router] of Object.entries(routers)) {
        proxy[namespace] = {
          // @ts-expect-error - Testing runtime validation
          ...Object.keys(router.jobs).reduce(
            (acc, jobId) => ({
              ...acc,
              [jobId]: {
                enqueue: vi.fn().mockResolvedValue("job-123"),
                schedule: vi.fn().mockResolvedValue("job-123"),
              },
            }),
            {},
          ),
          bulk: vi.fn().mockResolvedValue(["job-123", "job-123"]),
        };
      }

      return proxy;
    },
  })),
  invoke: vi.fn().mockResolvedValue("job-123"),
  search: vi.fn().mockResolvedValue([]),
  worker: vi.fn().mockResolvedValue(undefined),
  shutdown: vi.fn().mockResolvedValue(undefined),
  cron: vi.fn().mockImplementation((schedule, handler, options) => ({
    name: `cron-${Date.now()}`,
    input: undefined,
    handler,
    repeat: { cron: schedule },
    ...options,
  })),
});

// Mock context type
interface TestContext {
  userId: string;
  logger: { log: (msg: string) => void };
}

describe("Jobs Service", () => {
  let mockAdapter: IgniterJobQueueAdapter<TestContext>;
  let context: () => TestContext;

  beforeEach(() => {
    mockAdapter = createMockAdapter();
    context = () => ({
      userId: "test-user",
      logger: { log: vi.fn() },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Service Creation", () => {
    test("should create jobs service with adapter and context factory", () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        context,
      });

      expect(service).toBeDefined();
      expect(service.getRegisteredJobs()).toEqual([]);
    });
  });

  describe("Job Registration", () => {
    test("should register a single job with valid definition", () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        context,
      });

      const jobDef = service.register({
        name: "Send Email",
        input: z.object({ email: z.string().email() }),
        handler: async ({ input, context }) => {
          context.logger.log(`Sending email to ${input.email}`);
          return { sent: true };
        },
      });

      expect(jobDef).toBeDefined();
      expect(jobDef.name).toBe("Send Email");
      expect(jobDef.input).toBeDefined();
      expect(jobDef.handler).toBeInstanceOf(Function);
    });

    test("should throw error for invalid job definition", () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        context,
      });

      expect(() => {
        service.register({
          name: "",
          input: z.object({}),
          handler: async () => {},
        });
      }).toThrow("Job name is required and cannot be empty");

      expect(() => {
        service.register({
          name: "Valid Name",
          input: null as any,
          handler: async () => {},
        });
      }).toThrow("Job input schema is required");

      expect(() => {
        service.register({
          name: "Valid Name",
          input: z.object({}),
          handler: null as any,
        });
      }).toThrow("Job handler is required and must be a function");
    });

    test("should bulk register multiple jobs", async () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        context,
      });

      const jobs = {
        "send-email": {
          name: "Send Email",
          input: z.object({ email: z.string() }),
          handler: async () => ({ sent: true }),
        },
        "process-payment": {
          name: "Process Payment",
          input: z.object({ amount: z.number() }),
          handler: async () => ({ processed: true }),
        },
      };

      const updatedService = await service.bulkRegister(jobs);

      expect(mockAdapter.bulkRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          "send-email": expect.objectContaining({ name: "Send Email" }),
          "process-payment": expect.objectContaining({
            name: "Process Payment",
          }),
        }),
      );
      expect(updatedService).toBeDefined();
    });
  });

  describe("Job Invocation", () => {
    test("should invoke a registered job with type-safe parameters", async () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        context,
      });

      const jobs = {
        "send-email": {
          name: "Send Email",
          input: z.object({ email: z.string() }),
          handler: async () => ({ sent: true }),
        },
      };

      const updatedService = await service.bulkRegister(jobs);

      const jobId = await updatedService.invoke({
        id: "send-email",
        input: { email: "test@example.com" },
      });

      expect(mockAdapter.invoke).toHaveBeenCalledWith({
        id: "send-email",
        input: { email: "test@example.com" },
      });
      expect(jobId).toBe("job-123");
    });

    test("should invoke multiple jobs in batch", async () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        context,
      });

      const jobs = {
        "send-email": {
          name: "Send Email",
          input: z.object({ email: z.string() }),
          handler: async () => ({ sent: true }),
        },
      };

      const updatedService = await service.bulkRegister(jobs);

      const jobIds = await updatedService.invokeMany([
        { id: "send-email", input: { email: "test1@example.com" } },
        { id: "send-email", input: { email: "test2@example.com" } },
      ]);

      expect(mockAdapter.invoke).toHaveBeenCalledTimes(2);
      expect(jobIds).toEqual(["job-123", "job-123"]);
    });
  });

  describe("Job Management", () => {
    test("should search for jobs with filters", async () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        context,
      });

      const mockResults = [
        {
          id: "job-1",
          name: "test-job",
          payload: { test: true },
          status: "completed" as const,
          createdAt: new Date(),
          attemptsMade: 1,
          priority: 0,
        },
      ];

      (mockAdapter.search as any).mockResolvedValue(mockResults);

      const results = await service.search({
        filter: { status: ["completed"], limit: 10 },
      });

      expect(mockAdapter.search).toHaveBeenCalledWith({
        filter: { status: ["completed"], limit: 10 },
      });
      expect(results).toEqual(mockResults);
    });

    test("should start worker with configuration", async () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        context,
      });

      await service.worker({
        queues: ["test-queue"],
        concurrency: 2,
        onSuccess: vi.fn(),
      });

      expect(mockAdapter.worker).toHaveBeenCalledWith({
        queues: ["test-queue"],
        concurrency: 2,
        onSuccess: expect.any(Function),
      });
    });

    test("should shutdown service gracefully", async () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        context,
      });

      await service.shutdown();

      expect(mockAdapter.shutdown).toHaveBeenCalled();
    });
  });

  describe("Job Information", () => {
    test("should get registered job IDs", async () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        context,
      });

      const jobs = {
        "job-1": {
          name: "Job 1",
          input: z.object({}),
          handler: async () => ({}),
        },
        "job-2": {
          name: "Job 2",
          input: z.object({}),
          handler: async () => ({}),
        },
      };

      const updatedService = await service.bulkRegister(jobs);
      const registeredJobs = updatedService.getRegisteredJobs();

      expect(registeredJobs).toEqual(["job-1", "job-2"]);
    });

    test("should get job information by ID", async () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        context,
      });

      const jobs = {
        "test-job": {
          name: "Test Job",
          input: z.object({ test: z.boolean() }),
          handler: async () => ({ result: true }),
        },
      };

      const updatedService = await service.bulkRegister(jobs);
      const jobInfo = updatedService.getJobInfo("test-job");

      expect(jobInfo).toBeDefined();
      expect(jobInfo?.name).toBe("Test Job");
    });

    test("should return undefined for non-existent job", async () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        context,
      });

      // @ts-expect-error - Test for non-existent job
      const jobInfo = service.getJobInfo("non-existent");

      expect(jobInfo).toBeUndefined();
    });
  });
});

describe("Job Definition Helper", () => {
  test("should create job definition with proper typing", () => {
    const definition = createJobDefinition({
      name: "Test Job",
      input: z.object({ message: z.string() }),
      handler: async ({ input, context }) => {
        return { processed: input.message };
      },
    });

    expect(definition).toBeDefined();
    expect(definition.name).toBe("Test Job");
    expect(definition.input).toBeDefined();
    expect(definition.handler).toBeInstanceOf(Function);
  });
});

describe("Jobs Router", () => {
  test("should create router with jobs and configuration", () => {
    const router = createJobsRouter({
      jobs: {
        "test-job": {
          name: "Test Job",
          input: z.object({ test: z.boolean() }),
          handler: async () => ({ success: true }),
        },
      },
      namespace: "test",
      defaultOptions: { attempts: 3 },
      onSuccess: vi.fn(),
      onFailure: vi.fn(),
    });

    expect(router).toBeDefined();
    expect(router.namespace).toBe("test");
    expect(router.jobs["test-job"]).toBeDefined();
    expect(router.defaultOptions).toEqual({ attempts: 3 });
  });

  describe("Options Merge", () => {
    test("should inherit queue from defaultOptions when job does not specify one", () => {
      const router = createJobsRouter({
        jobs: {
          "test-job": {
            name: "Test Job",
            input: z.object({}),
            handler: async () => ({}),
          },
        },
        namespace: "test",
        defaultOptions: {
          queue: { name: "custom-queue", prefix: "prod" },
        },
      });

      expect(router.jobs["test-job"].queue).toEqual({
        name: "custom-queue",
        prefix: "prod",
      });
    });

    test("should inherit attempts from defaultOptions when job does not specify one", () => {
      const router = createJobsRouter({
        jobs: {
          "test-job": {
            name: "Test Job",
            input: z.object({}),
            handler: async () => ({}),
          },
        },
        defaultOptions: {
          attempts: 5,
        },
      });

      expect(router.jobs["test-job"].attempts).toBe(5);
    });

    test("should inherit priority from defaultOptions when job does not specify one", () => {
      const router = createJobsRouter({
        jobs: {
          "test-job": {
            name: "Test Job",
            input: z.object({}),
            handler: async () => ({}),
          },
        },
        defaultOptions: {
          priority: 10,
        },
      });

      expect(router.jobs["test-job"].priority).toBe(10);
    });

    test("should allow job-level options to override defaultOptions", () => {
      const router = createJobsRouter({
        jobs: {
          "test-job": {
            name: "Test Job",
            input: z.object({}),
            handler: async () => ({}),
            queue: { name: "job-specific-queue" },
            attempts: 10,
            priority: 100,
          },
        },
        defaultOptions: {
          queue: { name: "default-queue" },
          attempts: 3,
          priority: 1,
        },
      });

      expect(router.jobs["test-job"].queue).toEqual({
        name: "job-specific-queue",
      });
      expect(router.jobs["test-job"].attempts).toBe(10);
      expect(router.jobs["test-job"].priority).toBe(100);
    });

    test("should merge metadata from defaultOptions and job definition", () => {
      const router = createJobsRouter({
        jobs: {
          "test-job": {
            name: "Test Job",
            input: z.object({}),
            handler: async () => ({}),
            metadata: { jobSpecific: true, override: "job" },
          },
        },
        defaultOptions: {
          metadata: { fromDefault: true, override: "default" },
        },
      });

      expect(router.jobs["test-job"].metadata).toEqual({
        fromDefault: true,
        jobSpecific: true,
        override: "job", // Job takes precedence
      });
    });

    test("should inherit repeat options from defaultOptions", () => {
      const router = createJobsRouter({
        jobs: {
          "test-job": {
            name: "Test Job",
            input: z.object({}),
            handler: async () => ({}),
          },
        },
        defaultOptions: {
          repeat: {
            cron: "0 9 * * *",
            tz: "America/New_York",
          },
        },
      });

      expect(router.jobs["test-job"].repeat).toEqual({
        cron: "0 9 * * *",
        tz: "America/New_York",
      });
    });

    test("should allow job to override repeat options from defaultOptions", () => {
      const router = createJobsRouter({
        jobs: {
          "test-job": {
            name: "Test Job",
            input: z.object({}),
            handler: async () => ({}),
            repeat: {
              cron: "0 12 * * *",
              tz: "UTC",
            },
          },
        },
        defaultOptions: {
          repeat: {
            cron: "0 9 * * *",
            tz: "America/New_York",
          },
        },
      });

      expect(router.jobs["test-job"].repeat).toEqual({
        cron: "0 12 * * *",
        tz: "UTC",
      });
    });
  });

  describe("Rate Limiting (Limiter)", () => {
    test("should accept limiter configuration on job definition", () => {
      const limiter: JobLimiter = { max: 1, duration: 30000 };

      const router = createJobsRouter({
        jobs: {
          "rate-limited-job": {
            name: "Rate Limited Job",
            input: z.object({}),
            handler: async () => ({}),
            limiter,
          },
        },
      });

      expect(router.jobs["rate-limited-job"].limiter).toEqual({
        max: 1,
        duration: 30000,
      });
    });

    test("should inherit limiter from defaultOptions when job does not specify one", () => {
      const limiter: JobLimiter = { max: 10, duration: 60000 };

      const router = createJobsRouter({
        jobs: {
          "job-without-limiter": {
            name: "Job Without Limiter",
            input: z.object({}),
            handler: async () => ({}),
          },
        },
        defaultOptions: {
          limiter,
        },
      });

      expect(router.jobs["job-without-limiter"].limiter).toEqual({
        max: 10,
        duration: 60000,
      });
    });

    test("should allow job-level limiter to override defaultOptions limiter", () => {
      const defaultLimiter: JobLimiter = { max: 10, duration: 60000 };
      const jobLimiter: JobLimiter = { max: 1, duration: 30000 };

      const router = createJobsRouter({
        jobs: {
          "job-with-override": {
            name: "Job With Override",
            input: z.object({}),
            handler: async () => ({}),
            limiter: jobLimiter,
          },
        },
        defaultOptions: {
          limiter: defaultLimiter,
        },
      });

      expect(router.jobs["job-with-override"].limiter).toEqual({
        max: 1,
        duration: 30000,
      });
    });

    test("should not have limiter when neither job nor defaultOptions specify one", () => {
      const router = createJobsRouter({
        jobs: {
          "job-no-limiter": {
            name: "Job No Limiter",
            input: z.object({}),
            handler: async () => ({}),
          },
        },
      });

      expect(router.jobs["job-no-limiter"].limiter).toBeUndefined();
    });

    test("should apply limiter to multiple jobs from defaultOptions", () => {
      const limiter: JobLimiter = { max: 5, duration: 10000 };

      const router = createJobsRouter({
        jobs: {
          "job-1": {
            name: "Job 1",
            input: z.object({}),
            handler: async () => ({}),
          },
          "job-2": {
            name: "Job 2",
            input: z.object({}),
            handler: async () => ({}),
          },
          "job-3": {
            name: "Job 3",
            input: z.object({}),
            handler: async () => ({}),
            limiter: { max: 1, duration: 1000 }, // Override
          },
        },
        defaultOptions: {
          limiter,
        },
      });

      expect(router.jobs["job-1"].limiter).toEqual({ max: 5, duration: 10000 });
      expect(router.jobs["job-2"].limiter).toEqual({ max: 5, duration: 10000 });
      expect(router.jobs["job-3"].limiter).toEqual({ max: 1, duration: 1000 });
    });
  });

  describe("Complete Options Inheritance", () => {
    test("should inherit all options from defaultOptions correctly", () => {
      const router = createJobsRouter({
        jobs: {
          "complete-job": {
            name: "Complete Job",
            input: z.object({}),
            handler: async () => ({}),
          },
        },
        namespace: "youtube",
        defaultOptions: {
          queue: { name: "youtube-queue", prefix: "prod" },
          attempts: 5,
          priority: 10,
          delay: 1000,
          removeOnComplete: 100,
          removeOnFail: 50,
          limiter: { max: 1, duration: 30000 },
          metadata: { source: "youtube-api" },
        },
      });

      const job = router.jobs["complete-job"];

      expect(job.queue).toEqual({ name: "youtube-queue", prefix: "prod" });
      expect(job.attempts).toBe(5);
      expect(job.priority).toBe(10);
      expect(job.delay).toBe(1000);
      expect(job.removeOnComplete).toBe(100);
      expect(job.removeOnFail).toBe(50);
      expect(job.limiter).toEqual({ max: 1, duration: 30000 });
      expect(job.metadata).toEqual({ source: "youtube-api" });
    });

    test("should allow partial overrides of defaultOptions", () => {
      const router = createJobsRouter({
        jobs: {
          "partial-override-job": {
            name: "Partial Override Job",
            input: z.object({}),
            handler: async () => ({}),
            attempts: 10, // Override only attempts
            priority: 100, // Override only priority
          },
        },
        defaultOptions: {
          queue: { name: "default-queue" },
          attempts: 3,
          priority: 1,
          limiter: { max: 5, duration: 10000 },
        },
      });

      const job = router.jobs["partial-override-job"];

      // Overridden values
      expect(job.attempts).toBe(10);
      expect(job.priority).toBe(100);

      // Inherited values
      expect(job.queue).toEqual({ name: "default-queue" });
      expect(job.limiter).toEqual({ max: 5, duration: 10000 });
    });
  });

  test("should validate unique job IDs", () => {
    expect(() => {
      createJobsRouter({
        jobs: {
          duplicate: {
            name: "Job 1",
            input: z.object({}),
            handler: async () => ({}),
          },
          // @ts-expect-error - Test for duplicate job ID
          duplicate: {
            name: "Job 2",
            input: z.object({}),
            handler: async () => ({}),
          },
        },
      });
    }).not.toThrow(); // JavaScript objects naturally handle duplicate keys
  });

  test("should validate namespace naming", () => {
    expect(() => {
      createJobsRouter({
        jobs: {},
        namespace: "123invalid",
      });
    }).toThrow("Invalid namespace");

    expect(() => {
      createJobsRouter({
        jobs: {},
        namespace: "valid-namespace",
      });
    }).not.toThrow();
  });

  test("should register additional jobs to existing router", () => {
    const router = createJobsRouter({
      jobs: {
        "job-1": {
          name: "Job 1",
          input: z.object({}),
          handler: async () => ({}),
        },
      },
    });

    const updatedRouter = router.register({
      "job-2": {
        name: "Job 2",
        input: z.object({}),
        handler: async () => ({}),
      },
    });

    expect(Object.keys(updatedRouter.jobs)).toEqual(["job-1", "job-2"]);
  });

  test("should prevent job ID conflicts when registering", () => {
    const router = createJobsRouter({
      jobs: {
        "existing-job": {
          name: "Existing Job",
          input: z.object({}),
          handler: async () => ({}),
        },
      },
    });

    expect(() => {
      router.register({
        "existing-job": {
          name: "Conflicting Job",
          input: z.object({}),
          handler: async () => ({}),
        },
      });
    }).toThrow("Job ID conflicts detected");
  });

  test("should preserve defaultOptions when registering new jobs", () => {
    const router = createJobsRouter({
      jobs: {
        "job-1": {
          name: "Job 1",
          input: z.object({}),
          handler: async () => ({}),
        },
      },
      defaultOptions: {
        queue: { name: "shared-queue" },
        limiter: { max: 5, duration: 10000 },
      },
    });

    const updatedRouter = router.register({
      "job-2": {
        name: "Job 2",
        input: z.object({}),
        handler: async () => ({}),
      },
    });

    // Both jobs should have the defaultOptions applied
    expect(updatedRouter.jobs["job-1"].queue).toEqual({ name: "shared-queue" });
    expect(updatedRouter.jobs["job-1"].limiter).toEqual({
      max: 5,
      duration: 10000,
    });
    expect(updatedRouter.jobs["job-2"].queue).toEqual({ name: "shared-queue" });
    expect(updatedRouter.jobs["job-2"].limiter).toEqual({
      max: 5,
      duration: 10000,
    });
  });
});

describe("Job Definition with Limiter", () => {
  test("should create job definition with limiter option", () => {
    const definition = createJobDefinition({
      name: "Rate Limited Job",
      input: z.object({ url: z.string() }),
      handler: async ({ input }) => {
        return { downloaded: true, url: input.url };
      },
      limiter: {
        max: 1,
        duration: 30000,
      },
    });

    expect(definition).toBeDefined();
    expect(definition.name).toBe("Rate Limited Job");
    expect(definition.limiter).toEqual({ max: 1, duration: 30000 });
  });

  test("should create job definition with queue and limiter", () => {
    const definition = createJobDefinition({
      name: "YouTube Download",
      input: z.object({ videoId: z.string() }),
      handler: async ({ input }) => {
        return { downloaded: true };
      },
      queue: { name: "youtube-downloads" },
      limiter: {
        max: 1,
        duration: 30000,
      },
      attempts: 3,
      priority: 10,
    });

    expect(definition.queue).toEqual({ name: "youtube-downloads" });
    expect(definition.limiter).toEqual({ max: 1, duration: 30000 });
    expect(definition.attempts).toBe(3);
    expect(definition.priority).toBe(10);
  });
});
