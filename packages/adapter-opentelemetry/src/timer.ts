import type { IgniterTimer } from '@igniter-js/core';

/**
 * OpenTelemetry Timer wrapper that implements IgniterTimer interface
 */
export class OpenTelemetryTimer implements IgniterTimer {
  private _startTime: number;
  private _metricName: string;
  private _meter: any;
  private _histogram: any;
  private _baseTags: Record<string, string>;

  constructor(
    metricName: string,
    meter: any,
    baseTags: Record<string, string> = {}
  ) {
    this._startTime = Date.now();
    this._metricName = metricName;
    this._meter = meter;
    this._baseTags = baseTags;

    try {
      // Create or get histogram for duration metrics
      this._histogram = this._meter.createHistogram(this._metricName, {
        description: `Duration histogram for ${metricName}`,
        unit: 'ms',
      });
    } catch (error) {
      console.warn(`[OpenTelemetry] Failed to create histogram for ${metricName}:`, error);
    }
  }

  get name(): string {
    return this._metricName;
  }

  get startTime(): number {
    return this._startTime;
  }

  get tags(): Record<string, string> {
    return this._baseTags;
  }

  finish(additionalTags?: Record<string, string>): void {
    try {
      const duration = Date.now() - this._startTime;
      const allTags = { ...this._baseTags, ...additionalTags };

      if (this._histogram) {
        this._histogram.record(duration, allTags);
      }
    } catch (error) {
      // Graceful fallback
      console.warn(`[OpenTelemetry] Failed to record timer ${this._metricName}:`, error);
    }
  }

  /**
   * Get current elapsed time without finishing the timer
   */
  getElapsed(): number {
    return Date.now() - this._startTime;
  }

  /**
   * Get current duration in milliseconds
   */
  getDuration(): number {
    return Date.now() - this._startTime;
  }
}

/**
 * No-op timer implementation for graceful fallbacks
 */
export class NoOpTimer implements IgniterTimer {
  private _startTime = Date.now();

  constructor(private _metricName: string) {}

  get name(): string {
    return this._metricName;
  }

  get startTime(): number {
    return this._startTime;
  }

  get tags(): Record<string, string> {
    return {};
  }

  finish(): void {
    // No-op
  }

  getElapsed(): number {
    return 0;
  }

  getDuration(): number {
    return 0;
  }
} 