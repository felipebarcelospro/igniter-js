/**
 * @fileoverview Log level definitions for @igniter-js/logger
 * @module @igniter-js/logger/types/level
 */

/**
 * Supported log levels for Igniter Logger.
 *
 * @example
 * ```typescript
 * const level = IgniterLogLevel.Info
 * ```
 */
export enum IgniterLogLevel {
  Fatal = "fatal",
  Error = "error",
  Warn = "warn",
  Info = "info",
  Debug = "debug",
  Trace = "trace",
}
