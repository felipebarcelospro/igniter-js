import type { IgniterRouter, IgniterControllerConfig, IgniterAction } from "../../types";
import type { 
  McpAdapterOptions, 
  McpContext, 
  McpToolInfo, 
  McpResponse, 
  McpHandler, 
  McpCustomTool,
  InferMcpContextFromFunction,
  InferMcpContextFromRouter,
  InferMcpContext
} from "./types";

/**
 * Creates an MCP adapter with automatic type inference from context function.
 * 
 * @overload
 */
export function createMcpAdapter<
  TContext extends object,
  TControllers extends Record<string, IgniterControllerConfig<TContext, any>>,
  TOptions extends McpAdapterOptions<TContext, any>
>(
  router: IgniterRouter<TContext, TControllers>,
  options: TOptions & {
    context: (request: Request) => McpContext<any> | Promise<McpContext<any>>;
  }
): McpHandler;

/**
 * Creates an MCP adapter using router's context type.
 * 
 * @overload
 */
export function createMcpAdapter<
  TContext extends object,
  TControllers extends Record<string, IgniterControllerConfig<TContext, any>>
>(
  router: IgniterRouter<TContext, TControllers>,
  options?: McpAdapterOptions<TContext, TContext>
): McpHandler;

/**
 * Creates an MCP (Model Context Protocol) adapter for an Igniter router.
 * This adapter transforms Igniter actions into MCP tools that can be used by AI models.
 * 
 * **Automatic Type Inference:**
 * - If you provide a `context` function, types are inferred from its return type
 * - Otherwise, types are inferred from the router's context type
 * 
 * @template TContext - The type of the router context
 * @template TControllers - The type of the router controllers
 * 
 * @param router - The Igniter router to adapt
 * @param options - MCP adapter configuration options
 * @returns MCP handler function compatible with @vercel/mcp-adapter
 * 
 * @example
 * ```typescript
 * // Basic usage - uses router context type
 * const mcpHandler = createMcpAdapter(router);
 * export { mcpHandler as GET, mcpHandler as POST };
 * 
 * // With custom context - types inferred automatically
 * const mcpHandler = createMcpAdapter(router, {
 *   context: async (req) => ({
 *     context: { user: await getUser(req), db: getDB() },
 *     tools: [],
 *     request: req,
 *     user: await getUser(req), // ✅ Fully typed!
 *     timestamp: Date.now(),
 *     client: req.headers.get('user-agent') || 'unknown'
 *   }),
 *   events: {
 *     onToolCall: (name, args, ctx) => {
 *       // ✅ ctx.user is fully typed here!
 *       console.log(`User ${ctx.user?.name} called ${name}`);
 *     }
 *   }
 * });
 * ```
 */
export function createMcpAdapter<
  TContext extends object,
  TControllers extends Record<string, IgniterControllerConfig<TContext, any>>,
  TOptions extends McpAdapterOptions<TContext, any> = McpAdapterOptions<TContext, TContext>,
  TInferredContext = InferMcpContext<TContext, TOptions>
