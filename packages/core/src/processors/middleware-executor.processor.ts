import { IgniterResponseProcessor } from "./response.processor";
import type { IgniterProcedure, IgniterLogger } from "../types";
import type { ProcessedContext } from "./context-builder.processor";
import type { IgniterProcedureContext } from "../types/procedure.interface";
import { IgniterCookie } from "../services/cookie.service";
import type { NextFunction, NextState } from "../types/next.interface";
import type { IgniterCoreTelemetryManager } from "../types/telemetry.interface";

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
 * Handles execution of global and action-specific middlewares with telemetry integration.
 */
export class MiddlewareExecutorProcessor {
  /**
   * Executes global middlewares in sequence.
   * Protects core providers from being overwritten.
   *
   * @param context - The processed context
   * @param middlewares - Array of global middlewares to execute
   * @param logger - Optional logger instance
   * @param telemetry - Optional telemetry provider for metrics
   * @returns Promise resolving to execution result
   */
  static async executeGlobal(
    context: ProcessedContext,
    middlewares: IgniterProcedure<unknown, unknown, unknown>[],
    logger?: IgniterLogger,
    telemetry?: IgniterCoreTelemetryManager | null,
  ): Promise<MiddlewareExecutionResult> {
    const childLogger = logger?.child("MiddlewareExecutorProcessor");

    let updatedContext = { ...context };

    if (middlewares.length === 0) {
      childLogger?.debug("Global middleware skipped", {
        reason: "no middlewares",
      });
      return { success: true, updatedContext };
    }

    childLogger?.debug("Global middleware started", {
      count: middlewares.length,
    });

    for (let i = 0; i < middlewares.length; i++) {
      const middleware = middlewares[i];
      const middlewareName = middleware.name || `anonymous_${i}`;
      const middlewareStartTime = Date.now();
      const baseAttributes = {
        "ctx.middleware.name": middlewareName,
        "ctx.middleware.type": "global" as const,
        "ctx.middleware.index": i,
      };

      childLogger?.debug("Middleware executing", { middlewareName });

      telemetry?.emit("igniter.core.middleware.execute.started", {
        level: "debug",
        attributes: baseAttributes,
      });

      // Validate middleware has handler
      if (!middleware.handler || typeof middleware.handler !== "function") {
        childLogger?.warn("Middleware handler invalid", {
          component: "MiddlewareExecutor",
          middlewareName,
          reason: "missing or not a function",
        });

        const duration = Date.now() - middlewareStartTime;
        telemetry?.emit("igniter.core.middleware.execute.error", {
          level: "error",
          attributes: {
            ...baseAttributes,
            "ctx.middleware.duration_ms": duration,
            "ctx.error.type": "runtime",
            "ctx.error.code": "MIDDLEWARE_HANDLER_INVALID",
            "ctx.error.message": "Invalid middleware handler",
            "ctx.error.component": "MiddlewareExecutorProcessor",
          },
        });

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
          stop: false,
        };

        // Build proper procedure context with next function
        const procedureContext = this.buildProcedureContext(
          updatedContext,
          nextState,
          logger,
        );

        // @ts-expect-error - Its correct
        const result = await middleware.handler(procedureContext);

        const duration = Date.now() - middlewareStartTime;

        // Handle next() function calls
        if (nextState.called) {
          if (nextState.error) {
            childLogger?.error("Middleware next() called with error", {
              component: "MiddlewareExecutor",
              middlewareName,
              error: nextState.error.message,
            });

            telemetry?.emit("igniter.core.middleware.execute.error", {
              level: "error",
              attributes: {
                ...baseAttributes,
                "ctx.middleware.duration_ms": duration,
                "ctx.error.type": "runtime",
                "ctx.error.code": "MIDDLEWARE_NEXT_ERROR",
                "ctx.error.message": nextState.error.message,
                "ctx.error.component": "MiddlewareExecutorProcessor",
              },
            });

            return {
              success: false,
              error: nextState.error,
              updatedContext,
            };
          }

          if (nextState.result !== null) {
            childLogger?.debug("Middleware next() called with custom result", {
              middlewareName,
            });

            const responseInfo = this.getEarlyReturnInfo(nextState.result);
            telemetry?.emit("igniter.core.middleware.execute.early_return", {
              level: "debug",
              attributes: {
                ...baseAttributes,
                "ctx.middleware.duration_ms": duration,
                "ctx.response.type": responseInfo.type,
                "ctx.response.status_code": responseInfo.status,
              },
            });

            return {
              success: false,
              customResult: nextState.result,
              updatedContext,
            };
          }

          if (nextState.stop) {
            childLogger?.debug("Middleware next() called with stop", {
              middlewareName,
            });

            telemetry?.emit("igniter.core.middleware.execute.success", {
              level: "debug",
              attributes: {
                ...baseAttributes,
                "ctx.middleware.duration_ms": duration,
              },
            });

            return {
              success: true,
              updatedContext,
            };
          }

          if (nextState.skip) {
            childLogger?.debug("Middleware next() called with skip", {
              middlewareName,
            });

            telemetry?.emit("igniter.core.middleware.execute.success", {
              level: "debug",
              attributes: {
                ...baseAttributes,
                "ctx.middleware.duration_ms": duration,
              },
            });

            continue;
          }
        }

        // Check for early return (Response)
        if (result instanceof Response) {
          childLogger?.debug("Middleware early return", {
            middlewareName,
            type: "Response",
          });

          telemetry?.emit("igniter.core.middleware.execute.early_return", {
            level: "debug",
            attributes: {
              ...baseAttributes,
              "ctx.middleware.duration_ms": duration,
              "ctx.response.type": "response",
              "ctx.response.status_code": result.status,
            },
          });

          return {
            success: false,
            earlyReturn: result,
            updatedContext,
          };
        }

        // Check for early return (ResponseProcessor)
        if (result instanceof IgniterResponseProcessor) {
          childLogger?.debug("Middleware early return", {
            middlewareName,
            type: "ResponseProcessor",
          });

          telemetry?.emit("igniter.core.middleware.execute.early_return", {
            level: "debug",
            attributes: {
              ...baseAttributes,
              "ctx.middleware.duration_ms": duration,
              "ctx.response.type": "processor",
            },
          });

          return {
            success: false,
            earlyReturn: await result.toResponse(),
            updatedContext,
          };
        }

        // Safely merge middleware result
        if (result && typeof result === "object" && !Array.isArray(result)) {
          const previousKeys = Object.keys(updatedContext.$context);
          updatedContext = this.mergeContextSafely(
            updatedContext,
            result,
            middlewareName,
            logger,
          );
          const newKeys = Object.keys(updatedContext.$context).filter(
            (k) => !previousKeys.includes(k),
          );
          if (newKeys.length > 0) {
            childLogger?.debug("Context updated", { middlewareName, newKeys });
          }
        }

        telemetry?.emit("igniter.core.middleware.execute.success", {
          level: "debug",
          attributes: {
            ...baseAttributes,
            "ctx.middleware.duration_ms": duration,
          },
        });
      } catch (error) {
        const duration = Date.now() - middlewareStartTime;

        childLogger?.error("Middleware execution failed", {
          component: "MiddlewareExecutor",
          middlewareName,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        telemetry?.emit("igniter.core.middleware.execute.error", {
          level: "error",
          attributes: {
            ...baseAttributes,
            "ctx.middleware.duration_ms": duration,
            "ctx.error.type": "runtime",
            "ctx.error.code": "MIDDLEWARE_EXECUTION_ERROR",
            "ctx.error.message":
              error instanceof Error ? error.message : "Unknown error",
            "ctx.error.component": "MiddlewareExecutorProcessor",
          },
        });

        throw error; // Re-throw to be caught by the main processor
      }
    }

    childLogger?.debug("Global middleware completed", {
      count: middlewares.length,
    });
    return {
      success: true,
      updatedContext,
    };
  }

  /**
   * Executes action-specific middlewares in sequence.
   * Uses the same protection logic as global middlewares.
   *
   * @param context - The processed context
   * @param middlewares - Array of action-specific middlewares to execute
   * @param logger - Optional logger instance
   * @param telemetry - Optional telemetry provider for metrics
   * @returns Promise resolving to execution result
   */
  static async executeAction(
    context: ProcessedContext,
    middlewares: IgniterProcedure<unknown, unknown, unknown>[],
    logger?: IgniterLogger,
    telemetry?: IgniterCoreTelemetryManager | null,
  ): Promise<MiddlewareExecutionResult> {
    const childLogger = logger?.child("MiddlewareExecutorProcessor");

    let updatedContext = { ...context };

    if (middlewares.length === 0) {
      childLogger?.debug("Action middleware skipped", {
        reason: "no middlewares",
      });
      return { success: true, updatedContext };
    }

    childLogger?.debug("Action middleware started", {
      count: middlewares.length,
    });

    let index = 0;
    for (const middleware of middlewares) {
      const middlewareName = middleware.name || `anonymous_${index}`;
      const middlewareStartTime = Date.now();
      const baseAttributes = {
        "ctx.middleware.name": middlewareName,
        "ctx.middleware.type": "action" as const,
        "ctx.middleware.index": index,
      };

      childLogger?.debug("Middleware executing", { middlewareName });

      telemetry?.emit("igniter.core.middleware.execute.started", {
        level: "debug",
        attributes: baseAttributes,
      });

      // Validate middleware has handler
      if (!middleware.handler || typeof middleware.handler !== "function") {
        childLogger?.warn("Middleware handler invalid", {
          component: "MiddlewareExecutor",
          middlewareName,
          reason: "missing or not a function",
        });

        const duration = Date.now() - middlewareStartTime;
        telemetry?.emit("igniter.core.middleware.execute.error", {
          level: "error",
          attributes: {
            ...baseAttributes,
            "ctx.middleware.duration_ms": duration,
            "ctx.error.type": "runtime",
            "ctx.error.code": "MIDDLEWARE_HANDLER_INVALID",
            "ctx.error.message": "Invalid middleware handler",
            "ctx.error.component": "MiddlewareExecutorProcessor",
          },
        });

        index++;
        continue;
      }

      try {
        // Build proper procedure context
        const procedureContext = this.buildProcedureContext(
          updatedContext,
          undefined,
          logger,
        );

        // @ts-expect-error - Its correct
        const result = await middleware.handler(procedureContext);

        const duration = Date.now() - middlewareStartTime;

        // Check for early return (Response)
        if (result instanceof Response) {
          childLogger?.debug("Middleware early return", {
            middlewareName,
            type: "Response",
          });

          telemetry?.emit("igniter.core.middleware.execute.early_return", {
            level: "debug",
            attributes: {
              ...baseAttributes,
              "ctx.middleware.duration_ms": duration,
              "ctx.response.type": "response",
              "ctx.response.status_code": result.status,
            },
          });

          return {
            success: false,
            earlyReturn: result,
            updatedContext,
          };
        }

        // Check for early return (ResponseProcessor)
        if (result instanceof IgniterResponseProcessor) {
          childLogger?.debug("Middleware early return", {
            middlewareName,
            type: "ResponseProcessor",
          });

          telemetry?.emit("igniter.core.middleware.execute.early_return", {
            level: "debug",
            attributes: {
              ...baseAttributes,
              "ctx.middleware.duration_ms": duration,
              "ctx.response.type": "processor",
            },
          });

          return {
            success: false,
            earlyReturn: await result.toResponse(),
            updatedContext,
          };
        }

        // Safely merge middleware result
        if (result && typeof result === "object" && !Array.isArray(result)) {
          const previousKeys = Object.keys(updatedContext.$context);
          updatedContext = this.mergeContextSafely(
            updatedContext,
            result,
            middlewareName,
            logger,
          );
          const newKeys = Object.keys(updatedContext.$context).filter(
            (k) => !previousKeys.includes(k),
          );
          if (newKeys.length > 0) {
            childLogger?.debug("Context updated", { middlewareName, newKeys });
          }
        }

        telemetry?.emit("igniter.core.middleware.execute.success", {
          level: "debug",
          attributes: {
            ...baseAttributes,
            "ctx.middleware.duration_ms": duration,
          },
        });
      } catch (error) {
        const duration = Date.now() - middlewareStartTime;

        childLogger?.error("Middleware execution failed", {
          component: "MiddlewareExecutor",
          middlewareName,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        telemetry?.emit("igniter.core.middleware.execute.error", {
          level: "error",
          attributes: {
            ...baseAttributes,
            "ctx.middleware.duration_ms": duration,
            "ctx.error.type": "runtime",
            "ctx.error.code": "MIDDLEWARE_EXECUTION_ERROR",
            "ctx.error.message":
              error instanceof Error ? error.message : "Unknown error",
            "ctx.error.component": "MiddlewareExecutorProcessor",
          },
        });

        throw error; // Re-throw to be caught by the main processor
      }

      index++;
    }

    childLogger?.debug("Action middleware completed", {
      count: middlewares.length,
    });

    return {
      success: true,
      updatedContext,
    };
  }

  private static getEarlyReturnInfo(
    result: unknown,
  ): { type?: string; status?: number } {
    if (result instanceof Response) {
      return { type: "response", status: result.status };
    }

    if (result instanceof IgniterResponseProcessor) {
      return { type: "processor" };
    }

    return { type: typeof result };
  }

  /**
   * Builds the correct procedure context from ProcessedContext.
   * Maps ProcessedRequest to the format expected by IgniterProcedureContext.
   *
   * @param context - The processed context
   * @param nextState - Optional next state for middleware control flow
   * @param logger - Optional logger instance
   * @returns Properly structured procedure context
   */
  private static buildProcedureContext(
    context: ProcessedContext,
    nextState?: NextState,
    logger?: IgniterLogger,
  ): IgniterProcedureContext<any> {
    const childLogger = logger?.child("MiddlewareExecutorProcessor");

    // Extract and validate required components
    const processedRequest = context.request;

    if (!processedRequest) {
      throw new Error("Request is missing from processed context");
    }

    // Map ProcessedRequest to IgniterProcedureContext.request structure
    const procedureRequest = {
      path: processedRequest.path || "",
      params: processedRequest.params || {},
      body: processedRequest.body || null,
      query: processedRequest.query || {},
      method: processedRequest.method as any,
      headers: processedRequest.headers || new Headers(),
      cookies: processedRequest.cookies,
    };

    // Validate cookies specifically (this was the source of the bug)
    if (!procedureRequest.cookies) {
      childLogger?.warn("Cookies missing", {
        action: "creating fallback instance",
      });
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
      next,
    };

    return procedureContext;
  }

  /**
   * Safely merges middleware result into context, protecting core providers.
   *
   * @param context - Current context
   * @param result - Result from middleware execution
   * @param middlewareName - Name of the middleware for logging
   * @param logger - Optional logger instance
   * @returns Updated context with safe merge
   */
  private static mergeContextSafely(
    context: ProcessedContext,
    result: Record<string, any>,
    middlewareName: string,
    logger?: IgniterLogger,
  ): ProcessedContext {
    const childLogger = logger?.child("MiddlewareExecutorProcessor");

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
        childLogger?.warn("Protected key overwrite prevented", {
          component: "MiddlewareExecutor",
          middlewareName,
          key,
        });
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
