import { z, ZodObject, ZodString, ZodRawShape } from "zod";

/**
 * Extracts parameter names from a URL path pattern.
 * Supports patterns like `/users/:id`, `/users/:id/posts/:postId`, etc.
 * 
 * @param path - The URL path pattern to extract parameters from
 * @returns An array of parameter names
 * 
 * @example
 * ```typescript
 * extractParamNamesFromPath("/users/:id"); // ["id"]
 * extractParamNamesFromPath("/users/:id/posts/:postId"); // ["id", "postId"]
 * extractParamNamesFromPath("/users"); // []
 * ```
 */
export function extractParamNamesFromPath(path: string): string[] {
  const paramRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
  const params: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = paramRegex.exec(path)) !== null) {
    params.push(match[1]);
  }

  return params;
}

/**
 * Creates a Zod schema for path parameters extracted from a URL path pattern.
 * All parameters are typed as `z.string()` with a description indicating they are path parameters.
 * 
 * @param path - The URL path pattern to create a schema for
 * @returns A ZodObject schema for the path parameters, or undefined if no parameters
 * 
 * @example
 * ```typescript
 * createParamsSchemaFromPath("/users/:id");
 * // Returns z.object({ id: z.string().describe("Path parameter: id") })
 * 
 * createParamsSchemaFromPath("/users/:userId/posts/:postId");
 * // Returns z.object({ 
 * //   userId: z.string().describe("Path parameter: userId"),
 * //   postId: z.string().describe("Path parameter: postId")
 * // })
 * 
 * createParamsSchemaFromPath("/users");
 * // Returns undefined
 * ```
 */
export function createParamsSchemaFromPath(path: string): ZodObject<Record<string, ZodString>> | undefined {
  const paramNames = extractParamNamesFromPath(path);

  if (paramNames.length === 0) {
    return undefined;
  }

  const shape: Record<string, ZodString> = {};
  for (const paramName of paramNames) {
    shape[paramName] = z.string().describe(`Path parameter: ${paramName}`);
  }

  return z.object(shape);
}

/**
 * Builds the full path for an action by combining controller path and action path.
 * 
 * @param controllerPath - The controller's base path (e.g., "/users")
 * @param actionPath - The action's path (e.g., "/:id")
 * @returns The combined full path
 * 
 * @example
 * ```typescript
 * buildFullPath("/users", "/:id"); // "/users/:id"
 * buildFullPath("/users", "/"); // "/users/"
 * buildFullPath("/", "/:id"); // "/:id"
 * ```
 */
export function buildFullPath(controllerPath: string, actionPath: string): string {
  // Normalize controller path (remove trailing slash)
  const normalizedControllerPath = controllerPath.endsWith('/') 
    ? controllerPath.slice(0, -1) 
    : controllerPath;
  
  // Normalize action path (ensure it starts with / if not empty)
  const normalizedActionPath = actionPath.startsWith('/') 
    ? actionPath 
    : `/${actionPath}`;

  // Handle root controller path
  if (normalizedControllerPath === '' || normalizedControllerPath === '/') {
    return normalizedActionPath;
  }

  return `${normalizedControllerPath}${normalizedActionPath}`;
}
