import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import chokidar from 'chokidar';
import { render } from 'ink';
import React from 'react';
import { detectPackageManager } from '@/core/package-manager';
import { generateSchemaWatchMode } from '../generate/schema/action';
import { generateDocsWatchMode } from '../generate/docs/action';
import { DevUI, type LogEntry } from './components';
import type { DevCommandOptions } from './types';

function getDefaultDevCommand(packageManager: string): string {
  switch (packageManager) {
    case 'yarn':
      return 'yarn dev';
    case 'pnpm':
      return 'pnpm dev';
    case 'bun':
      return 'bun dev';
    default:
      return 'npm run dev';
  }
}

async function regenerateSchemaAndDocs(
  routerPath: string,
  outputPath: string,
  docsOutputDir: string,
  addLog: (log: LogEntry) => void,
): Promise<void> {
  try {
    const schemaResult = await generateSchemaWatchMode(routerPath, outputPath);
    addLog({
      type: 'success',
      message: `Schema regenerated in ${(schemaResult.durationMs / 1000).toFixed(2)}s (${schemaResult.controllers} controllers, ${schemaResult.actions} actions)`,
      timestamp: new Date(),
    });

    const docsResult = await generateDocsWatchMode(routerPath, docsOutputDir);
    addLog({
      type: 'success',
      message: `OpenAPI docs regenerated in ${(docsResult.durationMs / 1000).toFixed(2)}s (${docsResult.sizeKb.toFixed(1)} KB)`,
      timestamp: new Date(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addLog({
      type: 'error',
      message: `Failed to regenerate: ${errorMessage}`,
      timestamp: new Date(),
    });
  }
}

export async function handleDevAction(options: DevCommandOptions): Promise<void> {
  // Setup
  const packageManager = detectPackageManager();
  const routerPath = path.resolve(process.cwd(), options.router || 'src/igniter.router.ts');
  const outputPath = options.output || 'src/igniter.schema.ts';
  const docsOutputDir = options.docsOutput || './src/docs';
  const devCommand = options.cmd || getDefaultDevCommand(packageManager);

  // Validate router exists
  if (!fs.existsSync(routerPath)) {
    console.error(`Router file not found: ${routerPath}`);
    process.exit(1);
  }

  // State for logs
  const igniterLogs: LogEntry[] = [];
  const appLogs: LogEntry[] = [];

  let rerenderFn: (() => void) | null = null;

  const addIgniterLog = (log: LogEntry) => {
    igniterLogs.push(log);
    // Keep only last 1000 logs
    if (igniterLogs.length > 1000) {
      igniterLogs.shift();
    }
    if (rerenderFn) {
      rerenderFn();
    }
  };

  const addAppLog = (log: LogEntry) => {
    appLogs.push(log);
    // Keep only last 1000 logs
    if (appLogs.length > 1000) {
      appLogs.shift();
    }
    if (rerenderFn) {
      rerenderFn();
    }
  };

  // Initial generation
  try {
    const docsResult = await generateDocsWatchMode(routerPath, docsOutputDir);
    addIgniterLog({
      type: 'success',
      message: `OpenAPI docs generated in ${(docsResult.durationMs / 1000).toFixed(2)}s (${docsResult.sizeKb.toFixed(1)} KB)`,
      timestamp: new Date(),
    });

    const schemaResult = await generateSchemaWatchMode(routerPath, outputPath);
    addIgniterLog({
      type: 'success',
      message: `Schema generated in ${(schemaResult.durationMs / 1000).toFixed(2)}s (${schemaResult.controllers} controllers, ${schemaResult.actions} actions)`,
      timestamp: new Date(),
    });    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addIgniterLog({
      type: 'error',
      message: `Failed to generate: ${errorMessage}`,
      timestamp: new Date(),
    });
    process.exit(1);
  }

  // Setup watch paths
  const featuresDir = path.join(process.cwd(), 'src', 'features');
  const watchPaths = [
    routerPath, // Watch router file directly
    featuresDir, // Watch features directory recursively
  ].filter((p) => fs.existsSync(p));

  if (watchPaths.length === 0) {
    addIgniterLog({
      type: 'warn',
      message: 'No watchable paths found. Only watching router file.',
      timestamp: new Date(),
    });
    watchPaths.push(routerPath);
  }

  addIgniterLog({
    type: 'info',
    message: `Watching for changes in: ${watchPaths.map((p) => path.relative(process.cwd(), p)).join(', ')}`,
    timestamp: new Date(),
  });

  // Setup file watcher with debounce
  let regenerateTimeout: NodeJS.Timeout | null = null;
  const DEBOUNCE_MS = 300;

  const watcher = chokidar.watch(watchPaths, {
    ignored: [
      /node_modules/,
      /\.git/,
      /dist/,
      /\.next/,
      /\.turbo/,
      /\.cache/,
      /\.test\.ts$/,
      /\.spec\.ts$/,
    ],
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on('change', (filePath) => {
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Clear existing timeout
    if (regenerateTimeout) {
      clearTimeout(regenerateTimeout);
    }

    // Debounce regeneration
    regenerateTimeout = setTimeout(async () => {
      addIgniterLog({
        type: 'info',
        message: `File changed: ${relativePath}`,
        timestamp: new Date(),
      });
      await regenerateSchemaAndDocs(routerPath, outputPath, docsOutputDir, addIgniterLog);
    }, DEBOUNCE_MS);
  });

  watcher.on('error', (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addIgniterLog({
      type: 'error',
      message: `Watcher error: ${errorMessage}`,
      timestamp: new Date(),
    });
  });

  // Start dev server
  let devProcess: ChildProcess | null = null;

  if (devCommand) {
    addAppLog({
      type: 'info',
      message: `Starting dev server: ${devCommand}`,
      timestamp: new Date(),
    });
    
    const [cmd, ...args] = devCommand.split(' ');
    devProcess = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'development',
      },
      cwd: process.cwd(),
    });

    devProcess.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter((line) => line.trim());
      lines.forEach((line) => {
        addAppLog({
          type: 'info',
          message: line,
          timestamp: new Date(),
        });
      });
    });

    devProcess.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter((line) => line.trim());
      lines.forEach((line) => {
        addAppLog({
          type: 'error',
          message: line,
          timestamp: new Date(),
        });
      });
    });

    devProcess.on('error', (error: Error) => {
      addAppLog({
        type: 'error',
        message: `Dev server error: ${error.message}`,
        timestamp: new Date(),
      });
    });

    devProcess.on('exit', (code) => {
      if (code !== null && code !== 0) {
        addAppLog({
          type: 'warn',
          message: `Dev server exited with code ${code}`,
          timestamp: new Date(),
        });
      } else {
        addAppLog({
          type: 'info',
          message: 'Dev server stopped',
          timestamp: new Date(),
        });
      }
    });
  }

  // Cleanup function
  const cleanup = () => {
    if (regenerateTimeout) {
      clearTimeout(regenerateTimeout);
    }
    
    watcher.close();
    
    if (devProcess) {
      devProcess.kill('SIGTERM');
    }
  };

  // Render UI
  const DevComponent: React.FC = () => {
    return React.createElement(DevUI, {
      igniterLogs,
      appLogs,
      onExit: () => {
        cleanup();
        unmount();
        process.exit(0);
      },
    });
  };
  
  const { rerender, unmount } = render(React.createElement(DevComponent));
  rerenderFn = () => rerender(React.createElement(DevComponent));

  // Handle exit signals
  process.on('SIGINT', () => {
    cleanup();
    unmount();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    cleanup();
    unmount();
    process.exit(0);
  });

  // Wait for dev process if it exists
  if (devProcess) {
    await new Promise<void>((resolve) => {
      devProcess!.on('exit', () => resolve());
    });
  } else {
    // If no dev process, keep alive indefinitely
    await new Promise(() => {});
  }
}
