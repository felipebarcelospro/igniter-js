import type { ContextCallback } from "@igniter-js/core";
import type { IgniterRouter } from "@igniter-js/core";
import { metadataCorsOptionsRequestHandler, protectedResourceHandler, createMcpHandler as vercelCreateMcpAdapter, withMcpAuth } from "mcp-handler";
import { executeTool } from "src/executors/execute-tool";
import type { InferMcpContextFromRouter, McpAdapterOptions } from "src/types";
import { createMcpContext } from "src/utils/create-mcp-context";
import { extractToolsFromRouter } from "src/utils/extract-tools-from-router";
import { sanitizeMcpName } from "src/utils/sanitize-mcp-name";

export function createMcpAdapter<
  TRouter extends IgniterRouter<any, any, any, any, any>,
  TContext extends object | ContextCallback = InferMcpContextFromRouter<TRouter>
>(
  options: McpAdapterOptions<TRouter>
): {
  server: (request: Request) => Promise<Response>;
  auth: {
    resource: (request: Request) => Promise<Response> | Response;
    cors: (request: Request) => Promise<Response> | Response;
  };
} {
  const router = options.router;

  options.logger?.debug('Creating MCP adapter...');

  // Extract tools from router
  const tools = extractToolsFromRouter<TRouter>(router, options);

  // Return the handler function
  const server = (request: Request) => {
    // Create the MCP handler using @vercel/mcp-adapter
    const handler = vercelCreateMcpAdapter(
      (server) => {
        // Register router actions as tools
        for (const tool of tools) {
          server.tool(
            sanitizeMcpName(tool.name),
            tool.description,
            tool.schema || {},
            async (args, extra) => {
              const startTime = Date.now();
              const context = await createMcpContext<TRouter>({ router, request });

              try {
                // Trigger onToolCall event
                if (options.events?.onToolCall) {
                  await options.events.onToolCall(tool.name, args, context);
                }

                // Execute the tool
                const result = await executeTool<TRouter>(router, tool, args, context, options);

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
              sanitizeMcpName(customTool.name),
              customTool.description,
              customTool.args,
              async (args: any) => {
                const context = await createMcpContext<TRouter>({ router, request });
                return await customTool.handler(args, context);
              }
            );
          }
        }

        // Register custom prompts
        if (options.prompts?.custom) {
          for (const prompt of options.prompts.custom) {
            for (const prompt of options.prompts.custom) {
              server.prompt(
                sanitizeMcpName(prompt.name),
                prompt.description,
                prompt.args,
                async (args, extra) => {
                  const context = await createMcpContext<TRouter>({ router, request });
                  return prompt.handler(args, context);
                }
              );
            }
          }
        }

        // Register custom resources
        if (options.resources?.custom) {
          for (const resource of options.resources.custom) {
            server.resource(
              sanitizeMcpName(resource.name),
              resource.uri,
              resource.handler
            );
          }
        }
      },
      {
        // Tools
        serverInfo: options.serverInfo || { name: 'Igniter MCP Server', version: '1.0.0' },
        capabilities: options.capatibilities,
        instructions: options.instructions,
      },
      {
        // Adapter options
        basePath: options.adapter?.basePath || '/api/mcp',
        streamableHttpEndpoint: options.adapter?.streamableHttpEndpoint || '/api/mcp/stream',
        sseEndpoint: options.adapter?.sseEndpoint || '/api/mcp/sse',
        sseMessageEndpoint: options.adapter?.sseMessageEndpoint || '/api/mcp/sse/message',
        redisUrl: options.adapter?.redisUrl || undefined,
        disableSse: options.adapter?.disableSse || false,
        maxDuration: options.adapter?.maxDuration || 60000,
        verboseLogs: options.adapter?.verboseLogs || false
      }
    );

    // Wrap with authentication if OAuth config provided
    let wrappedHandler = handler;
    if (options.oauth && options.oauth.verifyToken) {
      const verifyTokenWithContext = async (req: Request, bearerToken?: string | undefined) => {
        try {
          const context = await createMcpContext<TRouter>({ router, request: req });
          return options.oauth?.verifyToken ? options.oauth.verifyToken({ request: req, bearerToken , context}) : undefined;
        } catch (error) {
          return undefined;
        }
      }

      wrappedHandler = withMcpAuth(handler, verifyTokenWithContext, {
        resourceMetadataPath: options.oauth.resourceMetadataPath ?? 'well-known/oauth-authorization-server',
        required: !!options.oauth,
        requiredScopes: options.oauth?.scopes
      });
    }
    
    return wrappedHandler(request);
  }

  return {
    server,
    auth: {
      resource: protectedResourceHandler({
        authServerUrls: [options.oauth?.issuer ?? ''],
      }),
      cors: metadataCorsOptionsRequestHandler()
    }
  };
};
