import { beforeEach, describe, expect, it, vi } from "vitest";
import { IgniterStoreRealtimeProcessor } from "./realtime.service";
import type { IgniterStoreManager } from "../types/store.interface";
import type { IgniterRealtimeTransport } from "../types/realtime.interface";
import { createTelemetrySpy, validateTelemetryEvents } from "../test/telemetry";

const mockResponse = new Response("ok");

const createStore = () => {
  const kv = new Map<string, any>();
  const handlers = new Map<string, Set<(ctx: any) => Promise<void> | void>>();
  const unsubscribes = new Map<string, ReturnType<typeof vi.fn>>();

  const store = {
    kv: {
      get: vi.fn(async (key: string) => (kv.has(key) ? kv.get(key) : null)),
      set: vi.fn(async (key: string, value: any) => {
        kv.set(key, value);
      }),
      remove: vi.fn(async (key: string) => {
        kv.delete(key);
      }),
    },
    events: {
      publish: vi.fn(async (eventName: string, payload: any) => {
        const listeners = handlers.get(eventName);
        if (!listeners) return;
        const ctx = {
          type: eventName,
          data: payload,
          timestamp: new Date().toISOString(),
        };
        for (const listener of listeners) {
          await listener(ctx);
        }
      }),
      subscribe: vi.fn(async (eventName: string, handler: any) => {
        if (!handlers.has(eventName)) {
          handlers.set(eventName, new Set());
        }
        handlers.get(eventName)!.add(handler);
        const unsubscribe = vi.fn(async () => {
          handlers.get(eventName)?.delete(handler);
        });
        unsubscribes.set(eventName, unsubscribe);
        return unsubscribe;
      }),
    },
    dev: {
      scan: vi.fn(async () => {
        const keys = Array.from(kv.keys())
          .filter((key) => key.startsWith("sse:connections:"))
          .map((key) => `mock:kv:${key}`);
        return { cursor: "0", keys };
      }),
    },
    scope: vi.fn(),
  } as unknown as IgniterStoreManager;

  (store.scope as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    () => store,
  );

  return { store, kv, handlers, unsubscribes };
};

