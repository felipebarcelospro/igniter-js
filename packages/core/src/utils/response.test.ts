import { describe, it, expect } from 'vitest';
import { normalizeResponseData, parseResponse, preserveUnion, conditionalResponse } from '../response';

describe('normalizeResponseData', () => {
  describe('null and undefined handling', () => {
    it('should handle null response', () => {
      const result = normalizeResponseData(null);
      expect(result).toEqual({ data: null, error: null });
    });

    it('should handle undefined response', () => {
      const result = normalizeResponseData(undefined);
      expect(result).toEqual({ data: null, error: null });
    });
  });

  describe('primitive data handling', () => {
    it('should wrap string data', () => {
      const result = normalizeResponseData('hello world');
      expect(result).toEqual({ data: 'hello world', error: null });
    });

    it('should wrap number data', () => {
      const result = normalizeResponseData(42);
      expect(result).toEqual({ data: 42, error: null });
    });

    it('should wrap boolean data', () => {
      const result = normalizeResponseData(true);
      expect(result).toEqual({ data: true, error: null });
    });

    it('should wrap array data', () => {
      const arrayData = [1, 2, 3];
      const result = normalizeResponseData(arrayData);
      expect(result).toEqual({ data: arrayData, error: null });
    });
  });

  describe('raw object data handling', () => {
    it('should wrap raw object without data/error structure', () => {
      const rawData = { users: ['alice', 'bob'], count: 2 };
      const result = normalizeResponseData(rawData);
      expect(result).toEqual({ data: rawData, error: null });
    });

    it('should wrap complex nested object', () => {
      const complexData = {
        boards: [
          { id: 1, name: 'Board 1', tasks: ['task1', 'task2'] },
          { id: 2, name: 'Board 2', tasks: [] }
        ],
        meta: { total: 2, page: 1 }
      };
      const result = normalizeResponseData(complexData);
      expect(result).toEqual({ data: complexData, error: null });
    });
  });

  describe('single-wrapped response handling', () => {
    it('should extract data from correctly wrapped success response', () => {
      const wrappedResponse = {
        data: { boards: [{ id: 1, name: 'My Board' }] },
        error: null
      };
      const result = normalizeResponseData(wrappedResponse);
      expect(result).toEqual({
        data: { boards: [{ id: 1, name: 'My Board' }] },
        error: null
      });
    });

    it('should extract data from error response', () => {
      const errorResponse = {
        data: null,
        error: { code: 'NOT_FOUND', message: 'Board not found' }
      };
      const result = normalizeResponseData(errorResponse);
      expect(result).toEqual({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Board not found' }
      });
    });

    it('should handle response with undefined error', () => {
      const response = {
        data: { user: { id: 1, name: 'John' } },
        error: undefined
      };
      const result = normalizeResponseData(response);
      expect(result).toEqual({
        data: { user: { id: 1, name: 'John' } },
        error: undefined
      });
    });
  });

  describe('double-wrapped response handling (bug fix)', () => {
    it('should fix double-wrapped success response', () => {
      const doubleWrapped = {
        data: {
          data: { boards: [{ id: 1, name: 'My Board' }] },
          error: null
        },
        error: null
      };
      const result = normalizeResponseData(doubleWrapped);
      expect(result).toEqual({
        data: { boards: [{ id: 1, name: 'My Board' }] },
        error: null
      });
    });

    it('should fix double-wrapped error response', () => {
      const doubleWrappedError = {
        data: {
          data: null,
          error: { code: 'UNAUTHORIZED', message: 'Access denied' }
        },
        error: null
      };
      const result = normalizeResponseData(doubleWrappedError);
      expect(result).toEqual({
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'Access denied' }
      });
    });

    it('should handle triple-nested structure by extracting from the first valid data/error pair', () => {
      const tripleWrapped = {
        data: {
          data: {
            data: { message: 'deeply nested' },
            error: null
          },
          error: null
        },
        error: null
      };
      const result = normalizeResponseData(tripleWrapped);
      expect(result).toEqual({
        data: { data: { message: 'deeply nested' }, error: null },
        error: null
      });
    });
  });

  describe('edge cases', () => {
    it('should handle response with data but no error field', () => {
      const partialResponse = { data: { users: [] } };
      const result = normalizeResponseData(partialResponse);
      expect(result).toEqual({
        data: { users: [] },
        error: undefined
      });
    });

    it('should handle response with error but no data field', () => {
      const partialResponse = { error: 'Something went wrong' };
      const result = normalizeResponseData(partialResponse);
      expect(result).toEqual({
        data: undefined,
        error: 'Something went wrong'
      });
    });

    it('should handle response where data is null but has error structure', () => {
      const response = {
        data: null,
        error: null
      };
      const result = normalizeResponseData(response);
      expect(result).toEqual({
        data: null,
        error: null
      });
    });

    it('should handle response where data is primitive inside wrapper', () => {
      const response = {
        data: 'simple string',
        error: null
      };
      const result = normalizeResponseData(response);
      expect(result).toEqual({
        data: 'simple string',
        error: null
      });
    });

    it('should handle empty object response', () => {
      const result = normalizeResponseData({});
      expect(result).toEqual({ data: {}, error: null });
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical Igniter.js success response from server', () => {
      // This is what IgniterResponseProcessor.success() typically returns
      const serverResponse = {
        data: {
          boards: [
            { id: 1, name: 'Project Planning', tasks: 5 },
            { id: 2, name: 'Development', tasks: 12 }
          ],
          pagination: { page: 1, total: 2 }
        },
        error: null
      };

      const result = normalizeResponseData(serverResponse);
      expect(result.data).toEqual({
        boards: [
          { id: 1, name: 'Project Planning', tasks: 5 },
          { id: 2, name: 'Development', tasks: 12 }
        ],
        pagination: { page: 1, total: 2 }
      });
      expect(result.error).toBeNull();
    });

    it('should handle typical error response from server', () => {
      const serverErrorResponse = {
        data: null,
        error: {
          code: 'ERR_NOT_FOUND',
          message: 'Board not found',
          details: { boardId: 123 }
        }
      };

      const result = normalizeResponseData(serverErrorResponse);
      expect(result.data).toBeNull();
      expect(result.error).toEqual({
        code: 'ERR_NOT_FOUND',
        message: 'Board not found',
        details: { boardId: 123 }
      });
    });

    it('should handle the specific bug scenario from the issue description', () => {
      // Scenario: useQuery returns { data: boardsData } but user has to access boardsData.data
      // This suggests the hook is receiving double-wrapped data
      const buggyResponse = {
        data: {
          data: {
            boards: [{ id: 1, name: 'My Board' }]
          },
          error: null
        },
        error: null
      };

      const result = normalizeResponseData(buggyResponse);

      // After normalization, the hook should be able to return the correct data
      expect(result.data).toEqual({
        boards: [{ id: 1, name: 'My Board' }]
      });

      // This means when the hook does `return { data: result.data }`,
      // the user can access `boardsData.boards` instead of `boardsData.data.boards`
    });

    it('should handle direct return from action handler (no ResponseProcessor)', () => {
      // When action handler returns data directly without using response.success()
      const directReturn = {
        boards: [{ id: 1, name: 'Direct Return Board' }],
        count: 1
      };

      const result = normalizeResponseData(directReturn);
      expect(result).toEqual({
        data: {
          boards: [{ id: 1, name: 'Direct Return Board' }],
          count: 1
        },
        error: null
      });
    });
  });

  describe('type preservation', () => {
    it('should preserve data types through normalization', () => {
      interface User {
        id: number;
        name: string;
        active: boolean;
      }

      const userData: User = { id: 1, name: 'Alice', active: true };
      const wrappedResponse = { data: userData, error: null };

      const result = normalizeResponseData<User>(wrappedResponse);
      expect(result.data).toEqual(userData);
      expect(typeof result.data?.id).toBe('number');
      expect(typeof result.data?.name).toBe('string');
      expect(typeof result.data?.active).toBe('boolean');
    });
  });
});

