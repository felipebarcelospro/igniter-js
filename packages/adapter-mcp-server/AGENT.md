# AI Agent Maintenance Manual: `@igniter-js/adapter-mcp-server`

**Version:** 1.0.0
**For AI Agent:** You are an expert TypeScript software engineer. This document is your primary technical guide to the `@igniter-js/adapter-mcp-server` package. Read and understand it thoroughly before attempting any modifications. Your goal is to perform maintenance tasks accurately, respecting the architectural principles outlined here.

---

## 1. Package Overview

### 1.1. Package Name
`@igniter-js/adapter-mcp-server`

### 1.2. Purpose
This package is an **Adapter** that exposes an entire Igniter.js `AppRouter` as a set of "tools" consumable by AI agents and clients that adhere to the **Model-Context-Protocol (MCP)**. Its primary function is to make your Igniter.js API "AI-native," allowing large language models to understand and execute your API actions to fulfill user requests.

---

## 2. Architecture & Key Concepts

This adapter acts as a translation and execution layer between the MCP standard and the Igniter.js framework.

### 2.1. The Adapter's Core Responsibility
The fundamental responsibility of this adapter is to perform several main operations:
1.  **Introspection & Tool Definition:** When initialized, the adapter inspects the provided `AppRouter` object. It iterates through every controller and action, transforming each `IgniterAction` into a formal "tool" definition that an MCP client can understand.
2.  **Execution & Translation:** When an MCP client requests a tool to be executed, the adapter receives this request, translates the tool call back into an Igniter.js action call, executes it, and then translates the result back into an MCP-compliant format.
3.  **Prompts & Resources:** The adapter supports registering custom prompts and resources, allowing AI agents to access structured guidance and data.
4.  **OAuth Authorization:** The adapter can enforce OAuth-based authorization, requiring valid Bearer tokens and exposing protected resource metadata endpoints.
5.  **Event Handling:** Comprehensive event hooks allow monitoring and logging of all MCP operations.

### 2.2. Introspection and Tool Generation
This is the heart of the adapter.
-   **Router Traversal:** The `createMcpAdapter` function recursively traverses the `AppRouter.controllers` map.
-   **Action-to-Tool Mapping:** Each `IgniterAction` (from `igniter.query` or `igniter.mutation`) is converted into an MCP tool. The tool's name is derived from its path in the router, such as `users.list` or `posts.getById`.
-   **Schema Conversion:** This is a critical step. The Zod schemas defined in the `body` and `query` properties of an `IgniterAction` are converted into **JSON Schema**. The JSON Schema standard is what MCP uses to describe the parameters a tool accepts. This allows the AI agent to know exactly what arguments are required and what their types are. Libraries like `zod-to-json-schema` are often used for this purpose.

### 2.3. The Execution Flow
When an AI agent decides to call a tool, the following sequence occurs:
1.  **Incoming MCP Request:** The adapter's handler receives an HTTP request from the MCP client with a payload indicating the tool to run and its arguments.
2.  **Tool-to-Action Resolution:** The adapter looks up the requested tool name (e.g., `users.create`) and finds the corresponding `IgniterAction` in its internal map.
3.  **Server-Side Invocation:** Instead of making an HTTP request to itself, the adapter uses the powerful `router.$caller` property. The `$caller` allows direct, type-safe, server-side invocation of any action, bypassing the HTTP stack entirely for maximum performance.
4.  **Argument Passing:** The arguments from the MCP request are passed as the `input` to the `$caller` method (e.g., `router.$caller.users.create({ body: { ... } })`).
5.  **Result Formatting:** The result from the action's execution is received. The adapter then formats this result into the expected MCP response format (typically a JSON object or a simple string) and sends it back to the client.

---

## 3. File & Directory Map (`src/`)

The package has a minimal and focused structure.

*   `src/index.ts`
    > **Purpose**: The public entry point of the package. It exports the primary factory function, `createMcpAdapter`.
    > **Maintenance**: This file should only be modified if the main export's signature or name changes.

*   `src/mcp.adapter.ts`
    > **Purpose**: **This is the most critical file.** It contains the implementation of the `createMcpAdapter` factory function. All core logic resides here, including:
    >    - The introspection loop that builds the tool definitions.
    >    - The schema conversion logic (Zod to JSON Schema).
    >    - The HTTP request handler that processes incoming MCP tool calls.
    >    - The logic that uses `router.$caller` to execute actions.
    > **Maintenance**: Any change to how tools are defined, executed, or how results are formatted will happen in this file.

*   `src/types.ts`
    > **Purpose**: Contains all TypeScript `interface` and `type` definitions that are **specific to this adapter**. This most importantly includes:
    >    - `McpAdapterOptions` type, which defines the configuration object
    >    - `McpPrompt`, `McpResource`, and `McpOAuthConfig` interfaces for extensibility features
    >    - `McpContext`, `McpToolInfo`, `McpCustomTool`, and `McpResponse` core types
    > **Maintenance**: If you need to add a new configuration option or extend functionality, update type definitions here first.

