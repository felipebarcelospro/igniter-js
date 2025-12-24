/**
 * @fileoverview Prompt builder for IgniterAgent instructions.
 *
 * @description
 * Provides a lightweight template interpolation utility to build
 * prompt strings with context data.
 *
 * @module builders/prompt
 * @packageDocumentation
 */

import type { IgniterAgentPromptTemplate } from "../types/prompt";

const TEMPLATE_PATTERN = /\{\{\s*([^}]+?)\s*\}\}/g;

const resolvePath = (value: unknown, path: string): unknown => {
  if (!path) return undefined;

  return path
    .split(".")
    .reduce<unknown>((acc, key) => {
      if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, value);
};

/**
 * Fluent prompt builder for agent instructions.
 *
 * @example
 * ```typescript
 * const prompt = IgniterAgentPrompt.create(
 *   "You are {{agentName}}. User: {{user.name}}"
 * );
 *
 * const result = prompt.build({ agentName: "assistant", user: { name: "Ada" } });
 * // "You are assistant. User: Ada"
 * ```
 *
 * @public
 */
export class IgniterAgentPromptBuilder<
  TTemplate extends string = string,
  TContext extends Record<string, unknown> = Record<string, unknown>,
> implements IgniterAgentPromptTemplate<TContext> {
  private readonly template: TTemplate;

  private constructor(template: TTemplate) {
    this.template = template;
  }

  /**
   * Creates a new prompt builder.
   *
   * @param template - Prompt template string with {{placeholders}}
   * @returns A new prompt builder instance
   */
  static create<TNewTemplate extends string>(
    template: TNewTemplate,
  ): IgniterAgentPromptBuilder<TNewTemplate, Record<string, unknown>> {
    return new IgniterAgentPromptBuilder<TNewTemplate, Record<string, unknown>>(
      template,
    );
  }

  /**
   * Builds the prompt string with the provided context.
   *
   * @param context - Context data used for interpolation
   * @returns The resolved prompt string
   */
  build(context: TContext): string {
    return this.template.replace(TEMPLATE_PATTERN, (_match, path) => {
      const value = resolvePath(context, String(path));
      return value === undefined || value === null ? "" : String(value);
    });
  }

  /**
   * Returns the raw prompt template string.
   */
  getTemplate(): string {
    return this.template;
  }
}

/* =============================================================================
 * MAIN EXPORT ALIAS
 * ============================================================================= */

/**
 * Alias for IgniterAgentPromptBuilder for cleaner API.
 *
 * @public
 */
export const IgniterAgentPrompt = IgniterAgentPromptBuilder;

/**
 * Type alias for the prompt builder constructor.
 *
 * @public
 */
export type IgniterAgentPrompt = typeof IgniterAgentPromptBuilder;
