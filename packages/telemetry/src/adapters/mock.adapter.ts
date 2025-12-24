/**
 * @fileoverview Mock transport adapter for @igniter-js/telemetry
 * @module @igniter-js/telemetry/adapters/mock
 *
 * @description
 * A transport adapter for testing purposes.
 * Captures all emitted events in an internal array for assertion.
 */

import type { IgniterTelemetryTransportAdapter } from "../types/transport";
import type { IgniterTelemetryEnvelope } from "../types/envelope";

/**
 * Mock transport adapter for testing telemetry.
 *
 * @example
 * ```typescript
 * const mock = MockTelemetryAdapter.create()
 * const telemetry = IgniterTelemetry.create()
 *   .addTransport('mock', mock)
 *   .build()
 *
 * telemetry.emit('test.event')
 *
 * expect(mock.getEvents()).toHaveLength(1)
 * expect(mock.getLastEvent()?.name).toBe('test.event')
 * ```
 */
export class MockTelemetryAdapter implements IgniterTelemetryTransportAdapter {
  readonly type = "mock" as const;
  private events: IgniterTelemetryEnvelope[] = [];

  /**
   * Creates a new MockTelemetryAdapter instance.
   */
  static create(): MockTelemetryAdapter {
    return new MockTelemetryAdapter();
  }

  /**
   * Handles a telemetry event by storing it in memory.
   */
  handle(envelope: IgniterTelemetryEnvelope): void {
    this.events.push(envelope);
  }

  /**
   * Gets all captured events.
   */
  getEvents(): IgniterTelemetryEnvelope[] {
    return [...this.events];
  }

  /**
   * Gets the last captured event.
   */
  getLastEvent(): IgniterTelemetryEnvelope | undefined {
    return this.events[this.events.length - 1];
  }

  /**
   * Clears all captured events.
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Flushes any buffered events (no-op for mock).
   */
  async flush(): Promise<void> {}

  /**
   * Shuts down the adapter (no-op for mock).
   */
  async shutdown(): Promise<void> {}
}
