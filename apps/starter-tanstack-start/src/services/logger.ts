import { createConsoleLogger, IgniterLogLevel } from '@igniter-js/core'

/**
  * Logger instance for application logging.
  *
  * @remarks
  * Provides structured logging with configurable log levels.
  * This is used by the Igniter instance to log events.
  *
  * @see https://github.com/felipebarcelospro/igniter-js
  */
export const logger = createConsoleLogger({
  level: IgniterLogLevel.INFO, // Change to DEBUG for more verbose logs
  showTimestamp: true,
})
