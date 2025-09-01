import { addRoute, createRouter, type RouterContext } from "rou3";
import { IgniterError } from "../error";
import { IgniterResponseProcessor } from "./response.processor";
import { SSEProcessor } from "./sse.processor";
import { parseURL } from "../utils/url";
import { parseResponse } from "../utils/response";
import {
  IgniterLogLevel,
  type HTTPMethod,
  type IgniterAction,
  type IgniterControllerConfig,
  type IgniterLogger,
  type IgniterProcedure,
  type IgniterRouter,
} from "../types";
import type {
  RequestProcessorConfig,
  RequestProcessorInterface,
} from "../types/request.processor";
import { getHeadersSafe } from "../adapters/nextjs";
import { z } from "zod";
import { RouteResolverProcessor } from "./route-resolver.processor";
import {
  type ProcessedContext,
} from "./context-builder.processor";
import { ContextBuilderProcessor } from "./context-builder.processor";
import { MiddlewareExecutorProcessor } from "./middleware-executor.processor";
import {
  TelemetryManagerProcessor,
  type TelemetrySpan,
} from "./telemetry-manager.processor";
import { ErrorHandlerProcessor } from "./error-handler.processor";
import { IgniterRealtimeService } from "../services/realtime.service";
import { IgniterConsoleLogger } from "../services/logger.service";
import { IgniterPluginManager } from "../services/plugin.service";
import { resolveLogLevel, createLoggerContext } from "../utils/logger";

/**
 * Handles HTTP request processing for the Igniter Framework.
 * This class manages route registration, request handling, and response processing.
 *
 * @template TRouter - Type of the router
 * @template TConfig - Type of the router configuration
 *
 * @example
 * ```typescript
 * const config = {
 *   endpoint: '/api/v1',
 *   controllers: {
 *     users: userController
 *   }
 * };
 *
 * const processor = new RequestProcessor(config);
 * const response = await processor.process(request);
 * ```
 */
export class RequestProcessor<
  TRouter extends IgniterRouter<any, any, any, any, any>,
  TConfig extends
    RequestProcessorConfig<TRouter> = RequestProcessorConfig<TRouter>,
