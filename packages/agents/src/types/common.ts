/**
 * @fileoverview Common type definitions used across the IgniterAgent library.
 * This module contains foundational types that are shared between different parts of the agent system.
 *
 * @module types/common
 * @packageDocumentation
 */

import type { LanguageModel, Tool, ToolLoopAgent, ToolSet } from "ai";
import type { z } from "zod";
import type { IgniterLogger } from "@igniter-js/core";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import type { IgniterAgentPromptTemplate } from "./prompt";
import type { IgniterAgentHooks } from "./hooks";
import type { IgniterAgentMemoryConfig } from "./memory";

/* =============================================================================
 * CONNECTION & STATUS TYPES
 * ============================================================================= */

/**
 * Represents the connection status of a toolset or MCP client.
 *
 * @description
 * Used to track whether a toolset or MCP server is currently available for use.
 * This status is automatically updated when connections are established or lost.
 *
 * @example
 * ```typescript
 * const checkToolsetStatus = (status: IgniterAgentConnectionStatus) => {
 *   if (status === 'connected') {
 *     console.log('Ready to use tools');
 *   } else {
 *     console.log('Toolset unavailable');
 *   }
 * };
 * ```
 *
 * @public
 */
export type IgniterAgentConnectionStatus = "connected" | "disconnected";

/**
 * Represents the type of toolset transport protocol.
 *
 * @description
 * Defines how the agent communicates with external tool providers:
 * - `stdio`: Standard input/output (local process communication)
 * - `http`: HTTP/HTTPS transport (remote server communication)
 * - `custom`: User-defined custom tools (inline JavaScript functions)
 *
 * @example
 * ```typescript
 * // Using different transport types
 * const stdioTransport: IgniterAgentToolsetType = 'stdio';   // Local MCP server
 * const httpTransport: IgniterAgentToolsetType = 'http';     // Remote MCP server
 * const customTransport: IgniterAgentToolsetType = 'custom'; // Inline tools
 * ```
 *
 * @public
 */
export type IgniterAgentToolsetType = "stdio" | "http" | "custom";

/* =============================================================================
 * TOOL TYPES
 * ============================================================================= */

/**
 * Type alias for a single agent tool.
 *
 * @description
 * Represents any tool that can be registered with the agent. Tools are functions
 * that the AI model can invoke to perform actions or retrieve information.
 *
 * @see {@link https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling | Vercel AI SDK Tools}
 *
 * @example
 * ```typescript
 * const myTool: IgniterAgentTool = {
 *   description: 'Fetches weather data for a given city',
 *   inputSchema: z.object({ city: z.string() }),
 *   execute: async ({ city }) => {
 *     return await fetchWeather(city);
 *   }
 * };
 * ```
 *
 * @public
 */
export type IgniterAgentTool = ToolSet[string];

/**
 * Utility type that flattens nested toolsets into a single object with prefixed keys.
 *
 * @description
 * When multiple toolsets are registered with an agent, their tools are flattened
 * into a single namespace using the pattern `{toolsetName}_{toolName}`.
 * This ensures tool names are unique and identifiable by their source.
 *
 * @typeParam TToolsets - Record of toolset names to toolset configurations
 *
 * @example
 * ```typescript
 * // Given toolsets:
 * // - github: { createIssue, listRepos }
 * // - docker: { buildImage, runContainer }
 *
 * // Flattened result:
 * // {
 * //   github_createIssue: Tool,
 * //   github_listRepos: Tool,
 * //   docker_buildImage: Tool,
 * //   docker_runContainer: Tool
 * // }
 * ```
 *
 * @public
 */
export type IgniterAgentFlattenedToolSet<
  TToolsets extends Record<
    string,
    IgniterAgentToolset<IgniterAgentToolsetType, string>
  >,
> = {
  [K in keyof TToolsets as `${K & string}_${keyof TToolsets[K]["tools"] & string}`]: TToolsets[K]["tools"][keyof TToolsets[K]["tools"]];
};

/* =============================================================================
 * TOOLSET TYPES
 * ============================================================================= */

