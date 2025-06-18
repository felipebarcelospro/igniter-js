import type { IgniterRouterConfig, IgniterAction, IgniterControllerConfig, IgniterActionContext, IgniterProcedure } from "../types";
import { addRoute, createRouter, findRoute, type RouterContext } from "rou3";
import { IgniterError } from "../error";
import { IgniterCookie } from "../services/cookie.service";
import { IgniterResponseProcessor } from "./response.processor";
import { getHeadersSafe } from "../adapters/next";
import { parseURL } from "../utils/url";
import type { RequestProcessorInterface } from "../types/request.processor";
import { parseResponse } from "../utils/response";

/**
 * Handles HTTP request processing for the Igniter Framework.
 * This class manages route registration, request handling, and response processing.
 * 
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
export class RequestProcessor<TConfig extends IgniterRouterConfig<any, any>> implements RequestProcessorInterface<TConfig> {
  public config: TConfig;
  public router: RouterContext<IgniterAction<any, any, any, any, any, any, any, any, any>>;

  /**
   * Creates a new RequestProcessor instance.
   * 
   * @param config - Router configuration containing endpoint and controllers
   */
  constructor(config: TConfig) {
    this.config = config;
    this.router = this.register(config);
  }

  /**
   * Extracts and parses the request body based on content type.
   * Supports various content types including JSON, form data, files, and streams.
   * 
   * @param request - The incoming HTTP request
   * @returns The parsed request body or undefined if parsing fails
   * 
   * @example
   * ```typescript
   * const body = await processor.getBody(request);
   * if (body) {
   *   // Handle parsed body
   * }
   * ```
   */
  private async getBody(request: Request) {
    try {
      const contentType = request.headers.get("content-type") || "";

      if (!request.body) {
        return undefined;
      }

      if (contentType.includes("application/json")) {
        return await request.json();
      }

      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await request.formData();
        const result: Record<string, string> = {};
        formData.forEach((value, key) => {
          result[key] = value.toString();
        });
        return result;
      }

      if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        const result: Record<string, any> = {};
        formData.forEach((value, key) => {
          result[key] = value;
        });
        return result;
      }

      if (contentType.includes("text/plain")) {
        return await request.text();
      }

      if (contentType.includes("application/octet-stream")) {
        return await request.arrayBuffer();
      }

      if (
        contentType.includes("application/pdf") ||
        contentType.includes("image/") ||
        contentType.includes("video/")
      ) {
        const blob = await request.blob();
        return blob;
      }

      if (contentType.includes("application/stream") || request.body instanceof ReadableStream) {
        return request.body;
      }

      return await request.text();
    } catch (error) {
      console.error(`# BODY_PARSE_ERROR: `, error);
      
      // Throw structured error instead of returning undefined
      throw new IgniterError({
        code: 'BODY_PARSE_ERROR',
        message: 'Failed to parse request body',
        details: error instanceof Error ? error.message : 'Invalid request body format'
      });
    }
  }

  /**
   * Registers routes from the configuration into the router.
   * Creates a routing table based on controller and action configurations.
   * 
   * @param config - Router configuration containing controllers and endpoints
   * @returns Configured router instance
   * 
  */
  private register(router: IgniterRouterConfig<any, any>) {
    const innerRouter = createRouter<IgniterAction<any, any, any, any, any, any, any, any, any>>();

    for (const controller of Object.values(router.controllers) as IgniterControllerConfig<any, any>[]) {
      for (const endpoint of Object.values(controller.actions) as IgniterAction<any, any, any, any, any, any, any, any, any>[]) {
        let basePATH = router.basePATH || process.env.IGNITER_APP_BASE_PATH || '/api/v1';
        let path = parseURL(basePATH, controller.path, endpoint.path);

        addRoute(innerRouter, endpoint.method, path, endpoint);
      }
    }

    return innerRouter;
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
  async process(request: Request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (!path?.length) {
      return new Response(null, { status: 404, statusText: "Not Found" });
    }

    const route = findRoute(this.router, method, path);
    if (!route?.data) {
      return new Response(null, { status: 404, statusText: "Not Found" });
    }

    const handler = route.data as IgniterAction<any, any, any, any, any, any, any, any, any>;
    const cookies = new IgniterCookie(request.headers);
    const response = new IgniterResponseProcessor();
    const routeContext = await this.config.context?.(request);

    const context: IgniterActionContext<any, any, any, any, any, any> = {
      request: {
        path,
        method: request.method as "GET",
        params: route.params ? (JSON.parse(JSON.stringify(route.params)) as any) : {},
        headers: request.headers,
        cookies: cookies,
        body: await this.getBody(request),
        query: Object.fromEntries(url.searchParams),
      },
      response: response,
      context: routeContext,
    };

    // Only execute middlewares if they exist
    if (handler.use && Array.isArray(handler.use)) {
      for (const use of handler.use as IgniterProcedure<any, any, any>[]) {
        // @ts-expect-error - This is a hack to get around the fact that the middleware handler is not typed
        const result = await use.handler(context)

        if (result instanceof Response) {
          return result;
        }

        if (result instanceof IgniterResponseProcessor) {
          return result.toResponse();
        }

        // Merge the middleware result into context.context
        context.context = {
          ...context.context,
          ...result
        };
      }
    }

    try {
      if (handler.body) handler.body.parse(context.request.body)
      if (handler.query) handler.query.parse(context.request.query)

      const response = await route.data.handler(context);

      if (response instanceof Response) {
        return response;
      }

      if (response instanceof IgniterResponseProcessor) {
        return response.toResponse();
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error(`# SERVER_ERROR: `, error);

      // Zod validation errors
      if (error && typeof error === 'object' && 'issues' in error) {
        return new Response(JSON.stringify({
          error: {
            message: "Validation Error",
            code: 'VALIDATION_ERROR',
            details: error.issues,
          },
          data: null
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // IgniterError instances
      if (error instanceof IgniterError) {
        return new Response(JSON.stringify({
          error: {
            message: error.message,
            code: error.code,
            details: error.details,
          },
          data: null
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Generic errors
      const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
      return new Response(JSON.stringify({
        error: {
          message: errorMessage,
          code: 'INTERNAL_SERVER_ERROR',
          details: process.env.NODE_ENV === 'development' ? error : undefined,
        },
        data: null
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
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
   * 
   * @example
   * ```typescript
   * const result = await processor.call(
   *   'users',
   *   'create',
   *   { body: { name: 'John', email: 'john@example.com' } }
   * );
   * ```
   */
  async call<
    TControllerKey extends keyof TConfig['controllers'],
    TActionKey extends keyof TConfig['controllers'][TControllerKey]["actions"],
    TAction extends TConfig['controllers'][TControllerKey]["actions"][TActionKey]
  >(
    controllerKey: TControllerKey,
    actionKey: TActionKey,
    input: TAction['$Infer']['$Input'] & { params?: Record<string, string | number> }
  ): Promise<TAction['$Infer']['$Output']> {
    // Get the controller
    const controller = this.config.controllers[controllerKey];
    if (!controller) {
      throw new IgniterError({
        code: 'CONTROLLER_NOT_FOUND',
        message: `Controller ${controllerKey.toString()} not found`
      })
    }

    // Get the action
    const action = controller.actions[actionKey] as TAction;
    if (!action) {
      throw new IgniterError({
        code: 'ACTION_NOT_FOUND',
        message: `Action ${actionKey.toString()} not found`,
      });
    }

    // Get the base path and URL
    const basePATH = this.config.basePATH || process.env.IGNITER_APP_PATH || '/api/v1';
    const baseURL = this.config.baseURL || process.env.IGNITER_APP_URL || 'http://localhost:3000';

    // Construct the URL with parameters
    function constructURL(
      baseURL: string,
      basePATH: string,
      controllerPath: string,
      actionPath: string,
      input: Record<string, any>
    ) {
      let url = parseURL(baseURL, basePATH, controllerPath, actionPath);
      if (!input || !input.params) return url
      
      for (const [key, value] of Object.entries(input.params)) {
        url = url.replace(`:${key}`, String(value));
      }

      return url;
    }

    const actionEndpointURL = constructURL(baseURL, basePATH, controller.path, action.path, input);

    // Safely get headers in the server environment
    const reqHeaders = new Headers({});

    // Safely try to get headers from next/headers if we're in a RSC
    const serverHeaders = await getHeadersSafe();

    // Merge server headers with request headers (request headers take precedence)
    serverHeaders.forEach((value, key) => {
      if (!reqHeaders.has(key)) {
        reqHeaders.set(key, value);
      }
    });

    // Prepare context with the input data
    const request = new Request(actionEndpointURL, {
      method: action.method,
      headers: reqHeaders,
      body: input?.body ? JSON.stringify(input.body) : undefined,
    });

    // Call the action handler directly
    const response = await this.process(request);
    const result = await parseResponse(response);
    return result;
  }
}
