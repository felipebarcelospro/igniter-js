import type { ProcessedContext } from "./context-builder.processor";
import type { IgniterLogger } from "../types";
import type {
  IgniterTelemetryProvider,
  IgniterTelemetrySpan,
} from "../types/telemetry.interface";

/**
 * Telemetry span with tracking information
 */
export interface TelemetrySpan {
  span: IgniterTelemetrySpan;
  startTime: number;
  context: ProcessedContext;
}

/**
 * Telemetry manager processor for the Igniter Framework.
 * Handles span creation, management, and metrics recording.
 */
export class TelemetryManagerProcessor {
  /**
   * Creates and starts a telemetry span for HTTP request tracking.
   *
   * @param request - The incoming HTTP request
   * @param context - The processed context
   * @param startTime - Request start timestamp
   * @param logger - Optional logger instance
   * @returns TelemetrySpan object or null if telemetry unavailable
   */
  static createHttpSpan(
    request: Request,
    context: ProcessedContext,
    startTime: number,
    logger?: IgniterLogger,
  ): TelemetrySpan | null {
    const childLogger = logger?.child("TelemetryManagerProcessor");

    if (!context.$plugins.telemetry) {
      childLogger?.debug("Telemetry unavailable");
      return null;
    }

    try {
      childLogger?.debug("HTTP span creating");
      const url = new URL(request.url);
      const span = context.$plugins.telemetry.startSpan(
        `HTTP ${request.method} ${url.pathname}`,
        {
          operation: "http",
          tags: {
            "http.method": request.method,
            "http.url": request.url,
            "http.user_agent": request.headers.get("user-agent") || "unknown",
            "http.path": url.pathname,
          },
        },
      );

      // Enhance context with telemetry data
      context.$context = {
        ...context.$context,
        span: span,
        traceContext: span.getContext(),
      };

      childLogger?.debug("HTTP span created", {
        traceId: span.getContext()?.traceId,
      });

      return {
        span,
        startTime,
        context,
      };
    } catch (error) {
      childLogger?.error("HTTP span creation failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  /**
   * Finishes a telemetry span with success metrics.
   *
   * @param telemetrySpan - The telemetry span to finish
   * @param statusCode - HTTP status code
   * @param logger - Optional logger instance
   */
  static finishSpanSuccess(
    telemetrySpan: TelemetrySpan,
    statusCode: number = 200,
    logger?: IgniterLogger,
  ): void {
    const childLogger = logger?.child("TelemetryManagerProcessor");

    if (!telemetrySpan) return;

    try {
      childLogger?.debug("Span finishing with success");
      const duration = Date.now() - telemetrySpan.startTime;
      const { span, context } = telemetrySpan;

      span.setTag("http.status_code", statusCode);
      span.setTag("http.response_time_ms", duration);
      span.finish();

      // Record metrics
      if (context?.$plugins?.telemetry) {
        const telemetry = context.$plugins.telemetry;
        const request = context.request;

        childLogger?.debug("Success metrics recorded", {
          duration,
          statusCode,
        });

        telemetry.timing("http.request.duration", duration, {
          method: request.method,
          status: statusCode.toString(),
          endpoint: request.path,
        });

        telemetry.increment("http.requests.total", 1, {
          method: request.method,
          status: this.getStatusCategory(statusCode),
          result: "success",
        });
      }
    } catch (error) {
      childLogger?.error("Success span finish failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Finishes a telemetry span with error information.
   *
   * @param telemetrySpan - The telemetry span to finish
   * @param statusCode - HTTP error status code
   * @param error - The error that occurred
   * @param logger - Optional logger instance
   */
  static finishSpanError(
    telemetrySpan: TelemetrySpan,
    statusCode: number,
    error: Error,
    logger?: IgniterLogger,
  ): void {
    const childLogger = logger?.child("TelemetryManagerProcessor");

    if (!telemetrySpan) return;

    try {
      logger?.warn("Span finishing with error", { statusCode });
      const duration = Date.now() - telemetrySpan.startTime;
      const { span, context } = telemetrySpan;

      span.setTag("http.status_code", statusCode);
      span.setTag("http.response_time_ms", duration);
      span.setError(error);
      span.finish();

      // Record error metrics
      if (context?.$plugins?.telemetry) {
        const telemetry = context.$plugins.telemetry;
        const request = context.request;

        childLogger?.debug("Error metrics recorded", { duration, statusCode });
        telemetry.timing("http.request.duration", duration, {
          method: request.method,
          status: statusCode.toString(),
          endpoint: request.path,
        });

        telemetry.increment("http.requests.total", 1, {
          method: request.method,
          status: this.getStatusCategory(statusCode),
          result: "error",
        });
      }
    } catch (telemetryError) {
      childLogger?.error("Error span finish failed", {
        component: "Telemetry",
        error:
          telemetryError instanceof Error
            ? telemetryError.message
            : "Unknown error",
      });
    }
  }

  /**
   * Safely cleans up a telemetry span in case of failures.
   *
   * @param telemetrySpan - The telemetry span to cleanup
   * @param statusCode - HTTP status code
   * @param error - Optional error that occurred
   * @param logger - Optional logger instance
   */
  static cleanupSpan(
    telemetrySpan: TelemetrySpan | null,
    statusCode: number = 500,
    error?: Error,
    logger?: IgniterLogger,
  ): void {
    if (!telemetrySpan) return;

    const childLogger = logger?.child("TelemetryManagerProcessor");

    logger?.warn("Orphaned span cleanup", { statusCode });
    try {
      const duration = Date.now() - telemetrySpan.startTime;
      const { span } = telemetrySpan;

      span.setTag("http.status_code", statusCode);
      span.setTag("http.response_time_ms", duration);

      if (error) {
        span.setError(error);
      }

      span.finish();
      childLogger?.debug("Orphaned span finished");
    } catch (cleanupError) {
      // Silently fail cleanup to avoid cascading errors
      childLogger?.error("Span cleanup failed", {
        component: "Telemetry",
        error:
          cleanupError instanceof Error
            ? cleanupError.message
            : "Unknown error",
      });
    }
  }

  /**
   * Gets the status category for metrics grouping.
   *
   * @param statusCode - HTTP status code
   * @returns Status category string (2xx, 4xx, 5xx)
   */
  private static getStatusCategory(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) return "2xx";
    if (statusCode >= 400 && statusCode < 500) return "4xx";
    if (statusCode >= 500) return "5xx";
    return "other";
  }

  // ==========================================
  // ROUTE RESOLUTION TELEMETRY
  // ==========================================

  /**
   * Creates a span for route resolution tracking.
   *
   * @param telemetry - The telemetry provider
   * @param method - HTTP method
   * @param path - Request path
   * @param parentSpan - Optional parent span for nesting
   * @param logger - Optional logger instance
   * @returns The created span or null
   */
  static createRouteResolutionSpan(
    telemetry: IgniterTelemetryProvider | null | undefined,
    method: string,
    path: string,
    parentSpan?: IgniterTelemetrySpan,
    logger?: IgniterLogger,
  ): IgniterTelemetrySpan | null {
    const childLogger = logger?.child("TelemetryManagerProcessor");

    if (!telemetry) {
      return null;
    }

    try {
      childLogger?.debug("Route resolution span creating");
      const span = telemetry.startSpan("route.resolution", {
        operation: "http",
        parent: parentSpan,
        tags: {
          "route.method": method,
          "route.path": path,
        },
      });

      return span;
    } catch (error) {
      childLogger?.error("Route resolution span creation failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  /**
   * Finishes a route resolution span with result data.
   *
   * @param span - The span to finish
   * @param matched - Whether the route was matched
   * @param paramsCount - Number of route parameters
   * @param duration - Duration in milliseconds
   * @param logger - Optional logger instance
   */
  static finishRouteResolutionSpan(
    span: IgniterTelemetrySpan | null | undefined,
    matched: boolean,
    paramsCount: number,
    duration: number,
    logger?: IgniterLogger,
  ): void {
    if (!span) return;

    const childLogger = logger?.child("TelemetryManagerProcessor");

    try {
      span.setTag("route.matched", matched);
      span.setTag("route.params_count", paramsCount);
      span.setTag("route.duration_ms", duration);
      span.finish();

      childLogger?.debug("Route resolution span finished", {
        matched,
        paramsCount,
        duration,
      });
    } catch (error) {
      childLogger?.error("Route resolution span finish failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Records route resolution metrics.
   *
   * @param telemetry - The telemetry provider
   * @param method - HTTP method
   * @param path - Request path
   * @param matched - Whether the route was matched
   * @param duration - Duration in milliseconds
   * @param logger - Optional logger instance
   */
  static recordRouteResolution(
    telemetry: IgniterTelemetryProvider | null | undefined,
    method: string,
    path: string,
    matched: boolean,
    duration: number,
    logger?: IgniterLogger,
  ): void {
    if (!telemetry) return;

    const childLogger = logger?.child("TelemetryManagerProcessor");

    try {
      telemetry.timing("route.resolution.duration", duration, {
        method,
        matched: matched.toString(),
      });

      telemetry.increment("route.resolution.total", 1, {
        method,
        result: matched ? "matched" : "not_found",
      });

      if (!matched) {
        telemetry.increment("route.not_found", 1, {
          method,
          path,
        });
      }

      childLogger?.debug("Route resolution metrics recorded", {
        method,
        matched,
        duration,
      });
    } catch (error) {
      childLogger?.error("Route resolution metrics failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ==========================================
  // BODY PARSING TELEMETRY
  // ==========================================

  /**
   * Creates a span for body parsing tracking.
   *
   * @param telemetry - The telemetry provider
   * @param contentType - Content-Type header value
   * @param hasSchema - Whether the route has a body schema
   * @param parentSpan - Optional parent span for nesting
   * @param logger - Optional logger instance
   * @returns The created span or null
   */
  static createBodyParsingSpan(
    telemetry: IgniterTelemetryProvider | null | undefined,
    contentType: string,
    hasSchema: boolean,
    parentSpan?: IgniterTelemetrySpan,
    logger?: IgniterLogger,
  ): IgniterTelemetrySpan | null {
    const childLogger = logger?.child("TelemetryManagerProcessor");

    if (!telemetry) {
      return null;
    }

    try {
      childLogger?.debug("Body parsing span creating");
      const span = telemetry.startSpan("body.parsing", {
        operation: "http",
        parent: parentSpan,
        tags: {
          "body.content_type": contentType || "unknown",
          "body.has_schema": hasSchema,
        },
      });

      return span;
    } catch (error) {
      childLogger?.error("Body parsing span creation failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  /**
   * Finishes a body parsing span with result data.
   *
   * @param span - The span to finish
   * @param success - Whether parsing succeeded
   * @param size - Body size in bytes
   * @param duration - Duration in milliseconds
   * @param logger - Optional logger instance
   */
  static finishBodyParsingSpan(
    span: IgniterTelemetrySpan | null | undefined,
    success: boolean,
    size: number,
    duration: number,
    logger?: IgniterLogger,
  ): void {
    if (!span) return;

    const childLogger = logger?.child("TelemetryManagerProcessor");

    try {
      span.setTag("body.success", success);
      span.setTag("body.size_bytes", size);
      span.setTag("body.duration_ms", duration);
      span.finish();

      childLogger?.debug("Body parsing span finished", {
        success,
        size,
        duration,
      });
    } catch (error) {
      childLogger?.error("Body parsing span finish failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Records body parsing metrics.
   *
   * @param telemetry - The telemetry provider
   * @param contentType - Content-Type header value
   * @param size - Body size in bytes
   * @param duration - Duration in milliseconds
   * @param success - Whether parsing succeeded
   * @param logger - Optional logger instance
   */
  static recordBodyParsing(
    telemetry: IgniterTelemetryProvider | null | undefined,
    contentType: string,
    size: number,
    duration: number,
    success: boolean,
    logger?: IgniterLogger,
  ): void {
    if (!telemetry) return;

    const childLogger = logger?.child("TelemetryManagerProcessor");

    try {
      telemetry.timing("body.parsing.duration", duration, {
        content_type: contentType || "unknown",
        success: success.toString(),
      });

      telemetry.histogram("body.size.bytes", size, {
        content_type: contentType || "unknown",
      });

      if (!success) {
        telemetry.increment("body.parsing.errors", 1, {
          content_type: contentType || "unknown",
        });
      }

      childLogger?.debug("Body parsing metrics recorded", {
        contentType,
        size,
        duration,
        success,
      });
    } catch (error) {
      childLogger?.error("Body parsing metrics failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ==========================================
  // MIDDLEWARE TELEMETRY
  // ==========================================

  /**
   * Creates a span for middleware execution tracking.
   *
   * @param telemetry - The telemetry provider
   * @param middlewareName - Name of the middleware
   * @param middlewareType - Type of middleware (global/action)
   * @param parentSpan - Optional parent span for nesting
   * @param logger - Optional logger instance
   * @returns The created span or null
   */
  static createMiddlewareSpan(
    telemetry: IgniterTelemetryProvider | null | undefined,
    middlewareName: string,
    middlewareType: "global" | "action",
    parentSpan?: IgniterTelemetrySpan,
    logger?: IgniterLogger,
  ): IgniterTelemetrySpan | null {
    const childLogger = logger?.child("TelemetryManagerProcessor");

    if (!telemetry) {
      return null;
    }

    try {
      childLogger?.debug("Middleware span creating", { middlewareName });
      const span = telemetry.startSpan(`middleware.${middlewareName}`, {
        operation: "middleware",
        parent: parentSpan,
        tags: {
          "middleware.name": middlewareName,
          "middleware.type": middlewareType,
        },
      });

      return span;
    } catch (error) {
      childLogger?.error("Middleware span creation failed", {
        component: "Telemetry",
        middlewareName,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  /**
   * Finishes a middleware span with result data.
   *
   * @param span - The span to finish
   * @param result - Result of middleware execution (success/early_return/error)
   * @param duration - Duration in milliseconds
   * @param error - Optional error that occurred
   * @param logger - Optional logger instance
   */
  static finishMiddlewareSpan(
    span: IgniterTelemetrySpan | null | undefined,
    result: "success" | "early_return" | "error",
    duration: number,
    error?: Error,
    logger?: IgniterLogger,
  ): void {
    if (!span) return;

    const childLogger = logger?.child("TelemetryManagerProcessor");

    try {
      span.setTag("middleware.result", result);
      span.setTag("middleware.duration_ms", duration);

      if (error) {
        span.setError(error);
      }

      span.finish();

      childLogger?.debug("Middleware span finished", {
        result,
        duration,
        hasError: !!error,
      });
    } catch (spanError) {
      childLogger?.error("Middleware span finish failed", {
        component: "Telemetry",
        error: spanError instanceof Error ? spanError.message : "Unknown error",
      });
    }
  }

  /**
   * Records middleware execution metrics.
   *
   * @param telemetry - The telemetry provider
   * @param middlewareName - Name of the middleware
   * @param middlewareType - Type of middleware (global/action)
   * @param duration - Duration in milliseconds
   * @param result - Result of execution
   * @param logger - Optional logger instance
   */
  static recordMiddlewareExecution(
    telemetry: IgniterTelemetryProvider | null | undefined,
    middlewareName: string,
    middlewareType: "global" | "action",
    duration: number,
    result: "success" | "early_return" | "error",
    logger?: IgniterLogger,
  ): void {
    if (!telemetry) return;

    const childLogger = logger?.child("TelemetryManagerProcessor");

    try {
      telemetry.timing("middleware.duration", duration, {
        name: middlewareName,
        type: middlewareType,
        result,
      });

      telemetry.increment("middleware.total", 1, {
        name: middlewareName,
        type: middlewareType,
        result,
      });

      if (result === "early_return") {
        telemetry.increment("middleware.early_returns", 1, {
          name: middlewareName,
          type: middlewareType,
        });
      }

      if (result === "error") {
        telemetry.increment("middleware.errors", 1, {
          name: middlewareName,
          type: middlewareType,
        });
      }

      childLogger?.debug("Middleware metrics recorded", {
        middlewareName,
        middlewareType,
        duration,
        result,
      });
    } catch (error) {
      childLogger?.error("Middleware metrics failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ==========================================
  // CONTEXT BUILD TELEMETRY
  // ==========================================

  /**
   * Creates a span for context building tracking.
   *
   * @param telemetry - The telemetry provider
   * @param parentSpan - Optional parent span for nesting
   * @param logger - Optional logger instance
   * @returns The created span or null
   */
  static createContextBuildSpan(
    telemetry: IgniterTelemetryProvider | null | undefined,
    parentSpan?: IgniterTelemetrySpan,
    logger?: IgniterLogger,
  ): IgniterTelemetrySpan | null {
    const childLogger = logger?.child("TelemetryManagerProcessor");

    if (!telemetry) {
      return null;
    }

    try {
      childLogger?.debug("Context build span creating");
      const span = telemetry.startSpan("context.build", {
        operation: "http",
        parent: parentSpan,
        tags: {},
      });

      return span;
    } catch (error) {
      childLogger?.error("Context build span creation failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  /**
   * Finishes a context build span with result data.
   *
   * @param span - The span to finish
   * @param hasPlugins - Whether plugins were injected
   * @param pluginCount - Number of plugins injected
   * @param duration - Duration in milliseconds
   * @param logger - Optional logger instance
   */
  static finishContextBuildSpan(
    span: IgniterTelemetrySpan | null | undefined,
    hasPlugins: boolean,
    pluginCount: number,
    duration: number,
    logger?: IgniterLogger,
  ): void {
    if (!span) return;

    const childLogger = logger?.child("TelemetryManagerProcessor");

    try {
      span.setTag("context.has_plugins", hasPlugins);
      span.setTag("context.plugin_count", pluginCount);
      span.setTag("context.duration_ms", duration);
      span.finish();

      childLogger?.debug("Context build span finished", {
        hasPlugins,
        pluginCount,
        duration,
      });
    } catch (error) {
      childLogger?.error("Context build span finish failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Records context building metrics.
   *
   * @param telemetry - The telemetry provider
   * @param duration - Duration in milliseconds
   * @param pluginCount - Number of plugins injected
   * @param logger - Optional logger instance
   */
  static recordContextBuild(
    telemetry: IgniterTelemetryProvider | null | undefined,
    duration: number,
    pluginCount: number,
    logger?: IgniterLogger,
  ): void {
    if (!telemetry) return;

    const childLogger = logger?.child("TelemetryManagerProcessor");

    try {
      telemetry.timing("context.build.duration", duration, {
        has_plugins: (pluginCount > 0).toString(),
      });

      telemetry.gauge("context.plugins.injected", pluginCount, {});

      childLogger?.debug("Context build metrics recorded", {
        duration,
        pluginCount,
      });
    } catch (error) {
      childLogger?.error("Context build metrics failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ==========================================
  // SSE TELEMETRY
  // ==========================================

  /**
   * Creates a span for SSE connection tracking.
   *
   * @param telemetry - The telemetry provider
   * @param channelId - The SSE channel ID
   * @param channels - List of subscribed channels
   * @param parentSpan - Optional parent span for nesting
   * @param logger - Optional logger instance
   * @returns The created span or null
   */
  static createSSESpan(
    telemetry: IgniterTelemetryProvider | null | undefined,
    channelId: string,
    channels: string[],
    parentSpan?: IgniterTelemetrySpan,
    logger?: IgniterLogger,
  ): IgniterTelemetrySpan | null {
    const childLogger = logger?.child("TelemetryManagerProcessor");

    if (!telemetry) {
      return null;
    }

    try {
      childLogger?.debug("SSE span creating", { channelId });
      const span = telemetry.startSpan("sse.connection", {
        operation: "http",
        parent: parentSpan,
        tags: {
          "sse.channel_id": channelId,
          "sse.channels": channels.join(","),
          "sse.channel_count": channels.length,
        },
      });

      return span;
    } catch (error) {
      childLogger?.error("SSE span creation failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  /**
   * Records SSE connection metrics.
   *
   * @param telemetry - The telemetry provider
   * @param channelId - The SSE channel ID
   * @param action - The action performed (connect/disconnect)
   * @param activeConnections - Current number of active connections
   * @param logger - Optional logger instance
   */
  static recordSSEConnection(
    telemetry: IgniterTelemetryProvider | null | undefined,
    channelId: string,
    action: "connect" | "disconnect",
    activeConnections: number,
    logger?: IgniterLogger,
  ): void {
    if (!telemetry) return;

    const childLogger = logger?.child("TelemetryManagerProcessor");

    try {
      telemetry.increment("sse.connections.total", 1, {
        channel: channelId,
        action,
      });

      telemetry.gauge("sse.connections.active", activeConnections, {
        channel: channelId,
      });

      childLogger?.debug("SSE connection metrics recorded", {
        channelId,
        action,
        activeConnections,
      });
    } catch (error) {
      childLogger?.error("SSE connection metrics failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Records SSE event metrics.
   *
   * @param telemetry - The telemetry provider
   * @param channelId - The SSE channel ID
   * @param eventType - Type of event (message/keepalive/etc)
   * @param recipientCount - Number of recipients for the event
   * @param logger - Optional logger instance
   */
  static recordSSEEvent(
    telemetry: IgniterTelemetryProvider | null | undefined,
    channelId: string,
    eventType: string,
    recipientCount: number,
    logger?: IgniterLogger,
  ): void {
    if (!telemetry) return;

    const childLogger = logger?.child("TelemetryManagerProcessor");

    try {
      telemetry.increment("sse.events.published", 1, {
        channel: channelId,
        event_type: eventType,
      });

      telemetry.histogram("sse.events.recipients", recipientCount, {
        channel: channelId,
        event_type: eventType,
      });

      childLogger?.debug("SSE event metrics recorded", {
        channelId,
        eventType,
        recipientCount,
      });
    } catch (error) {
      childLogger?.error("SSE event metrics failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ==========================================
  // RESPONSE PROCESSING TELEMETRY
  // ==========================================

  /**
   * Creates a span for response processing tracking.
   *
   * @param telemetry - The telemetry provider
   * @param parentSpan - Optional parent span for nesting
   * @param logger - Optional logger instance
   * @returns The created span or null
   */
  static createResponseProcessingSpan(
    telemetry: IgniterTelemetryProvider | null | undefined,
    parentSpan?: IgniterTelemetrySpan,
    logger?: IgniterLogger,
  ): IgniterTelemetrySpan | null {
    const childLogger = logger?.child("TelemetryManagerProcessor");

    if (!telemetry) {
      return null;
    }

    try {
      childLogger?.debug("Response processing span creating");
      const span = telemetry.startSpan("response.processing", {
        operation: "http",
        parent: parentSpan,
        tags: {},
      });

      return span;
    } catch (error) {
      childLogger?.error("Response processing span creation failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  /**
   * Finishes a response processing span with result data.
   *
   * @param span - The span to finish
   * @param responseType - Type of response (json/stream/redirect/etc)
   * @param statusCode - HTTP status code
   * @param size - Response size in bytes
   * @param duration - Duration in milliseconds
   * @param logger - Optional logger instance
   */
  static finishResponseProcessingSpan(
    span: IgniterTelemetrySpan | null | undefined,
    responseType: string,
    statusCode: number,
    size: number,
    duration: number,
    logger?: IgniterLogger,
  ): void {
    if (!span) return;

    const childLogger = logger?.child("TelemetryManagerProcessor");

    try {
      span.setTag("response.type", responseType);
      span.setTag("response.status_code", statusCode);
      span.setTag("response.size_bytes", size);
      span.setTag("response.duration_ms", duration);
      span.finish();

      childLogger?.debug("Response processing span finished", {
        responseType,
        statusCode,
        size,
        duration,
      });
    } catch (error) {
      childLogger?.error("Response processing span finish failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Records response processing metrics.
   *
   * @param telemetry - The telemetry provider
   * @param responseType - Type of response (json/stream/redirect/etc)
   * @param statusCode - HTTP status code
   * @param size - Response size in bytes
   * @param logger - Optional logger instance
   */
  static recordResponseProcessing(
    telemetry: IgniterTelemetryProvider | null | undefined,
    responseType: string,
    statusCode: number,
    size: number,
    logger?: IgniterLogger,
  ): void {
    if (!telemetry) return;

    const childLogger = logger?.child("TelemetryManagerProcessor");

    try {
      telemetry.histogram("response.size.bytes", size, {
        type: responseType,
        status: statusCode.toString(),
      });

      telemetry.increment("response.total", 1, {
        type: responseType,
        status_category: this.getStatusCategory(statusCode),
      });

      if (responseType === "stream") {
        telemetry.increment("response.stream.created", 1, {});
      }

      childLogger?.debug("Response processing metrics recorded", {
        responseType,
        statusCode,
        size,
      });
    } catch (error) {
      childLogger?.error("Response processing metrics failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ==========================================
  // VALIDATION TELEMETRY
  // ==========================================

  /**
   * Records validation result metrics.
   *
   * @param telemetry - The telemetry provider
   * @param validationType - Type of validation (body/query/params)
   * @param success - Whether validation succeeded
   * @param errorCount - Number of validation errors
   * @param logger - Optional logger instance
   */
  static recordValidation(
    telemetry: IgniterTelemetryProvider | null | undefined,
    validationType: "body" | "query" | "params",
    success: boolean,
    errorCount: number,
    logger?: IgniterLogger,
  ): void {
    if (!telemetry) return;

    const childLogger = logger?.child("TelemetryManagerProcessor");

    try {
      telemetry.increment("validation.total", 1, {
        type: validationType,
        result: success ? "success" : "failed",
      });

      if (!success) {
        telemetry.increment("validation.errors", errorCount, {
          type: validationType,
        });
      }

      childLogger?.debug("Validation metrics recorded", {
        validationType,
        success,
        errorCount,
      });
    } catch (error) {
      childLogger?.error("Validation metrics failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ==========================================
  // CACHE TELEMETRY
  // ==========================================

  /**
   * Records cache operation metrics.
   *
   * @param telemetry - The telemetry provider
   * @param operation - Cache operation type (get/set/delete)
   * @param hit - Whether it was a cache hit (for get operations)
   * @param key - Cache key (optional, for debugging)
   * @param logger - Optional logger instance
   */
  static recordCacheOperation(
    telemetry: IgniterTelemetryProvider | null | undefined,
    operation: "get" | "set" | "delete",
    hit: boolean,
    key?: string,
    logger?: IgniterLogger,
  ): void {
    if (!telemetry) return;

    const childLogger = logger?.child("TelemetryManagerProcessor");

    try {
      telemetry.increment("cache.operations", 1, {
        operation,
      });

      if (operation === "get") {
        telemetry.increment("cache.hits", hit ? 1 : 0, {});
        telemetry.increment("cache.misses", hit ? 0 : 1, {});
      }

      childLogger?.debug("Cache operation metrics recorded", {
        operation,
        hit,
        key: key ? key.substring(0, 50) : undefined,
      });
    } catch (error) {
      childLogger?.error("Cache operation metrics failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ==========================================
  // ERROR TELEMETRY
  // ==========================================

  /**
   * Records error metrics by type.
   *
   * @param telemetry - The telemetry provider
   * @param errorType - Type of error (validation/igniter/generic/initialization)
   * @param errorCode - Error code
   * @param endpoint - Request endpoint
   * @param logger - Optional logger instance
   */
  static recordError(
    telemetry: IgniterTelemetryProvider | null | undefined,
    errorType: "validation" | "igniter" | "generic" | "initialization",
    errorCode: string,
    endpoint: string,
    logger?: IgniterLogger,
  ): void {
    if (!telemetry) return;

    const childLogger = logger?.child("TelemetryManagerProcessor");

    try {
      telemetry.increment("errors.total", 1, {
        type: errorType,
        code: errorCode,
        endpoint,
      });

      childLogger?.debug("Error metrics recorded", {
        errorType,
        errorCode,
        endpoint,
      });
    } catch (error) {
      childLogger?.error("Error metrics recording failed", {
        component: "Telemetry",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ==========================================
  // UTILITY: GET TELEMETRY FROM CONTEXT
  // ==========================================

  /**
   * Safely extracts telemetry provider from context.
   *
   * @param context - The processed context
   * @returns The telemetry provider or null
   */
  static getTelemetry(
    context: ProcessedContext | null,
  ): IgniterTelemetryProvider | null {
    return context?.$plugins?.telemetry || null;
  }

  /**
   * Safely extracts active span from context.
   *
   * @param context - The processed context
   * @returns The active span or null
   */
  static getActiveSpan(
    context: ProcessedContext | null,
  ): IgniterTelemetrySpan | null {
    return context?.$context?.span || null;
  }
}
