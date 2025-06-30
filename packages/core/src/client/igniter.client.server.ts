/**
 * Server-specific client implementation
 * This file contains only server-side code with zero browser dependencies
 */

import type { IgniterAction, IgniterControllerConfig, IgniterRouter, InferRouterCaller, QueryActionCallerResult, MutationActionCallerResult } from '../types';

/**
 * Server-side client implementation
 * Uses direct router.$caller for optimal performance
 * No client-side dependencies included
 */
export function createServerClient<TRouter extends IgniterRouter<any, any, any, any>>(
  router: TRouter
): InferRouterCaller<TRouter> {
  const client = {} as InferRouterCaller<TRouter>;

  // Build client structure from router
  for (const controllerName in router.controllers) {
    client[controllerName as keyof typeof client] = {} as any;
    const controller = router.controllers[controllerName] as IgniterControllerConfig<any>;

    for (const actionName in controller.actions) {
      const action = controller.actions[actionName] as IgniterAction<any, any, any, any, any, any, any, any, any, any>;
      const caller = router.$caller[controllerName][actionName];

      // Server-side implementation - direct caller access
      if (action.method === 'GET') {
        (client[controllerName as keyof typeof client] as any)[actionName] = {
          useQuery: () => ({} as QueryActionCallerResult<typeof action>),
          query: caller,
        };
      } else {
        (client[controllerName as keyof typeof client] as any)[actionName] = {
          useMutation: () => ({} as MutationActionCallerResult<typeof action>),
          mutation: caller,
        };
      }
    }
  }

  return client;
} 