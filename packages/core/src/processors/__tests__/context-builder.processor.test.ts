import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ContextBuilderProcessor } from '../context-builder.processor';
import { IgniterCookie } from '../../services/cookie.service';
import { IgniterResponseProcessor } from '../response.processor';
import { BodyParserProcessor } from '../body-parser.processor';
import { IgniterPluginManager } from '../../services/plugin.service';
import { IgniterLogLevel } from '../../types';

// Mock dependencies
vi.mock('../body-parser.processor', () => ({
  BodyParserProcessor: {
    parse: vi.fn().mockResolvedValue({ data: 'mocked-body' })
  }
}));

vi.mock('../../services/cookie.service');
vi.mock('../response.processor');

describe('ContextBuilderProcessor', () => {
  // Common test data
  const mockRequest = new Request('http://localhost:3000/api/test?query=value', {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      'Cookie': 'session=123'
    }),
    body: JSON.stringify({ test: 'data' })
  });

  const mockRouteParams = { id: '123' };
  const mockUrl = new URL('http://localhost:3000/api/test?query=value');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('build method', () => {
    it('should build context with function-based context config', async () => {
      const mockContextFn = vi.fn().mockResolvedValue({ user: { id: 1 } });
      const config = { context: mockContextFn };

      const result = await ContextBuilderProcessor.build(
        config as any,
        mockRequest,
        mockRouteParams,
        mockUrl
      );

      expect(result).toEqual(expect.objectContaining({
        request: expect.objectContaining({
          path: '/api/test',
          method: 'POST',
          params: mockRouteParams,
          query: { query: 'value' }
        }),
        response: expect.any(IgniterResponseProcessor),
        $context: { user: { id: 1 } },
        $plugins: {}
      }));
      expect(mockContextFn).toHaveBeenCalled();
    });

    it('should build context with object-based context config', async () => {
      const mockContext = { user: { id: 1 } };
      const config = { context: mockContext };

      const result = await ContextBuilderProcessor.build(
        config as any,
        mockRequest,
        mockRouteParams,
        mockUrl
      );

      expect(result).toEqual(expect.objectContaining({
        $context: { user: { id: 1 } },
        $plugins: {}
      }));
    });

    it('should build context with empty config', async () => {
      const result = await ContextBuilderProcessor.build(
        {} as any,
        mockRequest,
        mockRouteParams,
        mockUrl
      );

      expect(result).toEqual(expect.objectContaining({
        $context: {},
        $plugins: {}
      }));
    });

    it('should parse request components correctly', async () => {
      const result = await ContextBuilderProcessor.build(
        {} as any,
        mockRequest,
        mockRouteParams,
        mockUrl
      );

      expect(result.request).toEqual(expect.objectContaining({
        path: '/api/test',
        method: 'POST',
        params: mockRouteParams,
        headers: expect.any(Headers),
        cookies: expect.any(IgniterCookie),
        body: { data: 'mocked-body' },
        query: { query: 'value' }
      }));
    });
  });

  describe('enhanceWithPlugins method', () => {
    const baseContext = {
      request: {} as any,
      response: {} as any,
      $context: {},
      $plugins: {
        store: { connect: vi.fn() },
        logger: { log: vi.fn() },
        jobs: { createProxy: vi.fn().mockResolvedValue({ enqueue: vi.fn() }) },
        telemetry: { track: vi.fn() }
      }
    };

    it('should enhance context with all available plugins', async () => {
      const result = await ContextBuilderProcessor.enhanceWithPlugins(baseContext);

      expect(result.$context).toEqual(expect.objectContaining({
        store: expect.any(Object),
        logger: expect.any(Object),
        jobs: expect.any(Object),
        telemetry: expect.any(Object)
      }));
    });

    it('should handle missing plugins gracefully', async () => {
      const contextWithoutPlugins = {
        ...baseContext,
        $plugins: {}
      };

      const result = await ContextBuilderProcessor.enhanceWithPlugins(contextWithoutPlugins);

      expect(result.$context).toEqual({});
    });

    it('should handle jobs proxy creation failure', async () => {
      const contextWithFailingJobs = {
        ...baseContext,
        $plugins: {
          ...baseContext.$plugins,
          jobs: { createProxy: vi.fn().mockRejectedValue(new Error('Proxy creation failed')) }
        }
      };

      const result = await ContextBuilderProcessor.enhanceWithPlugins(contextWithFailingJobs);

      expect(result.$context).not.toHaveProperty('jobs');
      expect(result.$context).toHaveProperty('store');
      expect(result.$context).toHaveProperty('logger');
      expect(result.$context).toHaveProperty('telemetry');
    });

    it('should inject plugin proxies when plugin manager is provided', async () => {
      const mockPluginManager = {
        getAllPluginProxies: vi.fn().mockReturnValue({
          testPlugin: {
            method: vi.fn(),
            context: null
          }
        }),
        emit: vi.fn()
      } as unknown as IgniterPluginManager<any>;

      const result = await ContextBuilderProcessor.enhanceWithPlugins(baseContext, mockPluginManager);

      expect(result.$context.plugins).toBeDefined();
      expect(result.$context.plugins.testPlugin).toBeDefined();
      expect(result.$context.plugins.testPlugin.emit).toBeDefined();
    });

    it('should handle plugin proxy injection failure gracefully', async () => {
      const mockPluginManager = {
        getAllPluginProxies: vi.fn().mockImplementation(() => {
          throw new Error('Plugin proxy creation failed');
        }),
        emit: vi.fn()
      } as unknown as IgniterPluginManager<any>;

      const result = await ContextBuilderProcessor.enhanceWithPlugins(baseContext, mockPluginManager);

      expect(result.$context).not.toHaveProperty('plugins');
      expect(result.$context).toHaveProperty('store');
      expect(result.$context).toHaveProperty('logger');
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle invalid URLs gracefully', async () => {
      const invalidUrl = new URL('http://localhost:3000/invalid?bad=query%');
      
      const result = await ContextBuilderProcessor.build(
        {} as any,
        mockRequest,
        mockRouteParams,
        invalidUrl
      );

      expect(result.request.query).toEqual(expect.any(Object));
    });

    it('should handle body parser failures', async () => {
      vi.mocked(BodyParserProcessor.parse).mockRejectedValueOnce(new Error('Parse failed'));

      const result = await ContextBuilderProcessor.build(
        {} as any,
        mockRequest,
        mockRouteParams,
        mockUrl
      );

      expect(result.request.body).toBeNull();
    });

    it('should handle context function throwing error', async () => {
      const mockContextFn = vi.fn().mockRejectedValue(new Error('Context creation failed'));
      const config = { context: mockContextFn };

      const result = await ContextBuilderProcessor.build(
        config as any,
        mockRequest,
        mockRouteParams,
        mockUrl
      );

      expect(result).toEqual(expect.objectContaining({
        $context: {},
        $plugins: {},
        request: expect.any(Object),
        response: expect.any(Object)
      }));
    });
  });

  describe('performance and memory', () => {
    it('should handle large request bodies efficiently', async () => {
      const largeBody = { data: 'x'.repeat(1000000) };
      vi.mocked(BodyParserProcessor.parse).mockResolvedValueOnce(largeBody);

      const startTime = performance.now();
      const result = await ContextBuilderProcessor.build(
        {} as any,
        mockRequest,
        mockRouteParams,
        mockUrl
      );
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should process in under 100ms
      expect(result.request.body).toEqual(largeBody);
    });

    it('should handle multiple plugin enhancements efficiently', async () => {
      const plugins = Array.from({ length: 100 }, (_, i) => ({
        [`plugin${i}`]: { method: vi.fn() }
      }));

      const mockPluginManager = {
        getAllPluginProxies: vi.fn().mockReturnValue(Object.assign({}, ...plugins)),
        emit: vi.fn()
      } as unknown as IgniterPluginManager<any>;

      const startTime = performance.now();
      const result = await ContextBuilderProcessor.enhanceWithPlugins(
        {
          request: {} as any,
          response: {} as any,
          $context: {},
          $plugins: {}
        },
        mockPluginManager
      );
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should process in under 100ms
      expect(Object.keys(result.$context.plugins || {}).length).toBe(100);
    });
  });
}); 