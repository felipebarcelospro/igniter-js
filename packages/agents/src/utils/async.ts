/**
 * Async utilities for `@igniter-js/agents`.
 */
export class IgniterAgentAsyncUtils {
  /**
   * Delays execution for a specified duration.
   */
  static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retries an async function with exponential backoff.
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options: {
      maxAttempts?: number;
      baseDelay?: number;
      maxDelay?: number;
      onRetry?: (attempt: number, error: Error) => void;
    } = {},
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      onRetry,
    } = options;

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxAttempts) {
          throw lastError;
        }

        onRetry?.(attempt, lastError);

        const delayMs = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        await IgniterAgentAsyncUtils.delay(delayMs);
      }
    }

    throw lastError;
  }
}
