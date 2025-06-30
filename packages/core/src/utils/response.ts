import { IgniterError } from "../error";
import type { IgniterResponseProcessor } from "../processors/response.processor";

/**
 * Helper function to preserve union types in conditional returns.
 * Use this when TypeScript's control flow analysis is too aggressive
 * and only recognizes one return path instead of creating a union.
 * 
 * @template T - The union type you want to preserve
 * @param value - The actual return value
 * @returns The value with preserved union type
 * 
 * @example
 * ```typescript
 * return preserveUnion<
 *   IgniterResponseProcessor<any, { data: string }> |
 *   IgniterResponseProcessor<any, IgniterResponseNotFound>
 * >(response.success({ data: "test" }));
 * ```
 */
export function preserveUnion<T>(value: T): T {
  return value;
}

/**
 * Helper function for conditional responses that preserves union types.
 * Use this pattern to ensure TypeScript recognizes both success and error paths.
 * 
 * @template TSuccess - Type of the success response
 * @template TError - Type of the error response
 * @param condition - Boolean condition to evaluate
 * @param errorFn - Function that returns error response when condition is true
 * @param successFn - Function that returns success response when condition is false
 * @returns Either success or error response with preserved union type
 * 
 * @example
 * ```typescript
 * return conditionalResponse(
 *   !todo,
 *   () => response.notFound('Todo not found'),
 *   () => response.success({ todos: updatedTodos })
 * );
 * ```
 */
export function conditionalResponse<TSuccess, TError>(
  condition: boolean,
  errorFn: () => TError,
  successFn: () => TSuccess
): TSuccess | TError {
  return condition ? errorFn() : successFn();
}

/**
 * Parses a Response object and returns a standardized result with `data` and `error` fields.
 *
 * If the response body is already in the format `{ error, data }`, it returns it as is.
 * Otherwise, it wraps the parsed data in `{ data, error: null }`.
 * If parsing fails, returns `{ data: null, error }`.
 *
 * @param response - The Response object to parse
 * @returns A Promise resolving to an object with `data` and `error` properties
 *
 * @example
 * const result = await parseResponse(response);
 * if (result.error) {
 *   // handle error
 * } else {
 *   // use result.data
 * }
 */
export async function parseResponse(
  response: Response
): Promise<{ data: any; error: any }> {
  try {
    const data = await response.json();    
    if (data && typeof data === "object" && "error" in data && "data" in data) {
      return data;
    }

    return { data, error: null };
  } catch (error) {
    if (error instanceof IgniterError) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      };
    }

    return {
      data: null,
      error: {
        message: "Unknown error",
        code: "UNKNOWN_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}
