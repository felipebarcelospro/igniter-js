import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ExecOptions {
  timeout?: number;
  cwd?: string;
  env?: Record<string, string>;
  loadDotEnv?: boolean;
  debug?: boolean;
  input?: string; // Added to pipe to stdin
  logFilePath?: string; // Path to stream stdout/stderr to
}

/**
 * Load environment variables from .env files
 */
function loadDotEnvFiles(startDir: string = process.cwd()): Record<string, string> {
  const envVars: Record<string, string> = {};
  const envFiles = ['.env', '.env.local', '.env.development', '.env.development.local'];
  
  // Search up the directory tree for .env files
  let currentDir = startDir;
  const maxDepth = 10; // Prevent infinite loops
  let depth = 0;
  
  while (depth < maxDepth) {
    for (const envFile of envFiles) {
      const envPath = path.join(currentDir, envFile);
      if (fs.existsSync(envPath)) {
        try {
          const content = fs.readFileSync(envPath, 'utf8');
          const lines = content.split('\n');
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
              const [key, ...valueParts] = trimmed.split('=');
              if (key && valueParts.length > 0) {
                let value = valueParts.join('=');
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                  value = value.slice(1, -1);
                }
                envVars[key.trim()] = value;
              }
            }
          }
        } catch (error) {
          // Ignore file read errors
        }
      }
    }
    
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
    depth++;
  }
  
  return envVars;
}

/**
 * Get comprehensive environment variables for agent execution
 */
export function getAgentEnvironment(options: ExecOptions = {}): Record<string, string> {
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  
  // Load .env files if requested (default: true)
  if (options.loadDotEnv !== false) {
    const dotEnvVars = loadDotEnvFiles(options.cwd);
    Object.assign(env, dotEnvVars);
  }
  
  // Add any explicitly provided env vars
  if (options.env) {
    Object.assign(env, options.env);
  }
  
  // Ensure critical agent environment variables are present
  const agentEnvVars = {
    // Anthropic (Claude)
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY,
    
    // Google (Gemini)
    GOOGLE_API_KEY: env.GOOGLE_API_KEY || env.GEMINI_API_KEY,
    
    // OpenAI (GPT)
    OPENAI_API_KEY: env.OPENAI_API_KEY || env.GPT_API_KEY,
    
    // Perplexity
    PERPLEXITY_API_KEY: env.PERPLEXITY_API_KEY,
    
    // Common proxy settings
    HTTP_PROXY: env.HTTP_PROXY || env.http_proxy,
    HTTPS_PROXY: env.HTTPS_PROXY || env.https_proxy,
    NO_PROXY: env.NO_PROXY || env.no_proxy,
    
    // Node.js specific
    NODE_ENV: env.NODE_ENV || 'development',
    PATH: env.PATH
  };
  
  // Only set non-undefined values
  for (const [key, value] of Object.entries(agentEnvVars)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }
  
  return env;
}

/**
 * Debug environment variables for troubleshooting
 */
