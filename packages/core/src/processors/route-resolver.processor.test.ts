import { describe, expect, it, vi } from "vitest";
import { createTelemetrySpy, validateTelemetryEvents } from "../test/telemetry";

vi.mock("rou3", async () => {
  const actual = await vi.importActual<typeof import("rou3")>("rou3");
  return {
    ...actual,
    findRoute: () => {
      throw new Error("boom");
    },
  };
});

describe("RouteResolverProcessor telemetry", () => {
  it("emits error telemetry when route resolution fails", async () => {
    const { RouteResolverProcessor } = await import(
      "./route-resolver.processor"
    );
    const { telemetry, events } = createTelemetrySpy();

    expect(() =>
      RouteResolverProcessor.resolve(
        {} as any,
        "GET",
        "/boom",
        undefined,
        telemetry,
      ),
    ).toThrow("boom");

    const names = events.map((event) => event.name);
    expect(names).toEqual(
      expect.arrayContaining(["igniter.core.route.resolve.error"]),
    );

    const failures = await validateTelemetryEvents(events);
    expect(failures).toEqual([]);
  });
});
