/**
 * Agent provider configurations - based on official CLI documentation
 * Updated with correct YOLO/autonomous mode configurations
 */

import { AgentProviderDefinition, AgentProvider } from './types';

/**
 * Registry of available agent providers
 * Defines the configuration for each native CLI tool with verified YOLO mode support.
 */
export const AGENT_PROVIDERS: Record<AgentProvider, AgentProviderDefinition> = {
  gemini: {
    name: 'gemini',
    cli_command: 'gemini',
    health_check_command: 'gemini --version',
    auto_run_args: ['-p'], // Non-interactive prompt mode
    yolo_mode_args: ['--yolo'], // Full autonomous mode
    permission_mode_args: {
      default: ['-p'],
      suggest: ['-p'], // Default suggest mode with prompts
      auto_edit: ['-p', '--approval-mode', 'auto_edit'], // Auto edit files, prompt for commands
      yolo: ['--yolo'] // Full autonomous mode
    },
    requires_api_key: 'GEMINI_API_KEY',
    supports_sandbox: true,
    supports_non_interactive: true
  },
  claude: {
    name: 'claude',
    cli_command: 'claude',
    health_check_command: 'claude --version',
    auto_run_args: ['-p'], // Print/non-interactive mode
    yolo_mode_args: ['--dangerously-skip-permissions', '-p', '--max-turns', '20'],
    permission_mode_args: {
      default: ['-p'],
      suggest: ['-p'], // Print mode with manual approval
      auto_edit: ['-p', '--permission-mode', 'plan'], // Plan mode with auto edits
      yolo: ['-p', '--dangerously-skip-permissions', '--max-turns', '20'] // Full autonomous
    },
    requires_api_key: 'ANTHROPIC_API_KEY',
    supports_sandbox: false, // Claude Code doesn't have built-in sandboxing
    supports_non_interactive: true
  },
  codex: {
    name: 'codex',
    cli_command: 'codex',
    health_check_command: 'codex --version',
    auto_run_args: ['exec'], // Non-interactive execution mode
    yolo_mode_args: ['exec', '--approval-mode', 'full-auto'], // Full autonomous mode
    permission_mode_args: {
      default: ['exec', '--approval-mode', 'suggest'], // Suggest mode
      suggest: ['exec', '--approval-mode', 'suggest'], // Suggest with user approval
      auto_edit: ['exec', '--approval-mode', 'auto'], // Auto mode (default)
      yolo: ['exec', '--approval-mode', 'full-auto'] // Full autonomous mode
    },
    requires_api_key: 'OPENAI_API_KEY',
    supports_sandbox: true, // Codex has built-in sandboxing in full-auto mode
    supports_non_interactive: true
  }
};

/**
 * Get list of available agent providers
 */
export function getAvailableAgents(): AgentProvider[] {
  return Object.keys(AGENT_PROVIDERS) as AgentProvider[];
}

/**
 * Get provider configuration by name
 */
export function getAgentProvider(provider: AgentProvider): AgentProviderDefinition | null {
  return AGENT_PROVIDERS[provider] || null;
}

/**
 * Check if a provider supports sandbox
 */
export function providerSupportsSandbox(provider: AgentProvider): boolean {
  const config = getAgentProvider(provider);
  return config?.supports_sandbox || false;
}

/**
 * Get the correct YOLO mode arguments for a provider
 */
export function getYoloModeArgs(provider: AgentProvider): string[] {
  const config = getAgentProvider(provider);
  if (!config) return [];

  return config.yolo_mode_args || config.auto_run_args || [];
}

/**
 * Get environment variables needed for YOLO mode
 */
export function getYoloEnvironmentVars(): Record<string, string> {
  return {
    // Universal autonomous mode indicators
    YOLO_MODE: '1',
    AUTO_APPROVE: '1',
    NON_INTERACTIVE: '1',

    // Gemini CLI specific
    GEMINI_APPROVAL_MODE: 'yolo',

    // Claude Code specific
    CLAUDE_SKIP_PERMISSIONS: '1',

    // Codex specific
    CODEX_APPROVAL_MODE: 'full-auto',

    // General debugging (optional)
    DEBUG: process.env.DEBUG || '0'
  };
}

/**
 * Validate if an agent provider is properly configured for YOLO mode.
 */
export function validateAgentProvider(provider: AgentProvider): { valid: boolean; issues: string[] } {
  const config = getAgentProvider(provider);
  const issues: string[] = [];

  if (!config) {
    return { valid: false, issues: [`Unknown agent provider: ${provider}`] };
  }

  // Check if API key environment variable exists
  if (config.requires_api_key && !process.env[config.requires_api_key]) {
    issues.push(`Environment variable ${config.requires_api_key} is not set. The CLI may not function correctly.`);
  }

  // Check if YOLO mode is properly configured
  if (!config.yolo_mode_args || config.yolo_mode_args.length === 0) {
    issues.push(`YOLO mode arguments not configured for ${provider}`);
  }

  // Warnings for specific providers
  switch (provider) {
    case 'claude':
      if (!config.supports_sandbox) {
        issues.push(`Warning: ${provider} does not support built-in sandboxing. Use with caution in YOLO mode.`);
      }
      break;
    case 'codex':
      // Codex requires specific setup for full autonomy
      if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_CHATGPT_TOKEN) {
        issues.push(`Codex requires either OPENAI_API_KEY or ChatGPT authentication. See https://developers.openai.com/codex/cli/ for setup.`);
      }
      break;
  }

  return {
    valid: issues.length === 0 || issues.every(issue => issue.startsWith('Warning:')),
    issues
  };
}

/**
 * Get provider-specific setup instructions for YOLO mode
 */
export function getSetupInstructions(provider: AgentProvider): string[] {
  const instructions: string[] = [];
  const config = getAgentProvider(provider);

  if (!config) return ['Provider not found'];

  switch (provider) {
    case 'gemini':
      instructions.push(
        'Install Gemini CLI: npm install -g @google/gemini-cli',
        'Set API key: export GEMINI_API_KEY="your-key-here"',
        'Test YOLO mode: gemini --yolo -p "Hello world"',
        'Documentation: https://google-gemini.github.io/gemini-cli/docs/cli/configuration.html'
      );
      break;

    case 'claude':
      instructions.push(
        'Install Claude Code: Follow instructions at https://claude.ai/download',
        'Set API key: export ANTHROPIC_API_KEY="your-key-here"',
        'Test YOLO mode: claude -p "Hello world" --dangerously-skip-permissions',
        'Documentation: https://docs.anthropic.com/en/docs/claude-code/cli-reference'
      );
      break;

    case 'codex':
      instructions.push(
        'Install Codex CLI: npm install -g @openai/codex',
        'Authentication: Sign into ChatGPT account OR set OPENAI_API_KEY',
        'Test YOLO mode: codex exec "Hello world" --approval-mode full-auto',
        'Documentation: https://developers.openai.com/codex/cli/'
      );
      break;
  }

  return instructions;
}
