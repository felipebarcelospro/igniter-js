/**
 * @fileoverview Manager interface types for @igniter-js/collections
 * @module @igniter-js/collections/types/manager
 */

import type { StandardJSONSchemaV1 } from "@standard-schema/spec";
import type { IgniterCollectionModelDefinition, IgniterCollectionDocument, DeepPrettify, IgniterCollectionDocumentSystemFields, IgniterCollectionDocumentSearchFields } from "./collection";
import type { IgniterCollectionEventHandler, IgniterCollectionEvents } from "./events";
import type { IIgniterCollectionViewManager } from "./view";
import type {
  IgniterCollectionCountArgs,
  IgniterCollectionCreateArgs,
  IgniterCollectionDeleteArgs,
  IgniterCollectionFindManyArgs,
  IgniterCollectionFindUniqueArgs,
  IgniterCollectionUpdateArgs,
  NormalizeSchema,
  UnionToIntersection,
} from "./query";
import type { IgniterCollectionTelemetryEventsType } from "src/telemetry";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";

/**
 * Callback type for schema change notifications.
 */
export type IgniterCollectionSchemaChangeCallback = (
  event: "added" | "updated" | "removed",
  collectionName: string
) => void;

export type FindManyResult<TSchema, TArgs extends IgniterCollectionFindManyArgs<TSchema>> =
  DeepPrettify<UnionToIntersection<{
    [K in keyof IgniterCollectionDocument<
      TSchema,
      TArgs extends { select: infer S } ? S : undefined,
      TArgs extends { exclude: infer E } ? E : undefined
    >]:
    IgniterCollectionDocument<TSchema, TArgs extends { select: infer S } ? S : undefined, TArgs extends { exclude: infer E } ? E : undefined>[K];
  }> & IgniterCollectionDocumentSearchFields>[];

/**
 * Interface for collection manager operations.
 *
 * @typeParam TSchema - Document schema type
 */
export interface IIgniterCollectionModel<
  TSchema = unknown,
> {
  /** Collection definition */
  readonly definition: IgniterCollectionModelDefinition<TSchema>;

  /** Telemetry manager */
  readonly telemetry?: IgniterTelemetryManager<IgniterCollectionTelemetryEventsType>;

  /** Manager */
  readonly manager: IIgniterCollectionsManager;

  /**
   * Create a new document.
   *
   * @param args - Create arguments with data
   * @returns The created document
   */
  create<TArgs extends IgniterCollectionCreateArgs<TSchema>>(
    args: TArgs
  ): Promise<IgniterCollectionDocument<TSchema, TArgs extends { select: infer S } ? S : undefined, TArgs extends { exclude: infer E } ? E : undefined>>;

  /**
   * Find a unique document by ID.
   *
   * @param args - Find unique arguments
   * @returns The document or null if not found
   */
  findUnique<TArgs extends IgniterCollectionFindUniqueArgs<TSchema>>(
    args: TArgs
  ): Promise<IgniterCollectionDocument<TSchema, TArgs extends { select: infer S } ? S : undefined, TArgs extends { exclude: infer E } ? E : undefined> | null>;

  /**
   * Find multiple documents matching criteria.
   *
   * @param args - Find many arguments with filters
   * @returns Array of matching documents
   */
  findMany<TArgs extends IgniterCollectionFindManyArgs<TSchema>>(
    args?: TArgs
  ): Promise<FindManyResult<TSchema, TArgs>>;

  /**
   * Update a document.
   *
   * @param args - Update arguments
   * @returns The updated document
   */
  update<TArgs extends IgniterCollectionUpdateArgs<TSchema>>(
    args: TArgs
  ): Promise<IgniterCollectionDocument<TSchema, TArgs extends { select: infer S } ? S : undefined, TArgs extends { exclude: infer E } ? E : undefined>>;

  /**
   * Delete a document.
   *
   * @param args - Delete arguments
   * @returns The deleted document
   */
  delete<TArgs extends IgniterCollectionDeleteArgs<TSchema>>(
    args: TArgs
  ): Promise<IgniterCollectionDocument<TSchema, TArgs extends { select: infer S } ? S : undefined, TArgs extends { exclude: infer E } ? E : undefined>>;

  /**
   * Count documents matching criteria.
   *
   * @param args - Count arguments with optional filters
   * @returns Number of matching documents
   */
  count(args?: IgniterCollectionCountArgs<TSchema>): Promise<number>;
}

