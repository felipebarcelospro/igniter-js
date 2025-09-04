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

  // Calculate tab indices based on the original structure
  const frameworkTabIndex = 0; // First process (framework)
  const igniterTabIndex = 1; // Second process (Igniter)
  const apiTabIndex = processes.length; // API tab after processes
  const jobsTabIndex = processes.length + 1; // Jobs tab
  const telemetryTabIndex = processes.length + 2; // Telemetry tab
  const liaTabIndex = processes.length + 3; // Lia Dashboard is the last tab
  const totalTabs = processes.length + 4; // +4 for API, Jobs, Telemetry, and Lia Dashboard

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
        setCurrentTab(jobsTabIndex);
        break;
      case 'a':
        // Quick switch to API tab
        setCurrentTab(apiTabIndex);
        break;
      case 't':
        // Quick switch to Telemetry tab
        setCurrentTab(telemetryTabIndex);
        break;
      case 'l':
        // Quick switch to Lia Dashboard
        setCurrentTab(liaTabIndex);
        break;
      case 'f':
        // Quick switch to Framework tab
        setCurrentTab(frameworkTabIndex);
        break;
      case 'i':
        // Quick switch to Igniter tab
        setCurrentTab(igniterTabIndex);
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
        {/* Framework Tab */}
        <Box marginRight={2}>
          <Text 
            color={currentTab === frameworkTabIndex ? 'cyan' : 'green'}
            bold={currentTab === frameworkTabIndex}
          >
            {getTabIcon('framework', currentTab === frameworkTabIndex)} {frameworkTabIndex + 1}. Framework
          </Text>
        </Box>
        
        {/* Igniter Tab */}
        <Box marginRight={2}>
          <Text 
            color={currentTab === igniterTabIndex ? 'cyan' : 'blue'}
            bold={currentTab === igniterTabIndex}
          >
            {getTabIcon('igniter', currentTab === igniterTabIndex)} {igniterTabIndex + 1}. Igniter
          </Text>
        </Box>
        
        {/* API Tab */}
        <Box marginRight={2}>
          <Text 
            color={currentTab === apiTabIndex ? 'cyan' : 'yellow'}
            bold={currentTab === apiTabIndex}
          >
            {getTabIcon('api', currentTab === apiTabIndex)} {apiTabIndex + 1}. API
          </Text>
        </Box>
        
        {/* Jobs Tab */}
        <Box marginRight={2}>
          <Text 
            color={currentTab === jobsTabIndex ? 'cyan' : 'magenta'}
            bold={currentTab === jobsTabIndex}
          >
            {getTabIcon('jobs', currentTab === jobsTabIndex)} {jobsTabIndex + 1}. Jobs
          </Text>
        </Box>
        
        {/* Telemetry Tab */}
        <Box marginRight={2}>
          <Text 
            color={currentTab === telemetryTabIndex ? 'cyan' : 'red'}
            bold={currentTab === telemetryTabIndex}
          >
            {getTabIcon('telemetry', currentTab === telemetryTabIndex)} {telemetryTabIndex + 1}. Telemetry
          </Text>
        </Box>
        
        {/* Lia Dashboard Tab */}
        <Box marginRight={2}>
          <Text 
            color={currentTab === liaTabIndex ? 'cyan' : 'gray'}
            bold={currentTab === liaTabIndex}
          >
            {getTabIcon('lia', currentTab === liaTabIndex)} {liaTabIndex + 1}. Lia
          </Text>
        </Box>
      </Box>

      {/* Content */}
      <Box flexDirection="column" flexGrow={1}>
        {/* Framework Tab */}
        {currentTab === frameworkTabIndex && (
          <ProcessLogView 
            logs={processLogs.get(frameworkTabIndex) || []}
            processName={processes[frameworkTabIndex]?.name || 'Framework'}
          />
        )}
        
        {/* Igniter Tab */}
        {currentTab === igniterTabIndex && (
          <ProcessLogView 
            logs={processLogs.get(igniterTabIndex) || []}
            processName={processes[igniterTabIndex]?.name || 'Igniter'}
          />
        )}
        
        {/* API Tab */}
        {currentTab === apiTabIndex && (
          <ApiView />
        )}
        
        {/* Jobs Tab */}
        {currentTab === jobsTabIndex && (
          <JobsView />
        )}
        
        {/* Telemetry Tab */}
        {currentTab === telemetryTabIndex && (
          <TelemetryView />
        )}
        
        {/* Lia Dashboard Tab */}
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
          1-{totalTabs}: Switch tab | Tab: Next | f/i/a/j/t/l: Quick switch | c: Clear | r: Refresh | h: Help | q: Quit
        </Text>
        <Text color="gray">
          Current: {getCurrentTabName(currentTab)}
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
      <Text color="gray">{'─'.repeat(50)}</Text>
      
      <Text color="white" bold>Navigation:</Text>
      <Text>1-{totalTabs}: Switch between tabs</Text>
      <Text>Tab: Switch to next tab</Text>
      <Text>c: Clear current tab logs</Text>
      <Text>r: Refresh data</Text>
      <Text>h: Show this help</Text>
      <Text>q: Quit dashboard</Text>
      
      <Text color="white" bold marginTop={1}>Quick Access:</Text>
      <Text>f: Framework tab (Next.js, Vite, etc.)</Text>
      <Text>i: Igniter tab (Schema generation)</Text>
      <Text>a: API tab (HTTP requests monitoring)</Text>
      <Text>j: Jobs tab (Background jobs)</Text>
      <Text>t: Telemetry tab (Observability)</Text>
      <Text>l: Lia Dashboard (AI agent monitoring)</Text>
      
      <Text color="white" bold marginTop={1}>Available Tabs:</Text>
      <Text>⚡ 1. Framework - Your app dev server</Text>
      <Text>🔥 2. Igniter - Schema generation & docs</Text>
      <Text>🌐 3. API - HTTP requests monitoring</Text>
      <Text>⚙️ 4. Jobs - Background jobs queue</Text>
      <Text>📊 5. Telemetry - Performance monitoring</Text>
      <Text>🤖 6. Lia - AI agent dashboard</Text>
      
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

function getTabIcon(tabType: string, isActive: boolean): string {
  const activeIcon = isActive ? '●' : '○';
  
  switch (tabType) {
    case 'framework': return '⚡';
    case 'igniter': return '🔥';
    case 'api': return '🌐';
    case 'jobs': return '⚙️';
    case 'telemetry': return '📊';
    case 'lia': return '🤖';
    default: return activeIcon;
  }
}

function getCurrentTabName(currentTab: number): string {
  if (currentTab === 0) return 'Framework';
  if (currentTab === 1) return 'Igniter';
  if (currentTab === 2) return 'API';
  if (currentTab === 3) return 'Jobs';
  if (currentTab === 4) return 'Telemetry';
  if (currentTab === 5) return 'Lia Dashboard';
  return 'Unknown';
}