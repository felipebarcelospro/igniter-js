/**
 * @fileoverview Node.js server adapter for Igniter.js
 * @module @igniter-js/core/server/adapters/node
 *
 * Provides a server adapter using Node.js native http module.
 * Includes utilities to convert between Node.js streams and Web API Request/Response.
 */

import type { IIgniterServerAdapter, IIgniterServerInstance } from "../../types/server";

// Lazy-loaded types to avoid import issues in non-Node environments
type IncomingMessage = import("node:http").IncomingMessage;
type ServerResponse = import("node:http").ServerResponse;
type Server = import("node:http").Server;

/**
 * Server adapter for Node.js runtime.
 *
 * Uses Node.js native `http.createServer()` with Web API compatibility layer.
 * This adapter converts between Node.js IncomingMessage/ServerResponse and
 * Web standard Request/Response objects.
 *
 * @example
 * ```typescript
 * const adapter = new IgniterServerNodeAdapter();
 * const server = await adapter.start(handler, { port: 3000, hostname: 'localhost' });
 * ```
 */
export class IgniterServerNodeAdapter implements IIgniterServerAdapter {
  // Cached http module for lazy loading
  private httpModule: typeof import("node:http") | null = null;

  /**
   * Lazily imports the node:http module.
   * This avoids bundler issues and only loads when actually needed.
   */
  private async getHttpModule(): Promise<typeof import("node:http")> {
    if (!this.httpModule) {
      this.httpModule = await import("node:http");
    }
    return this.httpModule;
  }

  /**
   * Starts a Node.js HTTP server with the given handler.
   *
   * @param handler - The request handler function (Web API standard)
   * @param options - Server configuration (port, hostname)
   * @returns A promise resolving to the server instance
   */
  async start(
    handler: (request: Request) => Promise<Response>,
    options: { port: number; hostname: string },
  ): Promise<IIgniterServerInstance> {
    const { port, hostname } = options;

    // Lazy load http module at runtime
    const http = await this.getHttpModule();

    const server = http.createServer(async (req, res) => {
      try {
        const request = this.toWebRequest(req, hostname, port);
        const response = await handler(request);
        await this.sendWebResponse(res, response);
      } catch (error) {
        console.error("[IgniterServer] Request error:", error);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Internal Server Error" }));
      }
    });

    return new Promise((resolve, reject) => {
      server.on("error", reject);
      server.listen(port, hostname, () => {
        resolve({
          port,
          hostname,
          close: () => this.closeServer(server),
        });
      });
    });
  }

  /**
   * Converts Node.js IncomingMessage to Web API Request.
   */
  private toWebRequest(
    req: IncomingMessage,
    hostname: string,
    port: number,
  ): Request {
    const protocol = "http";
    const url = new URL(req.url || "/", `${protocol}://${hostname}:${port}`);

    // Convert headers
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }

    // Create Request with body stream for non-GET/HEAD methods
    const hasBody = req.method !== "GET" && req.method !== "HEAD";

    return new Request(url.toString(), {
      method: req.method || "GET",
      headers,
      body: hasBody ? this.createBodyStream(req) : undefined,
      // @ts-expect-error - duplex is needed for streaming requests in Node 18+
      duplex: hasBody ? "half" : undefined,
    });
  }

  /**
   * Creates a ReadableStream from Node.js IncomingMessage.
   */
  private createBodyStream(req: IncomingMessage): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start(controller) {
        req.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        req.on("end", () => {
          controller.close();
        });
        req.on("error", (err) => {
          controller.error(err);
        });
      },
    });
  }

  /**
   * Sends a Web API Response to Node.js ServerResponse.
   */
  private async sendWebResponse(
    res: ServerResponse,
    response: Response,
  ): Promise<void> {
    // Set status
    res.statusCode = response.status;
    res.statusMessage = response.statusText;

    // Set headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Send body
    if (response.body) {
      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally {
        reader.releaseLock();
      }
    }

    res.end();
  }

  /**
   * Gracefully closes the server.
   */
  private closeServer(server: Server): Promise<void> {
    return new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

