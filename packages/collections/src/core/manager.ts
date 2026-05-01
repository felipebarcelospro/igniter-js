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
  IgniterCollectionSchemaChangeCallback,
} from "../types/manager";
import type { IgniterCollectionRegistryConfig } from "../types/registry";
import type { IgniterCollectionViewDefinition } from "../types/view";
import { IgniterCollectionModelManager } from "./model";
import { IgniterCollectionEventEmitter } from "./event-emitter";
import { IgniterCollectionSchemaRegistry } from "./schema-registry";
import { StdSchema } from "../utils/schema";
import type { StandardJSONSchemaV1 } from "@standard-schema/spec";
import { IGNITER_COLLECTION_ERROR_CODES, IgniterCollectionError } from "../errors";
import type { IgniterCollectionTelemetryEventsType } from "src/telemetry";
import type { NormalizeSchema } from "../types/query";

/**
 * Configuration for the main manager.
 */
interface ManagerConfig<TCollections> {
  basePath: string;
  adapter: IgniterCollectionAdapter;
  collections: TCollections;
  schemaRegistryPath?: string | string[];
  schemaAutoWatch?: boolean;
  schemaFilePattern?: string;
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
    IgniterCollectionModelDefinition<any, any>
  > = Record<string, IgniterCollectionModelDefinition<any, any>>,
> implements IIgniterCollectionsManagerMethods<TCollections> {
  private readonly config: ManagerConfig<TCollections>;
  private readonly collectionManagers: Map<string, IIgniterCollectionModel<any, any>> =
    new Map();
  private readonly events = new IgniterCollectionEventEmitter<IgniterCollectionEvents<TCollections>>();
  private schemaRegistry?: IgniterCollectionSchemaRegistry;
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
          prop === "refreshSchemas" ||
          prop === "getSchemaRegistry" ||
          prop === "startSchemaWatching" ||
          prop === "stopSchemaWatching" ||
          prop === "isSchemaWatching" ||
          prop === "dispose" ||
          prop === "on" ||
          prop === "off" ||
          prop === "once" ||
          prop === "emit"
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

    // Initialize schema registry if path is configured
    if (config.schemaRegistryPath) {
      this.initializeSchemaRegistry(config.schemaRegistryPath);

      // Auto-start watching if configured
      // Em manager.ts constructor
      if (config.schemaAutoWatch && this.schemaRegistry) {
        this.startSchemaWatching();
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
   * Initialize the schema registry.
   */
  private initializeSchemaRegistry(registryPath: string | string[]): void {
    const registryConfig: IgniterCollectionRegistryConfig = {
      registryPath,
      basePath: this.config.basePath,
      filePattern: this.config.schemaFilePattern,
    };

    this.schemaRegistry = new IgniterCollectionSchemaRegistry(
      registryConfig,
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
   * Refresh schemas from the registry and update collection managers.
   *
   * This method reloads all schema files from disk and creates/updates
   * collection managers accordingly.
   *
   * @returns Promise that resolves when schemas are refreshed
   *
   * @example
   * ```typescript
   * const docs = IgniterCollections.create()
   *   .withAdapter(adapter)
   *   .withSchemaRegistryPath('.fractal/schemas')
   *   .build();
   *
   * // After adding new schema files
   * await docs.refreshSchemas();
   *
   * // Now new collections are available
   * await docs.newCollection.findMany();
   * ```
   */
  async refreshSchemas(): Promise<void> {
    if (!this.schemaRegistry) {
      this.config.logger?.debug("No schema registry configured, skipping refresh");
      return;
    }

    const schemas = await this.schemaRegistry.refresh();

    // Create managers for new collections
    for (const [name, definition] of schemas) {
      this.addCollectionManager(name, definition);
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
   * Start watching schema files for changes.
   *
   * When schema files change, the registry automatically refreshes
   * and collection managers are updated accordingly.
   *
   * @param onSchemaChange - Optional callback for schema change events
   * @returns True if watching started successfully
   *
   * @example
   * ```typescript
   * const docs = IgniterCollections.create()
   *   .withAdapter(adapter)
   *   .withSchemaRegistryPath('.fractal/schemas')
   *   .build();
   *
   * // Start watching with callback
   * docs.startSchemaWatching((event, collection) => {
   *   console.log(`Collection ${event}: ${collection}`);
   * });
   *
   * // Or without callback
   * docs.startSchemaWatching();
   * ```
   */
  async startSchemaWatching(
    onSchemaChange?: IgniterCollectionSchemaChangeCallback
  ): Promise<boolean> {
    if (!this.schemaRegistry) {
      this.config.logger?.warn(
        "Cannot start schema watching: no schema registry configured"
      );
      return false;
    }

    // Initial load - await to ensure schemas are ready before continuing
    await this.refreshSchemas();

    // Wrap callback to add collection managers on change
    const wrappedCallback: IgniterCollectionSchemaChangeCallback = (event, name) => {
      // If a collection was added, create the manager
      if (event === "added") {
        const definition = this.schemaRegistry?.getCollection(name);
        if (definition) {
          this.addCollectionManager(name, definition);
        }
      }

      // Invoke user callback if provided
      onSchemaChange?.(event, name);
    };

    return this.schemaRegistry.startWatching(wrappedCallback);
  }

  /**
   * Stop watching schema files for changes.
   *
   * @example
   * ```typescript
   * docs.stopSchemaWatching();
   * ```
   */
  stopSchemaWatching(): void {
    this.schemaRegistry?.stopWatching();
  }

  /**
   * Check if schema watching is active.
   *
   * @returns True if watching is active
   */
  isSchemaWatching(): boolean {
    return this.schemaRegistry?.isWatching() ?? false;
  }

  /**
   * Dispose the manager and clean up all resources.
   *
   * Stops schema watching and releases any held resources.
   * Call this when the manager is no longer needed.
   *
   * @example
   * ```typescript
   * // When shutting down
   * docs.dispose();
   * ```
   */
  dispose(): void {
    this.stopSchemaWatching();
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
  ): TCollections[K] extends IgniterCollectionModelDefinition<infer TSchema, infer TViews>
    ? IIgniterCollectionModel<
      TSchema,
      TViews
    >
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
  | ((onSchemaChange?: IgniterCollectionSchemaChangeCallback) => boolean)
  | (() => void)
  | (() => boolean)
  | (<K extends keyof IgniterCollectionEvents<TCollections>>(
    event: K,
    handler: IgniterCollectionEventHandler<IgniterCollectionEvents<TCollections>[K]>
  ) => void)
  | any;
}
