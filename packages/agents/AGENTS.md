# AGENTS.md - @igniter-js/agents

> **Last Updated:** 2025-12-23
> **Version:** 0.1.0
> **Goal:** This document serves as the complete operational manual for Code Agents maintaining and consuming the @igniter-js/agents package. It is designed to be hyper-robust, training-ready, and exhaustive, aiming for at least 1,500 lines of high-quality content to ensure the agent fully dominates the package's domain, architecture, and usage.

---

## 1. Package Vision & Context

**@igniter-js/agents** is the comprehensive AI agent framework for the Igniter.js ecosystem. In the rapidly evolving landscape of AI-powered applications, traditional API-first architectures often struggle to provide natural, conversational interfaces that can handle complex multi-step tasks, adapt to context, and learn from interactions. This package bridges that gap by providing a type-safe, observable, and extensible foundation for building AI agents that can seamlessly integrate with Igniter.js APIs, maintain persistent memory, execute tools, and communicate via Model Context Protocol (MCP).

### Core Value Propositions

1.  **Type-Safe Agent Development:** Leverages TypeScript's advanced type system to ensure that agent tools, prompts, and configurations are validated at compile time, preventing runtime errors and improving developer productivity.

2.  **Multi-Agent Orchestration:** Provides a manager pattern that can coordinate multiple specialized agents, each with their own tools, memory, and context, enabling complex workflows and task delegation.

3.  **Memory Persistence:** Implements an adapter-based memory system that supports different storage backends (currently in-memory, extensible to Redis, Prisma, etc.) for maintaining conversation history and learned context across sessions.

4.  **MCP Integration:** Native support for the Model Context Protocol, enabling agents to communicate with MCP-compatible servers and access external tools and resources.

5.  **Comprehensive Observability:** Deep integration with @igniter-js/telemetry for tracking agent lifecycle, tool usage, memory operations, and performance metrics.

6.  **Hook-Based Extensibility:** Extensive hook system allowing customization of agent behavior at every stage of execution.

### The Problem Space

Building AI agents in production applications faces several challenges:

- **Type Safety Gaps:** Most agent frameworks use dynamic tool definitions that are validated at runtime, leading to errors in production.
- **Memory Management:** Simple in-memory storage doesn't scale and loses context across deployments.
- **Tool Orchestration:** Coordinating multiple tools and managing their execution order is complex and error-prone.
- **Observability Blind Spots:** Understanding what agents are doing, how they're performing, and where they're failing is difficult without comprehensive telemetry.
- **MCP Compatibility:** Integrating with the emerging Model Context Protocol standard requires significant boilerplate.

### The Igniter.js Solution

@igniter-js/agents provides a production-ready, type-safe agent framework that:

1. **Guarantees Type Safety:** Every tool, prompt, and configuration is validated at compile time.
2. **Manages Memory Intelligently:** Adapter-based storage with automatic persistence and retrieval.
3. **Orchestrates Tools Seamlessly:** Builder patterns for composing complex toolsets and agent behaviors.
4. **Provides Full Observability:** Comprehensive telemetry for every agent operation.
5. **Enables MCP Integration:** Native MCP client support with type-safe tool calling.

### Place in the Igniter.js Ecosystem

The agents package serves as the "intelligent layer" that sits atop the Igniter.js ecosystem:

- **The Intelligence Layer:** Provides AI-powered interfaces to Igniter.js APIs
- **The Orchestration Layer:** Coordinates complex workflows across multiple services
- **The Memory Layer:** Persists context and learning across interactions
- **The Integration Layer:** Bridges Igniter.js with external AI tools and MCP servers
- **The Observability Layer:** Provides comprehensive monitoring of AI agent behavior

---

## I. MAINTAINER GUIDE (Internal Architecture)

### 2. FileSystem Topology (Maintenance)

Maintainers must respect the following directory structure and responsibilities to ensure the package remains modular, easy to extend, and predictable.

#### Directory Breakdown

- **`src/adapters/`**: Storage layer implementations.
  - `index.ts`: Central export for all adapter factories.
  - `memory.adapter.ts`: In-memory adapter implementation with full storage interface compliance.
  - `memory.adapter.spec.ts`: Comprehensive tests for memory operations, serialization, and error handling.

- **`src/builders/`**: Configuration layer.
  - `index.ts`: Builder exports barrel.
  - `agent.builder.ts`: `IgniterAgentBuilder` for individual agent configuration.
  - `agent.builder.spec.ts`: Builder validation and chaining tests.
  - `main.builder.ts`: `IgniterAgentManagerBuilder` for multi-agent orchestration.
  - `main.builder.spec.ts`: Manager builder tests including agent registration.
  - `tool.builder.ts`: `IgniterAgentTool` for type-safe tool definitions.
  - `tool.builder.spec.ts`: Tool schema validation and inference tests.
  - `toolset.builder.ts`: `IgniterAgentToolset` for tool composition.
  - `toolset.builder.spec.ts`: Toolset aggregation and conflict resolution tests.
  - `mcp.builder.ts`: `IgniterAgentMCPClient` for MCP integration.
  - `mcp.builder.spec.ts`: MCP protocol compliance and message handling tests.
  - `prompt.builder.ts`: `IgniterAgentPrompt` for prompt engineering.
  - `prompt.builder.spec.ts`: Prompt template validation and interpolation tests.

- **`src/core/`**: Runtime execution layer.
  - `agent.ts`: `IgniterAgentCore` - individual agent runtime with Vercel AI integration.
  - `manager.ts`: `IgniterAgentManagerCore` - multi-agent orchestration engine.
  - `manager.spec.ts`: Manager lifecycle and agent coordination tests.
  - `memory.ts`: Memory runtime with adapter abstraction.
  - `telemetry.spec.ts`: Telemetry emission and attribute validation tests.

- **`src/errors/`**: Error handling standardization.
  - `agent.error.ts`: `IgniterAgentError` class with typed error codes.
  - `index.ts`: Error exports barrel.

- **`src/telemetry/`**: Observability definitions.
  - `index.ts`: `IgniterAgentTelemetryEvents` registry with all agent events.

- **`src/types/`**: Type system contracts.
  - `adapter.ts`: Memory adapter interface definitions.
  - `builder.ts`: Builder configuration type definitions.
  - `common.ts`: Shared types across the package.
  - `hooks.ts`: Hook function signatures.
  - `manager.ts`: Manager and agent interface definitions.
  - `memory.ts`: Memory operation types.
  - `prompt.ts`: Prompt template types.
  - `utils.ts`: Utility type helpers.
  - `index.ts`: Type exports barrel.

- **`src/utils/`**: Pure utility functions.
  - `async.ts`: Async operation helpers with error handling.
  - `async.spec.ts`: Async utility tests.
  - `objects.ts`: Object manipulation utilities.
  - `objects.spec.ts`: Object utility tests.
  - `strings.ts`: String processing helpers.
  - `strings.spec.ts`: String utility tests.
  - `validation.ts`: Schema validation utilities.
  - `validation.spec.ts`: Validation utility tests.
  - `index.ts`: Utility exports barrel.

- **`src/index.ts`**: Public API entry point with organized exports.
- **`src/shim.ts`**: Browser import protection shim.

---

### 3. Architecture Deep-Dive

#### 3.1 The Builder Pattern Cascade

The agents package implements a sophisticated builder pattern cascade that ensures type safety across the entire configuration chain:

```typescript
// Builder Cascade Flow
IgniterAgentManager.create()
  .withLogger(logger) // Adds logging context
  .withTelemetry(telemetry) // Adds telemetry context
  .withMemory(memoryAdapter) // Adds memory context
  .addAgent(agentBuilder) // Adds agent with inherited context
  .build(); // Produces fully configured manager
```

Each builder accumulates state immutably, passing context down to child builders while maintaining type inference.

#### 3.2 Agent Runtime Architecture

The `IgniterAgentCore` wraps Vercel AI's `ToolLoopAgent` with comprehensive lifecycle management:

```
Agent Execution Flow:
1. Hook: onAgentStart
2. Memory: Load conversation history
3. Telemetry: agent.started event
4. AI Generation: Tool selection and reasoning
5. Tool Execution Loop:
   - Hook: onToolCallStart
   - Tool validation and execution
   - Hook: onToolCallEnd
   - Telemetry: tool.called event
6. Memory: Persist conversation state
7. Telemetry: agent.completed event
8. Hook: onAgentComplete
```

#### 3.3 Memory System Design

The memory system uses a layered adapter pattern:

```
Memory Layer Architecture:
┌─────────────────┐
│ IgniterAgentCore │ ← Uses memory interface
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Memory Runtime  │ ← Coordinates operations
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Memory Adapter  │ ← Storage implementation
└─────────────────┘
```

This design allows seamless swapping of storage backends while maintaining consistent API.

#### 3.4 MCP Integration Flow

MCP client integration follows a strict protocol:

```
MCP Communication Flow:
1. Client initialization with server capabilities
2. Tool discovery and schema validation
3. Message encoding/decoding
4. Error handling and retry logic
5. Telemetry emission for all operations
```

#### 3.5 Telemetry Integration

Every operation emits structured telemetry events:

- **Agent Lifecycle:** `agent.started`, `agent.completed`, `agent.error`
- **Tool Execution:** `tool.called`, `tool.completed`, `tool.error`
- **Memory Operations:** `memory.stored`, `memory.retrieved`, `memory.error`
- **MCP Operations:** `mcp.connected`, `mcp.message.sent`, `mcp.message.received`

All events include contextual attributes and error details when applicable.

---

### 4. Operational Flow Mapping (Pipelines)

#### 4.1 Method: `IgniterAgentManagerBuilder.build()`

1. **Configuration Validation:** Ensures all required dependencies (logger, telemetry, memory) are configured.
2. **Context Inheritance:** Creates shared context object with logger, telemetry, and memory references.
3. **Agent Instantiation:** For each registered agent builder, calls `agentBuilder.build(context)` to produce `IgniterAgentCore` instances.
4. **Manager Creation:** Instantiates `IgniterAgentManagerCore` with the agent registry.
5. **Telemetry:** Emits `manager.created` event with agent count and configuration metadata.
6. **Return:** Returns the fully configured manager instance.

#### 4.2 Method: `IgniterAgentCore.generate(input)`

1. **Input Validation:** Validates input against agent's context schema using Zod.
2. **Hook Execution:** Fires `onAgentStart` hook with input and context.
3. **Memory Loading:** Retrieves conversation history from memory adapter (if configured).
4. **Telemetry:** Emits `generation.generate.started` event with input metadata.
5. **AI Processing:** Initializes Vercel AI ToolLoopAgent with tools and system prompt.
6. **Tool Loop:** Executes tool calling loop, validating each tool call and firing appropriate hooks.
7. **Memory Persistence:** Stores conversation state after each interaction.
8. **Telemetry:** Emits `generation.generate.success` or `generation.generate.error` event.
9. **Hook Execution:** Fires `onAgentComplete` or `onAgentError` hook.
10. **Return:** Returns the final AI response (AgentCallResult).

#### 4.3 Method: `IgniterAgentCore.stream(input)`

1. **Input Validation:** Validates input against agent's context schema using Zod.
2. **Hook Execution:** Fires `onAgentStart` hook with input and context.
3. **Telemetry:** Emits `generation.stream.started` event with input metadata.
4. **Stream Initialization:** Creates a streaming connection with Vercel AI ToolLoopAgent.
5. **Chunk Emission:** Yields response chunks as they arrive from the AI.
6. **Telemetry:** Emits `generation.stream.chunk` event for each chunk.
7. **Telemetry:** Emits `generation.stream.success` or `generation.stream.error` event at completion.
8. **Hook Execution:** Fires `onAgentComplete` or `onAgentError` hook.
9. **Return:** Returns an async iterable or readable stream of response chunks.

#### 4.4 Method: `IgniterAgentManagerCore.startAll()`

