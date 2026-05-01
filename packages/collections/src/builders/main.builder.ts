/**
 * @fileoverview Main builder for @igniter-js/collections
 * @module @igniter-js/collections/builders/main
 *
 * @description
 * Provides the main entry point for creating IgniterCollection managers.
 * Follows the immutable builder pattern used across Igniter.js packages.
 */

import type { IgniterLogger } from "@igniter-js/common";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import { IgniterCollectionManager } from "../core/manager";
import {
  IgniterCollectionError,
  IGNITER_COLLECTION_ERROR_CODES,
} from "../errors/collection.error";
import type { IgniterCollectionAdapter } from "../types/adapter";
import type {
  IgniterCollectionsBuilderState,
  IgniterCollectionWatcherConfig,
} from "../types/builder";
import type {
  IgniterCollectionModelDefinition,
  IgniterCollectionModelHooks,
} from "../types/collection";
import type { IIgniterCollectionsManager } from "../types/manager";
import type { IgniterCollectionViewDefinition } from "../types/view";

/**
 * Immutable builder for creating IgniterCollections.
 *
 * @typeParam TCollections - Map of registered collection definitions
 *
 * @example Basic usage
 * ```typescript
 * import { IgniterCollections, IgniterCollectionModel } from '@igniter-js/collections';
 * import { NodeFsAdapter } from '@igniter-js/collections/adapters';
 * import { z } from 'zod';
 *
 * const Posts = IgniterCollectionModel.create('posts')
 *   .withBasePath('.content/posts')
 *   .withSchema(z.object({ title: z.string(), draft: z.boolean() }))
 *   .build();
 *
 * const docs = IgniterCollections.create()
 *   .withAdapter(new NodeFsAdapter())
 *   .withBasePath(process.cwd())
 *   .addCollection(Posts)
 *   .build();
 *
 * // Type-safe collection access
 * const post = await docs.posts.create({ data: { title: 'Hello', draft: true } });
 * ```
 */
export class IgniterCollectionsBuilder<
  TCollections extends Record<
    string,
    IgniterCollectionModelDefinition<any, any>
  > = {
    [key: string]: IgniterCollectionModelDefinition<any, any>;
  },
