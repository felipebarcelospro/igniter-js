# @igniter-js/agents - AI Agent Instructions

> **Package Version:** 0.1.0  
> **Last Updated:** 2025-12-23  
> **Status:** Ready for Publication

---

## Package Overview

**Name:** `@igniter-js/agents`  
**Purpose:** Type-safe AI agent framework with toolsets, MCP integration, memory, telemetry, and multi-agent orchestration  
**Type:** Standalone Library (works independently or with Igniter.js)

### Core Features
- Fluent builders for agents, tools, toolsets, MCP clients, and prompts
- Runtime agent core with hooks, logging, and telemetry
- Memory runtime with adapter-based storage
- Manager core for multi-agent orchestration
- Server-only design (Node.js, Bun, Deno)

---

## Architecture

### Design Principles

1. **Type Safety First**
   - Zod schemas for tool inputs and context validation
   - Builder-based configuration with inference
   - No `any` in public APIs

2. **Adapter-Based Memory**
   - Core defines interfaces
   - Adapters implement storage (in-memory adapter only for now)
   - No mock adapter (exception: memory adapter is enough)

3. **Telemetry + Logging**
   - Use `IgniterTelemetryManager` via `withTelemetry`
   - Use `IgniterLogger` via `withLogger`
   - Emit all events through `IgniterAgentTelemetryEvents.get.key(...)`

4. **Builder Pattern**
   - `IgniterAgentBuilder` produces `IgniterAgentCore`
   - `IgniterAgentManagerBuilder` produces `IgniterAgentManagerCore`
   - `IgniterAgentTool` and `IgniterAgentToolset` are separate, not on `IgniterAgent`

---

## File Structure

```
packages/agent/
├── src/
│   ├── index.ts                       # Public exports (core/builders/adapters/telemetry/utils/types)
│   ├── shim.ts                        # Browser/client shim
│   │
│   ├── adapters/
│   │   ├── index.ts                   # Adapters barrel
│   │   ├── memory.adapter.ts          # In-memory adapter (acts as mock)
│   │   └── memory.adapter.spec.ts     # Adapter tests
│   │
│   ├── builders/
│   │   ├── index.ts                   # Builders barrel
│   │   ├── agent.builder.ts           # IgniterAgent builder
│   │   ├── agent.builder.spec.ts      # Agent builder tests
│   │   ├── main.builder.ts            # Manager builder
│   │   ├── main.builder.spec.ts       # Manager builder tests
│   │   ├── tool.builder.ts            # Tool builder
│   │   ├── tool.builder.test.ts       # Tool builder tests
│   │   ├── toolset.builder.ts         # Toolset builder
│   │   ├── toolset.builder.spec.ts    # Toolset builder tests
│   │   ├── mcp.builder.ts             # MCP client builder
│   │   ├── mcp.builder.spec.ts        # MCP builder tests
│   │   ├── prompt.builder.ts          # Prompt builder
│   │   └── prompt.builder.spec.ts     # Prompt builder tests
│   │
│   ├── core/
│   │   ├── agent.ts                   # Agent runtime core
│   │   ├── manager.ts                 # Manager runtime core
│   │   ├── manager.spec.ts            # Manager core tests
│   │   ├── memory.ts                  # Memory runtime core
│   │   └── telemetry.spec.ts          # Telemetry coverage tests
│   │
│   ├── errors/
│   │   ├── agent.error.ts             # Error classes + codes
│   │   └── index.ts                   # Errors barrel
│   │
│   ├── telemetry/
│   │   └── index.ts                   # Telemetry events
│   │
│   ├── types/
│   │   ├── adapter.ts                 # Adapter types
│   │   ├── builder.ts                 # Builder types
│   │   ├── common.ts                  # Core shared types
│   │   ├── hooks.ts                   # Hook types
│   │   ├── manager.ts                 # Manager types
│   │   ├── memory.ts                  # Memory types
│   │   ├── prompt.ts                  # Prompt types
│   │   ├── utils.ts                   # Type utilities
│   │   └── index.ts                   # Types barrel
│   │
│   ├── utils/
│   │   ├── async.ts                   # Async helpers
│   │   ├── async.spec.ts              # Async tests
│   │   ├── objects.ts                 # Object helpers
│   │   ├── objects.spec.ts            # Object tests
│   │   ├── strings.ts                 # String helpers
│   │   ├── strings.spec.ts            # String tests
│   │   ├── validation.ts              # Validation helpers
│   │   ├── validation.spec.ts         # Validation tests
│   │   └── index.ts                   # Utils barrel
│   │
│   └── core/index.ts                  # Core barrel
│
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── README.md
├── AGENTS.md
└── CHANGELOG.md
```

---

## Key Components

### `IgniterAgentCore`
- Wraps Vercel AI `ToolLoopAgent`
- Emits telemetry events for lifecycle, generation, tool calls, MCP, and memory
- Supports hooks: `onAgentStart`, `onAgentError`, `onToolCallStart`, `onToolCallComplete`, `onToolCallError`, `onMCPStart`, `onMCPError`

### `IgniterAgentManagerCore`
- Registers and orchestrates agents
- Applies logger/telemetry/hook context to registered agents
- Supports batch start (`startAll`) and status inspection

### Builders
- `IgniterAgent` (alias) -> `IgniterAgentBuilder.create(name)`
- `IgniterAgentTool` -> tool builder
- `IgniterAgentToolset` -> toolset builder
- `IgniterAgentMCPClient` -> MCP builder
- `IgniterAgentPrompt` -> prompt builder
- `IgniterAgentManager` -> manager builder

### Telemetry
- Events defined in `src/telemetry/index.ts`
- Always emit via `IgniterAgentTelemetryEvents.get.key('event.name')`
- Ensure error events include `ctx.error.*` attributes

---

## Development Guidelines

### Exports & Subpaths
- Main entry (`src/index.ts`) re-exports core, builders, adapters, telemetry, errors, utils, and types
- Subpaths only: `@igniter-js/agents/adapters` and `@igniter-js/agents/telemetry`
- Keep `shim.ts` registered in `exports` and `browser` mappings

### Testing Strategy

**Mandatory coverage:** `/utils`, `/core`, `/builders`, `/adapters`

- **Telemetry**: One `it` per event, grouped by `describe('telemetry.<group>')`
- **Builders**: validate chaining, defaults, and output contracts
- **Core**: validate orchestration and lifecycle behavior
- **Adapters**: validate all methods for in-memory adapter
- **Utils**: test each utility class

### Logging
- Use `IgniterLogger` from `@igniter-js/core`
- Prefer `debug`, `info`, `success`, `error` with contextual payloads

---

## Notes

- No `IgniterAgent.toolset/mcp/prompt` helpers. Use `IgniterAgentToolset`, `IgniterAgentMCPClient`, and `IgniterAgentPrompt`.
- MCP + telemetry should always emit with `IgniterAgentTelemetryEvents.get.key`.
- Keep docs (`README.md`, `AGENTS.md`) and TSDoc aligned with current API.
