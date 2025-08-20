/**
 * Efficient deep merge utility for combining objects
 * Handles nested objects, arrays, and primitive values
 * Optimized for performance with minimal memory allocation
 */

/**
 * Type guard to check if a value is a plain object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    value.constructor === Object &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * Type guard to check if a value is an array
 */
function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Performs a deep merge of multiple objects
 * Later objects override earlier ones
 * Arrays are replaced, not merged
 * 
 * @param objects - Objects to merge (undefined/null values are ignored)
 * @returns Deeply merged object
 */
export function deepMerge<T extends Record<string, unknown>>(
  ...objects: (T | undefined | null)[]
): T {
  // Filter out null/undefined objects
  const validObjects = objects.filter(
    (obj): obj is T => obj !== null && obj !== undefined
  );

  if (validObjects.length === 0) {
    return {} as T;
  }

  if (validObjects.length === 1) {
    return cloneDeep(validObjects[0]);
  }

  const result = {} as T;

  for (const obj of validObjects) {
    mergeInto(result, obj);
  }

  return result;
}

/**
 * Merges source object into target object (mutates target)
 * Internal helper function for deepMerge
 */
function mergeInto<T extends Record<string, unknown>>(
  target: T,
  source: T
): void {
  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue;
    }

    const sourceValue = source[key];
    const targetValue = target[key];

    if (isPlainObject(sourceValue)) {
      if (isPlainObject(targetValue)) {
        // Both are plain objects, merge recursively
        mergeInto(targetValue as Record<string, unknown>, sourceValue);
      } else {
        // Target is not a plain object, replace with cloned source
        target[key] = cloneDeep(sourceValue) as T[Extract<keyof T, string>];
      }
    } else if (isArray(sourceValue)) {
      // Arrays are replaced, not merged (for performance and predictability)
      target[key] = cloneDeep(sourceValue) as T[Extract<keyof T, string>];
    } else {
      // Primitive value, direct assignment
      target[key] = sourceValue as T[Extract<keyof T, string>];
    }
  }
}

/**
 * Creates a deep clone of an object
 * Handles nested objects, arrays, and primitive values
 */
function cloneDeep<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (isArray(value)) {
    return value.map(item => cloneDeep(item)) as T;
  }

  if (isPlainObject(value)) {
    const cloned = {} as Record<string, unknown>;
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        cloned[key] = cloneDeep(value[key]);
      }
    }
    return cloned as T;
  }

  // For other object types (Date, RegExp, etc.), return as-is
  // This is a design choice for performance - extend if needed
  return value;
}

/**
 * Specialized merge function for query parameters
 * Handles the common case of merging { query?, params?, body? } objects
 */
export function mergeQueryParams<T extends { query?: any; params?: any; body?: any }>(
  base: T | undefined,
  override: T | undefined
): T {
  if (!base && !override) {
    return {} as T;
  }

  if (!base) return cloneDeep(override!);
  if (!override) return cloneDeep(base);

  const result: any = {};

  // Merge each section separately for better type safety
  if (base.query || override.query) {
    result.query = deepMerge(base.query || {}, override.query || {});
  }

  if (base.params || override.params) {
    result.params = deepMerge(base.params || {}, override.params || {});
  }

  if (base.body || override.body) {
    result.body = deepMerge(base.body || {}, override.body || {});
  }

  return result as T;
}