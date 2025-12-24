/**
 * @fileoverview Browser/client-side shim for @igniter-js/agents
 * @module @igniter-js/agents/shim
 *
 * @description
 * This module prevents @igniter-js/agents from being used in browser environments.
 * The agent package is server-only as it relies on Node.js APIs, MCP protocols,
 * and should not be bundled into client-side code.
 *
 * If you're seeing this error, you're likely:
 * 1. Importing @igniter-js/agents in client-side code
 * 2. Using it in a React/Vue/Svelte component without proper server boundaries
 * 3. Not using "use server" directive in frameworks that support it
 *
 * @example
 * ```typescript
 * // WRONG - Don't import in client components
 * import { IgniterAgent } from '@igniter-js/agents'; // Will throw error
 *
 * // CORRECT - Use in server-side code only
 * // In Next.js, use Server Actions or API routes
 * // In other frameworks, use server-side rendering or API endpoints
 * ```
 */

const SERVER_ONLY_ERROR = `
================================================================================
@igniter-js/agents: Server-Only Package
================================================================================

This package cannot be used in browser/client environments.

The @igniter-js/agents package is designed exclusively for server-side usage
because it:
- Uses Node.js-specific APIs
- Connects to MCP (Model Context Protocol) servers
- Handles sensitive AI model credentials
- Requires server-side process management

SOLUTIONS:

1. Next.js App Router:
   - Use Server Components (default in app/ directory)
   - Use Server Actions with "use server" directive
   - Use API routes (app/api/*)

2. Next.js Pages Router:
   - Use getServerSideProps
   - Use API routes (pages/api/*)

3. Other Frameworks:
   - Move agent logic to server-side endpoints
   - Use tRPC, GraphQL, or REST APIs

4. Development/Testing:
   - Run agent code in Node.js directly
   - Use server-side test runners

For documentation, visit: https://igniterjs.com/docs/agents

================================================================================
`;

/**
 * Throws an error when attempting to use the agent package in a browser environment.
 * @throws {Error} Always throws with server-only message
 */
function throwServerOnlyError(): never {
  throw new Error(SERVER_ONLY_ERROR);
}

// Export shim versions that throw errors
export const IgniterAgent = {
  create: throwServerOnlyError,
};

export const IgniterAgentBuilder = {
  create: throwServerOnlyError,
};

export const IgniterAgentToolsetBuilder = {
  create: throwServerOnlyError,
};

export const IgniterAgentMCPBuilder = {
  create: throwServerOnlyError,
};

export const IgniterAgentPromptBuilder = {
  create: throwServerOnlyError,
};

export const IgniterAgentToolBuilder = {
  create: throwServerOnlyError,
};

export const IgniterAgentManager = {
  create: throwServerOnlyError,
};

export const IgniterAgentToolset = {
  create: throwServerOnlyError,
};

export const IgniterAgentTool = {
  create: throwServerOnlyError,
};

export const IgniterAgentMCPClient = {
  create: throwServerOnlyError,
};

export const IgniterAgentPrompt = {
  create: throwServerOnlyError,
};

export const IgniterAgentInMemoryAdapter = {
  create: throwServerOnlyError,
};

// Error exports (these are safe to use in browser for type checking)
export class IgniterAgentError extends Error {
  constructor() {
    super(SERVER_ONLY_ERROR);
    this.name = "IgniterAgentError";
  }
}

export const IgniterAgentErrorCode = {};
export const isIgniterAgentError = () => false;
