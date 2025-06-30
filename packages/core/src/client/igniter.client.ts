/**
 * @jsxRuntime classic
 * @jsx createIgniterClient
 */

"use client";

import type { IgniterRouter, ClientConfig, InferRouterCaller } from '../types';
import { isServer } from '../utils/client';

/**
 * Creates a client for interacting with Igniter Router
 * @param config Client configuration
 * @returns A typed client for calling server actions
 */
export const createIgniterClient = <TRouter extends IgniterRouter<any, any, any, any>>(
  {
    router,
  }: ClientConfig<TRouter>
): InferRouterCaller<TRouter> => {
  if (!router) {
    throw new Error('Router is required to create an Igniter client');
  }

  if (typeof router === 'function') {
    router = router();
  }

  // Split implementation completely based on environment
  // This ensures maximum tree-shaking and bundle optimization
  if (typeof window === 'undefined') {
    // Server-side: Use direct router.$caller (zero browser dependencies)
    const { createServerClient } = require('./igniter.client.server');
    return createServerClient(router);
  } else {
    // Browser-side: Use fetch + hooks (zero server dependencies)
    const { createBrowserClient } = require('./igniter.client.browser');
    return createBrowserClient(router);
  }
};

