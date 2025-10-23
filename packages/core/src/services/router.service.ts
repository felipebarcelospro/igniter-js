import type { ContextCallback, DocsConfig, IgniterBaseConfig, IgniterControllerConfig, IgniterRouter } from "../types";
import type { IgniterPlugin } from "../types/plugin.interface";
import { RequestProcessor } from "../processors";
import { createServerCaller } from "./caller.server.service";
import { parseURL } from "@/utils";
import { initializeIgniterPlayground } from "./playground.service";
import { IgniterConsoleLogger } from "./logger.service";
import { resolveLogLevel, createLoggerContext } from "../utils/logger";


/**
 * Creates a fully-typed, production-ready router instance for the Igniter Framework.
 *
 * The router is the central entrypoint for all HTTP requests, mapping them to your controllers and actions.
 * It provides a type-safe API for server-side request handling, context injection, plugin integration, and more.
 *
 * ---
 * ## Best Practices
 * - **Define your context and plugins up front** for maximum type safety and DX.
 * - **Group related actions into controllers** for modularity and maintainability.
 * - **Leverage plugins** for cross-cutting concerns (auth, logging, telemetry, etc).
 * - **Use the `caller` property** for type-safe server-side invocation (great for testing and SSR).
 * - **Always use the `handler` method** as your HTTP entrypoint (e.g., in Next.js, Express, or custom servers).
 *
 * ---
 * ## Examples
 *
 * ### 1. Minimal Example (No Plugins)
 * ```typescript
 * import { createIgniterRouter } from "@igniter-js/core";
 * import { userController } from "./controllers/user.controller";
 *
 * const router = createIgniterRouter({
 *   context: async (req) => ({
 *     db: await connectToDatabase(),
 *     user: await getCurrentUser(req),
 *   }),
 *   controllers: {
 *     users: userController,
 *   },
 *   plugins: {},
 * });
 *
 * // In your server handler (e.g., Next.js API route, Express, etc)
 * export default async function handler(req: Request) {
 *   return router.handler(req);
 * }
 * ```
 *
 * ### 2. With Plugins and Multiple Controllers
 * ```typescript
 * import { igniter } from "@/igniter";
 * import { userController } from "./features/user/user.controller";
 * import { postController } from "./features/post/post.controller";
 * import { telemetry } from "./plugins/telemetry";
 *
 * const router = igniter.router({
 *   context: async (req) => ({
 *     db: await connectToDatabase(),
 *     user: await getCurrentUser(req),
 *   }),
 *   plugins: {
 *     telemetry: telemetry,
 *   },
 *   controllers: {
 *     users: userController,
 *     posts: postController,
 *   },
 * });
 * ```
 *
 * ### 3. Type-Safe Server-Side Calls (SSR, Testing)
 * ```typescript
 * // Call an action directly on the server (bypassing HTTP)
 * const result = await router.caller.users.getUserById({ id: "123" });
 * ```
 *
 * ### 4. Customizing Base URL and Path
 * ```typescript
 * const router = igniter.router({
 *   // ...other config
 *   baseURL: "/api",
 *   basePATH: "/v1",
 * });
 * // All routes will be prefixed with /api/v1
 * ```
 *
 * ---
 * ## Parameters
 * @template TContext - The type of the application context (inferred from your context factory)
 * @template TControllers - Record of controllers configured for this router
 * @template TConfig extends IgniterBaseConfig - The router configuration object
 * @template TPlugins extends Record<string, IgniterPlugin<any, any, any, any, any, any, any, any>> - Record of plugins available in this router
 *
 * @param config - The router configuration object:
 *   - `context`: The context factory or object (async or sync) available to all actions.
 *   - `plugins`: Plugins to inject into the context (auth, telemetry, etc).
 *   - `controllers`: A record of controller modules (grouped actions).
 *   - `baseURL` (optional): The base URL prefix for all routes (e.g., "/api").
 *   - `basePATH` (optional): The base path for all routes (e.g., "/v1").
 *
 * @returns A fully-configured, type-safe IgniterRouter instance:
 *   - `$context`: The inferred context type.
 *   - `$plugins`: The inferred plugins type.
 *   - `caller`: Type-safe server-side action invoker.
 *   - `controllers`: The registered controllers.
 *   - `config`: The router config (baseURL, basePATH).
 *   - `handler`: The HTTP request handler (async function).
 *
 * ---
 * ## Advanced Usage
 * - **Dynamic Context**: Pass an async function to `context` for per-request context (e.g., user/session).
 * - **Testing**: Use `caller` for fast, type-safe unit/integration tests without HTTP.
 * - **Custom Adapters**: Use `handler` in any Node.js/Edge/Serverless environment.
 * - **Type Inference**: All types are inferred automatically for maximum DX.
 *
 * ---
 * ## See Also
 * - [Controller Documentation](https://igniterjs.dev/docs/controllers)
 * - [Plugin System](https://igniterjs.dev/docs/plugins)
 * - [Context Patterns](https://igniterjs.dev/docs/context)
 * - [Testing Guide](https://igniterjs.dev/docs/testing)
 */
