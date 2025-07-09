import { describe, expect, it, vi } from 'vitest';
import { createIgniterController } from '../controller.service';

// Mock types and functions for testing
const mockAction1 = {
  path: 'list',
  method: 'GET',
  handler: vi.fn(),
};

const mockAction2 = {
  path: 'create',
  method: 'POST',
  handler: vi.fn(),
};

const mockAction3 = {
  path: 'update/:id',
  method: 'PUT',
  handler: vi.fn(),
};

describe('Controller Service', () => {
  describe('createIgniterController', () => {
    it('should return the exact configuration passed to it', () => {
      const config = {
        name: 'users',
        path: 'users',
        actions: {
          list: mockAction1,
          create: mockAction2,
        },
      };

      // @ts-expect-error - Testing with simplified mock actions, not full IgniterAction objects
      const controller = createIgniterController(config);

      expect(controller).toBe(config);
      expect(controller).toEqual(config);
    });

    it('should preserve the path property', () => {
      const config = {
        name: 'posts',
        path: 'posts',
        actions: {
          list: mockAction1,
        },
      };

      // @ts-expect-error - Testing with simplified mock actions, not full IgniterAction objects
      const controller = createIgniterController(config);

      expect(controller.path).toBe('posts');
    });

    it('should preserve all actions', () => {
      const actions = {
        list: mockAction1,
        create: mockAction2,
        update: mockAction3,
      };

      const config = {
        name: 'resources',
        path: 'resources',
        actions,
      };

      // @ts-expect-error - Testing with simplified mock actions, not full IgniterAction objects
      const controller = createIgniterController(config);

      expect(controller.actions).toBe(actions);
      expect(controller.actions.list).toBe(mockAction1);
      expect(controller.actions.create).toBe(mockAction2);
      expect(controller.actions.update).toBe(mockAction3);
    });

    it('should handle empty actions object', () => {
      const config = {
        name: 'empty',
        path: 'empty',
        actions: {},
      };

      const controller = createIgniterController(config);

      expect(controller.actions).toEqual({});
      expect(Object.keys(controller.actions)).toHaveLength(0);
    });

    it('should handle single action', () => {
      const config = {
        name: 'single',
        path: 'single',
        actions: {
          only: mockAction1,
        },
      };

      // @ts-expect-error - Testing with simplified mock actions, not full IgniterAction objects
      const controller = createIgniterController(config);

      expect(controller.actions.only).toBe(mockAction1);
      expect(Object.keys(controller.actions)).toHaveLength(1);
    });

    it('should preserve object references', () => {
      const actions = {
        test: mockAction1,
      };

      const config = {
        name: 'test',
        path: 'test',
        actions,
      };

      // @ts-expect-error - Testing with simplified mock actions, not full IgniterAction objects
      const controller = createIgniterController(config);

      // Should maintain exact reference
      expect(controller.actions).toBe(actions);
      expect(controller.actions.test).toBe(mockAction1);
    });

    it('should handle complex nested paths', () => {
      const config = {
        name: 'users',
        path: 'api/v1/users',
        actions: {
          list: mockAction1,
          create: mockAction2,
        },
      };

      // @ts-expect-error - Testing with simplified mock actions, not full IgniterAction objects
      const controller = createIgniterController(config);

      expect(controller.path).toBe('api/v1/users');
    });

    it('should handle empty string path', () => {
      const config = {
        name: 'root',
        path: '',
        actions: {
          root: mockAction1,
        },
      };

      // @ts-expect-error - Testing with simplified mock actions, not full IgniterAction objects
      const controller = createIgniterController(config);

      expect(controller.path).toBe('');
    });

    it('should handle root path', () => {
      const config = {
        name: 'root',
        path: '/',
        actions: {
          root: mockAction1,
        },
      };

      // @ts-expect-error - Testing with simplified mock actions, not full IgniterAction objects
      const controller = createIgniterController(config);

      expect(controller.path).toBe('/');
    });
  });

  describe('Type Safety and Structure', () => {
    it('should maintain the exact structure of the input configuration', () => {
      const originalConfig = {
        name: 'test',
        path: 'test',
        actions: {
          action1: mockAction1,
          action2: mockAction2,
        },
        customProperty: 'custom',
      };

      const controller = createIgniterController(originalConfig as any);

      // Should be the exact same object
      expect(controller).toBe(originalConfig);
      expect(JSON.stringify(controller)).toBe(JSON.stringify(originalConfig));
    });

    it('should not modify the input configuration', () => {
      const originalConfig = {
        name: 'immutable',
        path: 'immutable',
        actions: {
          test: mockAction1,
        },
      };

      const configCopy = { ...originalConfig };
      // @ts-expect-error - Testing with simplified mock actions, not full IgniterAction objects
      const controller = createIgniterController(originalConfig);

      // Original should remain unchanged
      expect(originalConfig).toEqual(configCopy);
      expect(controller).toBe(originalConfig);
    });

    it('should handle complex action configurations', () => {
      const complexActions = {
        list: {
          path: '',
          method: 'GET',
          handler: vi.fn(),
          use: [vi.fn(), vi.fn()],
          query: { page: 1, limit: 10 },
        },
        create: {
          path: '',
          method: 'POST',
          handler: vi.fn(),
          body: { name: 'string', email: 'string' },
        },
        update: {
          path: '/:id',
          method: 'PUT',
          handler: vi.fn(),
          body: { name: 'string' },
          use: [vi.fn()],
        },
        delete: {
          path: '/:id',
          method: 'DELETE',
          handler: vi.fn(),
        },
      };

      const config = {
        name: 'complex',
        path: 'complex',
        actions: complexActions,
      };

      // @ts-expect-error - Testing with simplified mock actions, not full IgniterAction objects
      const controller = createIgniterController(config);

      expect(controller.actions).toBe(complexActions);
      expect(controller.actions.list.use).toHaveLength(2);
      expect(controller.actions.create.body).toEqual({ name: 'string', email: 'string' });
      expect(controller.actions.update.path).toBe('/:id');
      expect(controller.actions.delete.method).toBe('DELETE');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null-like values in configuration', () => {
      const config = {
        name: 'nullish',
        path: 'nullish',
        actions: {
          withNull: {
            path: 'test',
            method: 'GET',
            handler: vi.fn(),
            query: null,
            body: undefined,
          },
        },
      };

      const controller = createIgniterController(config as any);

      expect(controller.actions.withNull.query).toBeNull();
      expect(controller.actions.withNull.body).toBeUndefined();
    });

    it('should handle special characters in path', () => {
      const config = {
        name: 'special',
        path: 'special-chars_123!@#',
        actions: {
          test: mockAction1,
        },
      };

      // @ts-expect-error - Testing with simplified mock actions, not full IgniterAction objects
      const controller = createIgniterController(config);

      expect(controller.path).toBe('special-chars_123!@#');
    });

    it('should handle unicode characters in path', () => {
      const config = {
        name: 'unicode',
        path: 'unicode-测试-路径',
        actions: {
          test: mockAction1,
        },
      };

      // @ts-expect-error - Testing with simplified mock actions, not full IgniterAction objects
      const controller = createIgniterController(config);

      expect(controller.path).toBe('unicode-测试-路径');
    });
  });

  describe('Performance and Memory', () => {
    it('should not create new objects or arrays unnecessarily', () => {
      const actions = { test: mockAction1 };
      const config = {
        name: 'performance',
        path: 'performance',
        actions,
      };

      // @ts-expect-error - Testing with simplified mock actions, not full IgniterAction objects
      const controller = createIgniterController(config);

      // Should be the exact same references
      expect(controller).toBe(config);
      expect(controller.actions).toBe(actions);
      expect(controller.actions.test).toBe(mockAction1);
    });

    it('should handle large action collections efficiently', () => {
      const largeActions: Record<string, any> = {};
      
      // Create 100 mock actions
      for (let i = 0; i < 100; i++) {
        largeActions[`action${i}`] = {
          path: `action${i}`,
          method: 'GET',
          handler: vi.fn(),
        };
      }

      const config = {
        name: 'large',
        path: 'large',
        actions: largeActions,
      };

      const controller = createIgniterController(config);

      expect(controller.actions).toBe(largeActions);
      expect(Object.keys(controller.actions)).toHaveLength(100);
      expect(controller.actions.action0).toBe(largeActions.action0);
      expect(controller.actions.action99).toBe(largeActions.action99);
    });
  });
}); 