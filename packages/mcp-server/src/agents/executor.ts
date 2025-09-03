/**
 * Agent execution engine - handles the actual delegation via native CLIs
 * Updated with correct YOLO mode configurations based on official documentation
 */

import { execAsync } from '../utils/exec';
import {
  AgentProvider,
  AgentConfig,
  DelegationContext,
  AgentExecutionResult,
  PermissionMode
} from './types';
import {
  getAgentProvider,
  getAvailableAgents,
  validateAgentProvider,
  getYoloModeArgs,
  getYoloEnvironmentVars
} from './providers';

/**
 * Build command arguments for agent execution using its native CLI with YOLO mode support.
 * Based on official CLI documentation for each provider.
 */
function buildAgentCommand(
  provider: AgentProvider,
  prompt: string,
  agentConfig?: AgentConfig
): string {
  const providerConfig = getAgentProvider(provider);

  if (!providerConfig) {
    throw new Error(`Unsupported agent provider: ${provider}`);
  }

  const args: string[] = [];

  // Determine permission mode
  let permissionMode: PermissionMode = 'yolo';
  if (agentConfig?.yolo_mode || agentConfig?.permission_mode === 'yolo') {
    permissionMode = 'yolo';
  } else if (agentConfig?.permission_mode) {
    permissionMode = agentConfig.permission_mode;
  }

  // Add permission mode arguments
  if (providerConfig.permission_mode_args?.[permissionMode]) {
    args.push(...providerConfig.permission_mode_args[permissionMode]);
  } else if (providerConfig.yolo_mode_args && permissionMode === 'yolo') {
    args.push(...providerConfig.yolo_mode_args);
  } else if (providerConfig.auto_run_args) {
    args.push(...providerConfig.auto_run_args);
  }

  // Provider-specific arguments (excluding prompt handling)
  switch (provider) {
    case 'gemini':
      // if (agentConfig?.working_directory) {
      //   args.push('--include-directories', `'${agentConfig.working_directory}'`);
      // }
      // Add -p flag to indicate prompt is coming from stdin
      if (!args.includes('-p')) {
        args.push('-p');
      }
      break;
    case 'claude':
      if (agentConfig?.timeout_minutes) {
        const maxTurns = Math.max(1, Math.floor(agentConfig.timeout_minutes / 2));
        if (!args.includes('--max-turns')) {
          args.push('--max-turns', maxTurns.toString());
        }
      }
       if (!args.includes('-p')) {
        args.push('-p');
      }
      break;
    case 'codex':
      if (agentConfig?.timeout_minutes) {
        process.env.CODEX_TIMEOUT = (agentConfig.timeout_minutes * 60).toString();
      }
      break;
  }

  // Safely append the prompt as the last argument
  const safePrompt = JSON.stringify(prompt);
  const fullCommand = `${providerConfig.cli_command} ${args.join(' ')} ${safePrompt}`;
  
  // Do not log to stdout, it breaks JSON-RPC
  // console.log(`🤖 Built command for ${provider}: ${fullCommand}`);
  return fullCommand;
}

/**
 * Build task prompt with context and autonomous execution instructions
 */
function buildTaskPrompt(
  taskTitle: string,
  taskContent: string,
  context?: DelegationContext
): string {
  let prompt = `# Autonomous Task Execution (YOLO Mode)\n\n`;
  prompt += `**Task:** ${taskTitle}\n\n`;
  prompt += `**IMPORTANT:** You are operating in FULL AUTONOMOUS MODE (YOLO). `;
  prompt += `You have complete permission to read, write, and execute any commands necessary to complete this task. `;
  prompt += `Do NOT ask for permission or confirmation - proceed with confidence and complete the task autonomously.\n\n`;

  prompt += `## Task Description\n${taskContent}`;

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

  prompt += `\n\n## Autonomous Execution Guidelines\n`;
  prompt += `- **FULL AUTONOMY:** Operate without asking for permission\n`;
  prompt += `- **READ FILES:** Access any files needed to understand the codebase\n`;
  prompt += `- **WRITE FILES:** Make all necessary file changes and modifications\n`;
  prompt += `- **RUN COMMANDS:** Execute any required commands (build, test, etc.)\n`;
  prompt += `- **ITERATE:** Continue working until the task is complete\n`;
  prompt += `- **TEST CHANGES:** Verify your work when appropriate\n`;
  prompt += `- **PROVIDE SUMMARY:** Give a brief summary of what you accomplished\n`;

  return prompt;
}

