/**
 * @fileoverview Main Agent Builder for creating AI agents with tools and MCP support.
 * This module provides the primary fluent API for building IgniterAgent instances.
 *
 * @description
 * The IgniterAgentBuilder is the central class for creating AI agents. It provides
 * a type-safe fluent API for configuring all aspects of an agent including:
 * - Language model selection
 * - Custom toolsets
 * - MCP server connections
 * - Context schema validation
 * - Prompt instructions
 *
 * @example
 * ```typescript
 * import { IgniterAgent } from '@igniter-js/agents';
 * import { openai } from '@ai-sdk/openai';
 * import { z } from 'zod';
 *
 * const agent = IgniterAgent
 *   .create('assistant')
 *   .withModel(openai('gpt-4'))
 *   .withContextSchema(z.object({
 *     userId: z.string(),
 *     chatId: z.string()
 *   }))
 *   .addToolset(myCustomToolset)
 *   .addMCP(filesystemMCP)
 *   .build();
 *
 * // Start the agent (initializes MCP connections)
 * await agent.start();
 *
 * // Generate a response
 * const result = await agent.generate({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   options: { userId: 'user_123', chatId: 'chat_456' }
 * });
 * ```
 *
 * @module builders/agent
 * @packageDocumentation
 */
import {
  type LanguageModel,
} from "ai";
import type { z } from "zod";
import type {
  IgniterAgentConfig,
  IgniterAgentToolset,
  IgniterAgentToolsetType,
  IgniterAgentMCPConfigUnion,
} from "../types";
import type { IgniterAgentBuiltAgent } from "../types/builder";
import { IgniterAgentCore } from "../core/agent";
import type { IgniterAgentPromptTemplate } from "../types/prompt";
import { IgniterAgentPromptBuilder } from "./prompt.builder";
import type { IgniterLogger } from "@igniter-js/core";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import type { IgniterAgentHooks } from "../types/hooks";
import type { IgniterAgentMemoryConfig } from "../types/memory";

/* =============================================================================
 * AGENT BUILDER CLASS
 * ============================================================================= */

/**
 * Fluent builder for creating AI agents.
 *
 * @description
 * The IgniterAgentBuilder provides a comprehensive fluent API for creating
 * AI agents with full TypeScript type inference. It supports:
 *
 * - **Multiple Language Models**: Works with any Vercel AI SDK compatible model
 * - **Custom Toolsets**: Register your own tools with automatic error handling
 * - **MCP Integration**: Connect to MCP servers for external tool providers
 * - **Context Schema**: Type-safe context validation with Zod
 * - **Dynamic Prompts**: Template-based prompt generation
 *
 * **Lifecycle:**
 * 1. Create the builder with `IgniterAgent.create()`
 * 2. Configure using fluent methods (`withModel`, etc.)
 * 3. Build with `.build()` to get the runtime agent
 * 4. Call `.start()` to initialize MCP connections
 * 5. Use `.generate()` or `.stream()` to interact with the agent
 *
 * @typeParam TAgentName - The agent's unique name type
 * @typeParam TAgentModel - The language model type
 * @typeParam TAgentInstructions - The prompt template type
 * @typeParam TAgentToolsets - Record of registered toolsets
 * @typeParam TAgentMCPConfigs - Record of MCP configurations
 * @typeParam TAgentContextSchema - The context schema type
 *
 * @example
 * ```typescript
 * import {
 *   IgniterAgent,
 *   IgniterAgentPrompt,
 *   IgniterAgentToolset,
 *   IgniterAgentTool,
 *   IgniterAgentMCPClient,
 * } from '@igniter-js/agents';
 * import { openai } from '@ai-sdk/openai';
 * import { z } from 'zod';
 *
 * const runCodeTool = IgniterAgentTool
 *   .create('runCode')
 *   .withDescription('Runs code')
 *   .withInputSchema(z.object({ code: z.string() }))
 *   .withExecute(async ({ code }) => codeRunner(code))
 *   .build();
 *
 * const searchDocsTool = IgniterAgentTool
 *   .create('searchDocs')
 *   .withDescription('Searches docs')
 *   .withInputSchema(z.object({ query: z.string() }))
 *   .withExecute(async ({ query }) => docSearcher(query))
 *   .build();
 *
 * // Create a fully-configured agent
 * const agent = IgniterAgent
 *   .create('code-assistant')
 *   .withModel(openai('gpt-4-turbo'))
 *   .withContextSchema(z.object({
 *     userId: z.string(),
 *     projectId: z.string()
 *   }))
 *   .withPrompt(
 *     IgniterAgentPrompt.create('You are a helpful coding assistant...')
 *   )
 *   .addToolset(
 *     IgniterAgentToolset.create('code')
 *       .addTool(runCodeTool)
 *       .addTool(searchDocsTool)
 *       .build()
 *   )
 *   .addMCP(
 *     IgniterAgentMCPClient.create('filesystem')
 *       .withType('stdio')
 *       .withCommand('npx')
 *       .withArgs(['-y', '@mcp/server-filesystem'])
 *       .build()
 *   )
 *   .build();
 *
 * // Initialize and use
 * await agent.start();
 *
 * const response = await agent.generate({
 *   messages: [{ role: 'user', content: 'Help me write a test' }],
 *   options: { userId: 'user_123', projectId: 'proj_456' }
 * });
 * ```
 *
 * @public
 */
