import { spawn, ChildProcess } from 'child_process';
import { createDefaultMemoryManager } from '@igniter-js/mcp-server';
import type { MemoryItem, MemoryType, SearchQuery } from '@igniter-js/mcp-server';
import type { TaskSummary, AgentStatus, MemoryStats, DashboardMetrics } from '../types';

export class MCPClient {
  private memoryManager: any;
  private isConnected = false;
  private connectionError?: string;

  constructor() {
    this.memoryManager = createDefaultMemoryManager();
  }

  async connect(): Promise<void> {
    try {
      await this.memoryManager.initializeProject();
      this.isConnected = true;
      this.connectionError = undefined;
    } catch (error) {
      this.isConnected = false;
      this.connectionError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  isConnectedToMCP(): boolean {
    return this.isConnected;
  }

  getConnectionError(): string | undefined {
    return this.connectionError;
  }

  async getTasks(): Promise<TaskSummary[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP Server');
    }

    try {
      const tasks = await this.memoryManager.listByType('task');
      return tasks.map((task: MemoryItem): TaskSummary => ({
        id: task.id,
        title: task.title,
        status: task.frontmatter.status || 'todo',
        delegationStatus: task.frontmatter.delegation_status,
        progress: task.frontmatter.delegation_progress,
        agent: task.frontmatter.delegated_to,
        startedAt: task.frontmatter.delegation_started_at,
        completedAt: task.frontmatter.delegation_completed_at,
        priority: task.frontmatter.priority || 'medium',
        estimatedHours: task.frontmatter.estimated_hours,
        actualHours: task.frontmatter.actual_hours,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMemories(type?: MemoryType): Promise<MemoryItem[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP Server');
    }

    try {
      if (type) {
        return await this.memoryManager.listByType(type);
      } else {
        // Get all memory types
        const allMemories: MemoryItem[] = [];
        const memoryTypes = ['code_pattern', 'architectural_decision', 'user_preference', 'insight', 'relationship_map', 'reflection', 'bug_pattern', 'performance_insight', 'api_mapping', 'requirement', 'design', 'task', 'bug_report'];
        
        for (const memoryType of memoryTypes) {
          const memories = await this.memoryManager.listByType(memoryType);
          allMemories.push(...memories);
        }
        
        return allMemories;
      }
    } catch (error) {
      throw new Error(`Failed to fetch memories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchMemories(query: SearchQuery): Promise<MemoryItem[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP Server');
    }

    try {
      const results = await this.memoryManager.search(query);
      return results.map((result: any) => result.memory);
    } catch (error) {
      throw new Error(`Failed to search memories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMemoryById(type: MemoryType, id: string): Promise<MemoryItem | null> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP Server');
    }

    try {
      return await this.memoryManager.getById(type, id);
    } catch (error) {
      throw new Error(`Failed to fetch memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateTask(taskId: string, updates: Partial<TaskSummary>): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP Server');
    }

    try {
      const task = await this.memoryManager.getById('task', taskId);
      if (!task) {
        throw new Error(`Task with ID ${taskId} not found`);
      }

      const frontmatterUpdates: any = {};
      if (updates.status) frontmatterUpdates.status = updates.status;
      if (updates.priority) frontmatterUpdates.priority = updates.priority;
      if (updates.estimatedHours) frontmatterUpdates.estimated_hours = updates.estimatedHours;
      if (updates.actualHours) frontmatterUpdates.actual_hours = updates.actualHours;

      await this.memoryManager.update({
        type: 'task',
        id: taskId,
        frontmatter: frontmatterUpdates
      });
    } catch (error) {
      throw new Error(`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP Server');
    }

    try {
      const tasks = await this.getTasks();
      const memories = await this.getMemories();

      // Calculate task metrics
      const taskMetrics = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'done').length,
        inProgress: tasks.filter(t => t.status === 'in_progress' || t.delegationStatus === 'running').length,
        failed: tasks.filter(t => t.delegationStatus === 'failed').length,
        queued: tasks.filter(t => t.delegationStatus === 'queued').length,
      };

      // Calculate agent status
      const agentTasks = tasks.filter(t => t.agent);
      const agentMap = new Map<string, AgentStatus>();
      
      agentTasks.forEach(task => {
        if (!task.agent) return;
        
        if (!agentMap.has(task.agent)) {
          agentMap.set(task.agent, {
            name: task.agent,
            isActive: task.delegationStatus === 'running',
            currentTask: task.delegationStatus === 'running' ? task.id : undefined,
            lastActivity: task.startedAt,
            successRate: 0,
            totalTasks: 0,
            completedTasks: 0,
          });
        }

        const agent = agentMap.get(task.agent)!;
        agent.totalTasks++;
        if (task.status === 'done') agent.completedTasks++;
        if (task.delegationStatus === 'running') {
          agent.isActive = true;
          agent.currentTask = task.id;
        }
      });

      // Calculate success rates
      agentMap.forEach(agent => {
        agent.successRate = agent.totalTasks > 0 ? agent.completedTasks / agent.totalTasks : 0;
      });

      // Calculate memory stats
      const memoryStats: MemoryStats = {
        total: memories.length,
        byType: memories.reduce((acc, memory) => {
          acc[memory.type] = (acc[memory.type] || 0) + 1;
          return acc;
        }, {} as Record<MemoryType, number>),
        recent: memories
          .sort((a, b) => new Date(b.frontmatter.updated_at).getTime() - new Date(a.frontmatter.updated_at).getTime())
          .slice(0, 10),
        topTags: this.calculateTopTags(memories),
      };

      // Calculate performance metrics
      const completedTasks = tasks.filter(t => t.status === 'done' && t.actualHours);
      const averageExecutionTime = completedTasks.length > 0 
        ? completedTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0) / completedTasks.length
        : 0;

      const successRate = taskMetrics.total > 0 ? taskMetrics.completed / taskMetrics.total : 0;

      return {
        tasks: taskMetrics,
        agents: Array.from(agentMap.values()),
        memory: memoryStats,
        performance: {
          averageExecutionTime,
          successRate,
          uptime: process.uptime(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private calculateTopTags(memories: MemoryItem[]): Array<{ tag: string; count: number }> {
    const tagCount = new Map<string, number>();
    
    memories.forEach(memory => {
      memory.frontmatter.tags.forEach(tag => {
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCount.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.connectionError = undefined;
  }
}

// Singleton instance
export const mcpClient = new MCPClient();