import { addRoute, createRouter, type RouterContext } from "rou3";
import { IgniterError } from "../error";
import { IgniterResponseProcessor } from "./response.processor";
import { SSEProcessor } from "./sse.processor";
import { parseURL } from "../utils/url";
import { parseResponse } from "../utils/response";
import {
  type HTTPMethod,
  type IgniterAction,
  type IgniterControllerConfig,
  type IgniterProcedure,
  type IgniterRouter,
  type IgniterLogger,
} from "../types";
import type {
  RequestProcessorConfig,
  RequestProcessorInterface,
} from "../types/request.processor";
import { getHeadersSafe } from "../adapters/nextjs";
import { z } from "zod";
import { RouteResolverProcessor } from "./route-resolver.processor";
import { type ProcessedContext } from "./context-builder.processor";
import { ContextBuilderProcessor } from "./context-builder.processor";
import { MiddlewareExecutorProcessor } from "./middleware-executor.processor";
import {
  TelemetryManagerProcessor,
  type TelemetrySpan,
} from "./telemetry-manager.processor";
import { ErrorHandlerProcessor } from "./error-handler.processor";
import { IgniterRealtimeService } from "../services/realtime.service";
import { IgniterPluginManager } from "../services/plugin.service";
import chalk, { ChalkInstance } from "chalk";

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
  private logger?: IgniterLogger;

  /**
   * Creates a new RequestProcessor instance.
   *
   * @param config - Router configuration containing endpoint and controllers
   */
  constructor(config: TConfig) {
    this.config = config;
    this.plugins = new Map<string, any>();
    this.logger = config.logger?.child("RequestProcessor");

    // Initialize PluginManager if plugins exist
    this.initializePluginManager();

    // Initialize router with async plugin registration
    this.router =
      createRouter<
        IgniterAction<any, any, any, any, any, any, any, any, any, any>
      >();

    this.logger?.debug("Request processor instantiated", {
      controllersCount: Object.keys(this.config.controllers).length,
      basePATH: this.config.basePATH,
      baseURL: this.config.baseURL,
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

      this.logger?.debug("Request processor initialized", {
        hasPluginManager: !!this.pluginManager,
        pluginsCount: this.plugins.size,
      });
    } catch (error) {
      this.logger?.error("Request processor initialization failed", {
        component: "RequestProcessor",
        error: error instanceof Error ? error.message : "Unknown error",
        stage: "async_initialization",
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
          this.logger?.warn("Plugin manager storage adapter missing", {
            recommendation:
              "Consider adding a storage adapter for plugin persistence",
          });
          return;
        }

        // Initialize PluginManager with store and logger
        this.pluginManager = new IgniterPluginManager({
          store,
          logger,
          config: {
            enableDebugLogging: process.env.NODE_ENV !== "production",
            enableMetrics: true,
            enableRuntimeValidation: true,
          },
        });

        this.logger?.debug("Plugin manager initialized", {
          pluginsCount: Object.keys(this.config.plugins).length,
        });
      } catch (error) {
        this.logger?.error("Plugin manager initialization failed", {
          component: "RequestProcessor",
          error: error instanceof Error ? error.message : "Unknown error",
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
        this.logger?.debug("Plugin registered", { pluginName });
      }

      // Load all plugins (execute init hooks)
      await this.pluginManager.loadAll();
      this.logger?.debug("All plugins loaded successfully");
    } catch (error) {
      this.logger?.error("Failed to register and load plugins", {
        component: "RequestProcessor",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Initialize SSE channels based on controllers and system needs
   */
  private initializeSSEChannels(): void {
    // Register system channels
    SSEProcessor.registerChannel(
      {
        id: "revalidation",
        description: "Channel for cache revalidation events",
      },
      this.logger,
    );

    SSEProcessor.registerChannel(
      {
        id: "system",
        description: "Channel for system events like metrics and logs",
      },
      this.logger,
    );

    // Register action-specific channels for streams
    for (const [controllerKey, controller] of Object.entries(
      this.config.controllers,
    )) {
      // @ts-ignore
      for (const [actionKey, action] of Object.entries(controller.actions)) {
        // @ts-ignore
        if (action.stream) {
          const channelId = `${controllerKey}.${actionKey}`;
          this.logger?.debug("Stream channel registered", { channelId });
          SSEProcessor.registerChannel(
            {
              id: channelId,
              description: `Stream events for ${controllerKey}.${actionKey} action`,
            },
            this.logger,
          );
        }
      }
    }

    this.logger?.debug("SSE initialization completed", {
      channels: SSEProcessor.getRegisteredChannels().map((c) => c.id),
    });
  }

  /**
   * Registers all routes (controllers + plugins) into the router.
   * Creates a routing table based on controller and plugin configurations.
   */
  private registerRoutes(): void {
    const basePATH =
      this.config.basePATH || process.env.IGNITER_APP_BASE_PATH || "/api/v1";

    this.logger?.debug("Registering routes", { basePATH });
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
      }
    }

    // Log each registered route
    this.logger?.debug("All application routes registered", { routeCount });

    // Register plugin routes if PluginManager exists
    if (this.pluginManager) {
      this.registerPluginRoutes(basePATH);
    }

    // Register central SSE endpoint
    const sseEndpoint = parseURL(basePATH, "/sse/events");
    const sseAction: IgniterAction<
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
    > = {
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

    this.logger?.debug("Registered central SSE endpoint", { sseEndpoint });
    this.logger?.debug("Route registration completed", {
      totalRoutes:
        routeCount +
        (this.pluginManager ? this.pluginManager.getPluginNames().length : 0),
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

      this.logger?.debug("Plugin routes registering", { pluginName });

      for (const [controllerName, controllerActions] of Object.entries(
        plugin.$controllers,
      )) {
        for (const [actionName, actionConfig] of Object.entries(
          controllerActions as any,
        ) as [
          string,
          IgniterAction<any, any, any, any, any, any, any, any, any, any>,
        ][]) {
          try {
            // Create plugin route path: /api/v1/plugins/{pluginName}/{controllerName}{actionPath}
            const pluginPath = parseURL(
              basePATH,
              "plugins",
              pluginName,
              controllerName,
              actionConfig.path,
            );

            // Create wrapper action that injects self-reference
            const wrappedAction: IgniterAction<
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
            > = {
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
                  self,
                });
              },
              // Ensure required IgniterAction properties
              type: actionConfig.method === "GET" ? "query" : "mutation",
              // @ts-ignore - $Caller will be set by framework
              $Caller: async () => ({}),
              $Infer: {} as any,
            };

            addRoute(
              this.router,
              actionConfig.method,
              pluginPath,
              wrappedAction,
            );
            pluginRouteCount++;

            this.logger?.debug("[PLUGIN] Registered route", {
              method: actionConfig.method,
              path: pluginPath,
              plugin: pluginName,
              controller: controllerName,
              action: actionName,
            });
          } catch (error) {
            this.logger?.error("Plugin route registration failed", {
              component: "RequestProcessor",
              plugin: pluginName,
              controller: controllerName,
              action: actionName,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      }
    }

    this.logger?.info("Registered plugin routes", {
      routeCount: pluginRouteCount,
      pluginCount: pluginNames.length,
    });
  }

  /**
   * Logs the response details.
   * @param request The incoming request.
   * @param response The outgoing response.
   * @param startTime The start time of the request.
   */
  private logResponse(
    request: Request,
    response: Response,
    startTime?: number,
  ) {
    const status = response.status;
    const method = request.method;
    const url = request.url;
    const ip = this.getClientIP(request);

    const statusColorOptions: Record<number, ChalkInstance> = {
      200: chalk.green,
      201: chalk.green,
      400: chalk.yellow,
      401: chalk.yellow,
      403: chalk.yellow,
      404: chalk.yellow,
      500: chalk.red,
    };

    const statusColor = statusColorOptions[status] ?? chalk.gray;
    const timeLog = startTime
      ? chalk.gray(`- ${Date.now() - startTime}ms`)
      : "";

    this.logger?.info(
      `${method} ${url} ${statusColor(status)} ${timeLog} ${ip}`,
    );
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

    let telemetrySpan: TelemetrySpan | null = null;
    let context: ProcessedContext;

    // Get telemetry from config plugins
    const telemetry = this.config?.plugins?.telemetry || null;

    try {
      // Check if this is an SSE request to the central endpoint
      const basePATH =
        this.config.basePATH || process.env.IGNITER_APP_BASE_PATH || "/api/v1";
      const sseEndpoint = parseURL(basePATH, "/sse/events");

      if (path === sseEndpoint && method === "GET") {
        this.logger?.debug("SSE connection received", { url: request.url });
        return await SSEProcessor.handleConnection(
          request,
          this.logger,
          telemetry,
        );
      }

      // Step 1: Resolve route with telemetry
      const routeResult = RouteResolverProcessor.resolve(
        this.router,
        method,
        path,
        this.logger,
        telemetry,
        undefined, // No parent span yet
      );
      if (!routeResult.success) {
        const response = new Response(null, {
          status: routeResult.error!.status,
          statusText: routeResult.error!.statusText,
        });

        this.logResponse(request, response, startTime);
        return response;
      }

      const { action, params } = routeResult;
      const handler = action!;
      this.logger?.debug("Route resolved", { method, path, params });

      // Step 2: Build context with telemetry
      context = await ContextBuilderProcessor.build(
        this.config,
        request,
        params!,
        url,
        !!action?.body,
        this.logger,
        telemetry,
        undefined, // No parent span yet
      );

      // Step 3: Enhance context with plugins
      context = await ContextBuilderProcessor.enhanceWithPlugins(
        context,
        this.pluginManager,
        this.logger,
        telemetry,
      );

      // Step 4: Initialize telemetry span (this becomes the parent span for child operations)
      telemetrySpan = TelemetryManagerProcessor.createHttpSpan(
        request,
        context,
        startTime,
        this.logger,
      );
      if (telemetrySpan) {
        this.logger?.debug("HTTP span created");
      }

      // Get the parent span for child operations
      const parentSpan = telemetrySpan?.span;

      // Step 5: Execute global middlewares with telemetry
      if (context.$plugins.use && Array.isArray(context.$plugins.use)) {
        const globalResult = await MiddlewareExecutorProcessor.executeGlobal(
          context,
          context.$plugins.use,
          this.logger,
          telemetry,
          parentSpan,
        );

        if (!globalResult.success) {
          this.logger?.debug("Global middleware early return");
          const response = globalResult.earlyReturn!;
          this.logResponse(request, response, startTime);
          return response;
        }

        context = globalResult.updatedContext;
      }

      // Step 6: Execute action-specific middlewares with telemetry
      if (handler.use && Array.isArray(handler.use)) {
        const actionResult = await MiddlewareExecutorProcessor.executeAction(
          context,
          handler.use as IgniterProcedure<unknown, unknown, unknown>[],
          this.logger,
          telemetry,
          parentSpan,
        );

        if (!actionResult.success) {
          this.logger?.debug("Action middleware early return", {
            responseType: typeof actionResult.earlyReturn,
            skipActionExecution: true,
          });

          const response = actionResult.earlyReturn!;
          this.logResponse(request, response, startTime);
          return response;
        }

        context = actionResult.updatedContext;
      }

      // Step 7: Execute action handler
      const actionResponse = await this.executeAction(handler, context);

      // Step 8: Handle successful response
      const response = await this.handleSuccessfulResponse(
        actionResponse,
        context,
        telemetrySpan,
        startTime,
        request,
      );

      this.logResponse(request, response, startTime);
      return response;
    } catch (error) {
      this.logger?.error("Request processing failed", {
        component: "RequestProcessor",
        path,
        method,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Step 9: Handle errors
      if (context!) {
        const errorResult = await ErrorHandlerProcessor.handleError(
          error,
          context,
          telemetrySpan,
          startTime,
          this.logger,
        );

        const response = errorResult.response;
        this.logResponse(request, response, startTime);
        return response;
      } else {
        // Context initialization failed
        const errorResult =
          await ErrorHandlerProcessor.handleInitializationError(
            error,
            null,
            telemetrySpan,
            startTime,
            this.logger,
          );

        const response = errorResult.response;
        this.logResponse(request, response, startTime);
        return response;
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
    this.logger?.debug("Action handler executing");

    // Get telemetry from context
    const telemetry = context.$plugins?.telemetry || null;

    // Validate and parse body and query to ensure correct types
    try {
      if (handler.body) {
        this.logger?.debug("Validating and parsing request body");
        context.request.body = handler.body.parse(context.request.body);

        // Record validation success
        TelemetryManagerProcessor.recordValidation(
          telemetry,
          "body",
          true,
          0,
          this.logger,
        );
      }
      if (handler.query) {
        this.logger?.debug("Validating and parsing request query");
        context.request.query = handler.query.parse(context.request.query);

        // Record validation success
        TelemetryManagerProcessor.recordValidation(
          telemetry,
          "query",
          true,
          0,
          this.logger,
        );
      }
    } catch (validationError) {
      this.logger?.warn("Request validation failed", {
        validationErrors: validationError,
        path: context.request.path,
        method: context.request.method,
      });

      // Record validation failure
      const errorCount =
        validationError instanceof z.ZodError
          ? validationError.errors.length
          : 1;
      TelemetryManagerProcessor.recordValidation(
        telemetry,
        handler.body ? "body" : "query",
        false,
        errorCount,
        this.logger,
      );

      throw validationError; // Re-throw to be handled by the main error handler
    }

    this.logger?.debug("Executing action handler function");

    // Execute handler with proper context structure
    this.logger?.debug("Initializing response processor");

    // Initialize response processor with telemetry
    const responseProcessor = IgniterResponseProcessor.init(
      context.$plugins?.store || context.$context?.store,
      context.$context,
      this.logger,
      telemetry,
    );

    const realtimeService = new IgniterRealtimeService(
      context.$plugins?.store || context.$context?.store,
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
        raw: context.request.raw,
      },
      context: context.$context,
      plugins: context.$plugins,
      response: responseProcessor,
      realtime: realtimeService,
    });

    this.logger?.debug("Action handler completed");

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
      this.logger?.debug("Raw response returned", { type: "Response" });
      // It's already a response, we don't need to do much.
      // We could add headers or cookies here if needed in the future.
      return actionResponse;
    }

    // Handle ResponseProcessor objects
    if (actionResponse instanceof IgniterResponseProcessor) {
      this.logger?.debug("Response processor returned", {
        type: "IgniterResponseProcessor",
      });
      const finalResponse = await actionResponse.toResponse();

      // Finish telemetry
      if (telemetrySpan) {
        TelemetryManagerProcessor.finishSpanSuccess(
          telemetrySpan,
          finalResponse.status || 200,
          this.logger,
        );
      }

      this.logger?.debug("Request processed", {
        status: finalResponse.status,
        duration_ms: Date.now() - startTime,
        responseType: "processor",
      });

      return finalResponse;
    }

    this.logger?.debug("Request processed", {
      status: actionResponse?.status || 200,
      duration_ms: Date.now() - startTime,
      responseType: "json",
    });

    // Finish telemetry
    if (telemetrySpan) {
      TelemetryManagerProcessor.finishSpanSuccess(
        telemetrySpan,
        actionResponse?.status || 200,
        this.logger,
      );
    }

    return new Response(JSON.stringify(actionResponse), {
      status: actionResponse?.status || 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Direct call to a specific controller action.
   * Useful for internal calls, testing, and SSR.
   *
   * @param controllerKey - Key of the controller
   * @param actionKey - Key of the action
   * @param input - Input data for the action
   * @param options - Additional options (headers, cookies)
   * @returns The result of the action
   */
  async call<
    TControllerKey extends keyof TConfig["controllers"],
    TActionKey extends keyof TConfig["controllers"][TControllerKey]["actions"],
    TAction extends
      TConfig["controllers"][TControllerKey]["actions"][TActionKey],
  >(
    controllerKey: TControllerKey,
    actionKey: TActionKey,
    input: TAction["$Infer"]["$Input"],
    options?: {
      headers?: Record<string, string>;
      cookies?: Record<string, string>;
      credentials?: RequestCredentials;
    },
  ): Promise<TAction["$Infer"]["$Output"]> {
    // Get the controller
    const controller = this.config.controllers[
      controllerKey as string
    ] as IgniterControllerConfig<any>;
    if (!controller) {
      throw new IgniterError({
        code: "CONTROLLER_NOT_FOUND",
        message: `Controller '${String(controllerKey)}' not found`,
        logger: this.logger,
      });
    }

    // Get the action
    const action = controller.actions[actionKey as string] as IgniterAction<
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
    >;
    if (!action) {
      throw new IgniterError({
        code: "ACTION_NOT_FOUND",
        message: `Action '${String(actionKey)}' not found in controller '${String(controllerKey)}'`,
        logger: this.logger,
      });
    }

    // Determine the base URL and path
    const basePATH =
      this.config.basePATH || process.env.IGNITER_APP_BASE_PATH || "/api/v1";
    const baseURL =
      this.config.baseURL ||
      process.env.IGNITER_APP_BASE_URL ||
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
      if (action.method === "GET" && input?.query) {
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
        .join("; ");
      if (cookieString) {
        plainHeaders["Cookie"] = plainHeaders["Cookie"]
          ? `${plainHeaders["Cookie"]}; ${cookieString}`
          : cookieString;
      }
    }

    // Fix: Only include body for methods that allow it (not GET or HEAD)
    const method = action.method?.toUpperCase?.() || "GET";
    const hasBody = input?.body && !["GET", "HEAD"].includes(method);

    const requestInit: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...plainHeaders,
      },
      credentials: input?.credentials,
      ...(hasBody ? { body: JSON.stringify(input.body) } : {}),
    };

    // Remove Content-Type if no body (GET/HEAD), to avoid misleading header
    if (!hasBody) {
      delete (requestInit.headers as Record<string, string>)["Content-Type"];
    }

    const request = new Request(actionEndpointURL, requestInit);

    // Process the request
    const response = await this.process(request);
    const result = await parseResponse(response);
    return result;
  }

  /**
   * Publish a custom event to an SSE channel
   * @param channel Channel ID
   * @param eventType Event type
   * @param data Event payload
   */
  public publishEvent(channel: string, eventType: string, data: any): void {
    SSEProcessor.publishEvent(
      {
        channel,
        type: eventType,
        data,
      },
      this.logger,
    );
  }

  /**
   * Publish a system event
   * @param type Event type
   * @param data Event payload
   */
  public publishSystemEvent(type: string, data: any): void {
    this.publishEvent("system", type, data);
  }

  /**
   * Revalidate queries across all connected clients
   * @param queryKeys Keys to invalidate
   */
  public revalidateQueries(queryKeys: string[]): void {
    const keysArray = Array.isArray(queryKeys) ? queryKeys : [queryKeys];

    SSEProcessor.publishEvent(
      {
        channel: "revalidation",
        type: "revalidate",
        data: {
          queryKeys: keysArray,
          timestamp: new Date().toISOString(),
        },
      },
      this.logger,
    );
  }

  /**
   * Publish an event to a specific action stream
   * @param controllerKey Controller key
   * @param actionKey Action key
   * @param data Event data
   */
  public publishToActionStream(
    controllerKey: string,
    actionKey: string,
    data: any,
  ): number {
    const channelId = `${controllerKey}.${actionKey}`;

    if (!SSEProcessor.channelExists(channelId)) {
      this.logger?.warn("Action channel not found", {
        action: `${controllerKey}.${actionKey}`,
      });
      return 0;
    }

    return SSEProcessor.publishEvent(
      {
        channel: channelId,
        type: "data",
        data,
      },
      this.logger,
    );
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }

    const ip =
      request.headers.get("x-real-ip") || request.headers.get("x-client-ip");

    // In local development, it might be undefined
    return ip || "127.0.0.1";
  }

  /**
   * Get content length safely
   */
  private getContentLength(request: Request): number | null {
    const contentLength = request.headers.get("content-length");
    if (contentLength) {
      return parseInt(contentLength, 10);
    }
    return null;
  }

  /**
   * @deprecated Use new RequestProcessor(config).process(request) instead.
   * This static method is kept for backward compatibility but will be removed in v1.0.
   */
  static async process(
    request: Request,
    config: RequestProcessorConfig<any>,
  ): Promise<any> {
    const startTime = Date.now();
    let statusCode = 200;
    let error = null;

    try {
      const processor = new RequestProcessor(config);
      const finalResponse = await processor.process(request);
      statusCode = finalResponse.status;
      return {
        data: finalResponse, // Return the Response object directly for now to maintain compat signature
        status: finalResponse.status,
        headers: finalResponse.headers,
      };
    } catch (e) {
      error = e;
      statusCode = 500;
      throw e;
    } finally {
      // We can't easily track metrics here without an instance,
      // but the instance method handles tracking internally.
    }
  }
}
