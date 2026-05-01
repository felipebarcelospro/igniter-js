import { IgniterCollectionError, IGNITER_COLLECTION_ERROR_CODES } from "../errors/collection.error";
import type { IgniterCollectionViewTransform } from "../types/view";

/**
 * Utility for applying data transformations.
 */
export class IgniterCollectionViewTransformEngine {
  /**
   * Apply all transforms sequentially.
   */
  static applyTransforms(items: any[], transforms: IgniterCollectionViewTransform[]): any {
    let result: any = items;

    for (const transform of transforms) {
      result = this.applyTransform(result, transform);
    }

    return result;
  }

  /**
   * Apply a single transform.
   */
  private static applyTransform(data: any, transform: IgniterCollectionViewTransform): any {
    try {
      switch (transform.type) {
        case "group":
          if (!Array.isArray(data)) {
            throw new Error("Group transform requires an array of items");
          }
          return this.group(data, transform.field!);

        case "flatten":
          if (!Array.isArray(data)) {
            throw new Error("Flatten transform requires an array of items");
          }
          return this.flatten(data);

        case "pivot":
          if (!Array.isArray(data)) {
            throw new Error("Pivot transform requires an array of items");
          }
          return this.pivot(data, transform.config!);

        default:
          throw new IgniterCollectionError({
            message: `Unknown transform type: ${(transform as any).type}`,
            code: IGNITER_COLLECTION_ERROR_CODES.TRANSFORM_UNKNOWN,
            statusCode: 400,
            details: {
              "ctx.package": "@igniter-js/collections",
              "ctx.operation": "applyTransform",
              "ctx.transform": (transform as any).type,
            },
          });
      }
    } catch (error: any) {
      if (error instanceof IgniterCollectionError) {
        throw error;
      }
      throw new IgniterCollectionError({
        message: error.message || "Transform error",
        code: IGNITER_COLLECTION_ERROR_CODES.TRANSFORM_ERROR,
        statusCode: 500,
        details: {
          "ctx.package": "@igniter-js/collections",
          "ctx.operation": "applyTransform",
          "ctx.transform": transform.type,
          "ctx.error": error.message,
        },
      });
    }
  }

  /**
   * Group items by field.
   */
  private static group(items: any[], field: string): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    for (const item of items) {
      const value = item.data && typeof item.data === "object" ? item.data[field] : item[field];
      const key = String(value ?? "undefined");
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    }

    return grouped;
  }

  /**
   * Flatten nested objects to a single level using dot notation.
   */
  private static flatten(items: any[]): any[] {
    return items.map((item) => this.flattenObject(item));
  }

  private static flattenObject(obj: any, prefix = ""): any {
    if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
      return obj;
    }

    const flattened: any = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const propName = prefix ? `${prefix}.${key}` : key;
        if (
          typeof obj[key] === "object" &&
          obj[key] !== null &&
          !Array.isArray(obj[key]) &&
          Object.keys(obj[key]).length > 0
        ) {
          Object.assign(flattened, this.flattenObject(obj[key], propName));
        } else {
          flattened[propName] = obj[key];
        }
      }
    }

    return flattened;
  }

  /**
   * Pivot data.
   * Config: { index: string, column: string, value: string }
   */
  private static pivot(items: any[], config: Record<string, any>): any[] {
    const { index, column, value } = config;
    if (!index || !column || !value) {
      throw new Error("Pivot requires index, column, and value fields in config");
    }

    const pivotMap = new Map<any, any>();

    for (const item of items) {
      const data = item.data && typeof item.data === "object" ? item.data : item;
      const indexValue = data[index];
      const colKey = data[column];
      const val = data[value];

      if (!pivotMap.has(indexValue)) {
        pivotMap.set(indexValue, { [index]: indexValue });
      }

      pivotMap.get(indexValue)[colKey] = val;
    }

    return Array.from(pivotMap.values());
  }
}
