import { IgniterLogLevel, type IgniterLogger } from "../types";
import { IgniterError } from "../error";
import type { ProcessedContext } from "./context-builder.processor";
import type { TelemetrySpan } from "./telemetry-manager.processor";
import { TelemetryManagerProcessor } from "./telemetry-manager.processor";
import { IgniterConsoleLogger } from "../services/logger.service";
import { resolveLogLevel, createLoggerContext } from "../utils/logger";

/**
 * Error handling result
 */
export interface ErrorHandlingResult {
  response: Response;
  handled: true;
}

/**
 * Error handler processor for the Igniter Framework.
 * Provides unified error handling for different types of errors.
 */
export class ErrorHandlerProcessor {
  private static _logger: IgniterLogger;

  private static get logger(): IgniterLogger {
    if (!this._logger) {
      this._logger = IgniterConsoleLogger.create({
        level: resolveLogLevel(),
        context: createLoggerContext('ErrorHandler'),
      });
    }
    return this._logger;
  }

  /**
   * Handles validation errors (e.g., Zod validation).
   *
   * @param error - The validation error
   * @param context - The processed context
   * @param telemetrySpan - The telemetry span for tracking
   * @param startTime - Request start time
   * @returns Standardized error response
   */
  static async handleValidationError(
    error: any,
    context: ProcessedContext,
    telemetrySpan: TelemetrySpan | null,
    startTime: number
  ): Promise<ErrorHandlingResult> {
    const statusCode = 400;
    const normalizedError = this.normalizeError(error);

    this.logger.warn("Request validation failed", {
      error: {
        code: normalizedError.code,
        message: normalizedError.message,
        details: normalizedError.details
      },
      request: {
        path: context.request.path,
        method: context.request.method
      }
    });

    // Track validation error for CLI dashboard
    await this.trackError(context, startTime, statusCode, error);

    // Finish telemetry span with error
    if (telemetrySpan) {
      TelemetryManagerProcessor.finishSpanError(telemetrySpan, statusCode, error);
    }

    return {
      response: new Response(
        JSON.stringify({
          error: {
            message: "Validation Error",
            code: "VALIDATION_ERROR",
            details: error.issues,
          },
          data: null,
        }),
        {
          status: statusCode,
          headers: { "Content-Type": "application/json" },
        }
      ),
      handled: true,
    };
  }

  /**
   * Handles IgniterError instances.
   *
   * @param error - The IgniterError instance
   * @param context - The processed context
   * @param telemetrySpan - The telemetry span for tracking
   * @param startTime - Request start time
   * @returns Standardized error response
   */
  static async handleIgniterError(
    error: IgniterError,
    context: ProcessedContext,
    telemetrySpan: TelemetrySpan | null,
    startTime: number
  ): Promise<ErrorHandlingResult> {
    const statusCode = 500;
    const normalizedError = this.normalizeError(error);

    this.logger.error("Igniter framework error", {
      error: {
        code: normalizedError.code,
        message: normalizedError.message,
        details: normalizedError.details
      },
      request: {
        path: context.request.path,
        method: context.request.method
      }
    });

    // Track igniter error for CLI dashboard
    await this.trackError(context, startTime, statusCode, error);

    // Finish telemetry span with error
    if (telemetrySpan) {
      TelemetryManagerProcessor.finishSpanError(telemetrySpan, statusCode, error);
    }

    return {
      response: new Response(
        JSON.stringify({
          error: {
            message: error.message,
            code: error.code,
            details: error.details,
          },
          data: null,
        }),
        {
          status: statusCode,
          headers: { "Content-Type": "application/json" },
        }
      ),
      handled: true,
    };
  }

  /**
   * Handles generic errors.
   *
   * @param error - The generic error
   * @param context - The processed context
   * @param telemetrySpan - The telemetry span for tracking
   * @param startTime - Request start time
   * @returns Standardized error response
   */
  static async handleGenericError(
    error: any,
    context: ProcessedContext,
    telemetrySpan: TelemetrySpan | null,
    startTime: number
  ): Promise<ErrorHandlingResult> {
    const statusCode = 500;
    const normalizedError = this.normalizeError(error);
    const errorMessage = normalizedError.message || "Internal Server Error";

    this.logger.error("Generic error occurred", {
      error: {
        code: normalizedError.code,
        message: errorMessage,
        stack: normalizedError.stack?.substring(0, 300) // Truncate stack
      },
      request: {
        path: context.request.path,
        method: context.request.method
      }
    });

    // Track generic error for CLI dashboard
    await this.trackError(context, startTime, statusCode, error as Error);

    // Finish telemetry span with error
    if (telemetrySpan) {
      TelemetryManagerProcessor.finishSpanError(telemetrySpan, statusCode, error as Error);
    }

    return {
      response: new Response(
        JSON.stringify({
          error: {
            message: errorMessage,
            code: "INTERNAL_SERVER_ERROR",
            details: process.env.NODE_ENV === "development" ? error : undefined,
          },
          data: null,
        }),
        {
          status: statusCode,
          headers: { "Content-Type": "application/json" },
        }
      ),
      handled: true,
    };
  }

