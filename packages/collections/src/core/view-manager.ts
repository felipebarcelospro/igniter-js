/**
 * @fileoverview View manager for @igniter-js/collections
 * @module @igniter-js/collections/core/view-manager
 *
 * @description
 * Handles rendering, action execution, and data processing for global views.
 * Views have unrestricted access to the full IIgniterCollectionsManager.
 */

import type { IgniterLogger } from "@igniter-js/common";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import {
  IgniterCollectionError,
  IGNITER_COLLECTION_ERROR_CODES
} from "../errors/collection.error";
import type {
  IIgniterCollectionsManagerFull
} from "../types/manager";
import type {
  IgniterCollectionViewActionHandler,
  IgniterCollectionViewActionResult,
  IgniterCollectionViewDataHook,
  IgniterCollectionViewDefinition,
  IgniterCollectionViewRenderOptions,
  IgniterCollectionViewRenderResult,
  IIgniterCollectionViewManager,
  IIgniterCollectionViewManagerInternal,
  IIgniterCollectionViewInstance,
} from "../types/view";
import { IgniterCollectionViewInstance } from "./view-instance";
import { StdSchema } from "../utils/schema";
import { IgniterCollectionPath } from "../utils/path";
import type { IgniterCollectionTelemetryEventsType } from "../telemetry";

/**
 * Manager for global collection views.
 * Handles listing, retrieval, and rendering of views with multi-collection access.
 */
export class IgniterCollectionViewManager implements IIgniterCollectionViewManagerInternal {

  private readonly views: Map<string, IgniterCollectionViewDefinition>;
  private readonly manager: IIgniterCollectionsManagerFull;
  private readonly logger?: IgniterLogger;
  private readonly hookCache: Map<string, IgniterCollectionViewDataHook>;
  private readonly handlerCache: Map<string, IgniterCollectionViewActionHandler>;

  constructor(config: {
    views: IgniterCollectionViewDefinition[];
    manager: IIgniterCollectionsManagerFull;
    logger?: IgniterLogger;
  }) {
    this.views = new Map(config.views.map(v => [v.name, v]));
    this.manager = config.manager;
    this.logger = config.logger;
    this.hookCache = new Map();
    this.handlerCache = new Map();
  }

  /**
   * Internal access to telemetry manager if available.
   */
  private get telemetry(): IgniterTelemetryManager<IgniterCollectionTelemetryEventsType> | undefined {
    return (this.manager as any).telemetry;
  }

  /**
   * List all views.
   */
  list(): IgniterCollectionViewDefinition[] {
    return Array.from(this.views.values());
  }

  /**
   * Get all registered view definitions as an entries map.
   */
  entries(): Record<string, IgniterCollectionViewDefinition> {
    const result: Record<string, IgniterCollectionViewDefinition> = {};
    for (const [name, view] of this.views.entries()) {
      result[name] = view;
    }
    return result;
  }

  /**
   * Get a specific view instance.
   */
  get(name: string): IIgniterCollectionViewInstance | undefined {
    const view = this.views.get(name);
    if (!view) return undefined;
    return new IgniterCollectionViewInstance(view, this);
  }

