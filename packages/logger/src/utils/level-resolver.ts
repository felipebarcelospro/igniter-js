/**
 * @fileoverview Log level normalization utility for @igniter-js/logger
 * @module @igniter-js/logger/utils/level-resolver
 */

import { IgniterLogLevel } from "../types/level";

/**
 * Utility class for resolving log levels into Pino-compatible strings.
 */
export class IgniterLoggerLevelResolver {
  /**
   * Normalizes a log level input into a valid Pino log level string.
   *
   * @param level - Incoming log level as string or {@link IgniterLogLevel}
   * @returns Normalized log level string
   *
   * @example
   * ```typescript
   * IgniterLoggerLevelResolver.resolve("WARN") // "warn"
   * IgniterLoggerLevelResolver.resolve(IgniterLogLevel.Debug) // "debug"
   * ```
   */
  static resolve(level: string | IgniterLogLevel): string {
    const normalized = String(level).trim().toLowerCase();

    const aliasMap: Record<string, string> = {
      fatal: "fatal",
      error: "error",
      err: "error",
      warn: "warn",
      warning: "warn",
      info: "info",
      debug: "debug",
      trace: "trace",
    };

    return aliasMap[normalized] ?? "info";
  }
}
