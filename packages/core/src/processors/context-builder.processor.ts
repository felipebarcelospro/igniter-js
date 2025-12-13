import { IgniterCookie } from "../services/cookie.service";
import { IgniterResponseProcessor } from "./response.processor";
import { BodyParserProcessor } from "./body-parser.processor";
import type { RequestProcessorConfig } from "../types/request.processor";
import type { IgniterRouter, IgniterLogger } from "../types";
import type { IgniterPluginManager } from "../services/plugin.service";
import type {
  IgniterTelemetryProvider,
  IgniterTelemetrySpan,
} from "../types/telemetry.interface";
import { TelemetryManagerProcessor } from "./telemetry-manager.processor";

/**
 * Represents the processed request data
 */
export interface ProcessedRequest extends Omit<
  Request,
  "path" | "method" | "params" | "headers" | "cookies" | "body" | "query"
> {
  path: string;
  method: string;
  params: Record<string, any>;
  headers: Headers;
  cookies: IgniterCookie;
  body: any;
  query: Record<string, string>;
  raw: Request;
}

/**
 * Represents the complete processed context
 */
export interface ProcessedContext<TContext = any, TPlugins = any> {
  request: ProcessedRequest;
  response: IgniterResponseProcessor<TContext>;
  $context: TContext;
  $plugins: TPlugins;
}

/**
 * Context builder processor for the Igniter Framework.
 * Handles the construction and enhancement of request contexts with telemetry integration.
 */
