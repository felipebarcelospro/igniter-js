import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { IIgniterCollectionsManager } from './manager';

/**
 * Definition of a view for a collection.
 * Can be defined in JSON schema or programmatically.
 */
export interface IgniterCollectionViewDefinition {
  /** Unique view name within the collection */
  name: string;

  /** Human-readable title for UI display */
  title: string;

  /** Optional description */
  description?: string;

  /** UI component tree (json-render compatible) */
  tree: IgniterCollectionViewNode[];

  /** Custom data processing hook (file path or function) */
  getData?: string | IgniterCollectionViewDataHook;

  /** Actions available for this view (compatible with json-render) */
  actions?: Record<string, IgniterCollectionViewAction>;

  /** Free-form metadata for the view (icon, order, color, etc.) */
  metadata?: Record<string, any>;
  /** Source of the definition: built-in (programmatic) or discovered (watcher) */
  source?: 'built-in' | 'discovered';
}

/**
 * Action definition for a view.
 * Fully compatible with json-render action schema.
 */
export interface IgniterCollectionViewAction {
  /** Zod schema for action parameters (StandardSchemaV1) */
  params?: StandardSchemaV1;

  /** Human-readable description of what this action does */
  description: string;

  /** Action handler (file path or inline function) */
  handler: string | IgniterCollectionViewActionHandler;

  /** Optional confirmation configuration */
  confirm?: {
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'info';
  };
}

/**
 * Action handler function signature.
 */
export type IgniterCollectionViewActionHandler<TParams = any, TResult = any> = (
  context: IgniterCollectionViewActionContext<TParams>
) => Promise<IgniterCollectionViewActionResult<TResult>>;

/**
 * Context provided to action handlers.
 */
export interface IgniterCollectionViewActionContext<TParams = any> {
  /** Global collections manager (access to all collections) */
  manager: IIgniterCollectionsManager;

  /** View that triggered the action */
  view: IgniterCollectionViewDefinition;

  /** Action ID */
  actionId: string;

  /** Validated action parameters */
  params: TParams;
}

/**
 * Result from action execution.
 * Compatible with json-render onSuccess/onError callbacks.
 */
export interface IgniterCollectionViewActionResult<TData = any> {
  /** Success status */
  success: boolean;

  /** Result data */
  data?: TData;

  /** Error message if failed */
  error?: string;

  /** Optional state updates (json-pointer paths) */
  updates?: Record<string, any>;
}

/**
 * Component node in the view tree.
 * Compatible with json-render structure.
 */
export interface IgniterCollectionViewNode {
  /** Component type (e.g., "Metric", "Table", "Chart") */
  component: string;

  /** Component props */
  props?: Record<string, any>;

  /** JSON Pointer to data (e.g., "/stats/totalCount") */
  valuePath?: string;

  /** Nested children components */
  children?: IgniterCollectionViewNode[];
}

/**
 * Query options for view data fetching.
 */
export interface IgniterCollectionViewQuery {
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  take?: number;
  skip?: number;
}

/**
 * Context provided to data hooks for global views.
 */
export interface IgniterCollectionViewDataHookContext {
  /** Global collections manager (access to all collections) */
  manager: IIgniterCollectionsManager;

  /** User-provided query options */
  options?: IgniterCollectionViewQuery;
}

/**
 * Data hook function signature for global views.
 * Returns any data structure — the developer controls the shape.
 */
export type IgniterCollectionViewDataHook = (
  context: IgniterCollectionViewDataHookContext
) => Promise<any>;

/**
 * Final render result returned to user.
 */
export interface IgniterCollectionViewRenderResult {
  /** View definition */
  view: IgniterCollectionViewDefinition;

  /** Rendered data (free-form, controlled by getData hook) */
  data: any;

  /** Timestamp of render */
  renderedAt: string;
}

/**
 * Options for rendering a view.
 */
export interface IgniterCollectionViewRenderOptions {
  /** Override default where clause */
  where?: Record<string, any>;

  /** Override default orderBy */
  orderBy?: Record<string, 'asc' | 'desc'>;

  /** Override default take */
  take?: number;

  /** Skip for pagination */
  skip?: number;
}

/**
 * View action accessor interface.
 */
export interface IIgniterCollectionViewActions {
  /**
   * List available action IDs for this view.
   */
  list(): string[];

  /**
   * Execute an action with validated parameters.
   *
   * @param actionId - Action identifier
   * @param params - Action parameters
   * @returns Action execution result
   */
  execute<TParams = any, TResult = any>(
    actionId: string,
    params: TParams
  ): Promise<IgniterCollectionViewActionResult<TResult>>;
}

/**
 * Active view instance with render and action capabilities.
 */
export interface IIgniterCollectionViewInstance {
  /** View definition */
  readonly definition: IgniterCollectionViewDefinition;

  /** Render the view with optional query overrides */
  render(options?: IgniterCollectionViewRenderOptions): Promise<IgniterCollectionViewRenderResult>;

  /** View actions accessor */
  readonly actions: IIgniterCollectionViewActions;
}

/**
 * Public interface for the global view manager.
 *
 * Only exposes namespace methods (get, list, entries).
 * Internal methods (render, executeAction, listActions) are hidden
 * from IntelliSense via IIgniterCollectionViewManagerInternal.
 */
export interface IIgniterCollectionViewManager {
  /**
   * List all registered view definitions.
   */
  list(): IgniterCollectionViewDefinition[];

  /**
   * Get all registered view definitions as an entries map.
   */
  entries(): Record<string, IgniterCollectionViewDefinition>;

  /**
   * Get a specific view instance by name.
   *
   * @param name - View name
   * @returns View instance or undefined if not found
   */
  get(name: string): IIgniterCollectionViewInstance | undefined;
}

/**
 * Internal interface extending the public view manager.
 *
 * These methods exist on the runtime object but are not exposed
 * in the public type to keep IntelliSense clean.
 *
 * @internal
 */
export interface IIgniterCollectionViewManagerInternal
  extends IIgniterCollectionViewManager {
  /**
   * Render a view with data.
   *
   * @param name - View name
   * @param options - Optional query overrides
   * @returns Rendered view result with data
   */
  render(
    name: string,
    options?: IgniterCollectionViewRenderOptions
  ): Promise<IgniterCollectionViewRenderResult>;

  /**
   * List available actions for a view.
   *
   * @param viewId - View name
   * @returns Array of action IDs
   */
  listActions(viewId: string): string[];

  /**
   * Execute an action with validated parameters.
   *
   * @param viewId - View name
   * @param actionId - Action identifier
   * @param params - Action parameters
   * @returns Action execution result
   */
  executeAction<TParams = any, TResult = any>(
    viewId: string,
    actionId: string,
    params: TParams
  ): Promise<IgniterCollectionViewActionResult<TResult>>;
}
