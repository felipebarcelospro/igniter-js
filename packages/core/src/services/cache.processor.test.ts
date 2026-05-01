import { describe, expect, it, vi } from "vitest";
import { IgniterStoreCacheProcessor } from "./cache.processor";
import type { IgniterStoreManager } from "@igniter-js/store";

type StoreStub = IgniterStoreManager & {
  kv: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
};

const createStore = (): StoreStub =>
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

describe("IgniterStoreCacheProcessor", () => {
  it("gets and sets cache values", async () => {
    const store = createStore();
    const cache = new IgniterStoreCacheProcessor(store);

    store.kv.get.mockResolvedValueOnce({ ok: true });

    await cache.set("users.getById", { ok: true }, { ttl: 60 });
    const result = await cache.get("users.getById");

    expect(store.kv.set).toHaveBeenCalledWith(
      "cache:responses:users.getById",
      { ok: true },
      { ttl: 60 },
    );
    expect(store.kv.get).toHaveBeenCalledWith("cache:responses:users.getById");
    expect(result).toEqual({ ok: true });
  });

  it("tags cache entries", async () => {
    const store = createStore();
    const cache = new IgniterStoreCacheProcessor(store);

    store.kv.get.mockResolvedValueOnce(["users.getById"]);

    await cache.set("users.list", { ok: true }, { tags: ["users"] });

    expect(store.kv.set).toHaveBeenCalledWith(
      "cache:tags:users",
      expect.arrayContaining(["users.getById", "users.list"]),
    );
  });

  it("invalidates cache keys", async () => {
    const store = createStore();
    const cache = new IgniterStoreCacheProcessor(store);

    await cache.invalidate("users.getById");

    expect(store.kv.remove).toHaveBeenCalledWith(
      "cache:responses:users.getById",
    );
  });

  it("invalidates cache keys by tags", async () => {
    const store = createStore();
    const cache = new IgniterStoreCacheProcessor(store);

    store.kv.get.mockResolvedValueOnce(["users.getById"]);

    await cache.invalidate({ tags: ["users"] });

    expect(store.kv.remove).toHaveBeenCalledWith(
      "cache:responses:users.getById",
    );
    expect(store.kv.remove).toHaveBeenCalledWith("cache:tags:users");
  });

  it("resolves cache keys with scopes", () => {
    const store = createStore();
    const cache = new IgniterStoreCacheProcessor(store);

    const key = cache.resolveKey({
      path: "users.getById",
      params: { id: 1 },
      scopes: ["org:1", "user:2"],
    });

    expect(key).toBe(
      'users.getById:{"params":{"id":1}}:scopes:org:1,user:2',
    );
  });

  it("stores and retrieves geo entries", async () => {
    const store = createStore();
    const cache = new IgniterStoreCacheProcessor(store);

    store.kv.get.mockResolvedValueOnce({ country: "BR" });

    const geo = await cache.getGeo("1.1.1.1");

    await cache.setGeo("1.1.1.1", { country: "BR" } as any, 60);

    expect(store.kv.get).toHaveBeenCalledWith("geo:ip:1.1.1.1");
    expect(geo).toEqual({ country: "BR" });
    expect(store.kv.set).toHaveBeenCalledWith(
      "geo:ip:1.1.1.1",
      { country: "BR" },
      { ttl: 60 },
    );
  });
});