  /**
   * Render a view with data.
   */
  async render(
    name: string,
    options?: IgniterCollectionViewRenderOptions
  ): Promise<IgniterCollectionViewRenderResult> {
    const startTime = Date.now();
    const view = this.views.get(name);

    if (!view) {
      this.telemetry?.emit('igniter.collections.view.render.error', {
        attributes: {
          'ctx.view.name': name,
          'ctx.error.code': 'VIEW_NOT_FOUND',
          'ctx.error.message': `View not found: ${name}`
        }
      });

      throw new IgniterCollectionError({
        message: `View not found: ${name}`,
        code: IGNITER_COLLECTION_ERROR_CODES.VIEW_NOT_FOUND,
        statusCode: 404,
        details: {
          'ctx.package': '@igniter-js/collections',
          'ctx.operation': 'render',
          'ctx.view': name
        }
      });
    }

    // Emit started event
    this.telemetry?.emit('igniter.collections.view.render.started', {
      attributes: {
        'ctx.view.name': view.name,
        'ctx.has_hook': !!view.getData,
        'ctx.has_actions': !!view.actions && Object.keys(view.actions).length > 0
      }
    });

    try {
      let result: IgniterCollectionViewRenderResult;

      // Execute render flow
      if (view.getData) {
        result = await this.renderWithHook(view, options);
      } else {
        throw new IgniterCollectionError({
          message: `View "${view.name}" is missing required getData hook`,
          code: IGNITER_COLLECTION_ERROR_CODES.VIEW_INVALID_CONFIGURATION,
          statusCode: 500,
          details: {
            'ctx.package': '@igniter-js/collections',
            'ctx.operation': 'render',
            'ctx.view': view.name,
          }
        });
      }

      // Emit success event
      this.telemetry?.emit('igniter.collections.view.render.success', {
        attributes: {
          'ctx.view.name': view.name,
          'ctx.duration_ms': Date.now() - startTime,
        }
      });

      return result;
    } catch (error) {
      // Emit error event
      this.telemetry?.emit('igniter.collections.view.render.error', {
        attributes: {
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
  listActions(viewId: string): string[] {
    const view = this.views.get(viewId);
    if (!view || !view.actions) {
      return [];
    }
    return Object.keys(view.actions);
  }

  /**
   * Execute a view action with parameter validation.
   */
  async executeAction<TParams = any, TResult = any>(
    viewId: string,
    actionId: string,
    params: TParams
  ): Promise<IgniterCollectionViewActionResult<TResult>> {
    // Telemetry: action started
    this.telemetry?.emit('igniter.collections.view.action.started', {
      attributes: {
        'ctx.view.name': viewId,
        'ctx.action.name': actionId,
        'ctx.action.params_size': JSON.stringify(params).length
      }
    });

    const startTime = Date.now();

    try {
      // Get view and action
      const view = this.views.get(viewId);
      if (!view) {
        throw new IgniterCollectionError({
          message: `View not found: ${viewId}`,
          code: IGNITER_COLLECTION_ERROR_CODES.VIEW_NOT_FOUND,
          statusCode: 404,
          details: {
            'ctx.package': '@igniter-js/collections',
            'ctx.operation': 'executeAction',
            'ctx.view': viewId
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
            'ctx.view': viewId,
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
              'ctx.view': viewId,
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
        manager: this.manager,
        view,
        actionId,
        params
      });

      // Telemetry: action success
      const duration = Date.now() - startTime;
      this.telemetry?.emit('igniter.collections.view.action.success', {
        attributes: {
          'ctx.view.name': viewId,
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
          'ctx.view.name': viewId,
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
   * Returns whatever the hook returns — no transforms or stats applied.
   */
  private async renderWithHook(
    view: IgniterCollectionViewDefinition,
    options?: IgniterCollectionViewRenderOptions
  ): Promise<IgniterCollectionViewRenderResult> {
    // Load hook
    const hook = await this.loadHook(view.getData!);

    // Execute hook
    const hookStartTime = Date.now();
    let hookResult: any;

    try {
      hookResult = await hook({
        manager: this.manager,
        options,
      });

      this.telemetry?.emit('igniter.collections.view.hook.executed', {
        attributes: {
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
          'ctx.view': view.name,
          'ctx.hook': typeof view.getData === 'string' ? view.getData : 'inline',
          'ctx.error.message': error instanceof Error ? error.message : String(error),
          'ctx.error.stack': error instanceof Error ? error.stack : undefined
        }
      });
    }

    return {
      view,
      data: hookResult,
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

    // Load from file
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

  /**
   * Resolve hook path relative to current working directory.
   */
  private resolveHookPath(relativePath: string): string {
    if (relativePath.startsWith("/")) {
      return relativePath;
    }
    return IgniterCollectionPath.resolve(process.cwd(), relativePath);
  }

  /**
   * Resolve action handler path relative to current working directory.
   */
  private resolveHandlerPath(relativePath: string): string {
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
