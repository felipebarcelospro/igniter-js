import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

let generateError: Error | null = null;
let streamError: Error | null = null;
let mcpError: Error | null = null;
let mcpTools: Record<string, unknown> = {};

vi.mock("ai", () => {
  class ToolLoopAgent {
    constructor(public readonly options: Record<string, unknown>) {}

    async generate() {
      if (generateError) {
        throw generateError;
      }
      return { text: "ok" };
    }

    async stream() {
      if (streamError) {
        throw streamError;
      }

      async function* streamChunks() {
        yield "chunk-1";
        yield "chunk-2";
      }

      return { textStream: streamChunks() };
    }
  }

  const tool = ({ description, inputSchema, outputSchema, execute }: any) => ({
    description,
    inputSchema,
    outputSchema,
    execute,
  });

  return {
    ToolLoopAgent,
    tool,
  };
});

vi.mock("@ai-sdk/mcp", () => ({
  experimental_createMCPClient: vi.fn(async () => {
    if (mcpError) {
      throw mcpError;
    }
    return {
      tools: async () => mcpTools,
    };
  }),
}));

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: class {
    constructor() {}
  },
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: class {
    constructor() {}
  },
}));

import { IgniterAgent } from "../builders/agent.builder";
import { IgniterAgentMCPClient } from "../builders/mcp.builder";
import { IgniterAgentTelemetryEvents } from "../telemetry";
import { IgniterAgentInMemoryAdapter } from "../adapters/memory.adapter";

const createTelemetry = () => ({ emit: vi.fn() });

const expectEmitted = (
  telemetry: { emit: ReturnType<typeof vi.fn> },
  event: string,
  level: "debug" | "error",
  attributes: Record<string, unknown>,
) => {
  const call = telemetry.emit.mock.calls.find(([key]) => key === event);
  expect(call).toBeTruthy();
  expect(call?.[1]).toMatchObject({ level, attributes });
};

const createToolset = (
  execute?: (input: { message: string }) => Promise<string>,
) => ({
  type: "custom",
  name: "utils",
  status: "connected",
  tools: {
    echo: {
      description: "Echo",
      inputSchema: z.object({ message: z.string() }),
      execute: async ({ message }: { message: string }) => {
        if (execute) {
          return execute({ message });
        }
        return message;
      },
    },
  },
} as any);

const createAgent = (options: {
  telemetry: { emit: ReturnType<typeof vi.fn> };
  toolset?: ReturnType<typeof createToolset>;
  mcp?: ReturnType<typeof createMcpConfig>;
  memory?: IgniterAgentInMemoryAdapter;
}) => {
  let builder = IgniterAgent.create("assistant")
    .withModel({} as any)
    .withTelemetry(options.telemetry as any);

  if (options.toolset) {
    builder = builder.addToolset(options.toolset);
  }

  if (options.mcp) {
    builder = builder.addMCP(options.mcp);
  }

  if (options.memory) {
    builder = builder.withMemory({ provider: options.memory });
  }

  return builder.build();
};

const createMcpConfig = () =>
  IgniterAgentMCPClient.create("remote")
    .withType("http")
    .withURL("https://example.com")
    .build();

beforeEach(() => {
  vi.clearAllMocks();
  generateError = null;
  streamError = null;
  mcpError = null;
  mcpTools = { echo: { description: "echo", execute: vi.fn() } };
});

describe("telemetry.lifecycle", () => {
  it("emits lifecycle.start.started", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry });

    await agent.start();

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("lifecycle.start.started"),
      "debug",
      { "ctx.agent.name": "assistant" },
    );
  });

  it("emits lifecycle.start.success", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry });

    await agent.start();

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("lifecycle.start.success"),
      "debug",
      { "ctx.agent.name": "assistant" },
    );
  });

  it("emits lifecycle.start.error", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry, mcp: createMcpConfig() });

    mcpError = new Error("connection failed");

    await expect(agent.start()).rejects.toBeInstanceOf(Error);

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("lifecycle.start.error"),
      "error",
      { "ctx.agent.name": "assistant" },
    );
  });

  it("emits lifecycle.stop.started", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry });

    await agent.start();
    await agent.stop();

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("lifecycle.stop.started"),
      "debug",
      { "ctx.agent.name": "assistant" },
    );
  });

  it("emits lifecycle.stop.success", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry });

    await agent.start();
    await agent.stop();

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("lifecycle.stop.success"),
      "debug",
      { "ctx.agent.name": "assistant" },
    );
  });

  it("emits lifecycle.stop.error", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry, mcp: createMcpConfig() });

    await agent.start();

    const toolsets = agent.getToolsets();
    const mcpToolset = toolsets.remote as any;
    mcpToolset.disconnect = () => {
      throw new Error("disconnect failed");
    };

    await expect(agent.stop()).rejects.toBeInstanceOf(Error);

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("lifecycle.stop.error"),
      "error",
      { "ctx.agent.name": "assistant" },
    );
  });
});

