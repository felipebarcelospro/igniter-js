import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(20, "1h"), // 20 requests per hour
});

export async function checkRateLimit(identifier: string) {
  if (process.env.NODE_ENV === "development") {
    return {
      success: true,
      limit: 20,
      remaining: 20,
      reset: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
  }

  return await ratelimit.limit(identifier);
}

export function getClientIP(request: Request): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");

  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(",")[0].trim();

  // Fallback to a default identifier
  return "unknown";
}




