/**
 * @fileoverview View manager for @igniter-js/collections
 * @module @igniter-js/collections/core/view-manager
 * 
 * @description
 * Handles rendering, action execution, and data processing for collection views.
 * Supports declarative stats, transforms, and custom data hooks.
 */

import type { IgniterLogger } from "@igniter-js/common";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import {
  IgniterCollectionError,
  IGNITER_COLLECTION_ERROR_CODES
} from "../errors/collection.error";
import type {
  IIgniterCollectionModel,
  IIgniterCollectionsManager
} from "../types/manager";
import type {
  IgniterCollectionViewActionHandler,
  IgniterCollectionViewActionResult,
  IgniterCollectionViewDataHook,
  IgniterCollectionViewDataHookResult,
  IgniterCollectionViewDefinition,
  IgniterCollectionViewRenderOptions,
  IgniterCollectionViewRenderResult,
  IIgniterCollectionViewManager,
  IgniterCollectionViewQuery
} from "../types/view";
import { IgniterCollectionViewStatsCalculator } from "../utils/view-stats";
import { IgniterCollectionViewTransformEngine } from "../utils/view-transforms";
import { StdSchema } from "../utils/schema";
import { IgniterCollectionPath } from "../utils/path";
import type { IgniterCollectionTelemetryEventsType } from "../telemetry";

/**
 * Manager for collection views with automatic type inference.
 * Handles listing, retrieval, and rendering of views.
 */
export class IgniterCollectionViewManager<
  TSchema extends Record<string, any> = Record<string, any>,
  TViews extends Record<string, IgniterCollectionViewDefinition> = Record<string, IgniterCollectionViewDefinition>
