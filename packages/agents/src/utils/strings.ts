/**
 * String utilities for `@igniter-js/agents`.
 */
export class IgniterAgentStringUtils {
  /**
   * Generates a unique identifier.
   */
  static generateId(prefix?: string): string {
    const random = Math.random().toString(36).substring(2, 12);
    return prefix ? `${prefix}_${random}` : random;
  }

  /**
   * Truncates a string to a maximum length.
   */
  static truncate(str: string, maxLength: number, suffix = "..."): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Converts a string to snake_case.
   */
  static toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "");
  }

  /**
   * Converts a string to camelCase.
   */
  static toCamelCase(str: string): string {
    return str
      .replace(/[-_](.)/g, (_, char: string) => char.toUpperCase())
      .replace(/^(.)/, (char: string) => char.toLowerCase());
  }
}
