/**
 * @fileoverview Core agent manager for lifecycle and orchestration.
 * This module provides centralized management for IgniterAgent instances.
 *
 * @description
 * The IgniterAgentManager provides utilities for:
 * - Managing multiple agent instances
 * - Coordinating agent lifecycle (start, stop)
 * - Monitoring agent health and status
 * - Routing requests to appropriate agents
 *
 * @example
 * ```typescript
 * import { IgniterAgentManager } from '@igniter-js/agents';
 *
 * // Create a manager
 * const manager = new IgniterAgentManager();
 *
 * // Register agents
 * manager.register('support', supportAgent);
 * manager.register('sales', salesAgent);
 *
 * // Start all agents
 * await manager.startAll();
 *
 * // Route to specific agent
 * const agent = manager.get('support');
 * const response = await agent.generate({ messages: [...] });
 * ```
 *
 * @module core/manager
 * @packageDocumentation
 */

import type { IgniterAgentBuiltAgent } from "../types/builder";
import type { IgniterAgentToolset } from "../types";
import { IgniterAgentError, IgniterAgentErrorCode } from "../errors";
import type { IgniterLogger } from "@igniter-js/core";
import type { IgniterAgentInfo, IgniterAgentManagerOptions } from "../types/manager";


/* =============================================================================
 * AGENT MANAGER CLASS
 * ============================================================================= */

/**
 * Manager for coordinating multiple IgniterAgent instances.
 *
 * @description
 * The IgniterAgentManager provides a centralized way to manage multiple
 * agent instances, handling their lifecycle and providing routing capabilities.
 *
 * **Key Features:**
 * - Register and manage multiple agents
 * - Batch start/stop operations
 * - Health monitoring
 * - Request routing
 *
 * @example
 * ```typescript
 * import { IgniterAgentManager, IgniterAgent } from '@igniter-js/agents';
 *
 * // Create agents
 * const supportAgent = IgniterAgent.create('support')
 *   .withModel(openai('gpt-4'))
 *   .build();
 *
 * const codeAgent = IgniterAgent.create('code')
 *   .withModel(openai('gpt-4-turbo'))
 *   .addToolset(codeToolset)
 *   .build();
 *
 * // Create manager and register agents
 * const manager = new IgniterAgentManager({
 *   continueOnError: true,
 *   onAgentStart: (name) => console.log(`Agent ${name} started`),
 *   onAgentError: (name, err) => console.error(`Agent ${name} failed:`, err)
 * });
 *
 * manager.register('support', supportAgent);
 * manager.register('code', codeAgent);
 *
 * // Start all agents
 * await manager.startAll();
 *
 * // Use specific agent
 * const agent = manager.get('code');
 * const result = await agent.generate({
 *   messages: [{ role: 'user', content: 'Write a test' }]
 * });
 *
 * // Get status
 * console.log(manager.getStatus());
 * ```
 *
 * @public
 */
export class IgniterAgentManagerCore<
  TAgentRegistry extends Record<string, IgniterAgentBuiltAgent> = Record<string, IgniterAgentBuiltAgent>
