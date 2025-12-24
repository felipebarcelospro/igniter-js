import { experimental_createMCPClient, type experimental_MCPClient } from "@ai-sdk/mcp";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  ToolLoopAgent,
  type AgentCallParameters,
  type AgentStreamParameters,
  type LanguageModel,
  type ToolSet,
} from "ai";
import { IgniterAgentConfigError, IgniterAgentError, IgniterAgentErrorCode, IgniterAgentMCPError } from "../errors";
import type { IgniterAgentConfig, IgniterAgentMCPConfigUnion, IgniterAgentMCPHttpConfig, IgniterAgentMCPStdioConfig, IgniterAgentToolset } from "../types";
import type { z } from "zod";
import type { IgniterAgentPromptTemplate } from "../types/prompt";
import type { IgniterLogger } from "@igniter-js/core";
import type { IgniterTelemetryAttributes, IgniterTelemetryManager } from "@igniter-js/telemetry";
import { IgniterAgentTelemetryEvents } from "../telemetry";
import type { IgniterAgentHooks } from "../types/hooks";
import { IgniterAgentMemoryCore } from "./memory";

export class IgniterAgentCore<
  TAgentName extends string = string,
  TAgentModel extends LanguageModel = LanguageModel,
  TAgentInstructions extends IgniterAgentPromptTemplate =
    IgniterAgentPromptTemplate,
  TAgentToolsets extends Record<string, IgniterAgentToolset> = Record<
    string,
    IgniterAgentToolset
  >,
  TAgentMCPConfigs extends Record<string, IgniterAgentMCPConfigUnion> = Record<
    string,
    IgniterAgentMCPConfigUnion
  >,
  TAgentContextSchema extends z.ZodSchema = z.ZodSchema,
