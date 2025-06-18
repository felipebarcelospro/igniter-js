import { createIgniterProcedure } from "../../services/procedure.service";
import { IgniterError } from "../../error";
import type { CorsOptions } from "./types";

/**
 * Creates a CORS procedure for the Igniter Framework.
 * This procedure handles Cross-Origin Resource Sharing headers and preflight requests.
 * 
 * @param options - CORS configuration options
 * @returns A configured CORS procedure
 * 
 * @example
 * ```typescript
 * const cors = createCorsProcedure({
 *   origins: ['http://localhost:3000', 'https://myapp.com'],
 *   methods: ['GET', 'POST', 'PUT', 'DELETE'],
 *   credentials: true
 * });
 * 
 * const corsAction = createIgniterQuery({
 *   path: '/api/data',
 *   use: [cors()],
 *   handler: (ctx) => {
 *     return ctx.response.success({ data: 'CORS enabled' });
 *   }
 * });
 * ```
 */
export const createCorsProcedure = (options: CorsOptions = {}) =>
  createIgniterProcedure<any, CorsOptions, {}>({
    name: 'cors',
    handler: async (_, ctx) => {
      const origin = ctx.request.headers.get('origin');
      const method = ctx.request.method;
      
      // Handle preflight requests (OPTIONS)
      if (method?.toUpperCase() === 'OPTIONS' && options.handlePreflight !== false) {
        return handlePreflightRequest(origin, ctx, options);
      }

      // Check if origin is allowed
      if (origin && !isOriginAllowed(origin, options.origins)) {
        throw new IgniterError({
          code: 'CORS_ORIGIN_NOT_ALLOWED',
          message: `Origin ${origin} is not allowed by CORS policy`
        });
      }

      // Set CORS headers
      setCorsHeaders(ctx, origin, options);
      
      return {};
    }
  });

/**
 * Check if origin is allowed based on CORS options
 */
function isOriginAllowed(origin: string, allowedOrigins?: string[] | string | boolean): boolean {
  if (allowedOrigins === true) {
    return true;
  }
  
  if (allowedOrigins === false || allowedOrigins === undefined) {
    return false;
  }
  
  if (typeof allowedOrigins === 'string') {
    return origin === allowedOrigins;
  }
  
  if (Array.isArray(allowedOrigins)) {
    return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
  }
  
  return false;
}

/**
 * Set CORS headers on the response
 */
function setCorsHeaders(ctx: any, origin: string | null, options: CorsOptions) {
  // Note: In a real implementation, you'd want to set these headers on the response
  // This would require extending the response processor to handle custom headers
  
  const headers: Record<string, string> = {};
  
  // Access-Control-Allow-Origin
  if (origin && isOriginAllowed(origin, options.origins)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (options.origins === true || (Array.isArray(options.origins) && options.origins.includes('*'))) {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  
  // Access-Control-Allow-Credentials
  if (options.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  
  // Access-Control-Allow-Methods
  if (options.methods && options.methods.length > 0) {
    headers['Access-Control-Allow-Methods'] = options.methods.join(', ');
  }
  
  // Access-Control-Allow-Headers
  if (options.headers && options.headers.length > 0) {
    headers['Access-Control-Allow-Headers'] = options.headers.join(', ');
  }
  
  // Access-Control-Max-Age
  if (options.maxAge) {
    headers['Access-Control-Max-Age'] = options.maxAge.toString();
  }
  
  // TODO: Apply headers to response
  // This would require extending the IgniterResponseProcessor
  // For now, we'll store them in the context for the adapter to use
  ctx.corsHeaders = headers;
}

/**
 * Handle preflight OPTIONS requests
 */
function handlePreflightRequest(origin: string | null, ctx: any, options: CorsOptions) {
  if (origin && !isOriginAllowed(origin, options.origins)) {
    throw new IgniterError({
      code: 'CORS_PREFLIGHT_ORIGIN_NOT_ALLOWED',
      message: `Origin ${origin} is not allowed by CORS policy`
    });
  }
  
  setCorsHeaders(ctx, origin, options);
  
  // Return early response for preflight
  return ctx.response.success(null, { status: 204 });
} 