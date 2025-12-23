import type { IgniterLogger } from "@igniter-js/core";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import type { Stream } from "node:stream";
import type { IgniterStorageAdapter } from "../adapters/storage.adapter";
import type { IgniterStorageFile } from "./file";
import type { IgniterStorageHooks } from "./hooks";
import type { IgniterStoragePolicies } from "./policies";
import type { IgniterStorageUploadOptions } from "./replace";
import type { IgniterStorageScopes } from "./scopes";

/**
 * Resolved destination details after processing input path and inferred extensions.
 */
export type IgniterStorageResolvedDestination = {
  /** The final storage key. */
  key: string;
  /** The basename including extension. */
  basename: string;
  /** The filename without extension. */
  name: string;
  /** The file extension without dot. */
  extension: string;
};

/**
 * Configuration for the IgniterStorageManager.
 *
 * @template TScopes - The type-safe scopes definition.
 */
export type IgniterStorageManagerConfig<
  TScopes extends IgniterStorageScopes = IgniterStorageScopes,
> = {
  /**
   * The storage adapter instance (S3, GCS, etc).
   */
  adapter: IgniterStorageAdapter;

  /**
   * Optional logger instance for internal debugging.
   */
  logger?: IgniterLogger;

  /**
   * Optional telemetry manager for tracing and metrics.
   */
  telemetry?: IgniterTelemetryManager;

  /**
   * The public base URL (CDN) for serving files.
   */
  baseUrl: string;

  /**
   * An optional base path prefix (e.g. '/uploads').
   */
  basePath?: string;

  /**
   * Global hooks for storage operations.
   */
  hooks?: IgniterStorageHooks;

  /**
   * Global upload policies (size, extensions, etc).
   */
  policies?: IgniterStoragePolicies;

  /**
   * Pre-registered scope templates.
   */
  scopes?: TScopes;
};

/**
 * Public API for IgniterStorage.
 *
 * This interface defines all available operations for managing files.
 * It supports fluent path composition and type-safe scoping.
 */
export interface IIgniterStorageManager<
  TScopes extends {
    [key: string]: IgniterStorageScopes[string];
  } = {},
> {
  /**
   * The configured public base URL.
   */
  readonly baseUrl: string;

  /**
   * The current active base path.
   */
  readonly basePath: string | undefined;

  /**
   * The active logger instance.
   */
  readonly logger?: IgniterLogger;

  /**
   * Active upload policies.
   */
  readonly policies?: IgniterStoragePolicies;

  /**
   * Registered scope templates.
   */
  readonly scopes?: TScopes;

  /**
   * Returns a new manager instance with an appended path segment.
   *
   * @example
   * ```typescript
   * const images = storage.path('images');
   * await images.upload(file, 'logo.png'); // Uploads to /images/logo.png
   * ```
   *
   * @param prefix - The path segment to append.
   */
  path(prefix: string): IIgniterStorageManager<TScopes>;

  /**
   * Returns a new manager instance scoped to a pre-defined template.
   *
   * Scopes must be registered during builder initialization.
   * If the scope path template contains `[identifier]`, it must be provided.
   *
   * @example
   * ```typescript
   * const userStorage = storage.scope('user', '123');
   * await userStorage.upload(file, 'avatar.png'); // Uploads to /users/123/avatar.png
   * ```
   *
   * @param scopeKey - The registered scope key.
   * @param args - Arguments for the scope (identifier if needed).
   */
  scope<K extends keyof TScopes & string>(
    scopeKey: K,
    ...args: TScopes[K] extends { requiresIdentifier: infer R }
      ? R extends true
        ? [identifier: string]
        : [identifier?: string]
      : [identifier?: string]
  ): IIgniterStorageManager<TScopes>;

  /**
   * Checks if a file exists and returns its metadata.
   *
   * @param pathOrUrl - Relative path or full URL (matching baseUrl).
   * @returns Metadata of the file or null if not found.
   */
  get(pathOrUrl: string): Promise<IgniterStorageFile | null>;

  /**
   * Uploads a file to the specified destination.
   *
   * Handles content-type inference and policy enforcement automatically.
   *
   * @param file - File content as Blob, Stream, Buffer, or string.
   * @param destination - Target path or filename.
   * @param options - Upload options (replace strategy, explicit content-type).
   */
  upload(
    file: File | Blob | Stream | Buffer | Uint8Array | string,
    destination: string,
    options?: IgniterStorageUploadOptions & { contentType?: string },
  ): Promise<IgniterStorageFile>;

  /**
   * Deletes a file from storage.
   *
   * @param pathOrUrl - Relative path or full URL.
   * @throws IgniterStorageError if deletion fails.
   */
  delete(pathOrUrl: string): Promise<void>;

  /**
   * Lists files under the current prefix or a specific sub-prefix.
   *
   * @param prefix - Optional sub-prefix to list.
   * @returns Array of file metadata.
   */
  list(prefix?: string): Promise<IgniterStorageFile[]>;

  /**
   * Returns a readable stream for the specified file.
   *
   * @param pathOrUrl - Relative path or full URL.
   * @returns A Node.js Readable stream.
   */
  stream(pathOrUrl: string): Promise<Stream>;

  /**
   * Copies a file from one location to another.
   *
   * @param from - Source path or URL.
   * @param to - Destination path.
   * @throws IgniterStorageError if copy is not supported or fails.
   */
  copy(from: string, to: string): Promise<IgniterStorageFile>;

  /**
   * Moves a file from one location to another (Copy + Delete).
   *
   * @param from - Source path or URL.
   * @param to - Destination path.
   */
  move(from: string, to: string): Promise<IgniterStorageFile>;
}
