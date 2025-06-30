import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { z } from 'zod';
import {
  createIgniterProcedure,
  createEnhancedProcedureBuilder,
  createEnhancedProcedureFactories,
  getClientIP,
  verifyJWT,
  hasAnyRole,
  hasAllPermissions
} from '../procedure.service';
import type { 
  IgniterProcedure, 
  IgniterProcedureContext,
  EnhancedProcedureContext,
  EnhancedProcedureHandler
} from '../../types/procedure.interface';
import { IgniterResponseProcessor } from '../../processors/response.processor';

// ============================================================================
// MOCKS AND TEST HELPERS
// ============================================================================

interface TestContext {
  user?: { id: string; name: string; roles: Array<{ name: string }>; permissions: Array<{ name: string }> };
  logger: { info: Mock; warn: Mock; error: Mock };
  store: { increment: Mock; get: Mock; set: Mock };
  config: { jwtSecret: string };
  db: { user: { findUnique: Mock } };
}

const createMockContext = (): TestContext => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  },
  store: {
    increment: vi.fn(),
    get: vi.fn(),
    set: vi.fn()
  },
  config: {
    jwtSecret: 'test-secret'
  },
  db: {
    user: {
      findUnique: vi.fn()
    }
  }
});

const createMockRequest = (overrides: any = {}) => {
  // Create proper Headers object
  const headers = new Headers();
  headers.set('content-type', 'application/json');
  headers.set('user-agent', 'test-agent');
  
  // Add any override headers
  if (overrides.headers) {
    Object.entries(overrides.headers).forEach(([key, value]) => {
      headers.set(key, value as string);
    });
  }
  
  const request = {
    path: '/test',
    params: {},
    body: {},
    query: {},
    method: 'GET' as const,
    headers,
    cookies: new Map() as any,
    ...overrides
  };
  
  // Ensure headers is always Headers object, even after override
  if (overrides.headers) {
    request.headers = headers;
  }
  
  return request;
};

const createMockProcedureContext = (
  contextOverrides: Partial<TestContext> = {},
  requestOverrides: any = {}
): IgniterProcedureContext<TestContext> => ({
  request: createMockRequest(requestOverrides),
  context: { ...createMockContext(), ...contextOverrides },
  response: new IgniterResponseProcessor<any, any>()
});

// ============================================================================
// LEGACY API TESTS
// ============================================================================

describe('Procedure Service - Legacy API', () => {
  describe('createIgniterProcedure', () => {
    it('should create a basic procedure with legacy API', () => {
      const mockHandler = vi.fn().mockResolvedValue({ success: true });
      
      const procedureConfig: IgniterProcedure<TestContext, undefined, { success: boolean }> = {
        name: 'test-procedure',
        handler: mockHandler
      };

      const procedureFactory = createIgniterProcedure(procedureConfig);
      const procedure = procedureFactory();

      expect(procedure).toHaveProperty('name', 'test-procedure');
      expect(procedure).toHaveProperty('handler');
      expect(typeof procedure.handler).toBe('function');
    });

    it('should create procedure with options', () => {
      interface TestOptions {
        required: boolean;
        timeout: number;
      }

      const mockHandler = vi.fn().mockResolvedValue({ configured: true });
      
      const procedureConfig: IgniterProcedure<TestContext, TestOptions, { configured: boolean }> = {
        name: 'configurable-procedure',
        handler: mockHandler
      };

      const procedureFactory = createIgniterProcedure(procedureConfig);
      const procedure = procedureFactory({ required: true, timeout: 5000 });

      expect(procedure.name).toBe('configurable-procedure');
      expect(typeof procedure.handler).toBe('function');
    });

    it('should execute procedure handler with correct context', async () => {
      const mockHandler = vi.fn().mockResolvedValue({ executed: true });
      
      const procedureConfig: IgniterProcedure<TestContext, { flag: boolean }, { executed: boolean }> = {
        name: 'executable-procedure',
        handler: mockHandler
      };

      const procedureFactory = createIgniterProcedure(procedureConfig);
      const procedure = procedureFactory({ flag: true });
      
      const mockContext = createMockProcedureContext();
      const result = await procedure.handler({ flag: true }, mockContext);

      expect(mockHandler).toHaveBeenCalledWith({ flag: true }, expect.any(Object));
      expect(result).toEqual({ executed: true });
    });

    it('should handle procedure without options', async () => {
      const mockHandler = vi.fn().mockResolvedValue({ simple: true });
      
      const procedureConfig: IgniterProcedure<TestContext, undefined, { simple: boolean }> = {
        name: 'simple-procedure',
        handler: mockHandler
      };

      const procedureFactory = createIgniterProcedure(procedureConfig);
      const procedure = procedureFactory();
      
      const mockContext = createMockProcedureContext();
      const result = await procedure.handler(undefined, mockContext);

      expect(mockHandler).toHaveBeenCalledWith(undefined, expect.any(Object));
      expect(result).toEqual({ simple: true });
    });

    it('should handle synchronous procedure handlers', () => {
      const mockHandler = vi.fn().mockReturnValue({ sync: true });
      
      const procedureConfig: IgniterProcedure<TestContext, undefined, { sync: boolean }> = {
        name: 'sync-procedure',
        handler: mockHandler
      };

      const procedureFactory = createIgniterProcedure(procedureConfig);
      const procedure = procedureFactory();
      
      const mockContext = createMockProcedureContext();
      const result = procedure.handler(undefined, mockContext);

      expect(mockHandler).toHaveBeenCalledWith(undefined, expect.any(Object));
      expect(result).toEqual({ sync: true });
    });
  });
});

