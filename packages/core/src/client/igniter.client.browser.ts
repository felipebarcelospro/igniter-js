/**
 * Browser-specific client implementation
 * This file contains all browser-only code and dependencies
 */

import type { IgniterAction, IgniterControllerConfig, IgniterRouter, InferRouterCaller, ClientConfig } from '../types';
import { parseURL } from '../utils/url';
import { createUseQuery, createUseMutation, createUseRealtime } from './igniter.hooks';

/**
 * Creates a browser-side client for Igniter Router
 * This version uses fetch + hooks (zero server dependencies)
 * @param config Client configuration
 * @returns A typed client for calling server actions
 */
export const createIgniterClient = <TRouter extends Omit<IgniterRouter<any, any, any, any, any>, 'caller'>>(
  {
    basePATH,
    baseURL,
    router,
  }: ClientConfig<TRouter & { caller: any }>
): InferRouterCaller<TRouter & { caller: any }> => {
  if (!router) {
    throw new Error('Router is required to create an Igniter client');
  }

  if (typeof router === 'function') {
    router = router();
  }

  // Browser-side: Use fetch-based client (zero server dependencies)
  return createBrowserClient({ ...router, config: { basePATH, baseURL } }) as unknown as InferRouterCaller<TRouter & { caller: any }>;
};

/**
 * Browser-side client implementation
 * Uses fetch-based approach with hooks
 */
export function createBrowserClient<TRouter extends IgniterRouter<any, any, any, any, any>>(
  router: TRouter
): InferRouterCaller<TRouter> {

  const client = {} as InferRouterCaller<TRouter>;

  // Extract base configuration once
  const basePATH = router.config.basePATH || '/api/v1';
  const baseURL = router.config.baseURL || 'http://localhost:3000';

  // Build client structure from router
  for (const controllerName in router.controllers) {
    client[controllerName as keyof typeof client] = {} as any;
    const controller = router.controllers[controllerName] as IgniterControllerConfig<any>;
    const parsedBaseURL = parseURL(baseURL, basePATH, controller.path);

    for (const actionName in controller.actions) {
      const action = controller.actions[actionName] as IgniterAction<any, any, any, any, any, any, any, any, any, any>;

      // Create fetcher for this specific action
      const fetcher = createActionFetcher(action, parsedBaseURL);

      // Browser-side implementation - hooks + fetch
      if (action.method === 'GET') {
        (client[controllerName as keyof typeof client] as any)[actionName] = {
          useQuery: createUseQuery(controllerName, actionName, fetcher),
          query: fetcher,
          useRealtime: createUseRealtime(controllerName, actionName),
        };
      } else {
        (client[controllerName as keyof typeof client] as any)[actionName] = {
          useMutation: createUseMutation(controllerName, actionName, fetcher),
          mutate: fetcher,
        };
      }
    }
  }

  return client;
}

/**
 * Creates a fetch-based caller for browser environment
 * This function includes all browser-specific fetch logic
 */
function createActionFetcher<TAction extends IgniterAction<any, any, any, any, any, any, any, any, any, any>>(
  action: TAction,
  baseURL: string,
) {
  return async (options?: TAction['$Infer']['$Input']): Promise<TAction['$Infer']['$Response']> => {
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
    const finalHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...options?.headers,
    };

    if (options?.cookies) {
      const cookieString = Object.entries(options.cookies)
        .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)
        .join('; ');

      if (cookieString) {
        finalHeaders['Cookie'] = finalHeaders['Cookie']
          ? `${finalHeaders['Cookie']}; ${cookieString}`
          : cookieString;
      }
    }

    const requestOptions: RequestInit = {
      method: action.method,
      headers: finalHeaders,
      credentials: options?.credentials,
    };

    // Add body for non-GET requests
    if (action.method !== 'GET' && options?.body) {
      requestOptions.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, requestOptions);

      let data: unknown;
      const contentType = response.headers.get("Content-Type") || "";

      if (!response.ok) {
        // Try to parse error details if possible
        if (contentType.includes("application/json")) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        // Throw the structured error data directly to be handled by the hooks
        throw data;
      }

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return data as TAction['$Infer']['$Output'];
    } catch (error: unknown) {
      // The error is either the parsed body from a non-ok response,
      // or a network error from fetch itself.
      // In both cases, we re-throw it to be handled by the hooks.
      if (error instanceof Error) {
        // Add more context to network errors
        throw new Error(`IgniterClient fetch error: ${error.message}`);
      }
      throw error;
    }
  };
}
