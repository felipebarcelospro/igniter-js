import { describe, expect, it } from "vitest";
import { resolveConsoleTransport } from "./console.transport";

describe("resolveConsoleTransport", () => {
  it("returns the default pino-pretty target", () => {
    const config = resolveConsoleTransport({});

    expect(config.target).toBe("pino-pretty");
    expect(config.options).toEqual(
      expect.objectContaining({
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      }),
    );
  });

  it("merges custom options and preserves overrides", () => {
    const config = resolveConsoleTransport({
      colorize: false,
      destination: "stderr",
      translateTime: "SYS:short",
    });

    expect(config.options).toEqual(
      expect.objectContaining({
        colorize: false,
        destination: "stderr",
        translateTime: "SYS:short",
      }),
    );
  });
});
