import { createIgniterProcedure } from "../../services/procedure.service";
import { IgniterError } from "../../error";
import type { RateLimitOptions } from "./types";

// Simple in-memory store for rate limiting
// In production, you should use Redis or another persistent store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Creates a rate limiting procedure for the Igniter Framework.
 * This procedure limits the number of requests per time window.
 * 
 * @param options - Rate limiting configuration options
 * @returns A configured rate limiting procedure
 * 
 * @example
 * ```typescript
 * const rateLimit = createRateLimitProcedure({
 *   windowMs: 15 * 60 * 1000, // 15 minutes
 *   max: 100, // limit each IP to 100 requests per windowMs
 *   keyGenerator: (req) => req.headers.get('x-forwarded-for') || 'unknown'
 * });
 * 
 * const limitedAction = createIgniterQuery({
 *   path: '/api/data',
 *   use: [rateLimit()],
 *   handler: (ctx) => {
 *     return ctx.response.success({ data: 'Protected by rate limit' });
 *   }
 * });
 * ```
 */
export const createRateLimitProcedure = (options: RateLimitOptions) =>
  createIgniterProcedure<any, RateLimitOptions, {}>({
    name: 'rateLimit',
    handler: async (_, ctx) => {
      // Skip rate limiting if condition is met
      if (options.skip && options.skip(ctx.request as any)) {
        return {};
      }

      // Generate rate limit key
      let key: string;
      if (options.keyGenerator) {
        key = options.keyGenerator(ctx.request as any);
      } else {
        // Default: use IP address
        const forwarded = ctx.request.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
        key = `${ip}:${ctx.request.path}`;
      }

      const now = Date.now();
      const windowStart = now - options.windowMs;
      
      // Get current rate limit data
      let rateLimitData = rateLimitStore.get(key);
      
      // Reset if window has passed
      if (!rateLimitData || rateLimitData.resetTime <= now) {
        rateLimitData = {
          count: 0,
          resetTime: now + options.windowMs
        };
      }

      // Increment request count
      rateLimitData.count++;
      rateLimitStore.set(key, rateLimitData);

      // Check if limit exceeded
      if (rateLimitData.count > options.max) {
        const resetTimeSeconds = Math.ceil((rateLimitData.resetTime - now) / 1000);
        
        throw new IgniterError({
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.errorMessage || `Too many requests. Try again in ${resetTimeSeconds} seconds.`,
          details: {
            limit: options.max,
            remaining: 0,
            resetTime: rateLimitData.resetTime,
            retryAfter: resetTimeSeconds
          }
        });
      }

      // Add rate limit headers to response
      const remaining = Math.max(0, options.max - rateLimitData.count);
      const resetTimeSeconds = Math.ceil((rateLimitData.resetTime - now) / 1000);
      
      // Note: In a real implementation, you'd want to set these headers on the response
      // This would require extending the response processor to handle custom headers
      
      return {};
    }
  });

/**
 * Cleanup expired rate limit entries (should be called periodically)
 */
export const cleanupRateLimitStore = () => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime <= now) {
      rateLimitStore.delete(key);
    }
  }
};

// Auto cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
} 