> implements RequestProcessorInterface<TRouter, TConfig>
{
  public plugins: Map<string, any>;
  public config: TConfig;
  public router: RouterContext<
    IgniterAction<any, any, any, any, any, any, any, any, any, any>
  >;
  public pluginManager?: IgniterPluginManager<any>;

  private logger: IgniterLogger;

  private static get isProduction() {
    return process.env.NODE_ENV === "production";
  }

  private static get isInteractiveMode() {
    return process.env.IGNITER_INTERACTIVE_MODE === "true";
  }

  /**
   * Creates a new RequestProcessor instance.
   *
   * @param config - Router configuration containing endpoint and controllers
   */
  constructor(config: TConfig) {
    this.config = config;
    this.plugins = new Map<string, any>();
    this.logger = IgniterConsoleLogger.create({
      level: process.env.IGNITER_LOG_LEVEL as IgniterLogLevel || IgniterLogLevel.INFO,
      context: {
        processor: 'RequestProcessor',
      },
      showTimestamp: true,
    })

    // Initialize PluginManager if plugins exist
    this.initializePluginManager();

    // Initialize router with async plugin registration
    this.router = createRouter<IgniterAction<any, any, any, any, any, any, any, any, any, any>>();
    this.logger.debug('Request processor instantiated', {
      controllersCount: Object.keys(this.config.controllers).length,
      basePATH: this.config.basePATH,
      baseURL: this.config.baseURL
    });
    this.initializeAsync();
  }



  /**
   * Async initialization for plugins and routes
   */
  private async initializeAsync(): Promise<void> {
    try {
      // Register plugins first
      await this.registerPlugins();

      // Then register all routes (controllers + plugins)
      this.registerRoutes();

      // Initialize SSE channels
      this.initializeSSEChannels();

      this.logger.debug('Request processor initialized', {
        hasPluginManager: !!this.pluginManager,
        pluginsCount: this.plugins.size
      });
    } catch (error) {
      this.logger.error('Request processor initialization failed', {
        error,
        stage: 'async_initialization'
      });
      throw error;
    }
  }

  /**
   * Initialize PluginManager if plugins are configured
   */
  private initializePluginManager(): void {
    if (this.config.plugins && Object.keys(this.config.plugins).length > 0) {
      try {
        // Extract store and logger from context plugins
        const contextPlugins = this.config.context.$plugins || {};
        const store = contextPlugins.store;
        const logger = contextPlugins.logger || this.logger;

        if (!store) {
          this.logger.warn('Plugin manager storage adapter missing', {
            recommendation: 'Consider adding a storage adapter for plugin persistence'
          });
          return;
        }

        // Initialize PluginManager with store and logger
        this.pluginManager = new IgniterPluginManager({
          store,
          logger,
          config: {
            enableDebugLogging: process.env.NODE_ENV !== 'production',
            enableMetrics: true,
            enableRuntimeValidation: true,
          }
        });

        this.logger.debug('Plugin manager initialized', {
          pluginsCount: Object.keys(this.config.plugins).length
        });
      } catch (error) {
        this.logger.error('Plugin manager initialization failed', {
          error,
          pluginsCount: Object.keys(this.config.plugins).length
        });
      }
    }
  }

  /**
   * Register all plugins with the PluginManager
   */
  private async registerPlugins(): Promise<void> {
    if (!this.pluginManager || !this.config.plugins) {
      return;
    }

    try {
      // Register each plugin
      for (const [pluginName, plugin] of Object.entries(this.config.plugins)) {
        await this.pluginManager.register(plugin);
        this.logger.debug('Plugin registered', { pluginName });
      }

      // Load all plugins (execute init hooks)
      await this.pluginManager.loadAll();
      this.logger.debug('All plugins loaded successfully');

    } catch (error) {
      this.logger.error('Failed to register and load plugins', { error });
      throw error;
    }
  }

  /**
   * Initialize SSE channels based on controllers and system needs
   */
  private initializeSSEChannels(): void {
    // Register system channels
    SSEProcessor.registerChannel({
      id: "revalidation",
      description: "Channel for cache revalidation events",
    });

    SSEProcessor.registerChannel({
      id: "system",
      description: "Channel for system events like metrics and logs",
    });

    // Register action-specific channels for streams
    for (const [controllerKey, controller] of Object.entries(
      this.config.controllers,
    )) {
      // @ts-ignore
      for (const [actionKey, action] of Object.entries(controller.actions)) {
        // @ts-ignore
        if (action.stream) {
          const channelId = `${controllerKey}.${actionKey}`;
          this.logger.debug('Stream channel registered', { channelId });
          SSEProcessor.registerChannel({
            id: channelId,
            description: `Stream events for ${controllerKey}.${actionKey} action`,
          });
        }
      }
    }

    this.logger.debug('SSE initialization completed', {
      channels: SSEProcessor.getRegisteredChannels().map((c) => c.id)
    });
  }

  /**
   * Registers all routes (controllers + plugins) into the router.
   * Creates a routing table based on controller and plugin configurations.
   */
  private registerRoutes(): void {
    const basePATH = this.config.basePATH || process.env.IGNITER_APP_BASE_PATH || "/api/v1";
    this.logger.debug('Registering routes', { basePATH });
    let routeCount = 0;

    // Register application controllers and actions
    for (const controller of Object.values(
      this.config.controllers,
    ) as IgniterControllerConfig<any>[]) {
      for (const endpoint of Object.values(controller.actions) as IgniterAction<
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
      >[]) {
        const path = parseURL(basePATH, controller.path, endpoint.path);
        addRoute(this.router, endpoint.method, path, endpoint);
        routeCount++;
        this.logger.debug('[CONTROLLER] Route registered', {
          method: endpoint.method,
          path
        });
      }
    }

    // Register plugin routes if PluginManager exists
    if (this.pluginManager) {
      this.registerPluginRoutes(basePATH);
    }

    // Register central SSE endpoint
    const sseEndpoint = parseURL(basePATH, "/sse/events");
    const sseAction: IgniterAction<any, any, any, any, any, any, any, any, any, any> = {
      method: "GET",
      type: "query",
      path: "/sse/events",
      body: z.object({}).optional(),
      handler: async () => ({}),
      use: [],
      // @ts-ignore
      $Caller: async () => ({}),
      $Infer: {} as any,
    };
    addRoute(this.router, "GET", sseEndpoint, sseAction);

    this.logger.debug('Registered central SSE endpoint', { sseEndpoint });
    this.logger.debug('Route registration completed', {
      totalRoutes: routeCount + (this.pluginManager ? this.pluginManager.getPluginNames().length : 0)
    });
  }

  /**
   * Register plugin controller routes with self-reference support
   */
  private registerPluginRoutes(basePATH: string): void {
    if (!this.pluginManager) return;

    const pluginNames = this.pluginManager.getPluginNames();
    let pluginRouteCount = 0;

    for (const pluginName of pluginNames) {
      const plugin = this.pluginManager.getPlugin(pluginName);
      if (!plugin || !plugin.$controllers) continue;

      this.logger.debug('Plugin routes registering', { pluginName });
      for (const [controllerName, controllerActions] of Object.entries(plugin.$controllers)) {
        for (const [actionName, actionConfig] of Object.entries(controllerActions as any) as [string, IgniterAction<any, any, any, any, any, any, any, any, any, any>][]) {
          try {
            // Create plugin route path: /api/v1/plugins/{pluginName}/{controllerName}{actionPath}
            const pluginPath = parseURL(basePATH, 'plugins', pluginName, controllerName, actionConfig.path);

            // Create wrapper action that injects self-reference
            const wrappedAction: IgniterAction<any, any, any, any, any, any, any, any, any, any> = {
              ...actionConfig,
              handler: async (ctx: any) => {
                // Inject self-reference for the plugin
                const self = this.pluginManager!.getPluginProxy(pluginName);
                if (self) {
                  // Update context reference in self
                  self.context = ctx.context;
                }

                // Call original handler with self-reference
                return actionConfig.handler({
                  ...ctx,
                  self
                });
              },
              // Ensure required IgniterAction properties
              type: actionConfig.method === 'GET' ? 'query' : 'mutation',
              // @ts-ignore - $Caller will be set by framework
              $Caller: async () => ({}),
              $Infer: {} as any,
            };

            addRoute(this.router, actionConfig.method, pluginPath, wrappedAction);
            pluginRouteCount++;

            this.logger.debug('[PLUGIN] Registered route', {
              method: actionConfig.method,
              path: pluginPath,
              plugin: pluginName,
              controller: controllerName,
              action: actionName
            });

          } catch (error) {
            this.logger.error('Plugin route registration failed', {
              plugin: pluginName,
              controller: controllerName,
              action: actionName,
              error
            });
          }
        }
      }
    }

    this.logger.debug('Registered plugin routes', {
      routeCount: pluginRouteCount,
      pluginCount: pluginNames.length
    });
  }

  /**
   * Processes an incoming HTTP request.
   * Handles routing, middleware execution, and response generation.
   *
   * @param request - The incoming HTTP request to process
   * @returns A Response object containing the result of the request
   *
   * @throws {Response} 404 if route not found
   * @throws {Response} 400 for validation errors
   * @throws {Response} 500 for internal server errors
   *
   * @example
   * const request = new Request('https://api.example.com/users');
   * const response = await processor.process(request);
   */
  async process(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const startTime = Date.now();

    this.logger.debug('Request received', {
      method,
      path,
      url: request.url,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    let telemetrySpan: TelemetrySpan | null = null;
    let context: ProcessedContext;

    try {
      // Check if this is an SSE request to the central endpoint
      const basePATH =
        this.config.basePATH || process.env.IGNITER_APP_BASE_PATH || "/api/v1";
      const sseEndpoint = parseURL(basePATH, "/sse/events");

      if (path === sseEndpoint && method === "GET") {
        this.logger.debug('SSE connection received', { url: request.url });
        return await SSEProcessor.handleConnection(request);
      }

      // Step 1: Resolve route
      const routeResult = RouteResolverProcessor.resolve(
        this.router,
        method,
        path,
      );
      if (!routeResult.success) {
        this.logger.warn('Route not found', {
          method,
          path,
          availableRoutes: Object.keys(this.config.controllers)
        });
        return new Response(null, {
          status: routeResult.error!.status,
          statusText: routeResult.error!.statusText,
        });
      }

      const { action, params } = routeResult;
      const handler = action!;
      this.logger.debug('Route resolved', { method, path, params });

      // Step 2: Build context
      context = await ContextBuilderProcessor.build(
        this.config,
        request,
        params!,
        url,
      );

      // Step 3: Enhance context with plugins
      context = await ContextBuilderProcessor.enhanceWithPlugins(context, this.pluginManager);

      // Step 4: Initialize telemetry
      telemetrySpan = TelemetryManagerProcessor.createHttpSpan(
        request,
        context,
        startTime,
      );
      if (telemetrySpan) {
        this.logger.debug('HTTP span created');
      }

      // Step 5: Execute global middlewares
      if (context.$plugins.use && Array.isArray(context.$plugins.use)) {
        const globalResult = await MiddlewareExecutorProcessor.executeGlobal(
          context,
          context.$plugins.use,
        );

        if (!globalResult.success) {
          this.logger.debug('Global middleware early return');
          return globalResult.earlyReturn!;
        }

        context = globalResult.updatedContext;
      }

      // Step 6: Execute action-specific middlewares
      if (handler.use && Array.isArray(handler.use)) {
        const actionResult = await MiddlewareExecutorProcessor.executeAction(
          context,
          handler.use as IgniterProcedure<any, any, any>[],
        );

        if (!actionResult.success) {
          this.logger.debug('Action middleware early return', {
            responseType: typeof actionResult.earlyReturn,
            skipActionExecution: true
          });
          return actionResult.earlyReturn!;
        }

        context = actionResult.updatedContext;
      }

      // Step 7: Execute action handler
      const actionResponse = await this.executeAction(handler, context);

      // Step 8: Handle successful response
      return await this.handleSuccessfulResponse(
        actionResponse,
        context,
        telemetrySpan,
        startTime,
        request,
      );
    } catch (error) {
      this.logger.error('Request processing failed', {
        error,
        path,
        method
      });
      // Step 9: Handle errors
      if (context!) {
        const errorResult = await ErrorHandlerProcessor.handleError(
          error,
          context,
          telemetrySpan,
          startTime,
        );
        return errorResult.response;
      } else {
        // Context initialization failed
        const errorResult =
          await ErrorHandlerProcessor.handleInitializationError(
            error,
            null,
            telemetrySpan,
            startTime,
          );
        return errorResult.response;
      }
    }
  }

  /**
   * Executes the action handler with validation.
   *
   * @param handler - The action handler to execute
   * @param context - The processed context
   * @returns The action response
   */
  private async executeAction(
    handler: IgniterAction<any, any, any, any, any, any, any, any, any, any>,
    context: ProcessedContext,
  ): Promise<any> {
    this.logger.debug('Action handler executing');

    // Validate and parse body and query to ensure correct types
    try {
      if (handler.body) {
        this.logger.debug('Validating and parsing request body');
        context.request.body = handler.body.parse(context.request.body);
      }
      if (handler.query) {
        this.logger.debug('Validating and parsing request query');
        context.request.query = handler.query.parse(context.request.query);
      }
    } catch (validationError) {
      this.logger.warn('Request validation failed', {
        validationErrors: validationError,
        path: context.request.path,
        method: context.request.method
      });
      throw validationError; // Re-throw to be handled by the main error handler
    }

    this.logger.debug('Executing action handler function');

    // Execute handler with proper context structure
    this.logger.debug('Initializing response processor');

    const responseProcessor = IgniterResponseProcessor.init(
      context.$plugins?.store || context.$context?.store,
    );

    const realtimeService = new IgniterRealtimeService(
      context.$plugins?.store || context.$context?.store
    );

    // Execute handler with proper IgniterActionContext structure
    const response = await handler.handler({
      request: {
        method: context.request.method as HTTPMethod,
        path: context.request.path,
        params: context.request.params,
        headers: context.request.headers,
        cookies: context.request.cookies,
        body: context.request.body,
        query: context.request.query,
      },
      context: context.$context,
      plugins: context.$plugins,
      response: responseProcessor,
      realtime: realtimeService,
    });

    this.logger.debug('Action handler completed');

    return response;
  }

  /**
   * Handles successful response processing.
   *
   * @param actionResponse - Response from action handler
   * @param context - The processed context
   * @param telemetrySpan - Telemetry span for tracking
   * @param startTime - Request start time
   * @param request - Original request
   * @returns Final HTTP Response
   */
  private async handleSuccessfulResponse(
    actionResponse: any,
    context: ProcessedContext,
    telemetrySpan: TelemetrySpan | null,
    startTime: number,
    request: Request,
  ): Promise<Response> {
    // Handle direct Response objects
    if (actionResponse instanceof Response) {
      this.logger.debug('Raw response returned', { type: 'Response' });
      // It's already a response, we don't need to do much.
      // We could add headers or cookies here if needed in the future.
      return actionResponse;
    }

    // Handle ResponseProcessor objects
    if (actionResponse instanceof IgniterResponseProcessor) {
      this.logger.debug('Response processor returned', {
        type: 'IgniterResponseProcessor'
      });
      const finalResponse = await actionResponse.toResponse();

      // Track successful request
      await this.trackInstanceRequest(
        request,
        startTime,
        finalResponse.status || 200,
      );

      // Finish telemetry
      if (telemetrySpan) {
        TelemetryManagerProcessor.finishSpanSuccess(
          telemetrySpan,
          finalResponse.status || 200,
        );
      }

      this.logger.debug('Request processed', {
        status: finalResponse.status,
        duration_ms: Date.now() - startTime,
        responseType: 'processor'
      });

      return finalResponse;
    }

    // Handle JSON response
    await this.trackInstanceRequest(request, startTime, 200);

    this.logger.debug('Request processed', {
      status: 200,
      duration_ms: Date.now() - startTime,
      responseType: 'json'
    });

    // Finish telemetry
    if (telemetrySpan) {
      TelemetryManagerProcessor.finishSpanSuccess(telemetrySpan, 200);
    }

    return new Response(JSON.stringify(actionResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Makes a direct call to a specific controller action.
   * Useful for server-side calls without going through the HTTP layer.
   *
   * @template TControllerKey - Key of the controller in the configuration
   * @template TActionKey - Key of the action in the controller
   * @template TAction - Type of the action being called
   *
   * @param controllerKey - Name of the controller to call
   * @param actionKey - Name of the action to execute
   * @param input - Input data for the action
   * @returns Promise resolving to the action's output
   *
   * @throws {IgniterError} When controller or action not found
   */
  async call<
    TControllerKey extends keyof TConfig["controllers"],
    TActionKey extends keyof TConfig["controllers"][TActionKey]["actions"],
    TAction extends
      TConfig["controllers"][TControllerKey]["actions"][TActionKey],
  >(
    controllerKey: TControllerKey,
    actionKey: TActionKey,
    input: TAction["$Infer"]["$Input"],
    options?: { headers?: Record<string, string>, cookies?: Record<string, string>, credentials?: RequestCredentials },
  ): Promise<TAction["$Infer"]["$Output"]> {
    // Get the controller
    const controller = this.config.controllers[
      controllerKey
    ] as IgniterControllerConfig<any>;
    if (!controller) {
      throw new IgniterError({
        code: "CONTROLLER_NOT_FOUND",
        message: `Controller ${controllerKey.toString()} not found`,
      });
    }

    // Get the action
    const action = controller.actions[actionKey] as TAction;
    if (!action) {
      throw new IgniterError({
        code: "ACTION_NOT_FOUND",
        message: `Action ${actionKey.toString()} not found`,
      });
    }

    // Get the base path and URL
    const basePATH =
      this.config.basePATH || process.env.IGNITER_APP_PATH || "/api/v1";
    const baseURL =
      this.config.baseURL ||
      process.env.IGNITER_APP_URL ||
      "http://localhost:3000";

    // Construct the URL with parameters
    function constructURL(
      baseURL: string,
      basePATH: string,
      controllerPath: string,
      actionPath: string,
      input: Record<string, any>,
    ) {
      let url = parseURL(baseURL, basePATH, controllerPath, actionPath);

      // Replace path parameters in the URL
      if (input?.params) {
        for (const [key, value] of Object.entries(input.params)) {
          url = url.replace(`:${key}`, String(value));
        }
      }

      // Add query parameters for GET requests
      if (action.method === 'GET' && input?.query) {
        const queryParams = new URLSearchParams();
        for (const key in input.query) {
          queryParams.append(key, String(input.query[key]));
        }
        if (queryParams.toString()) {
          url += `?${queryParams.toString()}`;
        }
      }

      return url;
    }

    const actionEndpointURL = constructURL(
      baseURL,
      basePATH,
      controller.path,
      action.path,
      input,
    );

    // Safely try to get headers from next/headers if we're in a RSC
    const rscHeaders = await getHeadersSafe();

    // Prepare context with the input data
    // Fix: Ensure headers is a plain object, not Headers instance, to avoid TypeError
    const plainHeaders: Record<string, string> = {};
    if (rscHeaders && typeof rscHeaders.forEach === "function") {
      rscHeaders.forEach((value: string, key: string) => {
        plainHeaders[key] = value;
      });
    } else if (rscHeaders && typeof rscHeaders === "object") {
      Object.assign(plainHeaders, rscHeaders);
    }

    // Merge custom headers from input
    if (input?.headers) {
      Object.assign(plainHeaders, input.headers);
    }

    // Handle cookies from input
    if (input?.cookies) {
      const cookieString = Object.entries(input.cookies)
        .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)
        .join('; ');
      if (cookieString) {
        plainHeaders['Cookie'] = plainHeaders['Cookie']
          ? `${plainHeaders['Cookie']}; ${cookieString}`
          : cookieString;
      }
    }

    // Fix: Only include body for methods that allow it (not GET or HEAD)
    const method = action.method?.toUpperCase?.() || "GET";
    const hasBody = input?.body && !["GET", "HEAD"].includes(method);

    const requestInit: RequestInit = {
      method,
      headers: {
        ...plainHeaders,
        "Content-Type": "application/json",
      },
      credentials: input?.credentials,
      ...(hasBody ? { body: JSON.stringify(input.body) } : {}),
    };

    // Remove Content-Type if no body (GET/HEAD), to avoid misleading header
    if (!hasBody) {
      delete (requestInit.headers as Record<string, string>)["Content-Type"];
    }

    const request = new Request(actionEndpointURL, requestInit);

    // Call the action handler directly
    const response = await this.process(request);
    const result = await parseResponse(response);
    return result;
  }

  /**
   * Track request for the current instance.
   * Integrates with CLI dashboard when in development mode.
   *
   * @param request - The HTTP request
   * @param startTime - Request start time
   * @param statusCode - HTTP status code
   * @param error - Optional error that occurred
   */
  // Trecho do método trackInstanceRequest com alterações para publicar via SSE
  private async trackInstanceRequest(
    request: Request,
    startTime: number,
    statusCode: number,
    error?: Error,
  ): Promise<void> {
    // Only track in development mode and when interactive mode is enabled
    if (RequestProcessor.isProduction || !RequestProcessor.isInteractiveMode) {
      return;
    }

    try {
      const responseTime = Date.now() - startTime;
      const url = new URL(request.url);

      const requestData = {
        timestamp: new Date().toISOString(),
        method: request.method || "GET",
        path: url.pathname || "/",
        statusCode: statusCode,
        responseTime: responseTime,
        ip: this.getClientIP(request),
        userAgent: request.headers?.get("user-agent")?.substring(0, 70) || 'N/A', // Truncate user agent
        contentLength: this.getContentLength(request) || 0,
        error: error ? { message: error.message, name: error.name } : undefined,
      };

      // Publish to SSE for real-time dashboard updates
      this.publishSystemEvent("request-metrics", requestData);
      this.logger.debug('Metrics published via SSE', {
        channel: 'system',
        eventType: 'request-metrics'
      });

      // If we have a store plugin, also publish there for persistence
      if (
        this.config.context.$plugins?.realtime &&
        typeof this.config.context.$plugins.realtime.publish === "function"
      ) {
        try {
          await this.config.context.$plugins.realtime.publish(
            "igniter:api-requests",
            JSON.stringify({
              type: "api-request",
              data: requestData,
            }),
          );
        } catch (storeError) {
          this.logger.error('Failed to publish metrics to storage plugin', {
            error: storeError,
            channel: 'igniter:api-requests'
          });
        }
      }
    } catch (trackingError) {
      // Fail silently - don't break the request if tracking fails
      this.logger.warn('Request tracking failed', {
        error: trackingError,
        target: 'CLI dashboard'
      });
    }
  }

  /**
   * Publish an event to a specific SSE channel
   *
   * @param channel - The channel ID to publish to
   * @param data - The data to publish
   * @param type - Optional event type
   * @returns Number of clients the event was sent to
   */
  public publishEvent(
    channel: string,
    data: any,
    type: string = "message",
  ): number {
    return SSEProcessor.publishEvent({
      channel,
      data,
      type,
    });
  }

  /**
   * Publish a system event (logs, metrics, etc.)
   *
   * @param type - The event type
   * @param data - The event data
   * @returns Number of clients the event was sent to
   */
  public publishSystemEvent(type: string, data: any): number {
    return this.publishEvent("system", data, type);
  }

  /**
   * Trigger cache revalidation for specific query keys
   *
   * @param queryKeys - The query keys to revalidate
   * @returns Number of clients notified
   */
  public revalidateQueries(queryKeys: string | string[]): number {
    const keysArray = Array.isArray(queryKeys) ? queryKeys : [queryKeys];

    return this.publishEvent(
      "revalidation",
      {
        queryKeys: keysArray,
        timestamp: new Date().toISOString(),
      },
      "revalidate",
    );
  }

  /**
   * Publish an event to a specific action's stream
   *
   * @param controllerKey - The controller key
   * @param actionKey - The action key
   * @param data - The data to publish
   * @param type - Optional event type
   * @returns Number of clients the event was sent to
   */
  public publishToActionStream(
    controllerKey: string,
    actionKey: string,
    data: any,
    type: string = "message",
  ): number {
    const channelId = `action:${controllerKey}.${actionKey}`;

    if (!SSEProcessor.channelExists(channelId)) {
      this.logger.warn('Action channel not found', {
        action: `${controllerKey}.${actionKey}`
      });
      return 0;
    }

    return this.publishEvent(channelId, data, type);
  }

  /**
   * Extracts client IP from request headers.
   *
   * @param request - The HTTP request
   * @returns Client IP address
   */
  private getClientIP(request: Request): string {
    // Try various headers for client IP
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }

    const ip = request.headers.get("x-real-ip") ||
      request.headers.get("x-client-ip");

    // In local development, it might be undefined
    return ip || "127.0.0.1";
  }

  /**
   * Gets content length from request headers.
   *
   * @param request - The HTTP request
   * @returns Content length or undefined
   */
  private getContentLength(request: Request): number | undefined {
    const contentLength = request.headers.get("content-length");
    if (!contentLength || isNaN(parseInt(contentLength, 10))) {
      return undefined;
    }
    return parseInt(contentLength, 10);
  }

  /**
   * Static method for backward compatibility.
   * This method is kept for any existing code that might use it.
   *
   * @deprecated Use instance method process() instead
   */
  static async process(context: any): Promise<any> {
    const startTime = Date.now();
    let statusCode = 200;
    let error: Error | undefined;

    try {
      // Legacy static method - minimal implementation
      const finalResponse = context.response?.data || context;
      statusCode = context.response?.status || 200;

      // This method is deprecated, so a warning is appropriate.
      const deprecationLogger = IgniterConsoleLogger.create({
        level: resolveLogLevel(),
        context: createLoggerContext('RequestProcessor')
      });
      deprecationLogger.warn('The static \'RequestProcessor.process()\' method is deprecated. Please use an instance method instead.');

      return {
        data: finalResponse,
        status: statusCode,
        headers: context.response?.headers || {},
        meta: {
          ...context.meta,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (err) {
      error = err as Error;
      statusCode = error instanceof IgniterError ? 500 : 500;
      throw error;
    }
  }
}