/**
 * Represents a collection of tools with metadata about their source and status.
 *
 * @description
 * A toolset is a logical grouping of related tools that share a common purpose
 * or source (e.g., all GitHub-related tools, all Docker-related tools).
 *
 * @typeParam TType - The transport type for this toolset
 * @typeParam TName - The unique name identifier for this toolset
 *
 * @property name - Unique identifier for the toolset
 * @property type - Transport protocol used ('stdio', 'http', or 'custom')
 * @property tools - Collection of tool definitions
 * @property status - Current connection status
 *
 * @example
 * ```typescript
 * const githubToolset: IgniterAgentToolset<'custom', 'github'> = {
 *   name: 'github',
 *   type: 'custom',
 *   status: 'connected',
 *   tools: {
 *     createIssue: createIssueTool,
 *     listRepos: listReposTool
 *   }
 * };
 * ```
 *
 * @public
 */
export interface IgniterAgentToolset<
  TType extends IgniterAgentToolsetType = IgniterAgentToolsetType,
  TName extends string = string,
> {
  /** Unique identifier for the toolset */
  readonly name: TName;

  /** Transport type used by this toolset */
  readonly type: TType;

  /** Collection of available tools */
  readonly tools: ToolSet;

  /** Current connection status */
  readonly status: IgniterAgentConnectionStatus;
}

/* =============================================================================
 * AGENT CONFIGURATION TYPES
 * ============================================================================= */

/**
 * Complete configuration object for an IgniterAgent instance.
 *
 * @description
 * This interface defines all the configuration options available when creating
 * an agent. It supports strong typing through generics to ensure type safety
 * when accessing toolsets, context, and other agent properties.
 *
 * @typeParam TAgentName - The agent's unique name type
 * @typeParam TAgentModel - The language model type
 * @typeParam TAgentInstructions - The prompt template type
 * @typeParam TAgentToolsets - Record of all registered toolsets
 * @typeParam TAgentMCPConfigs - Record of all MCP configurations
 * @typeParam TAgentContextSchema - Zod schema for context validation
 *
 * @example
 * ```typescript
 * const config: IgniterAgentConfig<
 *   'assistant',
 *   LanguageModel,
 *   IgniterAgentPromptTemplate,
 *   { github: GitHubToolset },
 *   { filesystem: FileSystemMCP },
 *   typeof contextSchema
 * > = {
 *   name: 'assistant',
 *   model: openai('gpt-4'),
 *   instructions: prompt,
 *   toolsets: { github: githubToolset },
 *   configs: { filesystem: filesystemConfig },
 *   schema: contextSchema
 * };
 * ```
 *
 * @public
 */
export interface IgniterAgentConfig<
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
  /**
   * Unique name identifier for the agent.
   * Used for logging, debugging, and multi-agent orchestration.
   */
  name: TAgentName;

  /**
   * Registered toolsets available to the agent.
   * Each toolset contains related tools that the agent can invoke.
   */
  toolsets: TAgentToolsets;

  /**
   * MCP server configurations for external tool providers.
   * These are lazily initialized when the agent starts.
   */
  configs: TAgentMCPConfigs;

  /**
   * Prompt instructions defining the agent's behavior and personality.
   * Uses the IgniterAgentPrompt pattern for dynamic prompt generation.
   */
  instructions: TAgentInstructions;

  /**
   * The language model used for inference.
   * Supports any Vercel AI SDK compatible model provider.
   */
  model: TAgentModel;

  /**
   * Zod schema for validating context passed to the agent.
   * Ensures type-safe context access in prompt templates.
   */
  schema: TAgentContextSchema;

  /**
   * Optional memory configuration.
   */
  memory?: IgniterAgentMemoryConfig;

  /**
   * Optional logger instance for operational logs.
   */
  logger?: IgniterLogger;

  /**
   * Optional telemetry manager for observability.
   */
  telemetry?: IgniterTelemetryManager;

  /**
   * Optional hook callbacks for lifecycle/tool/mcp events.
   */
  hooks?: IgniterAgentHooks;

  /**
   * Agent instance from AI SDK ToolLoopAgent.
   * @internal
   */
  instance?: ToolLoopAgent;
}

/* =============================================================================
 * MCP CONFIGURATION TYPES
 * ============================================================================= */

/**
 * Base configuration interface for MCP (Model Context Protocol) clients.
 *
 * @description
 * Contains common properties shared between all MCP transport types.
 *
 * @typeParam TName - The unique identifier for this MCP configuration
 *
 * @public
 */
