import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IgniterLoggerConfig } from "../types/config";
import type { IgniterTransportConfig } from "../types/transport";
import { IgniterLogLevel } from "../types/level";
import { IgniterLoggerManager } from "./manager";

const { mockPino } = vi.hoisted(() => ({
  mockPino: vi.fn(),
}));

vi.mock("pino", () => ({
  __esModule: true,
  default: mockPino,
}));

type MockLogger = {
  fatal: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
  trace: ReturnType<typeof vi.fn>;
  child: ReturnType<typeof vi.fn>;
  flush: ReturnType<typeof vi.fn>;
  level: string;
};

const createMockLogger = (): MockLogger => ({
  fatal: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  child: vi.fn(),
  flush: vi.fn((callback: (error?: Error | null) => void) => callback()),
  level: "info",
});

describe("IgniterLoggerManager", () => {
  let logger: MockLogger;

  beforeEach(() => {
    logger = createMockLogger();
    mockPino.mockReturnValue(logger);
  });

  it("initializes pino with resolved transports", () => {
    const transports: IgniterTransportConfig[] = [
      { target: "console", options: { pretty: true } },
      { target: "file", options: { path: "/tmp/app.log" } },
      { target: "http", options: { url: "https://log.example.com" } },
      { target: "@logtail/pino", options: { token: "test" } },
    ];

    const config: IgniterLoggerConfig = {
      level: IgniterLogLevel.Debug,
      appName: "api",
      component: "http",
      context: { region: "us-east" },
      transports,
    };

    new IgniterLoggerManager(config);

    expect(mockPino).toHaveBeenCalledTimes(1);
    expect(mockPino).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "debug",
        base: expect.objectContaining({
          appName: "api",
          component: "http",
          region: "us-east",
        }),
        transport: {
          targets: expect.arrayContaining([
            expect.objectContaining({ target: "pino-pretty" }),
            expect.objectContaining({ target: "pino/file" }),
            expect.objectContaining({ target: "pino/file" }),
            expect.objectContaining({ target: "@logtail/pino" }),
          ]),
        },
      }),
    );
  });

  it("logs with all standard methods", () => {
    const manager = new IgniterLoggerManager({});

    manager.fatal("fatal");
    manager.error("error");
    manager.warn("warn", { code: "W" });
    manager.info("info", { requestId: "req-1" });
    manager.debug("debug", { debug: true });
    manager.trace("trace", { trace: true });

    expect(logger.fatal).toHaveBeenCalledWith({}, "fatal");
    expect(logger.error).toHaveBeenCalledWith({}, "error");
    expect(logger.warn).toHaveBeenCalledWith({ code: "W" }, "warn");
    expect(logger.info).toHaveBeenCalledWith(
      { requestId: "req-1" },
      "info",
    );
    expect(logger.debug).toHaveBeenCalledWith({ debug: true }, "debug");
    expect(logger.trace).toHaveBeenCalledWith({ trace: true }, "trace");
  });

  it("logs with log() helper", () => {
    const manager = new IgniterLoggerManager({});

    manager.log(IgniterLogLevel.Warn, "warning", { status: 429 });
    manager.log(IgniterLogLevel.Error, "error", undefined, new Error("boom"));

    expect(logger.warn).toHaveBeenCalledWith({ status: 429 }, "warning");
    expect(logger.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      "error",
    );
  });

  it("adds success markers", () => {
    const manager = new IgniterLoggerManager({});

    manager.success("done", { step: 1 });

    expect(logger.info).toHaveBeenCalledWith(
      { step: 1, type: "success" },
      "✓ done",
    );
  });

  it("manages group indentation", () => {
    const manager = new IgniterLoggerManager({});

    manager.group("Batch");
    manager.info("First");
    manager.group();
    manager.info("Second");
    manager.groupEnd();
    manager.info("Third");
    manager.groupEnd();
    manager.info("Fourth");

    expect(logger.info).toHaveBeenNthCalledWith(1, "┌ Batch");
    expect(logger.info).toHaveBeenNthCalledWith(2, {}, "  First");
    expect(logger.info).toHaveBeenNthCalledWith(3, {}, "    Second");
    expect(logger.info).toHaveBeenNthCalledWith(4, {}, "  Third");
    expect(logger.info).toHaveBeenNthCalledWith(5, {}, "Fourth");
  });

  it("creates a separator", () => {
    const manager = new IgniterLoggerManager({});

    manager.separator();

    expect(logger.info).toHaveBeenCalledWith("─".repeat(50));
  });

  it("creates child logger instances", () => {
    const childLogger = createMockLogger();
    logger.child.mockReturnValue(childLogger);

    const manager = new IgniterLoggerManager({});
    const child = manager.child("http", { requestId: "req-1" });

    child.info("child");

    expect(logger.child).toHaveBeenCalledWith({
      component: "http",
      requestId: "req-1",
    });
    expect(childLogger.info).toHaveBeenCalledWith({}, "child");
  });

  it("updates runtime settings", () => {
    const manager = new IgniterLoggerManager({
      appName: "api",
      component: "worker",
    });

    manager.setLevel(IgniterLogLevel.Trace);
    manager.setAppName("web");
    manager.setComponent("queue");

    expect(logger.level).toBe("trace");

    const config = (manager as unknown as { config: IgniterLoggerConfig }).config;
    expect(config.appName).toBe("web");
    expect(config.component).toBe("queue");
  });

  it("flushes buffered logs", async () => {
    const manager = new IgniterLoggerManager({});

    await manager.flush();

    expect(logger.flush).toHaveBeenCalled();
  });
});
