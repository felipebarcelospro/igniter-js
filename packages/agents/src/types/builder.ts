/**
 * @fileoverview Type definitions for IgniterAgent Builder pattern classes.
 * This module contains all interfaces for the fluent builder API.
 * 
 * @module types/builder
 * @packageDocumentation
 */

import type { LanguageModel, ToolSet, AgentCallParameters, AgentStreamParameters, Tool, StreamTextResult, GenerateTextResult } from "ai";
import type { IgniterAgentPromptTemplate } from "./prompt";
import type { IgniterLogger } from "@igniter-js/core";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import type { IgniterAgentHooks } from "./hooks";
import type { IgniterAgentMemoryRuntime } from "./memory";
import type { z } from "zod";
import type {
  IgniterAgentToolset,
  IgniterAgentToolsetType,
  IgniterAgentMCPConfigUnion
} from "./common";

/* =============================================================================
 * TOOLSET BUILDER TYPES
 * ============================================================================= */

/**
 * Interface for the built toolset result.
 * 
 * @description
 * Represents the final product of the Toolset builder, containing
 * all configured tools and metadata.
 * 
 * @typeParam TName - The toolset's unique name
 * @typeParam TTools - The tools collection type
 * 
 * @example
 * ```typescript
 * const toolset: IgniterAgentBuiltToolset<'github', GithubTools> = {
 *   type: 'custom',
 *   name: 'github',
 *   toolset: tools,
 *   status: 'connected',
 *   tools: tools
 * };
 * ```
 * 
 * @public
 */
export interface IgniterAgentBuiltToolset<
  TName extends string = string,
  TTools extends Record<string, Tool> = Record<string, Tool>
> extends IgniterAgentToolset<'custom', TName> {
  /** The raw toolset object */
  readonly toolset: TTools;
  
  /** Typed tools collection */
  readonly tools: TTools;

  readonly $Infer: {
    Name: TName;
    Tools: TTools;
  };
}

/* =============================================================================
 * TOOL BUILDER TYPES
 * ============================================================================= */

/**
 * Interface for the built tool result.
 * 
 * @description
 * Represents a finalized tool definition with its assigned name.
 * 
 * @typeParam TName - The tool's unique name
 * @typeParam TInputSchema - The tool parameters type
 * @typeParam TOutputSchema - The tool result type
 * @typeParam TExecute - The tool execute function type
 * 
 * @public
 */
export interface IgniterAgentBuiltTool<
  TName extends string = string,
  TInputSchema = unknown,
  TOutputSchema = undefined,
  TExecute = (
    params: TInputSchema,
    options: IgniterAgentToolExecuteOptions
  ) => 
    TOutputSchema extends undefined ? Promise<unknown> : Promise<TOutputSchema>
> {
  /** The tool's unique name */
  readonly name: TName;
  
  /**
   * Human-readable description of what the tool does.
   * 
   * @description
   * This is shown to the AI model to help it decide when to use the tool.
   * Should be clear, concise, and explain the tool's purpose and capabilities.
   */
  description: string;

  /**
   * Zod schema defining the tool's input parameters.
   * 
   * @description
   * The schema is used for validation and also informs the AI model
   * about what parameters are available and their types.
   */
  inputSchema: z.ZodSchema<TInputSchema>;

  /**
   * (Optional) Zod schema defining the tool's output/result.
   * 
   * @description
   * If provided, the tool's output will be validated against this schema.
   * Helps ensure consistent and expected results from tool execution.
   */
  outputSchema?: z.ZodSchema<TOutputSchema>;

  /**
   * The function that executes the tool's logic.
   * 
   * @description
   * Receives the validated parameters and optional execution options.
   * Can be async for operations that require waiting.
   * 
   * @param params - The validated input parameters
   * @param options - Execution options including abort signal
   * @returns The tool's result
   */
  execute: TExecute;

  $Infer: {
    Name: TName;
    Description: string;
    Input: TInputSchema;
    Output: TOutputSchema;
  };
}

