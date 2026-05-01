import { findRoute, type RouterContext } from "rou3";
import type { IgniterAction, IgniterLogger } from "../types";
import type { IgniterCoreTelemetryManager } from "../types/telemetry.interface";

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
   * @returns RouteResult with success status and route data or error
   */
  static resolve(
    router: RouterContext<
      IgniterAction<any, any, any, any, any, any, any, any, any, any>
    >,
    method: string,
    path: string,
    logger?: IgniterLogger,
    telemetry?: IgniterCoreTelemetryManager | null,
  ): RouteResult {
    const childLogger = logger?.child("RouteResolverProcessor");
    const startTime = Date.now();
    const pathDepth = path ? path.split("/").filter(Boolean).length : 0;

    telemetry?.emit("igniter.core.route.resolve.started", {
      level: "debug",
      attributes: {
        "ctx.route.method": method,
        "ctx.route.path_depth": pathDepth,
      },
    });

    childLogger?.debug("Route resolution started", { method, path });

    try {
      // Validate path
      if (!path?.length) {
        childLogger?.warn("Route resolution failed", {
          component: "RouteResolver",
          method,
          reason: "invalid path",
        });

        const duration = Date.now() - startTime;

        telemetry?.emit("igniter.core.route.resolve.not_found", {
          level: "debug",
          attributes: {
            "ctx.route.method": method,
            "ctx.route.path_depth": pathDepth,
            "ctx.route.duration_ms": duration,
          },
        });

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

        telemetry?.emit("igniter.core.route.resolve.not_found", {
          level: "debug",
          attributes: {
            "ctx.route.method": method,
            "ctx.route.path_depth": pathDepth,
            "ctx.route.duration_ms": duration,
          },
        });

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

      const pathKey = route.data.$meta?.pathKey ?? path;

      telemetry?.emit("igniter.core.route.resolve.success", {
        level: "debug",
        attributes: {
          "ctx.route.method": method,
          "ctx.route.path_key": pathKey,
          "ctx.route.params_count": paramsCount,
          "ctx.route.duration_ms": duration,
        },
      });

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
    } catch (error) {
      const duration = Date.now() - startTime;

      childLogger?.error("Route resolution failed", {
        component: "RouteResolver",
        method,
        path,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      telemetry?.emit("igniter.core.route.resolve.error", {
        level: "error",
        attributes: {
          "ctx.route.method": method,
          "ctx.route.path_depth": pathDepth,
          "ctx.route.duration_ms": duration,
          "ctx.error.type": "runtime",
          "ctx.error.code":
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: string }).code
              ? String((error as { code?: string }).code)
              : "ROUTE_RESOLVE_ERROR",
          "ctx.error.message":
            error instanceof Error ? error.message : "Route resolve failed",
          "ctx.error.component": "RouteResolverProcessor",
        },
      });

      throw error;
    }
  }
}
