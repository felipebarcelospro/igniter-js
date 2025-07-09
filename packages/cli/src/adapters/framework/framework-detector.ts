import * as fs from 'fs'
import * as path from 'path'
import { spawn, ChildProcess } from 'child_process'
import { createChildLogger, formatError } from '../logger'
import { startIgniterWithFramework } from './concurrent-processes'

export type SupportedFramework = 'nextjs' | 'vite' | 'nuxt' | 'sveltekit' | 'remix' | 'astro' | 'express' | 'tanstack-start' | 'generic'

export interface FrameworkConfig {
  name: SupportedFramework
  devCommand: string
  buildCommand: string
  startCommand: string
  defaultPort: number
  configFiles: string[]
  packageDependencies: string[]
}

/**
 * Framework configurations mapping
 */
export const frameworkConfigs: Record<SupportedFramework, FrameworkConfig> = {
  nextjs: {
    name: 'nextjs',
    devCommand: 'npm run dev --turbo',
    buildCommand: 'npm run build',
    startCommand: 'npm run start',
    defaultPort: 3000,
    configFiles: ['next.config.js', 'next.config.ts', 'next.config.mjs'],
    packageDependencies: ['next']
  },
  vite: {
    name: 'vite',
    devCommand: 'npm run dev',
    buildCommand: 'npm run build',
    startCommand: 'npm run preview',
    defaultPort: 5173,
    configFiles: ['vite.config.js', 'vite.config.ts', 'vite.config.mjs'],
    packageDependencies: ['vite']
  },
  nuxt: {
    name: 'nuxt',
    devCommand: 'npm run dev',
    buildCommand: 'npm run build',
    startCommand: 'npm run start',
    defaultPort: 3000,
    configFiles: ['nuxt.config.js', 'nuxt.config.ts', 'nuxt.config.mjs'],
    packageDependencies: ['nuxt', '@nuxt/kit']
  },
  sveltekit: {
    name: 'sveltekit',
    devCommand: 'npm run dev',
    buildCommand: 'npm run build',
    startCommand: 'npm run preview',
    defaultPort: 5173,
    configFiles: ['svelte.config.js', 'svelte.config.ts'],
    packageDependencies: ['@sveltejs/kit', 'svelte']
  },
  remix: {
    name: 'remix',
    devCommand: 'npm run dev',
    buildCommand: 'npm run build',
    startCommand: 'npm run start',
    defaultPort: 3000,
    configFiles: ['remix.config.js', 'remix.config.ts'],
    packageDependencies: ['@remix-run/node', '@remix-run/react']
  },
  astro: {
    name: 'astro',
    devCommand: 'npm run dev',
    buildCommand: 'npm run build',
    startCommand: 'npm run preview',
    defaultPort: 4321,
    configFiles: ['astro.config.js', 'astro.config.ts', 'astro.config.mjs'],
    packageDependencies: ['astro']
  },
  express: {
    name: 'express',
    devCommand: 'npm run dev',
    buildCommand: 'npm run build',
    startCommand: 'npm run start',
    defaultPort: 3000,
    configFiles: ['server.js', 'server.ts', 'app.js', 'app.ts'],
    packageDependencies: ['express']
  },
  'tanstack-start': {
    name: 'tanstack-start',
    devCommand: 'npm run dev',
    buildCommand: 'npm run build',
    startCommand: 'npm run start',
    defaultPort: 3000,
    configFiles: ['app.config.js', 'app.config.ts'],
    packageDependencies: ['@tanstack/start']
  },
  generic: {
    name: 'generic',
    devCommand: 'npm run dev',
    buildCommand: 'npm run build', 
    startCommand: 'npm run start',
    defaultPort: 3000,
    configFiles: [],
    packageDependencies: []
  }
}

/**
 * Detect the framework used in the current project
 */
