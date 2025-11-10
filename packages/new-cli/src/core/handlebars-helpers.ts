import handlebars from "handlebars";

/**
 * Register custom Handlebars helpers
 */
export function registerHandlebarsHelpers(): void {
  // Helper to check if an array includes a value
  handlebars.registerHelper("includes", function (array: any[], value: any) {
    if (!Array.isArray(array)) {
      return false;
    }
    return array.includes(value);
  });

  // Helper to check if an array is empty
  handlebars.registerHelper("isEmpty", function (array: any[]) {
    return !Array.isArray(array) || array.length === 0;
  });

  // Helper to check if a value is defined/not null
  handlebars.registerHelper("isDefined", function (value: any) {
    return value !== null && value !== undefined;
  });

  // Helper to join array elements with a separator
  handlebars.registerHelper(
    "join",
    function (array: any[], separator: string = ", ") {
      if (!Array.isArray(array)) {
        return "";
      }
      return array.join(separator);
    },
  );

  // Capitalize a slug string (e.g. my-project -> My Project)
  handlebars.registerHelper("capitalizeSlug", function (slug: string) {
    return slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  });

  // Safely get a nested property from an object
  handlebars.registerHelper("get", function (obj, path) {
    if (!path || typeof path !== "string") {
      return undefined;
    }
    const pathArray = path.split(".");
    let current = obj;
    for (let i = 0; i < pathArray.length; i++) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[pathArray[i]];
    }
    return current;
  });

  // Equality check
  handlebars.registerHelper("eq", function (a, b) {
    return a === b;
  });

  // Convert string to camelCase (e.g., "two-factor" -> "twoFactor")
  handlebars.registerHelper("camelCase", function (str: string) {
    if (!str) return str;
    if (str === "email-otp") return "emailOTP"; // Specific case for emailOTP
    if (str === "open-api") return "openAPI"; // Specific case for openAPI
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  });

  // Filters an array to exclude a specific item, like "next-cookies"
  handlebars.registerHelper("filterPlugins", function (plugins: string[] = []) {
    if (!Array.isArray(plugins)) return [];
    return plugins.filter((p) => p !== "next-cookies");
  });

  // Generates all auth plugin import statements correctly
  handlebars.registerHelper(
    "generatePluginImports",
    function (plugins: string[] = []) {
      if (!Array.isArray(plugins) || plugins.length === 0) {
        return "";
      }

      // Re-implement camelCase logic locally to be self-contained
      const camelCase = (str: string) => {
        if (!str) return str;
        if (str === "email-otp") return "emailOTP";
        if (str === "open-api") return "openAPI";
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      };

      const regularPlugins = plugins
        .filter((p) => p !== "next-cookies")
        .map(camelCase);

      const hasNextCookies = plugins.includes("next-cookies");

      const importStatements = [];

      if (regularPlugins.length > 0) {
        importStatements.push(
          `import { ${regularPlugins.join(", ")} } from "better-auth/plugins";`,
        );
      }

      if (hasNextCookies) {
        importStatements.push(
          `import { nextCookies } from "better-auth/next-js";`,
        );
      }

      // Use SafeString to prevent Handlebars from escaping the output
      return new handlebars.SafeString(importStatements.join("\n"));
    },
  );
}
