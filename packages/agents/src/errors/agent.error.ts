/**
 * @fileoverview Custom error classes for the IgniterAgent library.
 * This module provides a hierarchy of error types for precise error handling.
 *
 * @description
 * The error system in IgniterAgent follows these principles:
 * - All errors extend IgniterError from @igniter-js/core for consistency
 * - Errors include rich context for debugging
 * - Error codes enable programmatic error handling
 * - Stack traces are preserved for debugging
 *
 * @example
 * ```typescript
 * import {
 *   IgniterAgentError,
 *   IgniterAgentMCPError,
 *   IgniterAgentToolError,
 *   isIgniterAgentError
 * } from '@igniter-js/agents';
 *
 * try {
 *   await agent.generate({ messages: [] });
 * } catch (error) {
 *   if (isIgniterAgentError(error)) {
 *     console.error(`[${error.code}] ${error.message}`);
 *   }
 * }
 * ```
 *
 * @module errors
 * @packageDocumentation
 */

import { IgniterError, type IgniterLogger } from "@igniter-js/core";

/* =============================================================================
 * ERROR CODES
 * ============================================================================= */

/**
 * Error codes for categorizing IgniterAgent errors.
 *
 * @description
 * Each error code represents a specific type of failure.
 * Use these codes for programmatic error handling.
 *
 * @example
 * ```typescript
 * if (error.code === IgniterAgentErrorCode.MCP_CONNECTION_FAILED) {
 *   // Handle MCP connection failure
 *   await retryMCPConnection();
 * }
 * ```
 *
 * @public
 */
export enum IgniterAgentErrorCode {
  // General errors (1xx)
  /** Generic/unknown error */
  UNKNOWN = "IGNITER_AGENT_UNKNOWN_ERROR",
  /** Invalid configuration provided */
  INVALID_CONFIG = "IGNITER_AGENT_INVALID_CONFIG",
  /** Required value is missing */
  MISSING_REQUIRED = "IGNITER_AGENT_MISSING_REQUIRED",

  // Agent errors (2xx)
  /** Agent not initialized */
  AGENT_NOT_INITIALIZED = "IGNITER_AGENT_NOT_INITIALIZED",
  /** Model not configured */
  AGENT_MODEL_MISSING = "IGNITER_AGENT_MODEL_MISSING",
  /** Agent build failed */
  AGENT_BUILD_FAILED = "IGNITER_AGENT_BUILD_FAILED",

  // MCP errors (3xx)
  /** MCP connection failed */
  MCP_CONNECTION_FAILED = "IGNITER_AGENT_MCP_CONNECTION_FAILED",
  /** MCP client not found */
  MCP_CLIENT_NOT_FOUND = "IGNITER_AGENT_MCP_CLIENT_NOT_FOUND",
  /** MCP tool execution failed */
  MCP_TOOL_ERROR = "IGNITER_AGENT_MCP_TOOL_ERROR",
  /** Invalid MCP configuration */
  MCP_INVALID_CONFIG = "IGNITER_AGENT_MCP_INVALID_CONFIG",

  // Tool errors (4xx)
  /** Tool execution failed */
  TOOL_EXECUTION_FAILED = "IGNITER_AGENT_TOOL_EXECUTION_FAILED",
  /** Tool not found */
  TOOL_NOT_FOUND = "IGNITER_AGENT_TOOL_NOT_FOUND",
  /** Tool validation failed */
  TOOL_VALIDATION_FAILED = "IGNITER_AGENT_TOOL_VALIDATION_FAILED",
  /** Invalid agent context schema */
  AGENT_CONTEXT_SCHEMA_INVALID = "IGNITER_AGENT_CONTEXT_SCHEMA_INVALID",

  // Memory errors (5xx)
  /** Memory provider error */
  MEMORY_PROVIDER_ERROR = "IGNITER_AGENT_MEMORY_PROVIDER_ERROR",
  /** Memory not found */
  MEMORY_NOT_FOUND = "IGNITER_AGENT_MEMORY_NOT_FOUND",
  /** Memory update failed */
  MEMORY_UPDATE_FAILED = "IGNITER_AGENT_MEMORY_UPDATE_FAILED",