/* =============================================================================
 * MCP CLIENT BUILDER TYPES
 * ============================================================================= */

/**
 * Partial configuration for MCP client during construction.
 * 
 * @description
 * Used internally by the MCP builder to track partial configuration
 * before all required fields are set.
 * 
 * @typeParam TType - The transport type
 * @typeParam TName - The configuration name
 * 
 * @internal
 */
export type IgniterAgentMCPPartialConfig<
  TType extends IgniterAgentToolsetType = IgniterAgentToolsetType,
  TName extends string = string
> = Partial<IgniterAgentMCPConfigUnion<TName>> & { type?: TType };

/* =============================================================================
 * AGENT BUILDER TYPES
 * ============================================================================= */

/**
 * Result object returned by the Agent builder's build() method.
 * 
 * @description
 * Provides the runtime interface for interacting with a built agent.
 * Includes methods for starting the agent, generating responses,
 * and accessing configuration.
 * 
 * @typeParam TContextSchema - The context schema type
 * @typeParam TToolsets - The toolsets record type
 * @typeParam TModel - The language model type
 * @typeParam TInstructions - The prompt template type
 * 
 * @example
 * ```typescript
 * const agent = IgniterAgent.create('assistant')
 *   .withModel(openai('gpt-4'))
 *   .build();
 * 
 * // Start the agent (initializes MCP connections)
 * await agent.start();
 * 
 * // Generate a response
 * const result = await agent.generate({
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * 
 * // Stream a response
 * const stream = await agent.stream({
 *   messages: [{ role: 'user', content: 'Tell me a story' }]
 * });
 * ```
 * 
 * @public
 */
export interface IgniterAgentBuiltAgent<
  TContextSchema extends z.ZodSchema = never,
  TToolsets extends Record<string, IgniterAgentToolset> = Record<string, IgniterAgentToolset>,
  TModel extends LanguageModel = LanguageModel,
  TInstructions extends IgniterAgentPromptTemplate = IgniterAgentPromptTemplate
> {
  /**
   * Attaches a logger instance to the agent.
   */
  attachLogger(logger?: IgniterLogger): void;

  /**
   * Attaches a telemetry manager to the agent.
   */
  attachTelemetry(telemetry?: IgniterTelemetryManager): void;

  /**
   * Attaches hook callbacks to the agent.
   */
  attachHooks(hooks?: IgniterAgentHooks): void;

  /**
   * Returns the agent name.
   */
  getName(): string;

  /**
   * Starts the agent and initializes all MCP connections.
   * 
   * @description
   * Must be called before using the agent if MCP toolsets are configured.
   * Establishes connections to all configured MCP servers and populates
   * the toolsets with available tools.
   * 
   * @returns The initialized toolsets record
   * 
   * @example
   * ```typescript
   * const toolsets = await agent.start();
   * console.log('Connected toolsets:', Object.keys(toolsets));
   * ```
   */
  start(): Promise<void>;

  /**
   * Stops the agent and disconnects MCP toolsets.
   */
  stop(): Promise<void>;

  /**
   * Generates a single response from the agent.
   * 
   * @description
   * Sends messages to the agent and waits for a complete response.
   * Supports context options for dynamic prompt generation.
   * 
   * @param input - The call parameters including messages and options
   * @returns The generation result with response and tool calls
   * 
   * @example
   * ```typescript
   * const result = await agent.generate({
   *   messages: [
   *     { role: 'user', content: 'What is TypeScript?' }
   *   ],
   *   options: { userId: 'user_123' }
   * });
   * 
   * console.log('Response:', result.text);
   * ```
   */
  generate(
    input: AgentCallParameters<z.infer<TContextSchema>>
  ): Promise<GenerateTextResult<any, any>>;

  /**
   * Streams a response from the agent.
   * 
   * @description
   * Sends messages to the agent and returns a stream of response chunks.
   * Ideal for real-time UI updates and long responses.
   * 
   * @param input - The stream parameters including messages and options
   * @returns A stream of response chunks
   * 
   * @example
   * ```typescript
   * const stream = await agent.stream({
   *   messages: [
   *     { role: 'user', content: 'Write a poem about coding' }
   *   ]
   * });
   * 
   * for await (const chunk of stream) {
   *   process.stdout.write(chunk);
   * }
   * ```
   */
  stream(
    input: AgentStreamParameters<z.infer<TContextSchema>, any>
  ): Promise<StreamTextResult<any, any>>;

  /**
   * Gets all registered toolsets.
   * 
   * @returns The toolsets record
   */
  getToolsets(): TToolsets;

  /**
   * Gets the configured language model.
   * 
   * @returns The language model instance
   */
  getModel(): TModel;

  /**
   * Gets the configured instructions.
   * 
   * @returns The prompt template instance
   */
  getInstructions(): TInstructions;

  /**
   * Gets the context schema.
   * 
   * @returns The Zod schema for context validation
   */
  getContextSchema(): TContextSchema;

  /**
   * Gets all registered tools from all toolsets.
   * 
   * @returns The combined tools from all toolsets
   */
  getTools(): ToolSet;

  /**
   * Optional memory runtime for persistence operations.
   */
  memory?: IgniterAgentMemoryRuntime;
}