> implements IIgniterCollectionViewManager<TSchema, TViews> {

  private readonly views: Map<string, IgniterCollectionViewDefinition>;
  private readonly collection: IIgniterCollectionModel<TSchema, TViews>;
  private readonly logger?: IgniterLogger;
  private readonly hookCache: Map<string, IgniterCollectionViewDataHook>;
  private readonly handlerCache: Map<string, IgniterCollectionViewActionHandler>;

  constructor(config: {
    views: IgniterCollectionViewDefinition[];
    collection: IIgniterCollectionModel<TSchema, TViews>;
    logger?: IgniterLogger;
  }) {
    this.views = new Map(config.views.map(v => [v.name, v]));
    this.collection = config.collection;
    this.logger = config.logger;
    this.hookCache = new Map();
    this.handlerCache = new Map();
  }

  /**
   * Internal access to telemetry manager if available.
   */
  private get telemetry(): IgniterTelemetryManager<IgniterCollectionTelemetryEventsType> | undefined {
    return this.collection.telemetry;
  }

  /**
   * List all views.
   */
  list(): IgniterCollectionViewDefinition[] {
    return Array.from(this.views.values());
  }

  /**
   * Get a specific view (type-safe).
   */
  get<K extends keyof TViews>(name: K): TViews[K] | undefined {
    return this.views.get(name as string) as TViews[K] | undefined;
  }

  /**
   * Render a view with data (type-safe).
   */
  async render<K extends keyof TViews>(
    name: K,
    options?: IgniterCollectionViewRenderOptions
  ): Promise<IgniterCollectionViewRenderResult> {
    const startTime = Date.now();
    const view = this.views.get(name as string);

    if (!view) {
      this.telemetry?.emit('igniter.collections.view.render.error', {
        attributes: {
          'ctx.collection.name': this.collection.definition.name,
          'ctx.view.name': String(name),
          'ctx.error.code': 'COLLECTION_VIEW_NOT_FOUND',
          'ctx.error.message': `View not found: ${String(name)}`
        }
      });

      throw new IgniterCollectionError({
        message: `View not found: ${String(name)}`,
        code: IGNITER_COLLECTION_ERROR_CODES.VIEW_NOT_FOUND,
        statusCode: 404,
        details: {
          'ctx.package': '@igniter-js/collections',
          'ctx.operation': 'render',
          'ctx.collection': this.collection.definition.name,
          'ctx.view': String(name)
        }
      });
    }

    // Emit started event
    this.telemetry?.emit('igniter.collections.view.render.started', {
      attributes: {
        'ctx.collection.name': this.collection.definition.name,
        'ctx.view.name': view.name,
        'ctx.has_hook': !!view.getData,
        'ctx.has_stats': !!view.stats,
        'ctx.has_transforms': !!(view.transforms && view.transforms.length > 0)
      }
    });

    try {
      let result: IgniterCollectionViewRenderResult;

      // Execute render flow
      if (view.getData) {
        result = await this.renderWithHook(view, options);
      } else {
        result = await this.renderStandard(view, options);
      }

      // Emit success event
      this.telemetry?.emit('igniter.collections.view.render.success', {
        attributes: {
          'ctx.collection.name': this.collection.definition.name,
          'ctx.view.name': view.name,
          'ctx.duration_ms': Date.now() - startTime,
          'ctx.items.count': result.data.items.length,
          'ctx.stats.count': Object.keys(result.data.stats).length
        }
      });

      return result;
    } catch (error) {
      // Emit error event
      this.telemetry?.emit('igniter.collections.view.render.error', {
        attributes: {
          'ctx.collection.name': this.collection.definition.name,
          'ctx.view.name': view.name,
          'ctx.error.code': error instanceof IgniterCollectionError ? error.code : 'UNKNOWN',
          'ctx.error.message': error instanceof Error ? error.message : String(error)
        }
      });

      throw error;
    }
  }

  /**
   * List all actions for a view.
   */
  listActions(viewId: keyof TViews): string[] {
    const view = this.views.get(viewId as string);
    if (!view || !view.actions) {
      return [];
    }
    return Object.keys(view.actions);
  }

  /**
   * Execute a view action with parameter validation.
   */
  async executeAction<TParams = any, TResult = any>(
    viewId: keyof TViews,
    actionId: string,
    params: TParams
  ): Promise<IgniterCollectionViewActionResult<TResult>> {
    // Telemetry: action started
    this.telemetry?.emit('igniter.collections.view.action.started', {
      attributes: {
        'ctx.collection.name': this.collection.definition.name,
        'ctx.view.name': String(viewId),
        'ctx.action.name': actionId,
        'ctx.action.params_size': JSON.stringify(params).length
      }
    });

    const startTime = Date.now();

    try {
      // Get view and action
      const view = this.views.get(viewId as string);
      if (!view) {
        throw new IgniterCollectionError({
          message: `View not found: ${String(viewId)}`,
          code: IGNITER_COLLECTION_ERROR_CODES.VIEW_NOT_FOUND,
          statusCode: 404,
          details: {
            'ctx.package': '@igniter-js/collections',
            'ctx.operation': 'executeAction',
            'ctx.collection': this.collection.definition.name,
            'ctx.view': String(viewId)
          }
        });
      }

      const action = view.actions?.[actionId];
      if (!action) {
        throw new IgniterCollectionError({
          message: `Action not found: ${actionId}`,
          code: IGNITER_COLLECTION_ERROR_CODES.ACTION_NOT_FOUND,
          statusCode: 404,
          details: {
            'ctx.package': '@igniter-js/collections',
            'ctx.operation': 'executeAction',
            'ctx.collection': this.collection.definition.name,
            'ctx.view': String(viewId),
            'ctx.action': actionId
          }
        });
      }

      // Validate parameters (if schema provided)
      if (action.params) {
        const validator = StdSchema.create(action.params);
        const validationResult = await validator.validate(params);
        if (validationResult.issues) {
          throw new IgniterCollectionError({
            message: `Invalid action parameters for "${actionId}"`,
            code: IGNITER_COLLECTION_ERROR_CODES.ACTION_INVALID_PARAMS,
            statusCode: 400,
            details: {
              'ctx.package': '@igniter-js/collections',
              'ctx.operation': 'executeAction',
              'ctx.collection': this.collection.definition.name,
              'ctx.view': String(viewId),
              'ctx.action': actionId,
              'ctx.validation.errors': validationResult.issues
            }
          });
        }
      }

      // Load action handler
      const handler = await this.loadActionHandler(action.handler);

      // Execute action
      const result = await handler({
        manager: this.collection.manager,
        view,
        actionId,
        params
      });

      // Telemetry: action success
      const duration = Date.now() - startTime;
      this.telemetry?.emit('igniter.collections.view.action.success', {
        attributes: {
          'ctx.collection.name': this.collection.definition.name,
          'ctx.view.name': String(viewId),
          'ctx.action.name': actionId,
          'ctx.action.duration_ms': duration,
          'ctx.action.success': result.success
        }
      });

      return result;

    } catch (error) {
      // Telemetry: action error
      const duration = Date.now() - startTime;
      this.telemetry?.emit('igniter.collections.view.action.error', {
        attributes: {
          'ctx.collection.name': this.collection.definition.name,
          'ctx.view.name': String(viewId),
          'ctx.action.name': actionId,
          'ctx.action.duration_ms': duration,
          'ctx.error.code': error instanceof IgniterCollectionError ? error.code : 'UNKNOWN',
          'ctx.error.message': error instanceof Error ? error.message : String(error)
        }
      });

      throw error;
    }
  }

  /**
   * Load action handler from file or inline function.
   */
  private async loadActionHandler(
    handler: string | IgniterCollectionViewActionHandler
  ): Promise<IgniterCollectionViewActionHandler> {
    if (typeof handler === 'function') {
      return handler;
    }

    if (this.handlerCache.has(handler)) {
      return this.handlerCache.get(handler)!;
    }

    // Load from file
    const handlerPath = this.resolveHandlerPath(handler);
    const module = await import(handlerPath);

    // Support default export or named export
    const actionHandler = module.default || module.handler || module[this.extractName(handler)];

    if (typeof actionHandler !== 'function') {
      throw new IgniterCollectionError({
        message: `Action handler file does not export a valid function: ${handler}`,
        code: IGNITER_COLLECTION_ERROR_CODES.HOOK_INVALID,
        statusCode: 500,
        details: {
          'ctx.package': '@igniter-js/collections',
          'ctx.operation': 'loadActionHandler',
          'ctx.handler_path': handler
        }
      });
    }

    this.handlerCache.set(handler, actionHandler);
    return actionHandler;
  }

  /**
   * Render using data hook.
   */
  private async renderWithHook(
    view: IgniterCollectionViewDefinition,
    options?: IgniterCollectionViewRenderOptions
  ): Promise<IgniterCollectionViewRenderResult> {
    // Load hook
    const hook = await this.loadHook(view.getData!);

    // Fetch base items
    const queryArgs = this.mergeQueries(view.defaultQuery, options);
    const baseItems = await this.collection.findMany(queryArgs);

    // Execute hook with proper error handling
    let hookResult: IgniterCollectionViewDataHookResult;
    const hookStartTime = Date.now();

    try {
      hookResult = await hook({
        manager: this.collection.manager,
        collection: this.collection,
        options,
        items: baseItems,
        stats: {}
      });

      this.telemetry?.emit('igniter.collections.view.hook.executed', {
        attributes: {
          'ctx.collection.name': this.collection.definition.name,
          'ctx.view.name': view.name,
          'ctx.hook.type': typeof view.getData === 'string' ? 'file' : 'inline',
          'ctx.duration_ms': Date.now() - hookStartTime
        }
      });
    } catch (error) {
      throw new IgniterCollectionError({
        message: `Hook execution failed for view "${view.name}"`,
        code: IGNITER_COLLECTION_ERROR_CODES.HOOK_EXECUTION_FAILED,
        statusCode: 500,
        cause: error instanceof Error ? error : undefined,
        details: {
          'ctx.package': '@igniter-js/collections',
          'ctx.operation': 'renderWithHook',
          'ctx.collection': this.collection.definition.name,
          'ctx.view': view.name,
          'ctx.hook': typeof view.getData === 'string' ? view.getData : 'inline',
          'ctx.error.message': error instanceof Error ? error.message : String(error),
          'ctx.error.stack': error instanceof Error ? error.stack : undefined
        }
      });
    }

    // Calculate declarative stats (complement hook stats)
    const statsStartTime = Date.now();
    const declarativeStats = view.stats
      ? IgniterCollectionViewStatsCalculator.calculate(
        hookResult.items,
        view.stats
      )
      : {};

    if (view.stats) {
      this.telemetry?.emit('igniter.collections.view.stats.calculated', {
        attributes: {
          'ctx.collection.name': this.collection.definition.name,
          'ctx.view.name': view.name,
          'ctx.stats.count': Object.keys(declarativeStats).length,
          'ctx.items.count': hookResult.items.length,
          'ctx.duration_ms': Date.now() - statsStartTime
        }
      });
    }

    return {
      view,
      data: {
        items: hookResult.items,
        stats: { ...declarativeStats, ...hookResult.stats },
        extra: hookResult.extra,
        meta: {
          total: hookResult.items.length,
          query: queryArgs
        }
      },
      renderedAt: new Date().toISOString()
    };
  }

  /**
   * Standard render (no hook).
   */
  private async renderStandard(
    view: IgniterCollectionViewDefinition,
    options?: IgniterCollectionViewRenderOptions
  ): Promise<IgniterCollectionViewRenderResult> {
    // Merge queries
    const queryArgs = this.mergeQueries(view.defaultQuery, options);

    // Fetch items
    let items = await this.collection.findMany(queryArgs);

    // Apply transforms
    if (view.transforms && view.transforms.length > 0) {
      items = IgniterCollectionViewTransformEngine.applyTransforms(
        items,
        view.transforms
      );
    }

    // Calculate stats
    const statsStartTime = Date.now();
    const stats = view.stats
      ? IgniterCollectionViewStatsCalculator.calculate(items, view.stats)
      : {};

    if (view.stats) {
      this.telemetry?.emit('igniter.collections.view.stats.calculated', {
        attributes: {
          'ctx.collection.name': this.collection.definition.name,
          'ctx.view.name': view.name,
          'ctx.stats.count': Object.keys(stats).length,
          'ctx.items.count': items.length,
          'ctx.duration_ms': Date.now() - statsStartTime
        }
      });
    }

    return {
      view,
      data: {
        items,
        stats,
        meta: {
          total: items.length,
          query: queryArgs
        }
      },
      renderedAt: new Date().toISOString()
    };
  }

  /**
   * Load hook from file or return inline function.
   */
  private async loadHook(
    hookDef: string | IgniterCollectionViewDataHook
  ): Promise<IgniterCollectionViewDataHook> {
    if (typeof hookDef === 'function') {
      return hookDef;
    }

    // Check cache
    if (this.hookCache.has(hookDef)) {
      return this.hookCache.get(hookDef)!;
    }

    // Load from file (mirror SchemaRegistry.loadHookModule pattern)
    const absolutePath = this.resolveHookPath(hookDef);
    const module = await import(absolutePath);

    const hook = module.default || module[this.extractName(hookDef)];

    if (typeof hook !== 'function') {
      throw new IgniterCollectionError({
        message: `Hook file does not export a valid function: ${hookDef}`,
        code: IGNITER_COLLECTION_ERROR_CODES.HOOK_INVALID,
        statusCode: 500,
        details: {
          'ctx.package': '@igniter-js/collections',
          'ctx.operation': 'loadHook',
          'ctx.hook_path': hookDef
        }
      });
    }

    this.hookCache.set(hookDef, hook);
    return hook;
  }

  // Helper methods...
  private mergeQueries(
    defaultQuery?: IgniterCollectionViewQuery,
    options?: IgniterCollectionViewRenderOptions
  ): any {
    return {
      where: { ...(defaultQuery?.where || {}), ...(options?.where || {}) },
      orderBy: options?.orderBy || defaultQuery?.orderBy,
      take: options?.take || defaultQuery?.take,
      skip: options?.skip || defaultQuery?.skip
    };
  }

  /**
   * Resolve hook path relative to collection.
   */
  private resolveHookPath(relativePath: string): string {
    // If absolute path, return as-is
    if (relativePath.startsWith("/")) {
      return relativePath;
    }

    // In the new patterns-only model, we don't have a single collection-level basePath.
    // We resolve relative to the manager's basePath which is available in the model manager.
    const modelManager = this.collection as any;
    const basePath = modelManager.basePath || "";

    return IgniterCollectionPath.resolve(basePath, relativePath);
  }

  /**
   * Resolve action handler path relative to schema file location.
   */
  private resolveHandlerPath(relativePath: string): string {
    // Same logic as hooks for now
    return this.resolveHookPath(relativePath);
  }

  /**
   * Extract hook/handler function name from file path.
   * Defaults to 'default' export or camelCased view name.
   */
  private extractName(filePath: string): string {
    const fileName = filePath.split('/').pop()?.replace(/\.(ts|js)$/, '');
    if (!fileName) return 'default';

    // Convert kebab-case to camelCase
    return fileName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}
