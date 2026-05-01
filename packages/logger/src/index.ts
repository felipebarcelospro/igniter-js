/**
 * @fileoverview Main exports for @igniter-js/logger
 * @module @igniter-js/logger
 */

// Core exports
export { IgniterLogger, IgniterLoggerBuilder } from './builders/main.builder';
export { IgniterLoggerManager } from './core/manager';

// Types
export type {
  IIgniterLoggerManager,
  IgniterLoggerConfig,
  IgniterLoggerBuilderState,
  IgniterTransportConfig,
  ConsoleTransportOptions,
  FileTransportOptions,
  HttpTransportOptions,
  IgniterFileTransportRotationOptions,
} from './types';

// Enums
export { IgniterLogLevel, IgniterTransportTarget } from './types';

// Errors
export {
  IgniterLoggerError,
  IGNITER_LOGGER_ERROR_CODES,
  type IgniterLoggerErrorCode,
} from './errors';

