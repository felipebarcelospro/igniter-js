/**
 * @fileoverview Manager interface types for @igniter-js/collections
 * @module @igniter-js/collections/types/manager
 */

import type { StandardJSONSchemaV1 } from "@standard-schema/spec";
import type { IgniterCollectionModelDefinition, IgniterCollectionDocument, DeepPrettify, IgniterCollectionDocumentSystemFields, IgniterCollectionDocumentSearchFields } from "./collection";
import type { IgniterCollectionEventHandler, IgniterCollectionEvents, IgniterCollectionModelEvents } from "./events";
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
  collection: string
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
 * Event subscription handle returned by on().
 */
export interface IgniterCollectionSubscription {
  /** Unsubscribe the handler */
  off(): void;
}

/**
 * Watcher namespace for file system watching.
 */
export interface IIgniterCollectionWatcher {
  /**
   * Start watching files for changes.
   * @returns Promise that resolves to true if watching started successfully
   */
  start(): Promise<boolean>;

  /**
   * Stop watching files for changes.
   */
  stop(): void;

  /**
   * Check if file watching is active.
   */
  readonly isWatching: boolean;
}

/**
 * Collections namespace for accessing and listing collections.
 */
export interface IIgniterCollectionsAccessor<
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
  get<K extends keyof TCollections>(
    name: K
  ): TCollections[K] extends IgniterCollectionModelDefinition<infer TSchema>
    ? IIgniterCollectionModel<TSchema>
    : never;

  /**
   * Get a collection manager by name (dynamic fallback).
   *
   * Accepts any string for runtime-discovered collections.
   * Returns `IIgniterCollectionModel<any>` when the collection
   * is not statically known.
   */
  get(name: string): IIgniterCollectionModel<any>;

  /**
   * List all registered collection definitions as an array.
   */
  list(): Array<{
    name: string;
    patterns: string[];
    schema: StandardJSONSchemaV1 | undefined;
    source?: 'built-in' | 'discovered';
  }>;

  /**
   * Get all registered collection definitions as an entries map.
   */
  entries(): {
    [K in keyof TCollections]: {
      name: string;
      patterns: string[];
      schema: StandardJSONSchemaV1 | undefined;
      source?: 'built-in' | 'discovered';
    };
  };
}

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

  /**
   * Subscribe to collection-scoped events.
   *
   * @param event - Event name (e.g., 'created', 'updated', 'deleted')
   * @param handler - Event handler
   * @returns Subscription handle with off() method
   */
  on<K extends keyof IgniterCollectionModelEvents<TSchema>>(
    event: K,
    handler: IgniterCollectionEventHandler<IgniterCollectionModelEvents<TSchema>[K]>
  ): IgniterCollectionSubscription;

  /**
   * Subscribe to a custom collection-scoped event.
   *
   * @param event - Custom event name
   * @param handler - Event handler
   * @returns Subscription handle with off() method
   */
  on(
    event: string,
    handler: IgniterCollectionEventHandler<any>
  ): IgniterCollectionSubscription;
}

/**
 * Type for dynamically accessing collection managers via Proxy.
 *
 * @typeParam TCollections - Map of collection definitions
 */
export type IgniterCollectionsProxy<
  TCollections extends Record<string, IgniterCollectionModelDefinition<any>>,
> = {
    [K in keyof TCollections]: TCollections[K] extends IgniterCollectionModelDefinition<
      infer TSchema
    >
    ? IIgniterCollectionModel<TSchema>
    : never;
  };

/**
 * Public API interface for the main markdown manager.
 *
 * This is the interface returned by `build()`. It only exposes
 * the official public API — internal methods are hidden from
 * IntelliSense to improve DX.
 *
 * @typeParam TCollections - Map of collection definitions
 */
export interface IIgniterCollectionsManager<
  TCollections extends Record<string, IgniterCollectionModelDefinition<any>> = {
    [key: string]: IgniterCollectionModelDefinition<any>;
  },
> {
  /**
   * Subscribe to a global or scoped event.
   *
   * @param event - Event name (e.g., 'created', 'posts:updated')
   * @param handler - Event handler
   * @returns Subscription handle with off() method
   *
   * @example
   * ```typescript
   * const { off } = docs.on('created', ({ collection, value }) => { ... });
   * // later: off();
   * ```
   */
  on<K extends keyof IgniterCollectionEvents<TCollections>>(
    event: K,
    handler: IgniterCollectionEventHandler<IgniterCollectionEvents<TCollections>[K]>
  ): IgniterCollectionSubscription;

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
   * Global view manager for rendering views across all collections.
   */
  readonly views: IIgniterCollectionViewManager;

  /**
   * Collections namespace for accessing and listing collections.
   */
  readonly collections: IIgniterCollectionsAccessor<TCollections>;

  /**
   * Watcher namespace for file system watching.
   */
  readonly watcher: IIgniterCollectionWatcher;
}

/**
 * Internal methods not exposed in the public API.
 *
 * These methods exist on the runtime object but are hidden from
 * the public type to keep IntelliSense clean.
 *
 * @internal
 */
export interface IIgniterCollectionsManagerInternal<
  TCollections extends Record<string, IgniterCollectionModelDefinition<any>> = {
    [key: string]: IgniterCollectionModelDefinition<any>;
  },
> extends IIgniterCollectionsManager<TCollections> {
  /** Unsubscribe from an event. */
  off<K extends keyof IgniterCollectionEvents<TCollections>>(
    event: K,
    handler: IgniterCollectionEventHandler<IgniterCollectionEvents<TCollections>[K]>
  ): void;

  /** Subscribe to an event once. */
  once<K extends keyof IgniterCollectionEvents<TCollections>>(
    event: K,
    handler: IgniterCollectionEventHandler<IgniterCollectionEvents<TCollections>[K]>
  ): void;

  /** Emit an event. */
  emit<K extends keyof IgniterCollectionEvents<TCollections>>(
    event: K,
    data: IgniterCollectionEvents<TCollections>[K]
  ): Promise<void>;

  /** Dispose the manager. */
  dispose(): void;

  /** Get a collection manager by name (legacy). */
  collection<K extends keyof TCollections>(
    name: K
  ): TCollections[K] extends IgniterCollectionModelDefinition<infer TSchema>
    ? IIgniterCollectionModel<TSchema>
    : never;

  /** List all registered collection names (legacy). */
  definitions(): {
    [K in keyof TCollections]: {
      name: string;
      patterns: string[];
      schema: StandardJSONSchemaV1 | undefined;
      source?: 'built-in' | 'discovered';
    };
  };

  /** Start watching (legacy). */
  startWatching(): Promise<boolean>;

  /** Stop watching (legacy). */
  stopWatching(): void;

  /** Check if watching (legacy). */
  isWatching(): boolean;
}

/**
 * Full manager interface including public API, internal methods,
 * and dynamic proxy access for collection shorthand.
 *
 * @internal
 */
export type IIgniterCollectionsManagerFull<
  TCollections extends Record<string, IgniterCollectionModelDefinition<Record<string, any>>> = Record<
    string,
    IgniterCollectionModelDefinition<Record<string, any>>
  >,
> = IIgniterCollectionsManagerInternal<TCollections> & IgniterCollectionsProxy<TCollections>;