  // Adapter errors (6xx)
  /** Adapter connection failed */
  ADAPTER_CONNECTION_FAILED = "IGNITER_AGENT_ADAPTER_CONNECTION_FAILED",
  /** Adapter operation failed */
  ADAPTER_OPERATION_FAILED = "IGNITER_AGENT_ADAPTER_OPERATION_FAILED",
  /** Adapter not initialized */
  ADAPTER_NOT_INITIALIZED = "IGNITER_AGENT_ADAPTER_NOT_INITIALIZED",
}

/* =============================================================================
 * ERROR OPTIONS TYPES
 * ============================================================================= */

/**
 * Options for creating an IgniterAgentError.
 *
 * @public
 */
export interface IgniterAgentErrorOptions {
  /** Human-readable error message */
  message: string;
  /** Error code for categorization */
  code: IgniterAgentErrorCode;
  /** HTTP status code (defaults to 500) */
  statusCode?: number;
  /** The component that threw the error */
  causer?: string;
  /** Additional details about the error */
  details?: unknown;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Logger instance for automatic logging */
  logger?: IgniterLogger;
  /** Original error if this wraps another error */
  cause?: Error;
}

/* =============================================================================
 * BASE ERROR CLASS
 * ============================================================================= */

/**
 * Base error class for all IgniterAgent errors.
 *
 * @description
 * All custom errors in the IgniterAgent library extend this class,
 * which itself extends IgniterError from @igniter-js/core.
 * It provides a consistent interface for error handling, including
 * error codes, context, and cause tracking.
 *
 * @example
 * ```typescript
 * // Throwing a base error
 * throw new IgniterAgentError({
 *   message: 'Something went wrong',
 *   code: IgniterAgentErrorCode.UNKNOWN,
 *   causer: 'Agent',
 *   metadata: { operation: 'generate' }
 * });
 *
 * // Catching and handling
 * try {
 *   await agent.start();
 * } catch (error) {
 *   if (error instanceof IgniterAgentError) {
 *     logger.error({
 *       code: error.code,
 *       message: error.message,
 *       details: error.details
 *     });
 *   }
 * }
 * ```
 *
 * @public
 */
export class IgniterAgentError extends IgniterError {
  /**
   * Creates a new IgniterAgentError.
   *
   * @param options - Error configuration options
   */
  constructor(options: IgniterAgentErrorOptions) {
    super({
      message: options.message,
      code: options.code,
      statusCode: options.statusCode ?? 500,
      causer: options.causer,
      details: options.details,
      metadata: options.metadata,
      logger: options.logger,
      cause: options.cause,
    });

    this.name = "IgniterAgentError";
  }
}

/* =============================================================================
 * SPECIALIZED ERROR CLASSES
 * ============================================================================= */

/**
 * Error thrown when agent configuration is invalid.
 *
 * @example
 * ```typescript
 * throw new IgniterAgentConfigError({
 *   message: 'Model is required but was not provided',
 *   field: 'model'
 * });
 * ```
 *
 * @public
 */
export class IgniterAgentConfigError extends IgniterAgentError {
  /**
   * The configuration field that caused the error.
   */
  public readonly field?: string;

  constructor(
    options: Omit<IgniterAgentErrorOptions, "code"> & { field?: string },
  ) {
    super({
      ...options,
      code: IgniterAgentErrorCode.INVALID_CONFIG,
      metadata: { ...options.metadata, field: options.field },
    });
    this.name = "IgniterAgentConfigError";
    this.field = options.field;
  }
}

/**
 * Error thrown when an MCP operation fails.
 *
 * @description
 * Covers all MCP-related failures including connection errors,
 * tool execution errors, and configuration errors.
 *
 * @example
 * ```typescript
 * throw new IgniterAgentMCPError({
 *   message: 'Failed to connect to MCP server',
 *   code: IgniterAgentErrorCode.MCP_CONNECTION_FAILED,
 *   mcpName: 'filesystem'
 * });
 * ```
 *
 * @public
 */
export class IgniterAgentMCPError extends IgniterAgentError {
  /**
   * The name of the MCP configuration that caused the error.
   */
  public readonly mcpName?: string;

  constructor(options: IgniterAgentErrorOptions & { mcpName?: string }) {
    super({
      ...options,
      metadata: { ...options.metadata, mcpName: options.mcpName },
    });
    this.name = "IgniterAgentMCPError";
    this.mcpName = options.mcpName;
  }
}

/**
 * Error thrown when a tool execution fails.
 *
 * @example
 * ```typescript
 * throw new IgniterAgentToolError({
 *   message: 'Tool execution timed out',
 *   toolName: 'github_createIssue',
 *   metadata: { timeout: 30000 }
 * });
 * ```
 *
 * @public
 */