export function detectFramework(cwd: string = process.cwd()): SupportedFramework {
  const logger = createChildLogger({ component: 'framework-detector' })
  
  logger.debug('Starting framework detection', { cwd })
  
  // Check for framework-specific config files first (most reliable)
  for (const [frameworkName, config] of Object.entries(frameworkConfigs)) {
    if (frameworkName === 'generic') continue // Skip generic, use as fallback
    
    logger.debug('Checking config files', {
      framework: frameworkName,
      configFiles: config.configFiles
    })
    
    const hasConfigFile = config.configFiles.some(configFile => {
      const configPath = path.join(cwd, configFile)
      const exists = fs.existsSync(configPath)
      
      if (exists) {
        logger.debug('Found framework config file', {
          framework: frameworkName,
          configFile,
          path: configPath
        })
      }
      
      return exists
    })
    
    if (hasConfigFile) {
      return frameworkName as SupportedFramework
    }
  }
  
  // Fallback: check package.json dependencies
  try {
    const packageJsonPath = path.join(cwd, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      logger.debug('Reading package.json', { path: packageJsonPath })
      
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      }
      
      for (const [frameworkName, config] of Object.entries(frameworkConfigs)) {
        if (frameworkName === 'generic') continue
        
        logger.debug('Checking dependencies', {
          framework: frameworkName,
          dependencies: config.packageDependencies
        })
        
        const hasFrameworkDep = config.packageDependencies.some(dep => {
          const exists = !!allDeps[dep]
          if (exists) {
            logger.debug('Found framework dependency', {
              framework: frameworkName,
              dependency: dep,
              version: allDeps[dep]
            })
          }
          return exists
        })
        
        if (hasFrameworkDep) {
          logger.info('Framework detected via dependencies', { framework: frameworkName })
          return frameworkName as SupportedFramework
        }
      }
    }
  } catch (error) {
    logger.warn('Could not read package.json', { error: formatError(error) })
  }
  
  logger.info('No specific framework detected, using generic')
  return 'generic'
}

/**
 * Get the package manager used in the project
 */
export function detectPackageManager(cwd: string = process.cwd()): 'npm' | 'yarn' | 'pnpm' | 'bun' {
  const logger = createChildLogger({ component: 'package-manager-detector' })
  
  logger.debug('Detecting package manager', { cwd })
  
  if (fs.existsSync(path.join(cwd, 'bun.lockb'))) {
    logger.info('Detected package manager', { manager: 'bun' })
    return 'bun'
  }
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
    logger.info('Detected package manager', { manager: 'pnpm' })
    return 'pnpm'
  }
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
    logger.info('Detected package manager', { manager: 'yarn' })
    return 'yarn'
  }
  
  logger.info('No lockfile found, using npm')
  return 'npm'
}

/**
 * Build the dev command with the detected package manager
 */
export function buildDevCommand(
  framework: SupportedFramework,
  packageManager: string,
  customCommand?: string
): string {
  const logger = createChildLogger({ component: 'command-builder' })
  
  if (customCommand) {
    logger.info('Using custom command', { command: customCommand })
    return customCommand
  }
  
  const config = frameworkConfigs[framework]
  const baseCommand = config.devCommand
  
  // Replace npm with the detected package manager
  const finalCommand = baseCommand.replace('npm run', `${packageManager} run`)
  
  logger.info('Built dev command', {
    framework,
    packageManager,
    baseCommand,
    finalCommand
  })
  
  return finalCommand
}

export interface DevServerOptions {
  framework?: SupportedFramework
  command?: string
  port?: number
  debug?: boolean
  cwd?: string
  /**
   * Use concurrently to run with Igniter watcher
   * @default false
   */
  withIgniter?: boolean
  /**
   * Custom Igniter watcher command
   */
  igniterCommand?: string
}

/**
 * Create prefix for server logs to distinguish from CLI logs
 */
function createServerLogPrefix(): string {
  return '│  '
}

