import { addRoute, createRouter, type RouterContext } from "rou3";
import { IgniterError } from "../error";
import { IgniterResponseProcessor } from "./response.processor";
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
import type { ProcessedContext } from "./context-builder.processor";
import { ContextBuilderProcessor } from "./context-builder.processor";
import { MiddlewareExecutorProcessor } from "./middleware-executor.processor";
import { ErrorHandlerProcessor } from "./error-handler.processor";
import { BodyParserProcessor } from "./body-parser.processor";
import { IgniterPluginManager } from "../services/plugin.service";
import chalk, { ChalkInstance } from "chalk";
import { generateRequestId, getRequestIp } from "../utils/request";
import type { IgniterCoreTelemetryManager } from "../types/telemetry.interface";
import { createCorsMiddleware } from "../middlewares/cors.middleware";
import { createRateLimitMiddleware } from "../middlewares/rate-limit.middleware";
import type {
  IgniterOnRequestHook,
  IgniterOnResponseHook,
  IgniterErrorHandler,
} from "../types/router.interface";

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
> implements RequestProcessorInterface<TRouter, TConfig> {
  public plugins: Map<string, any>;
  public config: TConfig;
  public router: RouterContext<
    IgniterAction<any, any, any, any, any, any, any, any, any, any>
  >;
  public pluginManager?: IgniterPluginManager<any>;
  private logger?: IgniterLogger;
  private builderMiddlewares: IgniterProcedure<any, any, any>[] = [];

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

    // Pre-instantiate builder middlewares to preserve state (e.g., Rate Limiting)
    this.initializeBuilderMiddlewares();

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
   * Initialize builder-level middlewares (CORS, Rate Limit, etc.)
   */
  private initializeBuilderMiddlewares(): void {
    if (!this.config.$builder) return;

    // Add CORS if configured
    if (this.config.$builder.cors) {
      this.builderMiddlewares.push(
        createCorsMiddleware(this.config.$builder.cors) as any,
      );
    }

    // Add Rate Limit if configured
    if (this.config.$builder.rateLimit) {
      this.builderMiddlewares.push(
        createRateLimitMiddleware(this.config.$builder.rateLimit) as any,
      );
    }

    // Add custom builder middlewares
    if (this.config.$builder.middlewares) {
      this.builderMiddlewares.push(...this.config.$builder.middlewares);
    }
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
        const store = this.config.store;
        const logger = this.config.logger || this.logger;

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
   * Registers all routes (controllers + plugins) into the router.
   * Creates a routing table based on controller and plugin configurations.
   */
  private registerRoutes(): void {
    const basePATH =
      this.config.basePATH || process.env.IGNITER_APP_BASE_PATH || "/api/v1";

    this.logger?.debug("Registering routes", { basePATH });
    let routeCount = 0;

    // Register application controllers and actions
    for (const [controllerKey, controller] of Object.entries(
      this.config.controllers,
    ) as [string, IgniterControllerConfig<any>][]) {
      for (const [actionKey, endpoint] of Object.entries(
        controller.actions,
      ) as [
        string,
        IgniterAction<any, any, any, any, any, any, any, any, any, any>,
      ][]) {
        endpoint.$meta = {
          controller: controllerKey,
          action: actionKey,
          pathKey: `${controllerKey}.${actionKey}`,
        };

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
              $meta: {
                controller: `plugins.${pluginName}.${controllerName}`,
                action: actionName,
                pathKey: `plugins.${pluginName}.${controllerName}.${actionName}`,
              },
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

    const telemetry =
      (this.config.telemetry ??
        this.config?.plugins?.telemetry ??
        null) as IgniterCoreTelemetryManager | null;
    let context: ProcessedContext | null = null;

    const basePATH =
      this.config.basePATH || process.env.IGNITER_APP_BASE_PATH || "/api/v1";
    const sseEndpoint = parseURL(basePATH, "/sse/events");

    try {
      this.logger?.debug("Processing request", { method, path, basePATH });
      // 1. Health Check
      const healthCheckPath = this.config.$builder?.healthCheck?.path;
      if (healthCheckPath) {
        const fullHealthPath = parseURL(basePATH, healthCheckPath);
        this.logger?.debug("Health check check", { path, fullHealthPath });
        if (path === fullHealthPath) {
          return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      // 2. onRequest Hook
      if (this.config.$builder?.onRequest) {
        this.logger?.debug("Calling onRequest hook");
        await this.config.$builder.onRequest(request);
      }

      // Check if this is an SSE request to the central endpoint
      const pathDepth = path.split("/").filter(Boolean).length;
      const queryCount = Array.from(url.searchParams.keys()).length;
      const headersCount = Array.from(request.headers.keys()).length;
      const contentLength = Number(
        request.headers.get("content-length") ?? "0",
      );
      const hasBody = contentLength > 0 || !!request.headers.get("content-type");

      telemetry?.emit("igniter.core.http.request.started", {
        level: "debug",
        attributes: {
          "ctx.http.method": request.method,
          "ctx.http.path_depth": pathDepth,
          "ctx.http.query_count": queryCount,
          "ctx.http.headers_count": headersCount,
          "ctx.http.has_body": hasBody,
          "ctx.http.is_sse": path === sseEndpoint,
        },
      });

      if (path === sseEndpoint && method === "GET") {
        this.logger?.debug("SSE connection received", { url: request.url });
        if (!this.config.realtime) {
          telemetry?.emit("igniter.core.http.request.error", {
            level: "error",
            attributes: {
              "ctx.http.method": request.method,
              "ctx.http.path_key": path,
              "ctx.http.path_depth": path.split("/").filter(Boolean).length,
              "ctx.http.query_count": Array.from(url.searchParams.keys()).length,
              "ctx.http.headers_count": Array.from(request.headers.keys()).length,
              "ctx.http.has_body": false,
              "ctx.http.is_sse": true,
              "ctx.http.status_code": 501,
              "ctx.http.duration_ms": Date.now() - startTime,
              "ctx.error.type": "runtime",
              "ctx.error.code": "REALTIME_NOT_CONFIGURED",
              "ctx.error.message": "Realtime is not configured",
              "ctx.error.component": "RequestProcessor",
            },
          });
          return new Response("Realtime is not configured", { status: 501 });
        }
        const response = await this.config.realtime.openConnection(request);

        telemetry?.emit("igniter.core.http.request.success", {
          level: "debug",
          attributes: {
            "ctx.http.method": request.method,
            "ctx.http.path_key": path,
            "ctx.http.path_depth": path.split("/").filter(Boolean).length,
            "ctx.http.query_count": Array.from(url.searchParams.keys()).length,
            "ctx.http.headers_count": Array.from(request.headers.keys()).length,
            "ctx.http.has_body": false,
            "ctx.http.is_sse": true,
            "ctx.http.status_code": response.status || 200,
            "ctx.http.duration_ms": Date.now() - startTime,
            "ctx.response.type": "stream",
          },
        });

        return response;
      }

      // Step 2: Build initial context with telemetry (no params yet)
      context = await ContextBuilderProcessor.build(
        this.config,
        request,
        {},
        url,
        false, // Don't parse body yet for global middlewares
        this.logger,
        telemetry,
      );

      // Step 3: Enhance context with plugins
      context = await ContextBuilderProcessor.enhanceWithPlugins(
        context,
        this.pluginManager,
        this.logger,
        telemetry,
      );

      // Step 4: Prepare all global middlewares (plugin-provided + builder-provided)
      const allGlobalMiddlewares = [
        ...(Array.isArray(context.$plugins.use) ? context.$plugins.use : []),
        ...this.builderMiddlewares,
      ];

      // Step 5: Execute global middlewares with telemetry
      if (allGlobalMiddlewares.length > 0) {
        const globalResult = await MiddlewareExecutorProcessor.executeGlobal(
          context,
          allGlobalMiddlewares as IgniterProcedure<unknown, unknown, unknown>[],
          this.logger,
          telemetry,
        );

        if (!globalResult.success) {
          this.logger?.debug("Global middleware early return");
          const response = globalResult.earlyReturn!;
          this.logResponse(request, response, startTime);
          return response;
        }

        context = globalResult.updatedContext;
      }

      const routeResult = RouteResolverProcessor.resolve(
        this.router,
        method,
        path,
        this.logger,
        telemetry,
      );

      if (!routeResult.success) {
        let response = new Response(null, {
          status: routeResult.error!.status,
          statusText: routeResult.error!.statusText,
        });

        // Apply CORS headers to 404/error responses if configured
        if (this.config.$builder?.cors) {
          const { applyCorsToResponse } = await import(
            "../middlewares/cors.middleware"
          );
          response = applyCorsToResponse(
            response,
            request,
            this.config.$builder.cors,
          );
        }

        telemetry?.emit("igniter.core.http.request.success", {
          level: "debug",
          attributes: {
            "ctx.http.method": request.method,
            "ctx.http.path_key": path,
            "ctx.http.path_depth": path.split("/").filter(Boolean).length,
            "ctx.http.query_count": Array.from(url.searchParams.keys()).length,
            "ctx.http.headers_count": Array.from(request.headers.keys()).length,
            "ctx.http.has_body":
              Number(request.headers.get("content-length") ?? "0") > 0 ||
              !!request.headers.get("content-type"),
            "ctx.http.is_sse": path === sseEndpoint,
            "ctx.http.status_code": response.status,
            "ctx.http.duration_ms": Date.now() - startTime,
            "ctx.response.type": "raw",
          },
        });

        this.logResponse(request, response, startTime);
        return response;
      }

      const { action, params } = routeResult;
      const handler = action!;
      this.logger?.debug("Route resolved", { method, path, params });

      // Step 7: Finalize context with route params and body
      context.request.params = params ?? {};
      if (handler.body) {
        context.request.body = await BodyParserProcessor.parse(
          request,
          true,
          this.logger,
          telemetry,
        );
      }

      // Step 6: Execute action-specific middlewares with telemetry
      if (handler.use && Array.isArray(handler.use)) {
        const actionResult = await MiddlewareExecutorProcessor.executeAction(
          context,
          handler.use as IgniterProcedure<unknown, unknown, unknown>[],
          this.logger,
          telemetry,
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
      const { response, responseType, statusCode } =
        await this.handleSuccessfulResponse(
          actionResponse,
          context,
          startTime,
          request,
        );

      telemetry?.emit("igniter.core.http.request.success", {
        level: "debug",
        attributes: {
          "ctx.http.method": request.method,
          "ctx.http.path_key": handler.$meta?.pathKey ?? context.request.path,
          "ctx.http.path_depth": path.split("/").filter(Boolean).length,
          "ctx.http.query_count": Array.from(url.searchParams.keys()).length,
          "ctx.http.headers_count": Array.from(request.headers.keys()).length,
          "ctx.http.has_body":
            Number(request.headers.get("content-length") ?? "0") > 0 ||
            !!request.headers.get("content-type"),
          "ctx.http.is_sse": path === sseEndpoint,
          "ctx.device.type": context.request.device?.device,
          "ctx.device.browser": context.request.device?.browser,
          "ctx.device.os": context.request.device?.os,
          "ctx.geo.country": context.request.geo?.country,
          "ctx.http.status_code": statusCode,
          "ctx.http.duration_ms": Date.now() - startTime,
          "ctx.response.type": responseType as
            | "json"
            | "error"
            | "stream"
            | "no_content"
            | "raw",
        },
      });

      this.logResponse(request, response, startTime);

      // 9. onResponse Hook
      if (this.config.$builder?.onResponse) {
        await this.config.$builder.onResponse(response, request);
      }

      return response;
    } catch (error) {
      this.logger?.error("Request processing failed", {
        component: "RequestProcessor",
        path,
        method,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      const errorType =
        error instanceof z.ZodError
          ? "validation"
          : error instanceof IgniterError
            ? "igniter"
            : context
              ? "generic"
              : "initialization";
      const errorCode =
        error instanceof IgniterError
          ? error.code
          : error instanceof z.ZodError
            ? "VALIDATION_ERROR"
            : "INTERNAL_SERVER_ERROR";

      // Re-parse URL safely for error telemetry context
      const url = new URL(request.url);
      const sseEndpoint = this.config.$builder?.healthCheck?.path ?? "/api/sse/events";

      telemetry?.emit("igniter.core.http.request.error", {
        level: "error",
        attributes: {
          "ctx.http.path": path,
          "ctx.http.method": request.method,
          "ctx.http.path_key": context?.request?.path ?? path,
          "ctx.http.path_depth": path.split("/").filter(Boolean).length,
          "ctx.http.query_count": Array.from(url.searchParams.keys()).length,
          "ctx.http.headers_count": Array.from(request.headers.keys()).length,
          "ctx.http.has_body":
            Number(request.headers.get("content-length") ?? "0") > 0 ||
            !!request.headers.get("content-type"),
          "ctx.http.is_sse": path === sseEndpoint,
          "ctx.device.type": context?.request?.device?.device,
          "ctx.device.browser": context?.request?.device?.browser,
          "ctx.device.os": context?.request?.device?.os,
          "ctx.geo.country": context?.request?.geo?.country,
          "ctx.http.duration_ms": Date.now() - startTime,
          "ctx.error.type": errorType,
        },
      });

      // Step 9: Handle errors
      if (context) {
        // 10. errorHandler Hook
        if (this.config.$builder?.errorHandler) {
          try {
            return await this.config.$builder.errorHandler(error as Error, context, request);
          } catch (handlerError) {
            this.logger?.error("Error handler failed", { error: handlerError });
          }
        }

        const errorResult = await ErrorHandlerProcessor.handleError(
          error,
          context,
          startTime,
          this.logger,
          telemetry,
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
            startTime,
            this.logger,
            telemetry,
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

    const telemetry =
      (this.config.telemetry ??
        this.config.plugins?.telemetry ??
        null) as IgniterCoreTelemetryManager | null;

    // Validate and parse body and query to ensure correct types
    try {
      if (handler.body) {
        this.logger?.debug("Validating and parsing request body");
        telemetry?.emit("igniter.core.validation.started", {
          level: "debug",
          attributes: {
            "ctx.validation.type": "body",
          },
        });
        context.request.body = handler.body.parse(context.request.body);

        telemetry?.emit("igniter.core.validation.success", {
          level: "debug",
          attributes: {
            "ctx.validation.type": "body",
            "ctx.validation.errors_count": 0,
          },
        });
      }
      if (handler.query) {
        this.logger?.debug("Validating and parsing request query");
        telemetry?.emit("igniter.core.validation.started", {
          level: "debug",
          attributes: {
            "ctx.validation.type": "query",
          },
        });
        context.request.query = handler.query.parse(context.request.query);

        telemetry?.emit("igniter.core.validation.success", {
          level: "debug",
          attributes: {
            "ctx.validation.type": "query",
            "ctx.validation.errors_count": 0,
          },
        });
      }
    } catch (validationError) {
      this.logger?.warn("Request validation failed", {
        validationErrors: validationError,
        path: context.request.path,
        method: context.request.method,
      });

      const errorCount =
        validationError instanceof z.ZodError
          ? validationError.errors.length
          : 1;
      telemetry?.emit("igniter.core.validation.error", {
        level: "error",
        attributes: {
          "ctx.validation.type": handler.body ? "body" : "query",
          "ctx.validation.errors_count": errorCount,
          "ctx.error.type": "validation",
          "ctx.error.code": "VALIDATION_ERROR",
          "ctx.error.message":
            validationError instanceof Error
              ? validationError.message
              : "Validation failed",
          "ctx.error.component": "RequestProcessor",
        },
      });

      throw validationError; // Re-throw to be handled by the main error handler
    }

    this.logger?.debug("Executing action handler function");

    const actionType =
      handler.type ?? (handler.method === "GET" ? "query" : "mutation");
    const actionPathKey = handler.$meta?.pathKey ?? context.request.path;
    const actionAttributes = {
      "ctx.action.path_key": actionPathKey,
      "ctx.action.method": context.request.method,
      "ctx.action.type": actionType,
      "ctx.action.has_body": !!handler.body,
      "ctx.action.has_query": !!handler.query,
      "ctx.action.middleware_count": handler.use?.length ?? 0,
    };

    telemetry?.emit("igniter.core.action.execute.started", {
      level: "debug",
      attributes: actionAttributes,
    });

    // Execute handler with proper context structure
    this.logger?.debug("Initializing response processor");

    // Use the existing response processor from context, ensuring state persistence
    const responseProcessor = context.response;

    // Update processor with telemetry and logging context if available
    // @ts-ignore - Valid private access for internal wiring
    if (this.logger) responseProcessor._logger = this.logger;
    // @ts-ignore
    if (telemetry) responseProcessor._telemetry = telemetry;

    const realtimeApi = this.config.realtime?.$api() as any;
    const cacheApi = this.config.cache?.$api() as any;

    const actionStartTime = Date.now();

    // Generate unique request ID for this request
    const requestId = generateRequestId();

    // Create telemetry session for this request
    const telemetrySession = telemetry?.session().id(requestId);

    try {
      // Initialize response processor or reuse existing one to preserve middleware changes
      // const responseProcessor = context.response; // Removed shadowing

      // Execute handler with proper IgniterActionContext structure
      const response = await handler.handler({
        request: {
          id: requestId,
          method: context.request.method as HTTPMethod,
          path: context.request.path,
          params: context.request.params,
          headers: context.request.headers,
          cookies: context.request.cookies,
          ip: context.request.ip,
          device: context.request.device,
          geo: context.request.geo,
          body: context.request.body,
          query: context.request.query,
          raw: context.request.raw,
        },
        context: context.$context,
        plugins: context.$plugins,
        response: responseProcessor,
        realtime: realtimeApi,
        cache: cacheApi,
        telemetry: telemetrySession,
      });

      telemetry?.emit("igniter.core.action.execute.success", {
        level: "debug",
        attributes: {
          ...actionAttributes,
          "ctx.action.duration_ms": Date.now() - actionStartTime,
        },
      });

      this.logger?.debug("Action handler completed");

      return response;
    } catch (error) {
      telemetry?.emit("igniter.core.action.execute.error", {
        level: "error",
        attributes: {
          ...actionAttributes,
          "ctx.action.duration_ms": Date.now() - actionStartTime,
          "ctx.error.type": "runtime",
          "ctx.error.code": "ACTION_EXECUTION_ERROR",
          "ctx.error.message":
            error instanceof Error ? error.message : "Unknown error",
          "ctx.error.component": "RequestProcessor",
        },
      });

      throw error;
    }
  }

  /**
   * Finalizes the response object.
   *
   * @param actionResponse - The raw response from the action
   * @param context - The processed context
   * @param startTime - Request start time
   * @param request - Original request
   * @returns The finalized response
   */
  private async handleSuccessfulResponse(
    actionResponse: any,
    context: ProcessedContext,
    startTime: number,
    request: Request,
  ): Promise<{ response: Response; responseType: string; statusCode: number }> {
    // Check if response is already handled by middleware/guard
    if (actionResponse instanceof Response) {
      return {
        response: actionResponse,
        responseType: "raw",
        statusCode: actionResponse.status,
      };
    }

    // Merge headers from context.response (where middlewares set them)
    // into the final response headers
    const mergeContextHeaders = (headers: Headers) => {
      if (context.response instanceof IgniterResponseProcessor) {
        // @ts-ignore - access private _headers for merging
        const ctxHeaders = context.response._headers as Headers;
        ctxHeaders.forEach((value, key) => {
          headers.set(key, value);
        });
      }
    };

    // Handle direct Response objects
    if (actionResponse instanceof Response) {
      this.logger?.debug("Raw response returned", { type: "Response" });

      const responseHeaders = new Headers(actionResponse.headers);
      mergeContextHeaders(responseHeaders);

      const finalResponse = new Response(actionResponse.body, {
        status: actionResponse.status,
        statusText: actionResponse.statusText,
        headers: responseHeaders,
      });

      const contentType = finalResponse.headers.get("content-type") || "";
      const responseType = contentType.includes("text/event-stream")
        ? "stream"
        : "raw";

      return {
        response: finalResponse,
        responseType,
        statusCode: finalResponse.status || 200,
      };
    }

    // Handle ResponseProcessor objects
    if (actionResponse instanceof IgniterResponseProcessor) {
      this.logger?.debug("Response processor returned", {
        type: "IgniterResponseProcessor",
      });

      // If it's a different instance than context.response, merge headers
      if (actionResponse !== context.response) {
        // @ts-ignore - access private _headers
        const ctxHeaders = context.response._headers as Headers;
        ctxHeaders.forEach((value, key) => {
          actionResponse.setHeader(key, value);
        });
      }

      const finalResponse = await actionResponse.toResponse();

      const statusCode = finalResponse.status || 200; // Default to 200 if not set
      const contentType = finalResponse.headers.get("content-type") || "";
      const responseType = contentType.includes("text/event-stream")
        ? "stream"
        : statusCode === 204
          ? "no_content"
          : actionResponse.responseError
            ? "error"
            : "json";

      this.logger?.debug("Request processed", {
        status: finalResponse.status,
        duration_ms: Date.now() - startTime,
        responseType,
      });

      return { response: finalResponse, responseType, statusCode };
    }

    // Handle plain objects
    this.logger?.debug("Plain object returned, using context response processor");

    // Use the context's response processor to maintain headers set by middlewares
    const processor = context.response;
    let finalSuccessState;

    if (actionResponse?.error) {
      // It seems it returned an error object format
      const err = actionResponse.error;
      // @ts-ignore
      finalSuccessState = processor.error(err.code || "ERR_INTERNAL", err.message, err.data);
    } else {
      // Check for status/headers in plain object response
      let finalData = actionResponse;

      if (typeof actionResponse === 'object' && actionResponse !== null) {
        // Apply status if present
        if ('status' in actionResponse && typeof actionResponse.status === 'number') {
          processor.status(actionResponse.status);
        }
        // Apply headers if present
        if ('headers' in actionResponse && typeof actionResponse.headers === 'object') {
          Object.entries(actionResponse.headers).forEach(([k, v]) => {
            processor.setHeader(k, v as string);
          });
        }

        // Cleanup metadata from data payload if they were used for control
        if (('status' in actionResponse || 'headers' in actionResponse) && !('data' in actionResponse)) {
          const { status, headers, ...rest } = actionResponse;
          finalData = rest;
        }
      }
      finalSuccessState = processor.json(finalData);
    }

    const finalResponse = await finalSuccessState.toResponse();
    const statusCode = finalResponse.status || 200;

    return {
      response: finalResponse,
      responseType: actionResponse?.error ? "error" : "json",
      statusCode,
    };
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
