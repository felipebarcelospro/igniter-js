import type { IgniterRouter, ContextCallback } from "@igniter-js/core";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { InferMcpContextFromRouter, McpToolInfo, McpContext, McpAdapterOptions } from "src/types";

/**
 * Execute a tool using the Igniter router with type inference.
 */
export async function executeTool<
  TRouter extends IgniterRouter<any, any, any, any, any>,
  TContext extends object | ContextCallback = InferMcpContextFromRouter<TRouter>
>(
  router: IgniterRouter<TContext, any, any, any, any>,
  tool: McpToolInfo,
  args: any,
  context: McpContext<TContext>,
  options: McpAdapterOptions<TRouter>
): Promise<CallToolResult> {
  try {
    const caller = router.caller[tool.controller][tool.action];
    if (!caller) {
      throw new Error(`Action ${tool.action} not found in controller ${tool.controller}`);
    }
    // Call the router action
    let result: any;
    if (caller.type === 'query') {
      result = await caller.query(args);
    } else if (caller.type === 'mutation') {
      result = await caller.mutate(args);
    } else {
      throw new Error(`Neither query nor mutation function found for action ${tool.action} in controller ${tool.controller}`);
    }

    // Transform response if custom transformer provided
    if (options.response?.transform) {
      // @ts-expect-error
      return await options.response.transform(result, tool.name, context);
    }

    // Default response transformation
    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    throw error;
  }
}