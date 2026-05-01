// Mock router used for client type validation.
import { Igniter } from '@igniter-js/core';

const igniter = Igniter.create().build();

const healthController = igniter.controller({
  path: '/health',
  name: 'health',
  description: 'Health check controller',
  actions: {
    ping: igniter.query({
      path: '/ping',
      handler: ({ response }) => response.success({ ok: true }),
    }),
  },
});

export const router = igniter.router
  .create()
  .addController('health', healthController)
  .build();
