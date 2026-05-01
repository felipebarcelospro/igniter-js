/**
 * @fileoverview Schema Registry for @igniter-js/collections
 * @module @igniter-js/collections/core/schema-registry
 *
 * @description
 * Loads collection definitions from JSON schema files at runtime.
 * Supports dynamic discovery of schema files and hook loading.
 * Optionally watches for changes and auto-refreshes.
 */
import type { IgniterLogger } from "@igniter-js/common";
import type { IgniterCollectionAdapter } from "../types/adapter";
import type {
  IgniterCollectionModelDefinition,
  IgniterCollectionModelHooks,
} from "../types/collection";
import type {
  IgniterCollectionRegistryConfig,
  IgniterCollectionSchemaFile,
  IgniterCollectionSchemaHooksConfig,
  IgniterCollectionLoadedSchema,
} from "../types/registry";
import type {
  IgniterCollectionViewDefinition,
  IgniterCollectionViewDataHook,
  IgniterCollectionViewActionHandler,
} from "../types/view";
import { IgniterCollectionId } from "../utils/id";
import { IgniterCollectionPath } from "../utils/path";
import { StdSchema } from "../utils/schema";

/**
 * Callback type for schema change notifications.
 */
export type IgniterCollectionSchemaChangeCallback = (
  event: "added" | "updated" | "removed",
  collectionName: string
) => void;

/**
 * Schema Registry for dynamically loading collection definitions from JSON files.
 *
 * The registry discovers schema files in a specified directory and converts
 * them into collection definitions that can be used by the IgniterCollectionManager.
 *
 * @example
 * ```typescript
 * const registry = new IgniterCollectionSchemaRegistry({
 *   registryPath: '.fractal/schemas',
 *   basePath: process.cwd(),
 *   adapter: new NodeFsAdapter(),
 * });
 *
 * // Load all schemas
 * const collections = await registry.loadSchemas();
 *
 * // Get a specific collection
 * const postsCollection = registry.getCollection('posts');
 *
 * // Refresh schemas (reload from disk)
 * await registry.refresh();
 *
 * // Start watching for changes
 * registry.startWatching((event, collectionName) => {
 *   console.log(`Schema ${event}: ${collectionName}`);
 * });
 *
 * // Stop watching
 * registry.stopWatching();
 * ```
 */
export class IgniterCollectionSchemaRegistry {
  private readonly config: IgniterCollectionRegistryConfig;
  private readonly adapter: IgniterCollectionAdapter;
  private readonly logger?: IgniterLogger;
  private readonly cache: Map<string, IgniterCollectionModelDefinition<Record<string, any>>> =
    new Map();
  private readonly loadedSchemas: Map<string, IgniterCollectionLoadedSchema> = new Map();

  /** Cleanup function for active watcher */
  private unwatcher?: () => void;
  /** Debounce timer for rapid file changes */
  private debounceTimer?: ReturnType<typeof setTimeout>;
  /** Debounce delay in milliseconds */
  private readonly debounceDelay = 100;
  /** Flag to track if currently refreshing */
  private isRefreshing = false;

  /**
   * Create a new Schema Registry instance.
   *
   * @param config - Registry configuration
   * @param adapter - Filesystem adapter for reading schema files
   * @param logger - Optional logger instance
   */
  constructor(
    config: IgniterCollectionRegistryConfig,
    adapter: IgniterCollectionAdapter,
    logger?: IgniterLogger
  ) {
    this.config = {
      filePattern: "*.schema.json",
      watch: false,
      ...config,
    };
    this.adapter = adapter;
    this.logger = logger;
  }

