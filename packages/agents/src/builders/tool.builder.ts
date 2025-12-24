/**
 * @fileoverview Tool Builder for creating individual tool definitions.
 * This module provides a fluent API for building single tools with type safety.
 *
 * @description
 * The IgniterAgentToolBuilder allows you to define a single tool using a
 * fluent builder pattern. The resulting tool definition can be added to a
 * toolset builder for registration with an agent.
 *
 * @example
 * ```typescript
 * import { IgniterAgentTool } from '@igniter-js/agents';
 * import { z } from 'zod';
 *
 * const greetTool = IgniterAgentTool
 *   .create('greet')
 *   .withDescription('Greets a user by name')
 *   .withInputSchema(z.object({ name: z.string() }))
 *   .withExecute(async ({ name }) => `Hello, ${name}!`)
 *   .build();
 * ```
 *
 * @module builders/tool
 * @packageDocumentation
 */

import type { z } from "zod";

import type {
  IgniterAgentBuiltTool,
  IgniterAgentToolExecuteOptions,
} from "../types";

import { IgniterAgentConfigError } from "../errors";

/* =============================================================================
 * TOOL BUILDER CLASS
 * ============================================================================= */

/**
 * Fluent builder for creating a single tool definition.
 *
 * @description
 * The IgniterAgentToolBuilder provides a type-safe fluent API for defining
 * a tool's metadata, input schema, and execution handler.
 *
 * @typeParam TName - The tool's unique name
 * @typeParam TInputSchema - The tool parameters type
 * @typeParam TOutputSchema - The tool result type
 *
 * @public
 */
export class IgniterAgentToolBuilder<
  TName extends string = string,
  TInputSchema = unknown,
  TOutputSchema = undefined,
  TExecute extends (
    params: TInputSchema,
    options: IgniterAgentToolExecuteOptions
  ) => 
    Promise<unknown>
  = any
