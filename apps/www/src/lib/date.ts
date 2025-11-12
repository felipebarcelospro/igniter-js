/**
 * A utility class providing date manipulation and formatting methods.
 * Contains various static methods for common date operations with TypeScript support.
 *
 * @remarks
 * This class offers a collection of methods for date parsing, formatting,
 * and conversion. All methods are static and can be used without instantiation.
 */
export class DateUtils {
  /**
   * Parses a value into a Date object safely.
   * Accepts strings, numbers, or Date objects.
   *
   * @param value - The value to parse into a Date
   * @returns A valid Date object or null if parsing fails
   *
   * @example
   * ```typescript
   * DateUtils.parseDate('2023-12-25'); // Date object
   * DateUtils.parseDate(1703462400000); // Date object
   * DateUtils.parseDate(new Date()); // Same Date object
   * ```
   */
  static parseDate(
    value: string | number | Date | null | undefined,
  ): Date | null {
    if (!value) return null

    try {
      const date = new Date(value)
      // Check if the date is valid
      if (isNaN(date.getTime())) return null
      return date
    } catch {
      return null
    }
  }

  /**
   * Formats a date into a human-readable string.
   * Uses a consistent format across the application.
   *
   * @param value - The date value to format
   * @param options - Intl.DateTimeFormatOptions for custom formatting
   * @returns Formatted date string or empty string if invalid
   *
   * @example
   * ```typescript
   * DateUtils.formatDate('2023-12-25'); // 'Dec 25, 2023'
   * DateUtils.formatDate(new Date(), { month: 'long', year: 'numeric' }); // 'December 2023'
   * ```
   */
  static formatDate(
    value: string | number | Date | null | undefined,
    options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
  ): string {
    const date = this.parseDate(value)
    if (!date) return ''

    const result = new Intl.DateTimeFormat('en-US', options).format(date)
    if (result === 'Invalid Date') return ''
    return result
  }

  /**
   * Converts a date to ISO string safely.
   * Useful for APIs and structured data.
   *
   * @param value - The date value to convert
   * @returns ISO string or current date ISO if invalid
   *
   * @example
   * ```typescript
   * DateUtils.toISOStringSafe('2023-12-25'); // '2023-12-25T00:00:00.000Z'
   * DateUtils.toISOStringSafe(null); // Current date ISO string
   * ```
   */
  static toISOStringSafe(
    value: string | number | Date | null | undefined,
  ): string {
    const date = this.parseDate(value)
    return date ? date.toISOString() : new Date().toISOString()
  }

  /**
   * Checks if a date is in the past.
   *
   * @param value - The date value to check
   * @returns True if the date is in the past, false otherwise
   *
   * @example
   * ```typescript
   * DateUtils.isPast('2020-01-01'); // true
   * DateUtils.isPast('2030-01-01'); // false
   * ```
   */
  static isPast(value: string | number | Date | null | undefined): boolean {
    const date = this.parseDate(value)
    if (!date) return false

    return date < new Date()
  }

  /**
   * Checks if a date is in the future.
   *
   * @param value - The date value to check
   * @returns True if the date is in the future, false otherwise
   *
   * @example
   * ```typescript
   * DateUtils.isFuture('2030-01-01'); // true
   * DateUtils.isFuture('2020-01-01'); // false
   * ```
   */
  static isFuture(value: string | number | Date | null | undefined): boolean {
    const date = this.parseDate(value)
    if (!date) return false

    return date > new Date()
  }

  /**
   * Gets the relative time string (e.g., "2 days ago", "in 3 hours").
   *
   * @param value - The date value to compare
   * @returns Relative time string
   *
   * @example
   * ```typescript
   * DateUtils.getRelativeTime('2023-12-20'); // '5 days ago'
   * DateUtils.getRelativeTime('2024-01-01'); // 'in 2 days'
   * ```
   */
  static getRelativeTime(
    value: string | number | Date | null | undefined,
  ): string {
    const date = this.parseDate(value)
    if (!date) return ''

    const now = new Date()
    const diffInMs = date.getTime() - now.getTime()
    const diffInDays = Math.floor(Math.abs(diffInMs) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return 'today'
    if (diffInDays === 1) return diffInMs > 0 ? 'tomorrow' : 'yesterday'
    if (diffInDays < 7) return `${diffInDays} days ${diffInMs > 0 ? '' : 'ago'}`
    if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7)
      return `${weeks} week${weeks > 1 ? 's' : ''} ${diffInMs > 0 ? '' : 'ago'}`
    }

    return this.formatDate(date)
  }
}
