/**
 * Agent Delegation Tools - Task delegation to specialized coding agents
 */

import { z } from "zod";
import { executeWithAgent, checkAgentEnvironment } from "../agents/executor";
import { getAvailableAgents, getAgentProvider } from "../agents/providers";
import { AgentProvider } from "../agents/types";
import { generateEnvSetupCommands } from "../utils/exec";
import { ToolsetContext } from "./types";
export function registerAgentDelegationTools({ server, memoryManager, execAsync }: ToolsetContext) {
  // --- Agent Delegation Tools ---
  server.registerTool("delegate_to_agent", {
    title: "Delegate Task to Specialized Agent (Background Execution)",
    description: "Delegates a development task to a specialized coding agent using secure background execution. Use when: task complexity requires focused agent attention, parallel execution is needed, specialized expertise is required (code review, research, implementation), or when Lia needs to focus on strategic work. Supports multiple agent types, sandbox isolation, background execution, and comprehensive progress monitoring. Tasks run in background - use check_delegation_status to monitor progress. Each agent uses its default model (no model selection available).",
    inputSchema: {
      task_id: z.string().describe("ID of task to delegate"),
      agent_type: z.enum(getAvailableAgents() as [string, ...string[]]).describe("Type of agent to use for delegation"),
      execution_mode: z.enum(['background', 'sync']).default('background').describe("Execution mode: background (non-blocking) or sync (wait for completion)"),
      execution_config: z.object({
        sandbox_enabled: z.boolean().default(true).describe("Run in isolated sandbox environment"),
        network_access: z.boolean().default(false).describe("Allow network access during execution"),
        fresh_environment: z.boolean().default(false).describe("Use clean environment instead of persistent one"),
        timeout_minutes: z.number().default(30).describe("Maximum execution time in minutes"),
        proxy: z.string().optional().describe("HTTP proxy URL if needed")
      }).optional(),
      context: z.object({
        files: z.array(z.string()).optional().describe("Specific files to include in context"),
        instructions: z.string().optional().describe("Additional instructions for the agent"),
        constraints: z.array(z.string()).optional().describe("Specific constraints or requirements"),
        working_directory: z.string().optional().describe("Working directory for execution")
      }).optional()
    },
  }, async ({ task_id, agent_type, execution_mode, execution_config, context }: {
    task_id: string;
    agent_type: string;
    execution_mode?: 'background' | 'sync';
    execution_config?: any;
    context?: any;
  }) => {
    try {
      await memoryManager.initializeProject();
      
      // Get task details  
      const task = await memoryManager.getById('task', task_id);
      if (!task) {
        return { content: [{ type: "text", text: `Task with ID ${task_id} not found` }] };
      }
      
      // Validate agent configuration
      const agentProvider = getAgentProvider(agent_type as AgentProvider);
      if (!agentProvider) {
        return { content: [{ type: "text", text: `Unsupported agent type: ${agent_type}` }] };
      }
      
      // Prepare configurations
      const agentConfig = {
        provider: agent_type as AgentProvider,
        timeout_minutes: execution_config?.timeout_minutes || 30
      };
      
      const sandboxConfig = {
        enabled: execution_config?.sandbox_enabled ?? true,
        type: 'docker' as const,
        network_access: execution_config?.network_access ?? false,
        fresh_environment: execution_config?.fresh_environment ?? false,
        proxy: execution_config?.proxy
      };
      
      if (execution_mode === 'background') {
        // Start background delegation
        const result = await (memoryManager as any).startBackgroundDelegation(task_id, agent_type, {
          ...execution_config,
          ...agentConfig,
          ...sandboxConfig
        });
        
        if (result.success) {
          return {
            content: [{
              type: "text",
              text: `🚀 **Task delegated to ${agent_type} agent in background!**\n\n**Task ID:** ${task_id}\n**Job ID:** ${result.job_id}\n**Status:** Queued\n\n**Next steps:**\n• Use \`check_delegation_status\` to monitor progress\n• Use \`list_active_delegations\` to see all running jobs\n• Task will update automatically as it progresses\n\n**Configuration:**\n• Agent: ${agent_type}\n• Sandbox: ${sandboxConfig.enabled ? 'enabled' : 'disabled'}\n• Timeout: ${agentConfig.timeout_minutes} minutes`
            }]
          };
        } else {
          return { content: [{ type: "text", text: `❌ **Delegation failed:** ${result.message}` }] };
        }
      } else {
        // Synchronous execution (legacy mode)
        // Update task status to delegated
        await memoryManager.update('task', task_id, {
          frontmatter: {
            status: 'in_progress',
            assignee: 'agent',
            delegated_to: agent_type,
            delegated_at: new Date().toISOString(),
                      delegation_config: {
            agent_type,
            sandbox: sandboxConfig.enabled
          }
          }
        });
        
        // Execute delegation synchronously
        const result = await executeWithAgent(
          agent_type as AgentProvider,
          task.title,
          task.content,
          agentConfig,
          sandboxConfig,
          context
        );
        
        // Update task with results
        const newStatus = result.success ? 'done' : 'blocked';
        await memoryManager.update('task', task_id, {
          frontmatter: {
            status: newStatus,
            completed_at: result.success ? new Date().toISOString() : undefined
          }
        });
        
        // Add execution results to task content
        const resultContent = `\n\n## Agent Execution Results\n\n**Agent:** ${agent_type}\n**Sandbox:** ${sandboxConfig.enabled ? 'enabled' : 'disabled'}\n**Execution time:** ${result.execution_time}s\n**Success:** ${result.success}\n\n### Output:\n${result.output}\n\n### Error:\n${result.error || 'None'}`;
        
        await memoryManager.update('task', task_id, {
          content: task.content + resultContent
        });
        
        return {
          content: [{
            type: "text",
            text: `✅ **Task delegation completed!**\n\n**Agent:** ${agent_type}\n**Sandbox:** ${sandboxConfig.enabled ? 'enabled' : 'disabled'}\n**Execution time:** ${result.execution_time}s\n**Success:** ${result.success}\n\n**Output:**\n${result.output}\n\n**Error:**\n${result.error || 'None'}`
          }]
        };
      }
    } catch (error: any) {
      return { content: [{ type: "text", text: `❌ **Error delegating task:** ${error.message}` }] };
    }
  });

  // --- Background Job Monitoring Tools ---
  
  server.registerTool("check_delegation_status", {
    title: "Check Delegation Status",
    description: "Check the current status of a delegated task, including progress, output, and execution details. Use when: monitoring background delegation progress, debugging execution issues, or getting real-time updates on agent work. Provides comprehensive status information for any delegated task.",
    inputSchema: {
      task_id: z.string().describe("ID of the task to check delegation status")
    },
  }, async ({ task_id }: { task_id: string }) => {
    try {
      await memoryManager.initializeProject();
      
      const status = await (memoryManager as any).getDelegationStatus(task_id);
      
      if (status.status === 'not_found') {
        return { content: [{ type: "text", text: `❌ **Task not found:** No task with ID ${task_id} exists` }] };
      }
      
      if (status.status === 'not_delegated') {
        return { content: [{ type: "text", text: `ℹ️ **Task not delegated:** Task ${task_id} has not been delegated to any agent` }] };
      }
      
      const statusIconMap = {
        'queued': '⏳',
        'running': '🔄',
        'completed': '✅',
        'failed': '❌',
        'cancelled': '⏹️'
      } as const;
      const statusIcon = statusIconMap[status.status as keyof typeof statusIconMap] || '❓';
      
      let response = `${statusIcon} **Delegation Status for Task ${task_id}**\n\n`;
      response += `**Status:** ${status.status}\n`;
      response += `**Agent:** ${status.agent_type || 'Unknown'}\n`;
      
      if (status.started_at) {
        response += `**Started:** ${new Date(status.started_at).toLocaleString()}\n`;
      }
      
      if (status.completed_at) {
        response += `**Completed:** ${new Date(status.completed_at).toLocaleString()}\n`;
      }
      
      if (status.progress) {
        response += `**Progress:** ${status.progress}\n`;
      }
      
      if (status.error) {
        response += `**Error:** ${status.error}\n`;
      }
      
      if (status.output) {
        response += `\n**Output:**\n\`\`\`\n${status.output}\n\`\`\``;
      }
      
      return { content: [{ type: "text", text: response }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `❌ **Error checking status:** ${error.message}` }] };
    }
  });

  server.registerTool("list_active_delegations", {
    title: "List Active Delegations",
    description: "List all currently active delegations (queued, running, or recently completed). Use when: getting an overview of all agent work, monitoring workload distribution, or identifying tasks that need attention. Provides comprehensive status of all active delegations.",
    inputSchema: {
      include_recent: z.boolean().default(true).describe("Include recently completed delegations (last 24 hours)"),
      max_results: z.number().min(1).max(100).default(20).describe("Maximum number of results to return")
    },
  }, async ({ include_recent, max_results }: { include_recent: boolean; max_results: number }) => {
    try {
      await memoryManager.initializeProject();
      
      const activeDelegations = await (memoryManager as any).listActiveDelegations();
      
      let allDelegations = [...activeDelegations];
      
      // Include recent completed delegations if requested
      if (include_recent) {
        const allTasks = await memoryManager.listByType('task');
        const recentCompleted = allTasks.filter((task: any) => 
          task.frontmatter.delegation_status === 'completed' &&
          task.frontmatter.delegation_completed_at &&
          (Date.now() - new Date(task.frontmatter.delegation_completed_at).getTime()) < 24 * 60 * 60 * 1000
        );
        allDelegations.push(...recentCompleted);
      }
      
      // Sort by status priority and time
      allDelegations.sort((a: any, b: any) => {
        const statusPriority = { 'running': 1, 'queued': 2, 'completed': 3, 'failed': 4, 'cancelled': 5 };
        const aPriority = statusPriority[a.frontmatter.delegation_status as keyof typeof statusPriority] || 6;
        const bPriority = statusPriority[b.frontmatter.delegation_status as keyof typeof statusPriority] || 6;
        
        if (aPriority !== bPriority) return aPriority - bPriority;
        
        // Same priority, sort by time (newest first)
        const aTime = new Date(a.frontmatter.delegation_started_at || 0).getTime();
        const bTime = new Date(b.frontmatter.delegation_started_at || 0).getTime();
        return bTime - aTime;
      });
      
      // Limit results
      allDelegations = allDelegations.slice(0, max_results);
      
      if (allDelegations.length === 0) {
        return { content: [{ type: "text", text: `ℹ️ **No active delegations found**\n\nNo tasks are currently delegated or recently completed.` }] };
      }
      
      let response = `📊 **Active Delegations Overview**\n\n`;
      response += `**Total delegations:** ${allDelegations.length}\n\n`;
      
      for (const task of allDelegations) {
        const statusIconMap = {
          'queued': '⏳',
          'running': '🔄',
          'completed': '✅',
          'failed': '❌',
          'cancelled': '⏹️'
        } as const;
        const statusIcon = statusIconMap[task.frontmatter.delegation_status as keyof typeof statusIconMap] || '❓';
        
        response += `${statusIcon} **${task.title}**\n`;
        response += `   • **ID:** ${task.id}\n`;
        response += `   • **Status:** ${task.frontmatter.delegation_status}\n`;
        response += `   • **Agent:** ${task.frontmatter.delegated_to || 'Unknown'}\n`;
        
        if (task.frontmatter.delegation_started_at) {
          response += `   • **Started:** ${new Date(task.frontmatter.delegation_started_at).toLocaleString()}\n`;
        }
        
        if (task.frontmatter.delegation_progress) {
          response += `   • **Progress:** ${task.frontmatter.delegation_progress}\n`;
        }
        
        response += '\n';
      }
      
      return { content: [{ type: "text", text: response }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `❌ **Error listing delegations:** ${error.message}` }] };
    }
  });

  server.registerTool("cancel_delegation", {
    title: "Cancel Delegation",
    description: "Cancel a running or queued delegation. Use when: stopping unnecessary agent work, freeing up resources, or correcting delegation mistakes. Only works on tasks that are currently queued or running.",
    inputSchema: {
      task_id: z.string().describe("ID of the task to cancel delegation")
    },
  }, async ({ task_id }: { task_id: string }) => {
    try {
      await memoryManager.initializeProject();
      
      const result = await (memoryManager as any).cancelDelegation(task_id);
      
      if (result.success) {
        return { content: [{ type: "text", text: `✅ **Delegation cancelled successfully!**\n\nTask ${task_id} has been cancelled and returned to 'todo' status.` }] };
      } else {
        return { content: [{ type: "text", text: `❌ **Cancellation failed:** ${result.message}` }] };
      }
    } catch (error: any) {
      return { content: [{ type: "text", text: `❌ **Error cancelling delegation:** ${error.message}` }] };
    }
  });

  server.registerTool("monitor_agent_tasks", {
    title: "Monitor Agent Task Progress",
    description: "Monitors progress and output of tasks delegated to agents with real-time logs and execution analytics. Use when: checking status of delegated work, collecting results from agent execution, debugging delegation issues, generating progress reports, or analyzing agent performance patterns. Provides comprehensive monitoring across all agent types.",
    inputSchema: {
      agent_type: z.enum(['all', ...getAvailableAgents()] as [string, ...string[]]).default('all').describe("Which agent type to monitor"),
      include_logs: z.boolean().default(true).describe("Include detailed execution logs"),
      include_analytics: z.boolean().default(false).describe("Include performance analytics"),
      log_lines: z.number().default(50).describe("Number of recent log lines to show"),
      task_filter: z.string().optional().describe("Filter by specific task ID or feature")
    },
  }, async ({ agent_type, include_logs, include_analytics, log_lines, task_filter }: {
    agent_type?: string;
    include_logs?: boolean;
    include_analytics?: boolean;
    log_lines?: number;
    task_filter?: string;
  }) => {
    try {
      const results: string[] = [];
      
      // Get delegated tasks from memory
      await memoryManager.initializeProject();
      const allTasks = await memoryManager.listByType('insight');
      let delegatedTasks = allTasks.filter((task: any) => 
        task.frontmatter.assignee === 'agent' && task.frontmatter.delegated_to
      );
      
      // Apply filters
      if (agent_type && agent_type !== 'all') {
        delegatedTasks = delegatedTasks.filter((task: any) => task.frontmatter.delegated_to === agent_type);
      }
      
      if (task_filter) {
        delegatedTasks = delegatedTasks.filter((task: any) => 
          task.id.includes(task_filter) || 
          task.frontmatter.feature_id === task_filter ||
          task.title.toLowerCase().includes(task_filter.toLowerCase())
        );
      }
      
      // Task summary
      const summary = {
        total: delegatedTasks.length,
        by_status: delegatedTasks.reduce((acc: Record<string, number>, task: any) => {
          const status = task.frontmatter.status || 'unknown';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        by_agent: delegatedTasks.reduce((acc: Record<string, number>, task: any) => {
          const agent = task.frontmatter.delegated_to || 'unknown';
          acc[agent] = (acc[agent] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
      
      results.push(`# Agent Task Monitoring Report\n`);
      results.push(`**Total Delegated Tasks:** ${summary.total}`);
      results.push(`**By Status:** ${Object.entries(summary.by_status).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
      results.push(`**By Agent:** ${Object.entries(summary.by_agent).map(([k, v]) => `${k}: ${v}`).join(', ')}\n`);
      
      // Recent tasks
      const recentTasks = delegatedTasks
        .sort((a: any, b: any) => new Date(b.frontmatter.delegated_at || 0).getTime() - new Date(a.frontmatter.delegated_at || 0).getTime())
        .slice(0, 10);
        
      if (recentTasks.length > 0) {
        results.push(`## Recent Delegated Tasks\n`);
        for (const task of recentTasks) {
          const agent = task.frontmatter.delegated_to;
          const status = task.frontmatter.status;
          const delegatedAt = task.frontmatter.delegated_at;
          results.push(`- **${task.title}** (${task.id})`);
          results.push(`  - Agent: ${agent}, Status: ${status}`);
          results.push(`  - Delegated: ${new Date(delegatedAt).toLocaleString()}`);
        }
        results.push('');
      }
      
      // Include logs if requested
      if (include_logs) {
        try {
          const logCommand = agent_type === 'all' 
            ? `npx vibekit logs --lines ${log_lines || 50}`
            : `npx vibekit logs --agent ${agent_type} --lines ${log_lines || 50}`;
          
          const logResult = await execAsync(logCommand);
          results.push(`## Recent Agent Logs\n\`\`\`\n${logResult.stdout}\n\`\`\``);
        } catch (error: any) {
          results.push(`## Recent Agent Logs\n*Failed to retrieve logs: ${error.message}*`);
        }
      }
      
      // Include analytics if requested
      if (include_analytics) {
        try {
          const analyticsCommand = agent_type === 'all'
            ? `npx vibekit analytics --days 1`
            : `npx vibekit analytics --agent ${agent_type} --days 1`;
          
          const analyticsResult = await execAsync(analyticsCommand);
          results.push(`## Agent Analytics\n\`\`\`\n${analyticsResult.stdout}\n\`\`\``);
        } catch (error: any) {
          results.push(`## Agent Analytics\n*Failed to retrieve analytics: ${error.message}*`);
        }
      }
      
      return {
        content: [{
          type: "text",
          text: results.join('\n')
        }]
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error monitoring agent tasks: ${error.message}` }] };
    }
  });

  // --- Agent Environment Tools ---
  server.registerTool("check_agent_environment", {
    title: "Check Agent Delegation Environment",
    description: "Verifies that all required tools and configurations are properly installed for agent task delegation. Use when: setting up the development environment, troubleshooting delegation issues, before starting delegation workflows, or during environment diagnostics. Checks Node.js version, Docker status, CLI availability, API key configuration, and agent provider readiness.",
    inputSchema: {
      check_docker: z.boolean().default(true).describe("Verify Docker installation and daemon status"),
      check_api_keys: z.boolean().default(true).describe("Verify agent service API key configuration"),
      check_models: z.boolean().default(false).describe("Check available models for each agent type"),
      detailed_report: z.boolean().default(false).describe("Include detailed diagnostic information"),
      debug_env: z.boolean().default(false).describe("Enable debug output for environment variables")
    },
  }, async ({ check_docker, check_api_keys, check_models, detailed_report, debug_env }: {
    check_docker?: boolean;
    check_api_keys?: boolean;
    check_models?: boolean;
    detailed_report?: boolean;
    debug_env?: boolean;
  }) => {
    try {
      // Set debug environment variable if requested
      if (debug_env) {
        process.env.VIBEKIT_DEBUG = 'true';
      }
      
      const env = await checkAgentEnvironment();
      const results: string[] = [];
      let overallStatus = 'READY';
      
      results.push('# Agent Environment Status Report\n');
      
      // Enhanced environment validation section
      if (env.env_validation) {
        results.push('## Environment Variables Status\n');
        
        if (env.env_validation.valid) {
          results.push('✅ **Environment Variables:** All required API keys are configured');
        } else {
          results.push('❌ **Environment Variables:** Missing required API keys');
          overallStatus = 'NEEDS_SETUP';
          
          for (const issue of env.env_validation.issues) {
            results.push(`   - ${issue}`);
          }
        }
        
        if (debug_env || detailed_report) {
          results.push('\n### Environment Variable Details:');
          for (const [key, configured] of Object.entries(env.env_validation.env_status)) {
            results.push(`   - ${key}: ${configured ? '✅ Configured' : '❌ Missing'}`);
          }
        }
        
        results.push('');
      }
      
      // Node.js check
      if (env.node_version) {
        const majorVersion = parseInt(env.node_version.replace('v', '').split('.')[0]);
        if (majorVersion >= 18) {
          results.push(`✅ **Node.js:** ${env.node_version} (requirement: 18.0.0+)`);
        } else {
          results.push(`❌ **Node.js:** ${env.node_version} (requirement: 18.0.0+) - UPDATE REQUIRED`);
          overallStatus = 'NEEDS_SETUP';
        }
      } else {
        results.push(`❌ **Node.js:** Not found or not accessible`);
        overallStatus = 'NEEDS_SETUP';
      }
      
      // CLI availability
      if (env.cli_available) {
        results.push(`✅ **Agent CLI:** Available via npx vibekit`);
      } else {
        results.push(`❌ **Agent CLI:** Not accessible via npx vibekit`);
        results.push(`   - Try: npm install -g vibekit-cli or check your npm/node setup`);
        overallStatus = 'NEEDS_SETUP';
      }
      
      // Docker checks
      if (check_docker) {
        if (env.docker_available) {
          results.push(`✅ **Docker:** Installed`);
          if (env.docker_running) {
            results.push(`✅ **Docker Daemon:** Running`);
          } else {
            results.push(`⚠️ **Docker Daemon:** Not running - start Docker Desktop or daemon`);
          }
        } else {
          results.push(`❌ **Docker:** Not installed`);
          results.push(`   - Required for sandbox execution. Install from https://docker.com`);
          overallStatus = 'NEEDS_SETUP';
        }
      }
      
      results.push('\n## Agent Providers\n');
      
      // Agent provider checks
      for (const [agent, status] of Object.entries(env.agent_status)) {
        if (status.configured) {
          results.push(`✅ **${agent}:** Configured`);
          
                      if (check_models) {
              // VibeKit CLI uses default models - no selection available
              results.push(`   Models: Default (no selection available)`);
            }
        } else {
          results.push(`⚠️ **${agent}:** ${status.issues.join(', ')}`);
          
          // Add specific setup instructions
          const config = getAgentProvider(agent as AgentProvider);
          if (config?.requires_api_key) {
            results.push(`   - Set ${config.requires_api_key} in your environment or .env file`);
          }
        }
      }
      
      // Enhanced API key details
      if (check_api_keys) {
        results.push('\n## API Key Configuration\n');
        
        results.push('### Environment Variable Sources Checked:');
        results.push('- System environment variables (process.env)');
        results.push('- .env files in current directory and parent directories');
        results.push('- Shell profile files (~/.zshrc, ~/.bashrc)');
        results.push('');
        
        const providers = getAvailableAgents();
        for (const provider of providers) {
          const config = getAgentProvider(provider);
          if (config?.requires_api_key) {
            const envStatus = env.env_validation?.env_status[config.requires_api_key];
            const icon = envStatus ? '✅' : '❌';
            const status = envStatus ? 'configured' : 'missing';
            results.push(`${icon} **${provider}:** ${config.requires_api_key} ${status}`);
            
            if (!envStatus) {
              results.push(`   - Add ${config.requires_api_key}="your-key-here" to .env file or shell profile`);
            }
          }
        }
      }
      
      // Detailed diagnostics
      if (detailed_report) {
        results.push('\n## Detailed Diagnostics\n');
        results.push('### Available Agents');
        const agents = getAvailableAgents();
        for (const agent of agents) {
          const config = getAgentProvider(agent);
          results.push(`- **${agent}:** ${config?.cli_command || 'N/A'}`);
          results.push(`  - Models: Default (VibeKit CLI)`);
          results.push(`  - Sandbox support: ${config?.supports_sandbox ? 'Yes' : 'No'}`);
          if (config?.requires_api_key) {
            results.push(`  - Required env var: ${config.requires_api_key}`);
          }
        }
        
        results.push('\n### Environment Detection:');
        results.push(`- Current working directory: ${process.cwd()}`);
        results.push(`- Node.js version: ${env.node_version || 'Not detected'}`);
        results.push(`- Platform: ${process.platform}`);
        results.push(`- Shell: ${process.env.SHELL || 'Unknown'}`);
      }
      
      results.push(`\n## Overall Status: **${overallStatus}**\n`);
      
      if (overallStatus === 'NEEDS_SETUP') {
        results.push('**🔧 Issues found! Use `setup_agent_environment` for guided setup.**');
        results.push('');
        results.push('**Quick Fix for API Keys:**');
        results.push('1. Create a `.env` file in your project root');
        results.push('2. Add your API keys (see setup tool for template)');
        results.push('3. Or add them to your shell profile (~/.zshrc)');
      } else {
        results.push('**🎉 All systems ready for agent task delegation!**');
      }
      
      // Reset debug flag
      if (debug_env) {
        delete process.env.VIBEKIT_DEBUG;
      }
      
      return {
        content: [{
          type: "text",
          text: results.join('\n')
        }]
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error checking environment: ${error.message}` }] };
    }
  });

  server.registerTool("setup_agent_environment", {
    title: "Setup Agent Delegation Environment",
    description: "Provides comprehensive setup guidance for agent task delegation capabilities with step-by-step instructions and automated installation options. Use when: initial environment setup, fixing configuration issues, updating delegation tools, or onboarding new developers. Includes Node.js, Docker, API keys, and agent CLI configuration with platform-specific instructions.",
    inputSchema: {
      platform: z.enum(['auto', 'macos', 'linux', 'windows']).default('auto').describe("Target platform for setup instructions"),
      include_docker: z.boolean().default(true).describe("Include Docker setup instructions"),
      include_api_setup: z.boolean().default(true).describe("Include API key setup instructions"),
      format: z.enum(['markdown', 'shell']).default('markdown').describe("Output format for instructions")
    },
  }, async ({ platform, include_docker, include_api_setup, format }: {
    platform?: string;
    include_docker?: boolean;
    include_api_setup?: boolean;
    format?: string;
  }) => {
    const instructions: string[] = [];
    
    instructions.push('# Agent Delegation Environment Setup\n');
    instructions.push('Complete setup guide for agent task delegation capabilities.\n');
    
    // Platform detection
    let detectedPlatform = platform;
    if (platform === 'auto') {
      const os = process.platform;
      detectedPlatform = os === 'darwin' ? 'macos' : os === 'win32' ? 'windows' : 'linux';
    }
    
    instructions.push(`**Target Platform:** ${detectedPlatform}\n`);
    
    // Node.js setup
    instructions.push('## 1. Node.js Requirements (18.0.0+)\n');
    instructions.push('Ensure Node.js 18.0.0+ is installed:\n');
    
    if (format === 'shell') {
      instructions.push('```bash');
      instructions.push('# Check current version');
      instructions.push('node --version');
      instructions.push('');
      
      switch (detectedPlatform) {
        case 'macos':
          instructions.push('# Install via Homebrew (recommended)');
          instructions.push('brew install node');
          instructions.push('');
          instructions.push('# Or via nvm');
          instructions.push('curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash');
          instructions.push('nvm install node');
          break;
        case 'linux':
          instructions.push('# Install via nvm (recommended)');
          instructions.push('curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash');
          instructions.push('source ~/.bashrc');
          instructions.push('nvm install node');
          break;
        case 'windows':
          instructions.push('# Download from nodejs.org or use Chocolatey');
          instructions.push('# choco install nodejs');
          break;
      }
      instructions.push('```\n');
    } else {
      instructions.push('- Check current version: `node --version`');
      instructions.push('- Required: 18.0.0 or higher');
      instructions.push('- Recommended: Use nvm for version management\n');
    }
    
    // API Keys setup
    if (include_api_setup) {
      instructions.push('## 2. API Keys Configuration\n');
      instructions.push('Set up your agent service API keys:\n');
      
      const agents = getAvailableAgents();
      for (const agent of agents) {
        const config = getAgentProvider(agent);
        if (config?.requires_api_key) {
          instructions.push(`### ${agent.charAt(0).toUpperCase() + agent.slice(1)}`);
          instructions.push(`Set the \`${config.requires_api_key}\` environment variable:\n`);
          
          if (format === 'shell') {
            instructions.push('```bash');
            instructions.push(`export ${config.requires_api_key}="your-api-key-here"`);
            instructions.push('');
            instructions.push('# Make permanent');
            if (detectedPlatform === 'windows') {
              instructions.push(`setx ${config.requires_api_key} "your-api-key-here"`);
            } else {
              instructions.push(`echo 'export ${config.requires_api_key}="your-api-key-here"' >> ~/.zshrc`);
              instructions.push('source ~/.zshrc');
            }
            instructions.push('```\n');
          } else {
            instructions.push(`- Set \`${config.requires_api_key}\` to your API key`);
            instructions.push('- Add to shell profile for persistence\n');
          }
        }
      }
    }
    
    // Docker setup
    if (include_docker) {
      instructions.push('## 3. Docker Setup (Optional - for sandbox isolation)\n');
      instructions.push('Install Docker for secure task execution:\n');
      
      switch (detectedPlatform) {
        case 'macos':
          instructions.push('- Download Docker Desktop from [docker.com](https://docs.docker.com/desktop/install/mac-install/)');
          instructions.push('- Or via Homebrew: `brew install --cask docker`');
          break;
        case 'linux':
          if (format === 'shell') {
            instructions.push('```bash');
            instructions.push('curl -fsSL https://get.docker.com -o get-docker.sh');
            instructions.push('sudo sh get-docker.sh');
            instructions.push('sudo usermod -aG docker $USER');
            instructions.push('# Log out and back in for group changes');
            instructions.push('```');
          } else {
            instructions.push('- Use Docker installation script or package manager');
            instructions.push('- Add user to docker group');
          }
          break;
        case 'windows':
          instructions.push('- Download Docker Desktop from [docker.com](https://docs.docker.com/desktop/install/windows-install/)');
          instructions.push('- Ensure WSL2 is enabled');
          break;
      }
      
      instructions.push('\nVerify installation:');
      if (format === 'shell') {
        instructions.push('```bash');
        instructions.push('docker --version');
        instructions.push('docker ps');
        instructions.push('```\n');
      } else {
        instructions.push('- Run `docker --version` and `docker ps`\n');
      }
    }
    
    // Verification
    instructions.push('## 4. Verify Setup\n');
    instructions.push('Test your configuration:\n');
    
    if (format === 'shell') {
      instructions.push('```bash');
      instructions.push('# Test agent CLI');
      instructions.push('npx vibekit --version');
      instructions.push('');
      instructions.push('# Test with a simple task');
      instructions.push('npx vibekit claude "Hello, test task"');
      instructions.push('```\n');
    } else {
      instructions.push('- Test CLI: `npx vibekit --version`');
      instructions.push('- Run simple test: `npx vibekit claude "Hello, test task"`\n');
    }
    
    // Next steps
    instructions.push('## 5. Next Steps\n');
    instructions.push('- Use `check_agent_environment` to verify configuration');
    instructions.push('- Start delegating tasks with `delegate_to_agent`');
    instructions.push('- Monitor progress with `monitor_agent_tasks`');
    instructions.push('- Create tasks with `create_task`\n');
    
    // Quick troubleshooting
    instructions.push('## Troubleshooting\n');
    instructions.push('**Command not found:** Check PATH and reinstall Node.js');
    instructions.push('**Permission errors:** Use nvm or check user permissions');
    instructions.push('**Docker issues:** Ensure Docker daemon is running');
    instructions.push('**API errors:** Verify API keys are correctly set\n');
    
    return {
      content: [{
        type: "text",
        text: instructions.join('\n')
      }]
    };
  });
}
