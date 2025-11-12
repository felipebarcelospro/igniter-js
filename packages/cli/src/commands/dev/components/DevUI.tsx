import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warn';
  message: string;
  timestamp: Date;
}

interface DevUIProps {
  igniterLogs: LogEntry[];
  appLogs: LogEntry[];
  onExit: () => void;
}

function DevUI({ igniterLogs, appLogs, onExit }: DevUIProps) {
  const [activeTab, setActiveTab] = useState<'igniter' | 'app'>('igniter');

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      onExit();
      return;
    }
    
    if (key.leftArrow || input === '1') {
      setActiveTab('igniter');
    }
    
    if (key.rightArrow || input === '2') {
      setActiveTab('app');
    }
  });

  const formatLogEntry = (entry: LogEntry): string => {
    const time = entry.timestamp.toLocaleTimeString();
    const prefix = {
      info: 'ℹ',
      success: '✓',
      error: '✗',
      warn: '⚠',
    }[entry.type];
    
    return `[${time}] ${prefix} ${entry.message}`;
  };

  const renderLogs = (logs: LogEntry[], maxLines: number = 50) => {
    const visibleLogs = logs.slice(-maxLines);
    return (
      <Box flexDirection="column">
        {visibleLogs.length === 0 ? (
          <Text dimColor>No logs yet...</Text>
        ) : (
          visibleLogs.map((log, index) => {
            const color = {
              info: 'cyan',
              success: 'green',
              error: 'red',
              warn: 'yellow',
            }[log.type];
            
            return (
              <Text key={`${log.timestamp.getTime()}-${index}`} color={color}>
                {formatLogEntry(log)}
              </Text>
            );
          })
        )}
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Igniter.js Development Mode</Text>
      </Box>
      
      {/* Custom Tabs */}
      <Box flexDirection="row">
        <Box
          borderStyle={activeTab === 'igniter' ? 'round' : 'single'}
          borderColor={activeTab === 'igniter' ? 'cyan' : 'gray'}
          paddingX={1}
          marginRight={1}
        >
          <Text color={activeTab === 'igniter' ? 'cyan' : 'gray'} bold={activeTab === 'igniter'}>
            Igniter.js
          </Text>
        </Box>
        <Box
          borderStyle={activeTab === 'app' ? 'round' : 'single'}
          borderColor={activeTab === 'app' ? 'green' : 'gray'}
          paddingX={1}
        >
          <Text color={activeTab === 'app' ? 'green' : 'gray'} bold={activeTab === 'app'}>
            Application
          </Text>
        </Box>
      </Box>
      
      <Box marginTop={1} borderStyle="round" paddingX={1} minHeight={20}>
        {activeTab === 'igniter' ? (
          <Box flexDirection="column">
            <Text bold color="cyan">
              Igniter.js Logs ({igniterLogs.length})
            </Text>
            <Box marginTop={1}>
              {renderLogs(igniterLogs)}
            </Box>
          </Box>
        ) : (
          <Box flexDirection="column">
            <Text bold color="green">
              Application Logs ({appLogs.length})
            </Text>
            <Box marginTop={1}>
              {renderLogs(appLogs)}
            </Box>
          </Box>
        )}
      </Box>
      
      <Box marginTop={1}>
        <Text dimColor>
          Press <Text bold>1</Text> or <Text bold>←</Text> for Igniter.js |{' '}
          <Text bold>2</Text> or <Text bold>→</Text> for Application |{' '}
          <Text bold>Ctrl+C</Text> or <Text bold>ESC</Text> to exit
        </Text>
      </Box>
    </Box>
  );
}

export default DevUI;
