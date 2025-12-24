
/* =============================================================================
 * MANAGER TYPES
 * ============================================================================= */

import type { IgniterLogger } from "@igniter-js/core";
import type { IgniterAgentBuiltAgent } from "./builder";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import type { IgniterAgentHooks } from "./hooks";

/**
 * Status of an agent in the manager.
 *
 * @public
 */
export type IgniterAgentStatus =
  | "idle"
  | "starting"
  | "running"
  | "stopped"
  | "error";

/**
 * Information about a registered agent.
 *
 * @public
 */
export interface IgniterAgentInfo {
  /** The agent's unique name */
  name: string;

  /** Current status */
  status: IgniterAgentStatus;

  /** When the agent was registered */
  registeredAt: Date;

  /** When the agent was last started */
  startedAt?: Date;

  /** Error if agent failed */
  error?: Error;

  /** Number of registered toolsets */
  toolsetCount: number;
}

/**
 * Options for the agent manager.
 *
 * @public
 */
export interface IgniterAgentManagerOptions<
  TAgentRegistry extends Record<string, IgniterAgentBuiltAgent> = Record<string, IgniterAgentBuiltAgent>
> extends IgniterAgentHooks {
  /**
   * Pre-registered agents.
   * @defaultValue {}
   */
  agents: TAgentRegistry;

  /**
   * Whether to auto-start agents when registered.
   * @defaultValue false
   */
  autoStart?: boolean;

  /**
   * Whether to continue starting other agents if one fails.
   * @defaultValue true
   */
  continueOnError?: boolean;

  /**
   * Logger instance for logging.
   * @defaultValue undefined
   */
  logger?: IgniterLogger;

  /**
   * Optional telemetry manager for observability.
   */
  telemetry?: IgniterTelemetryManager;

}
