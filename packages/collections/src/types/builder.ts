/**
 * @fileoverview Builder state types for @igniter-js/collections
 * @module @igniter-js/collections/types/builder
 */

import type { IgniterLogger } from "@igniter-js/common";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { IgniterCollectionAdapter } from "./adapter";
import type {
  IgniterCollectionModelDefinition,
  IgniterCollectionModelHooks,
  IgniterCollectionSubCollectionDefinition,
} from "./collection";
import type { IgniterCollectionTelemetryEventsType } from "src/telemetry";

/**
 * Internal state for IgniterCollectionModelBuilder.
 *
 * @typeParam TSchema - The schema type being accumulated
 * @typeParam TViews - Map of view definitions
 */
export interface IgniterCollectionsModelBuilderState<
  TSchema = unknown,
  TViews extends Record<string, any> = Record<string, any>,
> {
  /** Collection name */
  name: string;
  /** Base path for files */
  basePath?: string;
  /** File pattern with placeholders */
  filePattern?: string;
  /** Default ID generator */
  defaultIdGenerator?: () => string;
  /** Zod schema for validation */
  schema?: StandardSchemaV1;
  /** Lifecycle hooks */
  hooks: IgniterCollectionModelHooks<TSchema>;
  /** Sub-collections */
  subCollections: Map<string, IgniterCollectionSubCollectionDefinition<unknown>>;
  /** Parent collection (for sub-collections) */
  parentCollection?: string;
  /** View definitions */
  views?: any[];
}

/**
 * Options for schema registry configuration.
 */
export interface IgniterCollectionSchemaRegistryOptions {
  /**
   * Whether to automatically watch for schema file changes.
   *
   * When enabled, the manager will start watching the schema registry
   * path after build and automatically refresh when files change.
   *
   * @default false
   */
  autoWatch?: boolean;

  /**
   * Pattern to match schema files.
   *
   * @default "*.schema.json"
   */
  filePattern?: string;
}

/**
 * Internal state for IgniterCollectionBuilder.
 *
 * @typeParam TCollections - Map of collection definitions
 */
export interface IgniterCollectionsBuilderState<
  TCollections extends Record<string, IgniterCollectionModelDefinition<any>> = Record<
    string,
    IgniterCollectionModelDefinition<any>
  >,
> {
  /** Base path(s) for all collections */
  basePath?: string | string[];
  /** Filesystem adapter */
  adapter?: IgniterCollectionAdapter;
  /** Path(s) to schema registry JSON files */
  schemaRegistryPath?: string | string[];
  /** Schema registry options */
  schemaRegistryOptions?: IgniterCollectionSchemaRegistryOptions;
  /** Telemetry manager */
  telemetry?: IgniterTelemetryManager<IgniterCollectionTelemetryEventsType>;
  /** Logger instance */
  logger?: IgniterLogger;
  /** Registered collections */
  collections: TCollections;
  /** Global hooks applied to all collections */
  globalHooks?: IgniterCollectionModelHooks<any>;
}
