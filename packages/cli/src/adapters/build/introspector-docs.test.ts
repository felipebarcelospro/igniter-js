import { describe, it, expect } from 'vitest';
import { introspectRouter } from './introspector';
import type { IgniterRouter } from '@igniter-js/core';

describe('introspector - docs configuration', () => {
  it('should extract docs configuration from router config', () => {
    const mockRouter = {
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
      config: {
        baseURL: 'http://localhost:3000',
        basePATH: '/api/v1',
        docs: {
          info: {
            title: 'Test API',
            version: '1.0.0',
            description: 'A test API for Igniter.js',
          },
          servers: [
            { url: 'http://localhost:3000', description: 'Local Development Server' },
          ],
          playground: {
            enabled: true,
            route: '/docs',
          },
        },
      },
    } as IgniterRouter<any, any, any, any, any>;

    const { schema } = introspectRouter(mockRouter);

    // Verificar se a configuração docs foi extraída corretamente
    expect(schema.docs).toBeDefined();
    expect(schema.docs).toEqual({
      info: {
        title: 'Test API',
        version: '1.0.0',
        description: 'A test API for Igniter.js',
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Local Development Server' },
      ],
      playground: {
        enabled: true,
        route: '/docs',
      },
    });
  });

  it('should handle router without docs configuration', () => {
    const mockRouter = {
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
      config: {
        baseURL: 'http://localhost:3000',
        basePATH: '/api/v1',
      },
    } as IgniterRouter<any, any, any, any, any>;

    const { schema } = introspectRouter(mockRouter);

    // Verificar se docs é undefined quando não está presente
    expect(schema.docs).toBeUndefined();
  });

  it('should handle router without config at all', () => {
    const mockRouter = {
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
    } as IgniterRouter<any, any, any, any, any>;

    const { schema } = introspectRouter(mockRouter);

    // Verificar se docs é undefined quando config não existe
    expect(schema.docs).toBeUndefined();
  });

  it('should extract partial docs configuration', () => {
    const mockRouter = {
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
      config: {
        docs: {
          info: {
            title: 'Minimal API',
          },
        },
      },
    } as IgniterRouter<any, any, any, any, any>;

    const { schema } = introspectRouter(mockRouter);

    // Verificar se a configuração parcial docs foi extraída corretamente
    expect(schema.docs).toBeDefined();
    expect(schema.docs).toEqual({
      info: {
        title: 'Minimal API',
      },
    });
  });
});