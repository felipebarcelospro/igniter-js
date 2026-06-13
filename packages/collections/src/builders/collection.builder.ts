/**
 * @fileoverview Collection builder for @igniter-js/collections
 * @module @igniter-js/collections/builders/collection
 *
 * @description
 * Provides a fluent, immutable builder API for defining markdown collections.
 * Supports schemas, hooks, sub-collections, and custom file patterns.
 */

import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  IgniterCollectionModelDefinition,
  IgniterCollectionModelHooks,
  IgniterCollectionSubCollectionDefinition,
} from "../types/collection";
import type {
  IgniterCollectionOnCreatedHook,
  IgniterCollectionOnDeletedHook,
  IgniterCollectionOnListHook,
  IgniterCollectionOnReadHook,
  IgniterCollectionOnUpdatedHook,
} from "../types/hooks";
import { IgniterCollectionId } from "../utils/id";
/**
 * Internal state for the collection builder.
 */
interface CollectionBuilderState<
  TSchema = unknown,
> {
  name: string;
  patterns: string[];
  defaultIdGenerator?: () => string;
  schema?: StandardSchemaV1;
  hooks: IgniterCollectionModelHooks<TSchema>;
  subCollections: Map<string, IgniterCollectionSubCollectionDefinition<unknown>>;
  parentCollection?: string;
}

/**
 * Immutable builder for defining markdown collections.
 *
 * @typeParam TSchema - The schema type for document frontmatter

 * @typeParam TName - The literal type of the collection name
 *
 * @example Basic collection
 * ```typescript
 * const Posts = IgniterCollectionModel.create('posts')
 *   .withBasePath('.content/posts')
 *   .withFilePattern('{id}.mdx')
 *   .withSchema(z.object({
 *     title: z.string(),
 *     draft: z.boolean().default(false),
 *   }))
 *   .build();
 * ```
 *
 * @example Collection with hooks
 * ```typescript
 * const Posts = IgniterCollectionModel.create('posts')
 *   .withBasePath('.content/posts')
 *   .withSchema(postSchema)
 *   .onCreated(({ value }) => {
 *     console.log('Created:', value.id);
 *     return value; // Continue with creation
 *   })
 *   .onUpdated(({ newValue, previousValue }) => {
 *     if (previousValue.data.published && !newValue.data.published) {
 *       return false; // Cancel unpublishing
 *     }
 *     return newValue;
 *   })
 *   .build();
 * ```
 */
export class IgniterCollectionModelBuilder<
  TSchema = unknown,
  TName extends string = string,
