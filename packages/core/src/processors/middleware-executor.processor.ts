import { IgniterResponseProcessor } from "./response.processor";
import { IgniterLogLevel, type IgniterLogger, type IgniterProcedure } from "../types";
import type { ProcessedContext } from "./context-builder.processor";
import { IgniterConsoleLogger } from "../services/logger.service";
import type { IgniterProcedureContext } from "../types/procedure.interface";
import { IgniterCookie } from "../services/cookie.service";

/**
 * Result of middleware execution pipeline
 */
export interface MiddlewareExecutionResult {
  success: boolean;
  earlyReturn?: Response;
  updatedContext: ProcessedContext;
}

/**
 * Middleware executor processor for the Igniter Framework.
 * Handles execution of global and action-specific middlewares.
 */
export class MiddlewareExecutorProcessor {
  private static logger: IgniterLogger = IgniterConsoleLogger.create({
    level: process.env.NODE_ENV === 'production' ? IgniterLogLevel.INFO : IgniterLogLevel.DEBUG,
    context: {
      processor: 'MiddlewareExecutorProcessor',
      package: 'core'
    }
  })

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

    for (const middleware of middlewares) {
      this.logger.debug(
        `Executing global middleware: ${middleware.name}`
      );

      // Validate middleware has handler
      if (!middleware.handler || typeof middleware.handler !== "function") {
        this.logger.warn(
          `Middleware ${middleware.name} has no valid handler`
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
            `Global middleware returned early response`
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
            `Global middleware returned early response processor`
          );
          return {
            success: false,
            earlyReturn: await result.toResponse(),
            updatedContext
          };
        }

        // Safely merge middleware result
        if (result && typeof result === "object" && !Array.isArray(result)) {
          updatedContext = this.mergeContextSafely(updatedContext, result, middleware.name);
        }
      } catch (error) {
        this.logger.error(
          `Error in global middleware ${middleware.name}: ${error}`
        );
        throw error;
      }
    }

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

    for (const middleware of middlewares) {

      this.logger.debug(
        `Executing action middleware: ${middleware.name}`
      );

      // Validate middleware has handler
      if (!middleware.handler || typeof middleware.handler !== "function") {
        this.logger.warn(
          `Action middleware ${middleware.name} has no valid handler`
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
            `Action middleware returned early response`
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
            `Action middleware returned early response processor`
          );
          return {
            success: false,
            earlyReturn: await result.toResponse(),
            updatedContext
          };
        }

        // Safely merge middleware result
        if (result && typeof result === "object" && !Array.isArray(result)) {
          updatedContext = this.mergeContextSafely(updatedContext, result, middleware.name);
        }
      } catch (error) {
        this.logger.error(
          `Error in action middleware ${middleware.name}: ${error}`
        );
        throw error;
      }
    }

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
   * @returns Properly structured procedure context
   */
  private static buildProcedureContext(context: ProcessedContext): IgniterProcedureContext<any> {

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
      // Create a fallback cookies instance if missing
      procedureRequest.cookies = new IgniterCookie(procedureRequest.headers);
    }

    // Build the complete procedure context
    const procedureContext: IgniterProcedureContext<any> = {
      request: procedureRequest,
      context: context.$context || {}, // Use $context, not the full context
      response: context.response || new IgniterResponseProcessor()
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