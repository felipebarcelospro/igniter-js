/**
 * @fileoverview In-memory transport adapter for @igniter-js/telemetry
 * @module @igniter-js/telemetry/adapters/memory
 */

import type { IgniterTelemetryTransportAdapter } from "../types/transport";
import type { IgniterTelemetryEnvelope } from "../types/envelope";

export class InMemoryTransportAdapter implements IgniterTelemetryTransportAdapter {
  readonly type = "memory" as const;
  private events: IgniterTelemetryEnvelope[] = [];

  static create(): InMemoryTransportAdapter {
    return new InMemoryTransportAdapter();
  }

  handle(envelope: IgniterTelemetryEnvelope): void {
    this.events.push(envelope);
  }

  getEvents(): IgniterTelemetryEnvelope[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}