> {
  /**
   * Private constructor - use static create() method.
   */
  private constructor(private readonly state: CollectionBuilderState<TSchema>) { }

  /**
   * Create a new collection builder.
   *
   * @param name - Unique collection name (used for manager access)
   * @returns New builder instance
   */
  static create<
    TName extends string,
    TSchema = unknown,
  >(name: TName): IgniterCollectionModelBuilder<TSchema, TName> {
    return new IgniterCollectionModelBuilder({
      name,
      patterns: ["{id}.mdx"],
      hooks: {},
      subCollections: new Map(),
    });
  }

  /**
   * Set multiple file patterns for flexible storage.
   *
   * @param patterns - Array of patterns with placeholders
   * @returns New builder instance
   */
  withPatterns(patterns: string[]): IgniterCollectionModelBuilder<TSchema, TName> {
    return new IgniterCollectionModelBuilder({
      ...this.state,
      patterns,
    });
  }

  /**
   * Set the schema for frontmatter validation.
   *
   * @param schema - Zod schema (or any StandardSchemaV1 compatible)
   * @returns New builder instance with inferred schema type
   */
  withSchema<S extends StandardSchemaV1>(
    schema: S
  ): IgniterCollectionModelBuilder<StandardSchemaV1.InferOutput<S>, TName> {
    return new IgniterCollectionModelBuilder({
      ...this.state,
      schema,
      hooks: {} as IgniterCollectionModelHooks<StandardSchemaV1.InferOutput<S>>,
    }) as IgniterCollectionModelBuilder<StandardSchemaV1.InferOutput<S>, TName>;
  }

  /**
   * Add a hook for document creation.
   *
   * @param hook - Hook function
   * @returns New builder instance
   */
  onCreated(
    hook: IgniterCollectionOnCreatedHook<TSchema>
  ): IgniterCollectionModelBuilder<TSchema, TName> {
    return new IgniterCollectionModelBuilder({
      ...this.state,
      hooks: {
        ...this.state.hooks,
        onCreated: hook,
      },
    });
  }

  /**
   * Add a hook for document updates.
   *
   * @param hook - Hook function
   * @returns New builder instance
   */
  onUpdated(
    hook: IgniterCollectionOnUpdatedHook<TSchema>
  ): IgniterCollectionModelBuilder<TSchema, TName> {
    return new IgniterCollectionModelBuilder({
      ...this.state,
      hooks: {
        ...this.state.hooks,
        onUpdated: hook,
      },
    });
  }

  /**
   * Add a hook for document deletion.
   *
   * @param hook - Hook function
   * @returns New builder instance
   */
  onDeleted(
    hook: IgniterCollectionOnDeletedHook<TSchema>
  ): IgniterCollectionModelBuilder<TSchema, TName> {
    return new IgniterCollectionModelBuilder({
      ...this.state,
      hooks: {
        ...this.state.hooks,
        onDeleted: hook,
      },
    });
  }

  /**
   * Add a hook for document reads.
   *
   * @param hook - Hook function
   * @returns New builder instance
   */
  onRead(
    hook: IgniterCollectionOnReadHook<TSchema>
  ): IgniterCollectionModelBuilder<TSchema, TName> {
    return new IgniterCollectionModelBuilder({
      ...this.state,
      hooks: {
        ...this.state.hooks,
        onRead: hook,
      },
    });
  }

  /**
   * Add a hook for listing documents.
   *
   * @param hook - Hook function
   * @returns New builder instance
   */
  onList(
    hook: IgniterCollectionOnListHook<TSchema>
  ): IgniterCollectionModelBuilder<TSchema, TName> {
    return new IgniterCollectionModelBuilder({
      ...this.state,
      hooks: {
        ...this.state.hooks,
        onList: hook,
      },
    });
  }

  /**
   * Define views for this collection.
   *
   * @param viewConfigs - Array of view definitions
   * @returns New builder instance
   */


  /**
   * Access sub-collection builder factory.
   *
   * Sub-collections are nested within parent documents.
   *
   * @example
   * ```typescript
   * const Tasks = Plan.collections.create('tasks')
   *   .withBasePath('/tasks') // Relative to parent: .fractal/plan/{id}/tasks/
   *   .withSchema(taskSchema)
   *   .build();
   * ```
   */
  get collections(): {
    create: <SubName extends string>(
      name: SubName
    ) => IgniterCollectionSubCollectionBuilder<unknown, SubName, TSchema, TName>;

  } {
    return {
      create: <SubName extends string>(name: SubName) => {
        return new IgniterCollectionSubCollectionBuilder<
          unknown,
          SubName,
          TSchema,
          TName
        >({ name, hooks: {} }, this);
      },
    };
  }

  /**
   * Build the collection definition.
   *
   * @returns Immutable collection definition
   */
  build(): IgniterCollectionModelDefinition<TSchema, TName> {
    return {
      name: this.state.name as TName,
      patterns: this.state.patterns,
      defaultIdGenerator: this.state.defaultIdGenerator ?? IgniterCollectionId.uuid,
      schema: this.state.schema,
      hooks: this.state.hooks,
      subCollections: new Map(this.state.subCollections),
      parentCollection: this.state.parentCollection,
    };
  }
}

/**
 * Builder for sub-collections within a parent collection.
 */
