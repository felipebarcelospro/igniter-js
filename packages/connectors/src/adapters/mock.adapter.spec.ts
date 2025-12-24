import { describe, expect, it } from "vitest";
import { IgniterConnectorMockAdapter } from "./mock.adapter";

describe("IgniterConnectorMockAdapter", () => {
  it("tracks save/get/update/delete calls", async () => {
    const adapter = IgniterConnectorMockAdapter.create();

    await adapter.save("org", "org_1", "telegram", { token: "x" }, true);
    expect(adapter.calls.save).toBe(1);

    await adapter.get("org", "org_1", "telegram");
    expect(adapter.calls.get).toBe(1);

    await adapter.update("org", "org_1", "telegram", { enabled: false });
    expect(adapter.calls.update).toBe(1);

    await adapter.delete("org", "org_1", "telegram");
    expect(adapter.calls.delete).toBe(1);
  });

  it("lists and counts connector records", async () => {
    const adapter = IgniterConnectorMockAdapter.create();

    await adapter.save("org", "org_1", "telegram", { token: "x" }, true);
    await adapter.save("org", "org_1", "slack", { token: "y" }, true);
    await adapter.save("org", "org_2", "telegram", { token: "z" }, true);

    const list = await adapter.list("org", "org_1");
    expect(list).toHaveLength(2);
    expect(adapter.calls.list).toBe(1);

    const count = await adapter.countConnections("telegram");
    expect(count).toBe(2);
    expect(adapter.calls.countConnections).toBe(1);
  });

  it("finds records by webhook secret and updates metadata", async () => {
    const adapter = IgniterConnectorMockAdapter.create();

    await adapter.save(
      "org",
      "org_1",
      "telegram",
      { webhook: { secret: "secret-1" } },
      true,
    );

    const found = await adapter.findByWebhookSecret("telegram", "secret-1");
    expect(found?.provider).toBe("telegram");
    expect(adapter.calls.findByWebhookSecret).toBe(1);

    const metadata = {
      lastEventAt: new Date(),
      lastEventResult: "success" as const,
    };
    await adapter.updateWebhookMetadata("telegram", "secret-1", metadata);
    expect(adapter.calls.updateWebhookMetadata).toBe(1);
  });

  it("clears internal state", async () => {
    const adapter = IgniterConnectorMockAdapter.create();

    await adapter.save("org", "org_1", "telegram", { token: "x" }, true);
    adapter.clear();

    expect(adapter.records.size).toBe(0);
    expect(adapter.calls.save).toBe(0);
  });
});
