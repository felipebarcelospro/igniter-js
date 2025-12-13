import { findRoute, type RouterContext } from "rou3";
import type { IgniterAction, IgniterLogger } from "../types";
import type {
  IgniterTelemetryProvider,
  IgniterTelemetrySpan,
} from "../types/telemetry.interface";
import { TelemetryManagerProcessor } from "./telemetry-manager.processor";

/**
 * Handles route resolution for HTTP requests.
 * Encapsulates the logic for finding and validating routes.
 */
export interface RouteResult {
  success: boolean;
  action?: IgniterAction<any, any, any, any, any, any, any, any, any, any>;
  params?: Record<string, string>;
  error?: {
    status: number;
    statusText: string;
  };
}

/**
 * Route resolver processor for the Igniter Framework.
 * Handles route finding and validation logic with telemetry integration.
 */
export class RouteResolverProcessor {
  /**
   * Resolves a route based on method and path.
   *
   * @param router - The router context containing registered routes
   * @param method - HTTP method (GET, POST, etc.)
   * @param path - URL path to resolve
   * @param logger - Optional logger instance
   * @param telemetry - Optional telemetry provider for metrics
   * @param parentSpan - Optional parent span for tracing
   * @returns RouteResult with success status and route data or error
   */
  static resolve(
    router: RouterContext<
      IgniterAction<any, any, any, any, any, any, any, any, any, any>
    >,
    method: string,
    path: string,
    logger?: IgniterLogger,
    telemetry?: IgniterTelemetryProvider | null,
    parentSpan?: IgniterTelemetrySpan,
  ): RouteResult {
    const childLogger = logger?.child("RouteResolverProcessor");
    const startTime = Date.now();

    // Create telemetry span for route resolution
    const span = TelemetryManagerProcessor.createRouteResolutionSpan(
      telemetry,
      method,
      path,
      parentSpan,
      logger,
    );

    childLogger?.debug("Route resolution started", { method, path });

    // Validate path
    if (!path?.length) {
      childLogger?.warn("Route resolution failed", {
        component: "RouteResolver",
        method,
        reason: "invalid path",
      });

      const duration = Date.now() - startTime;

      // Finish span with failure
      TelemetryManagerProcessor.finishRouteResolutionSpan(
        span,
        false,
        0,
        duration,
        logger,
      );

      // Record route resolution metrics
      TelemetryManagerProcessor.recordRouteResolution(
        telemetry,
        method,
        path || "empty",
        false,
        duration,
        logger,
      );

      return {
        success: false,
        error: {
          status: 404,
          statusText: "Not Found - Empty path",
        },
      };
    }

    // Find route in router
    const route = findRoute(router, method, path);

    if (!route?.data) {
      childLogger?.warn("Route not found", {
        component: "RouteResolver",
        method,
        path,
      });

      const duration = Date.now() - startTime;

      // Finish span with not found
      TelemetryManagerProcessor.finishRouteResolutionSpan(
        span,
        false,
        0,
        duration,
        logger,
      );

      // Record route resolution metrics
      TelemetryManagerProcessor.recordRouteResolution(
        telemetry,
        method,
        path,
        false,
        duration,
        logger,
      );

      return {
        success: false,
        error: {
          status: 404,
          statusText: "Not Found - Route not registered",
        },
      };
    }

    const finalParams = route.params
      ? JSON.parse(JSON.stringify(route.params))
      : {};

    const duration = Date.now() - startTime;
    const paramsCount = Object.keys(finalParams).length;

    // Finish span with success
    TelemetryManagerProcessor.finishRouteResolutionSpan(
      span,
      true,
      paramsCount,
      duration,
      logger,
    );

    // Record route resolution metrics
    TelemetryManagerProcessor.recordRouteResolution(
      telemetry,
      method,
      path,
      true,
      duration,
      logger,
    );

    childLogger?.debug("Route resolved", {
      method,
      path,
      params: finalParams,
      duration_ms: duration,
    });

    return {
      success: true,
      action: route.data as IgniterAction<
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any
      >,
      params: finalParams,
    };
  }
}
