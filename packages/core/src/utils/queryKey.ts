/**
 * Recursively sorts the keys of an object.
 * This ensures that objects with the same keys and values, but in a different order,
 * will produce the same JSON string.
 * @param obj The object to sort.
 * @returns A new object with sorted keys.
 */
function sortObjectKeys(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = sortObjectKeys(obj[key]);
      return acc;
    }, {} as any);
}

/**
 * Generates a consistent, deterministic query key for caching and invalidation.
 * It combines the controller and action names with a stringified, sorted version of the input parameters.
 *
 * @param controller The name of the controller.
 * @param action The name of the action.
 * @param input The optional input object for the action (containing query, params, body).
 * @returns A unique string key.
 *
 * @example
 * generateQueryKey('users', 'getById', { params: { id: 1 } })
 * // => 'users.getById:{"params":{"id":1}}'
 *
 * generateQueryKey('users', 'getAll')
 * // => 'users.getAll'
 */
export const generateQueryKey = (
  controller: string,
  action: string,
  input?: Record<string, any>,
): string => {
  const actionPath = `${controller}.${action}`;

  if (!input || Object.keys(input).length === 0) {
    return actionPath;
  }

  const sortedInput = sortObjectKeys(input);
  return `${actionPath}:${JSON.stringify(sortedInput)}`;
};
