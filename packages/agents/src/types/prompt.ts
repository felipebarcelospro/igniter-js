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
  TAppended extends Record<
    string,
    IgniterAgentPromptTemplate<TContext, {}> | string
  > = {},
> {
  /**
   * Builds the prompt string with the provided context.
   *
   * @param context - Context data used for interpolation
   * @returns The built prompt string
   */
  build(context: TContext): string;

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
  >;

  /**
   * Removes an appended prompt template from this one.
   */
  removeAppended<K extends string>(key: K): IgniterAgentPromptTemplate<TContext, Omit<TAppended, K>>;

  /**
   * Returns the appended prompts.
   */
  getAppended(): TAppended;

  /**
   * Returns the raw prompt template.
   */
  getTemplate(): string;
}
