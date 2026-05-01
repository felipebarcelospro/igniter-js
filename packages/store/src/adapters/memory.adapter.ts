/**
 * @fileoverview In-memory store adapter for desktop apps and testing
 * @module @igniter-js/store/adapters/memory
 *
 * @description
 * This adapter provides an in-memory implementation of the IgniterStoreAdapter interface.
 * Ideal for desktop apps (Electron, Tauri, Bun) where Redis is not available.
 * Supports all store operations including key-value, pub/sub, batch operations, and simulated streams.
 *
 * @example
 * ```typescript
 * import { IgniterStoreMemoryAdapter } from '@igniter-js/store/adapters'
 *
 * const adapter = IgniterStoreMemoryAdapter.create()
 *
 * // Use with IgniterStore
 * const store = IgniterStore.create()
 *   .withAdapter(adapter)
 *   .withService('my-app')
 *   .build()
 * ```
 */

import { EventEmitter } from "events";
import type {
  IgniterStoreAdapter,
  IgniterStoreKeyValueOptions,
  IgniterStoreEventCallback,
  IgniterStoreBatchEntry,
  IgniterStoreScanResult,
  IgniterStoreScanOptions,
  IgniterStoreStreamAppendOptions,
  IgniterStoreStreamRangeOptions,
  IgniterStoreStreamReadOptions,
  IgniterStoreStreamMessage,
} from "../types";

interface StreamMessage {
  id: string;
  data: any;
  createdAt: number;
}

interface StreamConsumer {
  lastReadId: string;
  pending: Set<string>;
}

interface StreamEntry {
  messages: StreamMessage[];
  consumers: Map<string, Map<string, StreamConsumer>>;
  idCounter: number;
}

export interface IgniterStoreMemoryAdapterOptions {
  enableStreams?: boolean;
}

export class IgniterStoreMemoryAdapter implements IgniterStoreAdapter<object> {
  public readonly client: object;

  private readonly kv: Map<string, { value: any; expiresAt?: number }> =
    new Map();
  private readonly counters: Map<string, number> = new Map();
  private readonly claims: Map<string, { value: any; expiresAt?: number }> =
    new Map();
  private readonly emitter: EventEmitter = new EventEmitter();
  private readonly streams: Map<string, StreamEntry> = new Map();
  private readonly ttlTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(_options?: IgniterStoreMemoryAdapterOptions) {
    this.client = {};
  }

  static create(
    _options?: IgniterStoreMemoryAdapterOptions,
  ): IgniterStoreAdapter<object> {
    return new IgniterStoreMemoryAdapter(_options);
  }