>(
  router: IgniterRouter<TContext, TControllers>,
  options: TOptions = {} as TOptions
): McpHandler {
  // Extract tools from router
  const tools = extractToolsFromRouter(router, options);
  
  // Create the MCP handler using @vercel/mcp-adapter
  const handler = createMcpHandler(
    (server) => {
      // Register router actions as tools
      for (const tool of tools) {
        server.tool(
          tool.name,
          tool.description,
          tool.schema || {},
          async (args: any) => {
            const startTime = Date.now();
            const context = await createMcpContext<TContext, TInferredContext>(router, options, args);
            
            try {
              // Trigger onToolCall event
              if (options.events?.onToolCall) {
                await options.events.onToolCall(tool.name, args, context);
              }
              
              // Execute the tool
              const result = await executeTool<TContext, TInferredContext>(router, tool, args, context, options);
              
              // Trigger onToolSuccess event
              const duration = Date.now() - startTime;
              if (options.events?.onToolSuccess) {
                await options.events.onToolSuccess(tool.name, result, duration, context);
              }
              
              return result;
            } catch (error) {
              // Trigger onToolError event
              if (options.events?.onToolError) {
                await options.events.onToolError(tool.name, error as Error, context);
              }
              
              // Handle error response
              if (options.response?.onError) {
                return await options.response.onError(error as Error, tool.name, context);
              }
              
              // Default error response
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: `Error executing ${tool.name}: ${(error as Error).message}`
                  }
                ]
              };
            }
          }
        );
      }
      
      // Register custom tools
      if (options.tools?.custom) {
        for (const customTool of options.tools.custom) {
          server.tool(
            customTool.name,
            customTool.description,
            customTool.schema,
            async (args: any) => {
              const context = await createMcpContext<TContext, TInferredContext>(router, options, args);
              return await customTool.handler(args, context);
            }
          );
        }
      }
    },
    {
      // Server options
      instructions: resolveInstructionsSync(options, tools),
      serverInfo: options.serverInfo || {
        name: 'Igniter MCP Server',
        version: '1.0.0'
      }
    },
    {
      // Adapter options
      basePath: options.adapter?.basePath || '/api/mcp',
      maxDuration: options.adapter?.maxDuration || 60,
      verboseLogs: options.adapter?.verboseLogs || false,
      redisUrl: options.adapter?.redis?.url,
      onEvent: options.adapter?.verboseLogs ? console.log : undefined
    }
  );
  
  // Wrap handler to add request/response events
  const wrappedHandler: McpHandler = async (request: Request) => {
    const context = await createMcpContext<TContext, TInferredContext>(router, options, {}, request);
    
    try {
      // Trigger onRequest event
      if (options.events?.onRequest) {
        await options.events.onRequest(request, context);
      }
      
      // Execute the MCP handler
      const response = await handler(request);
      
      // Trigger onResponse event
      if (options.events?.onResponse) {
        await options.events.onResponse(response, context);
      }
      
      return response;
    } catch (error) {
      console.error('MCP Adapter Error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal MCP server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
  
  // Add HTTP method handlers for Next.js compatibility
  wrappedHandler.GET = wrappedHandler;
  wrappedHandler.POST = wrappedHandler;
  wrappedHandler.DELETE = wrappedHandler;
  
  return wrappedHandler;
};

/**
 * Extract tools from Igniter router.
 */
function extractToolsFromRouter<TContext extends object, TControllers extends Record<string, IgniterControllerConfig<TContext, any>>, TInferredContext = any>(
  router: IgniterRouter<TContext, TControllers>,
  options: McpAdapterOptions<TContext, TInferredContext>
): McpToolInfo[] {
  const tools: McpToolInfo[] = [];
  
  if (options.tools?.autoMap === false) {
    return tools;
  }
  
  // Iterate through controllers and actions
  for (const [controllerName, controller] of Object.entries(router.controllers)) {
    for (const [actionName, action] of Object.entries(controller.actions)) {
      const actionConfig = action as IgniterAction<any, any, any, any, any, any, any, any, any>;
      
      // Apply filter if provided
      if (options.tools?.filter && !options.tools.filter(controllerName, actionName, actionConfig)) {
        continue;
      }
      
      // Generate tool name
      const toolName = options.tools?.naming 
        ? options.tools.naming(controllerName, actionName)
        : `${controllerName}.${actionName}`;
      
      // Transform tool configuration
      let toolConfig = {
        name: toolName,
        description: actionConfig.description || `Execute ${controllerName} ${actionName}`,
        schema: actionConfig.body || actionConfig.query || {},
        tags: [controllerName, actionConfig.method?.toLowerCase()].filter(Boolean)
      };
      
      if (options.tools?.transform) {
        const transformed = options.tools.transform(controllerName, actionName, actionConfig);
        toolConfig = {
          ...transformed,
          schema: transformed.schema || {},
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

/**
 * Create MCP context for tool execution with type inference.
 */
async function createMcpContext<TContext extends object, TInferredContext = any>(
  router: IgniterRouter<TContext, any>,
  options: McpAdapterOptions<TContext, TInferredContext>,
  args: any,
  request?: Request
): Promise<McpContext<TInferredContext>> {
  const tools = extractToolsFromRouter(router, options);
  
  // Use custom context function if provided
  if (options.context) {
    return await options.context(request || new Request('http://localhost'));
  }
  
  // Create base context using router's context type
  const baseContext: McpContext<TInferredContext> = {
    context: {} as TInferredContext,
    tools,
    request: request || new Request('http://localhost'),
    timestamp: Date.now(),
    client: request?.headers.get('user-agent') || 'unknown'
  };
  
  return baseContext;
}

/**
 * Execute a tool using the Igniter router with type inference.
 */
async function executeTool<TContext extends object, TInferredContext = any>(
  router: IgniterRouter<TContext, any>,
  tool: McpToolInfo,
  args: any,
  context: McpContext<TInferredContext>,
  options: McpAdapterOptions<TContext, TInferredContext>
): Promise<McpResponse> {
  try {
    // Call the router action
    const result = await router.processor.call(
      tool.controller as any,
      tool.action as any,
      args
    );
    
    // Transform response if custom transformer provided
    if (options.response?.transform) {
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

/**
 * Resolve instructions synchronously (for initial setup).
 */
function resolveInstructionsSync<TContext extends object, TInferredContext = any>(
  options: McpAdapterOptions<TContext, TInferredContext>,
  tools: McpToolInfo[]
): string {
  if (!options.instructions) {
    return `You have access to ${tools.length} tools from the Igniter router: ${tools.map(t => t.name).join(', ')}`;
  }
  
  if (typeof options.instructions === 'string') {
    return options.instructions;
  }
  
  // For function instructions, provide a default message during setup
  // The actual dynamic instructions will be resolved during runtime
  return `You have access to ${tools.length} tools from the Igniter router: ${tools.map(t => t.name).join(', ')}`;
}

/**
 * Resolve instructions (can be string or function) with type inference.
 */
async function resolveInstructions<TContext extends object, TInferredContext = any>(
  options: McpAdapterOptions<TContext, TInferredContext>,
  tools: McpToolInfo[]
): Promise<string> {
  if (!options.instructions) {
    return `You have access to ${tools.length} tools from the Igniter router: ${tools.map(t => t.name).join(', ')}`;
  }
  
  if (typeof options.instructions === 'string') {
    return options.instructions;
  }
  
  // Create a basic context for instructions
  const context: McpContext<TInferredContext> = {
    context: {} as TInferredContext,
    tools,
    request: new Request('http://localhost'),
    timestamp: Date.now(),
    client: 'unknown'
  };
  
  return await options.instructions(context);
}

/**
 * Import createMcpHandler from @vercel/mcp-adapter
 * This is a placeholder - in real implementation, you'd import from the actual package
 */
function createMcpHandler(
  serverSetup: (server: any) => void,
  serverOptions: any,
  adapterOptions: any
) {
  // This is a mock implementation
  // In real usage, you'd use: import { createMcpHandler } from '@vercel/mcp-adapter'
  
  return async (request: Request): Promise<Response> => {
    // Mock MCP handler implementation
    // This would be replaced by the actual @vercel/mcp-adapter implementation
    
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        
        // Mock tool execution
        if (body.method === 'tools/call') {
          const toolName = body.params?.name;
          const args = body.params?.arguments || {};
          
          return new Response(JSON.stringify({
            content: [
              {
                type: 'text',
                text: `Mock execution of tool: ${toolName} with args: ${JSON.stringify(args)}`
              }
            ]
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Mock tools list
        if (body.method === 'tools/list') {
          return new Response(JSON.stringify({
            tools: [
              {
                name: 'mock_tool',
                description: 'A mock tool for testing',
                inputSchema: {
                  type: 'object',
                  properties: {}
                }
              }
            ]
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response(JSON.stringify({ message: 'MCP Server Ready' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  };
} 