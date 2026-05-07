/**
 * @fileoverview View instance for @igniter-js/collections
 * @module @igniter-js/collections/core/view-instance
 */

import type {
  IIgniterCollectionViewInstance,
  IIgniterCollectionViewActions,
  IIgniterCollectionViewManagerInternal,
  IgniterCollectionViewDefinition,
  IgniterCollectionViewRenderOptions,
  IgniterCollectionViewRenderResult,
  IgniterCollectionViewActionResult,
} from "../types/view";

/**
 * Active view instance with render and action capabilities.
 */
export class IgniterCollectionViewInstance implements IIgniterCollectionViewInstance {
  readonly definition: IgniterCollectionViewDefinition;
  readonly actions: IIgniterCollectionViewActions;

  constructor(
    definition: IgniterCollectionViewDefinition,
    private readonly viewManager: IIgniterCollectionViewManagerInternal,
  ) {
    this.definition = definition;
    this.actions = new IgniterCollectionViewActions(definition.name, viewManager);
  }

  /**
   * Render the view with optional query overrides.
   */
  render(options?: IgniterCollectionViewRenderOptions): Promise<IgniterCollectionViewRenderResult> {
    return this.viewManager.render(this.definition.name, options);
  }
}

/**
 * View actions accessor.
 */
class IgniterCollectionViewActions implements IIgniterCollectionViewActions {
  constructor(
    private readonly viewName: string,
    private readonly viewManager: IIgniterCollectionViewManagerInternal,
  ) {}

  /**
   * List available action IDs for this view.
   */
  list(): string[] {
    return this.viewManager.listActions(this.viewName);
  }

  /**
   * Execute an action with validated parameters.
   */
  execute<TParams = any, TResult = any>(
    actionId: string,
    params: TParams
  ): Promise<IgniterCollectionViewActionResult<TResult>> {
    return this.viewManager.executeAction(this.viewName, actionId, params);
  }
}