1. **Agent Iteration:** Loops through all registered agents.
2. **Dependency Resolution:** Ensures agents have required dependencies (logger, telemetry, memory).
3. **Parallel Initialization:** Starts all agents concurrently using `Promise.allSettled`.
4. **Status Tracking:** Updates internal status map for each agent.
5. **Telemetry:** Emits `manager.agents.started` event with success/failure counts.
6. **Error Handling:** Collects initialization errors and logs them without failing the entire operation.
7. **Return:** Returns summary object with started agents and any errors.

#### 4.5 Method: `IgniterAgentTool.execute(input, context)`

1. **Schema Validation:** Validates input against tool's input schema.
2. **Hook Execution:** Fires `onToolExecute` hook if configured.
3. **Telemetry:** Emits `tool.executed` event with input metadata.
4. **Handler Execution:** Calls the tool's handler function with validated input and context.
5. **Result Validation:** Validates output against tool's output schema if provided.
6. **Telemetry:** Emits `tool.completed` or `tool.error` event.
7. **Return:** Returns the validated result or throws error.

#### 4.6 Method: `IgniterAgentMemory.store(key, value)`

1. **Serialization:** Converts value to JSON-compatible format.
2. **Adapter Delegation:** Calls memory adapter's `set` method.
3. **Error Handling:** Wraps adapter errors in `IgniterAgentError`.
4. **Telemetry:** Emits `memory.stored` event with key and size metadata.
5. **Return:** Returns success boolean.

#### 4.6 Method: `IgniterAgentMCPClient.connect()`

1. **Connection Establishment:** Initializes MCP transport layer.
2. **Capability Discovery:** Queries server for available tools and resources.
3. **Schema Validation:** Validates discovered tools against expected schemas.
4. **Telemetry:** Emits `mcp.connected` event with capability metadata.
5. **Hook Execution:** Fires `onConnected` hook with server capabilities.
6. **Return:** Returns connection status and available tools.

---

### 5. Dependency & Type Graph

#### 5.1 External Dependencies

| Package                 | Purpose                                  | Version   |
| ----------------------- | ---------------------------------------- | --------- |
| `@igniter-js/core`      | Base error classes and logger interfaces | `^0.4.0`  |
| `@igniter-js/telemetry` | Telemetry manager integration            | `^0.1.0`  |
| `ai`                    | Vercel AI SDK for agent runtime          | `^6.0.0`  |
| `zod`                   | Schema validation and type inference     | `^4.0.0` |
| `zod-to-json-schema`    | Schema conversion for MCP                | `^4.0.0` |

#### 5.2 Type Flow Architecture

```
Builder Configuration Flow:
IgniterAgentManagerBuilder
├── withLogger() → Logger context
├── withTelemetry() → Telemetry context
├── withMemory() → Memory context
└── addAgent() → Agent registration

Agent Instantiation Flow:
AgentBuilder → AgentConfig → IgniterAgentCore
ToolBuilder → ToolConfig → IgniterAgentTool
MCPBuilder → MCPConfig → IgniterAgentMCPClient

Runtime Type Flow:
IgniterAgentManagerCore
├── agents: Map<string, IgniterAgentCore>
├── memory: IgniterAgentMemory
├── telemetry: IgniterTelemetryManager
└── logger: IgniterLogger

Execution Type Flow:
Input (Zod-validated) → ToolExecution → Output (Zod-validated) → Memory → Telemetry
```

---

### 6. Maintenance Checklist

#### Feature Addition Workflow

1. [ ] Define types in `src/types/` with proper Zod schemas
2. [ ] Implement builder methods with immutable state accumulation
3. [ ] Add runtime logic in `src/core/` with telemetry emission
4. [ ] Create utility functions in `src/utils/` with full test coverage
5. [ ] Add comprehensive tests covering all code paths
6. [ ] Update `AGENTS.md` with new operational flows and examples
7. [ ] Ensure TSDoc comments are complete and accurate
8. [ ] Run full test suite and verify telemetry coverage

#### Bugfix Workflow

1. [ ] Identify the affected component (builder, core, adapter, utils)
2. [ ] Create reproduction test case
3. [ ] Implement fix with minimal changes
4. [ ] Verify telemetry events are correctly emitted
5. [ ] Update tests to prevent regression
6. [ ] Update documentation if behavior changed

---

### 7. Maintainer Troubleshooting

#### Q: Agent tool calls are failing with type errors

**A:** Check that the tool's input/output schemas are properly defined and that the handler function matches the schema types. Use `z.infer<typeof schema>` to ensure type alignment.

#### Q: Memory operations are not persisting

**A:** Verify that the memory adapter is properly configured and that the adapter's `set` and `get` methods are implemented correctly. Check telemetry events for memory operation failures.

#### Q: MCP connections are timing out

**A:** Ensure the MCP server URL is accessible and that the transport layer is properly configured. Check telemetry events for connection failures and review timeout settings.

#### Q: Telemetry events are not being emitted

**A:** Verify that `withTelemetry()` was called on the manager builder and that the telemetry manager is properly initialized. Check that event keys match those defined in `src/telemetry/index.ts`.

---

## II. CONSUMER GUIDE (Developer Manual)

### 8. Distribution Anatomy (Consumption)

#### Package Structure After Build

```
@igniter-js/agents/
├── dist/
│   ├── index.mjs           # ESM main entry
│   ├── index.d.mts         # TypeScript declarations
│   ├── adapters/
│   │   ├── index.mjs       # Adapter exports
│   │   └── index.d.mts     # Adapter types
│   └── telemetry/
│       ├── index.mjs       # Telemetry exports
│       └── index.d.mts     # Telemetry types
├── package.json
└── README.md
```

#### Import Patterns

```typescript
// Main package - full API
import {
  IgniterAgent,
  IgniterAgentManager,
  IgniterAgentTool,
} from "@igniter-js/agents";

// Adapters only
import { MemoryAdapter } from "@igniter-js/agents/adapters";

// Telemetry only
import { IgniterAgentTelemetryEvents } from "@igniter-js/agents/telemetry";
```

#### Runtime Requirements

- **Node.js:** 18.0.0+
- **Bun:** 1.0.0+
- **Deno:** 1.30.0+
- **Server-only:** Cannot be imported in browser environments (shim.ts protection)

---

### 9. Quick Start & Common Patterns

#### Basic Agent Setup

```typescript
import {
  IgniterAgent,
  IgniterAgentTool,
  MemoryAdapter,
} from "@igniter-js/agents";
import { z } from "zod";

const weatherTool = IgniterAgentTool.create("get_weather")
  .withDescription("Get current weather for a location")
  .withInput(z.object({ location: z.string() }))
  .withOutput(
    z.object({ temperature: z.number(), condition: z.string() }),
  )
  .withExecute(async ({ location }) => {
    // Implementation
    return { temperature: 22, condition: "sunny" };
  })
  .build();

const agent = IgniterAgent.create("weather-assistant")
  .withMemory(MemoryAdapter.create())
  .withTool(weatherTool)
  .withSystemPrompt("You are a helpful weather assistant.")
  .build();

const response = await agent.generate({
  messages: [{ role: 'user', content: 'What is the weather in New York?' }]
});
console.log(response);
```

#### Multi-Agent Manager

```typescript
import { IgniterAgentManager, IgniterAgentToolset } from "@igniter-js/agents";

const toolset = IgniterAgentToolset.create()
  .addTool(weatherTool)
  .addTool(calculatorTool)
  .build();

const manager = IgniterAgentManager.create()
  .withMemory(MemoryAdapter.create())
  .addAgent(weatherAgent)
  .addAgent(mathAgent)
  .build();

await manager.startAll();
const agents = manager.listAgents();
```

#### MCP Integration

```typescript
import { IgniterAgentMCPClient } from "@igniter-js/agents";

const mcpClient = IgniterAgentMCPClient.create()
  .withServerUrl("http://localhost:3000/mcp")
  .build();

await mcpClient.connect();

const agent = IgniterAgent.create("mcp-agent").withMCPClient(mcpClient).build();
```

---

### 9.1 Memory Adapters Guide

The @igniter-js/agents package provides multiple memory adapter implementations for different use cases:

#### IgniterAgentInMemoryAdapter

Simple, fast in-memory storage. Data is lost on process restart.

**Best for:** Development, testing, short-lived applications, prototyping.

```typescript
import { IgniterAgentInMemoryAdapter } from "@igniter-js/agents/adapters";

const adapter = IgniterAgentInMemoryAdapter.create({
  namespace: "myapp",
  maxMessages: 500,
  maxChats: 50,
});

const agent = IgniterAgent.create("my-agent")
  .withMemory(adapter)
  .build();
```

#### IgniterAgentJSONFileAdapter

File-based storage using JSON files. Data persists across process restarts.

**Best for:** Single-machine deployments, development with persistence, offline-first apps, simple local storage.

**Directory structure created:**
```
{dataDir}/
  ├── working-memory.json     # All working memory entries
  ├── chats.json              # All chat sessions
  └── messages/
      ├── {chatId}.json       # Messages for specific chat
      └── ...
```

```typescript
import { IgniterAgentJSONFileAdapter } from "@igniter-js/agents/adapters";

// Create adapter (creates data directory automatically)
const adapter = IgniterAgentJSONFileAdapter.create({
  dataDir: "./data/agent-memory",
  namespace: "myapp",
  autoSync: true,  // Save to disk automatically
  maxMessages: 1000,
  maxChats: 100,
});

// Must connect before using
await adapter.connect();

// Use with agent
const agent = IgniterAgent.create("my-agent")
  .withMemory(adapter)
  .build();

// Generate conversation (auto-saves to JSON files)
await agent.generate({
  messages: [{ role: 'user', content: 'Hello!' }]
});

// Disconnect when done (syncs remaining data)
await adapter.disconnect();
```

**Features:**
- Automatic file synchronization (optional)
- Working memory, chat sessions, and message history
- Namespace support for multi-tenant apps
- Debug logging
- Data limit enforcement

**Example with persistence across restarts:**

```typescript
import { IgniterAgentJSONFileAdapter } from "@igniter-js/agents/adapters";

// First session - create and save data
{
  const adapter = IgniterAgentJSONFileAdapter.create({
    dataDir: "./memory"
  });
  await adapter.connect();
  
  await adapter.updateWorkingMemory({
    scope: 'chat',
    identifier: 'chat_123',
    content: 'User prefers concise responses'
  });
  
  await adapter.saveChat({
    chatId: 'chat_123',
    userId: 'user_456',
    title: 'TypeScript Questions',
    createdAt: new Date(),
    updatedAt: new Date(),
    messageCount: 0
  });
  
  await adapter.disconnect();
}

// Second session (different process) - data is loaded
{
  const adapter = IgniterAgentJSONFileAdapter.create({
    dataDir: "./memory"
  });
  await adapter.connect();
  
  // Data from previous session is available
  const memory = await adapter.getWorkingMemory({
    scope: 'chat',
    identifier: 'chat_123'
  });
  console.log(memory?.content); // "User prefers concise responses"
  
  const chat = await adapter.getChat('chat_123');
  console.log(chat?.title); // "TypeScript Questions"
  
  await adapter.disconnect();
}
```

---

### 10. Real-World Use Case Library

#### Case A: Customer Support Chatbot (E-commerce)

**Scenario:** An e-commerce platform needs an AI chatbot that can handle customer inquiries about orders, products, and returns.

**Implementation:**

