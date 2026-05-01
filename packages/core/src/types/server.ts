/**
 * @fileoverview Server types for Igniter.js
 * @module @igniter-js/core/types/server
 */

/**
 * Options for starting the Igniter server.
 */
export interface IgniterServerOptions {
  /**
   * Port to listen on.
   * @default 3000
   */
  port?: number;

  /**
   * Hostname to bind to.
   * @default 'localhost'
   */
  hostname?: string;

  /**
   * Callback invoked when the server starts listening.
   */
  onListen?: (info: IgniterServerInfo) => void;

  /**
   * Callback invoked when a server error occurs.
   */
  onError?: (error: Error) => void;
}

/**
 * Information about a running server.
 */
export interface IgniterServerInfo {
  readonly port: number;
  readonly hostname: string;
}

/**
 * Represents a running Igniter server instance.
 */
export interface IIgniterServerInstance extends IgniterServerInfo {
  /**
   * Stops the server gracefully.
   */
  close(): Promise<void>;
}

/**
 * Contract for server adapters that start HTTP servers in different runtimes.
 */
export interface IIgniterServerAdapter {
  /**
   * Starts the server with the given handler.
   *
   * @param handler - The request handler function
   * @param options - Server configuration options
   * @returns A promise resolving to the server instance
   */
  start(
    handler: (request: Request) => Promise<Response>,
    options: Required<Pick<IgniterServerOptions, 'port' | 'hostname'>>,
  ): Promise<IIgniterServerInstance>;
}
