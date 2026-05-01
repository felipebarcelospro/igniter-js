import { describe, it, expect, vi, beforeEach } from "vitest";
import { BunS3Adapter } from "./bun-s3.adapter";

// Mock the 'bun' module
vi.mock("bun", () => {
  return {
    S3Client: vi.fn().mockImplementation(function () {
      return {
        file: vi.fn().mockReturnValue({
          text: vi.fn(),
          delete: vi.fn(),
          exists: vi.fn(),
        }),
        list: vi.fn(),
        delete: vi.fn(),
        exists: vi.fn(),
      };
    }),
    write: vi.fn(),
    Glob: vi.fn().mockImplementation(function (pattern) {
      return {
        match: vi.fn().mockImplementation((path) => {
          if (pattern === "*.md") return path.endsWith(".md");
          return true;
        }),
      };
    }),
  };
});

import { S3Client, write } from "bun";

describe("BunS3Adapter", () => {
  let adapter: BunS3Adapter;
  let mockS3File: any;
  let mockS3Client: any;

  beforeEach(() => {
    mockS3File = {
      text: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
    };

    mockS3Client = {
      file: vi.fn().mockReturnValue(mockS3File),
      list: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
    };

    // Configure S3Client mock to return our mock instance
    (S3Client as any).mockImplementation(function () {
      return mockS3Client;
    });

    adapter = new BunS3Adapter({ bucket: "test-bucket" });
    
    vi.clearAllMocks();
  });

  it("should read a file", async () => {
    mockS3File.exists.mockResolvedValue(true);
    mockS3File.text.mockResolvedValue("content");

    const result = await adapter.read("test.md");

    expect(result).toBe("content");
    expect(mockS3Client.file).toHaveBeenCalledWith("test.md");
    expect(mockS3File.exists).toHaveBeenCalled();
    expect(mockS3File.text).toHaveBeenCalled();
  });

  it("should return null if file does not exist", async () => {
    mockS3File.exists.mockResolvedValue(false);

    const result = await adapter.read("test.md");

    expect(result).toBeNull();
  });

  it("should write a file", async () => {
    await adapter.write("test.md", "new content");

    expect(mockS3Client.file).toHaveBeenCalledWith("test.md");
    expect(write).toHaveBeenCalledWith(mockS3File, "new content");
  });

  it("should delete a file", async () => {
    await adapter.delete("test.md");

    expect(mockS3Client.delete).toHaveBeenCalledWith("test.md");
  });

  it("should list files", async () => {
    mockS3Client.list.mockResolvedValue({
      contents: [
        { key: "test1.md" },
        { key: "test2.md" },
        { key: "other.txt" }
      ],
      isTruncated: false
    });

    const result = await adapter.list("prefix");

    expect(result).toEqual(["test1.md", "test2.md", "other.txt"]);
    expect(mockS3Client.list).toHaveBeenCalledWith({
      prefix: "prefix/",
      startAfter: undefined,
      delimiter: undefined
    });
  });

  it("should filter listed files by pattern", async () => {
    mockS3Client.list.mockResolvedValue({
      contents: [
        { key: "prefix/test1.md" },
        { key: "prefix/test2.md" },
        { key: "prefix/other.txt" }
      ],
      isTruncated: false
    });

    const result = await adapter.list("prefix", "*.md");

    expect(result).toEqual(["prefix/test1.md", "prefix/test2.md"]);
  });

  it("should check if file exists", async () => {
    mockS3Client.exists.mockResolvedValue(true);

    const result = await adapter.exists("test.md");

    expect(result).toBe(true);
    expect(mockS3Client.exists).toHaveBeenCalledWith("test.md");
  });

  it("should handle empty directory for list", async () => {
    mockS3Client.list.mockResolvedValue({
      contents: [],
      isTruncated: false
    });

    const result = await adapter.list("");

    expect(result).toEqual([]);
    expect(mockS3Client.list).toHaveBeenCalledWith({
      prefix: "",
      startAfter: undefined,
      delimiter: undefined
    });
  });

  it("should handle pagination in list", async () => {
    mockS3Client.list
      .mockResolvedValueOnce({
        contents: [{ key: "file1" }],
        isTruncated: true
      })
      .mockResolvedValueOnce({
        contents: [{ key: "file2" }],
        isTruncated: false
      });

    const result = await adapter.list("");

    expect(result).toEqual(["file1", "file2"]);
    expect(mockS3Client.list).toHaveBeenCalledTimes(2);
    expect(mockS3Client.list).toHaveBeenNthCalledWith(2, {
      prefix: "",
      startAfter: "file1",
      delimiter: undefined
    });
  });
});
