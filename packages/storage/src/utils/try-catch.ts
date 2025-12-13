/**
 * Utility to safely execute async operations and capture errors.
 * 
 * @param promise - The promise to execute
 * @returns Result object with either data or error
 */
export async function tryCatch<T>(
  promise: Promise<T>,
): Promise<{ data?: T; error?: unknown }> {
  try {
    const data = await promise
    return { data }
  } catch (error) {
    return { error }
  }
}
