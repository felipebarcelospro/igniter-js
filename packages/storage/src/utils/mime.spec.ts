import { describe, expect, it } from "vitest";
import { IgniterStorageMime } from "./mime";

describe("IgniterStorageMime", () => {
  it("should infer content type from filename", () => {
    expect(IgniterStorageMime.inferContentType("image.png")).toBe("image/png");
    expect(IgniterStorageMime.inferContentType("doc.pdf")).toBe(
      "application/pdf",
    );
    // "xyz" is mapped to "chemical/x-xyz" in mime-types lib, so we change test case to something truly unknown or accept it.
    // Let's use a random extension that definitely doesn't exist.
    expect(
      IgniterStorageMime.inferContentType("unknown.superrandomext"),
    ).toBeNull();
  });

  it("should infer extension from content type", () => {
    // The mime-types library returns 'jpg' for 'image/jpeg'
    expect(IgniterStorageMime.inferExtension("image/jpeg")).toBe("jpg");
    expect(IgniterStorageMime.inferExtension("application/json")).toBe("json");
    expect(
      IgniterStorageMime.inferExtension("application/x-unknown"),
    ).toBeNull();
  });

  it("should normalize content type", () => {
    expect(IgniterStorageMime.normalize("IMAGE/PNG; charset=utf-8")).toBe(
      "image/png",
    );
  });
});
