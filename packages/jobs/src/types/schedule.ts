/**
 * Options for scheduling a job dispatch.
 */
export interface IgniterJobsScheduleOptions {
  /**
   * Absolute date/time to run the job.
   *
   * @example
   * ```typescript
   * at: new Date('2025-01-01T10:00:00Z')
   * ```
   */
  at?: Date
  /**
   * Delay in milliseconds before running the job.
   */
  delay?: number
  /**
   * Cron expression for repeating jobs.
   *
   * @example "0 2 * * *" // every day at 02:00
   */
  cron?: string
  /**
   * Repeat every N milliseconds (mutually exclusive with cron).
   */
  every?: number
  /**
   * Maximum number of executions for repeating jobs.
   */
  maxExecutions?: number
  /**
   * Timezone used when evaluating cron expressions.
   */
  tz?: string
  /**
   * Skip execution on weekends when true.
   */
  skipWeekends?: boolean
  /**
   * Restrict execution to business hours (24h format).
   */
  businessHours?: {
    start: number
    end: number
    timezone?: string
  }
  /**
   * Only execute during business hours when true.
   */
  onlyBusinessHours?: boolean
  /**
   * Array of day indices (0-6) that are allowed for execution.
   */
  onlyWeekdays?: number[]
  /**
   * Dates to skip execution (ISO strings or Date objects).
   */
  skipDates?: Array<string | Date>
}
