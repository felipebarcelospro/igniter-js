import React from 'react';
import { Box, Text } from 'ink';
import type { StatusOverviewProps } from '../types';

export function StatusOverview({ metrics, isConnected, lastUpdate }: StatusOverviewProps) {
  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (isConnected: boolean): string => {
    return isConnected ? 'green' : 'red';
  };

  const getStatusIcon = (isConnected: boolean): string => {
    return isConnected ? '🟢' : '🔴';
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Text color="blue" bold>
          📊 Igniter.js Dashboard
        </Text>
        <Text color={getStatusColor(isConnected)}>
          {getStatusIcon(isConnected)} {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
      </Box>

      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Text color="gray">
          Last update: {lastUpdate.toLocaleTimeString()}
        </Text>
        <Text color="gray">
          Uptime: {formatUptime(metrics.performance.uptime)}
        </Text>
      </Box>

      <Box flexDirection="row" justifyContent="space-between">
        <Box flexDirection="column" width="25%">
          <Text color="cyan" bold>TASKS</Text>
          <Text>Total: {metrics.tasks.total}</Text>
          <Text color="green">✅ Done: {metrics.tasks.completed}</Text>
          <Text color="yellow">🔄 In Progress: {metrics.tasks.inProgress}</Text>
          <Text color="red">❌ Failed: {metrics.tasks.failed}</Text>
          <Text color="blue">⏳ Queued: {metrics.tasks.queued}</Text>
        </Box>

        <Box flexDirection="column" width="25%">
          <Text color="cyan" bold>AGENTS</Text>
          {metrics.agents.length > 0 ? (
            metrics.agents.map((agent, index) => (
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
          <Text color="cyan" bold>MEMORY</Text>
          <Text>Total: {metrics.memory.total}</Text>
          <Text>Recent: {metrics.memory.recent.length}</Text>
          <Text color="gray">Top tags:</Text>
          {metrics.memory.topTags.slice(0, 3).map((tag, index) => (
            <Text key={index} color="gray">
              • {tag.tag} ({tag.count})
            </Text>
          ))}
        </Box>

        <Box flexDirection="column" width="25%">
          <Text color="cyan" bold>PERFORMANCE</Text>
          <Text>Success Rate: {Math.round(metrics.performance.successRate * 100)}%</Text>
          <Text>Avg Time: {metrics.performance.averageExecutionTime.toFixed(1)}h</Text>
          <Text color="gray">Memory Types:</Text>
          {Object.entries(metrics.memory.byType).slice(0, 3).map(([type, count]) => (
            <Text key={type} color="gray">
              • {type}: {count}
            </Text>
          ))}
        </Box>
      </Box>
    </Box>
  );
}