describe("IgniterStoreRealtimeProcessor", () => {
  let store: IgniterStoreManager;
  let transport: IgniterRealtimeTransport;

  beforeEach(() => {
    vi.restoreAllMocks();

    transport = {
      name: "sse",
      openConnection: vi.fn().mockResolvedValue(mockResponse),
      publish: vi.fn().mockReturnValue(1),
      closeAll: vi.fn(),
    };

    store = createStore().store;
  });

  it("publishes events through store", async () => {
    const realtime = new IgniterStoreRealtimeProcessor({ store, transport });

    await realtime.publish("auth:user_logged_in" as any, { userId: "1" } as any);

    expect(store.events.publish).toHaveBeenCalledWith(
      "auth:user_logged_in",
      { userId: "1" },
    );
  });

  it("subscribes to store events", async () => {
    const realtime = new IgniterStoreRealtimeProcessor({ store, transport });

    const handler = vi.fn();
    await realtime.subscribe("auth:user_logged_in" as any, handler as any);

    expect(store.events.subscribe).toHaveBeenCalled();
  });

  it("opens connection and persists metadata", async () => {
    const realtime = new IgniterStoreRealtimeProcessor({ store, transport });
    const request = new Request(
      "http://localhost/api/v1/sse/events?channels=auth:user_logged_in&scopes=organization:123",
      {
        headers: {
          "x-forwarded-for": "10.0.0.1",
          "user-agent": "Mozilla/5.0",
        },
      },
    );

    const uuidSpy = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValue("conn-1");

    const response = await realtime.openConnection(request);

    expect(response).toBe(mockResponse);
    expect(transport.openConnection).toHaveBeenCalled();
    expect(store.kv.set).toHaveBeenCalledWith(
      "sse:connections:conn-1",
      expect.objectContaining({
        connectionId: "conn-1",
        channels: ["auth:user_logged_in"],
        scopes: ["organization:123"],
      }),
      { ttl: 300 },
    );

    uuidSpy.mockRestore();
  });

  it("manages subscriptions, keepalive, and connection cleanup", async () => {
    const { store: localStore, kv, unsubscribes } = createStore();
    store = localStore;
    const { telemetry, events } = createTelemetrySpy();

    const openOptions: any[] = [];
    transport = {
      name: "sse",
      openConnection: vi.fn(async (_req, options) => {
        openOptions.push(options);
        return new Response("ok");
      }),
      publish: vi.fn().mockReturnValue(1),
      closeAll: vi.fn(),
    };

    const realtime = new IgniterStoreRealtimeProcessor({
      store,
      transport,
      telemetry,
    });
    const scoped = realtime.scope("tenant", "t-1");

    const uuidSpy = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce("conn-1")
      .mockReturnValueOnce("conn-2");

    const request = new Request(
      "http://localhost/api/v1/sse/events?channels=auth:user_logged_in&scopes=organization:123,invalid",
      {
        headers: {
          "x-forwarded-for": "10.0.0.1",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114 Safari/537.36",
          "x-vercel-ip-country": "BR",
        },
      },
    );

    await scoped.openConnection(request);
    await scoped.openConnection(request);

    expect(store.events.subscribe).toHaveBeenCalledTimes(1);

    const metadata = kv.get("sse:connections:conn-1");
    expect(metadata).toMatchObject({
      connectionId: "conn-1",
      channels: ["auth:user_logged_in"],
      scopes: ["tenant:t-1", "organization:123"],
      ip: "10.0.0.1",
      device: { device: "windows", browser: "chrome", os: "windows" },
      geo: { country: "BR" },
    });

    expect(kv.get("sse:connections")).toEqual(
      expect.arrayContaining(["conn-1", "conn-2"]),
    );
    expect(kv.get("sse:channels:auth:user_logged_in")).toEqual(
      expect.arrayContaining(["conn-1", "conn-2"]),
    );
    expect(kv.get("sse:scopes:tenant:t-1")).toEqual(
      expect.arrayContaining(["conn-1", "conn-2"]),
    );

    await store.events.publish("auth:user_logged_in", { userId: "1" });
    expect(transport.publish).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "auth:user_logged_in" }),
    );

    const lastSeenBefore = kv.get("sse:connections:conn-1").lastSeenAt;
    await openOptions[0].onKeepAlive?.();
    const lastSeenAfter = kv.get("sse:connections:conn-1").lastSeenAt;
    expect(lastSeenAfter).not.toBe(lastSeenBefore);

    await openOptions[0].onClose?.("client");
    expect(unsubscribes.get("auth:user_logged_in")).not.toHaveBeenCalled();
    expect(kv.get("sse:connections")).toEqual(
      expect.arrayContaining(["conn-2"]),
    );

    await openOptions[1].onClose?.("client");
    expect(unsubscribes.get("auth:user_logged_in")).toHaveBeenCalled();
    expect(kv.has("sse:connections:conn-1")).toBe(false);
    expect(kv.has("sse:connections:conn-2")).toBe(false);

    const names = events.map((event) => event.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "igniter.core.realtime.connection.open.started",
        "igniter.core.realtime.connection.open.success",
        "igniter.core.realtime.connection.keepalive",
        "igniter.core.realtime.connection.close.started",
        "igniter.core.realtime.connection.close.success",
        "igniter.core.realtime.subscribe.started",
        "igniter.core.realtime.subscribe.success",
        "igniter.core.realtime.unsubscribe.started",
        "igniter.core.realtime.unsubscribe.success",
        "igniter.core.realtime.event.deliver.success",
      ]),
    );

    const failures = await validateTelemetryEvents(events);
    expect(failures).toEqual([]);

    uuidSpy.mockRestore();
  });

  it("emits telemetry for publish failures", async () => {
    const { telemetry, events } = createTelemetrySpy();
    const realtime = new IgniterStoreRealtimeProcessor({
      store,
      transport,
      telemetry,
    });

    store.events.publish = vi
      .fn()
      .mockRejectedValueOnce(new Error("publish failed"));

    await expect(
      realtime.publish("auth:user_logged_in" as any, { userId: "1" } as any),
    ).rejects.toThrow("publish failed");

    const names = events.map((event) => event.name);
    expect(names).toEqual(
      expect.arrayContaining(["igniter.core.realtime.event.publish.error"]),
    );

    const failures = await validateTelemetryEvents(events);
    expect(failures).toEqual([]);
  });

  it("filters and paginates connections", async () => {
    const { store: localStore, kv } = createStore();
    store = localStore;

    transport = {
      name: "sse",
      openConnection: vi.fn().mockResolvedValue(mockResponse),
      publish: vi.fn().mockReturnValue(1),
      closeAll: vi.fn(),
    };

    const realtime = new IgniterStoreRealtimeProcessor({ store, transport });

    kv.set("sse:connections:1", {
      connectionId: "1",
      channels: ["alpha"],
      scopes: ["org:1"],
      ip: "10.0.0.1",
      device: { os: "ios", browser: "safari" },
      geo: { country: "BR" },
      createdAt: "2024-01-01T00:00:00.000Z",
    });
    kv.set("sse:connections:2", {
      connectionId: "2",
      channels: ["beta"],
      scopes: ["org:2"],
      ip: "10.0.0.2",
      device: { os: "android" },
      geo: { country: "US" },
      createdAt: "2024-02-01T00:00:00.000Z",
    });
    kv.set("sse:connections:3", {
      connectionId: "3",
      channels: ["alpha"],
      scopes: ["org:1", "team:9"],
      ip: "10.0.0.1",
      device: { os: "ios", browser: "safari" },
      geo: { country: "BR", city: "Sao Paulo" },
      createdAt: "2024-03-01T00:00:00.000Z",
    });

    const filtered = await realtime.connections.list({
      where: {
        channel: "alpha",
        ip: "10.0.0.1",
        device: { os: "ios" },
        geo: { country: "BR" },
      },
      orderBy: { createdAt: "asc" },
    });

    expect(filtered.map((entry) => entry.connectionId)).toEqual(["1", "3"]);

    const paged = await realtime.connections.list({
      orderBy: { createdAt: "desc" },
      skip: 1,
      take: 1,
    });
    expect(paged).toHaveLength(1);

    const count = await realtime.connections.count({
      where: { scope: { key: "org", id: "1" } },
    });
    expect(count).toBe(2);

    const first = await realtime.connections.getFirst({
      where: { channel: "alpha" },
    });
    const last = await realtime.connections.getLast({
      where: { channel: "alpha" },
    });
    expect(first?.connectionId).toBe("1");
    expect(last?.connectionId).toBe("3");

    const scoped = await realtime.connections.scope("org", "1").list();
    expect(scoped.every((entry) => entry.scopes?.includes("org:1"))).toBe(true);

    const byId = await realtime.connections.getById("2");
    expect(byId?.connectionId).toBe("2");
  });

  it("propagates publish and subscribe errors", async () => {
    const { store: localStore } = createStore();
    localStore.events.publish = vi.fn().mockRejectedValue(new Error("publish"));
    localStore.events.subscribe = vi.fn().mockRejectedValue(new Error("subscribe"));
    store = localStore as IgniterStoreManager;

    const realtime = new IgniterStoreRealtimeProcessor({ store, transport });

    await expect(
      realtime.publish("auth:user_logged_in" as any, { userId: "1" } as any),
    ).rejects.toThrow("publish");

    await expect(
      realtime.subscribe("auth:user_logged_in" as any, vi.fn() as any),
    ).rejects.toThrow("subscribe");
  });

  it("handles subscription cleanup errors gracefully", async () => {
    const { store: localStore } = createStore();
    store = localStore;

    const unsubscribe = vi.fn(async () => {
      throw new Error("unsubscribe failed");
    });
    store.events.subscribe = vi.fn().mockResolvedValue(unsubscribe);

    const openOptions: any[] = [];
    transport = {
      name: "sse",
      openConnection: vi.fn(async (_req, options) => {
        openOptions.push(options);
        return new Response("ok");
      }),
      publish: vi.fn().mockReturnValue(1),
      closeAll: vi.fn(),
    };

    const realtime = new IgniterStoreRealtimeProcessor({ store, transport });
    const uuidSpy = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValue("conn-1");

    await realtime.openConnection(
      new Request("http://localhost/api/v1/sse/events?channels=auth:user_logged_in"),
    );

    await openOptions[0].onClose?.("client");

    expect(unsubscribe).toHaveBeenCalled();
    uuidSpy.mockRestore();
  });
});
