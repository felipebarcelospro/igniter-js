/**
 * @fileoverview View Registry for @igniter-js/collections
 * @module @igniter-js/collections/core/view-registry
 *
 * @description
 * Loads view definitions from JSON and TypeScript files at runtime.
 * Supports dynamic discovery of view files and optional file watching.
 */

import type { IgniterLogger } from "@igniter-js/common";
import type { IgniterCollectionAdapter } from "../types/adapter";
import type {
  IgniterCollectionViewRegistryConfig,
} from "../types/registry";
import type {
  IgniterCollectionViewDefinition,
} from "../types/view";
import { IgniterCollectionPath } from "../utils/path";
import { IgniterCollectionLoader } from "../utils/loader";

/**
 * Callback type for view change notifications.
 */
export type IgniterCollectionViewChangeCallback = (
  event: "added" | "updated" | "removed",
  viewName: string
) => void;

/**
 * View Registry for dynamically loading view definitions from files.
 *
 * The registry discovers view files in a specified directory and converts
 * them into view definitions that can be used by the IgniterCollectionManager.
 *
 * @example
 * ```typescript
 * const registry = new IgniterCollectionViewRegistry({
 *   registryPath: '.fractal/views',
 *   basePath: process.cwd(),
 * }, adapter);
 *
 * // Load all views
 * const views = await registry.loadViews();
 *
 * // Get a specific view
 * const dashboardView = registry.getView('dashboard');
 *
 * // Refresh views (reload from disk)
 * await registry.refresh();
 *
 * // Start watching for changes
 * registry.startWatching((event, viewName) => {
 *   console.log(`View ${event}: ${viewName}`);
 * });
 *
 * // Stop watching
 * registry.stopWatching();
 * ```
 */
export class IgniterCollectionViewRegistry {
  private readonly config: IgniterCollectionViewRegistryConfig;
  private readonly adapter: IgniterCollectionAdapter;
  private readonly logger?: IgniterLogger;
  private readonly loader: IgniterCollectionLoader;
  private readonly cache: Map<string, IgniterCollectionViewDefinition> =
    new Map();

  /** Cleanup function for active watcher */
  private unwatcher?: () => void;
  /** Debounce timer for rapid file changes */
  private debounceTimer?: ReturnType<typeof setTimeout>;
  /** Debounce delay in milliseconds */
  private readonly debounceDelay = 100;
  /** Flag to track if currently refreshing */
  private isRefreshing = false;

  /**
   * Create a new View Registry instance.
   *
   * @param config - Registry configuration
   * @param adapter - Filesystem adapter for reading view files
   * @param logger - Optional logger instance
   */
  constructor(
    config: IgniterCollectionViewRegistryConfig,
    adapter: IgniterCollectionAdapter,
    logger?: IgniterLogger
  ) {
    this.config = {
      filePattern: "*.view.{json,ts}",
      watch: false,
      ...config,
    };
    this.adapter = adapter;
    this.logger = logger;
    this.loader = new IgniterCollectionLoader(adapter);
  }

  /**
   * Load all view files from the registry path(s).
   *
   * Discovers view files, parses them, and converts them
   * to view definitions.
   *
   * @returns Map of view names to definitions
   */
  async loadViews(): Promise<Map<string, IgniterCollectionViewDefinition>> {
    const registryPaths = Array.isArray(this.config.registryPath)
      ? this.config.registryPath
      : [this.config.registryPath];

    const allResolvedPaths: string[] = [];
    for (const rawPath of registryPaths) {
      const expanded = await this.expandGlob(rawPath);
      allResolvedPaths.push(...expanded);
    }

    // First pass: collect all view definitions
    const rawViews: Array<{ definition: IgniterCollectionViewDefinition; filePath: string }> = [];

    for (const registryPath of allResolvedPaths) {
      if (!(await this.adapter.exists(registryPath))) {
        this.logger?.debug(`View registry path does not exist: ${registryPath}`);
        continue;
      }

      const pattern = this.config.filePattern ?? "*.view.{json,ts}";
      const files = await this.adapter.list(registryPath, pattern);

      this.logger?.debug(`Found ${files.length} view files in ${registryPath}`);

      for (const filePath of files) {
        try {
          const definition = await this.loadViewFile(filePath);
          if (definition) {
            rawViews.push({ definition, filePath });
          }
        } catch (error) {
          this.logger?.error(`Error loading view file: ${filePath}`, { error });
        }
      }
    }

    // Count original names to detect conflicts
    const nameCounts = new Map<string, number>();
    for (const { definition } of rawViews) {
      nameCounts.set(definition.name, (nameCounts.get(definition.name) ?? 0) + 1);
    }

    // Second pass: resolve conflicts by prefixing all duplicates
    for (const { definition, filePath } of rawViews) {
      let viewName = definition.name;

      if ((nameCounts.get(viewName) ?? 0) > 1) {
        const prefix = this.calculatePrefix(filePath);
        viewName = `${prefix}:${viewName}`;
        definition.name = viewName;
        this.logger?.debug(
          `Conflict detected for view ${definition.name}. Renamed to ${viewName}`
        );
      }

      this.cache.set(viewName, definition);
      this.logger?.debug(`Loaded view: ${viewName} from ${filePath}`);
    }

    return this.cache;
  }