export const createIgniterRouter = <
  TContext extends object | ContextCallback,
  TControllers extends Record<string, IgniterControllerConfig<any>>,
  TConfig extends IgniterBaseConfig,
  TPlugins extends Record<string, IgniterPlugin<any, any, any, any, any, any, any, any>> = {},
  TDocs extends DocsConfig = { openapi: undefined }
>({
  context,
  controllers,
  config,
  plugins,
  docs
}: {
  context: TContext;
  controllers: TControllers;
  config: TConfig;
  plugins?: TPlugins;
  docs?: TDocs;
}): IgniterRouter<TContext, TControllers, TConfig, TPlugins, TDocs> => {
  type TRouter = IgniterRouter<TContext, TControllers, TConfig, TPlugins, TDocs>;

  const processor = new RequestProcessor<TRouter>({
    baseURL: config.baseURL,
    basePATH: config.basePATH,
    controllers: controllers,
    plugins: plugins,
    context: context,
    docs: docs,
  });

  return {
    /**
     * Type-safe server-side action invoker.
     * Use for SSR, integration tests, or calling actions without HTTP.
     *
     * @example
     * const result = await router.caller.users.getUserById({ id: "123" });
     */
    caller: createServerCaller(controllers, processor) as unknown as TRouter['caller'],

    /**
     * The registered controllers for this router.
     * Each controller groups related actions.
     */
    controllers: controllers,

    /**
     * The router configuration (baseURL, basePATH).
     */
    config: {
      baseURL: config.baseURL,
      basePATH: config.basePATH,
      ...config,
    },

    /**
     * The main HTTP request handler for this router.
     * Pass any standard Request object (Node.js, Edge, etc).
     *
     * @param request - The incoming HTTP request.
     * @returns A Promise resolving to a standard Response object.
     *
     * @example
     * // In Next.js API route
     * export default async function handler(req: Request) {
     *   return router.handler(req);
     * }
     */
    handler: async (request: Request) => {
      const logger = IgniterConsoleLogger.create({
        level: resolveLogLevel(),
        context: createLoggerContext('Router')
      });

      logger.debug('Incoming request:', {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers)
      });

      const url = new URL(request.url);
      const path = url.pathname;
      const basePath = config.basePATH ?? '/api/v1';
      const playgroundPath = docs?.playground?.route ?? '/docs'

      logger.debug('Parsed request:', {
        path,
        basePath,
        playgroundPath,
        fullPath: parseURL(basePath, playgroundPath)
      });

      // Check if is playground
      if (path.startsWith(parseURL(basePath, playgroundPath))) {
        logger.debug('Routing to playground');
        const playground = initializeIgniterPlayground(docs, basePath);
        try {
          const response = await playground.process(request);
          logger.debug('Playground response:', {
            status: response.status,
            headers: Object.fromEntries(response.headers)
          });
          return response;
        } catch (error) {
          logger.error('Playground error:', { error });
          throw error;
        }
      };

      logger.debug('Routing to processor');
      try {
        const response = await processor.process(request);

        logger.debug('Processor response:', {
          status: response.status,
          headers: Object.fromEntries(response.headers)
        });

        return response;
      } catch (error) {
        logger.error('Processor error:', { error });
        throw error;
      }
    },

    $Infer: {
      $context: {},
      $plugins: {}
    }
  } as TRouter;
};
