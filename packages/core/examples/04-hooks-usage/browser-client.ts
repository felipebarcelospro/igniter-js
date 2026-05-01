// Validates: browser client creation returns a usable client type.
import { createIgniterClient } from '../../dist/client';
import { router } from './mock-router';

export const client = createIgniterClient<typeof router>({
  baseURL: 'http://localhost:3000',
  basePATH: '/', // Added missing basePATH property
  router,
});

type ClientType = typeof client;
const typedClient: ClientType = client;

void typedClient;

