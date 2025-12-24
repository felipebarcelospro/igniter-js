/**
 * @fileoverview OTLP HTTP transport adapter for @igniter-js/telemetry
 * @module @igniter-js/telemetry/adapters/otlp
 */

import type { IgniterTelemetryTransportAdapter } from "../types/transport";
import type { IgniterTelemetryEnvelope } from "../types/envelope";

export interface OtlpTransportConfig {
  /**
   * The OTLP HTTP endpoint URL for traces (e.g., v1/traces) or logs (v1/logs).
   * Note: This adapter currently implements the OTLP Logs schema as generic events fit best there.
   * If you need strict Tracing, use the full OpenTelemetry adapter.
   * @example 'http://localhost:4318/v1/logs'
   */
  url: string;

  /**
   * Custom headers (e.g., API keys).
   */
  headers?: Record<string, string>;
}

/**
 * Lightweight OTLP Logs Exporter over HTTP/JSON.
 * Maps Igniter Telemetry Envelopes to OTLP LogRecords.
 *
 * References:
 * https://opentelemetry.io/docs/specs/otel/logs/data-model/
 * https://opentelemetry.io/docs/specs/otlp/#json-protobuf-encoding
 */
export class OtlpTransportAdapter implements IgniterTelemetryTransportAdapter {
  readonly type = "otlp" as const;

  constructor(private config: OtlpTransportConfig) {}

  static create(config: OtlpTransportConfig): OtlpTransportAdapter {
    return new OtlpTransportAdapter(config);
  }

  async handle(envelope: IgniterTelemetryEnvelope): Promise<void> {
    const payload = this.transformToOtlp(envelope);

    try {
      const response = await fetch(this.config.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.config.headers,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Log locally if it fails, but don't crash
        console.error(
          `[IgniterTelemetry] OTLP export failed: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error("[IgniterTelemetry] OTLP export error:", error);
    }
  }

  private transformToOtlp(envelope: IgniterTelemetryEnvelope): any {
    // Map severity text to numeric severity number
    // https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber
    const severityMap: Record<string, number> = {
      debug: 5,
      info: 9,
      warn: 13,
      error: 17,
      fatal: 21,
    };

    const unixNano = BigInt(new Date(envelope.time).getTime()) * 1000000n;

    const attributes: any[] = [
      { key: "event.name", value: { stringValue: envelope.name } },
      { key: "session.id", value: { stringValue: envelope.sessionId } },
    ];

    if (envelope.version) {
      attributes.push({
        key: "service.version",
        value: { stringValue: envelope.version },
      });
    }

    if (envelope.actor) {
      attributes.push({
        key: "actor.type",
        value: { stringValue: envelope.actor.type },
      });
      if (envelope.actor.id) {
        attributes.push({
          key: "actor.id",
          value: { stringValue: envelope.actor.id },
        });
      }
    }

    if (envelope.attributes) {
      Object.entries(envelope.attributes).forEach(([k, v]) => {
        if (v === null) return;
        if (typeof v === "string") {
          attributes.push({ key: k, value: { stringValue: v } });
        } else if (typeof v === "number") {
          attributes.push({ key: k, value: { doubleValue: v } });
        } else if (typeof v === "boolean") {
          attributes.push({ key: k, value: { boolValue: v } });
        }
      });
    }

    return {
      resourceLogs: [
        {
          resource: {
            attributes: [
              {
                key: "service.name",
                value: { stringValue: envelope.service },
              },
              {
                key: "service.environment",
                value: { stringValue: envelope.environment },
              },
            ],
          },
          scopeLogs: [
            {
              scope: {
                name: "@igniter-js/telemetry",
                version: "0.1.0",
              },
              logRecords: [
                {
                  timeUnixNano: unixNano.toString(),
                  severityNumber: severityMap[envelope.level] || 9,
                  severityText: envelope.level.toUpperCase(),
                  body: {
                    stringValue: envelope.error
                      ? envelope.error.message
                      : envelope.name,
                  },
                  attributes,
                  traceId: envelope.traceId || undefined,
                  spanId: envelope.spanId || undefined,
                },
              ],
            },
          ],
        },
      ],
    };
  }
}
