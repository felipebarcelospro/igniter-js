import concurrently, { ConcurrentlyResult } from 'concurrently';
import { createChildLogger, formatError } from '../logger';
import { SupportedFramework } from './framework-detector';
import readline from 'readline';
import { ChildProcess } from 'child_process';
import spawn from 'cross-spawn';
import kill from 'tree-kill';
import * as fs from 'fs';
import * as path from 'path';

export interface ProcessConfig {
  name: string;
  command: string;
  color?: string;
  cwd?: string;
  env?: Record<string, string>;
}

export interface ConcurrentProcessesOptions {
  processes: ProcessConfig[];
  /**
   * Kill all processes when one fails
   * @default true
   */
  killOthers?: boolean;
  /**
   * Prefix type for process identification
   * @default 'name'
   */
  prefixFormat?: 'name' | 'pid' | 'index' | 'time';
  /**
   * Colorize prefixes
   * @default true
   */
  prefixColors?: boolean;
  /**
   * Maximum length for process name prefix
   * @default 10
   */
  prefixLength?: number;
  /**
   * Custom prefix template
   */
  prefix?: string;
  /**
   * Enable interactive mode for switching between processes
   * @default false
   */
  interactive?: boolean;
}

/**
 * Color palette for different process types
 */
const PROCESS_COLORS = {
  igniter: 'blue',
  nextjs: 'green', 
  vite: 'yellow',
  nuxt: 'cyan',
  sveltekit: 'magenta',
  remix: 'red',
  astro: 'white',
  generic: 'gray'
} as const;

/**
 * ANSI color codes for terminal output
 */
const ANSI_COLORS = {
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
} as const;

/**
 * Simplified tab colors - only 3 states
 */
const TAB_COLORS = {
  active: ANSI_COLORS.blue,
  default: ANSI_COLORS.dim,
  failed: ANSI_COLORS.red
} as const;

/**
 * Log entry for process buffer
 */
interface ProcessLogEntry {
  timestamp: Date;
  type: 'stdout' | 'stderr' | 'info' | 'error' | 'success' | 'warn';
  message: string;
  process: string;
}

/**
 * HTTP Request entry for API monitoring
 */
interface ApiRequestEntry {
  timestamp: Date;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  ip: string;
  userAgent?: string;
  bodySize?: number;
  controller?: string;
  action?: string;
}

/**
 * Job entry for job monitoring
 */
interface JobEntry {
  id: string;
  name: string;
  queue: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused' | 'stalled';
  priority: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  attemptsMade: number;
  maxAttempts: number;
  progress?: number;
  data: any;
  result?: any;
  error?: string;
  delay?: number;
}

/**
 * Telemetry entry for real-time observability
 */
interface TelemetryEntry {
  id: string;
  timestamp: Date;
  type: 'span' | 'metric' | 'event';
  name: string;
  operation: 'http' | 'job' | 'db' | 'cache' | 'custom';
  duration?: number;
  status: 'active' | 'completed' | 'failed';
  tags: Record<string, string | number>;
  error?: string;
  parentId?: string;
  traceId?: string;
}

/**
 * Telemetry metric for aggregated data
 */
interface TelemetryMetric {
  name: string;
  type: 'counter' | 'histogram' | 'gauge' | 'timer';
  value: number;
  tags: Record<string, string>;
  timestamp: Date;
}

/**
 * Telemetry statistics for dashboard
 */
interface TelemetryStats {
  totalSpans: number;
  activeSpans: number;
  avgDuration: number;
  errorRate: number;
  throughput: number; // spans per minute
  topOperations: Array<{ name: string; count: number; avgDuration: number }>;
}

/**
 * Queue information
 */
interface QueueInfo {
  name: string;
  prefix?: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  isPaused: boolean;
}

/**
 * System capabilities detection
 */
interface SystemCapabilities {
  hasRedisStore: boolean;
  hasJobQueue: boolean;
  redisConnection?: {
    host: string;
    port: number;
    status: 'connected' | 'disconnected' | 'error';
  };
  detectedPackages: {
    ioredis?: string;
    bullmq?: string;
    redisAdapter?: boolean;
    bullmqAdapter?: boolean;
  };
}

/**
 * Process status for dashboard
 */
interface ProcessStatus {
  name: string;
  status: 'starting' | 'running' | 'error' | 'stopped';
  pid?: number;
  uptime?: string;
  lastActivity?: Date;
  color: string;
}

/**
 * Project information
 */
interface ProjectInfo {
  name: string;
  igniterVersion?: string;
}

/**
 * Interactive Process Manager
 * Allows switching between multiple processes like Turborepo
 * Uses static dashboard interface instead of scrolling logs
 */
class InteractiveProcessManager {
  private processes: ChildProcess[] = [];
  private processConfigs: ProcessConfig[] = [];
  private currentProcess = 0;
  private rl: readline.Interface;
  private logger = createChildLogger({ component: 'interactive-process-manager' });
  
  // Static dashboard state
  private processLogs: Map<number, ProcessLogEntry[]> = new Map();
  private processStatus: Map<number, ProcessStatus> = new Map();
  private apiRequests: ApiRequestEntry[] = [];
  private jobs: JobEntry[] = [];
  private queues: Map<string, QueueInfo> = new Map();
  private systemCapabilities: SystemCapabilities = {
    hasRedisStore: false,
    hasJobQueue: false,
    detectedPackages: {}
  };
  private maxLogBuffer = 100; // Keep last 100 log entries per process
  private maxApiBuffer = 200; // Keep last 200 API requests
  private maxJobBuffer = 500; // Keep last 500 jobs
  private dashboardHeight = 25; // Fixed dashboard height
  private startTime = Date.now();
  private refreshInterval: NodeJS.Timeout | null = null;
  private apiMonitoringInterval: NodeJS.Timeout | null = null;
  private jobMonitoringInterval: NodeJS.Timeout | null = null;
  private igniterTabIndex: number; // Index of the Igniter tab
  private apiTabIndex: number; // Index of the API tab
  private jobsTabIndex: number; // Index of the Jobs tab
  private telemetryTabIndex: number; // Index of the Telemetry tab
  private selectedQueue: string | null = null; // Currently selected queue in jobs tab
  private projectInfo: ProjectInfo;

  // Telemetry dashboard state
  private telemetryEntries: TelemetryEntry[] = [];
  private telemetryMetrics: TelemetryMetric[] = [];
  private telemetryStats: TelemetryStats = {
    totalSpans: 0,
    activeSpans: 0,
    avgDuration: 0,
    errorRate: 0,
    throughput: 0,
    topOperations: []
  };
  private maxTelemetryBuffer = 1000; // Keep last 1000 telemetry entries
  private telemetrySubTab: 'spans' | 'metrics' | 'events' = 'spans';

  constructor(configs: ProcessConfig[]) {
    // Reorganize configs: Framework first, then Igniter
    this.processConfigs = this.reorganizeConfigs(configs);
    
    // Set tab indices based on new order
    this.igniterTabIndex = 1; // Igniter is always second
    this.apiTabIndex = 2; // API tab is third
    this.jobsTabIndex = 3; // Jobs tab is fourth
    this.telemetryTabIndex = 4; // Telemetry tab is fifth
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    // Enable raw mode to capture individual keystrokes
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    
    // Get project information
    this.projectInfo = this.getProjectInfo();
    
    // Initialize log buffers and status for each process
    this.processConfigs.forEach((config, index) => {
      this.processLogs.set(index, []);
      this.processStatus.set(index, {
        name: config.name,
        status: 'starting',
        color: this.getSimplifiedColor(config.name, 'default'),
        lastActivity: new Date()
      });
    });
    
    // Initialize API tab status
    this.processStatus.set(this.apiTabIndex, {
      name: 'Igniter.js API',
      status: 'running',
      color: this.getSimplifiedColor('api', 'default'),
      lastActivity: new Date()
    });
    
    // Initialize Jobs tab status
    this.processStatus.set(this.jobsTabIndex, {
      name: 'Igniter.js Jobs',
      status: 'running',
      color: this.getSimplifiedColor('jobs', 'default'),
      lastActivity: new Date()
    });
    
    // Initialize Telemetry tab status
    this.processStatus.set(this.telemetryTabIndex, {
      name: 'Telemetry',
      status: 'running',
      color: this.getSimplifiedColor('telemetry', 'default'),
      lastActivity: new Date()
    });
    
    // Detect system capabilities
    this.detectSystemCapabilities();
    
    this.setupKeyHandlers();
  }

