import { describe, it, expect } from 'vitest';
import { introspectRouter } from './introspector';
import { OpenAPIGenerator } from '../docs/openapi-generator';
import type { IgniterRouter } from '@igniter-js/core';

describe('OpenAPI Generator Integration - docs configuration', () => {
  it('should generate OpenAPI spec with docs configuration from router', () => {
    // Simular um router completo com configuração docs
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
              schemas: {
                response: {
                  type: 'object',
                  properties: {
                    users: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            create: {
              name: 'create',
              path: '/',
              method: 'POST',
              handler: () => {},
              schemas: {
                body: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    email: { type: 'string' },
                  },
                  required: ['name', 'email'],
                },
                response: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                  },
                },
              },
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
            description: 'A comprehensive test API for Igniter.js',
          },
          servers: [
            { url: 'http://localhost:3000', description: 'Local Development Server' },
            { url: 'https://api.example.com', description: 'Production Server' },
          ],
          playground: {
            enabled: true,
            route: '/docs',
          },
        },
      },
    } as IgniterRouter<any, any, any, any, any>;

    // Simular o fluxo completo: introspectRouter -> OpenAPIGenerator
    const introspected = introspectRouter(mockRouter);
    
    console.log('Introspected schema docs:', JSON.stringify(introspected.schema.docs, null, 2));
    
    // Verificar se docs foi extraído corretamente
    expect(introspected.schema.docs).toBeDefined();
    expect(introspected.schema.docs?.info?.title).toBe('Test API');
    
    // Gerar o spec OpenAPI usando a configuração docs extraída
    const generator = new OpenAPIGenerator(introspected.schema.docs || {});
    const spec = generator.generate(introspected.schema);
    
    console.log('Generated OpenAPI spec info:', JSON.stringify(spec.info, null, 2));
    console.log('Generated OpenAPI spec servers:', JSON.stringify(spec.servers, null, 2));
    
    // Verificar se o spec OpenAPI foi gerado com as informações corretas
    expect(spec.info).toBeDefined();
    expect(spec.info.title).toBe('Test API');
    expect(spec.info.version).toBe('1.0.0');
    expect(spec.info.description).toBe('A comprehensive test API for Igniter.js');
    
    expect(spec.servers).toBeDefined();
    expect(spec.servers).toHaveLength(2);
    expect(spec.servers[0].url).toBe('http://localhost:3000');
    expect(spec.servers[1].url).toBe('https://api.example.com');
  });

  it('should handle missing docs configuration gracefully', () => {
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

    const introspected = introspectRouter(mockRouter);
    
    console.log('Introspected schema docs (should be undefined):', introspected.schema.docs);
    
    // Simular o que acontece no comando generate-docs quando docs é undefined
    const docsConfig = introspected.schema.docs || {};
    const generator = new OpenAPIGenerator(docsConfig);
    const spec = generator.generate(introspected.schema);
    
    console.log('Generated spec with empty docs config:', JSON.stringify(spec.info, null, 2));
    
    // Verificar se valores padrão são usados
    expect(spec.info.title).toBe('Igniter API');
    expect(spec.info.version).toBe('1.0.0');
    // Quando não há configuração docs, description não é definida
    expect(spec.info.description).toBeUndefined();
  });

  it('should reproduce the exact flow from generate-docs command', () => {
    const mockRouter = {
      controllers: {
        posts: {
          name: 'posts',
          path: '/posts',
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
            title: 'Blog API',
            version: '2.0.0',
            description: 'API for managing blog posts',
          },
          servers: [
            { url: 'https://blog.example.com/api', description: 'Production API' },
          ],
        },
      },
    } as IgniterRouter<any, any, any, any, any>;

    // Reproduzir exatamente o que acontece no comando generate-docs
    const introspected = introspectRouter(mockRouter);
    
    // Esta é a linha exata do comando generate-docs: introspected.schema.docs || {}
    const docsConfig = introspected.schema.docs || {};
    
    console.log('Docs config passed to OpenAPIGenerator:', JSON.stringify(docsConfig, null, 2));
    
    const generator = new OpenAPIGenerator(docsConfig);
    const spec = generator.generate(introspected.schema);
    
    // Verificar se a configuração foi aplicada corretamente
    expect(spec.info.title).toBe('Blog API');
    expect(spec.info.version).toBe('2.0.0');
    expect(spec.info.description).toBe('API for managing blog posts');
    expect(spec.servers[0].url).toBe('https://blog.example.com/api');
  });
});