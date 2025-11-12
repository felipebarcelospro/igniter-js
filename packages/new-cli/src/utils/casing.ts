export function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export function toPascalCase(value: string): string {
  return toKebabCase(value)
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

export function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function pluralize(value: string): string {
  if (value.endsWith("s")) {
    return value;
  }
  if (value.endsWith("y") && !/[aeiou]y$/.test(value)) {
    return `${value.slice(0, -1)}ies`;
  }
  return `${value}s`;
}
