/**
 * Types for extensible agent delegation system
 */

export type AgentProvider = 'claude' | 'gemini' | 'gpt' | 'custom';

export interface AgentConfig {
  provider: AgentProvider;
  timeout_minutes?: number;
  max_tokens?: number;
  temperature?: number;
  additional_args?: string[];
}

export interface SandboxConfig {
  enabled: boolean;
  type: 'none' | 'docker';
  network_access: boolean;
  fresh_environment: boolean;
  proxy?: string;
}

export interface DelegationContext {
  files?: string[];
  instructions?: string;
  constraints?: string[];
  working_directory?: string;
}

export interface AgentExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  execution_time?: number;
  agent_used: AgentProvider;
  sandbox_used: boolean;
}

export interface AgentProviderDefinition {
  name: AgentProvider;
  cli_command: string;
  requires_api_key?: string; // Environment variable name
  supports_sandbox?: boolean;
}
