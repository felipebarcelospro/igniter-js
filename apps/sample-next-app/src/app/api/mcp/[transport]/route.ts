import { createMcpAdapter } from '@igniter-js/adapter-mcp-server'
import { AppRouter } from '@/igniter.router'

/**
 * MCP server instance for exposing API as a MCP server.
 *
 * @see https://github.com/felipebarcelospro/igniter-js/tree/main/packages/adapter-mcp
 */
export const { GET, POST, DELETE } = createMcpAdapter(AppRouter, {
  serverInfo: {
    name: 'Igniter.js MCP Server',
    version: '1.0.0',
  },
  context: (request: Request) => {
    return {
      context: {
        user: request.headers.get('user') || 'anonymous',
      },
      tools: [],
      request,
      timestamp: Date.now(),
    }
  },
  adapter: {
    basePath: '/api/mcp',
    verboseLogs: true,
    redis: {
      url: process.env.REDIS_URL!,
      keyPrefix: 'igniter:mcp:',
    },
  },
})
