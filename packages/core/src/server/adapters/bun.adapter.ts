/**
 * @fileoverview Bun server adapter for Igniter.js
 * @module @igniter-js/core/server/adapters/bun
 *
 * Provides a high-performance server adapter using Bun's native serve() API.
 */

import type { IIgniterServerAdapter, IIgniterServerInstance } from "../../types/server";

// Bun types (declared to avoid import issues when Bun is not the runtime)
declare const Bun: {
  serve(options: {
    port: number;
    hostname: string;
    fetch: (request: Request) => Promise<Response>;
  }): { stop(): void };
};

/**
 * Server adapter for Bun runtime.
 *
 * Uses Bun's native `Bun.serve()` API for maximum performance.
 * This is the preferred adapter when running in Bun.
 *
 * @example
 * ```typescript
 * const adapter = new IgniterServerBunAdapter();
 * const server = await adapter.start(handler, { port: 3000, hostname: 'localhost' });
 * ```
 */
export class IgniterServerBunAdapter implements IIgniterServerAdapter {
  /**
   * Starts a Bun HTTP server with the given handler.
   *
   * @param handler - The request handler function
   * @param options - Server configuration (port, hostname)
   * @returns A promise resolving to the server instance
   */
  async start(
    handler: (request: Request) => Promise<Response>,
    options: { port: number; hostname: string },
  ): Promise<IIgniterServerInstance> {
    const { port, hostname } = options;

    const server = Bun.serve({
      port,
      hostname,
      fetch: handler,
    });

    return {
      port,
      hostname,
      close: async () => {
        server.stop();
      },
    };
  }
}
