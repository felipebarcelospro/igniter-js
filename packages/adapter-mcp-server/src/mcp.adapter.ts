import type { IgniterRouter, IgniterControllerConfig, IgniterAction } from "@igniter-js/core";
import type { 
  McpAdapterOptions, 
  McpContext, 
  McpToolInfo, 
  McpResponse, 
  McpHandler, 
  InferMcpContext
} from "./types";

/**
 * Creates an MCP adapter with automatic type inference from context function.
 * 
 * @overload
 */
export function createMcpAdapter<
  TContext extends object,
  TControllers extends Record<string, IgniterControllerConfig<any>>,
  TOptions extends McpAdapterOptions<TContext, any>
>(
  router: IgniterRouter<TContext, TControllers, any, any>,
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
  TControllers extends Record<string, IgniterControllerConfig<any>>
>(
  router: IgniterRouter<TContext, TControllers, any, any>,
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
  TControllers extends Record<string, IgniterControllerConfig<any>>,
  TOptions extends McpAdapterOptions<TContext, any> = McpAdapterOptions<TContext, TContext>
>(
  router: IgniterRouter<TContext, TControllers, any, any>,
  options: TOptions = {} as TOptions
): McpHandler {
  type TInferredContext = InferMcpContext<TContext, TOptions>;
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
      
      // Trigger onError event if available
      if (options.events?.onError) {
        await options.events.onError(error as Error, context);
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Internal MCP server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
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
function extractToolsFromRouter<TContext extends object, TControllers extends Record<string, IgniterControllerConfig<any>>, TInferredContext>(
  router: IgniterRouter<TContext, TControllers, any, any>,
  options: McpAdapterOptions<TContext, TInferredContext>
): McpToolInfo[] {
  const tools: McpToolInfo[] = [];
  
  if (options.tools?.autoMap === false) {
    return tools;
  }
  
  // Iterate through controllers and actions
  for (const [controllerName, controller] of Object.entries(router.controllers)) {
    for (const [actionName, action] of Object.entries(controller.actions)) {
      const actionConfig = action as IgniterAction<any, any, any, any, any, any, any, any, any, any>;
      
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
async function createMcpContext<TContext extends object, TInferredContext>(
  router: IgniterRouter<TContext, any, any, any>,
  options: McpAdapterOptions<TContext, TInferredContext>,
  args: any,
  request?: Request
): Promise<McpContext<TInferredContext>> {
  const tools = extractToolsFromRouter(router, options);
  const req = request || new Request('http://localhost');
  
  // Use custom context function if provided
  if (options.context) {
    return await options.context(req);
  }
  
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
  
  // Create base context using router's context type
  const baseContext: McpContext<TInferredContext> = {
    context: (routerContext || {}) as TInferredContext,
    tools,
    request: req,
    timestamp: Date.now(),
    client: req.headers.get('user-agent') || 'unknown'
  };
  
  return baseContext;
}

/**
 * Execute a tool using the Igniter router with type inference.
 */
async function executeTool<TContext extends object, TInferredContext>(
  router: IgniterRouter<TContext, any, any, any>,
  tool: McpToolInfo,
  args: any,
  context: McpContext<TInferredContext>,
  options: McpAdapterOptions<TContext, TInferredContext>
): Promise<McpResponse> {
  try {
    const caller = router.$caller[tool.controller][tool.action];
    if (!caller) {
      throw new Error(`Action ${tool.action} not found in controller ${tool.controller}`);
    }
    // Call the router action
    let result: any;
    if (caller.type === 'query') {
      result = await caller.query(args);
    } else if (caller.type === 'mutation') {
      result = await caller.mutation(args);
    } else {
      throw new Error(`Neither query nor mutation function found for action ${tool.action} in controller ${tool.controller}`);
    }
    
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
function resolveInstructionsSync<TContext extends object, TInferredContext>(
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
async function resolveInstructions<TContext extends object, TInferredContext>(
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
 */
let mcpHandlerImport: any;

try {
  // Dynamic import to handle cases where the package might not be installed
  mcpHandlerImport = require('@vercel/mcp-adapter');
} catch (error) {
  console.warn('[@igniter-js/core] @vercel/mcp-adapter not found. Please install it to use MCP functionality.');
  console.warn('Run: npm install @vercel/mcp-adapter @modelcontextprotocol/sdk');
}

function createMcpHandler(
  serverSetup: (server: any) => void,
  serverOptions: any,
  adapterOptions: any
) {
  if (!mcpHandlerImport?.createMcpHandler) {
    throw new Error(
      'The @vercel/mcp-adapter package is required to use MCP functionality. ' +
      'Please install it with: npm install @vercel/mcp-adapter @modelcontextprotocol/sdk'
    );
  }
  
  return mcpHandlerImport.createMcpHandler(serverSetup, serverOptions, adapterOptions);
} 