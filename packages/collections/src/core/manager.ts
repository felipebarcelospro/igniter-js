/**
 * @fileoverview Main manager for @igniter-js/collections
 * @module @igniter-js/collections/core/manager
 *
 * @description
 * The main manager class provides dynamic access to collection managers
 * via Proxy, enabling `docs.posts.create()` style API.
 */

import type { IgniterLogger } from "@igniter-js/common";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import type { IgniterCollectionAdapter } from "../types/adapter";
import type {
  IgniterCollectionModelDefinition,
  IgniterCollectionModelHooks,
} from "../types/collection";
import type {
  IgniterCollectionEventHandler,
  IgniterCollectionEvents,
} from "../types/events";
import type {
  IIgniterCollectionsManager,
  IIgniterCollectionModel,
  IIgniterCollectionsManagerMethods,
} from "../types/manager";
import type { IgniterCollectionWatcherConfig } from "../types/builder";
import type { IgniterCollectionViewDefinition } from "../types/view";
import { IgniterCollectionModelManager } from "./model";
import { IgniterCollectionEventEmitter } from "./event-emitter";
import { IgniterCollectionSchemaRegistry } from "./schema-registry";
import { IgniterCollectionViewRegistry } from "./view-registry";
import { IgniterCollectionViewManager } from "./view-manager";
import { StdSchema } from "../utils/schema";
import type { StandardJSONSchemaV1 } from "@standard-schema/spec";
import { IGNITER_COLLECTION_ERROR_CODES, IgniterCollectionError } from "../errors";
import type { IgniterCollectionTelemetryEventsType } from "src/telemetry";

/**
 * Configuration for the main manager.
 */
interface ManagerConfig<TCollections> {
  basePath: string;
  adapter: IgniterCollectionAdapter;
  collections: TCollections;
  watcherConfig?: IgniterCollectionWatcherConfig;
  views?: IgniterCollectionViewDefinition[];
  telemetry?: IgniterTelemetryManager<IgniterCollectionTelemetryEventsType>;
  logger?: IgniterLogger;
  globalHooks?: IgniterCollectionModelHooks<any>;
}

/**
 * Main IgniterCollection manager with dynamic collection access.
 *
 * Uses a Proxy to enable `docs.posts.create()` style API where
 * `posts` is dynamically resolved to its collection manager.
 *
 * @typeParam TCollections - Map of registered collection definitions
 *
 * @example
 * ```typescript
 * const docs = IgniterCollections.create()
 *   .withAdapter(adapter)
 *   .addCollection(Posts)
 *   .addCollection(Pages)
 *   .build();
 *
 * // Dynamic collection access
 * await docs.posts.create({ data: { title: 'Hello' } });
 * await docs.pages.findMany();
 *
 * // Explicit collection access
 * await docs.collection('posts').findUnique({ where: { id: 'abc' } });
 *
 * // Global events
 * docs.on('created', ({ collection, value }) => {
 *   console.log(`Document created in ${collection}: ${value.id}`);
 * });
 *
 * // Scoped events
 * docs.on('posts:updated', ({ newValue }) => {
 *   console.log(`Post updated: ${newValue.id}`);
 * });
 * ```
 */
export class IgniterCollectionManager<
  TCollections extends Record<
    string,
    IgniterCollectionModelDefinition<any>
  > = Record<string, IgniterCollectionModelDefinition<any>>,