// ============================================================================
// ENHANCED BUILDER API TESTS
// ============================================================================

describe('Procedure Service - Enhanced Builder API', () => {
  describe('createEnhancedProcedureBuilder', () => {
    it('should create builder with handler only', () => {
      const builder = createEnhancedProcedureBuilder<TestContext>();
      
      const mockHandler: EnhancedProcedureHandler<TestContext, undefined, { timestamp: number }> = 
        vi.fn().mockResolvedValue({ timestamp: Date.now() });

      const procedure = builder.handler(mockHandler);

      expect(procedure).toHaveProperty('name', 'enhanced-procedure');
      expect(procedure).toHaveProperty('handler');
      expect(typeof procedure.handler).toBe('function');
    });

    it('should create builder with name and handler', () => {
      const builder = createEnhancedProcedureBuilder<TestContext>();
      
      const mockHandler: EnhancedProcedureHandler<TestContext, undefined, { named: boolean }> = 
        vi.fn().mockResolvedValue({ named: true });

      const procedure = builder
        .name('custom-procedure')
        .handler(mockHandler);

      expect(procedure).toHaveProperty('name', 'custom-procedure');
      expect(procedure).toHaveProperty('handler');
    });

    it('should create builder with options schema and handler', () => {
      const builder = createEnhancedProcedureBuilder<TestContext>();
      
      const optionsSchema = z.object({
        required: z.boolean().default(false),
        timeout: z.number().optional()
      });

      const mockHandler: EnhancedProcedureHandler<
        TestContext, 
        z.infer<typeof optionsSchema>, 
        { configured: boolean }
      > = vi.fn().mockResolvedValue({ configured: true });

      const procedure = builder
        .options(optionsSchema)
        // @ts-expect-error - mockHandler is not typed correctly
        .handler(mockHandler);

      expect(procedure).toHaveProperty('name', 'enhanced-procedure');
      expect(procedure).toHaveProperty('handler');
    });

    it('should create builder with name, options, and handler', () => {
      const builder = createEnhancedProcedureBuilder<TestContext>();
      
      const optionsSchema = z.object({
        maxRetries: z.number().min(0).default(3),
        skipCache: z.boolean().default(false)
      });

      const mockHandler: EnhancedProcedureHandler<
        TestContext, 
        z.infer<typeof optionsSchema>, 
        { retries: number; cached: boolean }
      > = vi.fn().mockResolvedValue({ retries: 3, cached: false });

      const procedure = builder
        .name('retry-procedure')
        .options(optionsSchema)
        // @ts-expect-error - mockHandler is not typed correctly
        .handler(mockHandler);

      expect(procedure).toHaveProperty('name', 'retry-procedure');
      expect(procedure).toHaveProperty('handler');
    });

    it('should create builder with options first, then name', () => {
      const builder = createEnhancedProcedureBuilder<TestContext>();
      
      const optionsSchema = z.object({
        level: z.enum(['info', 'warn', 'error']).default('info')
      });

      const mockHandler: EnhancedProcedureHandler<
        TestContext, 
        z.infer<typeof optionsSchema>, 
        { logged: boolean }
      > = vi.fn().mockResolvedValue({ logged: true });

      const procedure = builder
        .options(optionsSchema)
        .name('logger-procedure')
        // @ts-expect-error - mockHandler is not typed correctly
        .handler(mockHandler);

      expect(procedure).toHaveProperty('name', 'logger-procedure');
      expect(procedure).toHaveProperty('handler');
    });

    it('should execute enhanced procedure with schema validation', async () => {
      const builder = createEnhancedProcedureBuilder<TestContext>();
      
      const optionsSchema = z.object({
        multiplier: z.number().positive().default(1),
        prefix: z.string().default('result')
      });

      const mockHandler = vi.fn().mockImplementation(async ({ options }) => {
        return { 
          value: 42 * options.multiplier, 
          message: `${options.prefix}: ${42 * options.multiplier}` 
        };
      });

      const procedure = builder
        .options(optionsSchema)
        .handler(mockHandler);

      const mockContext = createMockProcedureContext();
      const result = await procedure.handler(
        { multiplier: 2, prefix: 'calculated' }, 
        mockContext
      );

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { multiplier: 2, prefix: 'calculated' },
          context: mockContext.context,
          request: mockContext.request,
          response: mockContext.response
        })
      );
      expect(result).toEqual({ 
        value: 84, 
        message: 'calculated: 84' 
      });
    });

    it('should handle schema validation with defaults', async () => {
      const builder = createEnhancedProcedureBuilder<TestContext>();
      
      const optionsSchema = z.object({
        enabled: z.boolean().default(true),
        count: z.number().default(10)
      });

      const mockHandler = vi.fn().mockImplementation(async ({ options }) => {
        return { enabled: options.enabled, count: options.count };
      });

      const procedure = builder
        .options(optionsSchema)
        .handler(mockHandler);

      const mockContext = createMockProcedureContext();
      
      // Test with partial options (should use defaults)
      const result = await procedure.handler({}, mockContext);

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { enabled: true, count: 10 }
        })
      );
      expect(result).toEqual({ enabled: true, count: 10 });
    });

    it('should provide enhanced context with destructured properties', async () => {
      const builder = createEnhancedProcedureBuilder<TestContext>();
      
      const mockHandler = vi.fn().mockImplementation(async ({ request, context, response, options }) => {
        return {
          hasRequest: !!request,
          hasContext: !!context,
          hasResponse: !!response,
          hasOptions: options === undefined
        };
      });

      const procedure = builder.handler(mockHandler);

      const mockContext = createMockProcedureContext();
      const result = await procedure.handler(undefined, mockContext);

      expect(mockHandler).toHaveBeenCalledWith({
        request: mockContext.request,
        context: mockContext.context,
        response: mockContext.response,
        options: undefined
      });
      expect(result).toEqual({
        hasRequest: true,
        hasContext: true,
        hasResponse: true,
        hasOptions: true
      });
    });
  });
});

