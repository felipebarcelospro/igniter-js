import { describe, it, expect } from 'vitest';
import { Igniter } from '@igniter-js/core';

describe('IgniterBuilder - docs configuration fix', () => {
  it('should include docs configuration in router config object', () => {
    // Criar um router usando o builder com configuração docs
    const router = Igniter
      .context(() => ({ user: 'test' }))
      .config({
        baseURL: 'http://localhost:3000',
        basePATH: '/api/v1',
      })
      .docs({
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
          description: 'API de teste para verificar a correção',
        },
        servers: [
          { url: 'http://localhost:3000', description: 'Servidor de desenvolvimento' },
        ],
        playground: {
          enabled: true,
          route: '/docs',
        },
      })
      .create()
      .router({
        controllers: {
          test: {
            name: 'test',
            path: '/test',
            actions: {
              hello: {
                name: 'hello',
                path: '/',
                method: 'GET',
                handler: () => ({ message: 'Hello World' }),
              },
            },
          },
        },
      });

    // Verificar se a configuração docs está presente no config do router
    expect(router.config).toBeDefined();
    expect(router.config.docs).toBeDefined();
    expect(router.config.docs).toEqual({
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
        description: 'API de teste para verificar a correção',
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Servidor de desenvolvimento' },
      ],
      playground: {
        enabled: true,
        route: '/docs',
      },
    });

    // Verificar se as outras configurações também estão presentes
    expect(router.config.baseURL).toBe('http://localhost:3000');
    expect(router.config.basePATH).toBe('/api/v1');
  });

  it('should work without docs configuration', () => {
    // Criar um router sem configuração docs
    const router = Igniter
      .context(() => ({ user: 'test' }))
      .config({
        baseURL: 'http://localhost:3000',
        basePATH: '/api/v1',
      })
      .create()
      .router({
        controllers: {
          test: {
            name: 'test',
            path: '/test',
            actions: {
              hello: {
                name: 'hello',
                path: '/',
                method: 'GET',
                handler: () => ({ message: 'Hello World' }),
              },
            },
          },
        },
      });

    // Verificar se o config existe mas docs é undefined
    expect(router.config).toBeDefined();
    expect(router.config.docs).toEqual({});
    expect(router.config.baseURL).toBe('http://localhost:3000');
    expect(router.config.basePATH).toBe('/api/v1');
  });
});