import type { IgniterAction } from "@igniter-js/core";
import type { IgniterRouter } from "@igniter-js/core";
import type { ContextCallback } from "@igniter-js/core";
import type { IgniterControllerConfig } from "@igniter-js/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { InferMcpContextFromRouter, McpContext, McpToolInfo } from "src/types";
import { sanitizeMcpName } from "src/utils/sanitize-mcp-name";

/**
 * Create MCP context for tool execution with type inference.
 */
export async function createMcpContext<
  TRouter extends IgniterRouter<any, any, any, any, any>,
  TContext extends object | ContextCallback = InferMcpContextFromRouter<TRouter>
>(
  { router, request, server }: { router: TRouter; request?: Request; server?: McpServer }
): Promise<McpContext<TContext>> {
  const req = request || new Request('http://localhost');

  // Create context using router's context function
  let routerContext: TContext | undefined;
  if (router.config && 'context' in router.config) {
    const contextFn = (router.config as { context?: (req: Request) => TContext | Promise<TContext> }).context;
    if (typeof contextFn === 'function') {
      try {
        routerContext = await contextFn(req);
      } catch (error) {
        console.warn('Failed to create router context:', error);
      }
    }
  }

  // Extract tools (do this here to avoid circular dependency)
  const tools: McpToolInfo[] = [];
  for (const [controllerName, controller] of Object.entries(router.controllers)) {
    const typedController = controller as IgniterControllerConfig<any>;
    for (const [actionName, action] of Object.entries(typedController.actions)) {
      const actionConfig = action as IgniterAction<any, any, any, any, any, any, any, any, any, any>;
      tools.push({
        name: sanitizeMcpName(`${controllerName}_${actionName}`),
        description: actionConfig.description || `Execute ${controllerName} ${actionName}`,
        controller: controllerName,
        action: actionName,
        method: actionConfig.method,
        // @ts-expect-error - Expected
        schema: { body: actionConfig.body || {}, query: actionConfig.query || {}, params: actionConfig.params || {} },
        tags: [controllerName, actionConfig.method?.toLowerCase()].filter(Boolean)
      });
    }
  }

  // Create base context using router's context type
  const baseContext: McpContext<TContext> = {
    context: (routerContext || {}) as TContext,
    tools,
    request: req,
    timestamp: Date.now(),
    client: req.headers.get('user-agent') || 'unknown',
    server: server
  };

  return baseContext;
}
