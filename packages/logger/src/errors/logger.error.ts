import { IgniterError } from '@igniter-js/common';

/**
 * Error codes for logger package.
 */
export const IGNITER_LOGGER_ERROR_CODES = {
  TRANSPORT_INVALID: 'TRANSPORT_INVALID',
  LEVEL_INVALID: 'LEVEL_INVALID',
  CONFIG_INVALID: 'CONFIG_INVALID',
  FLUSH_FAILED: 'FLUSH_FAILED',
} as const;

export type IgniterLoggerErrorCode =
  typeof IGNITER_LOGGER_ERROR_CODES[keyof typeof IGNITER_LOGGER_ERROR_CODES];

/**
 * Custom error class for @igniter-js/logger.
 */
export class IgniterLoggerError extends IgniterError {
  constructor(
    code: IgniterLoggerErrorCode,
    message: string,
    details?: {
      'ctx.package': string;
      'ctx.operation': string;
      'ctx.state'?: Record<string, unknown>;
    }
  ) {
    super({
      code,
      message,
      details,
    });
    this.name = 'IgniterLoggerError';
  }

  /**
   * Create TRANSPORT_INVALID error.
   */
  static transportInvalid(
    transport: string,
    operation: string
  ): IgniterLoggerError {
    return new IgniterLoggerError(
      IGNITER_LOGGER_ERROR_CODES.TRANSPORT_INVALID,
      `Invalid transport target: ${transport}. Use 'console', 'file', 'http', or external transport name.`,
      {
        'ctx.package': '@igniter-js/logger',
        'ctx.operation': operation,
        'ctx.state': { transport },
      }
    );
  }

  /**
   * Create LEVEL_INVALID error.
   */
  static levelInvalid(level: string, operation: string): IgniterLoggerError {
    return new IgniterLoggerError(
      IGNITER_LOGGER_ERROR_CODES.LEVEL_INVALID,
      `Invalid log level: ${level}. Use 'fatal', 'error', 'warn', 'info', 'debug', or 'trace'.`,
      {
        'ctx.package': '@igniter-js/logger',
        'ctx.operation': operation,
        'ctx.state': { level },
      }
    );
  }

  /**
   * Create CONFIG_INVALID error.
   */
  static configInvalid(reason: string, operation: string): IgniterLoggerError {
    return new IgniterLoggerError(
      IGNITER_LOGGER_ERROR_CODES.CONFIG_INVALID,
      `Invalid logger configuration: ${reason}`,
      {
        'ctx.package': '@igniter-js/logger',
        'ctx.operation': operation,
      }
    );
  }

  /**
   * Create FLUSH_FAILED error.
   */
  static flushFailed(cause: string, operation: string): IgniterLoggerError {
    return new IgniterLoggerError(
      IGNITER_LOGGER_ERROR_CODES.FLUSH_FAILED,
      `Failed to flush logs: ${cause}`,
      {
        'ctx.package': '@igniter-js/logger',
        'ctx.operation': operation,
      }
    );
  }
}
