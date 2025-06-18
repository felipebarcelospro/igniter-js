import { IgniterError } from "../error";

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
