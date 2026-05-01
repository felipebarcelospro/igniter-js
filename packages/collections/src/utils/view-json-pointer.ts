/**
 * Utility for resolving JSON Pointer paths (RFC 6901).
 * Used to extract values from view data using valuePath references.
 *
 * @example
 * const data = { stats: { totalCount: 42 } };
 * IgniterCollectionViewJSONPointer.resolve(data, '/stats/totalCount'); // 42
 */
export class IgniterCollectionViewJSONPointer {
  /**
   * Resolve a JSON Pointer path in a data object.
   *
   * @param data - The data object to query
   * @param pointer - JSON Pointer path (e.g., '/stats/totalCount')
   * @returns The value at the pointer path, or undefined if not found
   */
  static resolve(data: any, pointer: string): any {
    // Empty pointer returns root
    if (!pointer || pointer === "/" || pointer === "") {
      return data;
    }

    if (!pointer.startsWith("/")) {
      return undefined;
    }

    // Remove leading slash and split by '/'
    const tokens = pointer.substring(1).split("/");

    let current = data;
    for (const token of tokens) {
      // Unescape special characters
      const key = token.replace(/~1/g, "/").replace(/~0/g, "~");

      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array indices
      if (Array.isArray(current)) {
        const index = parseInt(key, 10);
        if (isNaN(index) || index < 0 || index >= current.length) {
          return undefined;
        }
        current = current[index];
      } else if (typeof current === "object") {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Set a value at a JSON Pointer path.
   * Creates intermediate objects/arrays as needed.
   *
   * @param data - The data object to modify
   * @param pointer - JSON Pointer path
   * @param value - Value to set
   */
  static set(data: any, pointer: string, value: any): void {
    if (!pointer || pointer === "/" || pointer === "") {
      throw new Error("Cannot set root object");
    }

    if (!pointer.startsWith("/")) {
      throw new Error("Invalid JSON Pointer: must start with /");
    }

    const tokens = pointer.substring(1).split("/");
    const lastToken = tokens.pop()!;

    let current = data;
    for (const token of tokens) {
      const key = token.replace(/~1/g, "/").replace(/~0/g, "~");

      if (!(key in current) || current[key] === null || typeof current[key] !== "object") {
        // Determine if next level should be array or object
        const nextToken = tokens[tokens.indexOf(token) + 1] || lastToken;
        current[key] = /^\d+$/.test(nextToken) ? [] : {};
      }

      current = current[key];
    }

    const finalKey = lastToken.replace(/~1/g, "/").replace(/~0/g, "~");
    current[finalKey] = value;
  }
}