function debugEnvironment(env: Record<string, string>, debug?: boolean): void {
  if (!debug) return;
  
  const agentKeys = [
    'ANTHROPIC_API_KEY', 'CLAUDE_API_KEY',
    'GOOGLE_API_KEY', 'GEMINI_API_KEY', 
    'OPENAI_API_KEY', 'GPT_API_KEY',
    'PERPLEXITY_API_KEY',
    'HTTP_PROXY', 'HTTPS_PROXY'
  ];
  
  console.log('\n=== Agent Environment Debug ===');
  for (const key of agentKeys) {
    const value = env[key];
    if (value) {
      const masked = value.length > 8 ? 
        `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : 
        '***';
      console.log(`${key}: ${masked}`);
    } else {
      console.log(`${key}: NOT SET`);
    }
  }
  console.log('================================\n');
}

/**
 * A more robust exec utility using `spawn` to handle streams and prevent hanging.
 */
export function execAsync(
  command: string,
  options: ExecOptions = {}
): Promise<{ stdout: string; stderr:string; pid: number }> {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    const env = getAgentEnvironment(options);
    let stdoutBuffer = '';
    let stderrBuffer = '';
    let timer: NodeJS.Timeout | null = null;
    let logStream: fs.WriteStream | null = null;

    if (options.debug) {
      debugEnvironment(env, true);
      console.log(`Executing command: ${command}`);
      console.log(`Working directory: ${options.cwd || process.cwd()}`);
    }

    if (options.logFilePath) {
      logStream = fs.createWriteStream(options.logFilePath, { flags: 'a' });
      logStream.write(`\n--- Command Execution Started: ${new Date().toISOString()} ---\n`);
      logStream.write(`Command: ${command}\n`);
      logStream.write(`Working Dir: ${options.cwd || process.cwd()}\n`);
      logStream.write(`-------------------------------------------\n`);
    }

    const child = spawn(cmd, args, {
      cwd: options.cwd || process.cwd(),
      env,
      shell: true, // Use shell to handle complex commands
    });

    if (options.timeout) {
      timer = setTimeout(() => {
        child.kill('SIGTERM'); // Terminate the process
        reject(new Error(`Command timed out after ${options.timeout}ms: ${command}`));
      }, options.timeout);
    }

    child.stdout.on('data', (data) => {
      const dataString = data.toString();
      stdoutBuffer += dataString;
      if (logStream) logStream.write(dataString);
    });

    child.stderr.on('data', (data) => {
      const dataString = data.toString();
      stderrBuffer += dataString;
      if (logStream) logStream.write(dataString);
    });

    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      if (logStream) {
        logStream.write(`\n--- Error Event: ${new Date().toISOString()} ---\n`);
        logStream.write(`Error: ${err.message}\n`);
        logStream.end();
      }
      reject(err);
    });

    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      if (logStream) {
        logStream.write(`\n--- Command Execution Finished with Code ${code}: ${new Date().toISOString()} ---\n`);
        logStream.end();
      }
      if (code === 0) {
        resolve({ stdout: stdoutBuffer, stderr: stderrBuffer, pid: child.pid! });
      } else {
        const error = new Error(`Command failed with exit code ${code}: ${command}\n\nStderr:\n${stderrBuffer}\n\nStdout:\n${stdoutBuffer}`);
        (error as any).exitCode = code;
        (error as any).stdout = stdoutBuffer;
        (error as any).stderr = stderrBuffer;
        reject(error);
      }
    });

    // Pipe input to stdin if provided
    if (options.input) {
      child.stdin.write(options.input);
      child.stdin.end();
    }
  });
}


/**
 * Execute a command with enhanced options and error handling
 */
export async function executeCommand(
  command: string, 
  options: ExecOptions = {}
): Promise<{ stdout: string; stderr: string; pid: number }> {
  return execAsync(command, options);
}

/**
 * Validate agent environment setup
 */
export async function validateAgentEnvironment(): Promise<{
  valid: boolean;
  issues: string[];
  env_status: Record<string, boolean>;
}> {
  const env = getAgentEnvironment({ loadDotEnv: true });
  const issues: string[] = [];
  const env_status: Record<string, boolean> = {};
  
  const requiredVars = {
    'ANTHROPIC_API_KEY': 'Claude agent',
    'GOOGLE_API_KEY': 'Gemini agent', 
    'OPENAI_API_KEY': 'GPT agent'
  };
  
  for (const [varName, description] of Object.entries(requiredVars)) {
    const hasVar = !!env[varName];
    env_status[varName] = hasVar;
    
    if (!hasVar) {
      issues.push(`Missing ${varName} for ${description}`);
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
    env_status
  };
}

/**
 * Get environment variable with fallbacks
 */
export function getEnvVar(primaryKey: string, ...fallbackKeys: string[]): string | undefined {
  const env = getAgentEnvironment({ loadDotEnv: true });
  
  for (const key of [primaryKey, ...fallbackKeys]) {
    if (env[key]) {
      return env[key];
    }
  }
  
  return undefined;
}

/**
 * Create shell environment setup commands
 */
export function generateEnvSetupCommands(shell: 'bash' | 'zsh' = 'zsh'): string[] {
  const shellFile = shell === 'bash' ? '~/.bashrc' : '~/.zshrc';
  
  return [
    `# Add these lines to your ${shellFile} file:`,
    '',
    '# Agent API Keys',
    'export ANTHROPIC_API_KEY="your-anthropic-api-key-here"',
    'export GOOGLE_API_KEY="your-google-api-key-here"', 
    'export OPENAI_API_KEY="your-openai-api-key-here"',
    '',
    '# Optional: Proxy settings (if needed)',
    '# export HTTP_PROXY="http://proxy.example.com:8080"',
    '# export HTTPS_PROXY="http://proxy.example.com:8080"',
    '',
    '# Then reload your shell:',
    `source ${shellFile}`,
    '',
    '# Or create a .env file in your project root with:',
    'ANTHROPIC_API_KEY=your-anthropic-api-key-here',
    'GOOGLE_API_KEY=your-google-api-key-here',
    'OPENAI_API_KEY=your-openai-api-key-here'
  ];
}