/**
 * Start the development server for the detected framework
 */
export async function startDevServer(options: DevServerOptions = {}): Promise<ChildProcess | void> {
  const logger = createChildLogger({ component: 'dev-server' });
  
  const cwd = options.cwd || process.cwd();
  const framework = options.framework || detectFramework(cwd);
  const packageManager = detectPackageManager(cwd);
  const config = frameworkConfigs[framework];
  
  const command = buildDevCommand(framework, packageManager, options.command);
  const port = options.port || config.defaultPort;
  
  // If withIgniter option is enabled, use concurrent processes
  if (options.withIgniter) {
    logger.info('Starting dev server with Igniter watcher', {
      framework,
      packageManager,
      command,
      port,
      igniterCommand: options.igniterCommand
    });

    try {
      await startIgniterWithFramework({
        framework,
        frameworkCommand: command,
        cwd,
        port,
        debug: options.debug,
        igniterWatcherCommand: options.igniterCommand
      });
      return; // No need to return ChildProcess as concurrently handles it
    } catch (error) {
      logger.error('Failed to start concurrent processes', { error: formatError(error) });
      throw error;
    }
  }
  
  // Original single process implementation
  logger.info('Starting dev server', {
    framework,
    packageManager,
    command,
    port
  });
  
  // Parse command to handle complex commands
  const [cmd, ...args] = command.split(' ');
  
  const serverProcess = spawn(cmd, args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    cwd,
    env: {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: 'development'
    }
  });
  
  const logPrefix = createServerLogPrefix();
  
  // Pipe server stdout with prefix
  serverProcess.stdout?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${logPrefix}${line}`);
      }
    });
  });
  
  // Pipe server stderr with prefix and red color
  serverProcess.stderr?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.error(`${logPrefix}\x1b[31m${line}\x1b[0m`);
      }
    });
  });
  
  serverProcess.on('error', (error) => {
    logger.error('Dev server error', { error: formatError(error) });
  });
  
  serverProcess.on('exit', (code) => {
    // Close the server log section visually
    console.log(`\n└${'─'.repeat(60)}┘\n`);
    
    if (code === 0) {
      logger.success('Dev server exited successfully');
    } else {
      logger.error('Dev server exited with error', { code });
    }
  });
  
  return serverProcess;
}

/**
 * Check if a framework is supported
 */
export function isFrameworkSupported(framework: string): framework is SupportedFramework {
  return framework in frameworkConfigs
}

/**
 * Get a comma-separated list of supported frameworks
 */
export function getFrameworkList(): string {
  return Object.keys(frameworkConfigs)
    .filter(f => f !== 'generic')
    .join(', ')
}

/**
 * Start development with both Igniter watcher and framework dev server
 * This is a convenience function that automatically detects the framework
 * and starts both processes using concurrently
 */
export async function startIgniterDev(options: {
  cwd?: string;
  port?: number;
  debug?: boolean;
  framework?: SupportedFramework;
  frameworkCommand?: string;
  igniterCommand?: string;
} = {}): Promise<void> {
  const logger = createChildLogger({ component: 'igniter-dev' });
  
  const cwd = options.cwd || process.cwd();
  const framework = options.framework || detectFramework(cwd);
  const packageManager = detectPackageManager(cwd);
  const config = frameworkConfigs[framework];
  
  const frameworkCommand = options.frameworkCommand || 
    buildDevCommand(framework, packageManager);
  
  logger.info('Starting Igniter development mode', {
    framework,
    packageManager,
    frameworkCommand,
    port: options.port || config.defaultPort
  });

  try {
    await startIgniterWithFramework({
      framework,
      frameworkCommand,
      cwd,
      port: options.port,
      debug: options.debug,
      igniterWatcherCommand: options.igniterCommand
    });
  } catch (error) {
    logger.error('Failed to start Igniter development', { error: formatError(error) });
    throw error;
  }
} 