/**
 * Types for extensible agent delegation system
 * Updated with enhanced YOLO mode support and provider configurations
 */

export type AgentProvider = 'gemini' | 'claude' | 'codex';

export type PermissionMode = 'default' | 'suggest' | 'auto_edit' | 'yolo';

export interface AgentConfig {
  provider: AgentProvider;
  timeout_minutes?: number;
  max_tokens?: number;
  temperature?: number;
  additional_args?: string[];
  permission_mode?: PermissionMode;
  yolo_mode?: boolean;
  auto_approve_tools?: string[];
  sandbox_enabled?: boolean;
  working_directory?: string;
  max_turns?: number;
  model?: string;
  logFilePath?: string; // Path to stream output to (for real-time logging)
}

export interface SandboxConfig {
  enabled: boolean;
  type: 'none' | 'docker' | 'builtin';
  network_access: boolean;
  fresh_environment: boolean;
  proxy?: string;
  resource_limits?: {
    memory_mb?: number;
    cpu_cores?: number;
    disk_mb?: number;
  };
}

export interface DelegationContext {
  files?: string[];
  instructions?: string;
  constraints?: string[];
  working_directory?: string;
  environment_vars?: Record<string, string>;
  pre_execution_commands?: string[];
  post_execution_commands?: string[];
}

export interface AgentExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  execution_time?: number;
  agent_used: AgentProvider;
  sandbox_used: boolean;
  yolo_mode_used: boolean;
  command_executed?: string;
  exit_code?: number;
  stdout?: string;
  stderr?: string;
  pid?: number; // Process ID of the executed agent
}

export interface AgentProviderDefinition {
  name: AgentProvider;
  cli_command: string;
  health_check_command: string;
  auto_run_args?: string[];
  yolo_mode_args?: string[];
  permission_mode_args?: Record<PermissionMode, string[]>;
  requires_api_key?: string; // Environment variable name
  supports_sandbox?: boolean;
  supports_non_interactive?: boolean;
  supports_multimodal?: boolean;
  default_model?: string;
  max_timeout_minutes?: number;
  setup_instructions?: string[];
}

export interface AgentHealthCheck {
  provider: AgentProvider;
  installed: boolean;
  configured: boolean;
  yolo_ready: boolean;
  api_key_available: boolean;
  cli_version?: string;
  issues: string[];
  warnings: string[];
}

export interface YoloModeConfig {
  enabled: boolean;
  auto_approve_all: boolean;
  skip_confirmations: boolean;
  sandbox_required?: boolean;
  max_file_changes?: number;
  max_command_executions?: number;
  allowed_commands?: string[];
  forbidden_commands?: string[];
  environment_vars: Record<string, string>;
}

export interface DelegationStatus {
  task_id: string;
  agent_type: AgentProvider;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: string;
  started_at?: string;
  completed_at?: string;
  execution_time?: number;
  yolo_mode: boolean;
  sandbox_used: boolean;
  output_summary?: string;
  error_summary?: string;
  commands_executed?: number;
  files_modified?: number;
}

export interface AgentCapabilities {
  provider: AgentProvider;
  can_read_files: boolean;
  can_write_files: boolean;
  can_execute_commands: boolean;
  can_access_network: boolean;
  supports_yolo_mode: boolean;
  supports_sandbox: boolean;
  supports_multimodal: boolean;
  max_context_length?: number;
  supported_languages: string[];
}

export interface TaskDelegationRequest {
  task_id: string;
  task_title: string;
  task_content: string;
  agent_type: AgentProvider;
  yolo_mode: boolean;
  timeout_minutes?: number;
  context?: DelegationContext;
  sandbox_config?: SandboxConfig;
  success_criteria?: string[];
  failure_conditions?: string[];
}

export interface AgentEnvironmentStatus {
  node_version: string | null;
  docker_available: boolean;
  agent_status: Record<AgentProvider, AgentHealthCheck>;
  yolo_environment: Record<string, string>;
  system_ready: boolean;
  setup_required: string[];
}

export interface DelegationMetrics {
  total_delegations: number;
  successful_delegations: number;
  failed_delegations: number;
  average_execution_time: number;
  yolo_mode_usage: number;
  sandbox_usage: number;
  by_agent_type: Record<AgentProvider, {
    count: number;
    success_rate: number;
    avg_time: number;
  }>;
  common_errors: Array<{
    error: string;
    count: number;
    provider?: AgentProvider;
  }>;
}

export interface AgentConfigurationProfile {
  name: string;
  description: string;
  provider: AgentProvider;
  config: AgentConfig;
  context: DelegationContext;
  use_cases: string[];
  created_at: string;
  updated_at: string;
}

// Error types for better error handling
export class AgentExecutionError extends Error {
  constructor(
    message: string,
    public provider: AgentProvider,
    public exitCode?: number,
    public stdout?: string,
    public stderr?: string,
    public command?: string
  ) {
    super(message);
    this.name = 'AgentExecutionError';
  }
}

export class AgentConfigurationError extends Error {
  constructor(
    message: string,
    public provider: AgentProvider,
    public configField?: string
  ) {
    super(message);
    this.name = 'AgentConfigurationError';
  }
}

export class YoloModeError extends Error {
  constructor(
    message: string,
    public provider: AgentProvider,
    public reason: 'not_supported' | 'not_configured' | 'security_violation' | 'sandbox_required'
  ) {
    super(message);
    this.name = 'YoloModeError';
  }
}

// Type guards for runtime type checking
export function isAgentProvider(value: string): value is AgentProvider {
  return ['gemini', 'claude', 'codex'].includes(value);
}

export function isPermissionMode(value: string): value is PermissionMode {
  return ['default', 'suggest', 'auto_edit', 'yolo'].includes(value);
}

export function isValidDelegationStatus(value: string): value is DelegationStatus['status'] {
  return ['queued', 'running', 'completed', 'failed', 'cancelled'].includes(value);
}

// Utility types for specific use cases
export type YoloCapableProvider = Extract<AgentProvider, 'gemini' | 'claude' | 'codex'>;
export type SandboxCapableProvider = Extract<AgentProvider, 'gemini' | 'codex'>;
export type MultimodalCapableProvider = Extract<AgentProvider, 'gemini' | 'claude' | 'codex'>;

// Configuration presets for common scenarios
export const YOLO_MODE_PRESETS: Record<string, Partial<AgentConfig>> = {
  conservative: {
    yolo_mode: true,
    permission_mode: 'yolo',
    sandbox_enabled: true,
    timeout_minutes: 15,
    max_turns: 10
  },
  balanced: {
    yolo_mode: true,
    permission_mode: 'yolo',
    sandbox_enabled: true,
    timeout_minutes: 30,
    max_turns: 20
  },
  aggressive: {
    yolo_mode: true,
    permission_mode: 'yolo',
    sandbox_enabled: false, // Use with caution
    timeout_minutes: 60,
    max_turns: 50
  }
};
