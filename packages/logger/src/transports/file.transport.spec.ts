import { describe, expect, it } from "vitest";
import { resolveFileTransport } from "./file.transport";

describe("resolveFileTransport", () => {
  it("returns the default pino/file target", () => {
    const config = resolveFileTransport({ path: "/tmp/igniter.log" });

    expect(config.target).toBe("pino/file");
    expect(config.options).toEqual(
      expect.objectContaining({
        destination: "/tmp/igniter.log",
        mkdir: true,
      }),
    );
  });

  it("respects custom mkdir settings", () => {
    const config = resolveFileTransport({ path: "./logs/app.log", mkdir: false });

    expect(config.options).toEqual(
      expect.objectContaining({
        destination: "./logs/app.log",
        mkdir: false,
      }),
    );
  });
});