> {
  /**
   * Private constructor - use static create() method.
   */
  private constructor(
    private readonly state: IgniterCollectionsBuilderState<TCollections>
  ) { }

  /**
   * Create a new IgniterCollection builder.
   *
   * @returns New builder instance
   */
  static create(): IgniterCollectionsBuilder<{}> {
    return new IgniterCollectionsBuilder({
      collections: {} as Record<string, never>,
    });
  }

  /**
   * Set the base path(s) for resolving collection paths.
   *
   * @param path - Single path or array of paths
   * @returns New builder instance
   *
   * @example
   * ```typescript
   * // Single base path
   * .withBasePath(process.cwd())
   *
   * // Multiple base paths
   * .withBasePath(['.content', '.docs'])
   * ```
   */
  withBasePath(path: string | string[]): IgniterCollectionsBuilder<TCollections> {
    return new IgniterCollectionsBuilder({
      ...this.state,
      basePath: path,
    });
  }

  /**
   * Set the filesystem adapter.
   *
   * @param adapter - Adapter implementation
   * @returns New builder instance
   */
  withAdapter(adapter: IgniterCollectionAdapter): IgniterCollectionsBuilder<TCollections> {
    return new IgniterCollectionsBuilder({
      ...this.state,
      adapter,
    });
  }

  /**
   * Configure the unified watcher for auto-discovering collections and views.
   *
   * The watcher scans directories for `.schema.{json,ts}` and `.view.{json,ts}`
   * files, loading them automatically at build time and optionally watching
   * for changes.
   *
   * @param paths - Directory or directories to watch
   * @param options - Watcher configuration
   * @returns New builder instance
   *
   * @example Basic usage
   * ```typescript
   * .withWatcher('.fractal')
   * ```
   *
   * @example With custom globs
   * ```typescript
   * .withWatcher('.fractal', {
   *   collections: 'schema.{json,ts}',
   *   views: 'view.{json,ts}',
   *   autoWatch: true,
   * })
   * ```
   */
  withWatcher(
    paths: string | string[],
    options?: Omit<IgniterCollectionWatcherConfig, 'paths'>
  ): IgniterCollectionsBuilder<TCollections> {
    return new IgniterCollectionsBuilder({
      ...this.state,
      watcherConfig: {
        paths,
        ...options,
      },
    });
  }

  /**
   * Add a view definition to the manager.
   *
   * Programmatic views take precedence over watched views.
   * When a conflict occurs, a warning is logged.
   *
   * @param view - View definition from builder
   * @returns New builder instance
   *
   * @example
   * ```typescript
   * const DashboardView = IgniterCollectionView.create('dashboard')
   *   .withTitle('Dashboard')
   *   .withGetData(async ({ manager }) => ({ items: [] }))
   *   .build();
   *
   * const docs = IgniterCollections.create()
   *   .withAdapter(adapter)
   *   .addView(DashboardView)
   *   .build();
   * ```
   */
  addView(
    view: IgniterCollectionViewDefinition
  ): IgniterCollectionsBuilder<TCollections> {
    return new IgniterCollectionsBuilder({
      ...this.state,
      views: [...(this.state.views || []), view],
    });
  }

  /**
   * Set the telemetry manager for observability.
   *
   * @param telemetry - Telemetry manager instance
   * @returns New builder instance
   */
  withTelemetry(
    telemetry: IgniterTelemetryManager<any>
  ): IgniterCollectionsBuilder<TCollections> {
    return new IgniterCollectionsBuilder({
      ...this.state,
      telemetry,
    });
  }

  /**
   * Set the logger instance.
   *
   * @param logger - Logger instance
   * @returns New builder instance
   */
  withLogger(logger: IgniterLogger): IgniterCollectionsBuilder<TCollections> {
    return new IgniterCollectionsBuilder({
      ...this.state,
      logger,
    });
  }

  /**
   * Set global hooks applied to all collections.
   *
   * @param hooks - Hook configuration
   * @returns New builder instance
   */
  withGlobalHooks(
    hooks: IgniterCollectionModelHooks<unknown>
  ): IgniterCollectionsBuilder<TCollections> {
    return new IgniterCollectionsBuilder({
      ...this.state,
      globalHooks: hooks,
    });
  }

  /**
   * Add a collection to the manager.
   *
   * @param collection - Collection definition from builder
   * @returns New builder instance with collection type added
   */
  addCollection<TSchema extends Record<string, any>, TName extends string>(
    collection: IgniterCollectionModelDefinition<TSchema, TName>
  ): IgniterCollectionsBuilder<
    TCollections & { [K in TName]: IgniterCollectionModelDefinition<TSchema, TName> }
  > {
    return new IgniterCollectionsBuilder({
      ...this.state,
      collections: {
        ...this.state.collections,
        [collection.name]: collection,
      } as TCollections & {
        [K in TName]: IgniterCollectionModelDefinition<TSchema, TName>;
      },
    });
  }

  /**
   * Build the IgniterCollection manager.
   *
   * @returns Configured manager instance
   * @throws IgniterCollectionError if adapter is not configured
   */
  build(): IIgniterCollectionsManager<TCollections> {
    if (!this.state.adapter) {
      throw new IgniterCollectionError({
        message: "Adapter is required. Use .withAdapter() to configure.",
        code: IGNITER_COLLECTION_ERROR_CODES.ADAPTER_REQUIRED,
        statusCode: 500,
        details: {
          "ctx.package": "@igniter-js/collections",
          "ctx.operation": "build",
        },
      });
    }

    const basePath = Array.isArray(this.state.basePath)
      ? this.state.basePath[0] ?? process.cwd()
      : this.state.basePath ?? process.cwd();

    return new IgniterCollectionManager<TCollections>({
      basePath,
      adapter: this.state.adapter,
      collections: this.state.collections,
      watcherConfig: this.state.watcherConfig,
      views: this.state.views,
      telemetry: this.state.telemetry,
      logger: this.state.logger,
      globalHooks: this.state.globalHooks,
    }) as unknown as IIgniterCollectionsManager<TCollections>;
  }
}

/**
 * Public alias for the main builder.
 *
 * @example
 * ```typescript
 * const docs = IgniterCollections.create()
 *   .withAdapter(adapter)
 *   .addCollection(Posts)
 *   .build();
 * ```
 */
export const IgniterCollections = IgniterCollectionsBuilder;
