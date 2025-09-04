import { spawn, ChildProcess } from 'child_process';
import { kill } from 'tree-kill';
import { render } from 'ink';
import React from 'react';
import { InkDashboard } from '../components/ink-dashboard';
import type { ProcessConfig } from '../../adapters/framework/concurrent-processes';

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

export class InkProcessManager {
  private processes: ChildProcess[] = [];
  private processConfigs: ProcessConfig[] = [];
  private processLogs: Map<number, ProcessLog[]> = new Map();
  private processStatus: Map<number, ProcessStatus> = new Map();
  private maxLogBuffer = 100;
  private startTime = Date.now();
  private isRunning = false;

  constructor(configs: ProcessConfig[]) {
    this.processConfigs = configs;
    
    // Initialize log buffers and status for each process
    this.processConfigs.forEach((config, index) => {
      this.processLogs.set(index, []);
      this.processStatus.set(index, {
        name: config.name,
        status: 'starting',
        color: config.color || 'white',
        lastActivity: new Date()
      });
    });
  }

  async start(): Promise<void> {
    this.isRunning = true;
    
    // Start all processes
    this.processes = this.processConfigs.map((config, index) => {
      const proc = spawn(config.command, [], {
        cwd: config.cwd || process.cwd(),
        env: { 
          ...process.env, 
          ...config.env,
          IGNITER_INTERACTIVE_MODE: 'true'
        },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      // Update status with PID
      const status = this.processStatus.get(index);
      if (status && proc.pid) {
        status.pid = proc.pid;
        status.status = 'running';
      }

      // Handle process output
      proc.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter((line: string) => line.trim());
        lines.forEach((line: string) => {
          this.addLogEntry(index, 'stdout', line);
        });
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter((line: string) => line.trim());
        lines.forEach((line: string) => {
          this.addLogEntry(index, 'stderr', line);
        });
      });

      proc.on('exit', (code: number | null) => {
        const status = this.processStatus.get(index);
        if (status) {
          status.status = code === 0 ? 'stopped' : 'error';
        }
        this.addLogEntry(index, code === 0 ? 'info' : 'error', `Process exited with code ${code}`);
      });

      proc.on('error', (error: Error) => {
        const status = this.processStatus.get(index);
        if (status) {
          status.status = 'error';
        }
        this.addLogEntry(index, 'error', `Process error: ${error.message}`);
      });

      return proc;
    });

    // Render the Ink dashboard
    const { unmount } = render(
      <InkDashboard
        processes={this.processConfigs}
        processLogs={this.processLogs}
        processStatus={this.processStatus}
        onProcessSwitch={(index) => {
          // Handle process switching if needed
        }}
        onQuit={() => {
          this.cleanup();
          process.exit(0);
        }}
      />
    );

    // Wait for all processes to complete
    await Promise.all(
      this.processes.map(proc => new Promise<void>((resolve) => {
        proc.on('exit', resolve);
      }))
    );

    unmount();
  }

  private addLogEntry(processIndex: number, type: ProcessLog['type'], message: string) {
    const logs = this.processLogs.get(processIndex);
    if (!logs) return;

    const entry: ProcessLog = {
      timestamp: new Date(),
      type,
      message: message.trim(),
      process: this.processConfigs[processIndex].name
    };

    logs.push(entry);
    
    // Keep buffer size manageable
    if (logs.length > this.maxLogBuffer) {
      logs.splice(0, logs.length - this.maxLogBuffer);
    }

    // Update process status
    const status = this.processStatus.get(processIndex);
    if (status) {
      status.lastActivity = new Date();
      if (type === 'error' || type === 'stderr') {
        status.status = 'error';
      } else if (status.status === 'starting') {
        status.status = 'running';
      }
    }
  }

  private cleanup() {
    this.isRunning = false;
    
    // Kill all processes
    this.processes.forEach(proc => {
      if (!proc.killed && proc.pid) {
        kill(proc.pid, 'SIGTERM', (err?: Error) => {
           if (err) {
             // Fallback to force kill if graceful termination fails
             setTimeout(() => {
               if (proc.pid && !proc.killed) {
                 kill(proc.pid, 'SIGKILL');
               }
             }, 5000);
           }
         });
      }
    });
  }
}

export async function runInkInteractiveProcesses(configs: ProcessConfig[]): Promise<void> {
  const manager = new InkProcessManager(configs);
  await manager.start();
}