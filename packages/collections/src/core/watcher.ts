/**
 * @fileoverview Watcher namespace for @igniter-js/collections
 * @module @igniter-js/collections/core/watcher
 */

import type { IIgniterCollectionWatcher } from "../types/manager";
import type { IgniterCollectionSchemaRegistry } from "./schema-registry";
import type { IgniterCollectionViewRegistry } from "./view-registry";

/**
 * Watcher namespace exposing start/stop/isWatching.
 * Wraps the internal schema and view registries.
 */
export class IgniterCollectionWatcher implements IIgniterCollectionWatcher {
  constructor(
    private readonly schemaRegistry: IgniterCollectionSchemaRegistry | undefined,
    private readonly viewRegistry: IgniterCollectionViewRegistry | undefined,
    private readonly refreshFn: () => Promise<void>,
    private readonly addCollectionManagerFn: (name: string, definition: any) => void,
  ) {}

  /**
   * Start watching files for changes.
   */
  async start(): Promise<boolean> {
    if (!this.schemaRegistry && !this.viewRegistry) {
      return false;
    }

    // Initial load
    await this.refreshFn();

    // Start schema watching
    this.schemaRegistry?.startWatching((event, name) => {
      if (event === "added") {
        const definition = this.schemaRegistry?.getCollection(name);
        if (definition) {
          this.addCollectionManagerFn(name, definition);
        }
      }
    });

    // Start view watching
    this.viewRegistry?.startWatching();

    return true;
  }

  /**
   * Stop watching files for changes.
   */
  stop(): void {
    this.schemaRegistry?.stopWatching();
    this.viewRegistry?.stopWatching();
  }

  /**
   * Check if file watching is active.
   */
  get isWatching(): boolean {
    return (this.schemaRegistry?.isWatching() ?? false) ||
           (this.viewRegistry?.isWatching() ?? false);
  }
}