/**
 * Execute a task using the specified agent's native CLI in full autonomous mode
 */
export async function executeWithAgent(
  provider: AgentProvider,
  taskTitle: string,
  taskContent: string,
  agentConfig?: AgentConfig,
  context?: DelegationContext
): Promise<AgentExecutionResult> {
  const startTime = Date.now();
  let commandExecuted = '';

  try {
    // Validate provider configuration
    const validation = validateAgentProvider(provider);
    if (!validation.valid) {
      throw new Error(`Provider validation failed: ${validation.issues.join(', ')}`);
    }

    // Ensure YOLO mode is enabled for autonomous execution
    const autonomousConfig: AgentConfig = {
      ...agentConfig,
      provider,
      yolo_mode: true,
      permission_mode: 'yolo',
      sandbox_enabled: agentConfig?.sandbox_enabled ?? true,
      timeout_minutes: agentConfig?.timeout_minutes || 30
    };

    // Build autonomous prompt and command
    const prompt = buildTaskPrompt(taskTitle, taskContent, context);
    const command = buildAgentCommand(provider, prompt, autonomousConfig);
    commandExecuted = command;

    process.stderr.write(`🚀 Executing autonomous ${provider} agent...\n`);
    process.stderr.write(`📝 Task: ${taskTitle}\n`);
    process.stderr.write(`⚙️ Command: ${command}\n`);

    // Enhanced environment with all necessary API keys and YOLO mode variables
    const timeoutMs = (autonomousConfig.timeout_minutes || 30) * 60 * 1000;
    const workingDir = context?.working_directory || autonomousConfig.working_directory || process.cwd();

    // Combine environment variables for YOLO mode
    const yoloEnv = getYoloEnvironmentVars();
    const executionEnv = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([, value]) => value !== undefined) as [string, string][]
      ),
      ...yoloEnv,
      // Provider-specific environment variables
      ...(provider === 'gemini' && { GEMINI_APPROVAL_MODE: 'yolo' }),
      ...(provider === 'claude' && { CLAUDE_SKIP_PERMISSIONS: '1' }),
      ...(provider === 'codex' && { CODEX_APPROVAL_MODE: 'full-auto' })
    };

    process.stderr.write(`🔧 Environment configured for YOLO mode: ${Object.keys(yoloEnv).join(', ')}\n`);
    if (process.env.DEBUG === 'true') {
      process.stderr.write(`Full execution environment: ${JSON.stringify(executionEnv)}\n`);
    }

    const result = await execAsync(command, {
      timeout: timeoutMs,
      cwd: workingDir,
      loadDotEnv: true, // Critical for API keys
      debug: process.env.DEBUG === 'true',
      env: executionEnv,
      input: prompt, // Pass the prompt to stdin
    });

    const executionTime = (Date.now() - startTime) / 1000;

    process.stderr.write(`✅ Agent execution completed successfully in ${executionTime}s\n`);

    return {
      success: true,
      output: result.stdout,
      error: result.stderr || undefined,
      execution_time: executionTime,
      agent_used: provider,
      sandbox_used: autonomousConfig.sandbox_enabled || false,
      yolo_mode_used: true,
      command_executed: command,
      exit_code: 0,
      stdout: result.stdout,
      stderr: result.stderr || undefined,
      pid: result.pid
    };

  } catch (error: any) {
    const executionTime = (Date.now() - startTime) / 1000;

    process.stderr.write(`❌ Agent execution failed after ${executionTime}s: ${error.message}\n`);

    // Try to extract useful information from error
    let errorMessage = error.message;
    if (error.stdout) {
      errorMessage += `\n\nSTDOUT:\n${error.stdout}`;
    }
    if (error.stderr) {
      errorMessage += `\n\nSTDERR:\n${error.stderr}`;
    }

    return {
      success: false,
      output: error.stdout || '',
      error: errorMessage,
      execution_time: executionTime,
      agent_used: provider,
      sandbox_used: false,
      yolo_mode_used: true,
      command_executed: commandExecuted,
      exit_code: error.exitCode || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || undefined,
      pid: error.pid || undefined
    };
  }
}