---

## 4. Common Maintenance Tasks for AI Agents

This section provides explicit, step-by-step instructions for performing common maintenance tasks on this adapter.

### Task 1: Add Support for a New Action Property in Tool Definitions

**Scenario:** A new `summary` property has been added to the `IgniterAction` interface in `@igniter-js/core`. We need the MCP adapter to use this `summary` as the `description` for the generated tool, as it's more concise than the full `description` property.

1.  **Objective Analysis:** The goal is to change the tool generation logic to prioritize a new `summary` field for the tool's description.
2.  **Locate Tool Generation Logic:** The logic that introspects the `AppRouter` and creates the list of MCP tools is the target.
    -   **File:** `packages/adapter-mcp-server/src/mcp.adapter.ts`.
    -   **Action:** Find the loop inside `createMcpAdapter` where it iterates over controllers and actions to build the `tools` array.
3.  **Modify the Tool Definition Mapping:** Update the logic that assigns the `description` property for the MCP tool.
    ```typescript
    // Inside the action iteration loop in mcp.adapter.ts

    // ... existing logic to get action ...
    const action = controller.actions[actionName];

    const mcpTool = {
      name: `...`,
      // OLD LOGIC:
      // description: action.description || 'No description provided.',
      
      // NEW LOGIC: Prioritize the new 'summary' field.
      description: action.summary || action.description || `Executes the ${toolName} action.`,
      
      parameters: {
        // ... parameter generation logic ...
      }
    };
    // ...
    ```
4.  **Write/Update Tests:**
    -   **File:** `packages/adapter-mcp-server/src/__tests__/mcp.adapter.test.ts` (or create it if it doesn't exist).
    -   **Action:**
        -   Create a mock `AppRouter` for the test.
        -   Define one action *with* the new `summary` property and another action *without* it (but with a `description`).
        -   Initialize the `createMcpAdapter` with this mock router.
        -   Inspect the generated tools array.
        -   Assert that the first tool's `description` correctly uses the value from the `summary` field.
        -   Assert that the second tool's `description` correctly falls back to using the value from the `description` field.

### Task 2: Allow Custom Context to be Passed to Called Actions

**Scenario:** When the MCP server calls an action via `$caller`, the action currently receives the default application context. We need a way to provide a custom, per-request context, for example, to pass the identity of the AI agent making the call.

1.  **Objective Analysis:** The `router.$caller` method needs a way to accept a custom context. This is a feature of `@igniter-js/core`. The adapter then needs to be updated to leverage this feature.
2.  **Verify/Update Core Capability:** First, confirm that the `$caller` in `@igniter-js/core` supports passing context. Let's assume it has been updated to `router.$caller.users.create({ body: {...} }, { customContext: {...} })`.
3.  **Update Adapter's Type Definitions:** The `createMcpAdapter` options should accept a context factory function.
    -   **File:** `packages/adapter-mcp-server/src/types.ts`.
    -   **Action:** Modify the `McpAdapterOptions` interface.
    ```typescript
    // In types.ts
    export interface McpAdapterOptions {
      // ... existing options
      
      /**
       * An async function that creates a custom context for each tool call.
       * It receives the incoming HTTP request.
       * The returned object will be passed to the Igniter.js action handler.
       */
      context?: (request: Request) => Promise<object>;
    }
    ```
4.  **Locate Execution Logic:**
    -   **File:** `packages/adapter-mcp-server/src/mcp.adapter.ts`.
    -   **Action:** Find where `processor.call` (or `router.$caller`) is invoked.
5.  **Implement Context Injection:** Modify the execution logic to create and pass the custom context.
    ```typescript
    // Inside the MCP request handler in mcp.adapter.ts

    // ... logic to identify the tool and arguments ...

    let customContext = {};
    // Check if the developer provided a context factory in the adapter config.
    if (config.context && typeof config.context === 'function') {
      customContext = await config.context(request);
    }
    
    // Execute the action using the caller, passing the custom context.
    // This assumes the `$caller` method was updated to accept a context object.
    const result = await processor.call(
      controllerName, 
      actionName, 
      mcpArguments,
      { context: customContext } // Pass the custom context
    );
    // ...
    ```
6.  **Write/Update Tests:**
    -   **File:** `packages/adapter-mcp-server/src/__tests__/mcp.adapter.test.ts`.
    -   **Action:**
        -   Create a mock action handler that checks for a specific value in its `context` (e.g., `context.agentId`).
        -   Initialize the `createMcpAdapter` with a `context` factory function in its options that returns `{ agentId: 'test-agent' }`.
        -   Simulate an MCP tool call to the mock action.
        -   Inside the mock action handler's test implementation, assert that `context.agentId` is equal to `'test-agent'`. This proves the context was correctly created and passed through the call stack.

By following these detailed, methodical steps, you will ensure that all modifications are implemented correctly, are well-tested, and respect the architectural boundaries of the Igniter.js ecosystem.