```typescript
import { IgniterAgent, IgniterAgentToolset } from "@igniter-js/agents";
import { z } from "zod";

// Order lookup tool
const orderLookupTool = IgniterAgentTool.create("lookup_order")
  .withDescription("Looks up an order by ID")
  .withInput(z.object({ orderId: z.string() }))
  .withOutput(
    z.object({
      status: z.string(),
      items: z.array(z.object({ name: z.string(), price: z.number() })),
      total: z.number(),
    }),
  )
  .withExecute(async ({ orderId }) => {
    const order = await db.orders.findUnique({ where: { id: orderId } });

    return {
      status: order.status,
      items: order.items,
      total: order.total,
    };
  })
  .build();

// Product search tool
const productSearchTool = IgniterAgentTool.create("search_products")
  .withDescription("Lists repositories for a user")
  .withInput(
    z.object({ query: z.string(), limit: z.number().optional() }),
  )
  .withOutput(
    z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        inStock: z.boolean(),
      }),
    ),
  )
  .withExecute(async ({ query, limit = 10 }) => {
    const products = await db.products.findMany({
      where: { name: { contains: query } },
      take: limit,
    });

    return products;
  })
  .build();

// Support agent
const supportAgent = IgniterAgent.create("customer-support")
  .withToolset(
    IgniterAgentToolset.create()
      .addTool(orderLookupTool)
      .addTool(productSearchTool)
      .build(),
  )
  .withSystemPrompt(
    `
    You are a helpful customer support agent for an e-commerce store.
    Help customers with order status, product information, and general inquiries.
    Always be polite and provide accurate information.
  `,
  )
  .withMemory(MemoryAdapter.create())
  .build();

// Handle customer message
async function handleCustomerMessage(message: string, customerId: string) {
  const response = await supportAgent.generate({
    messages: [{ role: 'user', content: message }],
    options: { userId: customerId }
  });
  return response;
}
```

**Best Practices Applied:**

- Type-safe tool definitions prevent runtime errors
- Memory persistence maintains conversation context
- Tool composition allows modular functionality
- Clear system prompts guide agent behavior

---

#### Case B: Code Review Assistant (DevOps)

**Scenario:** A development team needs an AI assistant that can review pull requests, suggest improvements, and enforce coding standards.

**Implementation:**

```typescript
import { IgniterAgent, IgniterAgentToolset } from "@igniter-js/agents";
import { z } from "zod";

// Git operations tool
const gitTool = IgniterAgentTool.create("analyze_code")
  .withDescription("Analyzes code for issues")
  .withInput(
    z.object({
      repo: z.string(),
      prNumber: z.number(),
      files: z.array(z.string()),
    }),
  )
  .withOutput(
    z.object({
      issues: z.array(
        z.object({
          file: z.string(),
          line: z.number(),
          severity: z.enum(["error", "warning", "info"]),
          message: z.string(),
          suggestion: z.string(),
        }),
      ),
      summary: z.string(),
    }),
  )
  .withExecute(async ({ repo, prNumber, files }) => {
    // Analyze code using linting tools, security scanners, etc.
    const issues = [];
    const summary = `Found ${issues.length} issues in PR #${prNumber}`;

    return { issues, summary };
  })
  .build();

// Testing tool
const testTool = IgniterAgentTool.create("run_tests")
  .withDescription("Runs test suite")
  .withInput(z.object({ repo: z.string(), branch: z.string() }))
  .withOutput(
    z.object({
      passed: z.number(),
      failed: z.number(),
      coverage: z.number(),
      errors: z.array(z.string()),
    }),
  )
  .withExecute(async ({ repo, branch }) => {
    // Run test suite
    const result = await runTestSuite(repo, branch);
    return result;
  })
  .build();

// Code review agent
const reviewAgent = IgniterAgent.create("code-reviewer")
  .withToolset(
    IgniterAgentToolset.create().addTool(gitTool).addTool(testTool).build(),
  )
  .withSystemPrompt(
    `
    You are an expert code reviewer with deep knowledge of software engineering best practices.
    Review pull requests for code quality, security, performance, and maintainability.
    Provide constructive feedback with specific suggestions for improvement.
  `,
  )
  .withMemory(MemoryAdapter.create())
  .onToolCallEnd((result, context) => {
    // Log review metrics
    console.log(`Review completed for PR #${context.prNumber}`);
  })
  .build();

// Review a pull request
async function reviewPR(repo: string, prNumber: number) {
  const prompt = `
    Please review pull request #${prNumber} in repository ${repo}.
    Analyze the code changes for:
    1. Code quality and style
    2. Security vulnerabilities
    3. Performance issues
    4. Test coverage
    5. Documentation

    Provide a detailed review with specific recommendations.
  `;

  const review = await reviewAgent.generate({
    messages: [{ role: 'user', content: prompt }],
    options: {
      repo,
      prNumber,
      context: { type: "pr_review" },
    }
  });

  return review;
}
```

**Best Practices Applied:**

- Specialized tools for different aspects of code review
- Comprehensive analysis covering multiple quality dimensions
- Hook-based logging for audit trails
- Context passing for operation tracking

---

#### Case C: Data Analysis Assistant (Analytics)

**Scenario:** A data science team needs an AI assistant that can query databases, generate visualizations, and explain complex datasets.

**Implementation:**

```typescript
import { IgniterAgent, IgniterAgentToolset } from "@igniter-js/agents";
import { z } from "zod";

// Database query tool
const queryTool = IgniterAgentTool.create("execute_query")
  .withInput(
    z.object({
      query: z.string(),
      database: z.string(),
    }),
  )
  .withOutput(
    z.object({
      columns: z.array(z.string()),
      rows: z.array(z.array(z.unknown())),
      executionTime: z.number(),
      rowCount: z.number(),
    }),
  )
  .withExecute(async ({ query, database }) => {
    const startTime = Date.now();
    const result = await executeSQL(query, database);
    const executionTime = Date.now() - startTime;

    return {
      columns: result.columns,
      rows: result.rows,
      executionTime,
      rowCount: result.rows.length,
    };
  })
  .build();

// Visualization tool
const chartTool = IgniterAgentTool.create("create_chart")
  .withInput(
    z.object({
      data: z.array(z.record(z.unknown())),
      chartType: z.enum(["bar", "line", "pie", "scatter"]),
      xAxis: z.string(),
      yAxis: z.string(),
      title: z.string(),
    }),
  )
  .withOutput(
    z.object({
      chartId: z.string(),
      imageUrl: z.string(),
      description: z.string(),
    }),
  )
  .withExecute(async ({ data, chartType, xAxis, yAxis, title }) => {
    const chartId = generateId();
    const imageUrl = await generateChart(data, {
      chartType,
      xAxis,
      yAxis,
      title,
    });
    const description = `Generated ${chartType} chart showing ${yAxis} by ${xAxis}`;

    return { chartId, imageUrl, description };
  })
  .build();

// Statistics tool
const statsTool = IgniterAgentTool.create("calculate_stats")
  .withInput(
    z.object({
      data: z.array(z.number()),
      metrics: z.array(
        z.enum(["mean", "median", "std", "min", "max", "quartiles"]),
      ),
    }),
  )
  .withOutput(z.record(z.number()))
  .withExecute(async ({ data, metrics }) => {
    const stats = {};

    if (metrics.includes("mean")) {
      stats.mean = data.reduce((a, b) => a + b, 0) / data.length;
    }

    if (metrics.includes("median")) {
      const sorted = [...data].sort((a, b) => a - b);
      stats.median = sorted[Math.floor(sorted.length / 2)];
    }

    // Calculate other metrics...

    return stats;
  })
  .build();

// Data analysis agent
const analysisAgent = IgniterAgent.create("data-analyst")
  .withToolset(
    IgniterAgentToolset.create()
      .addTool(queryTool)
      .addTool(chartTool)
      .addTool(statsTool)
      .build(),
  )
  .withSystemPrompt(
    `
    You are an expert data analyst who can query databases, perform statistical analysis,
    and create visualizations. Help users understand their data through queries, charts,
    and statistical insights. Always explain your findings clearly and suggest next steps.
  `,
  )
  .withMemory(MemoryAdapter.create())
  .build();

// Analyze sales data
async function analyzeSalesData(query: string) {
  const prompt = `
    Please analyze the following sales data query: "${query}"

    1. Execute the query and examine the results
    2. Calculate relevant statistics (mean, median, trends)
    3. Create appropriate visualizations
    4. Provide insights and recommendations

    Explain your findings in a clear, actionable way.
  `;

  const analysis = await analysisAgent.generate({
      prompt, 
      options: {
         context: { type: "data_analysis", query },
      }
  });

  return analysis;
}
```

**Best Practices Applied:**

- Modular tools for different analytical tasks
- Comprehensive data validation schemas
- Memory persistence for multi-step analysis
- Hook integration for audit logging

---

#### Case D: API Integration Orchestrator (Integration Platform)

**Scenario:** A platform that connects multiple third-party APIs needs an AI agent to handle complex integration workflows and data transformations.

**Implementation:**

```typescript
import {
  IgniterAgentManager,
  IgniterAgentToolset,
  IgniterAgentMCPClient,
} from "@igniter-js/agents";

// CRM integration agent
const crmAgent = IgniterAgent.create("crm-sync")
  .withToolset(crmToolset) // Tools for Salesforce, HubSpot, etc.
  .withSystemPrompt("Handle CRM data synchronization and customer management")
  .build();

// Payment processing agent
const paymentAgent = IgniterAgent.create("payment-processor")
  .withToolset(paymentToolset) // Tools for Stripe, PayPal, etc.
  .withSystemPrompt("Process payments and handle financial transactions")
  .build();

// Email marketing agent
const emailAgent = IgniterAgent.create("email-campaign")
  .withToolset(emailToolset) // Tools for Mailchimp, SendGrid, etc.
  .withSystemPrompt("Manage email campaigns and subscriber communications")
  .build();

// Analytics agent with MCP
const analyticsAgent = IgniterAgent.create("analytics-orchestrator")
  .withMCPClient(
    IgniterAgentMCPClient.create()
      .withServerUrl(process.env.ANALYTICS_MCP_URL!)
      .build(),
  )
  .withSystemPrompt("Orchestrate complex analytics workflows")
  .build();

// Integration manager
const agentManager = IgniterAgentManager.create()
  .withMemory(MemoryAdapter.create())
  .withTelemetry(telemetryManager)
  .addAgent(crmAgent)
  .addAgent(paymentAgent)
  .addAgent(emailAgent)
  .addAgent(analyticsAgent)
  .build();

// Handle complex integration request
async function handleIntegrationRequest(request: IntegrationRequest) {
  // Route to appropriate agent based on request type
  const agent = agentManager.get(request.type);

  if (!agent) {
    throw new Error(`No agent available for ${request.type}`);
  }

  const result = await agent.generate({
   prompt: request.description, 
   options: {
      context: request.metadata,
      userId: request.userId,
   }
  });

  // Store integration result
  await agents.memory.store(`integration:${request.id}`, {
    result,
    timestamp: Date.now(),
  });

  return result;
}
```

**Best Practices Applied:**

- Agent specialization for different domains
- MCP integration for external tool access
- Centralized orchestration through manager
- Persistent memory for integration tracking

---

#### Case E: Educational Tutor (EdTech)

**Scenario:** An educational platform needs an AI tutor that can adapt to student learning styles, track progress, and provide personalized learning paths.

**Implementation:**

```typescript
import { IgniterAgent, IgniterAgentToolset } from "@igniter-js/agents";

// Student progress tracker
const progressTool = IgniterAgentTool.create("track_progress")
  .withInput(
    z.object({
      studentId: z.string(),
      subject: z.string(),
      topic: z.string(),
      score: z.number(),
      timeSpent: z.number(),
    }),
  )
  .withOutput(
    z.object({
      updatedProgress: z.record(z.unknown()),
      recommendations: z.array(z.string()),
      nextTopics: z.array(z.string()),
    }),
  )
  .withExecute(async ({ studentId, subject, topic, score, timeSpent }) => {
    const progress = await db.studentProgress.upsert({
      where: { studentId_subject_topic: { studentId, subject, topic } },
      update: { score, timeSpent: { increment: timeSpent } },
      create: { studentId, subject, topic, score, timeSpent },
    });

    const recommendations = await generateRecommendations(progress);
    const nextTopics = await suggestNextTopics(progress);

    return {
      updatedProgress: progress,
      recommendations,
      nextTopics,
    };
  })
  .build();

// Learning style analyzer
const styleTool = IgniterAgentTool.create("analyze_learning_style")
  .withInput(
    z.object({
      studentId: z.string(),
      responses: z.array(
        z.object({
          question: z.string(),
          answer: z.string(),
          timeToAnswer: z.number(),
        }),
      ),
    }),
  )
  .withOutput(
    z.object({
      learningStyle: z.enum(["visual", "auditory", "kinesthetic", "reading"]),
      confidence: z.number(),
      explanation: z.string(),
    }),
  )
  .withExecute(async ({ studentId, responses }) => {
    const analysis = await analyzeLearningStyle(responses);
    return analysis;
  })
  .build();

