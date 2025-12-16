/**
 * @fileoverview Telemetry utilities for @igniter-js/jobs
 * @module @igniter-js/jobs/utils/telemetry.utils
 */

import type { IgniterJobsTelemetry } from "../types/events";

/**
 * Static utility class for handling telemetry emissions.
 */
export class IgniterJobsTelemetryUtils {
  /**
   * Emits a telemetry event if telemetry is configured.
   * This is a fire-and-forget operation - telemetry errors are silently ignored
   * to avoid affecting job processing.
   *
   * @param telemetry - The telemetry instance (optional).
   * @param eventName - The name of the event to emit.
   * @param attributes - Attributes to attach to the event.
   * @param level - The log level for the event (default: 'info').
   */
  public static emitTelemetry(
    telemetry: IgniterJobsTelemetry | undefined,
    eventName: string,
    attributes: Record<string, string | number | boolean | null>,
    level: "info" | "error" = "info",
  ): void {
    if (!telemetry) return;

    try {
      telemetry.emit(eventName, { attributes, level });
    } catch {
      // Silently ignore telemetry errors to avoid affecting job processing
    }
  }
}
