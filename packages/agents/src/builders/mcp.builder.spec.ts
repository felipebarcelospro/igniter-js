import { describe, expect, it } from "vitest";
import { IgniterAgentMCPBuilder } from "./mcp.builder";

describe("IgniterAgentMCPBuilder", () => {
  it("builds a stdio configuration", () => {
    const config = IgniterAgentMCPBuilder
      .create("filesystem")
      .withType("stdio")
      .withCommand("npx")
      .withArgs(["-y", "@modelcontextprotocol/server-filesystem", "/tmp"])
      .build();

    expect(config.type).toBe("stdio");
    expect(config.name).toBe("filesystem");
  });

  it("builds an http configuration", () => {
    const config = IgniterAgentMCPBuilder
      .create("remote")
      .withType("http")
      .withURL("https://example.com")
      .build();

    expect(config.type).toBe("http");
    expect(config.name).toBe("remote");
    expect(config.url).toBe("https://example.com");
  });

  it("throws when required fields are missing", () => {
    expect(() =>
      IgniterAgentMCPBuilder
        .create("broken")
        .withType("stdio")
        .build(),
    ).toThrowError();
  });
});
