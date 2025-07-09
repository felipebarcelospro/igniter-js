import { createConsoleLogger, IgniterLogLevel } from '@igniter-js/core'

/**
 * Logger instance for application logging.
 *
 * @remarks
 * Provides structured logging with configurable log levels.
 *
 * @see https://github.com/felipebarcelospro/igniter-js/tree/main/packages/core
 */
export const logger = createConsoleLogger({
  level: IgniterLogLevel.INFO,
  showTimestamp: true,
})
