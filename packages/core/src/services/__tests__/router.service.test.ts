import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createIgniterRouter } from '../router.service';

// Mock the RequestProcessor
vi.mock('../../processors', () => ({
  RequestProcessor: vi.fn().mockImplementation((config) => ({
    process: vi.fn().mockResolvedValue(new Response('OK')),
    call: vi.fn().mockResolvedValue({ success: true }),
    config,
  })),
}));

// Mock the server caller
vi.mock('../caller.server.service', () => ({
  createServerCaller: vi.fn().mockReturnValue({
    users: {
      list: {
        query: vi.fn(),
        useQuery: vi.fn(),
      },
      create: {
        mutate: vi.fn(),
        useMutation: vi.fn(),
      },
    },
  }),
}));

import { RequestProcessor } from '../../processors';
import { createServerCaller } from '../caller.server.service';

// Mock data
const mockContext = {
  userId: 'test-user',
  db: {},
  logger: {},
};

const mockAsyncContext = async () => ({
  userId: 'async-user',
  db: {},
  logger: {},
});

const mockControllers = {
  users: {
    name: 'users',
    path: 'users',
    actions: {
      list: {
        path: '',
        method: 'GET',
        handler: vi.fn(),
      },
      create: {
        path: '',
        method: 'POST',
        handler: vi.fn(),
      },
    },
  },
  posts: {
    name: 'posts',
    path: 'posts',
    actions: {
      list: {
        path: '',
        method: 'GET',
        handler: vi.fn(),
      },
    },
  },
};

const mockConfig = {
  baseURL: '/api',
  basePATH: '/v1',
};

const mockPlugins = {
  auth: {
    name: 'auth',
    $meta: { version: '1.0.0' },
    $config: { secret: 'test-secret' },
    $actions: {},
    $controllers: {},
    $events: { emits: {}, listens: {} },
    registration: {
      discoverable: true,
      version: '1.0.0',
      requiresFramework: '1.0.0',
      category: ['auth'],
      author: 'test',
    },
    dependencies: { requires: [], provides: [], conflicts: [] },
    hooks: {},
    middleware: {},
    resources: { resources: [], cleanup: vi.fn() },
  },
};

