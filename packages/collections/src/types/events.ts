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
 * Combined event types.
 *
 * @typeParam TCollections - Map of collection definitions
 */
export type IgniterCollectionEvents<TCollections extends Record<string, any> = any> =
  IgniterCollectionGlobalEvents &
  ([TCollections] extends [any] ? Record<string, any> : IgniterCollectionScopedEvents<TCollections>);
