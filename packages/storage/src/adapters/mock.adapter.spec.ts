import { describe, expect, it } from "vitest";
import { MockStorageAdapter } from "./mock.adapter";

const createBlob = () => new Blob(["data"], { type: "text/plain" });

describe("MockStorageAdapter", () => {
  it("tracks put/delete/exists calls", async () => {
    const adapter = new MockStorageAdapter();

    await adapter.put("/file.txt", createBlob(), {
      contentType: "text/plain",
    });

    expect(adapter.calls.put).toBe(1);
    expect(await adapter.exists("file.txt")).toBe(true);
    expect(adapter.calls.exists).toBe(1);

    await adapter.delete("/file.txt");
    expect(adapter.calls.delete).toBe(1);
    expect(await adapter.exists("file.txt")).toBe(false);
  });

  it("supports list, copy, and move", async () => {
    const adapter = new MockStorageAdapter();

    await adapter.put("/a/file.txt", createBlob(), {
      contentType: "text/plain",
    });
    await adapter.put("/b/file.txt", createBlob(), {
      contentType: "text/plain",
    });

    const keys = await adapter.list("/a");
    expect(keys).toEqual(["a/file.txt"]);
    expect(adapter.calls.list).toBe(1);

    await adapter.copy("a/file.txt", "a/file-copy.txt");
    expect(adapter.calls.copy).toBe(1);

    await adapter.move("a/file-copy.txt", "a/file-moved.txt");
    expect(adapter.calls.move).toBe(1);

    expect(await adapter.exists("a/file-copy.txt")).toBe(false);
    expect(await adapter.exists("a/file-moved.txt")).toBe(true);
  });

  it("clears internal state", async () => {
    const adapter = new MockStorageAdapter();

    await adapter.put("file.txt", createBlob(), {
      contentType: "text/plain",
    });

    adapter.clear();

    expect(adapter.files.size).toBe(0);
    expect(adapter.calls.put).toBe(0);
  });
});
