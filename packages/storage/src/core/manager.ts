import { Buffer } from "node:buffer";
import type Stream from "node:stream";
import type { IgniterLogger } from "@igniter-js/core";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import type { IgniterStorageTelemetryEventsType } from "../telemetry";
import { IgniterStorageAdapter } from "../adapters/storage.adapter";
import { IgniterStorageError } from "../errors/storage.error";
import { IgniterStorageTelemetryEvents } from "../telemetry";
import type { IgniterStorageFile } from "../types/file";
import type { IgniterStorageHooks } from "../types/hooks";
import type {
  IIgniterStorageManager,
  IgniterStorageManagerConfig,
  IgniterStorageResolvedDestination,
} from "../types/manager";
import type {
  IgniterStoragePolicies,
  IgniterStoragePolicyViolation,
} from "../types/policies";
import type { IgniterStorageUploadOptions } from "../types/replace";
import type { IgniterStorageScopes } from "../types/scopes";
import { IgniterStorageMime } from "../utils/mime";
import { IgniterStoragePath } from "../utils/path";
import { IgniterStorageUrl } from "../utils/url";

/**
 * Core manager for storage operations.
 *
 * The `IgniterStorageManager` is the central engine of the `@igniter-js/storage` package.
 * It provides a high-level, type-safe API for file operations while delegating the
 * actual I/O to pluggable adapters (e.g., S3, Google Cloud Storage).
 *
 * @template TScopes - The registered scope definitions for type-safe access.
 * @group Core
 */
export class IgniterStorageManager<
  TScopes extends {
    [key: string]: IgniterStorageScopes[string];
  } = {},
