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

The package provides **two** APIs for creating an MCP adapter:

1. **Builder Pattern API** (`IgniterMcpServer`) - **Recommended** for TypeScript projects with full type inference
2. **Function API** (`createMcpAdapter`) - For simpler setups and JavaScript projects

### 1. Create the MCP Route Handler (Builder Pattern - Recommended)

In your Next.js application, create a new API route to handle MCP requests. For example: `src/app/api/mcp/[...transport]/route.ts`.

```typescript
// src/app/api/mcp/[...transport]/route.ts
import { IgniterMcpServer } from '@igniter-js/adapter-mcp-server';
import { AppRouter } from '@/igniter.router'; // Import your main Igniter.js router

/**
 * Create the MCP server using the builder pattern.
 * This provides full type inference and a fluent API.
 */
const { handler, auth } = IgniterMcpServer
  .create()
  .router(AppRouter)
  .withServerInfo({
    name: 'Igniter.js MCP Server',
    version: '1.0.0',
  })
  .withInstructions("Use the available tools to manage users and products in the Acme Corporation API.")
  .build();

/**
 * Export the handler for Next.js to handle both GET and POST requests,
 * which are used by different MCP transport methods (like SSE and WebSockets).
 */
export const GET = handler;
export const POST = handler;

/**
 * Optional: Export OAuth endpoints if using OAuth protection
 */
// export const OPTIONS = auth.cors;
// export { auth.resource as GET } from the OAuth metadata endpoint
```

### Alternative: Function API (Simple Configuration)

For simpler setups, you can use the function-based API:

```typescript
// src/app/api/mcp/[...transport]/route.ts
import { createMcpAdapter } from '@igniter-js/adapter-mcp-server';
import { AppRouter } from '@/igniter.router';

const { server, auth } = createMcpAdapter({
  router: AppRouter,
  serverInfo: {
    name: 'Igniter.js MCP Server',
    version: '1.0.0',
  },
  instructions: "Use the available tools to manage users and products.",
});

export const GET = server;
export const POST = server;
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

### Builder Pattern: Adding Custom Tools

The builder pattern provides a fluent API for adding custom tools with full type inference:

```typescript
import { IgniterMcpServer } from '@igniter-js/adapter-mcp-server';
import { z } from 'zod';

const { handler } = IgniterMcpServer
  .create()
  .router(AppRouter)
  .withServerInfo({
    name: 'Igniter.js MCP Server',
    version: '1.0.0',
  })
  .addTool({
    name: 'calculateTax',
    description: 'Calculate tax for a given amount',
    args: z.object({
      amount: z.number(),
      taxRate: z.number(),
    }),
    handler: async (args, context) => {
      // context is automatically typed from the router!
      const tax = args.amount * args.taxRate;
      return {
        content: [{
          type: 'text',
          text: `Tax: $${tax.toFixed(2)}`
        }]
      };
    }
  })
  .addTool({
    name: 'getCurrentTime',
    description: 'Get the current server time',
    args: z.object({}),
    handler: async (args, context) => {
      return {
        content: [{
          type: 'text',
          text: `Current time: ${new Date().toISOString()}`
        }]
      };
    }
  })
  .build();

