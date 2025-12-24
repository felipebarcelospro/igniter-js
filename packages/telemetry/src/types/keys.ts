/**
 * Utility class for key validation in telemetry.
 */
export class IgniterTelemetryKeyValidator {
  /**
   * Reserved namespace prefixes that cannot be used by user code.
   */
  private static readonly RESERVED_NAMESPACE_PREFIXES = ['__', '__internal'] as const

  /**
   * Validates that a key does not use reserved prefixes.
   *
   * @param key - The key to validate
   * @param context - Context for error messages
   */
  static validateKey(key: string, context: string): void {
    if (!key || typeof key !== 'string') {
      throw new Error(`${context} must be a non-empty string`)
    }

    if (key.includes(' ')) {
      throw new Error(`${context} "${key}" cannot contain spaces`)
    }

    const lowerKey = key.toLowerCase()
    for (const reserved of this.RESERVED_NAMESPACE_PREFIXES) {
      if (lowerKey.startsWith(reserved)) {
        throw new Error(`${context} "${key}" uses reserved prefix "${reserved}"`)
      }
    }
  }
}