> implements IIgniterStorageManager<TScopes> {
  /**
   * The storage provider adapter used for physical I/O.
   */
  public readonly adapter: IgniterStorageAdapter;

  /**
   * Logger instance for operational tracing and debugging.
   */
  public readonly logger?: IgniterLogger;

  /**
   * Telemetry manager for emitting events and metrics.
   */
  public readonly telemetry?: IgniterTelemetryManager<any>;

  /**
   * Telemetry manager for typed internal emissions.
   */
  private readonly telemetryInternal?: IgniterTelemetryManager<{
    "igniter.storage": IgniterStorageTelemetryEventsType;
  }>;

  /**
   * The public base URL used to generate accessible file links.
   */
  public readonly baseUrl: string;

  /**
   * The current base path prefix for all operations.
   */
  public readonly basePath: string | undefined;

  /**
   * Registered scope templates.
   */
  public readonly scopes?: TScopes;

  /**
   * Active upload policies.
   */
  public readonly policies?: IgniterStoragePolicies;

  /** @internal */
  private readonly config: IgniterStorageManagerConfig<TScopes>;

  /**
   * Initializes a new instance of the IgniterStorageManager.
   *
   * @param config - The manager configuration.
   */
  constructor(config: IgniterStorageManagerConfig<TScopes>) {
    this.config = config;
    this.adapter = config.adapter;
    this.logger = config.logger;
    this.telemetry = config.telemetry;
    this.telemetryInternal = config.telemetry as IgniterTelemetryManager<{
      "igniter.storage": IgniterStorageTelemetryEventsType;
    }>;
    this.baseUrl = config.baseUrl;
    this.basePath = config.basePath;
    this.scopes = config.scopes;
    this.policies = config.policies;

    this.logger?.info("IgniterStorageManager initialized", {
      baseUrl: this.baseUrl,
      basePath: this.basePath,
      adapter: this.adapter.constructor.name,
    });
  }

  /**
   * Returns a new manager instance with an additional path segment.
   *
   * @param prefix - The path segment to append.
   */
  path(prefix: string): IgniterStorageManager<TScopes> {
    const nextPath = IgniterStoragePath.join(this.basePath, prefix);
    return new IgniterStorageManager({
      ...this.config,
      basePath: nextPath,
    });
  }

  /**
   * Returns a new manager instance scoped to a pre-defined entity template.
   *
   * @param scopeKey - The unique key of the registered scope.
   * @param args - Arguments for the scope.
   */
  scope<K extends keyof TScopes & string>(
    scopeKey: K,
    ...args: TScopes[K] extends { requiresIdentifier: infer R }
      ? R extends true
        ? [identifier: string]
        : [identifier?: string]
      : [identifier?: string]
  ): IgniterStorageManager<TScopes> {
    const definition = this.config.scopes?.[scopeKey];
    if (!definition) {
      throw new IgniterStorageError({
        code: "IGNITER_STORAGE_INVALID_SCOPE",
        operation: "scope",
        message: `Unknown scope: ${scopeKey}`,
        data: { scopeKey },
      });
    }

    const identifier = args[0];

    if (definition.requiresIdentifier && !identifier) {
      throw new IgniterStorageError({
        code: "IGNITER_STORAGE_SCOPE_IDENTIFIER_REQUIRED",
        operation: "scope",
        message: `Scope "${scopeKey}" requires an identifier but none was provided.`,
        data: { scopeKey },
      });
    }

    const pathTemplate = definition.path;
    const scopePath = definition.requiresIdentifier
      ? pathTemplate.replace("[identifier]", String(identifier))
      : pathTemplate;

    return this.path(scopePath);
  }

  /**
   * Resolves an input path or URL into a storage key relative to current basePath.
   *
   * @internal
   */
  protected resolvePath(input: string): string {
    const stripped = IgniterStorageUrl.stripBaseUrlOrThrow({
      input,
      baseUrl: this.baseUrl,
    });

    return IgniterStoragePath.join(this.basePath, stripped);
  }

  /**
   * Converts a storage key into a public URL.
   *
   * @param key - The storage key.
   * @internal
   */
  protected toUrl(key: string): string {
    const base = IgniterStorageUrl.ensureTrailingSlash(this.baseUrl);
    return new URL(key, base).toString();
  }

  /**
   * Checks if a file exists and returns its metadata.
   *
   * @param pathOrUrl - Relative path or full URL.
   */
  async get(pathOrUrl: string): Promise<IgniterStorageFile | null> {
    const key = this.resolvePath(pathOrUrl);
    const startTime = Date.now();

    this.logger?.info(`get: fetching file info`, { key });

    try {
      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("get.started"),
        {
          level: "debug",
          attributes: {
            "storage.path": key,
          },
        },
      );

      const exists = await this.adapter.exists(key);
      const duration = Date.now() - startTime;

      if (!exists) {
        this.logger?.warn(`get: file not found`, { key });
        this.telemetryInternal?.emit(
          IgniterStorageTelemetryEvents.get.key("get.success"),
          {
            level: "info",
            attributes: {
              "storage.path": key,
              "storage.found": false,
              "storage.duration_ms": duration,
            },
          },
        );
        return null;
      }

      const file = this.fileFromKey(key);
      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("get.success"),
        {
          level: "info",
          attributes: {
            "storage.path": key,
            "storage.found": true,
            "storage.size": file.size,
            "storage.content_type": file.contentType,
            "storage.duration_ms": duration,
          },
        },
      );

      this.logger?.info(`get: file found`, { key, file });
      return file;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorCode = IgniterStorageError.is(error)
        ? error.code
        : "IGNITER_STORAGE_GET_FAILED";
      const errorMessage =
        (error as Error)?.message ?? "IGNITER_STORAGE_GET_FAILED";
      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("get.error"),
        {
          level: "error",
          attributes: {
            "storage.path": key,
            "storage.duration_ms": duration,
            "storage.error.code": errorCode,
            "storage.error.message": errorMessage,
          },
        },
      );

      this.logger?.error(`get: failed to retrieve metadata`, { key, error });

      if (IgniterStorageError.is(error)) {
        throw error;
      }

      throw new IgniterStorageError({
        code: "IGNITER_STORAGE_GET_FAILED",
        operation: "get",
        message: (error as Error)?.message ?? "IGNITER_STORAGE_GET_FAILED",
        cause: error,
        data: { pathOrUrl },
      });
    }
  }

  /**
   * Deletes a file from the storage provider.
   *
   * @param pathOrUrl - Relative path or full URL.
   */
  async delete(pathOrUrl: string): Promise<void> {
    const key = this.resolvePath(pathOrUrl);
    const startTime = Date.now();

    this.logger?.info(`delete: starting deletion`, { key });

    try {
      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("delete.started"),
        {
          level: "debug",
          attributes: {
            "storage.path": key,
          },
        },
      );
      await this.config.hooks?.onDeleteStarted?.({
        operation: "delete",
        path: key,
      });

      await this.adapter.delete(key);

      const duration = Date.now() - startTime;
      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("delete.success"),
        {
          level: "info",
          attributes: {
            "storage.path": key,
            "storage.duration_ms": duration,
          },
        },
      );
      await this.config.hooks?.onDeleteSuccess?.({
        operation: "delete",
        path: key,
      });

      this.logger?.success(`delete: file deleted successfully`, {
        key,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorCode = IgniterStorageError.is(error)
        ? error.code
        : "IGNITER_STORAGE_DELETE_FAILED";
      const errorMessage =
        (error as Error)?.message ?? "IGNITER_STORAGE_DELETE_FAILED";
      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("delete.error"),
        {
          level: "error",
          attributes: {
            "storage.path": key,
            "storage.duration_ms": duration,
            "storage.error.code": errorCode,
            "storage.error.message": errorMessage,
          },
        },
      );

      this.logger?.error(`delete: deletion failed`, { key, error });

      await this.config.hooks?.onDeleteError?.(
        { operation: "delete", path: key },
        error as Error,
      );

      if (IgniterStorageError.is(error)) {
        throw error;
      }

      throw new IgniterStorageError({
        code: "IGNITER_STORAGE_DELETE_FAILED",
        operation: "delete",
        message: (error as Error)?.message ?? "IGNITER_STORAGE_DELETE_FAILED",
        cause: error,
        data: { pathOrUrl },
      });
    }
  }

  /**
   * Lists all files under a given prefix.
   *
   * @param prefix - Optional sub-prefix to filter results.
   */
  async list(prefix?: string): Promise<IgniterStorageFile[]> {
    const resolvedPrefix = prefix
      ? this.resolvePath(prefix)
      : this.basePath
        ? IgniterStoragePath.join(this.basePath)
        : undefined;

    const startTime = Date.now();
    this.logger?.info(`list: listing files`, { prefix, resolvedPrefix });

    try {
      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("list.started"),
        {
          level: "debug",
          attributes: resolvedPrefix
            ? { "storage.prefix": resolvedPrefix }
            : {},
        },
      );

      const keys = await this.adapter.list(resolvedPrefix);
      const files = keys.map((key) => this.fileFromKey(key));
      const duration = Date.now() - startTime;

      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("list.success"),
        {
          level: "info",
          attributes: {
            ...(resolvedPrefix ? { "storage.prefix": resolvedPrefix } : {}),
            "storage.count": files.length,
            "storage.duration_ms": duration,
          },
        },
      );

      this.logger?.success(`list: found ${files.length} files`, { duration });
      return files;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorCode = IgniterStorageError.is(error)
        ? error.code
        : "IGNITER_STORAGE_LIST_FAILED";
      const errorMessage =
        (error as Error)?.message ?? "IGNITER_STORAGE_LIST_FAILED";
      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("list.error"),
        {
          level: "error",
          attributes: {
            ...(resolvedPrefix ? { "storage.prefix": resolvedPrefix } : {}),
            "storage.duration_ms": duration,
            "storage.error.code": errorCode,
            "storage.error.message": errorMessage,
          },
        },
      );

      this.logger?.error(`list: listing failed`, { resolvedPrefix, error });

      if (IgniterStorageError.is(error)) {
        throw error;
      }

      throw new IgniterStorageError({
        code: "IGNITER_STORAGE_LIST_FAILED",
        operation: "list",
        message: (error as Error)?.message ?? "IGNITER_STORAGE_LIST_FAILED",
        cause: error,
        data: { prefix },
      });
    }
  }

  /**
   * Opens a readable stream for a file.
   *
   * @param pathOrUrl - Relative path or full URL.
   */
  async stream(pathOrUrl: string): Promise<Stream.Readable> {
    const key = this.resolvePath(pathOrUrl);
    const startTime = Date.now();

    this.logger?.info(`stream: opening read stream`, { key });

    try {
      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("stream.started"),
        {
          level: "debug",
          attributes: {
            "storage.path": key,
          },
        },
      );
      const stream = await this.adapter.stream(key);

      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("stream.success"),
        {
          level: "info",
          attributes: {
            "storage.path": key,
            "storage.duration_ms": Date.now() - startTime,
          },
        },
      );

      return stream;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorCode = IgniterStorageError.is(error)
        ? error.code
        : "IGNITER_STORAGE_STREAM_FAILED";
      const errorMessage =
        (error as Error)?.message ?? "IGNITER_STORAGE_STREAM_FAILED";
      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("stream.error"),
        {
          level: "error",
          attributes: {
            "storage.path": key,
            "storage.duration_ms": duration,
            "storage.error.code": errorCode,
            "storage.error.message": errorMessage,
          },
        },
      );

      this.logger?.error(`stream: failed to open stream`, { key, error });

      if (IgniterStorageError.is(error)) {
        throw error;
      }

      throw new IgniterStorageError({
        code: "IGNITER_STORAGE_STREAM_FAILED",
        operation: "stream",
        message: (error as Error)?.message ?? "IGNITER_STORAGE_STREAM_FAILED",
        cause: error,
        data: { pathOrUrl },
      });
    }
  }

  /**
   * Uploads a file fetched from a remote URL.
   *
   * @param sourceUrl - Public URL of the source file.
   * @param destination - Target path or filename.
   * @param options - Standard upload options.
   */
  async uploadFromUrl(
    sourceUrl: string,
    destination: string,
    options?: IgniterStorageUploadOptions,
  ): Promise<IgniterStorageFile> {
    this.logger?.info(`uploadFromUrl: fetching source`, {
      sourceUrl,
      destination,
    });

    let response: Response;
    try {
      response = await fetch(sourceUrl);
    } catch (error) {
      throw new IgniterStorageError({
        code: "IGNITER_STORAGE_FETCH_FAILED",
        operation: "upload",
        message: (error as Error)?.message ?? "IGNITER_STORAGE_FETCH_FAILED",
        cause: error,
        data: { sourceUrl },
      });
    }

    if (!response.ok) {
      throw new IgniterStorageError({
        code: "IGNITER_STORAGE_FETCH_FAILED",
        operation: "upload",
        message: `IGNITER_STORAGE_FETCH_FAILED: ${response.status} ${response.statusText}`,
        data: { sourceUrl, status: response.status },
      });
    }

    const headerContentType = response.headers.get("content-type") ?? undefined;
    const arrayBuffer = await response.arrayBuffer();

    const contentType = headerContentType
      ? IgniterStorageMime.normalize(headerContentType)
      : "application/octet-stream";

    const blob = new Blob([arrayBuffer], { type: contentType });

    return this.upload(blob, destination, {
      ...options,
      _source: { kind: "url", url: sourceUrl },
      _explicitContentType: contentType,
    } as any);
  }

  /**
   * Uploads a file from a memory Buffer or Uint8Array.
   *
   * @param buffer - Content as Buffer, Uint8Array or ArrayBuffer.
   * @param destination - Target path.
   * @param options - Standard upload options.
   */
  async uploadFromBuffer(
    buffer: Uint8Array | ArrayBuffer,
    destination: string,
    options?: IgniterStorageUploadOptions & { contentType?: string },
  ): Promise<IgniterStorageFile> {
    const bytes =
      buffer instanceof ArrayBuffer ? Buffer.from(buffer) : Buffer.from(buffer);

    const blob = new Blob([bytes], {
      type: options?.contentType ?? "application/octet-stream",
    });

    return this.upload(blob, destination, {
      ...options,
      _source: { kind: "buffer" },
      _explicitContentType: options?.contentType,
    } as any);
  }

  /**
   * Uploads a file from a Base64 encoded string.
   *
   * @param base64 - Base64 string.
   * @param destination - Target path.
   * @param options - Standard upload options.
   */
  async uploadFromBase64(
    base64: string,
    destination: string,
    options?: IgniterStorageUploadOptions & { contentType?: string },
  ): Promise<IgniterStorageFile> {
    const normalized = base64.includes(",")
      ? base64.split(",").pop() || ""
      : base64;

    const buf = Buffer.from(normalized, "base64");

    return this.uploadFromBuffer(buf, destination, options);
  }

  /**
   * Uploads a file to storage.
   *
   * @param file - Content as Blob, File, or Readable Stream.
   * @param destination - Target path or filename.
   * @param options - Configuration for this specific upload.
   */
  async upload(
    file: File | Blob | Stream.Readable,
    destination: string,
    options?: IgniterStorageUploadOptions & {
      _explicitContentType?: string;
      _source?: { kind: "file" | "url" | "buffer" | "base64"; url?: string };
    },
  ): Promise<IgniterStorageFile> {
    const resolved = this.resolveDestination(destination, {
      sourceContentType: options?._explicitContentType,
      file,
    });

    const contentType = this.inferContentType({
      destinationBasename: resolved.basename,
      file,
      explicit: options?._explicitContentType,
    });

    const size = file instanceof Blob ? file.size : undefined;
    const startTime = Date.now();

    this.logger?.info(`upload: starting delivery`, {
      key: resolved.key,
      method: options?._source?.kind ?? "file",
      size,
      contentType,
    });

    const hookPayload = {
      operation: "upload" as const,
      path: resolved.key,
      source: options?._source,
      name: resolved.name,
      extension: resolved.extension,
      contentType,
      size,
    };

    try {
      this.assertUploadPolicies({
        filename: resolved.basename,
        contentType,
        size,
      });

      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("upload.started"),
        {
          level: "debug",
          attributes: {
            "storage.path": resolved.key,
            "storage.size": size,
            "storage.content_type": contentType,
            "storage.method": options?._source?.kind ?? "file",
          },
        },
      );

      await this.config.hooks?.onUploadStarted?.(hookPayload);

      if (options?.replace) {
        await this.applyReplaceStrategy({
          resolved,
          strategy: options.replace,
        });
      }

      await this.adapter.put(resolved.key, file, {
        contentType,
        cacheControl: "public, max-age=31536000",
        public: true,
      });

      const stored = this.fileFromKey(resolved.key, {
        contentType,
        size,
      });

      const duration = Date.now() - startTime;
      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("upload.success"),
        {
          level: "info",
          attributes: {
            "storage.path": resolved.key,
            "storage.url": stored.url,
            "storage.size": size,
            "storage.content_type": contentType,
            "storage.duration_ms": duration,
          },
        },
      );

      await this.config.hooks?.onUploadSuccess?.({
        ...hookPayload,
        file: stored,
      });

      this.logger?.success(`upload: success`, {
        key: resolved.key,
        url: stored.url,
        duration,
      });

      return stored;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorCode = IgniterStorageError.is(error)
        ? error.code
        : "IGNITER_STORAGE_UPLOAD_FAILED";
      const errorMessage =
        (error as Error)?.message ?? "IGNITER_STORAGE_UPLOAD_FAILED";
      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("upload.error"),
        {
          level: "error",
          attributes: {
            "storage.path": resolved.key,
            "storage.size": size,
            "storage.content_type": contentType,
            "storage.method": options?._source?.kind ?? "file",
            "storage.duration_ms": duration,
            "storage.error.code": errorCode,
            "storage.error.message": errorMessage,
          },
        },
      );

      this.logger?.error(`upload: delivery failed`, {
        key: resolved.key,
        error,
      });

      await this.config.hooks?.onUploadError?.(hookPayload, error as Error);

      if (IgniterStorageError.is(error)) {
        throw error;
      }

      throw new IgniterStorageError({
        code: "IGNITER_STORAGE_UPLOAD_FAILED",
        operation: "upload",
        message: (error as Error)?.message ?? "IGNITER_STORAGE_UPLOAD_FAILED",
        cause: error,
        data: { destination, resolved },
      });
    }
  }

  /**
   * Copies a file from one storage location to another.
   *
   * @param from - Source storage path or URL.
   * @param to - Destination storage path.
   */
  async copy(from: string, to: string): Promise<IgniterStorageFile> {
    if (!this.adapter.copy) {
      throw new IgniterStorageError({
        code: "IGNITER_STORAGE_COPY_NOT_SUPPORTED",
        operation: "copy",
        message:
          "This storage adapter does not support direct copy operations.",
      });
    }

    const fromKey = this.resolvePath(from);
    const toKey = this.resolvePath(to);
    const startTime = Date.now();

    this.logger?.info(`copy: copying file`, { fromKey, toKey });

    try {
      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("copy.started"),
        {
          level: "debug",
          attributes: {
            "storage.from": fromKey,
            "storage.to": toKey,
          },
        },
      );

      await this.config.hooks?.onCopyStarted?.({
        operation: "copy",
        path: toKey,
        from: fromKey,
        to: toKey,
      });

      await this.adapter.copy(fromKey, toKey);

      const duration = Date.now() - startTime;
      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("copy.success"),
        {
          level: "info",
          attributes: {
            "storage.from": fromKey,
            "storage.to": toKey,
            "storage.duration_ms": duration,
          },
        },
      );

      await this.config.hooks?.onCopySuccess?.({
        operation: "copy",
        path: toKey,
        from: fromKey,
        to: toKey,
      });

      const file = this.fileFromKey(toKey);
      this.logger?.success(`copy: successful`, { toKey, duration });
      return file;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorCode = IgniterStorageError.is(error)
        ? error.code
        : "IGNITER_STORAGE_COPY_FAILED";
      const errorMessage =
        (error as Error)?.message ?? "IGNITER_STORAGE_COPY_FAILED";
      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("copy.error"),
        {
          level: "error",
          attributes: {
            "storage.from": fromKey,
            "storage.to": toKey,
            "storage.duration_ms": duration,
            "storage.error.code": errorCode,
            "storage.error.message": errorMessage,
          },
        },
      );

      this.logger?.error(`copy: failed`, { fromKey, toKey, error });

      await this.config.hooks?.onCopyError?.(
        { operation: "copy", path: toKey, from: fromKey, to: toKey },
        error as Error,
      );

      if (IgniterStorageError.is(error)) {
        throw error;
      }

      throw new IgniterStorageError({
        code: "IGNITER_STORAGE_COPY_FAILED",
        operation: "copy",
        message: (error as Error)?.message ?? "IGNITER_STORAGE_COPY_FAILED",
        cause: error,
        data: { from, to },
      });
    }
  }

  /**
   * Moves a file from one storage location to another.
   *
   * @param from - Source storage path or URL.
   * @param to - Destination storage path.
   */
  async move(from: string, to: string): Promise<IgniterStorageFile> {
    if (!this.adapter.move) {
      throw new IgniterStorageError({
        code: "IGNITER_STORAGE_MOVE_NOT_SUPPORTED",
        operation: "move",
        message:
          "This storage adapter does not support direct move operations.",
      });
    }

    const fromKey = this.resolvePath(from);
    const toKey = this.resolvePath(to);
    const startTime = Date.now();

    this.logger?.info(`move: moving file`, { fromKey, toKey });

    try {
      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("move.started"),
        {
          level: "debug",
          attributes: {
            "storage.from": fromKey,
            "storage.to": toKey,
          },
        },
      );

      await this.config.hooks?.onMoveStarted?.({
        operation: "move",
        path: toKey,
        from: fromKey,
        to: toKey,
      });

      await this.adapter.move(fromKey, toKey);

      const duration = Date.now() - startTime;
      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("move.success"),
        {
          level: "info",
          attributes: {
            "storage.from": fromKey,
            "storage.to": toKey,
            "storage.duration_ms": duration,
          },
        },
      );

      await this.config.hooks?.onMoveSuccess?.({
        operation: "move",
        path: toKey,
        from: fromKey,
        to: toKey,
      });

      const file = this.fileFromKey(toKey);
      this.logger?.success(`move: successful`, { toKey, duration });
      return file;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorCode = IgniterStorageError.is(error)
        ? error.code
        : "IGNITER_STORAGE_MOVE_FAILED";
      const errorMessage =
        (error as Error)?.message ?? "IGNITER_STORAGE_MOVE_FAILED";
      this.telemetryInternal?.emit(
        IgniterStorageTelemetryEvents.get.key("move.error"),
        {
          level: "error",
          attributes: {
            "storage.from": fromKey,
            "storage.to": toKey,
            "storage.duration_ms": duration,
            "storage.error.code": errorCode,
            "storage.error.message": errorMessage,
          },
        },
      );

      this.logger?.error(`move: failed`, { fromKey, toKey, error });

      await this.config.hooks?.onMoveError?.(
        { operation: "move", path: toKey, from: fromKey, to: toKey },
        error as Error,
      );

      if (IgniterStorageError.is(error)) {
        throw error;
      }

      throw new IgniterStorageError({
        code: "IGNITER_STORAGE_MOVE_FAILED",
        operation: "move",
        message: (error as Error)?.message ?? "IGNITER_STORAGE_MOVE_FAILED",
        cause: error,
        data: { from, to },
      });
    }
  }

  // --- Private Helpers ---

  /** @internal */
  private getConfig(): IgniterStorageManagerConfig<TScopes> {
    return {
      adapter: this.adapter,
      logger: this.logger,
      telemetry: this.telemetry,
      baseUrl: this.baseUrl,
      basePath: this.basePath,
      hooks: this.config.hooks,
      policies: this.config.policies,
      scopes: this.config.scopes,
    };
  }

  /** @internal */
  private fileFromKey(
    key: string,
    meta?: { contentType?: string; size?: number },
  ): IgniterStorageFile {
    const name = IgniterStoragePath.getBasename(key);
    const extension = IgniterStoragePath.getExtension(name);

    return {
      path: key,
      url: this.toUrl(key),
      name,
      extension,
      contentType: meta?.contentType,
      size: meta?.size,
    };
  }

  /** @internal */
  private resolveDestination(
    destination: string,
    params: {
      sourceContentType?: string;
      file?: File | Blob | Stream.Readable;
    },
  ): IgniterStorageResolvedDestination {
    const normalizedInput = IgniterStorageUrl.stripBaseUrlOrThrow({
      input: destination,
      baseUrl: this.baseUrl,
    });

    const keyBase = IgniterStoragePath.join(this.basePath, normalizedInput);

    const { dir, base } = IgniterStoragePath.split(keyBase);
    const ext = IgniterStoragePath.getExtension(base);

    const inferredExt =
      ext ||
      this.tryInferExtension({
        destinationBasename: base,
        sourceContentType: params.sourceContentType,
        file: params.file,
      });

    const nameWithoutExt =
      base && ext ? base.slice(0, -(ext.length + 1)) : base;

    const basename = inferredExt && !ext ? `${base}.${inferredExt}` : base;

    const key = dir ? `${dir}/${basename}` : basename;

    return {
      key,
      basename,
      name: nameWithoutExt,
      extension: inferredExt || ext || "",
    };
  }

  /** @internal */
  private tryInferExtension(params: {
    destinationBasename: string;
    sourceContentType?: string;
    file?: File | Blob | Stream.Readable;
  }): string {
    if (params.sourceContentType) {
      const ext = IgniterStorageMime.inferExtension(params.sourceContentType);
      if (ext) {
        return ext;
      }
    }

    if (params.file instanceof Blob && params.file.type) {
      const ext = IgniterStorageMime.inferExtension(params.file.type);
      if (ext) {
        return ext;
      }
    }

    return "";
  }

  /** @internal */
  private inferContentType(params: {
    destinationBasename: string;
    file: File | Blob | Stream.Readable;
    explicit?: string;
  }): string {
    if (params.explicit) {
      return IgniterStorageMime.normalize(params.explicit);
    }

    if (params.file instanceof Blob && params.file.type) {
      return IgniterStorageMime.normalize(params.file.type);
    }

    const byFilename = IgniterStorageMime.inferContentType(
      params.destinationBasename,
    );
    return byFilename
      ? IgniterStorageMime.normalize(byFilename)
      : "application/octet-stream";
  }

  /** @internal */
  private assertUploadPolicies(payload: {
    filename: string;
    contentType: string;
    size?: number;
  }) {
    const policies = this.config.policies;
    if (!policies) {
      return;
    }

    const violations: IgniterStoragePolicyViolation[] = [];

    if (
      typeof policies.maxFileSize === "number" &&
      typeof payload.size === "number" &&
      payload.size > policies.maxFileSize
    ) {
      violations.push({
        reason: "MAX_FILE_SIZE_EXCEEDED",
        message: `File size ${payload.size} exceeds max ${policies.maxFileSize}`,
        data: { size: payload.size, maxFileSize: policies.maxFileSize },
      });
    }

    if (
      policies.allowedMimeTypes?.length &&
      payload.contentType &&
      !policies.allowedMimeTypes.includes(payload.contentType)
    ) {
      violations.push({
        reason: "MIME_TYPE_NOT_ALLOWED",
        message: `Mime type "${payload.contentType}" is not allowed.`,
        data: {
          contentType: payload.contentType,
          allowed: policies.allowedMimeTypes,
        },
      });
    }

    if (policies.allowedExtensions?.length) {
      const ext = IgniterStoragePath.getExtension(payload.filename);
      if (ext && !policies.allowedExtensions.includes(ext)) {
        violations.push({
          reason: "EXTENSION_NOT_ALLOWED",
          message: `Extension ".${ext}" is not allowed.`,
          data: { extension: ext, allowed: policies.allowedExtensions },
        });
      }
    }

    if (violations.length) {
      throw new IgniterStorageError({
        code: "IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION",
        operation: "upload",
        message: "File upload was rejected due to policy violations.",
        data: { violations },
      });
    }
  }

  /** @internal */
  private async applyReplaceStrategy(params: {
    resolved: IgniterStorageResolvedDestination;
    strategy: NonNullable<IgniterStorageUploadOptions["replace"]>;
  }): Promise<void> {
    try {
      const { dir, base } = IgniterStoragePath.split(params.resolved.key);
      const basename = base;
      const ext = IgniterStoragePath.getExtension(basename);
      const nameWithoutExt = ext
        ? basename.slice(0, -(ext.length + 1))
        : basename;

      if (params.strategy === "BY_FILENAME_AND_EXTENSION") {
        await this.adapter.delete(params.resolved.key);
        return;
      }

      const prefix = dir ? `${dir}/` : "";
      const keys = await this.adapter.list(prefix);

      const matches = keys.filter((k) => {
        const b = IgniterStoragePath.getBasename(k);
        const e = IgniterStoragePath.getExtension(b);
        const n = e ? b.slice(0, -(e.length + 1)) : b;
        return n === nameWithoutExt;
      });

      await Promise.all(matches.map((k) => this.adapter.delete(k)));
    } catch (error) {
      throw new IgniterStorageError({
        code: "IGNITER_STORAGE_REPLACE_FAILED",
        operation: "upload",
        message: (error as Error)?.message ?? "IGNITER_STORAGE_REPLACE_FAILED",
        cause: error,
        data: { key: params.resolved.key, strategy: params.strategy },
      });
    }
  }

}
