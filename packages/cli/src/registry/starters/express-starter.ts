import { BaseStarter } from '@/core/registry/starters/base-starter';
import path from 'path';

export class ExpressStarter extends BaseStarter {
  id = 'express-rest-api';
  name = 'Express.js';
  description = 'A classic REST API starter with Express.js';
  hint = 'REST API';
  repository = 'starter-express-rest-api';
  envVars = [
    { key: 'IGNITER_APP_NAME', value: 'Igniter App', description: 'Application name' },
    { key: 'IGNITER_APP_SECRET', value: 'my-secret-key', description: 'Application secret' },
    { key: 'IGNITER_API_URL', value: 'http://localhost:3000/', description: 'API URL' },
    { key: 'IGNITER_API_BASE_PATH', value: '/api/v1', description: 'API base path' },
  ];
}
