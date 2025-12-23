import type { IgniterLogger } from "@igniter-js/core";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import { IgniterGoogleAdapter } from "../adapters/google-cloud.adapter";
import { IgniterStorageAdapter } from "../adapters/storage.adapter";
import { IgniterS3Adapter } from "../adapters/s3.adapter";
import { IgniterStorageManager } from "../core/manager";
import { IgniterStorageError } from "../errors/storage.error";
import type { IgniterStorageBuilderState } from "../types/builder";
import type {
  IgniterStorageAdapterCredentialsMap,
  IgniterStorageAdapterFactoryMap,
  IgniterStorageAdapterKey,
  IgniterStorageGoogleCredentials,
  IgniterStorageS3Credentials,
} from "../types/credentials";
import type { IgniterStorageHooks } from "../types/hooks";
import type { IgniterStoragePolicies } from "../types/policies";
import type {
  ContainsIdentifier,
  IgniterStorageScopeDefinition,
  IgniterStorageScopes,
} from "../types/scopes";
import { IgniterStorageEnv } from "../utils/env";


/**
 * Fluent builder for configuring and initializing the Igniter Storage service.
 *
 * This class uses accumulative generic types to provide end-to-end type safety for
 * storage scopes. Every time you call `.addScope()`, the resulting type is updated
 * to reflect the new available scope and whether it requires an identifier.
 *
 * ### Best Practices:
 * - Define your storage instance in a service file (e.g., `src/services/storage.ts`).
 * - Register all necessary scopes during initialization.
 * - Use environment variables for sensitive credentials via `IgniterStorageEnv`.
 *
 * @template TScopes - An object type mapping scope keys to their path definitions.
 *
 * @example
 * ```typescript
 * export const storage = IgniterStorage.create()
 *   .withAdapter('s3', { bucket: 'my-app' })
 *   .addScope('user', '/users/[identifier]')
 *   .addScope('public', '/public')
 *   .build();
 *
 * // Usage:
 * storage.scope('user', '123').upload(file, 'avatar.png'); // Type-safe!
 * storage.scope('public').upload(file, 'logo.png');         // Type-safe!
 * ```
 *
 * @group Core
 */
