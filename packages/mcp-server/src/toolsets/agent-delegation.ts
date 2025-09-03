/**
 * Agent Delegation Tools - Task delegation to specialized coding agents via native CLIs
 * Updated with enhanced YOLO mode support based on official CLI documentation
 */

import { z } from "zod";
import path from "path";
import {
  executeWithAgent,
  checkAgentEnvironment,
  testYoloMode
} from "../agents/executor";
import {
  getAvailableAgents,
  getAgentProvider,
  getSetupInstructions,
  validateAgentProvider
} from "../agents/providers";
import { AgentProvider, isAgentProvider } from "../agents/types";
import { ToolsetContext } from "./types";

export function registerAgentDelegationTools({ server, memoryManager }: ToolsetContext) {
  // --- Core Agent Delegation Tool ---
  server.registerTool("delegate_to_agent", {
    title: "Delegate Task to Agent (Full YOLO Mode)",
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

      // Validate agent type
      if (!isAgentProvider(agent_type)) {
        return { content: [{ type: "text", text: `❌ **Invalid agent type:** ${agent_type}. Available agents: ${getAvailableAgents().join(', ')}` }] };
      }

      // Get task from memory
      const task = await memoryManager.getById('task', task_id);
      if (!task) {
        return { content: [{ type: "text", text: `❌ **Task not found:** No task with ID ${task_id} exists` }] };
      }

      // Validate agent configuration
      const validation = validateAgentProvider(agent_type);
      if (!validation.valid) {
        const issues = validation.issues.join('\n• ');
        return {
          content: [{
            type: "text",
            text: `❌ **Agent validation failed for ${agent_type}:**\n• ${issues}\n\nUse \`setup_agent_environment\` for setup instructions.`
          }]
        };
      }

      const agentProvider = getAgentProvider(agent_type);
      if (!agentProvider) {
        return { content: [{ type: "text", text: `❌ **Unsupported agent type:** ${agent_type}` }] };
      }

      // Configure for YOLO mode
      const agentConfig = {
        provider: agent_type as AgentProvider,
        timeout_minutes: execution_config?.timeout_minutes || 30,
        yolo_mode: true,
        permission_mode: 'yolo' as const,
        sandbox_enabled: execution_config?.sandbox_enabled ?? agentProvider.supports_sandbox,
        working_directory: context?.working_directory,
        max_turns: 30 // Generous limit for complex tasks
      };

      console.log(`🚀 Delegating task ${task_id} to ${agent_type} in YOLO mode`);
      console.log(`⚙️ Configuration:`, JSON.stringify(agentConfig, null, 2));

      if (execution_mode === 'background') {
        // Background execution
        // Generate job log file path
        const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const jobPath = path.join(memoryManager.getProjectRoot(), '.github', 'lia', 'jobs');
        const outputFile = path.join(jobPath, `${jobId}.log`);

        const result = await memoryManager.startBackgroundDelegation(task_id, agent_type as AgentProvider, agentConfig, outputFile);

        if (result.success) {
          return {
            content: [{
              type: "text",
              text: `🚀 **Task delegated to ${agent_type} agent (YOLO Mode - Background)**

**Task:** ${task.title}
**Job ID:** ${jobId}
**Status:** Queued for autonomous execution

**🤖 Agent Configuration:**
• **Provider:** ${agent_type}
• **Mode:** FULL AUTONOMOUS (YOLO) - No confirmations needed
• **Sandbox:** ${agentConfig.sandbox_enabled ? '✅ Enabled (Safe)' : '⚠️ Disabled (Use with caution)'}
• **Timeout:** ${agentConfig.timeout_minutes} minutes
• **Max Turns:** ${agentConfig.max_turns}

**🔐 Security & Permissions:**
• Agent has full read/write/execute permissions
• Will work autonomously without user prompts
• ${agentConfig.sandbox_enabled ? 'Running in isolated sandbox environment' : 'Running with direct system access'}

**📊 Monitoring:**
• Use \`check_delegation_status\` to monitor progress
• Use \`list_active_delegations\` to see all running jobs
• Use \`cancel_delegation\` if needed

**🎯 Expected Behavior:**
The agent will autonomously:
1. Analyze the codebase and task requirements
2. Read relevant files to understand context
3. Make necessary code changes and modifications
4. Run tests and commands to verify changes
5. Provide a summary of completed work`
            }]
          };
        } else {
          return { content: [{ type: "text", text: `❌ **Delegation failed:** ${result.message}` }] };
        }
      } else {
        // Synchronous execution
        console.log(`🔄 Starting synchronous execution for task ${task_id}`);

        // Update task status to in-progress
        await memoryManager.update({
          id: task_id,
          type: task.type,
          frontmatter: {
            status: 'in_progress',
            assignee: 'agent',
            delegated_to: agent_type,
            delegated_at: new Date().toISOString(),
            delegation_config: {
              agent_type,
              yolo_mode: true,
              sandbox: agentConfig.sandbox_enabled,
              timeout_minutes: agentConfig.timeout_minutes
            }
          }
        });

        // Execute the task
        const result = await executeWithAgent(
          agent_type as AgentProvider,
          task.title,
          task.content,
          agentConfig,
          context
        );

        // Update task based on result
        const newStatus = result.success ? 'done' : 'blocked';
        const completedAt = result.success ? new Date().toISOString() : undefined;

        // Append execution results to task content
        const executionReport = `

## 🤖 Agent Execution Report (${agent_type} - YOLO Mode)

**Execution Time:** ${result.execution_time}s
**Status:** ${result.success ? '✅ Success' : '❌ Failed'}
**YOLO Mode:** ${result.yolo_mode_used ? 'Yes' : 'No'}
**Sandbox Used:** ${result.sandbox_used ? 'Yes' : 'No'}
**Command:** \`${result.command_executed || 'N/A'}\`

### Agent Output:
\`\`\`
${result.output}
\`\`\`

${result.error ? `### Errors/Issues:
\`\`\`
${result.error}
\`\`\`` : ''}

---
*This task was completed autonomously by the ${agent_type} agent without human intervention.*`;

        await memoryManager.update({
          id: task_id,
          type: task.type,
          content: task.content + executionReport,
          frontmatter: {
            status: newStatus,
            completed_at: completedAt,
            delegation_completed_at: new Date().toISOString(),
          }
        });

        return {
          content: [{
            type: "text",
            text: `${result.success ? '✅' : '❌'} **Autonomous Task Execution ${result.success ? 'Completed' : 'Failed'}!**

**Task:** ${task.title}
**Agent:** ${agent_type} (YOLO Mode)
**Execution Time:** ${result.execution_time}s
**YOLO Mode Active:** ${result.yolo_mode_used ? 'Yes' : 'No'}
**Sandbox Used:** ${result.sandbox_used ? 'Yes' : 'No'}

**🤖 Agent Output:**
\`\`\`
${result.output}
\`\`\`

${result.error ? `**⚠️ Issues Encountered:**
\`\`\`
${result.error}
\`\`\`` : ''}

**📈 Task Status:** Updated to **${newStatus}**
**💾 Full Report:** Saved to task content for future reference

**Note:** This task was executed with full autonomous permissions. The agent operated independently without requiring user confirmation.`
          }]
        };
      }
    } catch (error: any) {
      console.error('Delegation error:', error);
      return { content: [{ type: "text", text: `❌ **Error delegating task:** ${error.message}` }] };
    }
  });

  // --- Task Status and Monitoring Tools ---
  server.registerTool("check_delegation_status", {
    title: "Check Delegation Status",
    description: "Check the current status of a delegated task, including progress, output, and execution details. Use when: monitoring background delegation progress, debugging execution issues, or getting real-time updates on agent work. Provides comprehensive status information for any delegated task.",
    inputSchema: { task_id: z.string().describe("ID of the task to check delegation status") },
  }, async ({ task_id }: { task_id: string }) => {
    try {
      await memoryManager.initializeProject();
      const status = await memoryManager.getDelegationStatus(task_id);

      if (status.status === 'not_found') {
        return { content: [{ type: "text", text: `❌ **Task not found:** No task with ID ${task_id} exists` }] };
      }
      if (status.status === 'not_delegated') {
        return { content: [{ type: "text", text: `ℹ️ **Task not delegated:** Task ${task_id} has not been delegated to any agent.` }] };
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
      response += `**Status:** ${status.status.toUpperCase()}\n`;
      response += `**Agent:** ${status.agent_type || 'Unknown'}\n`;

      if (status.started_at) {
        const startTime = new Date(status.started_at).toLocaleString();
        response += `**Started:** ${startTime}\n`;
      }

      if (status.completed_at) {
        const endTime = new Date(status.completed_at).toLocaleString();
        response += `**Completed:** ${endTime}\n`;
      }

      if (status.progress) {
        response += `**Progress:** ${status.progress}\n`;
      }

      if (status.error) {
        response += `\n**❌ Error Details:**\n\`\`\`\n${status.error}\n\`\`\`\n`;
      }

      if (status.output && status.output.trim()) {
        const truncatedOutput = status.output.length > 1000
          ? status.output.substring(0, 1000) + '\n... (truncated)'
          : status.output;
        response += `\n**📋 Agent Output:**\n\`\`\`\n${truncatedOutput}\n\`\`\`\n`;
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
      const activeDelegations = await memoryManager.listActiveDelegations();
      let allDelegations = [...activeDelegations];

      if (include_recent) {
        const allTasks = await memoryManager.listByType('task');
        const recentCompleted = allTasks.filter((task: any) =>
          ['completed', 'failed'].includes(task.frontmatter.delegation_status || '') &&
          task.frontmatter.delegation_completed_at &&
          (Date.now() - new Date(task.frontmatter.delegation_completed_at).getTime()) < 24 * 60 * 60 * 1000
        );
        allDelegations.push(...recentCompleted);
      }

      // Sort by priority: running > queued > completed > failed > cancelled
      allDelegations.sort((a: any, b: any) => {
        const statusPriority = {
          'running': 1,
          'queued': 2,
          'completed': 3,
          'failed': 4,
          'cancelled': 5
        };
        const aPriority = statusPriority[a.frontmatter.delegation_status as keyof typeof statusPriority] || 6;
        const bPriority = statusPriority[b.frontmatter.delegation_status as keyof typeof statusPriority] || 6;

        if (aPriority !== bPriority) return aPriority - bPriority;

        // Secondary sort by start time (most recent first)
        const aTime = new Date(a.frontmatter.delegation_started_at || 0).getTime();
        const bTime = new Date(b.frontmatter.delegation_started_at || 0).getTime();
        return bTime - aTime;
      });

      allDelegations = allDelegations.slice(0, max_results);

      if (allDelegations.length === 0) {
        return { content: [{ type: "text", text: `ℹ️ **No active delegations found**\n\nNo tasks are currently delegated to agents. Use \`delegate_to_agent\` to start autonomous task execution.` }] };
      }

      let response = `📊 **Active Delegations Overview** (${allDelegations.length} tasks)\n\n`;

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
        response += `   • **ID:** \`${task.id}\`\n`;
        response += `   • **Status:** ${task.frontmatter.delegation_status?.toUpperCase()}\n`;
        response += `   • **Agent:** ${task.frontmatter.delegated_to || 'Unknown'} (YOLO Mode)\n`;

        if (task.frontmatter.delegation_started_at) {
          const startTime = new Date(task.frontmatter.delegation_started_at).toLocaleString();
          response += `   • **Started:** ${startTime}\n`;
        }

        if (task.frontmatter.delegation_progress) {
          response += `   • **Progress:** ${task.frontmatter.delegation_progress}\n`;
        }

        if (task.frontmatter.execution_time) {
          response += `   • **Execution Time:** ${task.frontmatter.execution_time}s\n`;
        }

        response += '\n';
      }

      response += `\n**💡 Commands:**\n`;
      response += `• Use \`check_delegation_status <task_id>\` for detailed status\n`;
      response += `• Use \`cancel_delegation <task_id>\` to cancel running tasks\n`;
      response += `• Use \`delegate_to_agent\` to start new autonomous executions`;

      return { content: [{ type: "text", text: response }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `❌ **Error listing delegations:** ${error.message}` }] };
    }
  });

  server.registerTool("cancel_delegation", {
    title: "Cancel Delegation",
    description: "Cancel a running or queued delegation. Use when: stopping unnecessary agent work, freeing up resources, or correcting delegation mistakes. Only works on tasks that are currently queued or running.",
    inputSchema: { task_id: z.string().describe("ID of the task to cancel delegation") },
  }, async ({ task_id }: { task_id: string }) => {
    try {
      await memoryManager.initializeProject();
      const result = await memoryManager.cancelDelegation(task_id);

      if (result.success) {
        return {
          content: [{
            type: "text",
            text: `✅ **Delegation cancelled successfully**\n\n**Task ID:** ${task_id}\n**Status:** Task delegation has been terminated\n**Next Steps:** Task status reverted to 'todo' - you can re-delegate or work on it manually.`
          }]
        };
      } else {
        return { content: [{ type: "text", text: `❌ **Cancellation failed:** ${result.message}` }] };
      }
    } catch (error: any) {
      return { content: [{ type: "text", text: `❌ **Error cancelling delegation:** ${error.message}` }] };
    }
  });

  // --- Task Discovery and Management ---
  server.registerTool("find_delegation_candidates", {
    title: "Find Delegation Candidates",
    description: "Identify tasks that are suitable for delegation to specialized agents based on complexity, independence, and other criteria for optimal workload distribution.",
    inputSchema: {
      complexity_threshold: z.enum(['low', 'medium', 'high']).default('medium').describe("Complexity level for delegation"),
      independence_required: z.boolean().default(true).describe("Require tasks to be independent (no dependencies)"),
      max_estimated_hours: z.number().default(8).describe("Maximum estimated hours for delegation"),
      assignee_filter: z.string().optional().describe("Filter by current assignee"),
      required_tags: z.array(z.string()).optional().describe("Tasks must have these tags"),
      exclude_tags: z.array(z.string()).optional().describe("Exclude tasks with these tags")
    },
  }, async ({ complexity_threshold, independence_required, max_estimated_hours, assignee_filter, required_tags, exclude_tags }) => {
    try {
      await memoryManager.initializeProject();

      const candidates = await memoryManager.findDelegationCandidates({
        complexity_threshold,
        independence_required,
        max_estimated_hours,
        assignee_filter,
        required_tags,
        exclude_tags,
        exclude_sensitive: true
      });

      if (candidates.length === 0) {
        return {
          content: [{
            type: "text",
            text: `ℹ️ **No delegation candidates found**\n\nNo tasks match the current criteria for autonomous delegation.\n\n**Current Filters:**\n• Complexity: ${complexity_threshold}\n• Independence required: ${independence_required}\n• Max hours: ${max_estimated_hours}\n${assignee_filter ? `• Assignee: ${assignee_filter}\n` : ''}${required_tags?.length ? `• Required tags: ${required_tags.join(', ')}\n` : ''}${exclude_tags?.length ? `• Exclude tags: ${exclude_tags.join(', ')}\n` : ''}\n\n**Suggestions:**\n• Try adjusting complexity threshold\n• Check for tasks without dependencies\n• Look for tasks with clear acceptance criteria`
          }]
        };
      }

      let response = `🎯 **Delegation Candidates Found** (${candidates.length} tasks)\n\n`;
      response += `**Filtering Criteria:**\n`;
      response += `• **Complexity:** ${complexity_threshold} or lower\n`;
      response += `• **Independence:** ${independence_required ? 'Required' : 'Not required'}\n`;
      response += `• **Max Hours:** ${max_estimated_hours}h\n`;
      if (assignee_filter) response += `• **Assignee:** ${assignee_filter}\n`;
      if (required_tags?.length) response += `• **Required Tags:** ${required_tags.join(', ')}\n`;
      if (exclude_tags?.length) response += `• **Excluded Tags:** ${exclude_tags.join(', ')}\n`;
      response += `\n---\n\n`;

      for (const task of candidates) {
        const priority = task.frontmatter.priority || 'medium';
        const estimatedHours = task.frontmatter.estimated_hours || 0;
        const tags = task.frontmatter.tags || [];

        const priorityIcon = {
          low: '🔵',
          medium: '🟡',
          high: '🟠',
          urgent: '🔴'
        }[priority as string] || '⚪';

        response += `${priorityIcon} **${task.title}**\n`;
        response += `   • **ID:** \`${task.id}\`\n`;
        response += `   • **Priority:** ${priority.toUpperCase()}\n`;
        response += `   • **Estimated Hours:** ${estimatedHours}h\n`;

        if (tags.length > 0) {
          response += `   • **Tags:** ${tags.join(', ')}\n`;
        }

        if (task.frontmatter.feature_id) {
          response += `   • **Feature:** ${task.frontmatter.feature_id}\n`;
        }

        // Show brief description from content
        const briefDesc = task.content.split('\n').slice(0, 2).join(' ').substring(0, 100);
        if (briefDesc) {
          response += `   • **Description:** ${briefDesc}${briefDesc.length >= 100 ? '...' : ''}\n`;
        }

        response += '\n';
      }

      response += `\n**🚀 Next Steps:**\n`;
      response += `• Use \`delegate_to_agent <task_id> <agent_type>\` to delegate specific tasks\n`;
      response += `• Recommended agents: \`gemini\` (balanced), \`claude\` (code-focused), \`codex\` (OpenAI)\n`;
      response += `• All delegations will run in YOLO mode (full autonomous execution)`;

      return { content: [{ type: "text", text: response }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `❌ **Error finding candidates:** ${error.message}` }] };
    }
  });

  server.registerTool("monitor_agent_tasks", {
    title: "Monitor Agent Tasks",
    description: "Monitors progress and output of tasks delegated to agents with real-time logs and execution analytics. Use when: checking status of delegated work, collecting results from agent execution, debugging delegation issues, generating progress reports, or analyzing agent performance patterns. Provides comprehensive monitoring across all agent types.",
    inputSchema: {
      agent_type: z.enum(['all', ...getAvailableAgents()] as [string, ...string[]]).default('all').describe("Which agent type to monitor"),
      task_filter: z.string().optional().describe("Filter by specific task ID or feature"),
      include_logs: z.boolean().default(true).describe("Include detailed execution logs"),
      log_lines: z.number().default(50).describe("Number of recent log lines to show"),
      include_analytics: z.boolean().default(false).describe("Include performance analytics")
    },
  }, async ({ agent_type, task_filter, include_logs, log_lines, include_analytics }) => {
    try {
      await memoryManager.initializeProject();
      const allTasks = await memoryManager.listByType('task');

      let delegatedTasks = allTasks.filter((task: any) =>
        task.frontmatter.assignee === 'agent' && task.frontmatter.delegated_to
      );

      // Apply filters
      if (agent_type && agent_type !== 'all') {
        delegatedTasks = delegatedTasks.filter((task: any) =>
          task.frontmatter.delegated_to === agent_type
        );
      }

      if (task_filter) {
        delegatedTasks = delegatedTasks.filter((task: any) =>
          task.id.includes(task_filter) ||
          task.frontmatter.feature_id === task_filter ||
          task.title.toLowerCase().includes(task_filter.toLowerCase())
        );
      }

      if (delegatedTasks.length === 0) {
        return {
          content: [{
            type: "text",
            text: `ℹ️ **No delegated tasks found**\n\nNo tasks match the monitoring criteria.\n\n**Applied Filters:**\n• Agent Type: ${agent_type}\n${task_filter ? `• Filter: ${task_filter}\n` : ''}\n\n**Suggestions:**\n• Check \`list_active_delegations\` for all delegated tasks\n• Try removing filters to see all agent tasks`
          }]
        };
      }

      // Generate analytics
      const analytics = {
        total: delegatedTasks.length,
        by_status: delegatedTasks.reduce((acc: Record<string, number>, task: any) => {
          const status = task.frontmatter.delegation_status || task.frontmatter.status || 'unknown';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {}),
        by_agent: delegatedTasks.reduce((acc: Record<string, number>, task: any) => {
          const agent = task.frontmatter.delegated_to || 'unknown';
          acc[agent] = (acc[agent] || 0) + 1;
          return acc;
        }, {}),
        avg_execution_time: 0,
        success_rate: 0
      };

      // Calculate success metrics
      const completedTasks = delegatedTasks.filter((task: any) =>
        task.frontmatter.delegation_status === 'completed' || task.frontmatter.status === 'done'
      );
      const totalExecutionTime = delegatedTasks.reduce((sum: number, task: any) =>
        sum + (task.frontmatter.execution_time || 0), 0
      );

      analytics.success_rate = delegatedTasks.length > 0
        ? Math.round((completedTasks.length / delegatedTasks.length) * 100)
        : 0;
      analytics.avg_execution_time = delegatedTasks.length > 0
        ? Math.round(totalExecutionTime / delegatedTasks.length)
        : 0;

      let response = `📊 **Agent Task Monitoring Report**\n\n`;

      // Summary stats
      response += `**📈 Summary:**\n`;
      response += `• **Total Delegated Tasks:** ${analytics.total}\n`;
      response += `• **Success Rate:** ${analytics.success_rate}%\n`;
      response += `• **Avg Execution Time:** ${analytics.avg_execution_time}s\n\n`;

      // Status breakdown
      response += `**📋 Status Breakdown:**\n`;
      Object.entries(analytics.by_status).forEach(([status, count]) => {
        const statusIcon = {
          'completed': '✅',
          'running': '🔄',
          'queued': '⏳',
          'failed': '❌',
          'cancelled': '⏹️',
          'done': '✅',
          'in_progress': '🔄',
          'todo': '📝',
          'blocked': '🚫'
        }[status] || '❓';
        response += `   ${statusIcon} **${status}:** ${count}\n`;
      });

      // Agent breakdown
      response += `\n**🤖 Agent Breakdown:**\n`;
      Object.entries(analytics.by_agent).forEach(([agent, count]) => {
        response += `   • **${agent}:** ${count} tasks\n`;
      });

      // Recent tasks
      response += `\n**🕒 Recent Tasks:**\n`;
      const recentTasks = delegatedTasks
        .sort((a: any, b: any) => {
          const aTime = new Date(a.frontmatter.delegation_started_at || a.frontmatter.created_at).getTime();
          const bTime = new Date(b.frontmatter.delegation_started_at || b.frontmatter.created_at).getTime();
          return bTime - aTime;
        })
        .slice(0, 5);

      for (const task of recentTasks) {
        const status = task.frontmatter.delegation_status || task.frontmatter.status || 'unknown';
        const agent = task.frontmatter.delegated_to || 'unknown';
        const statusIcon = {
          'completed': '✅', 'running': '🔄', 'queued': '⏳',
          'failed': '❌', 'cancelled': '⏹️', 'done': '✅',
          'in_progress': '🔄', 'todo': '📝', 'blocked': '🚫',
          'testing': '🧪', 'unknown': '❓'
        }[status] || '❓';

        response += `   ${statusIcon} **${task.title}** (${agent})\n`;
      }

      response += `\n**💡 Commands:**\n`;
      response += `• Use \`check_delegation_status <task_id>\` for detailed status\n`;
      response += `• Use \`cancel_delegation <task_id>\` to stop running tasks\n`;
      response += `• Use \`delegate_to_agent\` to start new autonomous executions`;

      return { content: [{ type: "text", text: response }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `❌ **Error monitoring tasks:** ${error.message}` }] };
    }
  });

  // --- Agent Environment Tools ---
  server.registerTool("check_agent_environment", {
    title: "Check Agent Environment",
    description: "Verifies that all required tools and configurations are properly installed for agent task delegation. Use when: setting up the development environment, troubleshooting delegation issues, before starting delegation workflows, or during environment diagnostics. Checks Node.js version, Docker status, CLI availability, API key configuration, and agent provider readiness.",
    inputSchema: {
      check_docker: z.boolean().default(true).describe("Verify Docker installation and daemon status"),
      check_api_keys: z.boolean().default(true).describe("Verify agent service API key configuration"),
      check_models: z.boolean().default(false).describe("Check available models for each agent type"),
      detailed_report: z.boolean().default(false).describe("Include detailed diagnostic information"),
      debug_env: z.boolean().default(false).describe("Enable debug output for environment variables")
    },
  }, async ({ check_docker, check_api_keys, check_models, detailed_report, debug_env }) => {
    try {
      const env = await checkAgentEnvironment();
      const results: string[] = [];
      let overallStatus = 'READY';

      results.push('# 🤖 Agent Environment Status Report\n');

      // Node.js Version Check
      if (env.node_version) {
        const majorVersion = parseInt(env.node_version.replace('v', '').split('.')[0]);
        if (majorVersion >= 18) {
          results.push(`✅ **Node.js:** ${env.node_version} (v18+ required)`);
        } else {
          results.push(`❌ **Node.js:** ${env.node_version} (v18+ required) - **UPDATE NEEDED**`);
          overallStatus = 'NEEDS_SETUP';
        }
      } else {
        results.push(`❌ **Node.js:** Not found - **CRITICAL REQUIREMENT**`);
        overallStatus = 'NEEDS_SETUP';
      }

      // Docker Check (if requested)
      if (check_docker) {
        try {
          const { execAsync } = await import('../utils/exec');
          await execAsync('docker --version', { timeout: 5000 });
          results.push(`✅ **Docker:** Available`);
        } catch {
          results.push(`⚠️ **Docker:** Not available (optional for some agents)`);
        }
      }

      results.push('\n## 🛠️ Agent CLI Status\n');

      // Agent Status Check
      for (const [agent, status] of Object.entries(env.agent_status)) {
        const agentTitle = agent.charAt(0).toUpperCase() + agent.slice(1);

        if (status.installed) {
          if (status.yolo_ready) {
            results.push(`✅ **${agentTitle}:** Installed & YOLO Ready`);
          } else {
            results.push(`⚠️ **${agentTitle}:** Installed but YOLO mode not configured`);
            if (overallStatus === 'READY') overallStatus = 'PARTIAL';
          }
        } else {
          results.push(`❌ **${agentTitle}:** Not installed`);
          overallStatus = 'NEEDS_SETUP';
        }

        // Show issues/warnings with indentation
        if (status.issues.length > 0) {
          status.issues.forEach(issue => {
            const prefix = issue.startsWith('Warning:') ? '   ⚠️' : '   ❌';
            results.push(`${prefix} ${issue}`);
          });
        }
      }

      // YOLO Environment Check
      results.push('\n## 🎯 YOLO Mode Configuration\n');
      const yoloEnvKeys = Object.keys(env.yolo_environment);
      results.push(`**Environment Variables:** ${yoloEnvKeys.length} configured`);

      if (debug_env) {
        results.push('\n**YOLO Environment Variables:**');
        Object.entries(env.yolo_environment).forEach(([key, value]) => {
          results.push(`   • \`${key}\`=${value}`);
        });
      }

      // Overall Status
      results.push(`\n## 📊 Overall Status: **${overallStatus}**\n`);

      switch (overallStatus) {
        case 'READY':
          results.push('🎉 **All systems ready for agent task delegation!**');
          results.push('\n**You can now:**');
          results.push('• Use `delegate_to_agent` to start autonomous tasks');
          results.push('• Use `find_delegation_candidates` to discover suitable tasks');
          break;
        case 'PARTIAL':
          results.push('⚠️ **System partially ready - some issues detected**');
          results.push('\n**Recommendations:**');
          results.push('• Use `setup_agent_environment` for configuration help');
          results.push('• Some agents may work, but full YOLO mode might be limited');
          break;
        case 'NEEDS_SETUP':
          results.push('🔧 **Setup required - critical issues found**');
          results.push('\n**Next Steps:**');
          results.push('• Use `setup_agent_environment` for guided setup');
          results.push('• Install missing CLI tools and configure API keys');
          break;
      }

      if (detailed_report) {
        results.push('\n## 🔍 Detailed Information\n');
        results.push(`**Platform:** ${process.platform}`);
        results.push(`**Architecture:** ${process.arch}`);
        results.push(`**Working Directory:** ${process.cwd()}`);
      }

      return { content: [{ type: "text", text: results.join('\n') }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `❌ **Error checking environment:** ${error.message}` }] };
    }
  });

  server.registerTool("setup_agent_environment", {
    title: "Setup Agent Environment",
    description: "Provides comprehensive setup guidance for agent task delegation capabilities with step-by-step instructions and automated installation options. Use when: initial environment setup, fixing configuration issues, updating delegation tools, or onboarding new developers. Includes Node.js, Docker, API keys, and agent CLI configuration with platform-specific instructions.",
    inputSchema: {
      platform: z.enum(['auto', 'macos', 'linux', 'windows']).default('auto').describe("Target platform for setup instructions"),
      format: z.enum(['markdown', 'shell']).default('markdown').describe("Output format for instructions"),
      include_docker: z.boolean().default(true).describe("Include Docker setup instructions"),
      include_api_setup: z.boolean().default(true).describe("Include API key setup instructions")
    },
  }, async ({ platform, format, include_docker, include_api_setup }) => {
    const instructions: string[] = [];
    const detectedPlatform = platform === 'auto'
      ? (process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux')
      : platform;

    instructions.push(`# 🚀 Agent Delegation Environment Setup (${detectedPlatform})`);
    instructions.push('');
    instructions.push('This guide provides step-by-step instructions to set up the complete environment for autonomous agent task delegation with YOLO mode support.');
    instructions.push('');

    // Prerequisites
    instructions.push('## 📋 Prerequisites');
    instructions.push('');
    instructions.push('### Node.js (Required)');
    if (format === 'shell') {
      instructions.push('```bash');
      if (detectedPlatform === 'macos') {
        instructions.push('# Install Node.js via Homebrew');
        instructions.push('brew install node');
      } else if (detectedPlatform === 'linux') {
        instructions.push('# Install Node.js (Ubuntu/Debian)');
        instructions.push('curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -');
        instructions.push('sudo apt-get install -y nodejs');
      } else {
        instructions.push('# Download and install from https://nodejs.org/');
        instructions.push('# Choose LTS version (v20+)');
      }
      instructions.push('node --version  # Should show v18.0.0 or higher');
      instructions.push('```');
    } else {
      instructions.push('- **Version:** Node.js v18+ (recommended: v20 LTS)');
      instructions.push('- **Installation:** [nodejs.org](https://nodejs.org/) or package manager');
      instructions.push('- **Verification:** `node --version`');
    }
    instructions.push('');

    if (include_docker) {
      instructions.push('### Docker (Optional but Recommended)');
      if (format === 'shell') {
        instructions.push('```bash');
        if (detectedPlatform === 'macos') {
          instructions.push('# Install Docker Desktop for Mac');
          instructions.push('brew install --cask docker');
        } else if (detectedPlatform === 'linux') {
          instructions.push('# Install Docker (Ubuntu/Debian)');
          instructions.push('curl -fsSL https://get.docker.com -o get-docker.sh');
          instructions.push('sudo sh get-docker.sh');
          instructions.push('sudo usermod -aG docker $USER');
        } else {
          instructions.push('# Download Docker Desktop from https://docker.com/');
        }
        instructions.push('docker --version  # Verify installation');
        instructions.push('```');
      } else {
        instructions.push('- **Purpose:** Provides secure sandboxing for agent execution');
        instructions.push('- **Installation:** [docker.com](https://docker.com/) - Docker Desktop recommended');
        instructions.push('- **Verification:** `docker --version`');
      }
      instructions.push('');
    }

    // Agent CLI Setup
    instructions.push('## 🤖 Agent CLI Installation & Configuration');
    instructions.push('');

    const agents = [
      {
        name: 'Gemini CLI',
        id: 'gemini',
        install: 'npm install -g @google/gemini-cli',
        env_var: 'GEMINI_API_KEY',
        api_url: 'https://makersuite.google.com/app/apikey',
        test: 'gemini --version',
        yolo_test: 'gemini --yolo -p "echo test"',
        docs: 'https://google-gemini.github.io/gemini-cli/docs/cli/configuration.html',
        features: ['✅ Built-in sandboxing', '✅ YOLO mode support', '✅ Multimodal input']
      },
      {
        name: 'Claude Code',
        id: 'claude',
        install: 'Download from https://claude.ai/download',
        env_var: 'ANTHROPIC_API_KEY',
        api_url: 'https://console.anthropic.com/account/keys',
        test: 'claude --version',
        yolo_test: 'claude -p "echo test" --dangerously-skip-permissions',
        docs: 'https://docs.anthropic.com/en/docs/claude-code/cli-reference',
        features: ['⚠️ No built-in sandboxing', '✅ YOLO mode support', '✅ Multimodal input']
      },
      {
        name: 'OpenAI Codex CLI',
        id: 'codex',
        install: 'npm install -g @openai/codex',
        env_var: 'OPENAI_API_KEY',
        api_url: 'https://platform.openai.com/api-keys',
        test: 'codex --version',
        yolo_test: 'codex exec "echo test" --approval-mode full-auto',
        docs: 'https://developers.openai.com/codex/cli/',
        features: ['✅ Built-in sandboxing', '✅ YOLO mode support', '✅ ChatGPT integration']
      }
    ];

    for (const agent of agents) {
      instructions.push(`### 🔧 ${agent.name} (${agent.id})`);
      instructions.push('');

      if (format === 'shell') {
        instructions.push('```bash');
        instructions.push(`# Install ${agent.name}`);
        instructions.push(agent.install);
        instructions.push('');
        if (include_api_setup) {
          instructions.push(`# Set API Key (get from ${agent.api_url})`);
          instructions.push(`export ${agent.env_var}="your-api-key-here"`);
          instructions.push('');
        }
        instructions.push(`# Test installation`);
        instructions.push(agent.test);
        instructions.push('');
        instructions.push(`# Test YOLO mode (Full Autonomous)`);
        instructions.push(agent.yolo_test);
        instructions.push('```');
      } else {
        instructions.push(`**Installation:**`);
        instructions.push(`\`${agent.install}\``);
        instructions.push('');
        if (include_api_setup) {
          instructions.push(`**API Key Setup:**`);
          instructions.push(`1. Get API key from: [${agent.api_url}](${agent.api_url})`);
          instructions.push(`2. Set environment variable: \`export ${agent.env_var}="your-key"\``);
          instructions.push('');
        }
        instructions.push(`**Verification:**`);
        instructions.push(`\`${agent.test}\``);
        instructions.push('');
        instructions.push(`**YOLO Mode Test:**`);
        instructions.push(`\`${agent.yolo_test}\``);
        instructions.push('');
        instructions.push(`**Features:**`);
        agent.features.forEach(feature => instructions.push(`• ${feature}`));
        instructions.push('');
        instructions.push(`**Documentation:** [${agent.docs}](${agent.docs})`);
      }
      instructions.push('');
    }

    // Environment Configuration
    if (include_api_setup) {
      instructions.push('## 🔐 Environment Variables Setup');
      instructions.push('');

      if (format === 'shell') {
        instructions.push('```bash');
        instructions.push('# Create .env file in your project root');
        instructions.push('cat << EOF > .env');
        instructions.push('# Gemini API Key');
        instructions.push('GEMINI_API_KEY=your-gemini-key-here');
        instructions.push('');
        instructions.push('# Anthropic API Key');
        instructions.push('ANTHROPIC_API_KEY=your-anthropic-key-here');
        instructions.push('');
        instructions.push('# OpenAI API Key');
        instructions.push('OPENAI_API_KEY=your-openai-key-here');
        instructions.push('');
        instructions.push('# YOLO Mode Configuration (automatically set by delegation system)');
        instructions.push('# YOLO_MODE=1');
        instructions.push('# AUTO_APPROVE=1');
        instructions.push('# NON_INTERACTIVE=1');
        instructions.push('EOF');
        instructions.push('');
        instructions.push('# Make sure .env is in your .gitignore');
        instructions.push('echo ".env" >> .gitignore');
        instructions.push('```');
      } else {
        instructions.push('**Option 1: Project .env file (Recommended)**');
        instructions.push('Create a `.env` file in your project root:');
        instructions.push('```env');
        instructions.push('GEMINI_API_KEY=your-gemini-key-here');
        instructions.push('ANTHROPIC_API_KEY=your-anthropic-key-here');
        instructions.push('OPENAI_API_KEY=your-openai-key-here');
        instructions.push('```');
        instructions.push('');
        instructions.push('**Option 2: Shell Profile (Global)**');
        instructions.push('Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):');
        instructions.push('```bash');
        instructions.push('export GEMINI_API_KEY="your-gemini-key-here"');
        instructions.push('export ANTHROPIC_API_KEY="your-anthropic-key-here"');
        instructions.push('export OPENAI_API_KEY="your-openai-key-here"');
        instructions.push('```');
      }
      instructions.push('');
    }

    // Verification
    instructions.push('## ✅ Verification & Testing');
    instructions.push('');
    instructions.push('After completing the setup, run these commands to verify everything is working:');
    instructions.push('');

    if (format === 'shell') {
      instructions.push('```bash');
      instructions.push('# Check agent environment');
      instructions.push('# (This will be available after setting up the MCP server)');
      instructions.push('# Use the check_agent_environment tool');
      instructions.push('');
      instructions.push('# Test each agent individually');
      instructions.push('gemini --version && echo "✅ Gemini CLI ready"');
      instructions.push('claude --version && echo "✅ Claude Code ready"');
      instructions.push('codex --version && echo "✅ Codex CLI ready"');
      instructions.push('```');
    } else {
      instructions.push('1. **Use the Environment Checker:**');
      instructions.push('   • Run `check_agent_environment` tool');
      instructions.push('   • Should show "READY" status for all agents');
      instructions.push('');
      instructions.push('2. **Test Individual Agents:**');
      instructions.push('   • `gemini --version`');
      instructions.push('   • `claude --version`');
      instructions.push('   • `codex --version`');
    }
    instructions.push('');

    // YOLO Mode Information
    instructions.push('## 🎯 YOLO Mode (Autonomous Execution)');
    instructions.push('');
    instructions.push('All agents are configured to run in **YOLO MODE** for delegated tasks:');
    instructions.push('');
    instructions.push('**🔓 Full Permissions:**');
    instructions.push('• Agents can read any files in the working directory');
    instructions.push('• Agents can write, modify, and create files');
    instructions.push('• Agents can execute shell commands and scripts');
    instructions.push('• No user confirmation required during execution');
    instructions.push('');
    instructions.push('**🛡️ Security Features:**');
    instructions.push('• Sandboxed execution (when supported by agent)');
    instructions.push('• Scoped to working directory');
    instructions.push('• Network access controlled per configuration');
    instructions.push('• Timeout limits prevent runaway processes');
    instructions.push('');
    instructions.push('**⚠️ Important Notes:**');
    instructions.push('• YOLO mode gives agents significant system access');
    instructions.push('• Always run in a version-controlled environment');
    instructions.push('• Review changes before committing to production');
    instructions.push('• Use sandboxing when available');
    instructions.push('');

    // Troubleshooting
    instructions.push('## 🔧 Troubleshooting');
    instructions.push('');
    instructions.push('**Common Issues:**');
    instructions.push('');
    instructions.push('1. **"Command not found" errors:**');
    instructions.push('   • Ensure CLI tools are installed globally');
    instructions.push('   • Check PATH environment variable');
    instructions.push('   • Restart terminal after installation');
    instructions.push('');
    instructions.push('2. **API key errors:**');
    instructions.push('   • Verify API keys are correctly set');
    instructions.push('   • Check for typos or extra spaces');
    instructions.push('   • Ensure API keys have required permissions');
    instructions.push('');
    instructions.push('3. **Permission errors:**');
    instructions.push('   • Some CLIs require additional setup');
    instructions.push('   • Check CLI-specific documentation');
    instructions.push('   • Verify YOLO mode is supported');
    instructions.push('');
    instructions.push('**Getting Help:**');
    instructions.push('• Use `check_agent_environment --detailed-report` for diagnostics');
    instructions.push('• Check individual CLI documentation links above');
    instructions.push('• Review error messages carefully');

    return { content: [{ type: "text", text: instructions.join('\n') }] };
  });
}
