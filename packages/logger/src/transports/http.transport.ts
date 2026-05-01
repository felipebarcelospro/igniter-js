/**
 * @fileoverview HTTP transport resolver for @igniter-js/logger
 * @module @igniter-js/logger/transports/http
 */

import type { HttpTransportOptions } from "../types/transport";

/**
 * Resolves HTTP transport configuration.
 * Uses custom HTTP sender for async, non-blocking log delivery.
 *
 * @param options - HTTP transport configuration options
 * @returns Transport descriptor for Pino
 */
export function resolveHttpTransport(options: HttpTransportOptions) {
  // Return custom target pointing to our HTTP transport implementation
  return {
    target: require.resolve('./http-pino-transport'),
    options: {
      url: options.url,
      headers: options.headers,
      batchSize: options.batchSize ?? 10,
      timeoutMs: options.timeoutMs ?? 5000,
      flushInterval: options.flushInterval ?? 5000,
    },
  };
}
