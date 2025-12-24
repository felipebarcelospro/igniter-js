/**
 * @fileoverview Generic HTTP transport adapter for @igniter-js/telemetry
 * @module @igniter-js/telemetry/adapters/http
 */

import type { IgniterTelemetryTransportAdapter } from "../types/transport";
import type { IgniterTelemetryEnvelope } from "../types/envelope";

export interface HttpTransportConfig {
  /**
   * The endpoint URL to send events to.
   */
  url: string;

  /**
   * Custom headers to include in the request.
   * Useful for authentication tokens.
   */
  headers?: Record<string, string>;

  /**
   * Request timeout in milliseconds.
   * @default 5000
   */
  timeout?: number;

  /**
   * Number of retries for failed requests.
   * @default 0
   */
  retries?: number;
}

export class HttpTransportAdapter implements IgniterTelemetryTransportAdapter {
  readonly type = "http" as const;

  constructor(private config: HttpTransportConfig) {}

  static create(config: HttpTransportConfig): HttpTransportAdapter {
    return new HttpTransportAdapter(config);
  }

  async handle(envelope: IgniterTelemetryEnvelope): Promise<void> {
    const controller = new AbortController();
    const id = setTimeout(
      () => controller.abort(),
      this.config.timeout ?? 5000,
    );

    try {
      const response = await fetch(this.config.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.config.headers,
        },
        body: JSON.stringify(envelope),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("[IgniterTelemetry] HTTP Transport failed:", error);
    } finally {
      clearTimeout(id);
    }
  }
}
