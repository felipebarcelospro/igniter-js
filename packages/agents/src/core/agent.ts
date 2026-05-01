import { experimental_createMCPClient, type experimental_MCPClient } from "@ai-sdk/mcp";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  generateText,
  Output,
  tool,
  ToolLoopAgent,
  type LanguageModel,
  type ModelMessage,
  type ToolSet,
} from "ai";
import { IgniterAgentConfigError, IgniterAgentError, IgniterAgentErrorCode, IgniterAgentMCPError } from "../errors";
import type { IgniterAgentConfig, IgniterAgentMCPConfigUnion, IgniterAgentMCPHttpConfig, IgniterAgentMCPStdioConfig, IgniterAgentToolset } from "../types";
import { z } from "zod";
import type { IgniterAgentPromptTemplate } from "../types/prompt";
import type { IgniterLogger } from "@igniter-js/common";
import type { IgniterTelemetryAttributes, IgniterTelemetryManager } from "@igniter-js/telemetry";
import type { IgniterAgentTelemetryEventsType } from "../telemetry";
import type { IgniterAgentHooks } from "../types/hooks";
import { IgniterAgentMemoryCore } from "./memory";
import type {
  IgniterAgentGenerateOptions,
  IgniterAgentMessageInput,
  IgniterAgentOutput,
  IgniterAgentPrepareOptions,
  IgniterAgentStreamOptions,
  IgniterAgentToolsetParsed,
} from "../types/agent";
import { IgniterAgentContext } from "../utils";

