import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { IIgniterCollectionModel, IIgniterCollectionsManager } from './manager';
import type { NormalizeSchema } from './query';

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
  
  /** Default query options for this view */
  defaultQuery?: IgniterCollectionViewQuery;
  
  /** Declarative stats definitions */
  stats?: IgniterCollectionViewStats;
  
  /** Custom data processing hook (file path or function) */
  getData?: string | IgniterCollectionViewDataHook;
  
  /** Data transformations to apply */
  transforms?: IgniterCollectionViewTransform[];
  
  /** Actions available for this view (compatible with json-render) */
  actions?: Record<string, IgniterCollectionViewAction>;
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
 * Stats definitions (keyed by stat name).
 */
export interface IgniterCollectionViewStats {
  [statName: string]: IgniterCollectionViewStatDefinition;
}

/**
 * Single stat definition.
 */
export type IgniterCollectionViewStatDefinition =
  | IgniterCollectionViewStatCount
  | IgniterCollectionViewStatAggregate
  | IgniterCollectionViewStatCustom;

export interface IgniterCollectionViewStatCount {
  type: 'count';
  where?: Record<string, any>;
}

export interface IgniterCollectionViewStatAggregate {
  type: 'sum' | 'avg' | 'min' | 'max';
  field: string;
  where?: Record<string, any>;
}

export interface IgniterCollectionViewStatCustom {
  type: 'custom';
  expression: string;
}

/**
 * Transform definition.
 */
export interface IgniterCollectionViewTransform {
  type: 'group' | 'flatten' | 'pivot';
  field?: string;
  config?: Record<string, any>;
}

/**
 * Context provided to data hooks.
 */
export interface IgniterCollectionViewDataHookContext<TSchema = any> {
  /** Global collections manager (access to all collections) */
  manager: IIgniterCollectionsManager;

  /** Current collection model */
  collection: IIgniterCollectionModel<NormalizeSchema<TSchema>>;

  /** User-provided query options */
  options?: IgniterCollectionViewQuery;
  
  /** Base items from standard query (if hook is post-process) */
  items?: any[];
  
  /** Base stats calculated (if hook is post-process) */
  stats?: Record<string, any>;
}

/**
 * Data hook function signature.
 */
export type IgniterCollectionViewDataHook<TSchema = any> = (
  context: IgniterCollectionViewDataHookContext<TSchema>
) => Promise<IgniterCollectionViewDataHookResult>;

/**
 * Result from data hook execution.
 */
export interface IgniterCollectionViewDataHookResult {
  /** Processed items */
  items: any[];
  
  /** Additional/overridden stats */
  stats?: Record<string, any>;
  
  /** Extra data (e.g., from external APIs) */
  extra?: Record<string, any>;
}

/**
 * Final render result returned to user.
 * Supports type inference for items, stats, and extra data.
 */
export interface IgniterCollectionViewRenderResult<
  TSchema = any,
  TStats extends Record<string, any> = Record<string, any>,
  TExtra extends Record<string, any> = Record<string, any>
> {
  /** View definition */
  view: IgniterCollectionViewDefinition;
  
  /** Rendered data */
  data: {
    /** Collection items (typed by TSchema) */
    items: TSchema[];
    
    /** Calculated stats (typed by TStats) */
    stats: TStats;
    
    /** Extra data from hooks */
    extra?: Record<string, any>;
    
    /** Metadata */
    meta: {
      total: number;
      query?: IgniterCollectionViewQuery;
    };
  };
  
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
 * Interface for the view manager with automatic type inference.
 * TViews is a mapped type from view names to their definitions.
 */
export interface IIgniterCollectionViewManager<
  TSchema = any,
  TViews extends Record<string, IgniterCollectionViewDefinition> = Record<string, IgniterCollectionViewDefinition>
> {
  /**
   * List all views for this collection.
   */
  list(): IgniterCollectionViewDefinition[];
  
  /**
   * Get a specific view by name (type-safe).
   * 
   * @param name - View name (autocompleted from TViews keys)
   * @returns View definition or undefined if not found
   */
  get<K extends keyof TViews>(name: K): TViews[K] | undefined;
  
  /**
   * Render a view with data (type-safe).
   * 
   * @param name - View name (autocompleted from TViews keys)
   * @param options - Optional query overrides
   * @returns Rendered view result with data
   */
  render<K extends keyof TViews>(
    name: K,
    options?: IgniterCollectionViewRenderOptions
  ): Promise<IgniterCollectionViewRenderResult>;
  
  /**
   * List available actions for a view.
   * 
   * @param viewId - View name
   * @returns Array of action IDs
   */
  listActions(viewId: keyof TViews): string[];
  
  /**
   * Execute an action with validated parameters.
   * 
   * @param viewId - View name
   * @param actionId - Action identifier
   * @param params - Action parameters (validated against action schema)
   * @returns Action execution result
   */
  executeAction<TParams = any, TResult = any>(
    viewId: keyof TViews,
    actionId: string,
    params: TParams
  ): Promise<IgniterCollectionViewActionResult<TResult>>;
}
