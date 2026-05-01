import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { IgniterResponseProcessor } from "./response.processor";
import type { IgniterStoreManager } from "../types/store.interface";
import type { IgniterStoreCacheProcessor } from "../services/cache.processor";
import { createTelemetrySpy, validateTelemetryEvents } from "../test/telemetry";

interface TestContext {
  userId: string;
}

describe("IgniterResponseProcessor", () => {
  let store: IgniterStoreManager;
  let cache: IgniterStoreCacheProcessor;

  beforeEach(() => {
    store = {
      events: {
        publish: vi.fn().mockResolvedValue(undefined),
        subscribe: vi.fn().mockResolvedValue(async () => {}),
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
    } as any;

    cache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      invalidate: vi.fn().mockResolvedValue(undefined),
      tag: vi.fn().mockResolvedValue(undefined),
      resolveKey: vi.fn().mockReturnValue("users.getById"),
    } as any;
  });

  it("creates a success response", async () => {
    const response = await IgniterResponseProcessor.init()
      .success({ ok: true })
      .toResponse();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      error: null,
      data: { ok: true },
    });
  });

  it("creates an error response", async () => {
    const response = await IgniterResponseProcessor.init()
      .badRequest("Invalid")
      .toResponse();

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: "ERR_BAD_REQUEST",
        message: "Invalid",
        data: undefined,
      },
    });
  });

  it("respects explicit status", async () => {
    const response = await IgniterResponseProcessor.init()
      .status(202)
      .success({ queued: true })
      .toResponse();

    expect(response.status).toBe(202);
  });

  it("returns stream connection info", async () => {
    const response = await IgniterResponseProcessor.init()
      .stream({ channelId: "users.stream" })
      .toResponse();

    const body = await response.json();
    expect(body.data.channelId).toBe("users.stream");
    expect(body.data.connectionInfo.endpoint).toContain("/sse/events");
  });

  it("publishes revalidation events via store", async () => {
    const response = await IgniterResponseProcessor.init<TestContext>(
      store,
      { userId: "1" },
      undefined,
      null,
      {
        cache,
      },
    )
      .success({ ok: true })
      .revalidate(["users.getById"])
      .toResponse();

    expect(response.status).toBe(200);
    expect(store.events.publish).toHaveBeenCalledWith(
      "http:revalidate:requested",
      expect.objectContaining({
        queryKeys: ["users.getById"],
      }),
    );
    expect(cache.invalidate).toHaveBeenCalledWith(["users.getById"]);
  });

  it("stores cached response payload", async () => {
    const response = await IgniterResponseProcessor.init<TestContext>(
      store,
      { userId: "1" },
      undefined,
      null,
      {
        cache,
        action: { pathKey: "users.getById" },
        request: {
          params: { id: "1" },
          query: {},
        },
      },
    )
      .success({ ok: true })
      .cache({ ttl: 60 })
      .toResponse();

    expect(response.headers.get("Cache-Control")).toContain("max-age=60");
    expect(cache.set).toHaveBeenCalledWith(
      "users.getById",
      { data: { ok: true }, error: null },
      expect.objectContaining({ ttl: 60 }),
    );
  });

  it("sets headers and cookies", async () => {
    const response = await IgniterResponseProcessor.init()
      .setHeader("x-test", "ok")
      .setCookie("session", "token")
      .success({ ok: true })
      .toResponse();

    expect(response.headers.get("x-test")).toBe("ok");
    expect(response.headers.get("Set-Cookie")).toContain("session=token");
  });

  it("creates no content responses", async () => {
    const response = await IgniterResponseProcessor.init()
      .noContent()
      .toResponse();

    expect(response.status).toBe(204);
  });

  it("supports not found and unauthorized responses", async () => {
    const notFound = await IgniterResponseProcessor.init()
      .notFound("Missing")
      .toResponse();
    const unauthorized = await IgniterResponseProcessor.init()
      .unauthorized("Denied")
      .toResponse();

    expect(notFound.status).toBe(404);
    expect(unauthorized.status).toBe(401);
  });

  it("revalidates with payload metadata", async () => {
    const response = await IgniterResponseProcessor.init<TestContext>(
      store,
      { userId: "1" },
      undefined,
      null,
      {
        cache,
      },
    )
      .success({ ok: true })
      .revalidate({ paths: ["users.getById"], data: { source: "test" } })
      .toResponse();

    expect(response.status).toBe(200);
    expect(store.events.publish).toHaveBeenCalledWith(
      "http:revalidate:requested",
      expect.objectContaining({
        queryKeys: ["users.getById"],
        data: { source: "test" },
      }),
    );
  });

  it("enforces response typing state transitions", () => {
    const base = IgniterResponseProcessor.init();
    const success = base.success({ ok: true });

    expectTypeOf(success.data).toEqualTypeOf<{ ok: boolean } | null>();
    success.revalidate("users.list");
    success.cache({ ttl: 10 });

    // @ts-expect-error - success state should not allow error builder
    success.error("ERR_BAD_REQUEST");

    const errored = IgniterResponseProcessor.init().badRequest("Invalid");

    // @ts-expect-error - error state should not allow success builder
    errored.success({ ok: true });

    // @ts-expect-error - init state should not allow revalidate
    IgniterResponseProcessor.init().revalidate("users.list");

    const streamed = IgniterResponseProcessor.init().stream({
      channelId: "users.stream",
    });

    // @ts-expect-error - stream state should not allow cache
    streamed.cache({ ttl: 10 });
  });

  it("emits telemetry for cache and revalidation flows", async () => {
    const { telemetry, events } = createTelemetrySpy();

    await IgniterResponseProcessor.init<TestContext>(
      store,
      { userId: "1" },
      undefined,
      telemetry,
      {
        cache,
        action: { pathKey: "users.getById" },
        request: { params: { id: "1" }, query: {} },
      },
    )
      .success({ ok: true })
      .cache({ ttl: 60 })
      .revalidate(["users.getById"])
      .toResponse();

    const names = events.map((event) => event.name);
    expect(names).toEqual(
      expect.arrayContaining([
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

  it("emits telemetry when revalidation fails", async () => {
    const { telemetry, events } = createTelemetrySpy();

    store.events.publish = vi
      .fn()
      .mockRejectedValueOnce(new Error("publish failed"));

    await expect(
      IgniterResponseProcessor.init<TestContext>(
        store,
        { userId: "1" },
        undefined,
        telemetry,
        { cache },
      )
        .success({ ok: true })
        .revalidate(["users.getById"])
        .toResponse(),
    ).rejects.toThrow("publish failed");

    const names = events.map((event) => event.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "igniter.core.revalidate.error",
        "igniter.core.response.build.error",
      ]),
    );

    const failures = await validateTelemetryEvents(events);
    expect(failures).toEqual([]);
  });
});