class IgniterCollectionSubCollectionBuilder<
  TSchema = unknown,
  TName extends string = string,
  TParentSchema = unknown,
  TParentName extends string = string,
> {
  constructor(
    private readonly state: {
      name: TName;
      filePattern?: string;
      defaultIdGenerator?: () => string;
      schema?: StandardSchemaV1;
      hooks: IgniterCollectionModelHooks<TSchema>;
    },
    private readonly parent: IgniterCollectionModelBuilder<
      TParentSchema,
      TParentName
    >
  ) { }

  withPatterns(
    patterns: string[]
  ): IgniterCollectionSubCollectionBuilder<
    TSchema,
    TName,
    TParentSchema,
    TParentName
  > {
    return new IgniterCollectionSubCollectionBuilder(
      { ...this.state, filePattern: patterns[0] }, // Sub-collections currently use first pattern for simplicity
      this.parent
    );
  }

  withSchema<S extends StandardSchemaV1>(
    schema: S
  ): IgniterCollectionSubCollectionBuilder<
    StandardSchemaV1.InferOutput<S>,
    TName,
    TParentSchema,
    TParentName
  > {
    return new IgniterCollectionSubCollectionBuilder(
      { ...this.state, schema, hooks: {} },
      this.parent
    ) as IgniterCollectionSubCollectionBuilder<
      StandardSchemaV1.InferOutput<S>,
      TName,
      TParentSchema,
      TParentName
    >;
  }

  onCreated(
    hook: IgniterCollectionOnCreatedHook<TSchema>
  ): IgniterCollectionSubCollectionBuilder<
    TSchema,
    TName,
    TParentSchema,
    TParentName
  > {
    return new IgniterCollectionSubCollectionBuilder(
      { ...this.state, hooks: { ...this.state.hooks, onCreated: hook } },
      this.parent
    );
  }

  onUpdated(
    hook: IgniterCollectionOnUpdatedHook<TSchema>
  ): IgniterCollectionSubCollectionBuilder<
    TSchema,
    TName,
    TParentSchema,
    TParentName
  > {
    return new IgniterCollectionSubCollectionBuilder(
      { ...this.state, hooks: { ...this.state.hooks, onUpdated: hook } },
      this.parent
    );
  }

  onDeleted(
    hook: IgniterCollectionOnDeletedHook<TSchema>
  ): IgniterCollectionSubCollectionBuilder<
    TSchema,
    TName,
    TParentSchema,
    TParentName
  > {
    return new IgniterCollectionSubCollectionBuilder(
      { ...this.state, hooks: { ...this.state.hooks, onDeleted: hook } },
      this.parent
    );
  }

  onRead(
    hook: IgniterCollectionOnReadHook<TSchema>
  ): IgniterCollectionSubCollectionBuilder<
    TSchema,
    TName,
    TParentSchema,
    TParentName
  > {
    return new IgniterCollectionSubCollectionBuilder(
      { ...this.state, hooks: { ...this.state.hooks, onRead: hook } },
      this.parent
    );
  }

  onList(
    hook: IgniterCollectionOnListHook<TSchema>
  ): IgniterCollectionSubCollectionBuilder<
    TSchema,
    TName,
    TParentSchema,
    TParentName
  > {
    return new IgniterCollectionSubCollectionBuilder(
      { ...this.state, hooks: { ...this.state.hooks, onList: hook } },
      this.parent
    );
  }

  build(): IgniterCollectionSubCollectionDefinition<TSchema> {
    return {
      name: this.state.name,
      patterns: this.state.filePattern ? [this.state.filePattern] : ["{id}.mdx"],
      defaultIdGenerator: this.state.defaultIdGenerator,
      schema: this.state.schema,
      hooks: this.state.hooks,
    };
  }
}

/**
 * Public alias for the collection builder.
 */
export const IgniterCollectionModel = IgniterCollectionModelBuilder;
