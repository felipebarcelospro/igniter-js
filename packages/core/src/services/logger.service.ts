import chalk from "chalk";
import {
  IgniterLogLevel,
  type IgniterLogEntry,
  type IgniterLogger,
  type IgniterLoggerOptions,
} from "../types";

const APP_NAME_WIDTH = 5;
const COMPONENT_WIDTH = 20;
const TIMESTAMP_WIDTH = 24;
const TYPE_WIDTH = 8;

/**
 * IgniterConsoleLogger - A modern, minimal logger for Igniter.js
 *
 * Features:
 * - Clean, colorized output using chalk
 * - Structured logging with context
 * - Log level filtering
 * - Child logger support for scoped context
 *
 * @example
 * ```typescript
 * const logger = IgniterConsoleLogger.create({
 *   level: IgniterLogLevel.DEBUG,
 *   context: { component: 'RequestProcessor' }
 * });
 *
 * logger.info('Request received', { path: '/api/users' });
 * logger.error('Request failed', { error: 'Not found' });
 * ```
 */
export class IgniterConsoleLogger implements IgniterLogger {
  private readonly context: Record<string, unknown>;
  private logLevel: IgniterLogLevel;
  private readonly colorize: boolean;
  private readonly formatter?: (entry: IgniterLogEntry) => string;
  private readonly showTimestamp: boolean;
  private columnWidth: number;
  private readonly appNameBaseWidth: number = APP_NAME_WIDTH;
  private readonly typeBaseWidth: number = TYPE_WIDTH;
  private indentLevel: number = 0;
  private appName: string = "Igniter";
  private component?: string | undefined;

  constructor(options: IgniterLoggerOptions) {
    this.context =
      typeof options.context === "string"
        ? { component: options.context }
        : (options.context ?? {});
    this.logLevel = options.level ?? IgniterLogLevel.INFO;
    this.colorize = options.colorize ?? true;
    this.formatter = options.formatter;
    this.component = options.component;
    this.showTimestamp = options.showTimestamp ?? false;
    this.appName = options.appName ?? this.appName;
    this.columnWidth = Math.max(
      COMPONENT_WIDTH,
      TIMESTAMP_WIDTH,
      APP_NAME_WIDTH * 2,
      TYPE_WIDTH * 2,
    );
  }

  /**
   * Factory method to create a new logger instance.
   */
  static create(options: IgniterLoggerOptions): IgniterLogger {
    return new IgniterConsoleLogger(options);
  }

  /**
   * Format message with component, timestamp, level, and optional data.
   */
  private formatMessage(
    level: string,
    message: string,
    data?: Record<string, unknown>,
  ): string {
    const appNameValue = this.appName ? String(this.appName) : "";
    const componentValue = this.component ? String(this.component) : "";
    const timestampValue = this.showTimestamp ? new Date().toISOString() : "";
    const levelValue = level ? String(level) : "";

    const longestSegment = Math.max(
      this.columnWidth,
      this.getDisplayLength(componentValue),
      this.getDisplayLength(timestampValue),
      this.getDisplayLength(appNameValue) * 2,
      this.getDisplayLength(levelValue) * 2,
    );
    this.columnWidth = Math.max(this.columnWidth, longestSegment);

    const appNameWidth = Math.max(
      Math.ceil(this.columnWidth / 2),
      this.appNameBaseWidth,
    );
    const typeWidth = Math.max(
      Math.ceil(this.columnWidth / 2),
      this.typeBaseWidth,
    );

    const appNameStr = this.padToWidth(appNameValue, appNameWidth);
    const componentStr = this.padToWidth(componentValue, this.columnWidth);
    const timestampStr = this.padToWidth(
      this.showTimestamp ? timestampValue : "",
      this.columnWidth,
    );
    const typeStr = this.padToWidth(levelValue, typeWidth);

    // Merge context and data, excluding 'component' from data display
    const mergedData = { ...this.context, ...data };
    delete (mergedData as any).component;

    const dataString =
      Object.keys(mergedData).length > 0
        ? ` ${this.formatContext(mergedData)}`
        : "";

    // Build formatted line
    const parts: string[] = [];

    if (this.colorize) {
      parts.push(chalk.cyan(appNameStr));
      parts.push(chalk.cyanBright(componentStr));
      parts.push(chalk.dim(timestampStr));
      parts.push(chalk.dim(typeStr));
      parts.push(message);
      if (dataString) parts.push(chalk.dim(dataString));
    } else {
      parts.push(appNameStr);
      parts.push(componentStr);
      parts.push(timestampStr);
      parts.push(typeStr);
      parts.push(message);
      if (dataString) parts.push(dataString);
    }

    // Add indent for grouped logs
    const indent = "  ".repeat(this.indentLevel);
    return indent + parts.join(" ");
  }