// ============================================================================
// ENHANCED FACTORY FUNCTIONS TESTS
// ============================================================================

describe('Procedure Service - Enhanced Factory Functions', () => {
  describe('createEnhancedProcedureFactories', () => {
    it('should create simple procedure factory', () => {
      const factories = createEnhancedProcedureFactories<TestContext>();
      
      const mockHandler: EnhancedProcedureHandler<TestContext, undefined, { simple: boolean }> = 
        vi.fn().mockResolvedValue({ simple: true });

      const procedure = factories.simple(mockHandler);

      expect(procedure).toHaveProperty('name', 'simple-procedure');
      expect(procedure).toHaveProperty('handler');
      expect(typeof procedure.handler).toBe('function');
    });

    it('should execute simple procedure correctly', async () => {
      const factories = createEnhancedProcedureFactories<TestContext>();
      
      const mockHandler = vi.fn().mockImplementation(async ({ request, context }) => {
        context.logger.info('Simple procedure executed', { path: request.path });
        return { executed: true, path: request.path };
      });

      const procedure = factories.simple(mockHandler);
      
      const mockContext = createMockProcedureContext();
      const result = await procedure.handler(undefined, mockContext);

      expect(mockHandler).toHaveBeenCalledWith({
        request: mockContext.request,
        context: mockContext.context,
        response: mockContext.response,
        options: undefined
      });
      expect(mockContext.context.logger.info).toHaveBeenCalledWith(
        'Simple procedure executed',
        { path: '/test' }
      );
      expect(result).toEqual({ executed: true, path: '/test' });
    });

    it('should create procedure with schema validation', () => {
      const factories = createEnhancedProcedureFactories<TestContext>();
      
      const optionsSchema = z.object({
        maxAttempts: z.number().min(1).max(10).default(3),
        delay: z.number().optional()
      });

      const mockHandler: EnhancedProcedureHandler<
        TestContext, 
        z.infer<typeof optionsSchema>, 
        { attempts: number }
      > = vi.fn().mockResolvedValue({ attempts: 3 });

      const procedure = factories.withSchema({
        optionsSchema,
        // @ts-expect-error - mockHandler is not typed correctly
        handler: mockHandler
      });

      expect(procedure).toHaveProperty('name', 'schema-procedure');
      expect(procedure).toHaveProperty('handler');
    });

    it('should execute schema-validated procedure correctly', async () => {
      const factories = createEnhancedProcedureFactories<TestContext>();
      
      const optionsSchema = z.object({
        threshold: z.number().positive().default(100),
        alertOnExceed: z.boolean().default(true)
      });

      const mockHandler = vi.fn().mockImplementation(async ({ options, context }) => {
        if (options.alertOnExceed && options.threshold > 50) {
          context.logger.warn('Threshold exceeded', { threshold: options.threshold });
        }
        return { threshold: options.threshold, alerted: options.alertOnExceed };
      });

      const procedure = factories.withSchema({
        optionsSchema,
        handler: mockHandler
      });

      const mockContext = createMockProcedureContext();
      const result = await procedure.handler(
        { threshold: 75, alertOnExceed: true }, 
        mockContext
      );

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { threshold: 75, alertOnExceed: true }
        })
      );
      expect(mockContext.context.logger.warn).toHaveBeenCalledWith(
        'Threshold exceeded',
        { threshold: 75 }
      );
      expect(result).toEqual({ threshold: 75, alerted: true });
    });

    it('should create procedure from complete config', () => {
      const factories = createEnhancedProcedureFactories<TestContext>();
      
      const optionsSchema = z.object({
        cacheKey: z.string(),
        ttl: z.number().positive().default(3600)
      });

      const mockHandler: EnhancedProcedureHandler<
        TestContext, 
        z.infer<typeof optionsSchema>, 
        { cached: boolean }
      > = vi.fn().mockResolvedValue({ cached: true });

      const procedure = factories.fromConfig({
        name: 'cache-procedure',
        optionsSchema,
        // @ts-expect-error - mockHandler is not typed correctly
        handler: mockHandler
      });

      expect(procedure).toHaveProperty('name', 'cache-procedure');
      expect(procedure).toHaveProperty('handler');
    });

    it('should create procedure from config without schema', () => {
      const factories = createEnhancedProcedureFactories<TestContext>();
      
      const mockHandler: EnhancedProcedureHandler<TestContext, undefined, { simple: boolean }> = 
        vi.fn().mockResolvedValue({ simple: true });

      const procedure = factories.fromConfig({
        name: 'simple-config-procedure',
        // @ts-expect-error - mockHandler is not typed correctly
        handler: mockHandler
      });

      expect(procedure).toHaveProperty('name', 'simple-config-procedure');
      expect(procedure).toHaveProperty('handler');
    });

    it('should execute config-based procedure correctly', async () => {
      const factories = createEnhancedProcedureFactories<TestContext>();
      
      const optionsSchema = z.object({
        apiKey: z.string(),
        timeout: z.number().default(5000)
      });

      const mockHandler = vi.fn().mockImplementation(async ({ options, context }) => {
        context.logger.info('API call initiated', { 
          apiKey: options.apiKey.substring(0, 8) + '...',
          timeout: options.timeout 
        });
        return { success: true, timeout: options.timeout };
      });

      const procedure = factories.fromConfig({
        name: 'api-caller',
        optionsSchema,
        handler: mockHandler
      });

      const mockContext = createMockProcedureContext();
      const result = await procedure.handler(
        { apiKey: 'secret-api-key-12345', timeout: 3000 }, 
        mockContext
      );

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { apiKey: 'secret-api-key-12345', timeout: 3000 }
        })
      );
      expect(mockContext.context.logger.info).toHaveBeenCalledWith(
        'API call initiated',
        { apiKey: 'secret-a...', timeout: 3000 }
      );
      expect(result).toEqual({ success: true, timeout: 3000 });
    });
  });
});

