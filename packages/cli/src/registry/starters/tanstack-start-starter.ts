import { BaseStarter } from '@/core/registry/starters/base-starter';
import path from 'path';

export class TanStackStartStarter extends BaseStarter {
  id = 'tanstack-start';
  name = 'TanStack Start';
  description = 'A type-safe full-stack starter with TanStack Start';
  hint = 'Fullstack';
  repository = 'starter-tanstack-start';
  templates = [
    {
      template: path.resolve(process.cwd(), 'templates/starters/tanstack-start/route-handler.hbs'),
      outputPath: 'src/routes/api/v1/$.ts',
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
      template: path.resolve(process.cwd(), 'templates/starters/tanstack-start/tsconfig.hbs'),
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
    { key: 'REACT_APP_IGNITER_API_URL', value: 'http://localhost:3000/', description: 'API URL' },
    { key: 'REACT_APP_IGNITER_API_BASE_PATH', value: '/api/v1', description: 'API base path' },
  ];
}