  /**
   * Reorganize configs to put framework first, then Igniter
   */
  private reorganizeConfigs(configs: ProcessConfig[]): ProcessConfig[] {
    const frameworkConfig = configs.find(c => 
      c.name.toLowerCase().includes('next') || 
      c.name.toLowerCase().includes('vite') || 
      c.name.toLowerCase().includes('nuxt') || 
      c.name.toLowerCase().includes('svelte') || 
      c.name.toLowerCase().includes('remix') || 
      c.name.toLowerCase().includes('astro')
    );
    
    const igniterConfig = configs.find(c => 
      c.name.toLowerCase().includes('igniter')
    );
    
    const otherConfigs = configs.filter(c => c !== frameworkConfig && c !== igniterConfig);
    
    const result = [];
    if (frameworkConfig) result.push(frameworkConfig);
    if (igniterConfig) result.push(igniterConfig);
    result.push(...otherConfigs);
    
    return result;
  }

  /**
   * Get project information from package.json
   */
  private getProjectInfo(): ProjectInfo {
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Try to find Igniter version from dependencies
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
          ...packageJson.peerDependencies
        };
        
        const igniterVersion = allDeps['@igniter-js/core'] || 
                              allDeps['@igniter-js/cli'] || 
                              allDeps['igniter-js'];
        
