import { findRoute, type RouterContext } from "rou3";
import { IgniterLogLevel, type IgniterAction, type IgniterLogger } from "../types";
import { IgniterConsoleLogger } from "../services/logger.service";
import { resolveLogLevel, createLoggerContext } from "../utils/logger";

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
 * Handles route finding and validation logic.
 */
export class RouteResolverProcessor {
  private static _logger: IgniterLogger;

  private static get logger(): IgniterLogger {
    if (!this._logger) {
      this._logger = IgniterConsoleLogger.create({
        level: resolveLogLevel(),
        context: createLoggerContext('RouteResolver'),
        showTimestamp: true,
      });
    }
    return this._logger;
  }
  /**
   * Resolves a route based on method and path.
   *
   * @param router - The router context containing registered routes
   * @param method - HTTP method (GET, POST, etc.)
   * @param path - URL path to resolve
   * @returns RouteResult with success status and route data or error
   */
  static resolve(
    router: RouterContext<IgniterAction<any, any, any, any, any, any, any, any, any, any>>,
    method: string,
    path: string
  ): RouteResult {
    this.logger.debug("Route resolution started", { method, path });
    // Validate path
    if (!path?.length) {
      this.logger.warn("Route resolution failed", { method, reason: "invalid path" });
      return {
        success: false,
        error: {
          status: 404,
          statusText: "Not Found - Empty path"
        }
      };
    }

    // Find route in router
    const route = findRoute(router, method, path);

    if (!route?.data) {
      this.logger.warn("Route not found", { method, path });
      return {
        success: false,
        error: {
          status: 404,
          statusText: "Not Found - Route not registered"
        }
      };
    }

    const finalParams = route.params ? JSON.parse(JSON.stringify(route.params)) : {};

    this.logger.debug("Route resolved", {
      method,
      path,
      params: finalParams
    });

    return {
      success: true,
      action: route.data as IgniterAction<any, any, any, any, any, any, any, any, any, any>,
      params: finalParams
    };
  }
}
