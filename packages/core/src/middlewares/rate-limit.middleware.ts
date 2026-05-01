/**
 * @fileoverview Rate limiting middleware for Igniter.js
 * @module @igniter-js/core/middlewares/rate-limit
 *
 * Works in all environments: Next.js, Bun, Deno, Cloudflare Workers, Lambda, etc.
 * Uses in-memory storage by default, but supports IgniterStore for distributed rate limiting.
 */

import type { ProcessedContext } from "../processors/context-builder.processor";
import type { IgniterStoreManager } from "../types/store.interface";
import { getRequestIp } from "../utils/request";

/**
 * Rate limit store interface.
 * Implement this to use custom storage backends.
 */
export interface RateLimitStore {
  /**
   * Increment the counter for a key and return the current state.
   *
   * @param key - The rate limit key (usually based on IP or user ID)
   * @param windowSeconds - The window duration in seconds
   * @returns The current count, remaining requests, and reset timestamp
   */
  increment(
    key: string,
    windowSeconds: number,
  ): Promise<{ count: number; remaining: number; resetAt: number }>;
}

/**
 * Rate limit configuration options.
 */
export interface RateLimitOptions {
  /**
   * Maximum number of requests per window.
   * @default 100
   */
  max?: number;

  /**
   * Window size in seconds.
   * @default 60
   */
  windowSeconds?: number;

  /**
   * Function to generate the rate limit key from a request.
   * By default, uses the client IP address.
   *
   * @example
   * ```typescript
   * // Rate limit per user
   * keyGenerator: (req) => req.headers.get('X-User-Id') || 'anonymous'
   *
   * // Rate limit per API key
   * keyGenerator: (req) => req.headers.get('X-API-Key') || 'anonymous'
   * ```
   */
  keyGenerator?: (request: Request) => string;

  /**
   * Function to determine if rate limiting should be skipped.
   * Return true to bypass rate limiting for a request.
   *
   * @example
   * ```typescript
   * // Skip rate limiting for health checks
   * skip: (req) => new URL(req.url).pathname === '/health'
   *
   * // Skip rate limiting for internal requests
   * skip: (req) => req.headers.get('X-Internal-Request') === 'true'
   * ```
   */
  skip?: (request: Request) => boolean;

  /**
   * Custom handler when rate limit is exceeded.
   * By default, returns a 429 Too Many Requests response.
   */
  onLimit?: (request: Request, info: RateLimitInfo) => Response | Promise<Response>;

  /**
   * Storage backend for rate limit counters.
   * Uses in-memory storage by default.
   * For distributed rate limiting, use IgniterStoreRateLimitStore.
   */
  store?: RateLimitStore;
}

/**
 * Information about the current rate limit state.
 */
export interface RateLimitInfo {
  /** Maximum requests allowed per window */
  limit: number;
  /** Remaining requests in current window */
  remaining: number;
  /** Timestamp when the window resets (Unix milliseconds) */
  resetAt: number;
  /** Current request count in the window */
  count: number;
}

/**
 * In-memory rate limit store.
 * Suitable for single-instance deployments.
 * For distributed systems, use IgniterStoreRateLimitStore.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();
  private readonly max: number;

  constructor(max: number = 100) {
    this.max = max;
  }

  async increment(
    key: string,
    windowSeconds: number,
  ): Promise<{ count: number; remaining: number; resetAt: number }> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const resetAt = windowStart + windowMs;
    const windowKey = `${key}:${windowStart}`;

    let entry = this.windows.get(windowKey);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt };
      // Cleanup old entries occasionally
      if (Math.random() < 0.01) {
        this.cleanup(now);
      }
    }

    entry.count++;
    this.windows.set(windowKey, entry);

    return {
      count: entry.count,
      remaining: Math.max(0, this.max - entry.count),
      resetAt,
    };
  }

  private cleanup(now: number): void {
    for (const [key, entry] of this.windows) {
      if (entry.resetAt < now) {
        this.windows.delete(key);
      }
    }
  }
}

/**
 * Rate limit store using IgniterStore for distributed rate limiting.
 * Uses Redis counters for accurate distributed counting.
 */
