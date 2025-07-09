/**
 * Log levels for the Igniter Logger provider.
 * These levels are used to categorize log messages by severity.
 */
export enum IgniterLogLevel {
  FATAL = 'fatal',
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace',
}

/**
 * Structured log entry for advanced logger providers.
 */
export interface IgniterLogEntry {
  level: IgniterLogLevel;
  message: string;
  timestamp?: Date | string;
  context?: Record<string, unknown>;
  error?: Error | unknown;
  [key: string]: unknown;
}

/**
 * Options for configuring the logger provider.
 */
export interface IgniterLoggerOptions {
  level?: IgniterLogLevel;
  /**
   * Optional: Enable or disable colorized output (for console loggers).
   */
  colorize?: boolean;
  /**
   * Optional: Custom log formatter.
   */
  formatter?: (entry: IgniterLogEntry) => string;
  /**
   * Optional: Show timestamp in log messages
   */
  showTimestamp?: boolean;
  /**
   * Optional: Additional provider-specific options.
   */
  [key: string]: unknown;
}

/**
 * Interface for a robust, extensible logger provider for the Igniter framework.
 * 
 * Logger providers should implement this interface to support structured logging,
 * log levels, context, error objects, and optional child loggers.
 */
export interface IgniterLogger {
  /**
   * Log a message at the specified level.
   * @param level The log level.
   * @param message The log message.
   * @param context Optional structured context (request, user, etc).
   * @param error Optional error object.
   */
  log(level: IgniterLogLevel, message: string, context?: any, error?: Error | unknown): void;

  /**
   * Log a fatal error (system crash, unrecoverable).
   */
  fatal(message: string, context?: any, error?: Error | unknown): void;

  /**
   * Log an error message.
   */
  error(message: string, context?: any, error?: Error | unknown): void;

  /**
   * Log a warning message.
   */
  warn(message: string, ...args: any[]): void;

  /**
   * Log an informational message.
   */
  info(message: string, ...args: any[]): void;

  /**
   * Log a debug message (for development).
   */
  debug(message: string, ...args: any[]): void;

  /**
   * Log a trace message (very verbose, for tracing execution).
   */
  trace(message: string, ...args: any[]): void;

  /**
   * Log a success message (custom extension for better UX)
   */
  success(message: string, ...args: any[]): void;

  /**
   * Start a new logging group (increases indent)
   * @param name Optional group name to log
   */
  group(name?: string): void;

  /**
   * End the current logging group (decreases indent)
   */
  groupEnd(): void;

  /**
   * Create a child logger with additional context (e.g., per-request).
   * @param context Context to bind to all log messages from this child logger.
   */
  child(context: Record<string, unknown>): IgniterLogger;

  /**
   * Set the minimum log level at runtime.
   */
  setLevel(level: IgniterLogLevel): void;

  /**
   * Flush any buffered logs (for async/file/network loggers).
   */
  flush(): Promise<void>;

  /**
   * Log a message at the specified level.
   * @param level The log level
   * @param message The message to log
   * @param context Optional context object
   * @param error Optional error object
   */
  log(
    level: IgniterLogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error | unknown
  ): void;

  /**
   * Create a separator
   */
  separator(): void;
}