  /**
   * Load all schema files from the registry path(s).
   *
   * Discovers JSON schema files, parses them, and converts them
   * to collection definitions.
   *
   * @returns Map of collection names to definitions
   */
  async loadSchemas(): Promise<Map<string, IgniterCollectionModelDefinition<Record<string, any>>>> {
    const registryPaths = Array.isArray(this.config.registryPath)
      ? this.config.registryPath
      : [this.config.registryPath];

    const allResolvedPaths: string[] = [];
    for (const rawPath of registryPaths) {
      const expanded = await this.expandGlob(rawPath);
      allResolvedPaths.push(...expanded);
    }

    // Track which file provided which collection name to detect conflicts
    const nameToPath = new Map<string, string>();

    // Parse each schema file from all resolved paths
    for (const registryPath of allResolvedPaths) {
      // Check if registry path exists
      if (!(await this.adapter.exists(registryPath))) {
        this.logger?.debug(`Schema registry path does not exist: ${registryPath}`);
        continue;
      }

      // List schema files
      const pattern = this.config.filePattern ?? "*.schema.json";
      const files = await this.adapter.list(registryPath, pattern);

      this.logger?.debug(`Found ${files.length} schema files in ${registryPath}`);

      for (const filePath of files) {
        try {
          const loadedSchema = await this.loadSchemaFile(filePath);
          if (loadedSchema.success) {
            const definition = await this.schemaToDefinition(
              loadedSchema.schema,
              filePath
            );

            let collectionName = definition.name;

            // Conflict Resolution Logic
            if (nameToPath.has(collectionName)) {
              const prefix = this.calculatePrefix(filePath);
              collectionName = `${prefix}:${collectionName}`;
              definition.name = collectionName;
              this.logger?.debug(
                `Conflict detected for ${loadedSchema.schema.collectionName}. Renamed to ${collectionName}`
              );
            }

            this.cache.set(collectionName, definition);
            this.loadedSchemas.set(filePath, loadedSchema);
            nameToPath.set(collectionName, filePath);

            this.logger?.debug(`Loaded schema: ${definition.name} from ${filePath}`);
          } else {
            this.logger?.warn(`Failed to load schema: ${filePath} - ${loadedSchema.error}`);
          }
        } catch (error) {
          this.logger?.error(`Error loading schema file: ${filePath}`, { error });
        }
      }
    }

    return this.cache;
  }

  /**
   * Refresh all schemas from disk.
   *
   * Clears the cache and reloads all schema files.
   *
   * @returns Map of collection names to definitions
   */
  async refresh(): Promise<Map<string, IgniterCollectionModelDefinition<Record<string, any>>>> {
    this.cache.clear();
    this.loadedSchemas.clear();
    return this.loadSchemas();
  }

  /**
   * Get a collection definition by name.
   *
   * @param name - Collection name
   * @returns Collection definition or undefined if not found
   */
  getCollection(name: string): IgniterCollectionModelDefinition<Record<string, any>> | undefined {
    return this.cache.get(name);
  }

  /**
   * Get all loaded collection definitions.
   *
   * @returns Map of collection names to definitions
   */
  getCollections(): Map<string, IgniterCollectionModelDefinition<Record<string, any>>> {
    return new Map(this.cache);
  }

  /**
   * Check if a collection exists in the registry.
   *
   * @param name - Collection name
   * @returns True if collection exists
   */
  hasCollection(name: string): boolean {
    return this.cache.has(name);
  }

  /**
   * Get all loaded schema metadata.
   *
   * @returns Map of file paths to loaded schema info
   */
  getLoadedSchemas(): Map<string, IgniterCollectionLoadedSchema> {
    return new Map(this.loadedSchemas);
  }

  /**
   * Check if the registry is currently watching for changes.
   *
   * @returns True if watching is active
   */
  isWatching(): boolean {
    return this.unwatcher !== undefined;
  }

