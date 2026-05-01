import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "os";
import { join } from "path";
import { mkdirSync, rmSync, existsSync, readFileSync } from "fs";
import { IgniterLogger } from "./builders/main.builder";
import { IgniterLogLevel } from "./types/level";

describe("Integration Tests", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `igniter-logger-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should create logger with default console transport", async () => {
    const logger = IgniterLogger.create().build();

    expect(logger).toBeDefined();
    logger.info("Integration test message");
    await logger.flush();
  });

  it("should work with file transport", async () => {
    const logFile = join(tempDir, "test.log");

    const logger = IgniterLogger.create()
      .addTransport({
        target: "file",
        options: { path: logFile },
      })
      .build();

    logger.info("File transport test");
    await logger.flush();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(existsSync(logFile)).toBe(true);
    const logContent = readFileSync(logFile, "utf-8");
    expect(logContent).toContain("File transport test");
  });

  it("should work with multiple transports simultaneously", async () => {
    const logFile = join(tempDir, "multi.log");

    const logger = IgniterLogger.create()
      .addTransport({ target: "console", options: { pretty: false } })
      .addTransport({ target: "file", options: { path: logFile } })
      .build();

    logger.info("Multi-transport test");
    await logger.flush();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(existsSync(logFile)).toBe(true);
  });

  it("should create child loggers with merged context", async () => {
    const logger = IgniterLogger.create()
      .withContext({ service: "api" })
      .build();

    const childLogger = logger.child("http", { requestId: "req-123" });

    childLogger.info("Child logger test");
    await logger.flush();

    expect(childLogger).toBeDefined();
  });

  it("should support external pino-pretty transport", async () => {
    const logger = IgniterLogger.create()
      .addTransport({
        target: "pino-pretty",
        options: { colorize: true },
      })
      .build();

    logger.info("External transport test");
    await logger.flush();

    expect(logger).toBeDefined();
  });

  it("should handle runtime level changes", async () => {
    const logger = IgniterLogger.create()
      .withLevel(IgniterLogLevel.Info)
      .build();

    logger.debug("Should not log");
    logger.setLevel(IgniterLogLevel.Debug);
    logger.debug("Should log");

    await logger.flush();
  });

  it("should handle errors gracefully", async () => {
    const logger = IgniterLogger.create()
      .addTransport({
        target: "file",
        options: { path: "/invalid/path/test.log" },
      })
      .build();

    expect(() => {
      logger.info("Error handling test");
    }).not.toThrow();

    await logger.flush();
  });
});
