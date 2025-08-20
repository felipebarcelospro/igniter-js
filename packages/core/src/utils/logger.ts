import { IgniterLogLevel } from '../types';

/**
 * Resolves the log level from environment variables with proper validation and fallback.
 * 
 * This utility centralizes log level resolution across the Igniter.js framework.
 * It provides a consistent fallback strategy with WARN as the silent default.
 * 
 * @returns {IgniterLogLevel} The resolved log level
 * 
 * @example
 * ```typescript
 * // Environment-based log level resolution
 * const level = resolveLogLevel(); // Uses IGNITER_LOG_LEVEL or falls back to WARN
 * 
 * // Create logger with resolved level
 * const logger = IgniterConsoleLogger.create({ 
 *   level: resolveLogLevel(),
 *   context: { component: 'MyProcessor' }
 * });
 * ```
 */
export function resolveLogLevel(): IgniterLogLevel {
  const envLevel = process.env.IGNITER_LOG_LEVEL?.toUpperCase();
  
  // Valid log levels mapping
  const validLevels: Record<string, IgniterLogLevel> = {
    'FATAL': IgniterLogLevel.FATAL,
    'ERROR': IgniterLogLevel.ERROR,
    'WARN': IgniterLogLevel.WARN,
    'INFO': IgniterLogLevel.INFO,
    'DEBUG': IgniterLogLevel.DEBUG,  
    'TRACE': IgniterLogLevel.TRACE,
    
    // Aliases for better DX
    'WARNING': IgniterLogLevel.WARN,
    'VERBOSE': IgniterLogLevel.DEBUG,
  };
  
  // Return validated level or silent fallback to WARN
  return envLevel && validLevels[envLevel] ? validLevels[envLevel] : IgniterLogLevel.WARN;
}

/**
 * Creates a standardized logger context for consistent logging across processors.
 * 
 * @param component - The component name (e.g., 'RequestProcessor', 'ErrorHandler')
 * @param additionalContext - Additional context properties
 * @returns {Record<string, unknown>} The standardized context object
 * 
 * @example
 * ```typescript
 * // Basic processor context
 * const context = createLoggerContext('RequestProcessor');
 * 
 * // With additional context (e.g., request-specific)
 * const context = createLoggerContext('RequestProcessor', {
 *   requestId: 'req-123',
 *   method: 'POST',
 *   route: '/api/users'
 * });
 * ```
 */
export function createLoggerContext(
  component: string, 
  additionalContext?: Record<string, unknown>
): Record<string, unknown> {
  return {
    component,
    ...additionalContext,
  };
}