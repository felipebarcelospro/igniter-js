/**
 * @fileoverview CORS middleware for Igniter.js
 * @module @igniter-js/core/middlewares/cors
 *
 * Works in all environments: Next.js, Bun, Deno, Cloudflare Workers, Lambda, etc.
 */

import type { ProcessedContext } from "../processors/context-builder.processor";

/**
 * CORS configuration options.
 */
export interface CorsOptions {
  /**
   * Allowed origins.
   * - `'*'` - Allow all origins (default)
   * - `string` - Allow specific origin
   * - `string[]` - Allow multiple origins
   * - `(origin: string) => boolean` - Dynamic origin check
   */
  origins?: string | string[] | ((origin: string) => boolean);

  /**
   * Allowed HTTP methods.
   * @default ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
   */
  methods?: string[];

  /**
   * Allowed request headers.
   * @default ['Content-Type', 'Authorization']
   */
  allowedHeaders?: string[];

  /**
   * Headers exposed to the client.
   */
  exposedHeaders?: string[];

  /**
   * Allow credentials (cookies, authorization headers).
   * @default false
   */
  credentials?: boolean;

  /**
   * Max age for preflight cache (in seconds).
   * @default 86400 (24 hours)
   */
  maxAge?: number;
}

/**
 * Creates CORS headers based on the request and options.
 * Works in any JavaScript runtime (Node.js, Bun, Deno, Edge, etc.)
 *
 * @param request - The incoming request
 * @param options - CORS configuration
 * @returns Headers object with CORS headers
 */
export function createCorsHeaders(
  request: Request,
  options: CorsOptions = {},
): Headers {
  const headers = new Headers();
  const origin = request.headers.get("Origin") || "";
  const {
    origins = "*",
    methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders = ["Content-Type", "Authorization"],
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400,
  } = options;

  // Determine allowed origin
  let allowOrigin = "";
  if (origins === "*") {
    allowOrigin = credentials ? origin : "*";
  } else if (typeof origins === "string") {
    allowOrigin = origins === origin ? origin : "";
  } else if (Array.isArray(origins)) {
    allowOrigin = origins.includes(origin) ? origin : "";
  } else if (typeof origins === "function") {
    allowOrigin = origins(origin) ? origin : "";
  }

  if (allowOrigin) {
    headers.set("Access-Control-Allow-Origin", allowOrigin);
  }

  // Vary header for caching
  if (origins !== "*") {
    headers.set("Vary", "Origin");
  }

  headers.set("Access-Control-Allow-Methods", methods.join(", "));
  headers.set("Access-Control-Allow-Headers", allowedHeaders.join(", "));

  if (exposedHeaders.length > 0) {
    headers.set("Access-Control-Expose-Headers", exposedHeaders.join(", "));
  }

  if (credentials) {
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  headers.set("Access-Control-Max-Age", String(maxAge));

  return headers;
}

/**
 * Handles CORS preflight (OPTIONS) request.
 *
 * @param request - The incoming request
 * @param options - CORS configuration
 * @returns Response for preflight request, or null if not a preflight
 */
export function handleCorsPreflightIfNeeded(
  request: Request,
  options: CorsOptions = {},
): Response | null {
  if (request.method !== "OPTIONS") {
    return null;
  }

  const corsHeaders = createCorsHeaders(request, options);
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Applies CORS headers to an existing response.
 *
 * @param response - The response to modify
 * @param request - The original request
 * @param options - CORS configuration
 * @returns New response with CORS headers
 */
export function applyCorsToResponse(
  response: Response,
  request: Request,
  options: CorsOptions = {},
): Response {
  const corsHeaders = createCorsHeaders(request, options);

  // Create new headers by merging existing with CORS headers
  const newHeaders = new Headers(response.headers);
  corsHeaders.forEach((value, key) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Creates a CORS middleware for use with the router.
 * Handles preflight requests and adds CORS headers to all responses.
 *
 * @param options - CORS configuration
 * @returns Middleware procedure
 *
 * @example
 * ```typescript
 * router.addMiddleware(createCorsMiddleware({
 *   origins: ['https://myapp.com'],
 *   credentials: true,
 * }))
 * ```
 */
export function createCorsMiddleware(options: CorsOptions = {}) {
  return {
    name: "cors",
    handler: async (ctx: any) => {
      const rawRequest = ctx.request.raw || ctx.request;

      // Handle preflight
      const preflight = handleCorsPreflightIfNeeded(rawRequest, options);
      if (preflight) {
        return preflight;
      }

      // Add headers to the response processor for the final response
      const corsHeaders = createCorsHeaders(rawRequest, options);
      corsHeaders.forEach((value, key) => {
        ctx.response.setHeader(key, value);
      });

      return ctx.next();
    },
  };
}
