import type { AgentCallParameters, AgentStreamParameters, FinishReason, LanguageModelResponseMetadata, LanguageModelUsage, ModelMessage, ToolLoopAgentSettings } from "ai";
import type { IgniterAgentToolset } from "./common";

export interface IgniterAgentOutput<OUTPUT = any, PARTIAL = any> {
  /**
   * The response format to use for the model.
   */
  responseFormat: PromiseLike<any>;
  /**
   * Parses the complete output of the model.
   */
  parseCompleteOutput(options: {
    text: string;
  }, context: {
    response: LanguageModelResponseMetadata;
    usage: LanguageModelUsage;
    finishReason: FinishReason;
  }): Promise<OUTPUT>;
  /**
   * Parses the partial output of the model.
   */
  parsePartialOutput(options: {
    text: string;
  }): Promise<{
    partial: PARTIAL;
  } | undefined>;
}

export type IgniterAgentToolsetParsed<ToolSet extends Record<string, IgniterAgentToolset>> = {
  [toolKey in keyof ToolSet[keyof ToolSet]['tools']]: ToolSet[keyof ToolSet]['tools'][toolKey];
};

export interface IgniterAgentPrepareOptions<
  CALL_OPTIONS = never,
  ToolSet extends Record<string, IgniterAgentToolset> = Record<string, IgniterAgentToolset>,
  OUTPUT extends IgniterAgentOutput = never,
> extends Omit<ToolLoopAgentSettings<
  CALL_OPTIONS,
  IgniterAgentToolsetParsed<ToolSet>,
  OUTPUT
>, 'messages' | 'tools' | 'model' | 'instructions' | 'id' | 'experimental_context'> {
  chatId: string;
  userId: string;
  agentId: string;
  requestId: string;
  message: ModelMessage;
  context: Record<string, any>;
  streamed?: boolean;
}

/**
 * Message input for agent calls.
 *
 * @description
 * Accepts either a single `message` or an array of `messages`.
 * When both are provided, `message` takes precedence.
 */
export type IgniterAgentMessageInput =
  | {
    message: ModelMessage;
    messages?: ModelMessage[];
  }
  | {
    message?: ModelMessage;
    messages: ModelMessage[];
  };

/**
 * Public call options for `generate`.
 */
export type IgniterAgentCallOptions<
  CALL_OPTIONS = never,
  ToolSet extends Record<string, IgniterAgentToolset> = Record<string, IgniterAgentToolset>,
  OUTPUT extends IgniterAgentOutput = never,
> = {
  chatId: string;
  userId: string;
  context: Record<string, any>;
} & IgniterAgentMessageInput &
  Omit<AgentCallParameters<CALL_OPTIONS>, "messages">;

/**
 * Public call options for `stream`.
 */
export type IgniterAgentStreamCallOptions<
  CALL_OPTIONS = never,
  ToolSet extends Record<string, IgniterAgentToolset> = Record<string, IgniterAgentToolset>,
  OUTPUT extends IgniterAgentOutput = never,
> = {
  chatId: string;
  userId: string;
  context: Record<string, any>;
} & IgniterAgentMessageInput &
  Omit<AgentStreamParameters<CALL_OPTIONS, IgniterAgentToolsetParsed<ToolSet>>, "messages">;

export type IgniterAgentStreamOptions<
  CALL_OPTIONS = never,
  ToolSet extends Record<string, IgniterAgentToolset> = Record<string, IgniterAgentToolset>,
  OUTPUT extends IgniterAgentOutput = never,
> =
  IgniterAgentStreamCallOptions<CALL_OPTIONS, ToolSet, OUTPUT>;

export type IgniterAgentGenerateOptions<
  CALL_OPTIONS = never,
  ToolSet extends Record<string, IgniterAgentToolset> = Record<string, IgniterAgentToolset>,
  OUTPUT extends IgniterAgentOutput = never,
> =
  IgniterAgentCallOptions<CALL_OPTIONS, ToolSet, OUTPUT>;