describe('Router Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createIgniterRouter', () => {
    it('should create a router with basic configuration', () => {
      const router = createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: mockConfig,
      });

      expect(router).toBeDefined();
      expect(router).toHaveProperty('$context');
      expect(router).toHaveProperty('$plugins');
      expect(router).toHaveProperty('$caller');
      expect(router).toHaveProperty('controllers');
      expect(router).toHaveProperty('config');
      expect(router).toHaveProperty('handler');
    });

    it('should preserve the controllers configuration', () => {
      const router = createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: mockConfig,
      });

      expect(router.controllers).toBe(mockControllers);
    });

    it('should preserve the config with baseURL and basePATH', () => {
      const router = createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: mockConfig,
      });

      expect(router.config).toEqual(expect.objectContaining({
        baseURL: '/api',
        basePATH: '/v1',
      }));
    });

    it('should handle async context factory', () => {
      const router = createIgniterRouter({
        context: mockAsyncContext,
        controllers: mockControllers,
        config: mockConfig,
      });

      expect(router).toBeDefined();
      expect(typeof router.handler).toBe('function');
    });

    it('should handle plugins configuration', () => {
      const router = createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: mockConfig,
        // @ts-expect-error - mockPlugins is not a valid property
        plugins: mockPlugins,
      });

      expect(router).toBeDefined();
      expect(router.$plugins).toEqual({});
    });
  });

  describe('RequestProcessor Integration', () => {
    it('should create RequestProcessor with correct configuration', () => {
      createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: mockConfig,
        // @ts-expect-error - mockPlugins is not a valid property
        plugins: mockPlugins,
      });

      expect(RequestProcessor).toHaveBeenCalledWith({
        baseURL: '/api',
        basePATH: '/v1',
        controllers: mockControllers,
        plugins: mockPlugins,
        context: mockContext,
      });
    });

    it('should create RequestProcessor without plugins when not provided', () => {
      createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: mockConfig,
      });

      expect(RequestProcessor).toHaveBeenCalledWith({
        baseURL: '/api',
        basePATH: '/v1',
        controllers: mockControllers,
        plugins: undefined,
        context: mockContext,
      });
    });

    it('should handle empty config gracefully', () => {
      const emptyConfig = {};

      createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: emptyConfig as any,
      });

      expect(RequestProcessor).toHaveBeenCalledWith({
        baseURL: undefined,
        basePATH: undefined,
        controllers: mockControllers,
        plugins: undefined,
        context: mockContext,
      });
    });
  });

  describe('Server Caller Integration', () => {
    it('should create server caller with controllers and processor', () => {
      createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: mockConfig,
      });

      expect(createServerCaller).toHaveBeenCalledWith(
        mockControllers,
        expect.any(Object) // The processor instance
      );
    });

    it('should provide $caller property with correct structure', () => {
      const router = createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: mockConfig,
      });

      expect(router.$caller).toBeDefined();
      expect(router.$caller).toHaveProperty('users');
      expect(router.$caller.users).toHaveProperty('list');
      expect(router.$caller.users).toHaveProperty('create');
    });
  });

  describe('Handler Function', () => {
    it('should provide an async handler function', () => {
      const router = createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: mockConfig,
      });

      expect(typeof router.handler).toBe('function');
      expect(router.handler.constructor.name).toBe('AsyncFunction');
    });

    it('should call processor.process when handler is invoked', async () => {
      const router = createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: mockConfig,
      });

      const mockRequest = new Request('http://localhost/api/v1/users');
      const mockResponse = new Response('OK');

      const MockedRequestProcessor = RequestProcessor as any;
      const processorInstance = MockedRequestProcessor.mock.results[0].value;
      processorInstance.process.mockResolvedValue(mockResponse);

      const result = await router.handler(mockRequest);

      expect(processorInstance.process).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockResponse);
    });

    it('should handle errors from processor gracefully', async () => {
      const router = createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: mockConfig,
      });

      const mockRequest = new Request('http://localhost/api/v1/users');
      const mockError = new Error('Processor error');

      const MockedRequestProcessor = RequestProcessor as any;
      const processorInstance = MockedRequestProcessor.mock.results[0].value;
      processorInstance.process.mockRejectedValue(mockError);

      await expect(router.handler(mockRequest)).rejects.toThrow('Processor error');
    });
  });

  describe('Type Safety and Structure', () => {
    it('should maintain proper type structure for $context', () => {
      const router = createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: mockConfig,
      });

      expect(router.$context).toEqual({});
      expect(typeof router.$context).toBe('object');
    });

    it('should maintain proper type structure for $plugins', () => {
      const router = createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: mockConfig,
        // @ts-expect-error - mockPlugins is not a valid property
        plugins: mockPlugins,
      });

      expect(router.$plugins).toEqual({});
      expect(typeof router.$plugins).toBe('object');
    });

    it('should handle complex nested controllers', () => {
      const complexControllers = {
        users: {
          name: 'users',
          path: 'users',
          actions: {
            list: { path: '', method: 'GET', handler: vi.fn() },
            create: { path: '', method: 'POST', handler: vi.fn() },
            update: { path: '/:id', method: 'PUT', handler: vi.fn() },
            delete: { path: '/:id', method: 'DELETE', handler: vi.fn() },
          },
        },
        posts: {
          name: 'posts',
          path: 'posts',
          actions: {
            list: { path: '', method: 'GET', handler: vi.fn() },
            create: { path: '', method: 'POST', handler: vi.fn() },
            publish: { path: '/:id/publish', method: 'POST', handler: vi.fn() },
            unpublish: { path: '/:id/unpublish', method: 'POST', handler: vi.fn() },
          },
        },
        categories: {
          name: 'categories',
          path: 'categories',
          actions: {
            list: { path: '', method: 'GET', handler: vi.fn() },
          },
        },
      };

      const router = createIgniterRouter({
        context: mockContext,
        controllers: complexControllers,
        config: mockConfig,
      });

      expect(router.controllers).toBe(complexControllers);
      expect(Object.keys(router.controllers)).toHaveLength(3);
    });
  });

  describe('Configuration Variations', () => {
    it('should handle minimal configuration', () => {
      const minimalConfig = {};

      const router = createIgniterRouter({
        context: {},
        controllers: {},
        config: minimalConfig as any,
      });

      expect(router).toBeDefined();
      expect(router.config).toEqual(expect.objectContaining(minimalConfig));
    });

    it('should handle configuration with only baseURL', () => {
      const configWithBaseURL = { baseURL: '/api' };

      const router = createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: configWithBaseURL,
      });

      expect(router.config.baseURL).toBe('/api');
      // @ts-expect-error - basePATH is not a valid property
      expect(router.config.basePATH).toBeUndefined();
    });

    it('should handle configuration with only basePATH', () => {
      const configWithBasePATH = { basePATH: '/v1' };

      const router = createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: configWithBasePATH,
      });

      expect(router.config.basePATH).toBe('/v1');
      // @ts-expect-error - baseURL is not a valid property
      expect(router.config.baseURL).toBeUndefined();
    });

    it('should handle additional config properties', () => {
      const extendedConfig = {
        baseURL: '/api',
        basePATH: '/v1',
        customProperty: 'custom-value',
        debug: true,
      };

      const router = createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: extendedConfig,
      });

      expect(router.config).toEqual(expect.objectContaining(extendedConfig));
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty controllers object', () => {
      const router = createIgniterRouter({
        context: mockContext,
        controllers: {},
        config: mockConfig,
      });

      expect(router.controllers).toEqual({});
      expect(Object.keys(router.controllers)).toHaveLength(0);
    });

    it('should handle null context gracefully', () => {
      const router = createIgniterRouter({
        context: null as any,
        controllers: mockControllers,
        config: mockConfig,
      });

      expect(router).toBeDefined();
    });

    it('should handle undefined plugins gracefully', () => {
      const router = createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: mockConfig,
        plugins: undefined,
      });

      expect(router).toBeDefined();
      expect(router.$plugins).toEqual({});
    });

    it('should handle empty plugins object', () => {
      const router = createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: mockConfig,
        plugins: {},
      });

      expect(router).toBeDefined();
      expect(router.$plugins).toEqual({});
    });
  });

  describe('Memory and Performance', () => {
    it('should maintain object references for controllers', () => {
      const router = createIgniterRouter({
        context: mockContext,
        controllers: mockControllers,
        config: mockConfig,
      });

      expect(router.controllers).toBe(mockControllers);
    });

    it('should handle large controller configurations', () => {
      const largeControllers: Record<string, any> = {};

      // Create 50 controllers with 10 actions each
      for (let i = 0; i < 50; i++) {
        const actions: Record<string, any> = {};
        for (let j = 0; j < 10; j++) {
          actions[`action${j}`] = {
            path: `action${j}`,
            method: 'GET',
            handler: vi.fn(),
          };
        }
        largeControllers[`controller${i}`] = {
          name: `controller${i}`,
          path: `controller${i}`,
          actions,
        };
      }

      const router = createIgniterRouter({
        context: mockContext,
        controllers: largeControllers,
        config: mockConfig,
      });

      expect(router.controllers).toBe(largeControllers);
      expect(Object.keys(router.controllers)).toHaveLength(50);
    });

    it('should not create unnecessary object copies', () => {
      const contextRef = { test: 'value' };
      const controllersRef = { test: { name: 'test', path: 'test', actions: {} } };
      const configRef = { baseURL: '/test' };

      const router = createIgniterRouter({
        context: contextRef,
        controllers: controllersRef,
        config: configRef,
      });

      // Controllers should maintain reference
      expect(router.controllers).toBe(controllersRef);
      
      // Config should be spread (not the same reference, but containing same values)
      expect(router.config).toEqual(expect.objectContaining(configRef));
    });
  });
}); 