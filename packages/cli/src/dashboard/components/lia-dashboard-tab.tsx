import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useDashboardData, useTasks, useMemory } from '../hooks';
import type { TaskFilter, MemoryFilter } from '../types';

interface LiaDashboardTabProps {
  isActive: boolean;
  onTabSwitch?: (tabIndex: number) => void;
}

export function LiaDashboardTab({ isActive, onTabSwitch }: LiaDashboardTabProps) {
  const [currentView, setCurrentView] = useState<'overview' | 'tasks' | 'memory' | 'agents'>('overview');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>({});
  const [memoryFilter, setMemoryFilter] = useState<MemoryFilter>({});
  const [searchQuery, setSearchQuery] = useState('');

  const { data: dashboardData, loading: dashboardLoading, error: dashboardError, refresh: refreshDashboard } = useDashboardData(3000);
  const { tasks, loading: tasksLoading, error: tasksError, refresh: refreshTasks, updateTask } = useTasks(taskFilter);
  const { memories, loading: memoryLoading, error: memoryError, refresh: refreshMemory, search: searchMemory } = useMemory();

  // Handle keyboard input
  useInput((input, key) => {
    if (!isActive) return;

    switch (input.toLowerCase()) {
      case '1':
        setCurrentView('overview');
        break;
      case '2':
        setCurrentView('tasks');
        break;
      case '3':
        setCurrentView('memory');
        break;
      case '4':
        setCurrentView('agents');
        break;
      case 'r':
        refreshDashboard();
        refreshTasks();
        refreshMemory();
        break;
      case 'c':
        setSearchQuery('');
        setTaskFilter({});
        setMemoryFilter({});
        break;
      case 'h':
        setCurrentView('help');
        break;
    }
  });

  if (!isActive) {
    return null;
  }

  return (
    <Box flexDirection="column" height="100%">
      <LiaHeader 
        currentView={currentView} 
        onViewChange={setCurrentView}
        isConnected={dashboardData ? true : false}
        lastUpdate={new Date()}
      />
      
      <Box flexDirection="column" flexGrow={1} padding={1}>
        {currentView === 'overview' && (
          <OverviewView 
            data={dashboardData} 
            loading={dashboardLoading} 
            error={dashboardError}
          />
        )}
        
        {currentView === 'tasks' && (
          <TasksView 
            tasks={tasks}
            loading={tasksLoading}
            error={tasksError}
            onTaskUpdate={updateTask}
            filter={taskFilter}
            onFilterChange={setTaskFilter}
          />
        )}
        
        {currentView === 'memory' && (
          <MemoryView 
            memories={memories}
            loading={memoryLoading}
            error={memoryError}
            filter={memoryFilter}
            onFilterChange={setMemoryFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearch={searchMemory}
          />
        )}
        
        {currentView === 'agents' && (
          <AgentsView 
            agents={dashboardData?.agents || []}
            loading={dashboardLoading}
            error={dashboardError}
          />
        )}
        
        {currentView === 'help' && (
          <HelpView onClose={() => setCurrentView('overview')} />
        )}
      </Box>
      
      <LiaFooter currentView={currentView} />
    </Box>
  );
}

function LiaHeader({ 
  currentView, 
  onViewChange, 
  isConnected, 
  lastUpdate 
}: {
  currentView: string;
  onViewChange: (view: string) => void;
  isConnected: boolean;
  lastUpdate: Date;
}) {
  const views = [
    { key: 'overview', label: 'Overview', number: '1' },
    { key: 'tasks', label: 'Tasks', number: '2' },
    { key: 'memory', label: 'Memory', number: '3' },
    { key: 'agents', label: 'Agents', number: '4' },
  ];

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Text color="blue" bold>
          🤖 Lia Dashboard
        </Text>
        <Text color={isConnected ? 'green' : 'red'}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </Text>
      </Box>

      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Text color="gray">
          Last update: {lastUpdate.toLocaleTimeString()}
        </Text>
        <Text color="gray">
          Press h for help
        </Text>
      </Box>

      <Box flexDirection="row" marginBottom={1}>
        {views.map((view) => (
          <Box key={view.key} marginRight={2}>
            <Text 
              color={currentView === view.key ? 'cyan' : 'gray'}
              bold={currentView === view.key}
            >
              {view.number}. {view.label}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function OverviewView({ data, loading, error }: {
  data: any;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return <Text color="yellow">Loading dashboard data...</Text>;
  }

  if (error) {
    return <Text color="red">Error: {error}</Text>;
  }

  if (!data) {
    return <Text color="gray">No data available</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>📊 Overview</Text>
      <Text color="gray">{'─'.repeat(40)}</Text>
      
      <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
        <Box flexDirection="column" width="25%">
          <Text color="green" bold>TASKS</Text>
          <Text>Total: {data.tasks.total}</Text>
          <Text color="green">✅ Done: {data.tasks.completed}</Text>
          <Text color="yellow">🔄 In Progress: {data.tasks.inProgress}</Text>
          <Text color="red">❌ Failed: {data.tasks.failed}</Text>
          <Text color="blue">⏳ Queued: {data.tasks.queued}</Text>
        </Box>

        <Box flexDirection="column" width="25%">
          <Text color="green" bold>AGENTS</Text>
          {data.agents.length > 0 ? (
            data.agents.map((agent: any, index: number) => (
              <Box key={index} flexDirection="row" justifyContent="space-between">
                <Text color={agent.isActive ? 'green' : 'gray'}>
                  {agent.isActive ? '🟢' : '⚪'} {agent.name}
                </Text>
                <Text color="gray">
                  {Math.round(agent.successRate * 100)}%
                </Text>
              </Box>
            ))
          ) : (
            <Text color="gray">No agents active</Text>
          )}
        </Box>

        <Box flexDirection="column" width="25%">
          <Text color="green" bold>MEMORY</Text>
          <Text>Total: {data.memory.total}</Text>
          <Text>Recent: {data.memory.recent.length}</Text>
          <Text color="gray">Top tags:</Text>
          {data.memory.topTags.slice(0, 3).map((tag: any, index: number) => (
            <Text key={index} color="gray">
              • {tag.tag} ({tag.count})
            </Text>
          ))}
        </Box>

        <Box flexDirection="column" width="25%">
          <Text color="green" bold>PERFORMANCE</Text>
          <Text>Success Rate: {Math.round(data.performance.successRate * 100)}%</Text>
          <Text>Avg Time: {data.performance.averageExecutionTime.toFixed(1)}h</Text>
          <Text color="gray">Memory Types:</Text>
          {Object.entries(data.memory.byType).slice(0, 3).map(([type, count]: [string, any]) => (
            <Text key={type} color="gray">
              • {type}: {count}
            </Text>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function TasksView({ 
  tasks, 
  loading, 
  error, 
  onTaskUpdate, 
  filter, 
  onFilterChange 
}: {
  tasks: any[];
  loading: boolean;
  error: string | null;
  onTaskUpdate: (taskId: string, updates: any) => void;
  filter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
}) {
  if (loading) {
    return <Text color="yellow">Loading tasks...</Text>;
  }

  if (error) {
    return <Text color="red">Error: {error}</Text>;
  }

  const visibleTasks = tasks.slice(0, 15);

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>📋 Tasks</Text>
      <Text color="gray">{'─'.repeat(40)}</Text>
      
      {visibleTasks.length === 0 ? (
        <Text color="gray">No tasks found</Text>
      ) : (
        visibleTasks.map((task, index) => (
          <Box key={task.id} flexDirection="row" justifyContent="space-between" marginTop={1}>
            <Box flexDirection="column" width="70%">
              <Text color="white">{task.title}</Text>
              <Text color="gray">ID: {task.id}</Text>
            </Box>
            <Box flexDirection="column" width="30%" alignItems="flex-end">
              <Text color={getStatusColor(task.status)}>
                {getStatusIcon(task.status)} {task.status}
              </Text>
              {task.delegationStatus && (
                <Text color="blue">
                  {getDelegationIcon(task.delegationStatus)} {task.delegationStatus}
                </Text>
              )}
              {task.agent && (
                <Text color="gray">Agent: {task.agent}</Text>
              )}
            </Box>
          </Box>
        ))
      )}
    </Box>
  );
}

function MemoryView({ 
  memories, 
  loading, 
  error, 
  filter, 
  onFilterChange, 
  searchQuery, 
  onSearchChange, 
  onSearch 
}: {
  memories: any[];
  loading: boolean;
  error: string | null;
  filter: MemoryFilter;
  onFilterChange: (filter: MemoryFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: (query: string) => void;
}) {
  if (loading) {
    return <Text color="yellow">Loading memories...</Text>;
  }

  if (error) {
    return <Text color="red">Error: {error}</Text>;
  }

  const visibleMemories = memories.slice(0, 15);

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>🧠 Memory</Text>
      <Text color="gray">{'─'.repeat(40)}</Text>
      
      {visibleMemories.length === 0 ? (
        <Text color="gray">No memories found</Text>
      ) : (
        visibleMemories.map((memory, index) => (
          <Box key={memory.id} flexDirection="row" justifyContent="space-between" marginTop={1}>
            <Box flexDirection="column" width="70%">
              <Text color="white">{memory.title}</Text>
              <Text color="gray">Type: {memory.type}</Text>
              <Text color="gray">ID: {memory.id}</Text>
            </Box>
            <Box flexDirection="column" width="30%" alignItems="flex-end">
              <Text color="blue">
                {memory.frontmatter.confidence ? 
                  `Confidence: ${Math.round(memory.frontmatter.confidence * 100)}%` : 
                  'No confidence'
                }
              </Text>
              <Text color="gray">
                {new Date(memory.frontmatter.updated_at).toLocaleDateString()}
              </Text>
            </Box>
          </Box>
        ))
      )}
    </Box>
  );
}

function AgentsView({ agents, loading, error }: {
  agents: any[];
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return <Text color="yellow">Loading agents...</Text>;
  }

  if (error) {
    return <Text color="red">Error: {error}</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>🤖 Agents</Text>
      <Text color="gray">{'─'.repeat(40)}</Text>
      
      {agents.length === 0 ? (
        <Text color="gray">No agents found</Text>
      ) : (
        agents.map((agent, index) => (
          <Box key={agent.name} flexDirection="column" marginTop={1}>
            <Box flexDirection="row" justifyContent="space-between">
              <Text color="white" bold>{agent.name}</Text>
              <Text color={agent.isActive ? 'green' : 'gray'}>
                {agent.isActive ? '🟢 Active' : '⚪ Inactive'}
              </Text>
            </Box>
            <Text color="gray">
              Success Rate: {Math.round(agent.successRate * 100)}% 
              ({agent.completedTasks}/{agent.totalTasks} tasks)
            </Text>
            {agent.currentTask && (
              <Text color="blue">Current Task: {agent.currentTask}</Text>
            )}
            {agent.lastActivity && (
              <Text color="gray">
                Last Activity: {new Date(agent.lastActivity).toLocaleString()}
              </Text>
            )}
          </Box>
        ))
      )}
    </Box>
  );
}

function HelpView({ onClose }: { onClose: () => void }) {
  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>❓ Help</Text>
      <Text color="gray">{'─'.repeat(40)}</Text>
      
      <Text color="white" bold>Navigation:</Text>
      <Text>1-4: Switch between views</Text>
      <Text>r: Refresh all data</Text>
      <Text>c: Clear filters</Text>
      <Text>h: Show this help</Text>
      <Text>q: Quit dashboard</Text>
      
      <Text color="white" bold marginTop={1}>Views:</Text>
      <Text>1. Overview - General dashboard statistics</Text>
      <Text>2. Tasks - Task management and status</Text>
      <Text>3. Memory - Memory exploration and search</Text>
      <Text>4. Agents - Agent status and performance</Text>
      
      <Text color="gray" marginTop={1}>Press any key to close help</Text>
    </Box>
  );
}

function LiaFooter({ currentView }: { currentView: string }) {
  const shortcuts = [
    '1-4: Switch view',
    'r: Refresh',
    'c: Clear',
    'h: Help',
    'q: Quit'
  ];
  
  return (
    <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
      <Text color="gray">{shortcuts.join(' | ')}</Text>
      <Text color="gray">Current: {currentView}</Text>
    </Box>
  );
}

// Helper functions
function getStatusColor(status: string): string {
  switch (status) {
    case 'done': return 'green';
    case 'in_progress': return 'yellow';
    case 'todo': return 'blue';
    case 'blocked': return 'red';
    case 'testing': return 'cyan';
    case 'cancelled': return 'gray';
    default: return 'white';
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'done': return '✅';
    case 'in_progress': return '🔄';
    case 'todo': return '📝';
    case 'blocked': return '🚫';
    case 'testing': return '🧪';
    case 'cancelled': return '❌';
    default: return '○';
  }
}

function getDelegationIcon(status: string): string {
  switch (status) {
    case 'queued': return '⏳';
    case 'running': return '🔄';
    case 'completed': return '✅';
    case 'failed': return '❌';
    case 'cancelled': return '⏹️';
    default: return '○';
  }
}