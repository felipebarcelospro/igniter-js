/**
 * @fileoverview Configuration types for @igniter-js/logger
 * @module @igniter-js/logger/types/config
 */

import type { IgniterLogLevel } from "./level";
import type { IgniterTransportConfig } from "./transport";

/**
 * Final configuration passed to the logger manager.
 */
export interface IgniterLoggerConfig {
  /** Minimum log level. */
  level?: IgniterLogLevel;
  /** Application name included in log entries. */
  appName?: string;
  /** Component name included in log entries. */
  component?: string;
  /** Default context merged into each log entry. */
  context?: Record<string, unknown>;
  /** Transport configurations. */
  transports?: IgniterTransportConfig[];
  /** Scoped context values for child loggers. */
  scopes?: Record<string, unknown>;
}
