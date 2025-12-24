# @igniter-js/agents

[![NPM Version](https://img.shields.io/npm/v/@igniter-js/agents.svg)](https://www.npmjs.com/package/@igniter-js/agents)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Type-safe AI agent framework for Igniter.js with MCP integration, custom toolsets, memory, telemetry, and multi-agent orchestration.

## Features

- ✅ **Type-Safe Tooling** - Strong inference for tool inputs/outputs
- ✅ **Prompt Templates** - Lightweight prompt builder with context interpolation
- ✅ **MCP Support** - Connect to Model Context Protocol servers
- ✅ **Memory System** - Working memory + chat history support
- ✅ **Telemetry Ready** - Optional integration with `@igniter-js/telemetry`
- ✅ **Logger Hooks** - Use `IgniterLogger` for structured logging
- ✅ **Manager Orchestration** - Run and supervise multiple agents
- ✅ **Server-Only** - Built for Node.js, Bun, Deno (no browser use)

## Installation

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

### Optional Dependencies

**Telemetry:**
```bash
npm install @igniter-js/telemetry
```

**MCP Clients:**
```bash
npm install @ai-sdk/mcp @modelcontextprotocol/sdk
```

## Quick Start

```ts
import {
  IgniterAgent,
  IgniterAgentTool,
  IgniterAgentToolset,
  IgniterAgentPrompt,
} from '@igniter-js/agents'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const echoTool = IgniterAgentTool
  .create('echo')
  .withDescription('Echoes a message')
  .withInputSchema(z.object({ message: z.string() }))
  .withExecute(async ({ message }) => message)
  .build()

const toolset = IgniterAgentToolset
  .create('utils')
  .addTool(echoTool)
  .build()

const prompt = IgniterAgentPrompt.create('You are {{agent}}.')

const agent = IgniterAgent.create('assistant')
  .withModel(openai('gpt-4'))
  .withPrompt(prompt)
  .addToolset(toolset)
  .build()

await agent.start()

const result = await agent.generate({
  messages: [{ role: 'user', content: 'Hello!' }],
  options: { agent: 'assistant' },
})

console.log(result)
```

## MCP Integration

```ts
import { IgniterAgentMCPClient } from '@igniter-js/agents'

const filesystemMCP = IgniterAgentMCPClient
  .create('filesystem')
  .withType('stdio')
  .withCommand('npx')
  .withArgs(['-y', '@modelcontextprotocol/server-filesystem', '/tmp'])
  .build()

const agent = IgniterAgent.create('assistant')
  .withModel(openai('gpt-4'))
  .addMCP(filesystemMCP)
  .build()

await agent.start()
```

## Telemetry

```ts
import { IgniterTelemetry } from '@igniter-js/telemetry'
import { IgniterAgentTelemetryEvents } from '@igniter-js/agents/telemetry'

const telemetry = IgniterTelemetry.create()
  .withService('my-api')
  .addEvents(IgniterAgentTelemetryEvents)
  .build()

const agent = IgniterAgent.create('assistant')
  .withModel(openai('gpt-4'))
  .withTelemetry(telemetry)
  .build()
```

## Memory

```ts
import { IgniterAgentInMemoryAdapter } from '@igniter-js/agents/adapters'

const memory = IgniterAgentInMemoryAdapter.create({ namespace: 'demo' })

const agent = IgniterAgent.create('assistant')
  .withModel(openai('gpt-4'))
  .withMemory({ provider: memory })
  .build()

await agent.memory?.updateWorkingMemory({
  scope: 'chat',
  identifier: 'chat-1',
  content: 'User prefers TypeScript',
})
```

## Manager Orchestration

```ts
import { IgniterAgentManager } from '@igniter-js/agents'

const manager = IgniterAgentManager
  .create()
  .addAgent('support', supportAgent)
  .addAgent('sales', salesAgent)
  .build()

await manager.startAll()
```

## Notes

- The package is server-only. Do not import it in browser/client code.
- Zod is used for tool input schemas and context validation.
- Telemetry is optional but recommended for observability.

## License

MIT
