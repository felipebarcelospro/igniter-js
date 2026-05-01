import { describe, expect, it } from "vitest";
import { createLoggerContext, resolveLogLevel } from "./logger";
import { IgniterLogLevel } from "../types";

describe("resolveLogLevel", () => {
  it("returns WARN when env var is missing", () => {
    const previous = process.env.IGNITER_LOG_LEVEL;
    delete process.env.IGNITER_LOG_LEVEL;

    expect(resolveLogLevel()).toBe(IgniterLogLevel.WARN);

    process.env.IGNITER_LOG_LEVEL = previous;
  });

  it("supports aliases and valid levels", () => {
    const previous = process.env.IGNITER_LOG_LEVEL;
    process.env.IGNITER_LOG_LEVEL = "verbose";

    expect(resolveLogLevel()).toBe(IgniterLogLevel.DEBUG);

    process.env.IGNITER_LOG_LEVEL = previous;
  });
});

describe("createLoggerContext", () => {
  it("merges additional context", () => {
    const context = createLoggerContext("Processor", { requestId: "1" });

    expect(context).toEqual({
      component: "Processor",
      requestId: "1",
    });
  });
});
