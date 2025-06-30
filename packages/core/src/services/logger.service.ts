import { IgniterLogLevel, type IgniterLogEntry, type IgniterLogger, type IgniterLoggerOptions } from '../types';
import chalk from 'chalk'

/**
 * IgniterLogger with Igniter.js exact design
 * 
 * Features identical Igniter.js visual design:
 * - Timeline connectors (│)
 * - Precise symbols (◇ ◆ ○)
 * - Exact color scheme
 * - Browser-safe fallback
 * - Clean visual hierarchy
 * 
 */
export class IgniterConsoleLogger implements IgniterLogger {
  private readonly context: Record<string, unknown>;
  private logLevel: IgniterLogLevel;
  private readonly colorize: boolean;
  private readonly formatter?: (entry: IgniterLogEntry) => string;
  private readonly showTimestamp: boolean;
  private indentLevel: number = 0;

  constructor(options: IgniterLoggerOptions & { 
    context?: Record<string, unknown>;
    showTimestamp?: boolean;
  } = {}) {
    this.context = options.context ?? {};
    this.logLevel = options.level ?? IgniterLogLevel.INFO;
    this.colorize = options.colorize ?? true;
    this.formatter = options.formatter;
    this.showTimestamp = options.showTimestamp ?? false;
  }
  
  static create(options: IgniterLoggerOptions & { 
    context?: Record<string, unknown>;
    showTimestamp?: boolean;
  } = {}): IgniterLogger {
    return new IgniterConsoleLogger(options);
  }

  /**
   * Log a message at the specified level.
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
   * Log a success message (Igniter.js style)
   */
  success(message: string, context?: Record<string, unknown>): void {
    this.log(IgniterLogLevel.INFO, message, { ...context, _type: 'success' });
  }

  /**
   * Start a new logging group (increases indent and adds timeline)
   */
  group(name?: string): void {
    if (name) {
      const connector = this.indentLevel > 0 ? '│ ' : '';
      const line = this.colorize 
        ? `${connector}${chalk.cyan('┌')} ${chalk.white(name)}`
        : `${connector}┌ ${name}`;
      console.log(line);
    }
    this.indentLevel++;
  }

  /**
   * End the current logging group (decreases indent)
   */
  groupEnd(): void {
    if (this.indentLevel > 0) {
      this.indentLevel--;
      // Add closing connector if needed
      if (this.indentLevel > 0) {
        const connector = '│ '.repeat(this.indentLevel);
        const line = this.colorize ? `${connector}${chalk.cyan('└')}` : `${connector}└`;
        console.log(line);
      }
    }
  }

  /**
   * Add a visual separator (Igniter.js style)
   */
  separator(): void {
    const connector = this.indentLevel > 0 ? '│ ' : '';
    console.log(this.colorize ? chalk.gray(`${connector}│`) : `${connector}│`);
  }

  /**
   * Create a child logger with additional context.
   */
  child(context: Record<string, unknown>): IgniterLogger {
    return new IgniterConsoleLogger({
      level: this.logLevel,
      colorize: this.colorize,
      formatter: this.formatter,
      showTimestamp: this.showTimestamp,
      context: { ...this.context, ...context },
    });
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
   * Formats a log entry with Igniter.js exact styling.
   */
  private formatLogEntry(entry: IgniterLogEntry): string {
    const { level, message, context, timestamp } = entry;
    
    // Igniter.js timeline connector
    const connector = this.indentLevel > 0 ? '│ ' : '';
    
    // Get symbol and format exactly like Igniter.js
    const symbol = this.getStatusSymbol(level, context);

    const timestampStr = this.showTimestamp && timestamp ? chalk.gray(`[${new Date(timestamp as string | Date).toLocaleTimeString()}]`) : '';
    const contextInfo = this.formatContext(context || {});

    let line = '';

    if (this.colorize) {
      if (context?._type === 'success') {
        line = `${connector}${timestampStr} ${chalk.green('◆')} ${chalk.green(message)}`;
      } else if (level === IgniterLogLevel.ERROR || level === IgniterLogLevel.FATAL) {
        line = `${connector}${timestampStr} ${chalk.red('◇')} ${chalk.white(message)}`;
      } else if (level === IgniterLogLevel.WARN) {
        line = `${connector}${timestampStr} ${chalk.yellow('◇')} ${chalk.white(message)}`;
      } else if (level === IgniterLogLevel.DEBUG) {
        line = `${connector}${timestampStr} ${chalk.gray('○')} ${chalk.gray(message)}`;
      } else {
        line = `${connector}${timestampStr} ${chalk.cyan('◇')} ${chalk.white(message)}`;
      }
    } else {
      line = `${connector}${timestampStr} ${symbol} ${message}`;
    }

    if (contextInfo) {
      line += (this.colorize ? chalk.gray(` ${contextInfo}`) : ` ${contextInfo}`);
    }
    return line;
  }

  private formatContext(context: Record<string, unknown>): string {
    const displayContext = { ...context };
    delete (displayContext as any)._type;

    if (Object.keys(displayContext).length === 0) {
      return '';
    }

    const entries: string[] = [];
    
    for (const [key, value] of Object.entries(displayContext)) {
      let formattedValue: string;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        formattedValue = String(value);
      } else if (Array.isArray(value)) {
        formattedValue = `[${value.length} items]`;
      } else if (typeof value === 'object' && value !== null) {
        try {
          formattedValue = JSON.stringify(value); // Attempt to stringify objects for better detail
        } catch (e) {
          formattedValue = '{object}'; // Fallback for circular or complex objects
        }
      } else {
        formattedValue = String(value);
      }
      entries.push(`${key}=${formattedValue}`);
    }

    return entries.join(', ');
  }

  private writeToConsole(level: IgniterLogLevel, output: string, error?: Error | unknown): void {
    switch (level) {
      case IgniterLogLevel.FATAL:
      case IgniterLogLevel.ERROR:
        console.error(output);
        // Igniter.js style error details with timeline
        if (error && error instanceof Error) {
          const connector = this.indentLevel > 0 ? '│ ' : '';
          const errorLine = this.colorize 
            ? `${connector}  ${chalk.red(error.message)}`
            : `${connector}  ${error.message}`;
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

  private getStatusSymbol(level: IgniterLogLevel, context?: Record<string, unknown>): string {
    // Igniter.js exact symbols
    if (context?._type === 'success') {
      return '◆'; // Filled diamond for success
    }

    switch (level) {
      case IgniterLogLevel.FATAL:
      case IgniterLogLevel.ERROR:
        return '◇'; // Outline diamond for errors
      case IgniterLogLevel.WARN:
        return '◇'; // Outline diamond for warnings
      case IgniterLogLevel.INFO:
        return '◇'; // Outline diamond for info (Igniter.js default)
      case IgniterLogLevel.DEBUG:
        return '○'; // Circle for debug
      case IgniterLogLevel.TRACE:
        return '·'; // Dot for trace
      default:
        return '◇'; // Default to Igniter.js style outline diamond
    }
  }
}

/**
 * Factory function to create a ConsoleLogger instance.
 */
export function createConsoleLogger(
  options: IgniterLoggerOptions & { 
    context?: Record<string, unknown>;
  } = {}
): IgniterLogger {
  return new IgniterConsoleLogger(options);
}