export class IgniterStorageBuilder<TScopes extends {
  [key: string]: IgniterStorageScopes[string];
} = {}> {
  private readonly state: IgniterStorageBuilderState;

  /**
   * Initializes a new builder with the given state.
   * @internal
   */
  constructor(state: IgniterStorageBuilderState) {
    this.state = state;
  }

  /**
   * Creates a fresh instance of the IgniterStorageBuilder.
   *
   * By default, it registers S3 and Google Cloud Storage adapter factories.
   * This is the entry point for configuring Igniter Storage and must be called
   * before any other builder methods.
   *
   * @returns A builder instance with no registered scopes.
   *
   * @example
   * ```typescript
   * // Basic initialization
   * const builder = IgniterStorage.create();
   *
   * // Full configuration chain
   * export const storage = IgniterStorage.create()
   *   .withUrl('https://cdn.myapp.com')
   *   .withAdapter('s3', { bucket: 'my-bucket', region: 'us-east-1' })
   *   .addScope('user', '/users/[identifier]')
   *   .addScope('public', '/public')
   *   .withMaxFileSize(5 * 1024 * 1024) // 5MB
   *   .withAllowedMimeTypes(['image/png', 'image/jpeg', 'application/pdf'])
   *   .onUploadSuccess((context) => {
   *     console.log('File uploaded:', context.file.name);
   *   })
   *   .build();
   * ```
   *
   * @remarks
   * - Calling `create()` multiple times creates independent builder instances.
   * - The returned builder is immutable; all builder methods return new instances.
   * - Both S3 and Google Cloud Storage adapters are pre-registered by default.
   *
   * @throws Does not throw. Configuration validation occurs during `.build()`.
   *
   * @see {@link withAdapter} for configuring which adapter to use
   * @see {@link build} for finalizing the configuration
   */
  static create(): IgniterStorageBuilder<{}> {
    return new IgniterStorageBuilder({
      scopes: {},
      adapterFactories: {
        s3: (credentials) => IgniterS3Adapter.create(credentials),
        google: (credentials) => IgniterGoogleAdapter.create(credentials),
      },
    });
  }

  /**
   * Registers custom adapter factories.
   *
   * Use this to provide custom storage provider implementations or to override
   * the default S3/GCS behavior. This is useful for supporting additional storage
   * backends, implementing custom adapters, or testing with mock adapters.
   *
   * @param factories - An object mapping keys to factory functions.
   * @returns A new builder instance with custom factories registered.
   *
   * @example
   * ```typescript
   * // Register a custom adapter
   * import { MyCustomAdapter } from './adapters/custom.adapter';
   *
   * const storage = IgniterStorage.create()
   *   .withAdapterFactories({
   *     custom: (credentials) => MyCustomAdapter.create(credentials),
   *   })
   *   .withAdapter('custom', { apiKey: 'xxx' })
   *   .addScope('uploads', '/uploads')
   *   .build();
   * ```
   *
   * @example
   * ```typescript
   * // Override S3 adapter with a mocked version for testing
   * const mockS3Adapter = {
   *   put: jest.fn(),
   *   get: jest.fn(),
   *   delete: jest.fn(),
   * };
   *
   * const storage = IgniterStorage.create()
   *   .withAdapterFactories({
   *     s3: () => mockS3Adapter,
   *   })
   *   .withAdapter('s3')
   *   .build();
   * ```
   *
   * @throws Does not throw directly. Factory validation occurs during `.build()`.
   *
   * @remarks
   * - Factories are called lazily during `.build()`, not during registration.
   * - Custom adapters must implement the `IgniterStorageAdapter` interface.
   * - Pre-registered factories (s3, google) will be merged with your custom ones.
   *
   * @see {@link withAdapter} for using the registered factory
   * @see IgniterStorageAdapter for the interface your custom adapter must implement
   */
  withAdapterFactories(
    factories: Partial<IgniterStorageAdapterFactoryMap>,
  ): IgniterStorageBuilder<TScopes> {
    return new IgniterStorageBuilder({
      ...this.state,
      adapterFactories: {
        ...this.state.adapterFactories,
        ...factories,
      },
    });
  }

  /**
   * Configures the storage to use a specific adapter instance.
   *
   * @param adapter - A fully initialized IgniterStorageAdapter.
   */
  withAdapter(adapter: IgniterStorageAdapter): IgniterStorageBuilder<TScopes>;

  /**
   * Configures the storage to use a known adapter by key and credentials.
   *
   * @param key - The adapter identifier ('s3' | 'google').
   * @param credentials - Provider-specific credentials.
   */
  withAdapter<K extends IgniterStorageAdapterKey>(
    key: K,
    credentials: IgniterStorageAdapterCredentialsMap[K],
  ): IgniterStorageBuilder<TScopes>;

  withAdapter(
    adapterOrKey: IgniterStorageAdapter | IgniterStorageAdapterKey,
    credentials?: IgniterStorageS3Credentials | IgniterStorageGoogleCredentials,
  ): IgniterStorageBuilder<TScopes> {
    if (adapterOrKey instanceof Object && "put" in adapterOrKey) {
      return new IgniterStorageBuilder({
        ...this.state,
        adapter: adapterOrKey as IgniterStorageAdapter,
        adapterKey: undefined,
        adapterCredentials: undefined,
      });
    }

    return new IgniterStorageBuilder({
      ...this.state,
      adapterKey: adapterOrKey as IgniterStorageAdapterKey,
      adapterCredentials: credentials as any,
    });
  }

  /**
   * Sets the public base URL (CDN) for file access.
   *
   * @param url - The absolute URL (e.g., 'https://cdn.myapp.com').
   */
  withUrl(url: string): IgniterStorageBuilder<TScopes> {
    return new IgniterStorageBuilder({
      ...this.state,
      baseUrl: url,
    });
  }

  /**
   * Sets a global base path prefix for all storage operations.
   *
   * Useful for separating environments (e.g., '/production', '/staging').
   *
   * @param basePath - The path prefix.
   */
  withPath(basePath: string): IgniterStorageBuilder<TScopes> {
    const normalized = basePath.replace(/^\/+|\/+$/g, "");
    return new IgniterStorageBuilder({
      ...this.state,
      basePath: normalized,
    });
  }

  /**
   * Injects a logger for observability.
   *
   * @param logger - An implementation of IgniterLogger.
   */
  withLogger(logger: IgniterLogger): IgniterStorageBuilder<TScopes> {
    return new IgniterStorageBuilder({
      ...this.state,
      logger,
    });
  }

  /**
   * Injects a telemetry manager for metrics and distributed tracing.
   *
   * @param telemetry - An implementation of IgniterTelemetryManager.
   */
  withTelemetry(
    telemetry: IgniterTelemetryManager,
  ): IgniterStorageBuilder<TScopes> {
    return new IgniterStorageBuilder({
      ...this.state,
      telemetry,
    });
  }

  /**
   * Sets the maximum allowed file size in bytes for all uploads.
   *
   * @param maxFileSize - Size in bytes (e.g., 5 * 1024 * 1024 for 5MB).
   */
  withMaxFileSize(maxFileSize: number): IgniterStorageBuilder<TScopes> {
    return new IgniterStorageBuilder({
      ...this.state,
      policies: {
        ...this.state.policies,
        maxFileSize,
      },
    });
  }

  /**
   * Restricts uploads to a set of allowed MIME types.
   *
   * @param allowedMimeTypes - Array of MIME types (e.g., ['image/png', 'application/pdf']).
   */
  withAllowedMimeTypes(
    allowedMimeTypes: readonly string[],
  ): IgniterStorageBuilder<TScopes> {
    return new IgniterStorageBuilder({
      ...this.state,
      policies: {
        ...this.state.policies,
        allowedMimeTypes,
      },
    });
  }

  /**
   * Restricts uploads to a set of allowed file extensions.
   *
   * @param allowedExtensions - Array of extensions without leading dot (e.g., ['jpg', 'png', 'pdf']).
   */
  withAllowedExtensions(
    allowedExtensions: readonly string[],
  ): IgniterStorageBuilder<TScopes> {
    return new IgniterStorageBuilder({
      ...this.state,
      policies: {
        ...this.state.policies,
        allowedExtensions,
      },
    });
  }

  // --- Hooks ---

  /**
   * Registers a hook to be called before an upload operation starts.
   *
   * This hook is triggered when an upload is initiated and allows you to perform
   * pre-processing tasks such as validation, logging, or analytics tracking.
   *
   * @param hook - A callback function invoked before the upload begins.
   * @returns A new builder instance with the hook registered, enabling method chaining.
   *
   * @example
   * ```typescript
   * builder.onUploadStarted((context) => {
   *   console.log(`Starting upload to scope: ${context.scope}`);
   * });
   * ```
   */
  onUploadStarted(hook: NonNullable<IgniterStorageHooks["onUploadStarted"]>) {
    return this.withHooks({ onUploadStarted: hook });
  }

  /**
   * Registers a hook to be called after a successful upload.
   *
   * This hook is triggered when an upload completes successfully and allows you to
   * perform post-processing tasks such as updating metadata, triggering events, or
   * notifying other services.
   *
   * @param hook - A callback function invoked after a successful upload.
   * @returns A new builder instance with the hook registered, enabling method chaining.
   *
   * @example
   * ```typescript
   * builder.onUploadSuccess((context) => {
   *   console.log(`File uploaded successfully: ${context.file.name}`);
   * });
   * ```
   */
  onUploadSuccess(hook: NonNullable<IgniterStorageHooks["onUploadSuccess"]>) {
    return this.withHooks({ onUploadSuccess: hook });
  }

  /**
   * Registers a hook to be called if an upload fails.
   *
   * This hook is triggered when an upload operation encounters an error and allows
   * you to handle failures gracefully, log errors, or initiate recovery procedures.
   *
   * @param hook - A callback function invoked when an upload fails.
   * @returns A new builder instance with the hook registered, enabling method chaining.
   *
   * @example
   * ```typescript
   * builder.onUploadError((context) => {
   *   console.error(`Upload failed: ${context.error.message}`);
   * });
   * ```
   */
  onUploadError(hook: NonNullable<IgniterStorageHooks["onUploadError"]>) {
    return this.withHooks({ onUploadError: hook });
  }

  /**
   * Registers a hook to be called before a file deletion starts.
   *
   * This hook is triggered when a deletion operation is initiated and allows you
   * to perform pre-deletion tasks such as validation, backup, or authorization checks.
   *
   * @param hook - A callback function invoked before deletion begins.
   * @returns A new builder instance with the hook registered, enabling method chaining.
   *
   * @example
   * ```typescript
   * builder.onDeleteStarted((context) => {
   *   console.log(`Starting deletion of file: ${context.path}`);
   * });
   * ```
   */
  onDeleteStarted(hook: NonNullable<IgniterStorageHooks["onDeleteStarted"]>) {
    return this.withHooks({ onDeleteStarted: hook });
  }

  /**
   * Registers a hook to be called after a successful deletion.
   *
   * This hook is triggered when a deletion completes successfully and allows you
   * to perform cleanup tasks, update records, or trigger downstream events.
   *
   * @param hook - A callback function invoked after successful deletion.
   * @returns A new builder instance with the hook registered, enabling method chaining.
   *
   * @example
   * ```typescript
   * builder.onDeleteSuccess((context) => {
   *   console.log(`File deleted successfully from: ${context.path}`);
   * });
   * ```
   */
  onDeleteSuccess(hook: NonNullable<IgniterStorageHooks["onDeleteSuccess"]>) {
    return this.withHooks({ onDeleteSuccess: hook });
  }

  /**
   * Registers a hook to be called if deletion fails.
   *
   * This hook is triggered when a deletion operation encounters an error and allows
   * you to handle failures, log errors, or implement retry logic.
   *
   * @param hook - A callback function invoked when deletion fails.
   * @returns A new builder instance with the hook registered, enabling method chaining.
   *
   * @example
   * ```typescript
   * builder.onDeleteError((context) => {
   *   console.error(`Deletion failed: ${context.error.message}`);
   * });
   * ```
   */
  onDeleteError(hook: NonNullable<IgniterStorageHooks["onDeleteError"]>) {
    return this.withHooks({ onDeleteError: hook });
  }

  /**
   * Registers a hook to be called before a copy operation starts.
   *
   * This hook is triggered when a copy operation is initiated and allows you to
   * perform pre-copy validation, logging, or resource allocation tasks.
   *
   * @param hook - A callback function invoked before the copy begins.
   * @returns A new builder instance with the hook registered, enabling method chaining.
   *
   * @example
   * ```typescript
   * builder.onCopyStarted((context) => {
   *   console.log(`Starting copy from ${context.sourcePath} to ${context.destPath}`);
   * });
   * ```
   */
  onCopyStarted(hook: NonNullable<IgniterStorageHooks["onCopyStarted"]>) {
    return this.withHooks({ onCopyStarted: hook });
  }

  /**
   * Registers a hook to be called after a successful copy.
   *
   * This hook is triggered when a copy operation completes successfully and allows
   * you to perform post-copy tasks such as verification or updating references.
   *
   * @param hook - A callback function invoked after a successful copy.
   * @returns A new builder instance with the hook registered, enabling method chaining.
   *
   * @example
   * ```typescript
   * builder.onCopySuccess((context) => {
   *   console.log(`File copied successfully to: ${context.destPath}`);
   * });
   * ```
   */
  onCopySuccess(hook: NonNullable<IgniterStorageHooks["onCopySuccess"]>) {
    return this.withHooks({ onCopySuccess: hook });
  }

  /**
   * Registers a hook to be called if a copy operation fails.
   *
   * This hook is triggered when a copy operation encounters an error and allows you
   * to handle failures, cleanup partial copies, or log issues.
   *
   * @param hook - A callback function invoked when a copy fails.
   * @returns A new builder instance with the hook registered, enabling method chaining.
   *
   * @example
   * ```typescript
   * builder.onCopyError((context) => {
   *   console.error(`Copy failed: ${context.error.message}`);
   * });
   * ```
   */
  onCopyError(hook: NonNullable<IgniterStorageHooks["onCopyError"]>) {
    return this.withHooks({ onCopyError: hook });
  }

  /**
   * Registers a hook to be called before a move operation starts.
   *
   * This hook is triggered when a move operation is initiated and allows you to
   * perform pre-move validation, logging, or resource allocation tasks.
   *
   * @param hook - A callback function invoked before the move begins.
   * @returns A new builder instance with the hook registered, enabling method chaining.
   *
   * @example
   * ```typescript
   * builder.onMoveStarted((context) => {
   *   console.log(`Starting move from ${context.sourcePath} to ${context.destPath}`);
   * });
   * ```
   */
  onMoveStarted(hook: NonNullable<IgniterStorageHooks["onMoveStarted"]>) {
    return this.withHooks({ onMoveStarted: hook });
  }

  /**
   * Registers a hook to be called after a successful move.
   *
   * This hook is triggered when a move operation completes successfully and allows
   * you to perform post-move tasks such as cleanup, reference updates, or notifications.
   *
   * @param hook - A callback function invoked after a successful move.
   * @returns A new builder instance with the hook registered, enabling method chaining.
   *
   * @example
   * ```typescript
   * builder.onMoveSuccess((context) => {
   *   console.log(`File moved successfully to: ${context.destPath}`);
   * });
   * ```
   */
  onMoveSuccess(hook: NonNullable<IgniterStorageHooks["onMoveSuccess"]>) {
    return this.withHooks({ onMoveSuccess: hook });
  }

  /**
   * Registers a hook to be called if a move operation fails.
   *
   * This hook is triggered when a move operation encounters an error and allows you
   * to handle failures, restore previous state, or log issues.
   *
   * @param hook - A callback function invoked when a move fails.
   * @returns A new builder instance with the hook registered, enabling method chaining.
   *
   * @example
   * ```typescript
   * builder.onMoveError((context) => {
   *   console.error(`Move failed: ${context.error.message}`);
   * });
   * ```
   */
  onMoveError(hook: NonNullable<IgniterStorageHooks["onMoveError"]>) {
    return this.withHooks({ onMoveError: hook });
  }

  /**
   * Internal helper method to merge hook registrations into the builder state.
   *
   * This method is used by all hook registration methods to ensure consistent
   * hook management and maintain the fluent builder pattern.
   *
   * @internal
   * @param next - A partial object containing hook callbacks to merge.
   * @returns A new builder instance with the hooks merged into its state.
   */
  private withHooks(
    next: Partial<IgniterStorageHooks>,
  ): IgniterStorageBuilder<TScopes> {
    return new IgniterStorageBuilder({
      ...this.state,
      hooks: {
        ...this.state.hooks,
        ...next,
      },
    });
  }

  /**
   * Adds a typed scope definition for organized, type-safe storage access.
   *
   * @param key - The scope key used in `.scope()`.
   * @param path - The path template. Use `[identifier]` for dynamic segments.
   * @returns A new builder instance with the scope added to its type definitions.
   *
   * @example
   * ```typescript
   * builder.addScope('user', '/users/[identifier]');
   * // Later: storage.scope('user', '123') -> /users/123/
   * ```
   */
  addScope<TKey extends string, TPath extends string>(key: TKey, path?: TPath): IgniterStorageBuilder<TScopes & { [K in TKey]: IgniterStorageScopeDefinition<TPath> }> {
    const resolvedPath = (path ?? `/${key}`);

    const requiresIdentifier = resolvedPath.includes(
      "[identifier]",
    ) as ContainsIdentifier<TPath>;

    return new IgniterStorageBuilder({
      ...(this.state as any),
      scopes: {
        ...this.state.scopes,
        [key]: {
          path: resolvedPath,
          requiresIdentifier,
        },
      },
    });
  }

  /**
   * Finalizes configuration and returns a production-ready IgniterStorageManager.
   *
   * This method validates that all required configurations (like baseUrl and adapter)
   * are present either in the builder state or the environment.
   *
   * @returns A fully initialized IgniterStorageManager.
   * @throws IgniterStorageError if critical configuration is missing.
   */
  build(): IgniterStorageManager<TScopes> {
    const env = IgniterStorageEnv.read();

    const baseUrl = this.state.baseUrl ?? env.url;
    if (!baseUrl) {
      throw new IgniterStorageError({
        code: "IGNITER_STORAGE_ADAPTER_NOT_CONFIGURED",
        operation: "upload",
        message:
          "Base URL is required. Provide it via .withUrl() or IGNITER_STORAGE_URL env var.",
      });
    }

    const basePath = this.state.basePath ?? env.basePath;

    // Debug log for policies merge issue
    // console.log('Builder State Policies:', this.state.policies);
    // console.log('Env Policies:', env.policies);

    const policies: IgniterStoragePolicies | undefined = {
      ...env.policies,
      ...this.state.policies,
    };

    // Clean up undefined values from policies to ensure they don't override defaults if any logic relies on keys missing
    // Although here we just merged.

    // Explicitly merge sub-properties to avoid full object overwrite if one is undefined?
    // No, spread works fine.

    // Ensure policies isn't just an object with undefined values if both are empty
    const hasPolicies = Object.values(policies).some((v) => v !== undefined);
    const finalPolicies = hasPolicies ? policies : undefined;

    const adapter = this.resolveAdapterFromStateOrEnv(env);

    this.state.logger?.info("Building IgniterStorageManager", {
      baseUrl,
      basePath,
      adapter: adapter.constructor.name,
      scopes: Object.keys(this.state.scopes),
    });

    return new IgniterStorageManager({
      adapter,
      baseUrl,
      basePath,
      logger: this.state.logger,
      telemetry: this.state.telemetry,
      hooks: this.state.hooks,
      policies: finalPolicies,
      scopes: this.state.scopes as TScopes,
    });
  }

  private resolveAdapterFromStateOrEnv(
    env: ReturnType<typeof IgniterStorageEnv.read>,
  ): IgniterStorageAdapter {
    if (this.state.adapter) {
      return this.state.adapter;
    }

    const key =
      this.state.adapterKey ??
      (env.adapter as IgniterStorageAdapterKey | undefined);

    if (!key) {
      throw new IgniterStorageError({
        code: "IGNITER_STORAGE_ADAPTER_NOT_CONFIGURED",
        operation: "upload",
        message:
          "Storage adapter is required. Provide it via .withAdapter() or IGNITER_STORAGE_ADAPTER env var.",
      });
    }

    const factory = this.state.adapterFactories?.[key];
    if (!factory) {
      throw new IgniterStorageError({
        code: "IGNITER_STORAGE_ADAPTER_NOT_CONFIGURED",
        operation: "upload",
        message: `Adapter factory for "${key}" not found. Ensure you imported the adapter correctly.`,
        data: { key },
      });
    }

    if (key === "s3") {
      const c =
        (this.state.adapterCredentials as
          | IgniterStorageS3Credentials
          | undefined) ??
        env.s3 ??
        {};
      return factory(c);
    }

    const c =
      (this.state.adapterCredentials as
        | IgniterStorageGoogleCredentials
        | undefined) ??
      env.google ??
      {};
    return factory(c);
  }
}

/**
 * Main entrypoint for the storage builder.
 *
 * @example
 * ```ts
 * const storage = IgniterStorage.create().withAdapter(adapter).withUrl(url).build()
 * ```
 */
export const IgniterStorage = {
  create: IgniterStorageBuilder.create
};
