import type { MemoryItem, MemoryType, TaskStatus, TaskPriority } from '@igniter-js/mcp-server';

// Re-export MCP Server types for convenience
export type { MemoryItem, MemoryType, TaskStatus, TaskPriority };

// Dashboard specific types
export interface DashboardState {
  isConnected: boolean;
  lastUpdate: Date;
  error?: string;
}

export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  delegationStatus?: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: string;
  agent?: string;
  startedAt?: string;
  completedAt?: string;
  priority: TaskPriority;
  estimatedHours?: number;
  actualHours?: number;
}

export interface AgentStatus {
  name: string;
  isActive: boolean;
  currentTask?: string;
  lastActivity?: string;
  successRate: number;
  totalTasks: number;
  completedTasks: number;
}

export interface MemoryStats {
  total: number;
  byType: Record<MemoryType, number>;
  recent: MemoryItem[];
  topTags: Array<{ tag: string; count: number }>;
}

export interface DashboardMetrics {
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    failed: number;
    queued: number;
  };
  agents: AgentStatus[];
  memory: MemoryStats;
  performance: {
    averageExecutionTime: number;
    successRate: number;
    uptime: number;
  };
}

export interface DashboardConfig {
  refreshInterval: number;
  maxTasksDisplay: number;
  showCompletedTasks: boolean;
  autoRefresh: boolean;
  theme: 'default' | 'dark' | 'light';
}

export interface MemoryFilter {
  type?: MemoryType;
  tags?: string[];
  dateRange?: [Date, Date];
  search?: string;
  includeSensitive?: boolean;
}

export interface TaskFilter {
  status?: TaskStatus[];
  agent?: string[];
  priority?: TaskPriority[];
  dateRange?: [Date, Date];
  search?: string;
}

// Component props types
export interface DashboardProps {
  config?: Partial<DashboardConfig>;
  onTaskSelect?: (task: TaskSummary) => void;
  onMemorySelect?: (memory: MemoryItem) => void;
}

export interface TaskListProps {
  tasks: TaskSummary[];
  onTaskSelect?: (task: TaskSummary) => void;
  onTaskAction?: (taskId: string, action: 'pause' | 'resume' | 'cancel') => void;
  filter?: TaskFilter;
}

export interface MemoryExplorerProps {
  memories: MemoryItem[];
  onMemorySelect?: (memory: MemoryItem) => void;
  filter?: MemoryFilter;
}

export interface StatusOverviewProps {
  metrics: DashboardMetrics;
  isConnected: boolean;
  lastUpdate: Date;
}

// Hook return types
export interface UseDashboardDataReturn {
  data: DashboardMetrics | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface UseTasksReturn {
  tasks: TaskSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateTask: (taskId: string, updates: Partial<TaskSummary>) => Promise<void>;
}

export interface UseMemoryReturn {
  memories: MemoryItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  search: (query: string) => Promise<void>;
  filter: (filter: MemoryFilter) => Promise<void>;
}