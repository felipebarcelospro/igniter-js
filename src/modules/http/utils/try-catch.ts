/**
 * Represents a successful result containing data and no error
 * @template T The type of the successful data
 */
type Success<T> = {
  data: T;
  error: null;
};

/**
 * Represents a failure result containing an error and no data
 * @template E The type of the error
 */
type Failure<E> = {
  data: null;
  error: E;
};

/**
 * Discriminated union type representing either a successful or failed result
 * @template T The type of the successful data
 * @template E The type of the error, defaults to Error
 */
type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * A utility function that wraps promise execution in a type-safe try-catch block.
 * Provides a standardized way to handle asynchronous operations and their potential errors.
 * 
 * @template T The type of the successful data
 * @template E The type of the error, defaults to Error
 * @param promise The promise to execute
 * @returns A Result object containing either the successful data or an error
 * 
 * @remarks
 * This function provides a more elegant way to handle promise rejections without try-catch blocks
 * in your business logic. It returns a discriminated union type that makes error handling more explicit
 * and type-safe.
 * 
 * @example
 * ```typescript
 * // Simple usage with fetch
 * const result = await tryCatch(fetch('https://api.example.com/data'));
 * if (result.error) {
 *   console.error('Failed to fetch:', result.error);
 * } else {
 *   const data = await result.data.json();
 *   console.log('Success:', data);
 * }
 * 
 * // Usage with custom error type
 * interface ApiError {
 *   code: string;
 *   message: string;
 * }
 * 
 * const result = await tryCatch<UserData, ApiError>(fetchUserData(userId));
 * if (result.error) {
 *   console.error(`Error ${result.error.code}: ${result.error.message}`);
 * } else {
 *   console.log('User data:', result.data);
 * }
 * ```
 */
export async function tryCatch<T, E = Error>(
  promise: Promise<T>,
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as E };
  }
}