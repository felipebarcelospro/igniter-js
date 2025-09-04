/**
 * Task Management Tools - CRUD operations for development tasks
 */

import { z } from "zod";
import { TASK_TYPES } from "../constants";
import { ToolsetContext } from "./types";
import { TaskPriority, TaskStatus } from "../memory/types";

export function registerTaskManagementTools({ server, memoryManager }: ToolsetContext) {
  // --- Original Task Management Tools ---
  server.registerTool("list_tasks", {
    title: "List Tasks",
    description: "List and filter tasks by status, priority, feature, or assignee for project management.",
    inputSchema: {
      status: z.enum(['todo', 'in_progress', 'blocked', 'testing', 'done', 'cancelled']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      feature_id: z.string().optional(),
      assignee: z.string().optional(),
      include_subtasks: z.boolean().default(false)
    },
  }, async ({ status, priority, feature_id, assignee, include_subtasks }: {
    status?: string,
    priority?: string,
    feature_id?: string,
    assignee?: string,
    include_subtasks?: boolean
  }) => {
    try {
      await memoryManager.initializeProject();

      // Use optimized listTasks method for better performance
      const filteredTasks = await memoryManager.listTasks({
        status: status as TaskStatus,
        priority: priority as TaskPriority,
        feature_id,
        assignee,
        limit: 100 // Reasonable limit for UI
      });

      // Group by type and status
      const result = {
        summary: {
          total: filteredTasks.length,
          by_type: {} as Record<string, number>,
          by_status: {} as Record<string, number>,
          by_priority: {} as Record<string, number>
        },
        tasks: filteredTasks.map((task) => ({
          id: task.id,
          type: task.type,
          title: task.title,
          status: task.frontmatter.status || 'todo',
          priority: task.frontmatter.priority || 'medium',
          assignee: task.frontmatter.assignee,
          feature_id: task.frontmatter.feature_id,
          due_date: task.frontmatter.due_date,
          dependencies: task.frontmatter.dependencies || [],
          subtasks: include_subtasks ? task.frontmatter.subtasks || [] : undefined,
          estimated_hours: task.frontmatter.estimated_hours,
          actual_hours: task.frontmatter.actual_hours
        }))
      };

      // Calculate summaries
      filteredTasks.forEach((task) => {
        const type = task.type;
        const status = task.frontmatter.status || 'todo';
        const priority = task.frontmatter.priority || 'medium';

        result.summary.by_type[type] = (result.summary.by_type[type] || 0) + 1;
        result.summary.by_status[status] = (result.summary.by_status[status] || 0) + 1;
        result.summary.by_priority[priority] = (result.summary.by_priority[priority] || 0) + 1;
      });

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error listing tasks: ${error.message}` }] };
    }
  });

  server.registerTool("update_task_status", {
    title: "Update Task Status",
    description: "Update the status of a specific task and track completion time.",
    inputSchema: {
      task_id: z.string(),
      new_status: z.enum(['todo', 'in_progress', 'blocked', 'testing', 'done', 'cancelled']),
      notes: z.string().optional()
    },
  }, async ({ task_id, new_status, notes }: { task_id: string, new_status: string, notes?: string }) => {
    try {
      await memoryManager.initializeProject();

      // Find the task across all task types
      const taskTypes = TASK_TYPES;
      let foundTask = null;
      let foundType = null;

      for (const type of taskTypes) {
        const task = await memoryManager.getById(type, task_id);
        if (task) {
          foundTask = task;
          foundType = type;
          break;
        }
      }

      if (!foundTask || !foundType) {
        return { content: [{ type: "text", text: `Task with ID ${task_id} not found` }] };
      }

      const updateData: any = {
        status: new_status
      };

      // Set completion time if moving to done
      if (new_status === 'done' && foundTask.frontmatter.status !== 'done') {
        updateData.completed_at = new Date().toISOString();
      }

      // Add notes to content if provided
      let newContent = foundTask.content;
      if (notes) {
        newContent += `\n\n## Status Update (${new Date().toISOString()})\n${notes}`;
      }

      await memoryManager.update({
        type: foundType,
        id: task_id,
        content: newContent,
        frontmatter: updateData
      });

      return {
        content: [{
          type: "text",
          text: `Task "${foundTask.title}" status updated from "${foundTask.frontmatter.status || 'todo'}" to "${new_status}"`
        }]
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error updating task status: ${error.message}` }] };
    }
  });

  // --- Enhanced Task Management Tools ---

  server.registerTool("get_task_statistics", {
    title: "Get Task Statistics and Workload Analysis",
    description: "Get comprehensive task statistics including workload analysis, completion rates, and performance metrics for project management and delegation planning.",
    inputSchema: {
      assignee: z.string().optional().describe("Filter statistics by specific assignee"),
      feature_id: z.string().optional().describe("Filter statistics by specific feature"),
      include_delegation_insights: z.boolean().default(true).describe("Include insights for delegation planning")
    },
  }, async ({ assignee, feature_id, include_delegation_insights }: {
    assignee?: string;
    feature_id?: string;
    include_delegation_insights?: boolean;
  }) => {
    try {
      await memoryManager.initializeProject();

      // Use optimized getTaskStatistics method
      const stats = await memoryManager.getTaskStatistics({
        assignee,
        feature_id
      });

      let delegationInsights = null;
      if (include_delegation_insights) {
        // Get delegation candidates using optimized method
        const candidates = await memoryManager.findDelegationCandidates({
          complexity_threshold: 'medium',
          independence_required: true,
          assignee_filter: assignee,
          exclude_sensitive: true,
          max_estimated_hours: 16
        });

        delegationInsights = {
          delegation_candidates: candidates.length,
          candidate_details: candidates.map((task: any) => ({
            id: task.id,
            title: task.title,
            priority: task.frontmatter.priority,
            estimated_hours: task.frontmatter.estimated_hours,
            tags: task.frontmatter.tags,
            complexity_indicators: task.frontmatter.tags.filter((tag: string) =>
              tag.includes('complex') || tag.includes('simple') || tag.includes('routine')
            )
          })),
          recommended_delegation_strategy: candidates.length > 5 ?
            "High delegation potential - consider parallel execution" :
            candidates.length > 2 ?
            "Moderate delegation potential - selective delegation recommended" :
            "Low delegation potential - focus on direct execution"
        };
      }

      const result = {
        task_statistics: {
          overview: {
            total_tasks: stats.total,
            completion_rate: `${stats.completion_rate.toFixed(1)}%`,
            estimated_hours: stats.estimated_hours,
            actual_hours: stats.actual_hours,
            efficiency_ratio: stats.estimated_hours > 0 ?
              (stats.actual_hours / stats.estimated_hours).toFixed(2) : 'N/A'
          },
          status_breakdown: stats.by_status,
          priority_breakdown: stats.by_priority,
          assignee_breakdown: stats.by_assignee,
          risk_indicators: {
            blocked_tasks: stats.blocked_tasks,
            overdue_tasks: stats.overdue_tasks,
            high_priority_incomplete: stats.by_priority.high + stats.by_priority.urgent -
              (stats.by_status.done > 0 ? Math.floor(stats.by_status.done * 0.3) : 0)
          }
        },
        delegation_insights: delegationInsights,
        recommendations: [
          stats.blocked_tasks > 0 ? `🚨 ${stats.blocked_tasks} blocked tasks need attention` : null,
          stats.overdue_tasks > 0 ? `⏰ ${stats.overdue_tasks} overdue tasks require immediate action` : null,
          stats.completion_rate < 30 ? "📈 Low completion rate - consider task decomposition or delegation" : null,
          delegationInsights && delegationInsights.delegation_candidates > 3 ?
            "🤖 Multiple delegation candidates available - consider parallel execution" : null,
          stats.by_assignee['unassigned'] > 0 ?
            `👤 ${stats.by_assignee['unassigned']} unassigned tasks - consider assignment or delegation` : null
        ].filter(Boolean)
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error getting task statistics: ${error.message}` }] };
    }
  });

  // --- Enhanced Task Management Tools ---
  server.registerTool("create_task", {
    title: "Create Development Task",
    description: "Creates a new development task with full metadata, dependencies, and optional agent delegation configuration. Use when: planning new work items, breaking down features into actionable tasks, setting up development workflows. Supports task prioritization, assignee specification (human or agent), time estimation, and dependency management for comprehensive project tracking.",
    inputSchema: {
      title: z.string().describe("Clear, actionable task title"),
      content: z.string().describe("Detailed task description with acceptance criteria"),
      feature_id: z.string().optional().describe("Parent feature or epic ID"),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
      assignee: z.enum(['human', 'agent']).default('human').describe("Who should execute this task"),
      estimated_hours: z.number().optional().describe("Estimated time to complete in hours"),
      due_date: z.string().optional().describe("Target completion date (ISO format)"),
      dependencies: z.array(z.string()).optional().describe("Array of task IDs that must complete first"),
      tags: z.array(z.string()).optional().describe("Tags for categorization and filtering"),
      context_files: z.array(z.string()).optional().describe("Relevant files for task context")
    },
  }, async ({ title, content, feature_id, priority, assignee, estimated_hours, due_date, dependencies, tags, context_files }: {
    title: string;
    content: string;
    feature_id?: string;
    priority?: string;
    assignee?: string;
    estimated_hours?: number;
    due_date?: string;
    dependencies?: string[];
    tags?: string[];
    context_files?: string[];
  }) => {
    try {
      await memoryManager.initializeProject();

      const taskId = await memoryManager.store({
        type: 'task',
        title,
        content,
        frontmatter: {
          status: 'todo' as any,
          priority: (priority || 'medium') as TaskPriority,
          assignee: assignee || 'human',
          feature_id,
          estimated_hours,
          due_date,
          dependencies: dependencies || [],
          tags: tags || [],
          files_involved: context_files || [],
          created_at: new Date().toISOString()
        }
      });

      // Create relationships if dependencies exist
      if (dependencies && dependencies.length > 0) {
        for (const depId of dependencies) {
          await memoryManager.addRelationship(
            { type: 'task', id: taskId },
            { type: 'task', id: depId },
            { type: 'depends_on', strength: 0.9, confidence: 0.9 }
          );
        }
      }

      return {
        content: [{
          type: "text",
          text: `Task created successfully!\n\nID: ${taskId}\nTitle: ${title}\nAssignee: ${assignee}\nPriority: ${priority}\nStatus: todo`
        }]
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error creating task: ${error.message}` }] };
    }
  });

  server.registerTool("delete_task", {
    title: "Delete Development Task",
    description: "Permanently removes a task from the system and handles dependent tasks appropriately. Use when: tasks become obsolete, requirements change, or duplicates are found. Provides options for handling dependent tasks: fail if dependencies exist, cascade delete, or unlink dependencies for manual review.",
    inputSchema: {
      task_id: z.string().describe("ID of the task to delete"),
      handle_dependencies: z.enum(['cascade', 'unlink', 'fail']).default('fail').describe("How to handle tasks that depend on this one")
    },
  }, async ({ task_id, handle_dependencies }: { task_id: string; handle_dependencies?: string }) => {
    try {
      await memoryManager.initializeProject();

      // Find the task
      const task = await memoryManager.getById('task', task_id);
      if (!task) {
        return { content: [{ type: "text", text: `Task with ID ${task_id} not found` }] };
      }

      // Check for dependent tasks
      const allTasks = await memoryManager.listByType('task');
      const dependentTasks = allTasks.filter((t: any) =>
        t.frontmatter.dependencies && t.frontmatter.dependencies.includes(task_id)
      );

      if (dependentTasks.length > 0 && handle_dependencies === 'fail') {
        const dependentIds = dependentTasks.map((t: any) => `${t.id} (${t.title})`).join(', ');
        return {
          content: [{
            type: "text",
            text: `Cannot delete task: ${dependentTasks.length} tasks depend on it: ${dependentIds}\n\nUse handle_dependencies: 'cascade' or 'unlink' to proceed.`
          }]
        };
      }

      // Handle dependencies
      if (dependentTasks.length > 0) {
        for (const depTask of dependentTasks) {
          if (handle_dependencies === 'cascade') {
            // Delete dependent task too
            await memoryManager.delete('task', depTask.id);
          } else if (handle_dependencies === 'unlink') {
            // Remove dependency reference
            const updatedDeps = depTask.frontmatter.dependencies?.filter((dep: string) => dep !== task_id);

            if(updatedDeps) {
              await memoryManager.update({
                type: 'task',
                id: depTask.id,
                frontmatter: { dependencies: updatedDeps }
              });
            }
          }
        }
      }

      // Delete the task
      await memoryManager.delete('task', task_id);

      return {
        content: [{
          type: "text",
          text: `Task "${task.title}" deleted successfully!\n\nDependencies handled: ${handle_dependencies}\nAffected tasks: ${dependentTasks.length}`
        }]
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error deleting task: ${error.message}` }] };
    }
  });

  server.registerTool("reorder_tasks", {
    title: "Reorder Task Execution Sequence",
    description: "Changes the execution order of tasks within a feature or project scope by updating task priorities and execution metadata. Use when: task priorities change, dependencies are discovered, workflow optimization is needed, or sprint planning requires resequencing. Updates task metadata to reflect new execution order.",
    inputSchema: {
      scope_id: z.string().describe("Feature ID or epic ID to reorder tasks within"),
      task_order: z.array(z.string()).describe("Array of task IDs in desired execution order")
    },
  }, async ({ scope_id, task_order }: { scope_id: string; task_order: string[] }) => {
    try {
      await memoryManager.initializeProject();

      // Get all tasks for the scope
      const allTasks = await memoryManager.listByType('task');
      
      const scopeTasks = allTasks.filter((task: any) =>
        task.frontmatter.feature_id === scope_id || task.frontmatter.epic_id === scope_id
      );

      // Validate that all provided task IDs exist in scope
      const scopeTaskIds = scopeTasks.map((t: any) => t.id);
      const invalidIds = task_order.filter(id => !scopeTaskIds.includes(id));

      if (invalidIds.length > 0) {
        return {
          content: [{
            type: "text",
            text: `Invalid task IDs for scope ${scope_id}: ${invalidIds.join(', ')}`
          }]
        };
      }

      // Update execution order
      const updates = [];
      for (let i = 0; i < task_order.length; i++) {
        const taskId = task_order[i];
        await memoryManager.update({
          type: 'task',
          id: taskId,
          frontmatter: {
            execution_order: i + 1,
            reordered_at: new Date().toISOString()
          }
        });
        updates.push(`${i + 1}. ${taskId}`);
      }

      return {
        content: [{
          type: "text",
          text: `Tasks reordered successfully for scope: ${scope_id}\n\nNew execution order:\n${updates.join('\n')}`
        }]
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error reordering tasks: ${error.message}` }] };
    }
  });
}
