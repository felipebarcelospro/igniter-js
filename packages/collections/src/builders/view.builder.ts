/**
 * @fileoverview View builder for @igniter-js/collections
 * @module @igniter-js/collections/builders/view
 *
 * @description
 * Provides a fluent, immutable builder API for defining global collection views.
 * Views are decoupled from collections and have access to the full manager.
 */

import {
  IgniterCollectionError,
  IGNITER_COLLECTION_ERROR_CODES,
} from "../errors/collection.error";
import type {
  IgniterCollectionViewDefinition,
  IgniterCollectionViewDataHook,
  IgniterCollectionViewNode,
  IgniterCollectionViewAction,
} from "../types/view";

/**
 * Internal state for the view builder.
 */
interface ViewBuilderState {
  name: string;
  title?: string;
  description?: string;
  getData?: IgniterCollectionViewDataHook;
  tree: IgniterCollectionViewNode[];
  actions: Map<string, IgniterCollectionViewAction>;
  metadata?: Record<string, any>;
}

/**
 * Immutable builder for defining global collection views.
 *
 * Views are first-class citizens with unrestricted access to the
 * `IIgniterCollectionsManager` via the `getData` hook.
 *
 * @typeParam TName - The literal type of the view name
 *
 * @example Basic view
 * ```typescript
 * const DashboardView = IgniterCollectionView.create('dashboard')
 *   .withTitle('Analytics Dashboard')
 *   .withMetadata({ icon: 'chart', order: 1 })
 *   .withData(async ({ manager }) => {
 *     const posts = await manager.posts.findMany();
 *     return { posts, total: posts.length };
 *   })
 *   .withTree([
 *     { component: 'Metric', valuePath: '/total' },
 *     { component: 'Table', valuePath: '/posts' },
 *   ])
 *   .build();
 * ```
 *
 * @example View with actions
 * ```typescript
 * const DashboardView = IgniterCollectionView.create('dashboard')
 *   .withTitle('Dashboard')
 *   .withData(async ({ manager }) => ({ posts: [] }))
 *   .addAction('export', {
 *     description: 'Export to CSV',
 *     handler: async ({ manager, params }) => ({ success: true }),
 *   })
 *   .build();
 * ```
 */
export class IgniterCollectionViewBuilder<
  TName extends string = string,
> {
  /**
   * Private constructor - use static create() method.
   */
  private constructor(private readonly state: ViewBuilderState) {}

  /**
   * Create a new view builder.
   *
   * @param name - Unique view name (used for manager access)
   * @returns New builder instance
   */
  static create<TName extends string>(
    name: TName
  ): IgniterCollectionViewBuilder<TName> {
    return new IgniterCollectionViewBuilder({
      name,
      tree: [],
      actions: new Map(),
    });
  }

  /**
   * Set the human-readable title for this view.
   *
   * @param title - Display title
   * @returns New builder instance
   */
  withTitle(title: string): IgniterCollectionViewBuilder<TName> {
    return new IgniterCollectionViewBuilder({
      ...this.state,
      title,
    });
  }

  /**
   * Set the description for this view.
   *
   * @param description - View description
   * @returns New builder instance
   */
  withDescription(
    description: string
  ): IgniterCollectionViewBuilder<TName> {
    return new IgniterCollectionViewBuilder({
      ...this.state,
      description,
    });
  }

  /**
   * Set free-form metadata for this view.
   *
   * Useful for UI properties like icon, order, color, category, etc.
   *
   * @param metadata - Arbitrary key-value metadata
   * @returns New builder instance
   *
   * @example
   * ```typescript
   * .withMetadata({ icon: 'chart', order: 1, color: 'blue' })
   * ```
   */
  withMetadata(
    metadata: Record<string, any>
  ): IgniterCollectionViewBuilder<TName> {
    return new IgniterCollectionViewBuilder({
      ...this.state,
      metadata: { ...this.state.metadata, ...metadata },
    });
  }

  /**
   * Set the data hook for this view.
   *
   * The hook receives the full `IIgniterCollectionsManager` and can
   * access any collection. This is **mandatory** for global views.
   *
   * Returns any data structure — the developer controls the shape.
   *
   * @param hook - Data hook function
   * @returns New builder instance
   */
  withData(
    hook: IgniterCollectionViewDataHook
  ): IgniterCollectionViewBuilder<TName> {
    return new IgniterCollectionViewBuilder({
      ...this.state,
      getData: hook,
    });
  }

  /**
   * Set the UI component tree for this view.
   *
   * @param tree - Array of component nodes
   * @returns New builder instance
   */
  withTree(
    tree: IgniterCollectionViewNode[]
  ): IgniterCollectionViewBuilder<TName> {
    return new IgniterCollectionViewBuilder({
      ...this.state,
      tree,
    });
  }

  /**
   * Add an action to this view.
   *
   * @param name - Action identifier
   * @param action - Action configuration
   * @returns New builder instance
   */
  addAction(
    name: string,
    action: IgniterCollectionViewAction
  ): IgniterCollectionViewBuilder<TName> {
    const newActions = new Map(this.state.actions);
    newActions.set(name, action);
    return new IgniterCollectionViewBuilder({
      ...this.state,
      actions: newActions,
    });
  }

  /**
   * Build the view definition.
   *
   * @returns Immutable view definition
   * @throws IgniterCollectionError if `getData` is not configured
   */
  build(): IgniterCollectionViewDefinition {
    if (!this.state.getData) {
      throw new IgniterCollectionError({
        message: `View "${this.state.name}" is missing required getData hook. Use .withData() to configure.`,
        code: IGNITER_COLLECTION_ERROR_CODES.VIEW_INVALID_CONFIGURATION,
        statusCode: 400,
        details: {
          "ctx.package": "@igniter-js/collections",
          "ctx.operation": "build",
          "ctx.view": this.state.name,
        },
      });
    }

    return {
      name: this.state.name,
      title: this.state.title ?? this.state.name,
      description: this.state.description,
      getData: this.state.getData,
      tree: this.state.tree,
      actions: Object.fromEntries(this.state.actions),
      metadata: this.state.metadata,
    };
  }
}

/**
 * Public alias for the view builder.
 *
 * @example
 * ```typescript
 * const DashboardView = IgniterCollectionView.create('dashboard')
 *   .withTitle('Analytics Dashboard')
 *   .withMetadata({ icon: 'chart' })
 *   .withData(async ({ manager }) => {
 *     const posts = await manager.posts.findMany();
 *     return { posts, total: posts.length };
 *   })
 *   .build();
 * ```
 */
export const IgniterCollectionView = IgniterCollectionViewBuilder;
