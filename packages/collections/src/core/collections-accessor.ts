/**
 * @fileoverview Collections accessor namespace for @igniter-js/collections
 * @module @igniter-js/collections/core/collections-accessor
 */

import type { StandardJSONSchemaV1 } from "@standard-schema/spec";
import type {
  IIgniterCollectionsAccessor,
  IIgniterCollectionModel,
} from "../types/manager";
import type { IgniterCollectionModelDefinition } from "../types/collection";
import { StdSchema } from "../utils/schema";

/**
 * Collections namespace for accessing and listing collections.
 */
export class IgniterCollectionsAccessor<
  TCollections extends Record<string, IgniterCollectionModelDefinition<any>> = Record<
    string,
    IgniterCollectionModelDefinition<any>
  >,
> implements IIgniterCollectionsAccessor<TCollections> {
  constructor(
    private readonly collectionManagers: Map<string, IIgniterCollectionModel<any>>,
  ) {}

  /**
   * Get a collection manager by name.
   */
  get<K extends keyof TCollections>(
    name: K
  ): TCollections[K] extends IgniterCollectionModelDefinition<infer TSchema>
    ? IIgniterCollectionModel<TSchema>
    : never;
  get(name: string): IIgniterCollectionModel<any>;
  get(name: string): any {
    const manager = this.collectionManagers.get(name);
    if (!manager) {
      throw new Error(`Collection not found: ${name}`);
    }
    return manager;
  }

  /**
   * List all registered collection definitions as an array.
   */
  list(): Array<{
    name: string;
    patterns: string[];
    schema: StandardJSONSchemaV1 | undefined;
    source?: 'built-in' | 'discovered';
  }> {
    return Array.from(this.collectionManagers.values()).map((manager) => ({
      name: manager.definition.name,
      patterns: manager.definition.patterns,
      schema: manager.definition.schema ? StdSchema.getJSONSchema(manager.definition.schema) : undefined,
      source: manager.definition.source,
    }));
  }

  /**
   * Get all registered collection definitions as an entries map.
   */
  entries(): {
    [K in keyof TCollections]: {
      name: string;
      patterns: string[];
      schema: StandardJSONSchemaV1 | undefined;
      source?: 'built-in' | 'discovered';
    };
  } {
    const result = {} as any;
    for (const [name, manager] of this.collectionManagers.entries()) {
      result[name] = {
        name: manager.definition.name,
        patterns: manager.definition.patterns,
        schema: manager.definition.schema ? StdSchema.getJSONSchema(manager.definition.schema) : undefined,
        source: manager.definition.source,
      };
    }
    return result;
  }
}
