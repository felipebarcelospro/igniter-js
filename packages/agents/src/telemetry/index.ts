/**
 * @fileoverview Telemetry events for @igniter-js/agents
 * @module @igniter-js/agents/telemetry
 *
 * @description
 * Defines telemetry events for agent operations including lifecycle,
 * tool execution, MCP connections, memory operations, and generation.
 * Events use dot notation namespacing and follow the IgniterTelemetry pattern.
 *
 * ### Important Redaction Rules
 *
 * **NEVER** expose these fields in telemetry attributes:
 * - Message contents or prompts (may contain sensitive user data)
 * - Tool execution results (may contain PII)
 * - Memory contents (may contain sensitive context)
 * - API keys or credentials
 *
 * **SAFE** to expose:
 * - Operation names and types
 * - Agent and toolset names
 * - Success/failure states
 * - Error codes and sanitized messages
 * - Timing/duration metrics
 * - Token counts (input/output)
 * - Tool names (not arguments)
 *
 * @example
 * ```typescript
 * import { IgniterAgentTelemetryEvents } from '@igniter-js/agents/telemetry'
 * import { IgniterTelemetry } from '@igniter-js/telemetry'
 *
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .addEvents(IgniterAgentTelemetryEvents)
 *   .withRedaction({
 *     denylistKeys: ['content', 'message', 'prompt', 'result'],
 *     hashKeys: ['ctx.agent.userId'],
 *   })
 *   .build()
 *
 * const agent = IgniterAgent.create('assistant')
 *   .withModel(openai('gpt-4'))
 *   .withTelemetry(telemetry)
 *   .build()
 * ```
 */

import { IgniterTelemetryEvents } from "@igniter-js/telemetry";
import { z } from "zod";

/**
 * Base attributes present in all agent events.
 * These are safe to expose and provide operational context.
 */
const BaseAgentAttributesSchema = z.object({
  /**
   * The agent name.
   */
  "ctx.agent.name": z.string(),

  /**
   * The current scope (if scoped).
   */
  "ctx.agent.scope": z.string().optional(),

  /**
   * The scope identifier value.
   */
  "ctx.agent.scopeId": z.string().optional(),
});

/**
 * Attributes for lifecycle events (start, stop).
 */
const LifecycleAttributesSchema = BaseAgentAttributesSchema.extend({
  /**
   * Number of toolsets registered.
   */
  "ctx.lifecycle.toolsetCount": z.number().optional(),

  /**
   * Number of MCP connections configured.
   */
  "ctx.lifecycle.mcpCount": z.number().optional(),

  /**
   * Whether memory adapter is configured.
   */
  "ctx.lifecycle.hasMemory": z.boolean().optional(),
});

/**
 * Attributes for generation events.
 */
const GenerationAttributesSchema = BaseAgentAttributesSchema.extend({
  /**
   * The model used for generation.
   */
  "ctx.generation.model": z.string().optional(),

  /**
   * Number of input messages.
   */
  "ctx.generation.inputMessages": z.number().optional(),

  /**
   * Number of input tokens (if available).
   */
  "ctx.generation.inputTokens": z.number().optional(),

  /**
   * Number of output tokens (if available).
   */
  "ctx.generation.outputTokens": z.number().optional(),

  /**
   * Total tokens used (if available).
   */
  "ctx.generation.totalTokens": z.number().optional(),

  /**
   * Generation duration in milliseconds.
   */
  "ctx.generation.durationMs": z.number().optional(),

  /**
   * Number of tool calls made during generation.
   */
  "ctx.generation.toolCalls": z.number().optional(),

  /**
   * Whether the response was streamed.
   */
  "ctx.generation.streamed": z.boolean().optional(),
});

/**
 * Attributes for tool execution events.
 */
const ToolAttributesSchema = BaseAgentAttributesSchema.extend({
  /**
   * The toolset name.
   */
  "ctx.tool.toolset": z.string(),

  /**
   * The tool name (within the toolset).
   */
  "ctx.tool.name": z.string(),

  /**
   * The full tool identifier (toolset_name).
   */
  "ctx.tool.fullName": z.string(),

  /**
   * Tool execution duration in milliseconds.
   */
  "ctx.tool.durationMs": z.number().optional(),
});

/**
 * Attributes for MCP events.
 */
const MCPAttributesSchema = BaseAgentAttributesSchema.extend({
  /**
   * The MCP configuration name.
   */
  "ctx.mcp.name": z.string(),

  /**
   * The MCP transport type (stdio, http).
   */
  "ctx.mcp.type": z.enum(["stdio", "http"]),

  /**
   * Number of tools provided by this MCP.
   */
  "ctx.mcp.toolCount": z.number().optional(),

  /**
   * Connection duration in milliseconds.
   */
  "ctx.mcp.durationMs": z.number().optional(),
});

