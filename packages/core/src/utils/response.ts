import { IgniterError } from "../error";

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
  successFn: () => TSuccess,
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
  response: Response,
): Promise<{ data: any; error: any }> {
  try {
    const data = await response.json();
    if (data && typeof data === "object" && "error" in data && "data" in data) {
      return data as { data: any; error: any };
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

/**
 * Normalizes response data to handle potential double-wrapping issues in client hooks.
 *
 * This function addresses the common issue where server responses are wrapped in
 * `{ data: ..., error: ... }` format, but client code expects direct access to the data.
 *
 * The function handles three scenarios:
 * 1. Response is already in correct `{ data: T, error: null }` format - extracts the data
 * 2. Response has double-wrapped structure - extracts the inner data
 * 3. Response is raw data without wrapping - wraps it properly
 *
 * @template T - The expected data type
 * @param response - The response data from server/fetch
 * @returns Normalized data structure with data and error fields
 *
 * @example
 * ```typescript
 * // Server returns: { data: { users: [...] }, error: null }
 * // Client expects: { users: [...] } in the data field
 * const normalized = normalizeResponseData(serverResponse);
 * // Result: { data: { users: [...] }, error: null }
 *
 * // Double-wrapped case (bug scenario):
 * // Server returns: { data: { data: { users: [...] }, error: null }, error: null }
 * const normalized = normalizeResponseData(doubleWrapped);
 * // Result: { data: { users: [...] }, error: null }
 *
 * // Raw data case:
 * // Server returns: { users: [...] }
 * const normalized = normalizeResponseData(rawData);
 * // Result: { data: { users: [...] }, error: null }
 * ```
 */
export function normalizeResponseData<T>(response: any): {
  data: T | null;
  error: any | null;
} {
  // Handle null/undefined responses
  if (response === null || response === undefined) {
    return { data: null, error: null };
  }

  // Handle non-object responses (primitives, arrays, etc.)
  if (typeof response !== "object") {
    return { data: response as T, error: null };
  }

  // Check if response has the expected { data, error } structure
  if ("data" in response && "error" in response) {
    // Check for double-wrapping: if response.data also has { data, error } structure
    if (
      response.data &&
      typeof response.data === "object" &&
      "data" in response.data &&
      "error" in response.data
    ) {
      // Double-wrapped case: return the inner structure
      return {
        data: response.data.data as T,
        error: response.data.error,
      };
    }

    // Single-wrapped case: extract the data from the envelope
    return {
      data: response.data as T,
      error: response.error,
    };
  }

  // Check if response has only 'data' field (partial structure)
  if ("data" in response && !("error" in response)) {
    return {
      data: response.data as T,
      error: undefined,
    };
  }

  // Check if response has only 'error' field (partial structure)
  if ("error" in response && !("data" in response)) {
    return {
      data: undefined as T,
      error: response.error,
    };
  }

  // Raw data case: wrap the response as data
  return { data: response as T, error: null };
}