export class ContextBuilderProcessor {
  /**
   * Builds a complete processed context from a request and configuration.
   *
   * @param config - The router configuration
   * @param request - The incoming HTTP request
   * @param routeParams - Parameters extracted from the route
   * @param url - Parsed URL object
   * @param hasBodySchema - Whether the route has a body schema defined
   * @param logger - Optional logger instance
   * @param telemetry - Optional telemetry provider for metrics
   * @param parentSpan - Optional parent span for tracing
   * @returns Promise resolving to the processed context
   */
  static async build<TRouter extends IgniterRouter<any, any, any, any, any>>(
    config: RequestProcessorConfig<TRouter>,
    request: Request,
    routeParams: Record<string, any>,
    url: URL,
    hasBodySchema: boolean,
    logger?: IgniterLogger,
    telemetry?: IgniterTelemetryProvider | null,
    parentSpan?: IgniterTelemetrySpan,
  ): Promise<ProcessedContext> {
    const childLogger = logger?.child("ContextBuilderProcessor");
    const startTime = Date.now();

    // Create telemetry span for context building
    const span = TelemetryManagerProcessor.createContextBuildSpan(
      telemetry,
      parentSpan,
      logger,
    );

    childLogger?.debug("Context building started");

    // Build base context
    let contextValue = {};

    try {
      if (config?.context) {
        childLogger?.debug("Processing global context...");
        if (typeof config.context === "function") {
          contextValue = await Promise.resolve(config.context());
        } else {
          contextValue = config.context;
        }
        childLogger?.debug("Base context created");
      }
    } catch (error) {
      childLogger?.error("Base context creation failed", {
        component: "ContextBuilder",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // We can continue with an empty context
    }

    // Parse request components
    const cookies = new IgniterCookie(request.headers);
    const response = new IgniterResponseProcessor();

    let body = null;

    try {
      body = await BodyParserProcessor.parse(
        request,
        hasBodySchema,
        childLogger,
        telemetry,
        parentSpan,
      );
    } catch (error) {
      childLogger?.warn("Body parsing failed", {
        component: "ContextBuilder",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      body = null;
    }

    // Build processed request
    const processedRequest: ProcessedRequest = {
      ...request,
      path: url.pathname,
      method: request.method,
      params: routeParams,
      headers: request.headers,
      cookies: cookies,
      body: body,
      query: Object.fromEntries(url.searchParams),
      raw: request,
    };

    // Count plugins
    const pluginCount = config.plugins
      ? Object.keys(config.plugins).length
      : 0;

    // Build final context with proper structure
    const processedContext: ProcessedContext = {
      request: processedRequest,
      response: response,
      $context: contextValue,
      $plugins: config.plugins || {},
    };

    const duration = Date.now() - startTime;

    // Finish span with success
    TelemetryManagerProcessor.finishContextBuildSpan(
      span,
      pluginCount > 0,
      pluginCount,
      duration,
      logger,
    );

    // Record metrics
    TelemetryManagerProcessor.recordContextBuild(
      telemetry,
      duration,
      pluginCount,
      logger,
    );

    childLogger?.debug("Context built", {
      has_body: !!body,
      query_params: Object.keys(processedRequest.query),
      route_params: Object.keys(processedRequest.params),
      plugin_count: pluginCount,
      duration_ms: duration,
    });

    return processedContext;
  }

  /**
   * Enhances the context with plugin providers (store, logger, jobs, telemetry).
   * Safely injects providers while protecting against overwrites.
   *
   * @param context - The base processed context
   * @param pluginManager - Optional plugin manager for plugin proxy injection
   * @param logger - Optional logger instance
   * @param telemetry - Optional telemetry provider for metrics
   * @returns Enhanced context with plugin providers
   */
  static async enhanceWithPlugins(
    context: ProcessedContext,
    pluginManager?: IgniterPluginManager<any>,
    logger?: IgniterLogger,
    telemetry?: IgniterTelemetryProvider | null,
  ): Promise<ProcessedContext> {
    const childLogger = logger?.child("ContextBuilderProcessor");
    const startTime = Date.now();

    childLogger?.debug("Context enhancement started");

    const enhancedContext = { ...context.$context };
    const plugins = { ...context.$plugins };
    const injectedProviders: string[] = [];

    try {
      // Inject plugin proxies
      if (pluginManager) {
        try {
          const pluginProxies = this.injectPluginProxies(
            context,
            pluginManager,
            logger,
          );
          if (pluginProxies && Object.keys(pluginProxies).length > 0) {
            enhancedContext.plugins = pluginProxies;
            injectedProviders.push(
              `plugins (${Object.keys(pluginProxies).length})`,
            );
          }
        } catch (error) {
          logger?.error("Plugin proxy injection failed", {
            component: "ContextBuilder",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      const duration = Date.now() - startTime;
      const pluginCount = injectedProviders.length;

      // Record enhancement metrics
      if (telemetry) {
        telemetry.timing("context.enhancement.duration", duration, {
          has_plugins: (pluginCount > 0).toString(),
        });
      }

      if (injectedProviders.length > 0) {
        childLogger?.debug("Context enhanced", {
          providers: injectedProviders,
          duration_ms: duration,
        });
      } else {
        childLogger?.debug("No providers injected", { duration_ms: duration });
      }

      return {
        ...context,
        $context: enhancedContext,
        $plugins: plugins,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      childLogger?.error("Context enhancement failed", {
        component: "ContextBuilder",
        error: error instanceof Error ? error.message : "Unknown error",
        duration_ms: duration,
      });

      // Record error metric
      if (telemetry) {
        telemetry.increment("context.enhancement.errors", 1, {});
      }

      return {
        ...context,
        $context: enhancedContext,
        $plugins: plugins,
      };
    }
  }

  /**
   * Injects plugin proxies into the context for type-safe plugin access
   *
   * @param context - The base processed context
   * @param pluginManager - The plugin manager instance
   * @param logger - Optional logger instance
   * @returns Plugin proxies with context reference
   */
  private static injectPluginProxies(
    context: ProcessedContext,
    pluginManager: IgniterPluginManager<any>,
    logger?: IgniterLogger,
  ): Record<string, any> {
    const childLogger = logger?.child("BodyParserProcessor");

    childLogger?.debug("Injecting plugin proxies");
    const pluginProxies: Record<string, any> = {};

    try {
      // Validate plugin manager
      if (!pluginManager?.getAllPluginProxies) {
        childLogger?.warn("Plugin proxy injection skipped", {
          reason: "invalid plugin manager",
        });
        return {};
      }

      // Get all plugin proxies from the manager
      const allProxies = pluginManager.getAllPluginProxies();
      if (
        !allProxies ||
        typeof allProxies !== "object" ||
        Object.keys(allProxies).length === 0
      ) {
        childLogger?.debug("No plugin proxies found");
        return {};
      }

      // Update each proxy with current context and create final proxy
      for (const [pluginName, proxy] of Object.entries(allProxies)) {
        if (proxy && typeof proxy === "object") {
          try {
            // Update proxy context reference with safe type check
            const contextValue =
              typeof context.$context === "object" ? context.$context : {};
            proxy.context = contextValue;

            // Create enhanced proxy for the action context
            pluginProxies[pluginName] = {
              ...proxy,
              // Ensure emit method uses the plugin manager's store
              emit: async (event: string, payload: any) => {
                try {
                  const channel = `plugin:${pluginName}:${event}`;
                  childLogger?.debug("Plugin event emitted", {
                    plugin: pluginName,
                    event,
                    channel,
                  });
                  await pluginManager.emit(pluginName, event, payload);
                } catch (emitError) {
                  childLogger?.error("Plugin event emission failed", {
                    component: "ContextBuilder",
                    plugin: pluginName,
                    event,
                    error:
                      emitError instanceof Error
                        ? emitError.message
                        : "Unknown error",
                  });
                }
              },
            };
          } catch (proxyError) {
            childLogger?.error("Plugin proxy setup failed", {
              component: "ContextBuilder",
              plugin: pluginName,
              error:
                proxyError instanceof Error
                  ? proxyError.message
                  : "Unknown error",
            });
            // Continue with other plugins
          }
        }
      }

      const proxyCount = Object.keys(pluginProxies).length;
      if (proxyCount > 0) {
        childLogger?.debug("Plugin proxies injected", {
          count: proxyCount,
        });
      }
      return pluginProxies;
    } catch (error) {
      childLogger?.error("Plugin proxy injection failed", {
        component: "ContextBuilder",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {};
    }
  }
}
