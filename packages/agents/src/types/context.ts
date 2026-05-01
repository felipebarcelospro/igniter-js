/**
 * Context types for AI SDK's experimental_context integration.
 *
 * @module @igniter-js/agents/types/context
 */

import type { UIMessageStreamWriter } from "ai";
import type { IgniterAgentMemoryConfig } from "./memory";

/**
 * Core execution context that flows through tools via AI SDK.
 *
 * This merges your custom context with required system fields.
 * Your context fields are available at the top level alongside writer and metadata.
 *
 * @template TContext - Your custom context type (must be an object)
 *
 * @example Basic usage
 * ```typescript
 * // Define your context type
 * interface MyAppContext {
 *   userId: string;
 *   db: Database;
 * }
 *
 * // Access in tools
 * const ctx: IgniterAgentExecutionContext<MyAppContext> = {
 *   userId: '123',
 *   db: database,
 *   writer: streamWriter,
 *   metadata: { agent: 'my-agent' }
 * };
 * ```
 */
export type IgniterAgentExecutionContext<
  TContext extends Record<string, unknown> = Record<string, unknown>,
> = TContext & {
  /** Stream writer for real-time updates and artifacts */
  writer: UIMessageStreamWriter;

  /** Metadata about the current execution */
  metadata?: IgniterAgentExecutionContextMetadata;

  /** Memory configuration for persistent context */
  memory?: IgniterAgentMemoryConfig;
};

/**
 * Metadata about the current agent execution.
 *
 * @example
 * ```typescript
 * const metadata: IgniterAgentExecutionContextMetadata = {
 *   agent: 'reports-agent',
 *   requestId: 'req_123',
 *   startTime: new Date()
 * };
 * ```
 */
export interface IgniterAgentExecutionContextMetadata {
  /** Current agent name */
  agent?: string;
  /** Execution start time */
  startTime?: Date;
  /** Request ID for tracing */
  requestId?: string;
  /** Chat ID for memory scope */
  chatId?: string;
  /** User ID for memory scope */
  userId?: string;
  /** Any custom metadata */
  [key: string]: unknown;
}

/**
 * Type-safe context creator options.
 *
 * @template TContext - Your custom context type (must be an object)
 *
 * @example
 * ```typescript
 * const options: IgniterAgentContextOptions<MyAppContext> = {
 *   context: { userId: '123', db: database },
 *   writer: streamWriter,
 *   metadata: { agent: 'reports' }
 * };
 * ```
 */
export interface IgniterAgentContextOptions<
  TContext extends Record<string, unknown> = Record<string, unknown>,
> {
  /** Your custom application context - spread at the top level */
  context?: TContext;

  /** Stream writer (required in streaming mode) */
  writer?: UIMessageStreamWriter;

  /** Memory configuration for persistent context */
  memory?: IgniterAgentMemoryConfig;

  /** Metadata for tracing and scope */
  metadata: IgniterAgentExecutionContextMetadata;
}
