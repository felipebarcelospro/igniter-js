/**
 * @fileoverview Query argument types for @igniter-js/collections
 * @module @igniter-js/collections/types/query
 *
 * @description
 * Defines Prisma-like query argument types for CRUD operations.
 * Supports scalar filters, array operators, and nested field access via dot notation.
 */

import type { IgniterCollectionDocument, IgniterCollectionDocumentBase } from "./collection";

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Normalizes a schema type to a record or unknown.
 * Used to ensure consistency across the package and fix DTS build issues.
 */
export type NormalizeSchema<T> = T extends never
  ? Record<string, any>
  : unknown extends T
  ? Record<string, any>
  : T;

/**
 * Recursive type to get all possible dot-notation paths of an object.
 *
 * @typeParam T - The object type to extract paths from
 */
export type Path<T> = T extends object
  ? {
    [K in keyof T & string]: T[K] extends (infer U)[]
    ? `${K}` | (U extends object ? `${K}.${Path<U>}` : never)
    : T[K] extends object
    ? `${K}` | `${K}.${Path<T[K]>}`
    : `${K}`;
  }[keyof T & string]
  : never;

/**
 * Helper to combine schema paths with reserved document fields.
 */
export type DocumentPath<TSchema> = Path<IgniterCollectionDocumentBase<TSchema>>;

/**
 * Utility type to pick nested properties from an object using dot notation.
 */
export type DeepPick<T, P extends string> = P extends `${infer K}.${infer R}`
  ? K extends keyof T
  ? { [Key in K]: DeepPick<T[Key], R> }
  : never
  : P extends keyof T
  ? { [K in P]: T[K] }
  : never;

/**
 * Utility type to omit nested properties from an object using dot notation or object.
 */
export type DeepOmitPath<T, P> = P extends string[]
  ? {
    [K in keyof T]: K extends P[number] ? never : T[K]
  }
  : P extends Record<string, any>
  ? {
    [K in keyof T]: K extends keyof P
    ? P[K] extends true
    ? never
    : T[K]
    : T[K]
  }
  : T;

/**
 * Merges a union of objects into a single object.
 */
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

/**
 * Deep recursive selection of object fields
 */
export type DeepSelect<TOriginal, TSelection> = {
  [K in keyof TSelection as K extends keyof TOriginal ? K : never]: TSelection[K] extends true
  ? K extends keyof TOriginal
  ? TOriginal[K]
  : never
  : TSelection[K] extends Record<string, any>
  ? K extends keyof TOriginal
  ? DeepSelect<TOriginal[K], TSelection[K]>
  : never
  : never;
};

/**
 * Helper to build result from selection.
 */
export type InferredFromSelect<TSchema, TSelect> = TSelect extends string[]
  ? UnionToIntersection<
    {
      [P in TSelect[number]]: P extends keyof IgniterCollectionDocumentBase<TSchema>
      ? { [K in P]: IgniterCollectionDocumentBase<TSchema>[P] }
      : never;
    }[TSelect[number]]
  >
  : TSelect extends Record<string, any>
  ? DeepSelect<IgniterCollectionDocumentBase<TSchema>, TSelect>
  : never;

/**
 * Deep recursive omission of object fields based on true values
 */
export type DeepOmit<TOriginal, TExclusion> = {
  [K in keyof TOriginal as K extends keyof TExclusion
  ? TExclusion[K] extends true
  ? never
  : K
  : K]: K extends keyof TExclusion
  ? TExclusion[K] extends Record<string, any>
  ? DeepOmit<TOriginal[K], TExclusion[K]>
  : TOriginal[K]
  : TOriginal[K];
};

/**
 * Helper to build result from exclusion.
 */
export type InferredFromExclude<TSchema, TExclude> = TExclude extends string[]
  ? {
    [K in keyof IgniterCollectionDocumentBase<TSchema> as K extends TExclude[number]
    ? never
    : K]: IgniterCollectionDocumentBase<TSchema>[K];
  }
  : TExclude extends Record<string, any>
  ? DeepOmit<IgniterCollectionDocumentBase<TSchema>, TExclude>
  : IgniterCollectionDocumentBase<TSchema>;

/**
 * Recursive type for object-based selection.
 */
export type SelectObject<TSchema> = {
  [K in keyof IgniterCollectionDocumentBase<TSchema>]?: IgniterCollectionDocumentBase<TSchema>[K] extends object
  ? SelectObject<IgniterCollectionDocumentBase<TSchema>[K]> | boolean
  : boolean;
};

/**
 * Recursive type for object-based exclusion.
 */
export type ExcludeObject<TSchema> = SelectObject<TSchema>;

/**
 * Helper to ensure select and exclude are mutually exclusive.
 */