  private cleanupKey(key: string): void {
    const entry = this.kv.get(key);
    if (entry?.expiresAt && Date.now() > entry.expiresAt) {
      this.kv.delete(key);
      const timer = this.ttlTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.ttlTimers.delete(key);
      }
    }
  }

  private scheduleTtl(key: string, ttl: number): void {
    const existingTimer = this.ttlTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    const timer = setTimeout(() => {
      this.kv.delete(key);
      this.ttlTimers.delete(key);
    }, ttl * 1000);
    this.ttlTimers.set(key, timer);
  }

  private cleanExpiredClaims(): void {
    const now = Date.now();
    for (const [key, entry] of this.claims.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.claims.delete(key);
      }
    }
  }

  // --- Key-Value Operations ---

  async get<T = any>(key: string): Promise<T | null> {
    this.cleanupKey(key);
    const entry = this.kv.get(key);
    if (!entry) return null;
    return entry.value as T;
  }

  async set(
    key: string,
    value: any,
    options?: IgniterStoreKeyValueOptions,
  ): Promise<void> {
    const expiresAt = options?.ttl
      ? Date.now() + options.ttl * 1000
      : undefined;
    this.kv.set(key, { value, expiresAt });
    if (options?.ttl) {
      this.scheduleTtl(key, options.ttl);
    }
  }

  async delete(key: string): Promise<void> {
    this.kv.delete(key);
    const timer = this.ttlTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.ttlTimers.delete(key);
    }
  }

  async has(key: string): Promise<boolean> {
    this.cleanupKey(key);
    return this.kv.has(key);
  }

  async increment(key: string, delta: number = 1): Promise<number> {
    const current = this.counters.get(key) ?? 0;
    const newValue = current + delta;
    this.counters.set(key, newValue);
    return newValue;
  }

  async expire(key: string, ttl: number): Promise<void> {
    const entry = this.kv.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + ttl * 1000;
      this.scheduleTtl(key, ttl);
    }
  }

  async setNX(
    key: string,
    value: any,
    options?: IgniterStoreKeyValueOptions,
  ): Promise<boolean> {
    this.cleanupKey(key);
    if (this.kv.has(key)) {
      return false;
    }
    const expiresAt = options?.ttl
      ? Date.now() + options.ttl * 1000
      : undefined;
    this.kv.set(key, { value, expiresAt });
    if (options?.ttl) {
      this.scheduleTtl(key, options.ttl);
    }
    return true;
  }

  // --- Batch Operations ---

  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    return keys.map((key) => {
      this.cleanupKey(key);
      const entry = this.kv.get(key);
      return entry ? (entry.value as T) : null;
    });
  }

  async mset(entries: IgniterStoreBatchEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.set(
        entry.key,
        entry.value,
        entry.ttl ? { ttl: entry.ttl } : undefined,
      );
    }
  }

  // --- Pub/Sub Operations ---

  async publish(channel: string, message: any): Promise<void> {
    this.emitter.emit(channel, message);
  }

  async subscribe(
    channel: string,
    callback: IgniterStoreEventCallback,
  ): Promise<void> {
    this.emitter.on(channel, callback);
  }

  async unsubscribe(
    channel: string,
    callback?: IgniterStoreEventCallback,
  ): Promise<void> {
    if (callback) {
      this.emitter.off(channel, callback);
    } else {
      this.emitter.removeAllListeners(channel);
    }
  }

  // --- Scan Operations ---

  async scan(
    pattern: string,
    options?: IgniterStoreScanOptions,
  ): Promise<IgniterStoreScanResult> {
    const count = options?.count ?? 10;
    const regex = this.patternToRegex(pattern);
    const allKeys = Array.from(this.kv.keys()).filter((key) => regex.test(key));
    const cursor = options?.cursor ?? "0";
    const cursorIndex = parseInt(cursor, 10);
    const keys = allKeys.slice(cursorIndex, cursorIndex + count);
    const nextCursor =
      cursorIndex + count >= allKeys.length ? "0" : String(cursorIndex + count);
    return { keys, cursor: nextCursor };
  }

  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    return new RegExp(`^${escaped}$`);
  }

  // --- Stream Operations ---

  async xadd(
    stream: string,
    message: any,
    options?: IgniterStoreStreamAppendOptions,
  ): Promise<string> {
    let streamEntry = this.streams.get(stream);
    if (!streamEntry) {
      streamEntry = { messages: [], consumers: new Map(), idCounter: 0 };
      this.streams.set(stream, streamEntry);
    }

    const id = `${++streamEntry.idCounter}-0`;
    const streamMessage: StreamMessage = {
      id,
      data: message,
      createdAt: Date.now(),
    };

    streamEntry.messages.push(streamMessage);

    if (options?.maxLen !== undefined) {
      const maxLen = options.approximate
        ? Math.floor(options.maxLen * 1.1)
        : options.maxLen;
      while (streamEntry.messages.length > maxLen) {
        streamEntry.messages.shift();
      }
    }

    return id;
  }

  async xgroupCreate(
    stream: string,
    group: string,
    startId: string = "0",
  ): Promise<void> {
    let streamEntry = this.streams.get(stream);
    if (!streamEntry) {
      streamEntry = { messages: [], consumers: new Map(), idCounter: 0 };
      this.streams.set(stream, streamEntry);
    }

    if (!streamEntry.consumers.has(group)) {
      streamEntry.consumers.set(group, new Map());
    }

    const consumerMap = streamEntry.consumers.get(group)!;
    consumerMap.set("_global", { lastReadId: startId, pending: new Set() });
  }

  async xreadgroup<T = any>(
    stream: string,
    group: string,
    consumer: string,
    options?: IgniterStoreStreamReadOptions,
  ): Promise<IgniterStoreStreamMessage<T>[]> {
    const streamEntry = this.streams.get(stream);
    if (!streamEntry) return [];

    const consumerMap = streamEntry.consumers.get(group);
    if (!consumerMap) return [];

    let consumerState = consumerMap.get(consumer);
    if (!consumerState) {
      consumerState = { lastReadId: "0", pending: new Set() };
      consumerMap.set(consumer, consumerState);
    }

    const count = options?.count ?? 100;
    const blockMs = options?.blockMs ?? 0;

    const globalState = consumerMap.get("_global");
    const startId = globalState?.lastReadId ?? "0";

    const startIndex = parseInt(startId.split("-")[0], 10);
    const unreadMessages = streamEntry.messages.filter(
      (msg) =>
        parseInt(msg.id.split("-")[0], 10) > startIndex &&
        !consumerState!.pending.has(msg.id),
    );

    if (unreadMessages.length === 0) {
      if (blockMs > 0) {
        await this.blockPromise(blockMs);
        const newMessages = streamEntry.messages.filter(
          (msg) =>
            parseInt(msg.id.split("-")[0], 10) > startIndex &&
            !consumerState!.pending.has(msg.id),
        );
        if (newMessages.length > 0) {
          const selected = newMessages.slice(0, count);
          selected.forEach((msg) => consumerState!.pending.add(msg.id));
          return selected.map((msg) => ({
            id: msg.id,
            message: msg.data as T,
          }));
        }
      }
      return [];
    }

    const selected = unreadMessages.slice(0, count);
    selected.forEach((msg) => {
      consumerState!.pending.add(msg.id);
      consumerState!.lastReadId = msg.id;
    });

    if (globalState) {
      globalState.lastReadId =
        selected[selected.length - 1]?.id ?? globalState.lastReadId;
    }

    return selected.map((msg) => ({ id: msg.id, message: msg.data as T }));
  }

  private blockPromise(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async xrange<T = any>(
    stream: string,
    options?: IgniterStoreStreamRangeOptions,
  ): Promise<IgniterStoreStreamMessage<T>[]> {
    const streamEntry = this.streams.get(stream);
    if (!streamEntry) return [];

    const startId = options?.startId ?? "-";
    const endId = options?.endId ?? "+";
    const count = options?.count;
    const reverse = options?.reverse ?? false;

    let messages = [...streamEntry.messages];

    if (startId !== "-") {
      const startIdx = parseInt(startId.split("-")[0], 10);
      messages = messages.filter(
        (msg) => parseInt(msg.id.split("-")[0], 10) >= startIdx,
      );
    }

    if (endId !== "+") {
      const endIdx = parseInt(endId.split("-")[0], 10);
      messages = messages.filter(
        (msg) => parseInt(msg.id.split("-")[0], 10) <= endIdx,
      );
    }

    if (reverse) {
      messages = messages.reverse();
    }

    if (count !== undefined) {
      messages = messages.slice(0, count);
    }

    return messages.map((msg) => ({ id: msg.id, message: msg.data as T }));
  }

  async xrevrange<T = any>(
    stream: string,
    options?: IgniterStoreStreamRangeOptions,
  ): Promise<IgniterStoreStreamMessage<T>[]> {
    return this.xrange(stream, {
      ...options,
      reverse: true,
    } as any);
  }

  async xack(stream: string, group: string, ids: string[]): Promise<void> {
    const streamEntry = this.streams.get(stream);
    if (!streamEntry) return;

    const consumerMap = streamEntry.consumers.get(group);
    if (!consumerMap) return;

    for (const [, state] of consumerMap) {
      ids.forEach((id) => state.pending.delete(id));
    }
  }

  clear(): void {
    this.kv.clear();
    this.counters.clear();
    this.claims.clear();
    this.streams.clear();
    this.emitter.removeAllListeners();
    for (const timer of this.ttlTimers.values()) {
      clearTimeout(timer);
    }
    this.ttlTimers.clear();
  }
}

export function createIgniterStoreMemoryAdapter(): IgniterStoreAdapter<object> {
  return IgniterStoreMemoryAdapter.create();
}
