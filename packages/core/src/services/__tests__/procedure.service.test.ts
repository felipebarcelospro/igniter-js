import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { z } from 'zod';
import {
  createIgniterProcedure,
  createEnhancedProcedureBuilder,
  createEnhancedProcedureFactories,
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
  response: new IgniterResponseProcessor<any, any>(),
  next: vi.fn()
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
          response: mockContext.response,
          next: mockContext.next
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
      
      const mockHandler = vi.fn().mockImplementation(async ({ request, context, response, next, options }) => {
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
        next: mockContext.next,
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
        next: mockContext.next,
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