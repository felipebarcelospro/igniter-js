/**
 * Agent execution engine - handles the actual delegation via CLI
 */

import { execAsync, validateAgentEnvironment as validateEnvSetup } from '../utils/exec';
import { 
  AgentProvider, 
  AgentConfig, 
  SandboxConfig, 
  DelegationContext, 
  AgentExecutionResult 
} from './types';
import { getAgentProvider, validateAgentProvider } from './providers';

/**
 * Base CLI command builder - uses npx vibekit for all providers
 * This makes it easy to change the underlying CLI in one place
 */
const BASE_CLI = 'npx vibekit';

/**
 * Build command arguments for agent execution
 */
function buildAgentCommand(
  provider: AgentProvider,
  prompt: string,
  agentConfig?: AgentConfig,
  sandboxConfig?: SandboxConfig
): string {
  const args: string[] = [];
  const providerConfig = getAgentProvider(provider);
  
  if (!providerConfig) {
    throw new Error(`Unsupported agent provider: ${provider}`);
  }

  // Add provider name
  args.push(provider);

  // Add sandbox configuration
  if (sandboxConfig?.enabled && providerConfig.supports_sandbox) {
    args.push(`--sandbox ${sandboxConfig.type || 'docker'}`);
    
    if (!sandboxConfig.network_access) {
      args.push('--no-network');
    }
    
    if (sandboxConfig.fresh_environment) {
      args.push('--fresh-container');
    }
    
    if (sandboxConfig.proxy) {
      args.push(`--proxy ${sandboxConfig.proxy}`);
    }
  }

  // Add additional arguments
  if (agentConfig?.additional_args) {
    args.push(...agentConfig.additional_args);
  }

  // Add the prompt (properly escaped)
  args.push(`"${prompt.replace(/"/g, '\\"')}"`);

  return `${BASE_CLI} ${args.join(' ')}`;
}

/**
 * Build task prompt with context
 */
function buildTaskPrompt(
  taskTitle: string,
  taskContent: string,
  context?: DelegationContext
): string {
  let prompt = `# Task: ${taskTitle}\n\n${taskContent}`;
  
  if (context?.instructions) {
    prompt += `\n\n## Additional Instructions\n${context.instructions}`;
  }
  
  if (context?.constraints && context.constraints.length > 0) {
    prompt += `\n\n## Constraints\n${context.constraints.map(c => `- ${c}`).join('\n')}`;
  }
  
  if (context?.files && context.files.length > 0) {
    prompt += `\n\n## Relevant Files\n${context.files.map(f => `- ${f}`).join('\n')}`;
  }
  
  if (context?.working_directory) {
    prompt += `\n\n## Working Directory\n${context.working_directory}`;
  }
  
  return prompt;
}

/**
 * Execute a task using the specified agent
 */
export async function executeWithAgent(
  provider: AgentProvider,
  taskTitle: string,
  taskContent: string,
  agentConfig?: AgentConfig,
  sandboxConfig?: SandboxConfig,
  context?: DelegationContext
): Promise<AgentExecutionResult> {
  const startTime = Date.now();
  
  try {
    // Validate provider
    const validation = validateAgentProvider(provider);
    if (!validation.valid) {
      throw new Error(`Agent provider validation failed: ${validation.issues.join(', ')}`);
    }

    // Build prompt
    const prompt = buildTaskPrompt(taskTitle, taskContent, context);
    
    // Build command
    const command = buildAgentCommand(provider, prompt, agentConfig, sandboxConfig);
    
    // Execute with enhanced environment handling
    const timeoutMs = (agentConfig?.timeout_minutes || 30) * 60 * 1000;
    const result = await execAsync(command, { 
      timeout: timeoutMs,
      cwd: context?.working_directory,
      loadDotEnv: true,
      debug: process.env.VIBEKIT_DEBUG === 'true' || process.env.DEBUG === 'true'
    });
    
    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      success: true,
      output: result.stdout,
      error: result.stderr || undefined,
      execution_time: executionTime,
      agent_used: provider,
      sandbox_used: sandboxConfig?.enabled || false
    };

  } catch (error: any) {
    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      success: false,
      output: '',
      error: error.message,
      execution_time: executionTime,
      agent_used: provider,
      sandbox_used: sandboxConfig?.enabled || false
    };
  }
}

/**
 * Check agent environment status
 */
export async function checkAgentEnvironment(): Promise<{
  cli_available: boolean;
  node_version: string | null;
  docker_available: boolean;
  docker_running: boolean;
  agent_status: Record<AgentProvider, { configured: boolean; issues: string[] }>;
  env_validation: {
    valid: boolean;
    issues: string[];
    env_status: Record<string, boolean>;
  };
}> {
  const result = {
    cli_available: false,
    node_version: null as string | null,
    docker_available: false,
    docker_running: false,
    agent_status: {} as Record<AgentProvider, { configured: boolean; issues: string[] }>
  };

  // Check Node.js
  try {
    const nodeResult = await execAsync('node --version');
    result.node_version = nodeResult.stdout.trim();
  } catch (error) {
    // Node.js not available
  }

  // Check CLI availability
  try {
    await execAsync(`${BASE_CLI} --version`, { 
      timeout: 10000,
      loadDotEnv: true,
      debug: process.env.VIBEKIT_DEBUG === 'true'
    });
    result.cli_available = true;
  } catch (error) {
    // CLI not available
  }

  // Check Docker
  try {
    await execAsync('docker --version');
    result.docker_available = true;
    
    try {
      await execAsync('docker ps');
      result.docker_running = true;
    } catch (error) {
      // Docker not running
    }
  } catch (error) {
    // Docker not available
  }

  // Check each agent provider
  const providers = Object.keys(getAgentProvider('claude') ? { claude: true } : {}) as AgentProvider[];
  for (const provider of ['claude', 'gemini', 'gpt'] as AgentProvider[]) {
    const validation = validateAgentProvider(provider);
    result.agent_status[provider] = {
      configured: validation.valid,
      issues: validation.issues
    };
  }

  // Enhanced environment validation
  const envValidation = await validateEnvSetup();
  
  return {
    ...result,
    env_validation: envValidation
  };
}
