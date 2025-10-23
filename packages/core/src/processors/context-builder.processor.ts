import { IgniterCookie } from "../services/cookie.service";
import { IgniterResponseProcessor } from "./response.processor";
import { BodyParserProcessor } from "./body-parser.processor";
import type { RequestProcessorConfig } from "../types/request.processor";
import { type IgniterLogger, type IgniterRouter } from "../types";
import { IgniterConsoleLogger } from "../services/logger.service";
import type { IgniterPluginManager } from "../services/plugin.service";
import { resolveLogLevel, createLoggerContext } from "../utils/logger";

/**
 * Represents the processed request data
 */
export interface ProcessedRequest extends Omit<Request, 'path' | 'method' | 'params' | 'headers' | 'cookies' | 'body' | 'query'> {
  path: string;
  method: string;
  params: Record<string, any>;
  headers: Headers;
  cookies: IgniterCookie;
  body: any;
  query: Record<string, string>;
  raw: Request;
};

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
 * Handles the construction and enhancement of request contexts.
 */
export class ContextBuilderProcessor {
  private static _logger: IgniterLogger;

  private static get logger(): IgniterLogger {
    if (!this._logger) {
      this._logger = IgniterConsoleLogger.create({
        level: resolveLogLevel(),
        context: createLoggerContext('ContextBuilder'),
        showTimestamp: true,
      });
    }
    return this._logger;
  }

