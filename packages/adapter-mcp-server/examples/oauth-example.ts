/**
 * OAuth Configuration Example for MCP Adapter
 * 
 * This example demonstrates how to configure OAuth authorization
 * for your MCP server, including token verification and protected
 * resource metadata exposure.
 */

import { createMcpAdapter } from '@igniter-js/adapter-mcp-server';

/**
 * Example: Basic OAuth Configuration
 * 
 * This configuration enables OAuth Bearer token authentication
 * and exposes the required metadata endpoint.
 */
export const basicOAuthExample = createMcpAdapter(AppRouter, {
  serverInfo: {
    name: 'Protected MCP Server',
    version: '1.0.0',
  },

  oauth: {
    // The OAuth issuer (authorization server URL)
    issuer: 'https://auth.example.com',
    
    // Path where OAuth metadata will be exposed
    resourceMetadataPath: '/.well-known/oauth-protected-resource',
    
    // Scopes required to access this MCP server
    scopes: ['mcp:read', 'mcp:write'],
    
    // Token verification function - called for every request
    verifyToken: async (token: string) => {
      const isValid = await yourTokenVerifier(token);
      return isValid;
    },
  },
});

/**
 * Testing OAuth Configuration
 * 
 * 1. Start your MCP server
 * 2. Make a request without a token:
 *    curl http://localhost:3000/api/mcp/sse
 *    Expected: 401 Unauthorized
 * 
 * 3. Check the metadata endpoint:
 *    curl http://localhost:3000/.well-known/oauth-protected-resource
 *    Expected: JSON with authorization server info
 * 
 * 4. Make a request with a valid token:
 *    curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/mcp/sse
 *    Expected: Normal MCP response
 */
