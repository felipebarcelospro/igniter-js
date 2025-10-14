# @igniter-js/adapter-mcp-server

[![NPM Version](https://img.shields.io/npm/v/@igniter-js/adapter-mcp-server.svg)](https://www.npmjs.com/package/@igniter-js/adapter-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The official Model Context Protocol (MCP) adapter for Igniter.js. This package exposes your entire Igniter.js API as a set of tools that can be consumed by MCP-compatible AI agents and applications.

## Role in the Ecosystem

This adapter transforms your Igniter.js application into an AI-native tool server. It allows AI agents, such as those integrated into IDEs like Cursor, to understand and interact with your API endpoints as if they were native functions. This is a key part of the "AI-Friendly" philosophy of Igniter.js, enabling powerful automated workflows.

## Installation

To use this adapter, you need to install it alongside `@igniter-js/core`.

```bash
# npm
npm install @igniter-js/adapter-mcp-server @igniter-js/core

# yarn
yarn add @igniter-js/adapter-mcp-server @igniter-js/core

# pnpm
pnpm add @igniter-js/adapter-mcp-server @igniter-js/core

# bun
bun add @igniter-js/adapter-mcp-server @igniter-js/core
```

## Basic Usage

The primary export of this package is the `createMcpAdapter` factory function. You use this function to wrap your existing `AppRouter` and expose it through an API route handler.

### 1. Create the MCP Route Handler

In your Next.js application, create a new API route to handle MCP requests. For example: `src/app/api/mcp/[...transport]/route.ts`.

```typescript
// src/app/api/mcp/[...transport]/route.ts
import { createMcpAdapter } from '@igniter-js/adapter-mcp-server';
import { AppRouter } from '@/igniter.router'; // Import your main Igniter.js router

/**
 * Create the MCP handler by passing your AppRouter to the adapter.
 * The adapter introspects your router and exposes its actions as tools.
 */
const mcpHandler = createMcpAdapter(AppRouter, {
  serverInfo: {
    name: 'Igniter.js MCP Server',
    version: '1.0.0',
  },
  
  // Optional: Provide custom instructions for the AI agent.
  instructions: "This is the API for the Acme Corporation. Use the available tools to manage users and products.",

  // Optional: Define custom context for the MCP server.
  // This can be used to pass user-specific authentication data.
  context: async (req) => {
    const user = await getUserFromRequest(req); // Your auth logic
    return {
      context: { user },
      tools: [],
      request: req,
      timestamp: Date.now(),
    };
  },
});

/**
 * Export the handler for Next.js to handle both GET and POST requests,
 * which are used by different MCP transport methods (like SSE and WebSockets).
 */
export { mcpHandler as GET, mcpHandler as POST };
```

### 2. Connect from an MCP Client

With this handler in place, your Igniter.js API is now an MCP server. You can connect to it from any MCP-compatible client.

For example, in an AI-powered IDE like Cursor, you would configure your custom MCP server with the following URL:

```
http://localhost:3000/api/mcp/sse
```

The AI can now discover and call your API actions:

**AI Prompt:**
> "List the users in the system."

The MCP adapter will translate this into a call to `api.users.list.query()` on your backend, execute it, and return the result to the AI.

## Advanced Features

### Custom Tools

You can register custom tools that are not part of your Igniter router:

```typescript
const mcpHandler = createMcpAdapter(AppRouter, {
  tools: {
    custom: [
      {
        name: 'calculateTax',
        description: 'Calculate tax for a given amount',
        schema: z.object({
          amount: z.number(),
          taxRate: z.number(),
        }),
        handler: async (args, context) => {
          const tax = args.amount * args.taxRate;
          return {
            content: [{
              type: 'text',
              text: `Tax: $${tax.toFixed(2)}`
            }]
          };
        }
      }
    ]
  }
});
```

### Custom Prompts

Register prompts that AI agents can use to guide interactions:

```typescript
const mcpHandler = createMcpAdapter(AppRouter, {
  prompts: {
    custom: [
      {
        name: 'debugUser',
        description: 'Debug user account issues',
        arguments: [
          { name: 'userId', description: 'User ID to debug', required: true }
        ],
        handler: async (args, context) => {
          return {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Please help me debug issues for user ${args.userId}. Check their account status, recent activity, and any error logs.`
                }
              }
            ]
          };
        }
      }
    ]
  }
});
```

### Custom Resources

Expose resources that AI agents can read:

```typescript
const mcpHandler = createMcpAdapter(AppRouter, {
  resources: {
    custom: [
      {
        uri: 'config://app/settings',
        name: 'Application Settings',
        description: 'Current application configuration',
        mimeType: 'application/json',
        handler: async (context) => {
          const settings = await getAppSettings();
          return {
            contents: [
              {
                uri: 'config://app/settings',
                mimeType: 'application/json',
                text: JSON.stringify(settings, null, 2)
              }
            ]
          };
        }
      }
    ]
  }
});
```

### OAuth Authorization

Protect your MCP server with OAuth:

```typescript
const mcpHandler = createMcpAdapter(AppRouter, {
  oauth: {
    issuer: 'https://auth.example.com',
    resourceMetadataPath: '/.well-known/oauth-protected-resource',
    scopes: ['mcp:read', 'mcp:write'],
    verifyToken: async (token) => {
      // Verify the token with your auth provider
      const result = await verifyJWT(token);
      return {
        valid: result.valid,
        user: result.user
      };
    }
  }
});
```

The adapter will:
1. Expose OAuth metadata at the specified path
2. Require Bearer tokens on all requests
3. Verify tokens using your custom verification function
4. Return proper 401 responses with WWW-Authenticate headers

### Event Handlers

Monitor and log MCP operations:

```typescript
const mcpHandler = createMcpAdapter(AppRouter, {
  events: {
    onRequest: async (request, context) => {
      console.log('MCP request received:', request.url);
    },
    onResponse: async (response, context) => {
      console.log('MCP response sent');
    },
    onToolCall: async (toolName, args, context) => {
      console.log(`Tool called: ${toolName}`, args);
    },
    onToolSuccess: async (toolName, result, duration, context) => {
      console.log(`Tool ${toolName} completed in ${duration}ms`);
    },
    onToolError: async (toolName, error, context) => {
      console.error(`Tool ${toolName} failed:`, error);
    },
    onError: async (error, context) => {
      console.error('MCP adapter error:', error);
    }
  }
});
```

### Tool Configuration

Customize how router actions are exposed as tools:

```typescript
const mcpHandler = createMcpAdapter(AppRouter, {
  tools: {
    // Disable automatic mapping of all router actions
    autoMap: true,
    
    // Custom naming strategy
    naming: (controller, action) => `${controller}_${action}`,
    
    // Filter which actions to expose
    filter: (controller, action, actionConfig) => {
      // Only expose actions with a specific tag
      return actionConfig.tags?.includes('mcp-enabled');
    },
    
    // Transform action configurations
    transform: (controller, action, actionConfig) => ({
      name: `${controller}.${action}`,
      description: actionConfig.summary || actionConfig.description,
      schema: actionConfig.body || actionConfig.query,
      tags: actionConfig.tags
    })
  }
});
```

### Adapter Configuration

Configure the underlying MCP adapter:

```typescript
const mcpHandler = createMcpAdapter(AppRouter, {
  adapter: {
    basePath: '/api/mcp',
    maxDuration: 60,
    verboseLogs: true,
    redis: {
      url: process.env.REDIS_URL,
      keyPrefix: 'igniter:mcp:'
    }
  }
});
```

## Migration Guide

If you're upgrading from an older version, the API is fully backward compatible. All existing configurations will continue to work. The new features are opt-in:

```typescript
// Old API (still works)
const mcpHandler = createMcpAdapter(AppRouter, {
  serverInfo: { name: 'My Server', version: '1.0.0' },
  context: (req) => ({ /* ... */ }),
  adapter: { basePath: '/api/mcp' }
});

// New API (with extended features)
const mcpHandler = createMcpAdapter(AppRouter, {
  serverInfo: { name: 'My Server', version: '1.0.0' },
  context: (req) => ({ /* ... */ }),
  prompts: { custom: [ /* ... */ ] },  // NEW
  resources: { custom: [ /* ... */ ] }, // NEW
  oauth: { /* ... */ },                 // NEW
  adapter: { basePath: '/api/mcp' }
});
```

For more detailed guides, please refer to the **[Official Igniter.js Wiki](https://igniterjs.com/docs)**.

## Contributing

Contributions are welcome! Please see the main [CONTRIBUTING.md](/CONTRIBUTING.md) file for details on how to get started.

## License

This package is licensed under the [MIT License](/LICENSE).