  /**
   * Builds a complete processed context from a request and configuration.
   *
   * @param request - The incoming HTTP request
   * @param config - The router configuration
   * @param routeParams - Parameters extracted from the route
   * @param url - Parsed URL object
   * @returns Promise resolving to the processed context
   */
  static async build<TRouter extends IgniterRouter<any, any, any, any, any>>(
    config: RequestProcessorConfig<TRouter>,
    request: Request,
    routeParams: Record<string, any>,
    url: URL
  ): Promise<ProcessedContext> {
    this.logger.debug("Context building started");
    // Build base context
    let contextValue = {};

    try {
      if (config?.context) {
        this.logger.debug("User context executing");
        if (typeof config.context === 'function') {
          contextValue = await Promise.resolve(config.context());
        } else {
          contextValue = config.context;
        }
        this.logger.debug("Base context created");
      }
    } catch (error) {
      this.logger.error('Base context creation failed', { error });
      // We can continue with an empty context
    }

    // Parse request components
    const cookies = new IgniterCookie(request.headers);
    const response = new IgniterResponseProcessor();
    
    let body = null;

    try {
      body = await BodyParserProcessor.parse(request);
    } catch (error) {
      this.logger.warn('Body parsing failed', { error });
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

    // Build final context with proper structure
    const processedContext: ProcessedContext = {
      request: processedRequest,
      response: response,
      $context: contextValue,
      $plugins: config.plugins || {},
    };

    this.logger.debug("Context built", {
      has_body: !!body,
      query_params: Object.keys(processedRequest.query),
      route_params: Object.keys(processedRequest.params),
    });

    return processedContext;
  }

  /**
   * Enhances the context with plugin providers (store, logger, jobs, telemetry).
   * Safely injects providers while protecting against overwrites.
   *
   * @param context - The base processed context
   * @param pluginManager - Optional plugin manager for plugin proxy injection
   * @returns Enhanced context with plugin providers
   */
  static async enhanceWithPlugins(
    context: ProcessedContext,
    pluginManager?: IgniterPluginManager<any>
  ): Promise<ProcessedContext> {
    this.logger.debug("Context enhancement started");
    const enhancedContext = { ...context.$context };
    const plugins = { ...context.$plugins };
    const injectedProviders: string[] = [];

    try {
      // Inject store provider
      if (plugins.store) {
        enhancedContext.store = plugins.store;
        injectedProviders.push('store');
      }

      // Inject logger provider
      if (plugins.logger) {
        enhancedContext.logger = plugins.logger;
        injectedProviders.push('logger');
      }

      // Inject jobs provider
      if (plugins.jobs?.createProxy) {
        try {
          const jobsProxy = await plugins.jobs.createProxy();
          if (jobsProxy) {
            enhancedContext.jobs = jobsProxy;
            injectedProviders.push('jobs');
          }
        } catch (error) {
          this.logger.error('Jobs proxy injection failed', { error });
        }
      }

      // Inject telemetry provider
      if (plugins.telemetry) {
        enhancedContext.telemetry = plugins.telemetry;
        injectedProviders.push('telemetry');
      }

      // Inject plugin proxies
      if (pluginManager) {
        try {
          const pluginProxies = this.injectPluginProxies(context, pluginManager);
          if (pluginProxies && Object.keys(pluginProxies).length > 0) {
            enhancedContext.plugins = pluginProxies;
            injectedProviders.push(`plugins (${Object.keys(pluginProxies).length})`);
          }
        } catch (error) {
          this.logger.error('Plugin proxy injection failed', { error });
        }
      }

      if(injectedProviders.length > 0) {
        this.logger.debug("Context enhanced", {
          providers: injectedProviders
        });
      } else {
        this.logger.debug("No providers injected");
      }

      return {
        ...context,
        $context: enhancedContext,
        $plugins: plugins
      };

    } catch (error) {
      this.logger.error('Context enhancement failed', { error });
      return {
        ...context,
        $context: enhancedContext,
        $plugins: plugins
      };
    }
  }

  /**
   * Injects plugin proxies into the context for type-safe plugin access
   *
   * @param context - The base processed context
   * @param pluginManager - The plugin manager instance
   * @returns Plugin proxies with context reference
   */
  private static injectPluginProxies(
    context: ProcessedContext,
    pluginManager: IgniterPluginManager<any>
  ): Record<string, any> {
    this.logger.debug("Injecting plugin proxies");
    const pluginProxies: Record<string, any> = {};

    try {
      // Validate plugin manager
      if (!pluginManager?.getAllPluginProxies) {
        this.logger.warn('Plugin proxy injection skipped', {
          reason: 'invalid plugin manager'
        });
        return {};
      }

      // Get all plugin proxies from the manager
      const allProxies = pluginManager.getAllPluginProxies();
      if (!allProxies || typeof allProxies !== 'object' || Object.keys(allProxies).length === 0) {
        this.logger.debug('No plugin proxies found');
        return {};
      }

      // Update each proxy with current context and create final proxy
      for (const [pluginName, proxy] of Object.entries(allProxies)) {
        if (proxy && typeof proxy === 'object') {
          try {
            // Update proxy context reference with safe type check
            const contextValue = typeof context.$context === 'object' ? context.$context : {};
            proxy.context = contextValue;

            // Create enhanced proxy for the action context
            pluginProxies[pluginName] = {
              ...proxy,
              // Ensure emit method uses the plugin manager's store
              emit: async (event: string, payload: any) => {
                try {
                  const channel = `plugin:${pluginName}:${event}`;
                  this.logger.debug("Plugin event emitted", {
                    plugin: pluginName,
                    event,
                    channel
                  });
                  await pluginManager.emit(pluginName, event, payload);
                } catch (emitError) {
                  this.logger.error("Plugin event emission failed", {
                    plugin: pluginName,
                    event,
                    error: emitError
                  });
                }
              },
            };
          } catch (proxyError) {
            this.logger.error("Plugin proxy setup failed", {
              plugin: pluginName,
              error: proxyError
            });
            // Continue with other plugins
          }
        }
      }

      const proxyCount = Object.keys(pluginProxies).length;
      if (proxyCount > 0) {
        this.logger.debug("Plugin proxies injected", {
          count: proxyCount
        });
      }
      return pluginProxies;

    } catch (error) {
      this.logger.error('Plugin proxy injection failed', { error });
      return {};
    }
  }
}
