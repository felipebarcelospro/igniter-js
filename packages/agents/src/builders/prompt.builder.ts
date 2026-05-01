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
  TAppended extends Record<
    string,
    IgniterAgentPromptTemplate<TContext, {}> | string
  > = {},
> implements IgniterAgentPromptTemplate<TContext, TAppended> {
  private readonly template: TTemplate;
  private readonly appended: TAppended;

  private constructor(template: TTemplate, appended: TAppended) {
    this.template = template;
    this.appended = appended;
  }

  /**
   * Creates a new prompt builder.
   *
   * @param template - Prompt template string with {{placeholders}}
   * @returns A new prompt builder instance
   */
  static create<TNewTemplate extends string>(
    template: TNewTemplate,
    appended: Record<string, IgniterAgentPromptTemplate<{}, {}> | string> = {},
  ): IgniterAgentPromptBuilder<TNewTemplate, Record<string, unknown>> {
    return new IgniterAgentPromptBuilder<TNewTemplate, Record<string, unknown>>(
      template,
    appended,
    );
  }

  /**
   * Builds the prompt string with the provided context.
   *
   * @param context - Context data used for interpolation
   * @returns The resolved prompt string
   */
  build(context: TContext): string {
    const resolveTemplate = (template: string) =>
      template.replace(TEMPLATE_PATTERN, (_match, path) => {
        const value = resolvePath(context, String(path));
        return value === undefined || value === null ? "" : String(value);
      });

    const appendedTemplates = Object.values(this.appended).map((prompt) => {
      if (typeof prompt === "string") {
        return resolveTemplate(prompt);
      }

      if (prompt && typeof prompt === "object" && "build" in prompt) {
        return prompt.build(context);
      }

      return "";
    });
    const appendedString = appendedTemplates.filter(Boolean).join("\n\n");

    const templateString = resolveTemplate(this.template);

    if (!appendedString) {
      return templateString;
    }

    return templateString + "\n\n" + appendedString;
  }

  /**
   * Appends another prompt template to this one.
   */
  addAppended<K extends string>(
    key: K,
    prompt: IgniterAgentPromptTemplate<TContext, TAppended> | string,
  ): IgniterAgentPromptTemplate<
    TContext,
    TAppended &
    Record<K, IgniterAgentPromptTemplate<TContext, TAppended> | string>
  > {
    return new IgniterAgentPromptBuilder<TTemplate, TContext>(
      this.template,
      {
        ...this.appended,
        [key]: prompt,
      },
    ) as unknown as IgniterAgentPromptTemplate<TContext, TAppended & Record<K, IgniterAgentPromptTemplate<TContext, TAppended>>>;
  }

  /**
   * Removes an appended prompt template from this one.
   */
  removeAppended<K extends string>(key: K): IgniterAgentPromptTemplate<TContext, Omit<TAppended, K>> {
    const { [key]: _, ...rest } = this.appended;
    return new IgniterAgentPromptBuilder<TTemplate, TContext>(
      this.template,
      rest,
    ) as unknown as IgniterAgentPromptTemplate<TContext, Omit<TAppended, K>>;
  }

  /**
   * Returns the appended prompts.
   */
  getAppended(): TAppended {
    return this.appended;
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
