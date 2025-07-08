import { IgniterCookie } from "../services/cookie.service";
import { IgniterResponseProcessor } from "./response.processor";
import { BodyParserProcessor } from "./body-parser.processor";
import type { RequestProcessorConfig } from "../types/request.processor";
import { IgniterLogLevel, type IgniterLogger, type IgniterRouter } from "../types";
import { IgniterConsoleLogger } from "../services/logger.service";
import type { IgniterPluginManager } from "../services/plugin.service";

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
};

/**
 * Represents the complete processed context
 */
export interface ProcessedContext<TContext = any, TPlugins = any> {
  request: ProcessedRequest;
  response: IgniterResponseProcessor<TContext, unknown>;
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
        level: process.env.IGNITER_LOG_LEVEL as IgniterLogLevel || IgniterLogLevel.INFO,
        context: {
          processor: 'RequestProcessor',
          component: 'ContextBuilder'
        },
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
  static async build<TRouter extends IgniterRouter<any, any, any, any>>(
    config: RequestProcessorConfig<TRouter>,
    request: Request,
    routeParams: Record<string, any>,
    url: URL
  ): Promise<ProcessedContext> {
    this.logger.debug("Building request context...");
    // Build base context
    let contextValue = {};

    try {
      if (config?.context) {
        this.logger.debug("User-defined context found, executing...");
        if (typeof config.context === 'function') {
          contextValue = await Promise.resolve(config.context());
        } else {
          contextValue = config.context;
        }
        this.logger.debug("Successfully created base context.");
      }
    } catch (error) {
      this.logger.error('Failed to create base context from user definition.', { error });
      // We can continue with an empty context
    }

    // Parse request components
    const cookies = new IgniterCookie(request.headers);
    const response = new IgniterResponseProcessor();
    let body = null;

    try {
      body = await BodyParserProcessor.parse(request);
    } catch (error) {
      this.logger.warn('Failed to parse request body. Proceeding with empty body.', { error });
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
    };

    // Build final context with proper structure
    const processedContext: ProcessedContext = {
      request: processedRequest,
      response: response,
      $context: contextValue,
      $plugins: config.plugins || {},
    };

    this.logger.debug("Context build complete.", {
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
    this.logger.debug("Enhancing context with plugin providers...");
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
          this.logger.error('Failed to create and inject jobs proxy.', { error });
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
          this.logger.error('Failed to inject plugin proxies.', { error });
        }
      }

      if(injectedProviders.length > 0) {
        this.logger.debug(`Context enhanced with providers: [${injectedProviders.join(', ')}]`);
      } else {
        this.logger.debug("No plugin providers were injected.");
      }

      return {
        ...context,
        $context: enhancedContext,
        $plugins: plugins
      };

    } catch (error) {
      this.logger.error('A critical error occurred while enhancing context with plugins.', { error });
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
    this.logger.debug("Injecting plugin API proxies...");
    const pluginProxies: Record<string, any> = {};

    try {
      // Validate plugin manager
      if (!pluginManager?.getAllPluginProxies) {
        this.logger.warn('Invalid plugin manager provided for proxy injection.');
        return {};
      }

      // Get all plugin proxies from the manager
      const allProxies = pluginManager.getAllPluginProxies();
      if (!allProxies || typeof allProxies !== 'object' || Object.keys(allProxies).length === 0) {
        this.logger.debug('No plugin proxies found to inject.');
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
                  this.logger.debug(`Plugin '${pluginName}' emitting event '${event}' on channel '${channel}'.`);
                  await pluginManager.emit(pluginName, event, payload);
                } catch (emitError) {
                  this.logger.error(`Failed to emit event '${event}' for plugin '${pluginName}'.`, { error: emitError });
                }
              },
            };
          } catch (proxyError) {
            this.logger.error(`Failed to setup proxy for plugin '${pluginName}'.`, { error: proxyError });
            // Continue with other plugins
          }
        }
      }

      const proxyCount = Object.keys(pluginProxies).length;
      if (proxyCount > 0) {
        this.logger.debug(`Successfully injected ${proxyCount} plugin proxies into context.`);
      }
      return pluginProxies;

    } catch (error) {
      this.logger.error('An unexpected error occurred during plugin proxy injection.', { error });
      return {};
    }
  }
}
