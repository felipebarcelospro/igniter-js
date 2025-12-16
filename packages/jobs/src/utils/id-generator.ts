/**
 * Generates consistent identifiers for jobs, workers, and schedules.
 */
export class IgniterJobsIdGenerator {
  /**
   * Generates a unique identifier with a prefix.
   *
   * @example
   * ```typescript
   * const jobId = IgniterJobsIdGenerator.generate('job')
   * ```
   */
  public static generate(prefix: string): string {
    const now = Date.now().toString(36)
    const random = Math.random().toString(36).slice(2, 8)
    return `${prefix}_${now}_${random}`
  }
}