describe('parseResponse', () => {
  it('should parse JSON response with data/error structure', async () => {
    const mockResponse = {
      json: () => Promise.resolve({ data: { users: [] }, error: null })
    } as Response;

    const result = await parseResponse(mockResponse);
    expect(result).toEqual({ data: { users: [] }, error: null });
  });

  it('should wrap raw JSON data', async () => {
    const mockResponse = {
      json: () => Promise.resolve({ users: ['alice'] })
    } as Response;

    const result = await parseResponse(mockResponse);
    expect(result).toEqual({ data: { users: ['alice'] }, error: null });
  });

  it('should handle JSON parsing errors', async () => {
    const mockResponse = {
      json: () => Promise.reject(new Error('Invalid JSON'))
    } as Response;

    const result = await parseResponse(mockResponse);
    expect(result.data).toBeNull();
    expect(result.error.code).toBe('UNKNOWN_ERROR');
  });
});

describe('preserveUnion', () => {
  it('should preserve the input value as-is', () => {
    const value = { test: 'data' };
    const result = preserveUnion(value);
    expect(result).toBe(value);
  });
});

describe('conditionalResponse', () => {
  it('should return error response when condition is true', () => {
    const result = conditionalResponse(
      true,
      () => ({ error: 'Something went wrong' }),
      () => ({ data: 'success' })
    );
    expect(result).toEqual({ error: 'Something went wrong' });
  });

  it('should return success response when condition is false', () => {
    const result = conditionalResponse(
      false,
      () => ({ error: 'Something went wrong' }),
      () => ({ data: 'success' })
    );
    expect(result).toEqual({ data: 'success' });
  });
});

