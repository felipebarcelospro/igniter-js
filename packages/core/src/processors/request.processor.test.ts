import { describe, expect, it, vi } from "vitest";
import { RequestProcessor } from "./request.processor";
import { createIgniterController } from "../services/controller.service";
import {
  createIgniterMutation,
  createIgniterQuery,
} from "../services/action.service";
import { z } from "zod";
import {
  createIgniterPlugin,
  createIgniterPluginAction,
} from "../types/plugin.interface";
import * as nextjsAdapter from "../adapters/nextjs";
import { ContextBuilderProcessor } from "./context-builder.processor";
import { createTelemetrySpy, validateTelemetryEvents } from "../test/telemetry";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const createStore = () =>
  ({
    events: {
      publish: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(async () => { }),
    },
    kv: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    dev: {
      scan: vi.fn().mockResolvedValue({ cursor: "0", keys: [] }),
    },
    scope: vi.fn().mockReturnThis(),
  }) as any;

const createCache = () =>
  (() => {
    const cache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      invalidate: vi.fn().mockResolvedValue(undefined),
      tag: vi.fn().mockResolvedValue(undefined),
      resolveKey: vi.fn().mockReturnValue("users.create"),
      getGeo: vi.fn().mockResolvedValue(null),
      setGeo: vi.fn().mockResolvedValue(undefined),
    };

    return {
      ...cache,
      $api: () => ({
        get: cache.get,
        set: cache.set,
        invalidate: cache.invalidate,
        tag: cache.tag,
        resolveKey: cache.resolveKey,
      }),
    } as any;
  })();

const createProcessor = async (overrides?: Partial<ConstructorParameters<typeof RequestProcessor>[0]>) => {
  const helloAction = createIgniterQuery({
    path: "hello",
    handler: async ({ response }) => response.success({ ok: true }),
  });

  const controller = createIgniterController({
    name: "users",
    path: "users",
    actions: {
      hello: helloAction,
    },
  });

  const processor = new RequestProcessor({
    baseURL: "http://localhost",
    basePATH: "/api",
    context: () => ({}),
    controllers: { users: controller },
    ...(overrides ?? {}),
  } as any);

  await tick();

  return processor;
};

