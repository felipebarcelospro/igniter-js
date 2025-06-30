/**
 * Browser-specific client implementation
 * This file contains all browser-only code and dependencies
 */

import type { IgniterAction, IgniterControllerConfig, IgniterRouter, InferRouterCaller, QueryActionCallerResult, MutationActionCallerResult } from '../types';
import { parseURL } from '../utils/url';

/**
 * Browser-side client implementation
 * Uses fetch-based approach with hooks
 */
export function createBrowserClient<TRouter extends IgniterRouter<any, any, any, any>>(
  router: TRouter
): InferRouterCaller<TRouter> {
  // Import client-only dependencies
  const { createUseQuery, createUseMutation } = require('./igniter.hooks');
  
  const client = {} as InferRouterCaller<TRouter>;
  
  // Extract base configuration once
  const basePATH = router.config.basePATH || process.env.IGNITER_APP_PATH || '/api/v1';
  const baseURL = router.config.baseURL || process.env.IGNITER_APP_URL || 'http://localhost:3000';

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
        };
      } else {
        (client[controllerName as keyof typeof client] as any)[actionName] = {
          useMutation: createUseMutation(controllerName, actionName, fetcher),
          mutation: fetcher,
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

      let data: unknown;
      const contentType = response.headers.get("Content-Type") || "";

      if (!response.ok) {
        // Try to parse error details if possible
        if (contentType.includes("application/json")) {
          data = await response.json();
        } else {
          data = await response.text();
        }
        
        const errorMessage = typeof data === "string"
          ? `Request failed with status ${response.status}: ${data}`
          : (data as any)?.message || `Request failed with status ${response.status}`;
          
        throw new Error(errorMessage);
      }

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return data as TAction['$Infer']['$Output'];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? `IgniterClient fetch error: ${error.message}`
        : "IgniterClient fetch error";
        
      throw new Error(errorMessage);
    }
  };
} 