// Validates: browser client creation returns a usable client type.
import { createIgniterClient } from '@igniter-js/core/client';
import { router } from './mock-router';

const client = createIgniterClient<typeof router>({
  baseURL: 'http://localhost:3000',
  basePATH: '/', // Added missing basePATH property
  router,
});

type ClientType = typeof client;
const typedClient: ClientType = client;

void typedClient;