export class IgniterAgentCore<
  TAgentName extends string = string,
  TAgentModel extends LanguageModel = LanguageModel,
  TAgentInstructions extends IgniterAgentPromptTemplate =
  IgniterAgentPromptTemplate,
  TAgentToolsets extends Record<string, IgniterAgentToolset<any, any>> = Record<
    string,
    IgniterAgentToolset<any, any>
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
  private telemetry?: IgniterTelemetryManager<{ 'igniter.agent': IgniterAgentTelemetryEventsType }>;
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
  attachTelemetry(telemetry?: IgniterTelemetryManager<any>): void {
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
      onToolCallEnd: merge(this.hooks.onToolCallEnd, hooks.onToolCallEnd),
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
    this.telemetry?.emit('igniter.agent.lifecycle.start.started', {
      level: "debug",
      attributes: lifecycleAttributes as IgniterTelemetryAttributes,
    });

    try {
      for (const mcpConfig of mcpConfigs) {
        const mcpStart = Date.now();
        this.hooks.onMCPStart?.(this.getName(), mcpConfig.name);
        this.telemetry?.emit('igniter.agent.mcp.connect.started', {
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

          this.telemetry?.emit('igniter.agent.mcp.connect.success', {
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
          this.telemetry?.emit('igniter.agent.mcp.connect.error', {
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
      this.telemetry?.emit('igniter.agent.lifecycle.start.success', {
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
      this.telemetry?.emit('igniter.agent.lifecycle.start.error', {
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
    this.telemetry?.emit('igniter.agent.lifecycle.stop.started', {
      level: "debug",
      attributes: lifecycleAttributes as IgniterTelemetryAttributes,
    });

    try {
      for (const mcpConfig of mcpConfigs) {
        const mcpStart = Date.now();
        this.telemetry?.emit('igniter.agent.mcp.disconnect.started', {
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

          this.telemetry?.emit('igniter.agent.mcp.disconnect.success', {
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
          this.telemetry?.emit('igniter.agent.mcp.disconnect.error', {
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
      this.telemetry?.emit('igniter.agent.lifecycle.stop.success', {
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
      this.telemetry?.emit('igniter.agent.lifecycle.stop.error', {
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
   * Generates a response for the given message or messages.
   *
   * @description
   * Accepts either a single `message` or an array of `messages`.
   * When both are provided, `message` takes precedence.
   *
   * @param params - The parameters for the generate call.
   * @returns The generated response.
   */
  async generate<
    CALL_OPTIONS = never,
    OUTPUT extends IgniterAgentOutput = never,
  >(params: IgniterAgentGenerateOptions<CALL_OPTIONS, TAgentToolsets, OUTPUT>) {
    const { message, messages } = this.resolveMessageInput(params);

    // Generate a unique request ID
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Initialize chat memory
    const historyMessages = await this.initializeChatMemory({
      chatId: params.chatId,
      userId: params.userId,
      agentId: this.getName(),
      message,
    });

    // Prepare the agent
    const agent = this.prepare({
      chatId: params.chatId,
      userId: params.userId,
      agentId: this.getName(),
      message,
      requestId: requestId,
      context: params.context,
      streamed: false,
    });

    const inputMessages = params.message ? [message] : messages;
    const resolvedMessages = historyMessages
      ? [...historyMessages, ...inputMessages]
      : inputMessages;

    try {
      return await agent.generate({
        abortSignal: params.abortSignal,
        options: params.options as any,
        messages: resolvedMessages,
        prompt: params.prompt as any,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.telemetry?.emit('igniter.agent.generation.generate.error', {
        level: "error",
        attributes: {
          "ctx.agent.name": this.getName(),
          "ctx.agent.chatId": params.chatId,
          "ctx.agent.userId": params.userId,
          "ctx.generation.streamed": false,
          ...this.getErrorAttributes(err, "generation.generate"),
        } as IgniterTelemetryAttributes,
      });
      throw err;
    }
  }

  /**
   * Streams a response for the given message or messages.
   *
   * @description
   * Accepts either a single `message` or an array of `messages`.
   * When both are provided, `message` takes precedence.
   *
   * @param params - The parameters for the stream call.
   * @returns The streaming response.
   */
  async stream<
    CALL_OPTIONS = never,
    OUTPUT extends IgniterAgentOutput = never,
  >(params: IgniterAgentStreamOptions<CALL_OPTIONS, TAgentToolsets, OUTPUT>) {
    const { message, messages } = this.resolveMessageInput(params);

    // Generate a unique request ID
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Initialize chat memory
    const historyMessages = await this.initializeChatMemory({
      chatId: params.chatId,
      userId: params.userId,
      agentId: this.getName(),
      message,
    });

    // Prepare the agent
    const agent = this.prepare({
      chatId: params.chatId,
      userId: params.userId,
      agentId: this.getName(),
      message,
      requestId: requestId,
      context: params.context,
      streamed: true,
    });

    const inputMessages = params.message ? [message] : messages;
    const resolvedMessages = historyMessages
      ? [...historyMessages, ...inputMessages]
      : inputMessages;

    try {
      return await agent.stream({
        abortSignal: params.abortSignal,
        experimental_transform: params.experimental_transform as any,
        options: params.options as any,
        messages: resolvedMessages,
        prompt: params.prompt as any,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      this.telemetry?.emit('igniter.agent.generation.stream.error', {
        level: "error",
        attributes: {
          "ctx.agent.name": this.getName(),
          "ctx.agent.chatId": params.chatId,
          "ctx.agent.userId": params.userId,
          "ctx.generation.streamed": true,
          ...this.getErrorAttributes(err, "generation.stream"),
        } as IgniterTelemetryAttributes,
      });

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
    const allTools = this.initializeTools({
      chatId: "",
      userId: "",
      agentId: this.getName(),
    });

    return allTools;
  }

  /**
   * Gets error attributes for telemetry.
   */
  private getErrorAttributes(error: Error, operation: string): Record<string, unknown> {
    return {
      "ctx.error.code": (error as { code?: string }).code ?? error.name ?? IgniterAgentErrorCode.UNKNOWN,
      "ctx.error.message": error.message,
      "ctx.error.operation": operation,
      "ctx.error.component": "agent",
    };
  }

  /**
   * Gets an agent instance with the given context.
   */
  private prepare<OUTPUT extends IgniterAgentOutput = never>(params: IgniterAgentPrepareOptions<OUTPUT>) {
    const tools = this.initializeTools({
      chatId: params.chatId,
      userId: params.userId,
      agentId: this._agent.name,
    }) as IgniterAgentToolsetParsed<TAgentToolsets>;

    if (!this._agent.model) {
      throw new IgniterAgentConfigError({
        message: "Model is required. Call withModel() before build()",
        field: "model",
      });
    }

    return new ToolLoopAgent<z.infer<TAgentContextSchema>, IgniterAgentToolsetParsed<TAgentToolsets>, IgniterAgentOutput>({
      id: this._agent.name,
      model: this._agent.model,
      instructions: this._agent.instructions.getTemplate(),
      tools,
      callOptionsSchema: this._agent.schema as any,
      prepareCall: async (options: any) => {
        const isStreamed = Boolean(params.streamed);
        const eventPrefix = isStreamed ? "stream" : "generate";

        this.logger?.debug(`IgniterAgent.${eventPrefix} started`, {
          "ctx.agent.name": this.getName(),
          "ctx.agent.chatId": params.chatId,
          "ctx.agent.userId": params.userId,
          "ctx.generation.inputMessages": options.messages?.length || 0,
          "ctx.generation.streamed": isStreamed,
        });

        this.telemetry?.emit(`igniter.agent.generation.${eventPrefix}.started`, {
          level: "debug",
          attributes: {
            "ctx.agent.name": this.getName(),
            "ctx.agent.chatId": params.chatId,
            "ctx.agent.userId": params.userId,
            "ctx.generation.inputMessages": options.messages?.length || 0,
            "ctx.generation.streamed": isStreamed,
          },
        });

        if (this._agent.instructions && options.options) {
          if (this._agent.memory?.working?.enabled && this._agent.memory.working.template) {
            // @ts-expect-error - the instructions are not the same type as the agent instructions, but it's safe to use
            this._agent.instructions = this._agent.instructions.addAppended(
              "memory",
              this._agent.memory.working.template,
            );
          }

          options.instructions = this._agent.instructions.build(options.options);
        }

        if (params.prepareCall) {
          return params.prepareCall(options);
        }

        return options;
      },

      onStepFinish: async (step) => {
        if (params.streamed) {
          return;
        }

        this.logger?.debug("IgniterAgent.generate step", {
          "ctx.agent.name": this.getName(),
          "ctx.chatId": params.chatId,
          "ctx.userId": params.userId,
          "ctx.generation.usage.inputTokens": step.usage.inputTokens,
          "ctx.generation.usage.outputTokens": step.usage.outputTokens,
          "ctx.generation.usage.totalTokens": step.usage.totalTokens,
          "ctx.generation.streamed": false,
        });

        this.telemetry?.emit('igniter.agent.generation.generate.step', {
          level: "debug",
          attributes: {
            "ctx.agent.name": this.getName(),
            "ctx.chatId": params.chatId,
            "ctx.userId": params.userId,
            "ctx.generation.usage.inputTokens": step.usage.inputTokens,
            "ctx.generation.usage.outputTokens": step.usage.outputTokens,
            "ctx.generation.usage.totalTokens": step.usage.totalTokens,
            "ctx.generation.streamed": false,
          },
        });
      },

      onFinish: (result) => {
        if (params.streamed) {
          return;
        }

        this.logger?.debug("IgniterAgent.generate success", {
          "ctx.agent.name": this.getName(),
          "ctx.chatId": params.chatId,
          "ctx.userId": params.userId,
          "ctx.generation.usage.inputTokens": result.usage.inputTokens,
          "ctx.generation.usage.outputTokens": result.usage.outputTokens,
          "ctx.generation.usage.totalTokens": result.usage.totalTokens,
          "ctx.generation.streamed": false,
        });

        this.telemetry?.emit('igniter.agent.generation.generate.success', {
          level: "debug",
          attributes: {
            "ctx.agent.name": this.getName(),
            "ctx.chatId": params.chatId,
            "ctx.userId": params.userId,
            "ctx.generation.usage.inputTokens": result.usage.inputTokens,
            "ctx.generation.usage.outputTokens": result.usage.outputTokens,
            "ctx.generation.usage.totalTokens": result.usage.totalTokens,
            "ctx.generation.streamed": false,
          },
        });
      },

      activeTools: params.activeTools,
      experimental_context: IgniterAgentContext.create({
        context: params.context,
        memory: this._agent.memory,
        metadata: {
          agent: this.getName(),
          chatId: params.chatId,
          userId: params.userId,
          requestId: params.requestId,
          startTime: new Date(),
        }
      }),
      experimental_download: params.experimental_download,
      experimental_repairToolCall: params.experimental_repairToolCall,
      experimental_telemetry: params.experimental_telemetry,
      frequencyPenalty: params.frequencyPenalty,
      maxOutputTokens: params.maxOutputTokens,
      maxRetries: params.maxRetries,
      output: params.output,
      prepareStep: params.prepareStep as any,
      presencePenalty: params.presencePenalty,
      providerOptions: params.providerOptions,
      seed: params.seed,
      stopSequences: params.stopSequences,
      stopWhen: params.stopWhen as any,
      temperature: params.temperature,
      toolChoice: params.toolChoice as any,
      topK: params.topK,
      topP: params.topP,
      headers: params.headers,
    })
  }

  private async initializeChatMemory({
    chatId,
    userId,
    agentId,
    message,
  }: {
    chatId: string;
    userId: string;
    agentId?: string;
    message: ModelMessage;
  }) {
    if (!this.memory || !this._agent.memory?.chats?.enabled) {
      return;
    }

    let chat = await this.memory.getChat(chatId);

    const { generateSuggestions, generateTitle } = this._agent.memory.chats;

    if (!chat) {
      let title = 'New conversation'

      if (generateTitle?.enabled) {
        const response = await generateText({
          model: generateTitle.model || this._agent.model,
          messages: [message],
          system: generateTitle.instructions || 'Analyze the chat history and generate a title for the chat',
          output: Output.object({
            schema: z.object({
              title: z.string().min(1).max(100),
            }),
          }),
        })

        title = response.output.title;
      }

      await this.memory.saveChat({
        chatId,
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
        title,
      });

      chat = await this.memory.getChat(chatId);
    }

    if (!chat) {
      throw new IgniterAgentError({
        code: IgniterAgentErrorCode.MISSING_REQUIRED,
        message: 'Chat not found and could not be created',
        metadata: {
          chatId,
          userId,
          agentId,
        }
      });
    }

    if (!this._agent.memory?.history?.enabled) {
      return;
    }

    const messages = await this.memory.getMessages<ModelMessage>({
      chatId,
      limit: this._agent.memory?.history?.limit,
    });

    return messages
  }

  private resolveMessageInput(params: IgniterAgentMessageInput): {
    message: ModelMessage;
    messages: ModelMessage[];
  } {
    const message = params.message ?? params.messages?.[params.messages.length - 1];
    if (!message) {
      throw new IgniterAgentError({
        code: IgniterAgentErrorCode.MISSING_REQUIRED,
        message: "Either 'message' or 'messages' must be provided",
        metadata: {
          missing: "message",
        },
      });
    }

    const messages = params.message ? [message] : params.messages || [];
    return { message, messages };
  }

  private initializeTools({
    chatId,
    userId,
    agentId,
  }: {
    chatId: string;
    userId: string;
    agentId?: string;
  }) {
    const toolsets = this.getToolsets();
    const allTools: ToolSet = {};

    for (const toolset of Object.values(toolsets)) {
      for (const [toolName, tool] of Object.entries(toolset.tools)) {
        allTools[toolName] = {
          ...tool,
          execute: async (args, options) => {
            if (!tool.execute) {
              throw new IgniterAgentError({
                code: IgniterAgentErrorCode.MISSING_REQUIRED,
                message: "Tool does not have an execute function",
                metadata: { toolName },
              });
            }

            try {
              const startTime = Date.now();
              const toolsetName = (toolset as { name?: string }).name ?? "unknown";
              const toolAttributes = {
                "ctx.agent.name": this.getName(),
                "ctx.tool.toolset": toolsetName,
                "ctx.tool.name": toolName,
                "ctx.tool.fullName": `${toolsetName}.${toolName}`,
              } as IgniterTelemetryAttributes;

              this.hooks.onToolCallStart?.(this.getName(), toolName, args);
              this.telemetry?.emit('igniter.agent.tool.execute.started', {
                level: "debug",
                attributes: toolAttributes,
              });

              const result = await tool.execute(args, {
                ...options,
                experimental_context: {
                  ...options.experimental_context || {},
                  chatId,
                  userId,
                  agentId,
                },
              });

              this.telemetry?.emit('igniter.agent.tool.execute.success', {
                level: "debug",
                attributes: {
                  ...toolAttributes,
                  "ctx.tool.durationMs": Date.now() - startTime,
                } as IgniterTelemetryAttributes,
              });
              this.hooks.onToolCallEnd?.(this.getName(), toolName, result);

              return {
                success: true,
                result,
              }
            } catch (error) {
              const err = error instanceof Error ? error : new Error(String(error));
              const toolsetName = (toolset as { name?: string }).name ?? "unknown";
              this.telemetry?.emit('igniter.agent.tool.execute.error', {
                level: "error",
                attributes: {
                  "ctx.agent.name": this.getName(),
                  "ctx.tool.toolset": toolsetName,
                  "ctx.tool.name": toolName,
                  "ctx.tool.fullName": `${toolsetName}.${toolName}`,
                  ...this.getErrorAttributes(err, "tool.execute"),
                } as IgniterTelemetryAttributes,
              });
              this.hooks.onToolCallError?.(this.getName(), toolName, err);
              throw err;
            }
          },
        };
      }
    }

    if (this._agent.memory?.working?.enabled) {
      const scope = this._agent.memory?.working.scope;
      const isChatMemory = scope === 'chat';
      const identifier = isChatMemory ? chatId : userId;

      allTools['internal__update_working_memory'] = tool({
        description: "Remember important information for later in the conversation",
        inputSchema: z.object({
          content: z
            .string()
            .describe("Updated working memory following the template structure"),
        }),
        execute: async (args, options) => {
          const { content } = args;

          if (this.memory) {
            await this.memory.updateWorkingMemory({
              scope,
              identifier,
              content,
            });
          } else {
            await this._agent.memory?.provider.updateWorkingMemory({
              scope,
              identifier,
              content,
            });
          }

          return {
            success: true,
          }
        },
      })

      if (this._agent.memory?.history?.enabled) {
        allTools['internal__search_on_chat_history'] = tool({
          description: "Search on chat history",
          inputSchema: z.object({
            content: z.string().describe("Search query"),
            limit: z.number().optional().describe("Limit number of results"),
            dateFrom: z.date().optional().describe("Search from date"),
            dateTo: z.date().optional().describe("Search to date"),
          }),
          execute: async (args, options) => {
            const { content, limit, dateFrom, dateTo } = args;

            const result = await this._agent.memory?.provider?.search?.({
              chatId,
              userId,
              limit,
              search: content,
              dateFrom,
              dateTo,
            });

            return {
              success: true,
              result,
            }
          },
        })
      }
    }

    return allTools;
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
