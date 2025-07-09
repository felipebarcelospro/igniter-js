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
  private static _logger: IgniterLogger;

  private static get logger(): IgniterLogger {
    if (!this._logger) {
      this._logger = IgniterConsoleLogger.create({
        level: process.env.IGNITER_LOG_LEVEL as IgniterLogLevel || IgniterLogLevel.INFO,
        context: {
          processor: 'RequestProcessor',
          component: 'MiddlewareExecutor'
        },
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
      this.logger.debug("No global middlewares to execute.");
      return { success: true, updatedContext };
    }

    this.logger.debug(`Executing ${middlewares.length} global middleware(s)...`);

    for (const middleware of middlewares) {
      const middlewareName = middleware.name || 'anonymous';
      this.logger.debug(
        `Executing global middleware: '${middlewareName}'`
      );

      // Validate middleware has handler
      if (!middleware.handler || typeof middleware.handler !== "function") {
        this.logger.warn(
          `Global middleware '${middlewareName}' is missing a valid handler. Skipping.`
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
          this.logger.info(
            `Global middleware '${middlewareName}' returned an early response.`
          );
          return {
            success: false,
            earlyReturn: result,
            updatedContext
          };
        }

        // Check for early return (ResponseProcessor)
        if (result instanceof IgniterResponseProcessor) {
          this.logger.info(
            `Global middleware '${middlewareName}' returned an early response processor.`
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
            this.logger.debug(`Context updated by '${middlewareName}' with new keys: [${newKeys.join(', ')}]`);
          }
        }
      } catch (error) {
        this.logger.error(
          `Error executing global middleware '${middlewareName}'.`, { error }
        );
        throw error; // Re-throw to be caught by the main processor
      }
    }

    this.logger.debug("All global middlewares executed successfully.");
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
      this.logger.debug("No action-specific middlewares to execute.");
      return { success: true, updatedContext };
    }

    this.logger.debug(`Executing ${middlewares.length} action middleware(s)...`);

    for (const middleware of middlewares) {
      const middlewareName = middleware.name || 'anonymous';
      this.logger.debug(
        `Executing action middleware: '${middlewareName}'`
      );

      // Validate middleware has handler
      if (!middleware.handler || typeof middleware.handler !== "function") {
        this.logger.warn(
          `Action middleware '${middlewareName}' is missing a valid handler. Skipping.`
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
          this.logger.info(
            `Action middleware '${middlewareName}' returned an early response.`
          );
          return {
            success: false,
            earlyReturn: result,
            updatedContext
          };
        }

        // Check for early return (ResponseProcessor)
        if (result instanceof IgniterResponseProcessor) {
          this.logger.info(
            `Action middleware '${middlewareName}' returned an early response processor.`
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
            this.logger.debug(`Context updated by '${middlewareName}' with new keys: [${newKeys.join(', ')}]`);
          }
        }
      } catch (error) {
        this.logger.error(
          `Error executing action middleware '${middlewareName}'.`, { error }
        );
        throw error; // Re-throw to be caught by the main processor
      }
    }

    this.logger.debug("All action middlewares executed successfully.");
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
      this.logger.warn("Cookies object was missing in procedure context. Creating a fallback instance. This might indicate an issue in the context building process.");
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
      } else {
        this.logger.warn(`Middleware '${middlewareName}' attempted to overwrite protected context key: '${key}'. This was prevented.`);
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
