/**
 * @fileoverview Deno server adapter for Igniter.js
 * @module @igniter-js/core/server/adapters/deno
 *
 * Provides a server adapter using Deno's native Deno.serve() API.
 */

import type { IIgniterServerAdapter, IIgniterServerInstance } from "../../types/server";

// Deno types (declared to avoid import issues when Deno is not the runtime)
declare const Deno: {
  serve(
    options: { port: number; hostname: string },
    handler: (request: Request) => Promise<Response>,
  ): { shutdown(): Promise<void> };
};

/**
 * Server adapter for Deno runtime.
 *
 * Uses Deno's native `Deno.serve()` API for optimal performance.
 *
 * @example
 * ```typescript
 * const adapter = new IgniterServerDenoAdapter();
 * const server = await adapter.start(handler, { port: 3000, hostname: 'localhost' });
 * ```
 */
export class IgniterServerDenoAdapter implements IIgniterServerAdapter {
  /**
   * Starts a Deno HTTP server with the given handler.
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

    const server = Deno.serve({ port, hostname }, handler);

    return {
      port,
      hostname,
      close: async () => {
        await server.shutdown();
      },
    };
  }
}
