/**
 * @fileoverview Manager interface for @igniter-js/logger
 * @module @igniter-js/logger/types/manager
 */

import type {
  IgniterLogger as IIgniterLogger,
  IgniterLogLevel as CommonIgniterLogLevel,
} from "@igniter-js/common";
import type { IgniterLogLevel } from "./level";

/**
 * Public manager interface for Igniter Logger.
 */
export interface IIgniterLoggerManager extends IIgniterLogger {
  /**
   * Create a child logger with additional scoped context.
   *
   * @param componentName - Component name for the child logger
   * @param context - Context to merge into child logger entries
   * @returns The child logger instance
   */
  child(
    componentName: string,
    context?: Record<string, unknown> | string,
  ): IIgniterLoggerManager;

  /**
   * Log a success message.
   *
   * @param message - Message to log
   * @param args - Optional extra parameters
   */
  success(message: string, ...args: any[]): void;

  /**
   * Start a new log group (indentation).
   *
   * @param name - Optional group label
   */
  group(name?: string): void;

  /**
   * End the current log group.
   */
  groupEnd(): void;

  /**
   * Create a separator in the log output.
   */
  separator(): void;

  /**
   * Set the minimum log level at runtime.
   *
   * @param level - Minimum log level
   */
  setLevel(level: IgniterLogLevel | CommonIgniterLogLevel): void;

  /**
   * Set application name to include in logs.
   *
   * @param appName - Application name
   */
  setAppName(appName: string | undefined): void;

  /**
   * Set component name to include in logs.
   *
   * @param componentName - Component name
   */
  setComponent(componentName: string | undefined): void;

  /**
   * Flush any buffered logs.
   *
   * @returns Promise resolved when flush completes
   */
  flush(): Promise<void>;
}
