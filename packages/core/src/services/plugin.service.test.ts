import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { IgniterPluginManager } from "./plugin.service";
import {
  createIgniterPlugin,
  createIgniterPluginAction,
  createIgniterPluginEventEmitter,
  createIgniterPluginEventListener,
} from "../types/plugin.interface";

const createStore = () =>
  ({
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
  }) as any;

const createLogger = () => ({
  child: vi.fn().mockReturnThis(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

describe("IgniterPluginManager", () => {
  it("registers plugins and executes actions", async () => {
    const store = createStore();
    const logger = createLogger();
    const manager = new IgniterPluginManager({ store, logger });

    const action = createIgniterPluginAction({
      name: "ping",
      description: "Ping",
      input: z.object({ message: z.string() }),
      handler: async ({ input }) => ({ echo: input.message }),
    });

    const listener = createIgniterPluginEventListener({
      event: "user:login",
      schema: z.object({ userId: z.string() }),
      handler: vi.fn(),
    });

    const emitter = createIgniterPluginEventEmitter({
      event: "user:login",
      schema: z.object({ userId: z.string() }),
    });

    const plugin = createIgniterPlugin({
      name: "auth",
      $meta: {},
      $config: {},
      $actions: { ping: action },
      $controllers: {},
      $events: {
        emits: { login: emitter },
        listens: { onLogin: listener },
      },
      registration: {
        discoverable: true,
        version: "0.1.0",
        requiresFramework: "0.1.0",
        category: ["auth"],
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

    await manager.register(plugin);

    const result = await manager.executeAction(
      "auth",
      "ping",
      { message: "hello" },
      {} as any,
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ echo: "hello" });
    expect(manager.getPluginNames()).toContain("auth");
  });

  it("emits events locally and through the store", async () => {
    const store = createStore();
    const logger = createLogger();
    const manager = new IgniterPluginManager({ store, logger });

    const handler = vi.fn();

    const plugin = createIgniterPlugin({
      name: "audit",
      $meta: {},
      $config: {},
      $actions: {
        noop: createIgniterPluginAction({
          name: "noop",
          description: "Noop",
          input: z.object({}),
          handler: async () => ({ ok: true }),
        }),
      },
      $controllers: {},
      $events: {
        emits: {
          login: createIgniterPluginEventEmitter({
            event: "user:login",
            schema: z.object({ userId: z.string() }),
          }),
        },
        listens: {
          onLogin: createIgniterPluginEventListener({
            event: "user:login",
            schema: z.object({ userId: z.string() }),
            handler,
          }),
        },
      },
      registration: {
        discoverable: true,
        version: "0.1.0",
        requiresFramework: "0.1.0",
        category: ["audit"],
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

    await manager.register(plugin);

    await manager.emit("user:login", { userId: "123" }, {} as any);

    expect(handler).toHaveBeenCalledWith({ userId: "123" }, {} as any);
    expect(store.events.publish).toHaveBeenCalledWith(
      "plugin:events:user:login",
      expect.objectContaining({
        eventName: "user:login",
        payload: { userId: "123" },
        source: "plugin-manager",
      }),
    );
  });

  it("prevents duplicate plugin registration", async () => {
    const store = createStore();
    const logger = createLogger();
    const manager = new IgniterPluginManager({ store, logger });

    const plugin = createIgniterPlugin({
      name: "dup",
      $meta: {},
      $config: {},
      $actions: {
        noop: createIgniterPluginAction({
          name: "noop",
          description: "Noop",
          input: z.object({}),
          handler: async () => ({ ok: true }),
        }),
      },
      $controllers: {},
      $events: {
        emits: {},
        listens: {},
      },
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

    await manager.register(plugin);

    await expect(manager.register(plugin)).rejects.toThrow(
      "Plugin \"dup\" is already registered",
    );
  });

  it("throws when dependencies are missing on loadAll", async () => {
    const store = createStore();
    const logger = createLogger();
    const manager = new IgniterPluginManager({ store, logger });

    const plugin = createIgniterPlugin({
      name: "needs-dep",
      $meta: {},
      $config: {},
      $actions: {
        noop: createIgniterPluginAction({
          name: "noop",
          description: "Noop",
          input: z.object({}),
          handler: async () => ({ ok: true }),
        }),
      },
      $controllers: {},
      $events: { emits: {}, listens: {} },
      registration: {
        discoverable: true,
        version: "0.1.0",
        requiresFramework: "0.1.0",
        category: ["core"],
        author: "test",
      },
      dependencies: {
        requires: [{ name: "missing", status: "required" }],
        provides: [],
        conflicts: [],
      },
      middleware: {},
      resources: {
        resources: [],
        cleanup: vi.fn(),
      },
    });

    await manager.register(plugin);

    await expect(manager.loadAll()).rejects.toThrow(
      "requires \"missing\" but it's not registered",
    );
  });

  it("enriches context from plugin hooks", async () => {
    const store = createStore();
    const logger = createLogger();
    const manager = new IgniterPluginManager({ store, logger });

    const plugin = createIgniterPlugin({
      name: "context",
      $meta: {},
      $config: {},
      $actions: {
        noop: createIgniterPluginAction({
          name: "noop",
          description: "Noop",
          input: z.object({}),
          handler: async () => ({ ok: true }),
        }),
      },
      $controllers: {},
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
      hooks: {
        extendContext: async () => ({ injected: true }),
      },
      middleware: {},
      resources: {
        resources: [],
        cleanup: vi.fn(),
      },
    });

    await manager.register(plugin);

    const extension = await manager.enrichContext({} as any);

    expect(extension).toEqual({ injected: true });
  });

  it("exposes plugin proxies and supports unregister", async () => {
    const store = createStore();
    const logger = createLogger();
    const manager = new IgniterPluginManager({ store, logger });

    const cleanup = vi.fn();
    const destroy = vi.fn();

    const plugin = createIgniterPlugin({
      name: "proxy",
      $meta: {},
      $config: {},
      $actions: {
        noop: createIgniterPluginAction({
          name: "noop",
          description: "Noop",
          input: z.object({}),
          handler: async () => ({ ok: true }),
        }),
      },
      $controllers: {},
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
      hooks: {
        destroy,
      },
      middleware: {},
      resources: {
        resources: [],
        cleanup,
      },
    });

    await manager.register(plugin);

    const proxy = manager.getPluginProxy("proxy");
    expect(proxy).toBeDefined();
    expect(manager.getAllPluginProxies()).toHaveProperty("proxy");

    await manager.unregister("proxy");

    expect(cleanup).toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();
  });

  it("returns failure when action throws", async () => {
    const store = createStore();
    const logger = createLogger();
    const manager = new IgniterPluginManager({ store, logger });

    const plugin = createIgniterPlugin({
      name: "faulty",
      $meta: {},
      $config: {},
      $actions: {
        boom: createIgniterPluginAction({
          name: "boom",
          description: "Boom",
          input: z.object({}),
          handler: async () => {
            throw new Error("boom");
          },
        }),
      },
      $controllers: {},
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

    await manager.register(plugin);

    const result = await manager.executeAction(
      "faulty",
      "boom",
      {},
      {} as any,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("rejects when execution exceeds timeout", async () => {
    const store = createStore();
    const logger = createLogger();
    const manager = new IgniterPluginManager({ store, logger });

    vi.useFakeTimers();

    const promise = (manager as any).executeWithTimeout(
      () => new Promise(() => {}),
      5,
      "timeout-test",
    );

    vi.advanceTimersByTime(10);

    await expect(promise).rejects.toThrow("timed out");

    vi.useRealTimers();
  });
});
