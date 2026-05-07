/**
 * @fileoverview Main entry point for @igniter-js/collections
 * @module @igniter-js/collections
 *
 * @description
 * A Prisma-like ORM for Markdown files with schema-based frontmatter validation,
 * sub-collections, hooks with control flow, and full TypeScript support.
 *
 * @example
 * ```typescript
 * import { IgniterCollections, IgniterCollectionModel } from '@igniter-js/collections';
 * import { NodeFsAdapter } from '@igniter-js/collections/adapters';
 * import { z } from 'zod';
 *
 * // Define collections
 * const Posts = IgniterCollectionModel.create('posts')
 *   .withBasePath('content/posts')
 *   .withSchema(z.object({
 *     title: z.string(),
 *     published: z.boolean(),
 *     tags: z.array(z.string())
 *   }))
 *   .onCreated(({ value }) => {
 *     console.log('Post created:', value.id);
 *     return value;
 *   })
 *   .build();
 *
 * // Build manager
 * const docs = IgniterCollections.create()
 *   .withAdapter(new NodeFsAdapter())
 *   .addCollection(Posts)
 *   .build();
 *
 * // CRUD operations
 * const post = await docs.posts.create({
 *   data: { title: 'Hello', published: true, tags: ['tutorial'] }
 * });
 *
 * const allPosts = await docs.posts.findMany({
 *   where: { published: true },
 *   orderBy: { createdAt: 'desc' }
 * });
 *
 * // New namespace API
 * const { off } = docs.on('created', ({ collection, value }) => {
 *   console.log(`Created in ${collection}: ${value.id}`);
 * });
 *
 * // Explicit collection access
 * const explicitPosts = await docs.collections.get('posts').findMany();
 * const definitions = docs.collections.entries();
 *
 * // Watcher control
 * await docs.watcher.start();
 * ```
 */

// =============================================================================
// CORE
// =============================================================================

export {
  IgniterCollectionModelManager,
} from "./core/model";

export {
  IgniterCollectionManager,
} from "./core/manager";

export {
  IgniterCollectionSchemaRegistry,
} from "./core/schema-registry";

export {
  IgniterCollectionViewManager,
} from "./core/view-manager";

export {
  IgniterCollectionWatcher,
} from "./core/watcher";

export {
  IgniterCollectionsAccessor,
} from "./core/collections-accessor";

export {
  IgniterCollectionViewInstance,
} from "./core/view-instance";

// =============================================================================
// BUILDERS
// =============================================================================

export {
  IgniterCollections,
  IgniterCollectionsBuilder,
} from "./builders/main.builder";

export {
  IgniterCollectionModel,
  IgniterCollectionModelBuilder,
} from "./builders/collection.builder";

export {
  IgniterCollectionView,
  IgniterCollectionViewBuilder,
} from "./builders/view.builder";

// =============================================================================
// ERRORS
// =============================================================================

export {
  IgniterCollectionError,
  IGNITER_COLLECTION_ERROR_CODES,
} from "./errors/collection.error";

// =============================================================================
// TYPES
// =============================================================================

export type {
  IgniterCollectionAdapter,
} from "./types/adapter";

export type {
  IgniterCollectionDocument,
  IgniterCollectionModelDefinition,
  IgniterCollectionSubCollectionDefinition,
  IgniterCollectionModelHooks,
} from "./types/collection";

export type {
  IgniterCollectionOnCreatedHook,
  IgniterCollectionOnCreatedContext,
  IgniterCollectionOnUpdatedHook,
  IgniterCollectionOnUpdatedContext,
  IgniterCollectionOnDeletedHook,
  IgniterCollectionOnDeletedContext,
  IgniterCollectionOnReadHook,
  IgniterCollectionOnReadContext,
  IgniterCollectionOnListHook,
  IgniterCollectionOnListContext,
  IgniterCollectionHookContext,
} from "./types/hooks";

export type {
  IgniterCollectionEventHandler,
  IgniterCollectionEvents,
  IgniterCollectionGlobalEvents,
  IgniterCollectionScopedEvents,
  IgniterCollectionModelEvents,
} from "./types/events";

export type {
  IgniterCollectionCreateArgs,
  IgniterCollectionFindUniqueArgs,
  IgniterCollectionFindManyArgs,
  IgniterCollectionUpdateArgs,
  IgniterCollectionDeleteArgs,
  IgniterCollectionCountArgs,
  IgniterCollectionWhereClause,
  IgniterCollectionOrderByClause,
  IgniterCollectionIncludeClause,
  IgniterCollectionFilterOperators,
  IgniterCollectionScalarFilterOperators,
  IgniterCollectionArrayFilterOperators,
  IgniterCollectionSearchFilter,
} from "./types/query";

export type {
  IIgniterCollectionModel,
  IIgniterCollectionsManager,
  IIgniterCollectionsManagerFull,
  IIgniterCollectionWatcher,
  IIgniterCollectionsAccessor,
  IgniterCollectionSubscription,
} from "./types/manager";

export type {
  IgniterCollectionsBuilderState,
  IgniterCollectionsModelBuilderState,
} from "./types/builder";

export type {
  IgniterCollectionSchemaFile,
  IgniterCollectionSchemaDefinition,
  IgniterCollectionSchemaHooksConfig,
  IgniterCollectionRegistryConfig,
  IgniterCollectionLoadedSchema,
} from "./types/registry";

export type {
  IgniterCollectionViewDefinition,
  IgniterCollectionViewAction,
  IgniterCollectionViewActionHandler,
  IgniterCollectionViewActionContext,
  IgniterCollectionViewActionResult,
  IgniterCollectionViewNode,
  IgniterCollectionViewQuery,
  IgniterCollectionViewDataHookContext,
  IgniterCollectionViewDataHook,
  IgniterCollectionViewRenderResult,
  IgniterCollectionViewRenderOptions,
  IIgniterCollectionViewManager,
  IIgniterCollectionViewManagerInternal,
  IIgniterCollectionViewInstance,
  IIgniterCollectionViewActions,
} from "./types/view";

// =============================================================================
// UTILS
// =============================================================================

export {
  IgniterCollectionParser,
  IgniterCollectionParser as IgniterCollectionFrontmatter,
} from "./utils/parser";

export {
  IgniterCollectionPath,
} from "./utils/path";

export {
  IgniterCollectionId,
} from "./utils/id";

export {
  IgniterCollectionViewJSONPointer,
} from "./utils/view-json-pointer";

export {
  IgniterCollectionLoader,
} from "./utils/loader";