> {
  /**
   * The accumulated tool definition.
   * @internal
   */
  private readonly _definition: Partial<
    IgniterAgentBuiltTool<TName, TInputSchema, TOutputSchema>
  >;

  /**
   * Creates a new IgniterAgentToolBuilder instance.
   *
   * @param name - The tool name
   * @param definition - Partial tool definition
   * @internal
   */
  private constructor(
    definition: Partial<IgniterAgentBuiltTool<TName, TInputSchema, TOutputSchema>> = {},
  ) {
    this._definition = definition;
  }

  /* ---------------------------------------------------------------------------
   * STATIC FACTORY METHODS
   * --------------------------------------------------------------------------- */

  /**
   * Creates a new tool builder with the given name.
   *
   * @description
   * The name must be unique within a toolset.
   *
   * @typeParam TNewName - The tool name type
   * @param name - Unique name for the tool
   * @returns A new IgniterAgentToolBuilder instance
   *
   * @public
   */
  static create<TNewName extends string>(
    name: TNewName,
  ): IgniterAgentToolBuilder<TNewName, unknown, unknown> {
    if (!name || typeof name !== "string") {
      throw new IgniterAgentConfigError({
        message: "Tool name is required and must be a non-empty string",
        field: "name",
      });
    }

    return new IgniterAgentToolBuilder<TNewName, unknown, unknown, any>({
      name,
    });
  }

  /* ---------------------------------------------------------------------------
   * BUILDER METHODS
   * --------------------------------------------------------------------------- */
  /**
   * Sets the tool description.
   *
   * @param description - Human-readable description shown to the AI
   * @returns A new builder with the description set
   *
   * @public
   */
  withDescription(
    description: string,
  ): IgniterAgentToolBuilder<TName, TInputSchema, TOutputSchema> {
    if (!description || typeof description !== "string") {
      throw new IgniterAgentConfigError({
        message: "Tool description is required and must be a non-empty string",
        field: "description",
        metadata: { tool: this._definition.name },
      });
    }

    return new IgniterAgentToolBuilder<TName, TInputSchema, TOutputSchema, TExecute>({
      ...this._definition,
      description,
    });
  }

  /**
   * Sets the tool parameters schema.
   *
   * @typeParam TNewParams - The new parameters type
   * @param parameters - Zod schema defining input parameters
   * @returns A new builder with the parameters set
   *
   * @public
   */
  withInputSchema<TNewParams>(
    inputSchema: z.ZodSchema<TNewParams>,
  ): IgniterAgentToolBuilder<TName, TNewParams, TOutputSchema> {
    if (!inputSchema) {
      throw new IgniterAgentConfigError({
        message: "Tool parameters schema is required",
        field: "parameters",
        metadata: { tool: this._definition.name },
      });
    }

    type TNewExecute = (
      params: TNewParams,
      options: IgniterAgentToolExecuteOptions
    ) => 
      TOutputSchema extends undefined ? Promise<unknown> : Promise<TOutputSchema>;

    return new IgniterAgentToolBuilder<TName, TNewParams, TOutputSchema, TNewExecute>({
      ...this._definition,
      inputSchema,
    } as Partial<IgniterAgentBuiltTool<TName, TNewParams, TOutputSchema, TNewExecute>>);
  }

  /**
   * Sets the tool output schema.
   *
   * @typeParam TNewResult - The new result type
   * @param outputSchema - Zod schema defining the tool's output
   * @returns A new builder with the output schema set
   *
   * @public
   */
  withOutputSchema<TNewResult>(
    outputSchema: z.ZodSchema<TNewResult>,
  ): IgniterAgentToolBuilder<TName, TInputSchema, TNewResult> {
    if (!outputSchema) {
      throw new IgniterAgentConfigError({
        message: "Tool output schema is required",
        field: "outputSchema",
        metadata: { tool: this._definition.name },
      });
    }

    type TNewExecute = (
      params: TInputSchema,
      options: IgniterAgentToolExecuteOptions
    ) => 
      TNewResult extends undefined ? Promise<unknown> : Promise<TNewResult>;

    return new IgniterAgentToolBuilder<TName, TInputSchema, TNewResult, TNewExecute>({
      ...this._definition,
      outputSchema,
    } as Partial<IgniterAgentBuiltTool<TName, TInputSchema, TNewResult, TNewExecute>>);
  } 

  /**
   * Sets the tool execution handler.
   *
   * @typeParam TNewResult - The new result type
   * @param execute - Function that performs the tool's logic
   * @returns A new builder with the execute handler set
   *
   * @public
   */
  withExecute<
    TNewExecute extends (
      params: TInputSchema,
      options: IgniterAgentToolExecuteOptions
    ) =>
      TOutputSchema extends undefined ? Promise<unknown> : Promise<TOutputSchema>,
    TNewResult = Awaited<ReturnType<TNewExecute>>
  >(
    execute: TNewExecute,
  ): IgniterAgentToolBuilder<TName, TInputSchema, TNewResult, TNewExecute> {
    if (typeof execute !== "function") {
      throw new IgniterAgentConfigError({
        message: "Tool execute handler must be a function",
        field: "execute",
        metadata: { tool: this._definition.name },
      });
    }

    // @ts-expect-error - TypeScript cannot infer the new result type here
    return new IgniterAgentToolBuilder<TName, TInputSchema, TNewResult, TExecute>({
      ...this._definition,
      execute,
    } as Partial<IgniterAgentBuiltTool<TName, TInputSchema, TNewResult, TExecute>>);
  }

  /* ---------------------------------------------------------------------------
   * BUILD METHOD
   * --------------------------------------------------------------------------- */

  /**
   * Builds and returns the completed tool definition.
   *
   * @returns The completed tool definition with its name
   *
   * @public
   */
  build(): IgniterAgentBuiltTool<TName, TInputSchema, TOutputSchema> {
    const { name, description, inputSchema, outputSchema, execute } = this._definition;

    if (!name) {
      throw new IgniterAgentConfigError({
        message: "Tool name is required before building",
        field: "name",
      });
    }

    if (!description) {
      throw new IgniterAgentConfigError({
        message: "Tool description is required before building",
        field: "description",
        metadata: { tool: this._definition.name },
      });
    }

    if (!inputSchema) {
      throw new IgniterAgentConfigError({
        message: "Tool parameters schema is required before building",
        field: "parameters",
        metadata: { tool: this._definition.name },
      });
    }

    if (!execute) {
      throw new IgniterAgentConfigError({
        message: "Tool execute handler is required before building",
        field: "execute",
        metadata: { tool: this._definition.name },
      });
    }

    return {
      name,
      description,
      inputSchema,
      outputSchema,
      execute,
      $Infer: {} as {
        Name: TName;
        Description: string;
        Input: TInputSchema;
        Output: TOutputSchema;
      }
    };
  }
}

/* =============================================================================
 * FACTORY FUNCTION
 * ============================================================================= */

/**
 * Factory function to create a new tool builder.
 *
 * @description
 * Convenience function that wraps `IgniterAgentTool.create('toolName')`.
 *
 * @typeParam TName - The tool name type
 * @param name - Unique name for the tool
 * @returns A new IgniterAgentToolBuilder instance
 *
 * @public
 */
export const IgniterAgentTool = {
  create: IgniterAgentToolBuilder.create,
}
