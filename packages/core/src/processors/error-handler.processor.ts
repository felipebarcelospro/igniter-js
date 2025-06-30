import { IgniterLogLevel, type IgniterLogger } from "../types";
import { IgniterError } from "../error";
import type { ProcessedContext } from "./context-builder.processor";
import type { TelemetrySpan } from "./telemetry-manager.processor";
import { TelemetryManagerProcessor } from "./telemetry-manager.processor";
import { IgniterConsoleLogger } from "../services/logger.service";

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
  private static logger: IgniterLogger = IgniterConsoleLogger.create({
    level: process.env.NODE_ENV === 'production' ? IgniterLogLevel.INFO : IgniterLogLevel.DEBUG,
    context: {
      processor: 'ErrorHandlerProcessor',
      package: 'core'
    }
  })

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
    
    this.logger.error(
      `Validation error: ${JSON.stringify(error.issues)}`
    );

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
    
    this.logger.error(
      `IgniterError: ${error.message}`
    );

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
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    
    this.logger.error(
      `Generic error: ${errorMessage}`
    );

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
    
    this.logger.error(
      `Context initialization error: ${error}`
    );

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
    if (error && typeof error === "object" && "issues" in error) {
      return this.handleValidationError(error, context, telemetrySpan, startTime);
    }

    // IgniterError instances
    if (error instanceof IgniterError) {
      return this.handleIgniterError(error, context, telemetrySpan, startTime);
    }

    // Generic errors
    return this.handleGenericError(error, context, telemetrySpan, startTime);
  }

  /**
   * Tracks error for CLI dashboard (placeholder for request tracking).
   * 
   * @param context - The processed context
   * @param startTime - Request start time
   * @param statusCode - HTTP status code
   * @param error - The error that occurred
   */
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
        code: 'ERROR',
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
        code: (error as any).code || 'ERROR',
        stack: error.stack,
      };
    }

    // Handle objects with message property
    if (typeof error === 'object' && error !== null) {
      return {
        message: error.message || 'Unknown error',
        code: error.code || 'ERROR',
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
      if (!context) {
        this.logger.warn('Cannot track error: missing context');
        return;
      }

      // Skip if tracking is disabled
      if (process.env.DISABLE_ERROR_TRACKING === 'true') {
        return;
      }

      // Extract request information
      const requestInfo = {
        url: context?.request?.url,
        method: context?.request?.method,
        headers: context?.request?.headers ? Object.fromEntries(context.request.headers.entries()) : {},
        body: context?.request?.body ? '[REDACTED]' : undefined,
      };

      // Log the error with context
      this.logger.error('Error tracked', {
        error: this.normalizeError(error),
        statusCode,
        duration: Date.now() - startTime,
        request: requestInfo,
        timestamp: new Date().toISOString(),
      });

      // TODO: Implement actual error tracking integration
      // await ErrorTrackingService.track({
      //   error,
      //   request: requestInfo,
      //   statusCode,
      //   timestamp: new Date().toISOString(),
      //   duration: Date.now() - startTime,
      // });
    } catch (trackingError) {
      // Use console.error to avoid circular logging
      console.error('Failed to track error:', trackingError);
    }
  }
} 