  /**
   * Refresh all views from disk.
   *
   * Clears the cache and reloads all view files.
   *
   * @returns Map of view names to definitions
   */
  async refresh(): Promise<Map<string, IgniterCollectionViewDefinition>> {
    this.cache.clear();
    return this.loadViews();
  }

  /**
   * Get a view definition by name.
   *
   * @param name - View name
   * @returns View definition or undefined if not found
   */
  getView(name: string): IgniterCollectionViewDefinition | undefined {
    return this.cache.get(name);
  }

  /**
   * Get all loaded view definitions.
   *
   * @returns Map of view names to definitions
   */
  getViews(): Map<string, IgniterCollectionViewDefinition> {
    return new Map(this.cache);
  }

  /**
   * Check if a view exists in the registry.
   *
   * @param name - View name
   * @returns True if view exists
   */
  hasView(name: string): boolean {
    return this.cache.has(name);
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
   * Start watching the view registry path(s) for file changes.
   *
   * When view files are added, modified, or deleted, the registry
   * automatically refreshes and invokes the optional callback.
   *
   * Changes are debounced to prevent excessive reloads from rapid
   * file system events (e.g., editor auto-save).
   *
   * @param onViewChange - Optional callback invoked when views change
   * @returns True if watching started successfully, false otherwise
   */
  startWatching(onViewChange?: IgniterCollectionViewChangeCallback): boolean {
    if (this.unwatcher) {
      this.logger?.debug("View watching already active");
      return true;
    }

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
    const pattern = this.config.filePattern ?? "*.view.{json,ts}";

    const pathsToWatch = new Set<string>();
    for (const p of registryPaths) {
      const baseDir = p.includes("*") ? p.split("*")[0] : p;
      pathsToWatch.add(IgniterCollectionPath.resolve(this.config.basePath, baseDir));
    }

    for (const watchPath of pathsToWatch) {
      this.logger?.debug(`Starting view watching on: ${watchPath}`);

      const unwatcher = this.adapter.watch(watchPath, (event, filePath) => {
        const filename = filePath.split("/").pop() ?? "";
        if (!this.matchesPattern(filename, pattern)) {
          return;
        }

        this.logger?.debug(`View file ${event}: ${filePath}`);

        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(async () => {
          if (this.isRefreshing) {
            return;
          }

          this.isRefreshing = true;

          try {
            const beforeRefresh = new Set(this.cache.keys());
            await this.refresh();
            const afterRefresh = new Set(this.cache.keys());

            if (onViewChange) {
              for (const name of afterRefresh) {
                if (!beforeRefresh.has(name)) {
                  onViewChange("added", name);
                }
              }

              for (const name of beforeRefresh) {
                if (!afterRefresh.has(name)) {
                  onViewChange("removed", name);
                }
              }

              for (const name of afterRefresh) {
                if (beforeRefresh.has(name)) {
                  onViewChange("updated", name);
                }
              }
            }

            this.logger?.info(`View registry refreshed: ${afterRefresh.size} views`);
          } catch (error) {
            this.logger?.error("Failed to refresh views on change", { error });
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
   * Stop watching for view file changes.
   */
  stopWatching(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    if (this.unwatcher) {
      this.unwatcher();
      this.unwatcher = undefined;
      this.logger?.debug("Stopped view watching");
    }
  }

  /**
   * Check if a filename matches the view file pattern.
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
   * Calculate view prefix based on file path.
   */
  private calculatePrefix(filePath: string): string {
    const parts = filePath.split("/");
    const parentDir = parts[parts.length - 2];
    return parentDir ?? "unknown";
  }

  /**
   * Load and parse a single view file.
   */
  private async loadViewFile(
    filePath: string
  ): Promise<IgniterCollectionViewDefinition | null> {
    try {
      const data = await this.loader.load(filePath);

      if (!data || typeof data !== "object") {
        this.logger?.warn(`Invalid view file: ${filePath}`);
        return null;
      }

      const definition = data as IgniterCollectionViewDefinition;

      if (!definition.name) {
        this.logger?.warn(`View file missing name: ${filePath}`);
        return null;
      }

      // Resolve file paths in getData and actions
      if (typeof definition.getData === "string") {
        definition.getData = IgniterCollectionPath.resolve(
          this.config.basePath,
          definition.getData
        );
      }

      if (definition.actions) {
        for (const [actionId, action] of Object.entries(definition.actions)) {
          if (typeof action.handler === "string") {
            definition.actions[actionId] = {
              ...action,
              handler: IgniterCollectionPath.resolve(
                this.config.basePath,
                action.handler
              ),
            };
          }
        }
      }

      return definition;
    } catch (error) {
      this.logger?.error(`Error loading view file: ${filePath}`, { error });
      return null;
    }
  }
}
