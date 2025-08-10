import { describe, it, expect } from 'vitest';
import { introspectRouter } from './introspector';
import type { IgniterRouter } from '@igniter-js/core';

describe('introspector', () => {
  it('should introspect a simple router', () => {
    const router = {
      controllers: {
        users: {
          name: 'users',
          path: '/users',
          actions: {
            list: {
              name: 'list',
              path: '/',
              method: 'GET',
              handler: () => {},
            },
          },
        },
      },
    };

    const { schema } = introspectRouter(router as IgniterRouter<any, any, any, any, any>);

    const controllers = Object.values(schema.controllers);
    expect(controllers).toHaveLength(1);
    expect(controllers[0].name).toBe('users');

    const actions = Object.values(controllers[0].actions);
    expect(actions).toHaveLength(1);
    expect(actions[0].name).toBe('list');
  });
});