describe("telemetry.mcp", () => {
  it("emits mcp.connect.started", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry, mcp: createMcpConfig() });

    await agent.start();

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("mcp.connect.started"),
      "debug",
      { "ctx.mcp.name": "remote" },
    );
  });

  it("emits mcp.connect.success", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry, mcp: createMcpConfig() });

    await agent.start();

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("mcp.connect.success"),
      "debug",
      { "ctx.mcp.name": "remote" },
    );
  });

  it("emits mcp.connect.error", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry, mcp: createMcpConfig() });

    mcpError = new Error("connect failed");

    await expect(agent.start()).rejects.toBeInstanceOf(Error);

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("mcp.connect.error"),
      "error",
      { "ctx.mcp.name": "remote" },
    );
  });

  it("emits mcp.disconnect.started", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry, mcp: createMcpConfig() });

    await agent.start();
    await agent.stop();

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("mcp.disconnect.started"),
      "debug",
      { "ctx.mcp.name": "remote" },
    );
  });

  it("emits mcp.disconnect.success", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry, mcp: createMcpConfig() });

    await agent.start();
    await agent.stop();

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("mcp.disconnect.success"),
      "debug",
      { "ctx.mcp.name": "remote" },
    );
  });

  it("emits mcp.disconnect.error", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry, mcp: createMcpConfig() });

    await agent.start();

    const toolsets = agent.getToolsets();
    const mcpToolset = toolsets.remote as any;
    mcpToolset.disconnect = () => {
      throw new Error("disconnect failed");
    };

    await expect(agent.stop()).rejects.toBeInstanceOf(Error);

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("mcp.disconnect.error"),
      "error",
      { "ctx.mcp.name": "remote" },
    );
  });
});

describe("telemetry.generation", () => {
  it("emits generation.generate.started", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry });

    await agent.generate({ messages: [{ role: "user", content: "hi" }] });

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("generation.generate.started"),
      "debug",
      { "ctx.agent.name": "assistant" },
    );
  });

  it("emits generation.generate.success", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry });

    await agent.generate({ messages: [{ role: "user", content: "hi" }] });

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("generation.generate.success"),
      "debug",
      { "ctx.agent.name": "assistant" },
    );
  });

  it("emits generation.generate.error", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry });

    generateError = new Error("generation failed");

    await expect(
      agent.generate({ messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toBeInstanceOf(Error);

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("generation.generate.error"),
      "error",
      { "ctx.agent.name": "assistant" },
    );
  });

  it("emits generation.stream.started", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry });

    const stream = await agent.stream({ messages: [{ role: "user", content: "hi" }] });
    for await (const _chunk of stream.textStream) {
      // consume
    }

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("generation.stream.started"),
      "debug",
      { "ctx.agent.name": "assistant" },
    );
  });

  it("emits generation.stream.chunk", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry });

    const stream = await agent.stream({ messages: [{ role: "user", content: "hi" }] });
    for await (const _chunk of stream.textStream) {
      // consume
    }

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("generation.stream.chunk"),
      "debug",
      { "ctx.agent.name": "assistant" },
    );
  });

  it("emits generation.stream.success", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry });

    const stream = await agent.stream({ messages: [{ role: "user", content: "hi" }] });
    for await (const _chunk of stream.textStream) {
      // consume
    }

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("generation.stream.success"),
      "debug",
      { "ctx.agent.name": "assistant" },
    );
  });

  it("emits generation.stream.error", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry });

    streamError = new Error("stream failed");

    await expect(
      agent.stream({ messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toBeInstanceOf(Error);

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("generation.stream.error"),
      "error",
      { "ctx.agent.name": "assistant" },
    );
  });
});

describe("telemetry.tool", () => {
  it("emits tool.execute.started", async () => {
    const telemetry = createTelemetry();
    const toolset = createToolset();
    const agent = createAgent({ telemetry, toolset });

    await agent.getTools().echo.execute({ message: "hi" }, {} as any);

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("tool.execute.started"),
      "debug",
      { "ctx.tool.name": "echo" },
    );
  });

  it("emits tool.execute.success", async () => {
    const telemetry = createTelemetry();
    const toolset = createToolset();
    const agent = createAgent({ telemetry, toolset });

    await agent.getTools().echo.execute({ message: "hi" }, {} as any);

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("tool.execute.success"),
      "debug",
      { "ctx.tool.name": "echo" },
    );
  });

  it("emits tool.execute.error", async () => {
    const telemetry = createTelemetry();
    const toolset = createToolset(async () => {
      throw new Error("tool failed");
    });
    const agent = createAgent({ telemetry, toolset });

    await expect(
      agent.getTools().echo.execute({ message: "hi" }, {} as any),
    ).rejects.toBeInstanceOf(Error);

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("tool.execute.error"),
      "error",
      { "ctx.tool.name": "echo" },
    );
  });
});

describe("telemetry.memory", () => {
  it("emits memory.operation.started", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry, memory: new IgniterAgentInMemoryAdapter() });

    await agent.memory?.getWorkingMemory({ scope: "chat", identifier: "chat-1" });

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("memory.operation.started"),
      "debug",
      { "ctx.memory.operation": "getWorkingMemory" },
    );
  });

  it("emits memory.operation.success", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({ telemetry, memory: new IgniterAgentInMemoryAdapter() });

    await agent.memory?.getWorkingMemory({ scope: "chat", identifier: "chat-1" });

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("memory.operation.success"),
      "debug",
      { "ctx.memory.operation": "getWorkingMemory" },
    );
  });

  it("emits memory.operation.error", async () => {
    const telemetry = createTelemetry();
    const agent = createAgent({
      telemetry,
      memory: {
        getWorkingMemory: async () => null,
        updateWorkingMemory: async () => undefined,
      } as any,
    });

    await expect(
      agent.memory?.getMessages({ chatId: "chat-1" }),
    ).rejects.toBeInstanceOf(Error);

    expectEmitted(
      telemetry,
      IgniterAgentTelemetryEvents.get.key("memory.operation.error"),
      "error",
      { "ctx.memory.operation": "getMessages" },
    );
  });
});
