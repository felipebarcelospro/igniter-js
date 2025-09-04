import { useState, useEffect, useCallback } from 'react';
import { mcpClient } from '../services/mcp-client';
import type { TaskSummary, UseTasksReturn, TaskFilter } from '../types';

export function useTasks(filter?: TaskFilter): UseTasksReturn {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setError(null);
      const allTasks = await mcpClient.getTasks();
      
      // Apply filters
      let filteredTasks = allTasks;
      
      if (filter) {
        if (filter.status && filter.status.length > 0) {
          filteredTasks = filteredTasks.filter(task => filter.status!.includes(task.status));
        }
        
        if (filter.agent && filter.agent.length > 0) {
          filteredTasks = filteredTasks.filter(task => task.agent && filter.agent!.includes(task.agent));
        }
        
        if (filter.priority && filter.priority.length > 0) {
          filteredTasks = filteredTasks.filter(task => filter.priority!.includes(task.priority));
        }
        
        if (filter.search) {
          const searchLower = filter.search.toLowerCase();
          filteredTasks = filteredTasks.filter(task => 
            task.title.toLowerCase().includes(searchLower) ||
            task.id.toLowerCase().includes(searchLower)
          );
        }
        
        if (filter.dateRange) {
          const [startDate, endDate] = filter.dateRange;
          filteredTasks = filteredTasks.filter(task => {
            if (!task.startedAt) return false;
            const taskDate = new Date(task.startedAt);
            return taskDate >= startDate && taskDate <= endDate;
          });
        }
      }
      
      setTasks(filteredTasks);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchTasks();
  }, [fetchTasks]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<TaskSummary>) => {
    try {
      setError(null);
      await mcpClient.updateTask(taskId, updates);
      
      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, ...updates } : task
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      setError(errorMessage);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    refresh,
    updateTask,
  };
}