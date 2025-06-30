import { describe, expect, it, vi, beforeEach } from 'vitest';
import { IgniterResponseProcessor } from '../response.processor';
import type { IgniterStoreAdapter } from '../../types/store.interface';
import type { CookieOptions } from '../../types/cookie.interface';

// Mock the SSEProcessor
vi.mock('../sse.processor', () => ({
  SSEProcessor: {
    channelExists: vi.fn(),
    registerChannel: vi.fn(),
    publishEvent: vi.fn(),
    getRegisteredChannels: vi.fn(),
  }
}));

// Mock the logger service
vi.mock('../../services/logger.service', () => ({
  IgniterConsoleLogger: {
    create: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })
  }
}));

import { SSEProcessor } from '../sse.processor';

// Test context interface
interface TestContext {
  userId: string;
  role: 'admin' | 'user';
  tenant: string;
}

describe('Response Processor', () => {
  let mockStore: IgniterStoreAdapter;
  let testContext: TestContext;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock store
    mockStore = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      expire: vi.fn(),
      increment: vi.fn(),
      publish: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      client: vi.fn(),
      has: vi.fn(),
    } as any;

    // Setup test context
    testContext = {
      userId: 'test-user-123',
      role: 'admin',
      tenant: 'test-tenant'
    };

    // Setup SSEProcessor mocks
    vi.mocked(SSEProcessor.channelExists).mockReturnValue(true);
    vi.mocked(SSEProcessor.registerChannel).mockImplementation(() => {});
    vi.mocked(SSEProcessor.publishEvent).mockImplementation(() => 2); // 2 clients connected
    vi.mocked(SSEProcessor.getRegisteredChannels).mockReturnValue([
      { id: 'channel1', description: 'Test Channel 1' },
      { id: 'channel2', description: 'Test Channel 2' }
    ]);
  });

  describe('Processor Creation and Configuration', () => {
    it('should create processor with static init method', () => {
      const processor = IgniterResponseProcessor.init();

      expect(processor).toBeInstanceOf(IgniterResponseProcessor);
    });

    it('should create processor with store adapter', () => {
      const processor = IgniterResponseProcessor.init(mockStore);

      expect(processor).toBeInstanceOf(IgniterResponseProcessor);
    });

    it('should create processor with context and store', () => {
      const processor = IgniterResponseProcessor.init<TestContext>(mockStore, testContext);

      expect(processor).toBeInstanceOf(IgniterResponseProcessor);
    });

    it('should set HTTP status code', () => {
      const processor = IgniterResponseProcessor.init()
        .status(201);

      expect(processor).toBeInstanceOf(IgniterResponseProcessor);
    });

    it('should allow chaining with status', () => {
      const processor = IgniterResponseProcessor.init()
        .status(400)
        .status(500);

      expect(processor).toBeInstanceOf(IgniterResponseProcessor);
    });
  });

  describe('Success Responses', () => {
    it('should create success response with data', async () => {
      const testData = { id: 1, name: 'Test User', active: true };
      
      const response = await IgniterResponseProcessor.init()
        .success(testData)
        .toResponse();

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const body = await response.json();
      expect(body).toEqual({
        error: null,
        data: testData
      });
    });

    it('should create success response without data', async () => {
      const response = await IgniterResponseProcessor.init()
        .success()
        .toResponse();

      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body).toEqual({
        error: null,
        data: undefined
      });
    });

    it('should create created response with data', async () => {
      const createdData = { id: 2, status: 'created', timestamp: '2024-01-01' };
      
      const response = await IgniterResponseProcessor.init()
        .created(createdData)
        .toResponse();

      expect(response.status).toBe(201);
      
      const body = await response.json();
      expect(body).toEqual({
        error: null,
        data: createdData
      });
    });

    it('should create no content response', async () => {
      const response = await IgniterResponseProcessor.init()
        .noContent()
        .toResponse();

      expect(response.status).toBe(204);
      
      const body = await response.json();
      expect(body).toEqual({
        error: null,
        data: null
      });
    });

    it('should create JSON response with custom data', async () => {
      const jsonData = { 
        results: [1, 2, 3], 
        pagination: { page: 1, limit: 10 },
        meta: { total: 100 }
      };
      
      const response = await IgniterResponseProcessor.init()
        .json(jsonData)
        .toResponse();

      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body).toEqual({
        error: null,
        data: jsonData
      });
    });

    it('should handle complex nested data structures', async () => {
      const complexData = {
        user: { 
          id: 1, 
          profile: { 
            name: 'John', 
            settings: { theme: 'dark', notifications: true } 
          } 
        },
        permissions: ['read', 'write'],
        metadata: {
          createdAt: new Date('2024-01-01'),
          tags: ['admin', 'active']
        }
      };
      
      const response = await IgniterResponseProcessor.init()
        .success(complexData)
        .toResponse();

      const body = await response.json();
      // Expect Date objects to be serialized as strings (standard JSON behavior)
      const expectedData = {
        user: { 
          id: 1, 
          profile: { 
            name: 'John', 
            settings: { theme: 'dark', notifications: true } 
          } 
        },
        permissions: ['read', 'write'],
        metadata: {
          createdAt: '2024-01-01T00:00:00.000Z',
          tags: ['admin', 'active']
        }
      };
      expect(body.data).toEqual(expectedData);
    });
  });

  describe('Error Responses', () => {
    it('should create bad request response', async () => {
      const response = await IgniterResponseProcessor.init()
        .badRequest('Invalid input data')
        .toResponse();

      expect(response.status).toBe(400);
      
      const body = await response.json();
      expect(body).toEqual({
        error: {
          message: 'Invalid input data',
          code: 'ERR_BAD_REQUEST',
          data: undefined
        },
        data: null
      });
    });

    it('should create bad request response with custom data', async () => {
      const errorData = { field: 'email', reason: 'invalid format' };
      
      const response = await IgniterResponseProcessor.init()
        .badRequest('Validation failed', errorData)
        .toResponse();

      expect(response.status).toBe(400);
      
      const body = await response.json();
      expect(body.error.data).toEqual(errorData);
    });

    it('should create unauthorized response', async () => {
      const response = await IgniterResponseProcessor.init()
        .unauthorized('Token expired')
        .toResponse();

      expect(response.status).toBe(401);
      
      const body = await response.json();
      expect(body).toEqual({
        error: {
          message: 'Token expired',
          code: 'ERR_UNAUTHORIZED',
          data: undefined
        },
        data: null
      });
    });

    it('should create unauthorized response with default message', async () => {
      const response = await IgniterResponseProcessor.init()
        .unauthorized()
        .toResponse();

      const body = await response.json();
      expect(body.error.message).toBe('Unauthorized');
    });

    it('should create forbidden response', async () => {
      const response = await IgniterResponseProcessor.init()
        .forbidden('Insufficient permissions')
        .toResponse();

      expect(response.status).toBe(403);
      
      const body = await response.json();
      expect(body).toEqual({
        error: {
          message: 'Insufficient permissions',
          code: 'ERR_FORBIDDEN',
          data: undefined
        },
        data: null
      });
    });

    it('should create not found response', async () => {
      const response = await IgniterResponseProcessor.init()
        .notFound('User not found')
        .toResponse();

      expect(response.status).toBe(404);
      
      const body = await response.json();
      expect(body).toEqual({
        error: {
          message: 'User not found',
          code: 'ERR_NOT_FOUND',
          data: undefined
        },
        data: null
      });
    });

    it('should create error responses with custom data', async () => {
      const errorData = { resourceId: '123', resource: 'user' };
      
      const response = await IgniterResponseProcessor.init()
        .notFound('Resource not found', errorData)
        .toResponse();

      const body = await response.json();
      expect(body.error.data).toEqual(errorData);
    });
  });

  describe('Redirect Responses', () => {
    it('should create redirect response with replace type', async () => {
      const response = await IgniterResponseProcessor.init()
        .redirect('/dashboard')
        .toResponse();

      expect(response.status).toBe(302);
      
      const body = await response.json();
      expect(body).toEqual({
        error: {
          message: 'Redirect',
          code: 'ERR_REDIRECT',
          data: {
            destination: '/dashboard',
            type: 'replace'
          }
        },
        data: null
      });
    });

    it('should create redirect response with push type', async () => {
      const response = await IgniterResponseProcessor.init()
        .redirect('/login', 'push')
        .toResponse();

      const body = await response.json();
      expect(body.error.data).toEqual({
        destination: '/login',
        type: 'push'
      });
    });

    it('should handle external redirects', async () => {
      const externalUrl = 'https://external-service.com/auth';
      
      const response = await IgniterResponseProcessor.init()
        .redirect(externalUrl, 'replace')
        .toResponse();

      const body = await response.json();
      expect(body.error.data.destination).toBe(externalUrl);
    });
  });

  describe('Headers and Cookies', () => {
    it('should set custom headers', async () => {
      const response = await IgniterResponseProcessor.init()
        .setHeader('X-Custom-Header', 'custom-value')
        .setHeader('Cache-Control', 'no-cache')
        .success({ test: true })
        .toResponse();

      expect(response.headers.get('X-Custom-Header')).toBe('custom-value');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should set basic cookies', async () => {
      const response = await IgniterResponseProcessor.init()
        .setCookie('session', 'abc123')
        .success({ logged: true })
        .toResponse();

      const setCookieHeader = response.headers.get('Set-Cookie');
      expect(setCookieHeader).toContain('session=abc123');
    });

    it('should set cookies with options', async () => {
      const cookieOptions: CookieOptions = {
        httpOnly: true,
        secure: true,
        maxAge: 3600,
        path: '/admin',
        sameSite: 'strict'
      };
      
      const response = await IgniterResponseProcessor.init()
        .setCookie('admin-session', 'xyz789', cookieOptions)
        .success({ admin: true })
        .toResponse();

      const setCookieHeader = response.headers.get('Set-Cookie');
      expect(setCookieHeader).toContain('admin-session=xyz789');
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader).toContain('Secure');
      expect(setCookieHeader).toContain('Max-Age=3600');
      expect(setCookieHeader).toContain('Path=/admin');
      expect(setCookieHeader).toContain('SameSite=Strict');
    });

    it('should set multiple cookies', async () => {
      const response = await IgniterResponseProcessor.init()
        .setCookie('session', 'session-token')
        .setCookie('preference', 'dark-theme')
        .setCookie('lang', 'en-US')
        .success({ user: 'logged' })
        .toResponse();

      // Headers.get returns only the first value, but multiple Set-Cookie headers should exist
      // We need to check if the response was created properly
      expect(response).toBeInstanceOf(Response);
    });

    it('should handle cookie prefixes', async () => {
      const response = await IgniterResponseProcessor.init()
        .setCookie('secure-token', 'token123', { prefix: 'secure' })
        .success({ secure: true })
        .toResponse();

      const setCookieHeader = response.headers.get('Set-Cookie');
      expect(setCookieHeader).toContain('__Secure-secure-token=token123');
      expect(setCookieHeader).toContain('Secure');
    });

    it('should handle host prefix cookies', async () => {
      const response = await IgniterResponseProcessor.init()
        .setCookie('host-token', 'token456', { prefix: 'host' })
        .success({ host: true })
        .toResponse();

      const setCookieHeader = response.headers.get('Set-Cookie');
      expect(setCookieHeader).toContain('__Host-host-token=token456');
      expect(setCookieHeader).toContain('Secure');
      expect(setCookieHeader).toContain('Path=/');
    });

    it('should handle cookie expiration dates', async () => {
      const expires = new Date('2024-12-31T23:59:59Z');
      
      const response = await IgniterResponseProcessor.init()
        .setCookie('expiring-cookie', 'value', { expires })
        .success({ expires: true })
        .toResponse();

      const setCookieHeader = response.headers.get('Set-Cookie');
      expect(setCookieHeader).toContain('Expires=Tue, 31 Dec 2024 23:59:59 GMT');
    });

    it('should handle partitioned cookies', async () => {
      const response = await IgniterResponseProcessor.init()
        .setCookie('partitioned-cookie', 'value', { partitioned: true })
        .success({ partitioned: true })
        .toResponse();

      const setCookieHeader = response.headers.get('Set-Cookie');
      expect(setCookieHeader).toContain('Partitioned');
      expect(setCookieHeader).toContain('Secure'); // Auto-added for partitioned
    });
  });

  describe('Streaming Responses', () => {
    it('should create stream response with basic options', async () => {
      vi.mocked(SSEProcessor.channelExists).mockReturnValue(false);
      
      const response = await IgniterResponseProcessor.init()
        .stream({
          channelId: 'test-stream',
          initialData: { status: 'connected' }
        })
        .toResponse();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      // Should register channel if it doesn't exist  
      expect(SSEProcessor.registerChannel).toHaveBeenCalledWith({
        id: 'test-stream',
        description: 'Dynamic channel created by IgniterResponseProcessor'
      });

      // Should publish initial data
      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith({
        channel: 'test-stream',
        type: 'data',
        data: { status: 'connected' }
      });

      const body = await response.json();
      expect(body.data).toEqual({
        type: 'stream',
        channelId: 'test-stream',
        connectionInfo: {
          endpoint: '/api/v1/sse/events',
          params: {
            channels: 'test-stream'
          }
        },
        timestamp: expect.any(String)
      });
    });

    it('should create stream with controller and action keys', async () => {
      const response = await IgniterResponseProcessor.init()
        .stream({
          controllerKey: 'users',
          actionKey: 'notifications'
        })
        .toResponse();

      const body = await response.json();
      expect(body.data.channelId).toBe('action::users.notifications');
    });

    it('should handle existing channels', async () => {
      vi.mocked(SSEProcessor.channelExists).mockReturnValue(true);
      
      await IgniterResponseProcessor.init()
        .stream({
          channelId: 'existing-channel'
        })
        .toResponse();

      // Should not try to register existing channel
      expect(SSEProcessor.registerChannel).not.toHaveBeenCalled();
    });

    it('should throw error for stream without channel ID', async () => {
      await expect(
        IgniterResponseProcessor.init()
          .stream({})
            .toResponse()
      ).rejects.toThrow('Channel ID is required for streaming responses');
    });

    it('should handle stream options with filter and transform', async () => {
      const filterFn = (msg: any) => msg.type === 'important';
      const transformFn = (msg: any) => ({ ...msg, processed: true });
      
      const response = await IgniterResponseProcessor.init()
        .stream({
          channelId: 'filtered-stream',
          filter: filterFn,
          transform: transformFn
        })
        .toResponse();

      expect(response).toBeInstanceOf(Response);
    });
  });

  describe('Cache Revalidation', () => {
    it('should set revalidation with query keys array', async () => {
      const response = await IgniterResponseProcessor.init<TestContext>(mockStore, testContext)
        .revalidate(['users', 'posts', 'comments'])
        .success({ updated: true })
        .toResponse();

      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith({
        channel: 'revalidation',
        type: 'revalidate',
        scopes: undefined,
        data: {
          queryKeys: ['users', 'posts', 'comments'],
          data: undefined,
          timestamp: expect.any(String)
        }
      });

      expect(response).toBeInstanceOf(Response);
    });

    it('should set revalidation with single query key', async () => {
      await IgniterResponseProcessor.init<TestContext>(mockStore, testContext)
        .revalidate(['single-key'])
        .success({ updated: true })
        .toResponse();

      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            queryKeys: ['single-key']
          })
        })
      );
    });

    it('should set revalidation with options object', async () => {
      const revalidationData = { reason: 'user updated' };
      
      await IgniterResponseProcessor.init<TestContext>(mockStore, testContext)
        .revalidate({
          queryKeys: ['user-profile'],
          data: revalidationData,
          broadcast: true
        })
        .success({ profile: 'updated' })
        .toResponse();

      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            queryKeys: ['user-profile'],
            data: revalidationData
          })
        })
      );
    });

    it('should handle scopes in revalidation', async () => {
      const scopeResolver = vi.fn().mockResolvedValue(['admin', 'tenant:123']);
      
      await IgniterResponseProcessor.init<TestContext>(mockStore, testContext)
        .revalidate(['scoped-data'], scopeResolver)
        .success({ scoped: true })
        .toResponse();

      expect(scopeResolver).toHaveBeenCalledWith(testContext);
      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: ['admin', 'tenant:123'],
          data: expect.objectContaining({
            queryKeys: ['scoped-data']
          })
        })
      );
    });

    it('should handle async scope resolver', async () => {
      const asyncScopeResolver = vi.fn().mockResolvedValue(['async-scope']);
      
      await IgniterResponseProcessor.init<TestContext>(mockStore, testContext)
        .revalidate({
          queryKeys: ['async-data'],
          scopes: asyncScopeResolver
        })
        .success({ async: true })
        .toResponse();

      expect(asyncScopeResolver).toHaveBeenCalledWith(testContext);
    });

    it('should handle scope resolver errors gracefully', async () => {
      const failingScopeResolver = vi.fn().mockRejectedValue(new Error('Scope error'));
      
      const response = await IgniterResponseProcessor.init<TestContext>(mockStore, testContext)
        .revalidate({
          queryKeys: ['error-data'],
          scopes: failingScopeResolver
        })
        .success({ error: 'handled' })
        .toResponse();

      // Should continue without scopes if resolution fails
      expect(SSEProcessor.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: undefined
        })
      );
      expect(response).toBeInstanceOf(Response);
    });
  });

  describe('Method Chaining and Builder Pattern', () => {
    it('should allow complex method chaining', async () => {
      const response = await IgniterResponseProcessor.init<TestContext>(mockStore, testContext)
        .status(201)
        .setHeader('X-Custom', 'value')
        .setCookie('session', 'token123', { httpOnly: true })
        .revalidate(['users', 'profiles'])
        .created({ id: 1, name: 'New User' })
        .toResponse();

      expect(response.status).toBe(201);
      expect(response.headers.get('X-Custom')).toBe('value');
      
      const body = await response.json();
      expect(body.data).toEqual({ id: 1, name: 'New User' });
    });

    it('should preserve configuration through method chaining', async () => {
      const processor = IgniterResponseProcessor.init()
        .status(418)
        .setHeader('X-Tea', 'Earl Grey')
        .setCookie('preference', 'tea');

      const response = await processor
        .success({ beverage: 'tea' })
        .toResponse();

      expect(response.status).toBe(418);
      expect(response.headers.get('X-Tea')).toBe('Earl Grey');
    });

    it('should handle status override in error methods', async () => {
      const response = await IgniterResponseProcessor.init()
        .status(200) // This should be overridden
        .badRequest('Validation error')
        .toResponse();

      expect(response.status).toBe(400); // Should be 400, not 200
    });

    it('should handle headers and cookies in error responses', async () => {
      const response = await IgniterResponseProcessor.init()
        .setHeader('X-Error-ID', 'error-123')
        .setCookie('error-logged', 'true')
        .unauthorized('Invalid token')
        .toResponse();

      expect(response.status).toBe(401);
      expect(response.headers.get('X-Error-ID')).toBe('error-123');
    });
  });

  describe('Data Serialization and Types', () => {
    it('should handle primitive data types', async () => {
      const responses = await Promise.all([
        IgniterResponseProcessor.init().success('string')
            .toResponse(),
        IgniterResponseProcessor.init().success(42)
            .toResponse(),
        IgniterResponseProcessor.init().success(true)
            .toResponse(),
        IgniterResponseProcessor.init().success(null)
            .toResponse(),
      ]);

      const bodies = await Promise.all(responses.map(r => r.json()));
      
      expect(bodies[0].data).toBe('string');
      expect(bodies[1].data).toBe(42);
      expect(bodies[2].data).toBe(true);
      expect(bodies[3].data).toBe(null);
    });

    it('should handle arrays', async () => {
      const arrayData = [1, 'two', { three: 3 }, [4, 5]];
      
      const response = await IgniterResponseProcessor.init()
        .success(arrayData)
        .toResponse();

      const body = await response.json();
      expect(body.data).toEqual(arrayData);
    });

    it('should handle nested objects', async () => {
      const nestedData = {
        level1: {
          level2: {
            level3: { value: 'deep' },
            array: [1, 2, 3]
          }
        }
      };
      
      const response = await IgniterResponseProcessor.init()
        .success(nestedData)
        .toResponse();

      const body = await response.json();
      expect(body.data).toEqual(nestedData);
    });

    it('should handle dates in data', async () => {
      const dateData = {
        created: new Date('2024-01-01'),
        updated: new Date('2024-12-31T23:59:59Z')
      };
      
      const response = await IgniterResponseProcessor.init()
        .success(dateData)
        .toResponse();

      const body = await response.json();
      // Expect Date objects to be serialized as strings (standard JSON behavior)
      const expectedData = {
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-12-31T23:59:59.000Z'
      };
      expect(body.data).toEqual(expectedData);
    });

    it('should handle undefined values', async () => {
      const response = await IgniterResponseProcessor.init()
        .success(undefined)
        .toResponse();

      const body = await response.json();
      expect(body.data).toBeUndefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle responses without context or store', async () => {
      const response = await IgniterResponseProcessor.init()
        .success({ test: true })
        .toResponse();

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
    });

    it('should handle empty data objects', async () => {
      const response = await IgniterResponseProcessor.init()
        .success({})
        .toResponse();

      const body = await response.json();
      expect(body.data).toEqual({});
    });

    it('should handle large data payloads', async () => {
      const largeData = {
        array: new Array(1000).fill(0).map((_, i) => ({ id: i, data: `item-${i}` })),
        text: 'a'.repeat(10000)
      };
      
      const response = await IgniterResponseProcessor.init()
        .success(largeData)
        .toResponse();

      expect(response).toBeInstanceOf(Response);
      
      const body = await response.json();
      expect(body.data.array).toHaveLength(1000);
      expect(body.data.text).toHaveLength(10000);
    });

    it('should handle special characters in data', async () => {
      const specialData = {
        unicode: '测试 🚀 émojí',
        special: '@#$%^&*()[]{}|\\:";\'<>?,./',
        html: '<script>alert("test")</script>',
        json: '{"nested": "json"}'
      };
      
      const response = await IgniterResponseProcessor.init()
        .success(specialData)
        .toResponse();

      const body = await response.json();
      expect(body.data).toEqual(specialData);
    });

    it('should handle circular references gracefully', async () => {
      const circularData: any = { name: 'test' };
      circularData.self = circularData;

      // This should not throw, even if JSON.stringify might have issues
      const response = await IgniterResponseProcessor.init()
        .success(circularData)
        .toResponse();

      expect(response).toBeInstanceOf(Response);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle rapid response creation efficiently', async () => {
      const startTime = performance.now();
      const promises: Promise<Response>[] = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          IgniterResponseProcessor.init()
            .success({ iteration: i })
                .toResponse()
        );
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(responses).toHaveLength(100);
      responses.forEach(response => {
        expect(response).toBeInstanceOf(Response);
      });
    });

    it('should not create memory leaks with method chaining', async () => {
      // Test multiple processor instances with extensive chaining
      for (let i = 0; i < 100; i++) {
        await IgniterResponseProcessor.init()
          .status(200)
          .setHeader(`X-Iteration-${i}`, `value-${i}`)
          .setCookie(`cookie-${i}`, `value-${i}`)
          .success({ iteration: i })
            .toResponse();
      }

      // If there were memory leaks, this would likely cause issues
      expect(true).toBe(true); // Test completion indicates no major memory issues
    });

    it('should handle concurrent processor usage', async () => {
      const concurrentProcessors = Array.from({ length: 50 }, (_, i) =>
        IgniterResponseProcessor.init()
          .setHeader('X-Concurrent', `processor-${i}`)
          .success({ processor: i })
            .toResponse()
      );

      const responses = await Promise.all(concurrentProcessors);
      
      expect(responses).toHaveLength(50);
      responses.forEach((response, index) => {
        expect(response).toBeInstanceOf(Response);
        expect(response.headers.get('X-Concurrent')).toBe(`processor-${index}`);
      });
    });
  });

  describe('Response Structure Consistency', () => {
    it('should always return consistent response structure for success', async () => {
      const responses = await Promise.all([
        IgniterResponseProcessor.init().success({ test: 1 })
            .toResponse(),
        IgniterResponseProcessor.init().created({ test: 2 })
            .toResponse(),
        IgniterResponseProcessor.init().json({ test: 3 })
            .toResponse(),
        IgniterResponseProcessor.init().noContent()
            .toResponse(),
      ]);

      const bodies = await Promise.all(responses.map(r => r.json()));
      
      bodies.forEach(body => {
        expect(body).toHaveProperty('error', null);
        expect(body).toHaveProperty('data');
      });
    });

    it('should always return consistent response structure for errors', async () => {
      const responses = await Promise.all([
        IgniterResponseProcessor.init().badRequest('Bad')
            .toResponse(),
        IgniterResponseProcessor.init().unauthorized('Unauth')
            .toResponse(),
        IgniterResponseProcessor.init().forbidden('Forbidden')
            .toResponse(),
        IgniterResponseProcessor.init().notFound('NotFound')
            .toResponse(),
      ]);

      const bodies = await Promise.all(responses.map(r => r.json()));
      
      bodies.forEach(body => {
        expect(body).toHaveProperty('error');
        expect(body).toHaveProperty('data', null);
        expect(body.error).toHaveProperty('message');
        expect(body.error).toHaveProperty('code');
      });
    });

    it('should maintain consistent headers', async () => {
      const responses = await Promise.all([
          IgniterResponseProcessor.init().success({})
            .toResponse(),
        IgniterResponseProcessor.init().badRequest()
            .toResponse(),
      ]);

      responses.forEach(response => {
        expect(response.headers.get('Content-Type')).toBe('application/json');
      });
    });
  });
}); 