  /**
   * Format context object for display.
   */
  private formatContext(context: Record<string, unknown>): string {
    const entries: string[] = [];

    for (const [key, value] of Object.entries(context)) {
      let formattedValue: string;

      if (value === null || value === undefined) {
        formattedValue = "null";
      } else if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        formattedValue = String(value);
      } else if (Array.isArray(value)) {
        formattedValue = `[${value.length} items]`;
      } else if (value instanceof Error) {
        formattedValue = value.message;
      } else if (typeof value === "object") {
        try {
          formattedValue = JSON.stringify(value);
        } catch {
          formattedValue = "{object}";
        }
      } else {
        formattedValue = String(value);
      }

      entries.push(`${key}=${formattedValue}`);
    }

    return entries.join(", ");
  }

  private getDisplayLength(value: string): number {
    return value.replace(/\u001b\[[0-9;]*m/g, "").length;
  }

  private padToWidth(value: string, width: number): string {
    const visibleLength = this.getDisplayLength(value);
    const padding = Math.max(width - visibleLength, 0);
    return value + " ".repeat(padding);
  }

  /**
   * Core log method.
   */
  log(
    level: IgniterLogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error | unknown,
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: IgniterLogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.context, ...(context ?? {}) },
      error,
    };

    let output: string;

    if (this.formatter) {
      output = this.formatter(entry);
    } else {
      const levelLabel = this.getLevelLabel(level);
      output = this.formatMessage(levelLabel, message, context);
    }

    this.writeToConsole(level, output, error);
  }

  /**
   * Get colorized level label.
   */
  private getLevelLabel(level: IgniterLogLevel): string {
    if (!this.colorize) {
      return String(level).toUpperCase();
    }

    switch (level) {
      case IgniterLogLevel.FATAL:
        return chalk.bgRed(chalk.white(" FATAL "));
      case IgniterLogLevel.ERROR:
        return chalk.red("ERROR");
      case IgniterLogLevel.WARN:
        return chalk.yellow("WARN");
      case IgniterLogLevel.INFO:
        return chalk.blue("INFO");
      case IgniterLogLevel.DEBUG:
        return chalk.gray("DEBUG");
      case IgniterLogLevel.TRACE:
        return chalk.dim("TRACE");
    }
  }

  /**
   * Log a fatal error (system crash, unrecoverable).
   */
  fatal(
    message: string,
    context?: Record<string, unknown>,
    error?: Error | unknown,
  ): void {
    this.log(IgniterLogLevel.FATAL, message, context, error);
  }

  /**
   * Log an error message.
   */
  error(
    message: string,
    context?: Record<string, unknown>,
    error?: Error | unknown,
  ): void {
    this.log(IgniterLogLevel.ERROR, message, context, error);
  }

  /**
   * Log a warning message.
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(IgniterLogLevel.WARN, message, context);
  }

  /**
   * Log an informational message.
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(IgniterLogLevel.INFO, message, context);
  }

  /**
   * Log a debug message (for development).
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(IgniterLogLevel.DEBUG, message, context);
  }

  /**
   * Log a trace message (very verbose, for tracing execution).
   */
  trace(message: string, context?: Record<string, unknown>): void {
    this.log(IgniterLogLevel.TRACE, message, context);
  }

  /**
   * Log a success message.
   */
  success(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(IgniterLogLevel.INFO)) return;

    const levelLabel = this.colorize ? chalk.green("SUCCESS") : "SUCCESS";
    const output = this.formatMessage(levelLabel, message, context);
    console.log(output);
  }

  /**
   * Start a new logging group (increases indent).
   */
  group(name?: string): void {
    if (name) {
      const label = this.colorize
        ? `${chalk.cyan("┌")} ${chalk.bold(name)}`
        : `┌ ${name}`;
      console.log("  ".repeat(this.indentLevel) + label);
    }
    this.indentLevel++;
  }

  /**
   * End the current logging group (decreases indent).
   */
  groupEnd(): void {
    if (this.indentLevel > 0) {
      this.indentLevel--;
      if (this.indentLevel >= 0) {
        const label = this.colorize ? chalk.cyan("└") : "└";
        console.log("  ".repeat(this.indentLevel) + label);
      }
    }
  }

  /**
   * Add a visual separator.
   */
  separator(): void {
    const line = this.colorize ? chalk.dim("─".repeat(40)) : "─".repeat(40);
    console.log("  ".repeat(this.indentLevel) + line);
  }

  /**
   * Create a child logger with additional context.
   */
  child(
    componentName: string,
    context?: Record<string, unknown>,
  ): IgniterLogger {
    return new IgniterConsoleLogger({
      level: this.logLevel,
      component: componentName || this.component,
      appName: this.appName,
      colorize: this.colorize,
      formatter: this.formatter,
      showTimestamp: this.showTimestamp,
      context: { ...this.context, ...context },
    });
  }

  /**
   * Set application name for the logger.
   */
  setAppName(appName: string): void {
    this.appName = appName;
  }

  /**
   * Set component name for the logger.
   */
  setComponent(componentName: string): void {
    this.component = componentName;
  }

  /**
   * Set the minimum log level at runtime.
   */
  setLevel(level: IgniterLogLevel): void {
    this.logLevel = level;
  }

  /**
   * Flush any buffered logs (no-op for console logger).
   */
  async flush(): Promise<void> {
    // No buffering in console logger
  }

  /**
   * Determines if a message at the given level should be logged.
   */
  private shouldLog(level: IgniterLogLevel): boolean {
    const levels: IgniterLogLevel[] = [
      IgniterLogLevel.FATAL,
      IgniterLogLevel.ERROR,
      IgniterLogLevel.WARN,
      IgniterLogLevel.INFO,
      IgniterLogLevel.DEBUG,
      IgniterLogLevel.TRACE,
    ];
    const minIndex = levels.indexOf(this.logLevel);
    const levelIndex = levels.indexOf(level);
    return levelIndex <= minIndex;
  }

  /**
   * Write to appropriate console method based on level.
   */
  private writeToConsole(
    level: IgniterLogLevel,
    output: string,
    error?: Error | unknown,
  ): void {
    switch (level) {
      case IgniterLogLevel.FATAL:
      case IgniterLogLevel.ERROR:
        console.error(output);
        if (error && error instanceof Error) {
          const errorLine = this.colorize
            ? "  ".repeat(this.indentLevel) + chalk.red(`  └─ ${error.message}`)
            : "  ".repeat(this.indentLevel) + `  └─ ${error.message}`;
          console.error(errorLine);
        }
        break;
      case IgniterLogLevel.WARN:
        console.warn(output);
        break;
      case IgniterLogLevel.DEBUG:
      case IgniterLogLevel.TRACE:
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }
}

/**
 * Factory function to create a ConsoleLogger instance.
 */
export function createConsoleLogger(
  options: IgniterLoggerOptions & {
    context?: string | Record<string, unknown>;
  } = {},
): IgniterLogger {
  return new IgniterConsoleLogger(options);
}
