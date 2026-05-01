# @igniter-js/agents

[![NPM Version](https://img.shields.io/npm/v/@igniter-js/agents.svg)](https://www.npmjs.com/package/@igniter-js/agents)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Production-ready, type-safe AI agent framework for Igniter.js. Build intelligent agents with custom tools, persistent memory, comprehensive observability, and seamless multi-agent orchestration.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Building Agents](#building-agents)
- [Tools & Toolsets](#tools--toolsets)
- [Memory System](#memory-system)
- [MCP Integration](#mcp-integration)
- [Telemetry & Observability](#telemetry--observability)
- [Multi-Agent Orchestration](#multi-agent-orchestration)
- [Real-World Examples](#real-world-examples)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## Overview

@igniter-js/agents solves a critical gap in AI application development: **building production-grade agents that are type-safe, observable, and maintainable**.

### The Problem

Traditional AI agent frameworks face several challenges:

- **Type Safety Gaps:** Tool definitions are validated at runtime, leading to errors in production
- **Memory Management:** Stateless interactions lose context across requests
- **Tool Orchestration:** Complex toolsets are hard to compose and validate
- **Observability Blind Spots:** Understanding agent behavior requires manual instrumentation
- **Multi-Agent Complexity:** Coordinating multiple specialized agents is error-prone

### The Solution

@igniter-js/agents provides:

| Capability | Benefit |
|-----------|---------|
| **Type-Safe Tooling** | Compile-time validation of tool inputs/outputs prevents runtime errors |
| **Persistent Memory** | Adapter-based storage maintains conversation context across sessions |
| **Builder Pattern** | Fluent, immutable configuration ensures predictable agent behavior |
| **Comprehensive Telemetry** | Track every agent operation for deep observability and debugging |
| **MCP Support** | Native integration with Model Context Protocol for extensibility |
| **Manager Orchestration** | Coordinate multiple specialized agents with a single manager |

### When to Use This Package

✅ **Use @igniter-js/agents when:**
- Building conversational AI applications with persistent context
- Creating specialized AI agents for different domains (support, sales, analytics, etc.)
- Needing strong type safety and compile-time validation
- Requiring comprehensive observability into agent behavior
- Coordinating complex multi-agent workflows
- Integrating with external tools via MCP servers

❌ **Consider alternatives if:**
- Building simple, stateless AI integrations (use `@ai-sdk/openai` directly)
- Working in browser/client environments (agents are server-only)
- Needing only a simple chat interface without complex tooling

---

## Features

### Core Capabilities

- ✅ **Type-Safe Tooling** — Strong TypeScript inference for tool inputs/outputs with Zod validation
- ✅ **Agent Lifecycle Management** — Built-in hooks for start, completion, error handling
- ✅ **Prompt Templates** — Context-aware prompt building with variable interpolation
- ✅ **MCP Integration** — Connect to Model Context Protocol servers for external tools
- ✅ **Persistent Memory** — Working memory + chat history with multiple adapter options
- ✅ **Full Telemetry** — Optional `@igniter-js/telemetry` integration for observability
- ✅ **Logger Integration** — Structured logging with `IgniterLogger`
- ✅ **Manager Orchestration** — Run and supervise multiple agents with a single manager
- ✅ **Server-Only Protection** — Browser import protection via `shim.ts`

### Memory Adapters

- **In-Memory** — Fast, ephemeral storage for development and testing
- **JSON File** — Local file-based persistence for single-machine deployments
- **Extensible** — Build custom adapters for any backend (Redis, PostgreSQL, etc.)

### Models Supported

Works with any provider supported by [Vercel AI SDK](https://sdk.vercel.ai/docs/models):

- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google Gemini
- Mistral
- Cohere
- Local models via Ollama
- And more...

---

## Installation

### Core Dependencies

```bash
# npm
npm install @igniter-js/agents ai zod

# pnpm
pnpm add @igniter-js/agents ai zod

# yarn
yarn add @igniter-js/agents ai zod

# bun
bun add @igniter-js/agents ai zod
```

### AI Model Provider (Required)

Choose and install your preferred AI model provider:

```bash
# OpenAI (recommended)
npm install @ai-sdk/openai

# Anthropic
npm install @ai-sdk/anthropic

# Google Gemini
npm install @ai-sdk/google

# Mistral
npm install @ai-sdk/mistral

# Or use any other AI SDK provider...
```

### Optional Telemetry

For production observability:

```bash
npm install @igniter-js/telemetry
```

### Optional MCP Support

To connect external tools via Model Context Protocol:

```bash
npm install @ai-sdk/mcp @modelcontextprotocol/sdk
```

### Runtime Requirements

- **Node.js:** 22.0.0 or higher
- **Bun:** 1.0.0 or higher
- **Deno:** 1.30.0 or higher
- **Browser:** ❌ Not supported (server-only)

---

## Quick Start

### 1. Basic Agent with a Single Tool

```typescript
import {
  IgniterAgent,
  IgniterAgentTool,
  IgniterAgentToolset,
} from '@igniter-js/agents'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

// Define a tool with type-safe schema
const weatherTool = IgniterAgentTool
  .create('get_weather')
  .withDescription('Get current weather for a location')
  .withInput(
    z.object({
      location: z.string().describe('City name or coordinates'),
      unit: z.enum(['C', 'F']).default('C').describe('Temperature unit'),
    })
  )
  .withExecute(async ({ location, unit }) => {
    // Your weather API integration here
    return {
      location,
      temperature: 22,
      unit,
      condition: 'Partly Cloudy',
    }
  })
  .build()

// Create a toolset grouping related tools
const weatherToolset = IgniterAgentToolset
  .create('weather')
  .addTool(weatherTool)
  .build()

// Build and run the agent
const agent = IgniterAgent
  .create('weather-assistant')
  .withModel(openai('gpt-4'))
  .addToolset(weatherToolset)
  .build()

await agent.start()

// Generate a response (agent chooses to use tools as needed)
const result = await agent.generate({
  chatId: 'chat_123',
  userId: 'user_123',
  context: {},
  message: {
    role: 'user',
    content: 'What is the weather like in London right now?',
  },
})

console.log(result.content)
```

### 2. Agent with Memory (Multi-Turn Conversations)

```typescript
import {
  IgniterAgent,
  IgniterAgentInMemoryAdapter,
  IgniterAgentPrompt,
} from '@igniter-js/agents'
import { openai } from '@ai-sdk/openai'

// Create a memory adapter
const memory = IgniterAgentInMemoryAdapter.create({
  namespace: 'my-app',
  maxChats: 50,
})

const memoryConfig = {
  provider: memory,
  working: { enabled: true, scope: 'chat' },
  history: { enabled: true, limit: 50 },
  chats: { enabled: true },
}

// Build agent with memory
const agent = IgniterAgent
  .create('assistant')
  .withModel(openai('gpt-4'))
  .withMemory(memoryConfig)
  .withPrompt(
    IgniterAgentPrompt.create(
      'You are a helpful assistant. Remember previous conversations with this user.'
    )
  )
  .build()

await agent.start()

// First turn
let response = await agent.generate({
  chatId: 'chat_123',
  userId: 'user_123',
  context: {},
  message: { role: 'user', content: 'My name is Alice and I live in Paris' },
})
console.log(response.content)

// Second turn - agent remembers context from first turn
response = await agent.generate({
  chatId: 'chat_123',
  userId: 'user_123',
  context: {},
  message: { role: 'user', content: "What's my name and where do I live?" },
})
console.log(response.content) // Will reference Alice and Paris
```

### 3. Agent with Prompt Templates

```typescript
import {
  IgniterAgent,
  IgniterAgentPrompt,
} from '@igniter-js/agents'
import { openai } from '@ai-sdk/openai'

// Create a reusable prompt template
const customerSupportPrompt = IgniterAgentPrompt
  .create(`You are {{company}} customer support agent. Your tone is {{tone}}.`)

const agent = IgniterAgent
  .create('support-bot')
  .withModel(openai('gpt-4'))
  .withPrompt(customerSupportPrompt)
  .build()

await agent.start()

// Use template with dynamic values
const response = await agent.generate({
  chatId: 'chat_123',
  userId: 'user_123',
  context: {
    company: 'TechCorp',
    tone: 'friendly and professional',
  },
  message: { role: 'user', content: 'I need help with my order' },
})

console.log(response.content)
```

---

## Core Concepts

### Agent

An **Agent** is the core runtime that:
- Receives user messages
- Decides which tools to use
- Executes tools and processes results
- Maintains conversation context via memory
- Emits telemetry for observability

Create agents with `IgniterAgent.create()` and configure via the builder pattern.

### Tool

A **Tool** is a typed, executable function that:
- Has a name and description
- Accepts validated inputs (Zod schema)
- Returns structured output
- Can be reused across agents
- Automatically provides schema to AI model

Tools are the interface between agents and your application logic.

### Toolset

A **Toolset** is a collection of related tools, organized by domain:
- Groups tools logically (e.g., "database", "api", "analytics")
- Enables selective tool availability
- Improves agent performance through focused tool selection
- Can be shared across multiple agents

### Memory

**Memory** is how agents maintain context:
- **Working Memory:** Current session state and variables
- **Chat History:** Persisted conversation messages
- **Adapters:** Pluggable storage backends (in-memory, file, custom)

Memory is optional but highly recommended for multi-turn conversations.

### Manager

A **Manager** orchestrates multiple agents:
- Routes requests to appropriate agents
- Shares common resources (logger, telemetry, hooks)
- Monitors agent health and lifecycle
- Enables agent-to-agent communication

---

## Building Agents

### Complete Agent Setup

```typescript
import {
  IgniterAgent,
  IgniterAgentInMemoryAdapter,
  IgniterAgentTool,
  IgniterAgentToolset,
} from '@igniter-js/agents'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

// Step 1: Define tools
const getTodaysTasks = IgniterAgentTool
  .create('get_todays_tasks')
  .withDescription('Retrieve tasks for today')
  .withInput(z.object({ priority: z.enum(['high', 'medium', 'low']).optional() }))
  .withExecute(async ({ priority }) => {
    // Fetch tasks from database
    return [
      { id: 1, title: 'Review PR', priority: 'high' },
      { id: 2, title: 'Update docs', priority: 'medium' },
    ]
  })
  .build()

const addTask = IgniterAgentTool
  .create('add_task')
  .withDescription('Add a new task')
  .withInput(
    z.object({
      title: z.string(),
      priority: z.enum(['high', 'medium', 'low']).default('medium'),
    })
  )
  .withExecute(async ({ title, priority }) => {
    // Save to database
    return { id: 3, title, priority, created: new Date() }
  })
  .build()

// Step 2: Create toolset
const tasksToolset = IgniterAgentToolset
  .create('tasks')
  .addTool(getTodaysTasks)
  .addTool(addTask)
  .build()

// Step 3: Create memory
const memory = IgniterAgentInMemoryAdapter.create({
  namespace: 'productivity-app',
})

const memoryConfig = {
  provider: memory,
  working: { enabled: true, scope: 'chat' },
  history: { enabled: true, limit: 50 },
  chats: { enabled: true },
}

// Step 4: Build agent
const productivityAgent = IgniterAgent
  .create('productivity-assistant')
  .withModel(openai('gpt-4'))
  .withPrompt(
    IgniterAgentPrompt.create(
      'You are a productivity assistant. Help users manage their tasks.'
    )
  )
  .withMemory(memoryConfig)
  .addToolset(tasksToolset)
  .build()

await productivityAgent.start()

// Step 5: Use the agent
const response = await productivityAgent.generate({
  chatId: 'chat_123',
  userId: 'user_123',
  context: {},
  message: {
    role: 'user',
    content: 'What are my high-priority tasks today? And add a meeting reminder.',
  },
})

console.log(response.content)
```

### Agent Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `withModel()` | `LanguageModel` | AI model to use (required) |
| `withPrompt()` | `IgniterAgentPrompt` | Template-based prompts with variables |
| `withMemory()` | `IgniterAgentMemoryConfig` | Persistent context storage |
| `withContextSchema()` | `z.ZodSchema` | Validate `context` passed to `generate()`/`stream()` |
| `addToolset()` | `IgniterAgentToolset` | Collection of tools |
| `addMCP()` | `IgniterAgentMCPConfigUnion` | Connect to MCP servers |
| `withLogger()` | `IgniterLogger` | Structured logging |
| `withTelemetry()` | `IgniterTelemetryManager` | Observable events |
| `onAgentStart()` | `Hook` | Executed after successful start |
| `onAgentError()` | `Hook` | Executed on start error |
| `onToolCallStart()` | `Hook` | Executed before tool call |
| `onToolCallEnd()` | `Hook` | Executed after tool call |
| `onToolCallError()` | `Hook` | Executed on tool error |
| `onMCPStart()` | `Hook` | Executed before MCP connect |
| `onMCPError()` | `Hook` | Executed on MCP error |

---

## Tools & Toolsets

### Defining Type-Safe Tools

Tools enforce strict type contracts between your agent and implementation:

```typescript
import { IgniterAgentTool } from '@igniter-js/agents'
import { z } from 'zod'

// Tool with input and output validation
const databaseQuery = IgniterAgentTool
  .create('query_database')
  .withDescription('Execute a database query')
  .withInput(
    z.object({
      query: z.string().describe('SQL query to execute'),
      maxResults: z.number().default(100).describe('Max rows to return'),
    })
  )
  .withOutput(
    z.array(z.record(z.any())).describe('Query result rows')
  )
  .withExecute(async ({ query, maxResults }) => {
    // Execute query with strict type safety
    const results = await db.query(query)
    return results.slice(0, maxResults)
  })
  .build()

// Tool without output validation (returns any)
const sendEmail = IgniterAgentTool
  .create('send_email')
  .withDescription('Send an email to a recipient')
  .withInput(
    z.object({
      to: z.string().email(),
      subject: z.string(),
      body: z.string(),
    })
  )
  .withExecute(async ({ to, subject, body }) => {
    const result = await emailService.send({ to, subject, body })
    return { messageId: result.id, sent: true }
  })
  .build()
```

### Organizing Tools into Toolsets

Group related tools for better organization and selective availability:

```typescript
import { IgniterAgentToolset } from '@igniter-js/agents'

// Database toolset
const databaseTools = IgniterAgentToolset
  .create('database')
  .addTool(queryTool)
  .addTool(insertTool)
  .addTool(updateTool)
  .addTool(deleteTool)
  .build()

// Email toolset
const emailTools = IgniterAgentToolset
  .create('email')
  .addTool(sendEmailTool)
  .addTool(listEmailsTool)
  .addTool(deleteEmailTool)
  .build()

// Add selectively to agents
const adminAgent = IgniterAgent
  .create('admin')
  .addToolset(databaseTools)
  .addToolset(emailTools)
  .build()

const customerAgent = IgniterAgent
  .create('customer-support')
  .addToolset(emailTools) // Only email access
  .build()
```

### Tool Best Practices

```typescript
// ❌ BAD: Vague description
const tool1 = IgniterAgentTool
  .create('process')
  .withDescription('Process something')
  .build()

// ✅ GOOD: Clear, specific description
const tool2 = IgniterAgentTool
  .create('create_support_ticket')
  .withDescription(
    'Create a new customer support ticket. Include category, priority, and issue description. ' +
    'Returns ticket ID and estimated resolution time.'
  )
  .build()

// ❌ BAD: No input validation
const tool3 = IgniterAgentTool
  .create('send_message')
  .withExecute(async (input: any) => {
    // input could be anything!
  })
  .build()

// ✅ GOOD: Strict input validation with helpful descriptions
const tool4 = IgniterAgentTool
  .create('send_message')
  .withInput(
    z.object({
      userId: z.string().uuid().describe('Target user ID'),
      message: z.string().min(1).max(1000).describe('Message text'),
      priority: z.enum(['low', 'normal', 'urgent']).optional(),
    })
  )
  .withExecute(async ({ userId, message, priority }) => {
    // Fully typed, validated input
  })
  .build()

// ❌ BAD: Tool with side effects and long operations without context
const tool5 = IgniterAgentTool
  .create('process_large_file')
  .withExecute(async () => {
    // Long-running operation with no feedback
    await processMultiGBFile()
  })
  .build()

// ✅ GOOD: Tool with progress tracking and timeout
const tool6 = IgniterAgentTool
  .create('process_large_file')
  .withDescription('Process a large file. May take several minutes.')
  .withInput(z.object({ filePath: z.string() }))
  .withExecute(async ({ filePath }, context) => {
    // Has access to context like timeout settings
    const result = await processFile(filePath, {
      onProgress: (pct) => console.log(`Progress: ${pct}%`),
      timeout: 5 * 60 * 1000, // 5 minutes
    })
    return result
  })
  .build()
```

---

## Memory System

### Memory Adapters

Agents without memory are stateless. Each request starts fresh with no context of previous interactions. Memory solves this by persisting conversation history and working state.

#### In-Memory Adapter (Development)

Fast, ephemeral storage. Perfect for development and testing.

```typescript
import { IgniterAgentInMemoryAdapter } from '@igniter-js/agents/adapters'

const memory = IgniterAgentInMemoryAdapter.create({
  namespace: 'my-app',      // Namespace for isolation
  maxChats: 100,            // Maximum conversations to keep
  maxMessages: 1000,        // Maximum messages per chat
})

const memoryConfig = {
  provider: memory,
  working: { enabled: true, scope: 'chat' },
  history: { enabled: true, limit: 50 },
  chats: { enabled: true },
}

const agent = IgniterAgent.create('assistant')
  .withMemory(memoryConfig)
  .build()

// Data is stored in process memory and lost on restart
```

#### JSON File Adapter (Persistence)

File-based storage for local development with persistence across restarts.

```typescript
import { IgniterAgentJSONFileAdapter } from '@igniter-js/agents/adapters'

const memory = IgniterAgentJSONFileAdapter.create({
  dataDir: './data/agent-memory',  // Directory for JSON files
  namespace: 'my-app',
  maxChats: 1000,
  autoSync: true,                  // Auto-save to disk
})

await memory.connect()

const agent = IgniterAgent.create('assistant')
  .withMemory({
    provider: memory,
    working: { enabled: true, scope: 'chat' },
    history: { enabled: true, limit: 100 },
    chats: { enabled: true },
  })
  .build()

// Data persists across process restarts
await memory.disconnect() // Flush remaining data before exit
```

#### Persisting Across Sessions

```typescript
// Session 1: Create agent, have conversation, save
{
  const memory = IgniterAgentJSONFileAdapter.create({
    dataDir: './agent-data',
  })
  await memory.connect()

  const agent = IgniterAgent.create('assistant')
    .withMemory({
      provider: memory,
      working: { enabled: true, scope: 'chat' },
      history: { enabled: true, limit: 100 },
      chats: { enabled: true },
    })
    .build()

  await agent.generate({
    chatId: 'chat_123',
    userId: 'user_123',
    context: {},
    message: { role: 'user', content: 'I like TypeScript' },
  })

  await memory.disconnect()
}

// Session 2: Load previous conversation context
{
  const memory = IgniterAgentJSONFileAdapter.create({
    dataDir: './agent-data', // Same directory
  })
  await memory.connect()

  const agent = IgniterAgent.create('assistant')
    .withMemory({
      provider: memory,
      working: { enabled: true, scope: 'chat' },
      history: { enabled: true, limit: 100 },
      chats: { enabled: true },
    })
    .build()

  // Agent remembers "user likes TypeScript"
  const response = await agent.generate({
    chatId: 'chat_123',
    userId: 'user_123',
    context: {},
    message: { role: 'user', content: 'Recommend a library for me' },
  })
}
```

### Working Memory Operations

Working memory stores contextual information beyond chat history:

```typescript
const memory = IgniterAgentInMemoryAdapter.create()

// Store custom context
await memory.updateWorkingMemory({
  scope: 'user',
  identifier: 'user-123',
  content: `
## User Preferences
- Prefers TypeScript
- Uses React

## Usage
- Remaining tokens: 500
`,
})

// Retrieve context
const userContext = await memory.getWorkingMemory({
  scope: 'user',
  identifier: 'user-123',
})

console.log(userContext?.content)
```

### Memory Best Practices

```typescript
// ❌ BAD: Storing sensitive data
await memory.updateWorkingMemory({
  scope: 'user',
  identifier: 'user-123',
  content: `
## Sensitive Data (DO NOT STORE)
- apiKey: sk-1234567890
- creditCard: 4111111111111111
- password: SuperSecret123
`,
})

// ✅ GOOD: Storing non-sensitive, useful context
await memory.updateWorkingMemory({
  scope: 'user',
  identifier: 'user-123',
  content: `
## Preferences
- language: en-US
- timezone: UTC

## Account
- subscriptionTier: pro
- hasApiAccess: true
- lastLoginAt: 2025-12-24T10:30:00Z
`,
})

// ❌ BAD: Unbounded memory growth
for (let i = 0; i < 1_000_000; i++) {
  await memory.updateWorkingMemory({
    scope: 'cache',
    identifier: `key-${i}`,
    content: largeData,
  })
}

// ✅ GOOD: Bounded, managed memory
const memory = IgniterAgentInMemoryAdapter.create({
  maxChats: 100, // Limit conversations
  maxMessages: 1000, // Limit messages per chat
})
```

---

## MCP Integration

Model Context Protocol (MCP) enables agents to access external tools and resources via standardized servers.

### Basic MCP Setup

```typescript
import { IgniterAgentMCPClient } from '@igniter-js/agents'
import { openai } from '@ai-sdk/openai'

// Connect to filesystem MCP server
const filesystemMCP = IgniterAgentMCPClient
  .create('filesystem')
  .withType('stdio')
  .withCommand('npx')
  .withArgs(['-y', '@modelcontextprotocol/server-filesystem', '/tmp'])
  .build()

const agent = IgniterAgent
  .create('file-assistant')
  .withModel(openai('gpt-4'))
  .addMCP(filesystemMCP)
  .build()

await agent.start()

// Agent can now list files, read content, etc. via MCP
const response = await agent.generate({
  chatId: 'chat_123',
  userId: 'user_123',
  context: {},
  message: { role: 'user', content: 'List all JSON files in /tmp' },
})

console.log(response.content)
```

### Multiple MCP Servers

```typescript
const filesystemMCP = IgniterAgentMCPClient
  .create('filesystem')
  .withType('stdio')
  .withCommand('npx')
  .withArgs(['-y', '@modelcontextprotocol/server-filesystem', '/app'])
  .build()

const databaseMCP = IgniterAgentMCPClient
  .create('postgres')
  .withType('stdio')
  .withCommand('npx')
  .withArgs(['-y', '@modelcontextprotocol/server-postgres', 'postgresql://...'])
  .build()

const analyticsAgent = IgniterAgent
  .create('analytics')
  .withModel(openai('gpt-4'))
  .addMCP(filesystemMCP)  // File access
  .addMCP(databaseMCP)    // Database access
  .build()

await analyticsAgent.start()

// Agent can access both filesystems and databases
```

---

## Telemetry & Observability

### Basic Telemetry Setup

```typescript
import { IgniterTelemetry } from '@igniter-js/telemetry'
import { IgniterAgentTelemetryEvents } from '@igniter-js/agents/telemetry'

const telemetry = IgniterTelemetry
  .create()
  .withService('my-ai-app')
  .addEvents(IgniterAgentTelemetryEvents)
  .build()

const agent = IgniterAgent
  .create('assistant')
  .withModel(openai('gpt-4'))
  .withTelemetry(telemetry)
  .build()

await agent.start()

// All agent operations are automatically tracked
```

### Telemetry Events

The package automatically emits these telemetry events:

| Event | When | Attributes |
|-------|------|-----------|
| `igniter.agent.lifecycle.start.started` | Agent start begins | `ctx.agent.name`, `ctx.lifecycle.toolsetCount`, `ctx.lifecycle.mcpCount` |
| `igniter.agent.lifecycle.start.success` | Agent start completes | `ctx.agent.name`, `ctx.lifecycle.hasMemory` |
| `igniter.agent.lifecycle.start.error` | Agent start fails | `ctx.error.code`, `ctx.error.message` |
| `igniter.agent.generation.generate.started` | Text generation begins | `ctx.generation.inputMessages`, `ctx.generation.streamed` |
| `igniter.agent.generation.generate.success` | Text generation completes | `ctx.generation.inputTokens`, `ctx.generation.outputTokens` |
| `igniter.agent.generation.generate.error` | Text generation fails | `ctx.error.code`, `ctx.error.operation` |
| `igniter.agent.tool.execute.started` | Tool execution begins | `ctx.tool.toolset`, `ctx.tool.name` |
| `igniter.agent.tool.execute.success` | Tool execution completes | `ctx.tool.durationMs` |
| `igniter.agent.tool.execute.error` | Tool execution fails | `ctx.error.code`, `ctx.error.component` |
| `igniter.agent.memory.operation.started` | Memory operation begins | `ctx.memory.operation`, `ctx.memory.scope` |
| `igniter.agent.memory.operation.success` | Memory operation completes | `ctx.memory.durationMs`, `ctx.memory.count` |
| `igniter.agent.memory.operation.error` | Memory operation fails | `ctx.error.code`, `ctx.error.component` |

```typescript
// Events are emitted automatically with your telemetry adapter
// Example: View events in your observability backend
const events = await telemetry.query({
  service: 'my-ai-app',
  eventType: 'igniter.agent.generation.generate.success',
  timeRange: 'last_hour',
})

console.log(`Completed ${events.length} agent requests in the last hour`)
```

---

## Multi-Agent Orchestration

### Manager Setup

```typescript
import { IgniterAgentManager } from '@igniter-js/agents'

// Create specialized agents
const sharedMemory = IgniterAgentInMemoryAdapter.create()

const memoryConfig = {
  provider: sharedMemory,
  working: { enabled: true, scope: 'chat' },
  history: { enabled: true, limit: 50 },
  chats: { enabled: true },
}

const supportAgent = IgniterAgent
  .create('support')
  .withModel(openai('gpt-4'))
  .addToolset(supportToolset)
  .withMemory(memoryConfig)
  .build()

const salesAgent = IgniterAgent
  .create('sales')
  .withModel(openai('gpt-4'))
  .addToolset(salesToolset)
  .withMemory(memoryConfig)
  .build()

const analyticsAgent = IgniterAgent
  .create('analytics')
  .withModel(openai('gpt-4'))
  .addToolset(analyticsToolset)
  .withMemory(memoryConfig)
  .build()

// Create manager with shared resources
const manager = IgniterAgentManager
  .create()
  .withLogger(logger)
  .withTelemetry(telemetry)
  .addAgent('support', supportAgent)
  .addAgent('sales', salesAgent)
  .addAgent('analytics', analyticsAgent)
  .build()

await manager.startAll()

// Route requests to appropriate agents
async function routeRequest(request: CustomerRequest) {
  const agentId = request.type === 'support' ? 'support' : 'sales'
  const agent = manager.get(agentId)
  
  return agent.generate({
    chatId: `chat_${request.id}`,
    userId: request.userId,
    context: {},
    message: { role: 'user', content: request.message },
  })
}
```

### Agent Communication

Agents in a manager can reference shared context:

```typescript
// All agents share the same memory adapter
const sharedMemory = IgniterAgentJSONFileAdapter.create({
  dataDir: './shared-context',
})

await sharedMemory.connect()

const sharedMemoryConfig = {
  provider: sharedMemory,
  working: { enabled: true, scope: 'user' },
  history: { enabled: true, limit: 100 },
  chats: { enabled: true },
}

const supportAgent = IgniterAgent
  .create('support')
  .withModel(openai('gpt-4'))
  .addToolset(supportToolset)
  .withMemory(sharedMemoryConfig)
  .build()

const salesAgent = IgniterAgent
  .create('sales')
  .withModel(openai('gpt-4'))
  .addToolset(salesToolset)
  .withMemory(sharedMemoryConfig)
  .build()

const manager = IgniterAgentManager
  .create()
  .addAgent('support', supportAgent)
  .addAgent('sales', salesAgent)
  .build()

// Both agents can access shared user context
await sharedMemory.updateWorkingMemory({
  scope: 'user',
  identifier: 'user-123',
  content: `
## Account
- Status: premium
- Support tickets: 5
- Purchase history: stored in CRM
`,
})

// Support agent uses this context
const supportResponse = await manager.get('support').generate({
  chatId: 'chat_support',
  userId: 'user-123',
  context: {},
  message: { role: 'user', content: 'I have a problem' },
})

// Sales agent also uses this context
const salesResponse = await manager.get('sales').generate({
  chatId: 'chat_sales',
  userId: 'user-123',
  context: {},
  message: { role: 'user', content: 'Show me upgrades' },
})
```

---

## Real-World Examples

### Example 1: Customer Support Chatbot

```typescript
import {
  IgniterAgent,
  IgniterAgentTool,
  IgniterAgentToolset,
  IgniterAgentJSONFileAdapter,
} from '@igniter-js/agents'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

// Tools
const searchTicketsTool = IgniterAgentTool
  .create('search_tickets')
  .withDescription('Search customer support tickets')
  .withInput(z.object({
    customerId: z.string(),
    status: z.enum(['open', 'closed', 'pending']).optional(),
  }))
  .withExecute(async ({ customerId, status }) => {
    // Query ticket database
    return {
      tickets: [
        { id: 'T001', status: 'open', subject: 'Billing issue' },
        { id: 'T002', status: 'closed', subject: 'Login help' },
      ],
    }
  })
  .build()

const createTicketTool = IgniterAgentTool
  .create('create_ticket')
  .withDescription('Create a new support ticket')
  .withInput(z.object({
    customerId: z.string(),
    subject: z.string(),
    description: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
  }))
  .withExecute(async ({ customerId, subject, description, priority }) => {
    // Create ticket in database
    return {
      ticketId: 'T003',
      created: new Date(),
    }
  })
  .build()

const sendEmailTool = IgniterAgentTool
  .create('send_email')
  .withDescription('Send email to customer')
  .withInput(z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
  }))
  .withExecute(async ({ to, subject, body }) => {
    // Send email via provider
    return { sent: true, messageId: 'msg-123' }
  })
  .build()

// Create agent
const supportMemory = IgniterAgentJSONFileAdapter.create({
  dataDir: './support-memory',
  namespace: 'support',
})

await supportMemory.connect()

const supportMemoryConfig = {
  provider: supportMemory,
  working: { enabled: true, scope: 'chat' },
  history: { enabled: true, limit: 100 },
  chats: { enabled: true },
}

const supportAgent = IgniterAgent
  .create('support-bot')
  .withModel(openai('gpt-4'))
  .withPrompt(
    IgniterAgentPrompt.create(`
    You are a helpful customer support agent. Your goal is to:
    1. Understand the customer's issue
    2. Search for relevant tickets or information
    3. Create new tickets if needed
    4. Send follow-up emails with solutions
    
    Be empathetic, clear, and professional.
  `)
  )
  .withMemory(supportMemoryConfig)
  .addToolset(
    IgniterAgentToolset
      .create('support')
      .addTool(searchTicketsTool)
      .addTool(createTicketTool)
      .addTool(sendEmailTool)
      .build()
  )
  .build()

await supportAgent.start()

// Use it
const response = await supportAgent.generate({
  chatId: 'chat_support_1',
  userId: 'user_123',
  context: {},
  message: {
    role: 'user',
    content: 'I\\'ve been charged twice for my subscription!',
  },
})

console.log(response.content)
```

### Example 2: Data Analysis Agent

```typescript
import { IgniterAgent, IgniterAgentTool, IgniterAgentToolset } from '@igniter-js/agents'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const queryDatabaseTool = IgniterAgentTool
  .create('query_database')
  .withDescription('Execute SQL query on analytics database')
  .withInput(z.object({
    query: z.string(),
    limit: z.number().default(1000),
  }))
  .withExecute(async ({ query, limit }) => {
    // Execute query
    const results = [
      { date: '2025-12-01', revenue: 15000, customers: 250 },
      { date: '2025-12-02', revenue: 18000, customers: 280 },
    ]
    return results.slice(0, limit)
  })
  .build()

const generateChartTool = IgniterAgentTool
  .create('generate_chart')
  .withDescription('Create visualization from data')
  .withInput(z.object({
    type: z.enum(['line', 'bar', 'pie', 'scatter']),
    data: z.array(z.record(z.any())),
    title: z.string(),
  }))
  .withExecute(async ({ type, data, title }) => {
    // Generate chart
    return {
      chartUrl: 'https://charts.example.com/chart-123.png',
      format: type,
    }
  })
  .build()

const analyticsAgent = IgniterAgent
  .create('data-analyst')
  .withModel(openai('gpt-4'))
  .withPrompt(
    IgniterAgentPrompt.create(
      'You are a data analyst. Answer questions with data and create visualizations.'
    )
  )
  .addToolset(
    IgniterAgentToolset
      .create('analytics')
      .addTool(queryDatabaseTool)
      .addTool(generateChartTool)
      .build()
  )
  .build()

await analyticsAgent.start()

const response = await analyticsAgent.generate({
  chatId: 'chat_analytics_1',
  userId: 'user_123',
  context: {},
  message: {
    role: 'user',
    content: 'Show me revenue trends for the last 30 days with a chart',
  },
})

console.log(response.content)
```

---

## Best Practices

### 1. Type Safety First

```typescript
// ✅ Always define strict Zod schemas
const tool = IgniterAgentTool
  .create('my-tool')
  .withInput(
    z.object({
      userId: z.string().uuid(),
      email: z.string().email(),
      age: z.number().int().min(0).max(150),
    })
  )
  .build()

// ❌ Avoid any or unvalidated inputs
const badTool = IgniterAgentTool
  .create('bad-tool')
  .withExecute(async (input: any) => {})
  .build()
```

### 2. Memory Management

```typescript
// ✅ Set reasonable limits
const memory = IgniterAgentInMemoryAdapter.create({
  maxChats: 100,                        // Prevent unbounded growth
  maxMessages: 1000,                   // Limit messages per chat
})

// ❌ Avoid storing sensitive data
await memory.updateWorkingMemory({
  scope: 'user',
  identifier: 'user-123',
  content: `
## Sensitive Data (DO NOT STORE)
- apiKey: ${'${secret}'}
- password: ${'${password}'}
`,
})
```

### 3. Error Handling

```typescript
// ✅ Always handle agent generation errors
try {
  const response = await agent.generate({
    chatId: 'chat_123',
    userId: 'user_123',
    context: {},
    message: { role: 'user', content: 'Hello' },
  })
} catch (error) {
  if (error instanceof IgniterAgentError) {
    console.error(`Agent error: ${error.code}`, error.details)
  } else {
    console.error('Unknown error:', error)
  }
}

// ✅ Set tool execution timeouts
const tool = IgniterAgentTool
  .create('long-operation')
  .withExecute(async () => {
    return Promise.race([
      doLongOperation(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 30000)
      ),
    ])
  })
  .build()
```

### 4. Tool Design

```typescript
// ✅ Keep tools focused and single-purpose
const getUserTool = IgniterAgentTool
  .create('get_user')
  .withDescription('Get user by ID')
  .build()

const updateUserTool = IgniterAgentTool
  .create('update_user')
  .withDescription('Update user fields')
  .build()

// ❌ Avoid tools that do too much
const megaTool = IgniterAgentTool
  .create('user_operations')
  .withDescription('Get, update, delete users and their data')
  .build()

// ✅ Provide excellent descriptions
const goodTool = IgniterAgentTool
  .create('transfer_funds')
  .withDescription(
    'Transfer money between accounts. Requires source and destination ' +
    'account IDs, amount in cents, and optional memo. Returns transaction ' +
    'ID and confirmation number. May fail if insufficient funds or ' +
    'account is frozen.'
  )
  .build()
```

### 5. Observability

```typescript
// ✅ Always use telemetry in production
import { IgniterTelemetry } from '@igniter-js/telemetry'
import { IgniterAgentTelemetryEvents } from '@igniter-js/agents/telemetry'

const telemetry = IgniterTelemetry
  .create()
  .withService('my-ai-service')
  .addEvents(IgniterAgentTelemetryEvents)
  .build()

const agent = IgniterAgent
  .create('assistant')
  .withModel(openai('gpt-4'))
  .withTelemetry(telemetry)
  .onAgentStart((name) => {
    console.log(`Agent started: ${name}`)
  })
  .onAgentError((name, error) => {
    console.error(`Agent error in ${name}:`, error.message)
  })
  .onToolCallStart((agentName, toolName, input) => {
    console.log(`[${agentName}] Tool ${toolName} called`, input)
  })
  .onToolCallError((agentName, toolName, error) => {
    console.error(`[${agentName}] Tool ${toolName} failed`, error)
  })
  .build()
```

---

## API Reference

### IgniterAgent

```typescript
interface IgniterAgent {
  // Configuration
  withModel(model: LanguageModel): IgniterAgent
  withPrompt(prompt: IgniterAgentPrompt): IgniterAgent
  withMemory(memory: IgniterAgentMemoryConfig): IgniterAgent
  withContextSchema(schema: z.ZodSchema): IgniterAgent
  addToolset(toolset: IgniterAgentToolset): IgniterAgent
  addMCP(mcp: IgniterAgentMCPConfigUnion): IgniterAgent
  withLogger(logger: IgniterLogger): IgniterAgent
  withTelemetry(telemetry: IgniterTelemetryManager): IgniterAgent

  // Hooks
  onAgentStart(hook: Hook): IgniterAgent
  onAgentError(hook: Hook): IgniterAgent
  onToolCallStart(hook: Hook): IgniterAgent
  onToolCallEnd(hook: Hook): IgniterAgent
  onToolCallError(hook: Hook): IgniterAgent
  onMCPStart(hook: Hook): IgniterAgent
  onMCPError(hook: Hook): IgniterAgent

  // Build
  build(): IgniterAgentCore

  // Runtime
  start(): Promise<void>
  stop(): Promise<void>
  generate(input: GenerateInput): Promise<GenerateOutput>
  stream(input: GenerateInput): AsyncIterable<StreamChunk>
  getToolsets(): Record<string, IgniterAgentToolset>
  getTools(): ToolSet
  getModel(): LanguageModel
  getInstructions(): IgniterAgentPrompt
  getContextSchema(): z.ZodSchema
  attachLogger(logger?: IgniterLogger): void
  attachTelemetry(telemetry?: IgniterTelemetryManager): void
  attachHooks(hooks?: IgniterAgentHooks): void
  memory?: IgniterAgentMemoryCore
}
```

### IgniterAgentTool

```typescript
interface IgniterAgentTool {
  // Schema
  withDescription(desc: string): IgniterAgentTool
  withInput(schema: ZodSchema): IgniterAgentTool
  withOutput(schema: ZodSchema): IgniterAgentTool

  // Handler
  withExecute(handler: (input: any) => Promise<any>): IgniterAgentTool

  // Build
  build(): IgniterAgentToolCore
}
```

### IgniterAgentMemory

```typescript
interface IgniterAgentMemoryRuntime {
  // Working memory
  getWorkingMemory(params: { scope: string; identifier: string }): Promise<IgniterAgentWorkingMemory | null>
  updateWorkingMemory(params: { scope: string; identifier: string; content: string }): Promise<void>

  // Conversation history
  saveMessage(message: IgniterAgentConversationMessage): Promise<void>
  getMessages<T = IgniterAgentUIMessage>(params: { chatId: string; userId?: string; limit?: number }): Promise<T[]>

  // Chat sessions
  saveChat(chat: IgniterAgentChatSession): Promise<void>
  getChats(params: { userId?: string; search?: string; limit?: number }): Promise<IgniterAgentChatSession[]>
  getChat(chatId: string): Promise<IgniterAgentChatSession | null>
  updateChatTitle(chatId: string, title: string): Promise<void>
  deleteChat(chatId: string): Promise<void>
}
```

---

## Troubleshooting

### Agent not calling tools

**Problem:** Agent generates text responses but never uses available tools.

**Solution:**
1. Verify tool descriptions are clear and relevant
2. Check tool input schemas match expected parameters
3. Ensure tool is added to a toolset and toolset is added to agent
4. Review system prompt — doesn't discourage tool usage
5. Check telemetry events for `igniter.agent.tool.execute.started` — should be emitted if agent attempts to use tools

```typescript
// Debug: Log all tools the agent knows about
const tools = agent.getTools()
console.log('Available tools:', Object.keys(tools))
```

### Memory not persisting

**Problem:** Agent doesn't remember previous conversations.

**Solution:**
1. Verify memory config is passed to `withMemory()` (needs a `provider`)
2. For file adapters, call `await memory.connect()` before using
3. Check that you're not disconnecting between requests
4. Ensure the memory has the same namespace
5. Verify storage backend has write permissions

```typescript
// Check memory implementation
const memory = IgniterAgentJSONFileAdapter.create({
  dataDir: './agent-memory',
})

await memory.connect()

// Verify it's connected
console.log('Memory connected:', memory.isConnected())
```

### Tool execution errors

**Problem:** Tools fail during execution.

**Solution:**
1. Check tool input matches defined schema
2. Add error handling in tool handler
3. Review telemetry events for `igniter.agent.tool.execute.error` — will show error code
4. Add logging to understand what's failing
5. Ensure external dependencies (databases, APIs) are accessible

```typescript
// Better error handling in tool
const tool = IgniterAgentTool
  .create('risky-operation')
  .withExecute(async (input) => {
    try {
      return await performOperation(input)
    } catch (error) {
      console.error('Tool failed:', error)
      throw new IgniterAgentToolError({
        message: 'Operation failed',
        toolName: 'risky-operation',
        metadata: {
          originalError: error instanceof Error ? error.message : String(error),
        },
      })
    }
  })
  .build()
```

### Type inference not working

**Problem:** Tool input types not inferred correctly.

**Solution:**
1. Use `z.infer<typeof schema>` to explicitly type inputs
2. Ensure Zod version matches (v4+)
3. Add explicit type parameters if needed
4. Check TypeScript version (need 4.9+)

```typescript
// Explicitly type tool handler
const schema = z.object({ userId: z.string() })
type Input = z.infer<typeof schema>

const tool = IgniterAgentTool
  .create('typed-tool')
  .withInput(schema)
  .withExecute(async (input: Input) => {
    // Now input is properly typed
  })
  .build()
```

### High latency with MCP

**Problem:** Responses are slow when using MCP servers.

**Solution:**
1. Check MCP server health and latency
2. Reduce number of tools to speed up tool selection
3. Use tool descriptions to guide model selection
4. Consider moving frequently used tools to regular tools
5. Monitor telemetry for MCP-specific events

### Memory growing too large

**Problem:** Memory adapter consuming excessive disk space or memory.

**Solution:**
1. Set reasonable `maxChats` limit
2. Configure `maxChats`/`maxMessages` to cap growth
3. Monitor memory adapter size with telemetry
4. Use file adapter instead of in-memory for large workloads

```typescript
const memory = IgniterAgentInMemoryAdapter.create({
  maxChats: 50,
  maxMessages: 500,
})

// Monitor size
const stats = await memory.getStats()
console.log(`Messages: ${stats.messageCount}`)
console.log(`Chats: ${stats.chatCount}`)
```

---

## Advanced Topics

### Custom Memory Adapters

Implement your own memory adapter for custom storage backends:

```typescript
import type { IgniterAgentMemoryAdapter } from '@igniter-js/agents'

class CustomMemoryAdapter implements IgniterAgentMemoryAdapter {
  async connect(): Promise<void> {
    // Connect to your backend
  }

  async disconnect(): Promise<void> {
    // Cleanup connections
  }

  async getWorkingMemory(key: { scope: string; identifier: string }) {
    // Retrieve from your backend
  }

  async updateWorkingMemory(data: any) {
    // Save to your backend
  }

  // Implement other required methods...
}

const memory = new CustomMemoryAdapter()
const agent = IgniterAgent.create('assistant')
  .withMemory({ provider: memory })
  .build()
```

### Agent-to-Agent Communication

Have agents delegate to each other:

```typescript
const analysisToolForSalesAgent = IgniterAgentTool
  .create('request_analysis')
  .withDescription('Request data analysis from analytics agent')
  .withInput(z.object({ query: z.string() }))
  .withExecute(async ({ query }) => {
    // Delegate to analytics agent
    const analyticsAgent = manager.get('analytics')
    const result = await analyticsAgent.generate({
      chatId: 'chat_analytics_1',
      userId: 'user_123',
      context: {},
      message: { role: 'user', content: query },
    })
    return { analysis: result.content }
  })
  .build()
```

---

## License

MIT

## Support

For issues, questions, or contributions, visit the [Igniter.js repository](https://github.com/felipebarcelospro/igniter-js)
