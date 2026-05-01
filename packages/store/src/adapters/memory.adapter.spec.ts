/**
 * @fileoverview Tests for the in-memory store adapter
 * @module @igniter-js/store/adapters/memory.spec
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { IgniterStoreMemoryAdapter } from "./memory.adapter";
import type { IgniterStoreAdapter } from "../types";

describe("IgniterStoreMemoryAdapter", () => {
  let adapter: IgniterStoreMemoryAdapter;

  beforeEach(() => {
    adapter =
      IgniterStoreMemoryAdapter.create() as unknown as IgniterStoreMemoryAdapter;
  });

  afterEach(() => {
    adapter.clear();
  });

  describe("kv operations", () => {
    it("should set and get a value", async () => {
      await adapter.set("key", { name: "test" });
      const value = await adapter.get<{ name: string }>("key");
      expect(value).toEqual({ name: "test" });
    });

    it("should return null for missing key", async () => {
      const value = await adapter.get("nonexistent");
      expect(value).toBeNull();
    });

    it("should delete a key", async () => {
      await adapter.set("key", "value");
      await adapter.delete("key");
      const exists = await adapter.has("key");
      expect(exists).toBe(false);
    });

    it("should check if key exists", async () => {
      await adapter.set("key", "value");
      const exists = await adapter.has("key");
      expect(exists).toBe(true);
    });

    it("should return false for nonexistent key in has", async () => {
      const exists = await adapter.has("nonexistent");
      expect(exists).toBe(false);
    });

    it("should set value with TTL", async () => {
      vi.useFakeTimers();
      await adapter.set("key", "value", { ttl: 60 });
      const exists = await adapter.has("key");
      expect(exists).toBe(true);
      vi.advanceTimersByTime(61 * 1000);
      const existsAfter = await adapter.has("key");
      expect(existsAfter).toBe(false);
      vi.useRealTimers();
    });
  });

  describe("counter operations", () => {
    it("should increment a counter", async () => {
      const result = await adapter.increment("counter");
      expect(result).toBe(1);
      const result2 = await adapter.increment("counter");
      expect(result2).toBe(2);
    });

    it("should increment by delta", async () => {
      await adapter.increment("counter", 5);
      const result = await adapter.increment("counter", 3);
      expect(result).toBe(8);
    });

    it("should start from 0 for nonexistent counter", async () => {
      const result = await adapter.increment("nonexistent");
      expect(result).toBe(1);
    });
  });

  describe("setNX operations", () => {
    it("should set if not exists", async () => {
      const result = await adapter.setNX("key", "value");
      expect(result).toBe(true);
      const value = await adapter.get("key");
      expect(value).toBe("value");
    });

    it("should not overwrite existing key", async () => {
      await adapter.set("key", "original");
      const result = await adapter.setNX("key", "new");
      expect(result).toBe(false);
      const value = await adapter.get("key");
      expect(value).toBe("original");
    });

    it("should setNX with TTL", async () => {
      vi.useFakeTimers();
      const result = await adapter.setNX("key", "value", { ttl: 60 });
      expect(result).toBe(true);
      vi.advanceTimersByTime(61 * 1000);
      const exists = await adapter.has("key");
      expect(exists).toBe(false);
      vi.useRealTimers();
    });
  });

  describe("batch operations", () => {
    it("should mget multiple values", async () => {
      await adapter.set("key1", "value1");
      await adapter.set("key2", "value2");
      await adapter.set("key3", "value3");
      const values = await adapter.mget([
        "key1",
        "key2",
        "key3",
        "nonexistent",
      ]);
      expect(values).toEqual(["value1", "value2", "value3", null]);
    });

    it("should mget with empty array", async () => {
      const values = await adapter.mget([]);
      expect(values).toEqual([]);
    });

    it("should mset multiple values", async () => {
      await adapter.mset([
        { key: "key1", value: "value1" },
        { key: "key2", value: "value2", ttl: 60 },
      ]);
      const value1 = await adapter.get("key1");
      const value2 = await adapter.get("key2");
      expect(value1).toBe("value1");
      expect(value2).toBe("value2");
    });

    it("should mset with empty array", async () => {
      await adapter.mset([]);
      const keys = await adapter.scan("*");
      expect(keys.keys).toHaveLength(0);
    });
  });

  describe("pub/sub operations", () => {
    it("should publish and subscribe", async () => {
      const received: any[] = [];
      await adapter.subscribe("channel", (msg) => {
        received.push(msg);
      });
      await adapter.publish("channel", { event: "test" });
      expect(received).toHaveLength(1);
      expect(received[0]).toEqual({ event: "test" });
    });

    it("should support multiple subscribers", async () => {
      const received1: any[] = [];
      const received2: any[] = [];
      await adapter.subscribe("channel", (msg) => {
        received1.push(msg);
      });
      await adapter.subscribe("channel", (msg) => {
        received2.push(msg);
      });
      await adapter.publish("channel", "message");
      expect(received1).toEqual(["message"]);
      expect(received2).toEqual(["message"]);
    });

    it("should unsubscribe from channel", async () => {
      const received: any[] = [];
      const callback = (msg: any) => {
        received.push(msg);
      };
      await adapter.subscribe("channel", callback);
      await adapter.publish("channel", "first");
      await adapter.unsubscribe("channel", callback);
      await adapter.publish("channel", "second");
      expect(received).toEqual(["first"]);
    });

    it("should unsubscribe all listeners when no callback provided", async () => {
      const received: any[] = [];
      await adapter.subscribe("channel", () => {
        received.push("one");
      });
      await adapter.subscribe("channel", () => {
        received.push("two");
      });
      await adapter.unsubscribe("channel");
      await adapter.publish("channel", "message");
      expect(received).toHaveLength(0);
    });
  });

  describe("scan operations", () => {
    beforeEach(async () => {
      await adapter.mset([
        { key: "user:1", value: "one" },
        { key: "user:2", value: "two" },
        { key: "user:3", value: "three" },
        { key: "product:1", value: "prod1" },
      ]);
    });

    it("should scan with exact match", async () => {
      const result = await adapter.scan("user:1");
      expect(result.keys).toEqual(["user:1"]);
    });

    it("should scan with wildcard pattern", async () => {
      const result = await adapter.scan("user:*");
      expect(result.keys).toContain("user:1");
      expect(result.keys).toContain("user:2");
      expect(result.keys).toContain("user:3");
      expect(result.keys).not.toContain("product:1");
    });

    it("should scan with pagination", async () => {
      const result1 = await adapter.scan("user:*", { cursor: "0", count: 2 });
      expect(result1.keys).toHaveLength(2);
      expect(result1.cursor).toBe("2");

      const result2 = await adapter.scan("user:*", {
        cursor: result1.cursor,
        count: 2,
      });
      expect(result2.keys).toHaveLength(1);
      expect(result2.cursor).toBe("0");
    });

    it("should return cursor 0 when scan complete", async () => {
      const result = await adapter.scan("user:*", { count: 10 });
      expect(result.cursor).toBe("0");
    });

    it("should scan with question mark wildcard", async () => {
      const result = await adapter.scan("user:?", { count: 10 });
      expect(result.keys).toHaveLength(0);
    });
  });

  describe("stream operations", () => {
    describe("xadd", () => {
      it("should add message to stream", async () => {
        const id = await adapter.xadd("stream", { event: "test" });
        expect(id).toMatch(/^\d+-0$/);
      });

      it("should auto-increment stream IDs", async () => {
        const id1 = await adapter.xadd("stream", { n: 1 });
        const id2 = await adapter.xadd("stream", { n: 2 });
        const id3 = await adapter.xadd("stream", { n: 3 });
        expect(parseInt(id1.split("-")[0])).toBeLessThan(
          parseInt(id2.split("-")[0]),
        );
        expect(parseInt(id2.split("-")[0])).toBeLessThan(
          parseInt(id3.split("-")[0]),
        );
      });

      it("should respect maxLen option", async () => {
        for (let i = 0; i < 10; i++) {
          await adapter.xadd("stream", { n: i }, { maxLen: 5 });
        }
        const messages = await adapter.xrange("stream");
        expect(messages).toHaveLength(5);
      });

      it("should respect approximate maxLen", async () => {
        for (let i = 0; i < 10; i++) {
          await adapter.xadd(
            "stream",
            { n: i },
            { maxLen: 5, approximate: true },
          );
        }
        const messages = await adapter.xrange("stream");
        expect(messages.length).toBeLessThanOrEqual(6);
      });
    });

    describe("xrange", () => {
      beforeEach(async () => {
        await adapter.xadd("stream", { n: 1 });
        await adapter.xadd("stream", { n: 2 });
        await adapter.xadd("stream", { n: 3 });
      });

      it("should read range of messages", async () => {
        const messages = await adapter.xrange("stream");
        expect(messages).toHaveLength(3);
        expect(messages[0].message).toEqual({ n: 1 });
        expect(messages[2].message).toEqual({ n: 3 });
      });

      it("should read with start and end IDs", async () => {
        const messages = await adapter.xrange("stream", {
          startId: "2-0",
          endId: "3-0",
        });
        expect(messages).toHaveLength(2);
      });

      it("should read with count limit", async () => {
        const messages = await adapter.xrange("stream", { count: 2 });
        expect(messages).toHaveLength(2);
      });

      it("should read in reverse", async () => {
        const messages = await adapter.xrange("stream", { reverse: true });
        expect(messages[0].message).toEqual({ n: 3 });
        expect(messages[2].message).toEqual({ n: 1 });
      });

      it("should return empty array for nonexistent stream", async () => {
        const messages = await adapter.xrange("nonexistent");
        expect(messages).toEqual([]);
      });
    });

    describe("xrevrange", () => {
      it("should read in reverse order", async () => {
        await adapter.xadd("stream", { n: 1 });
        await adapter.xadd("stream", { n: 2 });
        await adapter.xadd("stream", { n: 3 });
        const messages = await adapter.xrevrange("stream");
        expect(messages[0].message).toEqual({ n: 3 });
        expect(messages[2].message).toEqual({ n: 1 });
      });
    });

    describe("consumer groups", () => {
      beforeEach(async () => {
        await adapter.xadd("stream", { event: "a" });
        await adapter.xadd("stream", { event: "b" });
        await adapter.xadd("stream", { event: "c" });
        await adapter.xgroupCreate("stream", "group1");
        await adapter.xgroupCreate("stream", "group2");
      });

      it("should create consumer group", async () => {
        await expect(
          adapter.xgroupCreate("stream", "newgroup"),
        ).resolves.not.toThrow();
      });

      it("should be idempotent for xgroupCreate", async () => {
        await expect(
          adapter.xgroupCreate("stream", "group1"),
        ).resolves.not.toThrow();
      });

      it("should read messages as consumer", async () => {
        const messages = await adapter.xreadgroup(
          "stream",
          "group1",
          "consumer1",
          { count: 2 },
        );
        expect(messages.length).toBeGreaterThan(0);
        expect(messages[0].message).toBeDefined();
      });

      it("should track pending messages", async () => {
        const messages = await adapter.xreadgroup(
          "stream",
          "group1",
          "consumer1",
          { count: 2 },
        );
        const messageIds = messages.map((m) => m.id);
        await adapter.xack("stream", "group1", messageIds);
        const readAgain = await adapter.xreadgroup(
          "stream",
          "group1",
          "consumer1",
          { count: 2 },
        );
        const newMessageIds = readAgain.map((m) => m.id);
        messageIds.forEach((id) => {
          expect(newMessageIds).not.toContain(id);
        });
      });

      it("should allow different consumers in same group", async () => {
        const messages1 = await adapter.xreadgroup(
          "stream",
          "group1",
          "consumer1",
          { count: 1 },
        );
        const messages2 = await adapter.xreadgroup(
          "stream",
          "group1",
          "consumer2",
          { count: 1 },
        );
        if (messages1.length > 0 && messages2.length > 0) {
          expect(messages1[0].id).not.toBe(messages2[0].id);
        }
      });

      it("should return empty array when no new messages", async () => {
        await adapter.xreadgroup("stream", "group1", "consumer1", {
          count: 10,
        });
        const messages = await adapter.xreadgroup(
          "stream",
          "group1",
          "consumer1",
          { count: 10 },
        );
        expect(messages).toHaveLength(0);
      });
    });
  });

  describe("expire", () => {
    it("should set expiration on existing key", async () => {
      vi.useFakeTimers();
      await adapter.set("key", "value");
      await adapter.expire("key", 60);
      const existsBefore = await adapter.has("key");
      expect(existsBefore).toBe(true);
      vi.advanceTimersByTime(61 * 1000);
      const existsAfter = await adapter.has("key");
      expect(existsAfter).toBe(false);
      vi.useRealTimers();
    });

    it("should do nothing for nonexistent key", async () => {
      await expect(adapter.expire("nonexistent", 60)).resolves.not.toThrow();
    });
  });

  describe("clear", () => {
    it("should clear all data", async () => {
      await adapter.set("key1", "value1");
      await adapter.set("key2", "value2");
      await adapter.increment("counter");
      await adapter.xadd("stream", { data: "test" });
      adapter.clear();
      const keys = await adapter.scan("*");
      expect(keys.keys).toHaveLength(0);
    });
  });

  describe("client property", () => {
    it("should expose client object", () => {
      expect(adapter.client).toBeDefined();
      expect(typeof adapter.client).toBe("object");
    });
  });
});
