import { describe, expect, it, vi } from "vitest";
import { IgniterAgentManager } from "./main.builder";
import type { IgniterAgentBuiltAgent } from "../types";

type StubAgent = IgniterAgentBuiltAgent & {
  attachLogger: ReturnType<typeof vi.fn>;
  attachTelemetry: ReturnType<typeof vi.fn>;
  attachHooks: ReturnType<typeof vi.fn>;
};

const createStubAgent = (name: string): StubAgent => {
  return {
    attachLogger: vi.fn(),
    attachTelemetry: vi.fn(),
    attachHooks: vi.fn(),
    getName: () => name,
    getToolsets: () => ({}),
    getModel: () => ({}),
    getInstructions: () => ({ build: () => "" } as any),
    getContextSchema: () => ({} as any),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    generate: vi.fn(),
    stream: vi.fn(),
  } as StubAgent;
};

describe("IgniterAgentManagerBuilder", () => {
  it("builds a manager with registered agents", () => {
    const logger = { child: vi.fn(() => ({}) ) } as any;
    const telemetry = { emit: vi.fn() } as any;
    const agent = createStubAgent("support");

    const manager = IgniterAgentManager
      .create()
      .withLogger(logger)
      .withTelemetry(telemetry)
      .addAgent("support", agent)
      .build();

    expect(manager.getNames()).toEqual(["support"]);
    expect(agent.attachLogger).toHaveBeenCalled();
    expect(agent.attachTelemetry).toHaveBeenCalledWith(telemetry);
    expect(agent.attachHooks).toHaveBeenCalled();
  });
});
