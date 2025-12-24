import { describe, expect, it } from "vitest";

import { MockCallerStoreAdapter } from "./mock.adapter";

describe("MockCallerStoreAdapter", () => {
  it("stores and retrieves values", async () => {
    const adapter = MockCallerStoreAdapter.create();
    await adapter.set("key", { value: 1 });

    const found = await adapter.get("key");
    expect(found).toEqual({ value: 1 });
    expect(await adapter.has("key")).toBe(true);
  });

  it("tracks call history and clears state", async () => {
    const adapter = MockCallerStoreAdapter.create();
    await adapter.set("alpha", "value");
    await adapter.get("alpha");
    await adapter.has("alpha");
    await adapter.delete("alpha");

    expect(adapter.calls.set).toBe(1);
    expect(adapter.calls.get).toBe(1);
    expect(adapter.calls.has).toBe(1);
    expect(adapter.calls.delete).toBe(1);

    expect(adapter.history.set[0]?.key).toBe("alpha");
    expect(adapter.history.get).toEqual(["alpha"]);
    expect(adapter.history.has).toEqual(["alpha"]);
    expect(adapter.history.delete).toEqual(["alpha"]);

    adapter.clear();
    expect(adapter.calls.set).toBe(0);
    expect(adapter.client.size).toBe(0);
    expect(adapter.history.get).toEqual([]);
  });
});
