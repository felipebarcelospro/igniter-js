import { BaseStarter } from '@/core/registry/starters/base-starter';

export class BunApiStarter extends BaseStarter {
  id = 'bun-rest-api';
  name = 'Bun';
  description = 'A high-performance REST API starter with Bun';
  hint = 'REST API';
  repository = 'starter-bun-rest-api';
  envVars = [
    { key: 'IGNITER_APP_NAME', value: 'Igniter App', description: 'Application name' },
    { key: 'IGNITER_APP_SECRET', value: 'my-secret-key', description: 'Application secret' },
    { key: 'IGNITER_API_URL', value: 'http://localhost:3000/', description: 'API URL' },
    { key: 'IGNITER_API_BASE_PATH', value: '/api/v1', description: 'API base path' },
  ];
}