  /**
   * Handles initialization errors that occur during context setup.
   *
   * @param error - The initialization error
   * @param context - The processed context (may be partial)
   * @param telemetrySpan - The telemetry span for tracking
   * @param startTime - Request start time
   * @returns Standardized error response
   */
  static async handleInitializationError(
    error: any,
    context: ProcessedContext | null,
    telemetrySpan: TelemetrySpan | null,
    startTime: number
  ): Promise<ErrorHandlingResult> {
    const statusCode = 500;
    const normalizedError = this.normalizeError(error);

    this.logger.error("Context initialization failed", {
      error: {
        code: normalizedError.code,
        message: normalizedError.message,
        stack: normalizedError.stack?.substring(0, 300)
      },
      request: {
        path: context?.request?.path,
        method: context?.request?.method
      }
    });

    // Clean up telemetry span if it exists
    if (telemetrySpan) {
      TelemetryManagerProcessor.cleanupSpan(telemetrySpan, statusCode, error as Error);
    }

    // Track initialization error (may not have full context)
    if (context) {
      await this.trackError(context, startTime, statusCode, error as Error);
    }

    return {
      response: new Response(
        JSON.stringify({
          error: {
            message: "Request initialization failed",
            code: "INITIALIZATION_ERROR",
            details:
              process.env.NODE_ENV === "development" ? error : undefined,
          },
          data: null,
        }),
        {
          status: statusCode,
          headers: { "Content-Type": "application/json" },
        }
      ),
      handled: true,
    };
  }

  /**
   * Determines the type of error and routes to appropriate handler.
   *
   * @param error - The error to classify and handle
   * @param context - The processed context
   * @param telemetrySpan - The telemetry span for tracking
   * @param startTime - Request start time
   * @returns Standardized error response
   */
  static async handleError(
    error: any,
    context: ProcessedContext,
    telemetrySpan: TelemetrySpan | null,
    startTime: number
  ): Promise<ErrorHandlingResult> {
    // Zod validation errors
    if (error && typeof error === "object" && "issues" in error && Array.isArray(error.issues)) {
      const zodError = {
        ...error,
        name: 'ZodValidationError',
        message: 'Request validation failed',
        code: 'VALIDATION_ERROR',
        details: error.issues
      };
      return this.handleValidationError(zodError, context, telemetrySpan, startTime);
    }

    // IgniterError instances
    if (error instanceof IgniterError) {
      return this.handleIgniterError(error, context, telemetrySpan, startTime);
    }

    // Generic errors
    return this.handleGenericError(error, context, telemetrySpan, startTime);
  }

  /**
   * Normalizes error objects to ensure they have the expected structure
   */
  private static normalizeError(error: any): {
    message: string;
    code?: string;
    details?: any;
    stack?: string;
    [key: string]: any;
  } {
    // Handle undefined/null
    if (error === null || error === undefined) {
      return {
        message: 'Unknown error occurred',
        code: 'UNKNOWN_ERROR',
        stack: new Error().stack
      };
    }

    // Handle string errors
    if (typeof error === 'string') {
      return {
        message: error,
        code: 'GENERIC_ERROR',
        stack: new Error(error).stack
      };
    }

    if (error instanceof IgniterError) {
      return {
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack,
      };
    }

    // Handle Error instances
    if (error instanceof Error) {
      return {
        ...error,
        message: error.message || 'Unknown error',
        code: (error as any).code || 'GENERIC_ERROR',
        stack: error.stack,
      };
    }

    // Handle objects with message property
    if (typeof error === 'object' && error !== null) {
      // Zod-like error
      if ("issues" in error && Array.isArray(error.issues)) {
        return {
          message: error.message || 'Validation failed',
          code: (error as any).code || 'VALIDATION_ERROR',
          stack: (error as any).stack || new Error().stack,
          details: (error as any).issues,
          ...error
        };
      }
      return {
        message: error.message || 'Object-based error',
        code: error.code || 'GENERIC_ERROR',
        stack: error.stack || new Error().stack,
        details: error.details || error,
        ...error
      };
    }

    // Fallback for any other type
    return {
      message: String(error),
      code: 'UNKNOWN_ERROR',
      stack: new Error().stack
    };
  }

  /**
   * Tracks errors for monitoring and debugging purposes
   */
  private static async trackError(
    context: ProcessedContext,
    startTime: number,
    statusCode: number,
    error: Error
  ): Promise<void> {
    try {
      // Skip if context is not available
      if (!context?.request) {
        this.logger.warn("Error tracking skipped", {
          reason: "request context missing"
        });
        return;
      }

      // Skip if tracking is disabled
      if (process.env.DISABLE_ERROR_TRACKING === 'true') {
        this.logger.debug("Error tracking disabled", {
          reason: "DISABLE_ERROR_TRACKING=true"
        });
        return;
      }

      // Extract request information
      const requestInfo = {
        path: context.request.path,
        method: context.request.method,
        // Headers can be large, only log keys
        header_keys: context.request.headers ? Array.from(context.request.headers.keys()) : [],
        has_body: !!context.request.body,
      };

      const normalizedError = this.normalizeError(error);

      // Log the error with context
      this.logger.debug("Error tracking completed", {
        error: {
          code: normalizedError.code,
          message: normalizedError.message,
        },
        request: requestInfo,
        statusCode,
        duration_ms: Date.now() - startTime,
      });

      // TODO: Implement actual error tracking integration
      // Example:
      // if (context.$plugins.errorTracker) {
      //   await context.$plugins.errorTracker.captureException(normalizedError, {
      //     extra: {
      //       request: requestInfo,
      //       statusCode,
      //       duration: Date.now() - startTime,
      //     }
      //   });
      // }
    } catch (trackingError) {
      // Use a fallback logger to avoid circular logging
      // This creates a minimal logger that bypasses telemetry to prevent infinite loops
      const fallbackLogger = IgniterConsoleLogger.create({
        level: IgniterLogLevel.ERROR,
        context: { component: 'ErrorHandler-Fallback' }
      });
      fallbackLogger.error('Error tracking system failure', { error: trackingError });
    }
  }
}
