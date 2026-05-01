/**
 * @fileoverview Stats calculation utility for collection views.
 * @module @igniter-js/collections/utils/view-stats
 */

import {
  IgniterCollectionError,
  IGNITER_COLLECTION_ERROR_CODES,
} from "../errors/collection.error";
import type {
  IgniterCollectionViewStats,
  IgniterCollectionViewStatDefinition,
} from "../types/view";

/**
 * Utility for calculating view stats in a single pass.
 */
export class IgniterCollectionViewStatsCalculator {
  /**
   * Calculate all stats for a set of items in a single iteration.
   *
   * @param items - Array of data items
   * @param statsDef - Stats definitions
   * @returns Calculated stats object
   *
   * @example
   * ```typescript
   * const stats = IgniterCollectionViewStatsCalculator.calculate(items, {
   *   total: { type: 'count' },
   *   active: { type: 'count', where: { status: 'active' } },
   *   totalValue: { type: 'sum', field: 'price' }
   * });
   * ```
   */
  static calculate(
    items: any[],
    statsDef: IgniterCollectionViewStats
  ): Record<string, any> {
    // Performance warning for large datasets
    if (items.length > 1000) {
      console.warn(
        `[Collections] Stats calculation for ${items.length} items may be slow. ` +
        "Consider filtering data before rendering."
      );
    }

    const results: Record<string, any> = {};
    const statEntries = Object.entries(statsDef);

    if (statEntries.length === 0) {
      return results;
    }

    // Initialize accumulators
    const state = statEntries.map(([name, def]) => {
      let accumulator: any = 0;
      if (def.type === "min") accumulator = Infinity;
      if (def.type === "max") accumulator = -Infinity;
      if (def.type === "custom") accumulator = []; // matches for custom

      return {
        name,
        def,
        accumulator,
        count: 0,
      };
    });

    // Single pass over items
    for (const item of items) {
      for (const s of state) {
        // @ts-expect-error - Apply where filter
        if (!s.def.where || this.matchesWhere(item, s.def.where)) {
          if (s.def.type === "custom") {
            s.accumulator.push(item);
          } else {
            const field = (s.def as any).field;
            const value = s.def.type === "count" ? 1 : this.getNestedValue(item, field);
            const numValue = typeof value === "number" ? value : 0;

            if (
              s.def.type === "count" ||
              s.def.type === "sum" ||
              s.def.type === "avg"
            ) {
              s.accumulator += numValue;
              s.count++;
            } else if (s.def.type === "min") {
              if (numValue < s.accumulator) s.accumulator = numValue;
              s.count++;
            } else if (s.def.type === "max") {
              if (numValue > s.accumulator) s.accumulator = numValue;
              s.count++;
            }
          }
        }
      }
    }

    // Finalize results
    for (const s of state) {
      if (s.def.type === "custom") {
        results[s.name] = this.evaluateExpression(s.def.expression, s.accumulator);
      } else if (s.def.type === "avg") {
        results[s.name] = s.count > 0 ? s.accumulator / s.count : 0;
      } else if (s.def.type === "min" || s.def.type === "max") {
        results[s.name] = s.count > 0 ? s.accumulator : 0;
      } else {
        results[s.name] = s.accumulator;
      }
    }

    return results;
  }

  /**
   * Evaluate a custom JavaScript expression safely.
   */
  private static evaluateExpression(expression: string, items: any[]): any {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function("items", `return ${expression}`);
      return fn(items);
    } catch (error) {
      throw new IgniterCollectionError({
        message: `Failed to evaluate custom expression: ${expression}`,
        code: IGNITER_COLLECTION_ERROR_CODES.STAT_EXPRESSION_ERROR,
        statusCode: 500,
        details: {
          "ctx.package": "@igniter-js/collections",
          "ctx.operation": "evaluateExpression",
          "ctx.expression": expression,
          "ctx.error": error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Check if item matches where clause.
   */
  private static matchesWhere(item: any, where: Record<string, any>): boolean {
    for (const [key, condition] of Object.entries(where)) {
      const value = this.getNestedValue(item, key);

      if (typeof condition === "object" && condition !== null) {
        const ops = condition as Record<string, any>;
        if (Array.isArray(value)) {
          if (!this.matchesArrayOperators(value, ops)) return false;
          if (!this.matchesScalarOperators(value, ops)) return false;
        } else {
          if (!this.matchesScalarOperators(value, ops)) return false;
        }
      } else {
        if (value !== condition) return false;
      }
    }
    return true;
  }

  /**
   * Get value from object via dot notation.
   * Handles IgniterCollectionDocument by checking the 'data' property.
   */
  private static getNestedValue(obj: any, path: string): any {
    if (!obj) return undefined;

    if (!path || !path.includes(".")) return obj[path];

    const parts = path.split(".");
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }

    return current;
  }

  /**
   * Match array operators (has, hasEvery, hasSome, isEmpty, length).
   */
  private static matchesArrayOperators(
    value: any[],
    ops: Record<string, any>
  ): boolean {
    if (ops.has !== undefined && !value.includes(ops.has)) return false;
    if (ops.hasEvery !== undefined) {
      const required = ops.hasEvery as any[];
      if (!required.every((v) => value.includes(v))) return false;
    }
    if (ops.hasSome !== undefined) {
      const candidates = ops.hasSome as any[];
      if (!candidates.some((v) => value.includes(v))) return false;
    }
    if (ops.isEmpty !== undefined) {
      const isEmpty = value.length === 0;
      if (isEmpty !== ops.isEmpty) return false;
    }
    if (ops.length !== undefined && value.length !== ops.length) return false;
    return true;
  }

  /**
   * Match scalar operators (equals, not, in, notIn, lt, lte, gt, gte, contains, startsWith, endsWith).
   */
  private static matchesScalarOperators(
    value: any,
    ops: Record<string, any>
  ): boolean {
    if (ops.equals !== undefined && value !== ops.equals) return false;
    if (ops.not !== undefined && value === ops.not) return false;
    if (ops.in !== undefined && !(ops.in as any[]).includes(value)) return false;
    if (ops.notIn !== undefined && (ops.notIn as any[]).includes(value)) return false;
    if (ops.lt !== undefined && !(value < ops.lt)) return false;
    if (ops.lte !== undefined && !(value <= ops.lte)) return false;
    if (ops.gt !== undefined && !(value > ops.gt)) return false;
    if (ops.gte !== undefined && !(value >= ops.gte)) return false;

    if (typeof value === "string") {
      if (
        ops.contains !== undefined &&
        !value.includes(ops.contains as string)
      ) {
        return false;
      }
      if (
        ops.startsWith !== undefined &&
        !value.startsWith(ops.startsWith as string)
      ) {
        return false;
      }
      if (
        ops.endsWith !== undefined &&
        !value.endsWith(ops.endsWith as string)
      ) {
        return false;
      }
    }
    return true;
  }
}
