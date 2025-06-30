import { IgniterCookie } from "../services/cookie.service";
import { IgniterResponseProcessor } from "./response.processor";
import { BodyParserProcessor } from "./body-parser.processor";
import type { IgniterBaseContext } from "../types/context.interface";
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
  private static logger: IgniterLogger = IgniterConsoleLogger.create({
    level: process.env.NODE_ENV === 'production' ? IgniterLogLevel.INFO : IgniterLogLevel.DEBUG,
    context: {
      processor: 'ContextBuilderProcessor',
      package: 'core'
    }
  })  

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
    // Build base context
    let contextValue = {};
    
    try {
      if (config?.context) {
        if (typeof config.context === 'function') {
          contextValue = await Promise.resolve(config.context());
        } else {
          contextValue = config.context;
        }
      }
    } catch (error) {
      this.logger.error('[ContextBuilder] Failed to create context:', error);
    }

    // Parse request components
    const cookies = new IgniterCookie(request.headers);
    const response = new IgniterResponseProcessor();
    let body = null;
    
    try {
      body = await BodyParserProcessor.parse(request);
    } catch (error) {
      this.logger.error('[ContextBuilder] Failed to parse request body:', error);
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
    const enhancedContext = { ...context.$context };
    const plugins = { ...context.$plugins };

    try {
      // Inject store provider
      if (plugins.store) {
        enhancedContext.store = plugins.store;
      }

      // Inject logger provider
      if (plugins.logger) {
        enhancedContext.logger = plugins.logger;
      }

      // Inject jobs provider
      if (plugins.jobs?.createProxy) {
        try {
          const jobsProxy = await plugins.jobs.createProxy();
          if (jobsProxy) {
            enhancedContext.jobs = jobsProxy;
          }
        } catch (error) {
          this.logger.error('[ContextBuilder] Failed to inject jobs:', error);
        }
      }

      // Inject telemetry provider
      if (plugins.telemetry) {
        enhancedContext.telemetry = plugins.telemetry;
      }

      // Inject plugin proxies
      if (pluginManager) {
        try {
          const pluginProxies = this.injectPluginProxies(context, pluginManager);
          if (pluginProxies && Object.keys(pluginProxies).length > 0) {
            enhancedContext.plugins = pluginProxies;
          }
        } catch (error) {
          this.logger.error('[ContextBuilder] Failed to inject plugin proxies:', error);
        }
      }

      return {
        ...context,
        $context: enhancedContext,
        $plugins: plugins
      };

    } catch (error) {
      this.logger.error('[ContextBuilder] Failed to enhance context with plugins:', error);
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
    const pluginProxies: Record<string, any> = {};

    try {
      // Validate plugin manager
      if (!pluginManager?.getAllPluginProxies) {
        this.logger.warn('[ContextBuilder] Invalid plugin manager provided');
        return {};
      }

      // Get all plugin proxies from the manager
      const allProxies = pluginManager.getAllPluginProxies();
      if (!allProxies || typeof allProxies !== 'object') {
        this.logger.warn('[ContextBuilder] No valid proxies returned from plugin manager');
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
                  await pluginManager.emit(pluginName, event, payload);
                  this.logger.debug(`[ContextBuilder] Plugin ${pluginName} emitted event: ${event}`);
                } catch (emitError) {
                  this.logger.error(`[ContextBuilder] Failed to emit event for plugin ${pluginName}:`, emitError);
                }
              },
            };
          } catch (proxyError) {
            this.logger.error(`[ContextBuilder] Failed to setup proxy for plugin ${pluginName}:`, proxyError);
            // Continue with other plugins
          }
        }
      }

      const proxyCount = Object.keys(pluginProxies).length;
      if (proxyCount > 0) {
        this.logger.debug(`[ContextBuilder] Successfully injected ${proxyCount} plugin proxies`);
      }
      return pluginProxies;

    } catch (error) {
      this.logger.error('[ContextBuilder] Failed to inject plugin proxies:', error);
      return {};
    }
  }
} 