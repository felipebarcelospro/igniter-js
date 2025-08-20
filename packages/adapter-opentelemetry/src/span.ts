import type { IgniterTelemetrySpan, IgniterSpanOptions, IgniterSpanContext } from '@igniter-js/core';
import { IgniterConsoleLogger, resolveLogLevel } from '@igniter-js/core';

// Centralized logger for span module
const logger = IgniterConsoleLogger.create({
  level: resolveLogLevel(),
  context: { component: 'OpenTelemetrySpan' },
});

/**
 * OpenTelemetry Span wrapper that implements IgniterTelemetrySpan interface
 */
export class OpenTelemetrySpanWrapper implements IgniterTelemetrySpan {
  private _span: any;
  private _tracer: any;
  private _startTime: number;
  private _status: 'active' | 'completed' | 'error' = 'active';

  constructor(span: any, tracer: any) {
    this._span = span;
    this._tracer = tracer;
    this._startTime = Date.now();
  }

  get name(): string {
    return this._span.name || 'unknown';
  }

  get id(): string {
    return this._span.spanContext().spanId || 'unknown';
  }

  get traceId(): string {
    return this._span.spanContext().traceId || 'unknown';
  }

  get parentId(): string | undefined {
    return this._span.parentSpanId;
  }

  get startTime(): number {
    return this._startTime;
  }

  get status(): 'active' | 'completed' | 'error' {
    return this._status;
  }

  setTag(key: string, value: string | number | boolean): void {
    try {
      this._span.setAttribute(key, value);
    } catch (error) {
      // Graceful fallback - don't break execution
      logger.warn('Failed to set tag', { key, error });
    }
  }

  setTags(tags: Record<string, string | number | boolean>): void {
    try {
      this._span.setAttributes(tags);
    } catch (error) {
      // Graceful fallback
      logger.warn('Failed to set tags', { error });
    }
  }

  setError(error: Error): void {
    try {
      this._span.recordException(error);
      this._span.setStatus({
        code: 2, // ERROR
        message: error.message,
      });
      this._status = 'error';
    } catch (err) {
      // Graceful fallback
      logger.warn('Failed to set error', { error: err });
    }
  }

  addEvent(name: string, data?: Record<string, any>): void {
    try {
      this._span.addEvent(name, data);
    } catch (error) {
      logger.warn('Failed to add event', { name, error });
    }
  }

  finish(): void {
    try {
      this._span.end();
      this._status = 'completed';
    } catch (error) {
      // Graceful fallback
      logger.warn('Failed to finish span', { error });
    }
  }

  child(name: string, options?: IgniterSpanOptions): IgniterTelemetrySpan {
    try {
      // Create child span using OpenTelemetry context
      const childSpan = this._tracer.startSpan(name, {
        parent: this._span,
        attributes: options?.tags,
      });

      return new OpenTelemetrySpanWrapper(childSpan, this._tracer);
    } catch (error) {
      // Graceful fallback - return no-op span
      logger.warn('Failed to create child span', { error });
      return new NoOpSpan(name);
    }
  }

  getContext(): IgniterSpanContext {
    try {
      const spanContext = this._span.spanContext();
      return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        traceFlags: spanContext.traceFlags,
      };
    } catch (error) {
      logger.warn('Failed to get span context', { error });
      return {
        traceId: 'unknown',
        spanId: 'unknown',
        traceFlags: 0,
      };
    }
  }

  /**
   * Get the underlying OpenTelemetry span (for advanced usage)
   */
  getOtelSpan(): any {
    return this._span;
  }
}

/**
 * No-op span implementation for graceful fallbacks
 */
class NoOpSpan implements IgniterTelemetrySpan {
  private _startTime = Date.now();

  constructor(private _name: string) {}

  get name(): string {
    return this._name;
  }

  get id(): string {
    return 'noop';
  }

  get traceId(): string {
    return 'noop';
  }

  get parentId(): string | undefined {
    return undefined;
  }

  get startTime(): number {
    return this._startTime;
  }

  get status(): 'active' | 'completed' | 'error' {
    return 'active';
  }

  setTag(): void {
    // No-op
  }

  setTags(): void {
    // No-op
  }

  setError(): void {
    // No-op
  }

  addEvent(): void {
    // No-op
  }

  finish(): void {
    // No-op
  }

  child(name: string): IgniterTelemetrySpan {
    return new NoOpSpan(name);
  }

  getContext(): IgniterSpanContext {
    return {
      traceId: 'noop',
      spanId: 'noop',
      traceFlags: 0,
    };
  }
}