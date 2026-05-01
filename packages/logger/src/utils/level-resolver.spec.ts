import { describe, expect, it } from "vitest";
import { IgniterLoggerLevelResolver } from "./level-resolver";
import { IgniterLogLevel } from "../types/level";

describe("IgniterLoggerLevelResolver", () => {
  it("returns the enum value for IgniterLogLevel", () => {
    expect(IgniterLoggerLevelResolver.resolve(IgniterLogLevel.Debug)).toBe(
      "debug",
    );
  });

  it("normalizes uppercase strings", () => {
    expect(IgniterLoggerLevelResolver.resolve("WARN")).toBe("warn");
  });

  it("maps aliases to supported levels", () => {
    expect(IgniterLoggerLevelResolver.resolve("warning")).toBe("warn");
    expect(IgniterLoggerLevelResolver.resolve("err")).toBe("error");
  });

  it("defaults to info when the level is unknown", () => {
    expect(IgniterLoggerLevelResolver.resolve("unknown")).toBe("info");
  });

  it("trims whitespace before resolving", () => {
    expect(IgniterLoggerLevelResolver.resolve("  debug ")).toBe("debug");
  });
});
