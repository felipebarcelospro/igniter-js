/**
 * Agent provider configurations - easily extensible for new providers
 */

import { AgentProviderDefinition, AgentProvider } from './types';

/**
 * Registry of available agent providers
 * Add new providers here to automatically support them across all tools
 */
export const AGENT_PROVIDERS: Record<AgentProvider, AgentProviderDefinition> = {
  claude: {
    name: 'claude',
    cli_command: 'claude',
    requires_api_key: 'ANTHROPIC_API_KEY',
    supports_sandbox: true
  },
  
  gemini: {
    name: 'gemini',
    cli_command: 'gemini',
    requires_api_key: 'GOOGLE_API_KEY',
    supports_sandbox: true
  },

  gpt: {
    name: 'gpt',
    cli_command: 'gpt',
    requires_api_key: 'OPENAI_API_KEY',
    supports_sandbox: true
  },

  custom: {
    name: 'custom',
    cli_command: 'custom',
    requires_api_key: 'CUSTOM_API_KEY',
    supports_sandbox: false
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
 * Validate if an agent provider is properly configured
 */
export function validateAgentProvider(provider: AgentProvider): { valid: boolean; issues: string[] } {
  const config = getAgentProvider(provider);
  const issues: string[] = [];
  
  if (!config) {
    return { valid: false, issues: [`Unknown agent provider: ${provider}`] };
  }
  
  // Check API key if required
  if (config.requires_api_key && !process.env[config.requires_api_key]) {
    issues.push(`Missing required environment variable: ${config.requires_api_key}`);
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}