  /**
   * Start watching the schema registry path(s) for file changes.
   *
   * When schema files are added, modified, or deleted, the registry
   * automatically refreshes and invokes the optional callback.
   *
   * Changes are debounced to prevent excessive reloads from rapid
   * file system events (e.g., editor auto-save).
   *
   * @param onSchemaChange - Optional callback invoked when schemas change
   * @returns True if watching started successfully, false otherwise
   *
   * @example
   * ```typescript
   * registry.startWatching((event, collectionName) => {
   *   console.log(`Schema ${event}: ${collectionName}`);
   *   // Optionally reload collection managers
   * });
   * ```
   */
  startWatching(onSchemaChange?: IgniterCollectionSchemaChangeCallback): boolean {
    // Check if already watching
    if (this.unwatcher) {
      this.logger?.debug("Schema watching already active");
      return true;
    }

    // Check if adapter supports watching
    if (!this.adapter.watch) {
      this.logger?.warn(
        "Adapter does not support watching. Auto-refresh disabled."
      );
      return false;
    }

    const registryPaths = Array.isArray(this.config.registryPath)
      ? this.config.registryPath
      : [this.config.registryPath];

    const unwatchers: Array<() => void> = [];

    const pattern = this.config.filePattern ?? "*.schema.json";

    // Watch each path. For globs, we watch the base directory.
    const pathsToWatch = new Set<string>();
    for (const p of registryPaths) {
      const baseDir = p.includes("*") ? p.split("*")[0] : p;
      pathsToWatch.add(IgniterCollectionPath.resolve(this.config.basePath, baseDir));
    }

    for (const watchPath of pathsToWatch) {
      this.logger?.debug(`Starting schema watching on: ${watchPath}`);

      const unwatcher = this.adapter.watch(watchPath, (event, filePath) => {
        // Only process schema files
        const filename = filePath.split("/").pop() ?? "";
        if (!this.matchesPattern(filename, pattern)) {
          return;
        }

        this.logger?.debug(`Schema file ${event}: ${filePath}`);

        // Debounce rapid changes
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(async () => {
          // Avoid concurrent refreshes
          if (this.isRefreshing) {
            return;
          }

          this.isRefreshing = true;

          try {
            // Store collections before refresh for comparison
            const beforeRefresh = new Set(this.cache.keys());

            await this.refresh();

            // Determine what changed
            const afterRefresh = new Set(this.cache.keys());

            if (onSchemaChange) {
              // Find added collections
              for (const name of afterRefresh) {
                if (!beforeRefresh.has(name)) {
                  onSchemaChange("added", name);
                }
              }

              // Find removed collections
              for (const name of beforeRefresh) {
                if (!afterRefresh.has(name)) {
                  onSchemaChange("removed", name);
                }
              }

              // Find updated collections (existed before and after)
              for (const name of afterRefresh) {
                if (beforeRefresh.has(name)) {
                  onSchemaChange("updated", name);
                }
              }
            }

            this.logger?.info(`Schema registry refreshed: ${afterRefresh.size} collections`);
          } catch (error) {
            this.logger?.error("Failed to refresh schemas on change", { error });
          } finally {
            this.isRefreshing = false;
          }
        }, this.debounceDelay);
      });

      unwatchers.push(unwatcher);
    }

    this.unwatcher = () => {
      for (const uw of unwatchers) uw();
    };

    return true;
  }

  /**
   * Stop watching for schema file changes.
   *
   * Cleans up the file watcher and any pending debounce timers.
   *
   * @example
   * ```typescript
   * registry.stopWatching();
   * ```
   */
  stopWatching(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    if (this.unwatcher) {
      this.unwatcher();
      this.unwatcher = undefined;
      this.logger?.debug("Stopped schema watching");
    }
  }

  /**
   * Check if a filename matches the schema file pattern.
   */
  private matchesPattern(filename: string, pattern: string): boolean {
    const regex = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    return new RegExp(`^${regex}$`).test(filename);
  }

