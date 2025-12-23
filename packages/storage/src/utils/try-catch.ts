/**
 * Utility to safely execute async operations and capture errors.
 */
export class IgniterStorageTryCatch {
  /**
   * Safely executes an async operation and returns a result object containing either data or error.
   *
   * @param promise - Promise to execute.
   * @returns Result object with either `data` or `error`.
   */
  static async run<T>(
    promise: Promise<T>,
  ): Promise<{ data?: T; error?: unknown }> {
    try {
      const data = await promise;
      return { data };
    } catch (error) {
      return { error };
    }
  }
}
