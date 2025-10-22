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
  // Optional: Provide custom instructions for the AI agent.
  instructions: "This is the API for the Acme Corporation. Use the available tools to manage users and products.",

  // Optional: Define custom context for the MCP server.
  // This can be used to pass user-specific authentication data.
  context: async (req) => {
    const user = await getUserFromRequest(req); // Your auth logic
    return {
      user,
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

## Documentation

For comprehensive guides, advanced configuration, security best practices, and examples:

- **[MCP Adapter Documentation](https://igniterjs.com/docs/code-agents/mcp-adapter)** - Full guide with advanced features
- **[Official Igniter.js Docs](https://igniterjs.com/docs)** - Complete framework documentation

## Contributing

Contributions are welcome! Please see the main [CONTRIBUTING.md](/CONTRIBUTING.md) file for details on how to get started.

## License

This package is licensed under the [MIT License](/LICENSE).
