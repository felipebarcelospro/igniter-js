import { IgniterMcpServer } from '@igniter-js/adapter-mcp-server'
import { AppRouter } from '@/igniter.router'
import { z } from 'zod'

/**
 * MCP server instance for exposing API as a MCP server.
 * 
 * This example demonstrates the new builder pattern API with:
 * - Fluent, chainable API for progressive configuration
 * - Full TypeScript type inference for tools, prompts, and resources
 * - Context automatically inferred from the router
 * - Type-safe event handlers and OAuth configuration
 * - Better IDE autocomplete and type safety
 *
 * @see https://github.com/felipebarcelospro/igniter-js/tree/main/packages/adapter-mcp-server
 */
const { handler, auth } = IgniterMcpServer
  .create()
  .router(AppRouter)
  .withServerInfo({
    name: 'Igniter.js MCP Server',
    version: '1.0.0',
  })
  .withInstructions('This is a demo Igniter.js MCP server. Use the available tools to interact with the API.')
  
  // Custom tool (not from router)
  .addTool({
    name: 'getCurrentTime',
    description: 'Get the current server time',
    args: {},
    handler: async (args, context) => {
      // context is automatically typed from the router!
      return {
        content: [{
          type: 'text' as const,
          text: `Current server time: ${new Date().toISOString()}`
        }]
      }
    }
  })

  // Custom prompt for AI guidance
  .addPrompt({
    name: 'exploreAPI',
    description: 'Get guidance on exploring the Igniter.js API',
    args: {},
    handler: async (args, context) => {
      // context is automatically typed from the router!
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Please help me understand what this API can do. List the available endpoints and their purposes.'
            }
          }
        ]
      }
    }
  })

  // Custom resource for AI to read
  .addResource({
    uri: 'info://server/status',
    name: 'Server Status',
    handler: async (context) => {
      // context is automatically typed from the router!
      return {
        contents: [{
          uri: 'info://server/status',
          mimeType: 'application/json',
          text: JSON.stringify({
            status: 'operational',
            uptime: process.uptime(),
            nodeVersion: process.version,
            platform: process.platform
          }, null, 2)
        }]
      }
    }
  })

  // Event handlers for monitoring and logging
  .withEvents({
    onRequest: async (request, context) => {
      // context is automatically typed from the router!
      console.log('[MCP] Request received:', {
        url: request.url,
        method: request.method,
        timestamp: context.timestamp
      })
    },
    onToolCall: async (toolName, args, context) => {
      console.log('[MCP] Tool called:', toolName, args)
    },
    onToolSuccess: async (toolName, result, duration, context) => {
      console.log(`[MCP] Tool ${toolName} completed in ${duration}ms`)
    },
    onToolError: async (toolName, error, context) => {
      console.error(`[MCP] Tool ${toolName} failed:`, error.message)
    }
  })

  // OAuth configuration (uncomment to enable)
  // .withOAuth({
  //   issuer: process.env.OAUTH_ISSUER || 'https://auth.example.com',
  //   resourceMetadataPath: '/.well-known/oauth-protected-resource',
  //   scopes: ['mcp:read', 'mcp:write'],
  //   verifyToken: async ({ bearerToken, context }) => {
  //     // context is automatically typed from the router!
  //     // Implement your token verification logic here
  //     return { valid: true, user: { id: 'user-123' } }
  //   }
  // })

  // Adapter configuration
  .withAdapter({
    basePath: '/api/mcp',
    verboseLogs: true,
    redis: {
      url: process.env.REDIS_URL!,
      keyPrefix: 'igniter:mcp:',
    },
  })
  .build()

export const GET = handler
export const POST = handler
export const DELETE = handler

// OAuth endpoints (if OAuth is enabled)
// export const OPTIONS = auth.cors
