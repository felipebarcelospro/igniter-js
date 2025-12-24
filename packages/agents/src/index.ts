/**
 * @fileoverview Main entry point for @igniter-js/agents
 * @module @igniter-js/agents
 *
 * @description
 * Type-safe AI agent framework with toolsets, MCP integration, memory, telemetry,
 * and multi-agent orchestration.
 *
 * @example
 * ```typescript
 * import {
 *   IgniterAgent,
 *   IgniterAgentToolset,
 *   IgniterAgentTool,
 *   IgniterAgentMCPClient,
 *   IgniterAgentPrompt,
 * } from '@igniter-js/agents'
 * import { openai } from '@ai-sdk/openai'
 * import { z } from 'zod'
 *
 * const prompt = IgniterAgentPrompt.create('You are {{agent}}.')
 *
 * const toolset = IgniterAgentToolset.create('utils')
 *   .addTool(
 *     IgniterAgentTool.create('getTime')
 *       .withDescription('Returns the current time')
 *       .withInputSchema(z.object({}))
 *       .withExecute(async () => new Date().toISOString())
 *       .build(),
 *   )
 *   .build()
 *
 * const agent = IgniterAgent.create('assistant')
 *   .withModel(openai('gpt-4'))
 *   .withPrompt(prompt)
 *   .addToolset(toolset)
 *   .addMCP(
 *     IgniterAgentMCPClient.create('filesystem')
 *       .withType('stdio')
 *       .withCommand('npx')
 *       .withArgs(['-y', '@modelcontextprotocol/server-filesystem', '/tmp'])
 *       .build(),
 *   )
 *   .build()
 *
 * await agent.start()
 * const result = await agent.generate({ messages: [{ role: 'user', content: 'Hi' }] })
 * ```
 */

// =============================================================================
// CORE EXPORTS
// =============================================================================

export * from './core'
export type * from './core'

// =============================================================================
// BUILDER EXPORTS
// =============================================================================

export {
  IgniterAgent,
  IgniterAgentBuilder,
  IgniterAgentManager,
  IgniterAgentManagerBuilder,
  IgniterAgentTool,
  IgniterAgentToolBuilder,
  IgniterAgentToolset,
  IgniterAgentToolsetBuilder,
  IgniterAgentMCPClient,
  IgniterAgentMCPBuilder,
  IgniterAgentPrompt,
  IgniterAgentPromptBuilder,
} from './builders'

// =============================================================================
// ADAPTER EXPORTS
// =============================================================================

export * from './adapters'
export type * from './adapters'

// =============================================================================
// TELEMETRY EXPORTS
// =============================================================================

export * from './telemetry'
export type * from './telemetry'

// =============================================================================
// ERROR EXPORTS
// =============================================================================

export * from './errors'
export type * from './errors'

// =============================================================================
// UTIL EXPORTS
// =============================================================================

export * from './utils'
export type * from './utils'

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type * from './types'
