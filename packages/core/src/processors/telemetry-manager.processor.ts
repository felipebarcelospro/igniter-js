import { IgniterConsoleLogger } from "../services/logger.service";
import type { ProcessedContext } from "./context-builder.processor";
import { IgniterLogLevel, type IgniterLogger } from "../types";

/**
 * Telemetry span with tracking information
 */
export interface TelemetrySpan {
  span: any;
  startTime: number;
  context: ProcessedContext;
}

/**
 * Telemetry manager processor for the Igniter Framework.
 * Handles span creation, management, and metrics recording.
 */
export class TelemetryManagerProcessor {
  private static _logger: IgniterLogger;

  private static get logger(): IgniterLogger {
    if (!this._logger) {
      this._logger = IgniterConsoleLogger.create({
        level: process.env.IGNITER_LOG_LEVEL as IgniterLogLevel || IgniterLogLevel.INFO,
        context: {
          processor: 'RequestProcessor',
          component: 'Telemetry'
        },
        showTimestamp: true,
      });
    }
    return this._logger;
  }

  /**
   * Creates and starts a telemetry span for HTTP request tracking.
   *
   * @param request - The incoming HTTP request
   * @param context - The processed context
   * @param startTime - Request start timestamp
   * @returns TelemetrySpan object or null if telemetry unavailable
   */
  static createHttpSpan(
    request: Request,
    context: ProcessedContext,
    startTime: number
  ): TelemetrySpan | null {
    if (!context.$plugins.telemetry) {
      this.logger.debug("Telemetry plugin not available, skipping HTTP span creation.");
      return null;
    }

    try {
      this.logger.debug("Creating HTTP telemetry span...");
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
        }
      );

      // Enhance context with telemetry data
      context.$context = {
        ...context.$context,
        span: span,
        traceContext: span.getContext(),
      };

      this.logger.info(`HTTP span created successfully.`, { traceId: span.getContext()?.traceId });

      return {
        span,
        startTime,
        context
      };
    } catch (error) {
      this.logger.error(
        `Failed to create HTTP telemetry span.`, { error }
      );
      return null;
    }
  }

  /**
   * Finishes a telemetry span with success metrics.
   *
   * @param telemetrySpan - The telemetry span to finish
   * @param statusCode - HTTP status code
   */
  static finishSpanSuccess(
    telemetrySpan: TelemetrySpan,
    statusCode: number = 200
  ): void {
    if (!telemetrySpan) return;

    try {
      this.logger.debug("Finishing telemetry span with success status.");
      const duration = Date.now() - telemetrySpan.startTime;
      const { span, context } = telemetrySpan;

      span.setTag("http.status_code", statusCode);
      span.setTag("http.response_time_ms", duration);
      span.finish();

      // Record metrics
      if (context?.$plugins?.telemetry) {
        const telemetry = context.$plugins.telemetry;
        const request = context.request;

        this.logger.debug("Recording successful request metrics.", { duration, statusCode });
        telemetry.timing(
          "http.request.duration",
          duration,
          {
            method: request.method,
            status: statusCode.toString(),
            endpoint: request.path,
          }
        );

        telemetry.increment("http.requests.total", 1, {
          method: request.method,
          status: this.getStatusCategory(statusCode),
          result: 'success'
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to finish success telemetry span.`, { error }
      );
    }
  }

  /**
   * Finishes a telemetry span with error information.
   *
   * @param telemetrySpan - The telemetry span to finish
   * @param statusCode - HTTP error status code
   * @param error - The error that occurred
   */
  static finishSpanError(
    telemetrySpan: TelemetrySpan,
    statusCode: number,
    error: Error
  ): void {
    if (!telemetrySpan) return;

    try {
      this.logger.warn("Finishing telemetry span with error status.", { statusCode });
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

        this.logger.debug("Recording failed request metrics.", { duration, statusCode });
        telemetry.timing(
          "http.request.duration",
          duration,
          {
            method: request.method,
            status: statusCode.toString(),
            endpoint: request.path,
          }
        );

        telemetry.increment("http.requests.total", 1, {
          method: request.method,
          status: this.getStatusCategory(statusCode),
          result: 'error'
        });
      }
    } catch (telemetryError) {
      this.logger.error(
        `Failed to finish error telemetry span.`, { error: telemetryError }
      );
    }
  }

  /**
   * Safely cleans up a telemetry span in case of failures.
   *
   * @param telemetrySpan - The telemetry span to cleanup
   * @param statusCode - HTTP status code
   * @param error - Optional error that occurred
   */
  static cleanupSpan(
    telemetrySpan: TelemetrySpan | null,
    statusCode: number = 500,
    error?: Error
  ): void {
    if (!telemetrySpan) return;

    this.logger.warn("Cleaning up a potentially orphaned telemetry span.", { statusCode });
    try {
      const duration = Date.now() - telemetrySpan.startTime;
      const { span } = telemetrySpan;

      span.setTag("http.status_code", statusCode);
      span.setTag("http.response_time_ms", duration);

      if (error) {
        span.setError(error);
      }

      span.finish();
      this.logger.debug("Orphaned span has been finished.");
    } catch (cleanupError) {
      // Final fallback - log but don't throw
      this.logger.error(`A critical error occurred during telemetry span cleanup. The span may not be properly recorded.`, { error: cleanupError });
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
}
