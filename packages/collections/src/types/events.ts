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
  created: { collection: string; value: IgniterCollectionDocument<any>; context: unknown };
  updated: {
    collection: string;
    newValue: IgniterCollectionDocument<any>;
    previousValue: IgniterCollectionDocument<any>;
    context: unknown;
  };
  deleted: { collection: string; value: IgniterCollectionDocument<any>; context: unknown };
  read: { collection: string; value: IgniterCollectionDocument<any>; context: unknown };
}

/**
 * Collection-specific event payloads.
 *
 * @typeParam TCollections - Map of collection definitions
 */
export type IgniterCollectionScopedEvents<TCollections extends Record<string, any>> = {
  [K in keyof TCollections as `${string & K}:created`]: {
    value: IgniterCollectionDocument<any>;
    context: unknown;
  };
} & {
  [K in keyof TCollections as `${string & K}:updated`]: {
    newValue: IgniterCollectionDocument<any>;
    previousValue: IgniterCollectionDocument<any>;
    context: unknown;
  };
} & {
  [K in keyof TCollections as `${string & K}:deleted`]: {
    value: IgniterCollectionDocument<any>;
    context: unknown;
  };
} & {
  [K in keyof TCollections as `${string & K}:read`]: {
    value: IgniterCollectionDocument<any>;
    context: unknown;
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
  created: { value: IgniterCollectionDocument<TSchema>; context: unknown };
  /** Document was updated */
  updated: {
    newValue: IgniterCollectionDocument<TSchema>;
    previousValue: IgniterCollectionDocument<TSchema>;
    context: unknown;
  };
  /** Document was deleted */
  deleted: { value: IgniterCollectionDocument<TSchema>; context: unknown };
  /** Document was read */
  read: { value: IgniterCollectionDocument<TSchema>; context: unknown };
  /** Documents were listed */
  list: { items: IgniterCollectionDocument<TSchema>[]; context: unknown };
}

/**
 * Combined event types.
 *
 * @typeParam TCollections - Map of collection definitions
 */
export type IgniterCollectionEvents<TCollections extends Record<string, any> = any> =
  IgniterCollectionGlobalEvents &
  ([TCollections] extends [any] ? Record<string, any> : IgniterCollectionScopedEvents<TCollections>);
