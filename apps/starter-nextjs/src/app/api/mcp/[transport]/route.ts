import { createMcpAdapter } from '@igniter-js/adapter-mcp-server'
import { AppRouter } from '@/igniter.router'
import { z } from 'zod'

/**
 * MCP server instance for exposing API as a MCP server.
 * 
 * This example demonstrates the new MCP adapter API with:
 * - Router as a configuration property
 * - Context automatically inferred from the router
 * - Type-safe event handlers, prompts, and resources
 * - Optional OAuth configuration (commented out)
 *
 * @see https://github.com/felipebarcelospro/igniter-js/tree/main/packages/adapter-mcp-server
 */
export const { GET, POST, DELETE } = createMcpAdapter({
  router: AppRouter,
  
  serverInfo: {
    name: 'Igniter.js MCP Server',
    version: '1.0.0',
  },
  
  // Custom instructions for AI agents
  instructions: 'This is a demo Igniter.js MCP server. Use the available tools to interact with the API.',

  // Custom tools (not from router)
  tools: {
    custom: [
      {
        name: 'getCurrentTime',
        description: 'Get the current server time',
        schema: z.object({}),
        handler: async (args, context) => {
          // context is automatically typed from the router!
          return {
            content: [{
              type: 'text' as const,
              text: `Current server time: ${new Date().toISOString()}`
            }]
          }
        }
      }
    ]
  },

  // Custom prompts for AI guidance
  prompts: {
    custom: [
      {
        name: 'exploreAPI',
        description: 'Get guidance on exploring the Igniter.js API',
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
      }
    ]
  },

  // Custom resources for AI to read
  resources: {
    custom: [
      {
        uri: 'info://server/status',
        name: 'Server Status',
        description: 'Current server status and information',
        mimeType: 'application/json',
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
      }
    ]
  },

  // Event handlers for monitoring and logging
  events: {
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
  },

  // OAuth configuration (uncomment to enable)
  // oauth: {
  //   issuer: process.env.OAUTH_ISSUER || 'https://auth.example.com',
  //   resourceMetadataPath: '/.well-known/oauth-protected-resource',
  //   scopes: ['mcp:read', 'mcp:write'],
  //   verifyToken: async (token, context) => {
  //     // context is automatically typed from the router!
  //     // Implement your token verification logic here
  //     return { valid: true, user: { id: 'user-123' } }
  //   }
  // },

  // Adapter configuration
  adapter: {
    basePath: '/api/mcp',
    verboseLogs: true,
    redis: {
      url: process.env.REDIS_URL!,
      keyPrefix: 'igniter:mcp:',
    },
  },
})