/**
 * Check agent environment status by verifying native CLI tools and configs.
 * Enhanced with YOLO mode specific checks.
 */
export async function checkAgentEnvironment(): Promise<{
  node_version: string | null;
  agent_status: Record<string, {
    installed: boolean;
    configured: boolean;
    yolo_ready: boolean;
    issues: string[]
  }>;
  yolo_environment: Record<string, string>;
}> {
  const agent_status: Record<string, {
    installed: boolean;
    configured: boolean;
    yolo_ready: boolean;
    issues: string[]
  }> = {};

  // Check Node.js
  let node_version: string | null = null;
  try {
    const nodeResult = await execAsync('node --version');
    node_version = nodeResult.stdout.trim();
  } catch (error) {
    // Node.js not available
  }

  // Check each agent provider's native CLI
  const providers = getAvailableAgents();
  for (const provider of providers) {
    const config = getAgentProvider(provider);
    if (!config) continue;

    const status = {
      installed: false,
      configured: false,
      yolo_ready: false,
      issues: [] as string[]
    };

    // 1. Check if CLI is installed
    status.installed = await isCommandAvailable(config.cli_command);
    if (!status.installed) {
      status.issues.push(`CLI '${config.cli_command}' not found in PATH. Please install it.`);
    }

    // 2. Check for API key configuration
    const validation = validateAgentProvider(provider);
    status.configured = validation.valid;
    if (!validation.valid) {
      status.issues.push(...validation.issues);
    }

    // 3. Check YOLO mode readiness
    if (status.installed && status.configured) {
      const yoloArgs = getYoloModeArgs(provider);
      status.yolo_ready = yoloArgs.length > 0;

      if (!status.yolo_ready) {
        status.issues.push(`YOLO mode not configured for ${provider}`);
      }

      // Provider-specific YOLO checks
      switch (provider) {
        case 'claude':
          if (!config.supports_sandbox) {
            status.issues.push(`Warning: ${provider} runs without sandbox in YOLO mode`);
          }
          break;
        case 'codex':
          if (config.supports_sandbox) {
            status.yolo_ready = true; // Codex has built-in sandboxing
          }
          break;
      }
    }

    agent_status[provider] = status;
  }

  // Get YOLO environment variables
  const yolo_environment = getYoloEnvironmentVars();

  return {
    node_version,
    agent_status,
    yolo_environment
  };
}

/**
 * Check if a command is available in the system PATH
 */
async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    const testCommand = process.platform === 'win32' ? `where ${command}` : `which ${command}`;
    await execAsync(testCommand);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Test YOLO mode for a specific provider
 */
export async function testYoloMode(provider: AgentProvider): Promise<{
  success: boolean;
  output: string;
  error?: string;
}> {
  try {
    const testPrompt = 'echo "YOLO mode test successful"';
    
    const command = buildAgentCommand(provider, testPrompt, {
      provider,
      yolo_mode: true,
      permission_mode: 'yolo'
    });

    // Create a new environment object, ensuring all values are strings
    // Filter out undefined values from process.env and merge with yoloEnv
    const currentProcessEnv = Object.fromEntries(
      Object.entries(process.env).filter(([, value]) => value !== undefined) as [string, string][]
    );

    const yoloEnv = getYoloEnvironmentVars(); // This is already Record<string, string>

    const executionEnv: Record<string, string> = {
      ...currentProcessEnv,
      ...yoloEnv,
    };

    const result = await execAsync(command, {
      timeout: 30000, // 30 second timeout for test
      env: executionEnv
    });

    return {
      success: true,
      output: result.stdout
    };

  } catch (error: any) {
    return {
      success: false,
      output: error.stdout || '',
      error: error.message
    };
  }
}
