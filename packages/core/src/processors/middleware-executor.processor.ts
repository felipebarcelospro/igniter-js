import { IgniterResponseProcessor } from "./response.processor";
import { IgniterLogLevel, type IgniterLogger, type IgniterProcedure } from "../types";
import type { ProcessedContext } from "./context-builder.processor";
import { IgniterConsoleLogger } from "../services/logger.service";
import type { IgniterProcedureContext } from "../types/procedure.interface";
import { IgniterCookie } from "../services/cookie.service";
import { resolveLogLevel, createLoggerContext } from "../utils/logger";
import type { NextFunction, NextState } from "../types/next.interface";

/**
 * Result of middleware execution pipeline
 */
export interface MiddlewareExecutionResult {
  success: boolean;
  earlyReturn?: Response;
  updatedContext: ProcessedContext;
  error?: Error;
  customResult?: any;
}

/**
 * Middleware executor processor for the Igniter Framework.
 * Handles execution of global and action-specific middlewares.
 */
export class MiddlewareExecutorProcessor {
  private static _logger: IgniterLogger;

  private static get logger(): IgniterLogger {
    if (!this._logger) {
      this._logger = IgniterConsoleLogger.create({
        level: resolveLogLevel(),
        context: createLoggerContext('MiddlewareExecutor'),
        showTimestamp: true,
      });
    }
    return this._logger;
  }

  /**
   * Executes global middlewares in sequence.
   * Protects core providers from being overwritten.
   *
   * @param context - The processed context
   * @param middlewares - Array of global middlewares to execute
   * @returns Promise resolving to execution result
   */
  static async executeGlobal(
    context: ProcessedContext,
    middlewares: IgniterProcedure<any, any, any>[]
  ): Promise<MiddlewareExecutionResult> {
    let updatedContext = { ...context };

    if (middlewares.length === 0) {
      this.logger.debug("Global middleware skipped", { reason: "no middlewares" });
      return { success: true, updatedContext };
    }

    this.logger.debug("Global middleware started", { count: middlewares.length });

    for (let i = 0; i < middlewares.length; i++) {
      const middleware = middlewares[i];
      const middlewareName = middleware.name || 'anonymous';
      this.logger.debug(
        "Middleware executing",
        { middlewareName }
      );

      // Validate middleware has handler
      if (!middleware.handler || typeof middleware.handler !== "function") {
        this.logger.warn(
          "Middleware handler invalid",
          { middlewareName, reason: "missing or not a function" }
        );
        continue;
      }

      try {
        // Create next state for this middleware
        const nextState: NextState = {
          called: false,
          error: undefined,
          result: null,
          skipRemaining: false,
          metadata: {},
          skip: false,
          stop: false
        };

        // Build proper procedure context with next function
        const procedureContext = this.buildProcedureContext(updatedContext, nextState);

        // @ts-expect-error - Its correct
        const result = await middleware.handler(procedureContext);

        // Handle next() function calls
        if (nextState.called) {
          if (nextState.error) {
            this.logger.error(
              "Middleware next() called with error",
              { middlewareName, error: nextState.error }
            );
            return {
              success: false,
              error: nextState.error,
              updatedContext
            };
          }

          if (nextState.result !== null) {
            this.logger.debug(
              "Middleware next() called with custom result",
              { middlewareName }
            );
            return {
              success: false,
              customResult: nextState.result,
              updatedContext
            };
          }

          if (nextState.stop) {
            this.logger.debug(
              "Middleware next() called with stop",
              { middlewareName }
            );
            return {
              success: true,
              updatedContext
            };
          }

          if (nextState.skip) {
            this.logger.debug(
              "Middleware next() called with skip",
              { middlewareName }
            );
            continue;
          }
        }

        // Check for early return (Response)
        if (result instanceof Response) {
          this.logger.debug(
            "Middleware early return",
            { middlewareName, type: "Response" }
          );
          return {
            success: false,
            earlyReturn: result,
            updatedContext
          };
        }

        // Check for early return (ResponseProcessor)
        if (result instanceof IgniterResponseProcessor) {
          this.logger.debug(
            "Middleware early return",
            { middlewareName, type: "ResponseProcessor" }
          );
          return {
            success: false,
            earlyReturn: await result.toResponse(),
            updatedContext
          };
        }

        // Safely merge middleware result
        if (result && typeof result === "object" && !Array.isArray(result)) {
          const previousKeys = Object.keys(updatedContext.$context);
          updatedContext = this.mergeContextSafely(updatedContext, result, middlewareName);
          const newKeys = Object.keys(updatedContext.$context).filter(k => !previousKeys.includes(k));
          if (newKeys.length > 0) {
            this.logger.debug("Context updated", { middlewareName, newKeys });
          }
        }
      } catch (error) {
        this.logger.error(
          "Middleware execution failed",
          { middlewareName, error }
        );
        throw error; // Re-throw to be caught by the main processor
      }
    }

    this.logger.debug("Global middleware completed", { count: middlewares.length });
    return {
      success: true,
      updatedContext
    };
  }

