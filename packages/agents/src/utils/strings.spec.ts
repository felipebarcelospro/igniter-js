import { describe, expect, it } from "vitest";
import { IgniterAgentStringUtils } from "./strings";

describe("IgniterAgentStringUtils", () => {
  it("generates ids with optional prefix", () => {
    const id = IgniterAgentStringUtils.generateId();
    const prefixed = IgniterAgentStringUtils.generateId("chat");

    expect(id.length).toBeGreaterThan(0);
    expect(prefixed.startsWith("chat_")).toBe(true);
  });

  it("truncates strings with suffix", () => {
    expect(IgniterAgentStringUtils.truncate("hello world", 5)).toBe("he...");
    expect(IgniterAgentStringUtils.truncate("short", 10)).toBe("short");
  });

  it("converts to snake_case", () => {
    expect(IgniterAgentStringUtils.toSnakeCase("camelCase")).toBe("camel_case");
    expect(IgniterAgentStringUtils.toSnakeCase("PascalCase")).toBe("pascal_case");
  });

  it("converts to camelCase", () => {
    expect(IgniterAgentStringUtils.toCamelCase("snake_case")).toBe("snakeCase");
    expect(IgniterAgentStringUtils.toCamelCase("kebab-case")).toBe("kebabCase");
  });
});
