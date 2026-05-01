import { IgniterError } from "../error";
import type { ProcessedContext } from "./context-builder.processor";
import type { IgniterLogger } from "../types";
import type { IgniterCoreTelemetryManager } from "../types/telemetry.interface";

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
  /**
   * Handles validation errors (e.g., Zod validation).
   *
   * @param error - The validation error
   * @param context - The processed context
   * @param startTime - Request start time
   * @param logger - Optional logger instance
   * @param telemetry - Optional telemetry manager for tracking
   * @returns Standardized error response
   */
  static async handleValidationError(
    error: any,
    context: ProcessedContext,
    startTime: number,
    logger?: IgniterLogger,
    telemetry?: IgniterCoreTelemetryManager | null,
  ): Promise<ErrorHandlingResult> {
    const childLogger = logger?.child("ErrorHandlerProcessor");

    const statusCode = 400;
    const normalizedError = this.normalizeError(error);

    // Log validation errors - essential for debugging
    childLogger?.warn("Request validation failed", {
      component: "ErrorHandler",
      code: normalizedError.code,
      message: normalizedError.message,
      path: context.request.path,
      method: context.request.method,
    });

    // Track validation error for CLI dashboard
    await this.trackError(
      context,
      startTime,
      statusCode,
      error,
      "validation",
      logger,
      telemetry,
    );

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
        },
      ),
      handled: true,
    };
  }

  /**
   * Handles IgniterError instances.
   *
   * @param error - The IgniterError instance
   * @param context - The processed context
   * @param startTime - Request start time
   * @param logger - Optional logger instance
   * @param telemetry - Optional telemetry manager for tracking
   * @returns Standardized error response
   */
  static async handleIgniterError(
    error: IgniterError,
    context: ProcessedContext,
    startTime: number,
    logger?: IgniterLogger,
    telemetry?: IgniterCoreTelemetryManager | null,
  ): Promise<ErrorHandlingResult> {
    const childLogger = logger?.child("ErrorHandlerProcessor");

    const normalizedError = this.normalizeError(error);

    // Log framework errors - essential for debugging
    childLogger?.error("Igniter framework error", {
      component: "ErrorHandler",
      code: normalizedError.code,
      message: normalizedError.message,
      path: context.request.path,
      method: context.request.method,
    });

    // Track igniter error for CLI dashboard
    await this.trackError(
      context,
      startTime,
      error.statusCode,
      error,
      "igniter",
      logger,
      telemetry,
    );

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
          status: error.statusCode,
          headers: { "Content-Type": "application/json" },
        },
      ),
      handled: true,
    };
  }

  /**
   * Handles generic errors.
   *
   * @param error - The generic error
   * @param context - The processed context
   * @param startTime - Request start time
   * @param logger - Optional logger instance
   * @param telemetry - Optional telemetry manager for tracking
   * @returns Standardized error response
   */
  static async handleGenericError(
    error: any,
    context: ProcessedContext,
    startTime: number,
    logger?: IgniterLogger,
    telemetry?: IgniterCoreTelemetryManager | null,
  ): Promise<ErrorHandlingResult> {
    const childLogger = logger?.child("ErrorHandlerProcessor");

    const statusCode = 500;
    const normalizedError = this.normalizeError(error);
    const errorMessage = normalizedError.message || "Internal Server Error";

    // Log generic errors - essential for debugging
    childLogger?.error("Unhandled error occurred", {
      component: "ErrorHandler",
      code: normalizedError.code,
      message: errorMessage,
      path: context.request.path,
      method: context.request.method,
      stack: normalizedError.stack,
    });

    // Track generic error for CLI dashboard
    await this.trackError(
      context,
      startTime,
      statusCode,
      error as Error,
      "generic",
      logger,
      telemetry,
    );

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
        },
      ),
      handled: true,
    };
  }

  /**
   * Handles initialization errors that occur during context setup.
   *
   * @param error - The initialization error
   * @param context - The processed context (may be partial)
   * @param startTime - Request start time
   * @param logger - Optional logger instance
   * @param telemetry - Optional telemetry manager for tracking
   * @returns Standardized error response
   */
  static async handleInitializationError(
    error: any,
    context: ProcessedContext | null,
    startTime: number,
    logger?: IgniterLogger,
    telemetry?: IgniterCoreTelemetryManager | null,
  ): Promise<ErrorHandlingResult> {
    const childLogger = logger?.child("ErrorHandlerProcessor");

    const statusCode = 500;
    const normalizedError = this.normalizeError(error);

    // Log initialization errors - critical for debugging startup issues
    childLogger?.error("Context initialization failed", {
      component: "ErrorHandler",
      code: normalizedError.code,
      message: normalizedError.message,
      path: context?.request?.path,
      method: context?.request?.method,
    });

    // Track initialization error (may not have full context)
    await this.trackError(
      context,
      startTime,
      statusCode,
      error as Error,
      "initialization",
      logger,
      telemetry,
    );

    return {
      response: new Response(
        JSON.stringify({
          error: {
            message: "Request initialization failed",
            code: "INITIALIZATION_ERROR",
            details: process.env.NODE_ENV === "development" ? error : undefined,
          },
          data: null,
        }),
        {
          status: statusCode,
          headers: { "Content-Type": "application/json" },
        },
      ),
      handled: true,
    };
  }

  /**
   * Determines the type of error and routes to appropriate handler.
   *
   * @param error - The error to classify and handle
   * @param context - The processed context
   * @param startTime - Request start time
   * @param logger - Optional logger instance
   * @param telemetry - Optional telemetry manager for tracking
   * @returns Standardized error response
   */
  static async handleError(
    error: any,
    context: ProcessedContext,
    startTime: number,
    logger?: IgniterLogger,
    telemetry?: IgniterCoreTelemetryManager | null,
  ): Promise<ErrorHandlingResult> {
    // Zod validation errors
    if (
      error &&
      typeof error === "object" &&
      "issues" in error &&
      Array.isArray(error.issues)
    ) {
      const zodError = {
        ...error,
        name: "ValidationError",
        message: "Request validation failed",
        code: "VALIDATION_ERROR",
        details: error.issues,
      };
      return this.handleValidationError(
        zodError,
        context,
        startTime,
        logger,
        telemetry,
      );
    }

    // IgniterError instances
    if (error instanceof IgniterError) {
      return this.handleIgniterError(
        error,
        context,
        startTime,
        logger,
        telemetry,
      );
    }

    // Generic errors
    return this.handleGenericError(
      error,
      context,
      startTime,
      logger,
      telemetry,
    );
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
        message: "Unknown error occurred",
        code: "UNKNOWN_ERROR",
        stack: new Error().stack,
      };
    }

    // Handle string errors
    if (typeof error === "string") {
      return {
        message: error,
        code: "GENERIC_ERROR",
        stack: new Error(error).stack,
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
        message: error.message || "Unknown error",
        code: (error as any).code || "GENERIC_ERROR",
        stack: error.stack,
      };
    }

    // Handle objects with message property
    if (typeof error === "object" && error !== null) {
      // Zod-like error
      if ("issues" in error && Array.isArray(error.issues)) {
        return {
          message: error.message || "Validation failed",
          code: (error as any).code || "VALIDATION_ERROR",
          stack: (error as any).stack || new Error().stack,
          details: (error as any).issues,
          ...error,
        };
      }
      return {
        message: error.message || "Object-based error",
        code: error.code || "GENERIC_ERROR",
        stack: error.stack || new Error().stack,
        details: error.details || error,
        ...error,
      };
    }

    // Fallback for any other type
    return {
      message: String(error),
      code: "UNKNOWN_ERROR",
      stack: new Error().stack,
    };
  }

  /**
   * Tracks errors for monitoring and debugging purposes
   */
  private static async trackError(
    context: ProcessedContext | null,
    startTime: number,
    statusCode: number,
    error: Error,
    errorType: "validation" | "igniter" | "generic" | "initialization" | "runtime",
    logger?: IgniterLogger,
    telemetry?: IgniterCoreTelemetryManager | null,
  ): Promise<void> {
    const childLogger = logger?.child("ErrorHandlerProcessor");

    try {
      // Skip if tracking is disabled
      if (process.env.DISABLE_ERROR_TRACKING === "true") {
        childLogger?.debug("Error tracking disabled", {
          reason: "DISABLE_ERROR_TRACKING=true",
        });
        return;
      }

      const normalizedError = this.normalizeError(error);

      telemetry?.emit("igniter.core.error.tracked", {
        level: "error",
        attributes: {
          "ctx.http.method": context?.request?.method,
          "ctx.http.path_key": context?.request?.path,
          "ctx.error.type": errorType,
          "ctx.error.code": normalizedError.code ?? "UNKNOWN_ERROR",
          "ctx.error.message": normalizedError.message,
          "ctx.error.status_code": statusCode,
          "ctx.error.component": "ErrorHandlerProcessor",
        },
      });

      // Skip if context is not available
      if (!context?.request) {
        childLogger?.warn("Error tracking limited", {
          reason: "request context missing",
        });
        return;
      }

      // Extract request information
      const requestInfo = {
        path: context.request.path,
        method: context.request.method,
        // Headers can be large, only log keys
        header_keys: context.request.headers
          ? Array.from(context.request.headers.keys())
          : [],
        has_body: !!context.request.body,
      };

      // Log the error with context
      childLogger?.debug("Error tracking completed", {
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
      //   await context.$plugins.errorTracker.captureException(error, {
      //     extra: {
      //       request: { path: requestInfo.path, method: requestInfo.method },
      //       statusCode,
      //       duration: Date.now() - startTime,
      //     }
      //   });
      // }
    } catch {
      // Silently fail error tracking to avoid cascading errors
    }
  }
}
