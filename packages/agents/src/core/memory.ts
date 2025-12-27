/**
 * @fileoverview Memory runtime for IgniterAgent.
 * @module core/memory
 */

import type { IgniterLogger } from "@igniter-js/core";
import type { IgniterTelemetryAttributes, IgniterTelemetryManager } from "@igniter-js/telemetry";
import type {
  IgniterAgentConversationMessage,
  IgniterAgentGetChatsParams,
  IgniterAgentGetMessagesParams,
  IgniterAgentMemoryConfig,
  IgniterAgentMemoryRuntime,
  IgniterAgentUpdateWorkingMemoryParams,
  IgniterAgentWorkingMemory,
  IgniterAgentWorkingMemoryParams,
  IgniterAgentChatSession,
  IgniterAgentUIMessage,
} from "../types";
import { IgniterAgentMemoryError, IgniterAgentErrorCode } from "../errors";

const MEMORY_ERROR_CODE = IgniterAgentErrorCode.MEMORY_PROVIDER_ERROR;

/**
 * Memory runtime wrapper that adds logging and telemetry to provider operations.
 *
 * @public
 */
export class IgniterAgentMemoryCore implements IgniterAgentMemoryRuntime {
  private readonly provider: IgniterAgentMemoryConfig["provider"];
  private readonly agentName: string;
  private readonly logger?: IgniterLogger;
  private readonly telemetry?: IgniterTelemetryManager;

  constructor(
    config: IgniterAgentMemoryConfig,
    agentName: string,
    logger?: IgniterLogger,
    telemetry?: IgniterTelemetryManager,
  ) {
    this.provider = config.provider;
    this.agentName = agentName;
    this.logger = logger;
    this.telemetry = telemetry;
  }

  private getBaseAttributes(operation: string, scope?: string) {
    const attributes: Record<string, unknown> = {
      "ctx.agent.name": this.agentName,
      "ctx.memory.operation": operation,
    };

    if (scope) {
      attributes["ctx.memory.scope"] = scope;
    }

    return attributes;
  }

  private emitStart(operation: string, scope?: string) {
    this.telemetry?.emit('igniter.agent.memory.operation.started', {
      level: "debug",
      attributes: this.getBaseAttributes(operation, scope) as IgniterTelemetryAttributes,
    });
  }

  private emitSuccess(
    operation: string,
    durationMs: number,
    scope?: string,
    count?: number,
  ) {
    const attributes = {
      ...this.getBaseAttributes(operation, scope),
      "ctx.memory.durationMs": durationMs,
    } as Record<string, unknown>;

    if (count !== undefined) {
      attributes["ctx.memory.count"] = count;
    }

    this.telemetry?.emit('igniter.agent.memory.operation.success', {
      level: "debug",
      attributes: attributes as IgniterTelemetryAttributes,
    });
  }

  private emitError(operation: string, error: Error, scope?: string) {
    const attributes: Record<string, unknown> = {
      ...this.getBaseAttributes(operation, scope),
      "ctx.error.code": MEMORY_ERROR_CODE,
      "ctx.error.message": error.message,
      "ctx.error.operation": operation,
      "ctx.error.component": "memory",
    };

    this.telemetry?.emit('igniter.agent.memory.operation.error', {
      level: "error",
      attributes: attributes as IgniterTelemetryAttributes,
    });
  }

  private async runOperation<T>(
    operation: string,
    scope: string | undefined,
    handler: () => Promise<T>,
    count?: (value: T) => number | undefined,
  ): Promise<T> {
    const start = Date.now();
    this.emitStart(operation, scope);
    this.logger?.debug(`IgniterAgent.memory.${operation} started`, {
      agent: this.agentName,
      scope,
    });

    try {
      const result = await handler();
      const durationMs = Date.now() - start;
      this.emitSuccess(operation, durationMs, scope, count?.(result));
      this.logger?.success?.(
        `IgniterAgent.memory.${operation} success`,
        { agent: this.agentName, scope, durationMs },
      );
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emitError(operation, error, scope);
      this.logger?.error(`IgniterAgent.memory.${operation} failed`, error);
      throw new IgniterAgentMemoryError({
        message: error.message,
        code: MEMORY_ERROR_CODE,
        cause: error,
        metadata: { operation },
      });
    }
  }

  async getWorkingMemory(
    params: IgniterAgentWorkingMemoryParams,
  ): Promise<IgniterAgentWorkingMemory | null> {
    return this.runOperation(
      "getWorkingMemory",
      params.scope,
      () => this.provider.getWorkingMemory(params),
    );
  }

  async updateWorkingMemory(
    params: IgniterAgentUpdateWorkingMemoryParams,
  ): Promise<void> {
    await this.runOperation(
      "updateWorkingMemory",
      params.scope,
      () => this.provider.updateWorkingMemory(params),
    );
  }

  async saveMessage(message: IgniterAgentConversationMessage): Promise<void> {
    await this.runOperation(
      "saveMessage",
      undefined,
      async () => {
        if (!this.provider.saveMessage) {
          throw new Error("saveMessage is not supported by the provider");
        }
        await this.provider.saveMessage(message);
      },
    );
  }

  async getMessages<T = IgniterAgentUIMessage>(
    params: IgniterAgentGetMessagesParams,
  ): Promise<T[]> {
    return this.runOperation(
      "getMessages",
      undefined,
      async () => {
        if (!this.provider.getMessages) {
          throw new Error("getMessages is not supported by the provider");
        }
        return this.provider.getMessages<T>(params);
      },
      (result) => result.length,
    );
  }

  async saveChat(chat: IgniterAgentChatSession): Promise<void> {
    await this.runOperation(
      "saveChat",
      undefined,
      async () => {
        if (!this.provider.saveChat) {
          throw new Error("saveChat is not supported by the provider");
        }
        await this.provider.saveChat(chat);
      },
    );
  }

  async getChats(params: IgniterAgentGetChatsParams): Promise<IgniterAgentChatSession[]> {
    return this.runOperation(
      "getChats",
      undefined,
      async () => {
        if (!this.provider.getChats) {
          throw new Error("getChats is not supported by the provider");
        }
        return this.provider.getChats(params);
      },
      (result) => result.length,
    );
  }

  async getChat(chatId: string): Promise<IgniterAgentChatSession | null> {
    return this.runOperation(
      "getChat",
      undefined,
      async () => {
        if (!this.provider.getChat) {
          throw new Error("getChat is not supported by the provider");
        }
        return this.provider.getChat(chatId);
      },
    );
  }

  async updateChatTitle(chatId: string, title: string): Promise<void> {
    await this.runOperation(
      "updateChatTitle",
      undefined,
      async () => {
        if (!this.provider.updateChatTitle) {
          throw new Error("updateChatTitle is not supported by the provider");
        }
        await this.provider.updateChatTitle(chatId, title);
      },
    );
  }

  async deleteChat(chatId: string): Promise<void> {
    await this.runOperation(
      "deleteChat",
      undefined,
      async () => {
        if (!this.provider.deleteChat) {
          throw new Error("deleteChat is not supported by the provider");
        }
        await this.provider.deleteChat(chatId);
      },
    );
  }
}
