import type { IgniterRequestDevice } from "../types/realtime.interface";

export const getRequestIp = (request: Request): string | undefined => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim();
  }

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-client-ip") ||
    undefined
  );
};

export const parseDeviceFromUserAgent = (
  userAgent?: string | null,
): IgniterRequestDevice | undefined => {
  if (!userAgent) return undefined;
  const ua = userAgent.toLowerCase();

  const device: IgniterRequestDevice = {};

  if (ua.includes("iphone") || ua.includes("ipad")) {
    device.device = "ios";
  } else if (ua.includes("android")) {
    device.device = "android";
  } else if (ua.includes("windows")) {
    device.device = "windows";
  } else if (ua.includes("mac os")) {
    device.device = "mac";
  } else if (ua.includes("linux")) {
    device.device = "linux";
  }

  if (ua.includes("chrome") && !ua.includes("edge") && !ua.includes("opr")) {
    device.browser = "chrome";
  } else if (ua.includes("safari") && !ua.includes("chrome")) {
    device.browser = "safari";
  } else if (ua.includes("firefox")) {
    device.browser = "firefox";
  } else if (ua.includes("edge")) {
    device.browser = "edge";
  } else if (ua.includes("opr") || ua.includes("opera")) {
    device.browser = "opera";
  }

  if (ua.includes("android")) {
    device.os = "android";
  } else if (ua.includes("iphone") || ua.includes("ipad")) {
    device.os = "ios";
  } else if (ua.includes("windows")) {
    device.os = "windows";
  } else if (ua.includes("mac os")) {
    device.os = "macos";
  } else if (ua.includes("linux")) {
    device.os = "linux";
  }

  return Object.keys(device).length === 0 ? undefined : device;
};

/**
 * Generates a random hex string of specified length.
 */
function generateHex(length: number): string {
  const bytes = new Uint8Array(length / 2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generates a unique request ID.
 * 
 * Format: `req_<timestamp>_<random>`
 * - Prefix: 'req_' for easy identification
 * - Timestamp: Base36 encoded milliseconds for rough ordering
 * - Random: 8 random hex chars for uniqueness
 *
 * @returns A unique request ID
 *
 * @example
 * ```typescript
 * const requestId = generateRequestId();
 * // 'req_lk3m5n7p_a1b2c3d4'
 * ```
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = generateHex(8);
  return `req_${timestamp}_${random}`;
}
