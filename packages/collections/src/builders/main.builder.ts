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
  IgniterCollectionSchemaRegistryOptions,
} from "../types/builder";
import type {
  IgniterCollectionModelDefinition,
  IgniterCollectionModelHooks,
} from "../types/collection";
import type { IIgniterCollectionModel, IIgniterCollectionsManager } from "../types/manager";

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
   * Set the path(s) to schema registry JSON files.
   *
   * When set, collections can be loaded from JSON schema files.
   *
   * @param path - Path or array of paths to schema directory
   * @param options - Optional configuration for schema registry
   * @returns New builder instance
   *
   * @example Without auto-watch (default)
   * ```typescript
   * .withSchemaRegistry('.fractal/schemas')
   * ```
   *
   * @example With multiple paths and globs
   * ```typescript
   * .withSchemaRegistry(['.fractal/schemas', 'plugins/*\/schemas'])
   * ```
   *
   * @example With auto-watch enabled
   * ```typescript
   * .withSchemaRegistry('.fractal/schemas', { autoWatch: true })
   * ```
   */
  withSchemaRegistry(
    path: string | string[],
    options?: IgniterCollectionSchemaRegistryOptions
  ): IgniterCollectionsBuilder<
    TCollections & {
      [key: string]: IgniterCollectionModelDefinition<Record<string, any>, any>;
    }
  > {
    return new IgniterCollectionsBuilder({
      ...this.state,
      schemaRegistryPath: path,
      schemaRegistryOptions: options,
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
  addCollection<TSchema extends Record<string, any>, TViews extends Record<string, any>, TName extends string>(
    collection: IgniterCollectionModelDefinition<TSchema, TViews, TName>
  ): IgniterCollectionsBuilder<
    TCollections & { [K in TName]: IgniterCollectionModelDefinition<TSchema, TViews, TName> }
  > {
    return new IgniterCollectionsBuilder({
      ...this.state,
      collections: {
        ...this.state.collections,
        [collection.name]: collection,
      } as TCollections & {
        [K in TName]: IgniterCollectionModelDefinition<TSchema, TViews, TName>;
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
      schemaRegistryPath: this.state.schemaRegistryPath,
      schemaAutoWatch: this.state.schemaRegistryOptions?.autoWatch,
      schemaFilePattern: this.state.schemaRegistryOptions?.filePattern,
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