// Personalized content generator
const contentTool = IgniterAgentTool.create("generate_lesson")
  .withInput(
    z.object({
      topic: z.string(),
      learningStyle: z.enum(["visual", "auditory", "kinesthetic", "reading"]),
      difficulty: z.enum(["beginner", "intermediate", "advanced"]),
      studentProgress: z.record(z.unknown()),
    }),
  )
  .withOutput(
    z.object({
      lessonPlan: z.object({
        title: z.string(),
        objectives: z.array(z.string()),
        content: z.string(),
        exercises: z.array(z.string()),
        assessment: z.string(),
      }),
      estimatedTime: z.number(),
      resources: z.array(z.string()),
    }),
  )
  .withExecute(
    async ({ topic, learningStyle, difficulty, studentProgress }) => {
      const lesson = await generatePersonalizedLesson({
        topic,
        learningStyle,
        difficulty,
        studentProgress,
      });

      return lesson;
    },
  )
  .build();

// AI Tutor Agent
const tutorAgent = IgniterAgent.create("ai-tutor")
  .withToolset(
    IgniterAgentToolset.create()
      .addTool(progressTool)
      .addTool(styleTool)
      .addTool(contentTool)
      .build(),
  )
  .withSystemPrompt(
    `
    You are an expert AI tutor who adapts to each student's unique learning style and pace.
    Use the available tools to:
    1. Track student progress and performance
    2. Analyze learning styles based on their interaction patterns
    3. Generate personalized lesson plans and content
    4. Provide encouragement and adapt difficulty as needed

    Always maintain a supportive, patient, and encouraging tone.
  `,
  )
  .withMemory(MemoryAdapter.create())
  .onAgentStart(async (input, context) => {
    // Load student profile and learning history
    const studentData = await loadStudentProfile(context.userId);
    context.studentProfile = studentData;
  })
  .onToolCallEnd(async (result, context) => {
    // Update learning analytics
    await updateLearningAnalytics(context.userId, result);
  })
  .build();

// Conduct a tutoring session
async function conductTutoringSession(studentId: string, topic: string) {
  const sessionPrompt = `
    Start a personalized tutoring session for student ${studentId} on the topic: "${topic}"

    1. Review their learning progress and style preferences
    2. Assess their current knowledge level
    3. Create a customized lesson plan
    4. Guide them through the learning material
    5. Provide practice exercises and feedback
    6. Update their progress tracking

    Make the session engaging and adapt to their learning style.
  `;

  const session = await tutorAgent.generate({
   prompt: sessionPrompt, 
   options: {
      userId: studentId,
      context: { type: "tutoring_session", topic },
   }
  });

  return session;
}
```

**Best Practices Applied:**

- Comprehensive student profiling and progress tracking
- Adaptive content generation based on learning styles
- Extensive memory usage for personalized interactions
- Analytics integration for continuous improvement

---

### 11. Domain-Specific Guidance

#### Enterprise Integration Platforms

**Guidance:** Use multi-agent orchestration with specialized agents for different integration domains (CRM, ERP, HR, Finance).

```typescript
const integrationManager = IgniterAgentManager.create()
  .addAgent(crmAgent)
  .addAgent(erpAgent)
  .addAgent(hrAgent)
  .addAgent(financeAgent)
  .build();

// Route requests to appropriate domain expert
const agent = manager.getAgentget.domain);
```

#### AI-Powered Development Tools

**Guidance:** Integrate with MCP servers for access to development tools, documentation, and code analysis.

```typescript
const devAgent = IgniterAgent.create("dev-assistant")
  .withMCPClient(
    IgniterAgentMCPClient.create()
      .withServerUrl("http://localhost:3000/dev-tools")
      .withToolFilter(["include", ["code.analyze", "docs.search", "test.run"]])
      .build(),
  )
  .build();
```

#### Customer Service Automation

**Guidance:** Combine memory persistence with tool-based actions for comprehensive customer support.

```typescript
const supportAgent = IgniterAgent.create("customer-support")
  .withMemory(MemoryAdapter.create())
  .withToolset(customerSupportToolset)
  .withSystemPrompt(
    "Provide excellent customer support using available tools and context",
  )
  .onAgentComplete(async (result, context) => {
    await updateCustomerSatisfaction(context.customerId, result);
  })
  .build();
```

---

### 12. Best Practices & Anti-Patterns

| Practice                              | Why                                                  | Example                                            |
| ------------------------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| ✅ **Use typed tool schemas**         | Prevents runtime errors and ensures data consistency | `withInput(z.object({ id: z.string() }))`          |
| ✅ **Implement memory persistence**   | Maintains context across interactions                | `withMemory(MemoryAdapter.create())`               |
| ✅ **Add comprehensive telemetry**    | Enables observability and debugging                  | `withTelemetry(telemetryManager)`                  |
| ✅ **Use agent hooks**                | Enables custom logic and monitoring                  | `onToolCallEnd(handler)`                      |
| ✅ **Validate all inputs/outputs**    | Ensures data integrity                               | `withOutput(z.object({ result: z.string() }))`     |
| ❌ **Don't overuse memory**           | Can impact performance and costs                     | Only store essential conversation data             |
| ❌ **Don't create monolithic agents** | Harder to maintain and test                          | Use specialized agents with clear responsibilities |
| ❌ **Don't ignore telemetry**         | Makes debugging production issues difficult          | Always configure telemetry in production           |
| ❌ **Don't skip schema validation**   | Leads to runtime errors                              | Always define input/output schemas                 |
| ❌ **Don't block on tool calls**      | Degrades user experience                             | Use async tool implementations                     |

---

## III. TECHNICAL REFERENCE & RESILIENCE

### 13. Exhaustive API Reference

#### Core Classes

| Class                        | Purpose               | Key Methods                                                              |
| ---------------------------- | --------------------- | ------------------------------------------------------------------------ |
| `IgniterAgentBuilder`        | Agent configuration   | `withModel()`, `withToolset()`, `withMemory()`, `build()`                |
| `IgniterAgentCore`           | Agent runtime         | `start()`, `stop()`, `generate()`, `stream()`                            |
| `IgniterAgentManagerBuilder` | Manager configuration | `addAgent()`, `withLogger()`, `withTelemetry()`, `build()`               |
| `IgniterAgentManagerCore`    | Manager runtime       | `start()`, `startAll()`, `get()`, `getStatus()`                          |
| `IgniterAgentTool`           | Tool definition       | `withDescription()`, `withInput()`, `withExecute()`, `build()`           |
| `IgniterAgentToolset`        | Tool composition      | `addTool()`, `getName()`, `getTools()`, `build()`                        |
| `IgniterAgentMCPClient`      | MCP integration       | `withType()`, `withCommand()`, `withURL()`, `build()`                    |
| `IgniterAgentPrompt`         | Prompt engineering    | `withTemplate()`, `withVariables()`, `render()`                          |

#### Builder Pattern Methods

| Builder               | Method                     | Purpose                          |
| --------------------- | -------------------------- | -------------------------------- |
| `IgniterAgentBuilder` | `withModel(model)`         | Set AI model                     |
|                       | `withInstructions(prompt)` | Configure AI system instructions |
|                       | `withToolset(toolset)`     | Add toolset                      |
|                       | `withMCP(mcp)`             | Add MCP configuration            |
|                       | `withMemory(adapter)`      | Configure memory persistence     |
|                       | `withContextSchema(schema)`| Define context schema            |
|                       | `build()`                  | Create agent instance            |

#### Runtime Methods

| Class              | Method              | Signature                                                        | Purpose                        |
| ------------------ | ------------------- | ---------------------------------------------------------------- | ------------------------------ |
| `IgniterAgentCore` | `start`             | `start() => Promise<void>`                                       | Start agent and initialize MCP |
|                    | `stop`              | `stop() => Promise<void>`                                        | Stop agent and disconnect MCP  |
|                    | `generate`          | `generate(input: AgentCallParameters) => Promise<any>`           | Generate response from agent   |
|                    | `stream`            | `stream(input: AgentStreamParameters) => Promise<any>`           | Stream response from agent     |
|                    | `getName`           | `getName() => string`                                            | Get agent name                 |
|                    | `getToolsets`       | `getToolsets() => TAgentToolsets`                                | Get all registered toolsets    |
|                    | `getTools`          | `getTools() => ToolSet`                                          | Get all tools                  |
|                    | `getModel`          | `getModel() => TAgentModel`                                      | Get configured model           |
|                    | `getInstructions`   | `getInstructions() => TAgentInstructions`                        | Get configured instructions    |
|                    | `getContextSchema`  | `getContextSchema() => TAgentContextSchema`                      | Get context schema             |
|                    | `attachLogger`      | `attachLogger(logger?) => void`                                  | Attach logger instance         |
|                    | `attachTelemetry`   | `attachTelemetry(telemetry?) => void`                            | Attach telemetry manager       |
|                    | `attachHooks`       | `attachHooks(hooks?) => void`                                    | Attach hook callbacks          |
|                    | `memory`            | `IgniterAgentMemoryCore \| undefined`                            | Memory instance property       |

### 14. Telemetry & Observability Registry

#### Agent Lifecycle Events

| Event Key                        | Attributes                                               | Context                                |
| -------------------------------- | -------------------------------------------------------- | -------------------------------------- |
| `igniter.agents.agent.started`   | `agent.name`, `agent.input_length`                       | Agent execution begins                 |
| `igniter.agents.agent.completed` | `agent.name`, `agent.output_length`, `agent.duration_ms` | Agent execution completes successfully |
| `igniter.agents.agent.error`     | `agent.name`, `agent.error.code`, `agent.error.message`  | Agent execution fails                  |

#### Tool Execution Events

| Event Key                       | Attributes                                                         | Context                  |
| ------------------------------- | ------------------------------------------------------------------ | ------------------------ |
| `igniter.agents.tool.called`    | `tool.name`, `agent.name`, `tool.input_size`                       | Tool execution begins    |
| `igniter.agents.tool.completed` | `tool.name`, `agent.name`, `tool.output_size`, `tool.duration_ms`  | Tool execution completes |
| `igniter.agents.tool.error`     | `tool.name`, `agent.name`, `tool.error.code`, `tool.error.message` | Tool execution fails     |

#### Memory Events

| Event Key                         | Attributes                                        | Context                    |
| --------------------------------- | ------------------------------------------------- | -------------------------- |
| `igniter.agents.memory.stored`    | `memory.key`, `memory.size_bytes`                 | Data stored in memory      |
| `igniter.agents.memory.retrieved` | `memory.key`, `memory.size_bytes`, `memory.found` | Data retrieved from memory |
| `igniter.agents.memory.error`     | `memory.operation`, `memory.error.code`           | Memory operation fails     |

#### MCP Events

| Event Key                             | Attributes                             | Context                          |
| ------------------------------------- | -------------------------------------- | -------------------------------- |
| `igniter.agents.mcp.connected`        | `mcp.server_url`, `mcp.tools_count`    | MCP connection established       |
| `igniter.agents.mcp.message.sent`     | `mcp.message_type`, `mcp.message_size` | Message sent to MCP server       |
| `igniter.agents.mcp.message.received` | `mcp.message_type`, `mcp.message_size` | Message received from MCP server |
| `igniter.agents.mcp.error`            | `mcp.operation`, `mcp.error.code`      | MCP operation fails              |

#### Manager Events

| Event Key                               | Attributes                                                            | Context                       |
| --------------------------------------- | --------------------------------------------------------------------- | ----------------------------- |
| `igniter.agents.manager.created`        | `manager.agents_count`, `manager.has_memory`, `manager.has_telemetry` | Manager instance created      |
| `igniter.agents.manager.agents.started` | `manager.started_count`, `manager.failed_count`                       | Batch agent startup completed |

### 14.5 Error Classes Reference

The `@igniter-js/agents` package provides a comprehensive error hierarchy for precise error handling and debugging.

#### Base Error Class

**`IgniterAgentError`**

Base error class that extends `IgniterError` from `@igniter-js/core`. All agent-related errors inherit from this class.

```typescript
import { IgniterAgentError, IgniterAgentErrorCode } from '@igniter-js/agents';

