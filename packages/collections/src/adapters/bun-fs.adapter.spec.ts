import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the 'bun' module
vi.mock("bun", () => {
  return {
    Glob: vi.fn().mockImplementation(function () {
      return {
        scan: vi.fn().mockImplementation(async function* () {
          // Default mock implementation
        }),
      };
    }),
    $: vi.fn().mockReturnValue({
      quiet: vi.fn().mockResolvedValue({}),
    }),
  };
});

import { BunFsAdapter } from "./bun-fs.adapter";
import { NodeFsAdapter } from "./node-fs.adapter";

describe("BunFsAdapter", () => {
  let adapter: BunFsAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new BunFsAdapter();

    // Setup global Bun mock for testing in Node
    if (typeof (globalThis as any).Bun === "undefined") {
      (globalThis as any).Bun = {
        file: vi.fn().mockReturnValue({
          exists: vi.fn(),
          text: vi.fn(),
          delete: vi.fn(),
        }),
        write: vi.fn(),
      };
    }
  });

  it("should read a file that exists", async () => {
    const mockFile = {
      exists: vi.fn().mockResolvedValue(true),
      text: vi.fn().mockResolvedValue("file content"),
    };
    (globalThis as any).Bun.file.mockReturnValue(mockFile);

    const result = await adapter.read("/path/to/file.md");

    expect(result).toBe("file content");
    expect((globalThis as any).Bun.file).toHaveBeenCalledWith("/path/to/file.md");
    expect(mockFile.text).toHaveBeenCalled();
  });

  it("should return null if file does not exist", async () => {
    const mockFile = {
      exists: vi.fn().mockResolvedValue(false),
    };
    (globalThis as any).Bun.file.mockReturnValue(mockFile);

    const result = await adapter.read("/path/to/missing.md");

    expect(result).toBeNull();
  });

  it("should write a file using Bun.write", async () => {
    (globalThis as any).Bun.write.mockResolvedValue(100);

    await adapter.write("/path/to/dir/file.md", "content");

    expect((globalThis as any).Bun.write).toHaveBeenCalledWith("/path/to/dir/file.md", "content");
  });

  it("should delete a file", async () => {
    const mockFile = {
      delete: vi.fn().mockResolvedValue(undefined),
    };
    (globalThis as any).Bun.file.mockReturnValue(mockFile);

    await adapter.delete("/path/to/file.md");

    expect((globalThis as any).Bun.file).toHaveBeenCalledWith("/path/to/file.md");
    expect(mockFile.delete).toHaveBeenCalled();
  });

  it("should check if file exists using Bun.file().exists()", async () => {
    const mockFile = {
      exists: vi.fn().mockResolvedValue(true),
    };
    (globalThis as any).Bun.file.mockReturnValue(mockFile);

    const result = await adapter.exists("/path/to/file.md");

    expect(result).toBe(true);
    expect((globalThis as any).Bun.file).toHaveBeenCalledWith("/path/to/file.md");
  });

  it("should check if directory exists using shell fallback", async () => {
    const mockFile = {
      exists: vi.fn().mockResolvedValue(false),
    };
    (globalThis as any).Bun.file.mockReturnValue(mockFile);
    
    const { $ } = await import("bun");

    const result = await adapter.exists("/path/to/dir");

    expect(result).toBe(true); // $ mock returns success
    expect($).toHaveBeenCalled();
  });

  it("should list files in directory using Glob", async () => {
    const { Glob } = await import("bun");
    (Glob as any).mockImplementation(function () {
      return {
        scan: vi.fn().mockImplementation(async function* () {
          yield "/path/to/dir/a.md";
        }),
      };
    });

    const result = await adapter.list("/path/to/dir", "*.md");

    expect(result).toEqual(["/path/to/dir/a.md"]);
  });

  it("should create directory using Bun shell", async () => {
    const { $ } = await import("bun");
    await adapter.mkdir("/path/to/new-dir");
    expect($).toHaveBeenCalled();
  });

  it("performance comparison (Bun vs NodeFs)", async () => {
    // This is a benchmark placeholder. In a real Bun environment, 
    // we would measure execution time for multiple operations.
    const isBun = !!(globalThis as any).process?.versions?.bun;
    
    if (isBun) {
      const nodeAdapter = new NodeFsAdapter();
      const bunAdapter = new BunFsAdapter();
      const testFile = "perf-test.txt";
      const content = "x".repeat(10000);

      // Warm up
      await bunAdapter.write(testFile, content);
      
      const startNode = performance.now();
      for(let i=0; i<100; i++) {
        await nodeAdapter.write(testFile, content);
        await nodeAdapter.read(testFile);
      }
      const endNode = performance.now();

      const startBun = performance.now();
      for(let i=0; i<100; i++) {
        await bunAdapter.write(testFile, content);
        await bunAdapter.read(testFile);
      }
      const endBun = performance.now();
      
      console.log(`NodeFsAdapter: ${endNode - startNode}ms`);
      console.log(`BunFsAdapter: ${endBun - startBun}ms`);
      
      await bunAdapter.delete(testFile);
    }
    
    expect(true).toBe(true);
  });
});
