import { RequestProcessor } from "../processors/request.processor";
import type { IgniterControllerConfig, IgniterRouter, IgniterRouterConfig } from "../types";

/**
 * Creates a new router instance for the Igniter Framework.
 * The router is responsible for handling requests and routing them to appropriate controllers.
 * 
 * @template TContext - The type of the application context
 * @template TControllers - Record of controllers configured for this router
 * 
 * @param config - The router configuration object
 * @returns A configured router instance
 * 
 * @example
 * ```typescript
 * const router = createIgniterRouter({
 *   endpoint: '/api/v1',
 *   controllers: {
 *     users: userController,
 *     posts: postController
 *   },
 *   context: async (req) => ({
 *     db: await connectToDatabase(),
 *     user: await getCurrentUser(req)
 *   })
 * });
 * 
 * // Use in a server
 * server.on('request', async (req, res) => {
 *   const response = await router.handler(req);
 *   res.send(response);
 * });
 * ```
 */
export const createIgniterRouter = <
  TContext extends object,
  TControllers extends Record<string, IgniterControllerConfig<TContext, any>>,
  TConfig extends IgniterRouterConfig<any, any> = IgniterRouterConfig<TContext, TControllers>
>(
  config: TConfig
): IgniterRouter<TContext, TControllers> => {
  const requestProcessor = new RequestProcessor<TConfig>(config);

  return {
    controllers: config.controllers,
    processor: requestProcessor,
    config: {
      baseURL: config.baseURL,
      basePATH: config.basePATH
    },
    handler: async (request: Request) => {
      const response = await requestProcessor.process(request);
      return response;
    },    
  };
};

