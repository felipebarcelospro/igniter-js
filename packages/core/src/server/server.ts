/**
 * @fileoverview Igniter Server - Multi-runtime HTTP server
 * @module @igniter-js/core/server
 *
 * Provides a unified API for starting HTTP servers across different JavaScript runtimes.
 * Automatically detects the runtime (Bun, Deno, Node.js) and uses the optimal adapter.
 */

import type {
  IIgniterServerAdapter,
  IIgniterServerInstance,
  IgniterServerOptions,
} from "../types/server";
import { IgniterServerBunAdapter } from "./adapters/bun.adapter";
import { IgniterServerDenoAdapter } from "./adapters/deno.adapter";
import { IgniterServerNodeAdapter } from "./adapters/node.adapter";

/**
 * Runtime detection result.
 */
type Runtime = "bun" | "deno" | "node";

/**
 * IgniterServer provides a unified API for starting HTTP servers across runtimes.
 *
 * Automatically detects the current runtime (Bun, Deno, or Node.js) and uses
 * the optimal adapter for maximum performance.
 *
 * @example
 * ```typescript
 * // Create server with auto-detection
 * const server = IgniterServer.create(router.handler);
 *
 * // Start listening
 * await server.listen(3000);
 *
 * // Or with options
 * await server.listen({
 *   port: 3000,
 *   hostname: '0.0.0.0',
 *   onListen: ({ port }) => console.log(`Server running on :${port}`),
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Use specific adapter
 * const server = IgniterServer.create(handler, {
 *   adapter: new IgniterServerBunAdapter(),
 * });
 * ```
 */
export class IgniterServer {
  private instance: IIgniterServerInstance | null = null;

  /**
   * Private constructor - use static create() method.
   */
  private constructor(
    private readonly handler: (request: Request) => Promise<Response>,
    private readonly adapter: IIgniterServerAdapter,
  ) { }

  /**
   * Creates a new IgniterServer instance.
   *
   * @param handler - The request handler function (Web API standard)
   * @param options - Optional configuration including custom adapter
   * @returns A new IgniterServer instance
   *
   * @example
   * ```typescript
   * const server = IgniterServer.create(router.handler);
   * await server.listen(3000);
   * ```
   */
  static create(
    handler: (request: Request) => Promise<Response>,
    options?: { adapter?: IIgniterServerAdapter },
  ): IgniterServer {
    const adapter = options?.adapter ?? IgniterServer.detectAdapter();
    return new IgniterServer(handler, adapter);
  }

  /**
   * Starts the server listening on the specified port.
   *
   * @param options - Port number or server options
   * @returns A promise resolving to the server instance
   *
   * @example
   * ```typescript
   * // Simple port
   * await server.listen(3000);
   *
   * // With options
   * await server.listen({
   *   port: 3000,
   *   hostname: '0.0.0.0',
   *   onListen: ({ port, hostname }) => {
   *     console.log(`🚀 Server running at http://${hostname}:${port}`);
   *   },
   * });
   * ```
   */
  async listen(
    options?: IgniterServerOptions | number,
  ): Promise<IIgniterServerInstance> {
    const opts = this.normalizeOptions(options);

    try {
      this.instance = await this.adapter.start(this.handler, {
        port: opts.port,
        hostname: opts.hostname,
      });

      opts.onListen?.({
        port: this.instance.port,
        hostname: this.instance.hostname,
      });

      return this.instance;
    } catch (error) {
      opts.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Stops the server if it's running.
   *
   * @returns A promise that resolves when the server is stopped
   */
  async close(): Promise<void> {
    if (this.instance) {
      await this.instance.close();
      this.instance = null;
    }
  }

  /**
   * Returns information about the running server.
   *
   * @returns Server info or null if not running
   */
  get info(): { port: number; hostname: string } | null {
    return this.instance
      ? { port: this.instance.port, hostname: this.instance.hostname }
      : null;
  }

  /**
   * Detects the current runtime and returns the appropriate adapter.
   */
  private static detectAdapter(): IIgniterServerAdapter {
    const runtime = IgniterServer.detectRuntime();

    switch (runtime) {
      case "bun":
        return new IgniterServerBunAdapter();
      case "deno":
        return new IgniterServerDenoAdapter();
      case "node":
      default:
        return new IgniterServerNodeAdapter();
    }
  }

  /**
   * Detects the current JavaScript runtime.
   */
  private static detectRuntime(): Runtime {
    // Check for Bun
    if (typeof globalThis !== "undefined" && "Bun" in globalThis) {
      return "bun";
    }

    // Check for Deno
    if (typeof globalThis !== "undefined" && "Deno" in globalThis) {
      return "deno";
    }

    // Default to Node.js
    return "node";
  }

  /**
   * Normalizes options to ensure all required fields are present.
   */
  private normalizeOptions(
    options?: IgniterServerOptions | number,
  ): Required<Pick<IgniterServerOptions, "port" | "hostname">> & IgniterServerOptions {
    if (typeof options === "number") {
      return { port: options, hostname: "localhost" };
    }

    return {
      port: options?.port ?? 3000,
      hostname: options?.hostname ?? "localhost",
      ...options,
    };
  }
}