        return {
          name: packageJson.name || 'Unknown Project',
          igniterVersion: igniterVersion ? igniterVersion.replace(/[\^~]/, '') : undefined
        };
      }
    } catch (error) {
      console.warn('Could not read project information:', error);
    }
    
    return {
      name: 'Unknown Project'
    };
  }

  /**
   * Get simplified color based on tab state
   */
  private getSimplifiedColor(name: string, state: 'active' | 'default' | 'failed'): string {
    return TAB_COLORS[state];
  }

  /**
   * Detect system capabilities (Redis, Jobs, etc.)
   */
  private async detectSystemCapabilities() {
    try {
      // Check package.json for dependencies
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
          ...packageJson.peerDependencies
        };

        // Detect Redis-related packages
        if (allDeps['ioredis']) {
          this.systemCapabilities.detectedPackages.ioredis = allDeps['ioredis'];
          this.systemCapabilities.hasRedisStore = true;
        }

        // Detect Job Queue-related packages
        if (allDeps['bullmq']) {
          this.systemCapabilities.detectedPackages.bullmq = allDeps['bullmq'];
          this.systemCapabilities.hasJobQueue = true;
        }

        // Detect Igniter adapters
        if (allDeps['@igniter-js/adapter-redis'] || allDeps['@igniter-js/adapter-redis']) {
          this.systemCapabilities.detectedPackages.redisAdapter = true;
          this.systemCapabilities.hasRedisStore = true;
        }

        if (allDeps['@igniter-js/adapter-bullmq'] || allDeps['@igniter-js/adapter-bullmq']) {
          this.systemCapabilities.detectedPackages.bullmqAdapter = true;
          this.systemCapabilities.hasJobQueue = true;
        }
      }

      // Try to connect to Redis if detected
      if (this.systemCapabilities.hasRedisStore) {
        this.testRedisConnection();
      }

    } catch (error) {
      console.error('Error detecting system capabilities:', error);
    }
  }

  /**
   * Test Redis connection
   */
  private async testRedisConnection() {
    try {
      const Redis = await import('ioredis').then(m => m.default).catch(() => null);
      if (!Redis) return;

      const host = process.env.REDIS_HOST || 'localhost';
      const port = parseInt(process.env.REDIS_PORT || '6379');

      const redis = new Redis(port, host, {
        lazyConnect: true,
        maxRetriesPerRequest: null,
        retryStrategy: (times) => {
          if (times > 3) {
            return null;
          }
          return Math.min(times * 50, 1000);
        },
      });

      await redis.ping();
      
      this.systemCapabilities.redisConnection = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        status: 'connected'
      };

      // Update Jobs tab status if Redis is connected
      const jobsStatus = this.processStatus.get(this.jobsTabIndex);
      if (jobsStatus) {
        jobsStatus.status = 'running';
      }

      await redis.disconnect();

      // Subscribe to API requests and telemetry channels
      const subscriber = redis.duplicate();
      await subscriber.subscribe('igniter:api-requests', 'igniter:telemetry');
      
      subscriber.on('message', (channel, message) => {
        if (channel === 'igniter:api-requests') {
          try {
            const data = JSON.parse(message);
            if (data.type === 'api-request' && data.data) {
              // Convert timestamp string back to Date object
              data.data.timestamp = new Date(data.data.timestamp);
              this.addApiRequest(data.data);
            }
          } catch (error) {
            console.warn('Failed to parse API request message:', error);
          }
        } else if (channel === 'igniter:telemetry') {
          try {
            const data = JSON.parse(message);
            if (data.type === 'telemetry-event' && data.data) {
              // Convert timestamp string back to Date object
              data.data.timestamp = new Date(data.data.timestamp);
              this.addTelemetryEntry(data.data);
            }
          } catch (error) {
            console.warn('Failed to parse telemetry message:', error);
          }
        }
      });
      
    } catch (error) {
      this.systemCapabilities.redisConnection = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        status: 'error'
      };

      // Update Jobs tab status if Redis connection failed
      const jobsStatus = this.processStatus.get(this.jobsTabIndex);
      if (jobsStatus) {
        jobsStatus.status = 'error';
      }
    }
  }

  private setupKeyHandlers() {
    process.stdin.on('data', (key) => {
      const keyStr = key.toString();
      
      switch (keyStr) {
        case '\u0003': // Ctrl+C
          this.cleanup();
          process.exit(0);
          break;
        case 'q':
        case 'Q':
          this.cleanup();
          process.exit(0);
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8': // Support up to 8 tabs (processes + API + Jobs + Telemetry)
          const processIndex = parseInt(keyStr) - 1;
          if (processIndex >= 0 && processIndex <= this.telemetryTabIndex) {
            this.switchToProcess(processIndex);
          }
          break;
        case '\t': // Tab key
          this.switchToNextProcess();
          break;
        case 'h':
        case 'H':
        case '?':
          this.showHelp();
          break;
        case 'c':
        case 'C':
          this.clearCurrentTab();
          break;
        case 'r':
        case 'R':
          this.forceRefresh();
          break;
        case 'j':
        case 'J':
          // Quick switch to Jobs tab
          if (this.systemCapabilities.hasJobQueue) {
            this.switchToProcess(this.jobsTabIndex);
          }
          break;
        case 's':
        case 'S':
          // Quick switch to Store status (API tab shows store info too)
          if (this.systemCapabilities.hasRedisStore) {
            this.switchToProcess(this.apiTabIndex);
          }
          break;
        case 't':
        case 'T':
          // Quick switch to Telemetry tab
          this.switchToProcess(this.telemetryTabIndex);
          break;
        // Subtab navigation within telemetry
        case 'p':
        case 'P':
          if (this.currentProcess === this.telemetryTabIndex) {
            this.telemetrySubTab = 'spans';
            this.renderDashboard();
          }
          break;
        case 'm':
        case 'M':
          if (this.currentProcess === this.telemetryTabIndex) {
            this.telemetrySubTab = 'metrics';
            this.renderDashboard();
          }
          break;
        case 'e':
        case 'E':
          if (this.currentProcess === this.telemetryTabIndex) {
            this.telemetrySubTab = 'events';
            this.renderDashboard();
          }
          break;
      }
    });
  }

  private switchToProcess(index: number) {
    if (index === this.currentProcess) return;
    
    this.currentProcess = index;
    this.renderDashboard();
  }

  private switchToNextProcess() {
    this.currentProcess = (this.currentProcess + 1) % (this.processConfigs.length + 3); // +3 for API, Jobs and Telemetry tabs
    this.renderDashboard();
  }

  private clearCurrentTab() {
    if (this.currentProcess === this.apiTabIndex) {
      // Clear API requests
      this.apiRequests.splice(0);
    } else if (this.currentProcess === this.jobsTabIndex) {
      // Clear jobs
      this.jobs.splice(0);
      this.queues.clear();
    } else if (this.currentProcess === this.telemetryTabIndex) {
      // Clear telemetry data
      this.telemetryEntries.splice(0);
      this.telemetryMetrics.splice(0);
    } else {
      // Clear process logs
      this.processLogs.get(this.currentProcess)?.splice(0);
    }
    this.renderDashboard();
  }

  private forceRefresh() {
    this.renderDashboard();
  }

  private showHelp() {
    console.clear();
    this.drawHeader();
    
    console.log(`${ANSI_COLORS.bold}Keyboard Shortcuts:${ANSI_COLORS.reset}`);
    console.log(`  ${ANSI_COLORS.cyan}1-${this.processConfigs.length + 3}${ANSI_COLORS.reset}     Switch to tab by number`);
    console.log(`  ${ANSI_COLORS.cyan}Tab${ANSI_COLORS.reset}       Switch to next tab`);
    console.log(`  ${ANSI_COLORS.cyan}c${ANSI_COLORS.reset}         Clear current tab (logs/requests/jobs/telemetry)`);
    console.log(`  ${ANSI_COLORS.cyan}r${ANSI_COLORS.reset}         Refresh dashboard`);
    console.log(`  ${ANSI_COLORS.cyan}j${ANSI_COLORS.reset}         Quick switch to Jobs tab`);
    console.log(`  ${ANSI_COLORS.cyan}s${ANSI_COLORS.reset}         Quick switch to Store/API tab`);
    console.log(`  ${ANSI_COLORS.cyan}t${ANSI_COLORS.reset}         Quick switch to Telemetry tab`);
    console.log(`  ${ANSI_COLORS.cyan}p/m/e${ANSI_COLORS.reset}     Switch telemetry subtabs (spans/metrics/events)`);
    console.log(`  ${ANSI_COLORS.cyan}h, ?${ANSI_COLORS.reset}      Show this help`);
    console.log(`  ${ANSI_COLORS.cyan}q${ANSI_COLORS.reset}         Quit interactive mode`);
    console.log(`  ${ANSI_COLORS.cyan}Ctrl+C${ANSI_COLORS.reset}    Force quit\n`);
    
    console.log(`${ANSI_COLORS.bold}Available Tabs:${ANSI_COLORS.reset}`);
    this.processConfigs.forEach((config, index) => {
      const status = this.processStatus.get(index);
      const color = ANSI_COLORS[config.color as keyof typeof ANSI_COLORS] || ANSI_COLORS.gray;
      const statusDisplay = status ? this.getStatusDisplay(status.status) : 'Unknown';
      console.log(`  ${color}${index + 1}. ${config.name}${ANSI_COLORS.reset} - ${statusDisplay}`);
    });
    
    // Show API tab
    console.log(`  ${ANSI_COLORS.green}${this.apiTabIndex + 1}. API Requests${ANSI_COLORS.reset}`);
    console.log(`     Real-time HTTP request monitoring`);
    console.log(`     Method, path, status code, response time`);
    console.log(`     Statistics: total, recent, avg response time`);
    if (this.systemCapabilities.hasRedisStore) {
      const status = this.systemCapabilities.redisConnection?.status || 'unknown';
      const statusColor = status === 'connected' ? ANSI_COLORS.green : 
                         status === 'error' ? ANSI_COLORS.red : ANSI_COLORS.yellow;
      console.log(`     ${statusColor}Redis Store: ${status}${ANSI_COLORS.reset}`);
    }
    
    // Show Jobs tab
    console.log(`  ${ANSI_COLORS.cyan}${this.jobsTabIndex + 1}. Background Jobs${ANSI_COLORS.reset}`);
    if (this.systemCapabilities.hasJobQueue) {
      console.log(`     Job queue monitoring and management`);
      console.log(`     Queue list, job status, real-time updates`);
      console.log(`     Job details: status, attempts, progress`);
      if (this.systemCapabilities.detectedPackages.bullmq) {
        console.log(`     ${ANSI_COLORS.green}BullMQ: ${this.systemCapabilities.detectedPackages.bullmq}${ANSI_COLORS.reset}`);
      }
    } else {
      console.log(`     ${ANSI_COLORS.dim}No job queue detected - install BullMQ adapter${ANSI_COLORS.reset}`);
    }
    
    // Show Telemetry tab
    console.log(`  ${ANSI_COLORS.magenta}${this.telemetryTabIndex + 1}. Telemetry Dashboard${ANSI_COLORS.reset}`);
    console.log(`     Real-time observability and performance monitoring`);
    console.log(`     Spans: trace execution, duration, errors`);
    console.log(`     Metrics: counters, histograms, gauges, timers`);
    console.log(`     Events: custom telemetry events and logs`);
    console.log(`     Statistics: throughput, error rates, top operations`);
    console.log(`     ${ANSI_COLORS.dim}Requires OpenTelemetry adapter configuration${ANSI_COLORS.reset}`);
    
    // Show system capabilities
    console.log(`\n${ANSI_COLORS.bold}System Capabilities:${ANSI_COLORS.reset}`);
    console.log(`  Redis Store: ${this.systemCapabilities.hasRedisStore ? ANSI_COLORS.green + '✓' : ANSI_COLORS.red + '✗'}${ANSI_COLORS.reset}`);
    console.log(`  Job Queue:   ${this.systemCapabilities.hasJobQueue ? ANSI_COLORS.green + '✓' : ANSI_COLORS.red + '✗'}${ANSI_COLORS.reset}`);
    
    console.log(`\n${ANSI_COLORS.dim}Press any key to return to dashboard...${ANSI_COLORS.reset}`);
    
    // Wait for keypress
    process.stdin.once('data', () => {
      this.renderDashboard();
    });
  }

  private addLogEntry(processIndex: number, type: ProcessLogEntry['type'], message: string) {
    const logs = this.processLogs.get(processIndex);
    if (!logs) return;

    const entry: ProcessLogEntry = {
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

    // Only re-render if this is the active process or if it's an important message
    if (processIndex === this.currentProcess || type === 'error' || type === 'success') {
      this.renderDashboard();
    }
  }

  private addApiRequest(request: ApiRequestEntry) {
    this.apiRequests.push(request);
    
    // Keep buffer size manageable
    if (this.apiRequests.length > this.maxApiBuffer) {
      this.apiRequests.splice(0, this.apiRequests.length - this.maxApiBuffer);
    }

    // Re-render if we're viewing API requests
    if (this.currentProcess === this.apiTabIndex) {
      this.renderDashboard();
    }
  }

  private addTelemetryEntry(entry: TelemetryEntry) {
    this.telemetryEntries.push(entry);
    
    // Keep buffer size manageable
    if (this.telemetryEntries.length > this.maxTelemetryBuffer) {
      this.telemetryEntries.splice(0, this.telemetryEntries.length - this.maxTelemetryBuffer);
    }

    // Update statistics
    this.updateTelemetryStats();

    // Re-render if we're viewing telemetry
    if (this.currentProcess === this.telemetryTabIndex) {
      this.renderDashboard();
    }
  }

  private updateTelemetryStats() {
    const now = Date.now();
    const last5min = this.telemetryEntries.filter(entry => 
      now - entry.timestamp.getTime() < 5 * 60 * 1000
    );
    
    const spans = this.telemetryEntries.filter(entry => entry.type === 'span');
    const activeSpans = spans.filter(span => span.status === 'active');
    const completedSpans = spans.filter(span => span.status === 'completed');
    const failedSpans = spans.filter(span => span.status === 'failed');
    
    const totalDuration = completedSpans.reduce((sum, span) => sum + (span.duration || 0), 0);
    const avgDuration = completedSpans.length > 0 ? totalDuration / completedSpans.length : 0;
    
    const errorRate = spans.length > 0 ? (failedSpans.length / spans.length) * 100 : 0;
    const throughput = last5min.length / 5; // per minute
    
    // Calculate top operations
    const operationCounts = spans.reduce((acc, span) => {
      const key = span.name;
      if (!acc[key]) {
        acc[key] = { count: 0, totalDuration: 0 };
      }
      acc[key].count++;
      acc[key].totalDuration += span.duration || 0;
      return acc;
    }, {} as Record<string, { count: number; totalDuration: number }>);
    
    const topOperations = Object.entries(operationCounts)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgDuration: data.count > 0 ? data.totalDuration / data.count : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    this.telemetryStats = {
      totalSpans: spans.length,
      activeSpans: activeSpans.length,
      avgDuration,
      errorRate,
      throughput,
      topOperations
    };
  }

  private renderDashboard() {
    // Clear screen and move cursor to top
    console.clear();
    process.stdout.write('\x1b[H');

    this.drawHeader();
    this.drawTabs();
    this.drawCurrentTabStatus();
    this.drawSeparator();
    this.drawCurrentTabContent();
    this.drawFooter();
  }

  private drawHeader() {
    const uptime = this.formatUptime(Date.now() - this.startTime);
    const versionInfo = this.projectInfo.igniterVersion ? `v${this.projectInfo.igniterVersion}` : '';
    const projectName = this.projectInfo.name !== 'Unknown Project' ? ` - ${this.projectInfo.name}` : '';
    
    const title = `${ANSI_COLORS.bold}${ANSI_COLORS.blue}Igniter.js ${versionInfo}${projectName}${ANSI_COLORS.reset}`;
    const subtitle = `${ANSI_COLORS.dim}Uptime: ${uptime} | Press h for help${ANSI_COLORS.reset}`;
    
    console.log(`\n${title}`);
    console.log(`${subtitle}\n`);
  }

  private drawTabs() {
    const tabs = [];
    
    // Add process tabs with simplified colors
    this.processConfigs.forEach((config, index) => {
      const isActive = index === this.currentProcess;
      const status = this.processStatus.get(index);
      
      let statusIcon = '○';
      let colorState: 'active' | 'default' | 'failed' = 'default';
      
      if (isActive) {
        statusIcon = '●';
        colorState = 'active';
      } else if (status?.status === 'error') {
        statusIcon = '✗';
        colorState = 'failed';
      } else if (status?.status === 'running') {
        statusIcon = '●';
        colorState = 'default';
      }
      
      const color = this.getSimplifiedColor(config.name, colorState);
      const style = isActive ? ANSI_COLORS.bold : '';
      
      tabs.push(`${style}${color}${statusIcon} ${index + 1}. ${config.name}${ANSI_COLORS.reset}`);
    });
    
    // Add API tab
    const isApiActive = this.currentProcess === this.apiTabIndex;
    const apiStatus = this.processStatus.get(this.apiTabIndex);
    let apiColorState: 'active' | 'default' | 'failed' = 'default';
    let apiIcon = '○';
    
    if (isApiActive) {
      apiIcon = '●';
      apiColorState = 'active';
    } else if (apiStatus?.status === 'error') {
      apiIcon = '✗';
      apiColorState = 'failed';
    } else if (apiStatus?.status === 'running') {
      apiIcon = '●';
      apiColorState = 'default';
    }
    
    const apiColor = this.getSimplifiedColor('api', apiColorState);
    const apiStyle = isApiActive ? ANSI_COLORS.bold : '';
    tabs.push(`${apiStyle}${apiColor}${apiIcon} ${this.apiTabIndex + 1}. Igniter.js API${ANSI_COLORS.reset}`);
    
    // Add Jobs tab with queue count
    const isJobsActive = this.currentProcess === this.jobsTabIndex;
    const jobsStatus = this.processStatus.get(this.jobsTabIndex);
    let jobsColorState: 'active' | 'default' | 'failed' = 'default';
    let jobsIcon = '○';
    
    if (isJobsActive) {
      jobsIcon = '●';
      jobsColorState = 'active';
    } else if (jobsStatus?.status === 'error') {
      jobsIcon = '✗';
      jobsColorState = 'failed';
    } else if (jobsStatus?.status === 'running') {
      jobsIcon = '●';
      jobsColorState = 'default';
    }
    
    const jobsColor = this.getSimplifiedColor('jobs', jobsColorState);
    const jobsStyle = isJobsActive ? ANSI_COLORS.bold : '';
    const queueCount = this.queues.size;
    const queueDisplay = queueCount > 0 ? ` (${queueCount} Queue${queueCount !== 1 ? 's' : ''})` : '';
    tabs.push(`${jobsStyle}${jobsColor}${jobsIcon} ${this.jobsTabIndex + 1}. Igniter.js Jobs${queueDisplay}${ANSI_COLORS.reset}`);
    
    // Add Telemetry tab
    const isTelemetryActive = this.currentProcess === this.telemetryTabIndex;
    const telemetryStatus = this.processStatus.get(this.telemetryTabIndex);
    let telemetryIcon = '○';
    
    if (isTelemetryActive) {
      telemetryIcon = '●';
    } else if (telemetryStatus?.status === 'error') {
      telemetryIcon = '✗';
    } else if (telemetryStatus?.status === 'running') {
      telemetryIcon = '●';
    }
    
    const telemetryColor = this.getSimplifiedColor('telemetry', isTelemetryActive ? 'active' : telemetryStatus?.status === 'error' ? 'failed' : 'default');
    const telemetryStyle = isTelemetryActive ? ANSI_COLORS.bold : '';
    tabs.push(`${telemetryStyle}${telemetryColor}${telemetryIcon} ${this.telemetryTabIndex + 1}. Telemetry Dashboard${ANSI_COLORS.reset}`);
    
    console.log(`${tabs.join('  ')}\n`);
  }

  private drawCurrentTabStatus() {
    if (this.currentProcess === this.apiTabIndex) {
      // API tab statistics
      const last5min = this.apiRequests.filter(req => 
        Date.now() - req.timestamp.getTime() < 5 * 60 * 1000
      );
      
      const statusCounts = this.apiRequests.reduce((acc, req) => {
        const statusClass = this.getStatusClass(req.statusCode);
        acc[statusClass] = (acc[statusClass] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const avgResponseTime = this.apiRequests.length > 0 
        ? (this.apiRequests.reduce((sum, req) => sum + req.responseTime, 0) / this.apiRequests.length).toFixed(0)
        : '0';

      const statsLine = [
        `Total: ${this.apiRequests.length}`,
        `Last 5m: ${last5min.length}`,
        `2xx: ${statusCounts['success'] || 0}`,
        `4xx: ${statusCounts['client-error'] || 0}`,
        `5xx: ${statusCounts['server-error'] || 0}`,
        `Avg: ${avgResponseTime}ms`
      ].join(' | ');

      // Add Redis status if available
      let fullStats = statsLine;
      if (this.systemCapabilities.hasRedisStore && this.systemCapabilities.redisConnection) {
        const redisStatus = this.systemCapabilities.redisConnection.status;
        const redisColor = redisStatus === 'connected' ? ANSI_COLORS.green : ANSI_COLORS.red;
        fullStats += ` | Redis: ${redisColor}${redisStatus}${ANSI_COLORS.reset}${ANSI_COLORS.dim}`;
      }

      console.log(`${ANSI_COLORS.dim}${fullStats}${ANSI_COLORS.reset}\n`);
    } else if (this.currentProcess === this.jobsTabIndex) {
      // Jobs tab statistics
      const statusCounts = this.jobs.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const queueCount = this.queues.size;
      const totalJobs = this.jobs.length;
      const activeJobs = statusCounts['active'] || 0;
      const failedJobs = statusCounts['failed'] || 0;

      const statsLine = [
        `Queues: ${queueCount}`,
        `Total Jobs: ${totalJobs}`,
        `Active: ${activeJobs}`,
        `Waiting: ${statusCounts['waiting'] || 0}`,
        `Completed: ${statusCounts['completed'] || 0}`,
        `Failed: ${failedJobs}`
      ].join(' | ');

      // Add capability status
      let fullStats = statsLine;
      if (this.systemCapabilities.hasJobQueue) {
        fullStats += ` | BullMQ: ${ANSI_COLORS.green}enabled${ANSI_COLORS.reset}${ANSI_COLORS.dim}`;
      } else {
        fullStats += ` | BullMQ: ${ANSI_COLORS.yellow}not detected${ANSI_COLORS.reset}${ANSI_COLORS.dim}`;
      }

      console.log(`${ANSI_COLORS.dim}${fullStats}${ANSI_COLORS.reset}\n`);
    } else {
      // Process status
      const currentStatus = this.processStatus.get(this.currentProcess);
      if (!currentStatus) return;

      const statusLine = [
        `Status: ${this.getStatusDisplay(currentStatus.status)}`,
        currentStatus.pid ? `PID: ${currentStatus.pid}` : '',
        currentStatus.lastActivity ? `Last: ${this.formatTime(currentStatus.lastActivity)}` : ''
      ].filter(Boolean).join(' | ');

      console.log(`${ANSI_COLORS.dim}${statusLine}${ANSI_COLORS.reset}\n`);
    }
  }

  private drawCurrentTabContent() {
    if (this.currentProcess === this.apiTabIndex) {
      this.drawApiRequests();
    } else if (this.currentProcess === this.jobsTabIndex) {
      this.drawJobsInterface();
    } else if (this.currentProcess === this.telemetryTabIndex) {
      this.drawTelemetryInterface();
    } else {
      this.drawCurrentProcessLogs();
    }
  }

  private drawApiRequests() {
    const visibleRequests = this.apiRequests.slice(-15); // Show last 15 requests
    
    if (visibleRequests.length === 0) {
      console.log(`${ANSI_COLORS.dim}No API requests yet. See docs at https://igniterjs.com/docs/api${ANSI_COLORS.reset}\n`);
      return;
    }

    visibleRequests.forEach(req => {
      const timestamp = this.formatTime(req.timestamp);
      const methodColor = this.getMethodColor(req.method);
      const statusColor = this.getStatusColor(req.statusCode);
      const responseTime = req.responseTime.toFixed(0);
      
      // Format: 14:30:25 GET /api/users 200 45ms
      console.log(`${ANSI_COLORS.dim}${timestamp}${ANSI_COLORS.reset} ${methodColor}${req.method.padEnd(4)}${ANSI_COLORS.reset} ${req.path.padEnd(20)} ${statusColor}${req.statusCode}${ANSI_COLORS.reset} ${ANSI_COLORS.dim}${responseTime}ms${ANSI_COLORS.reset}`);
    });
    
    console.log(); // Empty line for spacing
  }

  /**
   * Draw the Jobs interface with sidebar (queues) and main content (jobs)
   */
  private drawJobsInterface() {
    if (!this.systemCapabilities.hasJobQueue) {
      // Show setup instructions if job queue is not detected
      console.log(`${ANSI_COLORS.dim}Background Jobs not configured${ANSI_COLORS.reset}\n`);
      console.log(`${ANSI_COLORS.yellow}To enable job monitoring:${ANSI_COLORS.reset}`);
      console.log(`  1. Install BullMQ: ${ANSI_COLORS.cyan}npm install bullmq${ANSI_COLORS.reset}`);
      console.log(`  2. Install adapter: ${ANSI_COLORS.cyan}npm install @igniter-js/adapter-bullmq${ANSI_COLORS.reset}`);
      console.log(`  3. Configure in your Igniter router:\n`);
      console.log(`${ANSI_COLORS.dim}     import { createBullMQAdapter } from '@igniter-js/adapter-bullmq'${ANSI_COLORS.reset}`);
      console.log(`${ANSI_COLORS.dim}     const jobs = createBullMQAdapter({ store: redisStore })${ANSI_COLORS.reset}`);
      console.log(`${ANSI_COLORS.dim}     const igniter = Igniter.context().store(store).jobs(jobs).create()${ANSI_COLORS.reset}\n`);
      return;
    }

    const terminalWidth = process.stdout.columns || 80;
    const sidebarWidth = Math.min(25, Math.floor(terminalWidth * 0.3)); // 30% of terminal or max 25 chars
    const contentWidth = terminalWidth - sidebarWidth - 3; // 3 chars for separator

    // Show jobs interface
    this.drawJobsContent();
  }

  /**
   * Draw the jobs content area
   */
  private drawJobsContent() {
    const filteredJobs = this.selectedQueue 
      ? this.jobs.filter(job => job.queue === this.selectedQueue)
      : this.jobs;

    const visibleJobs = filteredJobs.slice(-12); // Show last 12 jobs
    
    if (visibleJobs.length === 0) {
      console.log(`${ANSI_COLORS.dim}No jobs found. See docs at igniter.js.org/docs/jobs${ANSI_COLORS.reset}\n`);
      return;
    }

    // Job list header
    console.log(`${ANSI_COLORS.bold}BACKGROUND JOBS${this.selectedQueue ? ` - ${this.selectedQueue}` : ''}${ANSI_COLORS.reset}`);
    console.log(`${ANSI_COLORS.dim}${'─'.repeat(60)}${ANSI_COLORS.reset}`);
    
    visibleJobs.forEach(job => {
      const timestamp = this.formatTime(job.createdAt);
      const statusColor = this.getJobStatusColor(job.status);
      const statusIcon = this.getJobStatusIcon(job.status);
      const progress = job.progress ? ` ${job.progress}%` : '';
      
      // Format: 14:30:25 ✓ sendEmail completed (3/3)
      const nameWidth = 15;
      const name = job.name.length > nameWidth ? 
        job.name.substring(0, nameWidth - 3) + '...' : job.name.padEnd(nameWidth);
      
      const attempts = `(${job.attemptsMade}/${job.maxAttempts})`;
      
      console.log(`${ANSI_COLORS.dim}${timestamp}${ANSI_COLORS.reset} ${statusColor}${statusIcon}${ANSI_COLORS.reset} ${name} ${statusColor}${job.status}${progress}${ANSI_COLORS.reset} ${ANSI_COLORS.dim}${attempts}${ANSI_COLORS.reset}`);
      
      // Show error if job failed
      if (job.status === 'failed' && job.error) {
        const errorMsg = job.error.length > 50 ? 
          job.error.substring(0, 47) + '...' : job.error;
        console.log(`${ANSI_COLORS.dim}         ${ANSI_COLORS.red}Error: ${errorMsg}${ANSI_COLORS.reset}`);
      }
    });
    
    console.log(); // Empty line for spacing
  }

  /**
   * Get color for job status
   */
  private getJobStatusColor(status: JobEntry['status']): string {
    switch (status) {
      case 'completed': return ANSI_COLORS.green;
      case 'failed': return ANSI_COLORS.red;
      case 'active': return ANSI_COLORS.blue;
      case 'waiting': return ANSI_COLORS.yellow;
      case 'delayed': return ANSI_COLORS.cyan;
      case 'paused': return ANSI_COLORS.gray;
      case 'stalled': return ANSI_COLORS.magenta;
      default: return ANSI_COLORS.white;
    }
  }

  /**
   * Get icon for job status
   */
  private getJobStatusIcon(status: JobEntry['status']): string {
    switch (status) {
      case 'completed': return '✓';
      case 'failed': return '✗';
      case 'active': return '⚡';
      case 'waiting': return '⏳';
      case 'delayed': return '⏰';
      case 'paused': return '⏸';
      case 'stalled': return '⚠';
      default: return '◦';
    }
  }

  /**
   * Draw the Telemetry interface with subtabs and statistics
   */
  private drawTelemetryInterface() {
    // Draw subtab navigation
    const subtabs = [
      { key: 'spans', label: 'Spans', active: this.telemetrySubTab === 'spans' },
      { key: 'metrics', label: 'Metrics', active: this.telemetrySubTab === 'metrics' },
      { key: 'events', label: 'Events', active: this.telemetrySubTab === 'events' }
    ];

    console.log(`${ANSI_COLORS.bold}TELEMETRY DASHBOARD${ANSI_COLORS.reset}`);
    console.log(`${ANSI_COLORS.dim}${'─'.repeat(60)}${ANSI_COLORS.reset}`);
    
    // Subtab navigation
    const subtabDisplay = subtabs.map(tab => {
      const color = tab.active ? ANSI_COLORS.cyan : ANSI_COLORS.dim;
      const indicator = tab.active ? '●' : '○';
      return `${color}${indicator} ${tab.label}${ANSI_COLORS.reset}`;
    }).join('  ');
    
    console.log(`${subtabDisplay}  ${ANSI_COLORS.dim}(p/m/e to switch)${ANSI_COLORS.reset}\n`);

    // Statistics overview
    this.drawTelemetryStats();
    
    // Content based on selected subtab
    switch (this.telemetrySubTab) {
      case 'spans':
        this.drawTelemetrySpans();
        break;
      case 'metrics':
        this.drawTelemetryMetrics();
        break;
      case 'events':
        this.drawTelemetryEvents();
        break;
    }
  }

  /**
   * Draw telemetry statistics overview
   */
  private drawTelemetryStats() {
    const stats = this.telemetryStats;
    
    console.log(`${ANSI_COLORS.bold}OVERVIEW${ANSI_COLORS.reset}`);
    console.log(`${ANSI_COLORS.dim}${'─'.repeat(40)}${ANSI_COLORS.reset}`);
    
    const totalColor = stats.totalSpans > 0 ? ANSI_COLORS.green : ANSI_COLORS.dim;
    const activeColor = stats.activeSpans > 0 ? ANSI_COLORS.yellow : ANSI_COLORS.dim;
    const errorColor = stats.errorRate > 10 ? ANSI_COLORS.red : 
                      stats.errorRate > 5 ? ANSI_COLORS.yellow : ANSI_COLORS.green;
    
    console.log(`Total Spans:    ${totalColor}${stats.totalSpans}${ANSI_COLORS.reset}`);
    console.log(`Active Spans:   ${activeColor}${stats.activeSpans}${ANSI_COLORS.reset}`);
    console.log(`Avg Duration:   ${ANSI_COLORS.cyan}${stats.avgDuration.toFixed(2)}ms${ANSI_COLORS.reset}`);
    console.log(`Error Rate:     ${errorColor}${stats.errorRate.toFixed(1)}%${ANSI_COLORS.reset}`);
    console.log(`Throughput:     ${ANSI_COLORS.blue}${stats.throughput.toFixed(1)}/min${ANSI_COLORS.reset}`);
    
    // Top operations
    if (stats.topOperations.length > 0) {
      console.log(`\n${ANSI_COLORS.bold}TOP OPERATIONS${ANSI_COLORS.reset}`);
      console.log(`${ANSI_COLORS.dim}${'─'.repeat(40)}${ANSI_COLORS.reset}`);
      
      stats.topOperations.slice(0, 3).forEach((op, index) => {
        const rank = `${index + 1}.`;
        const name = op.name.length > 20 ? op.name.substring(0, 17) + '...' : op.name;
        console.log(`${ANSI_COLORS.dim}${rank.padEnd(3)}${ANSI_COLORS.reset}${name.padEnd(20)} ${ANSI_COLORS.cyan}${op.count}x${ANSI_COLORS.reset} ${ANSI_COLORS.dim}(${op.avgDuration.toFixed(1)}ms avg)${ANSI_COLORS.reset}`);
      });
    }
    
    console.log(); // Empty line
  }

  /**
   * Draw telemetry spans
   */
  private drawTelemetrySpans() {
    const spans = this.telemetryEntries
      .filter(entry => entry.type === 'span')
      .slice(-10); // Show last 10 spans
    
    if (spans.length === 0) {
      console.log(`${ANSI_COLORS.dim}No spans yet. Telemetry will appear here when your app processes requests.${ANSI_COLORS.reset}\n`);
      return;
    }

    console.log(`${ANSI_COLORS.bold}RECENT SPANS${ANSI_COLORS.reset}`);
    console.log(`${ANSI_COLORS.dim}${'─'.repeat(60)}${ANSI_COLORS.reset}`);
    
    spans.forEach(span => {
      const timestamp = this.formatTime(span.timestamp);
      const statusColor = this.getTelemetryStatusColor(span.status);
      const statusIcon = this.getTelemetryStatusIcon(span.status);
      const operationColor = this.getOperationColor(span.operation);
      const duration = span.duration ? `${span.duration.toFixed(1)}ms` : 'active';
      
      // Format: 14:30:25 ✓ HTTP user.create 45.2ms
      const nameWidth = 20;
      const name = span.name.length > nameWidth ? 
        span.name.substring(0, nameWidth - 3) + '...' : span.name.padEnd(nameWidth);
      
      console.log(`${ANSI_COLORS.dim}${timestamp}${ANSI_COLORS.reset} ${statusColor}${statusIcon}${ANSI_COLORS.reset} ${operationColor}${span.operation.toUpperCase().padEnd(4)}${ANSI_COLORS.reset} ${name} ${ANSI_COLORS.cyan}${duration}${ANSI_COLORS.reset}`);
      
      // Show trace ID if available
      if (span.traceId) {
        console.log(`${ANSI_COLORS.dim}         Trace: ${span.traceId.substring(0, 16)}...${ANSI_COLORS.reset}`);
      }
      
      // Show error if span failed
      if (span.status === 'failed' && span.error) {
        const errorMsg = span.error.length > 50 ? 
          span.error.substring(0, 47) + '...' : span.error;
        console.log(`${ANSI_COLORS.dim}         ${ANSI_COLORS.red}Error: ${errorMsg}${ANSI_COLORS.reset}`);
      }
    });
    
    console.log(); // Empty line
  }

  /**
   * Draw telemetry metrics
   */
  private drawTelemetryMetrics() {
    const metrics = this.telemetryMetrics.slice(-10); // Show last 10 metrics
    
    if (metrics.length === 0) {
      console.log(`${ANSI_COLORS.dim}No metrics yet. Metrics will appear here when telemetry is active.${ANSI_COLORS.reset}\n`);
      return;
    }

    console.log(`${ANSI_COLORS.bold}RECENT METRICS${ANSI_COLORS.reset}`);
    console.log(`${ANSI_COLORS.dim}${'─'.repeat(60)}${ANSI_COLORS.reset}`);
    
    metrics.forEach(metric => {
      const timestamp = this.formatTime(metric.timestamp);
      const typeColor = this.getMetricTypeColor(metric.type);
      const typeIcon = this.getMetricTypeIcon(metric.type);
      
      // Format: 14:30:25 📊 COUNTER http_requests_total 1247
      const nameWidth = 25;
      const name = metric.name.length > nameWidth ? 
        metric.name.substring(0, nameWidth - 3) + '...' : metric.name.padEnd(nameWidth);
      
      console.log(`${ANSI_COLORS.dim}${timestamp}${ANSI_COLORS.reset} ${typeColor}${typeIcon}${ANSI_COLORS.reset} ${typeColor}${metric.type.toUpperCase().padEnd(8)}${ANSI_COLORS.reset} ${name} ${ANSI_COLORS.cyan}${metric.value}${ANSI_COLORS.reset}`);
      
      // Show tags if available
      const tags = Object.entries(metric.tags);
      if (tags.length > 0) {
        const tagStr = tags.map(([key, value]) => `${key}=${value}`).join(', ');
        const displayTags = tagStr.length > 40 ? tagStr.substring(0, 37) + '...' : tagStr;
        console.log(`${ANSI_COLORS.dim}         Tags: ${displayTags}${ANSI_COLORS.reset}`);
      }
    });
    
    console.log(); // Empty line
  }

  /**
   * Draw telemetry events
   */
  private drawTelemetryEvents() {
    const events = this.telemetryEntries
      .filter(entry => entry.type === 'event')
      .slice(-10); // Show last 10 events
    
    if (events.length === 0) {
      console.log(`${ANSI_COLORS.dim}No events yet. Events will appear here when telemetry is active.${ANSI_COLORS.reset}\n`);
      return;
    }

    console.log(`${ANSI_COLORS.bold}RECENT EVENTS${ANSI_COLORS.reset}`);
    console.log(`${ANSI_COLORS.dim}${'─'.repeat(60)}${ANSI_COLORS.reset}`);
    
    events.forEach(event => {
      const timestamp = this.formatTime(event.timestamp);
      const operationColor = this.getOperationColor(event.operation);
      
      // Format: 14:30:25 🔔 HTTP user.login
      const nameWidth = 30;
      const name = event.name.length > nameWidth ? 
        event.name.substring(0, nameWidth - 3) + '...' : event.name.padEnd(nameWidth);
      
      console.log(`${ANSI_COLORS.dim}${timestamp}${ANSI_COLORS.reset} ${ANSI_COLORS.blue}🔔${ANSI_COLORS.reset} ${operationColor}${event.operation.toUpperCase().padEnd(4)}${ANSI_COLORS.reset} ${name}`);
      
      // Show tags if available
      const tags = Object.entries(event.tags);
      if (tags.length > 0) {
        const tagStr = tags.map(([key, value]) => `${key}=${value}`).join(', ');
        const displayTags = tagStr.length > 40 ? tagStr.substring(0, 37) + '...' : tagStr;
        console.log(`${ANSI_COLORS.dim}         ${displayTags}${ANSI_COLORS.reset}`);
      }
    });
    
    console.log(); // Empty line
  }

  /**
   * Get color for telemetry status
   */
  private getTelemetryStatusColor(status: TelemetryEntry['status']): string {
    switch (status) {
      case 'completed': return ANSI_COLORS.green;
      case 'failed': return ANSI_COLORS.red;
      case 'active': return ANSI_COLORS.yellow;
      default: return ANSI_COLORS.white;
    }
  }

  /**
   * Get icon for telemetry status
   */
  private getTelemetryStatusIcon(status: TelemetryEntry['status']): string {
    switch (status) {
      case 'completed': return '✓';
      case 'failed': return '✗';
      case 'active': return '⚡';
      default: return '◦';
    }
  }

  /**
   * Get color for operation type
   */
  private getOperationColor(operation: TelemetryEntry['operation']): string {
    switch (operation) {
      case 'http': return ANSI_COLORS.green;
      case 'job': return ANSI_COLORS.blue;
      case 'db': return ANSI_COLORS.magenta;
      case 'cache': return ANSI_COLORS.cyan;
      case 'custom': return ANSI_COLORS.yellow;
      default: return ANSI_COLORS.white;
    }
  }

  /**
   * Get color for metric type
   */
  private getMetricTypeColor(type: TelemetryMetric['type']): string {
    switch (type) {
      case 'counter': return ANSI_COLORS.blue;
      case 'histogram': return ANSI_COLORS.green;
      case 'gauge': return ANSI_COLORS.yellow;
      case 'timer': return ANSI_COLORS.cyan;
      default: return ANSI_COLORS.white;
    }
  }

  /**
   * Get icon for metric type
   */
  private getMetricTypeIcon(type: TelemetryMetric['type']): string {
    switch (type) {
      case 'counter': return '📊';
      case 'histogram': return '📈';
      case 'gauge': return '⚡';
      case 'timer': return '⏱';
      default: return '📋';
    }
  }

  private drawFooter() {
    const maxTabs = this.processConfigs.length + 1;
    const shortcuts = [
      `1-${maxTabs}: Switch tab`,
      'Tab: Next',
      'c: Clear',
      'r: Refresh',
      'h: Help',
      'q: Quit'
    ];
    
    console.log(`${ANSI_COLORS.dim}${shortcuts.join(' | ')}${ANSI_COLORS.reset}`);
  }

  private drawSeparator() {
    const width = process.stdout.columns || 80;
    const separator = '─'.repeat(width);
    console.log(`${ANSI_COLORS.dim}${separator}${ANSI_COLORS.reset}`);
  }

  private drawCurrentProcessLogs() {
    const logs = this.processLogs.get(this.currentProcess) || [];
    const visibleLogs = logs.slice(-15); // Show last 15 log entries
    
    if (visibleLogs.length === 0) {
      console.log(`${ANSI_COLORS.dim}No logs yet...${ANSI_COLORS.reset}\n`);
      return;
    }

    visibleLogs.forEach(log => {
      const timestamp = this.formatTime(log.timestamp);
      const icon = this.getLogIcon(log.type);
      const color = this.getLogColor(log.type);
      
      console.log(`${ANSI_COLORS.dim}${timestamp}${ANSI_COLORS.reset} ${color}${icon}${ANSI_COLORS.reset} ${log.message}`);
    });
    
    console.log(); // Empty line for spacing
  }

  private getMethodColor(method: string): string {
    switch (method.toUpperCase()) {
      case 'GET': return ANSI_COLORS.green;
      case 'POST': return ANSI_COLORS.blue;
      case 'PUT': return ANSI_COLORS.yellow;
      case 'PATCH': return ANSI_COLORS.cyan;
      case 'DELETE': return ANSI_COLORS.red;
      default: return ANSI_COLORS.white;
    }
  }

  private getStatusColor(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) return ANSI_COLORS.green;
    if (statusCode >= 300 && statusCode < 400) return ANSI_COLORS.cyan;
    if (statusCode >= 400 && statusCode < 500) return ANSI_COLORS.yellow;
    if (statusCode >= 500) return ANSI_COLORS.red;
    return ANSI_COLORS.white;
  }

  private getStatusClass(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 300 && statusCode < 400) return 'redirect';
    if (statusCode >= 400 && statusCode < 500) return 'client-error';
    if (statusCode >= 500) return 'server-error';
    return 'unknown';
  }

  private getLogIcon(type: ProcessLogEntry['type']): string {
    switch (type) {
      case 'success': return '◆';
      case 'error': case 'stderr': return '◇';
      case 'warn': return '◇';
      case 'info': return '◇';
      default: return '○';
    }
  }

  private getLogColor(type: ProcessLogEntry['type']): string {
    switch (type) {
      case 'success': return ANSI_COLORS.green;
      case 'error': case 'stderr': return ANSI_COLORS.red;
      case 'warn': return ANSI_COLORS.yellow;
      case 'info': return ANSI_COLORS.cyan;
      default: return ANSI_COLORS.white;
    }
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  private getStatusDisplay(status: ProcessStatus['status']): string {
    switch (status) {
      case 'starting': return `${ANSI_COLORS.yellow}Starting${ANSI_COLORS.reset}`;
      case 'running': return `${ANSI_COLORS.green}Running${ANSI_COLORS.reset}`;
      case 'error': return `${ANSI_COLORS.red}Error${ANSI_COLORS.reset}`;
      case 'stopped': return `${ANSI_COLORS.gray}Stopped${ANSI_COLORS.reset}`;
      default: return status;
    }
  }

  private startApiMonitoring() {
    // Try to connect to Redis for real-time API monitoring
    this.connectToRedis();
  }
  
  private async connectToRedis() {
    try {
      // Try to import Redis client dynamically
      const Redis = await import('ioredis').then(m => m.default).catch(() => null);
      
      if (!Redis) {
        console.warn('Redis not installed - API monitoring will use demo mode only');
        return;
      }
      
      const url = process.env.REDIS_URL || 'redis://localhost:6379';

      const redis = new Redis(url);
      
      // Test connection
      await redis.ping();
      
      // Subscribe to API requests and telemetry channels
      const subscriber = redis.duplicate();
      await subscriber.subscribe('igniter:api-requests', 'igniter:telemetry');
      
      subscriber.on('message', (channel, message) => {
        if (channel === 'igniter:api-requests') {
          try {
            const data = JSON.parse(message);
            if (data.type === 'api-request' && data.data) {
              // Convert timestamp string back to Date object
              data.data.timestamp = new Date(data.data.timestamp);
              this.addApiRequest(data.data);
            }
          } catch (error) {
            console.warn('Failed to parse API request message:', error);
          }
        } else if (channel === 'igniter:telemetry') {
          try {
            const data = JSON.parse(message);
            if (data.type === 'telemetry-event' && data.data) {
              // Convert timestamp string back to Date object
              data.data.timestamp = new Date(data.data.timestamp);
              this.addTelemetryEntry(data.data);
            }
          } catch (error) {
            console.warn('Failed to parse telemetry message:', error);
          }
        }
      });
      
    } catch (error) {
      // Redis connection failed - continue with demo mode
      console.warn('Redis connection failed - API monitoring will use demo mode only');
    }
  }

  async start() {
    this.logger.info('Starting interactive dashboard', {
      processCount: this.processConfigs.length
    });

    // Set environment variable to indicate interactive mode for child processes
    process.env.IGNITER_INTERACTIVE_MODE = 'true';

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

      // Handle process output - buffer instead of direct output
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

    // Initial dashboard render
    this.renderDashboard();

    // Set up periodic refresh for status updates (every 5 seconds)
    this.refreshInterval = setInterval(() => {
      this.renderDashboard();
    }, 5000);

    // Start API monitoring for demo purposes
    this.startApiMonitoring();

    // Wait for all processes to complete
    await Promise.all(
      this.processes.map(proc => new Promise<void>((resolve) => {
        proc.on('exit', resolve);
      }))
    );
  }

  private cleanup() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    if (this.apiMonitoringInterval) {
      clearInterval(this.apiMonitoringInterval);
    }
    
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    
    this.rl.close();
    
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

/**
 * Get the appropriate color for a framework
 */
function getFrameworkColor(framework: SupportedFramework): string {
  return PROCESS_COLORS[framework as keyof typeof PROCESS_COLORS] || PROCESS_COLORS.generic;
}

/**
 * Run multiple processes with interactive switching capability
 */
export async function runInteractiveProcesses(
  configs: ProcessConfig[]
): Promise<void> {
  const manager = new InteractiveProcessManager(configs);
  await manager.start();
}

/**
 * Run multiple processes concurrently with visual separation
 */
export async function runConcurrentProcesses(
  options: ConcurrentProcessesOptions
): Promise<void> {
  const logger = createChildLogger({ component: 'concurrent-processes' });
  
  // Use interactive mode if requested
  if (options.interactive) {
    return runInteractiveProcesses(options.processes);
  }
  
  logger.info('Starting concurrent processes', {
    processCount: options.processes.length,
    processes: options.processes.map(p => ({ name: p.name, command: p.command }))
  });

  try {

    const result: ConcurrentlyResult = await concurrently(
      options.processes.map(process => ({
        command: process.command,
        name: process.name,
        cwd: process.cwd,
        env: process.env ? { ...process.env } : undefined
      })),
      {
        prefix: 'name' as const,
        killOthers: ['failure', 'success'] as const,
        prefixLength: 10,
        restartTries: 0,
        successCondition: 'first' as const,
        raw: false,
      }
    );

    await result;
    logger.success('All processes completed successfully');
    
  } catch (error) {
    logger.error('Concurrent processes failed', { error: formatError(error) });
    throw error;
  }
}

/**
 * Create a process config for the Igniter watcher
 */
export function createIgniterWatcherProcess(options: {
  cwd?: string;
  debug?: boolean;
}): ProcessConfig {
  return {
    name: 'Igniter',
    command: `igniter watch${options.debug ? ' --debug' : ''}`,
    color: PROCESS_COLORS.igniter,
    cwd: options.cwd,
    env: {
      NODE_ENV: 'development',
      ...(options.debug && { DEBUG: 'true' })
    }
  };
}

/**
 * Create a process config for a framework dev server
 */
export function createFrameworkDevProcess(
  framework: SupportedFramework,
  command: string,
  options: {
    cwd?: string;
    port?: number;
    env?: Record<string, string>;
  } = {}
): ProcessConfig {
  return {
    name: framework === 'nextjs' ? 'Next.js' : 
          framework === 'sveltekit' ? 'SvelteKit' :
          framework.charAt(0).toUpperCase() + framework.slice(1),
    command,
    color: getFrameworkColor(framework),
    cwd: options.cwd,
    env: {
      NODE_ENV: 'development',
      ...(options.port && { PORT: options.port.toString() }),
      ...options.env
    }
  };
}

/**
 * Start both Igniter watcher and framework dev server concurrently
 */
export async function startIgniterWithFramework(options: {
  framework: SupportedFramework;
  frameworkCommand: string;
  cwd?: string;
  port?: number;
  debug?: boolean;
  igniterWatcherCommand?: string;
}): Promise<void> {
  const logger = createChildLogger({ component: 'igniter-with-framework' });
  
  logger.info('Starting Igniter with framework', {
    framework: options.framework,
    frameworkCommand: options.frameworkCommand,
    port: options.port,
    debug: options.debug
  });

  const processes: ProcessConfig[] = [
    createIgniterWatcherProcess({
      cwd: options.cwd,
      debug: options.debug
    }),
    createFrameworkDevProcess(
      options.framework,
      options.frameworkCommand,
      {
        cwd: options.cwd,
        port: options.port
      }
    )
  ];

  // Override igniter process command if provided
  if (options.igniterWatcherCommand) {
    processes[0].command = options.igniterWatcherCommand;
  }

  await runConcurrentProcesses({
    processes,
    killOthers: true,
    prefixFormat: 'name',
    prefixColors: true,
    prefixLength: 8
  });
}