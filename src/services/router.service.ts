import { RequestProcessor } from "../processors/request.processor";
import type { IgniterControllerConfig, IgniterRouter, IgniterRouterConfig, IgniterRouterSchema } from "../types";

/**
 * Extracts a clean schema from router for client-side usage.
 * Removes all server-side logic (handlers, middleware, adapters).
 */
export function extractRouterSchema<
  TContext extends object,
  TControllers extends Record<string, IgniterControllerConfig<TContext, any>>
>(router: IgniterRouter<TContext, TControllers>) {
  const controllersSchema: Record<string, any> = {};
  
  for (const [controllerName, controller] of Object.entries(router.controllers)) {
    const actionsSchema: Record<string, any> = {};
    
    for (const [actionName, action] of Object.entries(controller.actions) as IgniterControllerConfig<TContext, any>['actions']) {
      // Extract only safe metadata - NO handlers, middleware, etc.
      actionsSchema[actionName] = {
        path: action.path,
        method: action.method,
        description: action.description,
        // Keep type inference data
        $Infer: action.$Infer,
        // Remove: handler, use, $Caller
      };
    }
    
    controllersSchema[controllerName] = {
      name: controller.name,
      path: controller.path,
      actions: actionsSchema,
      // Remove any other controller metadata that might contain server logic
    };
  }
  
  return {
    config: {
      baseURL: router.config.baseURL,
      basePATH: router.config.basePATH,
    },
    controllers: controllersSchema,
    // Explicitly NOT including: processor, handler, context functions
  };
}

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

