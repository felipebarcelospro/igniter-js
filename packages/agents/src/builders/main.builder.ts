import type { IgniterLogger } from "@igniter-js/core";
import type { IgniterAgentBuiltAgent } from "../types";
import { IgniterAgentManagerCore } from "../core/manager";
import type { IgniterAgentManagerOptions } from "../types/manager";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import type { IgniterAgentHooks } from "../types/hooks";

export class IgniterAgentManagerBuilder<
  TAgentRegistry extends Record<string, IgniterAgentBuiltAgent> = Record<string, IgniterAgentBuiltAgent>
> {
  private readonly _manager: IgniterAgentManagerOptions<TAgentRegistry>

  private constructor(manager: IgniterAgentManagerOptions<TAgentRegistry>) {
    this._manager = manager;
  }

  addAgent<TName extends string, TAgent extends IgniterAgentBuiltAgent>(
    name: TName,
    agent: TAgent,
  ): IgniterAgentManagerBuilder<TAgentRegistry & { [K in TName]: TAgent }> {
    return new IgniterAgentManagerBuilder<TAgentRegistry & { [K in TName]: TAgent }>({
      logger: this._manager.logger,
      telemetry: this._manager.telemetry,
      autoStart: this._manager.autoStart,
      continueOnError: this._manager.continueOnError,
      onAgentStart: this._manager.onAgentStart,
      onAgentError: this._manager.onAgentError,
      onToolCallStart: this._manager.onToolCallStart,
      onToolCallComplete: this._manager.onToolCallComplete,
      onToolCallError: this._manager.onToolCallError,
      onMCPStart: this._manager.onMCPStart,
      onMCPError: this._manager.onMCPError,
      agents: {
        ...this._manager.agents,
        [name]: agent,
      },
    });
  }

  withLogger(logger: IgniterLogger): IgniterAgentManagerBuilder<TAgentRegistry> {
    return new IgniterAgentManagerBuilder({
      ...this._manager,
      logger,
    });
  }

  withTelemetry(telemetry: IgniterTelemetryManager): IgniterAgentManagerBuilder<TAgentRegistry> {
    return new IgniterAgentManagerBuilder({
      ...this._manager,
      telemetry,
    });
  }

  withAutoStart(autoStart: boolean): IgniterAgentManagerBuilder<TAgentRegistry> {
    return new IgniterAgentManagerBuilder({
      ...this._manager,
      autoStart,
    });
  }

  withContinueOnError(continueOnError: boolean): IgniterAgentManagerBuilder<TAgentRegistry> {
    return new IgniterAgentManagerBuilder({
      ...this._manager,
      continueOnError,
    });
  }

  onAgentStart(
    callback: IgniterAgentHooks["onAgentStart"],
  ): IgniterAgentManagerBuilder<TAgentRegistry> {
    return new IgniterAgentManagerBuilder({
      ...this._manager,
      onAgentStart: callback,
    });
  }

  onAgentError(
    callback: IgniterAgentHooks["onAgentError"],
  ): IgniterAgentManagerBuilder<TAgentRegistry> {
    return new IgniterAgentManagerBuilder({
      ...this._manager,
      onAgentError: callback,
    });
  }

  onToolCallStart(
    callback: (agentName: keyof TAgentRegistry, toolName: string, input: unknown) => void
  ): IgniterAgentManagerBuilder<TAgentRegistry> {
    const manager = new IgniterAgentManagerBuilder({
      ...this._manager,
      onToolCallStart: callback
    });

    return manager as unknown as IgniterAgentManagerBuilder<TAgentRegistry>;
  }

  onToolCallEnd(
    callback: (agentName: keyof TAgentRegistry, toolName: string, output: unknown) => void
  ): IgniterAgentManagerBuilder<TAgentRegistry> {
    const manager = new IgniterAgentManagerBuilder({
      ...this._manager,
      onToolCallComplete: callback
    });

    return manager as unknown as IgniterAgentManagerBuilder<TAgentRegistry>;
  }

  onToolCallError(
    callback: (agentName: keyof TAgentRegistry, toolName: string, error: Error) => void
  ): IgniterAgentManagerBuilder<TAgentRegistry> {
    const manager = new IgniterAgentManagerBuilder({
      ...this._manager,
      onToolCallError: callback
    });

    return manager as unknown as IgniterAgentManagerBuilder<TAgentRegistry>;
  }

  onMCPStart(
    callback: (agentName: keyof TAgentRegistry, mcpName: string) => void
  ): IgniterAgentManagerBuilder<TAgentRegistry> {
    const manager = new IgniterAgentManagerBuilder({
      ...this._manager,
      onMCPStart: callback
    });

    return manager as unknown as IgniterAgentManagerBuilder<TAgentRegistry>;
  }

  onMCPError(
    callback: (agentName: string, mcpName: string, error: Error) => void
  ): IgniterAgentManagerBuilder<TAgentRegistry> {
    const manager = new IgniterAgentManagerBuilder({
      ...this._manager,
      onMCPError: callback
    });

    return manager as unknown as IgniterAgentManagerBuilder<TAgentRegistry>;
  }

  static create(): IgniterAgentManagerBuilder<{}> {
    return new IgniterAgentManagerBuilder({
      agents: {},
      autoStart: false,
      continueOnError: true,
    });
  }

  build(): IgniterAgentManagerCore<TAgentRegistry> {
    return new IgniterAgentManagerCore<TAgentRegistry>(this._manager);
  }
}

/* =============================================================================
 * MAIN EXPORT ALIAS
 * ============================================================================= */

/**
 * Alias for IgniterAgentManager for cleaner API.
 *
 * @description
 * Use `IgniterAgentManager.create()` as the primary entry point for managing agents.
 *
 * @example
 * ```typescript
 * import { IgniterAgentManager } from '@igniter-js/agents';
 *
 * const manager = IgniterAgentManager
 *   .create()
 *   .addAgent('assistant', assistantAgent)
 *   .addAgent('code-helper', codeHelperAgent)
 *   .withLogger(customLogger)
 *   .onToolCallStart((agentName, toolName, input) => {
 *     console.log(`[${agentName}] Tool ${toolName} called with input:`, input);
 *   })
 *   .build();
 * ```
 *
 * @public
 */
export const IgniterAgentManager = {
  create: IgniterAgentManagerBuilder.create,
};

/**
 * Type alias for the IgniterAgent class.
 * @public
 */
export type IgniterAgentManager = typeof IgniterAgentManagerBuilder;