export class IgniterAgentToolError extends IgniterAgentError {
  /**
   * The name of the tool that caused the error.
   */
  public readonly toolName: string;

  constructor(
    options: Omit<IgniterAgentErrorOptions, "code"> & { toolName: string },
  ) {
    super({
      ...options,
      code: IgniterAgentErrorCode.TOOL_EXECUTION_FAILED,
      metadata: { ...options.metadata, toolName: options.toolName },
    });
    this.name = "IgniterAgentToolError";
    this.toolName = options.toolName;
  }
}

/**
 * Error thrown when a memory operation fails.
 *
 * @example
 * ```typescript
 * throw new IgniterAgentMemoryError({
 *   message: 'Failed to save message to history',
 *   code: IgniterAgentErrorCode.MEMORY_UPDATE_FAILED,
 *   metadata: { chatId: 'chat_123' }
 * });
 * ```
 *
 * @public
 */
export class IgniterAgentMemoryError extends IgniterAgentError {
  constructor(options: IgniterAgentErrorOptions) {
    super(options);
    this.name = "IgniterAgentMemoryError";
  }
}

/**
 * Error thrown when an adapter operation fails.
 *
 * @example
 * ```typescript
 * throw new IgniterAgentAdapterError({
 *   message: 'Redis connection lost',
 *   code: IgniterAgentErrorCode.ADAPTER_CONNECTION_FAILED,
 *   adapterName: 'redis'
 * });
 * ```
 *
 * @public
 */
export class IgniterAgentAdapterError extends IgniterAgentError {
  /**
   * The name of the adapter that caused the error.
   */
  public readonly adapterName?: string;

  constructor(options: IgniterAgentErrorOptions & { adapterName?: string }) {
    super({
      ...options,
      metadata: { ...options.metadata, adapterName: options.adapterName },
    });
    this.name = "IgniterAgentAdapterError";
    this.adapterName = options.adapterName;
  }
}

/* =============================================================================
 * TYPE GUARDS
 * ============================================================================= */

/**
 * Type guard to check if an error is an IgniterAgentError.
 *
 * @description
 * Use this function to safely narrow error types in catch blocks.
 *
 * @param error - The error to check
 * @returns True if the error is an IgniterAgentError
 *
 * @example
 * ```typescript
 * try {
 *   await agent.generate({ messages: [] });
 * } catch (error) {
 *   if (isIgniterAgentError(error)) {
 *     // TypeScript knows error is IgniterAgentError
 *     console.log(error.code, error.details);
 *   }
 * }
 * ```
 *
 * @public
 */
export function isIgniterAgentError(
  error: unknown,
): error is IgniterAgentError {
  return error instanceof IgniterAgentError;
}

/**
 * Type guard to check if an error is an MCP error.
 *
 * @param error - The error to check
 * @returns True if the error is an IgniterAgentMCPError
 *
 * @public
 */
export function isIgniterAgentMCPError(
  error: unknown,
): error is IgniterAgentMCPError {
  return error instanceof IgniterAgentMCPError;
}

/**
 * Type guard to check if an error is a tool error.
 *
 * @param error - The error to check
 * @returns True if the error is an IgniterAgentToolError
 *
 * @public
 */
export function isIgniterAgentToolError(
  error: unknown,
): error is IgniterAgentToolError {
  return error instanceof IgniterAgentToolError;
}

/* =============================================================================
 * HELPER FUNCTIONS
 * ============================================================================= */

/**
 * Wraps an unknown error in an IgniterAgentError.
 *
 * @description
 * Useful for normalizing errors from external sources into
 * the IgniterAgent error format.
 *
 * @param error - The error to wrap
 * @param options - Additional options to add
 * @returns An IgniterAgentError wrapping the original
 *
 * @example
 * ```typescript
 * try {
 *   await externalService.call();
 * } catch (error) {
 *   throw wrapError(error, { causer: 'ExternalService' });
 * }
 * ```
 *
 * @public
 */
export function wrapError(
  error: unknown,
  options: Partial<IgniterAgentErrorOptions> = {},
): IgniterAgentError {
  if (isIgniterAgentError(error)) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  const cause = error instanceof Error ? error : undefined;

  return new IgniterAgentError({
    message,
    code: IgniterAgentErrorCode.UNKNOWN,
    ...options,
    cause,
  });
}