export interface IgniterAgentMCPConfigBase<TName extends string = string> {
  /** Unique name identifier for the MCP configuration */
  readonly name: TName;
}

/**
 * Configuration for stdio-based MCP transport.
 *
 * @description
 * Used when connecting to MCP servers via standard input/output streams.
 * This is typically used for local MCP servers running as child processes.
 *
 * @typeParam TName - The unique identifier for this MCP configuration
 *
 * @example
 * ```typescript
 * const filesystemMCP: IgniterAgentMCPStdioConfig<'filesystem'> = {
 *   type: 'stdio',
 *   name: 'filesystem',
 *   command: 'npx',
 *   args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
 *   env: { DEBUG: 'true' }
 * };
 * ```
 *
 * @public
 */
export interface IgniterAgentMCPStdioConfig<
  TName extends string = string,
> extends IgniterAgentMCPConfigBase<TName> {
  /** Transport type identifier */
  readonly type: "stdio";

  /**
   * Command to execute the MCP server.
   * @example 'npx', 'node', 'python'
   */
  readonly command: string;

  /**
   * Arguments to pass to the command.
   * @example ['-y', '@modelcontextprotocol/server-filesystem']
   */
  readonly args: string[];

  /**
   * Optional environment variables for the child process.
   * @example { DEBUG: 'true', API_KEY: 'xxx' }
   */
  readonly env?: Record<string, string>;
}

/**
 * Configuration for HTTP-based MCP transport.
 *
 * @description
 * Used when connecting to remote MCP servers over HTTP/HTTPS.
 * Supports custom headers for authentication and other purposes.
 *
 * @typeParam TName - The unique identifier for this MCP configuration
 *
 * @example
 * ```typescript
 * const remoteMCP: IgniterAgentMCPHttpConfig<'remote-tools'> = {
 *   type: 'http',
 *   name: 'remote-tools',
 *   url: 'https://mcp.example.com/tools',
 *   headers: {
 *     'Authorization': 'Bearer token123'
 *   }
 * };
 * ```
 *
 * @public
 */
export interface IgniterAgentMCPHttpConfig<
  TName extends string = string,
> extends IgniterAgentMCPConfigBase<TName> {
  /** Transport type identifier */
  readonly type: "http";

  /**
   * URL of the remote MCP server.
   * Must be a valid HTTP or HTTPS URL.
   */
  readonly url: string;

  /**
   * Optional HTTP headers to include in requests.
   * Useful for authentication, API keys, etc.
   */
  readonly headers?: Record<string, string>;
}

/**
 * Union type for all supported MCP configuration types.
 *
 * @description
 * Discriminated union based on the `type` property, allowing TypeScript
 * to narrow the type based on runtime checks.
 *
 * @typeParam TName - The unique identifier for this MCP configuration
 *
 * @example
 * ```typescript
 * function handleMCPConfig(config: IgniterAgentMCPConfigUnion) {
 *   if (config.type === 'stdio') {
 *     console.log('Command:', config.command);
 *   } else if (config.type === 'http') {
 *     console.log('URL:', config.url);
 *   }
 * }
 * ```
 *
 * @public
 */
export type IgniterAgentMCPConfigUnion<TName extends string = string> =
  | IgniterAgentMCPStdioConfig<TName>
  | IgniterAgentMCPHttpConfig<TName>;

/* =============================================================================
 * BUILDER INTERFACE TYPES
 * ============================================================================= */

/**
 * Fluent builder interface for MCP client configuration.
 *
 * @description
 * Provides a type-safe fluent API for building MCP configurations.
 * The interface changes based on the transport type selected.
 *
 * @typeParam TType - The transport type ('stdio' or 'http')
 * @typeParam TName - The configuration name
 *
 * @example
 * ```typescript
 * // Stdio configuration
 * const stdioConfig = IgniterAgent
 *   .mcp('filesystem')
 *   .withType('stdio')
 *   .withCommand('npx')
 *   .withArgs(['-y', '@mcp/server-filesystem'])
 *   .build();
 *
 * // HTTP configuration
 * const httpConfig = IgniterAgent
 *   .mcp('remote')
 *   .withType('http')
 *   .withURL('https://mcp.example.com')
 *   .withHeaders({ Authorization: 'Bearer xxx' })
 *   .build();
 * ```
 *
 * @public
 */
export type IgniterAgentMCPClientInterface<
  TType extends IgniterAgentToolsetType,
  TName extends string,
