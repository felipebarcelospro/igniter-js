import { describe, expect, it } from "vitest";
import { IgniterStorageUrl } from "./url";

describe("IgniterStorageUrl", () => {
  it("should ensure trailing slash", () => {
    expect(IgniterStorageUrl.ensureTrailingSlash("http://example.com")).toBe(
      "http://example.com/",
    );
    expect(IgniterStorageUrl.ensureTrailingSlash("http://example.com/")).toBe(
      "http://example.com/",
    );
  });

  it("should strip base url from input", () => {
    const baseUrl = "https://cdn.example.com/assets";
    expect(
      IgniterStorageUrl.stripBaseUrlOrThrow({
        input: "https://cdn.example.com/assets/images/logo.png",
        baseUrl,
      }),
    ).toBe("images/logo.png");
  });

  it("should handle input as relative path if not a URL", () => {
    const baseUrl = "https://cdn.example.com";
    expect(
      IgniterStorageUrl.stripBaseUrlOrThrow({
        input: "/images/logo.png",
        baseUrl,
      }),
    ).toBe("images/logo.png");
  });

  it("should throw if hostname mismatches", () => {
    const baseUrl = "https://cdn.example.com";
    expect(() =>
      IgniterStorageUrl.stripBaseUrlOrThrow({
        input: "https://hacker.com/malicious.exe",
        baseUrl,
      }),
    ).toThrow(/different hostname/);
  });
});
