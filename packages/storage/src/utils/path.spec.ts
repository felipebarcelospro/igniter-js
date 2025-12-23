import { describe, expect, it } from "vitest";
import { IgniterStoragePath } from "./path";

describe("IgniterStoragePath", () => {
  it("should join paths correctly", () => {
    expect(IgniterStoragePath.join("a", "b", "c")).toBe("a/b/c");
    expect(IgniterStoragePath.join("/a/", "/b/", "/c/")).toBe("a/b/c");
    expect(IgniterStoragePath.join("a", undefined, "c")).toBe("a/c");
  });

  it("should split paths correctly", () => {
    expect(IgniterStoragePath.split("a/b/c.txt")).toEqual({
      dir: "a/b",
      base: "c.txt",
    });
    expect(IgniterStoragePath.split("file.txt")).toEqual({
      dir: "",
      base: "file.txt",
    });
  });

  it("should extract extensions", () => {
    expect(IgniterStoragePath.getExtension("file.txt")).toBe("txt");
    expect(IgniterStoragePath.getExtension("archive.tar.gz")).toBe("gz");
    expect(IgniterStoragePath.getExtension("file")).toBe("");
  });

  it("should extract basenames", () => {
    expect(IgniterStoragePath.getBasename("path/to/file.txt")).toBe("file.txt");
    expect(IgniterStoragePath.getBasename("file.txt")).toBe("file.txt");
  });
});
