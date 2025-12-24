import { describe, expect, it, vi } from "vitest";
import { IgniterAgentManagerCore } from "./manager";
import type { IgniterAgentBuiltAgent } from "../types";

type StubAgent = IgniterAgentBuiltAgent & {
  start: ReturnType<typeof vi.fn>;
};

const createStubAgent = (name: string, shouldFail = false): StubAgent => {
  const start = shouldFail
    ? vi.fn().mockRejectedValue(new Error("start failed"))
    : vi.fn().mockResolvedValue(undefined);

  return {
    attachLogger: vi.fn(),
    attachTelemetry: vi.fn(),
    attachHooks: vi.fn(),
    getName: () => name,
    getToolsets: () => ({}),
    getModel: () => ({}),
    getInstructions: () => ({ build: () => "" } as any),
    getContextSchema: () => ({} as any),
    start,
    stop: vi.fn().mockResolvedValue(undefined),
    generate: vi.fn(),
    stream: vi.fn(),
  } as StubAgent;
};

describe("IgniterAgentManagerCore", () => {
  it("registers and retrieves agents", () => {
    const manager = new IgniterAgentManagerCore({ agents: {} });
    const agent = createStubAgent("support");

    manager.register("support", agent);

    expect(manager.has("support")).toBe(true);
    expect(manager.get("support")).toBe(agent);
  });

  it("startAll returns errors when agents fail", async () => {
    const manager = new IgniterAgentManagerCore({
      agents: {
        success: createStubAgent("success"),
        fail: createStubAgent("fail", true),
      },
      continueOnError: true,
    });

    const results = await manager.startAll();

    expect(results.get("success")).toBeDefined();
    expect(results.get("fail")).toBeInstanceOf(Error);
    expect(manager.getFailedAgents()).toHaveLength(1);
  });
});