describe("RequestProcessor", () => {
  it("returns 404 for unknown routes", async () => {
    const processor = await createProcessor();

    const response = await processor.process(
      new Request("http://localhost/api/missing", { method: "GET" }),
    );

    expect(response.status).toBe(404);
  });

  it("processes a query action and returns JSON", async () => {
    const processor = await createProcessor();

    const response = await processor.process(
      new Request("http://localhost/api/users/hello", { method: "GET" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      error: null,
      data: { ok: true },
    });
  });

  it("returns 501 when realtime is not configured for SSE", async () => {
    const processor = await createProcessor();

    const response = await processor.process(
      new Request("http://localhost/api/sse/events", { method: "GET" }),
    );

    expect(response.status).toBe(501);
  });

  it("delegates SSE connections to realtime processor", async () => {
    const openConnection = vi
      .fn()
      .mockResolvedValue(new Response("ok", { status: 200 }));
    const realtime = {
      openConnection,
    } as any;

    const processor = await createProcessor({ realtime });

    const response = await processor.process(
      new Request("http://localhost/api/sse/events", { method: "GET" }),
    );

    expect(openConnection).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it("returns validation error responses for invalid payloads", async () => {
    const invalidAction = createIgniterQuery({
      path: "validate",
      query: z.object({ page: z.number() }),
      handler: async ({ response }) => response.success({ ok: true }),
    });

    const controller = createIgniterController({
      name: "users",
      path: "users",
      actions: { validate: invalidAction },
    });

    const processor = new RequestProcessor({
      baseURL: "http://localhost",
      basePATH: "/api",
      context: () => ({}),
      controllers: { users: controller },
    } as any);

    await tick();

    const response = await processor.process(
      new Request("http://localhost/api/users/validate?page=not-a-number", {
        method: "GET",
      }),
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error?.code).toBe("VALIDATION_ERROR");
  });

  it("supports handlers returning raw Response instances", async () => {
    const rawAction = createIgniterQuery({
      path: "raw",
      handler: async () => new Response(null, { status: 204 }),
    });

    const controller = createIgniterController({
      name: "users",
      path: "users",
      actions: { raw: rawAction },
    });

    const processor = new RequestProcessor({
      baseURL: "http://localhost",
      basePATH: "/api",
      context: () => ({}),
      controllers: { users: controller },
    } as any);

    await tick();

    const response = await processor.process(
      new Request("http://localhost/api/users/raw", { method: "GET" }),
    );

    expect(response.status).toBe(204);
  });

  it("runs global middlewares with early returns", async () => {
    const guardedAction = createIgniterQuery({
      path: "guarded",
      handler: async ({ response }) => response.success({ ok: true }),
    });

    const controller = createIgniterController({
      name: "users",
      path: "users",
      actions: { guarded: guardedAction },
    });

    const middleware = {
      name: "blocker",
      handler: async () => new Response("blocked", { status: 403 }),
    };

    const processor = new RequestProcessor({
      baseURL: "http://localhost",
      basePATH: "/api",
      context: () => ({}),
      controllers: { users: controller },
      plugins: { use: [middleware] },
    } as any);

    await tick();

    const response = await processor.process(
      new Request("http://localhost/api/users/guarded", { method: "GET" }),
    );

    expect(response.status).toBe(403);
  });

  it("runs action middlewares with early returns", async () => {
    const actionMiddleware = {
      name: "auth",
      handler: async (ctx: any) => ctx.response.unauthorized(),
    };

    const action = createIgniterQuery({
      path: "secure",
      use: [actionMiddleware],
      handler: async ({ response }) => response.success({ ok: true }),
    });

    const controller = createIgniterController({
      name: "users",
      path: "users",
      actions: { secure: action },
    });

    const processor = new RequestProcessor({
      baseURL: "http://localhost",
      basePATH: "/api",
      context: () => ({}),
      controllers: { users: controller },
    } as any);

    await tick();

    const response = await processor.process(
      new Request("http://localhost/api/users/secure", { method: "GET" }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 500 when action handlers throw", async () => {
    const action = createIgniterQuery({
      path: "explode",
      handler: async () => {
        throw new Error("boom");
      },
    });

    const controller = createIgniterController({
      name: "users",
      path: "users",
      actions: { explode: action },
    });

    const processor = new RequestProcessor({
      baseURL: "http://localhost",
      basePATH: "/api",
      context: () => ({}),
      controllers: { users: controller },
    } as any);

    await tick();

    const response = await processor.process(
      new Request("http://localhost/api/users/explode", { method: "GET" }),
    );

    expect(response.status).toBe(500);
  });

  it("supports direct server caller invocations", async () => {
    const mutation = createIgniterMutation({
      path: "create",
      method: "POST",
      handler: async ({ response }) => response.created({ ok: true }),
    });

    const controller = createIgniterController({
      name: "users",
      path: "users",
      actions: { create: mutation },
    });

    const processor = new RequestProcessor({
      baseURL: "http://localhost",
      basePATH: "/api",
      context: () => ({}),
      controllers: { users: controller },
    } as any);

    await tick();

    const result = await processor.call("users", "create", {
      body: { ok: true },
    } as any);

    expect(result.data).toEqual({ ok: true });
  });

  it("registers plugin routes and injects self references", async () => {
    const store = createStore();
    const action = createIgniterPluginAction({
      name: "ping",
      description: "Ping",
      input: z.object({ message: z.string() }),
      handler: async ({ input }) => ({ echo: input.message }),
    });

    const plugin = createIgniterPlugin({
      name: "audit",
      $meta: {},
      $config: {},
      $actions: { ping: action },
      $controllers: {
        system: {
          health: {
            path: "/health",
            method: "GET",
            handler: async ({ response, self }) => {
              const echo = await self.actions.ping({ message: "hi" });
              return response.success({ ok: true, echo });
            },
          },
        },
      },
      $events: { emits: {}, listens: {} },
      registration: {
        discoverable: true,
        version: "0.1.0",
        requiresFramework: "0.1.0",
        category: ["core"],
        author: "test",
      },
      dependencies: {
        requires: [],
        provides: [],
        conflicts: [],
      },
      middleware: {},
      resources: {
        resources: [],
        cleanup: vi.fn(),
      },
    });

    const processor = await createProcessor({
      store,
      plugins: { audit: plugin },
    });

    const response = await processor.process(
      new Request("http://localhost/api/plugins/audit/system/health", {
        method: "GET",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { ok: true, echo: { echo: "hi" } },
      error: null,
    });
  });

  it("skips plugin initialization when store is missing", async () => {
    const action = createIgniterPluginAction({
      name: "ping",
      description: "Ping",
      input: z.object({}),
      handler: async () => ({ ok: true }),
    });

    const plugin = createIgniterPlugin({
      name: "audit",
      $meta: {},
      $config: {},
      $actions: { ping: action },
      $controllers: {
        system: {
          health: {
            path: "/health",
            method: "GET",
            handler: async ({ response }) => response.success({ ok: true }),
          },
        },
      },
      $events: { emits: {}, listens: {} },
      registration: {
        discoverable: true,
        version: "0.1.0",
        requiresFramework: "0.1.0",
        category: ["core"],
        author: "test",
      },
      dependencies: {
        requires: [],
        provides: [],
        conflicts: [],
      },
      middleware: {},
      resources: {
        resources: [],
        cleanup: vi.fn(),
      },
    });

    const processor = await createProcessor({ plugins: { audit: plugin } });

    const response = await processor.process(
      new Request("http://localhost/api/plugins/audit/system/health", {
        method: "GET",
      }),
    );

    expect(response.status).toBe(404);
  });

  it("builds request details for server caller queries", async () => {
    const action = createIgniterQuery({
      path: ":id",
      handler: async () => ({ ok: true }),
    });

    const controller = createIgniterController({
      name: "users",
      path: "users",
      actions: { detail: action },
    });

    const processor = new RequestProcessor({
      baseURL: "http://localhost",
      basePATH: "/api",
      context: () => ({}),
      controllers: { users: controller },
    } as any);

    await tick();

    const processSpy = vi.spyOn(processor, "process").mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true }, error: null }), {
        headers: { "Content-Type": "application/json" },
      }),
    );

    const headersSpy = vi
      .spyOn(nextjsAdapter, "getHeadersSafe")
      .mockResolvedValueOnce(new Headers({ "x-rsc": "1" }))
      .mockResolvedValueOnce({ "x-rsc": "2" } as any);

    await processor.call("users", "detail", {
      params: { id: "123" },
      query: { q: "search" },
      headers: { "x-custom": "yes" },
      cookies: { session: "token" },
    } as any);

    const request = processSpy.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("http://localhost/api/users/123?q=search");
    expect(request.headers.get("x-rsc")).toBe("1");
    expect(request.headers.get("x-custom")).toBe("yes");
    expect(request.headers.get("Cookie")).toContain("session=token");
    expect(request.headers.get("Content-Type")).toBeNull();

    await processor.call("users", "detail", {
      params: { id: "456" },
    } as any);

    const secondRequest = processSpy.mock.calls[1]?.[0] as Request;
    expect(secondRequest.headers.get("x-rsc")).toBe("2");

    headersSpy.mockRestore();
  });

  it("throws when caller controller or action is missing", async () => {
    const processor = await createProcessor();

    await expect(
      processor.call("missing" as any, "action" as any, {} as any),
    ).rejects.toThrow("Controller 'missing' not found");

    await expect(
      processor.call("users" as any, "missing" as any, {} as any),
    ).rejects.toThrow("Action 'missing' not found");
  });

  it("returns initialization error when context building fails", async () => {
    const processor = await createProcessor();

    const buildSpy = vi
      .spyOn(ContextBuilderProcessor, "build")
      .mockRejectedValueOnce(new Error("boom"));

    const response = await processor.process(
      new Request("http://localhost/api/users/hello", { method: "GET" }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INITIALIZATION_ERROR" },
    });

    buildSpy.mockRestore();
  });

  it("wraps plain object responses", async () => {
    const action = createIgniterQuery({
      path: "plain",
      handler: async () => ({ status: 202, ok: true }),
    });

    const controller = createIgniterController({
      name: "users",
      path: "users",
      actions: { plain: action },
    });

    const processor = new RequestProcessor({
      baseURL: "http://localhost",
      basePATH: "/api",
      context: () => ({}),
      controllers: { users: controller },
    } as any);

    await tick();

    const response = await processor.process(
      new Request("http://localhost/api/users/plain", { method: "GET" }),
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({ data: { ok: true } });
  });

  it("supports static process entrypoint", async () => {
    const result = await RequestProcessor.process(
      new Request("http://localhost/api/users/hello", { method: "GET" }),
      {
        baseURL: "http://localhost",
        basePATH: "/api",
        context: () => ({}),
        controllers: {} as any,
      } as any,
    );

    expect(result.status).toBe(404);
    expect(result.data).toBeInstanceOf(Response);
  });

  it("emits telemetry events for successful requests", async () => {
    const { telemetry, events } = createTelemetrySpy();
    const store = createStore();
    const cache = createCache();

    const actionMiddleware = {
      name: "auth",
      handler: async () => ({ ok: true }),
    };

    const action = createIgniterMutation({
      path: "create",
      method: "POST",
      body: z.object({ name: z.string() }),
      query: z.object({ page: z.coerce.number().optional() }).optional(),
      use: [actionMiddleware],
      handler: async ({ response }) =>
        response.success({ ok: true }).cache({ ttl: 30 }).revalidate([
          "users.getById",
        ]),
    });

    const controller = createIgniterController({
      name: "users",
      path: "users",
      actions: { create: action },
    });

    const processor = new RequestProcessor({
      baseURL: "http://localhost",
      basePATH: "/api",
      context: () => ({}),
      controllers: { users: controller },
      telemetry,
      store,
      cache,
    } as any);

    await tick();

    const response = await processor.process(
      new Request("http://localhost/api/users/create?page=1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
          "x-vercel-ip-country": "BR",
        },
        body: JSON.stringify({ name: "Igniter" }),
      }),
    );

    expect(response.status).toBe(200);

    const names = events.map((event) => event.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "igniter.core.http.request.started",
        "igniter.core.http.request.success",
        "igniter.core.route.resolve.started",
        "igniter.core.route.resolve.success",
        "igniter.core.body.parse.started",
        "igniter.core.body.parse.success",
        "igniter.core.context.build.started",
        "igniter.core.context.build.success",
        "igniter.core.context.enhance.started",
        "igniter.core.context.enhance.success",
        "igniter.core.middleware.execute.started",
        "igniter.core.middleware.execute.success",
        "igniter.core.validation.started",
        "igniter.core.validation.success",
        "igniter.core.action.execute.started",
        "igniter.core.action.execute.success",
        "igniter.core.response.build.started",
        "igniter.core.response.build.success",
        "igniter.core.cache.set.started",
        "igniter.core.cache.set.success",
        "igniter.core.revalidate.requested",
        "igniter.core.revalidate.published",
        "igniter.core.cache.invalidate.started",
        "igniter.core.cache.invalidate.success",
      ]),
    );

    const failures = await validateTelemetryEvents(events);
    expect(failures).toEqual([]);
  });

  it("emits telemetry events for validation errors", async () => {
    const { telemetry, events } = createTelemetrySpy();

    const action = createIgniterMutation({
      path: "validate",
      method: "POST",
      body: z.object({ name: z.string() }),
      handler: async ({ response }) => response.success({ ok: true }),
    });

    const controller = createIgniterController({
      name: "users",
      path: "users",
      actions: { validate: action },
    });

    const processor = new RequestProcessor({
      baseURL: "http://localhost",
      basePATH: "/api",
      context: () => ({}),
      controllers: { users: controller },
      telemetry,
    } as any);

    await tick();

    const response = await processor.process(
      new Request("http://localhost/api/users/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{invalid}",
      }),
    );

    expect(response.status).toBe(400);

    const names = events.map((event) => event.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "igniter.core.body.parse.error",
        "igniter.core.validation.error",
        "igniter.core.http.request.error",
        "igniter.core.error.tracked",
      ]),
    );

    const failures = await validateTelemetryEvents(events);
    expect(failures).toEqual([]);
  });

  it("emits telemetry events for action execution errors", async () => {
    const { telemetry, events } = createTelemetrySpy();

    const action = createIgniterQuery({
      path: "explode",
      handler: async () => {
        throw new Error("boom");
      },
    });

    const controller = createIgniterController({
      name: "users",
      path: "users",
      actions: { explode: action },
    });

    const processor = new RequestProcessor({
      baseURL: "http://localhost",
      basePATH: "/api",
      context: () => ({}),
      controllers: { users: controller },
      telemetry,
    } as any);

    await tick();

    const response = await processor.process(
      new Request("http://localhost/api/users/explode", { method: "GET" }),
    );

    expect(response.status).toBe(500);

    const names = events.map((event) => event.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "igniter.core.action.execute.error",
        "igniter.core.http.request.error",
        "igniter.core.error.tracked",
      ]),
    );

    const failures = await validateTelemetryEvents(events);
    expect(failures).toEqual([]);
  });

  it("emits telemetry events for route not found", async () => {
    const { telemetry, events } = createTelemetrySpy();
    const processor = await createProcessor({ telemetry });

    const response = await processor.process(
      new Request("http://localhost/api/missing", { method: "GET" }),
    );

    expect(response.status).toBe(404);

    const names = events.map((event) => event.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "igniter.core.route.resolve.not_found",
        "igniter.core.http.request.success",
      ]),
    );

    const failures = await validateTelemetryEvents(events);
    expect(failures).toEqual([]);
  });
});
