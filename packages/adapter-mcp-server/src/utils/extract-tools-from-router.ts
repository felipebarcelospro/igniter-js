import type { IgniterControllerConfig } from "@igniter-js/core";
import type { IgniterAction } from "@igniter-js/core";
import type { IgniterRouter } from "@igniter-js/core";
import type { ArgsRawShape, McpAdapterOptions, McpToolInfo } from "src/types";
import { sanitizeMcpName } from "src/utils/sanitize-mcp-name";
import { createParamsSchemaFromPath, buildFullPath, extractParamNamesFromPath } from "src/utils/extract-params-from-path";
import { inferToolAnnotations } from "src/utils/infer-tool-annotations";
import type { ZodObject } from "zod";

/**
 * Builds a descriptive tool description including path parameter info.
 */
function buildToolDescription(
  baseDescription: string,
  fullPath: string,
  method: string
): string {
  const paramNames = extractParamNamesFromPath(fullPath);
  
  let description = baseDescription;
  
  // Add endpoint info
  description += ` [${method} ${fullPath}]`;
  
  // Add path params info if any
  if (paramNames.length > 0) {
    const paramsInfo = paramNames.map(p => `params.${p}`).join(', ');
    description += `. Required path parameters: ${paramsInfo}`;
  }
  
  return description;
}

/**
 * Checks if a tool path should be included based on toolPaths and filterMode.
 */
function shouldIncludeTool(
  controllerName: string,
  actionName: string,
  toolPaths: string[] | undefined,
  filterMode: 'include' | 'exclude' | undefined
): boolean {
  // If no toolPaths provided, include all tools
  if (!toolPaths || toolPaths.length === 0) {
    return true;
  }

  const toolPath = `${controllerName}.${actionName}`;
  const isInList = toolPaths.includes(toolPath);

  // Default mode is 'include'
  const mode = filterMode || 'include';

  if (mode === 'include') {
    // Only include if in the list
    return isInList;
  } else {
    // Exclude mode: include if NOT in the list
    return !isInList;
  }
}

/**
 * Extract tools from Igniter router.
 */
export function extractToolsFromRouter<
  TRouter extends IgniterRouter<any, any, any, any, any>,
>(
  router: TRouter,
  options: McpAdapterOptions<TRouter>
): McpToolInfo[] {
  const tools: McpToolInfo[] = [];

  if (options.tools?.autoMap === false) {
    return tools;
  }

  // Get tool path filter settings
  const toolPaths = options.tools?.toolPaths;
  const filterMode = options.tools?.filterMode;

  // Iterate through controllers and actions
  for (const [controllerName, controller] of Object.entries(router.controllers)) {
    const typedController = controller as IgniterControllerConfig<any>;
    const controllerPath = typedController.path || `/${controllerName}`;
    
    for (const [actionName, action] of Object.entries(typedController.actions)) {
      const actionConfig = action as IgniterAction<any, any, any, any, any, any, any, any, any, any>;

      // Apply tool path filter first (type-safe filter)
      if (!shouldIncludeTool(controllerName, actionName, toolPaths, filterMode)) {
        continue;
      }

      // Apply custom filter function if provided
      if (options.tools?.filter && !options.tools.filter(controllerName, actionName, actionConfig)) {
        continue;
      }

      const body = actionConfig.body as ZodObject<any> | undefined;
      const query = actionConfig.query as ZodObject<any> | undefined;
      
      // Build full path and extract params schema automatically
      const actionPath = actionConfig.path || '/';
      const fullPath = buildFullPath(controllerPath, actionPath);
      const params = createParamsSchemaFromPath(fullPath);

      // Generate tool name and sanitize to MCP-compliant format
      const rawToolName = options.tools?.naming
        ? options.tools.naming(controllerName, actionName)
        : `${controllerName}_${actionName}`; // default: underscore to avoid '.'
      const toolName = sanitizeMcpName(rawToolName);

      // Build enhanced description with path info
      const baseDescription = actionConfig.description || `Execute ${controllerName} ${actionName}`;
      const method = actionConfig.method || 'GET';
      const description = buildToolDescription(baseDescription, fullPath, method);

      // Infer tool annotations from HTTP method and action name
      const actionTitle = actionConfig.name || `${controllerName} ${actionName}`;
      const annotations = inferToolAnnotations(method, actionTitle);

      // Transform tool configuration
      let toolConfig: any = {
        name: toolName,
        description,
        tags: [controllerName, method.toLowerCase()].filter(Boolean),
        annotations
      };

      const schema: ArgsRawShape = {};
      if (body !== undefined) schema.body = body as any;
      if (query !== undefined) schema.query = query as any;
      if (params !== undefined) schema.params = params as any;

      if (Object.keys(schema).length > 0) {
        toolConfig.schema = schema;
      }

      if (options.tools?.transform) {
        const transformed = options.tools.transform(controllerName, actionName, actionConfig);
        toolConfig = {
          ...transformed,
          schema: transformed.schema || toolConfig.schema,
          tags: transformed.tags || toolConfig.tags
        };
      }

      tools.push({
        ...toolConfig,
        controller: controllerName,
        action: actionName,
        method: actionConfig.method,
        schema: toolConfig.schema,
        tags: toolConfig.tags,
        annotations: toolConfig.annotations
      });
    }
  }

  return tools;
}
