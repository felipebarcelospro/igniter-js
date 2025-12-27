import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OtlpTransportAdapter } from "./otlp.adapter";
import type { IgniterTelemetryEnvelope } from "../types/envelope";

describe("OtlpTransportAdapter", () => {
  const createEnvelope = (
    overrides: Partial<IgniterTelemetryEnvelope> = {},
  ): IgniterTelemetryEnvelope => ({
    name: "test.event",
    time: "2025-01-01T00:00:00.000Z",
    level: "info",
    service: "test-service",
    environment: "test",
    sessionId: "ses_test_123",
    ...overrides,
  });

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should send OTLP logs via fetch", async () => {
    const adapter = OtlpTransportAdapter.create({
      url: "http://otel-collector:4318/v1/logs",
    });
    const envelope = createEnvelope();

    await adapter.handle(envelope);

    expect(fetch).toHaveBeenCalledWith(
      "http://otel-collector:4318/v1/logs",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );

    const body = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(body.resourceLogs).toBeDefined();
    const logRecord = body.resourceLogs[0].scopeLogs[0].logRecords[0];
    expect(logRecord.severityText).toBe("INFO");
    expect(logRecord.body.stringValue).toBe("test.event");
  });

  it("should map severity correctly", async () => {
    const adapter = OtlpTransportAdapter.create({
      url: "http://otel-collector:4318/v1/logs",
    });

    const levels: Array<[string, number]> = [
      ["debug", 5],
      ["info", 9],
      ["warn", 13],
      ["error", 17],
    ];

    let callIndex = 0;
    for (const [level, severity] of levels) {
      await adapter.handle(createEnvelope({ level: level as any }));
      const body = JSON.parse((fetch as any).mock.calls[callIndex][1].body);
      expect(
        body.resourceLogs[0].scopeLogs[0].logRecords[0].severityNumber,
      ).toBe(severity);
      callIndex++;
    }
  });

  it("should include attributes in OTLP format", async () => {
    const adapter = OtlpTransportAdapter.create({
      url: "http://otel-collector:4318/v1/logs",
    });
    const envelope = createEnvelope({
      attributes: {
        str: "value",
        num: 123,
        bool: true,
      },
    });

    await adapter.handle(envelope);

    const body = JSON.parse((fetch as any).mock.calls[0][1].body);
    const attributes =
      body.resourceLogs[0].scopeLogs[0].logRecords[0].attributes;

    expect(attributes).toContainEqual({
      key: "str",
      value: { stringValue: "value" },
    });
    expect(attributes).toContainEqual({
      key: "num",
      value: { doubleValue: 123 },
    });
    expect(attributes).toContainEqual({
      key: "bool",
      value: { boolValue: true },
    });
  });
});
