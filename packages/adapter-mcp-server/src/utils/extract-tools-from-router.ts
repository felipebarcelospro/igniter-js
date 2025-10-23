import type { IgniterControllerConfig } from "@igniter-js/core";
import type { IgniterAction } from "@igniter-js/core";
import type { IgniterRouter } from "@igniter-js/core";
import type { ArgsRawShape, McpAdapterOptions, McpToolInfo } from "src/types";
import { sanitizeMcpName } from "src/utils/sanitize-mcp-name";
import type { ZodObject } from "zod";

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

  // Iterate through controllers and actions
  for (const [controllerName, controller] of Object.entries(router.controllers)) {
    const typedController = controller as IgniterControllerConfig<any>;
    for (const [actionName, action] of Object.entries(typedController.actions)) {
      const actionConfig = action as IgniterAction<any, any, any, any, any, any, any, any, any, any>;

      // Apply filter if provided
      if (options.tools?.filter && !options.tools.filter(controllerName, actionName, actionConfig)) {
        continue;
      }

      const body = actionConfig.body as ZodObject<any> | undefined;
      const query = actionConfig.query as ZodObject<any> | undefined;
      // @ts-expect-error - Expected
      const params = actionConfig.params as ZodObject<any> | undefined;

      // Generate tool name
      // Generate tool name and sanitize to MCP-compliant format
      const rawToolName = options.tools?.naming
        ? options.tools.naming(controllerName, actionName)
        : `${controllerName}_${actionName}`; // default: underscore to avoid '.'
      const toolName = sanitizeMcpName(rawToolName);

      // Transform tool configuration
      let toolConfig: any = {
        name: toolName,
        description: actionConfig.description || `Execute ${controllerName} ${actionName}`,
        tags: [controllerName, actionConfig.method?.toLowerCase()].filter(Boolean)
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
        tags: toolConfig.tags
      });
    }
  }

  return tools;
}