> {
  private _agent: IgniterAgentConfig<
    TAgentName,
    TAgentModel,
    TAgentInstructions,
    TAgentToolsets,
    TAgentMCPConfigs,
    TAgentContextSchema
  >;

  private logger?: IgniterLogger;
  private telemetry?: IgniterTelemetryManager;
  private hooks: IgniterAgentHooks;
  public memory?: IgniterAgentMemoryCore;

  constructor(
    agent: IgniterAgentConfig<
      TAgentName,
      TAgentModel,
      TAgentInstructions,
      TAgentToolsets,
      TAgentMCPConfigs,
      TAgentContextSchema
    >
  ) {
    this._agent = agent;
    this.logger = agent.logger;
    this.telemetry = agent.telemetry;
    this.hooks = agent.hooks ?? {};
    if (agent.memory) {
      this.memory = new IgniterAgentMemoryCore(agent.memory, String(agent.name), this.logger, this.telemetry);
    }
  }

  /**
   * Attaches a logger instance to the agent.
   */
  attachLogger(logger?: IgniterLogger): void {
    if (!logger) return;
    if (!this.logger) {
      this.logger = logger;
      if (this._agent.memory) {
        this.memory = new IgniterAgentMemoryCore(
          this._agent.memory,
          this.getName(),
          this.logger,
          this.telemetry,
        );
      }
    }
  }

  /**
   * Attaches a telemetry manager to the agent.
   */
  attachTelemetry(telemetry?: IgniterTelemetryManager): void {
    if (!telemetry) return;
    if (!this.telemetry) {
      this.telemetry = telemetry;
      if (this._agent.memory) {
        this.memory = new IgniterAgentMemoryCore(
          this._agent.memory,
          this.getName(),
          this.logger,
          this.telemetry,
        );
      }
    }
  }

  /**
   * Attaches hook callbacks to the agent.
   */
  attachHooks(hooks?: IgniterAgentHooks): void {
    if (!hooks) return;

    const merge = <T extends (...args: any[]) => void>(
      current?: T,
      incoming?: T,
    ): T | undefined => {
      if (!current) return incoming;
      if (!incoming) return current;
      return ((...args: any[]) => {
        current(...args);
        incoming(...args);
      }) as T;
    };

    this.hooks = {
      onAgentStart: merge(this.hooks.onAgentStart, hooks.onAgentStart),
      onAgentError: merge(this.hooks.onAgentError, hooks.onAgentError),
      onToolCallStart: merge(this.hooks.onToolCallStart, hooks.onToolCallStart),
      onToolCallComplete: merge(this.hooks.onToolCallComplete, hooks.onToolCallComplete),
      onToolCallError: merge(this.hooks.onToolCallError, hooks.onToolCallError),
      onMCPStart: merge(this.hooks.onMCPStart, hooks.onMCPStart),
      onMCPError: merge(this.hooks.onMCPError, hooks.onMCPError),
    };
  }

  /**
   * Returns the agent name.
   */
  getName(): string {
    return String(this._agent.name);
  }

  /**
   * Starts the agent by initializing all MCP connections.
   */
  async start(): Promise<void> {
    const startTime = Date.now();
    const toolsets = this._agent.toolsets;
    const mcpConfigs = Object.values(this._agent.configs || {});
    const lifecycleAttributes = {
      "ctx.agent.name": this.getName(),
      "ctx.lifecycle.toolsetCount": Object.keys(toolsets || {}).length,
      "ctx.lifecycle.mcpCount": mcpConfigs.length,
      "ctx.lifecycle.hasMemory": Boolean(this.memory),
    };

    this.logger?.debug("IgniterAgent.start started", lifecycleAttributes);
    this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("lifecycle.start.started"), {
      level: "debug",
      attributes: lifecycleAttributes as IgniterTelemetryAttributes,
    });

    try {
      for (const mcpConfig of mcpConfigs) {
        const mcpStart = Date.now();
        this.hooks.onMCPStart?.(this.getName(), mcpConfig.name);
        this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("mcp.connect.started"), {
          level: "debug",
          attributes: {
            "ctx.agent.name": this.getName(),
            "ctx.mcp.name": mcpConfig.name,
            "ctx.mcp.type": mcpConfig.type,
          } as IgniterTelemetryAttributes,
        });

        try {
          const mcpToolset = await this.initializeMCPClient(mcpConfig);

          // @ts-expect-error - Expected to assign dynamically
          toolsets[mcpConfig.name] = mcpToolset;

          this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("mcp.connect.success"), {
            level: "debug",
            attributes: {
              "ctx.agent.name": this.getName(),
              "ctx.mcp.name": mcpConfig.name,
              "ctx.mcp.type": mcpConfig.type,
              "ctx.mcp.toolCount": Object.keys(mcpToolset.tools || {}).length,
              "ctx.mcp.durationMs": Date.now() - mcpStart,
            } as IgniterTelemetryAttributes,
          });
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("mcp.connect.error"), {
            level: "error",
            attributes: {
              "ctx.agent.name": this.getName(),
              "ctx.mcp.name": mcpConfig.name,
              "ctx.mcp.type": mcpConfig.type,
              "ctx.mcp.durationMs": Date.now() - mcpStart,
              ...this.getErrorAttributes(err, "mcp.connect"),
            } as IgniterTelemetryAttributes,
          });
          this.logger?.error("IgniterAgent.mcp.connect failed", err);
          throw err;
        }
      }

      const durationMs = Date.now() - startTime;
      this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("lifecycle.start.success"), {
        level: "debug",
        attributes: {
          ...lifecycleAttributes,
          "ctx.lifecycle.toolsetCount": Object.keys(this._agent.toolsets || {}).length,
          "ctx.lifecycle.mcpCount": mcpConfigs.length,
        } as IgniterTelemetryAttributes,
      });
      this.logger?.success?.("IgniterAgent.start success", {
        ...lifecycleAttributes,
        durationMs,
      });
      this.hooks.onAgentStart?.(this.getName());
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("lifecycle.start.error"), {
        level: "error",
        attributes: {
          ...lifecycleAttributes,
          ...this.getErrorAttributes(err, "lifecycle.start"),
        } as IgniterTelemetryAttributes,
      });
      this.logger?.error("IgniterAgent.start failed", err);
      this.hooks.onAgentError?.(this.getName(), err);
      throw err;
    }
  }

  /**
   * Stops the agent by disconnecting MCP toolsets.
   */
  async stop(): Promise<void> {
    const startTime = Date.now();
    const mcpConfigs = Object.values(this._agent.configs || {});
    const lifecycleAttributes = {
      "ctx.agent.name": this.getName(),
      "ctx.lifecycle.toolsetCount": Object.keys(this._agent.toolsets || {}).length,
      "ctx.lifecycle.mcpCount": mcpConfigs.length,
      "ctx.lifecycle.hasMemory": Boolean(this.memory),
    };

    this.logger?.debug("IgniterAgent.stop started", lifecycleAttributes);
    this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("lifecycle.stop.started"), {
      level: "debug",
      attributes: lifecycleAttributes as IgniterTelemetryAttributes,
    });

    try {
      for (const mcpConfig of mcpConfigs) {
        const mcpStart = Date.now();
        this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("mcp.disconnect.started"), {
          level: "debug",
          attributes: {
            "ctx.agent.name": this.getName(),
            "ctx.mcp.name": mcpConfig.name,
            "ctx.mcp.type": mcpConfig.type,
          } as IgniterTelemetryAttributes,
        });

        try {
          const existing = this._agent.toolsets[mcpConfig.name as keyof typeof this._agent.toolsets] as {
            disconnect?: () => Promise<void> | void;
          } | undefined;

          if (existing?.disconnect) {
            await existing.disconnect();
          }

          if (existing) {
            // @ts-expect-error - Expected to assign dynamically
            this._agent.toolsets[mcpConfig.name] = {
              ...existing,
              status: "disconnected",
              tools: {},
            };
          }

          this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("mcp.disconnect.success"), {
            level: "debug",
            attributes: {
              "ctx.agent.name": this.getName(),
              "ctx.mcp.name": mcpConfig.name,
              "ctx.mcp.type": mcpConfig.type,
              "ctx.mcp.durationMs": Date.now() - mcpStart,
            } as IgniterTelemetryAttributes,
          });
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("mcp.disconnect.error"), {
            level: "error",
            attributes: {
              "ctx.agent.name": this.getName(),
              "ctx.mcp.name": mcpConfig.name,
              "ctx.mcp.type": mcpConfig.type,
              "ctx.mcp.durationMs": Date.now() - mcpStart,
              ...this.getErrorAttributes(err, "mcp.disconnect"),
            } as IgniterTelemetryAttributes,
          });
          this.logger?.error("IgniterAgent.mcp.disconnect failed", err);
          throw err;
        }
      }

      const durationMs = Date.now() - startTime;
      this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("lifecycle.stop.success"), {
        level: "debug",
        attributes: {
          ...lifecycleAttributes,
          "ctx.lifecycle.toolsetCount": Object.keys(this._agent.toolsets || {}).length,
          "ctx.lifecycle.mcpCount": mcpConfigs.length,
        } as IgniterTelemetryAttributes,
      });
      this.logger?.success?.("IgniterAgent.stop success", {
        ...lifecycleAttributes,
        durationMs,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("lifecycle.stop.error"), {
        level: "error",
        attributes: {
          ...lifecycleAttributes,
          ...this.getErrorAttributes(err, "lifecycle.stop"),
        } as IgniterTelemetryAttributes,
      });
      this.logger?.error("IgniterAgent.stop failed", err);
      throw err;
    }
  }

  /**
   * Generates a response from the agent.
   */
  async generate(
    input: AgentCallParameters<z.infer<TAgentContextSchema>>,
  ): Promise<any> {
    const startTime = Date.now();
    const attributes = {
      "ctx.agent.name": this.getName(),
      "ctx.generation.inputMessages": Array.isArray(input.messages)
        ? input.messages.length
        : undefined,
      "ctx.generation.streamed": false,
    };

    this.logger?.debug("IgniterAgent.generate started", attributes);
    this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("generation.generate.started"), {
      level: "debug",
      attributes: attributes as IgniterTelemetryAttributes,
    });

    try {
      const agent = this.getAgentInstanceWithContext(
        input.options as z.infer<TAgentContextSchema>,
      );
      const result = await agent.generate(input);
      const durationMs = Date.now() - startTime;
      this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("generation.generate.success"), {
        level: "debug",
        attributes: {
          ...attributes,
          "ctx.generation.durationMs": durationMs,
        } as IgniterTelemetryAttributes,
      });
      this.logger?.success?.("IgniterAgent.generate success", {
        ...attributes,
        durationMs,
      });
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("generation.generate.error"), {
        level: "error",
        attributes: {
          ...attributes,
          ...this.getErrorAttributes(err, "generation.generate"),
        } as IgniterTelemetryAttributes,
      });
      this.logger?.error("IgniterAgent.generate failed", err);
      throw err;
    }
  }

  /**
   * Streams a response from the agent.
   */
  async stream(
    input: AgentStreamParameters<z.infer<TAgentContextSchema>, ToolSet>,
  ): Promise<any> {
    const startTime = Date.now();
    const attributes = {
      "ctx.agent.name": this.getName(),
      "ctx.generation.inputMessages": Array.isArray(input.messages)
        ? input.messages.length
        : undefined,
      "ctx.generation.streamed": true,
    };

    this.logger?.debug("IgniterAgent.stream started", attributes);
    this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("generation.stream.started"), {
      level: "debug",
      attributes: attributes as IgniterTelemetryAttributes,
    });

    try {
      const agent = this.getAgentInstanceWithContext(
        input.options as z.infer<TAgentContextSchema>,
      );
      const result = await agent.stream(input);
      const durationMs = Date.now() - startTime;

      const emitChunk = () => {
        this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("generation.stream.chunk"), {
          level: "debug",
          attributes: attributes as IgniterTelemetryAttributes,
        });
      };

      const wrapped = this.wrapStreamResult(result, emitChunk);

      this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("generation.stream.success"), {
        level: "debug",
        attributes: {
          ...attributes,
          "ctx.generation.durationMs": durationMs,
        } as IgniterTelemetryAttributes,
      });
      this.logger?.success?.("IgniterAgent.stream success", {
        ...attributes,
        durationMs,
      });
      return wrapped;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("generation.stream.error"), {
        level: "error",
        attributes: {
          ...attributes,
          ...this.getErrorAttributes(err, "generation.stream"),
        } as IgniterTelemetryAttributes,
      });
      this.logger?.error("IgniterAgent.stream failed", err);
      throw err;
    }
  }

  /**
   * Gets all registered toolsets.
   */
  getToolsets() {
    return this._agent.toolsets;
  }

  /**
   * Gets the configured model.
   */
  getModel() {
    return this._agent.model as TAgentModel;
  }

  /**
   * Gets the configured instructions.
   */
  getInstructions() {
    return this._agent.instructions as TAgentInstructions;
  }

  /**
   * Gets the context schema.
   */
  getContextSchema() {
    return this._agent.schema as TAgentContextSchema;
  }

  /**
   * Gets all registered tools from all toolsets.
   */
  getTools() {
    const toolsets = this.getToolsets();
    const allTools: ToolSet = {};

    for (const toolset of Object.values(toolsets)) {
      for (const [toolName, tool] of Object.entries(toolset.tools)) {
        const wrapped = this.wrapToolExecution(toolset.name, toolName, tool as ToolSet[string]);
        allTools[toolName] = wrapped;
      }
    }

    return allTools;
  }

  private wrapToolExecution(
    toolsetName: string,
    toolName: string,
    tool: ToolSet[string],
  ): ToolSet[string] {
    if (!tool || !tool.execute || typeof tool.execute !== "function") {
      return tool;
    }

    const execute = tool.execute as NonNullable<ToolSet[string]["execute"]>;
    const fullName = `${toolsetName}.${toolName}`;
    const agentName = this.getName();

    return {
      ...tool,
      execute: async (input: unknown, options?: unknown) => {
        const startTime = Date.now();
        this.hooks.onToolCallStart?.(agentName, fullName, input);
        this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("tool.execute.started"), {
          level: "debug",
          attributes: {
            "ctx.agent.name": agentName,
            "ctx.tool.toolset": toolsetName,
            "ctx.tool.name": toolName,
            "ctx.tool.fullName": fullName,
          } as IgniterTelemetryAttributes,
        });
        this.logger?.debug("IgniterAgent.tool.execute started", {
          agent: agentName,
          tool: fullName,
        });

        try {
          const result = await execute(input as any, options as any);
          const durationMs = Date.now() - startTime;
          this.hooks.onToolCallComplete?.(agentName, fullName, result);
          this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("tool.execute.success"), {
            level: "debug",
            attributes: {
              "ctx.agent.name": agentName,
              "ctx.tool.toolset": toolsetName,
              "ctx.tool.name": toolName,
              "ctx.tool.fullName": fullName,
              "ctx.tool.durationMs": durationMs,
            } as IgniterTelemetryAttributes,
          });
          this.logger?.success?.("IgniterAgent.tool.execute success", {
            agent: agentName,
            tool: fullName,
            durationMs,
          });
          return result;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          this.hooks.onToolCallError?.(agentName, fullName, err);
          this.telemetry?.emit(IgniterAgentTelemetryEvents.get.key("tool.execute.error"), {
            level: "error",
            attributes: {
              "ctx.agent.name": agentName,
              "ctx.tool.toolset": toolsetName,
              "ctx.tool.name": toolName,
              "ctx.tool.fullName": fullName,
              ...this.getErrorAttributes(err, "tool.execute"),
            } as IgniterTelemetryAttributes,
          });
          this.logger?.error("IgniterAgent.tool.execute failed", err);
          throw err;
        }
      },
    };
  }

  private wrapStreamResult<T>(result: T, onChunk: () => void): T {
    if (!result) {
      return result;
    }

    if (typeof (result as any)[Symbol.asyncIterator] === "function") {
      const iterable = result as unknown as AsyncIterable<unknown>;
      return {
        [Symbol.asyncIterator]: async function* () {
          for await (const chunk of iterable) {
            onChunk();
            yield chunk;
          }
        },
      } as T;
    }

    const maybeTextStream = (result as any).textStream;
    if (maybeTextStream && typeof maybeTextStream[Symbol.asyncIterator] === "function") {
      return {
        ...(result as any),
        textStream: (async function* () {
          for await (const chunk of maybeTextStream) {
            onChunk();
            yield chunk;
          }
        })(),
      } as T;
    }

    return result;
  }

  private getErrorAttributes(error: Error, operation: string): Record<string, unknown> {
    return {
      "ctx.error.code": (error as { code?: string }).code ?? error.name ?? IgniterAgentErrorCode.UNKNOWN,
      "ctx.error.message": error.message,
      "ctx.error.operation": operation,
      "ctx.error.component": "agent",
    };
  }
  
  private getAgentInstanceWithContext(context: z.infer<TAgentContextSchema>) {
    const tools = this.getTools();

    if (!this._agent.model) {
      throw new IgniterAgentConfigError({
        message: "Model is required. Call withModel() before build()",
        field: "model",
      });
    }

    if (this._agent.schema !== undefined) {
      const parseResult = this._agent.schema.safeParse(context);
      if (parseResult.success) {
        context = parseResult.data;
      } else {
        throw new IgniterAgentError({
          message: "Invalid context schema",
          code: IgniterAgentErrorCode.AGENT_CONTEXT_SCHEMA_INVALID,
        });
      }
    }

    return new ToolLoopAgent<z.infer<TAgentContextSchema>, ToolSet>({
      model: this._agent.model,
      instructions: this._agent.instructions
        ? this._agent.instructions.build(context as any)
        : "",
      tools,
      callOptionsSchema: this._agent.schema as any,
    })
  }

  private async initializeMCPClient<
    TMCPType extends IgniterAgentMCPConfigUnion["type"],
    TMCPName extends string,
  >(
    mcpConfig: IgniterAgentMCPConfigUnion<TMCPName>,
  ): Promise<IgniterAgentToolset<TMCPType, TMCPName>> {
    if (this._agent.toolsets[mcpConfig.name]) {
      return this._agent.toolsets[
        mcpConfig.name as keyof typeof this._agent.toolsets
      ] as unknown as IgniterAgentToolset<TMCPType, TMCPName>;
    }

    let client: experimental_MCPClient | null = null;

    try {
      if (mcpConfig.type === "stdio") {
        const stdioConfig = mcpConfig as IgniterAgentMCPStdioConfig<TMCPName>;
        this.logger?.debug("IgniterAgent.mcp.connect stdio", {
          command: stdioConfig.command,
          args: stdioConfig.args,
        });

        client = await experimental_createMCPClient({
          transport: new StdioClientTransport({
            command: stdioConfig.command,
            args: stdioConfig.args,
            env: stdioConfig.env,
          }),
        });
      }

      if (mcpConfig.type === "http") {
        const httpConfig = mcpConfig as IgniterAgentMCPHttpConfig<TMCPName>;
        this.logger?.debug("IgniterAgent.mcp.connect http", {
          url: httpConfig.url,
        });

        const url = new URL(httpConfig.url);
        client = await experimental_createMCPClient({
          transport: new StreamableHTTPClientTransport(url, {
            requestInit: {
              headers: httpConfig.headers,
            },
          }),
        });
      }

      if (!client) {
        throw new IgniterAgentMCPError({
          message: `Failed to create MCP client for '${mcpConfig.name}'`,
          code: IgniterAgentErrorCode.MCP_CONNECTION_FAILED,
          mcpName: mcpConfig.name,
        });
      }

      const tools = await client.tools();

      return {
        type: mcpConfig.type as TMCPType,
        status: "connected",
        name: mcpConfig.name,
        tools: tools as ToolSet,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.hooks.onMCPError?.(this.getName(), mcpConfig.name, err);
      throw err;
    }
  }
}
