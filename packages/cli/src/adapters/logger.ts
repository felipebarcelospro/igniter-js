import { IgniterConsoleLogger, createConsoleLogger } from '@igniter-js/core';
import { IgniterLogLevel } from '@igniter-js/core';

/**
 * Get the log level from environment variables
 * Supports DEBUG=true for debug level and LOG_LEVEL for explicit level
 */
function getLogLevel(): IgniterLogLevel {
  if (process.env.DEBUG === 'true') {
    return IgniterLogLevel.DEBUG;
  }
  
  const envLevel = process.env.LOG_LEVEL?.toUpperCase();
  if (envLevel && envLevel in IgniterLogLevel) {
    return IgniterLogLevel[envLevel as keyof typeof IgniterLogLevel];
  }
  
  return IgniterLogLevel.INFO;
}

/**
 * Detect if we're running in concurrent mode (as a child process)
 * This helps us avoid spinner conflicts in concurrently
 */
function isConcurrentMode(): boolean {
  return !!(
    process.env.FORCE_COLOR || // concurrently sets this
    process.env.npm_config_color ||
    process.argv.includes('--concurrent') ||
    process.title.includes('concurrently')
  );
}

/**
 * Detect if we're running in interactive mode
 * This helps us avoid spinner conflicts in interactive process switching
 */
function isInteractiveMode(): boolean {
  return !!(
    process.argv.includes('--interactive') ||
    process.env.IGNITER_INTERACTIVE_MODE === 'true'
  );
}

/**
 * Centralized logger instance for the CLI
 * Uses the ConsoleLogger adapter with CLI-specific configuration
 * Automatically disables spinners in concurrent/interactive mode
 */
import { SpinnerManager, createDetachedSpinner } from '../lib/spinner';

export const logger = createConsoleLogger({
  level: getLogLevel(),
  colorize: true,
  context: {
    concurrent: isConcurrentMode(),
    interactive: isInteractiveMode()
  }
});

// Initialize SpinnerManager with CLI-specific options
const cliSpinnerManager = new SpinnerManager({
  colorize: true,
  disableSpinner: isConcurrentMode() || isInteractiveMode(),
  indentLevel: 0 // CLI usually starts at indent level 0
});

// Override the logger's spinner method to use the CLI's SpinnerManager
// This is a temporary measure until the core logger is refactored to remove spinner logic
(logger as any).spinner = (text: string, id?: string) => cliSpinnerManager.createSpinner(text, id);

/**
 * Creates a child logger with additional context
 * @param context Additional context to add to log entries
 * @param options Optional logger configuration overrides
 */
export function createChildLogger(
  context: Record<string, unknown>,
  options: { level?: IgniterLogLevel; colorize?: boolean } = {}
) {
  const childLogger = logger.child(context);
  
  if (options.level) {
    childLogger?.setLevel?.(options.level);
  }
  
  return childLogger;
}



/**
 * Helper to format error objects for logging
 * Extracts useful information from various error types
 */
export function formatError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error as any).code ? { code: (error as any).code } : {},
      ...(error as any).syscall ? { syscall: (error as any).syscall } : {},
    };
  }
  
  if (typeof error === 'string') {
    return { message: error };
  }
  
  return { error };
} 