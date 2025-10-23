import { describe, expect, it, vi } from 'vitest';
import { createIgniterQuery, createIgniterMutation } from '../action.service';
import type { StandardSchemaV1, IgniterProcedure } from '../../types';

// Mock types for testing
interface TestContext {
  userId: string;
  db: any;
  logger: any;
}

// Mock StandardSchemaV1 compliant schema
const createMockSchema = <T>(defaultValue: T): StandardSchemaV1<T, T> => ({
  "~standard": {
    version: 1,
    vendor: "test",
    validate: (value: unknown) => ({ value: value as T }),
    types: undefined as any
  }
});

// Mock procedures with proper structure
const createMockProcedure = (name: string): IgniterProcedure<unknown, unknown, unknown> => ({
  name,
  handler: vi.fn().mockResolvedValue({})
});

const mockMiddleware = createMockProcedure('mockMiddleware');
const mockHandler = vi.fn();

describe('Action Service', () => {
  describe('createIgniterQuery', () => {
    it('should create a query action with GET method', () => {
      const queryAction = createIgniterQuery({
        path: 'users',
        handler: mockHandler,
      });

      expect(queryAction).toHaveProperty('path', 'users');
      expect(queryAction).toHaveProperty('method', 'GET');
      expect(queryAction).toHaveProperty('handler', mockHandler);
      expect(queryAction).toHaveProperty('$Infer');
    });

    it('should preserve all provided options', () => {
      const options = {
        path: 'posts',
        query: createMockSchema({ page: 1 }),
        use: [mockMiddleware],
        handler: mockHandler,
      };

      const queryAction = createIgniterQuery(options);

      expect(queryAction.path).toBe('posts');
      expect(queryAction.query).toEqual(expect.objectContaining({
        '~standard': expect.any(Object)
      }));
      expect(queryAction.use).toEqual([mockMiddleware]);
      expect(queryAction.handler).toBe(mockHandler);
      expect(queryAction.method).toBe('GET');
    });

    it('should include type inference placeholder', () => {
      const queryAction = createIgniterQuery({
        path: 'test',
        handler: mockHandler,
      });

      expect(queryAction).toHaveProperty('$Infer');
      expect(typeof queryAction.$Infer).toBe('object');
    });

    it('should handle complex configuration', () => {
      const complexHandler = vi.fn((ctx) => ctx.response.success({ data: [] }));
      const middleware1 = createMockProcedure('middleware1');
      const middleware2 = createMockProcedure('middleware2');

      const queryAction = createIgniterQuery({
        path: 'complex/path',
        query: createMockSchema({ 
          page: 1,
          limit: 10,
          filter: 'active'
        }),
        use: [middleware1, middleware2],
        handler: complexHandler,
      });

      expect(queryAction.path).toBe('complex/path');
      expect(queryAction.query).toEqual(expect.objectContaining({
        '~standard': expect.any(Object)
      }));
      expect(queryAction.use).toHaveLength(2);
      expect(queryAction.use).toContain(middleware1);
      expect(queryAction.use).toContain(middleware2);
      expect(queryAction.handler).toBe(complexHandler);
      expect(queryAction.method).toBe('GET');
    });
  });

  describe('createIgniterMutation', () => {
    it('should create a mutation action preserving the method', () => {
      const mutationAction = createIgniterMutation({
        path: 'users',
        method: 'POST',
        handler: mockHandler,
      });

      expect(mutationAction).toHaveProperty('path', 'users');
      expect(mutationAction).toHaveProperty('method', 'POST');
      expect(mutationAction).toHaveProperty('handler', mockHandler);
      expect(mutationAction).toHaveProperty('$Infer');
    });

    it('should preserve all provided options including body and query', () => {
      const options = {
        path: 'posts',
        method: 'PUT' as const,
        body: createMockSchema({ title: 'string', content: 'string' }),
        query: createMockSchema({ draft: true }),
        use: [mockMiddleware],
        handler: mockHandler,
      };

      const mutationAction = createIgniterMutation(options);

      expect(mutationAction.path).toBe('posts');
      expect(mutationAction.method).toBe('PUT');
      expect(mutationAction.body).toEqual(expect.objectContaining({
        '~standard': expect.any(Object)
      }));
      expect(mutationAction.query).toEqual(expect.objectContaining({
        '~standard': expect.any(Object)
      }));
      expect(mutationAction.use).toEqual([mockMiddleware]);
      expect(mutationAction.handler).toBe(mockHandler);
    });

    it('should handle POST method', () => {
      const mutationAction = createIgniterMutation({
        path: 'create',
        method: 'POST',
        handler: mockHandler,
      });

      expect(mutationAction.method).toBe('POST');
    });

    it('should handle PUT method', () => {
      const mutationAction = createIgniterMutation({
        path: 'update',
        method: 'PUT',
        handler: mockHandler,
      });

      expect(mutationAction.method).toBe('PUT');
    });

    it('should handle DELETE method', () => {
      const mutationAction = createIgniterMutation({
        path: 'delete',
        method: 'DELETE',
        handler: mockHandler,
      });

      expect(mutationAction.method).toBe('DELETE');
    });

    it('should handle PATCH method', () => {
      const mutationAction = createIgniterMutation({
        path: 'patch',
        method: 'PATCH',
        handler: mockHandler,
      });

      expect(mutationAction.method).toBe('PATCH');
    });

    it('should include type inference placeholder', () => {
      const mutationAction = createIgniterMutation({
        path: 'test',
        method: 'POST',
        handler: mockHandler,
      });

      expect(mutationAction).toHaveProperty('$Infer');
      expect(typeof mutationAction.$Infer).toBe('object');
    });

    it('should handle complex mutation configuration', () => {
      const complexHandler = vi.fn((ctx) => ctx.response.created({ id: 1 }));
      const authMiddleware = createMockProcedure('authMiddleware');
      const validationMiddleware = createMockProcedure('validationMiddleware');

      const mutationAction = createIgniterMutation({
        path: 'users/profile',
        method: 'POST',
        body: createMockSchema({
          name: 'string',
          email: 'string',
          age: 'number'
        }),
        query: createMockSchema({
          sendEmail: true,
          source: 'registration'
        }),
        use: [authMiddleware, validationMiddleware],
        handler: complexHandler,
      });

      expect(mutationAction.path).toBe('users/profile');
      expect(mutationAction.method).toBe('POST');
      expect(mutationAction.body).toEqual(expect.objectContaining({
        '~standard': expect.any(Object)
      }));
      expect(mutationAction.query).toEqual(expect.objectContaining({
        '~standard': expect.any(Object)
      }));
      expect(mutationAction.use).toHaveLength(2);
      expect(mutationAction.use).toContain(authMiddleware);
      expect(mutationAction.use).toContain(validationMiddleware);
      expect(mutationAction.handler).toBe(complexHandler);
    });
  });

  describe('Type Safety and Structure', () => {
    it('should maintain object reference integrity for query', () => {
      const handler = vi.fn();
      const middlewares = [createMockProcedure('mid1'), createMockProcedure('mid2')];
      
      const queryAction = createIgniterQuery({
        path: 'test',
        use: middlewares,
        handler,
      });

      expect(queryAction.use).toBe(middlewares);
      expect(queryAction.handler).toBe(handler);
    });

    it('should maintain object reference integrity for mutation', () => {
      const handler = vi.fn();
      const middlewares = [createMockProcedure('mid1'), createMockProcedure('mid2')];
      const body = createMockSchema({ test: 'value' });
      
      const mutationAction = createIgniterMutation({
        path: 'test',
        method: 'POST',
        body,
        use: middlewares,
        handler,
      });

      expect(mutationAction.use).toBe(middlewares);
      expect(mutationAction.handler).toBe(handler);
      expect(mutationAction.body).toBe(body);
    });

    it('should handle minimal query configuration', () => {
      const minimalQuery = createIgniterQuery({
        path: 'minimal',
        handler: vi.fn(),
      });

      expect(minimalQuery.path).toBe('minimal');
      expect(minimalQuery.method).toBe('GET');
      expect(typeof minimalQuery.handler).toBe('function');
      expect(minimalQuery).toHaveProperty('$Infer');
    });

    it('should handle minimal mutation configuration', () => {
      const minimalMutation = createIgniterMutation({
        path: 'minimal',
        method: 'POST',
        handler: vi.fn(),
      });

      expect(minimalMutation.path).toBe('minimal');
      expect(minimalMutation.method).toBe('POST');
      expect(typeof minimalMutation.handler).toBe('function');
      expect(minimalMutation).toHaveProperty('$Infer');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string path for query', () => {
      const queryAction = createIgniterQuery({
        path: '',
        handler: mockHandler,
      });

      expect(queryAction.path).toBe('');
      expect(queryAction.method).toBe('GET');
    });

    it('should handle empty string path for mutation', () => {
      const mutationAction = createIgniterMutation({
        path: '',
        method: 'POST',
        handler: mockHandler,
      });

      expect(mutationAction.path).toBe('');
      expect(mutationAction.method).toBe('POST');
    });

    it('should handle undefined optional properties for query', () => {
      const queryAction = createIgniterQuery({
        path: 'test',
        handler: mockHandler,
        query: undefined,
        use: undefined,
      });

      expect(queryAction.path).toBe('test');
      expect(queryAction.method).toBe('GET');
      expect(queryAction.query).toBeUndefined();
      expect(queryAction.use).toBeUndefined();
    });

    it('should handle undefined optional properties for mutation', () => {
      const mutationAction = createIgniterMutation({
        path: 'test',
        method: 'POST',
        handler: mockHandler,
        body: undefined,
        query: undefined,
        use: undefined,
      });

      expect(mutationAction.path).toBe('test');
      expect(mutationAction.method).toBe('POST');
      expect(mutationAction.body).toBeUndefined();
      expect(mutationAction.query).toBeUndefined();
      expect(mutationAction.use).toBeUndefined();
    });
  });
}); 