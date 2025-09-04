import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { LiaDashboardTab } from './lia-dashboard-tab';

interface ProcessLog {
  timestamp: Date;
  type: 'stdout' | 'stderr' | 'info' | 'error' | 'success' | 'warn';
  message: string;
  process: string;
}

interface ProcessStatus {
  name: string;
  status: 'starting' | 'running' | 'error' | 'stopped';
  pid?: number;
  uptime?: string;
  lastActivity?: Date;
  color: string;
}

interface InkDashboardProps {
  processes: Array<{
    name: string;
    command: string;
    color?: string;
    cwd?: string;
    env?: Record<string, string>;
  }>;
  processLogs: Map<number, ProcessLog[]>;
  processStatus: Map<number, ProcessStatus>;
  onProcessSwitch?: (index: number) => void;
  onQuit?: () => void;
}

export function InkDashboard({ 
  processes, 
  processLogs, 
  processStatus, 
  onProcessSwitch,
  onQuit 
}: InkDashboardProps) {
  const [currentTab, setCurrentTab] = useState(0);
  const [startTime] = useState(Date.now());

  // Calculate total tabs: processes + API + Jobs + Telemetry + Lia Dashboard
  const totalTabs = processes.length + 4; // +4 for API, Jobs, Telemetry, and Lia Dashboard
  const liaTabIndex = totalTabs - 1; // Lia Dashboard is the last tab

  // Handle keyboard input
  useInput((input, key) => {
    switch (input.toLowerCase()) {
      case 'q':
        onQuit?.();
        break;
      case 'h':
        setCurrentTab(-1); // Show help
        break;
      case 'c':
        // Clear current tab logs
        if (currentTab >= 0 && currentTab < processes.length) {
          processLogs.set(currentTab, []);
        }
        break;
      case 'r':
        // Refresh - no action needed as data updates automatically
        break;
      case 'j':
        // Quick switch to Jobs tab
        setCurrentTab(processes.length + 2);
        break;
      case 's':
        // Quick switch to Store/API tab
        setCurrentTab(processes.length);
        break;
      case 't':
        // Quick switch to Telemetry tab
        setCurrentTab(processes.length + 1);
        break;
      case 'l':
        // Quick switch to Lia Dashboard
        setCurrentTab(liaTabIndex);
        break;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
        const tabIndex = parseInt(input) - 1;
        if (tabIndex >= 0 && tabIndex < totalTabs) {
          setCurrentTab(tabIndex);
          onProcessSwitch?.(tabIndex);
        }
        break;
    }

    if (key.tab) {
      // Switch to next tab
      setCurrentTab((prev) => (prev + 1) % totalTabs);
      onProcessSwitch?.((currentTab + 1) % totalTabs);
    }
  });

  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running': return 'green';
      case 'error': return 'red';
      case 'starting': return 'yellow';
      case 'stopped': return 'gray';
      default: return 'white';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'running': return '●';
      case 'error': return '✗';
      case 'starting': return '○';
      case 'stopped': return '○';
      default: return '○';
    }
  };

  if (currentTab === -1) {
    return <HelpView onClose={() => setCurrentTab(0)} totalTabs={totalTabs} />;
  }

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box flexDirection="column" marginBottom={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text color="blue" bold>
            Igniter.js Development Dashboard
          </Text>
          <Text color="gray">
            Uptime: {formatUptime(Date.now() - startTime)}
          </Text>
        </Box>
        
        <Text color="gray">
          Press h for help | Press q to quit
        </Text>
      </Box>

      {/* Tabs */}
      <Box flexDirection="row" marginBottom={1}>
        {processes.map((process, index) => {
          const status = processStatus.get(index);
          const isActive = currentTab === index;
          const statusColor = status ? getStatusColor(status.status) : 'gray';
          const statusIcon = status ? getStatusIcon(status.status) : '○';
          
          return (
            <Box key={index} marginRight={2}>
              <Text 
                color={isActive ? 'cyan' : statusColor}
                bold={isActive}
              >
                {statusIcon} {index + 1}. {process.name}
              </Text>
            </Box>
          );
        })}
        
        {/* API Tab */}
        <Box marginRight={2}>
          <Text 
            color={currentTab === processes.length ? 'cyan' : 'green'}
            bold={currentTab === processes.length}
          >
            ● {processes.length + 1}. API
          </Text>
        </Box>
        
        {/* Jobs Tab */}
        <Box marginRight={2}>
          <Text 
            color={currentTab === processes.length + 1 ? 'cyan' : 'blue'}
            bold={currentTab === processes.length + 1}
          >
            ● {processes.length + 2}. Jobs
          </Text>
        </Box>
        
        {/* Telemetry Tab */}
        <Box marginRight={2}>
          <Text 
            color={currentTab === processes.length + 2 ? 'cyan' : 'magenta'}
            bold={currentTab === processes.length + 2}
          >
            ● {processes.length + 3}. Telemetry
          </Text>
        </Box>
        
        {/* Lia Dashboard Tab */}
        <Box marginRight={2}>
          <Text 
            color={currentTab === liaTabIndex ? 'cyan' : 'yellow'}
            bold={currentTab === liaTabIndex}
          >
            🤖 {liaTabIndex + 1}. Lia Dashboard
          </Text>
        </Box>
      </Box>

      {/* Content */}
      <Box flexDirection="column" flexGrow={1}>
        {currentTab < processes.length && (
          <ProcessLogView 
            logs={processLogs.get(currentTab) || []}
            processName={processes[currentTab]?.name || 'Unknown'}
          />
        )}
        
        {currentTab === processes.length && (
          <ApiView />
        )}
        
        {currentTab === processes.length + 1 && (
          <JobsView />
        )}
        
        {currentTab === processes.length + 2 && (
          <TelemetryView />
        )}
        
        {currentTab === liaTabIndex && (
          <LiaDashboardTab 
            isActive={true}
            onTabSwitch={setCurrentTab}
          />
        )}
      </Box>

      {/* Footer */}
      <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
        <Text color="gray">
          1-{totalTabs}: Switch tab | Tab: Next | c: Clear | r: Refresh | h: Help | q: Quit
        </Text>
        <Text color="gray">
          Current: {currentTab < processes.length ? processes[currentTab]?.name : 
                   currentTab === processes.length ? 'API' :
                   currentTab === processes.length + 1 ? 'Jobs' :
                   currentTab === processes.length + 2 ? 'Telemetry' :
                   'Lia Dashboard'}
        </Text>
      </Box>
    </Box>
  );
}

