import { PackageManager } from "../commands/init/types";

export function getInstallCommand(pm: PackageManager): { command: string; args: string[] } {
  switch (pm) {
    case 'yarn':
      return { command: 'yarn', args: ['install'] };
    case 'pnpm':
      return { command: 'pnpm', args: ['install'] };
    case 'bun':
      return { command: 'bun', args: ['install'] };
    default:
      return { command: 'npm', args: ['install'] };
  }
}

export function detectPackageManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent;
  if (userAgent) {
    if (userAgent.startsWith('yarn')) return 'yarn';
    if (userAgent.startsWith('pnpm')) return 'pnpm';
    if (userAgent.startsWith('bun')) return 'bun';
  }
  return 'npm';
}

export function getPackageManagerCommand(pm: PackageManager, command?: string): string {
  switch (pm) {
    case 'npm':
      return command ? `npx ${command}` : 'npx';
    case 'pnpm':
      return command ? `pnpx ${command}` : 'pnpx';
    case 'bun':
      return command ? `bunx ${command}` : 'bunx';
    case 'yarn':
      return command ? `yarn dlx ${command}` : 'yarn dlx';
    default:
      return command ? `npx ${command}` : 'npx';
  }
}