export type SelectAndExclude<TSchema> =
  | {
    /** Select specific fields to return. Cannot be used with 'exclude'. */
    select?: SelectObject<TSchema>;
    exclude?: never;
  }
  | {
    select?: never;
    /** Exclude specific fields from return. Cannot be used with 'select'. */
    exclude?: ExcludeObject<TSchema>;
  };

// =============================================================================
// SCALAR FILTER OPERATORS
// =============================================================================

/**
 * Filter operators for scalar (non-array) query conditions.
 *
 * @typeParam T - The type of the field being filtered
 *
 * @example Equality and comparison
 * ```typescript
 * where: {
 *   views: { gte: 100, lt: 1000 },
 *   status: { not: "draft" },
 *   category: { in: ["tech", "tutorial"] }
 * }
 * ```
 *
 * @example String operations
 * ```typescript
 * where: {
 *   title: { contains: "TypeScript" },
 *   slug: { startsWith: "getting-started" }
 * }
 * ```
 */
export interface IgniterCollectionScalarFilterOperators<T> {
  /** Equal to value */
  equals?: T;
  /** Not equal to value */
  not?: T;
  /** In array of values */
  in?: T[];
  /** Not in array of values */
  notIn?: T[];
  /** Less than */
  lt?: T;
  /** Less than or equal */
  lte?: T;
  /** Greater than */
  gt?: T;
  /** Greater than or equal */
  gte?: T;
  /** Contains substring (for strings) */
  contains?: string;
  /** Starts with (for strings) */
  startsWith?: string;
  /** Ends with (for strings) */
  endsWith?: string;
}

// =============================================================================
// ARRAY FILTER OPERATORS
// =============================================================================

/**
 * Filter operators for array fields.
 *
 * These operators allow filtering documents based on array field contents.
 *
 * @typeParam T - The type of items in the array
 *
 * @example Array contains
 * ```typescript
 * where: {
 *   tags: { has: "featured" }
 * }
 * ```
 *
 * @example Array contains all
 * ```typescript
 * where: {
 *   tags: { hasEvery: ["featured", "tutorial"] }
 * }
 * ```
 *
 * @example Array contains any
 * ```typescript
 * where: {
 *   categories: { hasSome: ["tech", "programming", "devops"] }
 * }
 * ```
 *
 * @example Array length checks
 * ```typescript
 * where: {
 *   comments: { isEmpty: false },
 *   tags: { length: 3 }
 * }
 * ```
 */
export interface IgniterCollectionArrayFilterOperators<T> {
  /** Array contains this value */
  has?: T;
  /** Array contains ALL of these values */
  hasEvery?: T[];
  /** Array contains at least ONE of these values */
  hasSome?: T[];
  /** Array is empty (true) or not empty (false) */
  isEmpty?: boolean;
  /** Array length equals this value */
  length?: number;
}

// =============================================================================
// COMBINED FILTER OPERATORS
// =============================================================================

/**
 * Combined filter operators for query conditions.
 *
 * This union type supports both scalar and array filter operators.
 * The filter system will detect at runtime which operators to apply
 * based on the actual field value type.
 *
 * @typeParam T - The type of the field being filtered
 */
export type IgniterCollectionFilterOperators<T> =
  | IgniterCollectionScalarFilterOperators<T>
  | IgniterCollectionArrayFilterOperators<T extends Array<infer U> ? U : T>;


export type IgniterCollectionSearchFields<T> = {
  [K in keyof T]?: { weight?: number; fuzzy?: boolean } | (T[K] extends object ? IgniterCollectionSearchFields<T[K]> : never);
};

/**
 * Full-text search configuration.
 *
 * @typeParam TSchema - Document schema type
 */
export interface IgniterCollectionSearchFilter<TSchema = Record<string, any>> {
  /** Search terms */
  term: string | string[];
  /**
   * Specific fields to search in.
   * If not provided, searches in common fields (title, description, tags, content).
   * Supports configuration objects for weights.
   */
  fields?: IgniterCollectionSearchFields<TSchema>;
  /**
   * Minimum score threshold (0-1).
   * Results below this score will be excluded.
   */
  threshold?: number;
  /** Whether to use fuzzy matching (globally for this search) */
  fuzzy?: boolean;
  /** Include sub-collections in search */
  includeSubCollections?: boolean;
}

// =============================================================================
// WHERE CLAUSE
// =============================================================================

