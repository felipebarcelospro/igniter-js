import path from 'path';
import { BaseStarter } from '../../core/registry/starters/base-starter';
import type { ProjectSetupConfig } from '@/commands/init/types';
import { getPackageManagerCommand } from '@/core/package-manager';
import { runCommand } from '@/core/terminal';

export class NextJsStarter extends BaseStarter {
  id = 'nextjs';
  name = 'Next.js';
  description = 'A full-stack starter with Next.js';
  hint = 'Fullstack';
  repository = 'starter-nextjs';
  templates = [
    {
      template: path.resolve(process.cwd(), 'templates/starters/nextjs/route-handler.hbs'),
      outputPath: 'src/app/api/v1/[[...all]]/route.ts',
    },
    {
      template: path.resolve(process.cwd(), 'templates/starters/igniter.router.hbs'),
      outputPath: 'src/igniter.router.ts',
    },
    {
      template: path.resolve(process.cwd(), 'templates/starters/igniter.client.hbs'),
      outputPath: 'src/igniter.client.ts',
    },
    {
      template: path.resolve(process.cwd(), 'templates/starters/igniter.context.hbs'),
      outputPath: 'src/igniter.context.ts',
    },
    {
      template: path.resolve(process.cwd(), 'templates/starters/igniter.hbs'),
      outputPath: 'src/igniter.ts',
    },
    {
      template: path.resolve(process.cwd(), 'templates/scaffold/example-feature/example.controller.hbs'),
      outputPath: 'src/features/example/controllers/example.controller.ts',
    },
    {
      template: path.resolve(process.cwd(), 'templates/scaffold/example-feature/example.procedure.hbs'),
      outputPath: 'src/features/example/procedures/example.procedure.ts',
    },
    {
      template: path.resolve(process.cwd(), 'templates/scaffold/example-feature/example.interfaces.hbs'),
      outputPath: 'src/features/example/example.interfaces.ts',
    },
    {
      template: path.resolve(process.cwd(), 'templates/starters/nextjs/tsconfig.hbs'),
      outputPath: 'tsconfig.json',
    },
    {
      template: path.resolve(process.cwd(), 'templates/starters/open-api.hbs'),
      outputPath: 'src/docs/openapi.json',
    },
  ];
  dependencies = [
    { name: '@igniter-js/core', version: 'latest', type: 'dependency' },
  ];
  envVars = [
    { key: 'IGNITER_APP_NAME', value: 'Igniter App', description: 'Application name' },
    { key: 'IGNITER_APP_SECRET', value: 'my-secret-key', description: 'Application secret' },
    { key: 'IGNITER_API_URL', value: 'http://localhost:3000/', description: 'API URL' },
    { key: 'IGNITER_API_BASE_PATH', value: '/api/v1', description: 'API base path' },
    { key: 'NEXT_PUBLIC_IGNITER_API_URL', value: 'http://localhost:3000/', description: 'API URL' },
    { key: 'NEXT_PUBLIC_IGNITER_API_BASE_PATH', value: '/api/v1', description: 'API base path' },
  ];
  public async install(targetDir: string, options: ProjectSetupConfig): Promise<void> {
    let command = ''
    const baseOptions = `--typescript --eslint --tailwind --app-router --turbopack --src-dir --no-linter --use-${options.packageManager} --skip-install --disable-git --yes`;

    if(options.packageManager === 'npm') {
      command = `npx create-next-app@latest ${options.projectName} ${baseOptions}`;
    } else if(options.packageManager === 'yarn') {
      command = `yarn create next-app@latest ${options.projectName} ${baseOptions}`;
    } else if(options.packageManager === 'pnpm') {
      command = `pnpm create next-app@latest ${options.projectName} ${baseOptions}`;
    } else if(options.packageManager === 'bun') {
      command = `bun create next-app@latest ${options.projectName} ${baseOptions}`;
    }

    await runCommand(`${command}`);

    options.mode = 'install';
    return super.install(targetDir, options);
  }
}
