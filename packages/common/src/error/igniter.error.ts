import type { IgniterLogger } from "../types/logger.interface";

/**
 * Custom error class for Igniter.js.
 * Provides structured error handling with optional logger integration.
 */
export class IgniterError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly metadata?: Record<string, unknown>;
  public readonly causer?: string;
  public readonly cause?: Error;
  public readonly stackTrace?: string;

  constructor({
    message,
    code,
    statusCode,
    causer,
    details,
    metadata,
    logger,
    cause,
  }: {
    message: string;
    code: string;
    statusCode?: number;
    causer?: string;
    details?: unknown;
    metadata?: Record<string, unknown>;
    logger?: IgniterLogger;
    cause?: Error;
  }) {
    super(message);

    this.name = "IgniterError";
    this.code = code;
    this.statusCode = statusCode ?? 500;
    this.details = details;
    this.metadata = metadata;
    this.causer = causer;
    this.stackTrace = this.stack;
    this.cause = cause;

    if (logger) {
      logger.error(this.message, {
        statusCode: this.statusCode,
        code: this.code,
        details: this.details,
        metadata: this.metadata,
        stackTrace: this.stackTrace,
      });
    }
  }

  /**
   * Creates a serializable version of the error.
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      metadata: this.metadata,
      stackTrace: this.stackTrace,
    };
  }
}