function ProcessLogView({ logs, processName }: { logs: ProcessLog[]; processName: string }) {
  const visibleLogs = logs.slice(-15);

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>{processName} Logs</Text>
      <Text color="gray">{'─'.repeat(40)}</Text>
      
      {visibleLogs.length === 0 ? (
        <Text color="gray">No logs yet...</Text>
      ) : (
        visibleLogs.map((log, index) => (
          <Box key={index} flexDirection="row" marginTop={1}>
            <Text color="gray">
              {log.timestamp.toLocaleTimeString()}
            </Text>
            <Text color="white" marginLeft={1}>
              {getLogIcon(log.type)}
            </Text>
            <Text color="white" marginLeft={1}>
              {log.message}
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
}

function ApiView() {
  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>API Requests</Text>
      <Text color="gray">{'─'.repeat(40)}</Text>
      <Text color="gray">API monitoring will be implemented here</Text>
    </Box>
  );
}

function JobsView() {
  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>Background Jobs</Text>
      <Text color="gray">{'─'.repeat(40)}</Text>
      <Text color="gray">Job monitoring will be implemented here</Text>
    </Box>
  );
}

function TelemetryView() {
  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>Telemetry Dashboard</Text>
      <Text color="gray">{'─'.repeat(40)}</Text>
      <Text color="gray">Telemetry monitoring will be implemented here</Text>
    </Box>
  );
}

function HelpView({ onClose, totalTabs }: { onClose: () => void; totalTabs: number }) {
  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>❓ Help</Text>
      <Text color="gray">{'─'.repeat(40)}</Text>
      
      <Text color="white" bold>Navigation:</Text>
      <Text>1-{totalTabs}: Switch between tabs</Text>
      <Text>Tab: Switch to next tab</Text>
      <Text>c: Clear current tab logs</Text>
      <Text>r: Refresh data</Text>
      <Text>h: Show this help</Text>
      <Text>q: Quit dashboard</Text>
      
      <Text color="white" bold marginTop={1}>Quick Access:</Text>
      <Text>j: Jump to Jobs tab</Text>
      <Text>s: Jump to Store/API tab</Text>
      <Text>t: Jump to Telemetry tab</Text>
      <Text>l: Jump to Lia Dashboard</Text>
      
      <Text color="gray" marginTop={1}>Press any key to close help</Text>
    </Box>
  );
}

function getLogIcon(type: string): string {
  switch (type) {
    case 'success': return '◆';
    case 'error': case 'stderr': return '◇';
    case 'warn': return '◇';
    case 'info': return '◇';
    default: return '○';
  }
}