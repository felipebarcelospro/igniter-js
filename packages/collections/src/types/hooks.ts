/**
 * @fileoverview Lifecycle hook types for @igniter-js/collections
 * @module @igniter-js/collections/types/hooks
 *
 * @description
 * Defines hook types that allow intercepting and modifying document operations.
 * Hooks can:
 * - Return the value to proceed with the operation
 * - Return a modified value to change what gets saved/returned
 * - Return false to cancel the operation
 */

import type { IgniterCollectionDocument } from "./collection";
import type { IIgniterCollectionModel, IIgniterCollectionsManager } from "./manager";
import type { NormalizeSchema } from "./query";

/**
 * Base context provided to all hooks.
 *
 * @typeParam TSchema - Document schema type
 */
export interface IgniterCollectionHookContext<TSchema> {
  /** The collection manager instance (allows CRUD operations on this collection) */
  collection: IIgniterCollectionModel<NormalizeSchema<TSchema>>;
  /** The main manager instance (allows access to other collections) */
  manager: IIgniterCollectionsManager;
  /** User-defined context from withContext() factory */
  context: unknown;
}

/**
 * Context for the onCreated hook.
 *
 * @typeParam TSchema - Document schema type
 */
export interface IgniterCollectionOnCreatedContext<TSchema>
  extends IgniterCollectionHookContext<TSchema> {
  /** The created document */
  value: IgniterCollectionDocument<TSchema>;
}

/**
 * Context for the onUpdated hook.
 *
 * @typeParam TSchema - Document schema type
 */
export interface IgniterCollectionOnUpdatedContext<TSchema>
  extends IgniterCollectionHookContext<TSchema> {
  /** The updated document */
  newValue: IgniterCollectionDocument<TSchema>;
  /** The document before update */
  previousValue: IgniterCollectionDocument<TSchema>;
}

/**
 * Context for the onDeleted hook.
 *
 * @typeParam TSchema - Document schema type
 */
export interface IgniterCollectionOnDeletedContext<TSchema>
  extends IgniterCollectionHookContext<TSchema> {
  /** The document being deleted */
  value: IgniterCollectionDocument<TSchema>;
}

/**
 * Context for the onRead hook.
 *
 * @typeParam TSchema - Document schema type
 */
export interface IgniterCollectionOnReadContext<TSchema>
  extends IgniterCollectionHookContext<TSchema> {
  /** The document that was read */
  value: IgniterCollectionDocument<TSchema>;
}

/**
 * Context for the onList hook.
 *
 * @typeParam TSchema - Document schema type
 */
export interface IgniterCollectionOnListContext<TSchema>
  extends IgniterCollectionHookContext<TSchema> {
  /** Array of documents that were listed */
  values: IgniterCollectionDocument<TSchema>[];
}

/**
 * Hook called after a document is created.
 *
 * @typeParam TSchema - Document schema type
 * @returns The document to save, a modified document, or false to cancel
 *
 * @example
 * ```typescript
 * const hook: IgniterCollectionOnCreatedHook<Post> = async ({ value }) => {
 *   console.log('Created:', value.id);
 *   return value; // proceed with creation
 * };
 * ```
 */
export type IgniterCollectionOnCreatedHook<TSchema> = (
  context: IgniterCollectionOnCreatedContext<TSchema>
) => IgniterCollectionDocument<TSchema> | false | Promise<IgniterCollectionDocument<TSchema> | false>;

/**
 * Hook called after a document is updated.
 *
 * @typeParam TSchema - Document schema type
 * @returns The document to save, a modified document, or false to cancel
 */
export type IgniterCollectionOnUpdatedHook<TSchema> = (
  context: IgniterCollectionOnUpdatedContext<TSchema>
) => IgniterCollectionDocument<TSchema> | false | Promise<IgniterCollectionDocument<TSchema> | false>;

/**
 * Hook called before a document is deleted.
 *
 * @typeParam TSchema - Document schema type
 * @returns true to proceed, false to cancel
 */
export type IgniterCollectionOnDeletedHook<TSchema> = (
  context: IgniterCollectionOnDeletedContext<TSchema>
) => boolean | Promise<boolean>;

/**
 * Hook called after a document is read.
 *
 * @typeParam TSchema - Document schema type
 * @returns The document to return, a modified document, or false to cancel
 */
export type IgniterCollectionOnReadHook<TSchema> = (
  context: IgniterCollectionOnReadContext<TSchema>
) => IgniterCollectionDocument<TSchema> | false | Promise<IgniterCollectionDocument<TSchema> | false>;

/**
 * Hook called after documents are listed.
 *
 * @typeParam TSchema - Document schema type
 * @returns The documents to return, modified documents, or false to cancel
 */
export type IgniterCollectionOnListHook<TSchema> = (
  context: IgniterCollectionOnListContext<TSchema>
) => IgniterCollectionDocument<TSchema>[] | false | Promise<IgniterCollectionDocument<TSchema>[] | false>;