export class IgniterAgentBuilder<
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
   * The agent configuration being built.
   * @internal
   */
  private readonly _config: Partial<
    IgniterAgentConfig<
      TAgentName,
      TAgentModel,
      TAgentInstructions,
      TAgentToolsets,
      TAgentMCPConfigs,
      TAgentContextSchema
    >
  >;

  /**
   * Creates a new IgniterAgentBuilder instance.
   *
   * @param config - Initial configuration
   * @internal
   */
  private constructor(
    config: Partial<
      IgniterAgentConfig<
        TAgentName,
        TAgentModel,
        TAgentInstructions,
        TAgentToolsets,
        TAgentMCPConfigs,
        TAgentContextSchema
      >
    > = {},
  ) {
    this._config = {
      name: "agent" as TAgentName,
      toolsets: {} as TAgentToolsets,
      configs: {} as TAgentMCPConfigs,
      instructions: IgniterAgentPromptBuilder.create("") as unknown as TAgentInstructions,
      ...config,
    };
  }

  /* ---------------------------------------------------------------------------
   * STATIC FACTORY METHODS
   * --------------------------------------------------------------------------- */

  /**
   * Creates a new agent builder.
   *
   * @description
   * Primary entry point for creating an agent. Returns a new builder
   * instance that can be configured using fluent methods.
   *
   * @returns A new IgniterAgentBuilder instance
   *
   * @example
   * ```typescript
   * const agent = IgniterAgent.create('my-agent')
   *   .withModel(openai('gpt-4'))
   *   .build();
   * ```
   *
   * @public
   */
  static create<TNewName extends string = string>(
    name: TNewName = "agent" as TNewName,
  ): IgniterAgentBuilder<
    TNewName,
    LanguageModel,
    IgniterAgentPromptTemplate,
    {},
    {},
    z.ZodSchema
  > {
    return new IgniterAgentBuilder({
      name: name,
    });
  }

  /* ---------------------------------------------------------------------------
   * BUILDER METHODS
   * --------------------------------------------------------------------------- */

  /**
   * Sets the language model.
   *
   * @description
   * Configures the AI model that powers the agent. Supports any model
   * provider compatible with the Vercel AI SDK.
   *
   * @typeParam TNewModel - The new model type
   * @param model - The language model instance
   * @returns A new builder with the model set
   *
   * @example
   * ```typescript
   * import { openai } from '@ai-sdk/openai';
   * import { anthropic } from '@ai-sdk/anthropic';
   * import { google } from '@ai-sdk/google';
   *
   * // Using OpenAI
   * const agent1 = IgniterAgent.create()
   *   .withModel(openai('gpt-4-turbo'))
   *   .build();
   *
   * // Using Anthropic
   * const agent2 = IgniterAgent.create()
   *   .withModel(anthropic('claude-3-opus'))
   *   .build();
   *
   * // Using Google
   * const agent3 = IgniterAgent.create()
   *   .withModel(google('gemini-pro'))
   *   .build();
   * ```
   *
   * @public
   */
  withModel<TNewModel extends LanguageModel>(
    model: TNewModel,
  ): IgniterAgentBuilder<
    TAgentName,
    TNewModel,
    TAgentInstructions,
    TAgentToolsets,
    TAgentMCPConfigs,
    TAgentContextSchema
  > {
    return new IgniterAgentBuilder({
      ...this._config,
      model,
    });
  }

  /**
   * Sets the prompt instructions.
   *
   * @description
   * Configures the agent's system prompt using an IgniterAgentPrompt template.
   * The prompt defines the agent's behavior, personality, and capabilities.
   *
   * @typeParam TNewInstructions - The new instructions type
   * @param instructions - The prompt template instance
   * @returns A new builder with the instructions set
   *
   * @example
   * ```typescript
   * const agent = IgniterAgent.create()
   *   .withPrompt(
   *     IgniterAgentPrompt.create(`
   *       You are a helpful coding assistant specialized in TypeScript.
   *
   *       Guidelines:
   *       - Always provide type-safe code
   *       - Include JSDoc comments
   *       - Follow best practices
   *     `)
   *   )
   *   .build();
   * ```
   *
   * @public
   */
  withPrompt<TNewInstructions extends IgniterAgentPromptTemplate>(
    instructions: TNewInstructions,
  ): IgniterAgentBuilder<
    TAgentName,
    TAgentModel,
    TNewInstructions,
    TAgentToolsets,
    TAgentMCPConfigs,
    TAgentContextSchema
  > {
    return new IgniterAgentBuilder({
      ...this._config,
      instructions,
    });
  }

  /**
   * Attaches a logger instance for operational logs.
   */
  withLogger(logger: IgniterLogger): IgniterAgentBuilder<
    TAgentName,
    TAgentModel,
    TAgentInstructions,
    TAgentToolsets,
    TAgentMCPConfigs,
    TAgentContextSchema
  > {
    return new IgniterAgentBuilder({
      ...this._config,
      logger,
    });
  }

  /**
   * Attaches a telemetry manager for observability.
   */
  withTelemetry(
    telemetry: IgniterTelemetryManager,
  ): IgniterAgentBuilder<
    TAgentName,
    TAgentModel,
    TAgentInstructions,
    TAgentToolsets,
    TAgentMCPConfigs,
    TAgentContextSchema
  > {
    return new IgniterAgentBuilder({
      ...this._config,
      telemetry,
    });
  }

  /**
   * Configures persistent memory for the agent.
   */
  withMemory(
    memory: IgniterAgentMemoryConfig,
  ): IgniterAgentBuilder<
    TAgentName,
    TAgentModel,
    TAgentInstructions,
    TAgentToolsets,
    TAgentMCPConfigs,
    TAgentContextSchema
  > {
    return new IgniterAgentBuilder({
      ...this._config,
      memory,
    });
  }

  /**
   * Callback when the agent starts.
   */
  onAgentStart(
    callback: IgniterAgentHooks["onAgentStart"],
  ): IgniterAgentBuilder<
    TAgentName,
    TAgentModel,
    TAgentInstructions,
    TAgentToolsets,
    TAgentMCPConfigs,
    TAgentContextSchema
  > {
    return new IgniterAgentBuilder({
      ...this._config,
      hooks: {
        ...this._config.hooks,
        onAgentStart: callback,
      },
    });
  }

  /**
   * Callback when the agent errors.
   */
  onAgentError(
    callback: IgniterAgentHooks["onAgentError"],
  ): IgniterAgentBuilder<
    TAgentName,
    TAgentModel,
    TAgentInstructions,
    TAgentToolsets,
    TAgentMCPConfigs,
    TAgentContextSchema
  > {
    return new IgniterAgentBuilder({
      ...this._config,
      hooks: {
        ...this._config.hooks,
        onAgentError: callback,
      },
    });
  }

  /**
   * Callback when a tool call starts.
   */
  onToolCallStart(
    callback: IgniterAgentHooks["onToolCallStart"],
  ): IgniterAgentBuilder<
    TAgentName,
    TAgentModel,
    TAgentInstructions,
    TAgentToolsets,
    TAgentMCPConfigs,
    TAgentContextSchema
  > {
    return new IgniterAgentBuilder({
      ...this._config,
      hooks: {
        ...this._config.hooks,
        onToolCallStart: callback,
      },
    });
  }

  /**
   * Callback when a tool call completes.
   */
  onToolCallEnd(
    callback: IgniterAgentHooks["onToolCallComplete"],
  ): IgniterAgentBuilder<
    TAgentName,
    TAgentModel,
    TAgentInstructions,
    TAgentToolsets,
    TAgentMCPConfigs,
    TAgentContextSchema
  > {
    return new IgniterAgentBuilder({
      ...this._config,
      hooks: {
        ...this._config.hooks,
        onToolCallComplete: callback,
      },
    });
  }

  /**
   * Callback when a tool call fails.
   */
  onToolCallError(
    callback: IgniterAgentHooks["onToolCallError"],
  ): IgniterAgentBuilder<
    TAgentName,
    TAgentModel,
    TAgentInstructions,
    TAgentToolsets,
    TAgentMCPConfigs,
    TAgentContextSchema
  > {
    return new IgniterAgentBuilder({
      ...this._config,
      hooks: {
        ...this._config.hooks,
        onToolCallError: callback,
      },
    });
  }

  /**
   * Callback when an MCP connection starts.
   */
  onMCPStart(
    callback: IgniterAgentHooks["onMCPStart"],
  ): IgniterAgentBuilder<
    TAgentName,
    TAgentModel,
    TAgentInstructions,
    TAgentToolsets,
    TAgentMCPConfigs,
    TAgentContextSchema
  > {
    return new IgniterAgentBuilder({
      ...this._config,
      hooks: {
        ...this._config.hooks,
        onMCPStart: callback,
      },
    });
  }

  /**
   * Callback when an MCP connection fails.
   */
  onMCPError(
    callback: IgniterAgentHooks["onMCPError"],
  ): IgniterAgentBuilder<
    TAgentName,
    TAgentModel,
    TAgentInstructions,
    TAgentToolsets,
    TAgentMCPConfigs,
    TAgentContextSchema
  > {
    return new IgniterAgentBuilder({
      ...this._config,
      hooks: {
        ...this._config.hooks,
        onMCPError: callback,
      },
    });
  }

  /**
   * Sets the context schema.
   *
   * @description
   * Configures a Zod schema for validating context passed to the agent.
   * The context is available in prompt templates and can be used to
   * customize agent behavior per-request.
   *
   * @typeParam TNewSchema - The new schema type
   * @param schema - The Zod schema for context validation
   * @returns A new builder with the schema set
   *
   * @example
   * ```typescript
   * import { z } from 'zod';
   *
   * const contextSchema = z.object({
   *   userId: z.string(),
   *   chatId: z.string(),
   *   userRole: z.enum(['admin', 'user', 'guest']),
   *   preferences: z.object({
   *     language: z.string().default('en'),
   *     theme: z.string().optional()
   *   })
   * });
   *
   * const agent = IgniterAgent.create()
   *   .withContextSchema(contextSchema)
   *   .build();
   *
   * // Context is type-safe when calling generate
   * await agent.generate({
   *   messages: [...],
   *   options: {
   *     userId: 'user_123',
   *     chatId: 'chat_456',
   *     userRole: 'admin',
   *     preferences: { language: 'pt' }
   *   }
   * });
   * ```
   *
   * @public
   */
  withContextSchema<TNewSchema extends z.ZodSchema>(
    schema: TNewSchema,
  ): IgniterAgentBuilder<
    TAgentName,
    TAgentModel,
    TAgentInstructions,
    TAgentToolsets,
    TAgentMCPConfigs,
    TNewSchema
  > {
    return new IgniterAgentBuilder({
      ...this._config,
      schema,
    });
  }

  /**
   * Adds a toolset to the agent.
   *
   * @description
   * Registers a toolset with the agent. The toolset's tools become available
   * for the AI to invoke. Multiple toolsets can be added to a single agent.
   *
   * Tool names are prefixed with the toolset name to avoid collisions:
   * `{toolsetName}_{toolName}`
   *
   * @typeParam TNewToolset - The toolset type
   * @param toolset - The toolset to register
   * @returns A new builder with the toolset added
   *
   * @example
   * ```typescript
 * const githubToolset = IgniterAgentToolset.create('github')
 *   .addTool(createIssueTool)
 *   .addTool(listReposTool)
   *   .build();
   *
 * const dockerToolset = IgniterAgentToolset.create('docker')
 *   .addTool(buildImageTool)
 *   .addTool(runContainerTool)
   *   .build();
   *
   * const agent = IgniterAgent.create()
   *   .addToolset(githubToolset)  // Adds github_createIssue, github_listRepos
   *   .addToolset(dockerToolset)  // Adds docker_build, docker_run
   *   .build();
   * ```
   *
   * @public
   */
  addToolset<TNewToolset extends IgniterAgentToolset>(
    toolset: TNewToolset,
  ): IgniterAgentBuilder<
    TAgentName,
    TAgentModel,
    TAgentInstructions,
    TAgentToolsets & { [K in TNewToolset["name"]]: TNewToolset },
    TAgentMCPConfigs,
    TAgentContextSchema
  > {
    return new IgniterAgentBuilder({
      ...this._config,
      toolsets: {
        ...this._config.toolsets,
        [toolset.name]: toolset,
      } as TAgentToolsets & { [K in TNewToolset["name"]]: TNewToolset },
    });
  }

  /**
   * Adds an MCP configuration to the agent.
   *
   * @description
   * Registers an MCP server configuration with the agent. The MCP server
   * will be connected when `agent.start()` is called, and its tools will
   * become available for the AI to invoke.
   *
   * @typeParam TMCPType - The MCP transport type
   * @typeParam TMCPName - The MCP configuration name
   * @param config - The MCP configuration
   * @returns A new builder with the MCP config added
   *
   * @example
   * ```typescript
   * const filesystemMCP = IgniterAgentMCPClient.create('filesystem')
   *   .withType('stdio')
   *   .withCommand('npx')
   *   .withArgs(['-y', '@modelcontextprotocol/server-filesystem', '/tmp'])
   *   .build();
   *
   * const remoteMCP = IgniterAgentMCPClient.create('remote-api')
   *   .withType('http')
   *   .withURL('https://api.example.com/mcp')
   *   .withHeaders({ 'Authorization': 'Bearer xxx' })
   *   .build();
   *
   * const agent = IgniterAgent.create()
   *   .addMCP(filesystemMCP)
   *   .addMCP(remoteMCP)
   *   .build();
   *
   * // MCP connections are established here
   * await agent.start();
   * ```
   *
   * @public
   */
  addMCP<TMCPName extends string>(
    config: IgniterAgentMCPConfigUnion<TMCPName>,
  ): IgniterAgentBuilder<
    TAgentName,
    TAgentModel,
    TAgentInstructions,
    TAgentToolsets,
    TAgentMCPConfigs & { [K in TMCPName]: typeof config },
    TAgentContextSchema
  > {
    return new IgniterAgentBuilder({
      ...this._config,
      configs: {
        ...this._config.configs,
        [config.name]: config,
      } as TAgentMCPConfigs & { [K in TMCPName]: typeof config },
    });
  }

  /* ---------------------------------------------------------------------------
   * BUILD METHOD
   * --------------------------------------------------------------------------- */

  /**
   * Builds and returns the completed agent.
   *
   * @description
   * Finalizes the agent configuration and returns a runtime agent object.
   * The agent provides methods for:
   * - `start()`: Initialize MCP connections
   * - `generate()`: Generate a single response
   * - `stream()`: Stream a response
   * - Accessors for configuration
   *
   * @returns The built agent runtime object
   *
   * @example
   * ```typescript
   * const agent = IgniterAgent.create('assistant')
   *   .withModel(openai('gpt-4'))
   *   .addToolset(myToolset)
   *   .build();
   *
   * // Start the agent
   * await agent.start();
   *
   * // Generate a response
   * const result = await agent.generate({
   *   messages: [{ role: 'user', content: 'Hello!' }]
   * });
   *
   * // Access configuration
   * console.log('Model:', agent.getModel());
   * console.log('Toolsets:', agent.getToolsets());
   * ```
   *
   * @public
   */
  build(): IgniterAgentBuiltAgent<
    TAgentContextSchema,
    TAgentToolsets,
    TAgentModel,
    TAgentInstructions
  > {
    return new IgniterAgentCore<
      TAgentName,
      TAgentModel,
      TAgentInstructions,
      TAgentToolsets,
      TAgentMCPConfigs,
      TAgentContextSchema
    >(this._config as IgniterAgentConfig<
      TAgentName,
      TAgentModel,
      TAgentInstructions,
      TAgentToolsets,
      TAgentMCPConfigs,
      TAgentContextSchema
    >);
  }

  /* ---------------------------------------------------------------------------
   * ACCESSORS
   * --------------------------------------------------------------------------- */

  /**
   * Gets the current configuration (partial).
   *
   * @returns The current configuration state
   * @public
   */
  getConfig(): Partial<
    IgniterAgentConfig<
      TAgentName,
      TAgentModel,
      TAgentInstructions,
      TAgentToolsets,
      TAgentMCPConfigs,
      TAgentContextSchema
    >
  > {
    return { ...this._config };
  }

  /**
   * Gets the agent name.
   *
   * @returns The agent's name
   * @public
   */
  getName(): TAgentName {
    return this._config.name as TAgentName;
  }
}

/* =============================================================================
 * MAIN EXPORT ALIAS
 * ============================================================================= */

/**
 * Alias for IgniterAgentBuilder for cleaner API.
 *
 * @description
 * Use `IgniterAgent.create()` as the primary entry point for building agents.
 *
 * @example
 * ```typescript
 * import { IgniterAgent } from '@igniter-js/agents';
 *
 * const agent = IgniterAgent.create('assistant')
 *   .withModel(openai('gpt-4'))
 *   .build();
 * ```
 *
 * @public
 */
export const IgniterAgent = {
  create: IgniterAgentBuilder.create,
};

/**
 * Type alias for the IgniterAgent class.
 * @public
 */
export type IgniterAgent = typeof IgniterAgentBuilder;
