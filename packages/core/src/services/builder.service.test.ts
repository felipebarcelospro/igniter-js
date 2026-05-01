import { describe, expect, it, vi } from "vitest";
import { Igniter } from "./builder.service";
import type { IgniterStoreManager } from "../types/store.interface";

const createStore = (): IgniterStoreManager =>
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

describe("IgniterBuilder", () => {
  it("creates cache and realtime processors when store is configured", () => {
    const store = createStore();

    const api = Igniter.create().withStore(store).create();

    expect(api.store).toBe(store);
    expect(api.cache).toBeDefined();
    expect(api.realtime).toBeDefined();
    expect(typeof api.cache.get).toBe("function");
  });

  it("sets telemetry when provided", () => {
    const store = createStore();
    const telemetry = {
      emit: vi.fn(),
      session: () => ({
        run: (fn: () => any) => fn(),
      }),
    } as any;

    const api = Igniter.create().withStore(store).withTelemetry(telemetry).create();

    expect(api.telemetry).toBe(telemetry);
    expect(api.realtime).toBeDefined();
  });

  it("propagates logger and plugins configuration", () => {
    const logger = {
      child: vi.fn().mockReturnThis(),
    } as any;

    const api = Igniter.create().withLogger(logger)
      .addPlugin('audit', { name: "audit" })
      .build();

    expect(api.logger).toBe(logger);
    expect(api.plugins).toEqual({ audit: { name: "audit" } });
  });

  it("builds routers with provided config", async () => {
    const api = Igniter.create().withConfig({
      basePATH: "/v2",
      baseURL: "http://localhost",
    }).build();

    const router = api.router({
      controllers: {},
    })

    expect(router.config.basePATH).toBe("/v2");
  });
});
