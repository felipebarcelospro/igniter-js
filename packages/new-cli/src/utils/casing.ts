/**
 * Helper for converting strings between different naming conventions.
 * Abstract to signal that it groups static helpers only.
 */
export abstract class Casing {
  protected constructor() {}

  public static toKebabCase(value: string): string {
    return value
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();
  }

  public static toPascalCase(value: string): string {
    return this.toKebabCase(value)
      .split("-")
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join("");
  }

  public static toCamelCase(value: string): string {
    const pascal = this.toPascalCase(value);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  public static pluralize(value: string): string {
    if (value.endsWith("s")) {
      return value;
    }
    if (value.endsWith("y") && !/[aeiou]y$/.test(value)) {
      return `${value.slice(0, -1)}ies`;
    }
    return `${value}s`;
  }
}
