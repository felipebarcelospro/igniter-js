/**
 * @fileoverview Hook types for IgniterAgent lifecycle and execution events.
 * @module types/hooks
 */

/**
 * Hooks emitted by IgniterAgent runtime.
 *
 * @public
 */
export interface IgniterAgentHooks {
  /**
   * Fired when an agent starts successfully.
   */
  onAgentStart?: (name: string) => void;

  /**
   * Fired when an agent fails to start or errors.
   */
  onAgentError?: (name: string, error: Error) => void;

  /**
   * Fired when a tool call begins.
   */
  onToolCallStart?: (agentName: string, toolName: string, input: unknown) => void;

  /**
   * Fired when a tool call completes successfully.
   */
  onToolCallComplete?: (
    agentName: string,
    toolName: string,
    output: unknown,
  ) => void;

  /**
   * Fired when a tool call fails.
   */
  onToolCallError?: (
    agentName: string,
    toolName: string,
    error: Error,
  ) => void;

  /**
   * Fired before connecting to an MCP server.
   */
  onMCPStart?: (agentName: string, mcpName: string) => void;

  /**
   * Fired when an MCP connection fails.
   */
  onMCPError?: (agentName: string, mcpName: string, error: Error) => void;
}