  /**
   * Expand glob patterns in registry paths.
   * Currently supports simple * wildcard in directory names.
   */
  private async expandGlob(pattern: string): Promise<string[]> {
    if (!pattern.includes("*")) {
      return [IgniterCollectionPath.resolve(this.config.basePath, pattern)];
    }

    const parts = pattern.split("/");
    let currentPaths = [this.config.basePath];

    for (const part of parts) {
      if (!part) continue;

      const nextPaths: string[] = [];
      for (const currentPath of currentPaths) {
        if (part.includes("*")) {
          // Use adapter to list matching directories
          const dirs = await this.adapter.list(currentPath, part, {
            type: "directory",
          });
          nextPaths.push(...dirs);
        } else {
          const nextPath = IgniterCollectionPath.join(currentPath, part);
          if (await this.adapter.exists(nextPath)) {
            nextPaths.push(nextPath);
          }
        }
      }
      currentPaths = nextPaths;

      if (currentPaths.length === 0) break;
    }

    return currentPaths;
  }

  /**
   * Calculate collection prefix based on file path.
   * Prefix is the name of the directory containing 'schemas'.
   */
  private calculatePrefix(filePath: string): string {
    const parts = filePath.split("/");
    const schemasIdx = parts.lastIndexOf("schemas");
    if (schemasIdx > 0) {
      // Find the first non-generic directory name before 'schemas'
      for (let i = schemasIdx - 1; i >= 0; i--) {
        const part = parts[i];
        if (part && part !== "." && part !== ".." && part !== "plugins" && part !== "addons" && part !== "fractal" && part !== "base") {
          return part;
        }
      }
      return parts[schemasIdx - 1];
    }
    // Fallback: use parent directory name
    const parentDir = parts[parts.length - 2];
    if (parentDir === "schemas" && parts.length > 2) {
      return parts[parts.length - 3];
    }
    return parentDir ?? "unknown";
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Load and parse a single schema file.
   */
  private async loadSchemaFile(filePath: string): Promise<IgniterCollectionLoadedSchema> {
    try {
      const content = await this.adapter.read(filePath);

      if (content === null) {
        return {
          filePath,
          schema: {} as IgniterCollectionSchemaFile,
          success: false,
          error: "File not found",
        };
      }

      const parsed = JSON.parse(content) as IgniterCollectionSchemaFile;

      // Validate required fields
      if (!parsed.collectionName) {
        return {
          filePath,
          schema: parsed,
          success: false,
          error: "Missing required field: collectionName",
        };
      }

      return {
        filePath,
        schema: parsed,
        success: true,
      };
    } catch (error) {
      return {
        filePath,
        schema: {} as IgniterCollectionSchemaFile,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Convert a schema file to a collection definition.
   */
  private async schemaToDefinition(
    schemaFile: IgniterCollectionSchemaFile,
    filePath: string
  ): Promise<IgniterCollectionModelDefinition<Record<string, any>>> {
    const schema = schemaFile.schema
      ? await StdSchema.getStandardSchema(schemaFile.schema)
      : undefined;

    // Load hooks if specified
    const hooks = schemaFile.hooks
      ? await this.loadHooks(schemaFile.hooks, filePath)
      : {};

    // Load views if specified
    const views = schemaFile.views
      ? await this.loadViews(schemaFile.views, filePath)
      : undefined;

    // Support legacy basePath/filePattern if patterns not provided
    let patterns = schemaFile.patterns;
    if (!patterns) {
      patterns = ["{id}.mdx"];
    }

    return {
      name: schemaFile.collectionName,
      patterns,
      template: schemaFile.template,
      defaultIdGenerator: () => IgniterCollectionId.uuid(),
      schema: schema,
      hooks: hooks as IgniterCollectionModelHooks<Record<string, any>>,
      subCollections: new Map(),
      views,
    };
  }

  /**
   * Load hook functions from specified file paths.
   */
  private async loadHooks(
    hooksConfig: IgniterCollectionSchemaHooksConfig,
    schemaFilePath: string
  ): Promise<IgniterCollectionModelHooks<unknown>> {
    const hooks: IgniterCollectionModelHooks<unknown> = {};
    const schemaDir = IgniterCollectionPath.dirname(schemaFilePath);

    for (const [hookName, hookPath] of Object.entries(hooksConfig)) {
      if (!hookPath) continue;

      try {
        // Resolve hook file path relative to schema file
        const absolutePath = IgniterCollectionPath.resolve(
          this.config.basePath,
          schemaDir,
          hookPath
        );

        // Try to dynamically import the hook module
        // Note: This requires the hook file to be a valid module
        const hookModule = await this.loadHookModule(absolutePath, hookName);
        if (hookModule) {
          (hooks as Record<string, unknown>)[hookName] = hookModule;
        }
      } catch (error) {
        this.logger?.warn(`Failed to load hook ${hookName} from ${hookPath}`, { error });
      }
    }

    return hooks;
  }

  /**
   * Load view definitions from a schema file, resolving hook and handler paths.
   */
  private async loadViews(
    views: IgniterCollectionViewDefinition[],
    schemaFilePath: string
  ): Promise<IgniterCollectionViewDefinition[]> {
    const schemaDir = IgniterCollectionPath.dirname(schemaFilePath);
    const processedViews: IgniterCollectionViewDefinition[] = [];

    for (const view of views) {
      const processedView = { ...view };

      // Resolve getData hook if it's a string path
      if (typeof view.getData === "string") {
        const absolutePath = IgniterCollectionPath.resolve(
          this.config.basePath,
          schemaDir,
          view.getData
        );

        // Try to dynamically load the hook module
        const hookModule = (await this.loadHookModule(
          absolutePath,
          view.name
        )) as IgniterCollectionViewDataHook | undefined;

        if (hookModule) {
          processedView.getData = hookModule;
        } else {
          // If loading fails, keep it as absolute path string for ViewManager to handle
          processedView.getData = absolutePath;
        }
      }

      // Resolve action handlers if they are string paths
      if (view.actions) {
        processedView.actions = { ...view.actions };
        for (const [actionId, action] of Object.entries(view.actions)) {
          if (typeof action.handler === "string") {
            const absolutePath = IgniterCollectionPath.resolve(
              this.config.basePath,
              schemaDir,
              action.handler
            );

            // Try to dynamically load the action handler
            const handlerModule = (await this.loadHookModule(
              absolutePath,
              actionId
            )) as IgniterCollectionViewActionHandler | undefined;

            if (handlerModule) {
              processedView.actions[actionId] = {
                ...action,
                handler: handlerModule,
              };
            } else {
              // Keep as absolute path string
              processedView.actions[actionId] = {
                ...action,
                handler: absolutePath,
              };
            }
          }
        }
      }

      processedViews.push(processedView);
    }

    return processedViews;
  }

  /**
   * Load a hook module from a file path.
   *
   * Attempts to dynamically import the module and extract the hook function.
   * The hook file should export a function with the same name as the hook.
   */
  private async loadHookModule(
    absolutePath: string,
    hookName: string
  ): Promise<((...args: unknown[]) => unknown) | undefined> {
    try {
      // Dynamic import - works with both ESM and CJS
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const module = await import(absolutePath);

      // Look for named export matching hook name
      if (typeof module[hookName] === "function") {
        return module[hookName] as (...args: unknown[]) => unknown;
      }

      // Look for default export
      if (typeof module.default === "function") {
        return module.default as (...args: unknown[]) => unknown;
      }

      // Look for default export as object with hook name
      if (module.default && typeof module.default[hookName] === "function") {
        return module.default[hookName] as (...args: unknown[]) => unknown;
      }

      this.logger?.warn(
        `Hook module ${absolutePath} does not export a function named ${hookName}`
      );
      return undefined;
    } catch (error) {
      // If dynamic import fails, the hook won't be loaded
      // This is expected in some environments (browser, restricted sandboxes)
      this.logger?.debug(`Could not load hook module: ${absolutePath}`, { error });
      return undefined;
    }
  }
}