> = TType extends "stdio"
  ? IgniterAgentMCPStdioClientInterface<TName>
  : IgniterAgentMCPHttpClientInterface<TName>;

/**
 * Fluent builder interface for stdio MCP configuration.
 *
 * @typeParam TName - The configuration name
 * @internal
 */
export interface IgniterAgentMCPStdioClientInterface<TName extends string> {
  /** Set the command to execute */
  withCommand(command: string): IgniterAgentMCPStdioClientInterface<TName>;

  /** Set the command arguments */
  withArgs(args: string[]): IgniterAgentMCPStdioClientInterface<TName>;

  /** Set environment variables */
  withEnv(
    env: Record<string, string>,
  ): IgniterAgentMCPStdioClientInterface<TName>;

  /** Build and return the configuration object */
  build(): IgniterAgentMCPStdioConfig<TName>;
}

/**
 * Fluent builder interface for HTTP MCP configuration.
 *
 * @typeParam TName - The configuration name
 * @internal
 */
export interface IgniterAgentMCPHttpClientInterface<TName extends string> {
  /** Set the configuration name */
  withName<TNewName extends string>(
    name: TNewName,
  ): IgniterAgentMCPHttpClientInterface<TNewName>;

  /** Set the transport type */
  withType(
    type: IgniterAgentToolsetType,
  ): IgniterAgentMCPHttpClientInterface<TName>;

  /** Set the server URL */
  withURL(url: string): IgniterAgentMCPHttpClientInterface<TName>;

  /** Set HTTP headers */
  withHeaders(
    headers: Record<string, string>,
  ): IgniterAgentMCPHttpClientInterface<TName>;

  /** Build and return the configuration object */
  build(): IgniterAgentMCPHttpConfig<TName>;
}

/* =============================================================================
 * TOOLSET CONSTRUCTOR PARAMS
 * ============================================================================= */

/**
 * Constructor parameters for creating a new Toolset instance.
 *
 * @typeParam TToolsetName - The toolset's unique name
 * @typeParam TTools - The tools collection type
 *
 * @example
 * ```typescript
 * const params: IgniterAgentToolsetParams<'github', GithubTools> = {
 *   name: 'github',
 *   tools: githubTools
 * };
 * ```
 *
 * @public
 */
export interface IgniterAgentToolsetParams<
  TToolsetName extends string = string,
  TTools extends ToolSet = ToolSet,
> {
  /** Unique name identifier for the toolset */
  name: TToolsetName;

  /** Collection of tools in this toolset */
  tools: TTools;
}

/* =============================================================================
 * TOOL RESULT TYPES
 * ============================================================================= */

/**
 * Represents a successful tool execution result.
 *
 * @typeParam TData - The type of data returned by the tool
 *
 * @example
 * ```typescript
 * const successResult: IgniterAgentToolSuccessResult<User> = {
 *   success: true,
 *   data: { id: '123', name: 'John' }
 * };
 * ```
 *
 * @public
 */
export interface IgniterAgentToolSuccessResult<TData = unknown> {
  /** Indicates the tool executed successfully */
  readonly success: true;

  /** The data returned by the tool */
  readonly data: TData;
}

/**
 * Represents a failed tool execution result.
 *
 * @example
 * ```typescript
 * const errorResult: IgniterAgentToolErrorResult = {
 *   success: false,
 *   error: 'Failed to connect to database'
 * };
 * ```
 *
 * @public
 */
export interface IgniterAgentToolErrorResult {
  /** Indicates the tool execution failed */
  readonly success: false;

  /** Error message describing what went wrong */
  readonly error: string;
}

/**
 * Union type for tool execution results.
 *
 * @description
 * All tools wrapped by IgniterAgent return this type, providing a consistent
 * error handling pattern across all tool invocations.
 *
 * @typeParam TData - The type of data returned on success
 *
 * @example
 * ```typescript
 * const handleResult = (result: IgniterAgentToolResult<User>) => {
 *   if (result.success) {
 *     console.log('User:', result.data);
 *   } else {
 *     console.error('Error:', result.error);
 *   }
 * };
 * ```
 *
 * @public
 */
export type IgniterAgentToolResult<TData = unknown> =
  | IgniterAgentToolSuccessResult<TData>
  | IgniterAgentToolErrorResult;
