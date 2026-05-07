/**
 * @fileoverview Event types for @igniter-js/collections
 * @module @igniter-js/collections/types/events
 */

import type { IgniterCollectionDocument } from "./collection";

/**
 * Basic event handler type.
 */
export type IgniterCollectionEventHandler<T = any> = (data: T) => void | Promise<void>;

/**
 * Global event payloads.
 */
export interface IgniterCollectionGlobalEvents {
  created: { collection: string; value: IgniterCollectionDocument<any> };
  updated: {
    collection: string;
    newValue: IgniterCollectionDocument<any>;
    previousValue: IgniterCollectionDocument<any>;
  };
  deleted: { collection: string; value: IgniterCollectionDocument<any> };
  read: { collection: string; value: IgniterCollectionDocument<any> };
}

/**
 * Collection-specific event payloads.
 *
 * @typeParam TCollections - Map of collection definitions
 */
export type IgniterCollectionScopedEvents<TCollections extends Record<string, any>> = {
  [K in keyof TCollections as `${string & K}:created`]: {
    value: IgniterCollectionDocument<any>;
  };
} & {
  [K in keyof TCollections as `${string & K}:updated`]: {
    newValue: IgniterCollectionDocument<any>;
    previousValue: IgniterCollectionDocument<any>;
  };
} & {
  [K in keyof TCollections as `${string & K}:deleted`]: {
    value: IgniterCollectionDocument<any>;
  };
} & {
  [K in keyof TCollections as `${string & K}:read`]: {
    value: IgniterCollectionDocument<any>;
  };
};

/**
 * Event payloads for a single collection instance (scoped, no name prefix).
 *
 * Used by `collectionManager.on()` to provide typed handlers
 * based on the collection's schema.
 *
 * @typeParam TSchema - Document schema type
 */
export interface IgniterCollectionModelEvents<TSchema = any> {
  /** Document was created */
  created: { value: IgniterCollectionDocument<TSchema> };
  /** Document was updated */
  updated: {
    newValue: IgniterCollectionDocument<TSchema>;
    previousValue: IgniterCollectionDocument<TSchema>;
  };
  /** Document was deleted */
  deleted: { value: IgniterCollectionDocument<TSchema> };
  /** Document was read */
  read: { value: IgniterCollectionDocument<TSchema> };
  /** Documents were listed */
  list: { items: IgniterCollectionDocument<TSchema>[] };
}

/**
 * Combined event types.
 *
 * @typeParam TCollections - Map of collection definitions
 */
export type IgniterCollectionEvents<TCollections extends Record<string, any> = any> =
  IgniterCollectionGlobalEvents &
  ([TCollections] extends [any] ? Record<string, any> : IgniterCollectionScopedEvents<TCollections>);
