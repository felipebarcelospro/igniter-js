/**
 * @fileoverview Internal HTTP transport sender (non-blocking)
 * @module @igniter-js/logger/transports/http-sender
 */

import type { HttpTransportOptions } from '../types/transport';

/**
 * Async HTTP log sender that buffers logs and sends in batches.
 * Non-blocking implementation to avoid impacting application performance.
 */
export class HttpLogSender {
  private buffer: any[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isFlushing = false;

  constructor(private readonly options: HttpTransportOptions) {
    // Start periodic flush
    this.startPeriodicFlush();
  }

  /**
   * Add a log entry to the buffer (non-blocking).
   *
   * @param logEntry - The log entry to send
   */
  send(logEntry: any): void {
    this.buffer.push(logEntry);

    // Flush if buffer exceeds batch size
    if (this.buffer.length >= (this.options.batchSize ?? 10)) {
      this.flush().catch(() => {
        // Silent fail - don't block app on log failures
      });
    }
  }

  /**
   * Flush buffered logs to remote endpoint (async).
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) {
      return;
    }

    this.isFlushing = true;
    const logsToSend = this.buffer.splice(0, this.buffer.length);

    try {
      const response = await fetch(this.options.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers,
        },
        body: JSON.stringify({
          logs: logsToSend,
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(this.options.timeoutMs ?? 5000),
      });

      if (!response.ok) {
        // On failure, put logs back in buffer (don't lose them)
        this.buffer.unshift(...logsToSend);
      }
    } catch (error) {
      // On network error, put logs back in buffer
      this.buffer.unshift(...logsToSend);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Stop periodic flushing (cleanup).
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // Final flush
    this.flush().catch(() => {});
  }

  private startPeriodicFlush(): void {
    // Flush every 5 seconds by default
    const interval = this.options.flushInterval ?? 5000;
    
    this.flushTimer = setInterval(() => {
      this.flush().catch(() => {});
    }, interval);

    // Don't keep process alive just for logging
    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }
  }
}
