import type { IgniterAction, IgniterControllerConfig, IgniterRouter, ClientCallerOptions, ClientConfig, InferRouterCaller, QueryActionCallerResult, MutationActionCallerResult  } from '../types';

import { isServer } from '../utils/client';
import { parseURL } from '../utils/url';
import { createUseQuery, createUseMutation } from './igniter.hooks';

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
  router: ClientConfig<TRouter>
): InferRouterCaller<TRouter> => {
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

      const basePATH = router.config.basePATH || process.env.IGNITER_APP_PATH || '/api/v1';
      const baseURL = router.config.baseURL || process.env.IGNITER_APP_URL || 'http://localhost:3000';

      const parsedBaseURL = parseURL(baseURL, basePATH, controller.path);

      // Create server caller
      const serverCaller = createFetcher(action, parsedBaseURL);

      // Store action path for caching in hooks
      (serverCaller as any).__actionPath = `${controllerName}.${actionName}`;

      // Add hooks for GET requests
      if (action.method === 'GET') {
        (client[controllerName as keyof typeof client] as any)[actionName] = {
          useQuery: !isServer ? createUseQuery(serverCaller) : () => ({} as QueryActionCallerResult<typeof action>),
          call: isServer ? createCaller(controllerName, actionName, router) : () => ({} as QueryActionCallerResult<typeof action>),
        }
      }

      // Add hooks for non-GET requests
      if (action.method !== 'GET') {
        (client[controllerName as keyof typeof client] as any)[actionName] = {
          useMutation: !isServer ? createUseMutation(serverCaller) : () => ({} as MutationActionCallerResult<typeof action>),
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
  baseURL: string
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
    let url = parseURL(baseURL, path);

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
    const data = await response.json();

    // Handle errors
    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }

    return data as TAction['$Infer']['$Output'];
  };
};