export const GET = handler;
export const POST = handler;
```

### Builder Pattern: Adding Custom Prompts

Register prompts that AI agents can use to guide interactions:

```typescript
const { handler } = IgniterMcpServer
  .create()
  .router(AppRouter)
  .addPrompt({
    name: 'debugUser',
    description: 'Debug user account issues',
    args: z.object({
      userId: z.string(),
    }),
    handler: async (args, context) => {
      // context is automatically typed from the router!
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Please debug the account for user ${args.userId}. Check their permissions, recent activity, and any error logs.`
          }
        }]
      };
    }
  })
  .build();
```

### Builder Pattern: Adding Custom Resources

Expose resources that AI agents can read:

```typescript
const { handler } = IgniterMcpServer
  .create()
  .router(AppRouter)
  .addResource({
    uri: 'config://app/settings',
    name: 'Application Settings',
    description: 'Current application configuration',
    mimeType: 'application/json',
    handler: async (context) => {
      // context is automatically typed from the router!
      const settings = await getAppSettings();
      return {
        contents: [{
          uri: 'config://app/settings',
          mimeType: 'application/json',
          text: JSON.stringify(settings, null, 2)
        }]
      };
    }
  })
  .build();
```

### Builder Pattern: OAuth Authorization

Protect your MCP server with OAuth using the builder pattern:

```typescript
const { handler, auth } = IgniterMcpServer
  .create()
  .router(AppRouter)
  .withOAuth({
    issuer: 'https://auth.example.com',
    resourceMetadataPath: '/.well-known/oauth-protected-resource',
    scopes: ['mcp:read', 'mcp:write'],
    verifyToken: async (token, context) => {
      // context is automatically typed from the router!
      const result = await verifyJWT(token);
      return {
        valid: result.valid,
        user: result.user
      };
    }
  })
  .build();

// Export the handler and OAuth endpoints
export const GET = handler;
export const POST = handler;
export const OPTIONS = auth.cors;

// In your OAuth metadata endpoint route (e.g., /.well-known/oauth-protected-resource)
// export { auth.resource as GET };
```

The adapter will:
1. Expose OAuth metadata at the specified path
2. Require ****** on all requests
3. Verify tokens using your custom verification function
4. Return proper 401 responses with WWW-Authenticate headers

### Builder Pattern: Event Handlers

Monitor and log MCP operations using the builder pattern:

```typescript
const { handler } = IgniterMcpServer
  .create()
  .router(AppRouter)
  .withEvents({
    onRequest: async (request, context) => {
      // context is automatically typed from the router!
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
  })
  .build();
```

### Function API: Custom Tools, Prompts, Resources

For the function-based API, you can configure everything in a single options object:

```typescript
const { server } = createMcpAdapter({
  router: AppRouter,
  tools: {
    custom: [{
      name: 'calculateTax',
      description: 'Calculate tax for a given amount',
      args: z.object({
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
    }]
  },
  prompts: {
    custom: [{
      name: 'debugUser',
      description: 'Debug user account issues',
      args: z.object({ userId: z.string() }),
      handler: async (args, context) => {
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: `Please debug the account for user ${args.userId}.`
            }
          }]
        };
      }
    }]
  },
  resources: {
    custom: [{
      uri: 'config://app/settings',
      name: 'Application Settings',
      description: 'Current application configuration',
      mimeType: 'application/json',
      handler: async (context) => {
        const settings = await getAppSettings();
        return {
          contents: [{
            uri: 'config://app/settings',
            mimeType: 'application/json',
            text: JSON.stringify(settings, null, 2)
          }]
        };
      }
    }]
  },
  events: {
    onToolCall: async (toolName, args, context) => {
      console.log(`Tool called: ${toolName}`, args);
    }
  }
});

export const GET = server;
export const POST = server;
```

### Tool Configuration

Both APIs support customizing how router actions are exposed as tools.

#### Builder Pattern

```typescript
const { handler } = IgniterMcpServer
  .create()
  .router(AppRouter)
  .withToolTransform({
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
  })
  .build();
```

#### Function API

```typescript
const { server } = createMcpAdapter({
  router: AppRouter,
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

Both APIs support configuring the underlying MCP adapter options.

#### Builder Pattern

```typescript
const { handler } = IgniterMcpServer
  .create()
  .router(AppRouter)
  .withAdapter({
    basePath: '/api/mcp',
    maxDuration: 60,
    verboseLogs: true,
    redis: {
      url: process.env.REDIS_URL,
      keyPrefix: 'igniter:mcp:'
    }
  })
  .build();
```

#### Function API

```typescript
const { server } = createMcpAdapter({
  router: AppRouter,
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

## API Comparison

### Builder Pattern vs Function API

**Builder Pattern (Recommended)**
- ✅ Full TypeScript type inference for tools, prompts, and resources
- ✅ Fluent, chainable API for step-by-step configuration
- ✅ Better IDE autocomplete and type safety
- ✅ Explicit separation of concerns

**Function API**
- ✅ Simpler for basic use cases
- ✅ Single configuration object
- ✅ Works well in JavaScript projects
- ✅ Less verbose for small configurations

## Migration Guide

### From v0.2.x to v0.3.x

The v0.3.0 release introduces a new builder pattern API alongside the existing function API.

**Old API (v0.2.x) - Still works:**
```typescript
const { server } = createMcpAdapter({
  router: AppRouter,
  serverInfo: { name: 'My Server', version: '1.0.0' },
  tools: { custom: [...] },
});

export const GET = server;
export const POST = server;
```

**New Builder API (v0.3.x) - Recommended:**
```typescript
const { handler } = IgniterMcpServer
  .create()
  .router(AppRouter)
  .withServerInfo({ name: 'My Server', version: '1.0.0' })
  .addTool({ ... })
  .addPrompt({ ... })
  .build();

export const GET = handler;
export const POST = handler;
```

The builder pattern provides better type inference and a more flexible API for complex configurations.

### Key Differences

1. **Router Configuration**: Router is now part of the configuration object in both APIs
2. **Context Inference**: Context is automatically inferred from the router - no manual context creation needed
3. **Builder Pattern**: New chainable API for progressive configuration
4. **Type Safety**: Enhanced type inference throughout all handlers

For more detailed guides, please refer to the **[Official Igniter.js Documentation](https://igniterjs.com/docs)**.

## Contributing

Contributions are welcome! Please see the main [CONTRIBUTING.md](/CONTRIBUTING.md) file for details on how to get started.

## License

This package is licensed under the [MIT License](/LICENSE).
