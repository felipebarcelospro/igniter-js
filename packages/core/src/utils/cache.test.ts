import { describe, expect, it, vi } from "vitest";
import { ClientCache } from "./cache";

describe("ClientCache", () => {
  it("stores and retrieves values", () => {
    ClientCache.set("key", { ok: true });

    expect(ClientCache.get("key")).toEqual({ ok: true });
  });

  it("returns undefined for stale entries", () => {
    ClientCache.set("stale", { ok: true });

    const internalCache = (ClientCache as any).cache as Map<string, any>;
    const entry = internalCache.get("stale");
    internalCache.set("stale", { ...entry, timestamp: 0 });

    expect(ClientCache.get("stale", 1)).toBeUndefined();
  });

  it("clears individual and all entries", () => {
    ClientCache.set("one", 1);
    ClientCache.set("two", 2);

    ClientCache.clear("one");

    expect(ClientCache.get("one")).toBeUndefined();
    expect(ClientCache.get("two")).toBe(2);

    ClientCache.clearAll();

    expect(ClientCache.get("two")).toBeUndefined();
  });
});