/* =============================================================================
 * TOOL EXECUTION TYPES
 * ============================================================================= */

/**
 * Options passed to tool execution handlers.
 * 
 * @description
 * Contains metadata and utilities available during tool execution.
 * 
 * @public
 */
export interface IgniterAgentToolExecuteOptions {
  /**
   * Abort signal for cancellation support.
   * 
   * @description
   * Can be used to abort long-running operations when the
   * agent request is cancelled.
   */
  abortSignal?: AbortSignal;

  /**
   * Additional context from the agent runtime.
   */
  [key: string]: unknown;
}

/**
 * Tool definition for adding to a Toolset.
 * 
 * @description
 * Defines the structure of a tool that can be built with
 * {@link IgniterAgentToolBuilder} and added to a toolset.
 * 
 * @typeParam TInputSchema - The parameters schema type
 * @typeParam TOutputSchema - The return type of the tool
 * 
 * @example
 * ```typescript
 * const weatherTool: IgniterAgentToolDefinition = {
 *   description: 'Gets current weather for a city',
 *   inputSchema: z.object({
 *     city: z.string().describe('City name'),
 *     units: z.enum(['celsius', 'fahrenheit']).optional()
 *   }),
 *   execute: async ({ city, units }) => {
 *     const weather = await fetchWeather(city, units);
 *     return { temperature: weather.temp, conditions: weather.desc };
 *   }
 * };
 * ```
 * 
 * @public
 */
export interface IgniterAgentToolDefinition<
  TInputSchema = unknown,
  TOutputSchema = unknown
> {
  /**
   * Human-readable description of what the tool does.
   * 
   * @description
   * This is shown to the AI model to help it decide when to use the tool.
   * Should be clear, concise, and explain the tool's purpose and capabilities.
   */
  description: string;

  /**
   * Zod schema defining the tool's input parameters.
   * 
   * @description
   * The schema is used for validation and also informs the AI model
   * about what parameters are available and their types.
   */
  inputSchema: z.ZodSchema<TInputSchema>;

  /**
   * (Optional) Zod schema defining the tool's output/result.
   * 
   * @description
   * If provided, the tool's output will be validated against this schema.
   * Helps ensure consistent and expected results from tool execution.
   */
  outputSchema?: z.ZodSchema<TOutputSchema>;

  /**
   * The function that executes the tool's logic.
   * 
   * @description
   * Receives the validated parameters and optional execution options.
   * Can be async for operations that require waiting.
   * 
   * @param params - The validated input parameters
   * @param options - Execution options including abort signal
   * @returns The tool's result
   */
  execute: (
    params: TInputSchema,
    options?: IgniterAgentToolExecuteOptions
  ) => TOutputSchema | Promise<TOutputSchema>;
}
