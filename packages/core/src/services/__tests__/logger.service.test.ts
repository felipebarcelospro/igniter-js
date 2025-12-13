import { describe, it, expect, vi, afterEach } from "vitest";

import { IgniterConsoleLogger } from "../logger.service";
import { IgniterLogLevel } from "../../types";

describe("IgniterConsoleLogger column widths", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps reasonable column widths, halves the app/type columns, and expands evenly", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new IgniterConsoleLogger({
      level: IgniterLogLevel.TRACE,
      colorize: false,
      showTimestamp: false,
      appName: "Igniter",
      component: "Short",
    });

    logger.info("first");

    const firstOutput = logSpy.mock.calls[0]?.[0] as string | undefined;
    expect(firstOutput).toBeDefined();

    const firstWidth = (logger as any).columnWidth as number;
    const appBaseWidth = (logger as any).appNameBaseWidth as number;
    const typeBaseWidth = (logger as any).typeBaseWidth as number;
    const firstAppWidth = Math.max(Math.ceil(firstWidth / 2), appBaseWidth);
    const firstTypeWidth = Math.max(Math.ceil(firstWidth / 2), typeBaseWidth);

    expect(firstWidth).toBeGreaterThanOrEqual(20);
    expect(firstAppWidth).toBeLessThanOrEqual(firstWidth);
    expect(firstTypeWidth).toBeLessThanOrEqual(firstWidth);
    expect(firstOutput).toContain("first");

    const firstPrefix = firstOutput!.slice(0, firstOutput!.indexOf("first"));
    const firstSegments = extractSegments(
      firstPrefix,
      firstWidth,
      firstAppWidth,
      firstTypeWidth,
    );
    expect(firstSegments.appSegment.length).toBe(firstAppWidth);
    expect(firstSegments.componentSegment.length).toBe(firstWidth);
    expect(firstSegments.timestampSegment.length).toBe(firstWidth);
    expect(firstSegments.typeSegment.length).toBe(firstTypeWidth);

    logger.setComponent("ComponentNameThatIsMuchLongerThanDefaultWidth");
    logSpy.mockClear();

    logger.info("second");

    const secondOutput = logSpy.mock.calls[0]?.[0] as string | undefined;
    expect(secondOutput).toBeDefined();
    expect(secondOutput).toContain("second");

    const secondWidth = (logger as any).columnWidth as number;
    const secondAppWidth = Math.max(Math.ceil(secondWidth / 2), appBaseWidth);
    const secondTypeWidth = Math.max(Math.ceil(secondWidth / 2), typeBaseWidth);

    expect(secondWidth).toBeGreaterThan(firstWidth);

    const secondPrefix = secondOutput!.slice(
      0,
      secondOutput!.indexOf("second"),
    );
    const secondSegments = extractSegments(
      secondPrefix,
      secondWidth,
      secondAppWidth,
      secondTypeWidth,
    );
    expect(secondSegments.componentSegment.length).toBe(secondWidth);
    expect(secondSegments.timestampSegment.length).toBe(secondWidth);
    expect(secondSegments.appSegment.length).toBe(secondAppWidth);
    expect(secondSegments.typeSegment.length).toBe(secondTypeWidth);
  });
});

function extractSegments(
  prefix: string,
  columnWidth: number,
  appWidth: number,
  typeWidth: number,
) {
  const appSegment = prefix.slice(0, appWidth);
  const componentStart = appWidth + 1;
  const componentSegment = prefix.slice(
    componentStart,
    componentStart + columnWidth,
  );
  const timestampStart = componentStart + columnWidth + 1;
  const timestampSegment = prefix.slice(
    timestampStart,
    timestampStart + columnWidth,
  );
  const typeStart = timestampStart + columnWidth + 1;
  const typeSegment = prefix.slice(typeStart, typeStart + typeWidth);

  return { appSegment, componentSegment, timestampSegment, typeSegment };
}