describe('Integration Test - Bug Fix Verification', () => {
  it('should fix the original useQuery double data access issue', () => {
    // Simulate the original bug scenario:
    // 1. Server returns: { data: { boards: [...] }, error: null }
    // 2. Hook should allow: const { data: boardsData } = useQuery(...)
    // 3. User should access: boardsData.boards (NOT boardsData.data.boards)

    const serverResponse = {
      data: {
        boards: [
          { id: 1, name: 'Project Planning' },
          { id: 2, name: 'Development' }
        ]
      },
      error: null
    };

    const normalizedResult = normalizeResponseData(serverResponse);

    // After normalization, the hook will set response.data = normalizedResult.data
    // When hook returns { data: response.data }, user gets the boards directly
    expect(normalizedResult.data).toEqual({
      boards: [
        { id: 1, name: 'Project Planning' },
        { id: 2, name: 'Development' }
      ]
    });

    // Verify user can access boards directly (the fix)
    const boardsData = normalizedResult.data;
    expect(boardsData?.boards).toBeDefined();
    expect(boardsData?.boards).toHaveLength(2);
    expect(boardsData?.boards[0].name).toBe('Project Planning');

    // Verify user doesn't need to access .data.boards (the bug that was fixed)
    // @ts-expect-error - This should not be needed anymore
    expect((boardsData as any)?.data?.boards).toBeUndefined();
  });

  it('should handle the ResponseProcessor.success() output correctly', () => {
    // Simulate what ResponseProcessor.success() creates after our fix
    const responseProcessorOutput = {
      data: {
        boards: [{ id: 1, name: 'My Board' }],
        meta: { total: 1 }
      },
      error: null // Now explicitly set due to our ResponseProcessor fix
    };

    const normalizedResult = normalizeResponseData(responseProcessorOutput);

    // Should extract the actual data, not wrap it again
    expect(normalizedResult.data).toEqual({
      boards: [{ id: 1, name: 'My Board' }],
      meta: { total: 1 }
    });
    expect(normalizedResult.error).toBeNull();
  });

  it('should prevent double-wrapping in edge cases', () => {
    // Test the specific case that was causing the bug
    const doubleWrappedBuggyData = {
      data: {
        data: { boards: [{ id: 1, name: 'Board' }] },
        error: null
      },
      error: null
    };

    const normalizedResult = normalizeResponseData(doubleWrappedBuggyData);

    // Should unwrap to the actual boards data
    expect(normalizedResult.data).toEqual({
      boards: [{ id: 1, name: 'Board' }]
    });

    // Verify the fix: user can access boards directly
    expect(normalizedResult.data?.boards).toBeDefined();
    expect(normalizedResult.data?.boards[0].name).toBe('Board');
  });
});