/**
 * Attributes for memory events.
 */
const MemoryAttributesSchema = BaseAgentAttributesSchema.extend({
  /**
   * The memory operation type.
   */
  "ctx.memory.operation": z.enum([
    "getWorkingMemory",
    "updateWorkingMemory",
    "getMessages",
    "saveMessage",
    "getChats",
    "saveChat",
    "getChat",
    "updateChatTitle",
    "deleteChat",
  ]),

  /**
   * The memory scope (user, chat, global).
   */
  "ctx.memory.scope": z.string().optional(),

  /**
   * Number of items affected.
   */
  "ctx.memory.count": z.number().optional(),

  /**
   * Operation duration in milliseconds.
   */
  "ctx.memory.durationMs": z.number().optional(),
});

/**
 * Attributes for error events.
 */
const ErrorAttributesSchema = BaseAgentAttributesSchema.extend({
  /**
   * The error code.
   */
  "ctx.error.code": z.string(),

  /**
   * The sanitized error message (no sensitive data).
   */
  "ctx.error.message": z.string().optional(),

  /**
   * The operation that failed.
   */
  "ctx.error.operation": z.string().optional(),

  /**
   * The component that threw the error.
   */
  "ctx.error.component": z.string().optional(),
});

/**
 * Telemetry events for @igniter-js/agents.
 *
 * ### Event Naming Convention
 * All events are prefixed with 'igniter.agent' followed by:
 * - `lifecycle.*` - Agent start/stop events
 * - `generation.*` - Text generation events
 * - `tool.*` - Tool execution events
 * - `mcp.*` - MCP connection events
 * - `memory.*` - Memory operation events
 * - `error.*` - Error events
 *
 * ### Usage with IgniterAgent
 *
 * These events are automatically emitted when you use `withTelemetry()`:
 *
 * ```typescript
 * import { IgniterAgent } from '@igniter-js/agents'
 * import { IgniterTelemetry } from '@igniter-js/telemetry'
 * import { IgniterAgentTelemetryEvents } from '@igniter-js/agents/telemetry'
 *
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .addEvents(IgniterAgentTelemetryEvents)
 *   .build()
 *
 * const agent = IgniterAgent.create('assistant')
 *   .withModel(openai('gpt-4'))
 *   .withTelemetry(telemetry)
 *   .build()
 * ```
 */
export const IgniterAgentTelemetryEvents = IgniterTelemetryEvents.namespace(
  "igniter.agent",
)
  // ============================================================================
  // LIFECYCLE EVENTS
  // ============================================================================
  .event("lifecycle.start.started", LifecycleAttributesSchema)
  .event("lifecycle.start.success", LifecycleAttributesSchema)
  .event("lifecycle.start.error", ErrorAttributesSchema)
  .event("lifecycle.stop.started", LifecycleAttributesSchema)
  .event("lifecycle.stop.success", LifecycleAttributesSchema)
  .event("lifecycle.stop.error", ErrorAttributesSchema)
  // ============================================================================
  // GENERATION EVENTS
  // ============================================================================
  .event("generation.generate.started", GenerationAttributesSchema)
  .event("generation.generate.success", GenerationAttributesSchema)
  .event("generation.generate.error", ErrorAttributesSchema)
  .event("generation.stream.started", GenerationAttributesSchema)
  .event("generation.stream.chunk", GenerationAttributesSchema)
  .event("generation.stream.success", GenerationAttributesSchema)
  .event("generation.stream.error", ErrorAttributesSchema)
  // ============================================================================
  // TOOL EVENTS
  // ============================================================================
  .event("tool.execute.started", ToolAttributesSchema)
  .event("tool.execute.success", ToolAttributesSchema)
  .event("tool.execute.error", ErrorAttributesSchema)
  // ============================================================================
  // MCP EVENTS
  // ============================================================================
  .event("mcp.connect.started", MCPAttributesSchema)
  .event("mcp.connect.success", MCPAttributesSchema)
  .event("mcp.connect.error", ErrorAttributesSchema)
  .event("mcp.disconnect.started", MCPAttributesSchema)
  .event("mcp.disconnect.success", MCPAttributesSchema)
  .event("mcp.disconnect.error", ErrorAttributesSchema)
  // ============================================================================
  // MEMORY EVENTS
  // ============================================================================
  .event("memory.operation.started", MemoryAttributesSchema)
  .event("memory.operation.success", MemoryAttributesSchema)
  .event("memory.operation.error", ErrorAttributesSchema)
  .build();

/**
 * Type for the telemetry events registry.
 */
export type IgniterAgentTelemetryEventsType =
  typeof IgniterAgentTelemetryEvents.$Infer.events;
