import type { IgniterAction, IgniterControllerConfig, IgniterRouter, ClientConfig, InferRouterCaller, QueryActionCallerResult, MutationActionCallerResult  } from '../types';
import { isServer } from '../utils/client';
import { parseURL } from '../utils/url';
import { createUseQuery, createUseMutation } from './igniter.hooks';

/**
 * Creates a client for interacting with Igniter Router
 * @param config Client configuration
 * @returns A typed client for calling server actions
 */
export const createIgniterClient = <TRouter extends IgniterRouter<any, any, any, any>>(
  {
    router,
    baseURL,
    basePath,
  }: ClientConfig<TRouter>
): InferRouterCaller<TRouter> => {
  if (!router) {
    throw new Error('Router is required to create an Igniter client');
  }

  if (typeof router === 'function') {
    router = router();
  }

  const client = {} as InferRouterCaller<TRouter>;

  // Build client structure from router
  for (const controllerName in router.controllers) {
    client[controllerName as keyof typeof client] = {} as any;
    const controller = router.controllers[controllerName] as IgniterControllerConfig<any>;

    for (const actionName in controller.actions) {
      const action = controller.actions[actionName] as IgniterAction<any, any, any, any, any, any, any, any, any, any>;

      const basePATH = router.config.basePATH || process.env.IGNITER_APP_PATH || '/api/v1';
      const baseURL = router.config.baseURL || process.env.IGNITER_APP_URL || 'http://localhost:3000';

      const parsedBaseURL = parseURL(baseURL, basePATH, controller.path);

      // Add hooks for GET requests
      if (action.method === 'GET') {
        if (isServer) {
          const caller = router.$caller[controllerName][actionName];
          (client[controllerName as keyof typeof client] as any)[actionName] = {
            useQuery: () => ({} as QueryActionCallerResult<typeof action>),
            query: caller,
          }
        } else {
          const fetcher = createFetcher(action, parsedBaseURL);

          (client[controllerName as keyof typeof client] as any)[actionName] = {
            useQuery: createUseQuery(controllerName, actionName, fetcher),
            query: fetcher,
          }
        }
      }

      // Add hooks for non-GET requests
      if (action.method !== 'GET') {
        if (isServer) {
          const caller = router.$caller[controllerName][actionName];
          (client[controllerName as keyof typeof client] as any)[actionName] = {
            useMutation: () => ({} as MutationActionCallerResult<typeof action>),
            mutation: caller,
          }
        } else {
          const caller = createFetcher(action, parsedBaseURL);
          (client[controllerName as keyof typeof client] as any)[actionName] = {
            useMutation: createUseMutation(controllerName, actionName, caller),
            mutation: caller,
          }
        }
      }
    }
  }

  return client;
};

/**
 * Creates a function to call server actions
 */
const createFetcher = <TAction extends IgniterAction<any, any, any, any, any, any, any, any, any, any>>(
  action: TAction,
  baseURL: string,
) => {
  return async (options?: TAction['$Infer']['$Input']): Promise<TAction['$Infer']['$Output']> => {
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

    try {
      const response = await fetch(url, requestOptions);

      let data: any;
      const contentType = response.headers.get("Content-Type") || "";

      if (!response.ok) {
        // Try to parse error details if possible
        if (contentType.includes("application/json")) {
          data = await response.json();
        } else {
          data = await response.text();
        }
        throw new Error(
          typeof data === "string"
            ? `Request failed with status ${response.status}: ${data}`
            : data?.message || `Request failed with status ${response.status}`
        );
      }

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return data as TAction['$Infer']['$Output'];
    } catch (error: any) {
      // You can customize error handling/logging here
      throw new Error(
        error?.message
          ? `IgniterClient fetch error: ${error.message}`
          : "IgniterClient fetch error"
      );
    }
  };
};