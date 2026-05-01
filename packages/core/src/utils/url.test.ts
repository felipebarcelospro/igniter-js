import { describe, expect, it } from "vitest";
import { parseURL } from "./url";

describe("parseURL", () => {
  it("merges path segments", () => {
    expect(parseURL("users", "profile")).toBe("/users/profile");
  });

  it("handles empty inputs", () => {
    expect(parseURL()).toBe("/");
    expect(parseURL("")).toBe("/");
  });

  it("preserves protocol and host", () => {
    expect(parseURL("https://example.com", "api", "users")).toBe(
      "https://example.com/api/users",
    );
  });
});