> implements IIgniterCollectionsManagerMethods<TCollections> {
  private readonly config: ManagerConfig<TCollections>;
  private readonly collectionManagers: Map<string, IIgniterCollectionModel<any>> =
    new Map();
  private readonly events = new IgniterCollectionEventEmitter<IgniterCollectionEvents<TCollections>>();
  private schemaRegistry?: IgniterCollectionSchemaRegistry;
  private viewRegistry?: IgniterCollectionViewRegistry;
  private viewManager: IgniterCollectionViewManager;
  private proxyInstance: IIgniterCollectionsManager<TCollections>;

  constructor(config: ManagerConfig<TCollections>) {
    this.config = config;

    // Create proxy first (before initializing collections that need manager reference)
    this.proxyInstance = new Proxy(this, {
      get(target, prop: string) {
        // Known methods
        if (
          prop === "collection" ||
          prop === "definitions" ||
          prop === "refresh" ||
          prop === "getSchemaRegistry" ||
          prop === "getViewRegistry" ||
          prop === "startWatching" ||
          prop === "stopWatching" ||
          prop === "isWatching" ||
          prop === "dispose" ||
          prop === "on" ||
          prop === "off" ||
          prop === "once" ||
          prop === "emit" ||
          prop === "views"
        ) {
          return target[prop as keyof typeof target];
        }

        // Check if it's a collection name
        if (target.collectionManagers.has(prop)) {
          return target.collectionManagers.get(prop);
        }

        // Default property access
        return target[prop as keyof typeof target];
      },
    }) as any as IIgniterCollectionsManager<TCollections>;

    // Initialize collection managers (they need the proxy as manager reference)
    this.initializeCollections();

    // Initialize view manager with programmatic views
    this.viewManager = new IgniterCollectionViewManager({
      views: config.views || [],
      manager: this.proxyInstance as any,
      logger: config.logger,
    });

    // Initialize watcher if configured
    if (config.watcherConfig) {
      this.initializeWatcher(config.watcherConfig);

      // Auto-start watching if configured
      if (config.watcherConfig.autoWatch) {
        this.startWatching();
      }
    }

    // Return proxy for dynamic access
    return this.proxyInstance as any;
  }

  /**
   * Initialize collection managers from config.
   */
  private initializeCollections(): void {
    for (const [name, definition] of Object.entries(this.config.collections)) {
      const manager = new IgniterCollectionModelManager({
        definition: definition as IgniterCollectionModelDefinition<any>,
        adapter: this.config.adapter,
        basePath: this.config.basePath,
        manager: this.proxyInstance as any as IIgniterCollectionsManager,
        telemetry: this.config.telemetry,
        logger: this.config.logger,
        globalHooks: this.config.globalHooks,
      });
      this.collectionManagers.set(name, manager);
    }
  }

  /**
   * Initialize the watcher (schema registry + view registry).
   */
  private initializeWatcher(config: IgniterCollectionWatcherConfig): void {
    const paths = Array.isArray(config.paths) ? config.paths : [config.paths];

    // Initialize schema registry
    const schemaRegistryConfig = {
      registryPath: paths,
      basePath: this.config.basePath,
      filePattern: config.collections ?? "*.schema.{json,ts}",
    };
    this.schemaRegistry = new IgniterCollectionSchemaRegistry(
      schemaRegistryConfig,
      this.config.adapter,
      this.config.logger
    );

    // Initialize view registry
    const viewRegistryConfig = {
      registryPath: paths,
      basePath: this.config.basePath,
      filePattern: config.views ?? "*.view.{json,ts}",
    };
    this.viewRegistry = new IgniterCollectionViewRegistry(
      viewRegistryConfig,
      this.config.adapter,
      this.config.logger
    );
  }

  /**
   * Add a collection manager dynamically.
   *
   * Used internally when schemas are refreshed.
   */
  private addCollectionManager(
    name: string,
    definition: IgniterCollectionModelDefinition<any>
  ): void {
    if (!this.collectionManagers.has(name)) {
      const manager = new IgniterCollectionModelManager({
        definition,
        adapter: this.config.adapter,
        basePath: this.config.basePath,
        manager: this.proxyInstance as any as IIgniterCollectionsManager,
        telemetry: this.config.telemetry,
        logger: this.config.logger,
        globalHooks: this.config.globalHooks,
      });
      this.collectionManagers.set(name, manager);
      this.config.logger?.debug(`Registered collection from schema: ${name}`);
    }
  }

  /**
   * Get the global view manager.
   */
  get views(): IgniterCollectionViewManager {
    return this.viewManager;
  }

  /**
   * Refresh schemas and views from the registries.
   *
   * This method reloads all schema and view files from disk and
   * creates/updates managers accordingly.
   *
   * @returns Promise that resolves when refresh is complete
   */
  async refresh(): Promise<void> {
    // Refresh collections from schema registry
    if (this.schemaRegistry) {
      const schemas = await this.schemaRegistry.refresh();
      for (const [name, definition] of schemas) {
        this.addCollectionManager(name, definition);
      }
    }

    // Refresh views from view registry
    if (this.viewRegistry) {
      const watchedViews = await this.viewRegistry.refresh();
      const programmaticViews = this.config.views || [];
      const programmaticNames = new Set(programmaticViews.map(v => v.name));

      // Merge watched views with programmatic views
      // Programmatic views take precedence
      const mergedViews: IgniterCollectionViewDefinition[] = [...programmaticViews];
      for (const [name, view] of watchedViews) {
        if (programmaticNames.has(name)) {
          this.config.logger?.warn(
            `View conflict: programmatic view "${name}" overrides watched view`
          );
          continue;
        }
        mergedViews.push(view);
      }

      // Rebuild view manager with merged views
      this.viewManager = new IgniterCollectionViewManager({
        views: mergedViews,
        manager: this.proxyInstance as any,
        logger: this.config.logger,
      });
    }
  }

  /**
   * Get the schema registry instance.
   *
   * @returns Schema registry or undefined if not configured
   */
  getSchemaRegistry(): IgniterCollectionSchemaRegistry | undefined {
    return this.schemaRegistry;
  }

  /**
   * Get the view registry instance.
   *
   * @returns View registry or undefined if not configured
   */
  getViewRegistry(): IgniterCollectionViewRegistry | undefined {
    return this.viewRegistry;
  }

  /**
   * Start watching for file changes.
   *
   * When schema or view files change, the registries automatically
   * refresh and managers are updated accordingly.
   *
   * @returns True if watching started successfully
   */
  async startWatching(): Promise<boolean> {
    if (!this.schemaRegistry && !this.viewRegistry) {
      this.config.logger?.warn(
        "Cannot start watching: no watcher configured"
      );
      return false;
    }

    // Initial load
    await this.refresh();

    // Start schema watching
    this.schemaRegistry?.startWatching((event, name) => {
      if (event === "added") {
        const definition = this.schemaRegistry?.getCollection(name);
        if (definition) {
          this.addCollectionManager(name, definition);
        }
      }
    });

    // Start view watching
    this.viewRegistry?.startWatching();

    return true;
  }

  /**
   * Stop watching for file changes.
   */
  stopWatching(): void {
    this.schemaRegistry?.stopWatching();
    this.viewRegistry?.stopWatching();
  }

  /**
   * Check if watching is active.
   *
   * @returns True if watching is active
   */
  isWatching(): boolean {
    return (this.schemaRegistry?.isWatching() ?? false) ||
           (this.viewRegistry?.isWatching() ?? false);
  }

  /**
   * Dispose the manager and clean up all resources.
   *
   * Stops watching and releases any held resources.
   * Call this when the manager is no longer needed.
   *
   * @example
   * ```typescript
   * // When shutting down
   * docs.dispose();
   * ```
   */
  dispose(): void {
    this.stopWatching();
    this.collectionManagers.clear();
    this.config.logger?.debug("IgniterCollectionManager disposed");
  }

  /**
   * Get a collection manager by name.
   *
   * @param name - Collection name
   * @returns Collection manager
   * @throws IgniterCollectionError - If collection not found
   */
  collection<K extends keyof TCollections>(
    name: K
  ): TCollections[K] extends IgniterCollectionModelDefinition<infer TSchema>
    ? IIgniterCollectionModel<TSchema>
    : never {
    const manager = this.collectionManagers.get(name as string);

    if (!manager) {
      throw new IgniterCollectionError({
        message: `Collection not found: ${String(name)}`,
        code: IGNITER_COLLECTION_ERROR_CODES.COLLECTION_NOT_FOUND,
        statusCode: 404,
        details: {
          "ctx.package": "@igniter-js/collections",
          "ctx.operation": "collection",
          "ctx.collection": String(name),
        },
      });
    }

    return manager as any;
  }

  /**
   * Get the telemetry manager.
   */
  get telemetry(): IgniterTelemetryManager | undefined {
    return this.config.telemetry;
  }

  /**
   * List all registered collection names.
   */
  definitions(): {
    [K in keyof TCollections]: {
      name: string
      patterns: string[]
      schema: StandardJSONSchemaV1 | undefined
    };
  } {
    const definitions = Array.from(this.collectionManagers.entries())

    const result = Array.from(definitions).reduce(
      (acc, [name, def]) => {
        acc[name as keyof TCollections] = {
          name: def.definition.name,
          patterns: def.definition.patterns,
          schema: def.definition.schema ? StdSchema.getJSONSchema(def.definition.schema) : undefined,
        };
        return acc;
      },
      {} as {
        [K in keyof TCollections]: {
          name: string
          patterns: string[]
          schema: StandardJSONSchemaV1 | undefined
        };
      }
    );

    return result;
  }

  /**
   * Subscribe to a global or scoped event.
   */
  on<K extends keyof IgniterCollectionEvents<TCollections>>(
    event: K,
    handler: IgniterCollectionEventHandler<IgniterCollectionEvents<TCollections>[K]>
  ): void {
    this.events.on(event, handler);
  }

  /**
   * Unsubscribe from an event.
   */
  off<K extends keyof IgniterCollectionEvents<TCollections>>(
    event: K,
    handler: IgniterCollectionEventHandler<IgniterCollectionEvents<TCollections>[K]>
  ): void {
    this.events.off(event, handler);
  }

  /**
   * Subscribe to an event once.
   */
  once<K extends keyof IgniterCollectionEvents<TCollections>>(
    event: K,
    handler: IgniterCollectionEventHandler<IgniterCollectionEvents<TCollections>[K]>
  ): void {
    this.events.once(event, handler);
  }

  /**
   * Emit an event internally.
   *
   * @internal
   */
  async emit<K extends keyof IgniterCollectionEvents<TCollections>>(
    event: K,
    data: IgniterCollectionEvents<TCollections>[K]
  ): Promise<void> {
    await this.events.emit(event, data);
  }

  // Index signature for Proxy - allows `docs.posts` access
  [key: string]:
  | IIgniterCollectionModel<any>
  | ((name: keyof TCollections) => IIgniterCollectionModel<any>)
  | (keyof TCollections)[]
  | (() => Promise<void>)
  | (() => IgniterCollectionSchemaRegistry | undefined)
  | (() => IgniterCollectionViewRegistry | undefined)
  | (() => boolean)
  | (() => void)
  | (() => boolean)
  | (<K extends keyof IgniterCollectionEvents<TCollections>>(
    event: K,
    handler: IgniterCollectionEventHandler<IgniterCollectionEvents<TCollections>[K]>
  ) => void)
  | any;
}
