import chalk from 'chalk';
import {
  IgniterLogger,
  IgniterLogLevel,
  IgniterLoggerOptions,
  IgniterLogEntry,
} from '../../types/logger.interface';

/**
 * ConsoleLogger
 * 
 * A robust, extensible logger implementation for the Igniter framework that outputs
 * structured log messages to the console, with optional colorization using chalk.
 * 
 * This logger supports all Igniter log levels, structured context, error objects,
 * and can be extended with child loggers for per-request or per-module context.
 * 
 * @example
 * const logger = new ConsoleLogger({ context: 'MyApp', level: IgniterLogLevel.INFO });
 * logger.info('Server started', { port: 3000 });
 * logger.error('Failed to connect', { db: 'main' }, new Error('Connection refused'));
 */
export class ConsoleLogger implements IgniterLogger {
  private readonly context: Record<string, unknown>;
  private logLevel: IgniterLogLevel;
  private readonly colorize: boolean;
  private readonly formatter?: (entry: IgniterLogEntry) => string;

  /**
   * Creates a new ConsoleLogger instance.
   * @param options Logger configuration options.
   */
  constructor(options: IgniterLoggerOptions & { context?: Record<string, unknown> } = {}) {
    this.context = options.context ?? {};
    this.logLevel = options.level ?? IgniterLogLevel.INFO;
    this.colorize = options.colorize ?? true;
    this.formatter = options.formatter;
  }

  /**
   * Logs a message at the specified level.
   * @param level The log level.
   * @param message The log message.
   * @param context Optional structured context.
   * @param error Optional error object.
   */
  log(
    level: IgniterLogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error | unknown
  ): void {
    if (!this.shouldLog(level)) return;
    const entry: IgniterLogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.context, ...(context ?? {}) },
      error,
    };
    const output = this.formatter
      ? this.formatter(entry)
      : this.formatLogEntry(entry);
    this.writeToConsole(level, output, error);
  }

  /**
   * Log a fatal error (system crash, unrecoverable).
   */
  fatal(message: string, context?: Record<string, unknown>, error?: Error | unknown): void {
    this.log(IgniterLogLevel.FATAL, message, context, error);
  }

  /**
   * Log an error message.
   */
  error(message: string, context?: Record<string, unknown>, error?: Error | unknown): void {
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
   * Create a child logger with additional context.
   * @param context Context to bind to all log messages from this child logger.
   * @returns A new ConsoleLogger instance with merged context.
   */
  child(context: Record<string, unknown>): IgniterLogger {
    return new ConsoleLogger({
      level: this.logLevel,
      colorize: this.colorize,
      formatter: this.formatter,
      context: { ...this.context, ...context },
    });
  }

  /**
   * Set the minimum log level at runtime.
   * @param level The new minimum log level.
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
   * @param level The log level to check.
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
   * Formats a log entry as a string, with optional colorization.
   * @param entry The log entry to format.
   */
  private formatLogEntry(entry: IgniterLogEntry): string {
    const { level, message, timestamp, context, error } = entry;
    const levelStr = this.colorize
      ? this.getLevelColor(level)(level.toUpperCase().padEnd(5))
      : level.toUpperCase().padEnd(5);
    const timeStr = timestamp ? `[${timestamp}]` : '';
    const contextStr =
      context && Object.keys(context).length > 0
        ? this.colorize
          ? chalk.cyan(JSON.stringify(context))
          : JSON.stringify(context)
        : '';
    const msgStr = this.colorize ? chalk.white(message) : message;
    let output = `${timeStr} ${levelStr} ${contextStr} ${msgStr}`.trim();
    if (error) {
      output +=
        '\n' +
        (this.colorize
          ? chalk.red(this.formatError(error))
          : this.formatError(error));
    }
    return output;
  }

  /**
   * Returns a chalk color function for the given log level.
   * @param level The log level.
   */
  private getLevelColor(level: IgniterLogLevel): (text: string) => string {
    switch (level) {
      case IgniterLogLevel.FATAL:
        return chalk.bgRed.white.bold;
      case IgniterLogLevel.ERROR:
        return chalk.red.bold;
      case IgniterLogLevel.WARN:
        return chalk.yellow.bold;
      case IgniterLogLevel.INFO:
        return chalk.green;
      case IgniterLogLevel.DEBUG:
        return chalk.blue;
      case IgniterLogLevel.TRACE:
        return chalk.gray;
      default:
        return chalk.white;
    }
  }

  /**
   * Writes the formatted log entry to the appropriate console method.
   * @param level The log level.
   * @param output The formatted log string.
   * @param error Optional error object.
   */
  private writeToConsole(level: IgniterLogLevel, output: string, error?: Error | unknown): void {
    switch (level) {
      case IgniterLogLevel.FATAL:
      case IgniterLogLevel.ERROR:
        console.error(output);
        break;
      case IgniterLogLevel.WARN:
        console.warn(output);
        break;
      case IgniterLogLevel.INFO:
        console.info(output);
        break;
      case IgniterLogLevel.DEBUG:
      case IgniterLogLevel.TRACE:
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }

  /**
   * Formats an error object for logging.
   * @param error The error object.
   */
  private formatError(error: Error | unknown): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}\n${error.stack ?? ''}`;
    }
    return typeof error === 'string'
      ? error
      : JSON.stringify(error, null, 2);
  }
}

/**
 * Factory function to create a ConsoleLogger instance.
 * @param options Logger configuration options.
 * @returns A new ConsoleLogger instance.
 */
export function createConsoleLogger(
  options: IgniterLoggerOptions & { context?: Record<string, unknown> } = {}
): IgniterLogger {
  return new ConsoleLogger(options);
}