throw new IgniterAgentError({
  message: 'Something went wrong',
  code: IgniterAgentErrorCode.UNKNOWN,
  causer: 'Agent',
  metadata: { operation: 'generate' },
  details: { attemptedAction: 'startAgent' }
});
```

**Properties:**
- `code`: `IgniterAgentErrorCode` - Error classification code
- `message`: `string` - Human-readable error description
- `statusCode`: `number` - HTTP status code (defaults to 500)
- `causer`: `string` - Component that threw the error
- `details`: `unknown` - Additional error context
- `metadata`: `Record<string, unknown>` - Extended metadata
- `cause`: `Error` - Original error if wrapping another error

---

#### Specialized Error Classes

**`IgniterAgentConfigError`**

Thrown when agent/tool/manager configuration is invalid.

```typescript
import { IgniterAgentConfigError } from '@igniter-js/agents';

throw new IgniterAgentConfigError({
  message: 'Model is required but was not provided',
  field: 'model'  // Specific config field that failed
});
```

**Unique Properties:**
- `field`: `string` - The configuration field causing the error

---

**`IgniterAgentMCPError`**

Thrown when MCP connection, configuration, or tool execution fails.

```typescript
import { IgniterAgentMCPError, IgniterAgentErrorCode } from '@igniter-js/agents';

throw new IgniterAgentMCPError({
  message: 'Failed to connect to MCP server',
  code: IgniterAgentErrorCode.MCP_CONNECTION_FAILED,
  mcpName: 'filesystem'  // Name of the MCP config
});
```

**Unique Properties:**
- `mcpName`: `string` - Name of the MCP configuration

---

**`IgniterAgentToolError`**

Thrown when tool definition validation or execution fails.

```typescript
import { IgniterAgentToolError, IgniterAgentErrorCode } from '@igniter-js/agents';

throw new IgniterAgentToolError({
  message: 'Tool execution timed out after 30 seconds',
  code: IgniterAgentErrorCode.TOOL_EXECUTION_FAILED,
  toolName: 'github_createIssue'  // Name of the tool
});
```

**Unique Properties:**
- `toolName`: `string` - Name of the tool that failed

---

**`IgniterAgentMemoryError`**

Thrown when memory adapter operations fail.

```typescript
import { IgniterAgentMemoryError, IgniterAgentErrorCode } from '@igniter-js/agents';

throw new IgniterAgentMemoryError({
  message: 'Failed to save conversation to memory',
  code: IgniterAgentErrorCode.MEMORY_UPDATE_FAILED,
  metadata: { chatId: 'chat_123', size: 5242880 }
});
```

---

**`IgniterAgentAdapterError`**

Thrown when custom adapter (memory, storage, etc.) operations fail.

```typescript
import { IgniterAgentAdapterError, IgniterAgentErrorCode } from '@igniter-js/agents';

throw new IgniterAgentAdapterError({
  message: 'Redis connection lost',
  code: IgniterAgentErrorCode.ADAPTER_CONNECTION_FAILED,
  adapterName: 'redis'  // Name of the adapter
});
```

**Unique Properties:**
- `adapterName`: `string` - Name of the adapter implementation

---

#### Type Guards for Error Handling

Use type guards to safely narrow error types in catch blocks:

```typescript
import {
  isIgniterAgentError,
  isIgniterAgentMCPError,
  isIgniterAgentToolError,
  IgniterAgentErrorCode
} from '@igniter-js/agents';

