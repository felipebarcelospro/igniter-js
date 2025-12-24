/**
 * @fileoverview Prompt types for IgniterAgent instructions.
 * @module types/prompt
 */

/**
 * Represents a prompt template that can be built with context.
 *
 * @public
 */
export interface IgniterAgentPromptTemplate<
  TContext extends Record<string, unknown> = Record<string, unknown>,
> {
  /**
   * Builds the prompt string with the provided context.
   *
   * @param context - Context data used for interpolation
   * @returns The built prompt string
   */
  build(context: TContext): string;

  /**
   * Returns the raw prompt template.
   */
  getTemplate(): string;
}
