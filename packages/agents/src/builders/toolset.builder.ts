/**
 * @fileoverview Toolset Builder for creating custom tool collections.
 * This module provides a fluent API for building toolsets with type safety.
 *
 * @description
 * The IgniterAgentToolsetBuilder allows you to create collections of related
 * tools that can be registered with an agent. Each toolset has a unique name
 * and contains one or more tools that the AI can invoke.
 *
 * @example
 * ```typescript
 * import { IgniterAgentToolsetBuilder, IgniterAgentTool } from '@igniter-js/agents/builders';
 * import { z } from 'zod';
 *
 * const createIssue = IgniterAgentTool
 *   .create('createIssue')
 *   .withDescription('Creates a new issue in a GitHub repository')
 *   .withInputSchema(z.object({
 *     repo: z.string().describe('Repository name (owner/repo)'),
 *     title: z.string().describe('Issue title'),
 *     body: z.string().optional().describe('Issue body')
 *   }))
 *   .withExecute(async ({ repo, title, body }) => {
 *     return await github.createIssue(repo, title, body);
 *   })
 *   .build();
 *
 * const listRepos = IgniterAgentTool
 *   .create('listRepos')
 *   .withDescription('Lists repositories for a user')
 *   .withInputSchema(z.object({
 *     username: z.string().describe('GitHub username')
 *   }))
 *   .withExecute(async ({ username }) => {
 *     return await github.listRepos(username);
 *   })
 *   .build();
 *
 * const githubToolset = IgniterAgentToolsetBuilder
 *   .create('github')
 *   .addTool(createIssue)
 *   .addTool(listRepos)
 *   .build();
 * ```
 *
 * @module builders/toolset
 * @packageDocumentation
 */

import { tool, type Tool, type ToolSet } from "ai";

import type {
  IgniterAgentToolset as IgniterAgentToolsetType,
  IgniterAgentToolsetParams,
  IgniterAgentToolResult,
} from "../types";

import type {
  IgniterAgentBuiltTool,
  IgniterAgentBuiltToolset,
} from "../types/builder";

import { IgniterAgentConfigError } from "../errors";

/* =============================================================================
 * TOOLSET BUILDER CLASS
 * ============================================================================= */

/**
 * Fluent builder for creating custom toolsets.
 *
 * @description
 * The IgniterAgentToolsetBuilder provides a type-safe fluent API for creating
 * collections of related tools. Tools are wrapped with error handling and
 * result normalization to ensure consistent behavior.
 *
 * **Key Features:**
 * - Fluent chainable API
 * - Full TypeScript type inference for tool parameters
 * - Automatic error handling and result wrapping
 * - Tool execution logging
 *
 * @typeParam TToolsetName - The unique name for this toolset
 * @typeParam TTools - The accumulated tools collection type
 *
 * @example
 * ```typescript
 * // Create tools
 * const getCurrent = IgniterAgentTool
 *   .create('getCurrent')
 *   .withDescription('Gets current weather for a location')
 *   .withInputSchema(z.object({
 *     city: z.string(),
 *     units: z.enum(['celsius', 'fahrenheit']).default('celsius')
 *   }))
 *   .withExecute(async ({ city, units }) => {
 *     const weather = await weatherApi.getCurrent(city, units);
 *     return {
 *       temperature: weather.temp,
 *       conditions: weather.description,
 *       humidity: weather.humidity
 *     };
 *   })
 *   .build();
 *
 * const getForecast = IgniterAgentTool
 *   .create('getForecast')
 *   .withDescription('Gets 5-day weather forecast')
 *   .withInputSchema(z.object({
 *     city: z.string(),
 *     days: z.number().min(1).max(7).default(5)
 *   }))
 *   .withExecute(async ({ city, days }) => {
 *     return await weatherApi.getForecast(city, days);
 *   })
 *   .build();
 *
 * // Create a toolset with multiple tools
 * const weatherToolset = IgniterAgentToolsetBuilder
 *   .create('weather')
 *   .addTool(getCurrent)
 *   .addTool(getForecast)
 *   .build();
 *
 * // Register with an agent
 * const agent = IgniterAgent.create('assistant')
 *   .addToolset(weatherToolset)
 *   .build();
 * ```
 *
 * @public
 */
export class IgniterAgentToolsetBuilder<
  TToolsetName extends string = string,
  TTools extends ToolSet = Record<string, never>,