/**
 * Type for dynamically accessing collection managers.
 *
 * @typeParam TCollections - Map of collection definitions
 */
export type IgniterCollectionsAccessor<
  TCollections extends Record<string, IgniterCollectionModelDefinition<any>>,
> = {
    [K in keyof TCollections]: TCollections[K] extends IgniterCollectionModelDefinition<
      infer TSchema
    >
    ? IIgniterCollectionModel<TSchema>
    : never;
  };

/**
 * Interface for the main markdown manager methods.
 *
 * @typeParam TCollections - Map of collection definitions
 */
export interface IIgniterCollectionsManagerMethods<
  TCollections extends Record<string, IgniterCollectionModelDefinition<any>> = {
    [key: string]: IgniterCollectionModelDefinition<any>;
  },
> {
  /**
   * Get a collection manager by name.
   *
   * @param name - Collection name
   * @returns The collection manager
   */
  collection<K extends keyof TCollections>(
    name: K
  ): TCollections[K] extends IgniterCollectionModelDefinition<infer TSchema>
    ? IIgniterCollectionModel<TSchema>
    : never;

  /**
   * List all registered collection names.
   */
  definitions(): {
    [K in keyof TCollections]: {
      name: string;
      patterns: string[];
      schema: StandardJSONSchemaV1 | undefined;
    };
  };

  /**
   * Subscribe to a global or scoped event.
   *
   * @param event - Event name (e.g., 'created', 'posts:updated')
   * @param handler - Event handler
   *
   * @example
   * ```typescript
   * docs.on('created', ({ collection, value }) => { ... });
   * docs.on('posts:updated', ({ newValue }) => { ... });
   * ```
   */
  on<K extends keyof IgniterCollectionEvents<TCollections>>(
    event: K,
    handler: IgniterCollectionEventHandler<IgniterCollectionEvents<TCollections>[K]>
  ): void;

  /**
   * Unsubscribe from an event.
   *
   * @param event - Event name
   * @param handler - Event handler to remove
   */
  off<K extends keyof IgniterCollectionEvents<TCollections>>(
    event: K,
    handler: IgniterCollectionEventHandler<IgniterCollectionEvents<TCollections>[K]>
  ): void;

  /**
   * Subscribe to an event once.
   *
   * @param event - Event name
   * @param handler - Event handler
   */
  once<K extends keyof IgniterCollectionEvents<TCollections>>(
    event: K,
    handler: IgniterCollectionEventHandler<IgniterCollectionEvents<TCollections>[K]>
  ): void;

  /**
   * Refresh collections and views from the registry.
   *
   * Reloads all schema and view files from disk and creates/updates
   * collection managers and views accordingly.
   *
   * @returns Promise that resolves when refresh is complete
   */
  refresh(): Promise<void>;

  /**
   * Start watching files for changes.
   *
   * When schema or view files change, the registry automatically refreshes
   * and collection managers and views are updated accordingly.
   *
   * @returns Promise that resolves to true if watching started successfully
   */
  startWatching(): Promise<boolean>;

  /**
   * Stop watching files for changes.
   */
  stopWatching(): void;

  /**
   * Check if file watching is active.
   *
   * @returns True if watching is active
   */
  isWatching(): boolean;

  /**
   * Dispose the manager and clean up all resources.
   *
   * Stops schema watching and releases any held resources.
   */
  dispose(): void;

  /**
   * Emit an event internally.
   * @internal
   */
  emit<K extends keyof IgniterCollectionEvents<TCollections>>(
    event: K,
    data: IgniterCollectionEvents<TCollections>[K]
  ): Promise<void>;

  /**
   * Global view manager for rendering views across all collections.
   */
  readonly views: IIgniterCollectionViewManager;
}

/**
 * Interface for the main markdown manager.
 *
 * @typeParam TCollections - Map of collection definitions
 */
export type IIgniterCollectionsManager<
  TCollections extends Record<string, IgniterCollectionModelDefinition<Record<string, any>>> = Record<
    string,
    IgniterCollectionModelDefinition<Record<string, any>>
  >,
> = IIgniterCollectionsManagerMethods<TCollections> & IgniterCollectionsAccessor<TCollections>;

