import { spawn } from 'child_process';
import * as os from 'os';

// Run a command on the terminal, supports all major OS and returns a result object
export function runCommand(command: string, options?: { cwd?: string }): Promise<{ success: boolean; errorMessage?: string }> {
  return new Promise((resolve) => {
    let cmd: string = 'cmd';

    if (os.platform() !== 'win32') cmd = command;

    const child = spawn(cmd, { shell: true, cwd: options?.cwd });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, errorMessage: `Command exited with code ${code}` });
      }
    });

    child.on('error', (err) => {
      resolve({ success: false, errorMessage: err.message });
    });
  });
}

export function parseCommandOptions(data: Record<string, string | string[] | undefined>): string {
  return Object.entries(data).map(([key, value]) => {
    if (value === undefined) return '';
    if (Array.isArray(value)) {
      return value.map((v) => `--${key}=${v}`).join(' ');
    }
    return `--${key}=${value}`;
  }).join(' ');
}