/**
 * Where clause for filtering documents.
 *
 * Supports:
 * - Direct field filters: `{ title: "Hello" }`
 * - Filter operators: `{ views: { gte: 100 } }`
 * - Nested field access via dot notation: `{ "author.name": "John" }`
 * - Array operators: `{ tags: { has: "featured" } }`
 * - Full-text search: `{ search: { term: "typescript" } }`
 *
 * @typeParam TSchema - Document schema type
 *
 * @example Direct equality
 * ```typescript
 * where: { title: "Getting Started" }
 * ```
 *
 * @example Filter operators
 * ```typescript
 * where: {
 *   views: { gte: 100, lt: 1000 },
 *   status: { in: ["published", "featured"] }
 * }
 * ```
 *
 * @example Nested field access (dot notation)
 * ```typescript
 * where: {
 *   "author.name": "John Doe",
 *   "author.social.twitter": { contains: "@" }
 * }
 * ```
 *
 * @example Array operators
 * ```typescript
 * where: {
 *   tags: { has: "featured" },
 *   categories: { hasSome: ["tech", "tutorial"] }
 * }
 * ```
 *
 * @example Combined filters
 * ```typescript
 * where: {
 *   status: "published",
 *   views: { gte: 100 },
 *   "author.verified": true,
 *   tags: { hasEvery: ["featured", "popular"] }
 * }
 * ```
 */
export type IgniterCollectionWhereClause<TSchema = Record<string, any>> = {
  /** Filter by document ID */
  id?: string | IgniterCollectionScalarFilterOperators<string>;
  /** Full-text search */
  search?: IgniterCollectionSearchFilter<TSchema>;
} & {
  [K in keyof TSchema]?: TSchema[K] | IgniterCollectionFilterOperators<TSchema[K]>;
} & {
  /** Dot notation for nested field access (e.g., "author.name", "meta.social.twitter") */
  [K in Path<TSchema>]?: unknown | IgniterCollectionFilterOperators<unknown>;
} & {
  /** Fallback for arbitrary paths */
  [key: `${string}.${string}`]: unknown | IgniterCollectionFilterOperators<unknown>;
};

/**
 * Order by clause for sorting.
 */
export type IgniterCollectionOrderByClause<TSchema = Record<string, any>> = {
  [K in keyof TSchema]?: "asc" | "desc";
} & {
  id?: "asc" | "desc";
  createdAt?: "asc" | "desc";
  updatedAt?: "asc" | "desc";
};

/**
 * Include clause for sub-collections.
 */
export type IgniterCollectionIncludeClause = Record<
  string,
  | boolean
  | {
    where?: IgniterCollectionWhereClause;
    orderBy?: IgniterCollectionOrderByClause;
    take?: number;
    skip?: number;
  }
>;

type IgniterCollectionUpsertArgsData<TSchema = Record<string, any>> = TSchema extends { content: infer T }
  ? TSchema
  : TSchema & { content?: unknown };

/**
 * Arguments for creating a document.
 *
 * @typeParam TSchema - Document schema type
 */
export type IgniterCollectionCreateArgs<TSchema = Record<string, any>> = {
  /** Document data (frontmatter + optional content) */
  data: IgniterCollectionUpsertArgsData<TSchema>;
  /** Optional custom ID (uses generator if not provided) */
  id?: string;
} & SelectAndExclude<TSchema>;

/**
 * Arguments for finding a unique document.
 */
export type IgniterCollectionFindUniqueArgs<TSchema = Record<string, any>> = {
  /** Where clause with required ID */
  where: {
    id: string;
  };
  /** Include sub-collections */
  include?: IgniterCollectionIncludeClause;
} & SelectAndExclude<TSchema>;

/**
 * Arguments for finding multiple documents.
 *
 * @typeParam TSchema - Document schema type
 */
export type IgniterCollectionFindManyArgs<TSchema = Record<string, any>> = {
  /** Filter conditions */
  where?: IgniterCollectionWhereClause<TSchema>;
  /** Sort order */
  orderBy?: IgniterCollectionOrderByClause<TSchema>;
  /** Maximum number of documents to return */
  take?: number;
  /** Number of documents to skip */
  skip?: number;
  /** Include sub-collections */
  include?: IgniterCollectionIncludeClause;
} & SelectAndExclude<TSchema>;

/**
 * Arguments for updating a document.
 *
 * @typeParam TSchema - Document schema type
 */
export type IgniterCollectionUpdateArgs<TSchema = Record<string, any>> = {
  /** Where clause to find document */
  where: {
    id: string;
  };
  /** Data to update */
  data: Partial<IgniterCollectionUpsertArgsData<TSchema>>;
} & SelectAndExclude<TSchema>;

/**
 * Arguments for deleting a document.
 */
export type IgniterCollectionDeleteArgs<TSchema = Record<string, any>> = {
  /** Where clause to find document */
  where: {
    id: string;
  };
} & SelectAndExclude<TSchema>;

/**
 * Arguments for counting documents.
 *
 * @typeParam TSchema - Document schema type
 */
export interface IgniterCollectionCountArgs<TSchema = Record<string, any>> {
  /** Filter conditions */
  where?: IgniterCollectionWhereClause<TSchema>;
}
