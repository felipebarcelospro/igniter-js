/**
 * @fileoverview Collection definition types for @igniter-js/collections
 * @module @igniter-js/collections/types/collection
 */

import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  IgniterCollectionOnCreatedHook,
  IgniterCollectionOnDeletedHook,
  IgniterCollectionOnListHook,
  IgniterCollectionOnReadHook,
  IgniterCollectionOnUpdatedHook,
} from "./hooks";
import type { DeepOmitPath, InferredFromExclude, InferredFromSelect, NormalizeSchema } from "./query";

export type IgniterCollectionDocumentSystemFields = {
  /** Unique document identifier (extracted from filename) */
  id: string;
  /** Markdown content body */
  content?: string;
  /** Full file path */
  path?: string;
  /** Parent document ID (for sub-collections) */
  parentId?: string;
};

export type IgniterCollectionDocumentSearchFields = {
  _search: {
    score: number;
    matches: string[]
  };
};

/**
 * Base properties for all documents, merging system fields with the user schema.
 */
export type IgniterCollectionDocumentBase<TSchema> = Prettify<
  IgniterCollectionDocumentSystemFields & Omit<TSchema, "content">
>;

type UnionToIntersection<U> =
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

type PrettifyUnion<T> = UnionToIntersection<T>

type Prettify<T> = PrettifyUnion<{
  [K in keyof T]: T[K]
} & {}>

export type DeepPrettify<T> = T extends Function
  ? T
  : T extends Array<infer U>
  ? Array<DeepPrettify<U>>
  : T extends object
  ? { [K in keyof T]: DeepPrettify<T[K]> } & {}
  : T;

export type MergeObject<
  T extends Record<string, any> | never,
  S extends Record<string, any> | never,
> = T extends never ? S : S extends never ? T : T & S;

type IgniterCollectionDocumentType<TSchema, TSelect, TExclude> = TSelect extends undefined
  ? (TExclude extends undefined
    ? IgniterCollectionDocumentBase<TSchema>
    : DeepPrettify<InferredFromExclude<TSchema, TExclude>>)
  : DeepPrettify<DeepOmitPath<InferredFromSelect<TSchema, TSelect>, TExclude>>;

/**
 * A markdown document with frontmatter and content.
 *
 * @typeParam TSchema - The schema type for frontmatter validation
 * @typeParam TSelect - Selected fields (optional)
 * @typeParam TExclude - Excluded fields (optional)
 */
export type IgniterCollectionDocument<
  TSchema = unknown,
  TSelect = undefined,
  TExclude = undefined,
> = DeepPrettify<IgniterCollectionDocumentType<TSchema, TSelect, TExclude>>

/**
 * Sub-collection definition within a parent collection.
 */
export interface IgniterCollectionSubCollectionDefinition<TSchema = any> {
  /** Sub-collection name */
  name: string;
  /** Multiple file patterns for flexible storage */
  patterns: string[];
  /** Default ID generator function */
  defaultIdGenerator?: () => string;
  /** Zod schema for validation */
  schema?: StandardSchemaV1;
  /** Lifecycle hooks */
  hooks?: IgniterCollectionModelHooks<TSchema>;
}

/**
 * Collection hooks configuration.
 */
export interface IgniterCollectionModelHooks<TSchema = any> {
  /** Called after document creation */
  onCreated?: IgniterCollectionOnCreatedHook<TSchema>;
  /** Called after document update */
  onUpdated?: IgniterCollectionOnUpdatedHook<TSchema>;
  /** Called before document deletion */
  onDeleted?: IgniterCollectionOnDeletedHook<TSchema>;
  /** Called after document read */
  onRead?: IgniterCollectionOnReadHook<TSchema>;
  /** Called after listing documents */
  onList?: IgniterCollectionOnListHook<TSchema>;
}

/**
 * Complete collection model definition.
 *
 * @typeParam TSchema - The schema type for document frontmatter

 * @typeParam TName - The collection name literal type
 */
export interface IgniterCollectionModelDefinition<
  TSchema = unknown,
  TName extends string = string,
> {
  /** Collection name (used for manager access) */
  name: TName;
  /** Multiple file patterns for flexible storage */
  patterns: string[];
  /** Path to a template file for document generation */
  template?: string;
  /** Default ID generator function */
  defaultIdGenerator: () => string;
  /** Zod schema for frontmatter validation */
  schema?: StandardSchemaV1;
  /** Lifecycle hooks */
  hooks: IgniterCollectionModelHooks<TSchema>;
  /** Sub-collections defined within this collection */
  subCollections: Map<string, IgniterCollectionSubCollectionDefinition<unknown>>;
  /** Parent collection name (for sub-collections) */
  parentCollection?: string;
}

/**
 * Map of collection definitions keyed by name.
 */
export type IgniterCollectionModelMap = Record<
  string,
  IgniterCollectionModelDefinition<any>
>;