export class IgniterStoreRateLimitStore implements RateLimitStore {
  private readonly store: IgniterStoreManager;
  private readonly max: number;

  constructor(store: IgniterStoreManager, max: number = 100) {
    this.store = store;
    this.max = max;
  }

  async increment(
    key: string,
    windowSeconds: number,
  ): Promise<{ count: number; remaining: number; resetAt: number }> {
    const storeKey = `ratelimit:${key}`;
    const count = await this.store.counter.increment(storeKey);
    const resetAt = Date.now() + windowSeconds * 1000;

    // Set expiry on first request in window
    if (count === 1) {
      await this.store.counter.expire(storeKey, windowSeconds);
    }

    return {
      count,
      remaining: Math.max(0, this.max - count),
      resetAt,
    };
  }
}

/**
 * Creates rate limit headers to include in responses.
 */
function createRateLimitHeaders(info: RateLimitInfo): Headers {
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", String(info.limit));
  headers.set("X-RateLimit-Remaining", String(info.remaining));
  headers.set("X-RateLimit-Reset", String(Math.floor(info.resetAt / 1000)));
  return headers;
}

/**
 * Creates the default rate limit exceeded response.
 */
function createDefaultLimitResponse(info: RateLimitInfo, windowSeconds: number): Response {
  const headers = createRateLimitHeaders(info);
  headers.set("Content-Type", "application/json");
  headers.set("Retry-After", String(windowSeconds));

  return new Response(
    JSON.stringify({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
        retryAfter: windowSeconds,
      },
    }),
    {
      status: 429,
      statusText: "Too Many Requests",
      headers,
    },
  );
}

/**
 * Applies rate limit headers to an existing response.
 */
function applyRateLimitHeaders(response: Response, info: RateLimitInfo): Response {
  const rateLimitHeaders = createRateLimitHeaders(info);
  const newHeaders = new Headers(response.headers);
  rateLimitHeaders.forEach((value, key) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Creates a rate limit middleware for use with the router.
 *
 * @param options - Rate limit configuration
 * @returns Middleware procedure
 *
 * @example
 * ```typescript
 * // Basic rate limiting
 * router.addMiddleware(createRateLimitMiddleware({
 *   max: 100,
 *   windowSeconds: 60,
 * }))
 * ```
 */
export function createRateLimitMiddleware(options: RateLimitOptions = {}) {
  const {
    max = 100,
    windowSeconds = 60,
    keyGenerator = (req: any) => getRequestIp(req) || "anonymous",
    skip,
    onLimit,
  } = options;

  // Initialize store with max limit
  const store = options.store ?? new MemoryRateLimitStore(max);

  return {
    name: "rate-limit",
    handler: async (ctx: any) => {
      const rawRequest = ctx.request.raw || ctx.request;

      // Check skip condition
      if (skip?.(rawRequest)) {
        return ctx.next();
      }

      const key = keyGenerator(rawRequest);
      const result = await store.increment(key, windowSeconds);

      const info: RateLimitInfo = {
        limit: max,
        remaining: Math.max(0, max - result.count),
        resetAt: result.resetAt,
        count: result.count,
      };

      // Check if limit exceeded
      if (result.count > max) {
        if (onLimit) {
          return onLimit(rawRequest, info);
        }
        return createDefaultLimitResponse(info, windowSeconds);
      }

      // Add rate limit headers to response processor immediately
      // This ensures they are present even if later steps fail or if it's a simple success
      ctx.response.setHeader("X-RateLimit-Limit", info.limit.toString());
      ctx.response.setHeader("X-RateLimit-Remaining", info.remaining.toString());
      ctx.response.setHeader("X-RateLimit-Reset", Math.floor(info.resetAt / 1000).toString());

      // Continue to next handler
      return ctx.next();
    },
  };
}