try {
  await agent.generate({ messages: [...] });
} catch (error) {
  // Safe type narrowing
  if (isIgniterAgentMCPError(error)) {
    console.error(`MCP Error [${error.mcpName}]:`, error.message);
  } else if (isIgniterAgentToolError(error)) {
    console.error(`Tool Error [${error.toolName}]:`, error.message);
  } else if (isIgniterAgentError(error)) {
    console.error(`Agent Error [${error.code}]:`, error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

**Available Type Guards:**
- `isIgniterAgentError(error)` - Check if error is any agent error
- `isIgniterAgentMCPError(error)` - Check if error is MCP-related
- `isIgniterAgentToolError(error)` - Check if error is tool-related

---

#### Error Code Hierarchy

All errors use standardized error codes from `IgniterAgentErrorCode` enum:

| Range | Category | Codes |
|-------|----------|-------|
| 1xx | General | `UNKNOWN`, `INVALID_CONFIG`, `MISSING_REQUIRED` |
| 2xx | Agent | `AGENT_NOT_INITIALIZED`, `AGENT_MODEL_MISSING`, `AGENT_BUILD_FAILED`, `AGENT_CONTEXT_SCHEMA_INVALID` |
| 3xx | MCP | `MCP_CONNECTION_FAILED`, `MCP_CLIENT_NOT_FOUND`, `MCP_TOOL_ERROR`, `MCP_INVALID_CONFIG` |
| 4xx | Tool | `TOOL_EXECUTION_FAILED`, `TOOL_NOT_FOUND`, `TOOL_VALIDATION_FAILED` |
| 5xx | Memory | `MEMORY_PROVIDER_ERROR`, `MEMORY_NOT_FOUND`, `MEMORY_UPDATE_FAILED` |
| 6xx | Adapter | `ADAPTER_CONNECTION_FAILED`, `ADAPTER_OPERATION_FAILED`, `ADAPTER_NOT_INITIALIZED` |

---

### 15. Exhaustive Error & Troubleshooting Library

#### General Errors (1xx)

##### `IGNITER_AGENT_UNKNOWN_ERROR`

- **Context:** Unclassified or unexpected error occurs
- **Cause:** Generic error that doesn't fit other categories
- **Mitigation:** Add logging and monitoring to identify specific failures
- **Solution:** Wrap external service calls with try-catch blocks
- **Example:**
  ```typescript
  try {
    await agent.generate({ messages: [] });
  } catch (error) {
    if (error.code === IgniterAgentErrorCode.UNKNOWN) {
      logger.error('Unexpected error:', error.cause);
    }
  }
  ```

##### `IGNITER_AGENT_INVALID_CONFIG`

- **Context:** Configuration validation during builder chain or initialization
- **Cause:** Missing or invalid configuration option (e.g., missing model, invalid field value)
- **Mitigation:** Validate all required fields before calling `.build()`
- **Solution:** Check builder chain for missing required methods
- **Example:**
  ```typescript
  // ❌ FAILS - No model configured
  const agent = IgniterAgent.create('test').build();
  
  // ✅ WORKS - Model is configured
  const agent = IgniterAgent.create('test')
    .withModel(openai('gpt-4'))
    .build();
  ```

##### `IGNITER_AGENT_MISSING_REQUIRED`

- **Context:** Required dependency is missing when needed
- **Cause:** A required component (logger, telemetry, memory) is not configured
- **Mitigation:** Ensure all dependencies are configured before operations
- **Solution:** Add missing dependencies to builder chain
- **Example:**
  ```typescript
  const agent = IgniterAgent.create('test')
    .withModel(model)
    .withLogger(logger)  // Required for production
    .withTelemetry(telemetry)  // Recommended
    .build();
  ```

---

#### Agent Errors (2xx)

##### `IGNITER_AGENT_NOT_INITIALIZED`

- **Context:** Attempting to use agent before calling `.start()`
- **Cause:** MCP connections or agent initialization not completed
- **Mitigation:** Always call `await agent.start()` before using the agent
- **Solution:** Initialize agent lifecycle properly
- **Example:**
  ```typescript
  const agent = IgniterAgent.create('test')
    .addMCP(mcpConfig)
    .build();
  
  await agent.start();  // Required before generate()
  const result = await agent.generate({ messages: [...] });
  ```

##### `IGNITER_AGENT_MODEL_MISSING`

- **Context:** `generate()` or `stream()` called without a model configured
- **Cause:** `.withModel()` was not called on the builder
- **Mitigation:** Configure model during builder setup
- **Solution:** Add `.withModel()` to builder chain
- **Example:**
  ```typescript
  const agent = IgniterAgent.create('test')
    .withModel(openai('gpt-4'))  // ✅ Required
    .build();
  ```

##### `IGNITER_AGENT_BUILD_FAILED`

- **Context:** Agent construction fails during `.build()`
- **Cause:** Invalid configuration detected during validation
- **Mitigation:** Validate all config before building
- **Solution:** Check error details for specific failures
- **Example:**
  ```typescript
  try {
    const agent = IgniterAgent.create('test').build();
  } catch (error) {
    if (error.code === IgniterAgentErrorCode.AGENT_BUILD_FAILED) {
      console.error('Config error:', error.details);
    }
  }
  ```

##### `IGNITER_AGENT_CONTEXT_SCHEMA_INVALID`

- **Context:** Context passed to `generate()` or `stream()` doesn't match schema
- **Cause:** Options data doesn't conform to declared context schema
- **Mitigation:** Ensure context data matches schema definition
- **Solution:** Validate context before passing to agent
- **Example:**
  ```typescript
  const contextSchema = z.object({
    userId: z.string(),
    chatId: z.string()
  });
  
  const agent = IgniterAgent.create('test')
    .withContextSchema(contextSchema)
    .build();
  
  // ✅ WORKS
  await agent.generate({
    messages: [...],
    options: { userId: 'user_123', chatId: 'chat_456' }
  });
  
  // ❌ FAILS - Missing chatId
  await agent.generate({
    messages: [...],
    options: { userId: 'user_123' }
  });
  ```

---

#### MCP Errors (3xx)

##### `IGNITER_AGENT_MCP_CONNECTION_FAILED`

- **Context:** MCP client fails to connect during `agent.start()`
- **Cause:** Server unreachable, invalid URL, network error, or auth failure
- **Mitigation:** Verify MCP server is running and accessible
- **Solution:** Check server URL, network connectivity, and credentials
- **Example:**
  ```typescript
  const agent = IgniterAgent.create('test')
    .addMCP(
      IgniterAgentMCPClient.create('filesystem')
        .withType('stdio')
        .withCommand('npx')
        .withArgs(['-y', '@mcp/server-filesystem'])
        .build()
    )
    .build();
  
  try {
    await agent.start();  // May throw MCP_CONNECTION_FAILED
  } catch (error) {
    if (isIgniterAgentMCPError(error)) {
      console.error(`MCP ${error.mcpName} failed:`, error.message);
      // Retry with exponential backoff
    }
  }
  ```

##### `IGNITER_AGENT_MCP_CLIENT_NOT_FOUND`

- **Context:** Attempting to use MCP that wasn't registered
- **Cause:** MCP name doesn't match any registered config
- **Mitigation:** Check MCP name spelling in agent config
- **Solution:** Register MCP with `.addMCP()` before using
- **Example:**
  ```typescript
  const agent = IgniterAgent.create('test')
    .addMCP(filesystemMCP)  // name = 'filesystem'
    .build();
  
  // ✅ Correct
  const toolset = agent.getToolsets()['filesystem'];
  
  // ❌ Wrong
  const toolset = agent.getToolsets()['file'];  // Not found
  ```

##### `IGNITER_AGENT_MCP_TOOL_ERROR`

- **Context:** MCP tool execution fails
- **Cause:** Tool handler in MCP server throws error
- **Mitigation:** Implement error handling in MCP server
- **Solution:** Check MCP server logs for detailed error
- **Example:**
  ```typescript
  const result = await agent.generate({
    messages: [{ 
      role: 'user', 
      content: 'Use filesystem tool to read /invalid/path' 
    }]
  });
  // May throw MCP_TOOL_ERROR if filesystem server fails
  ```

##### `IGNITER_AGENT_MCP_INVALID_CONFIG`

- **Context:** MCP configuration validation fails
- **Cause:** Invalid URL format, missing required fields, invalid transport type
- **Mitigation:** Validate MCP config before building
- **Solution:** Check config against MCP type requirements
- **Example:**
  ```typescript
  // ❌ FAILS - Invalid URL
  IgniterAgentMCPClient.create('api')
    .withType('http')
    .withURL('not-a-url')  // Invalid
    .build();
  
  // ✅ WORKS
  IgniterAgentMCPClient.create('api')
    .withType('http')
    .withURL('https://api.example.com/mcp')
    .build();
  ```

---

#### Tool Errors (4xx)

##### `IGNITER_AGENT_TOOL_EXECUTION_FAILED`

- **Context:** Custom tool handler throws error during execution
- **Cause:** Tool handler logic fails (exception, validation error, external service failure)
- **Mitigation:** Implement comprehensive error handling in tool handlers
- **Solution:** Wrap tool handler in try-catch with proper error recovery
- **Example:**
  ```typescript
  const queryTool = IgniterAgentTool.create('database_query')
    .withDescription('Query the database')
    .withInput(z.object({ query: z.string() }))
    .withExecute(async ({ query }) => {
      try {
        const result = await database.query(query);
        return { success: true, data: result };
      } catch (error) {
        // Wrap in IgniterAgentToolError for consistency
        throw new IgniterAgentToolError({
          message: `Query failed: ${error.message}`,
          toolName: 'database_query',
          code: IgniterAgentErrorCode.TOOL_EXECUTION_FAILED,
          cause: error as Error
        });
      }
    })
    .build();
  ```

##### `IGNITER_AGENT_TOOL_NOT_FOUND`

- **Context:** Agent attempts to use tool that doesn't exist
- **Cause:** Tool name not registered in any toolset
- **Mitigation:** Ensure all tools are added to toolsets before building
- **Solution:** Register tool with `.addTool()` to a toolset
- **Example:**
  ```typescript
  const toolset = IgniterAgentToolset.create('utils')
    .addTool(helperTool)
    .build();
  
  const agent = IgniterAgent.create('test')
    .addToolset(toolset)  // Tool is now available as 'utils.helperTool'
    .build();
  ```

##### `IGNITER_AGENT_TOOL_VALIDATION_FAILED`

- **Context:** Tool input validation fails before execution
- **Cause:** Input data doesn't match tool's input schema
- **Mitigation:** Ensure tool input schema is accurate and complete
- **Solution:** Validate data against schema before tool use
- **Example:**
  ```typescript
  const addTool = IgniterAgentTool.create('add_numbers')
    .withInput(z.object({
      a: z.number(),
      b: z.number()
    }))
    .withExecute(async ({ a, b }) => a + b)
    .build();
  
  // ❌ FAILS - 'a' should be number, not string
  try {
    await addTool.execute({ a: '5', b: 10 });  // Throws TOOL_VALIDATION_FAILED
  } catch (error) {
    if (isIgniterAgentToolError(error)) {
      console.error('Tool validation failed:', error.message);
    }
  }
  ```

---

#### Memory Errors (5xx)

##### `IGNITER_AGENT_MEMORY_PROVIDER_ERROR`

- **Context:** Memory adapter implementation fails
- **Cause:** Adapter connection lost, storage backend failure, permission denied
- **Mitigation:** Implement retry logic in adapter
- **Solution:** Check adapter connectivity and permissions
- **Example:**
  ```typescript
  const agent = IgniterAgent.create('test')
    .withMemory(
      new CustomMemoryAdapter({
        url: process.env.MEMORY_URL,
        retryPolicy: { maxRetries: 3, backoffMs: 1000 }
      })
    )
    .build();
  
  try {
    await agent.start();
  } catch (error) {
    if (error.code === IgniterAgentErrorCode.MEMORY_PROVIDER_ERROR) {
      console.error('Memory adapter failed:', error.message);
      // Implement fallback to in-memory storage
    }
  }
  ```

##### `IGNITER_AGENT_MEMORY_NOT_FOUND`

- **Context:** Requested memory key doesn't exist
- **Cause:** Conversation history or data key was not stored
- **Mitigation:** Check key naming and storage operations
- **Solution:** Verify key exists before retrieval
- **Example:**
  ```typescript
  // ✅ WORKS - Check before access
  const messages = await agent.memory?.retrieve('chat_123');
  if (!messages) {
    console.log('No history for this chat');
    return [];
  }
  ```

##### `IGNITER_AGENT_MEMORY_UPDATE_FAILED`

- **Context:** Writing to memory fails
- **Cause:** Storage quota exceeded, permission denied, serialization error
- **Mitigation:** Implement size limits and serialization checks
- **Solution:** Compress or clean old data before storing
- **Example:**
  ```typescript
  // Implement memory rotation
  async function storeMessage(chatId: string, message: Message) {
    try {
      await agent.memory?.store(`chat:${chatId}`, message);
    } catch (error) {
      if (error.code === IgniterAgentErrorCode.MEMORY_UPDATE_FAILED) {
        // Clean old messages and retry
        await agent.memory?.delete(`chat:${chatId}`);
        await agent.memory?.store(`chat:${chatId}`, message);
      }
    }
  }
  ```

---

#### Adapter Errors (6xx)

##### `IGNITER_AGENT_ADAPTER_CONNECTION_FAILED`

- **Context:** Custom adapter fails to connect to its backend
- **Cause:** Network error, invalid credentials, backend unavailable
- **Mitigation:** Verify backend is accessible before creating adapter
- **Solution:** Check network, credentials, and backend status
- **Example:**
  ```typescript
  const redisAdapter = new RedisMemoryAdapter({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    retry: { maxRetries: 3 }
  });
  
  try {
    await redisAdapter.connect();
  } catch (error) {
    if (error.code === IgniterAgentErrorCode.ADAPTER_CONNECTION_FAILED) {
      console.error('Redis connection failed:', error.adapterName);
      // Fall back to memory adapter
    }
  }
  ```

##### `IGNITER_AGENT_ADAPTER_OPERATION_FAILED`

- **Context:** Adapter operation (get, set, delete) fails
- **Cause:** Backend error, corrupted data, serialization failure
- **Mitigation:** Validate data before operations
- **Solution:** Check adapter logs and data integrity
- **Example:**
  ```typescript
  try {
    await adapter.set('key', circularReferenceObject);
  } catch (error) {
    if (error.code === IgniterAgentErrorCode.ADAPTER_OPERATION_FAILED) {
      // Data not serializable
      console.error('Failed to store:', error.message);
    }
  }
  ```

##### `IGNITER_AGENT_ADAPTER_NOT_INITIALIZED`

- **Context:** Using adapter before initialization
- **Cause:** Adapter.connect() or .initialize() not called
- **Mitigation:** Always initialize adapters before use
- **Solution:** Call initialization method and await completion
- **Example:**
  ```typescript
  const adapter = new CustomAdapter();
  
  // ❌ FAILS - Not initialized
  await adapter.get('key');
  
  // ✅ WORKS - Initialize first
  await adapter.initialize();
  const value = await adapter.get('key');
  ```

---

### Error Handling Best Practices

#### Type-Safe Error Handling

Always use type guards to safely handle errors:

```typescript
import {
  isIgniterAgentError,
  isIgniterAgentMCPError,
  isIgniterAgentToolError,
  IgniterAgentErrorCode
} from '@igniter-js/agents';

try {
  await agent.generate({ messages: [...] });
} catch (error) {
  if (isIgniterAgentMCPError(error)) {
    console.error(`MCP error in ${error.mcpName}:`, error.message);
  } else if (isIgniterAgentToolError(error)) {
    console.error(`Tool ${error.toolName} failed:`, error.message);
  } else if (isIgniterAgentError(error)) {
    console.error(`Agent error [${error.code}]:`, error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

#### Error Recovery Patterns

Implement resilience with error-aware retry logic:

```typescript
async function generateWithRetry(
  agent: IgniterAgentCore,
  input: AgentCallParameters,
  maxRetries = 3
) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await agent.generate(input);
    } catch (error) {
      lastError = error;
      
      // Retryable errors
      if (
        error.code === IgniterAgentErrorCode.MCP_CONNECTION_FAILED ||
        error.code === IgniterAgentErrorCode.MEMORY_PROVIDER_ERROR
      ) {
        const backoff = Math.pow(2, attempt - 1) * 1000;
        console.warn(`Attempt ${attempt} failed, retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      
      // Non-retryable errors
      throw error;
    }
  }
  
  throw lastError;
}
```

#### Error Wrapping and Normalization

Use the `wrapError` helper to normalize external errors:

```typescript
import { wrapError, IgniterAgentErrorCode } from '@igniter-js/agents';

async function callExternalService(input: string) {
  try {
    return await externalService.process(input);
  } catch (error) {
    // Normalize error into IgniterAgentError
    throw wrapError(error, {
      message: 'External service call failed',
      code: IgniterAgentErrorCode.ADAPTER_OPERATION_FAILED,
      causer: 'ExternalService',
      metadata: { service: 'payment-processor', input }
    });
  }
}
```

#### Custom Error Logging Pattern

Implement structured error logging for observability:

```typescript
import { isIgniterAgentError } from '@igniter-js/agents';

function logAgentError(error: unknown, context: Record<string, unknown>) {
  if (isIgniterAgentError(error)) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      code: error.code,
      message: error.message,
      causer: error.causer,
      details: error.details,
      metadata: { ...error.metadata, ...context },
      cause: error.cause?.message,
      stack: error.stack
    };
    
    // Send to logging service
    logger.error('Agent Error', errorLog);
    
    // Send to observability platform
    telemetry.emit('agent.error', {
      attributes: {
        'ctx.error.code': error.code,
        'ctx.error.message': error.message,
        'ctx.causer': error.causer,
        ...context
      }
    });
  } else {
    logger.error('Unknown error in agent context', { error, context });
  }
}

// Usage
try {
  await agent.generate({ messages: [...] });
} catch (error) {
  logAgentError(error, { operation: 'generate', agentName: 'assistant' });
}
```

---

---

### 16. Advanced Configuration Patterns

#### Custom Context Types

For complex applications requiring strongly-typed context throughout the agent lifecycle:

```typescript
import { IgniterAgent, IgniterAgentToolset } from "@igniter-js/agents";
import { z } from "zod";

// Define application-specific context type
interface MyAppContext {
  userId: string;
  tenantId: string;
  permissions: string[];
  database: PrismaClient;
  cache: RedisClient;
}

// Create agent with custom context inference
const agent = IgniterAgent.create("advanced-agent")
  .withToolset(
    IgniterAgentToolset.create()
      .addTool(
        IgniterAgentTool.create("admin_action")
          .withInput(z.object({ action: z.string() }))
          .withExecute(async ({ action }, context: MyAppContext) => {
            // Context is fully typed
            if (!context.permissions.includes("admin")) {
              throw new Error("Insufficient permissions");
            }

            // Use typed database and cache
            await context.database.adminAction.create({
              data: { action, userId: context.userId },
            });
            await context.cache.invalidate(
              `tenant:${context.tenantId}:actions`,
            );

            return { success: true };
          })
          .build(),
      )
      .build(),
  )
  .withSystemPrompt(
    "You are an advanced agent with full application context access.",
  )
  .build();

// Usage with typed context
const result = await agent.generate({
   prompt: "perform admin cleanup",
   options: {
      userId: "user123",
      tenantId: "tenant456",
      permissions: ["admin", "write"],
      database: prismaClient,
      cache: redisClient,
   }
});
```

#### Dynamic Tool Registration

For agents that need to register tools based on runtime conditions:

```typescript
import { IgniterAgent, IgniterAgentToolset } from "@igniter-js/agents";

class DynamicToolRegistry {
  private tools = new Map<string, IgniterAgentTool>();

  registerTool(
    name: string,
    config: { schema: z.ZodSchema; handler: Function },
  ) {
    const tool = IgniterAgentTool.create()
      .withName(name)
      .withInput(config.schema)
      .withExecute(config.handler)
      .build();

    this.tools.set(name, tool);
    return this;
  }

  buildToolset(): IgniterAgentToolset {
    const toolset = IgniterAgentToolset.create();
    for (const tool of this.tools.values()) {
      toolset.addTool(tool);
    }
    return toolset.build();
  }
}

// Usage
const registry = new DynamicToolRegistry()
  .registerTool("user_lookup", {
    schema: z.object({ userId: z.string() }),
    handler: async ({ userId }) =>
      await db.users.findUnique({ where: { id: userId } }),
  })
  .registerTool("order_create", {
    schema: z.object({ userId: z.string(), items: z.array(z.string()) }),
    handler: async ({ userId, items }) => await createOrder(userId, items),
  });

const agent = IgniterAgent.create("dynamic-agent")
  .withToolset(registry.buildToolset())
  .build();
```

#### Environment-Specific Configuration

Different configurations for development, staging, and production:

```typescript
import {
  IgniterAgentManager,
  MemoryAdapter,
  IgniterAgentMCPClient,
} from "@igniter-js/agents";

function createAgentManager(env: "development" | "staging" | "production") {
  const baseConfig = IgniterAgentManager.create()
    .withLogger(logger)
    .withTelemetry(telemetry);

  switch (env) {
    case "development":
      return baseConfig
        .withMemory(MemoryAdapter.create()) // Simple in-memory for dev
        .addAgent(createDevAgent())
        .build();

    case "staging":
      return baseConfig
        .withMemory(createRedisAdapter()) // Redis for staging
        .addAgent(createStagingAgent())
        .addAgent(createMonitoringAgent())
        .build();

    case "production":
      return baseConfig
        .withMemory(createRedisClusterAdapter()) // Redis cluster for prod
        .addAgent(createProdAgent())
        .addAgent(createMonitoringAgent())
        .addAgent(createAnalyticsAgent())
        .build();
  }
}

// Environment-specific agent creation
function createProdAgent() {
   const myAppMCPClient = IgniterAgentMCPClient.create()
      .withServerUrl(process.env.MCP_SERVER_URL!)
      .withToolFilter(["include", ["prod.*"]]) // Only production tools
      .build(),

  return IgniterAgent.create("production-agent")
    .withToolset(productionToolset)
    .withMCPClient(myAppMCPClient)
    .withSystemPrompt("Production-ready agent with full MCP integration.")
    .build();
}
```

#### Agent Communication Patterns

Implementing inter-agent communication:

```typescript
import { IgniterAgentManager, IgniterAgentToolset } from "@igniter-js/agents";

// Create communication tools
const communicationTools = IgniterAgentToolset.create()
  .addTool(
    IgniterAgentTool.create()
      .withName("send_message")
      .withInput(
        z.object({
          targetAgent: z.string(),
          message: z.string(),
          priority: z.enum(["low", "normal", "high"]).optional(),
        }),
      )
      .withExecute(async ({ targetAgent, message, priority }, context) => {
        // Send message to another agent via manager
        const manager = context.manager;

        const targetAgentInstance = manager.get(targetAgent);

        if (!targetAgentInstance) {
          throw new Error(`Agent ${targetAgent} not found`);
        }

        // Queue message for target agent
        await manager.memory.store(`messages:${targetAgent}`, {
          from: context.agentName,
          message,
          priority,
          timestamp: Date.now(),
        });

        return { delivered: true };
      })
      .build(),
  )
  .build();

// Create communicating agents
const manager = IgniterAgentManager.create()
  .addAgent(
    IgniterAgent.create("agent-a")
      .withToolset(communicationTools)
      .withSystemPrompt("Agent A can communicate with other agents.")
      .build(),
  )
  .addAgent(
    IgniterAgent.create("agent-b")
      .withToolset(communicationTools)
      .withSystemPrompt("Agent B can receive and respond to messages.")
      .build(),
  )
  .build();

// Agents can now communicate with each other
await manager.get("agent-a").generate({
  messages: [{ role: 'user', content: 'send message to Bob: hello!' }]
});
const response = await manager
  .get("agent-b")
  .generate({
    messages: [{ role: 'user', content: 'check for new messages' }]
  });
```

### 17. Performance Optimization

#### Memory Management

Optimizing memory usage for high-throughput agents:

```typescript
import { IgniterAgent, MemoryAdapter } from "@igniter-js/agents";

// Configure memory with TTL and size limits
const optimizedMemory = MemoryAdapter.create({
  maxSize: 1000, // Maximum number of conversation entries
  ttl: 24 * 60 * 60 * 1000, // 24 hours TTL
  cleanupInterval: 60 * 60 * 1000, // Cleanup every hour
});

const agent = IgniterAgent.create("optimized-agent")
  .withMemory(optimizedMemory)
  .withSystemPrompt("High-performance agent with optimized memory.")
  .build();

// Manual memory cleanup
await agent.memory.clearExpired();
await agent.memory.optimize(); // Remove duplicate/old entries
```

#### Tool Execution Optimization

Caching expensive tool results:

```typescript
import { IgniterAgentTool } from "@igniter-js/agents";

const cachedTool = IgniterAgentTool.create("expensive_calculation")
  .withDescription("Performs expensive calculation with caching")
  .withInput(z.object({ input: z.string() }))
  .withExecute(async ({ input }, context) => {
    const cacheKey = `calc:${input}`;

    // Check memory cache first
    const cached = await context.memory.retrieve(cacheKey);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      // 1 hour
      return cached.result;
    }

    // Perform expensive calculation
    const result = await performExpensiveCalculation(input);

    // Cache result
    await context.memory.store(cacheKey, {
      result,
      timestamp: Date.now(),
    });

    return result;
  })
  .build();
```

#### Agent Pool Management

Managing multiple agent instances for load balancing:

```typescript
class AgentPool {
  private agents: IgniterAgentCore[] = [];
  private currentIndex = 0;

  constructor(
    private manager: IgniterAgentManagerCore,
    agentName: string,
    poolSize: number,
  ) {
    for (let i = 0; i < poolSize; i++) {
      this.agents.push(manager.getAgent(`${aget}-${i}`));
    }
  }

  async run(input: string, context?: any): Promise<any> {
    // Round-robin load balancing
    const agent = this.agents[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.agents.length;

    return agent.generate({
      messages: [{ role: 'user', content: input }],
      options: context
    });
  }

  async getStats() {
    const stats = await Promise.all(
      this.agents.map(async (agent, index) => ({
        id: index,
        status: await agent.getStatus(),
        memoryUsage: await agent.memory.getStats(),
      })),
    );

    return stats;
  }
}

// Usage
const agentPool = new AgentPool(manager, "worker", 5);
const result = await agentPool.run("process this task");
```

### 18. Security Considerations

#### Input Validation and Sanitization

Implementing comprehensive input validation:

```typescript
import { IgniterAgentTool } from "@igniter-js/agents";

// Secure tool with input sanitization
const secureTool = IgniterAgentTool.create()
  .withName("user_profile_update")
  .withInput(
    z.object({
      userId: z.string().uuid("Invalid user ID format"),
      email: z
        .string()
        .email("Invalid email format")
        .max(254, "Email too long"),
      name: z
        .string()
        .min(1, "Name required")
        .max(100, "Name too long")
        .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters"),
      bio: z.string().max(500, "Bio too long").optional(),
    }),
  )
  .withExecute(async ({ userId, email, name, bio }, context) => {
    // Additional runtime validation
    if (context.userId !== userId && !context.permissions.includes("admin")) {
      throw new Error("Cannot update other users' profiles");
    }

    // Sanitize HTML in bio
    const sanitizedBio = bio ? sanitizeHtml(bio) : undefined;

    // Update user with validated data
    return await updateUserProfile(userId, {
      email: email.toLowerCase().trim(),
      name: name.trim(),
      bio: sanitizedBio,
    });
  })
  .build();
```

#### Authentication and Authorization

Implementing secure agent access controls:

```typescript
import { IgniterAgent, IgniterAgentToolset } from "@igniter-js/agents";

// Authentication middleware tool
const authTool = IgniterAgentTool.create()
  .withName("authenticate")
  .withInput(z.object({ token: z.string() }))
  .withExecute(async ({ token }, context) => {
    try {
      const payload = verifyJWT(token);
      context.userId = payload.userId;
      context.permissions = payload.permissions;
      context.authenticated = true;
      return { authenticated: true, userId: payload.userId };
    } catch (error) {
      throw new Error("Invalid authentication token");
    }
  })
  .build();

// Authorized agent
const secureAgent = IgniterAgent.create("secure-agent")
  .withToolset(
    IgniterAgentToolset.create()
      .addTool(authTool)
      .addTool(secureTool) // Requires authentication
      .build(),
  )
  .withSystemPrompt(
    `
    You are a secure agent that requires authentication.
    Always authenticate users before performing sensitive operations.
  `,
  )
  .onAgentStart(async (input, context) => {
    // Require authentication for all interactions
    if (!context.authenticated) {
      await context.agent.generate({
        messages: [{ role: 'user', content: 'authenticate with provided token first' }]
      });
      throw new Error("Authentication required");
    }
  })
  .build();
```

#### Rate Limiting and Abuse Prevention

Implementing rate limiting for agent interactions:

```typescript
import { IgniterAgent } from "@igniter-js/agents";

class RateLimiter {
  private requests = new Map<string, number[]>();

  checkLimit(userId: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];

    // Remove old requests outside the window
    const validRequests = userRequests.filter((time) => now - time < windowMs);
    this.requests.set(userId, validRequests);

    if (validRequests.length >= maxRequests) {
      return false; // Rate limit exceeded
    }

    validRequests.push(now);
    return true;
  }
}

const rateLimiter = new RateLimiter();

const rateLimitedAgent = IgniterAgent.create("rate-limited-agent")
  .onAgentStart(async (input, context) => {
    const allowed = rateLimiter.checkLimit(
      context.userId,
      10, // 10 requests
      60000, // per minute
    );

    if (!allowed) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
  })
  .build();
```

### 19. API Reference (Complete)

#### IgniterAgentManager

| Method                 | Signature                                                                                      | Description                      |
| ---------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------- |
| `create()`             | `static create(): IgniterAgentManagerBuilder<{}>`                                              | Create manager builder           |
| `addAgent()`           | `(name: string, agent: IgniterAgentBuiltAgent) => IgniterAgentManagerBuilder`                  | Add agent to manager with name   |
| `withLogger()`         | `(logger: IgniterLogger) => IgniterAgentManagerBuilder`                                        | Set logger                       |
| `withTelemetry()`      | `(telemetry: IgniterTelemetryManager) => IgniterAgentManagerBuilder`                           | Set telemetry                    |
| `withAutoStart()`      | `(autoStart: boolean) => IgniterAgentManagerBuilder`                                           | Enable/disable auto-start        |
| `withContinueOnError()`| `(continueOnError: boolean) => IgniterAgentManagerBuilder`                                     | Continue on agent errors         |
| `onAgentStart()`       | `(callback: IgniterAgentHooks["onAgentStart"]) => IgniterAgentManagerBuilder`                  | Add agent start hook             |
| `onAgentError()`       | `(callback: IgniterAgentHooks["onAgentError"]) => IgniterAgentManagerBuilder`                  | Add agent error hook             |
| `onToolCallStart()`    | `(callback: (agentName, toolName, input) => void) => IgniterAgentManagerBuilder`               | Add tool call start hook         |
| `onToolCallEnd()`      | `(callback: (agentName, toolName, output) => void) => IgniterAgentManagerBuilder`              | Add tool call end hook           |
| `onToolCallError()`    | `(callback: (agentName, toolName, error) => void) => IgniterAgentManagerBuilder`               | Add tool call error hook         |
| `onMCPStart()`         | `(callback: (agentName, mcpName) => void) => IgniterAgentManagerBuilder`                       | Add MCP start hook               |
| `onMCPError()`         | `(callback: (agentName, mcpName, error) => void) => IgniterAgentManagerBuilder`                | Add MCP error hook               |
| `build()`              | `() => IgniterAgentManagerCore<TAgentRegistry>`                                                | Build manager instance           |

#### IgniterAgentManagerCore

| Method              | Signature                                                                      | Description                              |
| ------------------- | ------------------------------------------------------------------------------ | ---------------------------------------- |
| `create()`          | `static create(): IgniterAgentManagerCore`                                     | Create manager with default options      |
| `register()`        | `(name: string, agent: IgniterAgentBuiltAgent) => this`                        | Register an agent with the manager       |
| `unregister()`      | `(name: string) => boolean`                                                    | Unregister an agent from the manager     |
| `has()`             | `(name: string) => boolean`                                                    | Check if an agent is registered          |
| `start()`           | `(name: string) => Promise<IgniterAgentBuiltAgent>`                            | Start a specific agent                   |
| `startAll()`        | `() => Promise<Map<string, Record<string, IgniterAgentToolset> \| Error>>`     | Start all registered agents              |
| `get()`             | `<TName extends string>(name: TName) => TAgentRegistry[TName]`                 | Get agent by name (throws if not found)  |
| `tryGet()`          | `<TName extends string>(name: TName) => TAgentRegistry[TName] \| undefined`    | Get agent if exists, undefined otherwise |
| `getNames()`        | `() => string[]`                                                               | Get all registered agent names           |
| `size`              | `number`                                                                       | Get the number of registered agents      |
| `getInfo()`         | `(name: string) => IgniterAgentInfo \| undefined`                              | Get information about a specific agent   |
| `getStatus()`       | `() => IgniterAgentInfo[]`                                                     | Get status information for all agents    |
| `isAllRunning()`    | `() => boolean`                                                                | Check if all agents are running          |
| `getFailedAgents()` | `() => IgniterAgentInfo[]`                                                     | Get agents that are in error state       |

#### IgniterAgent

| Method                 | Signature                                                     | Description                 |
| ---------------------- | ------------------------------------------------------------- | --------------------------- |
| `create()`             | `(name: string) => IgniterAgentBuilder`                       | Create agent builder        |
| `withSystemPrompt()`   | `(prompt: string) => IgniterAgentBuilder`                     | Set system prompt           |
| `withTool()`           | `(tool: IgniterAgentTool) => IgniterAgentBuilder`             | Add single tool             |
| `withToolset()`        | `(toolset: IgniterAgentToolset) => IgniterAgentBuilder`       | Add toolset                 |
| `withMemory()`         | `(memory: IgniterAgentMemory) => IgniterAgentBuilder`         | Set memory                  |
| `withMCPClient()`      | `(client: IgniterAgentMCPClient) => IgniterAgentBuilder`      | Set MCP client              |
| `withLogger()`         | `(logger: IgniterLogger) => IgniterAgentBuilder`              | Set logger                  |
| `withTelemetry()`      | `(telemetry: IgniterTelemetryManager) => IgniterAgentBuilder` | Set telemetry               |
| `onAgentStart()`       | `(hook: AgentHook) => IgniterAgentBuilder`                    | Add start hook              |
| `onAgentComplete()`    | `(hook: AgentHook) => IgniterAgentBuilder`                    | Add complete hook           |
| `onAgentError()`       | `(hook: AgentHook) => IgniterAgentBuilder`                    | Add error hook              |
| `onToolCallStart()`    | `(hook: ToolHook) => IgniterAgentBuilder`                     | Add tool call start hook    |
| `onToolCallEnd()` | `(hook: ToolHook) => IgniterAgentBuilder`                     | Add tool call complete hook |
| `build()`              | `() => IgniterAgentCore`                                      | Build agent instance        |

#### IgniterAgentCore

| Method              | Signature                                                                  | Description                        |
| ------------------- | -------------------------------------------------------------------------- | ---------------------------------- |
| `start()`           | `() => Promise<void>`                                                      | Start agent and initialize MCP     |
| `stop()`            | `() => Promise<void>`                                                      | Stop agent and disconnect MCP      |
| `generate()`        | `(input: AgentCallParameters<TContext>) => Promise<any>`                   | Generate a response from the agent |
| `stream()`          | `(input: AgentStreamParameters<TContext, ToolSet>) => Promise<any>`        | Stream a response from the agent   |
| `getName()`         | `() => string`                                                             | Get the agent name                 |
| `getToolsets()`     | `() => TAgentToolsets`                                                     | Get all registered toolsets        |
| `getTools()`        | `() => ToolSet`                                                            | Get all tools from all toolsets    |
| `getModel()`        | `() => TAgentModel`                                                        | Get the configured model           |
| `getInstructions()` | `() => TAgentInstructions`                                                 | Get the configured instructions    |
| `getContextSchema()`| `() => TAgentContextSchema`                                                | Get the context schema             |
| `attachLogger()`    | `(logger?: IgniterLogger) => void`                                         | Attach a logger instance           |
| `attachTelemetry()` | `(telemetry?: IgniterTelemetryManager) => void`                            | Attach a telemetry manager         |
| `attachHooks()`     | `(hooks?: IgniterAgentHooks) => void`                                      | Attach hook callbacks              |
| `memory`            | `IgniterAgentMemoryCore \| undefined`                                      | Memory instance (if configured)    |

#### IgniterAgentTool

| Method              | Signature                                                                                              | Description                   |
| ------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `create()`          | `(name: string) => IgniterAgentToolBuilder`                                                            | Create tool builder with name |
| `withDescription()` | `(description: string) => IgniterAgentToolBuilder`                                                     | Set description               |
| `withInput()`       | `<TNewParams>(inputSchema: z.ZodSchema<TNewParams>) => IgniterAgentToolBuilder`                        | Set input schema              |
| `withOutput()`      | `<TNewResult>(outputSchema: z.ZodSchema<TNewResult>) => IgniterAgentToolBuilder`                       | Set output schema             |
| `withExecute()`     | `<TNewExecute>(execute: (params, options: IgniterAgentToolExecuteOptions) => Promise<T>) => IgniterAgentToolBuilder` | Set handler function          |
| `build()`           | `() => IgniterAgentBuiltTool`                                                                          | Build tool instance           |

#### IgniterAgentToolset

| Method           | Signature                                                | Description                      |
| ---------------- | -------------------------------------------------------- | -------------------------------- |
| `create()`       | `(name: string) => IgniterAgentToolsetBuilder`           | Create toolset builder with name |
| `withName()`     | `(name: string) => IgniterAgentToolsetBuilder`           | Change toolset name              |
| `addTool()`      | `(tool: IgniterAgentTool) => IgniterAgentToolsetBuilder` | Add tool                         |
| `getName()`      | `() => string`                                           | Get toolset name                 |
| `getTools()`     | `() => Tool[]`                                           | Get all tools                    |
| `getToolCount()` | `() => number`                                           | Get tool count                   |
| `build()`        | `() => IgniterAgentToolset`                              | Build toolset instance           |

#### IgniterAgentMCPClient

| Method          | Signature                                                           | Description                                      |
| --------------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| `create()`      | `(name: string) => IgniterAgentMCPBuilder`                          | Create MCP builder with name                     |
| `withName()`    | `(name: string) => IgniterAgentMCPBuilder`                          | Change configuration name                        |
| `withType()`    | `(type: 'stdio' \| 'http') => IgniterAgentMCPBuilder`               | Set transport type (required before other opts)  |
| `withCommand()` | `(command: string) => IgniterAgentMCPBuilder`                       | Set command (stdio only)                         |
| `withArgs()`    | `(args: string[]) => IgniterAgentMCPBuilder`                        | Set args (stdio only)                            |
| `withEnv()`     | `(env: Record<string, string>) => IgniterAgentMCPBuilder`           | Set env vars (stdio only)                        |
| `withURL()`     | `(url: string) => IgniterAgentMCPBuilder`                           | Set URL (http only)                              |
| `withHeaders()` | `(headers: Record<string, string>) => IgniterAgentMCPBuilder`       | Set headers (http only)                          |
| `build()`       | `() => IgniterAgentMCPStdioConfig \| IgniterAgentMCPHttpConfig`     | Build MCP configuration                          |

### 20. Implementation Examples

#### Complete E-commerce Agent System

```typescript
import {
  IgniterAgentManager,
  IgniterAgent,
  IgniterAgentToolset,
  IgniterAgentTool,
  MemoryAdapter,
} from "@igniter-js/agents";
import { z } from "zod";

// Order management tools
const orderTools = IgniterAgentToolset.create('order')
  .addTool(
    IgniterAgentTool.create("create")
      .withInput(
        z.object({
          customerId: z.string(),
          items: z.array(
            z.object({
              productId: z.string(),
              quantity: z.number().min(1),
            }),
          ),
        }),
      )
      .withExecute(async ({ customerId, items }) => {
        const order = await db.orders.create({
          data: { customerId, items, status: "pending" },
        });
        return { orderId: order.id, total: calculateTotal(items) };
      })
      .build(),
  )
  .addTool(
    IgniterAgentTool.create("get_status")
      .withInput(z.object({ orderId: z.string() }))
      .withExecute(async ({ orderId }) => {
        const order = await db.orders.findUnique({ where: { id: orderId } });
        return order
          ? { status: order.status, updatedAt: order.updatedAt }
          : null;
      })
      .build(),
  )
  .build();

// Customer service agent
const customerServiceAgent = IgniterAgent.create("customer-service")
  .withToolset(orderTools)
  .withMemory(MemoryAdapter.create())
  .withSystemPrompt(
    `
    You are a helpful customer service agent for our e-commerce platform.
    You can help customers with order creation, status checking, and general inquiries.
    Always be polite and provide accurate information.
  `,
  )
  .build();

// Inventory management agent
const inventoryAgent = IgniterAgent.create("inventory")
  .withToolset(
    IgniterAgentToolset.create()
      .addTool(
        IgniterAgentTool.create("check_stock")
          .withInput(z.object({ productId: z.string() }))
          .withExecute(async ({ productId }) => {
            const product = await db.products.findUnique({
              where: { id: productId },
            });

            return product
              ? { inStock: product.stock > 0, quantity: product.stock }
              : null;
          })
          .build(),
      )
      .build(),
  )
  .withSystemPrompt("You manage inventory and stock levels.")
  .build();

// Manager orchestration
const agentManager = IgniterAgentManager.create()
  .withMemory(MemoryAdapter.create())
  .addAgent(customerServiceAgent)
  .addAgent(inventoryAgent)
  .build();

// Usage
await agentManager.startAll();

// Route customer queries
const customerQuery = "I want to check the status of my order #12345";
const response = await agentManager
  .get("customer-service")
  .generate({ prompt: customerQuery });

const inventoryQuery = "How many units of product ABC123 are in stock?";
const inventoryResponse = await agentManager
  .get("inventory")
  .generate({ prompt: customerQuery });
```

#### Advanced MCP Integration

```typescript
import { IgniterAgent, IgniterAgentMCPClient } from "@igniter-js/agents";

// Agent with full MCP integration
const mcpAgent = IgniterAgent.create("mcp-integrated")
  .withMCPClient(
    IgniterAgentMCPClient.create()
      .withServerUrl("http://localhost:3000/mcp")
      .withToolFilter([
        "include",
        ["database.query", "filesystem.read", "api.request", "git.status"],
      ])
      .withCredentials({
        username: process.env.MCP_USERNAME,
        password: process.env.MCP_PASSWORD,
      })
      .build(),
  )
  .withSystemPrompt(
    `
    You are an AI agent with access to various tools through MCP.
    You can query databases, read files, make API calls, and check git status.
    Use these tools to help users accomplish their tasks.
  `,
  )
  .build();

// The agent can now use MCP tools automatically
const result = await mcpAgent.generate({
  messages: [{ 
    role: 'user', 
    content: 'Check the current git status and show me any uncommitted changes' 
  }]
});
```

---

**Note:** This AGENTS.md has been partially updated to reflect the actual API. Some examples may still use deprecated method names (like `withInput` instead of `withInput`). A complete review and update of all examples is recommended.

**End of AGENTS.md for @igniter-js/agents**

This comprehensive documentation provides the complete operational manual for maintaining and consuming the @igniter-js/agents package, ensuring full compliance with the standardization guidelines in packages.instructions.md.