> {
  /**
   * The toolset's unique name.
   * @internal
   */
  private readonly _name: TToolsetName;

  /**
   * The accumulated tools collection.
   * @internal
   */
  private readonly _tools: TTools;

  /**
   * Creates a new IgniterAgentToolsetBuilder instance.
   *
   * @param params - The toolset name and initial tools
   * @internal
   */
  constructor(params: IgniterAgentToolsetParams<TToolsetName, TTools>) {
    this._name = params.name;
    this._tools = params.tools;
  }

  /* ---------------------------------------------------------------------------
   * STATIC FACTORY METHODS
   * --------------------------------------------------------------------------- */

  /**
   * Creates a new toolset builder with the given name.
   *
   * @description
   * This is the primary entry point for creating a new toolset.
   * The name must be unique within an agent and is used as a prefix
   * for tool names when the toolset is registered.
   *
   * @typeParam TName - The toolset name type
   * @param name - Unique name for the toolset
   * @returns A new IgniterAgentToolsetBuilder instance
   *
   * @example
   * ```typescript
 * const tool = IgniterAgentTool
 *   .create('doSomething')
 *   .withDescription('Does something')
 *   .withInputSchema(z.object({}))
 *   .withExecute(async () => ({ ok: true }))
 *   .build();
 *
 * const toolset = IgniterAgentToolset
 *   .create('myTools')
 *   .addTool(tool)
 *   .build();
   * ```
   *
   * @public
   */
  static create<TName extends string>(
    name: TName,
  ): IgniterAgentToolsetBuilder<TName, {}> {
    if (!name || typeof name !== "string") {
      throw new IgniterAgentConfigError({
        message: "Toolset name is required and must be a non-empty string",
        field: "name",
      });
    }

    return new IgniterAgentToolsetBuilder<TName, Record<string, never>>({
      name,
      tools: {} as Record<string, never>,
    });
  }

  /* ---------------------------------------------------------------------------
   * BUILDER METHODS
   * --------------------------------------------------------------------------- */

  /**
   * Changes the toolset name.
   *
   * @description
   * Allows renaming the toolset during the building process.
   * This creates a new builder instance with the new name.
   *
   * @typeParam TNewName - The new name type
   * @param name - The new name for the toolset
   * @returns A new builder with the updated name
   *
   * @example
   * ```typescript
 * const toolset = IgniterAgentToolset
 *   .create('temp')
 *   .withName('production')  // Rename to 'production'
 *   .addTool(myTool)
 *   .build();
   * ```
   *
   * @public
   */
  withName<TNewName extends string>(
    name: TNewName,
  ): IgniterAgentToolsetBuilder<TNewName, TTools> {
    return new IgniterAgentToolsetBuilder<TNewName, TTools>({
      name,
      tools: this._tools,
    });
  }

  /**
   * Adds a tool to the toolset.
   *
   * @description
   * Adds a built tool definition to the toolset. The tool is automatically
   * wrapped with error handling that returns a consistent result format
   * (`{ success: true, data: ... }` or `{ success: false, error: ... }`).
   *
   * @typeParam TToolName - The tool name type
   * @param dto - The built tool definition
   * @returns A new builder with the tool added
   *
   * @example
   * ```typescript
   * const greetTool = IgniterAgentTool.create('greet')
   *   .withDescription('Greets a user')
   *   .withInputSchema(z.object({ name: z.string() }))
   *   .withExecute(async ({ name }) => `Hello, ${name}!`)
   *   .build();
   *
   * const toolset = IgniterAgentToolset.create('utils')
   *   .addTool(greetTool)
   *   .build();
   * ```
   *
   * @public
   */
  addTool<TTool extends IgniterAgentBuiltTool<any, any, any>>(
    dto: TTool,
  ): IgniterAgentToolsetBuilder<
    TToolsetName,
    TTools & { [K in TTool['$Infer']['Name']]: Tool<TTool['$Infer']['Input'], TTool['$Infer']['Output']> }
  > {
    if (!dto.name || typeof dto.name !== "string") {
      throw new IgniterAgentConfigError({
        message: "Tool name is required and must be a non-empty string",
        field: "name",
        metadata: { toolset: this._name },
      });
    }

    // Wrap the tool with error handling
    const wrappedTool = tool({
      description: dto.description,
      inputSchema: dto.inputSchema,
      outputSchema: dto.outputSchema,
      execute: async (params, options) => {
        // If no execute function, return error
        if (!dto.execute) {
          const result: IgniterAgentToolResult<undefined> = {
            success: false,
            error: `Tool '${dto.name}' has no execute method`,
          };
          
          return result;
        }

        try {
          // Execute the tool and wrap result
          const response = await dto.execute(params, options as any);
          const result: IgniterAgentToolResult<typeof response> = {
            success: true,
            data: response,
          };
          return result;
        } catch (error) {
          // Log and return error
          console.error(
            `[IgniterAgent] Error executing tool '${dto.name}':`,
            error,
          );

          const errorMessage =
            error instanceof Error ? error.message : String(error);

          const result: IgniterAgentToolResult<undefined> = {
            success: false,
            error: errorMessage,
          };
          return result;
        }
      },
    });

    // Return new builder with the tool added
    return new IgniterAgentToolsetBuilder<
      TToolsetName,
      TTools & { [K in TTool['name']]: Tool }
    >({
      name: this._name,
      tools: {
        ...this._tools,
        [dto.name]: wrappedTool,
      } as TTools & { [K in TTool['$Infer']['Name']]: Tool<TTool['$Infer']['Input'], TTool['$Infer']['Output']> },
    });
  }

  /* ---------------------------------------------------------------------------
   * BUILD METHOD
   * --------------------------------------------------------------------------- */

  /**
   * Builds and returns the completed toolset.
   *
   * @description
   * Finalizes the toolset configuration and returns an object that can
   * be registered with an agent using `addToolset()`.
   *
   * The returned object includes:
   * - `name`: The toolset's unique identifier
   * - `type`: Always `'custom'` for user-defined toolsets
   * - `status`: Always `'connected'` for custom toolsets
   * - `tools`: The tools collection
   * - `toolset`: Reference to the raw tools object
   *
   * @returns The completed toolset configuration
   *
   * @example
   * ```typescript
 * const toolset = IgniterAgentToolset
 *   .create('utils')
 *   .addTool(formatDateTool)
 *   .addTool(parseJsonTool)
 *   .build();
   *
   * console.log(toolset.name);   // 'utils'
   * console.log(toolset.type);   // 'custom'
   * console.log(toolset.status); // 'connected'
   * console.log(Object.keys(toolset.tools)); // ['formatDate', 'parseJSON']
   * ```
   *
   * @public
   */
  build(): IgniterAgentBuiltToolset<TToolsetName, TTools> {
    return {
      type: "custom" as const,
      name: this._name,
      toolset: this._tools,
      status: "connected" as const,
      tools: this._tools,
      $Infer: {} as {
        Name: TToolsetName;
        Tools: TTools;
      }
    };
  }

  /* ---------------------------------------------------------------------------
   * ACCESSORS
   * --------------------------------------------------------------------------- */

  /**
   * Gets the current toolset name.
   *
   * @returns The toolset's name
   * @public
   */
  getName(): TToolsetName {
    return this._name;
  }

  /**
   * Gets the current tools collection.
   *
   * @returns The tools object
   * @public
   */
  getTools(): TTools {
    return this._tools;
  }

  /**
   * Gets the number of tools in the toolset.
   *
   * @returns The tool count
   * @public
   */
  getToolCount(): number {
    return Object.keys(this._tools).length;
  }
}

/* =============================================================================
 * FACTORY FUNCTION
 * ============================================================================= */

/**
 * Factory function to create a new toolset builder.
 *
 * @description
 * Convenience function that wraps `IgniterAgentToolsetBuilder.create()`.
 * Useful for more concise code or functional programming patterns.
 *
 * @typeParam TName - The toolset name type
 * @param name - Unique name for the toolset
 * @returns A new IgniterAgentToolsetBuilder instance
 *
 * @example
 * ```typescript
 * import { IgniterAgentToolset, IgniterAgentTool } from '@igniter-js/agents';
 *
 * const sayHello = IgniterAgentTool
 *   .create('sayHello')
 *   .withDescription('Says hello')
 *   .withInputSchema(z.object({ name: z.string() }))
 *   .withExecute(async ({ name }) => `Hello, ${name}!`)
 *   .build();
 *
 * const myToolset = IgniterAgentToolset.create('myTools')
 *   .addTool(sayHello)
 *   .build();
 * ```
 *
 * @public
 */
export const IgniterAgentToolset = {
  create: IgniterAgentToolsetBuilder.create,
};  