  /**
   * Executes action-specific middlewares in sequence.
   * Uses the same protection logic as global middlewares.
   *
   * @param context - The processed context
   * @param middlewares - Array of action-specific middlewares to execute
   * @returns Promise resolving to execution result
   */
  static async executeAction(
    context: ProcessedContext,
    middlewares: IgniterProcedure<any, any, any>[]
  ): Promise<MiddlewareExecutionResult> {
    let updatedContext = { ...context };

    if (middlewares.length === 0) {
      this.logger.debug("Action middleware skipped", { reason: "no middlewares" });
      return { success: true, updatedContext };
    }

    this.logger.debug("Action middleware started", { count: middlewares.length });

    for (const middleware of middlewares) {
      const middlewareName = middleware.name || 'anonymous';
      this.logger.debug(
        "Middleware executing",
        { middlewareName }
      );

      // Validate middleware has handler
      if (!middleware.handler || typeof middleware.handler !== "function") {
        this.logger.warn(
          "Middleware handler invalid",
          { middlewareName, reason: "missing or not a function" }
        );
        continue;
      }

      try {
        // Build proper procedure context
        const procedureContext = this.buildProcedureContext(updatedContext);

        // @ts-expect-error - Its correct
        const result = await middleware.handler(procedureContext);

        // Check for early return (Response)
        if (result instanceof Response) {
          this.logger.debug(
            "Middleware early return",
            { middlewareName, type: "Response" }
          );
          return {
            success: false,
            earlyReturn: result,
            updatedContext
          };
        }

        // Check for early return (ResponseProcessor)
        if (result instanceof IgniterResponseProcessor) {
          this.logger.debug(
            "Middleware early return",
            { middlewareName, type: "ResponseProcessor" }
          );
          return {
            success: false,
            earlyReturn: await result.toResponse(),
            updatedContext
          };
        }

        // Safely merge middleware result
        if (result && typeof result === "object" && !Array.isArray(result)) {
          const previousKeys = Object.keys(updatedContext.$context);
          updatedContext = this.mergeContextSafely(updatedContext, result, middlewareName);
          const newKeys = Object.keys(updatedContext.$context).filter(k => !previousKeys.includes(k));
          if (newKeys.length > 0) {
            this.logger.debug("Context updated", { middlewareName, newKeys });
          }
        }
      } catch (error) {
        this.logger.error(
          "Middleware execution failed",
          { middlewareName, error }
        );
        throw error; // Re-throw to be caught by the main processor
      }
    }

    this.logger.debug("Action middleware completed", { count: middlewares.length });
    return {
      success: true,
      updatedContext
    };
  }

  /**
   * Builds the correct procedure context from ProcessedContext.
   * Maps ProcessedRequest to the format expected by IgniterProcedureContext.
   *
   * @param context - The processed context
   * @param nextState - Optional next state for middleware control flow
   * @returns Properly structured procedure context
   */
  private static buildProcedureContext(
    context: ProcessedContext, 
    nextState?: NextState
  ): IgniterProcedureContext<any> {
    // Extract and validate required components
    const processedRequest = context.request;

    if (!processedRequest) {
      throw new Error('Request is missing from processed context');
    }

    // Map ProcessedRequest to IgniterProcedureContext.request structure
    const procedureRequest = {
      path: processedRequest.path || '',
      params: processedRequest.params || {},
      body: processedRequest.body || null,
      query: processedRequest.query || {},
      method: processedRequest.method as any,
      headers: processedRequest.headers || new Headers(),
      cookies: processedRequest.cookies
    };

    // Validate cookies specifically (this was the source of the bug)
    if (!procedureRequest.cookies) {
      this.logger.warn("Cookies missing", { action: "creating fallback instance" });
      // Create a fallback cookies instance if missing
      procedureRequest.cookies = new IgniterCookie(procedureRequest.headers);
    }

    // Create next function
    const next: NextFunction = (error?: Error, result?: any, options?: any) => {
      if (nextState) {
        nextState.called = true;
        nextState.error = error;
        nextState.result = result || null;
        nextState.skip = options?.skip || false;
        nextState.stop = options?.stop || false;
      }
    };

    // Build the complete procedure context
    const procedureContext: IgniterProcedureContext<any> = {
      request: procedureRequest,
      context: context.$context || {}, // Use $context, not the full context
      response: context.response || new IgniterResponseProcessor(),
      next
    };

    return procedureContext;
  }

  /**
   * Safely merges middleware result into context, protecting core providers.
   *
   * @param context - Current context
   * @param result - Result from middleware execution
   * @param middlewareName - Name of the middleware for logging
   * @returns Updated context with safe merge
   */
  private static mergeContextSafely(
    context: ProcessedContext,
    result: Record<string, any>,
    middlewareName: string
  ): ProcessedContext {
    const protectedKeys = [
      "store",
      "logger",
      "jobs",
      "telemetry",
      "span",
      "traceContext",
    ];

    const safeResult: Record<string, any> = {};

    for (const [key, value] of Object.entries(result)) {
      if (!protectedKeys.includes(key)) {
        safeResult[key] = value;
      } else {
        this.logger.warn("Protected key overwrite prevented", { middlewareName, key });
      }
    }

    return {
      ...context,
      $context: {
        ...context.$context,
        ...safeResult,
      },
    };
  }
}
