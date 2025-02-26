import type { IgniterAction, IgniterControllerConfig, IgniterRouter, ClientCallerOptions, ClientConfig, InferRouterCaller, ServerResponse  } from '../types';

import { isServer } from '../utils/client';
import { createUseQuery, createUseMutation } from './hooks';

/**
 * Creates a caller for server actions
 * @param controller Controller name
 * @param action Action name
 * @param router Igniter router
 * @returns A function to call server actions
 */
export const createCaller = <TAction extends IgniterAction<any, any, any, any, any, any, any, any, any>>(
  controller: string,
  action: string,
  router: IgniterRouter<any, any>,
) => {
  return async (input: ClientCallerOptions<TAction>) => {
    if (!isServer) throw new Error('Client calls are only available on the server');
    return await router.processor.call(controller, action, input);
  }
}

/**
 * Creates a client for interacting with Igniter Router
 * @param config Client configuration
 * @returns A typed client for calling server actions
 */
export const createIgniterClient = <TRouter extends IgniterRouter<any, any>>(
  config: ClientConfig<TRouter>
): InferRouterCaller<TRouter> => {
  const router = config.router;

  if (!router) {
    throw new Error('Router is required to create an Igniter client');
  }

  const client = {} as InferRouterCaller<TRouter>;

  // Build client structure from router
  for (const controllerName in router.controllers) {
    client[controllerName as keyof typeof client] = {} as any;
    const controller = router.controllers[controllerName] as IgniterControllerConfig<any, any>;

    for (const actionName in controller.actions) {
      const action = controller.actions[actionName] as IgniterAction<any, any, any, any, any, any, any, any, any>;
      const endpoint = `${config.endpoint || '/api/v1'}/${controller.path}`.replace(/\/\//g, '/');

      // Create server caller
      const serverCaller = createFetcher(action, endpoint);

      // Store action path for caching in hooks
      (serverCaller as any).__actionPath = `${controllerName}.${actionName}`;

      // Add hooks for GET requests
      if (action.method === 'GET') {
        (client[controllerName as keyof typeof client] as any)[actionName] = {
          useQuery: !isServer ? createUseQuery(serverCaller) : undefined,
          call: isServer ? createCaller(controllerName, actionName, router) : undefined,
        }
      }

      // Add hooks for non-GET requests
      if (action.method !== 'GET') {
        (client[controllerName as keyof typeof client] as any)[actionName] = {
          useMutation: !isServer ? createUseMutation(serverCaller) : undefined,
          call: isServer ? createCaller(controllerName, actionName, router) : undefined,
        }
      }
    }
  }

  return client;
};

/**
 * Creates a function to call server actions
 */
const createFetcher = <TAction extends IgniterAction<any, any, any, any, any, any, any, any, any>>(
  action: TAction,
  endpoint: string
) => {
  return async (options?: ClientCallerOptions<TAction>): Promise<TAction['$Infer']['$Output']> => {
    // Extract path parameters
    const params = options?.params || {};
    let path = action.path;

    // Replace path parameters in the URL
    for (const param in params) {
      path = path.replace(`:${param}`, encodeURIComponent(String(params[param])));
    }

    // Construct full URL
    let url = `${endpoint}/${path}`;

    // Add query parameters for GET requests
    if (action.method === 'GET' && options?.query) {
      const queryParams = new URLSearchParams();
      for (const key in options.query) {
        queryParams.append(key, String(options.query[key]));
      }
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      method: action.method,
      headers: {
        "Content-Type": "application/json",
      }
    };

    // Add body for non-GET requests
    if (action.method !== 'GET' && options?.body) {
      requestOptions.body = JSON.stringify(options.body);
    }

    // Make the request
    const response = await fetch(url, requestOptions);

    // Parse the response
    const data = await response.json() as ServerResponse;

    if (!response.ok) {
      throw data || new Error(`Request failed with status ${response.status}`);
    }

    return data;
  };
};