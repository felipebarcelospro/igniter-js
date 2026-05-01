import { describe, expect, it } from "vitest";
import { resolveHttpTransport } from "./http.transport";

describe("resolveHttpTransport", () => {
  it("returns a basic transport structure", () => {
    const config = resolveHttpTransport({
      url: "https://logs.example.com",
      batchSize: 100,
      headers: { Authorization: "Bearer token" },
    });

    expect(config.target).toBe("pino/file");
    expect(config.options).toEqual(
      expect.objectContaining({
        url: "https://logs.example.com",
        batchSize: 100,
        headers: { Authorization: "Bearer token" },
      }),
    );
  });
});
