/**
 * @fileoverview Tests for BunRedisAdapter
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { BunRedisAdapter } from "./bun-redis.adapter";

// Mock the 'bun' module
vi.mock("bun", () => {
  class MockRedisClient {
    get = vi.fn();
    set = vi.fn();
    del = vi.fn();
    exists = vi.fn();
    expire = vi.fn();
    send = vi.fn();
    publish = vi.fn();
    subscribe = vi.fn();
    ping = vi.fn();
    close = vi.fn();
    options: any;

    constructor(url?: string) {
      this.options = { url };
    }
  }

  return {
    RedisClient: MockRedisClient,
  };
});

describe("BunRedisAdapter", () => {
  let adapter: BunRedisAdapter;
  const prefix = "test:";

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new BunRedisAdapter({ prefix });
  });

  it("should read a value", async () => {
    const mockRedis = (adapter as any).redis;
    mockRedis.get.mockResolvedValue("content");

    const result = await adapter.read("test.md");

    expect(result).toBe("content");
    expect(mockRedis.get).toHaveBeenCalledWith(`${prefix}test.md`);
  });

  it("should return null if not found", async () => {
    const mockRedis = (adapter as any).redis;
    mockRedis.get.mockResolvedValue(null);

    const result = await adapter.read("non-existent.md");

    expect(result).toBeNull();
  });

  it("should write a value", async () => {
    const mockRedis = (adapter as any).redis;
    
    await adapter.write("test.md", "content");

    expect(mockRedis.set).toHaveBeenCalledWith(`${prefix}test.md`, "content");
    expect(mockRedis.publish).toHaveBeenCalled();
  });

  it("should write a value with TTL", async () => {
    adapter = new BunRedisAdapter({ prefix, ttl: 60 });
    const mockRedis = (adapter as any).redis;
    
    await adapter.write("test.md", "content");

    expect(mockRedis.set).toHaveBeenCalledWith(`${prefix}test.md`, "content");
    expect(mockRedis.expire).toHaveBeenCalledWith(`${prefix}test.md`, 60);
  });

  it("should write a value with per-document TTL", async () => {
    const mockRedis = (adapter as any).redis;
    
    await adapter.write("test.md", "content", { ttl: 120 });

    expect(mockRedis.set).toHaveBeenCalledWith(`${prefix}test.md`, "content");
    expect(mockRedis.expire).toHaveBeenCalledWith(`${prefix}test.md`, 120);
  });

  it("should delete a value", async () => {
    const mockRedis = (adapter as any).redis;
    
    await adapter.delete("test.md");

    expect(mockRedis.del).toHaveBeenCalledWith(`${prefix}test.md`);
    expect(mockRedis.publish).toHaveBeenCalledWith(
      `${prefix}events`,
      JSON.stringify({ event: "delete", path: "test.md" })
    );
  });

  it("should check if exists", async () => {
    const mockRedis = (adapter as any).redis;
    mockRedis.exists.mockResolvedValue(1);

    const result = await adapter.exists("test.md");

    expect(result).toBe(true);
    expect(mockRedis.exists).toHaveBeenCalledWith(`${prefix}test.md`);
  });

  it("should list keys using SCAN", async () => {
    const mockRedis = (adapter as any).redis;
    mockRedis.send.mockResolvedValueOnce(["0", [`${prefix}posts/1.md`, `${prefix}posts/2.md` ]]);

    const result = await adapter.list("posts");

    expect(result).toEqual(["posts/1.md", "posts/2.md"]);
    expect(mockRedis.send).toHaveBeenCalledWith("SCAN", ["0", "MATCH", `${prefix}posts/*`, "COUNT", "100"]);
  });

  it("should list keys with pattern", async () => {
    const mockRedis = (adapter as any).redis;
    mockRedis.send.mockResolvedValueOnce(["0", [`${prefix}posts/1.md` ]]);

    const result = await adapter.list("posts", "*.md");

    expect(result).toEqual(["posts/1.md"]);
    expect(mockRedis.send).toHaveBeenCalledWith("SCAN", ["0", "MATCH", `${prefix}posts/*.md`, "COUNT", "100"]);
  });

  it("should handle multi-batch SCAN", async () => {
    const mockRedis = (adapter as any).redis;
    mockRedis.send
      .mockResolvedValueOnce(["10", [`${prefix}a.md` ]])
      .mockResolvedValueOnce(["0", [`${prefix}b.md` ]]);

    const result = await adapter.list("");

    expect(result).toEqual(["a.md", "b.md"]);
    expect(mockRedis.send).toHaveBeenCalledTimes(2);
  });

  it("should watch for changes", async () => {
    const callback = vi.fn();
    
    adapter.watch("posts", callback);
    
    const subRedis = (adapter as any).subRedis;
    expect(subRedis).toBeDefined();
    
    const subCallback = subRedis.subscribe.mock.calls[0][1];
    
    // Path inside watched directory
    subCallback(JSON.stringify({ event: "change", path: "posts/a.md" }));
    expect(callback).toHaveBeenCalledWith("change", "posts/a.md");
    
    // Exact path
    subCallback(JSON.stringify({ event: "change", path: "posts" }));
    expect(callback).toHaveBeenCalledWith("change", "posts");
    
    // Path outside watched directory
    subCallback(JSON.stringify({ event: "change", path: "other/b.md" }));
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("should cleanup watchers", () => {
    const callback = vi.fn();
    const unwatch = adapter.watch("posts", callback);
    
    expect((adapter as any).watchers.get("posts").size).toBe(1);
    
    unwatch();
    
    expect((adapter as any).watchers.get("posts")).toBeUndefined();
  });

  it("should initialize and dispose", async () => {
    const mockRedis = (adapter as any).redis;
    
    await adapter.initialize();
    expect(mockRedis.ping).toHaveBeenCalled();

    // Trigger watch to create subRedis
    adapter.watch("test", () => {});
    const subRedis = (adapter as any).subRedis;

    await adapter.dispose();
    expect(mockRedis.close).toHaveBeenCalled();
    expect(subRedis.close).toHaveBeenCalled();
  });
});