> {
  /**
   * Agent statuses.
   * @internal
   */
  private readonly _statuses: Map<string, IgniterAgentInfo> = new Map();

  /**
   * Manager options.
   * @internal
   */
  private readonly _options: IgniterAgentManagerOptions<TAgentRegistry>;

  /**
   * Creates a new IgniterAgentManager.
   *
   * @param options - Manager configuration options
   *
   * @example
   * ```typescript
   * const manager = new IgniterAgentManager({
   *   autoStart: false,
   *   continueOnError: true
   * });
   * ```
   */
  constructor(options: IgniterAgentManagerOptions<TAgentRegistry>) {
    this._options = {
      logger: options.logger,
      telemetry: options.telemetry,
      agents: options.agents ?? {},
      autoStart: options.autoStart ?? false,
      continueOnError: options.continueOnError ?? true,
      onAgentStart: options.onAgentStart ?? (() => {}),
      onAgentError: options.onAgentError ?? (() => {}),
      onToolCallStart: options.onToolCallStart ?? (() => {}),
      onToolCallComplete: options.onToolCallComplete ?? (() => {}),
      onToolCallError: options.onToolCallError ?? (() => {}),
      onMCPStart: options.onMCPStart ?? (() => {}),
      onMCPError: options.onMCPError ?? (() => {}),
    };

    for (const [name, agent] of Object.entries(this._options.agents)) {
      this.applyManagerContext(name, agent as IgniterAgentBuiltAgent);
      this._statuses.set(name, {
        name,
        status: "idle",
        registeredAt: new Date(),
        toolsetCount: Object.keys((agent as IgniterAgentBuiltAgent).getToolsets()).length,
      });
    }
  }

  private applyManagerContext(
    name: string,
    agent: IgniterAgentBuiltAgent,
  ): void {
    const logger = this._options.logger;
    const telemetry = this._options.telemetry;

    if (logger) {
      const scopedLogger = logger.child?.("IgniterAgent", { agent: name }) ?? logger;
      agent.attachLogger?.(scopedLogger);
    }

    if (telemetry) {
      agent.attachTelemetry?.(telemetry);
    }

    agent.attachHooks?.({
      onToolCallStart: this._options.onToolCallStart,
      onToolCallComplete: this._options.onToolCallComplete,
      onToolCallError: this._options.onToolCallError,
      onMCPStart: this._options.onMCPStart,
      onMCPError: this._options.onMCPError,
    });
  }

  /**
   * Creates a new IgniterAgentManager with default options.
   * @param options - Manager configuration options
   * @returns A new IgniterAgentManager instance
   * @example
   * ```typescript
   * const manager = IgniterAgentManager.create({
   *   autoStart: true
   * });
   * ```
   */
  static create(): IgniterAgentManagerCore {
    return new IgniterAgentManagerCore({
      agents: {},
    });
  }

  /* ---------------------------------------------------------------------------
   * REGISTRATION
   * --------------------------------------------------------------------------- */

  /**
   * Registers an agent with the manager.
   *
   * @description
   * Adds an agent to the manager's registry. If `autoStart` is enabled,
   * the agent will be started immediately after registration.
   *
   * @param name - Unique name for the agent
   * @param agent - The built agent instance
   * @returns This manager for chaining
   * @throws {IgniterAgentError} If an agent with the name already exists
   *
   * @example
   * ```typescript
   * manager
   *   .register('support', supportAgent)
   *   .register('sales', salesAgent);
   * ```
   */
  register(name: string, agent: IgniterAgentBuiltAgent): this {
    if (this._options.agents[name]) {
      throw new IgniterAgentError({
        message: `Agent '${name}' is already registered`,
        code: IgniterAgentErrorCode.INVALID_CONFIG,
        causer: "IgniterAgentManager",
        metadata: { operation: "register" },
      });
    }

    // @ts-expect-error -- Dynamic assignment to registry type
    this._options.agents[name] = agent;
    this.applyManagerContext(name, agent);

    this._statuses.set(name, {
      name,
      status: "idle",
      registeredAt: new Date(),
      toolsetCount: Object.keys(agent.getToolsets()).length,
    });

    if (this._options.autoStart) {
      this.start(name).catch((err) => {
        // @ts-expect-error -- Ignore error handling here
        this._options.onAgentError(name, err);
      });
    }

    return this;
  }

  /**
   * Unregisters an agent from the manager.
   *
   * @param name - The agent name to unregister
   * @returns True if the agent was unregistered
   *
   * @example
   * ```typescript
   * manager.unregister('old-agent');
   * ```
   */
  unregister(name: string): boolean {
    const removed = delete this._options.agents[name];
    this._statuses.delete(name);
    return removed;
  }

  /**
   * Checks if an agent is registered.
   *
   * @param name - The agent name to check
   * @returns True if the agent is registered
   */
  has(name: string): boolean {
    return Boolean(this._options.agents[name]);
  }

  /* ---------------------------------------------------------------------------
   * LIFECYCLE
   * --------------------------------------------------------------------------- */

  /**
   * Starts a specific agent.
   *
   * @description
   * Initializes the agent's MCP connections and prepares it for use.
   *
   * @param name - The agent name to start
   * @returns The agent's toolsets after initialization
   * @throws {IgniterAgentError} If the agent is not found
   *
   * @example
   * ```typescript
   * const toolsets = await manager.start('support');
   * console.log('Connected toolsets:', Object.keys(toolsets));
   * ```
   */
  async start(name: string): Promise<IgniterAgentBuiltAgent> {
    const agent = this._options.agents[name];
    const info = this._statuses.get(name);

    if (!agent || !info) {
      throw new IgniterAgentError({
        message: `Agent '${name}' is not registered`,
        code: IgniterAgentErrorCode.AGENT_NOT_INITIALIZED,
        causer: "IgniterAgentManager",
        metadata: { operation: "start" },
      });
    }

    try {
      info.status = "starting";
      this._options.logger?.debug("IgniterAgentManager.start started", {
        agent: name,
      });
      await agent.start();

      info.status = "running";
      info.startedAt = new Date();
      info.toolsetCount = Object.keys(agent.getToolsets()).length;
      this._options.onAgentStart?.(name);
      this._options.logger?.success?.("IgniterAgentManager.start success", {
        agent: name,
      });

      return agent;
    } catch (error) {
      info.status = "error";
      info.error = error instanceof Error ? error : new Error(String(error));

      this._options.onAgentError?.(name, info.error);
      this._options.logger?.error("IgniterAgentManager.start failed", info.error);
      throw error;
    }
  }

  /**
   * Starts all registered agents.
   *
   * @description
   * Initializes all agents in parallel. If `continueOnError` is true,
   * failed agents won't prevent others from starting.
   *
   * @returns Map of agent names to their results (toolsets or errors)
   *
   * @example
   * ```typescript
   * const results = await manager.startAll();
   *
   * for (const [name, result] of results) {
   *   if (result instanceof Error) {
   *     console.error(`${name} failed:`, result.message);
   *   } else {
   *     console.log(`${name} started with ${Object.keys(result).length} toolsets`);
   *   }
   * }
   * ```
   */
  async startAll(): Promise<
    Map<string, Record<string, IgniterAgentToolset> | Error>
  > {
    const results = new Map<
      string,
      Record<string, IgniterAgentToolset> | Error
    >();
    
    const promises = Object.keys(this._options.agents).map(async (name) => {
      try {
        const builtAgent = await this.start(name);
        results.set(name, builtAgent.getToolsets());
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        results.set(name, err);

        if (!this._options.continueOnError) {
          throw error;
        }
      }
    });

    await Promise.all(promises);
    this._options.logger?.info("IgniterAgentManager.startAll completed", {
      agents: this.getNames().length,
      failed: this.getFailedAgents().length,
    });
    return results;
  }

  /* ---------------------------------------------------------------------------
   * ACCESS
   * --------------------------------------------------------------------------- */

  /**
   * Gets a registered agent by name.
   *
   * @param name - The agent name
   * @returns The agent instance
   * @throws {IgniterAgentError} If the agent is not found
   *
   * @example
   * ```typescript
   * const agent = manager.get('support');
   * const response = await agent.generate({ messages: [...] });
   * ```
   */
  get<TName extends string>(name: TName): TAgentRegistry[TName] {
    const agent = this._options.agents[name];

    if (!agent) {
      throw new IgniterAgentError({
        message: `Agent '${name}' is not registered`,
        code: IgniterAgentErrorCode.AGENT_NOT_INITIALIZED,
        causer: "IgniterAgentManager",
        metadata: { operation: "get" },
      });
    }

    return agent;
  }

  /**
   * Gets an agent if it exists, undefined otherwise.
   *
   * @param name - The agent name
   * @returns The agent instance or undefined
   */
  tryGet<TName extends string>(name: TName): TAgentRegistry[TName] | undefined {
    return this._options.agents[name];
  }

  /**
   * Gets all registered agent names.
   *
   * @returns Array of agent names
   */
  getNames(): string[] {
    return Object.keys(this._options.agents);
  }

  /**
   * Gets the number of registered agents.
   *
   * @returns Agent count
   */
  get size(): number {
    return Object.keys(this._options.agents).length;
  }

  /* ---------------------------------------------------------------------------
   * STATUS
   * --------------------------------------------------------------------------- */

  /**
   * Gets information about a specific agent.
   *
   * @param name - The agent name
   * @returns Agent information or undefined
   */
  getInfo(name: string): IgniterAgentInfo | undefined {
    return this._statuses.get(name);
  }

  /**
   * Gets status information for all agents.
   *
   * @returns Array of agent information objects
   *
   * @example
   * ```typescript
   * const status = manager.getStatus();
   *
   * for (const info of status) {
   *   console.log(`${info.name}: ${info.status}`);
   * }
   * ```
   */
  getStatus(): IgniterAgentInfo[] {
    return Array.from(this._statuses.values());
  }

  /**
   * Checks if all agents are running.
   *
   * @returns True if all agents are in 'running' status
   */
  isAllRunning(): boolean {
    for (const info of this._statuses.values()) {
      if (info.status !== "running") {
        return false;
      }
    }

    return Object.keys(this._options.agents).length > 0;
  }

  /**
   * Gets agents that are in error state.
   *
   * @returns Array of agent info for failed agents
   */
  getFailedAgents(): IgniterAgentInfo[] {
    return Array.from(this._statuses.values()).filter(
      (info) => info.status === "error",
    );
  }
}
