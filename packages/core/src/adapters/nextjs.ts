/**
 * @fileoverview Next.js adapter for Igniter.js
 * @module @igniter-js/core/adapters/nextjs
 *
 * Provides utilities for integrating Igniter.js with Next.js applications:
 * - Route handler adapter for API routes
 * - Next.js config wrapper for proper bundling
 */

import type { IgniterRouter } from "../types";
import type { NextConfig } from "next";

/**
 * Node.js built-in modules that should never be bundled for client.
 */
const NODE_BUILTIN_MODULES = [
  "fs",
  "path",
  "os",
  "crypto",
  "stream",
  "http",
  "https",
  "net",
  "tls",
  "dns",
  "child_process",
  "cluster",
  "dgram",
  "readline",
  "repl",
  "tty",
  "v8",
  "vm",
  "zlib",
  "worker_threads",
  "async_hooks",
  "perf_hooks",
  "trace_events",
  "inspector",
  "wasi",
  "diagnostics_channel",
  "node:fs",
  "node:path",
  "node:os",
  "node:crypto",
  "node:stream",
  "node:http",
  "node:https",
  "node:net",
  "node:tls",
  "node:dns",
  "node:child_process",
  "node:cluster",
  "node:dgram",
  "node:readline",
  "node:repl",
  "node:tty",
  "node:v8",
  "node:vm",
  "node:zlib",
  "node:worker_threads",
  "node:async_hooks",
  "node:perf_hooks",
  "node:trace_events",
  "node:inspector",
  "node:wasi",
  "node:diagnostics_channel",
  "node:util",
] as const;

/**
 * Igniter.js packages that should be treated as server-only.
 */
const IGNITER_SERVER_PACKAGES = [
  "@igniter-js/adapter-redis",
  "@igniter-js/adapter-bullmq",
  "@igniter-js/adapter-opentelemetry",
  "@igniter-js/adapter-resend",
  "ioredis",
  "bullmq",
] as const;

/**
 * Adapter function to convert an IgniterRouter instance into Next.js route handlers.
 *
 * @param router - An instance of IgniterRouter that will handle the incoming requests
 * @returns An object containing handler functions for each HTTP method supported by Next.js
 *
 * @example
 * ```typescript
 * // app/api/[...igniter]/route.ts
 * import { nextRouteHandlerAdapter } from '@igniter-js/core/adapters/nextjs';
 * import { router } from '@/lib/igniter';
 *
 * export const { GET, POST, PUT, DELETE, PATCH } = nextRouteHandlerAdapter(router);
 * ```
 */
export const nextRouteHandlerAdapter = (
  router: Omit<IgniterRouter<any, any, any, any, any>, "caller">,
) => {
  return {
    GET: (request: Request) => router.handler(request),
    POST: (request: Request) => router.handler(request),
    PUT: (request: Request) => router.handler(request),
    DELETE: (request: Request) => router.handler(request),
    PATCH: (request: Request) => router.handler(request),
  };
};

/**
 * Wraps a Next.js configuration with Igniter.js compatibility settings.
 *
 * Handles:
 * - Server external packages for adapters
 * - Webpack fallbacks for Node.js built-in modules
 * - Turbopack resolve aliases
 *
 * @param config - The base Next.js configuration
 * @returns Enhanced Next.js configuration compatible with Igniter.js
 *
 * @example
 * ```typescript
 * // next.config.js
 * import { withIgniter } from '@igniter-js/core/adapters/nextjs';
 *
 * export default withIgniter({
 *   // Your Next.js config
 * });
 * ```
 */
export const withIgniter = (config: NextConfig = {}): NextConfig => {
  // Merge server external packages
  const serverExternalPackages = [
    ...(config.serverExternalPackages || []),
    ...IGNITER_SERVER_PACKAGES,
  ];

  // Build node builtins fallbacks for webpack
  const nodeBuiltinsFallbacks: Record<string, false> = {};
  const turbopackAliases: Record<string, string> = {};

  for (const mod of NODE_BUILTIN_MODULES) {
    nodeBuiltinsFallbacks[mod] = false;
    turbopackAliases[mod] = "data:text/javascript,export default {}";
  }

  // Configure turbopack
  const turbopack = {
    ...(config.turbopack || {}),
    resolveAlias: {
      ...(config.turbopack?.resolveAlias || {}),
      ...turbopackAliases,
    },
  };

  return {
    ...config,
    serverExternalPackages,
    turbopack,
    webpack: (webpackConfig, context) => {
      // Apply user's webpack config first
      let result = webpackConfig;
      if (config.webpack) {
        result = config.webpack(result, context);
      }

      // Client-side only: add fallbacks for Node.js built-ins
      if (!context.isServer) {
        result.resolve = result.resolve || {};
        result.resolve.fallback = {
          ...result.resolve.fallback,
          ...nodeBuiltinsFallbacks,
        };
      }

      return result;
    },
  };
};

/**
 * Safe header accessor that works in both server and client environments.
 * This prevents "next/headers" from being imported in client components.
 *
 * @returns Promise resolving to Headers object (empty on client)
 *
 * @example
 * ```typescript
 * const headers = await getHeadersSafe();
 * const authToken = headers.get('Authorization');
 * ```
 */
export async function getHeadersSafe(): Promise<Headers> {
  // Check if we're in a server environment
  if (typeof window !== "undefined") {
    return new Headers();
  }

  try {
    // Dynamic import to avoid bundling issues
    const { headers } = await import("next/headers");
    const headersList = await headers();
    return headersList as unknown as Headers;
  } catch {
    return new Headers();
  }
}
