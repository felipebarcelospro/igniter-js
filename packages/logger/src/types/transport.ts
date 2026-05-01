/**
 * @fileoverview Transport types for @igniter-js/logger
 * @module @igniter-js/logger/types/transport
 */

/**
 * Built-in and custom transport targets.
 *
 * Use a string to reference custom transports.
 */
export type IgniterTransportTarget =
  | "console"
  | "file"
  | "http"
  | (string & {});

/**
 * Options for the built-in console transport.
 */
export interface ConsoleTransportOptions {
  /** Enable ANSI color output. */
  colorize?: boolean;
  /** Pretty-print structured entries. */
  pretty?: boolean;
  /** Output destination for console logs. */
  destination?: "stdout" | "stderr" | string;
  /** Time format for log entries. */
  translateTime?: string | boolean;
}

/**
 * Rotation configuration for file transports.
 */
export interface IgniterFileTransportRotationOptions {
  /** Maximum file size in bytes before rotation. */
  maxSizeBytes?: number;
  /** Maximum number of rotated files to keep. */
  maxFiles?: number;
  /** Rotation interval in milliseconds. */
  intervalMs?: number;
}

/**
 * Options for the built-in file transport.
 */
export interface FileTransportOptions {
  /** Destination file path. */
  path: string;
  /** Create directories when missing. */
  mkdir?: boolean;
  /** Rotation configuration. */
  rotation?: boolean | IgniterFileTransportRotationOptions;
}

/**
 * Options for the built-in HTTP transport.
 */
export interface HttpTransportOptions {
  /** Target URL for log ingestion. */
  url: string;
  /** Optional headers for authentication or metadata. */
  headers?: Record<string, string>;
  /** Number of entries per batch. */
  batchSize?: number;
  /** Request timeout in milliseconds. */
  timeoutMs?: number;
  /** Interval to flush buffered logs in milliseconds. */
  flushInterval?: number;
}

/**
 * Transport options union for built-in and custom transports.
 */
export type IgniterTransportOptions =
  | ConsoleTransportOptions
  | FileTransportOptions
  | HttpTransportOptions
  | Record<string, unknown>;

/**
 * Transport configuration descriptor.
 *
 * @typeParam TOptions - Transport-specific options payload
 */
export interface IgniterTransportConfig<
  TOptions extends Record<string, any> = IgniterTransportOptions,
> {
  /** Transport target identifier. */
  target: IgniterTransportTarget;
  /** Transport options payload. */
  options?: TOptions;
}
