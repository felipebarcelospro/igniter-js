/**
 * Validation utilities for `@igniter-js/agents`.
 */
export class IgniterAgentValidationUtils {
  /**
   * Checks if a value is defined (not null or undefined).
   */
  static isDefined<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
  }

  /**
   * Checks if a value is a non-empty string.
   */
  static isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.length > 0;
  }

  /**
   * Checks if a value is a plain object.
   */
  static isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    );
  }
}