// ============================================================================
// UTILITY FUNCTIONS TESTS
// ============================================================================

describe('Procedure Service - Utility Functions', () => {
  describe('getClientIP', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '192.168.1.1, 10.0.0.1, 172.16.0.1');
      
      const request = { headers };

      const ip = getClientIP(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const headers = new Headers();
      headers.set('x-real-ip', '203.0.113.1');
      
      const request = { headers };

      const ip = getClientIP(request);
      expect(ip).toBe('203.0.113.1');
    });

    it('should extract IP from cf-connecting-ip header (Cloudflare)', () => {
      const request = {
        headers: new Map([
          ['cf-connecting-ip', '198.51.100.1']
        ]) as any
      };

      const ip = getClientIP(request);
      expect(ip).toBe('198.51.100.1');
    });

    it('should extract IP from x-client-ip header', () => {
      const request = {
        headers: new Map([
          ['x-client-ip', '192.0.2.1']
        ]) as any
      };

      const ip = getClientIP(request);
      expect(ip).toBe('192.0.2.1');
    });

    it('should prioritize x-forwarded-for over other headers', () => {
      const request = {
        headers: new Map([
          ['x-forwarded-for', '192.168.1.1'],
          ['x-real-ip', '203.0.113.1'],
          ['cf-connecting-ip', '198.51.100.1']
        ]) as any
      };

      const ip = getClientIP(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('should return "unknown" when no IP headers present', () => {
      const headers = new Headers();
      headers.set('content-type', 'application/json');
      
      const request = { headers };

      const ip = getClientIP(request);
      expect(ip).toBe('unknown');
    });

    it('should trim whitespace from IP addresses', () => {
      const request = {
        headers: new Map([
          ['x-forwarded-for', '  192.168.1.1  , 10.0.0.1  ']
        ]) as any
      };

      const ip = getClientIP(request);
      expect(ip).toBe('192.168.1.1');
    });
  });

  describe('verifyJWT', () => {
    it('should verify valid JWT token', async () => {
      // Create a mock JWT token (base64 encoded payload)
      const payload = { userId: '123', exp: Math.floor(Date.now() / 1000) + 3600 };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const mockToken = `header.${encodedPayload}.signature`;

      const result = await verifyJWT(mockToken, 'secret');
      
      expect(result).toEqual(payload);
    });

    it('should throw error for expired token', async () => {
      // Create expired token
      const payload = { userId: '123', exp: Math.floor(Date.now() / 1000) - 3600 };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const mockToken = `header.${encodedPayload}.signature`;

      await expect(verifyJWT(mockToken, 'secret')).rejects.toThrow('Invalid token: Token expired');
    });

    it('should throw error for malformed token', async () => {
      const malformedToken = 'invalid.token';

      await expect(verifyJWT(malformedToken, 'secret')).rejects.toThrow('Invalid token:');
    });

    it('should handle token without expiration', async () => {
      const payload = { userId: '123', role: 'admin' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const mockToken = `header.${encodedPayload}.signature`;

      const result = await verifyJWT(mockToken, 'secret');
      
      expect(result).toEqual(payload);
    });

    it('should throw error for invalid JSON in payload', async () => {
      const invalidPayload = 'invalid-json';
      const encodedPayload = Buffer.from(invalidPayload).toString('base64');
      const mockToken = `header.${encodedPayload}.signature`;

      await expect(verifyJWT(mockToken, 'secret')).rejects.toThrow('Invalid token:');
    });
  });

  describe('hasAnyRole', () => {
    it('should return true when user has one of the required roles', () => {
      const user = {
        roles: [
          { name: 'user' },
          { name: 'editor' },
          { name: 'viewer' }
        ]
      };

      const result = hasAnyRole(user, ['admin', 'editor', 'manager']);
      expect(result).toBe(true);
    });

    it('should return false when user has none of the required roles', () => {
      const user = {
        roles: [
          { name: 'user' },
          { name: 'viewer' }
        ]
      };

      const result = hasAnyRole(user, ['admin', 'editor', 'manager']);
      expect(result).toBe(false);
    });

    it('should return true when user has all required roles', () => {
      const user = {
        roles: [
          { name: 'admin' },
          { name: 'editor' },
          { name: 'manager' }
        ]
      };

      const result = hasAnyRole(user, ['admin', 'editor']);
      expect(result).toBe(true);
    });

    it('should return false when user has no roles', () => {
      const user = { roles: [] };

      const result = hasAnyRole(user, ['admin', 'user']);
      expect(result).toBe(false);
    });

    it('should return false when required roles is empty', () => {
      const user = {
        roles: [
          { name: 'admin' },
          { name: 'user' }
        ]
      };

      const result = hasAnyRole(user, []);
      expect(result).toBe(false);
    });

    it('should handle case-sensitive role matching', () => {
      const user = {
        roles: [
          { name: 'Admin' },
          { name: 'User' }
        ]
      };

      const result = hasAnyRole(user, ['admin', 'user']);
      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all required permissions', () => {
      const user = {
        permissions: [
          { name: 'read' },
          { name: 'write' },
          { name: 'delete' },
          { name: 'admin' }
        ]
      };

      const result = hasAllPermissions(user, ['read', 'write', 'delete']);
      expect(result).toBe(true);
    });

    it('should return false when user is missing some required permissions', () => {
      const user = {
        permissions: [
          { name: 'read' },
          { name: 'write' }
        ]
      };

      const result = hasAllPermissions(user, ['read', 'write', 'delete']);
      expect(result).toBe(false);
    });

    it('should return true when user has more permissions than required', () => {
      const user = {
        permissions: [
          { name: 'read' },
          { name: 'write' },
          { name: 'delete' },
          { name: 'admin' },
          { name: 'super-admin' }
        ]
      };

      const result = hasAllPermissions(user, ['read', 'write']);
      expect(result).toBe(true);
    });

    it('should return false when user has no permissions', () => {
      const user = { permissions: [] };

      const result = hasAllPermissions(user, ['read', 'write']);
      expect(result).toBe(false);
    });

    it('should return true when no permissions are required', () => {
      const user = {
        permissions: [
          { name: 'read' },
          { name: 'write' }
        ]
      };

      const result = hasAllPermissions(user, []);
      expect(result).toBe(true);
    });

    it('should handle case-sensitive permission matching', () => {
      const user = {
        permissions: [
          { name: 'Read' },
          { name: 'Write' }
        ]
      };

      const result = hasAllPermissions(user, ['read', 'write']);
      expect(result).toBe(false);
    });

    it('should handle duplicate permissions correctly', () => {
      const user = {
        permissions: [
          { name: 'read' },
          { name: 'read' },
          { name: 'write' }
        ]
      };

      const result = hasAllPermissions(user, ['read', 'write']);
      expect(result).toBe(true);
    });

    it('should handle duplicate required permissions correctly', () => {
      const user = {
        permissions: [
          { name: 'read' },
          { name: 'write' }
        ]
      };

      const result = hasAllPermissions(user, ['read', 'read', 'write']);
      expect(result).toBe(true);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Procedure Service - Integration Tests', () => {
  it('should integrate legacy and enhanced APIs seamlessly', async () => {
    // Create a legacy procedure
    const legacyProcedure = createIgniterProcedure({
      name: 'legacy-auth',
      handler: async (options: { required: boolean }, ctx) => {
        if (options.required && !ctx.request.headers.get('authorization')) {
          throw new Error('Authorization required');
        }
        return { legacy: true };
      }
    });

    // Create an enhanced procedure
    const enhancedBuilder = createEnhancedProcedureBuilder<TestContext>();
    const enhancedProcedure = enhancedBuilder
      .name('enhanced-logger')
      .handler(async ({ request, context }) => {
        context.logger.info('Enhanced procedure executed', { path: request.path });
        return { enhanced: true };
      });

    // Both should work with the same context
    const mockContext = createMockProcedureContext();
    
    // @ts-expect-error - mockHandler is not typed correctly
    const legacyResult = await legacyProcedure({ required: false }).handler({ required: false }, mockContext);
    
    const enhancedResult = await enhancedProcedure.handler(undefined, mockContext);

    expect(legacyResult).toEqual({ legacy: true });
    expect(enhancedResult).toEqual({ enhanced: true });
    expect(mockContext.context.logger.info).toHaveBeenCalledWith(
      'Enhanced procedure executed',
      { path: '/test' }
    );
  });

  it('should handle complex authentication procedure with all features', async () => {
    const factories = createEnhancedProcedureFactories<TestContext>();
    
    const authOptionsSchema = z.object({
      required: z.boolean().default(false),
      roles: z.array(z.string()).optional(),
      permissions: z.array(z.string()).optional(),
      allowGuest: z.boolean().default(true)
    });

    const authProcedure = factories.fromConfig({
      name: 'advanced-auth',
      optionsSchema: authOptionsSchema,
      handler: async ({ options, request, context, response }) => {
        const token = request.headers.get('authorization')?.replace('Bearer ', '');
        
        // Handle missing token
        if (!token) {
          if (options.required) {
            throw new Error('Authentication required');
          }
          if (options.allowGuest) {
            return { auth: { user: null, isGuest: true } };
          }
          throw new Error('Access denied');
        }

        // Verify token
        try {
          const payload = await verifyJWT(token, context.config.jwtSecret);
          const user = {
            id: payload.userId,
            name: 'Test User',
            roles: [{ name: 'user' }, { name: 'editor' }],
            permissions: [{ name: 'read' }, { name: 'write' }]
          };

          // Check role requirements
          if (options.roles && !hasAnyRole(user, options.roles)) {
            throw new Error('Insufficient role permissions');
          }

          // Check permission requirements
          if (options.permissions && !hasAllPermissions(user, options.permissions)) {
            throw new Error('Insufficient permissions');
          }

          return {
            auth: {
              user,
              isGuest: false,
              hasRole: (role: string) => user.roles.some(r => r.name === role),
              hasPermission: (permission: string) => user.permissions.some(p => p.name === permission)
            }
          };
        } catch (error) {
          context.logger.warn('Authentication failed', { error: (error as Error).message });
          throw error;
        }
      }
    });

    // Test successful authentication
    const payload = { userId: '123', exp: Math.floor(Date.now() / 1000) + 3600 };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const mockToken = `header.${encodedPayload}.signature`;

    const mockContext = createMockProcedureContext(
      {},
      { headers: { authorization: `Bearer ${mockToken}` } }
    );

    const result = await authProcedure.handler(
      { required: true, roles: ['user'], permissions: ['read'] },
      mockContext
    );

    expect(result.auth.user).toBeDefined();
    expect(result.auth.isGuest).toBe(false);
    // @ts-expect-error - mockHandler is not typed correctly
    expect(result.auth.hasRole('user')).toBe(true);
    // @ts-expect-error - mockHandler is not typed correctly
    expect(result.auth.hasPermission('read')).toBe(true);
  });

  it('should handle rate limiting procedure with utility functions', async () => {
    const factories = createEnhancedProcedureFactories<TestContext>();
    
    const rateLimitSchema = z.object({
      max: z.number().min(1).default(100),
      windowMs: z.number().min(1000).default(60000),
      keyGenerator: z.function().args(z.any()).returns(z.string()).optional()
    });

    const rateLimitProcedure = factories.withSchema({
      optionsSchema: rateLimitSchema,
      handler: async ({ options, request, context }) => {
        // Generate rate limit key
        const defaultKey = `rate_limit:${getClientIP(request)}`;
        const key = options.keyGenerator ? options.keyGenerator(request) : defaultKey;
        
        // Mock store increment
        context.store.increment.mockResolvedValue(5);
        
        const current = await context.store.increment(key, { ttl: options.windowMs });
        
        if (current > (options.max ?? 0)) {
          throw new Error('Rate limit exceeded');
        }
        
        return {
          rateLimit: {
            current,
            max: options.max,
            remaining: (options.max ?? 0) - current,
            key
          }
        };
      }
    });

    const mockContext = createMockProcedureContext(
      {},
      { headers: { 'x-forwarded-for': '192.168.1.1' } }
    );

    const result = await rateLimitProcedure.handler(
      { max: 10, windowMs: 60000 },
      mockContext
    );

    expect(result.rateLimit.current).toBe(5);
    expect(result.rateLimit.max).toBe(10);
    expect(result.rateLimit.remaining).toBe(5);
    expect(result.rateLimit.key).toBe('rate_limit:192.168.1.1');
    expect(mockContext.context.store.increment).toHaveBeenCalledWith(
      'rate_limit:192.168.1.1',
      { ttl: 60000 }
    );
  });
}); 