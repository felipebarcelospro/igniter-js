import { BaseStarter } from '@/core/registry/starters/base-starter';

export class BunReactStarter extends BaseStarter {
  id = 'bun-react-app';
  name = 'Bun + React (Vite)';
  description = 'A full-stack starter with Bun, React, and Vite';
  hint = 'Fullstack';
  repository = 'starter-bun-react-app';
  envVars = [
    { key: 'IGNITER_APP_NAME', value: 'Igniter App', description: 'Application name' },
    { key: 'IGNITER_APP_SECRET', value: 'my-secret-key', description: 'Application secret' },
    { key: 'IGNITER_API_URL', value: 'http://localhost:3000/', description: 'API URL' },
    { key: 'IGNITER_API_BASE_PATH', value: '/api/v1', description: 'API base path' },
  ];
}
