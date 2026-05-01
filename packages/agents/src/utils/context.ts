/**
 * Context Management using AI SDK's experimental_context
 *
 * This provides type-safe context that flows through tools via AI SDK's
 * built-in experimental_context parameter.
 *
 * Key features:
 * - Uses AI SDK's official context mechanism
 * - Fully flexible user context - pass ANY type you want (object, string, class instance, etc.)
 * - Stream writer for artifacts and real-time updates
 * - Type-safe with full TypeScript support
 * - Available in all tools via executionOptions.experimental_context
 *
 * @module @igniter-js/agents/utils/context
 */

import type {
  IgniterAgentContextOptions,
  IgniterAgentExecutionContext,
} from "../types/context";

/**
 * Static utility class for managing Agent execution context.
 *
 * Provides methods to create and extract type-safe context that flows
 * through tools via AI SDK's experimental_context parameter.
 *
 * @example Creating context
 * ```typescript
 * const context = IgniterAgentContext.create({
 *   context: { userId: '123', db: database },
 *   writer: streamWriter
 * });
 * ```
 *
 * @example Extracting context in tools
 * ```typescript
 * export const myTool = tool({
 *   execute: async (params, executionOptions) => {
 *     const ctx = IgniterAgentContext.get<MyContext>(executionOptions);
 *     const user = await ctx?.db.users.findOne(ctx.userId);
 *   }
 * });
 * ```
 */
export class IgniterAgentContext {
  /**
   * Private constructor to prevent instantiation.
   * This is a static-only utility class.
   */
  private constructor() {
    // Static class - no instantiation allowed
  }

  /**
   * Creates an execution context to pass to AI SDK's experimental_context.
   *
   * Your context object is spread at the top level, merged with writer and metadata.
   * This means you can access your fields directly without a wrapper.
   *
   * @template TContext - Your custom context type (must be an object)
   * @param options - The context creation options
   * @returns The merged execution context ready for AI SDK
   *
   * @example Basic usage
   * ```typescript
   * const context = IgniterAgentContext.create({
   *   context: { userId: '123', db: database, permissions: ['read', 'write'] },
   *   writer: streamWriter
   * });
   * // Access in tools: executionOptions.experimental_context.userId
   * ```
   *
   * @example With typed context
   * ```typescript
   * interface MyAppContext {
   *   tenant: string;
   *   workspace: string;
   *   features: string[];
   * }
   *
   * const context = IgniterAgentContext.create<MyAppContext>({
   *   context: { tenant: 'acme', workspace: 'main', features: ['analytics'] },
   *   writer: streamWriter
   * });
   * // Access in tools: executionOptions.experimental_context.tenant
   * ```
   *
   * @example With metadata for tracing
   * ```typescript
   * const context = IgniterAgentContext.create({
   *   context: { userId: '123', tenantId: 'acme' },
   *   writer: streamWriter,
   *   metadata: { agent: 'reports', requestId: 'req_123' }
   * });
   * ```
   */
  static create<
    TContext extends Record<string, unknown> = Record<string, unknown>,
  >(
    options: IgniterAgentContextOptions<TContext>,
  ): IgniterAgentExecutionContext<TContext> {
    return {
      ...options.context,
      writer: options.writer,
      metadata: {
        startTime: new Date(),
        ...options.metadata,
      },
    } as IgniterAgentExecutionContext<TContext>;
  }

  /**
   * Gets your custom context from execution options.
   *
   * Your context fields are available directly in experimental_context (no wrapper).
   * This helper provides type-safe access.
   *
   * @template T - Your custom context type (object)
   * @param executionOptions - Tool execution options from AI SDK
   * @returns Your custom context or undefined if not available
   *
   * @example Direct access (no helper needed)
   * ```typescript
   * export const myTool = tool({
   *   execute: async (params, executionOptions) => {
   *     // Access fields directly
   *     const userId = executionOptions.experimental_context.userId;
   *     const db = executionOptions.experimental_context.db;
   *   }
   * });
   * ```
   *
   * @example With typed helper
   * ```typescript
   * interface AppContext {
   *   userId: string;
   *   tenantId: string;
   *   db: Database;
   * }
   *
   * export const myTool = tool({
   *   execute: async (params, executionOptions) => {
   *     const ctx = IgniterAgentContext.get<AppContext>(executionOptions);
   *     if (ctx) {
   *       const user = await ctx.db.users.findOne(ctx.userId);
   *     }
   *   }
   * });
   * ```
   */
  static get<T extends Record<string, unknown> = Record<string, unknown>>(
    executionOptions?: { experimental_context?: T },
  ): T | undefined {
    // AI SDK passes context via experimental_context
    return executionOptions?.experimental_context;
  }
}